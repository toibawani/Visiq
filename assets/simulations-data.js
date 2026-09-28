// ===== VISIQ SIMULATIONS CATALOG (29 CANONICAL SIMULATIONS) =====
// Explanations written plainly for curious people. No marketing buzzwords.
// Accurate scientific principles with real physical parameters.

const SIMULATIONS = [
    // ══════════════════════════════════════════════════
    // PHYSICS (8)
    // ══════════════════════════════════════════════════
    {
        id: 'newton',
        title: "Newton's Playground",
        category: 'Physics',
        icon: '⚛️',
        difficulty: 'Beginner',
        description: 'Drag masses and tweak gravity and friction to see F = ma in motion.',
        longDescription: 'Sir Isaac Newton noted that an object stays at rest or in steady motion unless an unbalanced force pushes it. Here you can apply forces directly to masses, observe their acceleration vectors, and test how surface friction drains kinetic energy.',
        tags: ['forces', 'motion', 'friction', 'vectors', 'acceleration'],
        learningOutcomes: [
            'See how acceleration scales directly with applied force and inversely with mass',
            'Watch friction oppose velocity until motion halts',
            'Inspect momentum exchange during wall collisions'
        ],
        estimatedTime: '5-8 min'
    },
    {
        id: 'black-hole',
        title: 'Black Hole Spacetime',
        category: 'Physics',
        icon: '🕳️',
        difficulty: 'Advanced',
        description: 'Watch how strong gravitational fields curve particle paths and light rays.',
        longDescription: 'General relativity tells us that mass curves spacetime. Near a compact massive object, paths that would otherwise be straight lines curve sharply. Inside the event horizon, escape velocity exceeds the speed of light in vacuum, so nothing returns.',
        tags: ['gravity', 'relativity', 'event horizon', 'spacetime', 'lensing'],
        learningOutcomes: [
            'Observe gravitational deflection as particles pass close to the center',
            'Identify the event horizon boundary where orbits become impossible',
            'Compare stable distant orbits against unstable inner trajectories'
        ],
        estimatedTime: '8-12 min'
    },
    {
        id: 'wave-interference',
        title: 'Wave Interference',
        category: 'Physics',
        icon: '〰️',
        difficulty: 'Intermediate',
        description: 'Combine two ripple sources to explore constructive and destructive interference.',
        longDescription: 'When two waves pass through the same medium, their displacements add together at every point (the principle of superposition). Where crest meets crest, the wave reinforces; where crest meets trough, they cancel out, leaving still water.',
        tags: ['waves', 'superposition', 'wavelength', 'phase', 'nodes'],
        learningOutcomes: [
            'Locate nodal lines where waves cancel out completely',
            'See how changing wavelength spaces out the interference fringes',
            'Observe how shifting source separation alters the fringe pattern'
        ],
        estimatedTime: '6-10 min'
    },
    {
        id: 'quantum-tunnel',
        title: 'Quantum Tunneling',
        category: 'Physics',
        icon: '🔬',
        difficulty: 'Advanced',
        description: 'Send wave packets at an energy barrier they classically cannot cross.',
        longDescription: 'In classical physics, a rolling ball cannot pass over a hill higher than its kinetic energy. In quantum mechanics, particles behave as wavefunctions. When a probability wave meets a thin potential barrier, an exponential tail penetrates it, giving a non-zero chance of appearing on the other side.',
        tags: ['quantum', 'wavefunction', 'probability', 'barrier', 'tunneling'],
        learningOutcomes: [
            'Watch the incident wavefunction split into reflected and transmitted packets',
            'Observe how barrier thickness exponentially dampens transmission probability',
            'Understand that tunneling is how alpha decay happens and how tunnel diodes work'
        ],
        estimatedTime: '8-12 min'
    },
    {
        id: 'pendulum-chaos',
        title: 'Double Pendulum Chaos',
        category: 'Physics',
        icon: '🎯',
        difficulty: 'Advanced',
        description: 'Release two connected arms and watch tiny starting nudges create wildly different paths.',
        longDescription: 'A single pendulum oscillates predictably. Adding a second pendulum to the tip of the first creates a coupled nonlinear system. It obeys deterministic Newtonian equations, yet tiny differences in starting angle diverge exponentially over time—the hallmark of deterministic chaos.',
        tags: ['chaos', 'pendulum', 'nonlinear', 'phase space', 'lyapunov'],
        learningOutcomes: [
            'Compare two runs with starting angles differing by only 0.1 degree',
            'Watch energy continuously trade off between the two arms',
            'Notice that determinism does not guarantee predictability'
        ],
        estimatedTime: '7-12 min'
    },
    {
        id: 'magnetic-field',
        title: 'Magnetic Field & Lorentz Force',
        category: 'Physics',
        icon: '🧲',
        difficulty: 'Intermediate',
        description: 'Shoot charged particles past a magnetic dipole and watch their paths curve.',
        longDescription: 'A stationary charge ignores a magnetic field, but a moving charge feels the Lorentz force: F = q(v × B). Because this force is always perpendicular to velocity, it changes the direction of motion without doing work or changing particle speed.',
        tags: ['magnetism', 'lorentz force', 'dipole', 'charge', 'cyclotron'],
        learningOutcomes: [
            'Observe circular and helical particle paths in uniform and dipole fields',
            'Notice how reversing charge sign flips deflection direction',
            'See how Earth\'s magnetic field deflects solar wind particles toward the poles'
        ],
        estimatedTime: '6-10 min'
    },
    {
        id: 'doppler-effect',
        title: 'Doppler Effect',
        category: 'Physics',
        icon: '🔊',
        difficulty: 'Intermediate',
        description: 'Move a wave source and watch wavefronts bunch up in front and stretch out behind.',
        longDescription: 'When a sound source moves toward an observer, each new wave crest is emitted closer to the previous one, shortening the observed wavelength and raising the perceived pitch. When moving away, wave crests stretch apart. At Mach 1, wavefronts pile up into a shock cone.',
        tags: ['doppler', 'sound', 'mach', 'shockwave', 'frequency'],
        learningOutcomes: [
            'Observe wavefront compression ahead of the moving source',
            'Measure frequency shift for stationary versus moving listeners',
            'Exceed the wave speed to watch a Mach cone shock front form'
        ],
        estimatedTime: '5-9 min'
    },
    {
        id: 'pressure-temperature',
        title: 'Gas Laws & Molecular Motion',
        category: 'Physics',
        icon: '💨',
        difficulty: 'Beginner',
        description: 'Heat, compress, or add gas molecules inside a piston to test PV = NkT.',
        longDescription: 'Gases are collections of tiny particles in constant, rapid, random motion. Temperature measures the average kinetic energy of the molecules. Pressure is the cumulative force of millions of microscopic impacts against the container walls every second.',
        tags: ['gas laws', 'thermodynamics', 'pressure', 'temperature', 'kinetic theory'],
        learningOutcomes: [
            'Watch wall collisions increase as you heat gas particles',
            'Halve the container volume and see pressure double (Boyle\'s Law)',
            'Connect microscopic particle speeds to macroscopic temperature'
        ],
        estimatedTime: '5-8 min'
    },

    // ══════════════════════════════════════════════════
    // BIOLOGY (8)
    // ══════════════════════════════════════════════════
    {
        id: 'mitosis',
        title: 'Mitosis: Cell Division',
        category: 'Biology',
        icon: '🔄',
        difficulty: 'Intermediate',
        description: 'Step through prophase, metaphase, anaphase, and telophase as duplicated DNA divides.',
        longDescription: 'Mitosis is how eukaryotic cells replicate for growth and tissue repair. The cell condenses duplicated chromatin into visible chromosomes, aligns them along the equatorial plate, and uses microtubule spindle fibers to pull sister chromatids to opposite poles before dividing.',
        tags: ['mitosis', 'cells', 'chromosomes', 'spindle fibers', 'cytokinesis'],
        learningOutcomes: [
            'Track sister chromatids from alignment at metaphase to separation at anaphase',
            'See the role of spindle fibers anchored at centrosomes',
            'Understand that mitosis creates two genetically identical daughter cells'
        ],
        estimatedTime: '7-11 min'
    },
    {
        id: 'meiosis',
        title: 'Meiosis: Gamete Formation',
        category: 'Biology',
        icon: '👥',
        difficulty: 'Advanced',
        description: 'Follow two rounds of cell division and crossing over to form four unique haploid cells.',
        longDescription: 'Unlike mitosis, meiosis halves chromosome count from diploid (2n) to haploid (n) to produce eggs and sperm. In Prophase I, homologous chromosome pairs swap genetic material through crossing over, generating genetic diversity in every offspring.',
        tags: ['meiosis', 'gametes', 'crossing over', 'genetics', 'haploid'],
        learningOutcomes: [
            'Watch crossing over shuffle alleles between homologous chromatids',
            'Distinguish meiosis I (separating pairs) from meiosis II (separating sister chromatids)',
            'Count four distinct haploid gametes resulting from one precursor cell'
        ],
        estimatedTime: '8-12 min'
    },
    {
        id: 'dna-replication',
        title: 'DNA Replication',
        category: 'Biology',
        icon: '🧬',
        difficulty: 'Advanced',
        description: 'Watch helicase unwind the double helix and polymerase synthesize leading and lagging strands.',
        longDescription: 'Before a cell divides, it must copy roughly 3 billion base pairs. DNA helicase unzips the double helix, creating a replication fork. DNA polymerase can only read in one direction (5\' to 3\'), creating a continuous leading strand and a discontinuous lagging strand built of Okazaki fragments.',
        tags: ['dna', 'replication', 'polymerase', 'helicase', 'okazaki'],
        learningOutcomes: [
            'Match complementary base pairs (Adenine with Thymine, Cytosine with Guanine)',
            'See why the lagging strand must be synthesized backward in short segments',
            'Appreciate the molecular proofreading that keeps copying errors exceptionally rare'
        ],
        estimatedTime: '8-13 min'
    },
    {
        id: 'protein-folding',
        title: 'Protein Folding',
        category: 'Biology',
        icon: '🧶',
        difficulty: 'Advanced',
        description: 'Fold an amino acid string driven by hydrophobic collapse and electrostatic charge.',
        longDescription: 'A protein starts as a linear chain of amino acids coded by mRNA. Hydrophobic (water-fearing) side chains tuck inward to avoid water molecules, while hydrophilic residues stay outward. Hydrogen bonds stabilize alpha helices and beta sheets, yielding a precise functional 3D tool.',
        tags: ['proteins', 'folding', 'amino acids', 'hydrophobic', 'structure'],
        learningOutcomes: [
            'Observe how hydrophobic residues quickly cluster in the protein core',
            'See how altering side-chain polarity alters the final stable conformation',
            'Understand that a misfolded protein loses its biological function'
        ],
        estimatedTime: '7-11 min'
    },
    {
        id: 'enzyme-kinetics',
        title: 'Enzyme Kinetics',
        category: 'Biology',
        icon: '⚙️',
        difficulty: 'Intermediate',
        description: 'Measure reaction rates as substrate molecules bind active sites up to maximum velocity (Vmax).',
        longDescription: 'Enzymes are biological catalysts that speed up chemical reactions without being consumed. At low substrate concentrations, reaction velocity rises proportionally. Once all enzyme active sites are occupied, the reaction plateaus at maximum velocity (Vmax), described by the Michaelis-Menten curve.',
        tags: ['enzymes', 'catalysis', 'michaelis-menten', 'substrate', 'kinetics'],
        learningOutcomes: [
            'Identify Vmax (saturation point) and Km (substrate concentration at half Vmax)',
            'Add competitive inhibitor molecules and observe how they shift required substrate levels',
            'Understand why living cells regulate enzyme activity to control metabolism'
        ],
        estimatedTime: '6-10 min'
    },
    {
        id: 'neuron-firing',
        title: 'Neuron Action Potential',
        category: 'Biology',
        icon: '⚡',
        difficulty: 'Advanced',
        description: 'Trigger ion channels to watch an electrical spike travel along a nerve axon.',
        longDescription: 'Neurons maintain a negative resting electrical potential (~-70 mV) by pumping sodium ions out and potassium ions in. When a stimulus pushes the membrane past a threshold (~-55 mV), voltage-gated sodium channels burst open, causing a rapid positive spike (+30 mV) that propagates down the nerve fiber.',
        tags: ['neuroscience', 'action potential', 'sodium', 'potassium', 'synapse'],
        learningOutcomes: [
            'Identify the all-or-nothing threshold required to fire an impulse',
            'Track sodium influx during depolarization and potassium outflux during repolarization',
            'See why the refractory period prevents nerve signals from traveling backward'
        ],
        estimatedTime: '7-11 min'
    },
    {
        id: 'population-genetics',
        title: 'Population Genetics & Selection',
        category: 'Biology',
        icon: '📈',
        difficulty: 'Intermediate',
        description: 'Watch allele frequencies shift across generations under selection pressure and random drift.',
        longDescription: 'In a large population without selective pressure, allele frequencies remain constant (Hardy-Weinberg equilibrium). When environmental pressure gives one trait higher survival and reproduction rates, its allele frequency climbs over successive generations. In small populations, random chance (genetic drift) can eliminate alleles regardless of fitness.',
        tags: ['evolution', 'alleles', 'selection', 'genetic drift', 'hardy-weinberg'],
        learningOutcomes: [
            'Test how strong selection pressure accelerates adaptation across generations',
            'Shrink population size and observe random genetic drift overriding fitness',
            'Observe how recessive alleles can hide within heterozygous carriers'
        ],
        estimatedTime: '6-10 min'
    },
    {
        id: 'virus-spreading',
        title: 'Epidemic Spread (SIR Model)',
        category: 'Biology',
        icon: '🦠',
        difficulty: 'Intermediate',
        description: 'Tweak contact rate, transmission chance, and recovery time to model infection waves.',
        longDescription: 'Epidemiologists model outbreaks by tracking three compartments: Susceptible (S), Infected (I), and Recovered/Immune (R). The basic reproduction number (R0) determines whether an outbreak grows or dies out. When immune individuals make transmission unlikely, herd immunity stops the chain of infection.',
        tags: ['epidemiology', 'sir model', 'r0', 'transmission', 'immunity'],
        learningOutcomes: [
            'Observe how reducing contact rate flattens the peak infection curve',
            'Calculate the herd immunity threshold required to halt spread',
            'Trace the transition from exponential growth to depletion of susceptible hosts'
        ],
        estimatedTime: '6-9 min'
    },

    // ══════════════════════════════════════════════════
    // GEOGRAPHY & EARTH SCIENCE (7)
    // ══════════════════════════════════════════════════
    {
        id: 'plate-tectonics',
        title: 'Plate Tectonics & Boundaries',
        category: 'Geography',
        icon: '🌍',
        difficulty: 'Intermediate',
        description: 'Push continental and oceanic plates together to trigger subduction, trenches, and uplift.',
        longDescription: 'Earth\'s rigid crust is broken into tectonic plates floating on the semi-fluid asthenosphere. Where plates pull apart (divergent), magma wells up to form mid-ocean ridges. Where dense oceanic crust collides with lighter continental crust (convergent), it subducts into the mantle, melting and fueling volcanic arcs.',
        tags: ['geology', 'plates', 'subduction', 'mountains', 'trenches'],
        learningOutcomes: [
            'Differentiate convergent, divergent, and transform plate boundaries',
            'Watch a subducting oceanic slab melt and generate volcanic magma chambers',
            'Observe continental collision forming high-altitude mountain fold belts'
        ],
        estimatedTime: '7-11 min'
    },
    {
        id: 'ocean-currents',
        title: 'Ocean Currents & Gyres',
        category: 'Geography',
        icon: '🌊',
        difficulty: 'Intermediate',
        description: 'Explore how prevailing trade winds, Coriolis force, and continents create rotating ocean gyres.',
        longDescription: 'Surface ocean currents are driven primarily by prevailing global wind bands. Because Earth rotates, moving water deflects to the right in the Northern Hemisphere and to the left in the Southern Hemisphere (the Coriolis effect). Bound by continents, these currents organize into massive circular loops called gyres that redistribute heat from the equator toward the poles.',
        tags: ['oceanography', 'currents', 'gyres', 'coriolis', 'thermohaline'],
        learningOutcomes: [
            'See how the Coriolis effect turns wind-driven water into clockwise gyres in the north',
            'Track warm water transport along western boundary currents like the Gulf Stream',
            'Understand how cold, salty water sinks at high latitudes to drive deep ocean circulation'
        ],
        estimatedTime: '8-12 min'
    },
    {
        id: 'hurricane-formation',
        title: 'Hurricane Dynamics',
        category: 'Geography',
        icon: '🌀',
        difficulty: 'Advanced',
        description: 'Warm sea surfaces and low vertical wind shear organize thunderstorms into a rotating cyclone.',
        longDescription: 'Tropical cyclones are giant thermal heat engines fueled by water vapor rising from warm ocean water (above ~26.5°C). As moisture condenses, it releases latent heat, warming the column and lowering atmospheric pressure. Surrounding air rushes inward and is deflected by the Coriolis force into a spinning storm with a calm central eye.',
        tags: ['meteorology', 'cyclone', 'coriolis', 'latent heat', 'pressure'],
        learningOutcomes: [
            'See how sea surface temperature acts as the thermodynamic fuel source',
            'Observe low vertical wind shear allowing the storm chimney to remain upright',
            'Measure wind speed peaks in the eyewall directly surrounding the low-pressure center'
        ],
        estimatedTime: '8-12 min'
    },
    {
        id: 'erosion-weathering',
        title: 'River Erosion & Landforms',
        category: 'Geography',
        icon: '🏜️',
        difficulty: 'Intermediate',
        description: 'Direct water flow over varied rock strata to watch canyons carve and river meanders form.',
        longDescription: 'Flowing water is Earth\'s primary sculptor. Fast-moving water in steep terrain carries sediment that scours bedrock, cutting deep V-shaped valleys. In flatter terrain, water flows slower, eroding the outer bank of bends (cut banks) and depositing sediment on inner curves (point bars) to create winding meanders.',
        tags: ['geomorphology', 'erosion', 'rivers', 'sediment', 'canyons'],
        learningOutcomes: [
            'Watch gradient slope dictate water velocity and carrying capacity',
            'Differentiate physical downcutting from lateral meandering',
            'Observe soft rock layers eroding faster to form overhangs and waterfalls'
        ],
        estimatedTime: '6-10 min'
    },
    {
        id: 'water-cycle',
        title: 'The Water Cycle',
        category: 'Geography',
        icon: '💧',
        difficulty: 'Beginner',
        description: 'Track solar energy powering evaporation, atmospheric transport, condensation, and runoff.',
        longDescription: 'Earth\'s total water volume remains nearly constant, but water continually shifts phases and locations. Solar radiation evaporates liquid water into atmospheric vapor. As moist air rises and cools, vapor condenses onto microscopic aerosols into cloud droplets, eventually precipitating as rain or snow and feeding rivers back to the sea.',
        tags: ['hydrology', 'evaporation', 'condensation', 'precipitation', 'runoff'],
        learningOutcomes: [
            'Trace phase changes: liquid to vapor (absorbs heat) and vapor to liquid (releases heat)',
            'See how mountain ranges trigger orographic precipitation on windward slopes',
            'Follow groundwater infiltration and surface runoff pathways'
        ],
        estimatedTime: '5-8 min'
    },
    {
        id: 'earthquake-waves',
        title: 'Earthquake Seismic Waves',
        category: 'Geography',
        icon: '📊',
        difficulty: 'Intermediate',
        description: 'Rupture a subterranean fault and record how primary (P) and secondary (S) waves travel.',
        longDescription: 'When stress along a geological fault exceeds frictional resistance, rock slips suddenly, releasing stored elastic energy as seismic waves. Compressional Primary (P) waves travel fastest, pushing and pulling rock in the direction of wave travel. Shear Secondary (S) waves arrive later, shaking rock perpendicular to travel and unable to pass through liquid.',
        tags: ['seismology', 'earthquakes', 'p-waves', 's-waves', 'epicenter'],
        learningOutcomes: [
            'Compare the higher velocity of compressional P-waves against slower shear S-waves',
            'Use the arrival time gap (S-P lag) to calculate distance to the earthquake epicenter',
            'Understand how Earth\'s liquid outer core blocks S-waves, creating a seismic shadow zone'
        ],
        estimatedTime: '6-10 min'
    },
    {
        id: 'volcanic-eruption',
        title: 'Volcanic Eruption Dynamics',
        category: 'Geography',
        icon: '🌋',
        difficulty: 'Intermediate',
        description: 'Vary silica content and dissolved gas pressure to compare gentle lava flows to explosive blasts.',
        longDescription: 'Volcanic behavior depends heavily on magma viscosity and volatile gas content. Basaltic magma has low silica, flows smoothly like honey, and lets dissolved gases bubble out gently (effusive eruptions, like Hawaiian shield volcanoes). Rhyolitic magma has high silica, traps expanding gas bubbles under intense pressure, and explodes violently into ash and pyroclastic flows.',
        tags: ['volcanology', 'magma', 'viscosity', 'silica', 'pyroclastic'],
        learningOutcomes: [
            'Connect high silica content with thick, viscous magma that resists flow',
            'Watch trapped gas bubbles expand violently as pressure drops near the surface',
            'Contrast broad shield volcanoes with steep stratovolcanoes'
        ],
        estimatedTime: '6-10 min'
    },

    // ══════════════════════════════════════════════════
    // ASTRONOMY (6)
    // ══════════════════════════════════════════════════
    {
        id: 'black-hole-orbit',
        title: 'Orbital Mechanics & Escape Velocity',
        category: 'Astronomy',
        icon: '🛰️',
        difficulty: 'Intermediate',
        description: 'Launch satellites at varied speeds to discover circular orbits, ellipses, and escape trajectories.',
        longDescription: 'Johannes Kepler showed that planets orbit in ellipses with the Sun at one focus. An object launched sideways falls around the massive body rather than into it. At orbital speed, the curve of its fall matches the curvature of space. At escape velocity (v = √(2GM/r)), its kinetic energy balances gravitational potential, letting it coast to infinity.',
        tags: ['orbits', 'gravity', 'kepler', 'escape velocity', 'celestial mechanics'],
        learningOutcomes: [
            'Find the exact tangential speed needed for a circular orbit at a chosen altitude',
            'Watch an orbiting satellite speed up at closest approach (periapsis) and slow at apoapsis (Kepler\'s Second Law)',
            'Accelerate beyond escape velocity to see an elliptical orbit become an open hyperbola'
        ],
        estimatedTime: '7-11 min'
    },
    {
        id: 'galaxy-collision',
        title: 'Galaxy Collision & Tidal Stripping',
        category: 'Astronomy',
        icon: '🌌',
        difficulty: 'Advanced',
        description: 'Simulate two disk galaxies passing through each other under mutual gravity.',
        longDescription: 'When two galaxies collide, individual stars almost never hit one another because stellar distances are immense compared to star diameters. However, collective gravitational tides pull long streamers of stars and gas (tidal tails) across thousands of light-years, eventually blending the systems into an elliptical galaxy.',
        tags: ['galaxies', 'gravity', 'n-body', 'tidal tails', 'merger'],
        learningOutcomes: [
            'Observe interstellar spacing preventing direct collisions between individual stars',
            'Watch tidal forces fling outer disk stars into long looping gravitational tails',
            'See how repeated passes bleed orbital energy until the cores merge'
        ],
        estimatedTime: '8-13 min'
    },
    {
        id: 'star-lifecycle',
        title: 'Stellar Evolution & Fusion',
        category: 'Astronomy',
        icon: '⭐',
        difficulty: 'Intermediate',
        description: 'Track how star mass dictates whether a star ends as a white dwarf, neutron star, or black hole.',
        longDescription: 'A star is a balance between inward gravitational collapse and outward thermal pressure from nuclear fusion in its core. Main sequence stars fuse hydrogen into helium. Once core hydrogen depletes, the star expands into a red giant. Low-mass stars shed outer layers into a planetary nebula leaving a white dwarf; massive stars collapse catastrophically in a supernova.',
        tags: ['stars', 'fusion', 'supernova', 'white dwarf', 'red giant'],
        learningOutcomes: [
            'See the hydrostatic balance between gravity pulling in and radiation pushing out',
            'Observe that higher-mass stars burn fuel much faster, living shorter lives',
            'Identify Chandrasekhar and Oppenheimer-Volkoff mass limits for stellar remnants'
        ],
        estimatedTime: '8-12 min'
    },
    {
        id: 'exoplanet-detection',
        title: 'Exoplanet Transit Photometry',
        category: 'Astronomy',
        icon: '🪐',
        difficulty: 'Intermediate',
        description: 'Monitor starlight brightness dips as an orbiting planet crosses the stellar disk.',
        longDescription: 'Telescopes like Kepler and TESS discover exoplanets by continuously measuring starlight with extreme precision. When a planet passes between its host star and the observer, it blocks a tiny fraction of starlight proportional to the ratio of their cross-sectional areas: ΔF/F ≈ (R_planet / R_star)². The dip repeats every orbital period.',
        tags: ['exoplanets', 'transit', 'photometry', 'light curve', 'astronomy'],
        learningOutcomes: [
            'Calculate the planet\'s relative radius from transit dip depth',
            'Determine orbital period from the time interval between consecutive dips',
            'Recognize why larger stars make small Earth-sized planets harder to detect'
        ],
        estimatedTime: '6-10 min'
    },
    {
        id: 'neutron-star',
        title: 'Neutron Star & Pulsar Beams',
        category: 'Astronomy',
        icon: '💫',
        difficulty: 'Advanced',
        description: 'Examine a city-sized stellar core spinning hundreds of times a second with intense magnetic jets.',
        longDescription: 'When a massive star goes supernova, core electrons and protons are crushed together into neutrons, packing more than the Sun\'s mass into a sphere just 20 km wide. Conservation of angular momentum spins the remnant up to hundreds of rotations per second. Tilted magnetic poles channel relativistic particle beams that sweep through space like a lighthouse.',
        tags: ['neutron star', 'pulsar', 'density', 'magnetic field', 'relativity'],
        learningOutcomes: [
            'Understand conservation of angular momentum causing rapid spin upon core collapse',
            'See how the offset between magnetic and rotation axes creates periodic pulses',
            'Appreciate the extreme density: a single teaspoon of neutron star matter weighs over a billion tons'
        ],
        estimatedTime: '7-11 min'
    },
    {
        id: 'cosmic-expansion',
        title: 'Cosmic Expansion & Hubble Law',
        category: 'Astronomy',
        icon: '🔭',
        difficulty: 'Advanced',
        description: 'Expand the metric of space to see distant galaxies recede faster: v = H₀ × d.',
        longDescription: 'In the 1920s, Edwin Hubble discovered that distant galaxies are moving away from us, with velocity proportional to their distance. Galaxies are not flying through pre-existing space like shrapnel; rather, space itself between unbound structures is expanding. Light traveling through expanding space stretches, shifting toward longer, redder wavelengths.',
        tags: ['cosmology', 'hubble', 'redshift', 'big bang', 'expansion'],
        learningOutcomes: [
            'Observe that every observer in an expanding universe sees all other galaxies receding (no center)',
            'Verify that velocity is linearly proportional to distance (v = H₀ · d)',
            'See how cosmological redshift stretches light wavelengths during transit'
        ],
        estimatedTime: '7-12 min'
    }
];

// Attach to window object for gallery consumption
window.SIMULATIONS = SIMULATIONS;