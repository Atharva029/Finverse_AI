"""
FINVERSE - Flask Backend Server
Connects to MySQL database for user authentication (login/register).
Serves the static frontend files.
"""

import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
import mysql.connector
from mysql.connector import Error
import bcrypt
from rag_agent import FinverseRAGAgent
from tools import FinancialTools


# Load environment variables
import os
basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(basedir, '.env'))

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

# ─── MySQL Connection ────────────────────────────────────────────────────────

def get_db_connection():
    """Create and return a MySQL database connection."""
    try:
        connection = mysql.connector.connect(
            host='localhost',
            port=3306,
            user='root',
            password='Mysql#@22',
            database='finverse_ai'
        )
        return connection
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None

# Database Config for RAG Agent
db_config = {
    'host': 'localhost',
    'port': 3306,
    'user': 'root',
    'password': 'Mysql#@22',
    'database': 'finverse_ai'
}

# Initialize RAG Agent and Tools
rag_agent = FinverseRAGAgent(db_config)
financial_tools = FinancialTools(db_config)


# ─── Test DB Connection on Startup ───────────────────────────────────────────

def test_db_connection():
    """Verify database connectivity on startup."""
    conn = get_db_connection()
    if conn and conn.is_connected():
        print(f"Connected to MySQL database: {os.getenv('DB_NAME', 'finverse_ai')}")
        conn.close()
    else:
        print("Failed to connect to MySQL. Check your .env credentials.")

def get_user_monthly_savings(user_id):
    """Calculate savings for the current (or most recent active) month."""
    conn = get_db_connection()
    if not conn:
        return 0
    try:
        cursor = conn.cursor(dictionary=True)
        from datetime import datetime
        from dateutil.relativedelta import relativedelta
        now = datetime.now()
        current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Find latest active month if current month has no data
        cursor.execute("SELECT COUNT(*) as count FROM updated_transactions WHERE user_id = %s AND STR_TO_DATE(txn_date, '%d-%m-%Y %H:%i') >= %s", (user_id, current_month_start))
        if cursor.fetchone()['count'] == 0:
            cursor.execute("SELECT STR_TO_DATE(txn_date, '%d-%m-%Y %H:%i') as latest FROM updated_transactions WHERE user_id = %s ORDER BY latest DESC LIMIT 1", (user_id,))
            latest = cursor.fetchone()
            if latest and latest['latest']:
                current_month_start = latest['latest'].replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        cursor.execute("""
            SELECT SUM(CASE WHEN txn_type = 'income' THEN amount ELSE 0 END) - 
                   SUM(CASE WHEN txn_type = 'expense' THEN ABS(amount) ELSE 0 END) as savings
            FROM updated_transactions
            WHERE user_id = %s 
              AND STR_TO_DATE(txn_date, '%d-%m-%Y %H:%i') >= %s
              AND STR_TO_DATE(txn_date, '%d-%m-%Y %H:%i') < %s
        """, (user_id, current_month_start, current_month_start + relativedelta(months=1)))

        res = cursor.fetchone()
        return float(res['savings'] or 0)
    except Exception as e:
        print(f"Error calculating savings for user {user_id}: {e}")
        return 0
    finally:
        conn.close()

# ─── Static File Serving ─────────────────────────────────────────────────────

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/app.html')
def serve_app():
    return send_from_directory('.', 'app.html')

# ─── Auth API Routes ─────────────────────────────────────────────────────────

