# Decision Log

## Project Status
Nova AI integration for NovaPay is implemented and merged into the existing dashboard architecture.

## Decision 1: Integration Strategy
Decision:
- Use additive integration only.

Reason:
- Preserve existing dashboard behavior and avoid regressions.

Implementation:
- Existing sections, navigation, search, theme toggle, modal actions, and responsive layout are kept.
- Nova AI was added as new UI blocks and new JS modules, not as a rewrite.

## Decision 2: UI Placement
Decision:
- Add a floating Nova AI launcher at the bottom-right.
- Open a chat panel from the same corner.

Reason:
- Keeps the dashboard uncluttered and allows optional assistant usage.

Implementation:
- Floating button with gradient, icon, glow, hover animation, tooltip/title.
- Chat panel uses dark NovaPay styling, matching radius, borders, spacing, and shadow.
- Mobile layout expands to near full-screen panel.

## Decision 3: Chat Product Behavior
Decision:
- Include assistant welcome message, quick prompts, send box, typing state, clear chat action, and session history.

Reason:
- Delivers an assistant experience close to production fintech UX while staying lightweight.

Implementation:
- Quick prompts auto-send:
	- How much did I spend this month?
	- Where am I spending the most?
	- Can I afford a Rs20,000 purchase?
	- How much should I save?
	- Show my unusual expenses
	- Give me financial advice
- Send button is disabled for empty input.
- Enter submits.
- Escape closes panel.
- Clear conversation action uses confirmation.
- Chat history persisted in localStorage with key: novaAIChat.

## Decision 4: Security Architecture
Decision:
- Never expose AI_API_KEY in client-side code.
- Route AI calls through backend endpoint POST /api/nova-ai.

Reason:
- API keys must stay server-side for security.

Implementation:
- Frontend calls /api/nova-ai.
- Backend reads AI_API_KEY from .env.
- .env added to .gitignore.
- .env.example added for safe setup.

## Decision 5: Backend Technology
Decision:
- Use minimal Node + Express server.

Reason:
- Project had no backend and required secure key handling.

Implementation:
- Static frontend serving + AI proxy in one server.
- dotenv for environment management.
- Request timeout + structured error handling for API failures.

## Decision 6: AI Fallback Mode
Decision:
- If remote AI is unavailable, automatically fall back to local financial analysis.

Reason:
- Demo must stay functional without API key or internet.

Implementation:
- Trigger fallback on: missing API key, timeout, network error, invalid AI response, upstream error.
- Display user-safe message:
	- Nova AI is temporarily unavailable.
	- I can still analyze your NovaPay transactions locally.

## Decision 7: Financial Context Model
Decision:
- Build a live financial snapshot from dashboard state and pass it to assistant logic.

Reason:
- Responses must be data-aware and dynamic, not hardcoded.

Implementation:
- Snapshot includes:
	- current balance
	- monthly income
	- monthly expenses
	- transaction categories
	- monthly budget
	- upcoming payments
	- savings goal and progress
	- transaction list
- Exposed through window.NovaPayData.getSnapshot() and update event novapay:data-updated.

## Decision 8: Analysis Engine Scope
Decision:
- Implement dedicated financial-analysis module for local intelligence.

Reason:
- Keep AI/business logic modular and testable.

Implementation:
- Supports:
	- spending summaries
	- top category detection
	- largest expense ranking
	- budget status (within/over budget)
	- affordability checks using balance + upcoming + budget
	- unusual spending detection via threshold on category averages
	- savings suggestions
	- investment disclaimer behavior

## Decision 9: Currency Handling
Decision:
- Keep default currency from app state and adapt replies when question includes Rs/INR/₹.

Reason:
- User prompts may use rupee values while dashboard values are dollar-formatted.

Implementation:
- Local analysis parser detects currency hints from prompt text and formats responses accordingly.

## Decision 10: Insights on Dashboard
Decision:
- Add a dashboard "Nova AI Insights" panel with dynamic insight cards.

Reason:
- Make AI visible even without opening chat and provide proactive value.

