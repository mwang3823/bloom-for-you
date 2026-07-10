// Audio and Visual Effects Engine for Love Game

class EffectsEngine {
  constructor() {
    this.canvas = document.getElementById('effects-canvas');
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
    }
    this.particles = [];
    this.fireworks = [];
    this.isActive = false;
    
    // Audio configuration
    this.audioCtx = null;
    this.bgMusicNode = null;
    this.isMusicPlaying = false;
    this.bgMusicTimeout = null;
    this.isGameMusicPlaying = false;
    this.gameMusicTimeout = null;
    
    // External MP3 support
    this.victoryAudio = null;
    this.loveAudio = null;
    this.gameMusicAudio = null;

    this.initResize();
    this.animate();
  }

  // Visual effects: Resize canvas to fill viewport
  initResize() {
    if (!this.canvas) return;
    const resize = () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();
  }

  // Active state controller
  start() {
    this.isActive = true;
  }

  stop() {
    this.isActive = false;
    this.particles = [];
    this.fireworks = [];
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  // Initialize Web Audio API lazily
  initAudio() {
    if (this.audioCtx) return;
    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn("Web Audio API is not supported in this browser:", e);
    }
    
    // Pre-create HTML Audio objects for assets as fallback/option
    this.victoryAudio = new Audio('assets/victory.mp3');
    this.victoryAudio.volume = 0.5;
    
    this.loveAudio = new Audio('assets/love.mp3');
    this.loveAudio.loop = true;
    this.loveAudio.volume = 0.4;

    this.gameMusicAudio = new Audio('assets/game.mp3');
    this.gameMusicAudio.loop = true;
    this.gameMusicAudio.volume = 0.3;
  }

  // 1. SOUND: Play keypress typing sound
  playTypingSound() {
    this.initAudio();
    if (!this.audioCtx) return;
    
    // Resume context if suspended (browser security)
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const osc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();

    osc.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);

    // Mechanical key-switch click sound simulation
    osc.type = 'sine';
    const now = this.audioCtx.currentTime;
    osc.frequency.setValueAtTime(1500, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.03);

    gainNode.gain.setValueAtTime(0.015, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.start(now);
    osc.stop(now + 0.03);
  }

  // 2. SOUND: Play heart collect sound
  playCollectSound() {
    this.initAudio();
    if (!this.audioCtx) return;

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const osc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();

    osc.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);

    // Soft chime sound
    osc.type = 'triangle';
    const now = this.audioCtx.currentTime;
    // C5 (523Hz) to C6 (1046Hz) quick slide
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.12);

    gainNode.gain.setValueAtTime(0.15, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // 2.5. SOUND: Play character collision/bump sound
  playCollisionSound() {
    this.initAudio();
    if (!this.audioCtx) return;

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const osc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();

    osc.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);

    // Cute retro low-frequency bump/boing sound
    osc.type = 'sine';
    const now = this.audioCtx.currentTime;
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(80, now + 0.15);

    gainNode.gain.setValueAtTime(0.12, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // 3. SOUND: Play game victory sound
  playVictorySound() {
    this.initAudio();
    this.stopGameMusic();
    if (this.loveAudio) this.loveAudio.pause(); // Pause standard music if victory sounds
    
    // Try to play external asset first
    this.victoryAudio.play().then(() => {
      console.log("Playing external victory.mp3");
    }).catch(() => {
      // Fallback: Synthesize rich celebratory chord progression
      if (!this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
      const now = this.audioCtx.currentTime;
      
      notes.forEach((freq, idx) => {
        const osc = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();

        osc.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.12, now + idx * 0.08 + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.6);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.6);
      });
    });
  }

  // 3.5. SOUND: Start cheerful upbeat game music
  startGameMusic() {
    this.initAudio();
    this.stopGameMusic();
    this.isGameMusicPlaying = true;

    // Try playing external asset
    this.gameMusicAudio.play().then(() => {
      console.log("Playing external game.mp3");
    }).catch(() => {
      // Fallback: Synthesize a sweet 8-bit game loop arpeggiation (C - G - Am - F)
      if (!this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      console.log("Synthesizing background game loop...");
      
      const progression = [261.63, 329.63, 392.00, 523.25, 392.00, 329.63]; // C4, E4, G4, C5, G4, E4
      let noteIndex = 0;

      const playNextNote = () => {
        if (!this.isGameMusicPlaying) return;
        const now = this.audioCtx.currentTime;
        const freq = progression[noteIndex];

        const osc = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();

        osc.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.035, now + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.start(now);
        osc.stop(now + 0.25);

        noteIndex = (noteIndex + 1) % progression.length;
        this.gameMusicTimeout = setTimeout(playNextNote, 240);
      };

      playNextNote();
    });
  }

  stopGameMusic() {
    this.isGameMusicPlaying = false;
    if (this.gameMusicAudio) {
      this.gameMusicAudio.pause();
      this.gameMusicAudio.currentTime = 0;
    }
    if (this.gameMusicTimeout) {
      clearTimeout(this.gameMusicTimeout);
      this.gameMusicTimeout = null;
    }
  }

  // 4. SOUND: Start backing ambient love theme music
  startBackgroundMusic() {
    this.initAudio();
    this.stopGameMusic(); // Just in case
    
    // Stop any existing loop
    this.stopBackgroundMusic();
    this.isMusicPlaying = true;

    // Try playing external asset
    this.loveAudio.play().then(() => {
      console.log("Playing external love.mp3");
    }).catch(() => {
      // Fallback: Procedurally synthesized romantic chord progression arpeggiations
      if (!this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      
      console.log("Synthesizing background music dynamically...");
      
      // Let's create an ongoing beautiful loop:
      // Chords: Cmaj7 (C3, G3, B3, E4) -> Am9 (A2, E3, B3, C4) -> Fmaj7 (F2, C3, A3, E4) -> G7sus4 (G2, D3, F3, C4)
      const progressions = [
        [130.81, 196.00, 246.94, 329.63], // C3, G3, B3, E4
        [110.00, 164.81, 246.94, 261.63], // A2, E3, B3, C4
        [87.31, 130.81, 220.00, 329.63],  // F2, C3, A3, E4
        [98.00, 146.83, 174.61, 261.63]   // G2, D3, F3, C4
      ];
      
      let chordIndex = 0;
      
      const playNextChord = () => {
        if (!this.isMusicPlaying) return;
        const now = this.audioCtx.currentTime;
        const chord = progressions[chordIndex];
        
        chord.forEach((freq, idx) => {
          const osc = this.audioCtx.createOscillator();
          const gainNode = this.audioCtx.createGain();
          
          osc.connect(gainNode);
          gainNode.connect(this.audioCtx.destination);
          
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.15); // gentle arpeggiation
          
          // soft attack and long release
          gainNode.gain.setValueAtTime(0, now + idx * 0.15);
          gainNode.gain.linearRampToValueAtTime(0.04, now + idx * 0.15 + 0.3);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 3.0);
          
          osc.start(now + idx * 0.15);
          osc.stop(now + idx * 0.15 + 3.2);
        });
        
        chordIndex = (chordIndex + 1) % progressions.length;
        
        // Loop every 3.5 seconds
        this.bgMusicTimeout = setTimeout(playNextChord, 3500);
      };
      
      playNextChord();
    });
  }

  stopBackgroundMusic() {
    this.isMusicPlaying = false;
    this.stopGameMusic();
    if (this.loveAudio) {
      this.loveAudio.pause();
      this.loveAudio.currentTime = 0;
    }
    if (this.bgMusicTimeout) {
      clearTimeout(this.bgMusicTimeout);
      this.bgMusicTimeout = null;
    }
  }

  // 1. PARTICLES: Confetti trigger
  triggerConfetti(count = 100) {
    const colors = ['#ff4b72', '#ff7597', '#8b5cf6', '#60a5fa', '#34d399', '#fbbf24'];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        type: 'confetti',
        x: Math.random() * this.canvas.width,
        y: -20 - Math.random() * 50,
        vx: (Math.random() - 0.5) * 6,
        vy: 3 + Math.random() * 5,
        w: 6 + Math.random() * 6,
        h: 12 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rSpeed: (Math.random() - 0.5) * 0.1,
        opacity: 0.9 + Math.random() * 0.1
      });
    }
    this.start();
  }

  // 2. PARTICLES: Floating Hearts trigger
  triggerHearts(count = 30) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        type: 'heart',
        x: Math.random() * this.canvas.width,
        y: this.canvas.height + 20 + Math.random() * 100,
        size: 15 + Math.random() * 25,
        speed: 1 + Math.random() * 2.5,
        swingRange: 10 + Math.random() * 20,
        swingSpeed: 0.02 + Math.random() * 0.03,
        swingPhase: Math.random() * Math.PI * 2,
        opacity: 0.6 + Math.random() * 0.4
      });
    }
    this.start();
  }

  // 3. PARTICLES: Launch Fireworks
  triggerFireworks(count = 5) {
    for (let i = 0; i < count; i++) {
      const launchX = 100 + Math.random() * (this.canvas.width - 200);
      const targetY = 100 + Math.random() * (this.canvas.height / 2);
      this.fireworks.push({
        x: launchX,
        y: this.canvas.height + 10,
        tx: launchX,
        ty: targetY,
        vy: -8 - Math.random() * 6,
        color: `hsl(${Math.random() * 360}, 95%, 65%)`,
        exploded: false
      });
    }
    this.start();
  }

  explodeFirework(x, y, color) {
    const pCount = 50 + Math.floor(Math.random() * 30);
    for (let i = 0; i < pCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      this.particles.push({
        type: 'firework',
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: color,
        life: 1.0,
        decay: 0.015 + Math.random() * 0.015,
        gravity: 0.08
      });
    }
  }

  // Render loop
  animate() {
    requestAnimationFrame(() => this.animate());
    if (!this.isActive || !this.canvas || !this.ctx) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Update & draw fireworks rockets
    for (let i = this.fireworks.length - 1; i >= 0; i--) {
      const fw = this.fireworks[i];
      if (!fw.exploded) {
        fw.y += fw.vy;
        
        // Draw rocket path
        this.ctx.beginPath();
        this.ctx.arc(fw.x, fw.y, 3, 0, Math.PI * 2);
        this.ctx.fillStyle = '#fff';
        this.ctx.fill();

        // Check explosion target
        if (fw.y <= fw.ty) {
          fw.exploded = true;
          this.explodeFirework(fw.x, fw.y, fw.color);
          this.fireworks.splice(i, 1);
        }
      }
    }

    // Update & draw active particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      if (p.type === 'confetti') {
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rSpeed;
        p.vy += 0.02; // soft gravity

        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate(p.rotation);
        this.ctx.fillStyle = p.color;
        this.ctx.globalAlpha = p.opacity;
        this.ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        this.ctx.restore();

        // remove out of bounds
        if (p.y > this.canvas.height + 20) {
          this.particles.splice(i, 1);
        }
      } 
      else if (p.type === 'heart') {
        p.y -= p.speed;
        p.swingPhase += p.swingSpeed;
        const xOffset = Math.sin(p.swingPhase) * p.swingRange;
        
        this.drawHeart(p.x + xOffset, p.y, p.size, '#ff4b72', p.opacity);

        if (p.y < -30) {
          this.particles.splice(i, 1);
        }
      } 
      else if (p.type === 'firework') {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.life -= p.decay;

        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, 2.5 * p.life, 0, Math.PI * 2);
        this.ctx.fillStyle = p.color;
        this.ctx.globalAlpha = p.life;
        this.ctx.fill();

        if (p.life <= 0) {
          this.particles.splice(i, 1);
        }
      }
    }

    this.ctx.globalAlpha = 1.0;

    // Turn off engine loop if no active particles remain
    if (this.particles.length === 0 && this.fireworks.length === 0) {
      this.isActive = false;
    }
  }

  // Draw SVG-like vector path heart on Canvas
  drawHeart(x, y, size, color, opacity = 1) {
    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    
    // Start at bottom tip
    this.ctx.moveTo(x, y + size / 3);
    
    // Left curve
    this.ctx.bezierCurveTo(
      x - size / 2, y - size / 2, 
      x - size, y + size / 6, 
      x, y + size
    );
    
    // Right curve
    this.ctx.bezierCurveTo(
      x + size, y + size / 6, 
      x + size / 2, y - size / 2, 
      x, y + size / 3
    );
    
    this.ctx.fill();
    this.ctx.restore();
  }
}

// Background starfield initializer
function initTwinklingStars() {
  const container = document.querySelector('.stars');
  if (!container) return;
  
  container.innerHTML = '';
  const starCount = 80;
  
  for (let i = 0; i < starCount; i++) {
    const star = document.createElement('div');
    star.classList.add('star');
    
    const size = 1 + Math.random() * 2.5;
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const duration = 2 + Math.random() * 5;
    
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    star.style.left = `${x}%`;
    star.style.top = `${y}%`;
    star.style.setProperty('--duration', `${duration}s`);
    
    container.appendChild(star);
  }
}

// Instantiate globally
window.effects = new EffectsEngine();
window.addEventListener('DOMContentLoaded', initTwinklingStars);
