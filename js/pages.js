/* ============================================
   FINVERSE - Page Renderers
   ============================================ */

// ---- Dashboard ----
async function renderDashboard() {
  renderCategoryList();
  renderDashboardTransactions();
  animateChart(renderSpendingTrendChart);

  if (typeof spendingAnalytics === 'undefined' || !spendingAnalytics) {
    await loadSpendingAnalytics();
  }
  if (!window.creditHealthData) {
    window.creditHealthData = await loadCreditHealth();
  }

  let totalBal = 24580, monthlyInc = 6840, monthlySpend = 4230, creditScore = 742;

  if (transactions && transactions.length > 0) {
    totalBal = transactions.reduce((sum, t) => sum + t.amount, 0);
  }
  if (typeof spendingAnalytics !== 'undefined' && spendingAnalytics && spendingAnalytics.current_month) {
    monthlyInc = spendingAnalytics.current_month.income;
    monthlySpend = spendingAnalytics.current_month.total;
  }
  if (window.creditHealthData && window.creditHealthData.score !== undefined) {
    creditScore = window.creditHealthData.score;
  }

  // Animate Stats
  animateValue(document.getElementById('totalBalance'), 0, totalBal, 1500);
  animateValue(document.getElementById('monthlyIncome'), 0, monthlyInc, 1500);
  animateValue(document.getElementById('monthlySpending'), 0, monthlySpend, 1500);
  animateValue(document.getElementById('creditScoreDashboard'), 0, creditScore, 1500);
}

function renderCategoryList() {
  const categories = getCategoryBreakdown();
  const container = document.getElementById('categoryList');
  if (!container) return;

  const colors = {
    food: '#f59e0b', transport: '#3b82f6', shopping: '#ec4899',
    bills: '#8b5cf6', health: '#ef4444', entertainment: '#06b6d4',
    income: '#10b981', other: '#64748b'
  };

  const total = categories.reduce((sum, c) => sum + Math.abs(c.amount), 0);

  container.innerHTML = categories.slice(0, 6).map(cat => `
    <div class="category-item">
      <div class="category-dot" style="background:${colors[getCategoryClass(cat.name)] || '#64748b'}"></div>
      <div class="category-info">
        <div class="category-name">${formatCategoryName(cat.name)}</div>
        <div class="category-bar">
          <div class="category-bar-fill" style="width:${(Math.abs(cat.amount) / total * 100).toFixed(0)}%;background:${colors[getCategoryClass(cat.name)] || '#64748b'}"></div>
        </div>
      </div>
      <div class="category-amount">₹${Math.abs(cat.amount).toFixed(0)}</div>
    </div>
  `).join('');
}

function renderDashboardTransactions() {
  const container = document.getElementById('dashboardTransactions');
  if (!container) return;

  container.innerHTML = transactions.slice(0, 5).map(t => `
    <tr>
      <td>${formatDate(t.date)}</td>
      <td>${t.desc}</td>
      <td><span class="tag ${getCategoryClass(t.category)}">${formatCategoryName(t.category)}</span></td>
      <td class="amount ${t.type}">${t.type === 'credit' ? '+' : ''}₹${Math.abs(t.amount).toFixed(2)}</td>
      <td><span class="tag" style="background:var(--success-bg);color:var(--success)">Completed</span></td>
    </tr>
  `).join('');
}

// ---- Transactions Page ----
function renderTransactionsPage() {
  renderAllTransactions();
}

// ---- Load Transactions from Database ----
async function loadTransactions() {
  const userStr = sessionStorage.getItem('finverse_user');
  if (!userStr) {
    console.log('No user logged in');
    transactions = [];
    return;
  }

  const user = JSON.parse(userStr);

  try {
    const response = await fetch(`${API_BASE}/api/transactions?user_id=${user.id}`);
    const data = await response.json();

    if (data.success) {
      // Convert database format to app format
      transactions = data.transactions.map(txn => ({
        date: txn.txn_date,
        desc: txn.description,
        category: txn.category,
        amount: txn.txn_type === 'income' ? Math.abs(txn.amount) : -Math.abs(txn.amount),
        type: txn.txn_type === 'income' ? 'credit' : 'debit'
      }));
      console.log(`Loaded ${transactions.length} transactions from database`);
    } else {
      console.error('Failed to load transactions:', data.message);
      transactions = [];
    }
  } catch (error) {
    console.error('Load transactions error:', error);
    transactions = [];
  }
}

function renderAllTransactions(filter = 'all') {
  const container = document.getElementById('allTransactions');
  const countEl = document.getElementById('txnCount');
  if (!container) return;

  let filtered = transactions;
  if (filter === 'debit') filtered = transactions.filter(t => t.type === 'debit');
  if (filter === 'credit') filtered = transactions.filter(t => t.type === 'credit');

  if (countEl) countEl.textContent = `${filtered.length} transactions`;

  container.innerHTML = filtered.map(t => `
    <tr>
      <td>${formatDate(t.date)}</td>
      <td>${t.desc}</td>
      <td><span class="tag ${getCategoryClass(t.category)}">${formatCategoryName(t.category)}</span></td>
      <td class="amount ${t.type}">${t.type === 'credit' ? '+' : '-'}₹${Math.abs(t.amount).toFixed(2)}</td>
      <td>${t.type === 'credit' ? 'Income' : 'Expense'}</td>
    </tr>
  `).join('');
}

