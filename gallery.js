// ===== VISIQ GALLERY SYSTEM =====

let currentSketchInstance = null;

const SIMULATIONS = [
    // ===== PHYSICS =====
    {
        id: 'newton',
        title: "Newton's Playground",
        description: 'F = ma visualization. Drag objects and adjust mass, friction.',
        category: 'physics',
        file: 'sketches/newton.js',
        tags: ['mechanics', 'forces']
    },
    {
        id: 'lotus',
        title: 'Lotus Droplet',
        description: 'Surface tension and hydrophobic effects.',
        category: 'physics',
        file: 'sketches/lotus.js',
        tags: ['fluids', 'surface-tension']
    },
    {
        id: 'black-hole',
        title: 'Black Hole',
        description: 'Watch spacetime warp around a black hole. Particles spiral into the event horizon as gravity bends light itself.',
        category: 'physics',
        file: 'sketches/black-hole.js',
        tags: ['relativity', 'gravity', 'spacetime']
    },
    {
        id: 'mountains',
        title: 'Mountain Formation',
        description: 'Plate tectonics over millions of years.',
        category: 'physics',
        file: 'sketches/mountains.js',
        tags: ['geology', 'time']
    },
    {
        id: 'murmuration',
        title: 'Murmuration',
        description: 'Flocking behavior - birds create emergent patterns.',
        category: 'physics',
        file: 'sketches/murmuration.js',
        tags: ['emergence', 'behavior']
    },
    {
        id: 'ferromagnetism',
        title: 'Magnetic Fields',
        description: 'Click to place magnets. Watch particles align.',
        category: 'physics',
        file: 'sketches/ferromagnetism.js',
        tags: ['magnetism', 'forces']
    },
    {
        id: 'fourier',
        title: 'Fourier Circles',
        description: 'Decompose drawings into spinning circles.',
        category: 'physics',
        file: 'sketches/fourier.js',
        tags: ['mathematics', 'signals']
    },
    {
        id: 'gravity-tree',
        title: 'N-Body Gravity',
        description: 'Watch particles orbit and merge under gravity.',
        category: 'physics',
        file: 'sketches/gravity-tree.js',
        tags: ['gravity', 'orbits']
    },

    // ===== BIOLOGY =====
    {
        id: 'mitosis-sim',
        title: 'Mitosis',
        description: 'Cell division - coming soon',
        category: 'biology',
        file: 'sketches/mitosis.js',
        tags: ['cells', 'division']
    },
    {
        id: 'meiosis-sim',
        title: 'Meiosis',
        description: 'Genetic shuffling - coming soon',
        category: 'biology',
        file: 'sketches/meiosis.js',
        tags: ['genetics', 'division']
    },
    {
        id: 'dna-rep',
        title: 'DNA Replication',
        description: 'The double helix replicates - coming soon',
        category: 'biology',
        file: 'sketches/dna-replication.js',
        tags: ['genetics', 'molecules']
    },
    {
        id: 'protein',
        title: 'Protein Folding',
        description: 'Amino acids fold into 3D structures - coming soon',
        category: 'biology',
        file: 'sketches/protein-folding.js',
        tags: ['molecular', 'structure']
    },
    {
        id: 'enzyme',
        title: 'Enzyme Kinetics',
        description: 'Chemical reactions sped up - coming soon',
        category: 'biology',
        file: 'sketches/enzyme-kinetics.js',
        tags: ['chemistry', 'catalysts']
    },

    // ===== GEOGRAPHY =====
    {
        id: 'tectonic',
        title: 'Plate Tectonics',
        description: 'Continents collide and mountains form - coming soon',
        category: 'geography',
        file: 'sketches/plate-tectonics.js',
        tags: ['geology', 'earth']
    },
    {
        id: 'ocean',
        title: 'Ocean Currents',
        description: 'Heat and rotation create currents - coming soon',
        category: 'geography',
        file: 'sketches/ocean-currents.js',
        tags: ['oceanography', 'earth']
    },
    {
        id: 'hurricane',
        title: 'Hurricane Formation',
        description: 'Spinning storms over warm oceans - coming soon',
        category: 'geography',
        file: 'sketches/hurricane-formation.js',
        tags: ['weather', 'atmosphere']
    },
    {
        id: 'water-cycle',
        title: 'Water Cycle',
        description: 'Evaporation, condensation, precipitation - coming soon',
        category: 'geography',
        file: 'sketches/water-cycle.js',
        tags: ['hydrology', 'climate']
    },
    {
        id: 'volcano',
        title: 'Volcanic Eruption',
        description: 'Pressure builds underground - coming soon',
        category: 'geography',
        file: 'sketches/volcanic-eruption.js',
        tags: ['geology', 'earth']
    },

    // ===== ASTRONOMY =====
    {
        id: 'orbits',
        title: 'Orbital Mechanics',
        description: 'Objects orbit massive centers - coming soon',
        category: 'astronomy',
        file: 'sketches/black-hole-orbit.js',
        tags: ['gravity', 'space']
    },
    {
        id: 'galaxy',
        title: 'Galaxy Collision',
        description: 'Two galaxies merge - coming soon',
        category: 'astronomy',
        file: 'sketches/galaxy-collision.js',
        tags: ['cosmology', 'space']
    },
    {
        id: 'stars',
        title: 'Star Lifecycle',
        description: 'Birth, life, and death of stars - coming soon',
        category: 'astronomy',
        file: 'sketches/star-lifecycle.js',
        tags: ['stellar', 'evolution']
    },
    {
        id: 'exoplanet',
        title: 'Exoplanet Detection',
        description: 'Finding planets around distant stars - coming soon',
        category: 'astronomy',
        file: 'sketches/exoplanet-detection.js',
        tags: ['planets', 'detection']
    }
];

