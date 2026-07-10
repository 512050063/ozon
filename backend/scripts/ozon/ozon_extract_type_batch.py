# -*- coding: utf-8 -*-
"""
Ozon 商品类型批量提取脚本 (CDP 模式)
=========================
用法: python ozon_extract_type_batch.py <url1> <url2> ... 
      或从 stdin 读取 JSON 数组: echo '[url1,url2]' | python ozon_extract_type_batch.py

输出: 每行一个 JSON 结果（stdout），进度到 stderr
"""
import json
import os
import sys
from urllib.parse import urlsplit, urlunsplit

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

from playwright.sync_api import sync_playwright

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, '..', 'data')
os.makedirs(DATA_DIR, exist_ok=True)
COOKIE_FILE = os.path.join(DATA_DIR, 'ozon_cookies.json')
RESULT_FILE = os.path.join(DATA_DIR, '_ozon_batch_result.json')
TYPE_KEYWORDS = [
    '蓝牙耳机', '耳机', '平板电脑', '手机壳', '保护膜', '充电器', '数据线', '麦克风',
    '摄像头', '显示器', '连衣裙', '音箱', '鼠标', '键盘', '手表', '手环',
    '手机', '电脑', '背包', '水杯', '杯子', '玩具', '外套', '夹克', '裤子', '鞋',
    '包', '灯'
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
TRANSIENT_ERROR_TITLES = ['Похоже, нет соединения', 'нет соединения', 'No connection']


def normalize_product_url(product_url):
    try:
        parsed = urlsplit(product_url)
        if 'ozon.ru' in parsed.netloc and '/product/' in parsed.path:
            return urlunsplit((parsed.scheme, parsed.netloc, parsed.path, '', ''))
    except Exception:
        pass
    return product_url


def clean_document_title(title):
    value = (title or '').strip()
    for sep in ['——', ' - ', ' | ']:
        if sep in value:
            value = value.split(sep)[0].strip()
    return value


def infer_type_from_title(title):
    value = clean_document_title(title)
    for keyword in TYPE_KEYWORDS:
        if keyword in value:
            return keyword
    lower_value = value.lower()
    for keyword, product_type in URL_TYPE_KEYWORDS:
        if keyword in lower_value:
            return product_type
    return ''


def is_transient_error_title(title):
    value = title or ''
    return any(pattern.lower() in value.lower() for pattern in TRANSIENT_ERROR_TITLES)


def load_cookies():
    if not os.path.exists(COOKIE_FILE):
        print(f"[X] 未找到 {COOKIE_FILE}", file=sys.stderr)
        return None
    with open(COOKIE_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    cookies = data.get('cookies', [])
    print(f"[OK] 已加载 {len(cookies)} 条 cookies", file=sys.stderr)
    return data


def extract_type(page, product_url, fallback_title=''):
    """进入详情页提取类型（复用同一页面）"""
    normalized_url = normalize_product_url(product_url)
    for attempt in range(3):
        page.goto(normalized_url, wait_until='domcontentloaded', timeout=60000)
        page.wait_for_timeout(4000 + attempt * 2000)
        if not is_transient_error_title(page.title()):
            break
        print(f"    [WARN] 详情页临时错误，重试 {attempt + 1}/3", file=sys.stderr)

    # 检查页面语言
    lang_check = page.evaluate("""
    () => {
        const t = document.body.innerText.substring(0, 500);
        return {
            hasZh: t.includes('商品') || t.includes('搜索') || t.includes('购物车'),
            hasCNY: t.includes('¥'),
            snippet: t.substring(0, 200)
        };
    }
    """)
    
    if not lang_check.get('hasZh'):
        print(f"    [WARN] 页面非中文，可能Cookie失效", file=sys.stderr)

    # 滚动到特征区
    section_found = False
    for scroll_step in range(10):
        page.evaluate("window.scrollBy(0, 800)")
        page.wait_for_timeout(1500)
        found = page.evaluate(
            "() => { var s = document.querySelector('#section-characteristics'); return s ? s.getBoundingClientRect().top : -1; }"
        )
        if found >= 0 and found < 900:
            section_found = True
            page.evaluate(
                "() => { var s = document.querySelector('#section-characteristics'); if(s) s.scrollIntoView({behavior:'smooth', block:'center'}); }"
            )
            page.wait_for_timeout(2000)
            break

    if not section_found:
        print(f"    [WARN] 未找到 #section-characteristics", file=sys.stderr)

    data = page.evaluate("""
    () => {
        var h1 = document.querySelector('h1');
        var title = h1 ? h1.textContent.trim() : '';
        var docTitle = document.title ? document.title.trim() : '';

        var typeValue = '';
        var section = document.querySelector('#section-characteristics');
        if (section) {
            var dts = section.querySelectorAll('dl dt');
            var dds = section.querySelectorAll('dl dd');
            for (var i = 0; i < dts.length; i++) {
                var key = dts[i].textContent.trim();
                var dd = dds[i];
                var val = dd ? dd.textContent.trim() : '';
                if (key === 'Тип' || key === 'тип' || key === 'Тип товара' || key === 'Вид' || key === '类型') {
                    typeValue = val;
                    break;
                }
            }
        }
        
        // 备选：从面包屑提取
        var breadcrumb = '';
        var scripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (var s of scripts) {
            try {
                var d = JSON.parse(s.textContent);
                if (d['@type'] === 'BreadcrumbList' && d.itemListElement) {
                    var items = d.itemListElement;
                    breadcrumb = items.map(x => x.name).join(' > ');
                }
            } catch(e) {}
        }

        return { title: title || docTitle, type: typeValue, breadcrumb: breadcrumb, docTitle: docTitle };
    }
    """)

    page_title = data.get('title', '')
    title = fallback_title if fallback_title and (not page_title or is_transient_error_title(page_title)) else page_title
    type_val = data.get('type', '')
    breadcrumb = data.get('breadcrumb', '')
    
    # 如果 type 为空，尝试从面包屑最后一级提取
    final_type = type_val
    source = 'type_field'
    if not final_type and breadcrumb:
        parts = breadcrumb.split(' > ')
        if len(parts) >= 2:
            final_type = parts[-1]  # 最后一级
            source = 'breadcrumb'
    if not final_type and title:
        final_type = infer_type_from_title(title)
        source = 'title_keyword' if final_type else source
    if not final_type and fallback_title:
        final_type = infer_type_from_title(fallback_title)
        source = 'fallback_title' if final_type else source
    if not final_type:
        final_type = infer_type_from_title(product_url)
        source = 'url_keyword' if final_type else source

    return {'title': title, 'type': final_type, 'source': source, 'breadcrumb': breadcrumb}


def main():
    # 获取 URL 列表
    urls = []
    fallback_titles = {}
    if len(sys.argv) > 1:
        urls = sys.argv[1:]
    else:
        raw = sys.stdin.read().strip()
        # 去掉 BOM
        if raw.startswith('\ufeff'):
            raw = raw.lstrip('\ufeff')
        if raw:
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, dict):
                    urls = parsed.get('urls') or []
                    fallback_titles = parsed.get('titles') or {}
                    fallback_titles = {
                        **fallback_titles,
                        **{normalize_product_url(k): v for k, v in fallback_titles.items()}
                    }
                else:
                    urls = parsed
            except Exception as e:
                print(f"[WARN] JSON解析失败: {e}, 使用fallback", file=sys.stderr)
                urls = [u.strip() for u in raw.split('\n') if u.strip()]

    if not urls:
        print(json.dumps({'success': False, 'total': 0, 'results': [], 'message': '无URL'}))
        return

    cookie_data = load_cookies()
    if not cookie_data:
        result = {'success': False, 'total': len(urls), 'results': [], 'message': '未找到Cookie文件'}
        print(json.dumps(result, ensure_ascii=False))
        return

    total = len(urls)
    results = []

    # 启动浏览器
    chrome_paths = [
        r'C:\Program Files\Google\Chrome\Application\chrome.exe',
        r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
        os.path.expanduser(r'~\AppData\Local\Google\Chrome\Application\chrome.exe'),
    ]
    executable_path = next((p for p in chrome_paths if os.path.exists(p)), None)

    try:
        with sync_playwright() as p:
            launch_args = {'headless': True}
            if executable_path:
                launch_args['executable_path'] = executable_path
                launch_args['args'] = ['--headless=new']

            browser = p.chromium.launch(**launch_args)
            context = browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
            )
            context.add_cookies(cookie_data.get('cookies', []))
            print(f"[1] 已注入 {len(cookie_data.get('cookies', []))} 条 cookies", file=sys.stderr)

            page = context.new_page()

            # 注入 localStorage
            ls = cookie_data.get('local_storage', {})
            if ls:
                page.goto('https://www.ozon.ru/', wait_until='domcontentloaded', timeout=30000)
                page.evaluate(
                    "(d) => { for(const k in d){ localStorage.setItem(k, d[k]); } }", ls
                )
                print(f"[2] 已注入 {len(ls)} 条 localStorage", file=sys.stderr)

            print(f"[OK] 浏览器就绪，开始批量提取 {total} 个商品\n", file=sys.stderr)

            for idx, url in enumerate(urls):
                try:
                    print(f"[{idx+1}/{total}] 提取: {url[:60]}...", file=sys.stderr)
                    
                    fallback_title = fallback_titles.get(url) or fallback_titles.get(normalize_product_url(url)) or ''
                    result_data = extract_type(page, url, fallback_title)
                    
                    has_type = bool(str(result_data.get('type') or '').strip())
                    item = {
                        'url': url,
                        'success': has_type,
                        'type': result_data['type'],
                        'source': result_data['source'],
                        'title': result_data['title'],
                        'message': '提取成功' if has_type else '未获取到商品类型'
                    }
                    results.append(item)
                    
                    print(json.dumps(item, ensure_ascii=False))
                    sys.stdout.flush()
                    
                    print(f"    -> {result_data['type']} [{result_data['source']}]", file=sys.stderr)
                    
                except Exception as e:
                    item = {
                        'url': url,
                        'success': False,
                        'type': '',
                        'source': '',
                        'title': '',
                        'message': str(e)
                    }
                    results.append(item)
                    print(json.dumps(item, ensure_ascii=False))
                    sys.stdout.flush()
                    print(f"    [X] 错误: {e}", file=sys.stderr)

            browser.close()

        # 保存完整结果
        final = {
            'success': True,
            'total': total,
            'done': sum(1 for r in results if r.get('success')),
            'error': sum(1 for r in results if not r.get('success')),
            'results': results
        }
        with open(RESULT_FILE, 'w', encoding='utf-8') as f:
            json.dump(final, f, ensure_ascii=False, indent=2)
        
        print(f"\n[OK] 全部完成: {final['done']}/{total}", file=sys.stderr)

    except Exception as e:
        print(f"\n[X] 致命错误: {e}", file=sys.stderr)
        err_result = {'success': False, 'total': total, 'results': results, 'message': str(e)}
        print(json.dumps(err_result, ensure_ascii=False))


if __name__ == '__main__':
    main()