Implementation:
- Insights generated from live data and refreshed on state updates.
- Typical cards include:
	- high spending category
	- budget remaining or overrun
	- savings goal progress
	- unusual spending / largest expense signals

## Decision 11: Accessibility
Decision:
- Add accessibility basics for assistant interactions.

Reason:
- Improve usability across keyboard and assistive usage.

Implementation:
- Added aria-labels on launcher, panel, controls, and send flow.
- Focus-visible styles for controls.
- Keyboard support: Enter send, Escape close.
- Messages region is keyboard focusable.

## Decision 12: Error Handling Rules
Decision:
- Handle failures gracefully without app crash.

Reason:
- Dashboard must remain stable under AI failures.

Implementation:
- Input validation for empty/too-long messages.
- API error and timeout handling.
- Invalid response guard.
- Fallback analyzer invoked automatically.

## Decision 13: Existing Feature Preservation
Decision:
- Do not remove or replace existing NovaPay functions.

Reason:
- Requirement: existing functionality must continue exactly.

Implementation:
- Existing JS state/actions preserved.
- Minor safe improvements were additive and compatible.

## Decision 14: File Organization
Decision:
- Introduce modular directories for AI and server logic.

Reason:
- Maintainability and clean separation of concerns.

Implementation:
- ai/financial-analysis.js
- ai/nova-ai.js
- server/server.js
- package.json
- .env.example
- .gitignore
- Updated existing: index.html, styles.css, script.js

## Decision 15: Operational Runbook
Decision:
- Standardize local run via npm scripts.

Reason:
- Simple onboarding and reproducible startup.

Commands:
1. npm install
2. Create .env from .env.example
3. Add AI_API_KEY in .env
4. npm start
5. Open http://localhost:3000

## Decision 16: Environment Variables
Decision:
- All AI connection settings must be configurable via environment.

Implementation:
- AI_API_KEY=
- AI_MODEL=gpt-4o-mini
- AI_API_URL=https://api.openai.com/v1/chat/completions
- PORT=3000

## Decision 17: Dynamic Local State Persistence
Decision:
- Save and load financial data and app settings to/from a local JSON file (`server/data.json`) when running on localhost.
- Ensure the app falls back gracefully to localStorage or defaults when loaded statically (via `file:///`).

Reason:
- To make the dashboard dynamic rather than static, allowing updates like transfers, top-ups, theme changes, and settings preferences to persist across page reloads.

Implementation:
- Created Express endpoints `GET /api/state` and `POST /api/state` in `server/server.js` to read and write `server/data.json`.
- Integrated asynchronous startup `loadStateFromServer()` and save hooks `saveStateToServer()` in `script.js`.
- Included settings values (notifications, weekly summary, biometric) and theme preferences directly in the state object.

## Decision 18: Multi-Profile Support & Card Management
Decision:
- Refactor the data structure to store profiles under a `profiles` array with an `activeProfileId` tracker.
- Dynamically render cards from state and support adding and removing cards.

Reason:
- To allow users to create and switch between multiple independent profiles, each maintaining separate balances, transactions, settings, and card details.
- To make virtual/physical cards fully dynamic (rather than hardcoded).

Implementation:
- Updated backend `DEFAULT_STATE` and client `state` to include `profiles` array.
- Added client-side sync helpers (`createProfileFromCurrentState`, `copyProfileToState`, `saveStateToCurrentProfile`) to bridge flat variables (read by dashboard script) with nested profile data.
- Built interactive profile dropdown with profile selection and "＋ Add new profile" button.
- Added custom card addition modal and card deletion button with custom hover states in `styles.css`.

## Decision 19: Offline Warning Status Banner
Decision:
- Create a persistent alert banner at the top of the chat panel instead of prefixing repetitive fallback warnings to message bubbles.

Reason:
- To prevent spamming and cluttering the chat history with the same warning, keeping the conversations clean and readable while still informing the user of the offline status.

