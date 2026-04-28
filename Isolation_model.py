"""
FINVERSE - Production-Ready Isolation Forest Anomaly Detector
Best-in-class ML anomaly detection for financial transactions
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sklearn.ensemble import IsolationForest, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error
import json
import warnings
import os
import mysql.connector
from dotenv import load_dotenv

warnings.filterwarnings('ignore')

# Load environment variables
load_dotenv()

def get_db_connection():
    """Create and return a MySQL database connection."""
    try:
        connection = mysql.connector.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            port=int(os.getenv('DB_PORT', 3306)),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD'),
            database=os.getenv('DB_NAME', 'finverse_ai')
        )
        return connection
    except Exception as e:
        print(f"Error connecting to MySQL: {e}")
        return None

class FinverseAnomalyDetector:
    """
    ML-powered anomaly detection using Isolation Forest
    """
    
    def __init__(self, contamination=0.015):
        """
        Initialize detector
        
        Parameters:
        - contamination: Expected proportion of anomalies (default 1.5%)
        """
        self.contamination = contamination
        self.isolation_forest = None
        self.scaler = None
        self.feature_cols = None
        
    def prepare_features(self, df):
        """Create features for anomaly detection"""
        df = df.copy()
        
        # Time features
        df['hour'] = df['txn_date'].dt.hour
        df['day_of_week'] = df['txn_date'].dt.dayofweek
        df['day_of_month'] = df['txn_date'].dt.day
        df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
        df['is_late_night'] = ((df['hour'] >= 23) | (df['hour'] <= 5)).astype(int)
        
        # Category encoding
        category_encoded = pd.get_dummies(df['category'], prefix='cat')
        df = pd.concat([df, category_encoded], axis=1)
        
        # Feature columns
        self.feature_cols = ['amount', 'hour', 'day_of_week', 'day_of_month', 
                             'is_weekend', 'is_late_night'] + list(category_encoded.columns)
        
        return df
    
    def fit(self, transactions_df):
        """
        Train the anomaly detector
        
        Parameters:
        - transactions_df: DataFrame with transaction data
        """
        print("🔧 Training Isolation Forest Anomaly Detector...")
        
        # Prepare features
        df_features = self.prepare_features(transactions_df)
        X = df_features[self.feature_cols].values
        
        # Scale features
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)
        
        # Train Isolation Forest
        # When contamination='auto', don't pass it to sklearn (its default IS auto-threshold)
        if self.contamination == 'auto':
            self.isolation_forest = IsolationForest(
                random_state=42,
                n_estimators=100,
                max_samples=256
            )
        else:
            self.isolation_forest = IsolationForest(
                contamination=self.contamination,
                random_state=42,
                n_estimators=100,
                max_samples=256
            )
        
        self.isolation_forest.fit(X_scaled)
        
        print(f"✅ Model trained on {len(transactions_df)} transactions")
        exp = f"~{int(len(transactions_df) * self.contamination)}" if self.contamination != 'auto' else "auto (score-based threshold)"
        print(f"   Expected anomalies: {exp}")
        
    def detect(self, transactions_df):
        """
        Detect anomalies in transactions
        
        Returns:
        - DataFrame with anomaly flags and scores
        """
        # Prepare features
        df_features = self.prepare_features(transactions_df)
        X = df_features[self.feature_cols].values
        
        # Scale
        X_scaled = self.scaler.transform(X)
        
        # Get raw anomaly scores (lower = more anomalous)
        scores = self.isolation_forest.score_samples(X_scaled)
        
        # Determine anomaly flags:
        # - If contamination='auto': use the original paper's fixed threshold of -0.5
        # - Otherwise: use sklearn's predict() which ranks by percentile
        if self.contamination == 'auto':
            # Threshold tuned to this dataset's score distribution (range: -0.38 to -0.61)
            # Flags only the extreme bottom ~1.5% — late-night, high-amount, card theft patterns
            is_anomaly = scores < -0.58
        else:
            predictions = self.isolation_forest.predict(X_scaled)
            is_anomaly = (predictions == -1)
        
        # Add to dataframe
        transactions_df['is_anomaly'] = is_anomaly
        transactions_df['anomaly_score'] = scores
        
        # Lower score = more anomalous
        transactions_df['anomaly_severity'] = transactions_df['anomaly_score'].rank(ascending=True)
        
        return transactions_df


if __name__ == '__main__':
    print("="*100)
    print("FINVERSE - ISOLATION FOREST ANOMALY DETECTION & FORECASTING")
    print("="*100)

    # Load data from database
    print("🔄 Loading data from database...")
    conn = get_db_connection()
    if conn is None:
        print("❌ Failed to connect to database")
        exit(1)
    
    try:
        cursor = conn.cursor()
        query = "SELECT * FROM updated_transactions"
        cursor.execute(query)
        columns = [col[0] for col in cursor.description]
        rows = cursor.fetchall()
        df = pd.DataFrame(rows, columns=columns)
        cursor.close()
        conn.close()
        
        print(f"✅ Loaded {len(df)} transactions from database")
    except Exception as e:
        print(f"❌ Error loading data from database: {e}")
        conn.close()
        exit(1)

    # Convert txn_date to datetime
    df['txn_date'] = pd.to_datetime(df['txn_date'], format='%d-%m-%Y %H:%M')

    expenses = df[df['txn_type'] == 'expense'].copy()
    expenses['amount'] = abs(expenses['amount'])

    print(f"\n✅ Loaded {len(expenses)} expense transactions")

    # =============================================================================
    # STEP 1: DETECT ANOMALIES WITH ISOLATION FOREST
    # =============================================================================

    print(f"\n{'='*100}")
    print("STEP 1: ML-BASED ANOMALY DETECTION (ISOLATION FOREST)")
    print("="*100)

    detector = FinverseAnomalyDetector(contamination=0.015)
    detector.fit(expenses)
    expenses = detector.detect(expenses)

    anomalies = expenses[expenses['is_anomaly']].sort_values('amount', ascending=False)
    normal = expenses[~expenses['is_anomaly']]

    print(f"\n⚠️  Anomalies Detected: {len(anomalies)}")
    print(f"   Total amount: ₹{anomalies['amount'].sum():,.2f}")
    print(f"   Average: ₹{anomalies['amount'].mean():,.2f}")

    print(f"\n   Top 10 Anomalies (by amount):")
    for _, row in anomalies.head(10).iterrows():
        severity = 'HIGH' if row['anomaly_score'] < -0.3 else 'MEDIUM'
        print(f"   • ₹{row['amount']:>10,.0f} - {row['category']:<15} [{severity}] - {row['description'][:45]}")

    print(f"\n✅ Normal Transactions: {len(normal)}")
    print(f"   Total: ₹{normal['amount'].sum():,.2f}")
    print(f"   Average: ₹{normal['amount'].mean():.2f}")
