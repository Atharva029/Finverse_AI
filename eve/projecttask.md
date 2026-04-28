# FINVERSE - AI-Driven Personal Finance Platform
## Project Execution Plan (Academic Timeline: 10 Weeks)

**Objective**: Build a complete, AI-driven personal finance backend using FastAPI and SQLite, integrated with a static HTML/JS frontend.
**Constraints**: No React, No Node.js, No External DB Servers (PostgreSQL/MySQL). Pure Python/SQLite stack.
**Database Strategy**: Single-file `finverse.db` with WAL mode and JSON1 extension for vector/embedding storage.

---

## PHASE 1: FOUNDATION & DATA INFRASTRUCTURE (Weeks 1-3)
**Goal**: Establish the "Lite" architecture with a robust SQLite foundation and secure API access.

### Week 1: SQLite Architecture & FastAPI Skeleton
#### Task 1.1: Initialize Single-File Database (`finverse.db`)
- **Owner**: Backend Lead
- **Action**: Create `app/database.py` and `app/models.py`.
- **SQLite Specifics**:
  - Enable **WAL (Write-Ahead Logging)** mode for concurrency: `PRAGMA journal_mode=WAL;`
  - Enable **Foreign Keys**: `PRAGMA foreign_keys=ON;`
  - Verify **JSON1 extension** availability for storing model outputs/embeddings.
- **deliverable**: `init_db.py` script that creates the full schema (Users, Transactions, News, Logs) from scratch.
- **Why SQLite?**: Zero configuration. No need to install PostgreSQL or create users/permissions. Just one file.

#### Task 1.2: FastAPI Project Structure
- **Owner**: Backend Lead
- **Action**: Setup standard folder structure:
  - `app/api/` (Endpoints)
  - `app/core/` (Config, Security)
  - `app/services/` (Business Logic)
  - `app/ml/` (Model Files)
- **Action**: Implement lifespan event handler for **SQLite connection pooling**.
  - *Note*: Use `SQLAlchemy` with `StaticPool` for in-memory testing, but standard QueuePool for production file-based DB.

### Week 2: User Authentication & Profile Management
#### Task 2.1: JWT Authentication System
- **Owner**: Security Engineer
- **Action**: Implement OAuth2 with Password Bearer flow.
- **Schema**: `users` table (id, email, hashed_password, full_name, created_at).
- **SQLite Optimization**: Index on `email` column for fast lookups.
- **Endpoint**: `POST /auth/login`, `POST /auth/register`.

#### Task 2.2: User Profile & Settings
- **Owner**: Backend Engineer
- **Action**: CRUD for user profiles.
- **Schema**: `profiles` table linked to `users`. Store preferences (risk tolerance, financial goals) as JSON blobs using SQLite JSON support.
- **Endpoint**: `GET /users/me`, `PUT /users/me`.

### Week 3: Data Ingestion & Synthetic Generation
#### Task 3.1: Transaction Data Pipeline (Synthetic)
- **Owner**: Data Engineer
- **Action**: Create a script to generate realistic banking data (PaySim style).
- **Schema**: `transactions` (id, user_id, amount, merchant, category, date, is_fraud).
- **Scale**: Generate 10,000+ rows per user to test SQLite read performance.
- **Optimization**: Create composite index on `(user_id, date)` for fast history retrieval.

#### Task 3.2: Financial News Scraper/Ingestion
- **Owner**: Data Engineer
- **Action**: Script to fetch/mock financial news headers.
- **Schema**: `news_articles` (id, title, content, published_date, source, sentiment_score).
- **Storage**: Store raw text. Sentiment scores will be updated by ML module later.

---

## PHASE 2: CORE INTELLIGENCE MODULES (Weeks 4-7)
**Goal**: Implement the Python-based AI/ML modules and store their insights directly in SQLite.

### Week 4: Module 1 - Financial News Sentiment (NLP)
#### Task 4.1: FinBERT Integration
- **Owner**: ML Engineer
- **Model**: `ProsusAI/finbert` (Hugging Face).
- **Action**: strict classification pipeline (Positive/Negative/Neutral).
- **Storage**: Update `news_articles` table with `sentiment_json` (containing probabilities).
- **Performance**: Run inference in batches (background task) to avoid blocking API.

#### Task 4.2: Sentiment API
- **Owner**: Backend Engineer
- **Endpoint**: `GET /api/news/sentiment` (Aggregated daily sentiment).
- **Query**: SQL query using SQLite's JSON functions to aggregate scores by date.

### Week 5: Module 2 & 3 - Credit Scoring & Fraud Detection
#### Task 5.1: Behavioral Credit Scoring (XGBoost)
- **Owner**: ML Engineer
- **Features**: SQL query to extract: `avg_monthly_spend`, `savings_ratio`, `late_payments_count`.
- **Model**: Train specialized XGBoost Regressor on synthetic data.
- **Output**: Store `credit_score` (300-850) in `user_scores` table.
- **Explainability**: Save SHAP values as JSON in `user_scores.shap_values`.

