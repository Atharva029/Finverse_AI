/* ============================================
   FINVERSE - Data & Configuration
   ============================================ */

// ---- Demo Transaction Data ----
const demoTransactions = [
    { date: '2026-02-11', desc: 'Whole Foods Market', category: 'food', amount: -78.54, type: 'debit' },
    { date: '2026-02-10', desc: 'Uber Ride', category: 'transport', amount: -24.30, type: 'debit' },
    { date: '2026-02-10', desc: 'Netflix Subscription', category: 'entertainment', amount: -15.99, type: 'debit' },
    { date: '2026-02-09', desc: 'Salary Deposit', category: 'income', amount: 6840.00, type: 'credit' },
    { date: '2026-02-09', desc: 'Amazon Purchase', category: 'shopping', amount: -156.78, type: 'debit' },
    { date: '2026-02-08', desc: 'Electric Bill', category: 'bills', amount: -142.50, type: 'debit' },
    { date: '2026-02-08', desc: 'Starbucks Coffee', category: 'food', amount: -6.45, type: 'debit' },
    { date: '2026-02-07', desc: 'Gym Membership', category: 'health', amount: -49.99, type: 'debit' },
    { date: '2026-02-07', desc: 'Gas Station', category: 'transport', amount: -45.20, type: 'debit' },
    { date: '2026-02-06', desc: 'Freelance Payment', category: 'income', amount: 1200.00, type: 'credit' },
    { date: '2026-02-06', desc: 'Target Shopping', category: 'shopping', amount: -89.34, type: 'debit' },
    { date: '2026-02-05', desc: 'Restaurant Dinner', category: 'food', amount: -64.80, type: 'debit' },
    { date: '2026-02-05', desc: 'Phone Bill', category: 'bills', amount: -85.00, type: 'debit' },
    { date: '2026-02-04', desc: 'Costco Wholesale', category: 'shopping', amount: -234.56, type: 'debit' },
    { date: '2026-02-04', desc: 'Pharmacy CVS', category: 'health', amount: -32.15, type: 'debit' },
    { date: '2026-02-03', desc: 'Spotify Premium', category: 'entertainment', amount: -10.99, type: 'debit' },
    { date: '2026-02-03', desc: 'Chipotle', category: 'food', amount: -12.75, type: 'debit' },
    { date: '2026-02-02', desc: 'Rent Payment', category: 'bills', amount: -1850.00, type: 'debit' },
    { date: '2026-02-01', desc: 'Internet Bill', category: 'bills', amount: -79.99, type: 'debit' },
    { date: '2026-02-01', desc: 'Uber Eats', category: 'food', amount: -34.50, type: 'debit' },
    { date: '2026-01-31', desc: 'Dividend Income', category: 'income', amount: 245.00, type: 'credit' },
    { date: '2026-01-30', desc: 'Movie Theater', category: 'entertainment', amount: -28.00, type: 'debit' },
    { date: '2026-01-29', desc: 'Grocery Outlet', category: 'food', amount: -56.90, type: 'debit' },
    { date: '2026-01-28', desc: 'Suspicious Wire Transfer', category: 'other', amount: -2500.00, type: 'debit' },
    { date: '2026-01-27', desc: 'Car Insurance', category: 'bills', amount: -175.00, type: 'debit' },
];

// ---- News Data (static fallback — replaced by live FinBERT data at runtime) ----
let newsData = [
    {
        source: 'Bloomberg',
        title: 'Federal Reserve Signals Potential Rate Cuts in Q2 2026',
        excerpt: 'The Federal Reserve hinted at upcoming interest rate adjustments in response to cooling inflation data, potentially benefiting borrowers and mortgage seekers.',
        sentiment: 'positive',
        time: '2 hours ago',
        category: 'Monetary Policy',
        url: 'https://news.google.com/search?q=Federal+Reserve+rate+cuts+2026'
    },
    {
        source: 'Reuters',
        title: 'Tech Stocks Rally as AI Spending Surges Across Industries',
        excerpt: 'Major tech companies report strong earnings driven by increased enterprise AI adoption, with cloud computing and AI infrastructure leading growth sectors.',
        sentiment: 'positive',
        time: '4 hours ago',
        category: 'Markets',
        url: 'https://news.google.com/search?q=tech+stocks+rally+AI+spending'
    },
    {
        source: 'CNBC',
        title: 'Cryptocurrency Regulations Tighten Globally',
        excerpt: 'Multiple countries announce coordinated regulatory frameworks for digital assets, bringing more oversight to the crypto trading landscape.',
        sentiment: 'neutral',
        time: '6 hours ago',
        category: 'Regulation',
        url: 'https://news.google.com/search?q=cryptocurrency+regulations+global'
    },
    {
        source: 'Financial Times',
        title: 'Housing Market Shows Signs of Correction in Major Cities',
        excerpt: 'Real estate prices in several metropolitan areas show declining trends for the third consecutive month, raising concerns about market stability.',
        sentiment: 'negative',
        time: '8 hours ago',
        category: 'Real Estate',
        url: 'https://news.google.com/search?q=housing+market+correction+2026'
    },
    {
        source: 'Wall Street Journal',
        title: 'Small Business Lending Reaches Record Highs in 2026',
        excerpt: 'Fintech platforms and traditional banks report unprecedented small business loan volumes, indicating strong entrepreneurial activity across sectors.',
        sentiment: 'positive',
        time: '10 hours ago',
        category: 'Lending',
        url: 'https://news.google.com/search?q=small+business+lending+record+2026'
    },
    {
        source: 'MarketWatch',
        title: 'Global Supply Chain Disruptions May Impact Consumer Prices',
        excerpt: 'Ongoing logistics challenges in key shipping routes could lead to price increases for consumer goods in the coming months.',
        sentiment: 'negative',
        time: '12 hours ago',
        category: 'Economy',
        url: 'https://news.google.com/search?q=supply+chain+disruptions+consumer+prices'
    }
];

// ---- Page Config ----
const pageConfig = {
    dashboard: { title: 'Dashboard', subtitle: 'Welcome back, Alex. Here\'s your financial overview.' },
    transactions: { title: 'Transactions', subtitle: 'Manage, import, and track all your transactions.' },
    spending: { title: 'Spending Analysis', subtitle: 'Deep dive into your spending patterns and habits.' },
    forecast: { title: 'Forecasting', subtitle: 'ML-powered spending predictions and budget guidance.' },
    credit: { title: 'Credit Health', subtitle: 'Your behavior-based alternative credit assessment.' },
    anomaly: { title: 'Anomaly Detection', subtitle: 'AI-flagged unusual and potentially unsafe transactions.' },
    news: { title: 'Financial News', subtitle: 'Real-time market news with sentiment analysis.' },
    copilot: { title: 'AI Financial Copilot', subtitle: 'Your personal AI-powered financial advisor.' }
};
