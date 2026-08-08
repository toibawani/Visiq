// ===== VISIQ AUTHENTICATION SYSTEM =====

class AuthManager {
    constructor() {
        this.users = this.loadUsers();
        this.currentUser = this.loadSession();
        this.init();
    }

    loadUsers() {
        const stored = localStorage.getItem('visiq_users');
        return stored ? JSON.parse(stored) : {};
    }

    saveUsers() {
        localStorage.setItem('visiq_users', JSON.stringify(this.users));
    }

    loadSession() {
        const stored = localStorage.getItem('visiq_session');
        return stored ? JSON.parse(stored) : null;
    }

    saveSession() {
        if (this.currentUser) {
            localStorage.setItem('visiq_session', JSON.stringify(this.currentUser));
        }
    }

    clearSession() {
        localStorage.removeItem('visiq_session');
    }

    init() {
        if (this.currentUser) {
            this.showApp();
        } else {
            this.setupAuthForms();
        }
    }

    setupAuthForms() {
        const loginForm = document.getElementById('form-login');
        const signupForm = document.getElementById('form-signup');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        if (signupForm) {
            signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        }
    }

    handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        if (!this.users[email]) {
            alert('❌ Email not found. Please sign up first.');
            return;
        }

        if (this.users[email].password !== password) {
            alert('❌ Incorrect password.');
            return;
        }

        const user = this.users[email];
        this.currentUser = {
            name: user.fullname,
            email: user.email,
            interests: user.interests || []
        };

        this.saveSession();
        this.showApp();
        console.log('✅ Welcome back,', user.fullname);
    }

    handleSignup(e) {
        e.preventDefault();
        const fullname = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirm = document.getElementById('signup-confirm').value;
        const interests = Array.from(
            document.querySelectorAll('input[name="interest"]:checked')
        ).map(el => el.value);

        if (!fullname || !email || !password || !confirm) {
            alert('❌ Please fill in all fields.');
            return;
        }

        if (password !== confirm) {
            alert('❌ Passwords do not match.');
            return;
        }

        if (password.length < 6) {
            alert('❌ Password must be at least 6 characters.');
            return;
        }

        if (this.users[email]) {
            alert('❌ Email already registered.');
            return;
        }

        this.users[email] = {
            fullname,
            email,
            password,
            interests,
            createdAt: new Date().toISOString()
        };

        this.saveUsers();

        this.currentUser = {
            name: fullname,
            email,
            interests
        };

        this.saveSession();
        this.showApp();
        console.log('✅ Welcome to VISIQ,', fullname);
    }

    showApp() {
        const authPage = document.getElementById('auth-page');
        const mainApp = document.getElementById('main-app');

        if (authPage) authPage.style.display = 'none';
        if (mainApp) mainApp.style.display = 'block';

        this.updateUI();
    }

    updateUI() {
        if (this.currentUser) {
            const firstName = this.currentUser.name.split(' ')[0];
            const userDisplay = document.getElementById('user-display');
            const heroUser = document.getElementById('hero-user');

            if (userDisplay) userDisplay.textContent = firstName;
            if (heroUser) heroUser.textContent = firstName;
        }
    }

    logout() {
        if (confirm('Are you sure you want to logout?')) {
            this.currentUser = null;
            this.clearSession();
            location.reload();
        }
    }
}

// Global instance
window.auth = new AuthManager();

// Global functions
window.toggleForm = function(e) {
    e.preventDefault();
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    if (loginForm && signupForm) {
        loginForm.classList.toggle('active');
        signupForm.classList.toggle('active');
    }
};

window.handleLogout = function() {
    window.auth.logout();
};

window.goHome = function() {
    const galleryView = document.getElementById('gallery-view');
    const simView = document.getElementById('simulation-view');
    if (galleryView) galleryView.classList.add('active');
    if (simView) simView.classList.remove('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
};