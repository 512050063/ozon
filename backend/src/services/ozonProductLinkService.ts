import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import logger from "../config/logger";
import { validateOzonCookieForBrowsing } from "./ozonCookieService";
import { extractProductType } from "./ozonTypeService";

export type OzonProductLinkRawItem = {
  sku?: string;
  link?: string;
  thumbnail?: string;
  main_image?: string;
  mainImage?: string;
  title?: string;
  price?: string;
  original_price?: string;
  originalPrice?: string;
  currency?: string;
  discount?: string;
  rating?: string;
  review_count?: string;
  reviewCount?: string;
  stock?: string;
};

export type OzonProductLinkProduct = {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  discount: number;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  productUrl: string;
  stock: number;
  productType: string;
  descriptionCategoryId: number | null;
  typeId: number | null;
};

type ResolveDependencies = {
  validateCookie: () => Promise<{ valid: boolean; message: string }>;
  fetchProduct: (url: string) => Promise<OzonProductLinkRawItem>;
  extractType: (url: string) => Promise<{ type: string; source: string; title?: string }>;
};

const SCRIPT_FILE = path.join(__dirname, "../../scripts/ozon/ozon_product_by_url.py");
const MAX_FETCH_ATTEMPTS = 3;
const OZON_ERROR_TITLE_PATTERNS = [
  /Похоже,\s*нет\s*соединения/i,
  /нет\s*соединения/i,
  /no\s+connection/i,
  /captcha/i,
  /challenge/i,
];
const OZON_ERROR_IMAGE_PATTERNS = [
  /abt-challenge/i,
  /incidents\/images\/warn/i,
];

export const isOzonProductUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.replace(/^www\./, "");
    return host === "ozon.ru" && /\/product\//.test(parsed.pathname);
  } catch {
    return false;
  }
};

