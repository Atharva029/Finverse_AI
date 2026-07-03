import mysql.connector
from mysql.connector import Error
import json
import pandas as pd
from datetime import datetime
from dateutil.relativedelta import relativedelta
import os
import statistics


class FinancialTools:
    def __init__(self, db_config):
        self.db_config = db_config

    def get_db_connection(self):
        """Create and return a MySQL database connection."""
        try:
            connection = mysql.connector.connect(**self.db_config)
            return connection
        except Error as e:
            print(f"Error connecting to MySQL: {e}")
            return None

    def fetch_recent_transactions(self, user_id, months=24):
        """Fetches transactions from the last 24 months (extended for Gemini context)."""
        conn = self.get_db_connection()
        if not conn:
            return []
        
        try:
            cursor = conn.cursor(dictionary=True)
            three_months_ago = (datetime.now() - relativedelta(months=months)).strftime('%d-%m-%Y %H:%M')
            
            # Using STR_TO_DATE for comparison in SQL
            query = """
                SELECT txn_id, txn_date, description, category, txn_type, amount 
                FROM updated_transactions 
                WHERE user_id = %s 
                  AND STR_TO_DATE(txn_date, '%d-%m-%Y %H:%i') >= STR_TO_DATE(%s, '%d-%m-%Y %H:%i')
                ORDER BY STR_TO_DATE(txn_date, '%d-%m-%Y %H:%i') DESC
            """
            cursor.execute(query, (user_id, three_months_ago))
            transactions = cursor.fetchall()
            return transactions
        except Error as e:
            print(f"Fetch recent transactions error: {e}")
            return []
        finally:
            if conn.is_connected():
                cursor.close()
                conn.close()

    def get_spending_summary(self, user_id):
        """Computes total, category-wise spending, and high-spend alerts."""
        transactions = self.fetch_recent_transactions(user_id)
        if not transactions:
            return {"error": "No transaction data found."}
        
        df = pd.DataFrame(transactions)
        
        # Convert amount to numeric and absolute for analysis
        df['amount'] = pd.to_numeric(df['amount']).abs()
        
        # Add month_year column
        df['month_year'] = df['txn_date'].apply(lambda x: datetime.strptime(x, '%d-%m-%Y %H:%M').strftime('%B %Y'))
        
        # Calculate monthly totals
        monthly_summary = {}
        for month in df['month_year'].unique():
            month_df = df[df['month_year'] == month]
            monthly_spend = month_df[month_df['txn_type'] == 'expense']['amount'].sum()
            monthly_income = month_df[month_df['txn_type'] == 'income']['amount'].sum()
            category_spend = month_df[month_df['txn_type'] == 'expense'].groupby('category')['amount'].sum().to_dict()
            top_category = max(category_spend, key=category_spend.get) if category_spend else "None"
            
            monthly_summary[month] = {
                "total_spend": round(monthly_spend, 2),
                "total_income": round(monthly_income, 2),
                "highest_category": top_category,
                "transaction_count": len(month_df)
            }
            
        # Get overall category breakdown for the whole period
        overall_category_spend = df[df['txn_type'] == 'expense'].groupby('category')['amount'].sum().to_dict()
        top_overall_category = max(overall_category_spend, key=overall_category_spend.get) if overall_category_spend else "None"
        overall_spend = df[df['txn_type'] == 'expense']['amount'].sum()
        overall_income = df[df['txn_type'] == 'income']['amount'].sum()

        return {
            "monthly_breakdown": monthly_summary,
            "overall_summary": {
                "total_spend": round(overall_spend, 2),
                "highest_spending_category": top_overall_category,
                "savings_estimate": round(overall_income - overall_spend, 2)
            }
        }

    def detect_anomalies(self, user_id):
        """Simple anomaly detection based on amount spikes (3x above category mean)."""
        transactions = self.fetch_recent_transactions(user_id)
        if not transactions:
            return []
        
        df = pd.DataFrame(transactions)
        df['amount'] = pd.to_numeric(df['amount']).abs()
        df['txn_date_obj'] = df['txn_date'].apply(lambda x: datetime.strptime(x, '%d-%m-%Y %H:%M'))
        
        # Filter for expenses only
        expense_df = df[df['txn_type'] == 'expense']
        
        anomalies = []
        for category in expense_df['category'].unique():
            cat_df = expense_df[expense_df['category'] == category]
            if len(cat_df) < 5:
                continue
                
            mean = cat_df['amount'].mean()
            # Simple heuristic alert: 3x the average of the category
            potential_anomalies = cat_df[cat_df['amount'] > mean * 3.0]
            
            for _, row in potential_anomalies.iterrows():
                anomalies.append({
                    "date": row['txn_date'],
                    "category": row['category'],
                    "amount": row['amount'],
                    "description": row['description'],
                    "reason": f"300% higher than your average {row['category']} spending."
                })
        
        return anomalies

    def calculate_credit_health(self, user_id):
        """Calculate rule-based credit health score from transaction data."""
        conn = self.get_db_connection()
        if not conn:
            return {"success": False, "message": "Database connection failed."}

        try:
            cursor = conn.cursor(dictionary=True)
            now = datetime.now()
            current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            six_months_ago = current_month_start - relativedelta(months=5)

            # ── FACTOR 1: SAVINGS RATE ──────────────────────────────────────────
            cursor.execute("""
                SELECT
                    SUM(CASE WHEN txn_type = 'income' THEN amount ELSE 0 END) as total_income,
                    SUM(CASE WHEN txn_type = 'expense' THEN ABS(amount) ELSE 0 END) as total_expense
                FROM updated_transactions
                WHERE user_id = %s
                  AND STR_TO_DATE(txn_date, '%d-%m-%Y %H:%i') >= %s
            """, (user_id, six_months_ago))
            totals = cursor.fetchone()
            total_income = float(totals['total_income'] or 0)
            total_expense = float(totals['total_expense'] or 0)

            savings_rate = 0.0
            if total_income > 0:
                savings_rate = ((total_income - total_expense) / total_income) * 100

            if savings_rate >= 40:   savings_score = 200
            elif savings_rate >= 30: savings_score = 160
            elif savings_rate >= 20: savings_score = 120
            elif savings_rate >= 10: savings_score = 80
            elif savings_rate > 0:   savings_score = 40
            else:                    savings_score = 0

            # ── FACTOR 2: INCOME STABILITY ──────────────────────────────────────
            cursor.execute("""
                SELECT COUNT(DISTINCT DATE_FORMAT(STR_TO_DATE(txn_date, '%d-%m-%Y %H:%i'), '%Y-%m')) as months_with_income
                FROM updated_transactions
                WHERE user_id = %s
                  AND txn_type = 'income'
                  AND STR_TO_DATE(txn_date, '%d-%m-%Y %H:%i') >= %s
            """, (user_id, six_months_ago))
            income_months = min(6, cursor.fetchone()['months_with_income'] or 0)

            if income_months >= 5:   stability_score = 200
            elif income_months >= 3: stability_score = 140
            elif income_months >= 1: stability_score = 80
            else:                    stability_score = 0

            # ── FACTOR 3: SPENDING DISCIPLINE ───────────────────────────────────
            essential_categories = ('Rent', 'Utilities', 'Bills & Utilities', 'Healthcare')
            cursor.execute("""
                SELECT category, SUM(ABS(amount)) as total
                FROM updated_transactions
                WHERE user_id = %s
                  AND txn_type = 'expense'
                  AND STR_TO_DATE(txn_date, '%d-%m-%Y %H:%i') >= %s
                GROUP BY category
            """, (user_id, six_months_ago))
            cat_totals = cursor.fetchall()

            essential_spend = sum(float(c['total']) for c in cat_totals if c['category'] in essential_categories)
            all_spend = sum(float(c['total']) for c in cat_totals)
            essential_ratio = (essential_spend / all_spend * 100) if all_spend > 0 else 0

            if essential_ratio >= 50:   discipline_score = 200
            elif essential_ratio >= 30: discipline_score = 160
            elif essential_ratio >= 15: discipline_score = 120
            else:                       discipline_score = 80

            # ── FACTOR 4: SPENDING CONSISTENCY ───────────────────────────────────
            cursor.execute("""
                SELECT DATE_FORMAT(STR_TO_DATE(txn_date, '%d-%m-%Y %H:%i'), '%Y-%m') as month,
                       SUM(ABS(amount)) as monthly_total
                FROM updated_transactions
                WHERE user_id = %s
                  AND txn_type = 'expense'
                  AND STR_TO_DATE(txn_date, '%d-%m-%Y %H:%i') >= %s
                GROUP BY month
            """, (user_id, six_months_ago))
            monthly_expenses = [float(r['monthly_total']) for r in cursor.fetchall()]

            consistency_pct = 0.0
            if len(monthly_expenses) >= 2:
                mean_exp = statistics.mean(monthly_expenses)
                if mean_exp > 0:
                    within_band = sum(
                        1 for m in monthly_expenses
                        if abs(m - mean_exp) / mean_exp <= 0.20
                    )
                    consistency_pct = (within_band / len(monthly_expenses)) * 100
            elif len(monthly_expenses) == 1:
                consistency_pct = 100.0

            if consistency_pct >= 80:   consistency_score = 150
            elif consistency_pct >= 60: consistency_score = 110
            elif consistency_pct >= 40: consistency_score = 70
            else:                       consistency_score = 30

            # ── FACTOR 5: DEBT SIGNALS ──────────────────────────────────────────
            debt_keywords = ['loan', 'emi', 'debt', 'repayment', 'mortgage', 'credit card', 'overdraft']
            debt_conditions = " OR ".join(["LOWER(description) LIKE %s"] * len(debt_keywords))
            debt_params = [f'%{kw}%' for kw in debt_keywords]
            cursor.execute(f"""
                SELECT COUNT(*) as debt_count
                FROM updated_transactions
                WHERE user_id = %s
                  AND ({debt_conditions})
                  AND STR_TO_DATE(txn_date, '%d-%m-%Y %H:%i') >= %s
            """, [user_id] + debt_params + [six_months_ago])
            debt_count = cursor.fetchone()['debt_count'] or 0

            if debt_count == 0:   debt_score = 150
            elif debt_count <= 3: debt_score = 100
            else:                 debt_score = 50

            # ── TOTAL SCORE ─────────────────────────────────────────────────────
            total_score = savings_score + stability_score + discipline_score + consistency_score + debt_score

            if total_score >= 800:   rating, rating_cls = 'Excellent', 'excellent'
            elif total_score >= 650: rating, rating_cls = 'Good', 'good'
            elif total_score >= 500: rating, rating_cls = 'Fair', 'fair'
            else:                    rating, rating_cls = 'Poor', 'poor'

            # Build list of factors for the AI and frontend
            factors = [
                {
                    "title": "Savings Rate",
                    "value": f"{savings_rate:.1f}%",
                    "pct": min(100, max(0, int(savings_rate * 2.5))),
                    "score": savings_score,
                    "max": 200,
                    "color": "var(--accent)" if savings_rate >= 20 else "var(--warning)"
                },
                {
                    "title": "Income Stability",
                    "value": f"{income_months}/6 months",
                    "pct": int((income_months / 6) * 100),
                    "score": stability_score,
                    "max": 200,
                    "color": "var(--success)" if income_months >= 5 else "var(--warning)"
                },
                {
                    "title": "Spending Discipline",
                    "value": f"{essential_ratio:.1f}% essential",
                    "pct": min(100, int(essential_ratio * 2)),
                    "score": discipline_score,
                    "max": 200,
                    "color": "var(--info)" if essential_ratio >= 30 else "var(--warning)"
                },
                {
                    "title": "Spending Consistency",
                    "value": f"{consistency_pct:.0f}% consistent",
                    "pct": int(consistency_pct),
                    "score": consistency_score,
                    "max": 150,
                    "color": "var(--success)" if consistency_pct >= 80 else ("var(--accent)" if consistency_pct >= 60 else ("var(--warning)" if consistency_pct >= 40 else "var(--danger)"))
                },
                {
                    "title": "Debt Signals",
                    "value": "None" if debt_count == 0 else f"{debt_count} detected",
                    "pct": 100 if debt_count == 0 else (70 if debt_count <= 3 else 30),
                    "score": debt_score,
                    "max": 150,
                    "color": "var(--accent)" if debt_count == 0 else ("var(--success)" if debt_count <= 3 else "var(--warning)")
                }
            ]

            # ── RISK INDICATORS ─────────────────────────────────────────────────
            risk_indicators = []

            # Income stability indicator
            if income_months >= 5:
                risk_indicators.append({'label': 'Income Stability', 'status': 'High', 'color': 'var(--success)',
                    'desc': f'Income detected in {income_months} of the last 6 months. Excellent consistency.'})
            elif income_months >= 3:
                risk_indicators.append({'label': 'Income Stability', 'status': 'Moderate', 'color': 'var(--warning)',
                    'desc': f'Income detected in only {income_months} of the last 6 months. Aim for consistent monthly income.'})
            else:
                risk_indicators.append({'label': 'Income Stability', 'status': 'Low', 'color': 'var(--danger)',
                    'desc': 'Irregular or missing income detected. This significantly impacts your credit health.'})

            # Spending consistency indicator
            if consistency_pct >= 80:
                risk_indicators.append({'label': 'Spending Consistency', 'status': 'Excellent', 'color': 'var(--success)',
                    'desc': f'{consistency_pct:.0f}% of your months stayed within ±20% of your average spending. Very predictable and financially healthy.'})
            elif consistency_pct >= 60:
                risk_indicators.append({'label': 'Spending Consistency', 'status': 'Good', 'color': 'var(--accent)',
                    'desc': f'{consistency_pct:.0f}% of your months were within ±20% of average. Some variation is normal — keep improving consistency.'})
            elif consistency_pct >= 40:
                risk_indicators.append({'label': 'Spending Consistency', 'status': 'Fair', 'color': 'var(--warning)',
                    'desc': f'Only {consistency_pct:.0f}% of months fell within ±20% of average. Look for months with large spikes and identify the cause.'})
            else:
                risk_indicators.append({'label': 'Spending Consistency', 'status': 'Poor', 'color': 'var(--danger)',
                    'desc': f'Only {consistency_pct:.0f}% of months were near your average. Highly erratic spending signals financial instability.'})

            # Debt signals indicator
            if debt_count == 0:
                risk_indicators.append({'label': 'Debt Signals', 'status': 'None', 'color': 'var(--accent)',
                    'desc': 'No loan or debt-related transactions detected. Very positive for your credit health.'})
            elif debt_count <= 3:
                risk_indicators.append({'label': 'Debt Signals', 'status': 'Low', 'color': 'var(--success)',
                    'desc': f'{debt_count} debt-related transaction(s) found. Manageable level.'})
            else:
                risk_indicators.append({'label': 'Debt Signals', 'status': 'Elevated', 'color': 'var(--warning)',
                    'desc': f'{debt_count} debt-related transactions found. Consider reducing outstanding obligations.'})

            # Savings rate indicator
            if savings_rate >= 20:
                risk_indicators.append({'label': 'Savings Rate', 'status': 'Healthy', 'color': 'var(--success)',
                    'desc': f'Savings rate of {savings_rate:.1f}% is above the recommended 20% threshold.'})
            elif savings_rate > 0:
                risk_indicators.append({'label': 'Savings Rate', 'status': 'Low', 'color': 'var(--warning)',
                    'desc': f'Savings rate of {savings_rate:.1f}% is below the recommended 20%. Try to reduce discretionary spending.'})
            else:
                risk_indicators.append({'label': 'Savings Rate', 'status': 'Negative', 'color': 'var(--danger)',
                    'desc': 'Expenses exceed income. Immediate budget review recommended.'})

            # Spending discipline indicator
            if essential_ratio >= 30:
                risk_indicators.append({'label': 'Spending Discipline', 'status': 'Good', 'color': 'var(--success)',
                    'desc': f'{essential_ratio:.1f}% of spending goes to essential categories. Well-balanced budget.'})
            else:
                risk_indicators.append({'label': 'Spending Discipline', 'status': 'Review', 'color': 'var(--warning)',
                    'desc': f'Only {essential_ratio:.1f}% of spending is on essentials. Consider reducing discretionary expenses.'})

            # ── SCORE TREND (Rolling 6-month aggregate for each month) ──────────
            # To get a 12-month trend, we need 17 months of data (12 + 5 for the window)
            seventeen_months_ago = current_month_start - relativedelta(months=16)
            cursor.execute("""
                SELECT
                    DATE_FORMAT(STR_TO_DATE(txn_date, '%d-%m-%Y %H:%i'), '%Y-%m') as month,
                    SUM(CASE WHEN txn_type = 'income' THEN amount ELSE 0 END) as income,
                    SUM(CASE WHEN txn_type = 'expense' THEN ABS(amount) ELSE 0 END) as expense,
                    SUM(CASE WHEN txn_type = 'expense' AND category IN ('Rent', 'Utilities', 'Bills & Utilities', 'Healthcare') THEN ABS(amount) ELSE 0 END) as essential_expense,
                    SUM(CASE WHEN LOWER(description) LIKE '%loan%' OR LOWER(description) LIKE '%emi%' OR LOWER(description) LIKE '%debt%' OR LOWER(description) LIKE '%repayment%' OR LOWER(description) LIKE '%mortgage%' OR LOWER(description) LIKE '%credit card%' OR LOWER(description) LIKE '%overdraft%' THEN 1 ELSE 0 END) as debt_count
                FROM updated_transactions
                WHERE user_id = %s
                  AND STR_TO_DATE(txn_date, '%d-%m-%Y %H:%i') >= %s
                GROUP BY month
                ORDER BY month ASC
            """, (user_id, seventeen_months_ago))
            all_monthly_data = cursor.fetchall()

            # Map to dictionary for easy access
            month_map = {m['month']: m for m in all_monthly_data}
            
            # Generate the last 12 months (up to current)
            trend_months = []
            for i in range(11, -1, -1):
                m_date = current_month_start - relativedelta(months=i)
                trend_months.append(m_date.strftime('%Y-%m'))

            trend = []
            for target_month in trend_months:
                # Calculate rolling 6-month window ending in target_month
                target_dt = datetime.strptime(target_month, '%Y-%m')
                window_months = []
                for j in range(5, -1, -1):
                    w_dt = target_dt - relativedelta(months=j)
                    window_months.append(w_dt.strftime('%Y-%m'))
                
                # Aggregate window data
                w_income = 0.0
                w_expense = 0.0
                w_essential = 0.0
                w_debt = 0
                w_income_months_count = 0
                w_monthly_expenses = []

                for wm in window_months:
                    m_data = month_map.get(wm, {'income': 0, 'expense': 0, 'essential_expense': 0, 'debt_count': 0})
                    inc = float(m_data['income'] or 0)
                    exp = float(m_data['expense'] or 0)
                    ess = float(m_data['essential_expense'] or 0)
                    dbt = int(m_data['debt_count'] or 0)

                    w_income += inc
                    w_expense += exp
                    w_essential += ess
                    w_debt += dbt
                    if inc > 0:
                        w_income_months_count += 1
                    w_monthly_expenses.append(exp)

                # 1. Savings Rate
                w_sr = ((w_income - w_expense) / w_income * 100) if w_income > 0 else 0
                if w_sr >= 40:   s1 = 200
                elif w_sr >= 30: s1 = 160
                elif w_sr >= 20: s1 = 120
                elif w_sr >= 10: s1 = 80
                elif w_sr > 0:   s1 = 40
                else:            s1 = 0

                # 2. Income Stability
                w_inc_months = min(6, w_income_months_count)
                if w_inc_months >= 5:   s2 = 200
                elif w_inc_months >= 3: s2 = 140
                elif w_inc_months >= 1: s2 = 80
                else:                   s2 = 0

                # 3. Discipline
                w_ess_ratio = (w_essential / w_expense * 100) if w_expense > 0 else 0
                if w_ess_ratio >= 50:   s3 = 200
                elif w_ess_ratio >= 30: s3 = 160
                elif w_ess_ratio >= 15: s3 = 120
                else:                   s3 = 80

                # 4. Consistency
                w_consistency_pct = 0.0
                valid_exp = [e for e in w_monthly_expenses if e > 0]
                if len(valid_exp) >= 2:
                    mean_exp = statistics.mean(valid_exp)
                    within_band = sum(1 for e in valid_exp if abs(e - mean_exp) / mean_exp <= 0.20)
                    w_consistency_pct = (within_band / len(valid_exp)) * 100
                elif len(valid_exp) == 1:
                    w_consistency_pct = 100.0

                if w_consistency_pct >= 80:   s4 = 150
                elif w_consistency_pct >= 60: s4 = 110
                elif w_consistency_pct >= 40: s4 = 70
                else:                         s4 = 30

                # 5. Debt Signals
                if w_debt == 0:   s5 = 150
                elif w_debt <= 3: s5 = 100
                else:             s5 = 50

                trend.append({'month': target_month, 'score': s1 + s2 + s3 + s4 + s5})

            return {
                "success": True,
                "score": total_score,
                "rating": rating,
                "rating_cls": rating_cls,
                "factors": factors,
                "risk_indicators": risk_indicators,
                "trend": trend,
                "meta": {
                    "savings_rate": round(savings_rate, 2),
                    "income_months": income_months,
                    "essential_ratio": round(essential_ratio, 2),
                    "consistency_pct": round(consistency_pct, 1),
                    "debt_count": debt_count
                }
            }

        except Error as e:
            print(f"Credit health calculation error: {e}")
            return {"success": False, "message": str(e)}
        finally:
            if conn.is_connected():
                cursor.close()
                conn.close()

    def add_transaction(self, user_id, date, description, category, amount, txn_type):
        """Add a single transaction to the database."""
        conn = self.get_db_connection()
        if not conn:
            return {"success": False, "message": "Database connection failed."}
        
        try:
            cursor = conn.cursor()
            # Format date to DD-MM-YYYY HH:MM for updated_transactions table
            # date comes as YYYY-MM-DD from LLM or frontend
            try:
                dt_obj = datetime.strptime(date, '%Y-%m-%d')
                formatted_date = dt_obj.strftime('%d-%m-%Y %H:%M')
            except ValueError:
                formatted_date = date # Assume already formatted or handled

            # Handle amount sign
            final_amount = abs(float(amount))
            if txn_type == 'expense':
                final_amount = -final_amount

            cursor.execute(
                """INSERT INTO updated_transactions 
                   (user_id, txn_date, description, category, txn_type, amount, created_at) 
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (user_id, formatted_date, description, category, txn_type, final_amount, datetime.now().strftime('%d-%m-%Y %H:%M'))
            )
            conn.commit()
            return {"success": True, "message": "Transaction added successfully!", "txn_id": cursor.lastrowid}
        except Error as e:
            print(f"Add transaction error: {e}")
            return {"success": False, "message": str(e)}
        finally:
            if conn.is_connected():
                cursor.close()
                conn.close()

    def load_financial_news(self):
        """Loads curated financial news from news_cache.json."""
        try:
            # Look for the file in the current directory
            file_path = 'news_cache.json'
            if os.path.exists(file_path):
                with open(file_path, 'r') as f:
                    return json.load(f)
            return []
        except Exception as e:
            print(f"Error loading news cache: {e}")
            return []

    def load_forecast(self):
        """Loads XGBoost forecast data from finverse_xgboost_output.json."""
        try:
            # Match the logic in server.py to find the correct file
            # Check parent directory first, then current
            basedir = os.path.abspath(os.path.dirname(__file__))
            file_path = os.path.join(os.path.dirname(basedir), 'finverse_xgboost_output.json')
            
            if not os.path.exists(file_path):
                file_path = os.path.join(basedir, 'finverse_xgboost_output.json')

            if os.path.exists(file_path):
                with open(file_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            return None
        except Exception as e:
            print(f"Error loading forecast data: {e}")
            return None
