"""
FINVERSE - XGBoost Forecasting Model
Robust implementation for expense prediction using XGBoost
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import xgboost as xgb
from sklearn.metrics import mean_absolute_error
import json
import os
import mysql.connector
from dotenv import load_dotenv
import warnings

warnings.filterwarnings('ignore')

# Load environment variables for database connection
load_dotenv()

print("="*80)
print("FINVERSE XGBOOST FORECASTING MODEL")
print("="*80)

def get_data():
    # Try to load from CSV first (as in reference)
    csv_path = 'extended_transactions_to_feb2026.csv'
    if os.path.exists(csv_path):
        print(f"\nLoading data from {csv_path}...")
        df = pd.read_csv(csv_path)
        df['txn_date'] = pd.to_datetime(df['txn_date'], format='mixed', dayfirst=True)
    else:
        # Fallback to MySQL
        print(f"\nCSV not found. Fetching data from MySQL database...")
        db_host = os.getenv('DB_HOST', 'localhost')
        db_name = os.getenv('DB_NAME', 'finverse_ai')
        print(f"   Connecting to {db_host}/{db_name}...")
        try:
            conn = mysql.connector.connect(
                host=db_host,
                port=int(os.getenv('DB_PORT', 3306)),
                user=os.getenv('DB_USER', 'root'),
                password=os.getenv('DB_PASSWORD'),
                database=db_name
            )
            cursor = conn.cursor()
            query = "SELECT * FROM updated_transactions"
            cursor.execute(query)
            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()
            print(f"   Fetched {len(rows)} rows from updated_transactions.")
            df = pd.DataFrame(rows, columns=columns)
            cursor.close()
            conn.close()
            
            if df.empty:
                print("⚠️ No transactions found in database.")
                return None
                
            # format='%d-%m-%Y %H:%M' is the format in the database based on earlier check
            df['txn_date'] = pd.to_datetime(df['txn_date'], format='mixed', dayfirst=True)
            print(f"Loaded {len(df)} transactions from database")
        except Exception as e:
            print(f"Error fetching from database: {e}")
            return None
            
    df['date'] = df['txn_date'].dt.date
    return df

df = get_data()
if df is None or len(df) == 0:
    print("No data available for forecasting. Exiting.")
    exit()

print(f"   Period: {df['txn_date'].min().date()} to {df['txn_date'].max().date()}")

# Prepare expense data
# Robust filtering to handle potential whitespace or encoding issues
for col in df.columns:
    if df[col].dtype == object:
        df[col] = df[col].apply(lambda x: x.decode('utf-8') if isinstance(x, bytes) else x)

df['txn_type'] = df['txn_type'].astype(str).str.strip().str.lower()
expenses = df[df['txn_type'] == 'expense'].copy()
expenses['amount'] = pd.to_numeric(expenses['amount'], errors='coerce').fillna(0).abs()

# Normalize categories to avoid duplicates and merge similar ones
def normalize_category(cat):
    cat = str(cat).strip().lower()
    mapping = {
        'food': 'Food & Dining',
        'food & dining': 'Food & Dining',
        'shopping': 'Shopping',
        'entertainment': 'Entertainment',
        'bills': 'Bills & Utilities',
        'utilities': 'Bills & Utilities',
        'bills & utilities': 'Bills & Utilities',
        'transport': 'Transport',
        'rent': 'Rent',
        'healthcare': 'Healthcare',
        'other': 'Other'
    }
    return mapping.get(cat, 'Other')

expenses['category'] = expenses['category'].apply(normalize_category)

# Filter out 'Test' category if present
expenses = expenses[expenses['category'] != 'Test']

print(f"\nFiltered {len(expenses)} expense transactions")
if len(expenses) > 0:
    print(f"   Example expense: {expenses.iloc[0]['txn_date']} - {expenses.iloc[0]['amount']}")

# Create daily aggregation
daily = expenses.groupby('date')['amount'].sum().reset_index()
daily.columns = ['date', 'total_expense']
daily['date'] = pd.to_datetime(daily['date'])
daily = daily.set_index('date')

# Fill missing dates with 0
idx = pd.date_range(daily.index.min(), daily.index.max(), freq='D')
daily = daily.reindex(idx, fill_value=0)

print(f"\nDaily aggregation: {len(daily)} days")
print(f"   Average daily spend: Rs. {daily['total_expense'].mean():.2f}")

# Create features
def create_features(df, target_col='total_expense'):
    """Create time series features"""
    data = df.copy()
    
    # Time features
    data['day_of_week'] = data.index.dayofweek
    data['day_of_month'] = data.index.day
    data['month'] = data.index.month
    data['is_weekend'] = (data.index.dayofweek >= 5).astype(int)
    
    # Lag features
    for i in [1, 2, 3, 7, 14, 30]:
        data[f'lag_{i}'] = data[target_col].shift(i)
    
    # Rolling features
    for window in [7, 14, 30]:
        data[f'roll_mean_{window}'] = data[target_col].shift(1).rolling(window, min_periods=1).mean()
        data[f'roll_std_{window}'] = data[target_col].shift(1).rolling(window, min_periods=1).std().fillna(0)
    
    return data.dropna()

# Prepare training data
data = create_features(daily)
X = data.drop('total_expense', axis=1)
y = data['total_expense']

print(f"\nCreated {X.shape[1]} features from {X.shape[0]} samples")

# Train-test split (time-based)
split = int(len(X) * 0.8)
X_train, X_test = X.iloc[:split], X.iloc[split:]
y_train, y_test = y.iloc[:split], y.iloc[split:]

print(f"   Training: {len(X_train)} days | Test: {len(X_test)} days")

# Train model using XGBoost
print("\nTraining XGBoost model...")
model = xgb.XGBRegressor(
    n_estimators=200,
    max_depth=6,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    random_state=42,
    objective='reg:squarederror'
)
model.fit(X_train, y_train)

# Evaluate
train_pred = model.predict(X_train)
test_pred = model.predict(X_test)

# Calculate metrics (handle division by zero)
def safe_mape(y_true, y_pred):
    mask = y_true != 0
    return np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100

train_mape = safe_mape(y_train.values, train_pred)
test_mape = safe_mape(y_test.values, test_pred)
train_mae = mean_absolute_error(y_train, train_pred)
test_mae = mean_absolute_error(y_test, test_pred)

print(f"\nModel Performance (XGBoost):")
print(f"   Train MAPE: {train_mape:.2f}% | MAE: Rs. {train_mae:.2f}")
print(f"   Test MAPE:  {test_mape:.2f}%  | MAE: Rs. {test_mae:.2f}")

# Generate future predictions
print(f"\nGenerating 90-day forecast...")
last_date = daily.index[-1]
future_dates = pd.date_range(last_date + timedelta(days=1), periods=90)

# Prepare prediction data
historical = daily['total_expense'].copy()
predictions = []

for date in future_dates:
    features = {
        'day_of_week': date.dayofweek,
        'day_of_month': date.day,
        'month': date.month,
        'is_weekend': int(date.dayofweek >= 5),
    }
    
    for i in [1, 2, 3, 7, 14, 30]:
        features[f'lag_{i}'] = historical.iloc[-i] if len(historical) >= i else historical.mean()
    
    for window in [7, 14, 30]:
        if len(historical) >= window:
            features[f'roll_mean_{window}'] = historical.iloc[-window:].mean()
            features[f'roll_std_{window}'] = historical.iloc[-window:].std()
        else:
            features[f'roll_mean_{window}'] = historical.mean()
            features[f'roll_std_{window}'] = historical.std()
    
    X_pred = pd.DataFrame([features], columns=X.columns)
    pred = max(0, model.predict(X_pred)[0])
    predictions.append(pred)
    historical = pd.concat([historical, pd.Series([pred], index=[date])])

print(f"   Generated {len(predictions)} predictions")

# GUI output generation
print(f"\nGenerating summary output...")
current_total = float(expenses[expenses['txn_date'].dt.to_period('M') == expenses['txn_date'].max().to_period('M')]['amount'].sum())
next_month_pred = float(sum(predictions[:30]))
pct_change = float(((next_month_pred - current_total) / current_total * 100) if current_total > 0 else 0)

# Prepare chart data
historical_data = []
for date, amount in daily['total_expense'].items():
    historical_data.append({
        "date": date.strftime('%Y-%m-%d'),
        "amount": round(float(amount), 2)
    })

forecast_data = []
for i, date in enumerate(future_dates):
    forecast_data.append({
        "date": date.strftime('%Y-%m-%d'),
        "amount": round(float(predictions[i]), 2)
    })

# Category-wise (simplified for output)
category_forecast = []
categories = expenses['category'].unique()
for cat in categories:
    cat_expenses = float(expenses[expenses['category'] == cat]['amount'].sum())
    total_exp_sum = float(expenses['amount'].sum())
    prop = cat_expenses / total_exp_sum if total_exp_sum > 0 else 0
    cat_next = next_month_pred * prop
    category_forecast.append({
        "category": str(cat),
        "predicted_amount": round(float(cat_next), 2),
        "change_percentage": round(float(pct_change), 1)
    })

# Recommendations based on forecast
recommendations = []
if pct_change > 10:
    recommendations.append({
        "title": f"Reduce spending by {round(pct_change, 1)}%",
        "desc": f"Your spending is predicted to increase significantly next month. Review your {category_forecast[0]['category'] if category_forecast else 'major'} expenses.",
        "action": "Set Budget"
    })
else:
    recommendations.append({
        "title": "On track with spending",
        "desc": "Your predicted spending for next month is stable. Maintain your current financial discipline.",
        "action": "View Details"
    })

recommendations.append({
    "title": "Emergency fund target",
    "desc": f"Based on your 90-day forecast, aim to keep Rs. {round(next_month_pred * 3, 0)} as a 3-month buffer.",
    "action": "Track"
})

gui_output = {
    "summary": {
        "predicted_next_month": round(float(next_month_pred), 0),
        "change_vs_current": round(float(pct_change), 1),
        "currency": "₹",
        "savings_forecast": round(float(current_total * 0.2), 0) # Placeholder for savings
    },
    "chart_data": {
        "historical": historical_data[-30:], # Last 30 days of actual data
        "forecast": forecast_data # 90 days of forecast
    },
    "category_level_forecast": sorted(category_forecast, key=lambda x: x['predicted_amount'], reverse=True),
    "recommendations": recommendations,
    "status": "XGBoost Implementation Complete",
    "last_updated": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
}

# Save output
basedir = os.path.abspath(os.path.dirname(__file__))
output_file = os.path.join(basedir, 'finverse_xgboost_output.json')
with open(output_file, 'w') as f:
    json.dump(gui_output, f, indent=2)

print(f"\nSummary saved to {output_file}")
print("\n" + "="*80)
print("XGBOOST FORECASTING COMPLETE!")
print("="*80)
