# 💰 Finverse AI - Intelligent Personal Finance Dashboard

> An AI-powered personal finance management system that combines machine learning, natural language processing, and real-time financial news to deliver actionable insights about your money.

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.1.0-000000?style=for-the-badge&logo=flask&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.0+-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google_Gemini-AI-4285F4?style=for-the-badge&logo=google&logoColor=white)

---

## 📖 Overview

Finverse AI is a full-stack personal finance application built as a TE (Third Year Engineering) Mini Project. It combines a Flask REST API backend with a rich HTML/CSS/JS frontend and a suite of ML models to give users deep insight into their financial behaviour.

### Key Highlights

- 🤖 **AI Financial Copilot** - Powered by Google Gemini (`gemma-3-27b-it`) for natural language Q&A on your finances
- 📊 **Spending Analytics** - Rule-based 5-factor analysis with category breakdowns, trend tracking and lifestyle patterns
- 🔍 **Anomaly Detection** - Isolation Forest ML model flags suspicious or unusual transactions
- 📈 **Expense Forecasting** - XGBoost time-series model predicts spending for the next 90 days
- 📰 **FinBERT Sentiment Analysis** - ProsusAI/FinBERT classifies live financial news from 4 APIs
- 💳 **Credit Health Score** - Rule-based 5-factor credit score derived from transaction history

---

## ✨ Features

### 🔐 Authentication
- Secure user registration and login with **bcrypt** password hashing
- Session-based user management

### 💬 AI Financial Copilot (RAG Agent)
- Intent-aware question answering (spending, investments, anomaly detection, transaction logging)
- Retrieval-Augmented Generation (RAG) pipeline combining user transaction data + live financial news
- Can automatically **record transactions** via natural language (e.g. "I spent ₹500 on groceries today")
- Powered by **Google Gemini** (`gemma-3-27b-it`)

### 📊 Spending Analytics
Implements a **5-rule analytics engine**:
1. **Category Aggregation** - Totals per category for the active month
2. **Time-Based Analysis** - Month-over-month and 6-month trend comparison
3. **Pattern Detection** - High-frequency categories, unusual spikes (>150% of average), recurring charges
4. **Savings Calculation** - `Savings = Income − Expenses`, savings rate as a percentage
5. **Alert Generation** - Automated warnings when spending exceeds 120% of average

### 🔍 Anomaly Detection (Isolation Forest)
- ML-powered using **scikit-learn's Isolation Forest**
- Feature engineering: amount, time-of-day, day-of-week, category encoding
- Contamination rate tuned to flag ~1.5% of transactions
- Returns severity level (`critical` / `warning`) with anomaly scores

### 📈 Expense Forecasting (XGBoost)
- **XGBoost Regressor** trained on historical daily expense aggregates
- Feature set: lag features (1, 2, 3, 7, 14, 30 days), rolling statistics (7/14/30-day windows), time features
- 90-day daily forecast with category-level breakdown
- Pre-computed and cached as `finverse_xgboost_output.json`

### 📰 Financial News & Sentiment (FinBERT)
Live financial news pipeline:
- **4 news sources**: EODHD, NewsAPI, Yahoo Finance RSS, Alpha Vantage
- Finance-relevance keyword filter (60+ keywords)
- **ProsusAI/FinBERT** (Hugging Face) for per-headline sentiment classification
- Aggregates overall market sentiment → drives AI investment recommendations

### 💳 Credit Health Score
A proprietary 900-point credit health score built from 5 factors:
| Factor | Max Points |
|---|---|
| Savings Rate | 200 |
| Income Stability | 200 |
| Spending Discipline | 200 |
| Spending Consistency | 150 |
| Debt Signals | 150 |

---

## 🏗️ Project Structure