Implementation:
- Added `#novaAIBanner` markup inside `#novaAIPanel` in `index.html`.
- Updated `.nova-ai-panel` layout in `styles.css` from `grid` to `flex` to dynamically support the banner height without breaking CSS Grid tracks.

## Decision 20: Smarter Local Intent Matcher & Financial Advice
Decision:
- Upgrade the local financial analyzer (`localAnswer` in `financial-analysis.js`) to parse synonym phrases, handle specific categories (Food, Bills, Transport, Shopping, Income), and provide custom budget suggestions.

Reason:
- To make the local fallback mode feel highly intelligent, flexible, and context-aware.

Implementation:
- Rewrote `localAnswer` in `ai/financial-analysis.js` to match synonyms and sum up category expenses dynamically, attaching `💡 Suggestion:` recommendations tailored to the query.

## Decision 21: Dynamic Context-Specific Suggestion Chips
Decision:
- Replace static quick question suggestions at the bottom of the chat panel with dynamic follow-up suggestions returned by the analysis logic.

Reason:
- To keep the user in a natural conversation flow by offering suggestions that directly relate to their previous question.

Implementation:
- Updated `localAnswer` to return custom suggestions arrays.
- Modified `renderQuickQuestions` and `sendQuestion` in `ai/nova-ai.js` to dynamically swap out the suggestion chips.
- Stripped old warning prefixes from `localStorage` history on load to maintain clean chat threads.

## Decision 22: Profile Management in Settings Screen & Offline Initialization Fallback
Decision:
- Add a dedicated "Profile Management" section inside the Settings tab, listing all profiles with active status indicators, a "Switch" button for inactive profiles, and a "+ Add new profile" button.
- Guarantee that `loadStateFromServer()` initializes at least one default profile if both loading attempts (server and localStorage) fail/are empty on startup.

Reason:
- To make managing and switching between profiles highly visible, accessible, and user-friendly (complementing the profile button in the topbar).
- To prevent uninitialized broken UI states when loading the app statically (via `file:///index.html`) or fresh off a clean database.

Implementation:
- Added dynamic HTML template rendering in `script.js` under `renderFullSection("settings")` with `#settingsProfileList` container.
- Implemented `renderSettingsProfileList()` to dynamically query `state.profiles` and attach click handlers.
- Added fallback check `if (!state.profiles || !state.profiles.length) { ... }` at the end of `loadStateFromServer()`.

## Decision 23: Zero-State Profile Initialization & Dynamic Mini-Cards
Decision:
- Configure newly created profiles to start completely fresh with zero values (balance = 0, empty transactions/activities/payments/cards, budget = 0, savingsGoal = 0).
- Enable dynamic rendering of the "Monthly spending" mini-card on the dashboard based on the active profile's transactions and budget limit (previously hardcoded in HTML).

Reason:
- To ensure that any secondary profiles start from absolute zero rather than inheriting pre-populated seed data, providing an authentic fresh onboarding experience.
- To make the dashboard fully reactive to profile changes, updating the monthly spending metric dynamically rather than showing static dummy values.

Implementation:
- Modified `createNewProfile()` in `script.js` to set balance, budget, savingsGoal, transactions, activities, payments, and cards to 0 or empty arrays.
- Added IDs to `index.html` elements inside `.mini-card` (`#spendingTrend`, `#spendingAmount`, `#spendingProgress`, `#spendingLimit`).
- Updated `updateBalanceUI()` in `script.js` to calculate spent total, compare against the monthly limit, and dynamically update the mini-card text and progress bars.

## Decision 24: Profile Deletion Functionality
Decision:
- Add a "Delete" button inside the Settings tab for all inactive profiles (when there is more than 1 profile in the workspace).

Reason:
- To allow users to delete profiles that they no longer need, freeing up storage and keeping their profile switch list clean and uncluttered.

Implementation:
- Added a `.settings-delete-profile-btn` element to `renderSettingsProfileList()`.
- Added the `deleteProfile(id)` handler in `script.js` which prompts the user for confirmation and removes the profile from `state.profiles` list, saving changes to the local server or localStorage.

