/* ============================================
   FINVERSE - Charts (Canvas-based with Animation)
   ============================================ */

function renderSpendingTrendChart(progress = 1) {
    const canvas = document.getElementById('spendingTrendChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        ctx.scale(dpr, dpr);
    } else {
        ctx.clearRect(0, 0, rect.width, rect.height);
    }
    const w = rect.width, h = rect.height;
    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    let months = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];
    let spending = [3800, 4200, 3950, 4600, 4460, 4230];
    let income = [6200, 6500, 6400, 6800, 6840, 6840];

    if (typeof spendingAnalytics !== 'undefined' && spendingAnalytics && spendingAnalytics.monthly_trend && spendingAnalytics.monthly_trend.length > 0) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        months = spendingAnalytics.monthly_trend.map(m => {
            const parts = m.month.split('-');
            return monthNames[parseInt(parts[1]) - 1];
        });
        spending = spendingAnalytics.monthly_trend.map(m => m.expenses);
        income = spendingAnalytics.monthly_trend.map(m => m.income);
    }

    const maxVal = Math.max(...income, ...spending) * 1.1;
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;
    ctx.globalAlpha = progress;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartH / 4) * i;
        ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(w - padding.right, y); ctx.stroke();
        ctx.fillStyle = '#64748b'; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'right';
        ctx.fillText('₹' + Math.round(maxVal - (maxVal / 4) * i).toLocaleString(), padding.left - 8, y + 4);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#64748b'; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
    months.forEach((m, i) => {
        const x = padding.left + (chartW / (months.length - 1)) * i;
        ctx.fillText(m, x, h - 10);
    });
    ctx.save();
    ctx.beginPath();
    ctx.rect(padding.left, padding.top, chartW * progress, chartH + padding.bottom);
    ctx.clip();
    drawLine(ctx, income, maxVal, padding, chartW, chartH, months.length, '#3b82f6', true);
    drawLine(ctx, spending, maxVal, padding, chartW, chartH, months.length, '#00d4aa', true);
    ctx.restore();
    ctx.globalAlpha = progress;
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#00d4aa'; ctx.fillRect(w - 180, 8, 10, 10);
    ctx.fillStyle = '#94a3b8'; ctx.fillText('Spending', w - 164, 17);
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(w - 100, 8, 10, 10);
    ctx.fillStyle = '#94a3b8'; ctx.fillText('Income', w - 84, 17);
    ctx.globalAlpha = 1;
}

function drawLine(ctx, data, maxVal, padding, chartW, chartH, count, color, fill) {
    const points = data.map((val, i) => ({
        x: padding.left + (chartW / (count - 1)) * i,
        y: padding.top + chartH - (val / maxVal) * chartH
    }));
    if (fill) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, padding.top + chartH);
        points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
        ctx.closePath();
        const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
        gradient.addColorStop(0, color + '30');
        gradient.addColorStop(1, color + '05');
        ctx.fillStyle = gradient;
        ctx.fill();
    }
    ctx.beginPath();
    ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();
    points.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fillStyle = '#0a0e1a'; ctx.fill();
    });
}

