# Spending Analysis Algorithm Explanation

## How the Algorithm Works

### 5 Core Rules

#### **Rule 1: Category Aggregation**
```sql
SELECT category, SUM(amount) as total, COUNT(*) as count
FROM transactions_raw
WHERE user_id = 2003 AND txn_date >= current_month AND txn_type = 'expense'
GROUP BY category
```
- Groups all expenses by category (food, bills, transport, etc.)
- Calculates total spent and transaction count per category
- Only includes expenses (not income)

#### **Rule 2: Time-Based Analysis**
```sql
-- Current month
SELECT SUM(expenses), SUM(income) FROM transactions_raw
WHERE user_id = ? AND txn_date >= current_month_start

-- Monthly average (last 6 months)
SELECT AVG(monthly_total) FROM (
  SELECT SUM(amount) as monthly_total
  FROM transactions_raw
  WHERE txn_type = 'expense'
  GROUP BY MONTH(txn_date)
)
```
- Compares current month vs last month
- Calculates 6-month average
- Tracks month-over-month trends

#### **Rule 3: Pattern Detection**
- **High Frequency**: Categories with >5 transactions/month
- **Unusual Spikes**: Spending >150% of category average
- **Recurring Charges**: Same description appearing in 3+ months

#### **Rule 4: Savings Calculation**
```
Savings = Total Income - Total Expenses
Savings Rate = (Savings / Income) × 100%
```

#### **Rule 5: Alert Generation**
- Overspend alert if current month >120% of average
- Spike alerts for unusual category spending
- Subscription growth warnings

---

## Why You're Seeing Negative/Zero Values

### **Root Cause: User ID Mismatch**

Your database has:
- **User ID 1**: The account you're logged in as (likely has 0 transactions)
- **User ID 2003**: Has 785 expense and 11 income transactions

When you log in and view analytics:
1. Your session stores `user_id: 1`
2. Analytics API queries for `user_id = 1`
3. No transactions found → All values = $0
4. Savings = $0 income - $0 expenses = **$0**

### **Why This Happens**

The `transactions_raw` table was likely populated with sample data using `user_id = 2003`, but your actual login creates a user with a different ID.

---

## Solutions

### **Option 1: Add Transactions to Your Account** (Recommended)
1. Login to your account
2. Go to Transactions page
3. Add some transactions using the form
4. Analytics will update automatically

### **Option 2: Update Existing Transactions**
Update the `user_id` in `transactions_raw` to match your logged-in user:

```sql
-- First, check your actual user ID
SELECT user_id, name, email FROM users;

-- Then update transactions (replace 1 with your actual user_id)
UPDATE transactions_raw 
SET user_id = 1         
WHERE user_id = 2003;
```

### **Option 3: Login as User 2003**
If user 2003 exists in the `users` table, login with those credentials to see the analytics.

---

## Expected Behavior (With Data)

When you have transactions:
- **This Month**: Shows current month total (e.g., $4,230)
- **Monthly Average**: Average of last 6 months (e.g., $4,460)
- **Savings**: Income - Expenses (e.g., $2,610)
- **Overspend Alerts**: Number of categories over budget (e.g., 2)

Charts will show:
- Monthly trend with actual spending per month
- Category pie chart with real breakdown
- Lifestyle patterns based on your behavior

---

## Testing the Fix

After adding transactions or updating user_id:
1. Refresh the Spending Analysis page
2. You should see:
   - Positive values in stat cards
   - Charts with real data
   - Personalized lifestyle patterns
