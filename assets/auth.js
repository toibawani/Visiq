// ===== AUTHENTICATION SYSTEM =====
// Handle signup, login, logout

class AuthSystem {
    constructor() {
        this.users = this.loadUsers();
        this.currentUser = this.loadCurrentUser();
        this.initUI();
    }

    loadUsers() {
        const stored = localStorage.getItem('visiq_users');
        return stored ? JSON.parse(stored) : {};
    }

    saveUsers() {
        localStorage.setItem('visiq_users', JSON.stringify(this.users));
    }

    loadCurrentUser() {
        const stored = localStorage.getItem('visiq_current_user');
        return stored ? JSON.parse(stored) : null;
    }

    saveCurrentUser() {
        if (this.currentUser) {
            localStorage.setItem('visiq_current_user', JSON.stringify(this.currentUser));
        }
    }

    initUI() {
        const signupForm = document.getElementById('signup-form');
        const modal = document.getElementById('signup-modal');
        const logoutBtn = document.getElementById('logout-btn');

        if (this.currentUser) {
            // User logged in
            if (modal) modal.classList.remove('active');
            this.updateUIForLoggedIn();
        } else {
            // Show signup
            if (modal) modal.classList.add('active');
            logoutBtn.style.display = 'none';
        }

        if (signupForm) {
            signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        }
    }

    handleSignup(e) {
        e.preventDefault();

        const fullname = document.getElementById('fullname').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const interests = Array.from(document.querySelectorAll('input[name="interest"]:checked'))
            .map(el => el.value);

        // Validation
        if (!fullname || !email || !password) {
            alert('Please fill in all fields');
            return;
        }

        if (this.users[email]) {
            alert('Email already registered. Try logging in!');
            return;
        }

        // Save user
        this.users[email] = {
            fullname,
            email,
            password,
            interests,
            createdAt: new Date().toISOString()
        };

        this.saveUsers();

        // Log them in
        this.currentUser = {
            fullname,
            email,
            interests
        };

        this.saveCurrentUser();

        // Update UI
        const modal = document.getElementById('signup-modal');
        if (modal) modal.classList.remove('active');
        this.updateUIForLoggedIn();

        console.log('✅ Welcome to VISIQ,', fullname);
    }

    updateUIForLoggedIn() {
        const userDisplay = document.getElementById('user-display');
        const logoutBtn = document.getElementById('logout-btn');

        if (userDisplay && this.currentUser) {
            userDisplay.textContent = this.currentUser.fullname.split(' ')[0];
        }

        if (logoutBtn) {
            logoutBtn.style.display = 'block';
        }
    }

    logout() {
        if (confirm('Are you sure you want to logout?')) {
            this.currentUser = null;
            localStorage.removeItem('visiq_current_user');
            location.reload();
        }
    }
}

// Initialize auth system
window.auth = new AuthSystem();

// Logout function (called from HTML)
window.logout = function() {
    window.auth.logout();
};

// Helper to scroll to category
window.scrollToCategory = function(category) {
    const section = document.getElementById(category);
    if (section) {
        setTimeout(() => {
            section.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }
};

// Go home
window.goToHome = function() {
    document.getElementById('gallery-view').classList.add('active');
    document.getElementById('simulation-view').classList.remove('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
};