@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new user."""
    data = request.get_json()

    # Validate input
    name = data.get('name', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '').strip()

    if not name or not email or not password:
        return jsonify({'success': False, 'message': 'All fields are required.'}), 400

    if len(password) < 6:
        return jsonify({'success': False, 'message': 'Password must be at least 6 characters.'}), 400

    # Hash the password
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection failed.'}), 500

    try:
        cursor = conn.cursor()

        # Check if email already exists
        cursor.execute("SELECT user_id FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            return jsonify({'success': False, 'message': 'Email is already registered.'}), 409

        # Insert new user
        cursor.execute(
            "INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s)",
            (name, email, password_hash)
        )
        conn.commit()

        return jsonify({
            'success': True,
            'message': 'Account created successfully! You can now sign in.'
        }), 201

    except Error as e:
        print(f"Registration error: {e}")
        return jsonify({'success': False, 'message': 'Registration failed. Please try again.'}), 500
    finally:
        if conn.is_connected():
            if 'cursor' in dir() and cursor:
                cursor.close()
            conn.close()


@app.route('/api/auth/login', methods=['POST'])
def login():
    """Authenticate a user."""
    data = request.get_json()

    email = data.get('email', '').strip()
    password = data.get('password', '').strip()

    if not email or not password:
        return jsonify({'success': False, 'message': 'Email and password are required.'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection failed.'}), 500

    try:
        cursor = conn.cursor(dictionary=True)

        # Find user by email
        cursor.execute("SELECT user_id, name, email, password_hash FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()

        if not user:
            return jsonify({'success': False, 'message': 'Invalid email or password.'}), 401

        # Verify password
        if not bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
            return jsonify({'success': False, 'message': 'Invalid email or password.'}), 401

        return jsonify({
            'success': True,
            'message': 'Login successful!',
            'user': {
                'id': user['user_id'],
                'name': user['name'],
                                'email': user['email']
            }
        }), 200

    except Error as e:
        print(f"Login error: {e}")
        return jsonify({'success': False, 'message': 'Login failed. Please try again.'}), 500
    finally:
        if conn.is_connected():
            if 'cursor' in dir() and cursor:
                cursor.close()
            conn.close()


# ─── Transaction API Routes ─────────────────────────────────────────────────

@app.route('/api/transactions', methods=['POST'])
def add_transaction():
    """Add a new transaction for the logged-in user."""
    data = request.get_json()
    
    # Validate input
    user_id = data.get('user_id')
    txn_date = data.get('date')  # Format: YYYY-MM-DD
    description = data.get('description', '').strip()
    category = data.get('category', '').strip()
    amount = float(data.get('amount'))
    txn_type = data.get('type', '').strip()  # 'income' or 'expense'
    
    if not all([user_id, txn_date, description, category, amount, txn_type]):
        return jsonify({'success': False, 'message': 'All fields are required.'}), 400
    
    if txn_type not in ['income', 'expense']:
        return jsonify({'success': False, 'message': 'Type must be income or expense.'}), 400
    
    # Handle amount sign (expense negative, income positive)
    final_amount = abs(amount)
    if txn_type == 'expense':
        final_amount = -final_amount
    else:
        final_amount = abs(amount)

    # Format date to DD-MM-YYYY HH:MM for updated_transactions table
    from datetime import datetime
    try:
        # txn_date comes as YYYY-MM-DD from frontend input type="date"
        date_obj = datetime.strptime(txn_date, '%Y-%m-%d')
        # Add current time to make it consistent
        current_time = datetime.now().strftime('%H:%M')
        formatted_date = date_obj.strftime(f'%d-%m-%Y {current_time}')
    except ValueError:
        return jsonify({'success': False, 'message': 'Invalid date format.'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection failed.'}), 500
    
    try:
        cursor = conn.cursor()
        
        # Insert transaction into updated_transactions
        cursor.execute(
            """INSERT INTO updated_transactions 
               (user_id, txn_date, description, category, txn_type, amount, created_at) 
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (user_id, formatted_date, description, category, txn_type, final_amount, datetime.now().strftime('%d-%m-%Y %H:%M'))
        )
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'Transaction added successfully!',
            'transaction_id': cursor.lastrowid
        }), 201
        
    except Error as e:
        print(f"Add transaction error: {e}")
        return jsonify({'success': False, 'message': 'Failed to add transaction.'}), 500
    finally:
        if conn.is_connected():
            if 'cursor' in dir() and cursor:
                cursor.close()
            conn.close()