function filterTransactions(filter) {
  document.querySelectorAll('#page-transactions .card-action-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  renderAllTransactions(filter);
}

async function addTransaction(e) {
  e.preventDefault();

  const date = document.getElementById('txnDate').value;
  const desc = document.getElementById('txnDesc').value;
  const category = document.getElementById('txnCategory').value;
  const amount = parseFloat(document.getElementById('txnAmount').value);

  // Get user info from session
  const userStr = sessionStorage.getItem('finverse_user');
  if (!userStr) {
    alert('Please log in to add transactions.');
    return;
  }
  const user = JSON.parse(userStr);

  // Determine transaction type
  const isIncome = category === 'income';
  const txnType = isIncome ? 'income' : 'expense';
  const txnAmount = Math.abs(amount);

  try {
    const response = await fetch(`${API_BASE}/api/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        date: date,
        description: desc,
        category: category,
        amount: txnAmount,
        type: txnType
      })
    });

    const data = await response.json();

    if (data.success) {
      // Clear form
      document.getElementById('txnDesc').value = '';
      document.getElementById('txnAmount').value = '';

      // Reload transactions and refresh all pages
      await loadTransactions();
      renderAllPages();

      // Show success message
      alert('Transaction added successfully!');
    } else {
      alert(data.message || 'Failed to add transaction.');
    }
  } catch (error) {
    console.error('Add transaction error:', error);
    alert('Unable to connect to server. Please try again.');
  }
}

function generateDemoData() {
  const cats = ['food', 'transport', 'shopping', 'bills', 'entertainment', 'health'];
  const descs = {
    food: ['McDonalds', 'Trader Joes', 'Pizza Hut', 'Chipotle', 'Subway'],
    transport: ['Uber Ride', 'Lyft', 'Gas Station', 'Parking', 'Bus Pass'],
    shopping: ['Amazon', 'Target', 'Walmart', 'Best Buy', 'IKEA'],
    bills: ['Water Bill', 'Internet', 'Rent', 'Insurance', 'Phone Plan'],
    entertainment: ['Netflix', 'Spotify', 'Movie Theater', 'Concert', 'Game Purchase'],
    health: ['CVS Pharmacy', 'Doctor Visit', 'Gym Fee', 'Dentist', 'Vitamins']
  };

  for (let i = 0; i < 15; i++) {
    const cat = cats[Math.floor(Math.random() * cats.length)];
    const desc = descs[cat][Math.floor(Math.random() * descs[cat].length)];
    const amount = -(Math.random() * 200 + 5).toFixed(2);
    const day = Math.floor(Math.random() * 28) + 1;
    const date = `2026-01-${String(day).padStart(2, '0')}`;

    transactions.push({ date, desc, category: cat, amount: parseFloat(amount), type: 'debit' });
  }

  // Sort by date
  transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
  renderAllPages();
}

async function handleCSVUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const userStr = sessionStorage.getItem('finverse_user');
  if (!userStr) {
    alert('Please log in to import transactions.');
    return;
  }
  const user = JSON.parse(userStr);

  const reader = new FileReader();
  reader.onload = async function (e) {
    const text = e.target.result;
    const lines = text.split('\n');
    const importedTransactions = [];

    // Skip header and process lines
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(',');
      if (parts.length >= 4) {
        // Expected CSV: Date(YYYY-MM-DD), Description, Category, Amount
        const date = parts[0].trim();
        const desc = parts[1].trim();
        const category = parts[2].trim().toLowerCase() || 'other';
        const amount = parseFloat(parts[3]);

        importedTransactions.push({
          date: date,
          description: desc,
          category: category,
          amount: Math.abs(amount),
          type: amount >= 0 ? 'income' : 'expense'
        });
      }
    }

    if (importedTransactions.length === 0) {
      alert('No valid transactions found in CSV.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/transactions/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          transactions: importedTransactions
        })
      });

      const data = await response.json();
      if (data.success) {
        alert(`Successfully imported ${data.count} transactions!`);
        await loadTransactions();
        renderAllPages();
      } else {
        alert('Import failed: ' + data.message);
      }
    } catch (error) {
      console.error('CSV Import Error:', error);
      alert('Error connecting to server during import.');
    }
  };
  reader.readAsText(file);
  
  // Reset input
  event.target.value = '';
}

// ---- Spending Analysis ----
let spendingAnalytics = null;

async function loadSpendingAnalytics() {
  const userStr = sessionStorage.getItem('finverse_user');
  if (!userStr) {
    console.log('No user logged in');
    return null;
  }

  const user = JSON.parse(userStr);

  try {
    const response = await fetch(`${API_BASE}/api/analytics/spending?user_id=${user.id}`);
    const data = await response.json();

    if (data.success) {
      spendingAnalytics = data;
      console.log('Loaded spending analytics:', data);
      return data;
    } else {
      console.error('Failed to load analytics:', data.message);
      return null;
    }
  } catch (error) {
    console.error('Load analytics error:', error);
    return null;
  }
}

async function renderSpendingPage() {
  // Load analytics data
  await loadSpendingAnalytics();

  // Update stat cards with real data
  if (spendingAnalytics) {
    updateSpendingStats();
  }

  // Render charts
  animateChart(renderMonthlySpendChart);
  animateChart(renderCategoryPieChart);
  renderLifestylePatterns();
}

function updateSpendingStats() {
  if (!spendingAnalytics) return;

  const stats = document.querySelectorAll('#page-spending .stat-card-value');
  if (stats.length >= 4) {
    // This Month
    stats[0].textContent = `₹${spendingAnalytics.current_month.total.toLocaleString()}`;

    // Monthly Average
    stats[1].textContent = `₹${spendingAnalytics.monthly_average.toLocaleString()}`;

    // Savings This Month
    stats[2].textContent = `₹${spendingAnalytics.savings_this_month.toLocaleString()}`;

    // Overspend Alerts
    stats[3].textContent = spendingAnalytics.overspend_alerts;
  }

  // Update change percentage
  const changeEl = document.querySelector('#page-spending .stat-card-change');
  if (changeEl && spendingAnalytics.current_month.change_percent !== undefined) {
    const change = spendingAnalytics.current_month.change_percent;
    changeEl.textContent = `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
    changeEl.className = `stat-card-change ${change > 0 ? 'up' : 'down'}`;
  }
}

function renderLifestylePatterns() {
  const container = document.getElementById('lifestylePatterns');
  if (!container) return;

  // Use patterns from analytics API if available
  const patterns = spendingAnalytics && spendingAnalytics.lifestyle_patterns.length > 0
    ? spendingAnalytics.lifestyle_patterns
    : [
      { icon: 'alert', label: 'No Data Available', desc: 'Add more transactions to see personalized spending patterns.', severity: 'info' }
    ];

  container.innerHTML = patterns.map(p => `
    <div class="alert-card ${p.severity === 'warning' ? 'warning' : 'info'}" style="margin-bottom:12px">
      <div class="alert-icon ${p.severity === 'warning' ? 'warning' : 'info'}">
        ${p.severity === 'warning'
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'
    }
      </div>
      <div class="alert-content">
        <div class="alert-title">${p.label}</div>
        <div class="alert-desc">${p.desc}</div>
      </div>
    </div>
  `).join('');
}

// ---- Forecast Page ----
async function renderForecastPage() {
  try {
    const response = await fetch(`${API_BASE}/api/analytics/forecast`);
    const data = await response.json();
    
    if (data.success) {
      // Update Summary Cards
      const sm = data.summary;
      const cur = sm.currency || '₹';
      document.getElementById('forecastNextMonth').textContent = `${cur}${sm.predicted_next_month.toLocaleString()}`;
      
      const changeEl = document.getElementById('forecastChange');
      const isUp = sm.change_vs_current > 0;
      changeEl.textContent = `${isUp ? '+' : ''}${sm.change_vs_current}% vs current`;
      changeEl.style.color = isUp ? 'var(--danger)' : 'var(--success)';
      
      if (data.category_level_forecast && data.category_level_forecast.length > 0) {
        document.getElementById('forecastHighCatVal').textContent = `${cur}${data.category_level_forecast[0].predicted_amount.toLocaleString()}`;
        document.getElementById('forecastHighCatName').textContent = data.category_level_forecast[0].category;
      }
      
      document.getElementById('forecastSavings').textContent = `${cur}${sm.savings_forecast.toLocaleString()}`;
      const savingsStatus = document.getElementById('forecastSavingsStatus');
      savingsStatus.textContent = sm.change_vs_current > 10 ? 'At Risk' : 'On track';
      savingsStatus.style.color = sm.change_vs_current > 10 ? 'var(--warning)' : 'var(--success)';
      
      // Pass data to renderers
      window.forecastData = data.chart_data;
      animateChart(renderForecastChart);
      renderCategoryForecast(data.category_level_forecast);
      renderBudgetRecommendations(data.recommendations);
    } else {
      console.warn("Forecast data not available:", data.message);
      renderCategoryForecast(null);
      renderBudgetRecommendations(null);
      animateChart(renderForecastChart);
    }
  } catch (err) {
    console.error("Forecast fetch error", err);
    renderCategoryForecast(null);
    renderBudgetRecommendations(null);
    animateChart(renderForecastChart);
  }
}

function renderCategoryForecast(categories) {
  const container = document.getElementById('categoryForecast');
  if (!container) return;

  // Use AI data or fallback
  let forecasts = categories;
  if (!forecasts || forecasts.length === 0) {
    forecasts = [
      { category: 'Housing & Bills', predicted_amount: 1340, change_percentage: 12.5 },
      { category: 'Food & Dining', predicted_amount: 910, change_percentage: 5.2 },
      { category: 'Healthcare', predicted_amount: 200, change_percentage: -2.1 },
    ];
  }
  
  const colors = ['#8b5cf6', '#f59e0b', '#ec4899', '#3b82f6', '#06b6d4', '#ef4444'];

  container.innerHTML = forecasts.map((f, i) => {
    const c = colors[i % colors.length];
    const change = parseFloat(f.change_percentage).toFixed(1);
    const isUp = f.change_percentage > 0;
    // Cap max width at 100%
    const barWidth = Math.min((parseFloat(f.predicted_amount) / 2000 * 100).toFixed(0), 100);
    return `
      <div class="category-item" style="margin-bottom:16px">
        <div class="category-dot" style="background:${c}"></div>
        <div class="category-info">
          <div class="category-name">${f.category}</div>
          <div class="category-bar">
            <div class="category-bar-fill" style="width:${barWidth}%;background:${c}"></div>
          </div>
        </div>
        <div style="text-align:right;min-width:80px">
          <div class="category-amount">₹${Math.round(f.predicted_amount)}</div>
          <div style="font-size:0.7rem;color:${isUp ? 'var(--danger)' : 'var(--success)'}">${isUp ? '+' : ''}${change}%</div>
        </div>
      </div>
    `;
  }).join('');
}

function renderBudgetRecommendations(recommendations) {
  const container = document.getElementById('budgetRecs');
  if (!container) return;

  const recs = recommendations || [
    { title: 'Reduce dining expenses by 15%', desc: 'Cooking at home 3 more days/week could save ~$140/month based on your patterns.', action: 'Set Budget' },
    { title: 'Emergency fund target', desc: 'You\'re at 72% of recommended 6-month emergency fund. Keep saving!', action: 'Track' },
  ];

  container.innerHTML = recs.map(r => `
    <div style="padding:16px;background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
        <div>
          <div style="font-size:0.88rem;font-weight:600;margin-bottom:4px;">${r.title}</div>
          <div style="font-size:0.78rem;color:var(--text-secondary);line-height:1.5;">${r.desc}</div>
        </div>
        <button class="card-action-btn" style="white-space:nowrap;">${r.action}</button>
      </div>
    </div>
  `).join('');
}

// ---- Credit Health ----
async function loadCreditHealth() {
  const userStr = sessionStorage.getItem('finverse_user');
  if (!userStr) return null;
  const user = JSON.parse(userStr);
  try {
    const response = await fetch(`${API_BASE}/api/analytics/credit-health?user_id=${user.id}`);
    const data = await response.json();
    if (data.success) {
      console.log('Credit health loaded:', data);
      return data;
    } else {
      console.error('Credit health API error:', data.message);
      return null;
    }
  } catch (err) {
    console.error('Credit health fetch error:', err);
    return null;
  }
}

async function renderCreditPage() {
  // Show loading state
  const scoreEl = document.getElementById('creditScoreValue');
  if (scoreEl) scoreEl.textContent = '...';

  const creditData = await loadCreditHealth();

  if (creditData) {
    animateCreditScore(creditData.score, creditData.rating, creditData.rating_cls);
    renderCreditFactors(creditData.factors);
    renderRiskIndicators(creditData.risk_indicators);
    // Pass trend data to chart
    window.creditHealthData = creditData;
    renderCreditHistory(creditData.trend);
  } else {
    // Fallback to static values if API fails
    animateCreditScore(742, 'Good', 'good');
    renderCreditFactors(null);
    renderRiskIndicators(null);
    renderCreditHistory(null);
  }
  animateChart(renderCreditTrendChart);
}

function animateCreditScore(score, rating, ratingCls) {
  const ring = document.getElementById('creditRingFill');
  const valueEl = document.getElementById('creditScoreValue');
  const ratingEl = document.getElementById('creditRating');
  if (!ring || !valueEl) return;

  const circumference = 2 * Math.PI * 85;
  const offset = circumference - (score / 900) * circumference;

  setTimeout(() => {
    ring.style.strokeDashoffset = offset;
  }, 200);

  // Animate number
  let current = 0;
  const duration = 1500;
  const step = score / (duration / 16);

  function animate() {
    current += step;
    if (current >= score) {
      current = score;
      valueEl.textContent = Math.round(current);
      return;
    }
    valueEl.textContent = Math.round(current);
    requestAnimationFrame(animate);
  }
  animate();

  // Set rating
  if (!rating) {
    if (score >= 800) { rating = 'Excellent'; ratingCls = 'excellent'; }
    else if (score >= 650) { rating = 'Good'; ratingCls = 'good'; }
    else if (score >= 500) { rating = 'Fair'; ratingCls = 'fair'; }
    else { rating = 'Poor'; ratingCls = 'poor'; }
  }

  if (ratingEl) {
    ratingEl.textContent = rating;
    ratingEl.className = 'credit-score-rating ' + (ratingCls || 'good');
  }
}

function renderCreditFactors(factors) {
  const container = document.getElementById('creditFactors');
  if (!container) return;

  // Use API data if available, otherwise fallback
  const displayFactors = factors || [
    { title: 'Spending Discipline', value: '—', pct: 0, color: 'var(--text-muted)' },
    { title: 'Income Stability', value: '—', pct: 0, color: 'var(--text-muted)' },
    { title: 'Debt Signals', value: '—', pct: 0, color: 'var(--text-muted)' },
    { title: 'Savings Rate', value: '—', pct: 0, color: 'var(--text-muted)' },
  ];

  container.innerHTML = displayFactors.map(f => `
    <div class="credit-factor">
      <div class="credit-factor-title">${f.title}</div>
      <div class="credit-factor-value">${f.value}${f.score !== undefined ? ` <span style="font-size:0.7rem;color:var(--text-muted)">(${f.score}/${f.max} pts)</span>` : ''}</div>
      <div class="credit-factor-bar">
        <div class="credit-factor-bar-fill" style="width:${f.pct}%;background:${f.color}"></div>
      </div>
    </div>
  `).join('');
}

function renderRiskIndicators(indicators) {
  const container = document.getElementById('riskIndicators');
  if (!container) return;

  // Use API data if available, otherwise fallback
  const displayIndicators = indicators || [
    { label: 'Spending Volatility', status: 'Loading...', color: 'var(--text-muted)', desc: 'Fetching data from server.' },
    { label: 'Income Stability', status: 'Loading...', color: 'var(--text-muted)', desc: 'Fetching data from server.' },
    { label: 'Debt Signals', status: 'Loading...', color: 'var(--text-muted)', desc: 'Fetching data from server.' },
    { label: 'Savings Rate', status: 'Loading...', color: 'var(--text-muted)', desc: 'Fetching data from server.' },
    { label: 'Spending Discipline', status: 'Loading...', color: 'var(--text-muted)', desc: 'Fetching data from server.' },
  ];

  container.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;">
    ${displayIndicators.map(ind => `
      <div style="padding:16px;background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-sm);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span style="font-size:0.85rem;font-weight:600;">${ind.label}</span>
          <span style="font-size:0.75rem;font-weight:700;color:${ind.color};">${ind.status}</span>
        </div>
        <div style="font-size:0.78rem;color:var(--text-secondary);line-height:1.5;">${ind.desc}</div>
      </div>
    `).join('')}
  </div>`;
}

function renderCreditHistory(trendData) {
  const container = document.getElementById('creditHistoryList');
  if (!container) return;
  
  // Use API trend or fallback 12 months array
  let trend = trendData;
  if (!trend || trend.length === 0) {
    trend = [
      { month: '2025-03', score: 680 }, { month: '2025-04', score: 685 }, { month: '2025-05', score: 692 },
      { month: '2025-06', score: 698 }, { month: '2025-07', score: 705 }, { month: '2025-08', score: 710 },
      { month: '2025-09', score: 718 }, { month: '2025-10', score: 722 }, { month: '2025-11', score: 728 },
      { month: '2025-12', score: 735 }, { month: '2026-01', score: 738 }, { month: '2026-02', score: 742 }
    ];
  }
  
  // We want to show a scrolling list, reversed so the newest month is on top
  const sortedTrend = [...trend].reverse();

  let html = `
    <div style="display:flex;flex-direction:column;gap:8px;max-height:300px;overflow-y:auto;padding-right:8px;" class="custom-scrollbar">
      <div style="display:flex;justify-content:space-between;padding:0 12px 8px;font-size:0.75rem;color:var(--text-muted);font-weight:600;border-bottom:1px solid var(--border);">
        <div style="flex:1;">MONTH</div>
        <div style="width:80px;text-align:right;">RATING</div>
        <div style="width:80px;text-align:right;">SCORE</div>
        <div style="width:80px;text-align:right;">TREND</div>
      </div>
  `;

  for (let i = 0; i < sortedTrend.length; i++) {
    const current = sortedTrend[i];
    // Find the previous month's score chronologically (which is index i+1 in this reversed array)
    const prevScore = (i + 1 < sortedTrend.length) ? sortedTrend[i + 1].score : current.score;
    const diff = Math.round(current.score) - Math.round(prevScore);
    
    // Parse date for nice string
    const dateParts = current.month.split('-');
    const dt = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1);
    const monthName = dt.toLocaleString('default', { month: 'short', year: 'numeric' });
    
    // Determine Rating Badge
    let rating = 'Poor', ratingColor = 'var(--danger)';
    if (current.score >= 800)      { rating = 'Excellent'; ratingColor = 'var(--success)'; }
    else if (current.score >= 650) { rating = 'Good'; ratingColor = 'var(--info)'; }
    else if (current.score >= 500) { rating = 'Fair'; ratingColor = 'var(--warning)'; }

    // Change indicator text
    let diffHtml = `<span style="color:var(--text-muted);">—</span>`;
    if (diff > 0) diffHtml = `<span style="color:var(--success);font-weight:600;">+${diff} <svg style="width:12px;display:inline;vertical-align:middle;margin-top:-2px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg></span>`;
    if (diff < 0) diffHtml = `<span style="color:var(--danger);font-weight:600;">${diff} <svg style="width:12px;display:inline;vertical-align:middle;margin-top:-2px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg></span>`;

    html += `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:var(--bg-panel);border-radius:var(--radius-sm);border:1px solid transparent;transition:border-color 0.2s;" onmouseover="this.style.borderColor='var(--border)'" onmouseout="this.style.borderColor='transparent'">
        <div style="flex:1;font-weight:500;font-size:0.85rem;color:var(--text-primary);">${monthName}</div>
        <div style="width:80px;text-align:right;">
          <span style="font-size:0.7rem;padding:2px 6px;border-radius:12px;background:${ratingColor}20;color:${ratingColor};font-weight:600;">${rating}</span>
        </div>
        <div style="width:80px;text-align:right;font-weight:700;font-size:0.9rem;color:var(--text-primary);">${Math.round(current.score)}</div>
        <div style="width:80px;text-align:right;font-size:0.8rem;">${diffHtml}</div>
      </div>
    `;
  }
  
  html += `</div>`;
  container.innerHTML = html;
}


// ---- Anomaly Detection ----
async function renderAnomalyPage() {
  const container = document.getElementById('anomalyAlerts');
  if (container) container.innerHTML = '<p style="color:var(--text-muted);padding:24px;">🔍 Running Isolation Forest model...</p>';

  const userStr = sessionStorage.getItem('finverse_user');
  if (!userStr) return;
  const user = JSON.parse(userStr);

  try {
    const response = await fetch(`${API_BASE}/api/analytics/anomaly?user_id=${user.id}`);
    const data = await response.json();

    if (!data.success) {
      if (container) container.innerHTML = `<p style="color:var(--danger);padding:24px;">⚠️ ${data.message}</p>`;
      return;
    }

    // Update stat cards
    const countEl = document.getElementById('anomalyCount');
    const amountEl = document.getElementById('anomalyTotalAmount');
    const rateEl = document.getElementById('anomalyRate');
    if (countEl) countEl.textContent = data.anomaly_count;
    if (amountEl) amountEl.textContent = `₹${data.total_anomaly_amount.toLocaleString()}`;
    if (rateEl) rateEl.textContent = `${data.anomaly_rate}%`;

    // Update sidebar badge
    const badge = document.querySelector('[data-page="anomaly"] .badge');
    if (badge) badge.textContent = data.anomaly_count;

    // Render alert cards
    renderAnomalyAlerts(data.anomalies);

    // Pass amounts to the chart
    window.anomalyData = data;
    animateChart(renderAnomalyChart);

  } catch (err) {
    console.error('Anomaly detection error:', err);
    if (container) container.innerHTML = '<p style="color:var(--danger);padding:24px;">⚠️ Failed to connect to anomaly detection service.</p>';
  }
}

function renderAnomalyAlerts(anomalies) {
  const container = document.getElementById('anomalyAlerts');
  if (!container) return;

  const criticalSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
  const warningSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';

  if (!anomalies || anomalies.length === 0) {
    container.innerHTML = '<p style="color:var(--success);padding:24px;text-align:center;">✅ No anomalies detected in your transaction history.</p>';
    return;
  }

  container.innerHTML = anomalies.map((a, idx) => `
    <div class="alert-card ${a.severity}" id="anomaly-card-${idx}" style="transition:opacity 0.4s,transform 0.4s;">
      <div class="alert-icon ${a.severity}">
        ${a.severity === 'critical' ? criticalSvg : warningSvg}
      </div>
      <div class="alert-content">
        <div class="alert-title">${a.severity === 'critical' ? '🚨' : '⚠️'} Unusual ${formatCategoryName(getCategoryClass(a.category))} Transaction</div>
        <div class="alert-desc">"${a.description}" was flagged as statistically unusual. Amount ₹${a.amount.toLocaleString()} deviates significantly from your normal ${a.category} spending pattern. ML Score: ${a.anomaly_score}.</div>
        <div class="alert-meta">
          <span>${formatDate(a.date)}</span>
          <span class="tag ${getCategoryClass(a.category)}">${formatCategoryName(getCategoryClass(a.category))}</span>
          <span style="color:var(--danger);font-weight:600;">₹${a.amount.toLocaleString()}</span>
        </div>
        <div id="anomaly-detail-${idx}" style="display:none;margin-top:14px;padding:14px;background:rgba(255,255,255,0.04);border-radius:10px;border:1px solid rgba(255,255,255,0.08);font-size:0.82rem;line-height:1.8;color:var(--text-secondary);">
          <strong style="color:var(--text-primary);display:block;margin-bottom:8px;">🔎 Full Review Details</strong>
          <div><b>Date & Time:</b> ${a.date} (${new Date(a.date).toLocaleDateString('en-IN', { weekday: 'long' })})</div>
          <div><b>Description:</b> ${a.description}</div>
          <div><b>Category:</b> ${a.category}</div>
          <div><b>Amount:</b> ₹${a.amount.toLocaleString()}</div>
          <div><b>Severity:</b> <span style="color:${a.severity === 'critical' ? 'var(--danger)' : 'var(--warning)'};font-weight:600;text-transform:uppercase;">${a.severity}</span></div>
          <div><b>Isolation Forest Score:</b> ${a.anomaly_score} <span style="color:var(--text-muted);font-size:0.78rem;">(lower = more anomalous; threshold ≈ −0.1)</span></div>
          <div style="margin-top:8px;padding:8px 12px;background:rgba(255,59,59,0.08);border-left:3px solid var(--danger);border-radius:4px;">
            <b>Why flagged:</b> This transaction's combination of amount, time-of-day, and category is statistically rare compared to your historical spending baseline.
          </div>
        </div>
      </div>
      <div class="alert-actions">
        <button class="alert-action-btn" onclick="toggleAnomalyReview(${idx}, this)">Review</button>
        <button class="alert-action-btn dismiss" onclick="dismissAnomalyCard(${idx})">Dismiss</button>
      </div>
    </div>
  `).join('');
}

function toggleAnomalyReview(idx, btn) {
  const detail = document.getElementById(`anomaly-detail-${idx}`);
  if (!detail) return;
  const isOpen = detail.style.display !== 'none';
  detail.style.display = isOpen ? 'none' : 'block';
  btn.textContent = isOpen ? 'Review' : 'Close';
  btn.style.background = isOpen ? '' : 'rgba(59,130,246,0.15)';
  btn.style.color = isOpen ? '' : 'var(--accent-blue, #3b82f6)';
}

function dismissAnomalyCard(idx) {
  const card = document.getElementById(`anomaly-card-${idx}`);
  if (!card) return;
  card.style.opacity = '0';
  card.style.transform = 'translateX(40px)';
  setTimeout(() => {
    card.remove();
    // Update the badge and count
    const remaining = document.querySelectorAll('[id^="anomaly-card-"]').length;
    const countEl = document.getElementById('anomalyCount');
    const badge = document.querySelector('[data-page="anomaly"] .badge');
    if (countEl) countEl.textContent = remaining;
    if (badge) badge.textContent = remaining;
    if (remaining === 0) {
      const container = document.getElementById('anomalyAlerts');
      if (container) container.innerHTML = '<p style="color:var(--success);padding:24px;text-align:center;">✅ All anomalies reviewed and dismissed.</p>';
    }
  }, 400);
}


// ---- Financial News ----
let _newsApiData = null;   // session cache

async function renderNewsPage() {
  const grid    = document.getElementById('newsGrid');
  const summary = document.getElementById('newsSummaryBar');

  if (summary) summary.innerHTML = '';

  // Use cached data from this session
  if (_newsApiData) {
    _applyNewsData(_newsApiData);
    return;
  }

  // ── Step 1: Poll /api/news/status until FinBERT model is ready ──
  const setLoading = (msg) => {
    if (grid) grid.innerHTML = `
      <div style="grid-column:1/-1;display:flex;flex-direction:column;align-items:center;
                  justify-content:center;gap:18px;padding:60px 20px;">
        <div style="width:48px;height:48px;border:3px solid var(--border);
                    border-top-color:var(--accent);border-radius:50%;
                    animation:spin 0.9s linear infinite;"></div>
        <div style="font-size:0.9rem;color:var(--text-secondary);text-align:center;">${msg}</div>
      </div>`;
  };

  setLoading('Checking FinBERT model status…');

  let modelReady = false;
  let pollErrors = 0;
  while (!modelReady) {
    try {
      const statusResp = await fetch(`${API_BASE}/api/news/status`);
      const statusData = await statusResp.json();
      if (statusData.ready) {
        modelReady = true;
        if (statusData.error) {
          _showNewsFallback(`FinBERT failed to load: ${statusData.error}`);
          return;
        }
      } else {
        setLoading('⚙️ Loading FinBERT AI model… This takes ~30s on first run.<br>' +
                   '<span style="font-size:0.78rem;color:var(--text-muted);">The model is ~500 MB and only loads once per server session.</span>');
        await new Promise(r => setTimeout(r, 3000));
      }
    } catch (e) {
      pollErrors++;
      if (pollErrors > 5) {
        _showNewsFallback('Cannot reach the server. Showing cached articles.');
        return;
      }
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  // ── Step 2: Fetch live news with a generous timeout ──
  setLoading('🔍 Fetching live financial news from 4 sources…<br>' +
             '<span style="font-size:0.78rem;color:var(--text-muted);">Running FinBERT sentiment analysis on each headline.</span>');


  try {
    const userStr = sessionStorage.getItem('finverse_user');
    const user    = userStr ? JSON.parse(userStr) : null;
    const userId  = user ? user.id : 1; // fallback to 1

    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 300000); // 5 min

    const resp = await fetch(`${API_BASE}/api/news/sentiment?max=30&user_id=${userId}`, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const data = await resp.json();

    if (data.loading) {
      // Model not ready yet (race condition) — retry once after 5s
      await new Promise(r => setTimeout(r, 5000));
      _newsApiData = null;
      renderNewsPage();
      return;
    }

    if (data.success && data.articles && data.articles.length > 0) {
      newsData = data.articles.map(a => ({
        source   : a.source,
        title    : a.title,
        excerpt  : a.excerpt,
        sentiment: a.sentiment,
        time     : a.time,
        category : a.category,
        score    : a.score,
        url      : a.url || '',
      }));
      _newsApiData = data;
      _applyNewsData(data);
    } else {
      _showNewsFallback(data.message || 'Could not load live news; showing cached articles.');
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      _showNewsFallback('Request timed out. Showing cached articles. Try refreshing.');
    } else {
      console.error('News fetch error:', err);
      _showNewsFallback('Server unreachable — showing cached articles.');
    }
  }
}

function _applyNewsData(data) {
  // Build sentiment summary bar
  const summary = document.getElementById('newsSummaryBar');
  if (summary && data.sentiment_counts) {
    const total = data.total || 1;
    const sc    = data.sentiment_counts;
    const pPos  = Math.round(sc.positive / total * 100);
    const pNeu  = Math.round(sc.neutral  / total * 100);
    const pNeg  = 100 - pPos - pNeu;

    const sentimentColor = {
      positive: 'var(--success)', neutral: 'var(--warning)', negative: 'var(--danger)'
    };
    const sentimentEmoji = { positive: '📈', neutral: '➡️', negative: '📉' };
    const overall        = data.overall_sentiment || 'neutral';


    summary.innerHTML = `
      <div class="news-mood-card">
        <div class="mood-header">
          <div class="mood-title">
            <span class="mood-emoji">${sentimentEmoji[overall]}</span>
            <div>
              <div class="mood-label">Current Market Mood</div>
              <div class="mood-value ${overall}">${overall.toUpperCase()}</div>
            </div>
          </div>
          <button class="refresh-btn" onclick="_refreshNews()">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
            Refresh
          </button>
        </div>
        
        <div class="mood-stats">
          <div class="mood-bar-container">
            <div class="mood-bar">
              <div class="bar-segment pos" style="width:${pPos}%"></div>
              <div class="bar-segment neu" style="width:${pNeu}%"></div>
              <div class="bar-segment neg" style="width:${pNeg}%"></div>
            </div>
            <div class="mood-legend">
              <div class="legend-item"><span class="dot pos"></span> ${pPos}% Positive</div>
              <div class="legend-item"><span class="dot neu"></span> ${pNeu}% Neutral</div>
              <div class="legend-item"><span class="dot neg"></span> ${pNeg}% Negative</div>
            </div>
          </div>
          <div class="mood-trending">
            <div class="mood-label">Trending Sector</div>
            <div class="trending-value">${data.trending_category || 'General Market'}</div>
          </div>
        </div>

        ${data.recommendation ? `
          <div class="mood-ai-insight">
            <div class="ai-tag">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z"/></svg>
              FINBERT SENTIMENT ANALYSIS
            </div>

            <p>${data.recommendation}</p>
          </div>
        ` : ''}
      </div>
    `;

  }

  renderNewsGrid('all');
}

function _showNewsFallback(msg) {
  const summary = document.getElementById('newsSummaryBar');
  if (summary) {
    summary.innerHTML = `
      <div style="padding:10px 14px;background:rgba(251,191,36,0.08);
                  border:1px solid rgba(251,191,36,0.25);border-radius:var(--radius-sm);
                  font-size:0.82rem;color:var(--warning);margin-bottom:16px;">
        ⚠️ ${msg}
      </div>`;
  }
  renderNewsGrid('all');   // render static fallback
}

function _refreshNews() {
  _newsApiData = null;   // clear cache
  renderNewsPage();
}

function renderNewsGrid(filter) {
  const container = document.getElementById('newsGrid');
  if (!container) return;

  const filtered = filter === 'all' ? newsData : newsData.filter(n => n.sentiment === filter);

  const icons = {
    positive: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>',
    negative: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>',
    neutral : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="5" y1="12" x2="19" y2="12"></line></svg>'
  };

  if (filtered.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted);padding:40px;text-align:center;
                            grid-column:1/-1;">No ${filter} news articles found.</p>`;
    return;
  }


  container.innerHTML = filtered.map(n => {
    const scoreVal = n.score ? (n.score * 100).toFixed(0) : '—';
    const sentimentClass = (n.sentiment || 'neutral').toLowerCase();
    
    return `
      <div class="news-card ${sentimentClass}">
        <div class="news-card-header">
          <div class="news-badge ${sentimentClass}">
            ${icons[sentimentClass] || icons.neutral}
            ${(n.sentiment || 'NEUTRAL').toUpperCase()}
          </div>
          <div class="news-score" title="FinBERT Sentiment Confidence">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v10m0 0l-3-3m3 3l3-3"></path><path d="M22 12A10 10 0 1 1 12 2"></path>
            </svg>
            ${scoreVal}%
          </div>
        </div>
        
        <h3 class="news-card-title">${n.title}</h3>
        <p class="news-card-excerpt">${n.excerpt || ''}</p>
        
        <div class="news-card-footer">
          <div class="news-meta">
            <span class="news-source">
              <span class="source-icon">${(n.source || 'N').charAt(0)}</span>
              ${n.source || 'News'}
            </span>
            <span class="news-time">${n.time || 'Live'}</span>
          </div>
          ${n.url ? `<a href="${n.url}" target="_blank" class="news-link">
            Read More
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>` : ''}
        </div>
      </div>
    `;
  }).join('');

}

function filterNews(filter) {
  document.querySelectorAll('#page-news .card-action-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  renderNewsGrid(filter);
}
