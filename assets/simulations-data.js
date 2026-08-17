const SIMULATIONS = [
    {
        id: 'newton',
        title: "Newton's Playground",
        category: 'Physics',
        icon: '⚛️',
        difficulty: 'Beginner',
        description: 'Drag objects and apply forces to understand F=ma',
        longDescription: 'Explore force, mass, and acceleration interactively. Drag objects around and watch how forces affect their motion.',
        tags: ['forces', 'motion', 'F=ma'],
        learningOutcomes: ['Understand F=ma', 'See how mass affects acceleration', 'Explore friction and gravity'],
        estimatedTime: '5-10 min'
    },
    {
        id: 'black-hole-orbit',
        title: 'Black Hole Orbit',
        category: 'Physics',
        icon: '🌌',
        difficulty: 'Intermediate',
        description: 'Adjust orbital velocity to find stable orbits around a black hole',
        longDescription: 'Watch particles orbit a black hole. Adjust their velocity to find stable orbits, escape velocity, or spiral in.',
        tags: ['gravity', 'orbits', 'relativity'],
        learningOutcomes: ['Understand orbital mechanics', 'Learn about event horizons', 'See gravity in action'],
        estimatedTime: '8-12 min'
    },
    {
        id: 'wave-interference',
        title: 'Wave Interference',
        category: 'Physics',
        icon: '〰️',
        difficulty: 'Intermediate',
        description: 'Change wavelength and watch interference patterns emerge',
        longDescription: 'Two wave sources create beautiful interference patterns. Adjust wavelength to see constructive and destructive interference.',
        tags: ['waves', 'interference', 'superposition'],
        learningOutcomes: ['Understand wave superposition', 'See interference patterns', 'Learn about resonance'],
        estimatedTime: '7-10 min'
    },
    {
        id: 'pendulum-chaos',
        title: 'Pendulum Chaos',
        category: 'Physics',
        icon: '🎯',
        difficulty: 'Advanced',
        description: 'Push a double pendulum and watch chaos emerge from simple rules',
        longDescription: 'Tiny changes create completely different outcomes. This is chaos theory. Watch the sensitive dependence on initial conditions.',
        tags: ['chaos', 'dynamics', 'nonlinear'],
        learningOutcomes: ['Understand chaos theory', 'See sensitive dependence', 'Learn butterfly effect'],
        estimatedTime: '10-15 min'
    },
    {
        id: 'galaxy-collision',
        title: 'Galaxy Collision',
        category: 'Astronomy',
        icon: '🌌',
        difficulty: 'Intermediate',
        description: 'Watch two galaxies spiral toward each other and merge',
        longDescription: 'Gravity pulls two galaxies together in a slow, beautiful collision. See how they eventually merge into a single galaxy.',
        tags: ['galaxies', 'gravity', 'n-body'],
        learningOutcomes: ['Understand galaxy dynamics', 'See large-scale gravity', 'Learn cosmic timescales'],
        estimatedTime: '8-12 min'
    }
];