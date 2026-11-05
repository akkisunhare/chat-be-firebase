# Scalable Chat Backend (PostgreSQL + Firebase Firestore)

A production-grade, enterprise-ready Chat Backend built for the **Codes For Tomorrow** developer assignment. Designed with a **Clean Layered Architecture**, strict TypeScript typing, hybrid persistence (**PostgreSQL** for relational metadata and memberships, **Firebase Firestore** for high-throughput message storage), and atomic concurrency protection.

---

## 🛠 Tech Stack

- **Runtime & Framework:** Node.js (v20+), Express.js (v5)
- **Language:** TypeScript (Strict mode enabled, zero `any` types)
- **Relational Database & ORM:** PostgreSQL, Prisma ORM 7 (`@prisma/adapter-pg`)
- **NoSQL Document Database:** Firebase Firestore via Firebase Admin SDK
- **Validation:** Zod v4 (Params, query, body validation)
- **Testing:** Vitest, Supertest
- **Dev Tools:** tsx (instant TypeScript execution), rimraf

---

## 🏗 Architecture Overview

```text
HTTP Request
     │
     ▼
[ Express Router ] ── (Routes Layer)
     │
     ▼
[ validateRequest ] ── (Zod Validation Middleware)
     │
     ▼
[ Controller ] ── (HTTP Statuses & Standardized ApiResponse)
     │
     ▼
[ Service ] ── (Business Logic, Authorization & Membership Checks)
     │
     ├──► [ PostgreSQL Repository via Prisma ]  ── (Users, Chats, ChatMembers, Advisory Locks)
     │
     └──► [ Firestore Service via Firebase Admin ] ── (Messages, Read Receipts, Last Seen)
     │
     ▼
[ Centralized Error Handler ] ── (AppError, Zod, Prisma & Firebase error mapping)
```

### Hybrid Persistence Strategy

| Data Entity | Storage Engine | Rationale |
|---|---|---|
| **Users** | PostgreSQL | Relational integrity, unique constraints, fast indexed user lookup |
| **Chats & Members** | PostgreSQL | Relational integrity, composite primary key `(chatId, userId)` ensuring no duplicate memberships, transactional integrity |
| **Messages** | Firebase Firestore | Highly scalable append-only document store, real-time sync capability, low-latency writes |
| **Read Receipts** | Firebase Firestore | High-frequency update pattern nested under `chats/{chatId}/messages/{messageId}/readReceipts/{userId}` |
| **Last Seen Tracking** | Firebase Firestore | User-specific pointer at `chats/{chatId}/lastSeen/{userId}` with sequence monotonicity protection |

---

## 📁 Clean Folder Structure

```text
Codes for Tommorow/
├── .env                              # Local environment variables
├── .env.example                      # Template environment variables (no credentials)
├── .gitignore                        # Git exclusion rules
├── package.json                      # Project dependencies & scripts
├── prisma7.config.ts                 # Prisma 7 migration & datasource configuration
├── tsconfig.json                     # Strict TypeScript compiler options
├── vitest.config.ts                  # Test runner configuration
├── prisma/
│   ├── schema.prisma                 # PostgreSQL database models
│   ├── seed.ts                       # Database seeder (Alice, Bob, Charlie)
│   └── migrations/                   # SQL migration history
├── tests/
│   └── chat.test.ts                  # Comprehensive automated test suite (15 tests)
├── dist/                             # Compiled production build output
└── src/
    ├── app.ts                        # Express application pipeline & route mounting
    ├── server.ts                     # HTTP server startup, signals & graceful shutdown
    ├── config/
    │   ├── env.ts                    # Zod-validated environment config
    │   ├── database.ts               # Prisma PostgreSQL client, connection & health ping
    │   └── firebase.ts               # Firebase Admin SDK & Firestore initialization
    ├── controllers/
    │   ├── chat.controller.ts        # Chat, messages, receipts, and last seen handlers
    │   └── health.controller.ts      # Multi-database health monitor (/api/health)
    ├── middlewares/
    │   ├── errorHandler.ts           # Global error handler (AppError, Zod, Prisma, Firebase)
    │   ├── notFoundHandler.ts        # 404 Route Not Found handler
    │   └── validateRequest.ts        # Universal Zod request validator
    ├── repositories/
    │   └── chat.repository.ts        # PostgreSQL Data Access Layer (Prisma queries)
    ├── routes/
    │   ├── index.ts                  # Root aggregator router
    │   ├── chat.routes.ts            # /chat routes
    │   ├── health.routes.ts          # /health routes
    │   └── user.routes.ts            # /user routes
    ├── services/
    │   ├── chat.service.ts           # Chat & message domain business logic
    │   └── firestore.service.ts      # Firestore operations (messages, receipts, last seen)
    ├── types/
    │   └── chat.types.ts             # Domain interfaces & response contracts
    └── utils/
        ├── ApiResponse.ts            # Uniform API response standard
        └── AppError.ts               # Custom operational error class
```

