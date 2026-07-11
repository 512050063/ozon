# -*- coding: utf-8 -*-
"""
Ozon 商品类型提取脚本
=====================
用法: python ozon_extract_type.py <商品链接>

输出: _ozon_type_result.json
"""
import json
import os
import sys
import re
from urllib.parse import urlsplit, urlunsplit

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

from playwright.sync_api import sync_playwright

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, '..', 'data')
COOKIE_FILE = os.path.join(DATA_DIR, 'ozon_cookies.json')
RESULT_FILE = os.path.join(DATA_DIR, '_ozon_type_result.json')
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


def extract_type(page, product_url):
    """进入详情页提取类型"""
    print(f"\n[提取] {product_url}", file=sys.stderr)

    normalized_url = normalize_product_url(product_url)
    for attempt in range(3):
        page.goto(normalized_url, wait_until='domcontentloaded', timeout=60000)
        page.wait_for_timeout(4000 + attempt * 2000)
        if not is_transient_error_title(page.title()):
            break
        print(f"    [WARN] 详情页临时错误，重试 {attempt + 1}/3", file=sys.stderr)

    # 滚动到特征区
    for _ in range(8):
        page.evaluate("window.scrollBy(0, 600)")
        page.wait_for_timeout(800)
        found = page.evaluate(
            "() => { var s = document.querySelector('#section-characteristics'); return s ? s.getBoundingClientRect().top : -1; }"
        )
        if found >= 0 and found < 800:
            page.evaluate(
                "() => { var s = document.querySelector('#section-characteristics'); if(s) s.scrollIntoView({behavior:'smooth', block:'center'}); }"
            )
            page.wait_for_timeout(1500)
            break

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

        return { title: title || docTitle, type: typeValue };
    }
    """)

    title = data.get('title', '')
    type_val = data.get('type', '')
    final_type = type_val if type_val else (infer_type_from_title(title) if title else '')
    source = 'type_field' if type_val else ('title_keyword' if final_type else '')
    if not final_type:
        final_type = infer_type_from_title(product_url)
        source = 'url_keyword' if final_type else ''

    print(f"    标题: {title}", file=sys.stderr)
    print(f"    类型: {type_val or '(无)'}", file=sys.stderr)
    print(f"    最终: {final_type} [{source}]", file=sys.stderr)

    return {'title': title, 'type': final_type, 'source': source}


def save_result(result):
    with open(RESULT_FILE, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"[OK] 结果已保存到 {RESULT_FILE}", file=sys.stderr)


def main():
    if len(sys.argv) < 2:
        print("用法: python ozon_extract_type.py <商品链接>")
        save_result({
            'success': False,
            'type': '',
            'message': '缺少商品链接参数'
        })
        return

    product_url = sys.argv[1]
    cookie_data = load_cookies()

    if not cookie_data:
        save_result({
            'success': False,
            'type': '',
            'message': '未找到Cookie文件'
        })
        return

    print("\n[1] 启动浏览器...", file=sys.stderr)

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

    try:
        with sync_playwright() as p:
            launch_args = {
                'headless': True,
                'args': ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled']
            }
            if executable_path:
                launch_args['executable_path'] = executable_path
                launch_args['args'].append('--headless=new')
                print(f"[1] 使用系统 Chrome (headless)", file=sys.stderr)

            browser = p.chromium.launch(**launch_args)
            context = browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
            )

            cookies = cookie_data.get('cookies', [])
            context.add_cookies(cookies)
            print(f"[2] 已注入 {len(cookies)} 条 cookies", file=sys.stderr)

            page = context.new_page()
            page.goto('https://www.ozon.ru/', wait_until='domcontentloaded', timeout=30000)

            ls = cookie_data.get('local_storage', {})
            if ls:
                page.evaluate(
                    "(function(d) { for(var k in d){ localStorage.setItem(k, d[k]); } })", ls
                )
                print(f"[3] 已注入 localStorage", file=sys.stderr)

            page.wait_for_timeout(2000)
            print("[OK] 浏览器就绪\n", file=sys.stderr)

            # 提取类型
            result_data = extract_type(page, product_url)

            has_type = bool(str(result_data.get('type') or '').strip())
            result = {
                'success': has_type,
                'type': result_data['type'],
                'source': result_data['source'],
                'title': result_data['title'],
                'message': '提取成功' if has_type else '未获取到商品类型'
            }
            save_result(result)

            browser.close()
            print("\n[OK] 已退出", file=sys.stderr)
            
            # 输出 JSON 到 stdout 供后端解析
            print(json.dumps(result, ensure_ascii=False))

    except Exception as e:
        print(f"\n[X] 错误: {e}", file=sys.stderr)
        result = {
            'success': False,
            'type': '',
            'message': str(e)
        }
        save_result(result)
        print(json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    main()
