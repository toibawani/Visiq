// ===== VISIQ ADVANCED AUDIO SYSTEM v2.0 =====
// Immersive 3D spatial audio with category-specific soundscapes

class AdvancedSoundManager {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.connect(this.audioContext.destination);
        this.masterGain.gain.value = 0.15;
        
        this.isMuted = false;
        this.volume = 0.15;
        
        // 3D Spatial Audio
        this.panner = this.audioContext.createStereoPanner();
        this.panner.connect(this.masterGain);
        
        // Convolver for spatial reverb
        this.convolver = this.audioContext.createConvolver();
        this.dryGain = this.audioContext.createGain();
        this.wetGain = this.audioContext.createGain();
        
        this.dryGain.connect(this.masterGain);
        this.wetGain.connect(this.convolver);
        this.convolver.connect(this.masterGain);
        
        this.dryGain.gain.value = 0.7;
        this.wetGain.gain.value = 0.3;
        
        // Create impulse response for reverb
        this.createReverbImpulse();
        
        // Sound pools
        this.soundsPlaying = new Map();
        this.ambientLoops = new Map();
        this.categoryAmbience = new Map();
        
        // Audio visualizer nodes
        this.analyser = this.audioContext.createAnalyser();
        this.masterGain.connect(this.analyser);
        
        this.initUI();
        this.initCategoryAmbienceTracks();
    }
    
    createReverbImpulse() {
        const rate = this.audioContext.sampleRate;
        const length = rate * 3;
        const impulse = this.audioContext.createBuffer(2, length, rate);
        const left = impulse.getChannelData(0);
        const right = impulse.getChannelData(1);
        
        for (let i = 0; i < length; i++) {
            left[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
            right[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
        }
        
        this.convolver.buffer = impulse;
    }
    
    initCategoryAmbienceTracks() {
        this.categoryProfiles = {
            'physics': {
                baseFreq: 55,
                name: 'Quantum Hum',
                color: 'rgba(0, 217, 255, 0.3)'
            },
            'biology': {
                baseFreq: 63,
                name: 'Cellular Pulse',
                color: 'rgba(100, 200, 255, 0.3)'
            },
            'geography': {
                baseFreq: 48,
                name: 'Earth Resonance',
                color: 'rgba(76, 175, 80, 0.3)'
            },
            'astronomy': {
                baseFreq: 44,
                name: 'Cosmic Whisper',
                color: 'rgba(156, 78, 221, 0.3)'
            }
        };
    }
    
    initUI() {
        const audioControl = document.createElement('div');
        audioControl.id = 'audio-control';
        audioControl.innerHTML = `
            <div class="audio-visualizer" id="audio-visualizer"></div>
            <button id="audio-toggle" title="Toggle sound">🔊</button>
            <div class="volume-container">
                <input type="range" id="volume-slider" min="0" max="100" value="15" title="Volume">
                <span id="volume-percent">15%</span>
            </div>
            <div id="audio-label" class="audio-label">Initializing...</div>
        `;
        audioControl.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            gap: 12px;
            align-items: flex-end;
            background: rgba(26, 26, 62, 0.95);
            padding: 16px;
            border-radius: 12px;
            border: 1px solid rgba(0, 217, 255, 0.3);
            backdrop-filter: blur(20px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            font-family: 'Space Grotesk', sans-serif;
        `;
        
        document.body.appendChild(audioControl);
        
        document.getElementById('audio-toggle').addEventListener('click', () => this.toggleMute());
        document.getElementById('volume-slider').addEventListener('input', (e) => {
            this.setVolume(e.target.value / 100);
            document.getElementById('volume-percent').textContent = e.target.value + '%';
        });
        
        // Start audio visualizer
        this.startVisualizer();
    }
    
    startVisualizer() {
        const canvas = document.getElementById('audio-visualizer');
        if (!canvas) return;
        
        canvas.width = 120;
        canvas.height = 40;
        canvas.style.cssText = `
            width: 120px;
            height: 40px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 4px;
            border: 1px solid rgba(0, 217, 255, 0.2);
        `;
        
        const ctx = canvas.getContext('2d');
        
        const draw = () => {
            const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            this.analyser.getByteFrequencyData(dataArray);
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            const barWidth = (canvas.width / dataArray.length) * 2.5;
            let x = 0;
            
            for (let i = 0; i < dataArray.length; i++) {
                const barHeight = (dataArray[i] / 255) * canvas.height;
                
                const hue = (i / dataArray.length) * 360;
                ctx.fillStyle = 'hsl(' + hue + ', 100%, 50%)';
                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                
                x += barWidth + 1;
            }
            
            requestAnimationFrame(draw);
        };
        
        draw();
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
    
    // ===== CATEGORY AMBIENT SOUNDSCAPES =====
    
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
    
    playResonance(frequency = 100, duration = 1.5) {
        if (this.isMuted) return;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        osc.type = 'sine';
        osc.frequency.value = frequency;
        
        filter.type = 'lowpass';
        filter.frequency.value = 200;
        filter.Q.value = 5;
        
        gain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.dryGain);
        
        osc.start();
        osc.stop(this.audioContext.currentTime + duration);
    }
    
    startAmbientLoop(category = 'physics', loopId = 'main') {
        if (this.ambientLoops.has(loopId)) return;
        
        const profile = this.categoryProfiles[category] || this.categoryProfiles['physics'];
        
        const loop = {
            active: true,
            frequency: profile.baseFreq,
            phase: 0,
            category: category
        };
        
        this.ambientLoops.set(loopId, loop);
        
        // Update label
        const label = document.getElementById('audio-label');
        if (label) label.textContent = profile.name;
        
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
    
    playSuccess() {
        if (this.isMuted) return;
        
        const now = this.audioContext.currentTime;
        const frequencies = [440, 550, 660];
        
        frequencies.forEach((freq, i) => {
            setTimeout(() => this.playChime(freq, 0.4), i * 100);
        });
    }
    
    playAlert() {
        if (this.isMuted) return;
        
        this.playChime(1200, 0.2);
        setTimeout(() => this.playChime(1200, 0.2), 200);
    }
    
    // Spatial audio effects
    playSpatialSound(frequency, duration, panPosition = 0) {
        if (this.isMuted) return;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const localPanner = this.audioContext.createStereoPanner();
        
        osc.type = 'sine';
        osc.frequency.value = frequency;
        
        gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        localPanner.pan.value = panPosition;
        
        osc.connect(gain);
        gain.connect(localPanner);
        localPanner.connect(this.dryGain);
        
        osc.start();
        osc.stop(this.audioContext.currentTime + duration);
    }
}

// Global instance
window.soundManager = new AdvancedSoundManager();