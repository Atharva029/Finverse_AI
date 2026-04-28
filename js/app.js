/* ============================================
   FINVERSE - Application Entry Point
   ============================================ */

// ---- Global State ----
let transactions = [];
let currentPage = 'dashboard';

// ---- Initialization ----
document.addEventListener('DOMContentLoaded', function () {
  transactions = [...demoTransactions];
  setTodayDate();
  initCopilot();
});

// ---- Window Resize handler for charts ----
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    renderPage(currentPage);
  }, 200);
});
