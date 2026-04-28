# How the Spending Analysis Algorithm Calculates Values

## Understanding the Calculations

### Current Setup Issue

**Your logged-in user has 0 transactions** → All calculations return $0

Let me show you EXACTLY how each value is calculated:

---

## 📊 Calculation Breakdown

### 1. **This Month** (Current Month Total)

```sql
SELECT SUM(CASE WHEN txn_type = 'expense' THEN amount ELSE 0 END) as expenses
FROM transactions_raw
WHERE user_id = YOUR_ID AND txn_date >= '2026-02-01'
```

**What it does:**
- Looks at ALL transactions since February 1, 2026
- Sums up only the `expense` type transactions
- Ignores `income` transactions

**Example with data:**
```
Feb 5: Groceries - $150 (expense)
Feb 10: Salary - $3000 (income) ← ignored
Feb 15: Gas - $50 (expense)
Feb 20: Dinner - $80 (expense)
────────────────────────────────
This Month = $150 + $50 + $80 = $280
```

**Your result:** $0 (because you have 0 expense transactions in Feb 2026)

---

### 2. **Monthly Average** (Last 6 Months)

```sql
SELECT AVG(monthly_total) as avg_spending
FROM (
    SELECT DATE_FORMAT(txn_date, '%Y-%m') as month, 
           SUM(amount) as monthly_total
    FROM transactions_raw
    WHERE user_id = YOUR_ID 
      AND txn_date >= '2025-08-18'  -- 6 months ago
      AND txn_type = 'expense'
    GROUP BY DATE_FORMAT(txn_date, '%Y-%m')
) as monthly_totals
```

**What it does:**
1. Groups transactions by month (e.g., "2025-09", "2025-10")
2. Sums expenses for each month
3. Calculates the average of those monthly totals

**Example with data:**
```
Sep 2025: $4,200
Oct 2025: $3,800
Nov 2025: $4,100
Dec 2025: $4,500
Jan 2026: $4,300
Feb 2026: $4,400
────────────────────────────────
Average = (4200 + 3800 + 4100 + 4500 + 4300 + 4400) / 6 = $4,217
```

**Your result:** $0 or negative (because there are no months with expenses to average)

**Why negative?** If you have ONLY income transactions (no expenses), the calculation might show negative values because:
- Some months might have $0 expenses
- The database might return NULL which gets treated as 0
- If there are NO expense transactions at all, AVG() returns NULL → displayed as $0

---

### 3. **Savings This Month**

```sql
-- Step 1: Get income and expenses
SELECT 
    SUM(CASE WHEN txn_type = 'expense' THEN amount ELSE 0 END) as expenses,
    SUM(CASE WHEN txn_type = 'income' THEN amount ELSE 0 END) as income
FROM transactions_raw
WHERE user_id = YOUR_ID AND txn_date >= '2026-02-01'

-- Step 2: Calculate savings
Savings = Income - Expenses
```

**What it does:**
- Sums all income for current month
- Sums all expenses for current month
- Subtracts expenses from income

**Example with data:**
```
Income:
  Feb 1: Salary - $5,000
  Feb 15: Freelance - $800
  Total Income = $5,800

Expenses:
  Feb 5: Rent - $1,500
  Feb 10: Groceries - $400
  Feb 20: Gas - $100
  Total Expenses = $2,000

────────────────────────────────
Savings = $5,800 - $2,000 = $3,800
Savings Rate = ($3,800 / $5,800) × 100 = 65.5%
```

**Your result:** $0 (because Income = $0 and Expenses = $0)
```
Savings = $0 - $0 = $0
```

---

### 4. **Overspend Alerts**

```python
# Check if current month > 120% of average
if current_expenses > monthly_average * 1.2:
    overspend_count += 1
    
# Check for category spikes (>150% of average)
if category_current > category_average * 1.5:
    overspend_count += 1
```

**What it does:**
- Compares current month to average
- Flags if you're spending >20% more than usual
- Checks each category for unusual spikes

**Example with data:**
```
Monthly Average: $4,000
Current Month: $5,000

Is $5,000 > ($4,000 × 1.2)?
Is $5,000 > $4,800?
YES → Overspend Alert = 1

Food Category:
  Average: $500
  Current: $800
  
Is $800 > ($500 × 1.5)?
Is $800 > $750?
YES → Overspend Alert = 2 (total)
```

**Your result:** 0 (no data to compare)

---

## 🔍 Why You're Seeing These Values

| Metric | Your Value | Reason |
|--------|-----------|---------|
| This Month | $0 | No expense transactions in Feb 2026 |
| Monthly Average | $0 or negative | No expense transactions in last 6 months |
| Savings | $0 | No income or expenses ($0 - $0 = $0) |
| Alerts | 0 | No data to trigger alerts |

---

## ✅ How to Fix This

### Option 1: Add Transactions Manually
1. Go to **Transactions** page
2. Add some transactions:
   - Income: Salary, $5000, Feb 1
   - Expense: Rent, $1500, Feb 5
   - Expense: Groceries, $300, Feb 10
3. Refresh **Spending Analysis** page

### Option 2: Transfer Existing Data
Run this SQL to move transactions from user 2003 to your account:

```sql
-- Check your user ID first
SELECT user_id, email FROM users;

-- Update transactions (replace 1 with YOUR user_id)
UPDATE transactions_raw 
SET user_id = 1 
WHERE user_id = 2003;
```

After either fix, you'll see:
- ✅ This Month: Actual expense total
- ✅ Monthly Average: Real 6-month average
- ✅ Savings: Income - Expenses
- ✅ Alerts: Based on your spending patterns

---

## 🧪 Test the Calculation

Run `verify_analytics.py` to see the step-by-step calculation for your user ID!