function renderMonthlySpendChart(progress = 1) {
    const canvas = document.getElementById('monthlySpendChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
        canvas.style.width = rect.width + 'px'; canvas.style.height = rect.height + 'px';
        ctx.scale(dpr, dpr);
    } else { ctx.clearRect(0, 0, rect.width, rect.height); }
    const w = rect.width, h = rect.height;
    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    // Use real data from analytics API
    let months = [];
    let data = [];

    if (spendingAnalytics && spendingAnalytics.monthly_trend && spendingAnalytics.monthly_trend.length > 0) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        months = spendingAnalytics.monthly_trend.map(m => {
            const parts = m.month.split('-');
            return monthNames[parseInt(parts[1]) - 1];
        });
        data = spendingAnalytics.monthly_trend.map(m => m.expenses);
    } else {
        // Show placeholders for the last 6 months if no data
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push(monthNames[d.getMonth()]);
            data.push(0);
        }
    }

    // Dynamic Y-axis scaling
    const maxData = Math.max(...data, 0);
    // Add 20% padding for better visualization, minimum 5000
    const maxVal = maxData > 0 ? Math.ceil(maxData * 1.2) : 5000;

    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;
    const barWidth = chartW / months.length * 0.6;
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartH / 4) * i;
        ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(w - padding.right, y); ctx.stroke();
        ctx.fillStyle = '#64748b'; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'right';
        ctx.fillText('₹' + Math.round(maxVal - (maxVal / 4) * i).toLocaleString(), padding.left - 8, y + 4);
    }
    months.forEach((m, i) => {
        const x = padding.left + (chartW / months.length) * i + (chartW / months.length - barWidth) / 2;
        let barH = (data[i] / maxVal) * chartH;
        barH = barH * progress;
        const y = padding.top + chartH - barH;
        const gradient = ctx.createLinearGradient(x, y, x, padding.top + chartH);
        gradient.addColorStop(0, '#00d4aa'); gradient.addColorStop(1, '#00d4aa40');
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barH, barH > 4 ? [4, 4, 0, 0] : 0);
        ctx.fillStyle = gradient; ctx.fill();
        ctx.fillStyle = '#64748b'; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(m, x + barWidth / 2, h - 10);
        if (progress > 0.8) {
            ctx.globalAlpha = (progress - 0.8) * 5;
            ctx.fillStyle = '#f1f5f9'; ctx.font = '10px Inter, sans-serif';
            ctx.fillText('₹' + data[i].toLocaleString(), x + barWidth / 2, y - 6);
            ctx.globalAlpha = 1;
        }
    });
}

function renderCategoryPieChart(progress = 1) {
    const canvas = document.getElementById('categoryPieChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
        canvas.style.width = rect.width + 'px'; canvas.style.height = rect.height + 'px';
        ctx.scale(dpr, dpr);
    } else { ctx.clearRect(0, 0, rect.width, rect.height); }
    
    const w = rect.width, h = rect.height;
    const radius = Math.min(w * 0.5, h) / 2 - 20; 
    const cx = w * 0.35; 
    const cy = h / 2;
    const colorMap = {
        'bills': '#a855f7',         // Purple
        'food': '#f59e0b',          // Amber
        'food & dining': '#f59e0b', // Amber
        'shopping': '#ec4899',      // Pink
        'transport': '#3b82f6',     // Blue
        'healthcare': '#ef4444',    // Red
        'health': '#ef4444',        // Red
        'entertainment': '#06b6d4', // Cyan
        'rent': '#10b981',          // Emerald
        'other': '#94a3b8',         // Slate
        'investment': '#14b8a6',    // Teal
        'travel': '#6366f1',        // Indigo
        'utilities': '#f97316'      // Orange
    };

    let categories = [];

    if (spendingAnalytics && spendingAnalytics.current_month && spendingAnalytics.current_month.by_category) {
        const byCat = spendingAnalytics.current_month.by_category;
        categories = Object.keys(byCat).map(catName => ({
            name: catName.charAt(0).toUpperCase() + catName.slice(1),
            amount: byCat[catName],
            color: colorMap[catName.toLowerCase()] || '#64748b'
        })).sort((a, b) => b.amount - a.amount);
    }

    const total = categories.reduce((s, c) => s + c.amount, 0);

    if (total === 0) {
        ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 4; ctx.stroke();
        ctx.fillStyle = '#64748b'; ctx.font = '14px Inter, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('No Spending Data', cx, cy - 2);
        return;
    }

    // ── Draw Doughnut Slices ──────────────────────────────────────────────────
    let startAngle = -Math.PI / 2;
    categories.forEach(cat => {
        const sliceAngle = (cat.amount / total) * Math.PI * 2 * progress;
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
        ctx.closePath(); 
        ctx.fillStyle = cat.color; ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
        ctx.closePath(); ctx.strokeStyle = '#0a0e1a'; ctx.lineWidth = 2; ctx.stroke();
        startAngle += sliceAngle;
    });

    // ── Center Hole ───────────────────────────────────────────────────────────
    ctx.beginPath(); ctx.arc(cx, cy, radius * 0.72, 0, Math.PI * 2);
    ctx.fillStyle = '#111827'; ctx.fill();

    // ── Total in Center ───────────────────────────────────────────────────────
    if (progress > 0.4) {
        ctx.globalAlpha = Math.min(1, (progress - 0.4) * 2);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#94a3b8'; ctx.font = '11px Inter, sans-serif';
        ctx.fillText('TOTAL SPENT', cx, cy - 12);
        ctx.fillStyle = '#f8fafc'; ctx.font = 'bold 18px Inter, sans-serif';
        ctx.fillText('₹' + Math.round(total * progress).toLocaleString(), cx, cy + 10);
        ctx.globalAlpha = 1;
    }

    // ── Legend on the Right ───────────────────────────────────────────────────
    if (progress > 0.6) {
        ctx.globalAlpha = Math.min(1, (progress - 0.6) * 2);
        const legendX = w * 0.62;
        const itemH = 22;
        const totalH = categories.length * itemH;
        const legendY = cy - totalH / 2;
        
        categories.forEach((cat, i) => {
            const y = legendY + (i * itemH);
            const pct = Math.round((cat.amount / total) * 100);
            
            // Color box
            ctx.fillStyle = cat.color;
            ctx.beginPath();
            ctx.roundRect(legendX, y, 10, 10, 2);
            ctx.fill();
            
            // Label
            ctx.textAlign = 'left';
            ctx.fillStyle = '#f1f5f9'; ctx.font = 'bold 11px Inter, sans-serif';
            ctx.fillText(cat.name, legendX + 18, y + 9);
            
            // Percentage
            ctx.fillStyle = '#94a3b8'; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'right';
            ctx.fillText(pct + '%', w - 10, y + 9);
        });
        ctx.globalAlpha = 1;
    }
}



