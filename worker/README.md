# Ozon Local Worker

本机采集器只负责执行 Ozon 前台页面任务，云端仍然负责用户、店铺、数据库、缓存和业务页面。

## 配置

在云端页面创建采集器后，会得到一次性 `workerToken`。本机创建 `worker/worker.config.json`：

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