@app.route('/api/transactions/bulk', methods=['POST'])
def add_transactions_bulk():
    """Add multiple transactions for the logged-in user (e.g., from CSV)."""
    data = request.get_json()
    user_id = data.get('user_id')
    txns = data.get('transactions', [])
    
    if not user_id or not txns:
        return jsonify({'success': False, 'message': 'User ID and transactions list are required.'}), 400
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection failed.'}), 500
    
    try:
        cursor = conn.cursor()
        from datetime import datetime
        
        count = 0
        for txn in txns:
            txn_date = txn.get('date')
            description = txn.get('description', '').strip()
            category = txn.get('category', 'other').strip()
            amount = float(txn.get('amount', 0))
            txn_type = txn.get('type', 'expense').strip()
            
            # Handle amount sign
            final_amount = abs(amount)
            if txn_type == 'expense':
                final_amount = -final_amount
            
            # Format date
            try:
                date_obj = datetime.strptime(txn_date, '%Y-%m-%d')
                formatted_date = date_obj.strftime('%d-%m-%Y 00:00')
            except:
                formatted_date = txn_date # Fallback
            
            cursor.execute(
                """INSERT INTO updated_transactions 
                   (user_id, txn_date, description, category, txn_type, amount, created_at) 
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (user_id, formatted_date, description, category, txn_type, final_amount, datetime.now().strftime('%d-%m-%Y %H:%M'))
            )
            count += 1
            
        conn.commit()
        return jsonify({
            'success': True,
            'message': f'Successfully imported {count} transactions.',
            'count': count
        }), 201
        
    except Exception as e:
        print(f"Bulk import error: {e}")
        return jsonify({'success': False, 'message': f'Failed to import transactions: {str(e)}'}), 500
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()



@app.route('/api/transactions', methods=['GET'])
def get_transactions():
    """Get all transactions for a specific user."""
    user_id = request.args.get('user_id')
    
    if not user_id:
        return jsonify({'success': False, 'message': 'User ID is required.'}), 400
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection failed.'}), 500
    
    try:
        cursor = conn.cursor(dictionary=True)
        
        # Fetch all transactions from updated_transactions
        # Parse text date for proper sorting
        cursor.execute(
            """SELECT txn_id, txn_date, description, category, txn_type, amount, created_at
               FROM updated_transactions
               WHERE user_id = %s 
               ORDER BY STR_TO_DATE(txn_date, '%d-%m-%Y %H:%i') DESC, 
                        STR_TO_DATE(created_at, '%d-%m-%Y %H:%i') DESC""",
            (user_id,)
        )
        transactions = cursor.fetchall()
        
        # Format for frontend
        for txn in transactions:
            # Date is already DD-MM-YYYY HH:MM string, but frontend pages.js expects YYYY-MM-DD
            # We need to convert it standard YYYY-MM-DD for consistency
            if txn['txn_date']:
                try:
                    from datetime import datetime
                    dt = datetime.strptime(txn['txn_date'], '%d-%m-%Y %H:%M')
                    txn['txn_date'] = dt.strftime('%Y-%m-%d')
                except:
                    pass # Keep original if parse fails
            
            # Ensure amount is positive for display (frontend handles +/- based on type)
            if txn['amount']:
                txn['amount'] = abs(float(txn['amount']))
        
        return jsonify({
            'success': True,
            'transactions': transactions,
            'count': len(transactions)
        }), 200
        
    except Error as e:
        print(f"Get transactions error: {e}")
        return jsonify({'success': False, 'message': 'Failed to fetch transactions.'}), 500
    finally:
        if conn.is_connected():
            if 'cursor' in dir() and cursor:
                cursor.close()
            conn.close()


# ─── Analytics API Routes ────────────────────────────────────────────────────

@app.route('/api/analytics/spending', methods=['GET'])
def get_spending_analytics():
    """Get comprehensive spending analytics for a user."""
    user_id = request.args.get('user_id')
    
    if not user_id:
        return jsonify({'success': False, 'message': 'User ID is required.'}), 400
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection failed.'}), 500
    
    try:
        cursor = conn.cursor(dictionary=True)
        
        # Get current date info
        from datetime import datetime
        from dateutil.relativedelta import relativedelta
        now = datetime.now()
        current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Check if we have data for the current month
        cursor.execute("""
            SELECT COUNT(*) as count 
            FROM updated_transactions 
            WHERE user_id = %s AND STR_TO_DATE(txn_date, '%d-%m-%Y %H:%i') >= %s
        """, (user_id, current_month_start))
        has_current_data = cursor.fetchone()['count'] > 0
        
        # If no data this month, find the LATEST month that HAS data to show insights
        if not has_current_data:
            cursor.execute("""
                SELECT STR_TO_DATE(txn_date, '%d-%m-%Y %H:%i') as latest_date
                FROM updated_transactions
                WHERE user_id = %s
                ORDER BY latest_date DESC
                LIMIT 1
            """, (user_id,))
            latest = cursor.fetchone()
            if latest and latest['latest_date']:
                current_month_start = latest['latest_date'].replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        last_month_start = current_month_start - relativedelta(months=1)
        six_months_ago = current_month_start - relativedelta(months=5)
        
        # ═══ RULE 1: CATEGORY AGGREGATION ═══
        cursor.execute("""
            SELECT category, SUM(ABS(amount)) as total, COUNT(*) as count
            FROM updated_transactions
            WHERE user_id = %s 
              AND STR_TO_DATE(txn_date, '%d-%m-%Y %H:%i') >= %s 
              AND STR_TO_DATE(txn_date, '%d-%m-%Y %H:%i') < %s
              AND txn_type = 'expense'
            GROUP BY category
        """, (user_id, current_month_start, current_month_start + relativedelta(months=1)))
        current_categories = cursor.fetchall()
        
        # ═══ RULE 2: TIME-BASED ANALYSIS ═══
        # Current month total (respects the detected active month)
        cursor.execute("""
            SELECT 
                SUM(CASE WHEN txn_type = 'expense' THEN ABS(amount) ELSE 0 END) as expenses,
                SUM(CASE WHEN txn_type = 'income' THEN amount ELSE 0 END) as income
            FROM updated_transactions
            WHERE user_id = %s 
              AND STR_TO_DATE(txn_date, '%d-%m-%Y %H:%i') >= %s
              AND STR_TO_DATE(txn_date, '%d-%m-%Y %H:%i') < %s
        """, (user_id, current_month_start, current_month_start + relativedelta(months=1)))
        current_month = cursor.fetchone()
        
        # Last month total for comparison
        cursor.execute("""
            SELECT SUM(ABS(amount)) as total
            FROM updated_transactions
            WHERE user_id = %s 
              AND STR_TO_DATE(txn_date, '%d-%m-%Y %H:%i') >= %s 
              AND STR_TO_DATE(txn_date, '%d-%m-%Y %H:%i') < %s 
              AND txn_type = 'expense'
        """, (user_id, last_month_start, current_month_start))
        last_month = cursor.fetchone()
        
        # Monthly averages (last 6 months)
        cursor.execute("""
            SELECT AVG(monthly_total) as avg_spending
            FROM (
                SELECT DATE_FORMAT(STR_TO_DATE(txn_date, '%d-%m-%Y %H:%i'), '%Y-%m') as month, 
                       SUM(ABS(amount)) as monthly_total
                FROM updated_transactions
                WHERE user_id = %s 
                  AND STR_TO_DATE(txn_date, '%d-%m-%Y %H:%i') >= %s 
                  AND txn_type = 'expense'
                GROUP BY month
            ) as monthly_totals
        """, (user_id, six_months_ago))
        avg_result = cursor.fetchone()
        
        # Monthly trend (last 6 months)
        cursor.execute("""
            SELECT 
                DATE_FORMAT(STR_TO_DATE(txn_date, '%d-%m-%Y %H:%i'), '%Y-%m') as month,
                SUM(CASE WHEN txn_type = 'expense' THEN ABS(amount) ELSE 0 END) as expenses,
                SUM(CASE WHEN txn_type = 'income' THEN amount ELSE 0 END) as income
            FROM updated_transactions
            WHERE user_id = %s AND STR_TO_DATE(txn_date, '%d-%m-%Y %H:%i') >= %s
            GROUP BY month
            ORDER BY month ASC
        """, (user_id, six_months_ago))
        monthly_trend = cursor.fetchall()
        
        # ═══ RULE 3: PATTERN DETECTION ═══
        # High-frequency categories (>5 transactions in current month)
        high_freq_categories = [cat for cat in current_categories if cat['count'] > 5]
        
        # Detect unusual spikes (>150% of category average)
        unusual_spikes = []
        for cat in current_categories:
            cursor.execute("""
                SELECT AVG(monthly_total) as avg_amount
                FROM (
                    SELECT SUM(ABS(amount)) as monthly_total
                    FROM updated_transactions
                    WHERE user_id = %s 
                      AND category = %s 
                      AND txn_type = 'expense'
                      AND STR_TO_DATE(txn_date, '%d-%m-%Y %H:%i') >= %s
                    GROUP BY DATE_FORMAT(STR_TO_DATE(txn_date, '%d-%m-%Y %H:%i'), '%Y-%m')
                ) as cat_monthly
            """, (user_id, cat['category'], six_months_ago))
            avg = cursor.fetchone()
            if avg and avg['avg_amount'] and cat['total'] > avg['avg_amount'] * 1.5:
                # Calculate percentage correctly
                avg_val = float(avg['avg_amount'])
                cat_total = float(cat['total'])
                increase_pct = ((cat_total - avg_val) / avg_val * 100) if avg_val > 0 else 0
                
                unusual_spikes.append({
                    'category': cat['category'],
                    'current': cat['total'],
                    'average': avg['avg_amount'],
                    'increase_percent': increase_pct
                })
        
        # Detect recurring charges (same description appearing monthly)
        cursor.execute("""
            SELECT description, 
                   COUNT(DISTINCT DATE_FORMAT(STR_TO_DATE(txn_date, '%d-%m-%Y %H:%i'), '%Y-%m')) as month_count, 
                   AVG(ABS(amount)) as avg_amount
            FROM updated_transactions
            WHERE user_id = %s 
              AND STR_TO_DATE(txn_date, '%d-%m-%Y %H:%i') >= %s 
              AND txn_type = 'expense'
            GROUP BY description
            HAVING month_count >= 3
            ORDER BY avg_amount DESC
            LIMIT 5
        """, (user_id, six_months_ago))
        recurring_charges = cursor.fetchall()
        
        # ═══ RULE 4: SAVINGS CALCULATION ═══
        current_expenses = float(current_month['expenses'] or 0)
        current_income = float(current_month['income'] or 0)
        savings_this_month = current_income - current_expenses
        savings_rate = (savings_this_month / current_income * 100) if current_income > 0 else 0
        
        # ═══ RULE 5: ALERT GENERATION ═══
        alerts = []
        overspend_count = 0
        
        # Check for overspending vs average
        monthly_avg = float(avg_result['avg_spending'] or 0)
        if monthly_avg > 0 and current_expenses > monthly_avg * 1.2:  # 20% over average
            overspend_pct = ((current_expenses - monthly_avg) / monthly_avg * 100)
            alerts.append({
                'type': 'overspend',
                'severity': 'warning',
                'message': f'Spending is {overspend_pct:.1f}% above your monthly average'
            })
            overspend_count += 1
        
        # Alert for unusual spikes
        for spike in unusual_spikes:
            alerts.append({
                'type': 'spike',
                'severity': 'warning',
                'category': spike['category'],
                'message': f'{spike["category"].title()} spending is {spike["increase_percent"]:.0f}% above average'
            })
            overspend_count += 1
        
        # Calculate month-over-month change
        last_month_total = float(last_month['total'] or 0)
        change_percent = 0
        if last_month_total > 0:
            change_percent = ((current_expenses - last_month_total) / last_month_total * 100)
        
        # Build response
        analytics = {
            'success': True,
            'current_month': {
                'total': round(current_expenses, 2),
                'income': round(current_income, 2),
                'by_category': {cat['category']: round(cat['total'], 2) for cat in current_categories},
                'change_percent': round(change_percent, 2)
            },
            'monthly_average': round(monthly_avg, 2),
            'savings_this_month': round(savings_this_month, 2),
            'savings_rate': round(savings_rate, 2),
            'overspend_alerts': overspend_count,
            'monthly_trend': [
                {
                    'month': m['month'],
                    'expenses': round(m['expenses'] or 0, 2),
                    'income': round(m['income'] or 0, 2)
                } for m in monthly_trend
            ],
            'category_breakdown': [
                {
                    'category': cat['category'],
                    'amount': round(cat['total'], 2),
                    'count': cat['count'],
                    'percentage': round((cat['total'] / current_expenses * 100) if current_expenses > 0 else 0, 2)
                } for cat in sorted(current_categories, key=lambda x: x['total'], reverse=True)
            ],
            'lifestyle_patterns': [],
            'alerts': alerts,
            'recurring_charges': [
                {
                    'description': r['description'],
                    'avg_amount': round(r['avg_amount'], 2),
                    'frequency': r['month_count']
                } for r in recurring_charges
            ]
        }
        
        # Generate lifestyle patterns
        patterns = []
        
        # 1. High dining frequency (Adjusted threshold: 10)
        food_cat = next((c for c in current_categories if c['category'] == 'food'), None)
        if food_cat and food_cat['count'] > 10:
            patterns.append({
                'icon': 'alert',
                'label': 'Frequent Dining',
                'desc': f'You had {food_cat["count"]} food transactions this month. Reducing dining frequency could significantly boost your savings.',
                'severity': 'warning'
            })
        
        # 2. Consistent bill payments
        bills_cat = next((c for c in current_categories if c['category'] == 'bills'), None)
        if bills_cat and bills_cat['count'] >= 2:
            patterns.append({
                'icon': 'check',
                'label': 'Reliable Bill Payer',
                'desc': 'You\'re staying on top of your utility and bill payments. Great job!',
                'severity': 'success'
            })
        
        # 3. Rising subscription costs
        if len(recurring_charges) >= 3:
            total_subscriptions = sum(r['avg_amount'] for r in recurring_charges)
            patterns.append({
                'icon': 'alert',
                'label': 'Subscription Watch',
                'desc': f'You have {len(recurring_charges)} recurring charges (~₹{total_subscriptions:.0f}/mo). Periodic audits can help eliminate unused services.',
                'severity': 'info'
            })
        
        # 4. Savings rate check
        if savings_rate > 20:
            patterns.append({
                'icon': 'check',
                'label': 'Excellent Savings Rate',
                'desc': f'Your savings rate of {savings_rate:.1f}% is outstanding (target: 20%+).',
                'severity': 'success'
            })
        elif savings_rate > 0:
            patterns.append({
                'icon': 'check',
                'label': 'Positive Cash Flow',
                'desc': f'You saved ₹{savings_this_month:,.0f} this month. Every bit counts towards your goals!',
                'severity': 'success'
            })
            
        # 5. Stable Spending pattern
        if last_month_total > 0 and abs(change_percent) < 10:
            patterns.append({
                'icon': 'check',
                'label': 'Stable Spending',
                'desc': 'Your spending is very consistent with last month. This predictability makes budgeting much easier.',
                'severity': 'success'
            })

        analytics['lifestyle_patterns'] = patterns
        
        return jsonify(analytics), 200
        
    except Error as e:
        print(f"Analytics error: {e}")
        return jsonify({'success': False, 'message': 'Failed to generate analytics.'}), 500
    finally:
        if conn.is_connected():
            if 'cursor' in dir() and cursor:
                cursor.close()
            conn.close()


# ─── Credit Health ────────────────────────────────────────────────────────────

@app.route('/api/analytics/credit-health', methods=['GET'])
def get_credit_health():
    """Calculate rule-based credit health score from transaction data."""
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': 'User ID is required.'}), 400

    result = financial_tools.calculate_credit_health(user_id)
    if result.get('success'):
        return jsonify(result), 200
    else:
        return jsonify(result), 500



# ─── Anomaly Detection ───────────────────────────────────────────────────────

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

@app.route('/api/analytics/anomaly', methods=['GET'])
def get_anomaly_detection():
    """Run Isolation Forest anomaly detection on user's transaction history."""
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': 'User ID is required.'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Database connection failed.'}), 500

    try:
        import pandas as pd
        import numpy as np
        from datetime import datetime
        from Isolation_model import FinverseAnomalyDetector

        cursor = conn.cursor(dictionary=True)

        # Fetch all expense transactions for this user
        cursor.execute("""
            SELECT txn_id, txn_date, description, category, amount
            FROM updated_transactions
            WHERE user_id = %s AND txn_type = 'expense'
            ORDER BY STR_TO_DATE(txn_date, '%d-%m-%Y %H:%i') DESC
        """, (user_id,))
        rows = cursor.fetchall()

        if len(rows) < 10:
            return jsonify({'success': False, 'message': 'Not enough transactions to run anomaly detection (need at least 10).'}), 400

        # Build DataFrame
        df = pd.DataFrame(rows)
        df['txn_date'] = pd.to_datetime(df['txn_date'], format='%d-%m-%Y %H:%M', errors='coerce')
        df = df.dropna(subset=['txn_date'])
        df['amount'] = df['amount'].abs().astype(float)

        # Train + detect
        detector = FinverseAnomalyDetector(contamination='auto')
        detector.fit(df.copy())
        result_df = detector.detect(df.copy())

        anomalies = result_df[result_df['is_anomaly']].copy()
        normal = result_df[~result_df['is_anomaly']]

        # Build response list
        anomaly_list = []
        for _, row in anomalies.sort_values('anomaly_score').iterrows():
            severity = 'critical' if row['anomaly_score'] < -0.2 else 'warning'
            anomaly_list.append({
                'txn_id': int(row['txn_id']) if 'txn_id' in row else None,
                'date': row['txn_date'].strftime('%Y-%m-%d'),
                'description': str(row['description']),
                'category': str(row['category']),
                'amount': round(float(row['amount']), 2),
                'severity': severity,
                'anomaly_score': round(float(row['anomaly_score']), 4)
            })

        # ── Aggregate by calendar day for the chart (last 90 days) ──────────
        result_df_sorted = result_df.copy()
        result_df_sorted['date_only'] = result_df_sorted['txn_date'].dt.date

        daily = (
            result_df_sorted
            .groupby('date_only', sort=True)
            .agg(
                daily_amount=('amount', 'sum'),
                is_anomaly=('is_anomaly', 'any'),
                anomaly_score=('anomaly_score', 'min')
            )
            .reset_index()
        )

        # Limit to last 90 days so the chart stays readable
        daily = daily.tail(90).reset_index(drop=True)

        # Statistical threshold: mean + 2 × std of NORMAL daily totals
        normal_daily = daily.loc[~daily['is_anomaly'], 'daily_amount']
        if len(normal_daily) >= 2:
            _mean = float(normal_daily.mean())
            _std  = float(normal_daily.std())
            threshold = round(_mean + 2 * _std, 2)
        else:
            threshold = round(float(daily['daily_amount'].max() * 0.6), 2)

        chart_points = [
            {
                'date':          str(row['date_only']),
                'amount':        round(float(row['daily_amount']), 2),
                'is_anomaly':    bool(row['is_anomaly']),
                'anomaly_score': round(float(row['anomaly_score']), 4)
            }
            for _, row in daily.iterrows()
        ]

        return jsonify({
            'success': True,
            'total_transactions': len(result_df),
            'anomaly_count': len(anomalies),
            'normal_count': len(normal),
            'anomaly_rate': round(len(anomalies) / len(result_df) * 100, 1),
            'total_anomaly_amount': round(float(anomalies['amount'].sum()), 2),
            'avg_anomaly_amount': round(float(anomalies['amount'].mean()), 2) if len(anomalies) > 0 else 0,
            'anomalies': anomaly_list,
            'chart_points': chart_points,
            'chart_threshold': threshold
        }), 200

    except ImportError as e:
        return jsonify({'success': False, 'message': f'Missing dependency: {e}'}), 500
    except Exception as e:
        print(f"Anomaly detection error: {e}")
        import traceback; traceback.print_exc()
        return jsonify({'success': False, 'message': f'Anomaly detection failed: {str(e)}'}), 500
    finally:
        if conn.is_connected():
            if 'cursor' in dir() and cursor:
                cursor.close()
            conn.close()


