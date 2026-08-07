// ===== VISIQ - GALLERY CONTROLLER =====
// Author: toibawani
// Email: toibawani14@gmail.com
// GitHub: https://github.com/toibawani/visiq

let currentSketch = null;

// Scroll to gallery section
window.scrollToGallery = function() {
    const gallerySection = document.getElementById('simulations');
    if (gallerySection) {
        gallerySection.scrollIntoView({ behavior: 'smooth' });
    }
};

let currentSketchInstance = null;

const SIMULATIONS = [
    // ===== PHYSICS =====
    {
        id: 'newton',
        title: "Newton's Playground",
        description: 'Explore F = ma with interactive force vectors. Drag objects and adjust mass, friction to see real-time acceleration.',
        category: 'physics',
        file: 'sketches/newton.js',
        color: '#e8a04c',
        tags: ['mechanics', 'forces', 'beginner']
    },
    {
        id: 'black-hole',
        title: 'Black Hole',
        description: 'Watch spacetime warp around a black hole. See how gravity bends light and matter spirals into the event horizon.',
        category: 'physics',
        file: 'sketches/black-hole.js',
        color: '#e8a04c',
        tags: ['general-relativity', 'spacetime', 'expert']
    },
    {
        id: 'wave-interference',
        title: 'Wave Interference',
        description: 'Two waves collide and create interference patterns. Watch constructive and destructive interference in real-time.',
        category: 'physics',
        file: 'sketches/wave-interference.js',
        color: '#e8a04c',
        tags: ['waves', 'optics', 'intermediate']
    },
    {
        id: 'quantum-tunnel',
        title: 'Quantum Tunneling',
        description: 'Particles can pass through barriers that should be impossible to cross. Visualize quantum tunneling probability waves.',
        category: 'physics',
        file: 'sketches/quantum-tunnel.js',
        color: '#e8a04c',
        tags: ['quantum', 'probability', 'advanced']
    },
    {
        id: 'pendulum-chaos',
        title: 'Chaotic Pendulum',
        description: 'A double pendulum behaves chaotically. Small changes lead to completely different outcomes. Pure chaos.',
        category: 'physics',
        file: 'sketches/pendulum-chaos.js',
        color: '#e8a04c',
        tags: ['chaos', 'dynamics', 'advanced']
    },
    {
        id: 'magnetic-field',
        title: 'Magnetic Fields',
        description: 'Click to place magnetic poles. Watch particles align with invisible field lines in mesmerizing patterns.',
        category: 'physics',
        file: 'sketches/magnetic-field.js',
        color: '#e8a04c',
        tags: ['electromagnetism', 'fields', 'intermediate']
    },
    {
        id: 'doppler-effect',
        title: 'Doppler Effect',
        description: 'A sound-emitting object moves toward and away from you. See the frequency change in real-time.',
        category: 'physics',
        file: 'sketches/doppler-effect.js',
        color: '#e8a04c',
        tags: ['waves', 'sound', 'beginner']
    },
    {
        id: 'pressure-temperature',
        title: 'Gas Laws',
        description: 'Adjust temperature and volume. Watch pressure change instantly as molecules move faster.',
        category: 'physics',
        file: 'sketches/pressure-temperature.js',
        color: '#e8a04c',
        tags: ['thermodynamics', 'gases', 'intermediate']
    },

    // ===== BIOLOGY =====
    {
        id: 'mitosis',
        title: 'Mitosis',
        description: 'Watch a cell divide step-by-step. See chromosomes align, spindle fibers pull, and daughter cells form.',
        category: 'biology',
        file: 'sketches/mitosis.js',
        color: '#00d9ff',
        tags: ['cell-division', 'reproduction', 'beginner']
    },
    {
        id: 'meiosis',
        title: 'Meiosis',
        description: 'A more complex cell division creating sex cells. Watch chromosomes cross over, separate, and shuffle genetic material.',
        category: 'biology',
        file: 'sketches/meiosis.js',
        color: '#00d9ff',
        tags: ['cell-division', 'genetics', 'intermediate']
    },
    {
        id: 'dna-replication',
        title: 'DNA Replication',
        description: 'The double helix unzips. DNA polymerase builds new strands. Watch the most important biological process in slow motion.',
        category: 'biology',
        file: 'sketches/dna-replication.js',
        color: '#00d9ff',
        tags: ['genetics', 'molecular', 'beginner']
    },
    {
        id: 'protein-folding',
        title: 'Protein Folding',
        description: 'Amino acids link together and fold into complex 3D shapes. Adjust temperature to see how folding changes.',
        category: 'biology',
        file: 'sketches/protein-folding.js',
        color: '#00d9ff',
        tags: ['molecular', 'structure', 'advanced']
    },
    {
        id: 'enzyme-kinetics',
        title: 'Enzyme Kinetics',
        description: 'An enzyme catalyzes reactions. Adjust substrate concentration and temperature to change reaction rate.',
        category: 'biology',
        file: 'sketches/enzyme-kinetics.js',
        color: '#00d9ff',
        tags: ['biochemistry', 'kinetics', 'intermediate']
    },
    {
        id: 'neuron-firing',
        title: 'Neuron Action Potential',
        description: 'Watch ions rush across a membrane. Voltage changes ripple down the axon. Synapses fire. Neurons communicate.',
        category: 'biology',
        file: 'sketches/neuron-firing.js',
        color: '#00d9ff',
        tags: ['neuroscience', 'electricity', 'advanced']
    },
    {
        id: 'population-genetics',
        title: 'Population Genetics',
        description: 'Allele frequencies change over generations. Adjust mutation rate, selection pressure. Evolution in real-time.',
        category: 'biology',
        file: 'sketches/population-genetics.js',
        color: '#00d9ff',
        tags: ['evolution', 'genetics', 'advanced']
    },
    {
        id: 'virus-spreading',
        title: 'Virus Spreading',
        description: 'A virus spreads through a population. Adjust transmission rate and vaccination. Watch herd immunity work.',
        category: 'biology',
        file: 'sketches/virus-spreading.js',
        color: '#00d9ff',
        tags: ['epidemiology', 'disease', 'intermediate']
    },

    // ===== GEOGRAPHY =====
    {
        id: 'plate-tectonics',
        title: 'Plate Tectonics',
        description: 'Continental plates collide over millions of years. Watch mountains fold, trenches form, and continents drift.',
        category: 'geography',
        file: 'sketches/plate-tectonics.js',
        color: '#4caf50',
        tags: ['geology', 'time-scale', 'intermediate']
    },
    {
        id: 'ocean-currents',
        title: 'Ocean Currents',
        description: 'Warm water flows from equator to poles. Adjust temperature and rotation to see current patterns emerge.',
        category: 'geography',
        file: 'sketches/ocean-currents.js',
        color: '#4caf50',
        tags: ['oceanography', 'fluid-dynamics', 'intermediate']
    },
    {
        id: 'hurricane-formation',
        title: 'Hurricane Formation',
        description: 'Warm ocean water rises. The Coriolis effect spins it. A hurricane is born. Watch the lifecycle.',
        category: 'geography',
        file: 'sketches/hurricane-formation.js',
        color: '#4caf50',
        tags: ['meteorology', 'weather', 'intermediate']
    },
    {
        id: 'erosion-weathering',
        title: 'Erosion & Weathering',
        description: 'Water and wind carve landscapes. Adjust rainfall, slope angle. Watch valleys form over time.',
        category: 'geography',
        file: 'sketches/erosion-weathering.js',
        color: '#4caf50',
        tags: ['geology', 'erosion', 'beginner']
    },
    {
        id: 'water-cycle',
        title: 'Water Cycle',
        description: 'Evaporation, condensation, precipitation. Watch water rise, form clouds, fall as rain, and flow to oceans.',
        category: 'geography',
        file: 'sketches/water-cycle.js',
        color: '#4caf50',
        tags: ['hydrology', 'climate', 'beginner']
    },
    {
        id: 'earthquake-waves',
        title: 'Earthquake Waves',
        description: 'P-waves and S-waves ripple through the Earth. Watch how seismic waves travel and reflect.',
        category: 'geography',
        file: 'sketches/earthquake-waves.js',
        color: '#4caf50',
        tags: ['seismology', 'waves', 'intermediate']
    },
    {
        id: 'volcanic-eruption',
        title: 'Volcanic Eruption',
        description: 'Magma builds pressure deep underground. Adjust heat and pressure to trigger eruptions.',
        category: 'geography',
        file: 'sketches/volcanic-eruption.js',
        color: '#4caf50',
        tags: ['volcanology', 'geology', 'beginner']
    },

    // ===== ASTRONOMY =====
    {
        id: 'black-hole-orbit',
        title: 'Orbital Mechanics',
        description: 'Objects orbit a massive center. Adjust velocity and mass to create stable orbits or watch them decay.',
        category: 'astronomy',
        file: 'sketches/black-hole-orbit.js',
        color: '#9d4edd',
        tags: ['gravity', 'orbits', 'intermediate']
    },
    {
        id: 'galaxy-collision',
        title: 'Galaxy Collision',
        description: 'Two galaxies collide and merge. Watch gravitational interactions tear them apart and reform.',
        category: 'astronomy',
        file: 'sketches/galaxy-collision.js',
        color: '#9d4edd',
        tags: ['cosmology', 'gravity', 'advanced']
    },
    {
        id: 'star-lifecycle',
        title: 'Star Lifecycle',
        description: 'A star is born, burns for billions of years, then dies. Watch the complete stellar evolution.',
        category: 'astronomy',
        file: 'sketches/star-lifecycle.js',
        color: '#9d4edd',
        tags: ['stellar', 'evolution', 'intermediate']
    },
    {
        id: 'exoplanet-detection',
        title: 'Exoplanet Detection',
        description: 'A planet orbits a star and causes a slight dimming. Detect exoplanets using the transit method.',
        category: 'astronomy',
        file: 'sketches/exoplanet-detection.js',
        color: '#9d4edd',
        tags: ['planets', 'detection', 'intermediate']
    },
    {
        id: 'neutron-star',
        title: 'Neutron Star',
        description: 'The remnant of a supernova. Incredibly dense. Watch matter behave strangely under extreme gravity.',
        category: 'astronomy',
        file: 'sketches/neutron-star.js',
        color: '#9d4edd',
        tags: ['stellar', 'relativity', 'advanced']
    },
    {
        id: 'cosmic-expansion',
        title: 'Cosmic Expansion',
        description: 'The universe expands. Galaxies recede from each other. Watch dark energy drive acceleration.',
        category: 'astronomy',
        file: 'sketches/cosmic-expansion.js',
        color: '#9d4edd',
        tags: ['cosmology', 'relativity', 'advanced']
    }
];