---

## ⚙️ Setup & Installation Instructions (Windows / Linux / macOS)

### 1. Prerequisites
- **Node.js** v20.x or higher
- **PostgreSQL** v14+ running locally or in Docker (default port: `5432`)
- **Firebase Project** with Cloud Firestore enabled

### 2. Clone & Install Dependencies
```bash
npm install
```

### 3. PostgreSQL Database Setup
1. Create a database named `chat_backend`:
   ```bash
   # Windows PowerShell (using PostgreSQL bin path)
   & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "CREATE DATABASE chat_backend;"
   ```
2. Configure `.env` with your PostgreSQL connection URL:
   ```env
   DATABASE_URL="postgresql://postgres:root@localhost:5432/chat_backend?schema=public"
   ```
3. Run the Prisma migrations:
   ```bash
   npm run prisma:migrate
   ```
4. Generate the Prisma Client:
   ```bash
   npm run prisma:generate
   ```
5. Seed sample test users (Alice, Bob, Charlie):
   ```bash
   npm run seed
   ```

### 4. Firebase Firestore Setup
1. Go to [Firebase Console](https://console.firebase.google.com/) and create a project.
2. In the left navigation, go to **Build > Firestore Database** and click **Create database** (Test Mode).
3. Go to **Project Settings (⚙️) > Service accounts > Generate new private key**.
4. Download the JSON key file.
5. Populate `.env`:
   ```env
   FIREBASE_PROJECT_ID="your-project-id"
   FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com"
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhki...\n-----END PRIVATE KEY-----\n"
   ```

---

## 🚀 Available NPM Scripts

| Command | Description |
|---|---|
| `npm run dev` | Runs the server in live watch mode using `tsx` |
| `npm run build` | Cleans `dist`, generates Prisma Client, and compiles TypeScript |
| `npm start` | Runs the compiled production code from `dist/server.js` |
| `npm run typecheck` | Strictly checks TypeScript types (`tsc --noEmit`) |
| `npm test` | Runs the full automated test suite with Vitest |
| `npm run seed` | Seeds test users into PostgreSQL |
| `npm run prisma:migrate` | Runs Prisma schema migrations |
| `npm run prisma:studio` | Opens Prisma Studio GUI in browser |

---

## 📡 API Documentation & Examples

Base URL: `http://localhost:5000` (or `http://localhost:5000/api`)

### Seeded User IDs For Testing
- **Alice Sharma:** `11111111-1111-4111-8111-111111111111`
- **Bob Verma:** `22222222-2222-4222-8222-222222222222`
- **Charlie Patel:** `33333333-3333-4333-8333-333333333333`

---

### 1. Health Check
- **Endpoint:** `GET /api/health`
- **Description:** Verifies PostgreSQL and Firestore live connectivity with latency pings.
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Backend services are healthy and operational",
  "data": {
    "status": "healthy",
    "uptimeSeconds": 120,
    "environment": "development",
    "timestamp": "2026-11-05T11:29:45.000Z",
    "database": {
      "status": "connected",
      "responseTimeMs": 1
    },
    "firestore": {
      "status": "connected",
      "responseTimeMs": 140
    },
    "memoryUsage": {
      "heapUsedMB": 32.5,
      "heapTotalMB": 45.2,
      "rssMB": 105.1
    }
  },
  "timestamp": "2026-11-05T11:29:45.000Z"
}
```

---

### 2. Create or Get Chat
- **Endpoint:** `POST /chat/create` (or `POST /api/chat/create`)
- **Description:** Creates a 1:1 chat or returns existing chat ID order-independently.
- **Request Body:**
```json
{
  "userAId": "11111111-1111-4111-8111-111111111111",
  "userBId": "22222222-2222-4222-8222-222222222222"
}
```
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Chat retrieved or created successfully",
  "data": {
    "chatId": "a608e503-c78a-4d8e-8791-062599593625"
  },
  "timestamp": "2026-11-05T11:00:05.750Z"
}
```

