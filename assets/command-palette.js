/* ===================================================
   VISIQ — COMMAND PALETTE
   Author: Devin
   Fuzzy search, keyboard nav, focus trap, accessible dialog
=================================================== */

class CommandPalette {
    constructor(options = {}) {
        this.items = options.items || [];
        this.onSelect = options.onSelect || (() => {});
        this.onClose = options.onClose || (() => {});

        this.isOpen = false;
        this.selectedIndex = 0;
        this.filteredItems = [...this.items];

        this.element = null;
        this.input = null;
        this.resultsContainer = null;

        this.init();
    }

    init() {
        this.createPalette();
        this.bindEvents();
    }

    createPalette() {
        // Create backdrop
        const backdrop = document.createElement('div');
        backdrop.className = 'command-palette';
        backdrop.setAttribute('aria-hidden', 'true');
        backdrop.setAttribute('role', 'presentation');

        // Create dialog
        const dialog = document.createElement('div');
        dialog.className = 'command-palette-dialog';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-label', 'Search simulations');

        // Create input
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'command-palette-input';
        input.placeholder = 'Search simulations…';
        input.setAttribute('aria-autocomplete', 'list');
        input.setAttribute('aria-controls', 'command-palette-results');

        // Create results container
        const results = document.createElement('div');
        results.className = 'command-palette-results';
        results.id = 'command-palette-results';
        results.setAttribute('role', 'listbox');

        // Create surprise button
        const surprise = document.createElement('button');
        surprise.className = 'button';
        surprise.textContent = 'Surprise me';
        surprise.style.marginTop = '16px';
        surprise.style.width = '100%';
        surprise.addEventListener('click', () => {
            const randomItem = this.items[Math.floor(Math.random() * this.items.length)];
            this.selectItem(randomItem);
        });

        dialog.appendChild(input);
        dialog.appendChild(results);
        dialog.appendChild(surprise);
        backdrop.appendChild(dialog);

        this.element = backdrop;
        this.input = input;
        this.resultsContainer = results;

        document.body.appendChild(this.element);
    }

    bindEvents() {
        // Close on backdrop click
        this.element.addEventListener('click', (e) => {
            if (e.target === this.element) {
                this.close();
            }
        });

        // Input changes
        this.input.addEventListener('input', () => {
            this.filterItems();
            this.selectedIndex = 0;
            this.renderResults();
        });

        // Keyboard navigation
        this.input.addEventListener('keydown', (e) => {
            this.handleKeydown(e);
        });

        // Focus trap
        this.element.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
            }
        });
    }

    handleKeydown(e) {
        if (e.key === 'Escape') {
            this.close();
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredItems.length - 1);
            this.renderResults();
            return;
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
            this.renderResults();
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            if (this.filteredItems[this.selectedIndex]) {
                this.selectItem(this.filteredItems[this.selectedIndex]);
            }
            return;
        }
    }

    filterItems() {
        const query = this.input.value.toLowerCase().trim();

        if (!query) {
            this.filteredItems = [...this.items];
            return;
        }

        // Simple fuzzy search: check if query is a substring of title, hook, tags, or engine
        this.filteredItems = this.items.filter(item => {
            const title = item.title?.toLowerCase() || '';
            const hook = item.hook?.toLowerCase() || '';
            const tags = (item.tags || []).join(' ').toLowerCase();
            const engine = item.engine?.toLowerCase() || '';

            return (
                title.includes(query) ||
                hook.includes(query) ||
                tags.includes(query) ||
                engine.includes(query)
            );
        });
    }

    renderResults() {
        this.resultsContainer.innerHTML = '';

        if (this.filteredItems.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'command-palette-item';
            empty.textContent = 'No results found';
            empty.setAttribute('role', 'option');
            this.resultsContainer.appendChild(empty);
            return;
        }

        this.filteredItems.forEach((item, index) => {
            const itemEl = document.createElement('div');
            itemEl.className = 'command-palette-item';
            itemEl.setAttribute('role', 'option');
            itemEl.setAttribute('aria-selected', index === this.selectedIndex ? 'true' : 'false');
            itemEl.setAttribute('data-index', index);

            const title = document.createElement('div');
            title.className = 'command-palette-item-title';
            title.textContent = item.title || '';

            const meta = document.createElement('div');
            meta.className = 'command-palette-item-meta';
            const metaParts = [
                item.engine || '',
                item.duration || '',
                item.level || ''
            ].filter(Boolean);
            meta.textContent = metaParts.join(' · ');

            itemEl.appendChild(title);
            if (meta.textContent) {
                itemEl.appendChild(meta);
            }

            itemEl.addEventListener('click', () => {
                this.selectItem(item);
            });

            this.resultsContainer.appendChild(itemEl);
        });
    }

    selectItem(item) {
        this.onSelect(item);
        this.close();
    }

    open() {
        this.isOpen = true;
        this.element.setAttribute('aria-hidden', 'false');
        this.input.value = '';
        this.filteredItems = [...this.items];
        this.selectedIndex = 0;
        this.renderResults();

        // Focus input after animation
        setTimeout(() => {
            this.input.focus();
        }, 100);
    }

    close() {
        this.isOpen = false;
        this.element.setAttribute('aria-hidden', 'true');
        this.onClose();
    }

    updateItems(items) {
        this.items = items;
        this.filteredItems = [...this.items];
        if (this.isOpen) {
            this.renderResults();
        }
    }
}

// Export for use in landing page
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CommandPalette;
}
