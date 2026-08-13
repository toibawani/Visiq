function createSimCard(sim) {
    const card = document.createElement('div');
    card.className = 'sim-card';

    card.innerHTML = `
        <div class="card-canvas" id="canvas-${sim.id}">
            <canvas id="preview-${sim.id}"></canvas>
        </div>

        <div class="card-content">
            <div class="card-difficulty">${sim.difficulty}</div>
            <h3 class="card-title">${sim.title}</h3>
            <p class="card-description">${sim.description}</p>

            <div class="card-tags">
                ${sim.tags.map(tag => `<span class="card-tag">${tag}</span>`).join('')}
            </div>
        </div>
    `;

    card.addEventListener('click', () => openSimulation(sim));

    // ===== FAVORITE BUTTON INTEGRATION =====

    const favoriteBtn = document.createElement('button');

    favoriteBtn.className = 'btn-favorite';

    favoriteBtn.innerHTML =
        window.userPrefs && window.userPrefs.isFavorite(sim.id)
            ? '❤️'
            : '🤍';

    favoriteBtn.title = 'Add to favorites';

    favoriteBtn.onclick = (e) => {
        e.stopPropagation();

        if (window.userPrefs && window.userPrefs.isFavorite(sim.id)) {

            window.userPrefs.removeFavorite(sim.id);
            favoriteBtn.innerHTML = '🤍';

        } else {

            if (window.userPrefs) {
                window.userPrefs.addFavorite(sim.id);
            }

            favoriteBtn.innerHTML = '❤️';

            if (window.haptic) {
                window.haptic.success();
            }
        }

        // Update favorites section immediately
        showFavorites();
    };

    card.appendChild(favoriteBtn);

    // =======================================

    // Animate preview
    setTimeout(() => {
        loadCardPreview(sim.id, sim.category);
    }, 100);

    return card;
}


function showFavorites() {

    const favoritesSection =
        document.getElementById('favorites-section');

    const favoritesGrid =
        document.getElementById('favorites-grid');

    if (!favoritesSection || !favoritesGrid) {
        return;
    }

    const favorites =
        window.userPrefs.getFavorites();

    if (favorites.length === 0) {

        favoritesSection.style.display = 'none';
        return;
    }

    favoritesSection.style.display = 'block';

    favoritesGrid.innerHTML = '';

    const favoriteSimulations =
        SIMULATIONS.filter(sim =>
            favorites.includes(sim.id)
        );

    favoriteSimulations.forEach(sim => {

        const card = createSimCard(sim);

        favoritesGrid.appendChild(card);

    });
}