```
fintech-ai-system_updated/
├── server.py                      # Flask backend — API routes, DB connection
├── rag_agent.py                   # AI Copilot — Gemini RAG pipeline
├── tools.py                       # Financial tools — spending summary, credit health, news loading
├── context_builder.py             # Builds context strings for the AI prompt
├── intent_detector.py             # Classifies user query intent
├── Isolation_model.py             # Isolation Forest anomaly detector
├── finbert.py                     # FinBERT news sentiment pipeline
├── finverse_forecaster_xgboost.py # XGBoost 90-day expense forecaster
├── finverse_xgboost_output.json   # Pre-computed forecast data (served via API)
├── news_cache.json                # Cached financial news headlines
├── index.html                     # Landing / login page
├── app.html                       # Main dashboard (post-login)
├── css/                           # Stylesheets
├── js/                            # Frontend JavaScript
├── assets/                        # Images and static assets
├── requirements.txt               # Python dependencies
├── .env                           # Environment variables (not committed)
└── .gitignore
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python, Flask 3.1, Flask-CORS |
| **Database** | MySQL 8.0 |
| **AI / LLM** | Google Gemini API (`gemma-3-27b-it`), `google-generativeai` |
| **ML — Anomaly** | Scikit-learn Isolation Forest |
| **ML — Forecast** | XGBoost, Pandas, NumPy |
| **ML — NLP** | ProsusAI/FinBERT (Hugging Face Transformers) |
| **News APIs** | EODHD, NewsAPI, Yahoo Finance RSS, Alpha Vantage |
| **Frontend** | HTML5, Vanilla CSS, JavaScript |
| **Auth** | bcrypt password hashing |

---

## ⚙️ Setup & Installation

### Prerequisites
- Python 3.10+
- MySQL 8.0+
- A Google Gemini API key

### 1. Clone the repository

```bash
git clone https://github.com/Atharva029/Finverse_AI.git
cd Finverse_AI
```

### 2. Create a virtual environment

```bash
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

> **Note:** The FinBERT pipeline additionally requires:
> ```bash
> pip install transformers torch
> ```

### 4. Configure the database

Create the MySQL database:

```sql
CREATE DATABASE finverse_ai;
```

Create the required tables:

```sql
USE finverse_ai;

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE updated_transactions (
    txn_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    txn_date VARCHAR(20) NOT NULL,      -- Format: DD-MM-YYYY HH:MM
    description VARCHAR(255),
    category VARCHAR(50),
    txn_type ENUM('income', 'expense') NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    created_at VARCHAR(20),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
```

### 5. Create your `.env` file

```env
GEMINI_API_KEY=your_google_gemini_api_key_here
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=finverse_ai
```

### 6. Run the application

```bash
python server.py
```

The app will be available at: **http://localhost:5000**

---

## 🚀 Running the ML Models

### Generate a fresh XGBoost forecast

```bash
python finverse_forecaster_xgboost.py
```

This will fetch data from MySQL and write a new `finverse_xgboost_output.json`.

### Run the FinBERT news sentiment pipeline (standalone)

```bash
python finbert.py
```

### Run the Isolation Forest anomaly detector (standalone)

```bash
python Isolation_model.py
```

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login and authenticate |
| `GET` | `/api/transactions?user_id=` | Fetch all transactions for a user |
| `POST` | `/api/transactions` | Add a single transaction |
| `POST` | `/api/transactions/bulk` | Bulk import transactions (CSV) |
| `GET` | `/api/analytics/spending?user_id=` | Full spending analytics report |
| `GET` | `/api/analytics/credit-health?user_id=` | Credit health score and factors |
| `GET` | `/api/analytics/anomaly?user_id=` | Run Isolation Forest anomaly detection |
| `POST` | `/api/copilot` | Query the AI Financial Copilot |
| `GET` | `/api/forecast` | Get pre-computed XGBoost forecast |
| `GET` | `/api/news/sentiment` | Get live FinBERT news sentiment |

---

## 🧠 AI Copilot — How It Works

```
User Query
    │
    ▼
Intent Detector  ─── spending / investment / anomaly / add_transaction
    │
    ▼
Tool Runner  ──── Spending Summary + News + Credit Health + Forecast
    │
    ▼
Context Builder  ─── Formats all data into a structured text prompt
    │
    ▼
Google Gemini  ─── Generates insight, explanation, risk level, recommendation
    │
    ▼
Auto-Record  ──── If intent = add_transaction, extracts JSON & saves to DB
```

---

## 📁 Transaction Categories

The system supports the following expense categories:

`food` · `bills` · `transport` · `shopping` · `entertainment` · `healthcare` · `rent` · `other`

---

## 🔒 Environment & Security Notes

- **Never commit your `.env` file.** It is listed in `.gitignore`.
- API keys for EODHD, NewsAPI, and Alpha Vantage are embedded in `finbert.py` for development. Move these to `.env` before deploying to production.
- The MySQL password is currently hardcoded in `server.py` as a fallback — update this to use environment variables for production.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push to your branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

This project was developed as an academic mini project. All rights reserved by the authors.

---

## 👤 Author

**Atharva** — [@Atharva029](https://github.com/Atharva029)

> *Built with 🔥 using Flask, Google Gemini, XGBoost, FinBERT & Isolation Forest*
