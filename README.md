# 💳 NovaPay — Smart Finance Dashboard

NovaPay is a modern **personal finance management dashboard** designed to help users track their money, analyze spending, manage transactions, monitor upcoming payments, and interact with an AI-powered financial assistant.

The project focuses on combining a clean fintech-style interface with practical financial management features.

---

## ✨ Features

### 📊 Interactive Dashboard

* Available balance overview
* Monthly spending tracker
* Income and expense visualization
* Cash-flow chart
* Recent transaction activity
* Upcoming payments
* Quick money actions

### 💸 Transaction Management

* View transaction history
* Search transactions
* Track income and expenses
* Transaction status indicators
* Transaction details
* Dynamic transaction updates

### 💰 Money Management

* Add money
* Transfer money
* Request money
* Schedule payments
* Track recurring payments
* Monitor monthly spending limits

### 💳 Card Management

* Digital card interface
* Multiple cards
* Card status
* Card information
* Virtual card concept

### 📈 Analytics

NovaPay provides financial insights including:

* Income analysis
* Expense analysis
* Savings analysis
* Spending trends
* Monthly comparisons
* Financial health indicators

### 🎯 Financial Goals

Users can create and track goals such as:

* Emergency fund
* New laptop
* Travel
* Education
* Major purchases

### 🤖 Nova AI

NovaPay includes an AI financial assistant designed to help users understand their finances.

Example questions:

> "How much did I spend this month?"

> "Where am I spending the most?"

> "Can I afford a ₹20,000 purchase?"

> "How much should I save?"

> "Show my unusual expenses."

> "Give me financial advice."

Nova AI can analyze:

* Current balance
* Income
* Expenses
* Transactions
* Spending categories
* Budgets
* Upcoming payments
* Financial goals

The project also supports a **local/demo fallback mode** so the application can continue working without an AI API connection.

---

## 🎨 UI Design

NovaPay uses a modern fintech-inspired design with:

* Dark dashboard
* Purple/cyan gradient cards
* Responsive layout
* Glassmorphism-inspired panels
* Interactive charts
* Smooth hover effects
* Toast notifications
* Modal dialogs
* Mobile-friendly interface

---

## 🛠️ Tech Stack

### Frontend

* HTML5
* CSS3
* JavaScript
* Responsive Design

### Backend

* Node.js
* Express.js

### Database

* MongoDB

### AI

* AI API integration
* Nova AI financial assistant
* Local fallback financial analysis

### Development Tools

* VS Code
* Git
* GitHub
* npm

---

## 📁 Project Structure

```text
NovaPay/
│
├── ai/
│   ├── nova-ai.js
│   └── financial-analysis.js
│
├── server/
│   └── server.js
│
├── index.html
├── script.js
├── styles.css
│
├── package.json
├── package-lock.json
│
├── .env.example
├── .gitignore
│
└── README.md
```

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/YOUR-USERNAME/novapay.git
```

### 2. Navigate to the project

```bash
cd novapay
```

### 3. Install dependencies

```bash
npm install
```

### 4. Create environment variables

Create a `.env` file in the project root.

```env
PORT=3000
AI_API_KEY=your_api_key_here
```

**Never commit your real ****`.env`**** file or API keys to GitHub.**

The `.env` file should be included in `.gitignore`.

---

## ▶️ Run the Application

Start the development server:

```bash
npm start
```

Then open:

```text
http://localhost:3000
```

If your project uses a development script, you can also run:

```bash
npm run dev
```

---

## 🤖 Nova AI Architecture

Nova AI follows this basic flow:

```text
User
  │
  ▼
NovaPay Dashboard
  │
  ▼
Nova AI Chat
  │
  ▼
Backend API
  │
  ├── Financial Data
  │
  ├── Transaction Analysis
  │
  └── AI Model
          │
          ▼
     AI Response
          │
          ▼
      Nova AI UI
```

The API key remains on the server and is **never exposed to the frontend**.

---

## 🔐 Security

NovaPay follows basic security practices for a portfolio project:

* API keys stored in environment variables
* `.env` excluded from Git
* Backend API used for AI requests
* Input validation
* Error handling
* No hardcoded API credentials

> **Note:** NovaPay is a demonstration/portfolio project and is not connected to real banking infrastructure.

---

## 📱 Responsive Design

NovaPay is designed to work across:

* 💻 Desktop
* 🖥️ Large screens
* 📱 Mobile
* 📟 Tablet

The dashboard automatically adapts to smaller screen sizes.

---

## 🧠 Future Improvements

Planned improvements include:

* [ ] Real authentication
* [ ] MongoDB transaction persistence
* [ ] User profiles
* [ ] Secure payment integration
* [ ] Real-time notifications
* [ ] Advanced AI financial insights
* [ ] Automatic transaction categorization
* [ ] Spending anomaly detection
* [ ] Budget recommendations
* [ ] Financial goal tracking
* [ ] CSV/Excel bank statement import
* [ ] Multi-currency support
* [ ] PWA/mobile application
* [ ] Dark/light theme improvements
* [ ] Advanced financial reports
* [ ] PDF transaction statements

---

## 📸 Dashboard Preview

NovaPay features a modern financial dashboard containing:

* Balance overview
* Quick money actions
* Monthly spending
* Cash-flow analytics
* Recent activity
* Transaction history
* Upcoming payments
* Nova AI assistant

---

## ⚠️ Disclaimer

NovaPay is an **educational and portfolio project**.

It does not provide actual banking, payment-processing, investment, or financial-advisory services.

Do not use real financial credentials, banking passwords, card information, or sensitive financial data with the demo application.

---

## 👨‍💻 Author

**Utkarsh**

Computer Science / Engineering Student

---

## ⭐ Support

If you find this project useful, consider giving the repository a ⭐ on GitHub.

---

## 📄 License

This project is available for educational and portfolio purposes.

You can add an appropriate open-source license such as **MIT License** if you decide to distribute the project publicly.
