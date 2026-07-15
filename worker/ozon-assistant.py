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
MIN_PYTHON_VERSION = (3, 10)
ROOT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_WORKER_DIR = ROOT_DIR / "worker"
ASSISTANT_STATE_FILE = DEFAULT_WORKER_DIR / ".ozon-assistant-state.json"

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
    if sys.executable:
        return sys.executable
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


def get_project_root() -> Path:
    state = load_state()
    repo_root = state.get("repoRoot")
    if isinstance(repo_root, str) and repo_root.strip():
        return Path(repo_root).expanduser().resolve()
    return ROOT_DIR


def get_worker_dir(repo_root: Path | None = None) -> Path:
    return (repo_root or get_project_root()) / "worker"


def get_config_file(repo_root: Path | None = None) -> Path:
    return get_worker_dir(repo_root) / "worker.config.json"


def get_worker_script(repo_root: Path | None = None) -> Path:
    return get_worker_dir(repo_root) / "ozon-worker.py"


def get_python_version(command: str) -> str:
    try:
      result = subprocess.run(
          [command, "--version"],
          capture_output=True,
          text=True,
          timeout=3,
      )
      return (result.stdout or result.stderr).strip()
    except Exception:
      return ""


def python_version_ok() -> bool:
    return sys.version_info >= MIN_PYTHON_VERSION


def module_available(module_name: str) -> bool:
    try:
        __import__(module_name)
        return True
    except Exception:
        return False


def run_install_command(command: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=300,
    )


def validate_project_root(repo_root: Path) -> tuple[bool, str]:
    worker_script = get_worker_script(repo_root)
    if worker_script.exists():
        return True, ""
    return False, f"未找到 {worker_script}，请选择包含 worker/ozon-worker.py 的项目目录"


def handle_health(handler: BaseHTTPRequestHandler):
    repo_root = get_project_root()
    json_response(handler, 200, {
        "success": True,
        "data": {
            "name": "ozon-local-assistant",
            "version": 1,
            "repoRoot": str(repo_root),
            "workerRunning": get_worker_running(),
        },
    })


def handle_env_check(handler: BaseHTTPRequestHandler):
    repo_root = get_project_root()
    config_file = get_config_file(repo_root)
    worker_script = get_worker_script(repo_root)
    python_path = find_python()
    python_version = f"Python {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
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
    project_ok, project_hint = validate_project_root(repo_root)
    playwright_ok = module_available("playwright")

    checks = {
        "python": {
            "ok": bool(python_path) and python_version_ok(),
            "value": python_path,
            "hint": "安装 Python 3.11+ 后重新启动本机助手",
        },
        "pythonVersion": {
            "ok": python_version_ok(),
            "value": python_version or f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
            "hint": "需要 Python 3.10+，推荐 Python 3.11 或 3.12",
        },
        "repoRoot": {
            "ok": project_ok,
            "value": str(repo_root),
            "hint": project_hint or "请选择包含 worker 目录的项目路径",
        },
        "chrome": {
            "ok": chrome_ok,
            "value": chrome_path or ("system" if chrome_ok else ""),
            "hint": "安装 Google Chrome 稳定版，并先在 Chrome 中登录 Ozon",
        },
        "playwright": {
            "ok": playwright_ok,
            "value": "installed" if playwright_ok else "",
            "hint": "检测到未安装，点击检测环境或更新令牌时会自动安装",
        },
        "workerConfig": {
            "ok": config_file.exists(),
            "value": str(config_file),
            "hint": "点击更新令牌后会自动写入配置",
        },
    }
    json_response(handler, 200, {"success": True, "data": checks})


