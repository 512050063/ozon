# Ozon Local Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Ozon local worker usable from the cloud UI through a lightweight local assistant, while simplifying the Ozon API configuration layout.

**Architecture:** Keep the cloud app as the system of record. Add a local-only Python HTTP assistant on `127.0.0.1:17666` that detects environment status, accepts a generated worker config, writes `worker/worker.config.json`, and starts/stops `ozon-worker.py`. The frontend talks to the assistant when available and falls back to clear manual startup instructions when it is not running.

**Tech Stack:** Vue 3, Element Plus, TypeScript, Python standard library HTTP server, existing Ozon browser task APIs.

---

### Task 1: Local Assistant Script

**Files:**
- Create: `worker/ozon-assistant.py`
- Modify: `worker/README.md`
- Test: `backend/scripts/ozonLocalAssistant.test.mjs`

- [ ] **Step 1: Add a script test**

Create a script test that verifies the assistant file exists, exposes the required routes, includes CORS headers for localhost browser calls, writes `worker.config.json`, and starts `ozon-worker.py`.

- [ ] **Step 2: Run the test and verify RED**

Run: `cd backend && npm run test:scripts -- ozonLocalAssistant.test.mjs`

Expected: FAIL because `worker/ozon-assistant.py` does not exist.

- [ ] **Step 3: Implement the assistant**

Implement a Python HTTP server with endpoints:
- `GET /health`
- `GET /env/check`
- `GET /worker/status`
- `POST /worker/start`
- `POST /worker/stop`
- `OPTIONS *`

- [ ] **Step 4: Run test and verify GREEN**

Run: `cd backend && npm run test:scripts -- ozonLocalAssistant.test.mjs ozonLocalWorkerCli.test.mjs`

Expected: PASS.

### Task 2: Frontend Local Assistant API

**Files:**
- Create: `frontend/src/api/ozonLocalAssistantAPI.ts`
- Modify: `frontend/src/views/settings/api-config/Index.vue`

- [ ] **Step 1: Add frontend helper**

Create a small helper that calls `http://127.0.0.1:17666` with a short timeout and returns structured status for health, environment check, worker start, and worker stop.

- [ ] **Step 2: Wire Ozon settings page**

Replace the nested Ozon card with one header and three full-width sections:
- local assistant status
- startup actions
- worker records

- [ ] **Step 3: Preserve fallback path**

If the local assistant is not detected, show the command to start it:

```powershell
py worker/ozon-assistant.py --host 127.0.0.1 --port 17666
```

If the assistant is detected, `生成令牌` generates the cloud worker token and posts the config to `/worker/start`.

### Task 3: Verification And Deployment

**Files:**
- Verify changed frontend/backend/worker files.

- [ ] **Step 1: Build and test locally**

Run:
- `cd frontend && npm run build`
- `cd backend && npm run build`
- `cd backend && npm run test:scripts -- ozonLocalAssistant.test.mjs ozonBrowserTaskService.test.mjs ozonLocalWorkerCli.test.mjs`

- [ ] **Step 2: Browser verify**

Open `http://localhost:5173/settings/api-config`, select `Ozon平台`, and verify:
- only one Ozon module title area exists
- local assistant status is visible
- no nested card layout remains
- worker records retain delete action

- [ ] **Step 3: Commit, push, deploy**

Commit only related files, push `main`, pull/build/restart on the cloud host, and verify `https://58.87.104.60/api/health`.