# ─── FinBERT News Sentiment ──────────────────────────────────────────────────
# Pre-warm the model in a background thread at startup so the first HTTP
# request doesn't stall while PyTorch + HuggingFace load ~500 MB.
import threading as _threading

_finbert_pipeline  = None          # the loaded pipeline object
_finbert_ready     = False         # True once model is loaded
_finbert_error     = None          # error string if load failed
_finbert_lock      = _threading.Lock()


def _prewarm_finbert():
    """Background thread: load ProsusAI/finbert once, cache it globally."""
    global _finbert_pipeline, _finbert_ready, _finbert_error
    try:
        print("[FinBERT] Pre-warming model in background thread…")
        from finbert import load_finbert_model
        fb = load_finbert_model()
        with _finbert_lock:
            _finbert_pipeline = fb
            _finbert_ready    = True
        print("[FinBERT] Model ready ✅")
    except Exception as exc:
        with _finbert_lock:
            _finbert_error = str(exc)
            _finbert_ready = True   # mark ready so UI doesn't wait forever
        print(f"[FinBERT] Pre-warm failed: {exc}")


# Start pre-warm immediately when Flask imports this module
_threading.Thread(target=_prewarm_finbert, daemon=True).start()


@app.route('/api/news/status', methods=['GET'])
def get_news_status():
    """Poll this to check whether FinBERT model has finished loading."""
    return jsonify({
        'ready': _finbert_ready,
        'error': _finbert_error,
    }), 200


