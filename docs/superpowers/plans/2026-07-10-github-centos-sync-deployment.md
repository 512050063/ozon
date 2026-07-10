# GitHub CentOS Sync Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make GitHub the single source of truth for application code while keeping local development, cloud deployment, and production data clearly separated.

**Architecture:** Local development commits code to GitHub. The CentOS server pulls a selected branch or tag, installs dependencies, applies Prisma schema changes, builds the frontend/backend, imports optional baseline data, and restarts services. Runtime secrets, cookies, uploads, browser profiles, logs, and database backups stay outside Git.

**Tech Stack:** Git, GitHub, Node.js, npm, Prisma, MySQL, Vite, PM2/systemd, Nginx, Bash.

---

### Task 1: Repository Safety Baseline

**Files:**
- Modify: `D:\project\ozon\.gitignore`
- Create: `D:\project\ozon\.env.example`
- Create: `D:\project\ozon\backend\.env.example`
- Create: `D:\project\ozon\frontend\.env.example`

- [ ] **Step 1: Keep reproducible dependency locks trackable**

Remove lockfile ignore rules from `.gitignore` so `package-lock.json` can be committed once generated.

- [ ] **Step 2: Exclude runtime and sensitive data**

Ignore backend data files, Ozon cookies, Chrome profiles, generated screenshots, uploaded images, logs, local database dumps, and production env files.

- [ ] **Step 3: Add environment templates**

Add example env files with placeholder values only. Do not include real secrets, cookies, API keys, or database passwords.

### Task 2: Deployment Commands

**Files:**
- Create: `D:\project\ozon\deploy\centos\deploy.sh`
- Modify: `D:\project\ozon\deploy\README-centos.md`

- [ ] **Step 1: Add an idempotent deployment script**

The script should fetch GitHub, checkout the selected ref, install dependencies, generate Prisma Client, apply `prisma db push`, build backend/frontend, optionally import baseline data, and restart PM2 services.

- [ ] **Step 2: Document first install and update flow**

The CentOS README should describe server prerequisites, `.env.production`, first clone, manual deployment, update deployment, rollback by tag, and what data is intentionally not tracked by Git.

### Task 3: Git Initialization

**Files:**
- Use local Git metadata only.

- [ ] **Step 1: Replace the empty `.git` directory with a valid repository**

The current `.git` directory is empty, so initialize a new repository at `D:\project\ozon`.

- [ ] **Step 2: Inspect the staged file list before committing**

Run `git status --short` and `git status --ignored --short` to ensure runtime data is ignored and source files are visible.

- [ ] **Step 3: Create the local initial commit**

Commit the cleaned source tree locally. Add the GitHub remote only after the user provides the repository URL.

### Task 4: Verification

**Files:**
- Read generated reports under `D:\project\ozon\docs\test-reports`.

- [ ] **Step 1: Run deploy package audit**

Run `node scripts/audit-deploy-package.mjs`.

- [ ] **Step 2: Run build checks**

Run backend build and frontend build after deployment files are added.

- [ ] **Step 3: Confirm Git safety**

Confirm `.env`, cookie files, Chrome profiles, logs, local uploads, and backups are not staged.
