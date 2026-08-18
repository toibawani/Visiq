// ===== AUTHENTICATION SYSTEM =====
// Login and signup with localStorage

class AuthSystem {
    constructor() {
        this.users = this.loadUsers();
        this.currentSession = this.loadSession();
        this.initialize();
    }
    
    initialize() {
        this.setupEventListeners();
        this.checkSession();
        console.log('[AUTH] System initialized');
    }
    
    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }
        
        // Signup form
        const signupForm = document.getElementById('signup-form');
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSignup();
            });
        }
        
        // Setup toggle links
        const signupLink = document.querySelector('.auth-toggle a');
        if (signupLink) {
            signupLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchToSignup();
            });
        }
    }
    
    handleLogin() {
        const email = document.getElementById('login-email')?.value?.trim();
        const password = document.getElementById('login-password')?.value;
        
        if (!email || !password) {
            alert('Please fill in all fields');
            return;
        }
        
        // Find user
        const user = this.users.find(u => u.email === email);
        
        if (!user || user.password !== password) {
            alert('Invalid email or password');
            return;
        }
        
        // Login successful
        this.createSession(email);
        console.log('[AUTH] Login successful:', email);
        
        // Show app after small delay
        setTimeout(() => this.showApp(), 300);
    }
    
    handleSignup() {
        const email = document.getElementById('signup-email')?.value?.trim();
        const password = document.getElementById('signup-password')?.value;
        const confirm = document.getElementById('signup-confirm')?.value;
        
        if (!email || !password || !confirm) {
            alert('Please fill in all fields');
            return;
        }
        
        if (password !== confirm) {
            alert('Passwords do not match');
            return;
        }
        
        if (password.length < 6) {
            alert('Password must be at least 6 characters');
            return;
        }
        
        // Check if email exists
        if (this.users.find(u => u.email === email)) {
            alert('Email already registered');
            return;
        }
        
        // Create user
        const user = {
            email: email,
            password: password,
            createdAt: new Date().toISOString()
        };
        
        this.users.push(user);
        this.saveUsers();
        
        console.log('[AUTH] New user created:', email);
        
        // Create session
        this.createSession(email);
        
        // Show app after small delay
        setTimeout(() => this.showApp(), 300);
    }
    
    createSession(email) {
        this.currentSession = {
            email: email,
            loginTime: Date.now()
        };
        
        localStorage.setItem('visiq_session', JSON.stringify(this.currentSession));
        localStorage.setItem('visiq_user_email', email);
        
        console.log('[AUTH] Session created for:', email);
    }
    
    loadSession() {
        try {
            const saved = localStorage.getItem('visiq_session');
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            return null;
        }
    }
    
    checkSession() {
        if (this.currentSession && this.currentSession.email) {
            console.log('[AUTH] Session found, showing app');
            this.showApp();
        } else {
            console.log('[AUTH] No session, showing auth page');
            this.showAuthPage();
        }
    }
    
    showApp() {
        console.log('[AUTH] Showing app');
        
        const authPage = document.getElementById('auth-page');
        const mainApp = document.getElementById('main-app');
        
        if (authPage) {
            authPage.classList.remove('active');
            authPage.style.display = 'none';
        }
        
        if (mainApp) {
            mainApp.classList.add('active');
            mainApp.style.display = 'flex';
        }
        
        // Initialize gallery if not already
        if (!window.gallery) {
            console.log('[AUTH] Initializing gallery');
            window.gallery = new Gallery();
        }
    }
    
    showAuthPage() {
        console.log('[AUTH] Showing auth page');
        
        const authPage = document.getElementById('auth-page');
        const mainApp = document.getElementById('main-app');
        
        if (authPage) {
            authPage.classList.add('active');
            authPage.style.display = 'flex';
        }
        
        if (mainApp) {
            mainApp.classList.remove('active');
            mainApp.style.display = 'none';
        }
    }
    
    switchToSignup() {
        console.log('[AUTH] Switching to signup form');
        
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');
        
        if (loginForm) {
            loginForm.classList.remove('active');
            loginForm.style.display = 'none';
        }
        
        if (signupForm) {
            signupForm.classList.add('active');
            signupForm.style.display = 'block';
            
            // Clear fields
            document.getElementById('signup-email').value = '';
            document.getElementById('signup-password').value = '';
            document.getElementById('signup-confirm').value = '';
        }
    }
    
    switchToLogin() {
        console.log('[AUTH] Switching to login form');
        
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');
        
        if (loginForm) {
            loginForm.classList.add('active');
            loginForm.style.display = 'block';
            
            // Clear fields
            document.getElementById('login-email').value = '';
            document.getElementById('login-password').value = '';
        }
        
        if (signupForm) {
            signupForm.classList.remove('active');
            signupForm.style.display = 'none';
        }
    }
    
    handleLogout() {
        console.log('[AUTH] Logging out');
        
        localStorage.removeItem('visiq_session');
        localStorage.removeItem('visiq_user_email');
        this.currentSession = null;
        this.showAuthPage();
    }
    
    loadUsers() {
        try {
            const saved = localStorage.getItem('visiq_users');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    }
    
    saveUsers() {
        localStorage.setItem('visiq_users', JSON.stringify(this.users));
    }
}

// Initialize when DOM is ready
function initAuth() {
    if (!window.authSystem) {
        window.authSystem = new AuthSystem();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
} else {
    initAuth();
}