@app.route('/api/news/sentiment', methods=['GET'])
def get_news_sentiment():
    """
    Fetch live financial news from multiple APIs, run FinBERT sentiment
    classification on each headline, and return enriched results.

    Query params (all optional):
        max  – hard cap on headlines returned (default: 30)
    """
    # Fail fast if model isn't ready yet
    if not _finbert_ready:
        return jsonify({
            'success': False,
            'loading': True,
            'message': 'FinBERT model is still loading — please wait and retry.'
        }), 503

    if _finbert_error:
        return jsonify({
            'success': False,
            'message': f'FinBERT failed to load: {_finbert_error}'
        }), 500

    max_results = int(request.args.get('max', 30))

    try:
        from concurrent.futures import ThreadPoolExecutor, as_completed
        from finbert import (
            fetch_news_from_eodhd,
            fetch_news_from_newsapi,
            fetch_news_from_yahoo_rss,
            fetch_news_from_alphavantage,
            filter_finance_items,
            merge_and_deduplicate_items,
            get_sentiment,
            aggregate_sentiment,
            find_trending_category,
            detect_category,
            generate_copilot_response,
            MAX_PER_SOURCE,
        )

        # ── 1. Fetch all sources concurrently (4× faster than sequential) ──
        fetchers = {
            'eodhd'  : (fetch_news_from_eodhd,       MAX_PER_SOURCE),
            'newsapi': (fetch_news_from_newsapi,      MAX_PER_SOURCE),
            'yahoo'  : (fetch_news_from_yahoo_rss,    MAX_PER_SOURCE),
            'alpha'  : (fetch_news_from_alphavantage, MAX_PER_SOURCE),
        }
        raw = {}
        with ThreadPoolExecutor(max_workers=4) as pool:
            futures = {pool.submit(fn, n): key for key, (fn, n) in fetchers.items()}
            for future in as_completed(futures, timeout=20):
                key = futures[future]
                try:
                    raw[key] = future.result()
                except Exception as fe:
                    print(f"[News] {key} fetch error: {fe}")
                    raw[key] = []

        # ── 2. Filter & merge ───────────────────────────────────────────────
        fin_items = merge_and_deduplicate_items(
            filter_finance_items(raw.get('eodhd',   [])),
            filter_finance_items(raw.get('newsapi', [])),
            filter_finance_items(raw.get('yahoo',   [])),
            filter_finance_items(raw.get('alpha',   [])),
            max_total=max_results,
        )

        if not fin_items:
            return jsonify({
                'success': False,
                'message': 'No finance headlines found. All news APIs may be rate-limited.'
            }), 503

        # ── 3. Run FinBERT (model already loaded) ───────────────────────────
        with _finbert_lock:
            fb = _finbert_pipeline
        results = [get_sentiment(item, fb) for item in fin_items]

        # ── 4. Aggregate ────────────────────────────────────────────────────
        overall_sentiment = aggregate_sentiment(results)
        trending_category = find_trending_category(results)

        # ── 5. Build response ───────────────────────────────────────────────
        articles = []
        for r in results:
            headline = r['headline']
            excerpt = (headline[:160] + '…') if len(headline) > 160 else headline
            articles.append({
                'title'     : headline,
                'source'    : r['source'],
                'sentiment' : r['label'],
                'score'     : float(r['score']), # Force standard Python float to prevent JSON serialization crashes
                'category'  : detect_category(headline) or 'General Market',
                'fetched_at': r['fetched_at'],
                'url'       : r.get('url', ''),
                'excerpt'   : excerpt,
                'summary'   : excerpt,  # Added for AI Copilot compatibility
                'time'      : r['fetched_at'][:16] if r.get('fetched_at', '—') != '—' else 'Live',
            })

        # Overwrite static cache with LIVE FinBERT news so Copilot uses real data
        # Use atomic write to prevent empty files if it crashes midway
        try:
            import os
            temp_file = 'news_cache.json.tmp'
            with open(temp_file, 'w', encoding='utf-8') as f:
                json.dump(articles, f, ensure_ascii=False, indent=2)
            os.replace(temp_file, 'news_cache.json')
        except Exception as e:
            print(f"[News] Failed to update news_cache.json for Copilot: {e}")

        sentiment_counts = {
            'positive': sum(1 for a in articles if a['sentiment'] == 'positive'),
            'neutral' : sum(1 for a in articles if a['sentiment'] == 'neutral'),
            'negative': sum(1 for a in articles if a['sentiment'] == 'negative'),
        }


        # Calculate real savings for this user (if provided)
        user_id = request.args.get('user_id')
        user_savings = 0
        if user_id:
            user_savings = get_user_monthly_savings(user_id)
        else:
            # Fallback for anonymous or generic requests
            user_savings = 15000

        return jsonify({
            'success'          : True,
            'articles'         : articles,
            'total'            : len(articles),
            'overall_sentiment': overall_sentiment,
            'trending_category': trending_category,
            'sentiment_counts' : sentiment_counts,
            'recommendation'   : generate_copilot_response(
                savings=user_savings, 
                sentiment=overall_sentiment, 
                category=trending_category
            ),
        }), 200

    except ImportError as e:
        return jsonify({'success': False, 'message': f'Missing dependency: {e}'}), 500
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({'success': False, 'message': f'News sentiment failed: {str(e)}'}), 500


