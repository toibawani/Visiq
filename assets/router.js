/* ===================================================
   VISIQ — ROUTER
   Author: Devin
   URL state management, scenario routes, navigation
=================================================== */

class Router {
    constructor(options = {}) {
        this.routes = options.routes || {};
        this.onRouteChange = options.onRouteChange || (() => {});
        this.defaultRoute = options.defaultRoute || 'landing';

        this.currentRoute = null;
        this.currentParams = {};

        this.init();
    }

    init() {
        // Handle initial load
        this.handleRoute();

        // Handle popstate (back/forward)
        window.addEventListener('popstate', () => {
            this.handleRoute();
        });

        // Intercept link clicks for internal navigation
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link) return;

            const href = link.getAttribute('href');
            if (!href || href.startsWith('http') || href.startsWith('//')) return;

            e.preventDefault();
            this.navigate(href);
        });
    }

    handleRoute() {
        const path = window.location.pathname;
        const search = window.location.search;
        const hash = window.location.hash;

        // Parse query parameters
        const params = this.parseSearchParams(search);

        // Determine route
        let route = this.defaultRoute;

        if (path.includes('sim.html')) {
            route = 'sim';
        } else if (path.includes('landing.html')) {
            route = 'landing';
        } else if (path.includes('404.html')) {
            route = '404';
        } else if (path.includes('how-it-works.html')) {
            route = 'how-it-works';
        }

        this.currentRoute = route;
        this.currentParams = params;

        this.onRouteChange(route, params);
    }

    parseSearchParams(search) {
        const params = {};
        if (!search) return params;

        const pairs = search.slice(1).split('&');
        pairs.forEach(pair => {
            const [key, value] = pair.split('=');
            if (key) {
                params[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
            }
        });

        return params;
    }

    buildSearchParams(params) {
        const pairs = Object.entries(params)
            .filter(([key, value]) => value !== undefined && value !== null)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`);

        return pairs.length > 0 ? `?${pairs.join('&')}` : '';
    }

    navigate(path, params = {}) {
        const search = this.buildSearchParams(params);
        const url = path + search;

        // Update URL without reloading
        window.history.pushState({}, '', url);
        this.handleRoute();
    }

    updateParams(params) {
        const newParams = { ...this.currentParams, ...params };
        const search = this.buildSearchParams(newParams);
        const url = window.location.pathname + search;

        window.history.replaceState({}, '', url);
        this.currentParams = newParams;
    }

    getParam(key) {
        return this.currentParams[key];
    }

    setParam(key, value) {
        this.updateParams({ [key]: value });
    }

    back() {
        window.history.back();
    }

    // Validation helpers
    validateSimId(id) {
        // Sim ID should be alphanumeric with hyphens, max 50 chars
        return /^[a-z0-9-]{1,50}$/.test(id);
    }

    validateNumber(value, min, max) {
        const num = parseFloat(value);
        return !isNaN(num) && num >= min && num <= max;
    }
}

// Export for use in pages
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Router;
}