function renderForecastChart(progress = 1) {
    const canvas = document.getElementById('forecastChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
        canvas.style.width = rect.width + 'px'; canvas.style.height = rect.height + 'px';
        ctx.scale(dpr, dpr);
    } else { ctx.clearRect(0, 0, rect.width, rect.height); }
    const w = rect.width, h = rect.height;
    const padding = { top: 30, right: 20, bottom: 40, left: 60 };
    let months = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar*', 'Apr*', 'May*'];
    let actual = [3800, 4200, 3950, 4600, 4460, 4230, null, null, null];
    let predicted = [null, null, null, null, null, 4230, 4520, 4380, 4450];
    let upper = [null, null, null, null, null, 4230, 4820, 4750, 4900];
    let lower = [null, null, null, null, null, 4230, 4220, 4010, 4000];
    let maxVal = 5500;
    
    // Process live AI Forecast data if available
    if (window.forecastData && window.forecastData.historical && window.forecastData.forecast) {
        const hist = window.forecastData.historical;
        const pred = window.forecastData.forecast;
        
        months = [];
        actual = [];
        predicted = [];
        upper = [];
        lower = [];
        
        // Load history
        hist.forEach((h, i) => {
            months.push(i % 15 === 0 ? h.date.substring(5) : ''); // Label every 15 days
            actual.push(h.amount);
            predicted.push(null);
            upper.push(null);
            lower.push(null);
        });
        
        // The bridge point
        const lastHist = hist[hist.length - 1];
        predicted[predicted.length - 1] = lastHist.amount;
        upper[upper.length - 1] = lastHist.amount;
        lower[lower.length - 1] = lastHist.amount;
        
        // Load forecast
        pred.forEach((p, i) => {
            months.push(i % 15 === 0 ? '*' + p.date.substring(5) : '');
            actual.push(null);
            predicted.push(p.amount);
            upper.push(p.amount * 1.15); // +15% confidence interval
            lower.push(p.amount * 0.85); // -15% confidence interval
        });
        
        const allVals = [...actual.filter(v => v !== null), ...upper.filter(v => v !== null)];
        maxVal = Math.max(...allVals) * 1.2 || 1000;
        
        // Adjust divX calculation for dynamic array length
        window._divXFraction = hist.length / (hist.length + pred.length);
    }

    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartH / 5) * i;
        ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(w - padding.right, y); ctx.stroke();
        ctx.fillStyle = '#64748b'; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'right';
        ctx.fillText('₹' + Math.round(maxVal - (maxVal / 5) * i).toLocaleString(), padding.left - 8, y + 4);
    }
    ctx.textAlign = 'center';
    months.forEach((m, i) => {
        const x = padding.left + (chartW / (months.length - 1)) * i;
        ctx.fillStyle = m.includes('*') ? '#00d4aa' : '#64748b';
        ctx.fillText(m, x, h - 10);
    });

    ctx.save();
    ctx.beginPath();
    ctx.rect(padding.left, padding.top, chartW * progress, chartH + padding.bottom);
    ctx.clip();

    const bandPoints = [];
    for (let i = 0; i < months.length; i++) {
        if (upper[i] !== null) {
            bandPoints.push({
                x: padding.left + (chartW / (months.length - 1)) * i,
                upper: padding.top + chartH - (upper[i] / maxVal) * chartH,
                lower: padding.top + chartH - (lower[i] / maxVal) * chartH
            });
        }
    }
    if (bandPoints.length > 1) {
        ctx.beginPath();
        bandPoints.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.upper) : ctx.lineTo(p.x, p.upper));
        for (let i = bandPoints.length - 1; i >= 0; i--) ctx.lineTo(bandPoints[i].x, bandPoints[i].lower);
        ctx.closePath(); ctx.fillStyle = '#00d4aa15'; ctx.fill();
    }

    const frac = window._divXFraction || (5 / (months.length - 1));
    const divX = padding.left + chartW * frac;
    ctx.setLineDash([4, 4]); ctx.strokeStyle = '#334155';
    ctx.beginPath(); ctx.moveTo(divX, padding.top); ctx.lineTo(divX, padding.top + chartH); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#64748b'; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Forecast', divX + 40, padding.top + 12);

    const actualPts = actual.map((val, i) => val !== null ? {
        x: padding.left + (chartW / (months.length - 1)) * i,
        y: padding.top + chartH - (val / maxVal) * chartH
    } : null).filter(Boolean);
    ctx.beginPath(); ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2.5;
    actualPts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();
    actualPts.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fillStyle = '#3b82f6'; ctx.fill(); });

    const predPts = predicted.map((val, i) => val !== null ? {
        x: padding.left + (chartW / (months.length - 1)) * i,
        y: padding.top + chartH - (val / maxVal) * chartH
    } : null).filter(Boolean);
    ctx.beginPath(); ctx.strokeStyle = '#00d4aa'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 4]);
    predPts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke(); ctx.setLineDash([]);
    predPts.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fillStyle = '#00d4aa'; ctx.fill(); });
    ctx.restore();

    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(padding.left, 6, 10, 10);
    ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'left'; ctx.fillText('Actual', padding.left + 16, 15);
    ctx.fillStyle = '#00d4aa'; ctx.fillRect(padding.left + 80, 6, 10, 10);
    ctx.fillStyle = '#94a3b8'; ctx.fillText('Predicted', padding.left + 96, 15);
}

