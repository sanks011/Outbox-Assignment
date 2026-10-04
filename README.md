# 🚀 ReachInbox - Full-Stack Email Job Scheduler

A production-grade, distributed email scheduler service and dashboard built with **TypeScript**, **Express.js**, **BullMQ**, **Redis**, **PostgreSQL (Prisma ORM)**, **Elasticsearch**, and **Ethereal Fake SMTP**, coupled with a **React (TypeScript + Tailwind CSS)** dashboard faithfully adhering to the [Figma design specifications](https://www.figma.com/design/kOTwGlESjijCYnMgtHfvfU/Outbox-Labs-Assignment?node-id=59-4050&p=f&m=dev).

---

## 📑 Table of Contents
1. [Core Features](#-core-features)
2. [Architecture Overview](#-architecture-overview)
3. [Technology Stack](#-technology-stack)
4. [Project Structure](#-project-structure)
5. [Single Environment File Configuration](#-single-environment-file-configuration)
6. [Quick Start & Setup Guide](#-quick-start--setup-guide)
7. [Figma UI Implementation](#-figma-ui-implementation)
8. [Scheduler, Persistence & Concurrency Deep Dive](#-scheduler-persistence--concurrency-deep-dive)
9. [Slack Rate Limit Notification System](#-slack-rate-limit-notification-system)
10. [Elasticsearch Search & Indexing](#-elasticsearch-search--indexing)
11. [API Reference](#-api-reference)
12. [Testing & Demonstration Checklist](#-testing--demonstration-checklist)

---

## 🎯 Core Features

### 🖥 Backend
- **No Cron Jobs Scheduling**: Pure BullMQ delayed jobs backed by Redis.
- **Persistent State Across Restarts**: Database-backed email state with BullMQ Redis persistence and startup reconciliation ensures zero job loss and prevents double-sends (idempotency).
- **Multi-Sender Support**: Sends emails on behalf of distinct accounts (e.g. `Oliver Brown <oliver.brown@domain.io>`, `Amanda Clark <sender@example.com>`).
- **Fake SMTP via Ethereal Email**: Automatically generates Ethereal test accounts on first run if credentials are not configured, with direct preview URLs saved on each job.
- **Worker Concurrency**: Fully configurable concurrent worker execution (`WORKER_CONCURRENCY`).
- **Inter-Email Throttling Delay**: Minimum configurable delay between individual email sends (e.g. 2s) to mimic real-world provider throttling.
- **Hourly Rate Limiting per Sender**: Atomic Redis hourly sliding window counters (`ratelimit:{sender}:{yyyy-MM-dd-HH}`).
- **Automatic Queue Rescheduling**: When a sender hits their hourly quota, pending jobs are safely delayed into the next available 1-hour window without dropping or failing.
- **Real-Time Slack Alerts on Rate Limit**: Triggers a live Slack Block Kit notification immediately upon quota exhaustion with auto-rescheduling summary.
- **Elasticsearch Search & Indexing**: Real-time multi-match fuzzy querying on subject, body, sender, recipient, and status with resilient DB fallback.
- **Live BullMQ Queue Monitor**: Integrated `@bull-board/express` dashboard accessible at `/admin/queues`.

### 🎨 Frontend (Figma-Matched)
- **Login Screen**: Centered card with Google OAuth pill button (`#E8F5E9`), divider, Email ID and Password inputs, vibrant green submit button (`#00A854`), and one-click demo persona login.
- **Dashboard Sidebar**: ONB logo branding, Oliver Brown profile badge with dropdown, `+ Compose` green outline button, `CORE` navigation (Scheduled with badge counter, Sent with badge counter), BullMQ Live Dashboard link, and Slack Integration modal trigger.
- **Header & Search Bar**: Pill search bar with instant Elasticsearch query results, filter button, and refresh button.
- **Email Lists**: Orange pill badges for scheduled times (`Tue 9:15:12 AM`) and gray pill badges for sent emails (`Sent`) with subject and preview snippets.
- **Email Detail View**: Detailed view with back navigation, sender info (`Amanda Clark <sender@example.com>`), yellow callout highlight box, and attachment cards (`Tennis_Coach_Profile.png 1.2 MB`).
- **Compose Modal**: Sender selection dropdown, recipient input with CSV/TXT lead upload parser that extracts emails and displays pills + `+4` counter chip, inline throttle delay & hourly limit controls, rich text WYSIWYG editor, attachment previews, and **Send Later** popover with quick presets.

---

## 🏗 Architecture Overview

```
                                  +-----------------------------+
                                  |   React + Tailwind Frontend |
                                  |    (Figma-Matched UI)       |
                                  +--------------+--------------+
                                                 |
                                         HTTP / REST APIs
                                                 |
                                  +--------------v--------------+
                                  |     Express.js API Server   |
                                  |      (TypeScript Backend)   |
                                  +--------------+--------------+
                                                 |
         +-----------------------+---------------+-----------------------+
         |                       |                                       |
+--------v-------+       +-------v-------+                       +-------v-------+
|  PostgreSQL    |       |     Redis     |                       | Elasticsearch |
|  (Prisma ORM)  |       |   (BullMQ)    |                       | (Email Index) |
| - User         |       | - Delayed Job |                       | - Fuzzy Match |
| - EmailJob     |       | - Rate Limits |                       | - Multi-Field |
| - SlackTokens  |       | - Locks/State |                       +---------------+
+----------------+       +-------+-------+
                                 |
                         BullMQ Worker(s)
                    (Concurrency & Throttling)
                                 |
         +-----------------------+-----------------------+
         |                                               |
+--------v-------+                               +-------v-------+
| Ethereal SMTP  |                               | Slack Alerts  |
| (Fake Delivery |                               | (Rate Limits  |
| & Web Preview) |                               |  Block Kit)   |
+----------------+                               +---------------+
```

---

## 🛠 Technology Stack

| Layer | Technologies |
|---|---|
| **Backend** | Node.js (v20+), Express.js, TypeScript, TSX |
| **Queue & Scheduling** | BullMQ, Redis (ioredis), @bull-board/express |
| **Database & ORM** | PostgreSQL, Prisma ORM |
| **Search Engine** | Elasticsearch 8.x (@elastic/elasticsearch) |
| **Mail & SMTP** | Nodemailer, Ethereal Email (Auto-Provisioned) |
| **Notifications** | Slack Web API (@slack/web-api, Axios Block Kit) |
| **Authentication** | Google Auth Library (OAuth2Client), JWT |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, PapaParse |
| **Containerization** | Docker, Docker Compose |

---

## 📁 Project Structure

```
outbox-assignment/
├── docker-compose.yml              # PostgreSQL, Redis & Elasticsearch services
├── .env.example                    # Master environment variables template
├── .env                            # Master unified configuration file
├── package.json                    # Monorepo orchestration scripts (dev, build, docker)
├── backend/
│   ├── prisma/
│   │   └── schema.prisma           # Prisma schema (User, EmailJob, SlackIntegration, SenderAccount)
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.ts               # Prisma PostgreSQL client singleton
│   │   │   ├── env.ts              # Unified environment loader
│   │   │   ├── redis.ts            # Redis connection options for BullMQ & counters
│   │   │   └── elasticsearch.ts    # Elasticsearch client & index bootstrapper
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts  # Google OAuth & demo persona authentication
│   │   │   ├── email.controller.ts # Scheduled, sent, detail, cancel, and seed data
│   │   │   ├── scheduler.controller.ts # Bulk CSV & single scheduling with delay logic
│   │   │   ├── slack.controller.ts # Webhook, OAuth & live test alert endpoints
│   │   │   └── dashboard.controller.ts # Metrics for queue & system status
│   │   ├── middleware/
│   │   │   └── auth.middleware.ts  # JWT verification with demo user fallback
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── email.routes.ts
│   │   │   ├── scheduler.routes.ts
│   │   │   ├── slack.routes.ts
│   │   │   ├── dashboard.routes.ts
│   │   │   └── bullboard.routes.ts # BullMQ Board mounted at /admin/queues
│   │   ├── services/
│   │   │   ├── email.service.ts    # Ethereal SMTP transporter & preview generator
│   │   │   ├── queue.service.ts    # BullMQ queue management & delayed jobs
│   │   │   ├── worker.service.ts   # Concurrency, rate-limiting, rescheduling, idempotency
│   │   │   ├── elasticsearch.service.ts # Indexing & fuzzy search with DB fallback
│   │   │   └── slack.service.ts    # Rate-limit Block Kit alerts & OAuth exchange
│   │   └── index.ts                # Express server bootstrap & graceful shutdown
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── api/client.ts           # Typed Axios client
│   │   ├── components/
│   │   │   ├── Sidebar.tsx         # Figma ONB sidebar with CORE navigation & counters
│   │   │   ├── Header.tsx          # Pill search bar with Elasticsearch integration
│   │   │   ├── LoginModal.tsx      # Figma Screen 1 login card
│   │   │   ├── EmailList.tsx       # Figma Screen 2 scheduled & sent tables
│   │   │   ├── EmailDetail.tsx     # Figma Screen 3 detail view with attachments
│   │   │   ├── ComposeModal.tsx    # Figma Screen 4 & 5 compose with CSV parse & editor
│   │   │   ├── SendLaterPopover.tsx# Figma Screen 4 Send Later popover & presets
│   │   │   └── SlackConnectModal.tsx# Slack OAuth & Webhook connection modal
│   │   ├── context/AuthContext.tsx # Authentication provider
│   │   ├── types/index.ts          # Frontend TypeScript contracts
│   │   ├── App.tsx                 # View state orchestration
│   │   ├── main.tsx
│   │   └── index.css               # Tailwind CSS & custom styling
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
└── README.md
```

---

## ⚙️ Single Environment File Configuration

All environment variables are consolidated into a single `.env` file at the root of the project.

```env
# Application Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
JWT_SECRET=super-secret-jwt-key-reachinbox-2025

# Database (PostgreSQL)
DATABASE_URL=postgresql://reachinbox:reachinbox_password@localhost:5432/reachinbox_db?schema=public

# Redis (BullMQ queues, rate limiting, and locks)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Elasticsearch (Email indexing & fuzzy search)
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_INDEX=emails

# Scheduler & Concurrency Controls
WORKER_CONCURRENCY=5
DEFAULT_DELAY_BETWEEN_EMAILS=2
MAX_EMAILS_PER_HOUR_PER_SENDER=100

# Ethereal Email (Fake SMTP for testing)
# Leave empty to automatically generate a free Ethereal test account on first launch!
ETHEREAL_USER=
ETHEREAL_PASS=

# Google OAuth Credentials
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Slack Integration (Rate limit notifications)
# Option A: Incoming Webhook URL (Instant 1-minute setup)
SLACK_WEBHOOK_URL=
# Option B: Slack OAuth App Credentials
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_REDIRECT_URI=http://localhost:5000/api/slack/oauth/callback
```

---

## 🚀 Quick Start & Setup Guide

### Prerequisites
- Node.js v20+ and npm v10+
- Docker & Docker Compose (or local PostgreSQL, Redis, and Elasticsearch)

### Step 1: Start Infrastructure Containers
Run the pre-configured Docker Compose file to start PostgreSQL, Redis, and Elasticsearch:
```bash
docker compose up -d
```
Verify all 3 containers are healthy:
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`
- Elasticsearch on `localhost:9200`

### Step 2: Initialize Database Schema
From the project root:
```bash
npm run db:generate
npm run db:push    # or npm run db:migrate
```

### Step 3: Run the Application
Start both backend and frontend concurrently with one command:
```bash
npm run dev
```

Or run them individually:
- Backend: `npm run dev:backend` (runs on `http://localhost:5000`)
- Frontend: `npm run dev:frontend` (runs on `http://localhost:5173`)
- BullMQ Live Dashboard: `http://localhost:5000/admin/queues`

---

## 🎨 Figma UI Implementation

The dashboard matches the Figma designs down to component structure and styling:

1. **Screen 1 (Login)**:
   - Centered card with title "Login".
   - "Login with Google" pill button (`#E8F5E9`) with official multi-colored Google SVG logo.
   - Divider with text `or sign up through email`.
   - Light gray input fields (`#F4F6F5`) for `Email ID` and `Password`.
   - Vibrant green `Login` button (`#00A854`).
   - One-click demo persona login as **Oliver Brown** for instant testing.

2. **Screen 2 (Homepage - Scheduled & Sent)**:
   - Left sidebar with stylized **ONB** logo.
   - User profile badge displaying avatar, `Oliver Brown`, and `oliver.brown@domain.io`.
   - `+ Compose` outline button with `#00A854` border and text.
   - `CORE` navigation with active light-green background (`#E8F5E9`) and badge counters.
   - Pill search bar with Elasticsearch integration, filter, and refresh icons.
   - Scheduled list showing orange badge pills (e.g. `Tue 9:15:12 AM`) with subject snippets.
   - Sent list showing neutral gray badge pills (`Sent`) with Ethereal preview links.

3. **Screen 3 (Email Detail)**:
   - Back arrow `←` with email subject line and message ID.
   - Star, Archive, and Delete header actions.
   - Sender avatar with initial "A", `Amanda Clark <sender@example.com>`, `to me`, and timestamp.
   - Rich email body with yellow callout block (`#FEF9C3` with `#EAB308` border) for exclusive coaching offers.
   - Attachment preview cards with image thumbnails and metadata (`Tennis_Coach_Profile.png 1.2 MB`).

4. **Screen 4 & 5 (Compose New Email)**:
   - Multi-sender dropdown (`From: oliver.brown@domain.io ▾`).
   - Recipient line with `Upload List` button: parses CSV or TXT lead lists using PapaParse, rendering green pills for emails and a `+4` count chip.
   - Inline throttle delay (`Delay between 2 emails [ 02 ] sec`) and rate limit (`Hourly Limit [ 50 ] emails/hr`).
   - "Send Later" Popover with quick presets (`Tomorrow`, `Tomorrow, 10:00 AM`, `Tomorrow, 11:00 AM`, `Tomorrow, 3:00 PM`), calendar date-time picker, and `Cancel` / `Done` buttons.
   - Full WYSIWYG editor toolbar: Undo, Redo, Format, Bold, Italic, Underline, Strikethrough, Alignments, Lists, Quotes, Code block, and Links.

---

## ⚡ Scheduler, Persistence & Concurrency Deep Dive

### 1. Delay & Scheduling Without Cron
- Every email scheduling request computes the delay:
  $$\text{delay} = \max(0, \text{targetTimestamp} - \text{Date.now()})$$
- The job is enqueued in BullMQ with that delay:
  ```ts
  await emailQueue.add('send-email', jobData, { jobId: `email-${id}`, delay });
  ```
- For bulk recipients from a CSV list, the send times are automatically staggered:
  $$\text{scheduledTime}_i = \text{baseStartTime} + i \times (\text{delayBetweenEmails} \times 1000)$$
  This guarantees provider throttling rules are respected from the moment jobs enter the queue.

### 2. Idempotency & Persistence Across Restarts
- **Redis BullMQ Persistence**: BullMQ retains delayed job timers inside Redis zsets. If the Node.js server crashes or restarts, jobs remain scheduled in Redis.
- **Relational DB State**: Every job is stored in PostgreSQL (`EmailJob` table) with status (`scheduled`, `processing`, `sent`, `failed`, `rescheduled`).
- **Startup Reconciliation**: On server initialization, `WorkerService.resyncPendingJobs()` scans the DB for any scheduled jobs and verifies their presence in BullMQ, re-enqueueing any missed jobs with their remaining delay.
- **Deduplication Check**: Before a worker fires an email, it verifies `status !== 'sent'` in the database to prevent duplicate deliveries.

### 3. Worker Concurrency & Provider Throttling
- The BullMQ worker is instantiated with `concurrency: config.scheduler.workerConcurrency` (configurable via `WORKER_CONCURRENCY`).
- After each email send, the worker enforces the inter-email delay (`delaySeconds` or `DEFAULT_DELAY_BETWEEN_EMAILS`) to mimic provider throttling before accepting another job on that worker slot.

### 4. Hourly Rate Limiting per Sender & Auto-Rescheduling
- Rate limiting is keyed by sender and hour in Redis:
  `ratelimit:{sender}:{yyyy-MM-dd-HH}` with a 2-hour TTL.
- When an email job is processed:
  1. Worker reads the Redis counter.
  2. If counter $\ge$ `hourlyLimit`:
     - Calculates the start of the next hour window:
       $$\text{nextWindow} = \text{currentHour} + 1\text{ hour}, 00\text{ min}, 00\text{ sec}$$
     - Reschedules the job in BullMQ with $\text{delay} = \text{nextWindow} - \text{Date.now()}$.
     - Updates DB and Elasticsearch status to `rescheduled`.
     - Dispatches a live Slack notification.
     - **Jobs are never dropped or permanently failed.**
  3. If counter $<$ `hourlyLimit`:
     - Counter is atomically incremented via Redis `INCR`.
     - Email is sent via Ethereal SMTP.
     - Job status is updated to `sent` with timestamp and preview URL.

---

## 🔔 Slack Rate Limit Notification System

When a sender exceeds their hourly quota, the scheduler dispatches a real Slack notification:

### Setup Options
1. **Option A (Instant Webhook)**:
   - Click **Slack Alerts** in the dashboard sidebar.
   - Paste any Slack incoming webhook (`https://hooks.slack.com/services/...`).
   - Click **Test Alert** to receive a live verification message immediately.
2. **Option B (OAuth Flow)**:
   - Supply `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET` in `.env`.
   - Click **Connect Slack via OAuth** in the dashboard to authorize the workspace.

### Rate Limit Alert Message Format (Block Kit)
```
⚠️ ReachInbox Scheduler: Hourly Rate Limit Hit
----------------------------------------------------------------------
Sender:         oliver.brown@domain.io
Hourly Limit:   50 emails / hr
Current Count:  50 sent
Next Window:    11:00:00 AM

Action Taken:   Email to lead@company.com (Job: email-xxx) has been
                preserved and automatically delayed to the next window
                without dropping.
----------------------------------------------------------------------
⏰ Timestamp: 2025-05-10T10:14:02Z | Powered by ReachInbox Scheduler
```
*Note: If Slack is not connected, the rate-limit handler logs a warning and proceeds gracefully without crashing.*

---

## 🔍 Elasticsearch Search & Indexing

- **Index**: `emails`
- **Fields**: `id`, `bullJobId`, `from`, `to`, `subject`, `body`, `status`, `scheduledFor`, `sentAt`, `createdAt`.
- **Search Capabilities**:
  - Multi-match querying across `subject^3`, `to^2`, `from^2`, and `body`.
  - Automatic typo-tolerance (`fuzziness: "AUTO"`).
  - Status filtering (`scheduled`, `sent`, `failed`).
- **Resilient Fallback**: If Elasticsearch is booting or offline, queries automatically fall back to PostgreSQL `contains` searches seamlessly.

---

## 📡 API Reference

### Authentication
- `POST /api/auth/google`: Verify Google ID token and login.
- `POST /api/auth/login`: Email & password login.
- `POST /api/auth/demo`: Instant login as Oliver Brown persona.
- `GET /api/auth/me`: Retrieve authenticated user profile.

### Scheduler
- `POST /api/schedule`: Schedule single or bulk emails.
  ```json
  {
    "from": "oliver.brown@domain.io",
    "to": ["lead1@example.com", "lead2@example.com"],
    "subject": "Follow up",
    "body": "<p>Hello lead,</p>",
    "scheduledTime": "2025-05-10T10:00:00Z",
    "delayBetweenEmails": 2,
    "hourlyLimit": 50
  }
  ```

### Emails
- `GET /api/emails/scheduled`: List queued, scheduled, and processing emails.
- `GET /api/emails/sent`: List sent and failed emails with Ethereal preview links.
- `GET /api/emails/detail/:id`: Retrieve single email with attachments and body.
- `GET /api/emails/search?q=...&status=...`: Query emails via Elasticsearch.
- `DELETE /api/emails/:id`: Cancel a scheduled email before delivery.
- `GET /api/emails/senders`: Retrieve available sender accounts.
- `POST /api/emails/seed`: Seed sample demo emails matching Figma screenshots.

### Slack
- `GET /api/slack/status`: Current connection status.
- `POST /api/slack/webhook`: Save incoming webhook URL.
- `POST /api/slack/disconnect`: Disconnect Slack integration.
- `GET /api/slack/oauth/start`: Start Slack OAuth flow.
- `POST /api/slack/test-alert`: Trigger a test rate-limit alert to Slack.

### Monitoring
- `GET /api/dashboard/stats`: System metrics, queue counts, and worker status.
- `GET /admin/queues`: Interactive Bull-Board queue dashboard.

---

## 🧪 Testing & Demonstration Checklist

| Scenario | Steps to Verify | Expected Result |
|---|---|---|
| **1. Login & Demo Persona** | Open `http://localhost:5173`, click "One-Click Demo Login as Oliver Brown" | Redirects to dashboard showing Oliver Brown profile and Figma navigation |
| **2. Schedule an Email** | Click `+ Compose`, enter recipient, subject, body, pick a time in "Send Later" | Job appears in Scheduled list with orange badge; appears in BullMQ delayed queue |
| **3. Bulk CSV Upload** | In Compose modal, click `Upload List`, select a CSV of leads | Recipient pills render with `+4` count chip; staggered delays applied automatically |
| **4. Ethereal Email Delivery** | Schedule an email for immediate send or wait for scheduled time | Email delivers via Ethereal SMTP; preview link appears in Sent tab and detail view |
| **5. Server Restart Persistence** | Schedule an email for +5 minutes, kill the backend server (`Ctrl+C`), restart it | Job remains scheduled and delivers at the exact scheduled time without duplication |
| **6. Rate Limiting & Slack Alert** | Connect Slack webhook via sidebar modal, set hourly limit to 2, schedule 5 emails | First 2 send; remaining 3 reschedule to next hour; live Slack alert message received |
| **7. Elasticsearch Search** | Type any keyword in the top search bar | Instant fuzzy match results retrieved from Elasticsearch index |
| **8. BullMQ Live Dashboard** | Open `http://localhost:5000/admin/queues` | View active, delayed, waiting, and completed jobs in real-time UI |
