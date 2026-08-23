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

## Final Summary
All major decisions for Nova AI were made to satisfy four constraints:
- preserve existing NovaPay features
- add secure AI capability
- ensure demo reliability via fallback mode
- keep architecture modular and maintainable