## Decision 25: Enriched Multi-Profile Mock Dataset
Decision:
- Populate `server/data.json`, `DEFAULT_STATE` in `server/server.js`, and default fallback state in `script.js` with comprehensive, realistic financial profiles and diverse transaction histories.

Reason:
- To provide a realistic demo experience with varied transactions (salary, freelance, tech supplies, groceries, utilities, subscriptions, business retainers), multiple categories, and distinct profiles (Utkarsh, Sarah Jenkins, Alex Chen).

Implementation:
- Created 3 detailed profiles: Utkarsh (Personal), Sarah Jenkins (Business & Consulting), and Alex Chen (Student & Tech).
- Added categorized transactions, detailed activity logs, upcoming payment schedules, monthly budget targets, savings goals, and payment cards across all 3 profiles.
- Ensured consistent default states across server data file (`server/data.json`), backend initial state (`DEFAULT_STATE` in `server/server.js`), and frontend fallback state (`script.js`).

## Decision 26: Statement Export Feature with Preset & Custom Date Ranges
Decision:
- Add a dedicated "Export Statement" feature accessible from both the dashboard topbar and the Transactions section.
- Support period presets for 1 Month (30d), 3 Months (90d), 6 Months (180d), 1 Year (365d), and Custom Date ranges, along with Expense/Income filtering.

Reason:
- To allow users to filter, inspect, and export their financial activity across specific timeframes in standard CSV spreadsheet formats or print-ready PDF statement previews.

Implementation:
- Added `#exportStatementBtn` in topbar (`index.html`) and `#sectionExportBtn` in Transactions panel (`script.js`).
- Implemented `openExportStatementModal()` and `renderExportStatementModal()` with interactive period preset buttons, transaction type filter chips, and custom `From Date` and `To Date` input fields.
- Implemented `getFilteredTransactionsForStatement()` date-range calculation and transaction filtering logic.
- Implemented `downloadStatementCSV()` to generate Blob CSV files (`NovaPay_Statement_<Profile>_<Period>.csv`) containing Date, Merchant, Category, Type, Amount, and Status.
- Implemented `printStatementPreview()` to render a clean printable HTML statement window with header metadata, financial totals summary, and transaction table, auto-triggering `window.print()`.
- Added CSS styles for preset grid, filter chips, custom date inputs, and `@media print` rules in `styles.css`.

## Decision 27: Red & White Minimalist Theme Redesign
Decision:
- Redesign the application color scheme from dark purple/cyan to a high-contrast crisp White background with vibrant Red primary accents.

Reason:
- Satisfy user request to convert all blue/purple theme colors to Red and make all other surface/background colors White.

Implementation:
- Updated `:root` CSS variables in `styles.css`: `--bg: #ffffff`, `--panel: #ffffff`, `--panel2: #f8f9fa`, `--text: #111111`, `--purple: #e53935`, `--cyan: #ff5252`, `--primary: #e53935`.
- Updated sidebar, topbar, cards, buttons, AI chat, statement modals, progress bars, chart bars, and badges to use crisp white backgrounds and crimson red gradients.
- Updated `light.textContent` style override in `script.js` to match the white & red design system.

## Decision 28: Production MySQL Database & Relational Schema Integration
Decision:
- Use **MySQL ONLY** as the database layer for NovaPay, driven by `mysql2/promise`. Remove all mock memory or static JSON persistence from active routes.

Reason:
- To provide enterprise-grade, persistent, scalable relational data storage supporting users, transactions, cards, accounts, budgets, goals, payments, and Nova AI chats.

Implementation:
- Created `database/schema.sql` defining 8 relational tables: `users`, `transactions`, `accounts`, `cards`, `budgets`, `goals`, `payments`, `ai_chats`.
- Added foreign key constraints (`ON DELETE CASCADE`) and performance indexes on `email` and foreign keys.
- Created `server/db.js` with `mysql2/promise` connection pool and database/schema auto-initializer.
- Created `database/seed.sql` for initial environment seeding.

