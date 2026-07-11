# -*- coding: utf-8 -*-
"""
Ozon Cookie 导出工具 v6.0
=======================
逻辑：
1. 不带 cookie 访问 Ozon 首页
2. 检查商品卡价格符号判断货币（₽=卢布, ¥=人民币）
3. 已是中文+人民币 → 直接导出
4. 不是 → 返回环境异常，由用户手动确认 Ozon 语言/货币环境
"""
import json
import os
import socket
import subprocess
import sys
import time
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

from playwright.sync_api import sync_playwright

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
COOKIE_FILE = os.path.join(BASE_DIR, '..', 'data', 'ozon_cookies.json')
CHROME_EXE = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
USER_DATA = os.path.join(BASE_DIR, '_chrome_profile_v6')
CDP_PORT = 9223


def find_chrome():
    """查找 Chrome 路径"""
    env_chrome = os.environ.get('CHROME_PATH')
    if env_chrome and os.path.exists(env_chrome):
        return env_chrome

    candidates = [
        CHROME_EXE,
        r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
        os.path.expandvars(r'%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe'),
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/snap/bin/chromium',
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    try:
        lookup_cmd = ['where', 'chrome'] if os.name == 'nt' else ['sh', '-lc', 'command -v chromium-browser || command -v chromium || command -v google-chrome || command -v google-chrome-stable']
        result = subprocess.run(lookup_cmd, capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            return result.stdout.strip().split('\n')[0].strip()
    except:
        pass
    return None


def has_graphic_display():
    """判断当前环境是否可直接启动带窗口的 Chromium。"""
    if os.name == 'nt':
        return True
    return bool(os.environ.get('DISPLAY'))


def find_available_port(start_port=CDP_PORT, attempts=20):
    for port in range(start_port, start_port + attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(0.2)
            try:
                sock.bind(('127.0.0.1', port))
                return port
            except OSError:
                continue
    return None


def launch_chrome(headless=False):
    """启动带调试端口的 Chrome（不打开任何 URL）"""
    chrome = find_chrome()
    if not chrome:
        print("[X] 找不到 Chrome")
        return None, None

    port = find_available_port()
    if not port:
        print("[X] 找不到可用调试端口")
        return None, None

    print(f"[1] Chrome: {chrome}")
    print(f"[2] 启动调试端口 {port} ...")

    cmd = [
        chrome,
        f'--remote-debugging-port={port}',
        f'--user-data-dir={USER_DATA}',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-site-isolation-trials',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--window-size=1280,720',
        '--window-position=100,100',
    ]

    if headless:
        cmd.extend([
            '--headless=new',
            '--hide-scrollbars',
        ])
    else:
        cmd.append('about:blank')  # 不打开 Ozon，后续在代码里 goto

    proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    for i in range(20):
        time.sleep(1)
        try:
            import urllib.request
            urllib.request.urlopen(f'http://127.0.0.1:{port}/json/version', timeout=2)
            print(f"[3] Chrome 就绪 ✓")
            return proc, port
        except:
            pass

    print("[X] Chrome 启动超时")
    try:
        proc.terminate()
    except:
        pass
    return None, None


def close_chrome(browser=None, proc=None):
    try:
        if browser:
            browser.close()
    except:
        pass
    try:
        if proc and proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
    except:
        pass


def check_page_status(page):
    """
    检查页面状态：中文 + 人民币
    以商品卡价格符号为准：¥ = 人民币, ₽ = 卢布
    """
    try:
        result = page.evaluate('''() => {
            const text = document.body.innerText;
            
            // 中文检测：页面关键词
            const zhKeywords = ['商品', '搜索', '购物车', '分类', '收藏', '账户', '登录', '注册', '评价', '价格'];
            const hasZh = zhKeywords.some(k => text.includes(k));
            
            // 货币检测：找价格符号
            // 商品卡价格格式通常是：1509₽ 或 ¥1509 或 1509 ₽
            const priceMatches = text.match(/(\\d+[\\s\\d]*\\d*)\\s*([₽¥])/g) || [];
            let hasCNY = false;
            let hasRUB = false;
            
            for (const match of priceMatches.slice(0, 10)) {  // 检查前10个价格
                if (match.includes('¥')) hasCNY = true;
                if (match.includes('₽')) hasRUB = true;
            }
            
            // 备用：检查货币按钮文本
            const btn = document.querySelector('[data-widget="selectedCurrencyLanguage"]');
            const btnText = btn ? btn.textContent : '';
            if (btnText.includes('CNY') || btnText.includes('¥')) hasCNY = true;
            if (btnText.includes('RUB') || btnText.includes('₽')) hasRUB = true;
            
            return {
                zh: hasZh,
                cny: hasCNY,
                rub: hasRUB,
                priceSamples: priceMatches.slice(0, 5),
                btnText: btnText.substring(0, 50),
            };
        }''')
        return result
    except Exception as e:
        print(f"[WARN] 页面检测失败: {e}")
        return {'zh': False, 'cny': False, 'rub': False, 'priceSamples': [], 'btnText': ''}


def is_ozon_access_blocked(page):
    """识别 Ozon 访问异常/网络拦截页，避免误报为设置入口不存在。"""
    try:
        result = page.evaluate('''() => {
            const text = document.body.innerText || '';
            const title = document.title || '';
            const url = location.href || '';
            const markers = [
                'Похоже, нет',
                'нет соединения',
                'Выключите VPN',
                'перезагрузите роутер',
                'подключитесь к другой сети',
                'Инцидент',
                'Access denied',
                'captcha',
                'robot'
            ];
            return {
                blocked: markers.some(marker => text.includes(marker) || title.includes(marker)),
                title,
                text: text.slice(0, 240),
                url
            };
        }''')
        return result if result and result.get('blocked') else None
    except Exception as e:
        print(f"[WARN] 访问异常页检测失败: {e}")
        return None


def load_existing_cookie_data():
    """读取已有 Cookie JSON。不存在或格式错误时返回 None。"""
    if not os.path.exists(COOKIE_FILE):
        print("[0] 未找到本地 Cookie JSON")
        return None

    try:
        with open(COOKIE_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        print("[0] 已找到本地 Cookie JSON")
        return data
    except Exception as e:
        print(f"[0] 本地 Cookie JSON 读取失败: {e}")
        return None


def validate_cookie_data(data):
    """确认 JSON 中包含可用于 Ozon 访问的 Cookie。"""
    cookies = data.get('cookies') if isinstance(data, dict) else None
    if not isinstance(cookies, list) or len(cookies) == 0:
        return False, 'Cookie文件中没有可用Cookie'

    ozon_cookies = []
    for cookie in cookies:
        domain = str(cookie.get('domain', '')).lower() if isinstance(cookie, dict) else ''
        name = str(cookie.get('name', '')) if isinstance(cookie, dict) else ''
        if 'ozon' in domain and name:
            ozon_cookies.append(cookie)

    if not ozon_cookies:
        return False, 'Cookie文件中没有Ozon相关Cookie'

    useful_names = {'__Secure-access-token', '__Secure-refresh-token', '__Secure-ETC', 'xcid', 'abt_data'}
    has_useful_cookie = any(cookie.get('name') in useful_names for cookie in ozon_cookies)
    if not has_useful_cookie:
        return False, 'Cookie文件缺少Ozon访问Cookie'

    return True, f'Cookie完整 ({len(ozon_cookies)}条Ozon Cookie)'


def apply_cookie_data(context, cookie_data):
    """把 JSON 中的 Cookie 注入浏览器上下文，用于带 Cookie 访问检测。"""
    cookies = cookie_data.get('cookies') if isinstance(cookie_data, dict) else []
    valid_cookies = []
    now = time.time()
    for cookie in cookies:
        if not isinstance(cookie, dict):
            continue
        domain = str(cookie.get('domain', '')).lower()
        name = cookie.get('name')
        value = cookie.get('value')
        if 'ozon' not in domain or not name or value is None:
            continue
        expires = cookie.get('expires')
        if isinstance(expires, (int, float)) and expires > 0 and expires < now:
            continue
        valid_cookies.append(cookie)

    if not valid_cookies:
        return False

    context.add_cookies(valid_cookies)
    print(f"    ✓ 已注入 {len(valid_cookies)} 条 Ozon Cookie")
    return True


def open_settings_popup(page):
    """点击右上角按钮打开语言/货币设置弹窗"""
    print("[6] 打开语言/货币设置弹窗...")
    
    # 方法1：data-widget
    btn = page.query_selector('[data-widget="selectedCurrencyLanguage"]')
    if btn and btn.is_visible():
        btn.click()
        page.wait_for_timeout(1500)
        popup = page.query_selector('[data-widget="currencyLanguageSelector"]')
        if popup:
            print("    ✓ 弹窗已打开 (方法1)")
            return True
    
    # 方法2：找包含 ZH/RU/EN 的 button
    for b in page.query_selector_all('button'):
        try:
            txt = b.inner_text().strip()
            if any(k in txt for k in ['ZH', 'RU', 'EN', '₽', '¥']):
                b.click()
                page.wait_for_timeout(1500)
                popup = page.query_selector('[data-widget="currencyLanguageSelector"]')
                if popup:
                    print(f"    ✓ 弹窗已打开 (方法2: {txt})")
                    return True
        except:
            continue
    
    print("    ✗ 无法打开弹窗")
    return False


def select_language_and_currency(page):
    """在弹窗中选择中文和人民币"""
    print("[7] 选择语言和货币...")
    
    popup = page.query_selector('[data-widget="currencyLanguageSelector"]')
    if not popup:
        print("    ✗ 弹窗未找到")
        return False, False
    
    lang_ok = False
    curr_ok = False
    
    # 找所有 listbox
    listboxes = popup.query_selector_all('[role="listbox"]')
    print(f"    找到 {len(listboxes)} 个下拉列表")
    
    if len(listboxes) >= 1:
        # ---- 选择语言 ----
        print("    [7a] 选择语言...")
        listboxes[0].click()
        page.wait_for_timeout(800)
        
        opts = page.query_selector_all('[role="option"]')
        print(f"        语言选项: {len(opts)} 个")
        
        for opt in opts:
            try:
                if not opt.is_visible():
                    continue
                txt = opt.inner_text().strip()
                if '中文' in txt or 'Chinese' in txt or 'zh' in txt.lower():
                    opt.click()
                    lang_ok = True
                    print(f"        ✓ 选择: {txt}")
                    page.wait_for_timeout(500)
                    break
            except:
                continue
        
        if not lang_ok:
            page.keyboard.press('Escape')
            page.wait_for_timeout(300)
    
    # ---- 选择货币 ----
    # 重新查找 listbox（DOM 可能刷新）
    page.wait_for_timeout(500)
    listboxes = popup.query_selector_all('[role="listbox"]')
    
    if len(listboxes) >= 2:
        print("    [7b] 选择货币...")
        listboxes[1].click()
        page.wait_for_timeout(800)
        
        opts = page.query_selector_all('[role="option"]')
        print(f"        货币选项: {len(opts)} 个")
        
        for opt in opts:
            try:
                if not opt.is_visible():
                    continue
                txt = opt.inner_text().strip()
                # 找 CNY 或 人民币，避开 RUB/卢布
                if ('CNY' in txt or '人民币' in txt) and 'RUB' not in txt and '卢布' not in txt:
                    opt.click()
                    curr_ok = True
                    print(f"        ✓ 选择: {txt}")
                    page.wait_for_timeout(500)
                    break
            except:
                continue
        
        if not curr_ok:
            page.keyboard.press('Escape')
            page.wait_for_timeout(300)
    
    print(f"    语言: {'✓' if lang_ok else '✗'}, 货币: {'✓' if curr_ok else '✗'}")
    return lang_ok, curr_ok


def click_save(page):
    """点击保存按钮"""
    print("[8] 点击保存...")
    
    popup = page.query_selector('[data-widget="currencyLanguageSelector"]')
    if not popup:
        return False
    
    # 找保存按钮
    for btn in popup.query_selector_all('button'):
        try:
            txt = btn.inner_text().strip()
            if any(k in txt for k in ['保存', 'Сохранить', 'Save', 'Apply', 'Применить']):
                btn.click()
                print(f"    ✓ 点击: {txt}")
                page.wait_for_timeout(2000)
                return True
        except:
            continue
    
    # 兜底：按回车
    page.keyboard.press('Enter')
    page.wait_for_timeout(2000)
    return True


def export_cookies(context, page):
    """导出 cookies 和 localStorage 到 JSON，返回数据字典"""
    print("[10] 导出 Cookie...")
    
    cookies = context.cookies()
    
    # 注入 localStorage（供后续脚本使用）
    try:
        page.evaluate("""() => {
            localStorage.setItem('currency', 'CNY');
            localStorage.setItem('lang', 'zh');
        }""")
    except:
        pass
    
    # 读取 localStorage
    local_storage = {}
    try:
        local_storage = page.evaluate('''() => {
            const d = {};
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                d[k] = localStorage.getItem(k);
            }
            return d;
        }''')
    except:
        pass
    
    data = {
        'success': True,
        'exported_at': datetime.now().isoformat(),
        'lang': 'zh',
        'currency': 'CNY',
        'cookies': cookies,
        'local_storage': local_storage,
    }
    
    # 确保目录存在
    os.makedirs(os.path.dirname(COOKIE_FILE), exist_ok=True)
    
    with open(COOKIE_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"    ✓ 已保存: {COOKIE_FILE}")
    print(f"    Cookies: {len(cookies)} 条")
    print(f"    LocalStorage: {len(local_storage)} 条")
    return data


def show_result(page, success, msg_lines):
    """显示结果遮罩"""
    icon = '✓' if success else '✗'
    title = '获取成功' if success else '获取失败'
    color = '#22c55e' if success else '#ef4444'
    
    js = f'''
    () => {{
        const div = document.createElement('div');
        div.id = '_result_mask';
        div.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:99999;display:flex;align-items:center;justify-content:center;font-family:system-ui,-apple-system,sans-serif;';
        div.innerHTML = `
            <div style="background:white;padding:40px 50px;border-radius:16px;text-align:center;max-width:400px;">
                <div style="width:64px;height:64px;background:{color};border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;color:white;font-size:36px;">{icon}</div>
                <h2 style="margin:0 0 20px;font-size:22px;color:#111;">{title}</h2>
                <div style="text-align:left;font-size:15px;color:#444;line-height:1.8;">
                    {'<br>'.join(msg_lines)}
                </div>
                <p style="margin-top:20px;color:#888;font-size:13px;">窗口即将关闭</p>
            </div>
        `;
        document.body.appendChild(div);
    }}
    '''
    try:
        page.evaluate(js)
    except:
        pass
    page.wait_for_timeout(3000 if success else 5000)


def main():
    """主流程"""
    print("=" * 60)
    print("  Ozon Cookie Export Tool v6.0")
    print("=" * 60)
    
    # 1. 启动 Chrome；云主机无 DISPLAY 时自动切换为 headless
    headless_mode = not has_graphic_display()
    if headless_mode:
        print("[1] 检测到无图形显示环境，使用 headless 模式")
    chrome_proc, cdp_port = launch_chrome(headless=headless_mode)
    if not chrome_proc or not cdp_port:
        print(json.dumps({"success": False, "reason": "chrome_launch_failed"}, ensure_ascii=False))
        sys.exit(1)
    
    browser = None
    try:
      with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp(f'http://127.0.0.1:{cdp_port}')
        context = browser.contexts[0]
        # 复用已有的空白页，不新建标签页
        pages = context.pages
        page = pages[0] if pages else context.new_page()

        existing_cookie_data = load_existing_cookie_data()
        if existing_cookie_data:
            cookie_valid, cookie_message = validate_cookie_data(existing_cookie_data)
            print(f"[1] 本地 Cookie 校验: {cookie_message}")
            if cookie_valid:
                apply_cookie_data(context, existing_cookie_data)
            else:
                show_result(page, False, [cookie_message])
                close_chrome(browser, chrome_proc)
                print(json.dumps({
                    "success": False,
                    "reason": "invalid_cookie_json",
                    "message": cookie_message
                }, ensure_ascii=False))
                return
        
        # 2. 带本地 Cookie（如存在且完整）访问 Ozon
        print("[4] 访问 Ozon 首页...")
        page.goto('https://www.ozon.ru/', wait_until='networkidle', timeout=60000)
        page.wait_for_timeout(3000)
        
        # 3. 检查页面状态
        print("[5] 检测页面状态...")
        blocked = is_ozon_access_blocked(page)
        if blocked:
            message = 'Ozon访问异常页，请关闭VPN/代理或更换网络后重试'
            print(f"    ✗ {message}")
            print(f"    URL: {blocked.get('url', '')}")
            print(f"    标题: {blocked.get('title', '')}")
            show_result(page, False, [message, '当前不是 Ozon 首页，无法打开语言/货币设置'])
            close_chrome(browser, chrome_proc)
            print(json.dumps({
                "success": False,
                "reason": "ozon_access_blocked",
                "message": message,
                "details": blocked
            }, ensure_ascii=False))
            return

        status = check_page_status(page)
        print(f"    中文: {'✓' if status['zh'] else '✗'}")
        print(f"    人民币: {'✓' if status['cny'] else '✗'}")
        print(f"    卢布: {'✓' if status['rub'] else '✗'}")
        if status['priceSamples']:
            print(f"    价格样例: {', '.join(status['priceSamples'])}")
        
        # 4. 已是中文+人民币 → 直接导出
        if status['zh'] and status['cny']:
            print("\n[OK] 已是中文+人民币，直接导出")
            cookie_data = export_cookies(context, page)
            show_result(page, True, ['语言：中文 ✓', '货币：人民币 ✓', 'Cookie 已导出'])
            close_chrome(browser, chrome_proc)
            print(json.dumps(cookie_data, ensure_ascii=False))
            return

        # 5. 尝试自动切换语言/货币，然后重新检查页面状态
        print("[6] 尝试自动切换语言/货币...")
        auto_switched = False
        if open_settings_popup(page):
            lang_ok, curr_ok = select_language_and_currency(page)
            if lang_ok or curr_ok:
                auto_switched = click_save(page)

        if auto_switched:
            page.goto('https://www.ozon.ru/', wait_until='networkidle', timeout=60000)
            page.wait_for_timeout(3000)
            status = check_page_status(page)
            print("[7] 自动切换后重新检测页面状态...")
            print(f"    中文: {'✓' if status['zh'] else '✗'}")
            print(f"    人民币: {'✓' if status['cny'] else '✗'}")
            print(f"    卢布: {'✓' if status['rub'] else '✗'}")
            if status['priceSamples']:
                print(f"    价格样例: {', '.join(status['priceSamples'])}")

        if status['zh'] and status['cny']:
            print("\n[OK] 已切换为中文+人民币，直接导出")
            cookie_data = export_cookies(context, page)
            show_result(page, True, ['语言：中文 ✓', '货币：人民币 ✓', 'Cookie 已导出'])
            close_chrome(browser, chrome_proc)
            print(json.dumps(cookie_data, ensure_ascii=False))
            return

        # 6. 自动切换后仍未就绪 → 提示用户手动处理环境
        msg = ['Ozon语言/货币环境异常']
        if not status['zh']:
            msg.append('语言：非中文')
        if not status['cny']:
            msg.append('货币：非人民币')
        if status['rub']:
            msg.append('检测到卢布符号 ₽')
        msg.append('请在 Ozon 页面手动切换为中文+人民币后重新获取')
        show_result(page, False, msg)
        close_chrome(browser, chrome_proc)
        print(json.dumps({
            "success": False,
            "reason": "language_currency_not_ready",
            "message": 'Ozon语言/货币环境异常，请手动切换为中文+人民币后重试',
            "details": status
        }, ensure_ascii=False))
    except Exception as exc:
        close_chrome(browser, chrome_proc)
        print(json.dumps({"success": False, "reason": str(exc)}, ensure_ascii=False))
        sys.exit(1)


if __name__ == '__main__':
    main()
