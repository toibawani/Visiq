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
    {
        id: 'newton',
        title: "Newton's Playground",
        description: 'Explore F = ma with interactive force vectors. Drag objects and adjust mass, friction to see real-time acceleration.',
        file: 'sketches/newton.js',
        color: '#e85d4a',
        tags: ['mechanics', 'forces', 'beginner']
    },
    {
        id: 'lotus',
        title: 'Lotus Effect',
        description: 'Hydrophobic water droplets on textured surfaces. Tilt the surface and watch droplets bead up with realistic surface tension physics.',
        file: 'sketches/lotus.js',
        color: '#4a90e2',
        tags: ['surface-physics', 'particles', 'intermediate']
    },
    {
        id: 'mountains',
        title: 'Plate Tectonics',
        description: 'Compress geological time. Scrub the timeline to watch continental plates collide and fold into layered mountains.',
        file: 'sketches/mountains.js',
        color: '#8b7355',
        tags: ['geology', 'time-scale', 'intermediate']
    },
    {
        id: 'murmuration',
        title: 'Murmuration',
        description: '500 intelligent particles following separation, alignment, and cohesion rules. Adjust weights to watch flocks emerge from chaos.',
        file: 'sketches/murmuration.js',
        color: '#9d4edd',
        tags: ['boids', 'emergence', 'ai']
    },
    {
        id: 'ferromagnetism',
        title: 'Ferromagnetism',
        description: 'Click to place magnetic poles (N/S). Watch iron particles align with invisible magnetic field lines in real-time.',
        file: 'sketches/ferromagnetism.js',
        color: '#ff006e',
        tags: ['fields', 'magnetism', 'forces']
    },
    {
        id: 'fourier',
        title: 'Fourier Circles',
        description: 'Draw any shape. The Fourier Transform decomposes it into spinning circles. Pure mathematical art in motion.',
        file: 'sketches/fourier.js',
        color: '#00d9ff',
        tags: ['mathematics', 'transforms', 'expert']
    },
    {
        id: 'gravity-tree',
        title: 'Gravity Tree',
        description: 'Particles fall under gravity and collide. Watch mini-galaxies form and merge in emergent N-body physics.',
        file: 'sketches/gravity-tree.js',
        color: '#ffbe0b',
        tags: ['gravity', 'collision', 'emergence']
    }
];

function initGallery() {
    console.log(`%c🌀 VISIQ v${VERSION.major}.${VERSION.minor}.${VERSION.patch} by toibawani`, 'color: #e8a04c; font-size: 16px; font-weight: bold;');
    console.log(`📧 Contact: toibawani14@gmail.com`);
    console.log(`🔗 GitHub: https://github.com/toibawani/visiq`);
    
    const galleryGrid = document.getElementById('gallery-grid');
    
    SIMULATIONS.forEach((sim) => {
        const card = createGalleryCard(sim);
        galleryGrid.appendChild(card);
    });

    document.getElementById('back-button').addEventListener('click', backToGallery);
    document.getElementById('close-btn')?.addEventListener('click', backToGallery);
    document.getElementById('reset-button').addEventListener('click', resetSimulation);
    
    setupCursorGlow();
    
    console.log(`✅ Gallery ready with ${SIMULATIONS.length} simulations`);
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