# NovaPay — Personal Finance Management Dashboard

NovaPay is a high-performance, full-stack Personal Finance Management Dashboard equipped with **Nova AI** assistant, production-style JWT authentication via HTTP-only cookies, and **MySQL** database persistence with multi-user data isolation.

> [!IMPORTANT]
> **DATABASE ARCHITECTURE**: NovaPay uses **MySQL ONLY**. No MongoDB, SQLite, PostgreSQL, or mock in-memory stores are used in production.

---

## 🌟 Key Features

- **Real Production-Style Authentication**:
  - Secure Registration & Login using `bcryptjs` password hashing (salt rounds = 10).
  - Signed JWT tokens delivered via secure `HTTP-Only` cookies (`novapay_token`).
  - Account Profile management (`PUT /api/users/profile`) & Password change support.
- **Strict Multi-User Data Isolation**:
  - Every financial query filters strictly using `req.user.id` from the authenticated session.
  - Users can NEVER access or manipulate another user's financial records.
- **MySQL Database Integration**:
  - Relational schema support for `users`, `transactions`, `accounts`, `cards`, `budgets`, `goals`, `payments`, and `ai_chats`.
  - Foreign key constraints with `ON DELETE CASCADE` and optimized indexes.
- **Nova AI Financial Assistant**:
  - Grounded financial advice using the authenticated user's real MySQL context.
  - Per-user conversation history saved in `ai_chats`.
- **Complete Financial Dashboard**:
  - Real-time Balance tracking, Monthly spending metrics, Cash flow analytics charts.
  - Transaction history filtering, CSV & PDF Statement Export.
  - PCI-compliant Card wallet management (stores only safe display info like `last_four`).

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3 (Vanilla Glassmorphism Theme with Light/Dark Mode), JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Database**: **MySQL ONLY** (driven by `mysql2/promise`)
- **Authentication**: `bcryptjs`, `jsonwebtoken`, `cookie-parser`
- **Security & Utilities**: `helmet`, `express-rate-limit`, `cors`, `dotenv`

---

## 🗄️ Database Schema & Architecture

The database consists of 8 interconnected tables with foreign key constraints:

```sql
users (id, name, email [UNIQUE], password_hash, avatar, currency, created_at, updated_at)
transactions (id, user_id [FK], type, title, category, amount, description, transaction_date)
accounts (id, user_id [FK], name, account_type, balance, currency)
cards (id, user_id [FK], card_name, last_four, card_type, credit_limit, available_limit, expiry_month, expiry_year)
budgets (id, user_id [FK], category, amount, spent, month, year)
goals (id, user_id [FK], name, target_amount, current_amount, deadline)
payments (id, user_id [FK], title, amount, category, status, payment_date)
ai_chats (id, user_id [FK], message, response, created_at)
```

Schema script: `database/schema.sql`  
Seed script: `database/seed.sql`

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env`:

```env
PORT=5000

MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=novapay

JWT_SECRET=replace_with_a_long_random_secret

NODE_ENV=development

AI_API_KEY=
AI_MODEL=gpt-4o-mini
AI_API_URL=https://api.openai.com/v1/chat/completions
```

---

## 🚀 Setup & Execution Instructions

### 1. Install & Configure MySQL
1. Ensure MySQL server is running locally (default port `3306`).
2. Log into MySQL shell or Workbench and create the database:
   ```sql
   CREATE DATABASE novapay;
   ```
3. (Optional) Run the schema and seed scripts manually:
   ```bash
   mysql -u root -p novapay < database/schema.sql
   mysql -u root -p novapay < database/seed.sql
   ```
   *Note: The Express server will also attempt auto-creation of database tables on startup.*

### 2. Install Node Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm run dev
# or
npm start
```
The server will start at: `http://localhost:5000`

---

## 🔒 Security Implementation Details

1. **Password Protection**: Passwords are standard-hashed with `bcryptjs` before DB entry. Plaintext passwords or `password_hash` are never returned in responses.
2. **HTTP-Only Token Cookies**: JWT authentication tokens are sent strictly as HTTP-only, SameSite cookies to mitigate XSS attacks.
3. **Parameterized SQL Queries**: All database queries use `?` parameter placeholders via `mysql2/promise` to prevent SQL Injection.
4. **Data Isolation**: Controllers enforce `WHERE user_id = req.user.id` on every query, discarding any `user_id` supplied in request payloads.
5. **Security Headers & Rate Limiting**: Hardened using `helmet` and `express-rate-limit` on login/register endpoints.

---

## 🧪 Testing Verification Flow

1. **User Registration**: Register a new user e.g. `test@novapay.com` / `Password123`. Verify record creation in MySQL `users` table with hashed password.
2. **Session Persistence**: Refresh the browser -> `GET /api/auth/me` validates cookie and keeps user authenticated.
3. **Logout**: Click Logout -> `novapay_token` cookie is cleared, returning user to login UI.
4. **Transaction & Card Persistence**: Add a transaction or card -> Verify creation in MySQL tables `transactions` and `cards`.
5. **Multi-User Isolation Test**:
   - Log in as User A (`a@test.com`), create a transaction of ₹50,000.
   - Log out and register/log in as User B (`b@test.com`).
   - Verify User B cannot see User A's transaction in their dashboard, API, or Nova AI assistant context.