function renderCreditTrendChart(progress = 1) {
    const canvas = document.getElementById('creditTrendChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
        canvas.style.width = rect.width + 'px'; canvas.style.height = rect.height + 'px';
        ctx.scale(dpr, dpr);
    } else { ctx.clearRect(0, 0, rect.width, rect.height); }
    
    const w = rect.width, h = rect.height;
    const padding = { top: 40, right: 20, bottom: 40, left: 50 };

    let months, scores;
    if (window.creditHealthData && window.creditHealthData.trend && window.creditHealthData.trend.length > 0) {
        const trend = window.creditHealthData.trend;
        months = trend.map(t => {
            const parts = t.month.split('-');
            const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1);
            return d.toLocaleString('default', { month: 'short' });
        });
        scores = trend.map(t => t.score);
    } else {
        months = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];
        scores = [680, 685, 692, 698, 705, 710, 718, 722, 728, 735, 738, 742];
    }

    const minScore = 300;
    const maxScore = 900;
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;
    const barSpacing = chartW / months.length;
    const barWidth = barSpacing * 0.65;

    // 1. Draw Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.textAlign = 'right';
    ctx.fillStyle = '#64748b';
    ctx.font = '10px Inter, sans-serif';
    
    [300, 450, 600, 750, 900].forEach(val => {
        const y = padding.top + chartH - ((val - minScore) / (maxScore - minScore)) * chartH;
        ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(w - padding.right, y); ctx.stroke();
        ctx.fillText(val, padding.left - 8, y + 3);
    });

    // 2. Draw Bars and Labels
    months.forEach((m, i) => {
        const score = scores[i];
        const x = padding.left + (barSpacing * i) + (barSpacing - barWidth) / 2;
        
        // Animating height
        let barH = ((score - minScore) / (maxScore - minScore)) * chartH;
        barH = Math.max(5, barH * progress);
        const y = padding.top + chartH - barH;

        // Color Logic
        let color = '#ef4444'; // Poor
        if (score >= 800) color = '#10b981'; // Excellent
        else if (score >= 650) color = '#3b82f6'; // Good
        else if (score >= 500) color = '#f59e0b'; // Fair

        // Gradient Fill
        const grad = ctx.createLinearGradient(x, y, x, padding.top + chartH);
        grad.addColorStop(0, color);
        grad.addColorStop(1, color + '15');

        ctx.fillStyle = grad;
        ctx.beginPath();
        // Top rounded corners only
        ctx.roundRect(x, y, barWidth, barH, [6, 6, 0, 0]);
        ctx.fill();

        // X-Axis Label
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'center';
        ctx.font = '11px Inter, sans-serif';
        ctx.fillText(m, x + barWidth / 2, h - 10);

        // Floating Score
        if (progress > 0.8) {
            ctx.globalAlpha = Math.min(1, (progress - 0.8) * 5);
            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.fillText(Math.round(score), x + barWidth / 2, y - 8);
            ctx.globalAlpha = 1;
        }
    });
}


