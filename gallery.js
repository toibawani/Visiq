// ===== VISIQ GALLERY SYSTEM (PRODUCTION) =====
// Professional simulation loader with category management

let currentSketchInstance = null;
let currentCategory = null;
let categoryAudioLoops = new Map();

const SIMULATIONS = [
    // ===== PHYSICS =====
    {
        id: 'newton',
        title: "Newton's Playground",
        description: 'Explore F = ma in real-time. Drag objects, adjust mass and friction to see acceleration change instantly.',
        category: 'physics',
        file: 'sketches/newton.js',
        tags: ['mechanics', 'forces', 'beginner'],
        difficulty: 'beginner'
    },
    {
        id: 'black-hole',
        title: 'Black Hole',
        description: 'Watch spacetime warp around a singularity. Particles spiral into the event horizon as gravity bends light itself.',
        category: 'physics',
        file: 'sketches/black-hole.js',
        tags: ['relativity', 'gravity', 'spacetime'],
        difficulty: 'advanced'
    },
    {
        id: 'lotus',
        title: 'Lotus Effect',
        description: 'Surface tension and hydrophobic interaction. Watch water droplets bead up and roll across a tilted surface.',
        category: 'physics',
        file: 'sketches/lotus.js',
        tags: ['fluids', 'surface-tension', 'intermediate'],
        difficulty: 'intermediate'
    },
    {
        id: 'murmuration',
        title: 'Murmuration',
        description: 'Flocking behavior: separation, alignment, cohesion. 500 birds create emergent wave patterns.',
        category: 'physics',
        file: 'sketches/murmuration.js',
        tags: ['emergence', 'behavior', 'intermediate'],
        difficulty: 'intermediate'
    },
    {
        id: 'ferromagnetism',
        title: 'Magnetic Fields',
        description: 'Click to place magnetic poles. Particles align with invisible field lines in hypnotic patterns.',
        category: 'physics',
        file: 'sketches/ferromagnetism.js',
        tags: ['magnetism', 'forces', 'intermediate'],
        difficulty: 'intermediate'
    },
    {
        id: 'fourier',
        title: 'Fourier Circles',
        description: 'Draw any shape. It\'s decomposed into spinning circles and reconstructed with epicycles.',
        category: 'physics',
        file: 'sketches/fourier.js',
        tags: ['mathematics', 'signals', 'advanced'],
        difficulty: 'advanced'
    },
    {
        id: 'gravity-tree',
        title: 'N-Body Gravity',
        description: 'Watch 200 particles orbit and merge under mutual gravitational attraction. Emergence at scale.',
        category: 'physics',
        file: 'sketches/gravity-tree.js',
        tags: ['gravity', 'orbits', 'advanced'],
        difficulty: 'advanced'
    },
    
    // ===== BIOLOGY =====
    {
        id: 'mitosis',
        title: 'Mitosis',
        description: 'Five stages of cell division: prophase → metaphase → anaphase → telophase. Chromosomes, spindle fibers, cytokinesis.',
        category: 'biology',
        file: 'sketches/mitosis.js',
        tags: ['cell-division', 'chromosomes', 'reproduction'],
        difficulty: 'beginner'
    },
    {
        id: 'ocean-currents',
        title: 'Ocean Currents',
        description: 'Heat-driven and wind-driven currents. Coriolis effect deflects water, creating gyres and circulation patterns.',
        category: 'geography',
        file: 'sketches/ocean-currents.js',
        tags: ['oceanography', 'heat-transport', 'coriolis'],
        difficulty: 'intermediate'
    },
    
    // ===== GEOGRAPHY =====
    {
        id: 'plate-tectonics',
        title: 'Plate Tectonics',
        description: 'Continental plates collide over millions of years. Watch mountains fold, trenches form, continents drift.',
        category: 'geography',
        file: 'sketches/plate-tectonics.js',
        tags: ['geology', 'time-scale', 'tectonics'],
        difficulty: 'intermediate'
    },
    {
        id: 'water-cycle',
        title: 'Water Cycle',
        description: 'Evaporation → condensation → precipitation. Watch water rise as vapor, form clouds, fall as rain, flow to oceans.',
        category: 'geography',
        file: 'sketches/water-cycle.js',
        tags: ['hydrology', 'climate', 'cycles'],
        difficulty: 'beginner'
    },
    
    // ===== ASTRONOMY =====
    {
        id: 'orbits',
        title: 'Orbital Mechanics',
        description: 'Objects orbit massive centers. Adjust velocity and mass to create stable orbits or watch decay into the sun.',
        category: 'astronomy',
        file: 'sketches/orbits.js',
        tags: ['gravity', 'space', 'orbits'],
        difficulty: 'intermediate'
    },
    {
        id: 'star-lifecycle',
        title: 'Star Lifecycle',
        description: 'A star is born from stellar nursery, burns for billions of years, then dies as supernova or neutron star.',
        category: 'astronomy',
        file: 'sketches/star-lifecycle.js',
        tags: ['stellar', 'evolution', 'cosmology'],
        difficulty: 'advanced'
    }
];