export const extractOzonProductSku = (value: string): string => {
  try {
    const parsed = new URL(value);
    const match = parsed.pathname.match(/\/product\/[^/]*?(\d{6,})(?:\/)?$/);
    return match?.[1] || "";
  } catch {
    const match = value.match(/\/product\/[^/]*?(\d{6,})(?:[/?#]|$)/);
    return match?.[1] || "";
  }
};

export const parseOzonMoney = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "string") {
    return 0;
  }

  const normalized = value
    .replace(/\s/g, "")
    .replace(/[^\d.,-]/g, "");
  if (!normalized) {
    return 0;
  }

  const hasComma = normalized.includes(",");
  const hasDot = normalized.includes(".");
  const decimalNormalized = hasComma && hasDot
    ? normalized.replace(/,/g, "")
    : normalized.replace(",", ".");
  const parsed = Number.parseFloat(decimalNormalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseInteger = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value !== "string") {
    return 0;
  }
  const parsed = Number.parseInt(value.replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parsePercent = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.abs(value);
  }
  if (typeof value !== "string") {
    return 0;
  }
  const parsed = Number.parseFloat(value.replace(/[^\d.,-]/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? Math.abs(parsed) : 0;
};

const detectOzonMoneyCurrency = (item: OzonProductLinkRawItem): string => {
  const rawCurrency = String(item.currency || "").toUpperCase();
  if (rawCurrency) {
    return rawCurrency;
  }
  const joined = [item.price, item.original_price, item.originalPrice]
    .filter((value): value is string => typeof value === "string")
    .join(" ");
  if (joined.includes("¥")) return "CNY";
  if (joined.includes("₽")) return "RUB";
  return "";
};

export const mapOzonProductLinkRawItem = (item: OzonProductLinkRawItem): OzonProductLinkProduct => {
  const productUrl = item.link || "";
  return {
    id: item.sku || extractOzonProductSku(productUrl),
    name: item.title || "",
    price: parseOzonMoney(item.price),
    originalPrice: parseOzonMoney(item.original_price || item.originalPrice),
    discount: parsePercent(item.discount),
    rating: parseOzonMoney(item.rating),
    reviewCount: parseInteger(item.review_count || item.reviewCount),
    imageUrl: item.main_image || item.mainImage || item.thumbnail || "",
    productUrl,
    stock: parseInteger(item.stock),
    productType: "",
    descriptionCategoryId: null,
    typeId: null,
  };
};

export const isOzonErrorPageProduct = (item: OzonProductLinkRawItem): boolean => {
  const title = String(item.title || "");
  const image = String(item.main_image || item.mainImage || item.thumbnail || "");
  return OZON_ERROR_TITLE_PATTERNS.some(pattern => pattern.test(title))
    || OZON_ERROR_IMAGE_PATTERNS.some(pattern => pattern.test(image));
};

const parseProductFromScriptOutput = (stdout: string): OzonProductLinkRawItem | null => {
  const lines = stdout.trim().split(/\r?\n/);
  for (let index = lines.length - 1; index >= 0; index--) {
    const line = lines[index].trim();
    if (!line) continue;
    try {
      const parsed = JSON.parse(line);
      if (parsed.product) {
        return parsed.product;
      }
      if (parsed.sku || parsed.title || parsed.link) {
        return parsed;
      }
    } catch {
      continue;
    }
  }
  return null;
};

const parseScriptFailureMessage = (stdout: string): string => {
  const lines = stdout.trim().split(/\r?\n/);
  for (let index = lines.length - 1; index >= 0; index--) {
    const line = lines[index].trim();
    if (!line) continue;
    try {
      const parsed = JSON.parse(line);
      if (parsed && parsed.success === false && typeof parsed.message === "string") {
        return parsed.message;
      }
    } catch {
      continue;
    }
  }
  return "";
};

const extractKnownScriptFailure = (output: string): string => {
  const knownMessages = [
    "Ozon返回错误页，请稍后重试或重新获取Cookie",
    "Ozon页面仍返回卢布价格，请重新获取Cookie并确认货币为人民币",
    "链接解析失败：未获取到商品信息",
  ];
  for (const message of knownMessages) {
    if (output.includes(message)) {
      return message;
    }
  }
  return "";
};

export const fetchOzonProductByUrlWithScript = async (productUrl: string): Promise<OzonProductLinkRawItem> => {
  if (!fs.existsSync(SCRIPT_FILE)) {
    throw new Error(`未找到链接解析脚本: ${SCRIPT_FILE}`);
  }

  return new Promise((resolve, reject) => {
    const pythonPath = process.env.PYTHON_PATH || "py";
    execFile(
      pythonPath,
      [SCRIPT_FILE, productUrl],
      {
        timeout: 120000,
        encoding: "utf-8",
        env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      },
      (error, stdout, stderr) => {
        if (stderr) {
          logger.warn(`Ozon链接解析脚本警告: ${stderr}`);
        }
        if (error) {
          const cleanMessage = parseScriptFailureMessage(stdout || "")
            || extractKnownScriptFailure(`${stdout || ""}\n${stderr || ""}\n${error.message || ""}`)
            || (error.killed
              ? "链接解析超时：Ozon访问无响应或被拦截，请稍后重试或重新获取Cookie"
              : "链接解析失败：未获取到商品信息");
          reject(new Error(cleanMessage));
          return;
        }

        const product = parseProductFromScriptOutput(stdout || "");
        if (!product) {
          reject(new Error("链接解析失败：未获取到商品信息"));
          return;
        }
        resolve(product);
      },
    );
  });
};

export const resolveOzonProductLink = async (
  dependencies: ResolveDependencies,
  productUrl: string,
): Promise<{ success: true; data: OzonProductLinkProduct; message: string }> => {
  const normalizedUrl = productUrl.trim();
  if (!isOzonProductUrl(normalizedUrl)) {
    throw new Error("请输入有效的 Ozon 商品链接");
  }

  const cookieStatus = await dependencies.validateCookie();
  if (!cookieStatus.valid) {
    throw new Error(cookieStatus.message || "Cookie异常，请重新获取");
  }

  let rawProduct: OzonProductLinkRawItem | null = null;
  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt++) {
    rawProduct = await dependencies.fetchProduct(normalizedUrl);
    if (!isOzonErrorPageProduct(rawProduct)) {
      break;
    }
    logger.warn(`Ozon链接解析返回错误页，准备重试 (${attempt}/${MAX_FETCH_ATTEMPTS}): ${normalizedUrl}`);
    rawProduct = null;
  }

  if (!rawProduct) {
    throw new Error("Ozon返回错误页，请稍后重试或重新获取Cookie");
  }

  const currency = detectOzonMoneyCurrency(rawProduct);
  if (currency === "RUB") {
    throw new Error("Ozon页面仍返回卢布价格，请重新获取Cookie并确认货币为人民币");
  }

  const product = mapOzonProductLinkRawItem(rawProduct);
  if (!product.id || !product.name) {
    throw new Error("链接解析失败：商品信息不完整");
  }

  const typeInfo = await dependencies.extractType(product.productUrl || normalizedUrl);
  product.productType = typeInfo.type || "";

  return {
    success: true,
    data: product,
    message: "链接解析成功",
  };
};

export const resolveOzonProductLinkWithDefaultDependencies = (productUrl: string) =>
  resolveOzonProductLink(
    {
      validateCookie: validateOzonCookieForBrowsing,
      fetchProduct: fetchOzonProductByUrlWithScript,
      extractType: extractProductType,
    },
    productUrl,
  );
