/* ============================================
   FINVERSE - Login / Authentication
   Connected to Flask Backend + MySQL
   ============================================ */

const API_BASE = 'http://localhost:5000';

// ─── Tab Switching ──────────────────────────────────────────────────────────

function switchLoginTab(tab) {
    document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.login-tab[data-tab="${tab}"]`).classList.add('active');
    document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
    clearAuthMessage();
}

// ─── Auth Message Display ───────────────────────────────────────────────────

function showAuthMessage(message, type = 'error') {
    const msgEl = document.getElementById('authMessage');
    if (!msgEl) return;
    msgEl.textContent = message;
    msgEl.className = `auth-message ${type}`;
    msgEl.style.display = 'block';
}

function clearAuthMessage() {
    const msgEl = document.getElementById('authMessage');
    if (!msgEl) return;
    msgEl.style.display = 'none';
    msgEl.textContent = '';
}

// ─── Login ──────────────────────────────────────────────────────────────────

async function handleLogin(e) {
    e.preventDefault();
    clearAuthMessage();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    if (!email || !password) {
        showAuthMessage('Please enter both email and password.');
        return;
    }

    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Signing in...';
    submitBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            // Store user info
            sessionStorage.setItem('finverse_user', JSON.stringify(data.user));

            // Update sidebar with real user data
            updateUserDisplay(data.user);

            // Load transactions from database
            await loadTransactions();

            // Enter dashboard
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('appLayout').classList.add('active');
            renderDashboard();
            renderAllPages();
        } else {
            showAuthMessage(data.message || 'Login failed. Please try again.');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAuthMessage('Unable to connect to server. Make sure the server is running.');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// ─── Register ───────────────────────────────────────────────────────────────

async function handleRegister(e) {
    e.preventDefault();
    clearAuthMessage();

    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value.trim();

    if (!name || !email || !password) {
        showAuthMessage('Please fill in all fields.');
        return;
    }

    if (password.length < 6) {
        showAuthMessage('Password must be at least 6 characters.');
        return;
    }

    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creating account...';
    submitBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (data.success) {
            showAuthMessage(data.message || 'Account created! You can now sign in.', 'success');
            // Clear register form
            document.getElementById('regName').value = '';
            document.getElementById('regEmail').value = '';
            document.getElementById('regPassword').value = '';
            // Auto-switch to login tab after 1.5 seconds
            setTimeout(() => {
                switchLoginTab('login');
                document.getElementById('loginEmail').value = email;
                document.getElementById('loginPassword').value = '';
                showAuthMessage('Account created! Please sign in.', 'success');
            }, 1500);
        } else {
            showAuthMessage(data.message || 'Registration failed. Please try again.');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showAuthMessage('Unable to connect to server. Make sure the server is running.');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// ─── Update User Display ────────────────────────────────────────────────────

function updateUserDisplay(user) {
    const nameEl = document.querySelector('.sidebar-user-name');
    const emailEl = document.querySelector('.sidebar-user-email');
    const avatarEl = document.querySelector('.sidebar-user-avatar');

    if (nameEl) nameEl.textContent = user.name;
    if (emailEl) emailEl.textContent = user.email;
    if (avatarEl) {
        // Generate initials from the user's name
        const initials = user.name
            .split(' ')
            .map(w => w[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
        avatarEl.textContent = initials;
    }

    // Update topbar greeting
    const subtitle = document.getElementById('pageSubtitle');
    if (subtitle) {
        const firstName = user.name.split(' ')[0];
        subtitle.textContent = `Welcome back, ${firstName}. Here's your financial overview.`;
    }
}

// ─── Logout ─────────────────────────────────────────────────────────────────

function handleLogout() {
    sessionStorage.removeItem('finverse_user');
    document.getElementById('appLayout').classList.remove('active');
    document.getElementById('loginScreen').style.display = 'flex';

    // Clear login form values
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    clearAuthMessage();
}