def handle_install_playwright(handler: BaseHTTPRequestHandler):
    if not python_version_ok():
        json_response(handler, 400, {
            "success": False,
            "message": "Python版本过低，请安装 Python 3.10+ 后重新启动本机助手",
        })
        return

    if module_available("playwright"):
        json_response(handler, 200, {
            "success": True,
            "message": "Playwright已安装",
            "data": {"installed": True},
        })
        return

    try:
        result = run_install_command([sys.executable, "-m", "pip", "install", "playwright"])
    except subprocess.TimeoutExpired:
        json_response(handler, 500, {
            "success": False,
            "message": "Playwright安装超时，请检查网络后重新检测",
        })
        return
    except Exception as error:
        json_response(handler, 500, {
            "success": False,
            "message": f"Playwright安装失败: {error}",
        })
        return

    if result.returncode != 0:
        detail = (result.stderr or result.stdout or "").strip()
        json_response(handler, 500, {
            "success": False,
            "message": f"Playwright安装失败: {detail[-1000:] or 'pip install playwright 执行失败'}",
        })
        return

    json_response(handler, 200, {
        "success": True,
        "message": "Playwright安装完成",
        "data": {
            "installed": module_available("playwright"),
        },
    })


def handle_project_select(handler: BaseHTTPRequestHandler):
    state = load_state()
    initial_dir = str(get_project_root())
    try:
        import tkinter
        from tkinter import filedialog

        root = tkinter.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        selected = filedialog.askdirectory(
            title="选择 Ozon 项目目录（包含 worker 文件夹）",
            initialdir=initial_dir if Path(initial_dir).exists() else str(Path.home()),
        )
        root.destroy()
    except Exception as error:
        json_response(handler, 500, {
            "success": False,
            "message": f"无法打开目录选择窗口: {error}",
        })
        return

    if not selected:
        json_response(handler, 400, {"success": False, "message": "未选择项目目录"})
        return

    repo_root = Path(selected).expanduser().resolve()
    ok, hint = validate_project_root(repo_root)
    if not ok:
        json_response(handler, 400, {"success": False, "message": hint})
        return

    state["repoRoot"] = str(repo_root)
    save_state(state)
    json_response(handler, 200, {
        "success": True,
        "message": "项目路径已保存",
        "data": {
            "repoRoot": str(repo_root),
            "configPath": str(get_config_file(repo_root)),
        },
    })


def handle_worker_status(handler: BaseHTTPRequestHandler):
    state = load_state()
    repo_root = get_project_root()
    json_response(handler, 200, {
        "success": True,
        "data": {
            "running": get_worker_running(),
            "pid": worker_process.pid if get_worker_running() and worker_process else None,
            "configPath": str(get_config_file(repo_root)),
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
    repo_root = Path(config.get("repoRoot") or str(get_project_root())).expanduser().resolve()
    project_ok, project_hint = validate_project_root(repo_root)
    if not project_ok:
        json_response(handler, 400, {"success": False, "message": project_hint})
        return

    worker_dir = get_worker_dir(repo_root)
    config_file = get_config_file(repo_root)
    worker_script = get_worker_script(repo_root)
    config = {
        **config,
        "repoRoot": str(repo_root),
        "pythonPath": python_path,
        "pollIntervalSeconds": config.get("pollIntervalSeconds") or 5,
        "scriptTimeoutSeconds": config.get("scriptTimeoutSeconds") or 600,
    }

    worker_dir.mkdir(parents=True, exist_ok=True)
    config_file.write_text(json.dumps(config, ensure_ascii=False, indent=2), encoding="utf-8")
    save_state({
        "repoRoot": str(repo_root),
        "lastConfig": {
            "apiBaseUrl": config.get("apiBaseUrl"),
            "repoRoot": config.get("repoRoot"),
            "pythonPath": config.get("pythonPath"),
            "configPath": str(config_file),
        },
    })

    was_running = get_worker_running()
    if was_running:
        stop_worker_process()

    command = [python_path, str(worker_script), "--config", str(config_file), "--loop"]
    worker_process = subprocess.Popen(
        command,
        cwd=str(repo_root),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
    )
    json_response(handler, 200, {
        "success": True,
        "message": "本机采集器已重启" if was_running else "本机采集器已启动",
        "data": {"running": True, "pid": worker_process.pid, "configPath": str(config_file)},
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
        if self.path == "/project/select":
            handle_project_select(self)
        elif self.path == "/env/install-playwright":
            handle_install_playwright(self)
        elif self.path == "/worker/start":
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