function initGallery() {
    console.log('%c🌀 VISIQ Loading...', 'color: #00d9ff; font-size: 16px; font-weight: bold;');
    
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

    document.getElementById('reset-button')?.addEventListener('click', resetSimulation);
    
    console.log(`%c✅ ${SIMULATIONS.length} Simulations Ready`, 'color: #00d9ff; font-size: 14px;');
}

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
    
    // Animate preview
    setTimeout(() => loadCardPreview(sim.id, sim.category), 100);

    return card;
}

function loadCardPreview(simId, category) {
    const canvas = document.getElementById(`preview-${simId}`);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;

    let angle = 0;
    const particleCount = 8;
    const speed = 0.04;
    
    // Category-specific preview colors
    const colors = {
        'physics': { main: 'rgba(0, 217, 255, 0.7)', glow: 'rgba(0, 217, 255, 0.3)' },
        'biology': { main: 'rgba(100, 200, 255, 0.7)', glow: 'rgba(100, 200, 255, 0.3)' },
        'geography': { main: 'rgba(76, 175, 80, 0.7)', glow: 'rgba(76, 175, 80, 0.3)' },
        'astronomy': { main: 'rgba(156, 78, 221, 0.7)', glow: 'rgba(156, 78, 221, 0.3)' }
    };
    
    const palette = colors[category] || colors['physics'];
    
    const animate = () => {
        // Background
        ctx.fillStyle = 'rgba(26, 26, 62, 0.9)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Rotating particles
        ctx.fillStyle = palette.main;
        for (let i = 0; i < particleCount; i++) {
            const x = canvas.width / 2 + Math.cos(angle + i * Math.PI / 4) * 50;
            const y = canvas.height / 2 + Math.sin(angle + i * Math.PI / 4) * 50;
            
            // Glow
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, 8);
            gradient.addColorStop(0, palette.glow);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(x - 8, y - 8, 16, 16);
            
            // Particle
            ctx.fillStyle = palette.main;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        
        angle += speed;
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
    document.getElementById('sim-category').textContent = `${sim.category} • ${sim.difficulty}`;
    document.getElementById('sim-description').textContent = sim.description;
    document.getElementById('sim-description').textContent = sim.description;

// Update info panel
if (window.simInfo) {
    window.simInfo.updatePanel(sim.name, sim.category);
}

    // Play category audio
    currentCategory = sim.category;
    startCategoryAudio(sim.category);
    soundManager.playChime(880, 0.3);

    // Load sketch
    loadSketch(sim.file);
}

function startCategoryAudio(category) {
    // Stop previous loop
    if (currentCategory && categoryAudioLoops.has(currentCategory)) {
        soundManager.stopAmbientLoop(currentCategory);
    }
    
    // Start new category audio
    soundManager.startAmbientLoop(category, category);
    categoryAudioLoops.set(category, true);
}

function loadSketch(filename) {
    if (currentSketchInstance) {
        currentSketchInstance.remove();
        currentSketchInstance = null;
    }

    const container = document.getElementById('simulation-canvas');
    container.innerHTML = '';
    const controlsSection = document.getElementById('controls-section');
    controlsSection.innerHTML = '';

    const script = document.createElement('script');
    script.src = filename + '?t=' + Date.now();
    script.onload = () => {
        console.log('✅ Loaded:', filename);
    };
    script.onerror = () => {
        container.innerHTML = '<p style="color: #ff006e; padding: 40px; text-align: center;">Simulation Loading...</p>';
        soundManager.playAlert();
    };
    document.body.appendChild(script);
}

function backToGallery() {
    if (currentSketchInstance) {
        currentSketchInstance.remove();
        currentSketchInstance = null;
    }

    // Stop category audio
    if (currentCategory) {
        soundManager.stopAmbientLoop(currentCategory);
    }

    const galleryView = document.getElementById('gallery-view');
    const simView = document.getElementById('simulation-view');

    if (galleryView) galleryView.classList.add('active');
    if (simView) simView.classList.remove('active');
    
    soundManager.playChime(600, 0.2);
}

function resetSimulation() {
    if (currentSketchInstance && currentSketchInstance.resetSketch) {
        currentSketchInstance.resetSketch();
        soundManager.playSuccess();
    }
}

// Global helpers for sketches
window.createControlGroup = function(label, min, max, value, onChange) {
    const group = document.createElement('div');
    group.className = 'control-group';
    
    const labelEl = document.createElement('div');
    labelEl.className = 'control-label';
    labelEl.innerHTML = `
        <span>${label}</span>
        <span class="control-value" id="value-${label}">${typeof value === 'number' ? value.toFixed(1) : value}</span>
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
        soundManager.playOrganicPulse(200, 0.15);
    });
    
    group.appendChild(labelEl);
    group.appendChild(slider);
    return group;
};

window.createButton = function(label, onClick) {
    const btn = document.createElement('button');
    btn.className = 'btn-reset';
    btn.textContent = label;
    btn.addEventListener('click', () => {
        onClick();
        soundManager.playChime(700, 0.2);
    });
    return btn;
};

window.initSketch = function(sketch) {
    currentSketchInstance = sketch;
};

// Initialize on load
document.addEventListener('DOMContentLoaded', initGallery);