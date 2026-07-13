#!/usr/bin/env python
import argparse
import json
import os
import shutil
import subprocess
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any


DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 17666
ROOT_DIR = Path(__file__).resolve().parents[1]
WORKER_DIR = ROOT_DIR / "worker"
CONFIG_FILE = WORKER_DIR / "worker.config.json"
WORKER_SCRIPT = WORKER_DIR / "ozon-worker.py"
ASSISTANT_STATE_FILE = WORKER_DIR / ".ozon-assistant-state.json"

worker_process: subprocess.Popen | None = None


def json_response(handler: BaseHTTPRequestHandler, status: int, body: dict[str, Any]):
    payload = json.dumps(body, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(payload)))
    write_cors_headers(handler)
    handler.end_headers()
    handler.wfile.write(payload)


def write_cors_headers(handler: BaseHTTPRequestHandler):
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")
    handler.send_header("Access-Control-Allow-Private-Network", "true")


def read_json(handler: BaseHTTPRequestHandler) -> dict[str, Any]:
    length = int(handler.headers.get("Content-Length") or "0")
    if length <= 0:
        return {}
    raw = handler.rfile.read(length).decode("utf-8")
    return json.loads(raw or "{}")


def find_python() -> str:
    candidates = ["py"] if os.name == "nt" else ["python3", "python"]
    candidates.extend(["python", "python3"])
    for candidate in candidates:
        if shutil.which(candidate):
            return candidate
    return sys.executable


def command_available(command: str) -> bool:
    return bool(shutil.which(command))


def get_worker_running() -> bool:
    return worker_process is not None and worker_process.poll() is None


def stop_worker_process():
    global worker_process
    if not get_worker_running() or worker_process is None:
        worker_process = None
        return
    worker_process.terminate()
    try:
        worker_process.wait(timeout=3)
    except subprocess.TimeoutExpired:
        worker_process.kill()
        worker_process.wait(timeout=3)
    worker_process = None


def load_state() -> dict[str, Any]:
    if not ASSISTANT_STATE_FILE.exists():
        return {}
    try:
        return json.loads(ASSISTANT_STATE_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def save_state(data: dict[str, Any]):
    ASSISTANT_STATE_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def handle_health(handler: BaseHTTPRequestHandler):
    json_response(handler, 200, {
        "success": True,
        "data": {
            "name": "ozon-local-assistant",
            "version": 1,
            "repoRoot": str(ROOT_DIR),
            "workerRunning": get_worker_running(),
        },
    })


def handle_env_check(handler: BaseHTTPRequestHandler):
    python_path = find_python()
    local_app_data = os.environ.get("LOCALAPPDATA")
    chrome_candidates = [
        os.environ.get("CHROME_PATH"),
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        str(Path(local_app_data) / "Google/Chrome/Application/chrome.exe") if local_app_data else None,
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/usr/bin/google-chrome",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
    ]
    chrome_path = next((item for item in chrome_candidates if item and Path(item).exists()), "")
    chrome_ok = bool(chrome_path) or command_available("google-chrome") or command_available("chrome") or command_available("chrome.exe") or command_available("chromium")

    checks = {
        "python": {
            "ok": bool(python_path),
            "value": python_path,
            "hint": "安装 Python 3.11+ 后重新检测",
        },
        "repoRoot": {
            "ok": WORKER_SCRIPT.exists(),
            "value": str(ROOT_DIR),
            "hint": "请在项目根目录内启动本机助手",
        },
        "chrome": {
            "ok": chrome_ok,
            "value": chrome_path or ("system" if chrome_ok else ""),
            "hint": "安装 Google Chrome，并先在 Chrome 中登录 Ozon",
        },
        "workerConfig": {
            "ok": CONFIG_FILE.exists(),
            "value": str(CONFIG_FILE),
            "hint": "点击更新令牌后会自动写入配置",
        },
    }
    json_response(handler, 200, {"success": True, "data": checks})


def handle_worker_status(handler: BaseHTTPRequestHandler):
    state = load_state()
    json_response(handler, 200, {
        "success": True,
        "data": {
            "running": get_worker_running(),
            "pid": worker_process.pid if get_worker_running() and worker_process else None,
            "configPath": str(CONFIG_FILE),
            "lastConfig": state.get("lastConfig", {}),
        },
    })


def handle_worker_start(handler: BaseHTTPRequestHandler):
    global worker_process
    data = read_json(handler)
    config = data.get("config") if isinstance(data.get("config"), dict) else data
    if not config.get("apiBaseUrl") or not config.get("workerToken"):
        json_response(handler, 400, {"success": False, "message": "apiBaseUrl 和 workerToken 不能为空"})
        return

    python_path = config.get("pythonPath") or find_python()
    config = {
        **config,
        "repoRoot": config.get("repoRoot") or str(ROOT_DIR),
        "pythonPath": python_path,
        "pollIntervalSeconds": config.get("pollIntervalSeconds") or 5,
        "scriptTimeoutSeconds": config.get("scriptTimeoutSeconds") or 600,
    }

    CONFIG_FILE.write_text(json.dumps(config, ensure_ascii=False, indent=2), encoding="utf-8")
    save_state({
        "lastConfig": {
            "apiBaseUrl": config.get("apiBaseUrl"),
            "repoRoot": config.get("repoRoot"),
            "pythonPath": config.get("pythonPath"),
            "configPath": str(CONFIG_FILE),
        },
    })

    was_running = get_worker_running()
    if was_running:
        stop_worker_process()

    command = [python_path, str(WORKER_SCRIPT), "--config", str(CONFIG_FILE), "--loop"]
    worker_process = subprocess.Popen(
        command,
        cwd=str(ROOT_DIR),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
    )
    json_response(handler, 200, {
        "success": True,
        "message": "本机采集器已重启" if was_running else "本机采集器已启动",
        "data": {"running": True, "pid": worker_process.pid, "configPath": str(CONFIG_FILE)},
    })


def handle_worker_stop(handler: BaseHTTPRequestHandler):
    stop_worker_process()
    json_response(handler, 200, {"success": True, "message": "本机采集器已停止", "data": {"running": False}})


class AssistantHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        write_cors_headers(self)
        self.end_headers()

    def do_GET(self):
        if self.path == "/health":
            handle_health(self)
        elif self.path == "/env/check":
            handle_env_check(self)
        elif self.path == "/worker/status":
            handle_worker_status(self)
        else:
            json_response(self, 404, {"success": False, "message": "接口不存在"})

    def do_POST(self):
        if self.path == "/worker/start":
            handle_worker_start(self)
        elif self.path == "/worker/stop":
            handle_worker_stop(self)
        else:
            json_response(self, 404, {"success": False, "message": "接口不存在"})

    def log_message(self, format: str, *args: Any):
        return


def main():
    parser = argparse.ArgumentParser(description="Ozon local assistant")
    parser.add_argument("--host", default=DEFAULT_HOST)
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    args = parser.parse_args()
    server = ThreadingHTTPServer((args.host, args.port), AssistantHandler)
    print(json.dumps({
        "success": True,
        "message": "Ozon local assistant started",
        "host": args.host,
        "port": args.port,
    }, ensure_ascii=False))
    server.serve_forever()


if __name__ == "__main__":
    main()