function initGallery() {
    console.log(`%c🌀 VISIQ - 40+ Interactive Science Simulations`, 'color: #e8a04c; font-size: 16px; font-weight: bold;');
    
    // Generate grids for each category
    const categories = ['physics', 'biology', 'geography', 'astronomy'];
    
    categories.forEach(category => {
        const gridId = `gallery-grid-${category}`;
        const gridElement = document.getElementById(gridId);
        
        if (gridElement) {
            const categorySimulations = SIMULATIONS.filter(sim => sim.category === category);
            
            categorySimulations.forEach(sim => {
                const card = createGalleryCard(sim);
                gridElement.appendChild(card);
            });
        }
    });

    document.getElementById('back-button').addEventListener('click', backToGallery);
    document.getElementById('close-btn')?.addEventListener('click', backToGallery);
    document.getElementById('reset-button').addEventListener('click', resetSimulation);
    
    setupCursorGlow();
    
    console.log(`✅ Loaded ${SIMULATIONS.length} simulations across 4 domains`);
}

function createGalleryCard(sim) {
    const card = document.createElement('div');
    card.className = 'gallery-card';
    card.setAttribute('data-id', sim.id);
    
    card.innerHTML = `
        <div class="card-preview" id="preview-${sim.id}">
            <span>Loading...</span>
        </div>
        <h3 class="card-title">${sim.title}</h3>
        <p class="card-description">${sim.description}</p>
        <div style="margin-top: 12px; display: flex; gap: 6px; flex-wrap: wrap;">
            ${sim.tags.map(tag => `<span style="font-size: 11px; color: #a0a0a8; background: rgba(232, 160, 76, 0.1); padding: 4px 8px; border-radius: 4px;">${tag}</span>`).join('')}
        </div>
    `;
    
    card.addEventListener('click', () => {
        console.log(`🚀 Opening: ${sim.title}`);
        openSimulation(sim);
    });
    
    loadCardPreview(sim.id, sim.color);
    
    return card;
}

