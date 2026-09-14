-- NovaPay Seed Data
USE novapay;

-- Demo User: utkarsh@novapay.com / Password123 (bcrypt hash for 'Password123')
INSERT INTO users (id, name, email, password_hash, avatar, currency)
VALUES (1, 'Utkarsh Tyagi', 'utkarsh@novapay.com', '$2a$10$89J8j2q0tA1D5.lA.b.Z4O74G.sF/1s9oFqj0eS2v5VzW/XyLgYy2', 'UT', 'INR')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Demo Accounts (All funds zero)
INSERT INTO accounts (id, user_id, name, account_type, balance, currency)
VALUES 
(1, 1, 'Primary Checking', 'Checking', 0.00, 'INR'),
(2, 1, 'High-Yield Savings', 'Savings', 0.00, 'INR'),
(3, 1, 'Investment Portfolio', 'Investment', 0.00, 'INR')
ON DUPLICATE KEY UPDATE balance=VALUES(balance);

-- Demo Cards
INSERT INTO cards (id, user_id, card_name, last_four, card_type, credit_limit, available_limit, expiry_month, expiry_year)
VALUES
(1, 1, 'Primary Rewards', '4832', 'Visa', 0.00, 0.00, '08', '2029'),
(2, 1, 'Virtual Shopping Card', '9011', 'Mastercard', 0.00, 0.00, '08', '2029'),
(3, 1, 'Travel Elite Visa', '2744', 'Visa', 0.00, 0.00, '08', '2029')
ON DUPLICATE KEY UPDATE available_limit=VALUES(available_limit);

-- Demo Transactions (All amounts zero)
INSERT INTO transactions (id, user_id, type, title, category, amount, description, transaction_date)
VALUES
(1, 1, 'expense', 'Tech Superstore', 'Electronics', 0.00, 'Card payment - Electronics', '2026-09-04'),
(2, 1, 'expense', 'Car Insurance Premium', 'Insurance', 0.00, 'Autopay executed', '2026-09-02'),
(3, 1, 'income', 'Monthly Salary', 'Salary', 0.00, 'Direct deposit received', '2026-09-01'),
(4, 1, 'expense', 'Organic Grocery Market', 'Groceries', 0.00, 'Card payment', '2026-08-29'),
(5, 1, 'income', 'Freelance Client Payout', 'Freelance', 0.00, 'Transfer received', '2026-08-26'),
(6, 1, 'expense', 'Uber Transport Pass', 'Transport', 0.00, 'Rideshare pass', '2026-08-24'),
(7, 1, 'expense', 'Electric Bill Payment', 'Utilities', 0.00, 'Utility payment complete', '2026-08-21'),
(8, 1, 'expense', 'Spotify Family Subscription', 'Entertainment', 0.00, 'Subscription payment', '2026-08-18'),
(9, 1, 'expense', 'Italian Restaurant & Bistro', 'Dining', 0.00, 'Dinner out', '2026-08-15'),
(10, 1, 'expense', 'High-Speed Internet Bill', 'Utilities', 0.00, 'Autopay completed', '2026-08-12')
ON DUPLICATE KEY UPDATE amount=VALUES(amount);

-- Demo Budgets (All budgets zero)
INSERT INTO budgets (id, user_id, category, amount, spent, month, year)
VALUES
(1, 1, 'Monthly Overall', 0.00, 0.00, 9, 2026),
(2, 1, 'Dining & Food', 0.00, 0.00, 9, 2026),
(3, 1, 'Shopping & Tech', 0.00, 0.00, 9, 2026)
ON DUPLICATE KEY UPDATE amount=VALUES(amount);

-- Demo Goals (All goals zero)
INSERT INTO goals (id, user_id, name, target_amount, current_amount, deadline)
VALUES
(1, 1, 'Emergency Fund', 0.00, 0.00, '2026-12-31'),
(2, 1, 'New Macbook Pro', 0.00, 0.00, '2027-06-30')
ON DUPLICATE KEY UPDATE target_amount=VALUES(target_amount);

-- Demo Payments & Subscriptions (All payments zero)
INSERT INTO payments (id, user_id, title, amount, category, status, payment_date)
VALUES
(1, 1, 'Home Rent', 0.00, 'Housing', 'pending', '2026-09-15'),
(2, 1, 'Health Insurance Premium', 0.00, 'Health', 'pending', '2026-09-18'),
(3, 1, 'Cloud Storage Annual', 0.00, 'Subscriptions', 'pending', '2026-09-22'),
(4, 1, 'Electric Utility Bill', 0.00, 'Utilities', 'pending', '2026-09-28'),
(5, 1, 'Car Loan EMI', 0.00, 'Loans', 'pending', '2026-10-01')
ON DUPLICATE KEY UPDATE amount=VALUES(amount);
