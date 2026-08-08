// ===== VISIQ ADVANCED AUDIO SYSTEM =====
// Binaural, ambient, non-intrusive sound design
// Inspired by: Apple, Headspace, scientific visualizations

class AdvancedSoundManager {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.connect(this.audioContext.destination);
        this.masterGain.gain.value = 0.15; // Subtle baseline
        
        this.isMuted = false;
        this.volume = 0.15;
        
        // Convolver for spatial audio
        this.convolver = this.audioContext.createConvolver();
        this.dryGain = this.audioContext.createGain();
        this.wetGain = this.audioContext.createGain();
        
        this.dryGain.connect(this.masterGain);
        this.wetGain.connect(this.convolver);
        this.convolver.connect(this.masterGain);
        
        this.dryGain.gain.value = 0.7;
        this.wetGain.gain.value = 0.3;
        
        // Create impulse response (room tone)
        this.createReverbImpulse();
        
        this.soundsPlaying = new Map();
        this.ambientLoops = new Map();
        
        this.initUI();
    }
    
    createReverbImpulse() {
        // Simple reverb impulse response (room ambience)
        const rate = this.audioContext.sampleRate;
        const length = rate * 2; // 2 second tail
        const impulse = this.audioContext.createBuffer(2, length, rate);
        const left = impulse.getChannelData(0);
        const right = impulse.getChannelData(1);
        
        for (let i = 0; i < length; i++) {
            left[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
            right[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
        }
        
        this.convolver.buffer = impulse;
    }
    
    initUI() {
        // Create audio control in DOM
        const audioControl = document.createElement('div');
        audioControl.id = 'audio-control';
        audioControl.innerHTML = `
            <button id="audio-toggle" title="Toggle sound">🔊</button>
            <input type="range" id="volume-slider" min="0" max="100" value="15" title="Volume">
        `;
        audioControl.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 1000;
            display: flex;
            gap: 10px;
            align-items: center;
            background: rgba(26, 26, 62, 0.9);
            padding: 12px 16px;
            border-radius: 8px;
            border: 1px solid rgba(0, 217, 255, 0.2);
            backdrop-filter: blur(10px);
        `;
        
        document.body.appendChild(audioControl);
        
        document.getElementById('audio-toggle').addEventListener('click', () => this.toggleMute());
        document.getElementById('volume-slider').addEventListener('input', (e) => {
            this.setVolume(e.target.value / 100);
        });
    }
    
    toggleMute() {
        this.isMuted = !this.isMuted;
        this.masterGain.gain.value = this.isMuted ? 0 : this.volume;
        document.getElementById('audio-toggle').textContent = this.isMuted ? '🔇' : '🔊';
    }
    
    setVolume(val) {
        this.volume = val;
        if (!this.isMuted) {
            this.masterGain.gain.value = val;
        }
    }
    
    // ===== ORCHESTRAL TONES =====
    
    // Deep cosmic hum (for black holes, space)
    playCosmicHum(frequency = 30, duration = 2) {
        if (this.isMuted) return;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        osc.type = 'sine';
        osc.frequency.value = frequency;
        filter.type = 'lowpass';
        filter.frequency.value = 100;
        
        gain.gain.setValueAtTime(0.08, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        osc.connect(filter);
        filter.connect(this.dryGain);
        
        osc.start();
        osc.stop(this.audioContext.currentTime + duration);
    }
    
    // Organic pulse (for cells, biology)
    playOrganicPulse(frequency = 120, duration = 0.4) {
        if (this.isMuted) return;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(frequency * 0.7, this.audioContext.currentTime + duration);
        
        gain.gain.setValueAtTime(0.12, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(this.dryGain);
        
        osc.start();
        osc.stop(this.audioContext.currentTime + duration);
    }
    
    // Crystalline chime (for physics, precision)
    playChime(frequency = 880, duration = 0.6) {
        if (this.isMuted) return;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'triangle';
        osc.frequency.value = frequency;
        
        gain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(this.dryGain);
        
        osc.start();
        osc.stop(this.audioContext.currentTime + duration);
    }
    
    // Flowing water (for geography, fluid dynamics)
    playFluidWhoosh(startFreq = 300, endFreq = 100, duration = 0.3) {
        if (this.isMuted) return;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(startFreq, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(endFreq, this.audioContext.currentTime + duration);
        
        gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.02, this.audioContext.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(this.dryGain);
        
        osc.start();
        osc.stop(this.audioContext.currentTime + duration);
    }
    
    // Ambient loop (background atmosphere)
    startAmbientLoop(category = 'physics', loopId = 'main') {
        if (this.ambientLoops.has(loopId)) return; // Already playing
        
        const loop = {
            active: true,
            frequency: category === 'physics' ? 50 : category === 'biology' ? 60 : category === 'geography' ? 55 : 45,
            phase: 0
        };
        
        this.ambientLoops.set(loopId, loop);
        
        const playAmbient = () => {
            if (!loop.active) return;
            
            this.playCosmicHum(loop.frequency, 3);
            setTimeout(playAmbient, 3000);
        };
        
        playAmbient();
    }
    
    stopAmbientLoop(loopId = 'main') {
        if (this.ambientLoops.has(loopId)) {
            this.ambientLoops.get(loopId).active = false;
            this.ambientLoops.delete(loopId);
        }
    }
    
    // Success/transition tone
    playSuccess() {
        if (this.isMuted) return;
        
        const now = this.audioContext.currentTime;
        const frequencies = [440, 550, 660]; // A-major triad
        
        frequencies.forEach((freq, i) => {
            setTimeout(() => this.playChime(freq, 0.4), i * 100);
        });
    }
    
    // Alert/attention
    playAlert() {
        if (this.isMuted) return;
        
        this.playChime(1200, 0.2);
        setTimeout(() => this.playChime(1200, 0.2), 200);
    }
}

// Global instance
window.soundManager = new AdvancedSoundManager();