function loadCardPreview(simId, color) {
    const previewEl = document.getElementById(`preview-${simId}`);
    const canvas = document.createElement('canvas');
    canvas.width = 280;
    canvas.height = 160;
    previewEl.innerHTML = '';
    previewEl.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    let angle = 0;
    
    function draw() {
        ctx.fillStyle = '#050507';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(angle);
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.6;
        
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(0, 0, 20 + i * 15, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        ctx.restore();
        angle += 0.02;
        requestAnimationFrame(draw);
    }
    
    draw();
}

function openSimulation(sim) {
    document.getElementById('gallery-view').classList.remove('active');
    document.getElementById('simulation-view').classList.add('active');
    
    document.getElementById('sim-title').textContent = sim.title;
    document.getElementById('sim-description').textContent = sim.description;
    document.getElementById('controls-section').innerHTML = '';
    
    if (currentSketchInstance) {
        try {
            currentSketchInstance.remove();
        } catch (e) {
            console.warn('Cleanup error:', e);
        }
        currentSketchInstance = null;
    }
    
    currentSketch = sim;
    loadSketch(sim.file);
}

function loadSketch(filePath) {
    const script = document.createElement('script');
    script.src = filePath + '?t=' + Date.now();
    script.onerror = () => console.error(`❌ Failed to load: ${filePath}`);
    document.head.appendChild(script);
}

function backToGallery() {
    document.getElementById('simulation-view').classList.remove('active');
    document.getElementById('gallery-view').classList.add('active');
    
    if (currentSketchInstance) {
        try {
            currentSketchInstance.remove();
        } catch (e) {
            console.warn('Cleanup error:', e);
        }
        currentSketchInstance = null;
    }
    
    console.log('🏠 Back to gallery');
}

function resetSimulation() {
    if (currentSketchInstance && currentSketchInstance.resetSketch) {
        currentSketchInstance.resetSketch();
        console.log('🔄 Simulation reset');
    }
}

function setupCursorGlow() {
    const glow = document.getElementById('cursor-glow');
    document.addEventListener('mousemove', (e) => {
        glow.style.left = (e.clientX - 20) + 'px';
        glow.style.top = (e.clientY - 20) + 'px';
    });
}

window.createControlGroup = function(label, min, max, value, onChange) {
    const group = document.createElement('div');
    group.className = 'control-group';
    
    const labelEl = document.createElement('label');
    labelEl.className = 'control-label';
    labelEl.innerHTML = `<span>${label}</span><span class="control-value">${value.toFixed(2)}</span>`;
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'slider';
    slider.min = min;
    slider.max = max;
    slider.step = (max - min) / 200;
    slider.value = value;
    
    const valueDisplay = labelEl.querySelector('.control-value');
    
    slider.addEventListener('input', (e) => {
        const newValue = parseFloat(e.target.value);
        valueDisplay.textContent = newValue.toFixed(2);
        onChange(newValue);
    });
    
    group.appendChild(labelEl);
    group.appendChild(slider);
    return group;
};

window.createButton = function(label, onClick) {
    const button = document.createElement('button');
    button.className = 'reset-button';
    button.textContent = label;
    button.addEventListener('click', onClick);
    return button;
};

window.createColorPicker = function(label, initialColor, onChange) {
    const group = document.createElement('div');
    group.className = 'control-group';
    
    const labelEl = document.createElement('label');
    labelEl.className = 'control-label';
    labelEl.textContent = label;
    
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.className = 'color-button';
    colorInput.value = initialColor;
    colorInput.addEventListener('change', (e) => onChange(e.target.value));
    
    group.appendChild(labelEl);
    group.appendChild(colorInput);
    return group;
};

window.initSketch = function(instance) {
    currentSketchInstance = instance;
};

document.addEventListener('DOMContentLoaded', initGallery);