---

### 3. Send Message
- **Endpoint:** `POST /chat/:chatId/message/send`
- **Description:** Verifies membership in PostgreSQL, stores message in Firestore with server timestamp.
- **Request Body:**
```json
{
  "senderId": "11111111-1111-4111-8111-111111111111",
  "text": "Hello Rahul!"
}
```
- **Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "messageId": "c6daa532-7cd6-4e1d-8a60-e457d6c4fa64",
    "chatId": "a608e503-c78a-4d8e-8791-062599593625",
    "senderId": "11111111-1111-4111-8111-111111111111",
    "text": "Hello Rahul!",
    "timestamp": "2026-11-05T11:18:34.578Z"
  },
  "timestamp": "2026-11-05T11:18:35.671Z"
}
```

---

### 4. Get Messages (Cursor Pagination)
- **Endpoint:** `GET /chat/:chatId/messages?limit=50&cursor=MESSAGE_ID&userId=USER_ID`
- **Description:** Retrieves messages in chronological ascending order using Firestore `startAfter()` cursor pagination.
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Messages retrieved successfully",
  "data": {
    "messages": [
      {
        "messageId": "c6daa532-7cd6-4e1d-8a60-e457d6c4fa64",
        "chatId": "a608e503-c78a-4d8e-8791-062599593625",
        "senderId": "11111111-1111-4111-8111-111111111111",
        "text": "Hello Rahul!",
        "timestamp": "2026-11-05T11:18:34.578Z"
      }
    ],
    "pagination": {
      "limit": 50,
      "hasMore": false,
      "nextCursor": null
    }
  },
  "timestamp": "2026-11-05T11:26:12.927Z"
}
```

---

### 5. Mark Message Read
- **Endpoint:** `POST /chat/:chatId/message/:messageId/read`
- **Description:** Idempotently records read receipt under `chats/{chatId}/messages/{messageId}/readReceipts/{userId}`.
- **Request Body:**
```json
{
  "userId": "22222222-2222-4222-8222-222222222222"
}
```
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Message marked as read",
  "data": {
    "chatId": "a608e503-c78a-4d8e-8791-062599593625",
    "messageId": "c6daa532-7cd6-4e1d-8a60-e457d6c4fa64",
    "userId": "22222222-2222-4222-8222-222222222222",
    "readAt": "2026-11-05T11:29:43.965Z"
  },
  "timestamp": "2026-11-05T11:29:44.704Z"
}
```

---

### 6. Update Last Seen Message
- **Endpoint:** `POST /chat/:chatId/lastseen`
- **Description:** Updates the user's last seen position. Rejects backwards movements with 400 Bad Request.
- **Request Body:**
```json
{
  "userId": "11111111-1111-4111-8111-111111111111",
  "messageId": "080475eb-bc27-4367-bd9c-2250a2892d7a"
}
```
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Last seen updated successfully",
  "data": {
    "chatId": "a608e503-c78a-4d8e-8791-062599593625",
    "userId": "11111111-1111-4111-8111-111111111111",
    "messageId": "080475eb-bc27-4367-bd9c-2250a2892d7a",
    "lastSeenAt": "2026-11-05T11:29:44.569Z"
  },
  "timestamp": "2026-11-05T11:29:45.265Z"
}
```