#### Task 5.2: Anomaly Detection (Isolation Forest)
- **Owner**: ML Engineer
- **Action**: Train Isolation Forest on user's transaction history.
- **Integration**: Real-time check on `POST /transactions`.
- **Output**: Return `is_suspicious` flag immediately.
- **Latency**: Ensure inference takes <50ms.

### Week 6: Module 4 - Spending Forecasting (Time-Series)
#### Task 6.1: LSTM Model Implementation
- **Owner**: ML Engineer
- **Data Prep**: SQL Window functions to format daily spending sequences (Lag 1-30 days).
- **Model**: TensorFlow/Keras LSTM or simplified Prophet model if resource constrained.
- **Verification**: Train model, predict next 30 days.

#### Task 6.2: Forecast Storage
- **Owner**: Backend Engineer
- **Schema**: `forecasts` (user_id, forecast_date, predicted_amount, confidence_lower, confidence_upper).
- **API**: `GET /api/forecasts` (Returns JSON for charting).

### Week 7: Module 5 - Smart Investment Suggestions
#### Task 7.1: Rule-Based & Clustering Engine
- **Owner**: Data Scientist
- **Logic**: 
  - IF `risk_profile` = 'High' AND `market_sentiment` = 'Positive' -> Suggest 'Equity/Crypto'.
  - IF `savings_rate` > 20% -> Suggest 'Index Funds'.
- **Clustering**: K-Means to group users by spending habits (stored in `user_clusters` table).
- **API**: `GET /api/suggestions`.

---

## PHASE 3: INTEGRATION & COPILOT (Weeks 8-10)
**Goal**: Connect the static frontend to the smart backend and launch the Copilot.

### Week 8: Module 6 - AI Financial Copilot (RAG-Lite)
#### Task 8.1: Context Assembly
- **Owner**: AI Enigeer
- **Action**: Create a "Context Builder" service.
- **Function**: Query SQLite for: User's last 5 transactions + Current Credit Score + Forecast data.
- **Prompt**: Construct a prompt for the LLM (e.g., "User spent $500 on shoes. Is this normal?").

#### Task 8.2: LLM Integration (OpenAI/Local)
- **Owner**: Backend Engineer
- **Constraint**: **NO RAW PII** sent to LLM. Only aggregated stats.
- **Endpoint**: `POST /api/copilot/chat`.
- **Storage**: Save conversation log to `chat_history` table in SQLite.

### Week 9: Frontend Integration
#### Task 9.1: Connect Static JS to FastAPI
- **Owner**: Frontend Integration Lead
- **Action**: Replace mock `fetch()` calls in `main.js` with real API endpoints.
- **Auth**: Store JWT in `localStorage` or `HttpOnly` cookie.
- **Visuals**: Render Charts.js graphs using data from `GET /api/forecasts`.

### Week 10: Testing, Documentation & Final Polish
#### Task 10.1: System Integration Testing
- **Owner**: QA Lead
- **Action**: End-to-End flow: Register -> Generate Data -> Train Models -> View Dashboard -> Chat with Copilot.
- **Performance**: Verify SQLite stays responsive (<200ms) under load.

#### Task 10.2: Final Documentation
- **Deliverables**: 
  - `README.md` (Setup instructions).
  - `API_DOCS.md` (screen captures of Swagger UI).
  - `ARCHITECTURE.md` (Diagram of Single-File DB approach).

---

## TECHNICAL APPENDIX

### SQLite Database Schema (Simplified)
All tables reside in **one** `finverse.db` file.

```sql
-- Users & Auth
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Financial Data
CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    amount REAL,
    category TEXT,
    date TIMESTAMP,
    is_fraud BOOLEAN DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- ML Outputs (Leveraging JSON1)
CREATE TABLE user_scores (
    user_id INTEGER PRIMARY KEY,
    credit_score INTEGER,
    risk_level TEXT,
    shap_values JSON, -- Storing explainability data strictly as JSON
    updated_at TIMESTAMP
);

-- Application Data
CREATE TABLE news_articles (
    id INTEGER PRIMARY KEY,
    title TEXT,
    sentiment_score REAL
);
```

### Advantages of This Architecture
1.  **Portability**: The entire database state is in one file. Easy to submit for academic evaluation.
2.  **Zero-Latency Networking**: Database calls are local function calls, not network requests.
3.  **Concurrency**: WAL mode allows simultaneous readers and one writer, plenty for a personal finance app.
4.  **Simplicity**: Backups are just `cp finverse.db finverse_backup.db`.

### API Endpoint Specification (Key Endpoints)

| Method | Endpoint | Description | SQLite Interaction |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/token` | Login & Get JWT | Read `users` table (Indexed) |
| `GET` | `/dashboard/summary` | Get balance/spending | Aggr query on `transactions` |
| `GET` | `/ml/credit-score` | Get score & SHAP | Read JSON from `user_scores` |
| `POST` | `/ml/fraud-check` | Real-time check | Isolation Forest Inference + DB Log |
| `POST` | `/copilot/ask` | Chat with AI | Read context -> LLM -> Write log |
