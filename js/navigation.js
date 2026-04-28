/* ============================================
   FINVERSE - Navigation & Routing
   ============================================ */

function navigateTo(page) {
    currentPage = page;

    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const navBtn = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (navBtn) navBtn.classList.add('active');

    // Update page sections
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    const section = document.getElementById(`page-${page}`);
    if (section) {
        section.classList.remove('active');
        // Force reflow for animation
        void section.offsetWidth;
        section.classList.add('active');
    }

    // Update topbar
    const config = pageConfig[page];
    if (config) {
        document.getElementById('pageTitle').textContent = config.title;
        document.getElementById('pageSubtitle').textContent = config.subtitle;
    }

    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('active');

    // Render page-specific content
    renderPage(page);
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('active');
}

function renderAllPages() {
    renderDashboard();
    renderTransactionsPage();
    renderSpendingPage();
    renderForecastPage();
    renderCreditPage();
    renderAnomalyPage();
    renderNewsPage();
}

function renderPage(page) {
    switch (page) {
        case 'dashboard': renderDashboard(); break;
        case 'transactions': renderTransactionsPage(); break;
        case 'spending': renderSpendingPage(); break;
        case 'forecast': renderForecastPage(); break;
        case 'credit': renderCreditPage(); break;
        case 'anomaly': renderAnomalyPage(); break;
        case 'news': renderNewsPage(); break;
    }
}
