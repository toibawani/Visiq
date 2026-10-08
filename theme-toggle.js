// Theme toggle button handler
const STORAGE_KEY = 'visiq_theme';

function toggleTheme() {
  // Toggle between light and dark themes
  const currentTheme = getComputedStyle(document.documentElement).getPropertyValue('data-theme').trim();
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  
  // Notify stats tracker
  if (window.statsTracker) {
    window.statsTracker?.setTheme(newTheme);
  }
}

// Initialize theme on load
document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem(STORAGE_KEY);
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  } else {
    // Default to light theme
    document.documentElement.setAttribute('data-theme', 'light');
  }
  // Attach theme toggle button click handler
  setupToggle();
});

// Setup the theme toggle button click handler
function setupToggle() {
  const themeToggleBtn = document.getElementById('btn-theme');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', toggleTheme);
  }
}

// Handle system theme preference
window.addEventListener('systemchange', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  if (currentTheme !== 'light' && currentTheme !== 'dark') {
    // Fallback to system preference
    document.documentElement.setAttribute('data-theme', systemPrefersDark ? 'dark' : 'light');
  }
});