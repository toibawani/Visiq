/* ===================================================
   VISIQ — PROJECTILE ENGINE
   Author: Devin
   Projectile motion with optional air resistance
   Pure fixed-timestep step function (testable headless)
=================================================== */

const ProjectileEngine = {
    metadata: {
        name: 'projectile',
        version: '1.0.0',
        description: 'Projectile motion with optional air resistance',
        author: 'Devin'
    },

    paramsSchema: {
        angle: {
            min: 0,
            max: 90,
            default: 45,
            unit: 'deg',
            description: 'Launch angle'
        },
        velocity: {
            min: 1,
            max: 100,
            default: 50,
            unit: 'm/s',
            description: 'Initial velocity'
        },
        gravity: {
            min: 1,
            max: 30,
            default: 9.81,
            unit: 'm/s²',
            description: 'Gravitational acceleration'
        },
        drag: {
            min: 0,
            max: 1,
            default: 0,
            unit: '',
            description: 'Air resistance coefficient (0 = no drag)'
        },
        mass: {
            min: 0.1,
            max: 10,
            default: 1,
            unit: 'kg',
            description: 'Projectile mass'
        }
    },

    /**
     * Initialize simulation state
     * @param {object} params - Parameter values
     * @returns {object} Initial state
     */
    init(params) {
        const angleRad = (params.angle * Math.PI) / 180;
        const vx = params.velocity * Math.cos(angleRad);
        const vy = params.velocity * Math.sin(angleRad);

        return {
            x: 0,
            y: 0,
            vx: vx,
            vy: vy,
            t: 0,
            landed: false,
            maxHeight: 0,
            range: 0,
            trajectory: [{ x: 0, y: 0 }]
        };
    },

    /**
     * Pure fixed-timestep step function (testable headless)
     * @param {object} state - Current state
     * @param {number} dt - Time step (seconds)
     * @param {object} params - Parameter values
     * @returns {object} New state
     */
    step(state, dt, params) {
        if (state.landed) {
            return state;
        }

        // Calculate forces
        const fx = -params.drag * state.vx;
        const fy = -params.mass * params.gravity - params.drag * state.vy;

        // Update velocity (Euler integration)
        const vx = state.vx + (fx / params.mass) * dt;
        const vy = state.vy + (fy / params.mass) * dt;

        // Update position
        const x = state.x + vx * dt;
        const y = state.y + vy * dt;

        // Check if landed
        let landed = state.landed;
        if (y <= 0) {
            landed = true;
        }

        // Update max height and range
        const maxHeight = Math.max(state.maxHeight, y);
        const range = landed ? x : state.range;

        // Add to trajectory (sample every 0.1s)
        const trajectory = [...state.trajectory];
        if (state.t % 0.1 < dt || trajectory.length === 1) {
            trajectory.push({ x: Math.max(0, x), y: Math.max(0, y) });
        }

        return {
            x: Math.max(0, x),
            y: Math.max(0, y),
            vx,
            vy,
            t: state.t + dt,
            landed,
            maxHeight,
            range,
            trajectory
        };
    },

    /**
     * Draw simulation to canvas
     * @param {object} state - Current state
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {object} params - Parameter values
     */
    draw(state, canvas, params) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Clear canvas
        ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('--color-raised') || '#161820';
        ctx.fillRect(0, 0, width, height);

        // Calculate scale (fit trajectory in canvas)
        const maxX = Math.max(state.range, 100);
        const maxY = Math.max(state.maxHeight, 50);
        const scaleX = (width - 40) / maxX;
        const scaleY = (height - 40) / maxY;
        const scale = Math.min(scaleX, scaleY);

        // Draw ground
        ctx.strokeStyle = getComputedStyle(canvas).getPropertyValue('--color-rule') || '#2a2d35';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(20, height - 20);
        ctx.lineTo(width - 20, height - 20);
        ctx.stroke();

        // Draw trajectory
        ctx.strokeStyle = getComputedStyle(canvas).getPropertyValue('--accent-physics') || '#e85a56';
        ctx.lineWidth = 2;
        ctx.beginPath();
        state.trajectory.forEach((point, i) => {
            const px = 20 + point.x * scale;
            const py = height - 20 - point.y * scale;
            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        });
        ctx.stroke();

        // Draw projectile
        const px = 20 + state.x * scale;
        const py = height - 20 - state.y * scale;
        ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('--accent-physics') || '#e85a56';
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fill();

        // Draw launch angle indicator
        const angleRad = (params.angle * Math.PI) / 180;
        const indicatorLength = 30;
        ctx.strokeStyle = getComputedStyle(canvas).getPropertyValue('--color-muted') || '#8b8d93';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(20, height - 20);
        ctx.lineTo(
            20 + Math.cos(angleRad) * indicatorLength,
            height - 20 - Math.sin(angleRad) * indicatorLength
        );
        ctx.stroke();
    },

    /**
     * Return telemetry data
     * @param {object} state - Current state
     * @returns {object} Telemetry
     */
    telemetry(state) {
        return {
            time: state.t.toFixed(2),
            x: state.x.toFixed(2),
            y: state.y.toFixed(2),
            vx: state.vx.toFixed(2),
            vy: state.vy.toFixed(2),
            maxHeight: state.maxHeight.toFixed(2),
            range: state.range.toFixed(2),
            landed: state.landed
        };
    },

    /**
     * Return human-readable description
     * @param {object} state - Current state
     * @param {object} params - Parameter values
     * @returns {string} Description
     */
    describe(state, params) {
        if (state.landed) {
            return `Landed after ${state.t.toFixed(2)}s at range ${state.range.toFixed(2)}m with max height ${state.maxHeight.toFixed(2)}m.`;
        }
        return `After ${state.t.toFixed(2)}s: position (${state.x.toFixed(1)}m, ${state.y.toFixed(1)}m), velocity (${state.vx.toFixed(1)}m/s, ${state.vy.toFixed(1)}m/s).`;
    }
};

// Export for use in scenarios
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProjectileEngine;
}