# ─── Forecast Integrations ───────────────────────────────────────────────────

@app.route('/api/analytics/forecast', methods=['GET'])
def get_forecast():
    import json
    # Look for the JSON file generated by finverse_forecaster_xgboost.py
    # Since server.py is inside fintech-ai-system_updated but the script is outside
    file_path = os.path.join(os.path.dirname(basedir), 'finverse_xgboost_output.json')
    if not os.path.exists(file_path):
        file_path = os.path.join(basedir, 'finverse_xgboost_output.json')
        
    if os.path.exists(file_path):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                data['success'] = True
                return jsonify(data), 200
        except Exception as e:
            return jsonify({'success': False, 'message': f'Error reading forecast data: {str(e)}'}), 500
    else:
        return jsonify({
            'success': False, 
            'message': 'No forecast data found. Please run finverse_forecaster_xgboost.py in the terminal first.'
        }), 404


# ─── Run Server ──────────────────────────────────────────────────────────────

# ─── AI Copilot RAG API ───────────────────────────────────────────────────────

@app.route('/api/ai/chat', methods=['POST'])
def ai_chat():
    """AI Financial Copilot Chat Endpoint."""
    data = request.get_json()
    user_id = data.get('user_id')
    query = data.get('query', '').strip()

    if not user_id or not query:
        return jsonify({'success': False, 'message': 'User ID and query are required.'}), 400

    # Generate response from AI agent
    result = rag_agent.generate_response(user_id, query)
    
    return jsonify(result), 200

if __name__ == '__main__':
    test_db_connection()
    port = int(os.getenv('PORT', 5000))
    print(f"🚀 FINVERSE server running on http://localhost:{port}")
    app.run(debug=True, port=port)
