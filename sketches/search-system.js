// ===== SMART SEARCH & FILTERING =====
// Fast search and filtering for simulations

class SearchSystem {
    constructor() {
        this.initialize();
    }
    
    initialize() {
        this.setupSearchBar();
        console.log('[SEARCH] System initialized');
    }
    
    setupSearchBar() {
        const heroSection = document.querySelector('.hero-section');
        if (!heroSection) return;
        
        const searchContainer = document.createElement('div');
        searchContainer.className = 'search-container';
        searchContainer.innerHTML = `
            <div class="search-box">
                <input 
                    type="text" 
                    id="sim-search" 
                    class="search-input" 
                    placeholder="Search simulations..."
                    autocomplete="off"
                >
                <div class="search-icon">🔍</div>
            </div>
            <div class="search-results" id="search-results" style="display: none;"></div>
        `;
        
        heroSection.appendChild(searchContainer);
        
        const searchInput = document.getElementById('sim-search');
        searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        searchInput.addEventListener('blur', () => {
            setTimeout(() => {
                document.getElementById('search-results').style.display = 'none';
            }, 200);
        });
    }
    
    handleSearch(query) {
        const resultsDiv = document.getElementById('search-results');
        
        if (!query.trim()) {
            resultsDiv.style.display = 'none';
            return;
        }
        
        const results = this.filterSimulations(query);
        this.displayResults(results, resultsDiv);
    }
    
    filterSimulations(query) {
        const q = query.toLowerCase();
        
        return SIMULATIONS.filter(sim => 
            sim.name.toLowerCase().includes(q) ||
            sim.description.toLowerCase().includes(q) ||
            sim.category.toLowerCase().includes(q)
        );
    }
    
    displayResults(results, container) {
        if (results.length === 0) {
            container.innerHTML = '<div class="search-no-results">No simulations found</div>';
            container.style.display = 'block';
            return;
        }
        
        const html = results.map(sim => `
            <div class="search-result" onclick="openSimulation('${sim.name}'); document.getElementById('search-results').style.display='none'; document.getElementById('sim-search').value='';
            if (window.haptic) window.haptic.tap();">
                <div class="search-result-icon">${sim.icon}</div>
                <div class="search-result-info">
                    <div class="search-result-name">${sim.name}</div>
                    <div class="search-result-cat">${sim.category}</div>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = html;
        container.style.display = 'block';
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.searchSystem = new SearchSystem();
    });
} else {
    window.searchSystem = new SearchSystem();
}