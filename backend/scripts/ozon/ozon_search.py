# -*- coding: utf-8 -*-
import sys
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

"""
Ozon 商品搜索脚本 (CDP 模式)
===========================
用法: python ozon_search.py "关键词" [数量]
  数量: 可选，限制返回商品数（默认不限）
"""
import json
import os
import sys
from typing import Optional
from urllib.parse import quote

from playwright.sync_api import sync_playwright

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, '..', 'data')
os.makedirs(DATA_DIR, exist_ok=True)
COOKIE_FILE = os.path.join(DATA_DIR, 'ozon_cookies.json')
RESULT_FILE = os.path.join(DATA_DIR, '_ozon_result.json')

ERROR_PAGE_PATTERNS = (
    'нет соединения',
    'No connection',
    'captcha',
    'challenge',
)


def log(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)


def has_graphic_display() -> bool:
    if os.name == 'nt':
        return True
    return bool(os.environ.get('DISPLAY'))


def load_cookies() -> Optional[dict]:
    if not os.path.exists(COOKIE_FILE):
        log(f"[X] 未找到 {COOKIE_FILE}")
        log("    请先运行: python ozon_cookie.py")
        return None
    with open(COOKIE_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    cookies = data.get('cookies', [])
    ls = data.get('local_storage', {})
    
    log(f"[OK] 已加载 {len(cookies)} 条 cookies (导出: {data.get('exported_at', '?')})")
    log(f"[OK] 已加载 {len(ls)} 条 localStorage")
    
    # 验证Cookie完整性
    cookie_names = [c['name'] for c in cookies]
    log(f"[debug] Cookie names: {cookie_names}")
    
    # 检查是否包含Ozon相关Cookie
    ozon_cookies = [c for c in cookies if '.ozon' in c.get('domain', '') or 'ozon' in c.get('domain', '')]
    if len(ozon_cookies) < 5:
        log(f"[WARN] Ozon相关Cookie数量过少: {len(ozon_cookies)}，可能不完整")
    
    # 检查localStorage
    if len(ls) < 3:
        log(f"[WARN] localStorage数量过少: {len(ls)}，可能不完整")
    
    return data


def is_ozon_error_page(page) -> bool:
    try:
        snapshot = page.evaluate(
            """
            () => {
                const title = document.title || '';
                const body = document.body ? document.body.innerText.slice(0, 1200) : '';
                const image = document.querySelector('img[src*="abt-challenge"], img[src*="incidents/images/warn"]');
                return { text: `${title}\n${body}`, hasChallengeImage: !!image };
            }
            """
        )
    except Exception:
        return False

    text = str(snapshot.get('text') or '')
    if snapshot.get('hasChallengeImage'):
        return True
    return any(pattern.lower() in text.lower() for pattern in ERROR_PAGE_PATTERNS)


def extract_products(page, max_count: int = 0) -> list:
    """从搜索页提取商品"""
    if is_ozon_error_page(page):
        raise RuntimeError('Ozon返回错误页，请稍后重试或重新获取Cookie')

    count = page.evaluate(
        "document.querySelectorAll(\"[class*='tile-root']\").length"
    )
    if count == 0:
        try:
            page.wait_for_selector("[class*='tile-root']", state='attached', timeout=3000)
            count = page.evaluate(
                "document.querySelectorAll(\"[class*='tile-root']\").length"
            )
        except Exception as e:
            log(f"[warn] wait_for_selector 超时: {e}")
            if is_ozon_error_page(page):
                raise RuntimeError('Ozon返回错误页，请稍后重试或重新获取Cookie')
            return []

    log(f"[debug] 找到 {count} 个商品卡片")
    if count == 0:
        return []

    products = page.evaluate("""
    () => {
        const tiles = document.querySelectorAll('[class*="tile-root"]');
        const results = [];

        const deliveryPattern = /^(\\d+\\s*分钟内|一小时内|\\d+\\s*小时内|今天|明天|后天|[一二三四五六七]月\\d{1,2}日)/;
        const skipTokens = new Set([
            '降价了', '就是这个价', '剩余数量', '还剩',
            '明天', '后天', '今天', '大促销', '广告', '前往描述'
        ]);
        const pricePattern = /^(?:¥\\s*)?[\\d\\s\\u00a0\\u202f,.]+\\s*¥?$/;
        const skipPattern = /^-?\\d+%$|^[1-5][.,]\\d$|^[\\d,]+\\s*[xa0\\xa0]*评价$/;

        const normalizeSpaces = (value) => String(value || '').replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim();
        const normalizeNumberToken = (value) => {
            let token = String(value || '').replace(/[\\s\\u00a0\\u202f]/g, '');
            const commaIndex = token.lastIndexOf(',');
            const dotIndex = token.lastIndexOf('.');
            if (commaIndex >= 0 && dotIndex >= 0) {
                token = commaIndex > dotIndex
                    ? token.replace(/\\./g, '').replace(',', '.')
                    : token.replace(/,/g, '');
            } else if (commaIndex >= 0) {
                token = token.replace(',', '.');
            }
            return token;
        };
        const parseMoney = (raw) => {
            const text = normalizeSpaces(raw);
            const match = text.match(/(?:¥\\s*)?([\\d\\s\\u00a0\\u202f,.]+)\\s*¥|¥\\s*([\\d\\s\\u00a0\\u202f,.]+)/);
            if (!match) return NaN;
            const value = parseFloat(normalizeNumberToken(match[1] || match[2]));
            return Number.isFinite(value) ? value : NaN;
        };
        const parseDiscount = (raw) => {
            const match = String(raw || '').match(/[−-]\\s*(\\d+(?:[,.]\\d+)?)%/);
            return match ? parseFloat(match[1].replace(',', '.')) : 0;
        };
        const formatMoney = (value) => Number.isFinite(value) ? `¥${value.toFixed(2)}` : '';
        const deriveOriginalPrice = (currentRaw, originalRaw, discountRaw) => {
            const currentPriceValue = parseMoney(currentRaw);
            let originalPriceValue = parseMoney(originalRaw);
            const discountValue = parseDiscount(discountRaw);
            if (discountValue > 0 && Number.isFinite(currentPriceValue)) {
                if (!Number.isFinite(originalPriceValue) || originalPriceValue <= currentPriceValue) {
                    originalPriceValue = currentPriceValue / (1 - discountValue / 100);
                    return formatMoney(originalPriceValue);
                }
            }
            return Number.isFinite(originalPriceValue) ? originalRaw : '';
        };
        const isTitleCandidate = (value) => {
            const text = normalizeSpaces(value);
            if (text.length < 2) return false;
            if (text.length > 180) return false;
            if (skipTokens.has(text)) return false;
            if (pricePattern.test(text) || text.includes('¥')) return false;
            if (skipPattern.test(text)) return false;
            if (deliveryPattern.test(text)) return false;
            if (/^\\d+和\\d+[,.]/.test(text)) return false;
            if (/^(\\d+件|还剩\\d+|\\d+剩余数量)$/.test(text)) return false;
            return /[\\p{L}\\p{N}]/u.test(text);
        };
        const pushTitleCandidate = (target, value) => {
            normalizeSpaces(value)
                .split(/\\n|\\r|\\s{2,}/)
                .map(normalizeSpaces)
                .filter(isTitleCandidate)
                .forEach(text => {
                    if (!target.includes(text)) target.push(text);
                });
        };

        tiles.forEach((tile) => {
            // ── 链接 & SKU ──
            const linkEl = tile.querySelector('a[href*="/product/"]');
            if (!linkEl) return;
            const href = linkEl.href;
            const skuMatch = href.match(/\\/product\\/([^/?]+)/);
            const sku = skuMatch ? skuMatch[1] : '';

            // ── 图片 ──
            let thumbnail = '';
            const imgEl = tile.querySelector('img[src]');
            if (imgEl && imgEl.src) thumbnail = imgEl.src;
            const mainImage = thumbnail.replace(/\\/wc\\d+\\//, '/wc1200/');

            // ── TreeWalker 收集文本节点 ──
            const texts = [];
            const walker = document.createTreeWalker(
                tile, NodeFilter.SHOW_TEXT,
                { acceptNode: n => n.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT }
            );
            while (walker.nextNode()) {
                texts.push(walker.currentNode.textContent.trim());
            }

            // ── 价格解析：按卡片文本顺序取现价，再用折扣校验/反推原价 ──
            const priceMatches = [];
            texts.forEach(t => {
                if (String(t).includes('¥')) {
                    const val = parseMoney(t);
                    if (Number.isFinite(val) && val >= 0) {
                        priceMatches.push({ raw: t, value: val });
                    }
                }
            });
            const currentPriceMatch = priceMatches[0] || null;
            const currentPrice = currentPriceMatch ? currentPriceMatch.raw : '';

            // ── 折扣 ──
            let discount = '';
            for (const t of texts) {
                if (/^−\\d+%$/.test(t)) { discount = t; break; }
                if (/^-\\d+%$/.test(t)) { discount = t; break; }
            }

            let originalPrice = '';
            if (currentPriceMatch) {
                const originalMatch = priceMatches
                    .slice(1)
                    .find(item => item.value > currentPriceMatch.value);
                originalPrice = deriveOriginalPrice(currentPrice, originalMatch ? originalMatch.raw : '', discount);
            }

            // ── 评分 ──
            let rating = '';
            for (const t of texts) {
                if (/^[1-5][.,]\\d$/.test(t)) { rating = t.replace(',', '.'); break; }
            }

            // ── 评论数 ──
            let reviewCount = '';
            for (const t of texts) {
                const m = t.match(/^([\\d,]+)\\s*[xa0\\xa0\\s]*评价/);
                if (m) { reviewCount = m[1].replace(',', ''); break; }
            }

            // ── 库存 ──
            let stock = '';
            for (const t of texts) {
                let m = t.match(/(\\d+)剩余数量/);
                if (m) { stock = m[1]; break; }
                m = t.match(/还剩(\\d+)/);
                if (m) { stock = m[1]; break; }
                m = t.match(/^(\\d+)和\\d+/);   // "26 和 0,09¥" 格式中的第一个数字
                if (m) { stock = m[1]; break; }
                m = t.match(/^(\\d+)件$/);
                if (m) { stock = m[1]; break; }
            }

            // ── 标题：优先商品链接/图片信息，再回退到卡片文本，避免配送时间覆盖商品名 ──
            const titleCandidates = [];
            pushTitleCandidate(titleCandidates, imgEl ? imgEl.alt : '');
            pushTitleCandidate(titleCandidates, linkEl.getAttribute('title') || '');
            pushTitleCandidate(titleCandidates, linkEl.getAttribute('aria-label') || '');
            pushTitleCandidate(titleCandidates, linkEl.textContent || '');
            texts.forEach(t => pushTitleCandidate(titleCandidates, t));
            const title = titleCandidates[0] || '';

            results.push({
                sku,
                link: href,
                thumbnail,
                main_image: mainImage,
                title: title || '',
                price: currentPrice,
                original_price: originalPrice,
                discount,
                rating,
                review_count: reviewCount,
                stock: stock || '',
            });
        });

        return results;
    }
    """)

    # 按数量限制截取
    if max_count > 0 and len(products) > max_count:
        products = products[:max_count]
        log(f"[info] 按配置截取前 {max_count} 个商品")
    return products or []


def wait_and_extract_products(page, max_count: int = 0, attempts: int = 3) -> list:
    """Ozon 搜索页会间歇性清空商品卡，短重试比一次长等待稳定。"""
    products = []
    for attempt in range(1, attempts + 1):
        products = extract_products(page, max_count)
        if products:
            return products

        try:
            page.wait_for_selector("[class*='tile-root']", state='attached', timeout=15000)
        except Exception as e:
            log(f"[warn] 第 {attempt} 次等待商品卡超时: {e}")

        products = extract_products(page, max_count)
        if products:
            return products

        if attempt < attempts:
            log(f"[warn] 第 {attempt} 次未提取到商品，刷新搜索页重试...")
            page.reload(wait_until='domcontentloaded', timeout=60000)
            page.wait_for_timeout(1200)

    return products


def merge_products(existing: list, fresh: list, max_count: int = 0) -> list:
    """按 SKU/链接去重合并商品。"""
    merged = []
    seen = set()
    for product in existing + fresh:
        key = product.get('sku') or product.get('link')
        if not key or key in seen:
            continue
        seen.add(key)
        merged.append(product)
        if max_count > 0 and len(merged) >= max_count:
            break
    return merged


def collect_more_products(page, products: list, max_count: int = 0) -> list:
    """渐进滚动加载更多商品，避免一次跳到底导致 Ozon 清空商品卡。"""
    if max_count > 0 and len(products) >= max_count:
        return products[:max_count]

    unchanged_rounds = 0
    for scroll_round in range(20):
        if max_count > 0 and len(products) >= max_count:
            break

        previous_len = len(products)
        page.mouse.wheel(0, 850)
        page.wait_for_timeout(1200)
        visible_count = page.evaluate(
            "document.querySelectorAll(\"[class*='tile-root']\").length"
        )
        log(f"    渐进滚动 {scroll_round + 1}: 可见 {visible_count} 个商品卡，已收集 {len(products)} 个")

        if visible_count == 0:
            unchanged_rounds += 1
            if unchanged_rounds >= 2:
                log("    商品卡连续消失，停止补量")
                break
            continue

        fresh = extract_products(page, 0)
        products = merge_products(products, fresh, max_count)
        if len(products) == previous_len:
            unchanged_rounds += 1
        else:
            unchanged_rounds = 0

        if unchanged_rounds >= 4:
            log("    未发现更多新商品，停止补量")
            break

    if max_count > 0 and len(products) > max_count:
        return products[:max_count]
    return products


def collect_products_from_pages(page, search_url: str, products: list, max_count: int = 0) -> list:
    """滚动补量失败时按 Ozon 搜索页 page 参数继续取结果。"""
    if max_count > 0 and len(products) >= max_count:
        return products[:max_count]

    unchanged_pages = 0
    for page_no in range(2, 8):
        if max_count > 0 and len(products) >= max_count:
            break

        before_len = len(products)
        page_url = f"{search_url}&page={page_no}"
        log(f"[4c] 尝试分页补量: page={page_no}")
        page.goto(page_url, wait_until='domcontentloaded', timeout=60000)
        page.wait_for_timeout(1200)

        try:
            fresh = wait_and_extract_products(page, max_count)
        except Exception as exc:
            if products:
                log(f"    分页补量失败，保留已获取商品: {exc}")
                break
            raise
        products = merge_products(products, fresh, max_count)
        log(f"    分页 {page_no}: 新增 {len(products) - before_len} 个，已收集 {len(products)} 个")

        if len(products) == before_len:
            unchanged_pages += 1
        else:
            unchanged_pages = 0

        if unchanged_pages >= 2:
            log("    连续分页未发现新商品，停止分页补量")
            break

    if max_count > 0 and len(products) > max_count:
        return products[:max_count]
    return products


def search(keyword: str, cookie_data: dict, max_count: int = 0, category: str = '', search_text_override: str = '') -> list:
    """启动浏览器 -> 注入 cookie -> 搜索 -> 提取"""
    log("[1] 启动浏览器...")

    chrome_paths = [
        os.environ.get('CHROME_PATH', ''),
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        r'C:\Program Files\Google\Chrome\Application\chrome.exe',
        r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
        os.path.expanduser(r'~\AppData\Local\Google\Chrome\Application\chrome.exe'),
    ]
    executable_path = next((p for p in chrome_paths if os.path.exists(p)), None)

    with sync_playwright() as p:
        headless_mode = not has_graphic_display()
        launch_args = {'headless': headless_mode}
        if executable_path:
            launch_args['executable_path'] = executable_path
            chrome_args = [
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled',
            ]
            if headless_mode:
                chrome_args.append('--headless=new')
            launch_args['args'] = chrome_args
            log("[1] 使用系统 Chrome")

        browser = p.chromium.launch(**launch_args)
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        )
        context.add_cookies(cookie_data.get('cookies', []))
        log(f"[2] 已注入 {len(cookie_data.get('cookies', []))} 条 cookies")

        page = context.new_page()
        page.goto('https://www.ozon.ru/', wait_until='domcontentloaded', timeout=30000)
        ls = cookie_data.get('local_storage', {})
        if ls:
            page.evaluate(
                "(d) => { for(const k in d){ localStorage.setItem(k, d[k]); } }",
            ls
            )
            log(f"[2b] 已注入 {len(ls)} 条 localStorage")

        search_text = search_text_override.strip() or (f'{keyword} {category}'.strip() if category and category != keyword else keyword)
        search_url = f'https://www.ozon.ru/search/?text={quote(search_text)}&from_global=true'
        log(f"[3] 搜索: {search_text}")
        if search_text != keyword:
            log(f"[3b] 原始关键词: {keyword}")
        page.goto(search_url, wait_until='domcontentloaded', timeout=60000)

        # 反爬检测
        if 'captcha' in page.url.lower() or 'challenge' in page.url.lower() or is_ozon_error_page(page):
            log("[ERR] Ozon返回错误页，请稍后重试或重新获取Cookie")
            browser.close()
            raise RuntimeError('Ozon返回错误页，请稍后重试或重新获取Cookie')

        # 页面样本
        sample = page.evaluate(
            "document.querySelector('[class*=\\'tile-root\\']') ? "
            "document.querySelector('[class*=\\'tile-root\\']').innerText.slice(0,120) : ''"
        )
        if sample:
            log(f"[4] 页面样本: {sample[:100]}")

        expected_currency = str(cookie_data.get('currency') or cookie_data.get('local_storage', {}).get('currency') or '').upper()
        if expected_currency == 'CNY':
            currency_state = page.evaluate("""
                () => {
                    const text = document.body ? document.body.innerText : '';
                    return { hasCny: text.includes('¥'), hasRub: text.includes('₽') };
                }
            """)
            if currency_state.get('hasRub') and not currency_state.get('hasCny'):
                browser.close()
                raise RuntimeError('Ozon页面仍返回卢布价格，请重新获取Cookie并确认货币为人民币')

        # Ozon 搜索页有时会在加载完成后被前端脚本清空成三点加载态，因此先在商品卡出现时立即提取。
        log(f"[5] 提取商品 (限制: {max_count if max_count > 0 else '不限'})...")
        products = wait_and_extract_products(page, max_count)

        # 不足配置数量时再尝试渐进滚动补充，避免一次跳到底导致页面被清空。
        if max_count <= 0 or len(products) < max_count:
            log("[4b] 触发懒加载...")
            products = collect_more_products(page, products, max_count)
        if max_count <= 0 or len(products) < max_count:
            products = collect_products_from_pages(page, search_url, products, max_count)
        page.evaluate("window.scrollTo(0, 0)")
        log(f"[OK] 共 {len(products)} 个商品")

        # 保存结果
        output = {
            'keyword': keyword,
            'category': category,
            'search_text': search_text,
            'count': max_count,
            'total': len(products),
            'products': products,
        }
        with open(RESULT_FILE, 'w', encoding='utf-8') as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
        log(f"[OK] 结果已保存: {RESULT_FILE}")

        browser.close()
        return products


def print_results(keyword: str, products: list):
    print(json.dumps({
        'keyword': keyword,
        'total': len(products),
        'products': products,
    }, ensure_ascii=False))


def run_once(keyword: str, max_count: int = 0, category: str = '', search_text_override: str = '') -> list:
    cookie_data = load_cookies()
    if not cookie_data:
        return []
    return search(keyword, cookie_data, max_count, category, search_text_override)


if __name__ == '__main__':
    if len(sys.argv) > 1:
        keyword = sys.argv[1]
        max_count = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2].isdigit() else 0
        category = sys.argv[3] if len(sys.argv) > 3 else ''
        search_text_override = sys.argv[4] if len(sys.argv) > 4 else ''
        products = run_once(keyword, max_count, category, search_text_override)
        print_results(keyword, products)
    else:
        log("用法: python ozon_search.py <关键词> [数量] [类目]")
        log("示例: python ozon_search.py 耳机 50 蓝牙耳机")
        sys.exit(1)