## Decision 29: JWT HTTP-Only Cookie Authentication & Security Hardening
Decision:
- Implement production-style user authentication using `bcryptjs` password hashing and signed JWT tokens delivered via secure `HTTP-Only` cookies.

Reason:
- Protect user credentials and sessions against XSS token theft and brute force unauthorized access.

Implementation:
- Created auth endpoints: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `PUT /api/auth/change-password`.
- Passwords stored as 10-round bcrypt hashes.
- Built `server/middleware/auth.js` (`requireAuth`) to extract and verify HTTP-Only `novapay_token` cookie.
- Integrated NovaPay Auth UI (Login & Create Account modals) in `index.html` with input validation, password toggle, error banners, and loading indicators.
- Added security middleware: `helmet`, `cors`, `express-rate-limit`, `cookie-parser`.

## Decision 30: Strict Multi-User Data Isolation
Decision:
- Enforce strict per-user query filtering using `WHERE user_id = req.user.id` across all database controllers.

Reason:
- Ensure complete data isolation so no user can view, edit, or delete another user's financial records.

Implementation:
- All controller queries (`transactionController.js`, `accountController.js`, `cardController.js`, `budgetController.js`, `goalController.js`, `paymentController.js`, `aiController.js`) extract `user_id` strictly from `req.user.id` set by `requireAuth` middleware.
- Request payload `user_id` fields are ignored.

## Decision 31: Default Zeroed Financial State
Decision:
- Configure all default budgets, account balances, card credit limits, savings goals, and scheduled payments to start at `0.00`.

Reason:
- Provide clean, unbloated initial onboarding where users manage their own real financial figures from zero.

Implementation:
- Updated `database/seed.sql`, `authController.js` registration seed, and `script.js` initial state so all financial values default to `0.00`.

## Decision 32: Dynamic Multi-Region Currency Selector
Decision:
- Add a topbar Currency & Region dropdown allowing users to select their preferred currency on the fly and persist it to MySQL.

Reason:
- Accommodate international users from different regions with proper currency symbol formatting across the dashboard.

Implementation:
- Added Currency Selector dropdown button in topbar (`index.html`) with support for 7 currencies: 🇮🇳 **INR (₹)**, 🇺🇸 **USD ($)**, 🇪🇺 **EUR (€)**, 🇬🇧 **GBP (£)**, 🇯🇵 **JPY (¥)**, 🇨🇦 **CAD ($)**, 🇦🇺 **AUD ($)**.
- Refactored money formatting functions (`money()`, `amountOnly()`) in `script.js` to dynamically format values using active currency symbol.
- Updated chart Y-axis labels, analytics cards, payment lists, export statement previews, and Nova AI context to dynamically reflect the selected currency.
- Persisted user currency selection to MySQL database via `PUT /api/users/profile`.

## Final Summary
All major decisions for Nova AI and NovaPay were made to satisfy twenty constraints:
- preserve existing NovaPay features
- add secure AI capability
- ensure demo reliability via fallback mode
- keep architecture modular and maintainable
- enable dynamic persistence of dashboard state and configurations via MySQL database
- support multi-profile state mapping and dynamic wallet management
- keep conversation bubbles clean of repetitive offline warning banners
- deliver smarter and more flexible offline financial intent matching
- provide dynamic, context-specific follow-up recommendation chips
- offer prominent profile creation and switching options in Settings, with offline fallbacks
- enforce empty/zero-state defaults for new profiles to ensure a realistic fresh onboarding experience
- provide safe profile deletion controls in Settings for all inactive profiles
- provide rich, multi-category seed data across all profiles
- support statement exports for 1M, 3M, 6M, 1Y, and Custom Date ranges in CSV and printable PDF formats
- convert theme color system to a high-contrast Red & White color palette
- implement MySQL-only database persistence with relational table structure
- protect user sessions with HTTP-only JWT cookies and bcrypt password hashing
- enforce strict multi-user data isolation on every database query
- configure default budget, balance, goal, and payment values to zero
- provide dynamic multi-region currency selector supporting INR, USD, EUR, GBP, JPY, CAD, and AUD