---

### 7. List User Chats
- **Endpoint:** `GET /user/:userId/chats?page=1&limit=20`
- **Description:** Fetches all chats with member IDs in a single SQL query without N+1 problem.
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "User chats retrieved successfully",
  "data": {
    "chats": [
      {
        "chatId": "a608e503-c78a-4d8e-8791-062599593625",
        "isGroup": false,
        "members": [
          "11111111-1111-4111-8111-111111111111",
          "22222222-2222-4222-8222-222222222222"
        ],
        "createdAt": "2026-11-05T10:59:21.286Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  },
  "timestamp": "2026-11-05T11:29:45.527Z"
}
```

---

## 🛡️ Production & Security Considerations

1. **Authorization & Identity Verification:**
   - In accordance with the assignment specifications, `senderId` and `userId` are passed in request bodies and verified against PostgreSQL chat memberships.
   - **Production Architecture Note:** In a complete production deployment, user identity should not be trusted from request body IDs. Instead, a **JWT Authentication Middleware** (`auth.middleware.ts`) should verify the `Authorization: Bearer <token>` header, extract the verified `req.user.id`, and enforce that `req.user.id === senderId`.
2. **Concurrency Control:**
   - PostgreSQL **Transaction Advisory Locks** (`pg_advisory_xact_lock`) prevent duplicate 1:1 chat creations during simultaneous requests.
3. **Sequence Monotonicity:**
   - Last seen updates verify message timestamps so a client cannot move their read position backwards.
4. **Information Disclosure Protection:**
   - In production (`NODE_ENV=production`), error stack traces and internal database schemas are strictly hidden from HTTP responses.

---

## 🧪 Automated Testing

Run the full automated test suite covering all 15 required scenarios:
```bash
npm test
```

### Test Coverage Summary (15/15 Passed):
- `1. Create chat: should create a new 1:1 chat between Alice and Bob`
- `2. Get existing chat: should return existing chat without duplicate when order is reversed`
- `3. Send message: should allow a chat member (Alice) to send a message to Firestore`
- `4. Get messages: should retrieve messages in ascending order`
- `5. Mark message read: should store read receipt in Firestore`
- `6. Update last seen: should update the user last seen position in Firestore`
- `7. List user chats: should list all chats for Alice`
- `8. Invalid UUID: should reject invalid UUID parameters with 400 Bad Request`
- `9. Non-existent chat: should return 404 Not Found for non-existent chat ID`
- `10. Non-existent user: should return 404 when referencing non-existent user ID`
- `11. Non-member access: should return 403 Forbidden when Charlie tries to send message in Alice-Bob chat`
- `12. Empty message: should reject whitespace-only messages with 400 Bad Request`
- `13. Invalid limit: should reject negative or zero limit with 400 Bad Request`
- `14. Pagination: should paginate messages correctly using cursor`
- `15. Duplicate read receipt: should be idempotent when marking message read twice`

---

## 📦 GitHub Submission Commands

Run the following commands in your project root to commit and push to your GitHub repository:

```bash
# 1. Initialize Git repository (if not already initialized)
git init

# 2. Stage all project files (verifying .gitignore excludes .env and private keys)
git add .

# 3. Create descriptive initial commit
git commit -m "feat: complete chat backend assignment with PostgreSQL, Prisma and Firestore"

# 4. Set main branch
git branch -M main

# 5. Add your remote GitHub repository URL
git remote add origin YOUR_GITHUB_REPOSITORY_URL

# 6. Push to GitHub
git push -u origin main
```

