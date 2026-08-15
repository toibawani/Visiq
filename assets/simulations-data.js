// ===== VISIQ SIMULATIONS DATABASE =====
// Complete catalog of all 39 interactive science simulations

const SIMULATIONS = [
    // ===== PHYSICS =====
    {
        id: 'newton',
        title: "Newton's Playground",
        category: 'Physics',
        icon: '⚛️',
        difficulty: 'Beginner',
        description: 'Explore force, mass, and acceleration with interactive objects',
        longDescription: 'Discover Newton\'s laws of motion by dragging objects and applying forces. Watch how mass affects acceleration and see vectors visualize the forces at work.',
        tags: ['forces', 'motion', 'vectors', 'acceleration'],
        learningOutcomes: [
            'Understand F=ma relationship',
            'Visualize force vectors',
            'Explore mass and acceleration',
            'Learn conservation of momentum'
        ],
        estimatedTime: '5-8 min'
    },
    {
        id: 'black-hole-orbit',
        title: 'Black Hole Orbit',
        category: 'Physics',
        icon: '🌌',
        difficulty: 'Advanced',
        description: 'Experience gravitational warping around a black hole',
        longDescription: 'Witness spacetime distortion as particles orbit a black hole. Adjust initial velocity to create stable orbits or watch objects spiral into the event horizon.',
        tags: ['gravity', 'relativity', 'spacetime', 'orbits'],
        learningOutcomes: [
            'Understand gravitational fields',
            'Visualize spacetime curvature',
            'Explore orbital mechanics',
            'Learn about event horizons'
        ],
        estimatedTime: '8-12 min'
    },
    {
        id: 'gravity-tree',
        title: 'Gravity Tree',
        category: 'Physics',
        icon: '🌳',
        difficulty: 'Intermediate',
        description: 'Build gravitational structures and watch them evolve',
        longDescription: 'Place particles and watch gravity create natural structures. See how initial conditions lead to completely different outcomes.',
        tags: ['gravity', 'n-body', 'emergence', 'chaos'],
        learningOutcomes: [
            'Understand gravitational attraction',
            'Explore emergent complexity',
            'Learn about chaos theory',
            'See self-organization in nature'
        ],
        estimatedTime: '10-15 min'
    },
    {
        id: 'wave-interference',
        title: 'Wave Interference',
        category: 'Physics',
        icon: '〰️',
        difficulty: 'Intermediate',
        description: 'Create interference patterns with light and sound waves',
        longDescription: 'Adjust wavelength and frequency to create constructive and destructive interference. Watch standing waves emerge.',
        tags: ['waves', 'interference', 'frequency', 'resonance'],
        learningOutcomes: [
            'Understand wave superposition',
            'Visualize interference patterns',
            'Learn about resonance',
            'Explore standing waves'
        ],
        estimatedTime: '7-10 min'
    },
    {
        id: 'doppler-effect',
        title: 'Doppler Effect',
        category: 'Physics',
        icon: '🎵',
        difficulty: 'Intermediate',
        description: 'Hear and see the Doppler shift as objects move',
        longDescription: 'Move a sound source toward and away from you. Observe how frequency changes and hear the pitch shift. Learn why ambulance sirens sound different.',
        tags: ['waves', 'frequency', 'sound', 'motion'],
        learningOutcomes: [
            'Understand frequency shift',
            'Learn why pitch changes',
            'Explore wave physics',
            'Understand relative motion'
        ],
        estimatedTime: '6-9 min'
    },
    {
        id: 'pendulum-chaos',
        title: 'Pendulum Chaos',
        category: 'Physics',
        icon: '🎯',
        difficulty: 'Advanced',
        description: 'Explore chaotic behavior in pendulum systems',
        longDescription: 'Adjust initial angle and watch how tiny changes lead to drastically different motions. Discover the edge of chaos.',
        tags: ['chaos', 'dynamics', 'nonlinear', 'sensitivity'],
        learningOutcomes: [
            'Understand chaos theory',
            'Learn about sensitive dependence',
            'Explore nonlinear dynamics',
            'See butterfly effect'
        ],
        estimatedTime: '10-15 min'
    },
    {
        id: 'quantum-tunnel',
        title: 'Quantum Tunneling',
        category: 'Physics',
        icon: '🔬',
        difficulty: 'Advanced',
        description: 'Watch particles tunnel through barriers',
        longDescription: 'See how quantum particles can pass through potential barriers that should be impenetrable. Adjust barrier height and width.',
        tags: ['quantum', 'probability', 'tunneling', 'wavefunctions'],
        learningOutcomes: [
            'Understand quantum tunneling',
            'Learn about wavefunctions',
            'Explore probability in quantum',
            'See quantum-classical difference'
        ],
        estimatedTime: '8-12 min'
    },
    {
        id: 'magnetic-field',
        title: 'Magnetic Field',
        category: 'Physics',
        icon: '🧲',
        difficulty: 'Intermediate',
        description: 'Visualize magnetic fields with particle trajectories',
        longDescription: 'Place magnets and watch particles curve along field lines. Understand how magnetic fields guide charged particles.',
        tags: ['magnetism', 'fields', 'charged particles', 'forces'],
        learningOutcomes: [
            'Visualize magnetic fields',
            'Understand Lorentz force',
            'Learn about field strength',
            'Explore electromagnetic induction'
        ],
        estimatedTime: '7-10 min'
    },
    {
        id: 'ferromagnetism',
        title: 'Ferromagnetism',
        category: 'Physics',
        icon: '⬆️',
        difficulty: 'Intermediate',
        description: 'See how atomic spins create magnetic materials',
        longDescription: 'Watch individual electron spins align to create macroscopic magnetism. Apply external fields to magnetize and demagnetize.',
        tags: ['magnetism', 'materials', 'spins', 'alignment'],
        learningOutcomes: [
            'Understand magnetic domains',
            'Learn about spin alignment',
            'Explore ferromagnetic materials',
            'See how magnets work'
        ],
        estimatedTime: '8-11 min'
    },
    {
        id: 'fourier',
        title: 'Fourier Transform',
        category: 'Physics',
        icon: '📊',
        difficulty: 'Advanced',
        description: 'Decompose complex waves into simple frequencies',
        longDescription: 'Draw any waveform and watch it decompose into sine waves. See how any signal is built from simple components.',
        tags: ['fourier', 'frequency', 'signals', 'analysis'],
        learningOutcomes: [
            'Understand Fourier analysis',
            'Learn frequency decomposition',
            'Explore signal processing',
            'See wave composition'
        ],
        estimatedTime: '10-15 min'
    },
    {
        id: 'pressure-temperature',
        title: 'Gas Laws',
        category: 'Physics',
        icon: '💨',
        difficulty: 'Beginner',
        description: 'Explore pressure, temperature, and volume relationships',
        longDescription: 'Change temperature and volume to see how pressure changes. Discover PV=nRT through interactive exploration.',
        tags: ['gases', 'pressure', 'temperature', 'thermodynamics'],
        learningOutcomes: [
            'Understand ideal gas law',
            'Learn kinetic theory',
            'Explore pressure-temperature',
            'See molecular motion'
        ],
        estimatedTime: '6-9 min'
    },

    // ===== BIOLOGY =====
    {
        id: 'dna-replication',
        title: 'DNA Replication',
        category: 'Biology',
        icon: '🧬',
        difficulty: 'Intermediate',
        description: 'Watch DNA strands separate and replicate',
        longDescription: 'See the intricate process of DNA replication. Watch helicase unwind the double helix, primase create primers, and DNA polymerase add nucleotides.',
        tags: ['dna', 'genetics', 'replication', 'molecular'],
        learningOutcomes: [
            'Understand DNA structure',
            'Learn replication process',
            'Explore molecular machinery',
            'See genetic information copying'
        ],
        estimatedTime: '8-12 min'
    },
    {
        id: 'mitosis',
        title: 'Mitosis',
        category: 'Biology',
        icon: '🔄',
        difficulty: 'Beginner',
        description: 'Witness cell division in real-time',
        longDescription: 'Follow a cell through prophase, metaphase, anaphase, and telophase. See chromosomes align and separate.',
        tags: ['cell division', 'chromosomes', 'genetics', 'biology'],
        learningOutcomes: [
            'Understand cell division',
            'Learn chromosome behavior',
            'Explore genetic distribution',
            'See life at cellular level'
        ],
        estimatedTime: '6-9 min'
    },
    {
        id: 'meiosis',
        title: 'Meiosis',
        category: 'Biology',
        icon: '👥',
        difficulty: 'Intermediate',
        description: 'Explore sexual reproduction at the cellular level',
        longDescription: 'Watch cells divide twice to create four unique gametes. Understand genetic variation and crossing over.',
        tags: ['meiosis', 'genetics', 'reproduction', 'variation'],
        learningOutcomes: [
            'Understand meiosis',
            'Learn genetic recombination',
            'Explore genetic diversity',
            'See sexual reproduction'
        ],
        estimatedTime: '8-12 min'
    },
    {
        id: 'protein-folding',
        title: 'Protein Folding',
        category: 'Biology',
        icon: '🧵',
        difficulty: 'Advanced',
        description: 'See how proteins fold into their functional shapes',
        longDescription: 'Watch amino acid chains fold based on hydrophobic interactions, hydrogen bonds, and disulfide bridges. Understand 3D protein structure.',
        tags: ['proteins', 'folding', 'molecular', 'structure'],
        learningOutcomes: [
            'Understand protein structure',
            'Learn folding patterns',
            'Explore molecular interactions',
            'See function from structure'
        ],
        estimatedTime: '10-15 min'
    },
    {
        id: 'enzyme-kinetics',
        title: 'Enzyme Kinetics',
        category: 'Biology',
        icon: '⚙️',
        difficulty: 'Advanced',
        description: 'Explore how enzymes speed up chemical reactions',
        longDescription: 'Adjust enzyme concentration and substrate availability. See Michaelis-Menten kinetics in action.',
        tags: ['enzymes', 'catalysis', 'kinetics', 'biochemistry'],
        learningOutcomes: [
            'Understand enzyme catalysis',
            'Learn reaction kinetics',
            'Explore enzyme efficiency',
            'See biological acceleration'
        ],
        estimatedTime: '10-15 min'
    },
    {
        id: 'population-genetics',
        title: 'Population Genetics',
        category: 'Biology',
        icon: '📈',
        difficulty: 'Intermediate',
        description: 'Watch allele frequencies change over generations',
        longDescription: 'Adjust selection pressure and mutation rate. See how populations evolve and adapt.',
        tags: ['evolution', 'genetics', 'selection', 'population'],
        learningOutcomes: [
            'Understand evolution',
            'Learn natural selection',
            'Explore genetic drift',
            'See population change'
        ],
        estimatedTime: '10-15 min'
    },
    {
        id: 'neuron-firing',
        title: 'Neuron Firing',
        category: 'Biology',
        icon: '⚡',
        difficulty: 'Intermediate',
        description: 'Experience action potentials and neural signals',
        longDescription: 'See how neurons generate action potentials. Watch ions flow across membranes and signals propagate.',
        tags: ['neuroscience', 'neurons', 'electricity', 'signaling'],
        learningOutcomes: [
            'Understand action potentials',
            'Learn ion channels',
            'Explore neural signals',
            'See electrical brain activity'
        ],
        estimatedTime: '8-12 min'
    },
    {
        id: 'virus-spreading',
        title: 'Virus Spreading',
        category: 'Biology',
        icon: '🦠',
        difficulty: 'Intermediate',
        description: 'Simulate viral spread through a population',
        longDescription: 'Control infection rate and recovery time. See how vaccination and social distancing affect outbreak curves.',
        tags: ['epidemiology', 'viruses', 'modeling', 'health'],
        learningOutcomes: [
            'Understand disease spread',
            'Learn public health',
            'Explore intervention strategies',
            'See population immunity'
        ],
        estimatedTime: '8-12 min'
    },

    // ===== GEOGRAPHY =====
    {
        id: 'plate-tectonics',
        title: 'Plate Tectonics',
        category: 'Geography',
        icon: '🌍',
        difficulty: 'Intermediate',
        description: 'Watch Earth\'s plates collide, slide, and build mountains',
        longDescription: 'Move tectonic plates to create mountain ranges, ocean trenches, and earthquakes. Understand the dynamic Earth.',
        tags: ['geology', 'tectonics', 'earthquakes', 'mountains'],
        learningOutcomes: [
            'Understand plate movement',
            'Learn mountain formation',
            'Explore earthquake zones',
            'See Earth dynamics'
        ],
        estimatedTime: '8-12 min'
    },
    {
        id: 'ocean-currents',
        title: 'Ocean Currents',
        category: 'Geography',
        icon: '🌊',
        difficulty: 'Intermediate',
        description: 'Explore how ocean currents distribute heat and life',
        longDescription: 'Adjust temperature, salinity, and wind. Watch currents emerge and trace how nutrients and heat flow worldwide.',
        tags: ['oceanography', 'currents', 'climate', 'circulation'],
        learningOutcomes: [
            'Understand ocean currents',
            'Learn climate transport',
            'Explore fluid dynamics',
            'See global circulation'
        ],
        estimatedTime: '8-12 min'
    },
    {
        id: 'hurricane-formation',
        title: 'Hurricane Formation',
        category: 'Geography',
        icon: '🌀',
        difficulty: 'Intermediate',
        description: 'Watch hurricanes develop and intensify over warm water',
        longDescription: 'Adjust sea surface temperature, wind shear, and humidity. See how these factors create powerful rotating storms.',
        tags: ['weather', 'storms', 'meteorology', 'climate'],
        learningOutcomes: [
            'Understand hurricane dynamics',
            'Learn atmospheric physics',
            'Explore extreme weather',
            'See climate impact'
        ],
        estimatedTime: '8-12 min'
    },
    {
        id: 'water-cycle',
        title: 'Water Cycle',
        category: 'Geography',
        icon: '💧',
        difficulty: 'Beginner',
        description: 'Follow water as it evaporates, condenses, and precipitates',
        longDescription: 'Adjust temperature and see the continuous cycle of water transformation. Understand how water moves through Earth\'s systems.',
        tags: ['water', 'climate', 'cycles', 'atmosphere'],
        learningOutcomes: [
            'Understand water cycle',
            'Learn phase changes',
            'Explore atmospheric transport',
            'See Earth\'s hydrology'
        ],
        estimatedTime: '6-9 min'
    },
    {
        id: 'erosion-weathering',
        title: 'Erosion & Weathering',
        category: 'Geography',
        icon: '🏜️',
        difficulty: 'Intermediate',
        description: 'See how water and wind reshape landscapes',
        longDescription: 'Apply erosional forces and watch mountains wear down. Understand geological timescales and landscape formation.',
        tags: ['geology', 'erosion', 'weathering', 'landscapes'],
        learningOutcomes: [
            'Understand erosion processes',
            'Learn landscape evolution',
            'Explore geological timescales',
            'See Earth\'s transformation'
        ],
        estimatedTime: '8-12 min'
    },
    {
        id: 'earthquake-waves',
        title: 'Earthquake Waves',
        category: 'Geography',
        icon: '📊',
        difficulty: 'Intermediate',
        description: 'Visualize P-waves and S-waves propagating through Earth',
        longDescription: 'Trigger an earthquake and watch seismic waves ripple through crustal layers. Understand how scientists locate earthquakes.',
        tags: ['seismology', 'earthquakes', 'waves', 'geology'],
        learningOutcomes: [
            'Understand seismic waves',
            'Learn earthquake detection',
            'Explore Earth\'s interior',
            'See wave propagation'
        ],
        estimatedTime: '8-12 min'
    },
    {
        id: 'volcanic-eruption',
        title: 'Volcanic Eruption',
        category: 'Geography',
        icon: '🌋',
        difficulty: 'Intermediate',
        description: 'Experience volcanic processes and magma dynamics',
        longDescription: 'Adjust magma temperature, pressure, and gas content. Watch eruptions vary in intensity and style.',
        tags: ['volcanology', 'magma', 'geology', 'hazards'],
        learningOutcomes: [
            'Understand volcanic processes',
            'Learn magma dynamics',
            'Explore eruption types',
            'See geological hazards'
        ],
        estimatedTime: '8-12 min'
    },

    // ===== ASTRONOMY =====
    {
        id: 'star-lifecycle',
        title: 'Star Lifecycle',
        category: 'Astronomy',
        icon: '⭐',
        difficulty: 'Intermediate',
        description: 'Watch stars form, live, and die over cosmic timescales',
        longDescription: 'Follow a star from birth in a nebula through main sequence to its final stages. Understand stellar evolution and end states.',
        tags: ['stars', 'astronomy', 'evolution', 'cosmology'],
        learningOutcomes: [
            'Understand star formation',
            'Learn stellar evolution',
            'Explore star death',
            'See cosmic timescales'
        ],
        estimatedTime: '8-12 min'
    },
    {
        id: 'galaxy-collision',
        title: 'Galaxy Collision',
        category: 'Astronomy',
        icon: '🌌',
        difficulty: 'Advanced',
        description: 'Simulate merging galaxies and their gravitational dance',
        longDescription: 'Collide two galaxies and watch them merge. See how gravity reshapes structures and triggers star formation.',
        tags: ['galaxies', 'gravity', 'cosmology', 'n-body'],
        learningOutcomes: [
            'Understand galaxy mergers',
            'Learn gravitational effects',
            'Explore galactic structure',
            'See cosmic evolution'
        ],
        estimatedTime: '10-15 min'
    },
    {
        id: 'cosmic-expansion',
        title: 'Cosmic Expansion',
        category: 'Astronomy',
        icon: '🚀',
        difficulty: 'Advanced',
        description: 'Explore the expansion of the universe and Hubble\'s law',
        longDescription: 'Watch galaxies recede as space itself expands. Adjust expansion rate and see how the universe evolves.',
        tags: ['cosmology', 'expansion', 'relativity', 'universe'],
        learningOutcomes: [
            'Understand cosmic expansion',
            'Learn Hubble\'s law',
            'Explore big bang',
            'See universe\'s fate'
        ],
        estimatedTime: '10-15 min'
    },
    {
        id: 'exoplanet-detection',
        title: 'Exoplanet Detection',
        category: 'Astronomy',
        icon: '🪐',
        difficulty: 'Intermediate',
        description: 'Discover planets around other stars using transit method',
        longDescription: 'Watch as planets orbit distant stars and pass in front of their light. Learn how astronomers discover exoplanets.',
        tags: ['exoplanets', 'astronomy', 'transit', 'detection'],
        learningOutcomes: [
            'Understand transit method',
            'Learn planet detection',
            'Explore exoplanet systems',
            'See other worlds'
        ],
        estimatedTime: '8-12 min'
    },
    {
        id: 'neutron-star',
        title: 'Neutron Star',
        category: 'Astronomy',
        icon: '💫',
        difficulty: 'Advanced',
        description: 'Explore the extreme physics of neutron stars',
        longDescription: 'See how massive stars collapse to city-sized objects. Experience extreme density and gravitational effects.',
        tags: ['neutron stars', 'gravity', 'astrophysics', 'extremes'],
        learningOutcomes: [
            'Understand neutron stars',
            'Learn stellar collapse',
            'Explore extreme physics',
            'See quantum effects'
        ],
        estimatedTime: '10-15 min'
    },
    {
        id: 'lotus',
        title: 'Lotus Leaf',
        category: 'Astronomy',
        icon: '🌸',
        difficulty: 'Beginner',
        description: 'Watch water droplets dance on a lotus leaf',
        longDescription: 'Explore hydrophobic surfaces and self-cleaning effects. See how nature engineers water repelling.',
        tags: ['biomimicry', 'surfaces', 'physics', 'nature'],
        learningOutcomes: [
            'Understand surface tension',
            'Learn hydrophobic effects',
            'Explore biomimicry',
            'See nature\'s engineering'
        ],
        estimatedTime: '5-8 min'
    },
    {
        id: 'murmuration',
        title: 'Murmuration',
        category: 'Astronomy',
        icon: '🐦',
        difficulty: 'Intermediate',
        description: 'Watch flocking behavior and emergent group dynamics',
        longDescription: 'See how simple individual rules create complex collective patterns. Adjust separation, alignment, and cohesion.',
        tags: ['emergence', 'flocking', 'behavior', 'complexity'],
        learningOutcomes: [
            'Understand emergent behavior',
            'Learn flocking rules',
            'Explore collective intelligence',
            'See self-organization'
        ],
        estimatedTime: '8-12 min'
    },
    {
        id: 'mountains',
        title: 'Mountain Formation',
        category: 'Geography',
        icon: '⛰️',
        difficulty: 'Intermediate',
        description: 'Build mountains through collision and erosion',
        longDescription: 'Create mountain ranges through tectonic collision. Watch erosion gradually wear them down.',
        tags: ['geology', 'mountains', 'tectonics', 'timescale'],
        learningOutcomes: [
            'Understand orogeny',
            'Learn mountain building',
            'Explore timescales',
            'See geological processes'
        ],
        estimatedTime: '8-12 min'
    }
];