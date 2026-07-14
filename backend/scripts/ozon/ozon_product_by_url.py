# -*- coding: utf-8 -*-
import json
import html as html_module
import os
import re
import sys
from typing import Optional

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

from playwright.sync_api import sync_playwright

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, '..', 'data')
COOKIE_FILE = os.path.join(DATA_DIR, 'ozon_cookies.json')

ERROR_TITLE_PATTERNS = (
    'Похоже, нет',
    'нет соединения',
    'No connection',
)
TYPE_KEYWORDS = [
    '吹风机', '电吹风', '蓝牙耳机', '耳机', '平板电脑', '手机壳', '保护膜', '充电器',
    '数据线', '麦克风', '摄像头', '显示器', '连衣裙', '音箱', '鼠标', '键盘',
    '手表', '手环', '手机', '电脑', '背包', '水杯', '杯子', '玩具', '外套',
    '夹克', '裤子', '鞋', '包', '灯',
]
URL_TYPE_KEYWORDS = [
    ('fen-dlya-volos', '吹风机'),
    ('fen', '吹风机'),
    ('naushniki', '耳机'),
    ('headphone', '耳机'),
    ('earphone', '耳机'),
    ('smartfon', '手机'),
    ('phone', '手机'),
    ('chehol', '手机壳'),
    ('kabel', '数据线'),
    ('zaryad', '充电器'),
]


def print_json(data: dict) -> None:
    print(json.dumps(data, ensure_ascii=False))


def has_graphic_display() -> bool:
    if os.name == 'nt':
        return True
    return bool(os.environ.get('DISPLAY'))


def should_retry_headed(error: Exception) -> bool:
    message = str(error)
    return has_graphic_display() and (
        'Ozon返回错误页' in message
        or 'captcha' in message.lower()
        or 'challenge' in message.lower()
        or 'нет соединения' in message
    )


