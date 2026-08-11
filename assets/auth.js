// ===== AUTHENTICATION SYSTEM =====
// Handles login, signup, and session management

class AuthSystem {
    constructor() {
        this.users = this.loadUsers();
        this.currentSession = this.loadSession();
        this.initialize();
    }
    
    initialize() {
        this.setupEventListeners();
        this.checkSession();
    }
    
    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        // Signup form
        const signupForm = document.getElementById('signup-form');
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        }
        
        // Logout button
        const logoutBtn = document.getElementById('logout-button');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
    }
    
    handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('login-email')?.value.trim();
        const password = document.getElementById('login-password')?.value;
        
        console.log('[AUTH] Login attempt:', email);
        
        if (!email || !password) {
            alert('Please enter email and password');
            return;
        }
        
        if (!this.validateEmail(email)) {
            alert('Please enter a valid email');
            return;
        }
        
        // Find user
        const user = this.users.find(u => u.email === email);
        
        if (!user) {
            alert('User not found. Please sign up first.');
            return;
        }
        
        if (user.password !== password) {
            alert('Incorrect password');
            return;
        }
        
        // Login successful
        this.createSession(user);
        console.log('[AUTH] Login successful:', email);
        this.showApp();
    }
    
    handleSignup(e) {
        e.preventDefault();
        
        const email = document.getElementById('signup-email')?.value.trim();
        const password = document.getElementById('signup-password')?.value;
        const confirmPassword = document.getElementById('signup-confirm')?.value;
        
        console.log('[AUTH] Signup attempt:', email);
        
        if (!email || !password || !confirmPassword) {
            alert('Please fill in all fields');
            return;
        }
        
        if (!this.validateEmail(email)) {
            alert('Please enter a valid email');
            return;
        }
        
        if (password.length < 6) {
            alert('Password must be at least 6 characters');
            return;
        }
        
        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }
        
        // Check if user exists
        if (this.users.find(u => u.email === email)) {
            alert('User already exists. Please log in.');
            return;
        }
        
        // Create new user
        const newUser = {
            id: Date.now().toString(),
            email: email,
            password: password,
            createdAt: new Date().toISOString()
        };
        
        this.users.push(newUser);
        this.saveUsers();
        
        console.log('[AUTH] User created:', email);
        alert('Account created! Please log in.');
        
        // Clear form
        document.getElementById('signup-form').reset();
        
        // Switch to login tab
        this.switchToLogin();
    }
    
    createSession(user) {
        const session = {
            userId: user.id,
            email: user.email,
            loginTime: new Date().toISOString()
        };
        
        this.currentSession = session;
        localStorage.setItem('visiq_session', JSON.stringify(session));
        localStorage.setItem('visiq_user_email', user.email);
        
        console.log('[AUTH] Session created:', user.email);
    }
    
    handleLogout() {
        console.log('[AUTH] Logout');
        localStorage.removeItem('visiq_session');
        localStorage.removeItem('visiq_user_email');
        this.currentSession = null;
        this.showAuthPage();
    }
    
    checkSession() {
        const session = this.loadSession();
        
        if (session) {
            console.log('[AUTH] Active session found:', session.email);
            this.currentSession = session;
            this.showApp();
        } else {
            console.log('[AUTH] No active session');
            this.showAuthPage();
        }
    }
    
    showApp() {
        // Hide auth views
        const authViews = document.querySelectorAll('[data-view="auth"]');
        authViews.forEach(view => view.style.display = 'none');
        
        // Show app
        const appView = document.querySelector('[data-view="app"]');
        if (appView) appView.style.display = 'block';
        
        // Show navbar and gallery
        const navbar = document.querySelector('.navbar');
        if (navbar) navbar.style.display = 'flex';
        
        const galleryView = document.querySelector('[data-view="gallery"]');
        if (galleryView) galleryView.style.display = 'block';
        
        console.log('[AUTH] Showing app');
    }
    
    showAuthPage() {
        // Show auth views
        const authViews = document.querySelectorAll('[data-view="auth"]');
        authViews.forEach(view => view.style.display = 'block');
        
        // Hide app
        const appView = document.querySelector('[data-view="app"]');
        if (appView) appView.style.display = 'none';
        
        // Hide navbar and gallery
        const navbar = document.querySelector('.navbar');
        if (navbar) navbar.style.display = 'none';
        
        const galleryView = document.querySelector('[data-view="gallery"]');
        if (galleryView) galleryView.style.display = 'none';
        
        console.log('[AUTH] Showing auth page');
    }
    
    switchToLogin() {
        const loginView = document.getElementById('login-view');
        const signupView = document.getElementById('signup-view');
        
        if (loginView && signupView) {
            loginView.style.display = 'block';
            signupView.style.display = 'none';
        }
    }
    
    switchToSignup() {
        const loginView = document.getElementById('login-view');
        const signupView = document.getElementById('signup-view');
        
        if (loginView && signupView) {
            loginView.style.display = 'none';
            signupView.style.display = 'block';
        }
    }
    
    loadUsers() {
        const usersJSON = localStorage.getItem('visiq_users');
        return usersJSON ? JSON.parse(usersJSON) : [];
    }
    
    saveUsers() {
        localStorage.setItem('visiq_users', JSON.stringify(this.users));
    }
    
    loadSession() {
        const sessionJSON = localStorage.getItem('visiq_session');
        return sessionJSON ? JSON.parse(sessionJSON) : null;
    }
    
    validateEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }
}

// Initialize auth system
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.authSystem = new AuthSystem();
    });
} else {
    window.authSystem = new AuthSystem();
}