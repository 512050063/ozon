# Ozon Local Worker

本机采集器只负责执行 Ozon 前台页面任务，云端仍然负责用户、店铺、数据库、缓存和业务页面。

## 推荐方式：本机助手

本机助手是一个只运行在 `127.0.0.1` 的轻量服务。云端页面可以用它检测本机环境、写入采集器配置并启动 worker，不需要在本机部署数据库、后端或前端。

启动助手：

```powershell
py worker/ozon-assistant.py --host 127.0.0.1 --port 17666
```

启动后回到云端 `API配置 > Ozon平台`，点击“更新令牌”。如果页面检测到本机助手，会自动写入 `worker/worker.config.json` 并启动采集器。

助手接口：

- `GET /health`：检测助手是否运行
- `GET /env/check`：检测 Python、Chrome、项目路径和配置文件状态
- `GET /worker/status`：查看本机 worker 状态
- `POST /worker/start`：写入配置并启动 worker
- `POST /worker/stop`：停止 worker

## 手动方式

如果不启动本机助手，也可以手动运行。云端页面更新采集器令牌后，会得到一次性 `workerToken`。本机创建 `worker/worker.config.json`：

```json
{
  "apiBaseUrl": "https://58.87.104.60",
  "workerToken": "owk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "repoRoot": "D:/project/ozon",
  "pythonPath": "py",
  "pollIntervalSeconds": 5,
  "scriptTimeoutSeconds": 600
}
```

## 运行

执行一次任务：

```powershell
py worker/ozon-worker.py --config worker/worker.config.json --once
```

持续轮询：

```powershell
py worker/ozon-worker.py --config worker/worker.config.json --loop
```

## 任务类型

- `preference_search`：调用 `backend/scripts/ozon/ozon_search.py`
- `product_by_url`：调用 `backend/scripts/ozon/ozon_product_by_url.py`
- `type_extract_batch`：调用 `backend/scripts/ozon/ozon_extract_type_batch.py`
