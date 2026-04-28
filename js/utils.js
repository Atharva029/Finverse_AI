/* ============================================
   FINVERSE - Utility & Animation Functions
   ============================================ */

function setTodayDate() {
    const dateInput = document.getElementById('txnDate');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
}

// ---- Animation Utilities ----

function animateChart(renderFn, duration = 1500) {
    const start = performance.now();

    function frame(now) {
        const elapsed = now - start;
        const progress = Math.min(1, elapsed / duration);
        const ease = 1 - Math.pow(1 - progress, 3); // cubic ease out

        renderFn(ease);

        if (progress < 1) {
            requestAnimationFrame(frame);
        }
    }

    requestAnimationFrame(frame);
}

function animateValue(obj, start, end, duration) {
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        const val = Math.floor(ease * (end - start) + start);
        obj.innerHTML = '₹' + val.toLocaleString();
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.innerHTML = '₹' + end.toLocaleString();
        }
    };
    window.requestAnimationFrame(step);
}

// ---- Data Utilities ----

function getCategoryBreakdown() {
    const cats = {};
    transactions.filter(t => t.type === 'debit').forEach(t => {
        if (!cats[t.category]) cats[t.category] = 0;
        cats[t.category] += t.amount;
    });
    return Object.entries(cats)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => a.amount - b.amount); // most negative first
}

function formatCategoryName(cat) {
    const names = {
        food: 'Food & Dining', transport: 'Transport', shopping: 'Shopping',
        bills: 'Bills & Utilities', health: 'Healthcare', entertainment: 'Entertainment',
        income: 'Income', other: 'Other'
    };
    return names[cat] || cat.charAt(0).toUpperCase() + cat.slice(1);
}

function getCategoryClass(cat) {
    if (!cat) return 'other';
    const lower = cat.toLowerCase();
    if (lower.includes('food') || lower.includes('dining') || lower.includes('restaurant') || lower.includes('grocery')) return 'food';
    if (lower.includes('transport') || lower.includes('travel') || lower.includes('uber') || lower.includes('petrol') || lower.includes('gas')) return 'transport';
    if (lower.includes('shopping') || lower.includes('clothes') || lower.includes('amazon')) return 'shopping';
    if (lower.includes('bill') || lower.includes('utilit') || lower.includes('electric') || lower.includes('internet') || lower.includes('phone') || lower.includes('rent')) return 'bills';
    if (lower.includes('health') || lower.includes('medical') || lower.includes('pharmacy') || lower.includes('doctor') || lower.includes('gym')) return 'health';
    if (lower.includes('entertainment') || lower.includes('movie') || lower.includes('netflix') || lower.includes('spotify')) return 'entertainment';
    if (lower.includes('income') || lower.includes('salary') || lower.includes('deposit') || lower.includes('credit')) return 'income';
    return 'other';
}

function formatDate(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