function renderAnomalyChart(progress = 1) {
    const canvas = document.getElementById('anomalyChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
        canvas.style.width = rect.width + 'px'; canvas.style.height = rect.height + 'px';
        ctx.scale(dpr, dpr);
    } else {
        ctx.clearRect(0, 0, rect.width, rect.height);
    }

    const w = rect.width, h = rect.height;
    const padding = { top: 40, right: 30, bottom: 44, left: 68 };

    // ── Load real data ────────────────────────────────────────────────────────
    let chartPoints = (window.anomalyData && window.anomalyData.chart_points && window.anomalyData.chart_points.length > 1)
        ? window.anomalyData.chart_points
        : null;

    // Build unified arrays — ALL days go into the line (no gaps)
    let labels = [], amounts = [], isAnomalyArr = [];

    if (chartPoints) {
        chartPoints.forEach(p => {
            labels.push(p.date.substring(5));   // "MM-DD"
            amounts.push(p.amount);
            isAnomalyArr.push(p.is_anomaly);
        });
    } else {
        for (let i = 1; i <= 30; i++) {
            labels.push('01-' + String(i).padStart(2, '0'));
            amounts.push(200 + Math.random() * 400);
            isAnomalyArr.push(i === 12 || i === 24);
        }
    }

    const count = labels.length;
    const maxVal = Math.ceil(Math.max(...amounts) * 1.25);

    // Threshold from backend (mean + 2×std)
    const threshold = (window.anomalyData && window.anomalyData.chart_threshold)
        ? window.anomalyData.chart_threshold
        : maxVal * 0.6;

    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;
    const xOf = i => padding.left + (chartW / Math.max(count - 1, 1)) * i;
    const yOf = v => padding.top + chartH - (v / maxVal) * chartH;

    // ── Grid lines ────────────────────────────────────────────────────────────
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartH / 4) * i;
        const val = maxVal - (maxVal / 4) * i;
        ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(w - padding.right, y); ctx.stroke();
        ctx.fillStyle = '#4b5563'; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'right';
        ctx.fillText('₹' + Math.round(val).toLocaleString(), padding.left - 8, y + 4);
    }

    // ── X-axis date labels (max 7, avoid crowding) ────────────────────────────
    ctx.fillStyle = '#4b5563'; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'center';
    const step = Math.max(1, Math.floor(count / 7));
    labels.forEach((lbl, i) => {
        if (i % step === 0 || i === count - 1) {
            ctx.fillText(lbl, xOf(i), h - 10);
        }
    });

    // ── Animated clip region ──────────────────────────────────────────────────
    ctx.save();
    ctx.beginPath();
    ctx.rect(padding.left, 0, chartW * progress, h);
    ctx.clip();

    // ── Gradient area fill under the line ─────────────────────────────────────
    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
    gradient.addColorStop(0, 'rgba(59,130,246,0.25)');
    gradient.addColorStop(1, 'rgba(59,130,246,0.01)');
    ctx.beginPath();
    ctx.moveTo(xOf(0), padding.top + chartH);
    amounts.forEach((v, i) => ctx.lineTo(xOf(i), yOf(v)));
    ctx.lineTo(xOf(count - 1), padding.top + chartH);
    ctx.closePath();
    ctx.fillStyle = gradient; ctx.fill();

    // ── Main spending line (continuous, no gaps) ───────────────────────────────
    ctx.beginPath();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.shadowColor = '#3b82f6';
    ctx.shadowBlur = 8;
    amounts.forEach((v, i) => i === 0 ? ctx.moveTo(xOf(i), yOf(v)) : ctx.lineTo(xOf(i), yOf(v)));
    ctx.stroke();
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';

    ctx.restore();

    // ── Anomaly threshold dashed line ─────────────────────────────────────────
    if (progress > 0.25) {
        ctx.globalAlpha = Math.min(1, (progress - 0.25) * 2);
        const ty = yOf(threshold);
        ctx.setLineDash([6, 5]); ctx.strokeStyle = '#ef444460'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(padding.left, ty); ctx.lineTo(w - padding.right, ty); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#ef4444'; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'right';
        ctx.fillText('Threshold ₹' + Math.round(threshold).toLocaleString(), w - padding.right - 4, ty - 6);
        ctx.globalAlpha = 1;
    }

    // ── Anomaly dots overlaid ON the line at correct daily-total height ────────
    isAnomalyArr.forEach((isAnom, i) => {
        if (!isAnom) return;
        const pointProgress = i / Math.max(count - 1, 1);
        if (progress < pointProgress) return;

        const x = xOf(i);
        const y = yOf(amounts[i]);

        // Animated scale-in
        let scale = 1;
        if (progress < pointProgress + 0.08) scale = (progress - pointProgress) / 0.08;
        scale = Math.max(0, Math.min(1, scale));

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);

        // Outer glow ring
        ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(239,68,68,0.18)'; ctx.fill();

        // Inner dot
        ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444'; ctx.fill();

        // White centre
        ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff'; ctx.fill();

        // Amount label above the dot
        ctx.fillStyle = '#fca5a5';
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('₹' + amounts[i].toLocaleString(), 0, -20);

        ctx.restore();
    });

    // ── Legend ────────────────────────────────────────────────────────────────
    ctx.globalAlpha = Math.max(0, (progress - 0.6) * 2.5);
    ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'left';

    // Normal dot
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(padding.left, 8, 12, 12);
    ctx.fillStyle = '#94a3b8'; ctx.fillText('Daily Spending', padding.left + 18, 18);

    // Anomaly dot
    ctx.beginPath(); ctx.arc(padding.left + 148, 14, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444'; ctx.fill();
    ctx.fillStyle = '#94a3b8'; ctx.fillText('Anomaly Day', padding.left + 158, 18);

    ctx.globalAlpha = 1;
}