function initGallery() {
    console.log('%c🌀 VISIQ loaded', 'color: #00d9ff; font-size: 16px; font-weight: bold;');
    
    const categories = ['physics', 'biology', 'geography', 'astronomy'];
    
    categories.forEach(category => {
        const gridId = `${category}-grid`;
        const grid = document.getElementById(gridId);
        
        if (grid) {
            const sims = SIMULATIONS.filter(s => s.category === category);
            sims.forEach(sim => {
                const card = createSimCard(sim);
                grid.appendChild(card);
            });
        }
    });

    // Setup event listeners
    document.getElementById('reset-button')?.addEventListener('click', resetSimulation);
    
    console.log(`✅ Loaded ${SIMULATIONS.length} simulations`);
}

function createSimCard(sim) {
    const card = document.createElement('div');
    card.className = 'sim-card';
    card.innerHTML = `
        <div class="card-canvas">
            <canvas id="preview-${sim.id}"></canvas>
        </div>
        <div class="card-content">
            <h3 class="card-title">${sim.title}</h3>
            <p class="card-description">${sim.description}</p>
            <div class="card-tags">
                ${sim.tags.map(tag => `<span class="card-tag">${tag}</span>`).join('')}
            </div>
        </div>
    `;

    card.addEventListener('click', () => openSimulation(sim));
    
    // Preview animation
    setTimeout(() => loadCardPreview(sim.id), 100);

    return card;
}

function loadCardPreview(simId) {
    const canvas = document.getElementById(`preview-${simId}`);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;

    let angle = 0;
    const animate = () => {
        ctx.fillStyle = 'rgba(26, 26, 62, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw rotating particles
        ctx.fillStyle = 'rgba(0, 217, 255, 0.6)';
        for (let i = 0; i < 8; i++) {
            const x = canvas.width / 2 + Math.cos(angle + i * Math.PI / 4) * 50;
            const y = canvas.height / 2 + Math.sin(angle + i * Math.PI / 4) * 50;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        angle += 0.02;
        requestAnimationFrame(animate);
    };
    animate();
}

function openSimulation(sim) {
    const galleryView = document.getElementById('gallery-view');
    const simView = document.getElementById('simulation-view');

    if (galleryView) galleryView.classList.remove('active');
    if (simView) simView.classList.add('active');

    // Update header
    document.getElementById('sim-title').textContent = sim.title;
    document.getElementById('sim-category').textContent = sim.category;
    document.getElementById('sim-description').textContent = sim.description;

    // Load sketch
    loadSketch(sim.file);
}

function loadSketch(filename) {
    // Remove old sketch
    if (currentSketchInstance) {
        currentSketchInstance.remove();
        currentSketchInstance = null;
    }

    // Clear container
    const container = document.getElementById('simulation-canvas');
    container.innerHTML = '';
    const controlsSection = document.getElementById('controls-section');
    controlsSection.innerHTML = '';

    // Load new sketch
    const script = document.createElement('script');
    script.src = filename + '?t=' + Date.now();
    script.onload = () => {
        console.log('✅ Loaded', filename);
    };
    script.onerror = () => {
        container.innerHTML = '<p style="color: #ff006e; padding: 40px; text-align: center;">Coming Soon ✨</p>';
        console.error('Could not load', filename);
    };
    document.body.appendChild(script);
}

function backToGallery() {
    if (currentSketchInstance) {
        currentSketchInstance.remove();
        currentSketchInstance = null;
    }

    const galleryView = document.getElementById('gallery-view');
    const simView = document.getElementById('simulation-view');

    if (galleryView) galleryView.classList.add('active');
    if (simView) simView.classList.remove('active');
}

function resetSimulation() {
    if (currentSketchInstance && currentSketchInstance.resetSketch) {
        currentSketchInstance.resetSketch();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initGallery);

// Helper functions for sketches
window.createControlGroup = function(label, min, max, value, onChange) {
    const group = document.createElement('div');
    group.className = 'control-group';
    
    const labelEl = document.createElement('div');
    labelEl.className = 'control-label';
    labelEl.innerHTML = `
        <span>${label}</span>
        <span class="control-value" id="value-${label}">${value.toFixed(1)}</span>
    `;
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'slider';
    slider.min = min;
    slider.max = max;
    slider.value = value;
    slider.step = (max - min) / 100;
    
    slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        document.getElementById(`value-${label}`).textContent = val.toFixed(1);
        onChange(val);
    });
    
    group.appendChild(labelEl);
    group.appendChild(slider);
    return group;
};

window.createButton = function(label, onClick) {
    const btn = document.createElement('button');
    btn.className = 'btn-reset';
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    return btn;
};

window.initSketch = function(sketch) {
    currentSketchInstance = sketch;
};