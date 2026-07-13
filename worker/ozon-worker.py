#!/usr/bin/env python
import argparse
import json
import os
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path


DEFAULT_CAPABILITIES = ["ozon_search", "ozon_detail", "ozon_type"]


def load_config(path: str) -> dict:
    config_path = Path(path)
    if not config_path.exists():
        raise FileNotFoundError(f"worker config not found: {config_path}")
    config = json.loads(config_path.read_text(encoding="utf-8"))
    if not config.get("apiBaseUrl"):
        raise ValueError("apiBaseUrl is required")
    if not config.get("workerToken"):
        raise ValueError("workerToken is required")
    config.setdefault("pollIntervalSeconds", 5)
    config.setdefault("pythonPath", "py" if os.name == "nt" else "python3")
    config.setdefault("repoRoot", str(Path(__file__).resolve().parents[1]))
    return config


def api_request(config: dict, method: str, path: str, body=None) -> dict:
    base_url = config["apiBaseUrl"].rstrip("/")
    url = f"{base_url}{path}"
    payload = None if body is None else json.dumps(body, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=payload,
        method=method,
        headers={
            "Authorization": f"Bearer {config['workerToken']}",
            "Content-Type": "application/json; charset=utf-8",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            text = response.read().decode("utf-8")
            return json.loads(text) if text else {"success": True}
    except urllib.error.HTTPError as exc:
        text = exc.read().decode("utf-8", errors="ignore")
        try:
            data = json.loads(text)
        except Exception:
            data = {"success": False, "message": text or str(exc)}
        data.setdefault("success", False)
        raise RuntimeError(data.get("message") or str(exc))


def heartbeat(config: dict):
    return api_request(config, "POST", "/api/worker/heartbeat", {
        "capabilities": DEFAULT_CAPABILITIES,
    })


def claim_task(config: dict):
    return api_request(config, "POST", "/api/worker/tasks/claim").get("data")


def start_task(config: dict, task_id: int):
    return api_request(config, "POST", f"/api/worker/tasks/{task_id}/start")


def complete_task(config: dict, task_id: int, result):
    return api_request(config, "POST", f"/api/worker/tasks/{task_id}/complete", {
        "result": result,
    })


def progress_task(config: dict, task_id: int, progress):
    return api_request(config, "POST", f"/api/worker/tasks/{task_id}/progress", {
        "progress": progress,
    })


def fail_task(config: dict, task_id: int, error_code: str, error_message: str):
    return api_request(config, "POST", f"/api/worker/tasks/{task_id}/fail", {
        "errorCode": error_code,
        "errorMessage": error_message,
    })


def parse_last_json_line(stdout: str):
    for line in reversed(stdout.splitlines()):
        line = line.strip()
        if not line:
            continue
        try:
            return json.loads(line)
        except Exception:
            continue
    return None


def run_python_script(config: dict, script: Path, args=None, stdin_body=None, on_json_line=None) -> dict:
    command = [config["pythonPath"], str(script)]
    if args:
        command.extend(str(arg) for arg in args)

    process = subprocess.Popen(
        command,
        stdin=subprocess.PIPE if stdin_body is not None else None,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="replace",
        cwd=str(script.parent),
    )

    stdout_lines = []
    stderr_lines = []

    def read_stdout():
        if not process.stdout:
            return
        for line in process.stdout:
            stdout_lines.append(line)
            if not on_json_line:
                continue
            try:
                parsed_line = json.loads(line.strip())
            except Exception:
                continue
            on_json_line(parsed_line)

    def read_stderr():
        if not process.stderr:
            return
        for line in process.stderr:
            stderr_lines.append(line)

    stdout_thread = threading.Thread(target=read_stdout, daemon=True)
    stderr_thread = threading.Thread(target=read_stderr, daemon=True)
    stdout_thread.start()
    stderr_thread.start()

    if stdin_body is not None and process.stdin:
        process.stdin.write(stdin_body)
        process.stdin.close()

    try:
        return_code = process.wait(timeout=int(config.get("scriptTimeoutSeconds", 600)))
    except subprocess.TimeoutExpired:
        process.kill()
        raise RuntimeError(f"script timed out after {config.get('scriptTimeoutSeconds', 600)} seconds")

    stdout_thread.join(timeout=2)
    stderr_thread.join(timeout=2)

    stdout = "".join(stdout_lines)
    stderr = "".join(stderr_lines)
    parsed = parse_last_json_line(stdout)
    result = {
        "exitCode": return_code,
        "stdout": stdout[-20000:],
        "stderr": stderr[-10000:],
        "json": parsed,
    }
    if return_code != 0:
        raise RuntimeError(result["stderr"] or result["stdout"] or f"script exited with {process.returncode}")
    return result


def execute_preference_search(config: dict, payload: dict) -> dict:
    repo_root = Path(config["repoRoot"]).resolve()
    script = repo_root / "backend" / "scripts" / "ozon" / "ozon_search.py"
    keyword = payload.get("keyword") or payload.get("searchText") or ""
    limit = payload.get("limit") or payload.get("searchLimit") or 20
    category = payload.get("category") or ""
    search_text = payload.get("searchText") or ""
    return run_python_script(config, script, [keyword, limit, category, search_text])


def execute_product_by_url(config: dict, payload: dict) -> dict:
    repo_root = Path(config["repoRoot"]).resolve()
    script = repo_root / "backend" / "scripts" / "ozon" / "ozon_product_by_url.py"
    url = payload.get("url") or payload.get("productUrl") or ""
    if not url:
        raise ValueError("product url is required")
    return run_python_script(config, script, [url])


def execute_type_extract_batch(config: dict, payload: dict, task_id: int) -> dict:
    repo_root = Path(config["repoRoot"]).resolve()
    script = repo_root / "backend" / "scripts" / "ozon" / "ozon_extract_type_batch.py"
    urls = payload.get("urls") or []
    titles = payload.get("titles") or {}
    stdin_body = json.dumps({"urls": urls, "titles": titles}, ensure_ascii=False)

    def on_json_line(parsed):
        if isinstance(parsed, dict) and parsed.get("url"):
            progress_task(config, task_id, {"results": [parsed]})

    return run_python_script(config, script, stdin_body=stdin_body, on_json_line=on_json_line)


def execute_task(config: dict, task: dict) -> dict:
    task_type = task.get("type")
    payload = task.get("payload") or {}
    task_id = int(task["id"])
    if task_type == "preference_search":
        return execute_preference_search(config, payload)
    if task_type == "product_by_url":
        return execute_product_by_url(config, payload)
    if task_type == "type_extract_batch":
        return execute_type_extract_batch(config, payload, task_id)
    raise ValueError(f"unsupported task type: {task_type}")


def classify_error(error: Exception) -> str:
    message = str(error)
    if "Ozon返回错误页" in message or "нет соединения" in message or "VPN" in message:
        return "OZON_ACCESS_BLOCKED"
    if "Cookie" in message or "cookie" in message:
        return "COOKIE_EXPIRED"
    if "timeout" in message.lower() or "timed out" in message.lower():
        return "WORKER_TIMEOUT"
    return "SCRIPT_PARSE_FAILED"


def run_once(config: dict) -> bool:
    heartbeat(config)
    task = claim_task(config)
    if not task:
        print("no task")
        return False

    task_id = int(task["id"])
    print(f"claimed task {task_id}: {task.get('type')}")
    try:
        start_task(config, task_id)
        result = execute_task(config, task)
        complete_task(config, task_id, result)
        print(f"completed task {task_id}")
        return True
    except Exception as exc:
        code = classify_error(exc)
        fail_task(config, task_id, code, str(exc)[:1000])
        print(f"failed task {task_id}: {code} {exc}", file=sys.stderr)
        return False


def main():
    parser = argparse.ArgumentParser(description="Local Ozon browser worker")
    parser.add_argument("--config", default="worker/worker.config.json")
    parser.add_argument("--once", action="store_true")
    parser.add_argument("--loop", action="store_true")
    args = parser.parse_args()

    config = load_config(args.config)
    if args.once or not args.loop:
        run_once(config)
        return

    while True:
        run_once(config)
        time.sleep(float(config.get("pollIntervalSeconds", 5)))


if __name__ == "__main__":
    main()