def load_cookie_data() -> Optional[dict]:
    if not os.path.exists(COOKIE_FILE):
        print_json({
            'success': False,
            'message': '未找到有效的Cookie数据，请先配置Cookie',
        })
        return None

    with open(COOKIE_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    cookies = data.get('cookies', [])
    ozon_cookies = [
        cookie for cookie in cookies
        if 'ozon' in str(cookie.get('domain', '')).lower()
    ]
    if not ozon_cookies:
        print_json({
            'success': False,
            'message': 'Cookie文件中没有Ozon相关Cookie',
        })
        return None

    print(f"[OK] 已加载 {len(cookies)} 条 cookies，Ozon相关 {len(ozon_cookies)} 条", file=sys.stderr)
    return data


def normalize_image(src: str) -> str:
    if not src:
        return ''
    return re.sub(r'/wc\d+/', '/wc1200/', src)


def normalize_product_url(url: str, fallback_url: str) -> str:
    if not url:
        return fallback_url
    return url.split('?')[0].split('#')[0]


def normalize_input_product_url(url: str) -> str:
    return url.split('?')[0].split('#')[0]


def clean_document_title(title: str) -> str:
    value = (title or '').strip()
    for sep in ['——', ' - ', ' | ']:
        if sep in value:
            value = value.split(sep)[0].strip()
    return value


def infer_type_from_text(text: str) -> str:
    value = clean_document_title(text)
    for keyword in TYPE_KEYWORDS:
        if keyword in value:
            return keyword
    lower_value = value.lower()
    for keyword, product_type in URL_TYPE_KEYWORDS:
        if keyword in lower_value:
            return product_type
    return ''


def extract_sku_from_url(url: str) -> str:
    match = re.search(r'/product/[^/?#]*?(\d{6,})(?:[/?#]|$)', url or '')
    return match.group(1) if match else ''


def build_minimal_product_from_url(page, product_url: str) -> dict:
    title = clean_document_title(page.title() or '')
    if is_transient_error_text(title):
        title = ''
    normalized_url = normalize_input_product_url(product_url)
    return {
        'sku': extract_sku_from_url(product_url),
        'link': normalized_url,
        'thumbnail': '',
        'main_image': '',
        'title': title,
        'price': '',
        'original_price': '',
        'currency': '',
        'discount': '',
        'rating': '',
        'review_count': '',
        'stock': '',
        'inferred_type': infer_type_from_text(f"{title} {normalized_url}"),
        'body_sample': '',
    }


def _first_text(value) -> str:
    if isinstance(value, list):
        return _first_text(value[0]) if value else ''
    if isinstance(value, dict):
        return str(value.get('url') or value.get('content') or '').strip()
    return str(value or '').strip()


def _iter_jsonld_products(value):
    if isinstance(value, list):
        for item in value:
            yield from _iter_jsonld_products(item)
        return
    if not isinstance(value, dict):
        return

    item_type = value.get('@type')
    item_types = item_type if isinstance(item_type, list) else [item_type]
    if any(str(t).lower() == 'product' for t in item_types):
        yield value

    graph = value.get('@graph')
    if graph:
        yield from _iter_jsonld_products(graph)


def extract_structured_product_from_html(html: str, fallback_url: str) -> dict:
    """Extract product data from JSON-LD/meta when Ozon does not render visible DOM."""
    product = {
        'sku': extract_sku_from_url(fallback_url),
        'link': normalize_input_product_url(fallback_url),
        'thumbnail': '',
        'main_image': '',
        'title': '',
        'price': '',
        'original_price': '',
        'currency': '',
        'discount': '',
        'rating': '',
        'review_count': '',
        'stock': '',
    }
    if not html:
        return product

    meta_image = re.search(
        r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']',
        html,
        re.I,
    )
    if meta_image:
        product['thumbnail'] = html_module.unescape(meta_image.group(1)).strip()
        product['main_image'] = product['thumbnail']

    for match in re.finditer(
        r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html,
        re.I | re.S,
    ):
        raw_json = html_module.unescape(match.group(1).strip())
        if not raw_json:
            continue
        try:
            parsed = json.loads(raw_json)
        except Exception:
            continue

        for structured in _iter_jsonld_products(parsed):
            offers = structured.get('offers') or {}
            if isinstance(offers, list):
                offers = offers[0] if offers else {}
            rating = structured.get('aggregateRating') or {}
            image = _first_text(structured.get('image'))
            if image:
                product['thumbnail'] = image
                product['main_image'] = image
            product['sku'] = _first_text(structured.get('sku')) or product['sku']
            product['link'] = normalize_product_url(_first_text(offers.get('url')), product['link'])
            product['title'] = _first_text(structured.get('name')) or product['title']
            product['price'] = _first_text(offers.get('price')) or product['price']
            product['currency'] = _first_text(offers.get('priceCurrency')) or product['currency']
            if isinstance(rating, dict):
                product['rating'] = _first_text(rating.get('ratingValue')) or product['rating']
                product['review_count'] = _first_text(rating.get('reviewCount')) or product['review_count']
            if product.get('sku') and product.get('title'):
                return product

    return product


def merge_structured_product(product: dict, structured: dict) -> dict:
    if not structured:
        return product

    merged = dict(product)
    for key in ['sku', 'link', 'thumbnail', 'main_image', 'price', 'original_price', 'currency', 'discount', 'rating', 'review_count', 'stock']:
        if not merged.get(key) and structured.get(key):
            merged[key] = structured[key]

    structured_title = structured.get('title') or ''
    current_title = merged.get('title') or ''
    if structured_title and (
        not current_title
        or '——' in current_title
        or re.search(r'\(\d{6,}\)\s*$', current_title)
        or is_transient_error_text(current_title)
    ):
        merged['title'] = structured_title

    return merged


def is_transient_error_text(text: str) -> bool:
    return any(pattern.lower() in (text or '').lower() for pattern in ERROR_TITLE_PATTERNS)


def build_local_storage(cookie_data: dict) -> dict:
    local_storage = dict(cookie_data.get('local_storage', {}) or {})
    lang = cookie_data.get('lang') or local_storage.get('lang') or local_storage.get('language') or 'zh'
    currency = cookie_data.get('currency') or local_storage.get('currency') or 'CNY'
    local_storage['lang'] = lang
    local_storage['language'] = lang
    local_storage['currency'] = currency
    return local_storage


def is_error_page_snapshot(data: dict) -> bool:
    title = data.get('title') or ''
    image = data.get('main_image') or data.get('thumbnail') or ''
    body_sample = data.get('body_sample') or ''
    merged_text = f"{title}\n{body_sample}"
    if any(pattern.lower() in merged_text.lower() for pattern in ERROR_TITLE_PATTERNS):
        return True
    return 'abt-challenge' in image or 'incidents/images/warn' in image


def extract_product(page, fallback_url: str) -> dict:
    return page.evaluate(
        """
        (fallbackUrl) => {
            const clean = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
            const textNodes = [];
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                { acceptNode: n => clean(n.textContent) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT }
            );
            while (walker.nextNode()) textNodes.push(clean(walker.currentNode.textContent));

            const titleEl =
                document.querySelector('[data-widget="webProductHeading"] h1') ||
                document.querySelector('[data-widget="webProductHeading"]') ||
                document.querySelector('h1');
            const title = clean(titleEl ? titleEl.textContent : document.title);

            const imageEl =
                document.querySelector('[data-widget="webGallery"] img[src*="/wc"]') ||
                document.querySelector('[data-widget="webGallery"] img[src]') ||
                document.querySelector('img[src*="ozonstatic"][src*="/wc"]') ||
                document.querySelector('img[src*="ozone.ru"][src*="/wc"]') ||
                document.querySelector('img[src]');
            const image = imageEl ? imageEl.src : '';

            const priceCandidates = [];
            const originalPriceCandidates = [];
            const pricePattern = /(?:[¥₽]\\s*[\\d\\s,.]+|[\\d\\s,.]+\\s*[¥₽])/g;
            const parsePriceValue = (priceText) => {
                const numericMatch = priceText.match(/([\\d\\s,.]+)/);
                if (!numericMatch) return null;
                let numeric = numericMatch[1].replace(/\\s/g, '');
                if (numeric.includes(',') && numeric.includes('.')) {
                    numeric = numeric.replace(/,/g, '');
                } else {
                    numeric = numeric.replace(',', '.');
                }
                const value = parseFloat(numeric);
                return Number.isFinite(value) && value > 0 ? value : null;
            };
            const extractPriceFragments = (text) => {
                pricePattern.lastIndex = 0;
                return Array.from(text.matchAll(pricePattern)).map(match => clean(match[0]));
            };
            const detectCurrency = (text) => {
                if (String(text || '').includes('¥')) return 'CNY';
                if (String(text || '').includes('₽')) return 'RUB';
                return '';
            };
            const bodyText = clean(document.body ? document.body.innerText : '');
            const mainProductText = clean(bodyText.split(/低价推荐|为您推荐|Вам может понравиться|Рекомендуем/)[0] || bodyText);
            const mainPriceFragments = extractPriceFragments(mainProductText);
            if (mainPriceFragments.length > 0) {
                const currentRaw = mainPriceFragments[0];
                const currentValue = parsePriceValue(currentRaw);
                if (currentValue != null) {
                    priceCandidates.push({ raw: currentRaw, value: currentValue, currency: detectCurrency(currentRaw), priority: 0 });
                    for (const raw of mainPriceFragments.slice(1)) {
                        const value = parsePriceValue(raw);
                        if (value != null && value >= currentValue * 1.15) {
                            originalPriceCandidates.push({ raw, value, currency: detectCurrency(raw), priority: 0 });
                        }
                    }
                }
            }
            document.querySelectorAll('body *').forEach((el) => {
                const text = clean(el.textContent);
                if (!text) return;
                const fragments = extractPriceFragments(text);
                if (fragments.length === 0) return;
                const contextText = clean((el.closest('[data-widget]') || el).textContent || text);
                const isRecommendation = /低价推荐|从\\s*[\\d\\s,.]+\\s*[¥₽]|от\\s*[\\d\\s,.]+\\s*[¥₽]/i.test(contextText);
                const style = window.getComputedStyle(el);
                const isStruck = String(style.textDecorationLine || '').includes('line-through');
                for (const raw of fragments) {
                    const value = parsePriceValue(raw);
                    if (value == null) continue;
                    if (isStruck) {
                        originalPriceCandidates.push({ raw, value, currency: detectCurrency(raw), priority: 1 });
                    } else if (!isRecommendation) {
                        priceCandidates.push({ raw, value, currency: detectCurrency(raw), priority: 1 });
                    }
                }
            });
            if (priceCandidates.length === 0) {
                for (const text of textNodes) {
                    const fragments = extractPriceFragments(text);
                    for (const raw of fragments) {
                        const value = parsePriceValue(raw);
                        if (value != null) priceCandidates.push({ raw, value, currency: detectCurrency(raw), priority: 2 });
                    }
                }
            }
            priceCandidates.sort((a, b) => (a.priority - b.priority) || (a.value - b.value));
            if (originalPriceCandidates.length === 0) {
                const currentValue = priceCandidates[0] ? priceCandidates[0].value : 0;
                for (const text of textNodes) {
                    const fragments = extractPriceFragments(text);
                    for (const raw of fragments) {
                        const value = parsePriceValue(raw);
                        if (value != null && value >= currentValue * 1.15) {
                            originalPriceCandidates.push({ raw, value, currency: detectCurrency(raw), priority: 2 });
                        }
                    }
                }
            }
            originalPriceCandidates.sort((a, b) => (a.priority - b.priority) || (b.value - a.value));

            const combinedText = clean(textNodes.join(' '));

            let rating = '';
            for (const text of textNodes) {
                if (/^[1-5][,.]\\d$/.test(text)) {
                    rating = text.replace(',', '.');
                    break;
                }
            }
            if (!rating) {
                const ratingMatch = combinedText.match(/(?:^|[^\\d])([1-5][,.]\\d)(?=\\s*(?:\\d|评价|评论|отзыв|отзыва|отзывов|reviews?|\\b))/i);
                if (ratingMatch) rating = ratingMatch[1].replace(',', '.');
            }

            let reviewCount = '';
            const reviewSource = combinedText.replace(/\\b[1-5][,.]\\d\\b/g, ' ');
            const reviewMatches = Array.from(reviewSource.matchAll(/([\\d\\s\\u00a0\\u202f,.]+)\\s*(?:评价|评论|отзыв|отзыва|отзывов|reviews?)/gi));
            if (reviewMatches.length) {
                const nearest = reviewMatches[reviewMatches.length - 1][1];
                reviewCount = nearest.replace(/[^\\d]/g, '');
            }
            for (const text of textNodes) {
                if (reviewCount) break;
                const match = text.match(/^([\\d\\s,.]+)\\s*(评价|评论|отзыв|отзыва|отзывов|reviews?)/i);
                if (match) {
                    reviewCount = match[1].replace(/[\\s,.]/g, '');
                    break;
                }
            }

            let stock = '';
            for (const text of textNodes) {
                const match = text.match(/(?:还剩|剩余数量|осталось)\\s*(\\d+)/i);
                if (match) {
                    stock = match[1];
                    break;
                }
            }

            const canonical = document.querySelector('link[rel="canonical"]')?.href || location.href || fallbackUrl;
            const skuMatch = canonical.match(/\\/product\\/[^/?#]*?(\\d{6,})(?:[/?#]|$)/) ||
                fallbackUrl.match(/\\/product\\/[^/?#]*?(\\d{6,})(?:[/?#]|$)/);

            return {
                sku: skuMatch ? skuMatch[1] : '',
                link: canonical,
                thumbnail: image,
                main_image: image,
                title,
                price: priceCandidates[0] ? priceCandidates[0].raw : '',
                original_price: originalPriceCandidates[0] ? originalPriceCandidates[0].raw : '',
                currency: priceCandidates[0] ? priceCandidates[0].currency : '',
                discount: '',
                rating,
                review_count: reviewCount,
                stock,
                body_sample: clean(document.body ? document.body.innerText.slice(0, 500) : ''),
            };
        }
        """,
        fallback_url,
    )


def wait_for_product_page(page) -> None:
    for _ in range(20):
        ready = page.evaluate(
            """
            () => {
                const body = document.body ? document.body.innerText : '';
                const hasError = /Похоже,\\s*нет|нет соединения|No connection/i.test(body);
                const hasTitle = !!(
                    document.querySelector('[data-widget="webProductHeading"]') ||
                    document.querySelector('h1') ||
                    document.title
                );
                const hasImage = !!document.querySelector('img[src*="/wc"], img[src*="ozonstatic"]');
                return { ok: hasTitle && hasImage && !hasError, hasError };
            }
            """
        )
        if ready.get('ok'):
            return
        if ready.get('hasError'):
            return
        page.wait_for_timeout(1000)


def ensure_preferred_locale(page, local_storage: dict) -> None:
    if not local_storage:
        return
    page.evaluate("(d) => { for (const k in d) localStorage.setItem(k, d[k]); }", local_storage)


def should_reload_for_currency(page, local_storage: dict) -> bool:
    if (local_storage.get('currency') or '').upper() != 'CNY':
        return False
    try:
        return bool(page.evaluate(
            """
            () => {
                const body = document.body ? document.body.innerText : '';
                return body.includes('₽') && !body.includes('¥');
            }
            """
        ))
    except Exception:
        return False


def fetch_product(product_url: str, cookie_data: dict, headless_mode: bool = True) -> dict:
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

        browser = p.chromium.launch(**launch_args)
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        )
        context.add_cookies(cookie_data.get('cookies', []))
        local_storage = build_local_storage(cookie_data)
        if local_storage:
            local_storage_json = json.dumps(local_storage, ensure_ascii=False)
            context.add_init_script(
                f"(() => {{ const d = {local_storage_json}; try {{ for (const k in d) localStorage.setItem(k, d[k]); }} catch(e) {{}} }})()"
            )
        page = context.new_page()

        if local_storage:
            page.goto('https://www.ozon.ru/', wait_until='domcontentloaded', timeout=30000)
            ensure_preferred_locale(page, local_storage)
            print(f"[OK] 已注入 {len(local_storage)} 条 localStorage", file=sys.stderr)

        last_error = None
        target_url = normalize_input_product_url(product_url)
        for attempt in range(1, 4):
            print(f"[{attempt}/3] 访问商品链接", file=sys.stderr)
            page.goto(target_url, wait_until='domcontentloaded', timeout=60000)
            wait_for_product_page(page)
            page.wait_for_timeout(1500)
            if should_reload_for_currency(page, local_storage):
                print("[WARN] 页面仍为卢布，重新注入人民币配置并刷新", file=sys.stderr)
                ensure_preferred_locale(page, local_storage)
                page.reload(wait_until='domcontentloaded', timeout=60000)
                wait_for_product_page(page)
                page.wait_for_timeout(1500)

            product = extract_product(page, product_url)
            structured_product = extract_structured_product_from_html(page.content(), product_url)
            product = merge_structured_product(product, structured_product)
            product['link'] = normalize_product_url(product.get('link', ''), product_url)
            product['main_image'] = normalize_image(product.get('main_image', ''))
            product['thumbnail'] = normalize_image(product.get('thumbnail', ''))
            product['inferred_type'] = infer_type_from_text(f"{product.get('title', '')} {product.get('link', '')} {product_url}")

            if is_error_page_snapshot(product):
                last_error = 'Ozon返回错误页，请稍后重试或重新获取Cookie'
                print(f"[WARN] {last_error}", file=sys.stderr)
                page.wait_for_timeout(1000)
                continue

            if not product.get('sku') or not product.get('title'):
                fallback_product = build_minimal_product_from_url(page, product_url)
                if fallback_product.get('sku') and fallback_product.get('title'):
                    print("[WARN] 页面正文为空，使用标题和URL构建基础商品信息", file=sys.stderr)
                    product = fallback_product
                else:
                    last_error = '链接解析失败：未获取到商品信息'
                    print(f"[WARN] {last_error}", file=sys.stderr)
                    page.wait_for_timeout(1500)
                    continue

            if (local_storage.get('currency') or '').upper() == 'CNY' and product.get('currency') == 'RUB':
                last_error = 'Ozon页面仍返回卢布价格，请重新获取Cookie并确认货币为人民币'
                print(f"[WARN] {last_error}", file=sys.stderr)
                page.goto('https://www.ozon.ru/', wait_until='domcontentloaded', timeout=30000)
                ensure_preferred_locale(page, local_storage)
                page.wait_for_timeout(1500)
                continue

            product.pop('body_sample', None)
            browser.close()
            return product

        browser.close()
        raise RuntimeError(last_error or '链接解析失败：未获取到商品信息')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print_json({'success': False, 'message': '商品链接不能为空'})
        sys.exit(1)

    url = sys.argv[1].strip()
    cookie_data = load_cookie_data()
    if not cookie_data:
        sys.exit(1)

    try:
        try:
            product = fetch_product(url, cookie_data, headless_mode=True)
        except Exception as exc:
            if not should_retry_headed(exc):
                raise
            print(f"[WARN] headless 模式被 Ozon 拦截，切换有界面 Chrome 重试: {exc}", file=sys.stderr)
            product = fetch_product(url, cookie_data, headless_mode=False)
        print_json({'success': True, 'product': product})
    except Exception as exc:
        print_json({'success': False, 'message': str(exc)})
        sys.exit(1)
