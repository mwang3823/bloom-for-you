// 2D HTML5 Canvas Mini Game for Love Game

class LoveGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    
    // Virtual resolution (remains constant for scale math)
    this.virtualWidth = 800;
    this.virtualHeight = 600;
    
    this.canvas.width = this.virtualWidth;
    this.canvas.height = this.virtualHeight;

    this.isPlaying = false;
    this.score = 0;
    this.targetScore = 15;
    
    // Player settings
    this.player = {
      x: this.virtualWidth / 2 - 25,
      y: this.virtualHeight / 2 - 25,
      width: 50,
      height: 55,
      speed: 3.5, // Reduced from 5 by 30%
      vx: 0,
      vy: 0,
      mobileVx: 0,
      mobileVy: 0,
      moving: false,
      direction: 'down', // 'down', 'up', 'left', 'right'
      skin: 'girl',      // 'girl', 'boy', 'cat'
      animFrame: 0
    };

    this.blinkTimer = 120;
    this.isBlinking = false;

    // Game Entities
    this.hearts = [];
    this.obstacles = [];
    this.particles = [];
    this.clouds = [];
    this.runningAgents = [];
    this.agentSpawnTimer = 0;
    
    // Controls mapping
    this.keys = {};
    
    // Asset loading status (in case external assets exist, we can try to load them)
    this.assets = {
      player: new Image(),
      heart: new Image(),
      playerLoaded: false,
      heartLoaded: false
    };

    this.assets.player.src = 'assets/player.png';
    this.assets.player.onload = () => this.assets.playerLoaded = true;
    
    this.assets.heart.src = 'assets/heart.png';
    this.assets.heart.onload = () => this.assets.heartLoaded = true;

    this.initControls();
    this.generateWorld();
  }

  // Bind input listeners
  initControls() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      this.keys[e.code] = true;
      
      // Prevent browser scrolling on arrow keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
      this.keys[e.code] = false;
    });

    // Double-click/double-tap score HUD to instantly win (useful for testing/cheating)
    setTimeout(() => {
      const scoreBox = document.querySelector('.game-score-box');
      if (scoreBox) {
        scoreBox.style.cursor = 'pointer';
        scoreBox.addEventListener('dblclick', () => {
          if (this.isPlaying) {
            this.score = this.targetScore;
            this.updateHUD();
            this.triggerVictory();
          }
        });
        scoreBox.addEventListener('touchstart', () => {
          const now = Date.now();
          if (now - (this.lastTap || 0) < 300) {
            if (this.isPlaying) {
              this.score = this.targetScore;
              this.updateHUD();
              this.triggerVictory();
            }
          }
          this.lastTap = now;
        });
      }
    }, 100);
  }

  // Set mobile touch velocity
  setMobileVelocity(vx, vy) {
    this.player.mobileVx = vx * this.player.speed;
    this.player.mobileVy = vy * this.player.speed;
    if (vx !== 0 || vy !== 0) {
      this.player.moving = true;
      if (Math.abs(vx) > Math.abs(vy)) {
        this.player.direction = vx > 0 ? 'right' : 'left';
      } else {
        this.player.direction = vy > 0 ? 'down' : 'up';
      }
    } else {
      this.player.moving = false;
    }
  }

  // Pre-generate flowers, trees, rocks and clouds
  generateWorld() {
    // Generate static obstacles (trees and rocks)
    // Avoid spawning obstacles right at the center starting zone
    const spawnMargin = 120;
    const centerX = this.virtualWidth / 2;
    const centerY = this.virtualHeight / 2;

    // Trees
    for (let i = 0; i < 6; i++) {
      let x, y, dist;
      do {
        x = 50 + Math.random() * (this.virtualWidth - 100);
        y = 60 + Math.random() * (this.virtualHeight - 120);
        dist = Math.hypot(x - centerX, y - centerY);
      } while (dist < spawnMargin);

      this.obstacles.push({ type: 'tree', x, y, radius: 25 });
    }

    // Rocks
    for (let i = 0; i < 5; i++) {
      let x, y, dist;
      do {
        x = 50 + Math.random() * (this.virtualWidth - 100);
        y = 60 + Math.random() * (this.virtualHeight - 120);
        dist = Math.hypot(x - centerX, y - centerY);
      } while (dist < spawnMargin);

      this.obstacles.push({ type: 'rock', x, y, radius: 15 });
    }

    // Spawn initial clouds in sky
    for (let i = 0; i < 3; i++) {
      this.clouds.push({
        x: Math.random() * this.virtualWidth,
        y: 40 + Math.random() * 80,
        speed: 0.2 + Math.random() * 0.3,
        scale: 0.8 + Math.random() * 0.5
      });
    }

    // Initialize running agents list and spawn first agent
    this.runningAgents = [];
    this.agentSpawnTimer = 0;
    this.spawnRunningAgent();

    // Spawn first heart collectible
    this.spawnHeart();
  }

  spawnHeart() {
    // If we have less than 3 hearts on screen, add another
    while (this.hearts.length < 3) {
      let x = 40 + Math.random() * (this.virtualWidth - 80);
      let y = 60 + Math.random() * (this.virtualHeight - 100);
      
      // Ensure heart doesn't overlap obstacles
      let overlapping = false;
      for (const obs of this.obstacles) {
        if (Math.hypot(x - obs.x, y - obs.y) < obs.radius + 20) {
          overlapping = true;
          break;
        }
      }
      
      if (!overlapping) {
        this.hearts.push({
          x: x,
          y: y,
          size: 20,
          pulse: 0,
          pulseSpeed: 0.05 + Math.random() * 0.03
        });
      }
    }
  }

  // Spawns a new random running animal agent (cat, dog, bunny, duck)
  spawnRunningAgent() {
    const types = ['cat', 'dog', 'bunny', 'duck'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    let color = '#d1d5db';
    if (type === 'cat') {
      const catColors = ['#d1d5db', '#f97316', '#fff', '#374151']; // gray, orange, white, black
      color = catColors[Math.floor(Math.random() * catColors.length)];
    } else if (type === 'dog') {
      const dogColors = ['#b45309', '#f59e0b', '#78350f']; // brown, golden, dark brown
      color = dogColors[Math.floor(Math.random() * dogColors.length)];
    } else if (type === 'bunny') {
      color = '#f3f4f6'; // white bunny
    } else if (type === 'duck') {
      color = '#fbbf24'; // yellow duck
    }

    const dir = Math.random() > 0.5 ? 1 : -1;
    const startX = dir === 1 ? -120 : this.virtualWidth + 120;
    const speed = 1.3 + Math.random() * 0.8;
    const vx = dir * speed;
    const startY = 80 + Math.random() * (this.virtualHeight - 160);

    const agent = {
      id: Math.random().toString(36).substr(2, 9),
      type: type,
      color: color,
      x: startX,
      y: startY,
      vx: vx,
      dir: dir,
      animTime: Math.random() * 10,
      bubbleText: null,
      bubbleTimer: 0
    };

    this.runningAgents.push(agent);

    // 35% chance to spawn a pair of agents to trigger a conversation (crossover dialogue)
    if (Math.random() < 0.35) {
      setTimeout(() => {
        if (!this.isPlaying) return;
        
        const followVx = vx * 0.95;
        const followX = startX - (dir * 80);
        const followY = startY + (Math.random() - 0.5) * 30;

        const followType = types[Math.floor(Math.random() * types.length)];
        let followColor = '#d1d5db';
        if (followType === 'cat') followColor = '#f97316';
        else if (followType === 'dog') followColor = '#b45309';
        else if (followType === 'bunny') followColor = '#f3f4f6';
        else if (followType === 'duck') followColor = '#fbbf24';

        const follower = {
          id: Math.random().toString(36).substr(2, 9),
          type: followType,
          color: followColor,
          x: followX,
          y: followY,
          vx: followVx,
          dir: dir,
          animTime: Math.random() * 10,
          bubbleText: null,
          bubbleTimer: 0,
          pairedId: agent.id
        };

        this.runningAgents.push(follower);

        // Schedule dialog timing
        setTimeout(() => {
          if (!this.isPlaying) return;
          const phraseA = this.getRandomPhrase();
          agent.bubbleText = phraseA;
          agent.bubbleTimer = 120;

          setTimeout(() => {
            if (!this.isPlaying) return;
            const phraseB = this.getRandomResponsePhrase(phraseA);
            follower.bubbleText = phraseB;
            follower.bubbleTimer = 120;
          }, 1200);

        }, 1500);

      }, 400 + Math.random() * 400);
    }
  }

  // Get a random speech phrase from the custom Vietnamese checklist
  getRandomPhrase() {
    const phrases = [
      "Yarssss", "Hello bà nhaaa", "Tim đánh trống luôn á.", 
      "Chơi từ từ thoi.", "Dính trap Pthuy.", "Flex nhẹ là Mwang mê Pthuy.", 
      "Cười ẻa.", "Xin vía đẹp gái giống Pthuy", "Chốt đơn em eyyy", 
      "Từ từ t đi đái cái", "Pthuy đẹp.", "Càng gặp càng dính.", 
      "Hong mắ", "Làm gì đếi", "Chinh ẹp", "Chạy lẹ z fen", 
      "Ngon thíaaaaaa", "Mát cha lát te", "Ê đi nhọu hongg", 
      "Damnnnn", "quát đờ phắc.", "Mai mấy giờ pthuy dậy."
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
  }

  // Generate response phrases
  getRandomResponsePhrase(prevPhrase) {
    if (prevPhrase === "Ê đi nhọu hongg") {
      return "Chốt đơn em eyyy";
    }
    if (prevPhrase === "Làm gì đếi") {
      return "Từ từ t đi đái cái";
    }
    if (prevPhrase === "Chạy lẹ z fen") {
      return "Cười ẻa.";
    }
    if (prevPhrase === "Hong mắ") {
      return "Yarssss";
    }
    if (prevPhrase === "Pthuy đẹp.") {
      return "Chinh ẹp";
    }
    return this.getRandomPhrase();
  }

  // Trigger game start loop
  start() {
    this.isPlaying = true;
    this.score = 0;
    this.updateHUD();
    this.loop();
  }

  stop() {
    this.isPlaying = false;
  }

  updateHUD() {
    const scoreVal = document.getElementById('score-text');
    if (scoreVal) {
      scoreVal.innerText = `${this.score} / ${this.targetScore}`;
    }
  }

  // Handle movements and updates
  update() {
    if (!this.isPlaying) return;

    // 1. Move Player
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.moving = false;

    if (this.player.mobileVx !== 0 || this.player.mobileVy !== 0) {
      this.player.vx = this.player.mobileVx;
      this.player.vy = this.player.mobileVy;
      this.player.moving = true;
    } else {
      if (this.keys['w'] || this.keys['arrowup']) {
        this.player.vy = -this.player.speed;
        this.player.direction = 'up';
        this.player.moving = true;
      }
      if (this.keys['s'] || this.keys['arrowdown']) {
        this.player.vy = this.player.speed;
        this.player.direction = 'down';
        this.player.moving = true;
      }
      if (this.keys['a'] || this.keys['arrowleft']) {
        this.player.vx = -this.player.speed;
        this.player.direction = 'left';
        this.player.moving = true;
      }
      if (this.keys['d'] || this.keys['arrowright']) {
        this.player.vx = this.player.speed;
        this.player.direction = 'right';
        this.player.moving = true;
      }

      // Normalize diagonal velocity
      if (this.player.vx !== 0 && this.player.vy !== 0) {
        this.player.vx *= 0.7071;
        this.player.vy *= 0.7071;
      }
    }

    // 1.5. Update eye blinking state
    this.blinkTimer--;
    if (this.blinkTimer <= 0) {
      if (this.isBlinking) {
        this.isBlinking = false;
        this.blinkTimer = 150 + Math.random() * 200; // Next blink in 3-5 seconds
      } else {
        this.isBlinking = true;
        this.blinkTimer = 10; // Blink duration 150ms
      }
    }

    // Update coordinates & constrain to canvas boundary
    this.player.x += this.player.vx;
    this.player.y += this.player.vy;

    const pw = this.player.width;
    const ph = this.player.height;
    if (this.player.x < 0) this.player.x = 0;
    if (this.player.x > this.virtualWidth - pw) this.player.x = this.virtualWidth - pw;
    if (this.player.y < 40) this.player.y = 40; // HUD offset margin
    if (this.player.y > this.virtualHeight - ph) this.player.y = this.virtualHeight - ph;

    // Animate walking feet cycle
    if (this.player.moving) {
      this.player.animFrame += 0.15;
    } else {
      this.player.animFrame = 0;
    }

    // 2. Obstacles collisions (push player out of range)
    for (const obs of this.obstacles) {
      const pCenterX = this.player.x + pw / 2;
      const pCenterY = this.player.y + ph - 10; // offset circle to player's feet
      
      const dx = pCenterX - obs.x;
      const dy = pCenterY - obs.y;
      const dist = Math.hypot(dx, dy);
      const minDist = obs.radius + 15;
      
      if (dist < minDist) {
        // push vector
        const pushX = (dx / dist) * (minDist - dist);
        const pushY = (dy / dist) * (minDist - dist);
        this.player.x += pushX;
        this.player.y += pushY;
      }
    }

    // 3. Collect hearts
    const pBox = {
      x: this.player.x,
      y: this.player.y,
      w: pw,
      h: ph
    };

    for (let i = this.hearts.length - 1; i >= 0; i--) {
      const heart = this.hearts[i];
      const distance = Math.hypot((pBox.x + pBox.w / 2) - heart.x, (pBox.y + pBox.h / 2) - heart.y);
      
      if (distance < 35) {
        // Collect!
        this.hearts.splice(i, 1);
        this.score++;
        this.updateHUD();

        // Audio & visual spark chime triggers
        if (window.effects) {
          window.effects.playCollectSound();
        }

        // Spawn gold/pink sparkles locally
        this.triggerSparkles(heart.x, heart.y);

        if (this.score >= this.targetScore) {
          this.triggerVictory();
          return;
        }

        this.spawnHeart();
      }
    }

    // 4. Update Clouds
    for (const cloud of this.clouds) {
      cloud.x += cloud.speed;
      if (cloud.x > this.virtualWidth + 120) {
        cloud.x = -150;
        cloud.y = 40 + Math.random() * 80;
      }
    }

    // 5. Update running agents
    this.agentSpawnTimer++;
    if (this.agentSpawnTimer > 200) { // spawn every ~3 seconds
      this.spawnRunningAgent();
      this.agentSpawnTimer = 0;
    }

    for (let i = this.runningAgents.length - 1; i >= 0; i--) {
      const agent = this.runningAgents[i];
      agent.x += agent.vx;
      agent.animTime += 0.08;

      // Check if off-screen (with margin)
      if ((agent.dir === 1 && agent.x > this.virtualWidth + 180) || 
          (agent.dir === -1 && agent.x < -180)) {
        this.runningAgents.splice(i, 1);
        continue;
      }

      // Check player proximity bubble trigger
      const distToPlayer = Math.hypot((this.player.x + pw/2) - agent.x, (this.player.y + ph/2) - agent.y);
      if (distToPlayer < 75 && agent.bubbleText === null) {
        agent.bubbleText = this.getRandomPhrase();
        agent.bubbleTimer = 120; // 2 seconds
        if (window.effects) window.effects.playTypingSound();
      }

      // Decrement speech bubble timers
      if (agent.bubbleText !== null) {
        agent.bubbleTimer--;
        if (agent.bubbleTimer <= 0) {
          agent.bubbleText = null;
        }
      }

      // Dynamic crossover dialog: check proximity to other agents
      for (const other of this.runningAgents) {
        if (other.id !== agent.id && agent.bubbleText === null && other.bubbleText === null) {
          const distToOther = Math.hypot(agent.x - other.x, agent.y - other.y);
          if (distToOther < 65) {
            // Trigger dynamic conversation
            agent.bubbleText = this.getRandomPhrase();
            agent.bubbleTimer = 120;
            
            setTimeout(() => {
              if (other && this.runningAgents.includes(other)) {
                other.bubbleText = this.getRandomResponsePhrase(agent.bubbleText);
                other.bubbleTimer = 120;
              }
            }, 800);
          }
        }
      }
    }

    // 6. Update local particle pop details
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  // Create cute game-screen collection bubbles
  triggerSparkles(x, y) {
    const colors = ['#fff', '#ff4b72', '#ff7597', '#ffd700'];
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 4;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1, // float up
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1.0,
        decay: 0.02 + Math.random() * 0.02
      });
    }
  }

  // Game Completed: Trigger transition to victory overlay
  triggerVictory() {
    this.stop();
    
    const gameScreen = document.getElementById('screen-game');
    const victoryScreen = document.getElementById('screen-victory');
    
    // Add visual screen shake feedback
    gameScreen.classList.add('shake-screen');
    setTimeout(() => {
      gameScreen.classList.remove('shake-screen');
    }, 400);

    // Call celebration sounds and visuals
    if (window.effects) {
      window.effects.playVictorySound();
      window.effects.triggerConfetti(120);
      window.effects.triggerFireworks(6);
      
      // Slowly float hearts up
      window.effects.triggerHearts(35);
    }

    // Smooth transit into victory screen overlay
    setTimeout(() => {
      victoryScreen.classList.add('active');
    }, 800);
  }

  // Drawing elements
  draw() {
    this.ctx.clearRect(0, 0, this.virtualWidth, this.virtualHeight);

    // 1. Draw grass background with flowers
    this.ctx.fillStyle = '#1c2e24'; // deep forest dark green
    this.ctx.fillRect(0, 0, this.virtualWidth, this.virtualHeight);
    
    // Simple floral ground patterns
    this.ctx.fillStyle = '#273f32';
    for (let x = 30; x < this.virtualWidth; x += 80) {
      for (let y = 50; y < this.virtualHeight; y += 80) {
        this.ctx.beginPath();
        this.ctx.arc(x + (y % 30), y + (x % 20), 2, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    // 2. Draw static obstacles (Layer: below entities)
    for (const obs of this.obstacles) {
      if (obs.type === 'rock') {
        this.ctx.beginPath();
        this.ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = '#4b5563'; // gray rock
        this.ctx.fill();
        this.ctx.strokeStyle = '#374151';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        // shine highlight
        this.ctx.beginPath();
        this.ctx.arc(obs.x - 4, obs.y - 4, obs.radius * 0.4, 0, Math.PI * 2);
        this.ctx.fillStyle = '#6b7280';
        this.ctx.fill();
      } else if (obs.type === 'tree') {
        // trunk
        this.ctx.fillStyle = '#78350f';
        this.ctx.fillRect(obs.x - 6, obs.y, 12, 35);
        // leaves
        this.ctx.beginPath();
        this.ctx.arc(obs.x, obs.y - 8, obs.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = '#065f46';
        this.ctx.fill();
        this.ctx.strokeStyle = '#047857';
        this.ctx.lineWidth = 2.5;
        this.ctx.stroke();
      }
    }

    // 3. Draw Running Agents (Cats, Dogs, Bunnies, Ducks)
    for (const agent of this.runningAgents) {
      if (agent.type === 'cat') {
        this.drawCat(agent.x, agent.y, agent.animTime, agent.color, agent.dir);
      } else if (agent.type === 'dog') {
        this.drawDog(agent.x, agent.y, agent.animTime, agent.color, agent.dir);
      } else if (agent.type === 'bunny') {
        this.drawBunny(agent.x, agent.y, agent.animTime, agent.color, agent.dir);
      } else if (agent.type === 'duck') {
        this.drawDuck(agent.x, agent.y, agent.animTime, agent.color, agent.dir);
      }

      if (agent.bubbleText !== null) {
        this.drawSpeechBubble(agent.x + 10 * agent.dir, agent.y - 25, agent.bubbleText);
      }
    }

    // 4. Draw Hearts collectibles
    for (const heart of this.hearts) {
      // Dynamic scaling heart pulse
      heart.pulse += heart.pulseSpeed;
      const sizeOffset = Math.sin(heart.pulse) * 3;
      
      if (this.assets.heartLoaded) {
        this.ctx.drawImage(
          this.assets.heart, 
          heart.x - (heart.size + sizeOffset)/2, 
          heart.y - (heart.size + sizeOffset)/2, 
          heart.size + sizeOffset, 
          heart.size + sizeOffset
        );
      } else {
        // Draw vector glowing heart
        this.drawHeartShape(heart.x, heart.y - 5, heart.size + sizeOffset);
      }
    }

    // 5. Draw Player Character
    if (this.assets.playerLoaded) {
      this.ctx.drawImage(this.assets.player, this.player.x, this.player.y, this.player.width, this.player.height);
    } else {
      // Draw premium procedurally animated Chibi Character
      if (window.drawChibiCharacter) {
        window.drawChibiCharacter(this.ctx, this.player.x, this.player.y, this.player.animFrame, this.player.direction, this.player.skin, this.player.moving, this.isBlinking);
      }
    }

    // 6. Draw Clouds (Layer: above ground entities)
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (const cloud of this.clouds) {
      const cx = cloud.x;
      const cy = cloud.y;
      const cs = cloud.scale * 30;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, cs, 0, Math.PI * 2);
      this.ctx.arc(cx + cs * 0.7, cy - cs * 0.2, cs * 0.8, 0, Math.PI * 2);
      this.ctx.arc(cx - cs * 0.7, cy - cs * 0.1, cs * 0.7, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // 7. Draw local sparkles particles
    for (const p of this.particles) {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.life;
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1.0;
  }

  // Draw procedural vector heart
  drawHeartShape(x, y, size) {
    this.ctx.save();
    this.ctx.fillStyle = '#ff4b72';
    // soft neon glow
    this.ctx.shadowBlur = 12;
    this.ctx.shadowColor = '#ff4b72';
    this.ctx.beginPath();
    this.ctx.moveTo(x, y + size / 4);
    this.ctx.bezierCurveTo(x - size / 2, y - size / 2, x - size, y + size / 6, x, y + size);
    this.ctx.bezierCurveTo(x + size, y + size / 6, x + size / 2, y - size / 2, x, y + size / 4);
    this.ctx.fill();
    this.ctx.restore();
  }

  // Draw speech bubbles for the kitty
  drawSpeechBubble(x, y, text) {
    this.ctx.save();
    this.ctx.font = 'bold 11px Arial';
    const textWidth = this.ctx.measureText(text).width;
    const padding = 6;
    const w = textWidth + padding * 2;
    const h = 20;

    // bubble background
    this.ctx.fillStyle = '#fff';
    this.ctx.strokeStyle = '#ff7597';
    this.ctx.lineWidth = 1.5;
    
    // draw rounded rect bubble
    this.ctx.beginPath();
    this.ctx.roundRect(x - w / 2, y - h, w, h, 6);
    this.ctx.fill();
    this.ctx.stroke();

    // pointer triangle
    this.ctx.beginPath();
    this.ctx.moveTo(x - 4, y);
    this.ctx.lineTo(x + 4, y);
    this.ctx.lineTo(x - 2, y + 5);
    this.ctx.closePath();
    this.ctx.fillStyle = '#fff';
    this.ctx.fill();
    this.ctx.strokeStyle = '#ff7597';
    this.ctx.stroke();

    // draw text
    this.ctx.fillStyle = '#3b2a59';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(text, x, y - 6);
    this.ctx.restore();
  }

  // Darker shade color generator for shadows
  getDarkerColor(color) {
    if (color === '#fbbf24') return '#d97706';
    if (color === '#d1d5db') return '#9ca3af';
    if (color === '#fca5a5') return '#f87171';
    if (color === '#b45309') return '#78350f';
    if (color === '#fff') return '#e5e7eb';
    return '#4b5563';
  }

  // Draw procedural chibi cat
  drawCat(x, y, animTime, color = '#d1d5db', dir = 1) {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.scale(dir, 1);
    
    const walkingBob = Math.sin(animTime * 2) * 2.5;

    // Body
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.ellipse(0, walkingBob, 14, 10, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Head
    this.ctx.beginPath();
    this.ctx.arc(12, -4 + walkingBob, 9, 0, Math.PI * 2);
    this.ctx.fill();

    // Ears
    this.ctx.fillStyle = this.getDarkerColor(color);
    // left ear
    this.ctx.beginPath();
    this.ctx.moveTo(6, -10 + walkingBob);
    this.ctx.lineTo(11, -18 + walkingBob);
    this.ctx.lineTo(12, -10 + walkingBob);
    this.ctx.fill();
    // right ear
    this.ctx.beginPath();
    this.ctx.moveTo(10, -10 + walkingBob);
    this.ctx.lineTo(16, -18 + walkingBob);
    this.ctx.lineTo(17, -10 + walkingBob);
    this.ctx.fill();

    // Eyes
    this.ctx.fillStyle = '#374151';
    this.ctx.beginPath();
    this.ctx.arc(15, -5 + walkingBob, 1.2, 0, Math.PI * 2);
    this.ctx.fill();

    // Tail
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 3.5;
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(-12, walkingBob);
    this.ctx.quadraticCurveTo(-20, -10 + Math.sin(animTime) * 4, -18, -16);
    this.ctx.stroke();

    // Feet
    this.ctx.strokeStyle = this.getDarkerColor(color);
    this.ctx.lineWidth = 3;
    
    const leftFootOffset = Math.sin(animTime * 2) * 4;
    const rightFootOffset = -Math.sin(animTime * 2) * 4;
    this.ctx.beginPath();
    this.ctx.moveTo(-6, 8 + walkingBob);
    this.ctx.lineTo(-6, 14 + leftFootOffset);
    this.ctx.moveTo(6, 8 + walkingBob);
    this.ctx.lineTo(6, 14 + rightFootOffset);
    this.ctx.stroke();

    this.ctx.restore();
  }

  // Draw procedural chibi dog
  drawDog(x, y, animTime, color = '#b45309', dir = 1) {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.scale(dir, 1);

    const walkingBob = Math.sin(animTime * 2) * 2;

    // Body
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.ellipse(0, walkingBob, 15, 11, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Head
    this.ctx.beginPath();
    this.ctx.arc(13, -5 + walkingBob, 9.5, 0, Math.PI * 2);
    this.ctx.fill();

    // Muzzle/Snout
    this.ctx.fillStyle = '#fef3c7'; // cream color muzzle
    this.ctx.beginPath();
    this.ctx.ellipse(17, -3 + walkingBob, 4.5, 3.5, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Nose
    this.ctx.fillStyle = '#111827';
    this.ctx.beginPath();
    this.ctx.arc(20.5, -4 + walkingBob, 1.5, 0, Math.PI * 2);
    this.ctx.fill();

    // Floppy Ear
    this.ctx.fillStyle = this.getDarkerColor(color);
    this.ctx.beginPath();
    this.ctx.ellipse(10, -3 + walkingBob, 3, 6, Math.PI / 8, 0, Math.PI * 2);
    this.ctx.fill();

    // Eyes
    this.ctx.fillStyle = '#111827';
    this.ctx.beginPath();
    this.ctx.arc(15, -6 + walkingBob, 1.2, 0, Math.PI * 2);
    this.ctx.fill();

    // Tail (wagging)
    const wag = Math.sin(Date.now() / 80) * 8;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 3.5;
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(-13, walkingBob);
    this.ctx.quadraticCurveTo(-20, -5 + wag, -18, -14 + wag);
    this.ctx.stroke();

    // Feet
    this.ctx.strokeStyle = this.getDarkerColor(color);
    this.ctx.lineWidth = 3.5;
    const leftFootOffset = Math.sin(animTime * 2) * 4;
    const rightFootOffset = -Math.sin(animTime * 2) * 4;
    this.ctx.beginPath();
    this.ctx.moveTo(-6, 9 + walkingBob);
    this.ctx.lineTo(-6, 15 + leftFootOffset);
    this.ctx.moveTo(6, 9 + walkingBob);
    this.ctx.lineTo(6, 15 + rightFootOffset);
    this.ctx.stroke();

    this.ctx.restore();
  }

  // Draw procedural chibi bunny
  drawBunny(x, y, animTime, color = '#f3f4f6', dir = 1) {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.scale(dir, 1);

    // Hopping height
    const bounce = Math.abs(Math.sin(animTime * 1.8)) * 9;
    const bodyY = -bounce;

    // Body
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.ellipse(0, bodyY, 13, 11, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Head
    this.ctx.beginPath();
    this.ctx.arc(10, -7 + bodyY, 8.5, 0, Math.PI * 2);
    this.ctx.fill();

    // Ears (long, upright with pink interior)
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.ellipse(6, -18 + bodyY, 3, 8, -Math.PI / 12, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = '#fda4af'; // pink inside ear
    this.ctx.beginPath();
    this.ctx.ellipse(6, -18 + bodyY, 1.5, 6, -Math.PI / 12, 0, Math.PI * 2);
    this.ctx.fill();

    // Eyes (ruby red/pink eyes)
    this.ctx.fillStyle = '#ef4444'; 
    this.ctx.beginPath();
    this.ctx.arc(12, -8 + bodyY, 1.2, 0, Math.PI * 2);
    this.ctx.fill();

    // Tiny pink cheek
    this.ctx.fillStyle = '#fca5a5';
    this.ctx.beginPath();
    this.ctx.arc(13, -5 + bodyY, 1.5, 0, Math.PI * 2);
    this.ctx.fill();

    // Cotton Tail
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(-12, bodyY, 3.5, 0, Math.PI * 2);
    this.ctx.fill();

    // Feet
    this.ctx.strokeStyle = this.getDarkerColor(color);
    this.ctx.lineWidth = 3;
    const leftFootOffset = Math.sin(animTime * 2) * 3;
    const rightFootOffset = -Math.sin(animTime * 2) * 3;
    this.ctx.beginPath();
    this.ctx.moveTo(-5, 9 + bodyY);
    this.ctx.lineTo(-5, 14 + leftFootOffset);
    this.ctx.moveTo(5, 9 + bodyY);
    this.ctx.lineTo(5, 14 + rightFootOffset);
    this.ctx.stroke();

    this.ctx.restore();
  }

  // Draw procedural chibi duck
  drawDuck(x, y, animTime, color = '#fbbf24', dir = 1) {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.scale(dir, 1);

    const waddle = Math.sin(animTime * 2.8) * 2;

    // Body
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.ellipse(0, waddle, 12, 10, -Math.PI / 12, 0, Math.PI * 2);
    this.ctx.fill();

    // Head
    this.ctx.beginPath();
    this.ctx.arc(10, -7 + waddle, 7.5, 0, Math.PI * 2);
    this.ctx.fill();

    // Wing
    this.ctx.fillStyle = this.getDarkerColor(color);
    this.ctx.beginPath();
    this.ctx.ellipse(-2, waddle, 6, 4, -Math.PI / 6, 0, Math.PI * 2);
    this.ctx.fill();

    // Bill/Beak (orange)
    this.ctx.fillStyle = '#f97316';
    this.ctx.beginPath();
    this.ctx.ellipse(16, -7 + waddle, 3.5, 2, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Eye
    this.ctx.fillStyle = '#111827';
    this.ctx.beginPath();
    this.ctx.arc(12, -9 + waddle, 1.2, 0, Math.PI * 2);
    this.ctx.fill();

    // Waddling Feet (orange)
    this.ctx.strokeStyle = '#f97316';
    this.ctx.lineWidth = 3.5;
    const footSwing = Math.sin(animTime * 2.8) * 5;
    this.ctx.beginPath();
    this.ctx.moveTo(-3, 8 + waddle);
    this.ctx.lineTo(-3 + footSwing, 14);
    this.ctx.moveTo(3, 8 + waddle);
    this.ctx.lineTo(3 - footSwing, 14);
    this.ctx.stroke();

    this.ctx.restore();
  }

  // Animation frame loop
  loop() {
    if (!this.isPlaying) return;
    this.update();
    this.draw();
    requestAnimationFrame(() => this.loop());
  }
}

// Instantiate globally
window.loveGame = new LoveGame();
window.loveGame.draw(); // draw initial screen before playing

// Draw customizable gorgeous chibi character (Shared globally)
window.drawChibiCharacter = function(ctx, x, y, animFrame, direction, skin, isMoving = false, isBlinking = false) {
  ctx.save();
  
  // 1. Idle breathing bobbing animation
  let bobbing = 0;
  let squishY = 1.0;
  let squishX = 1.0;
  
  if (!isMoving) {
    bobbing = Math.sin(Date.now() / 320) * 1.5;
    squishY = 1 + Math.sin(Date.now() / 320) * 0.015;
    squishX = 1 - Math.sin(Date.now() / 320) * 0.015;
  } else {
    bobbing = Math.sin(animFrame) * 2.8;
  }
  
  // Squish squash translation origin relative to base feet
  ctx.translate(x + 25, y + 55);
  ctx.scale(squishX, squishY);
  ctx.translate(-25, -55);
  
  const headX = 25;
  const headY = 20 + bobbing;

  // 2. Draw Legs/Shoes
  const shoeOffset = isMoving ? Math.sin(animFrame) * 4.5 : 0;
  
  if (skin === 'girl') {
    // Draw white socks
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(13, 44, 6, 6 + shoeOffset);
    ctx.fillRect(31, 44, 6, 6 - shoeOffset);

    // Draw cute round black Mary Janes
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(16, 50 + shoeOffset, 5.5, 0, Math.PI * 2);
    ctx.arc(34, 50 - shoeOffset, 5.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Standard shoes for boy and cat costume
    ctx.fillStyle = '#1e293b'; // dark shoes
    ctx.beginPath();
    ctx.arc(16, 50 + shoeOffset, 4.5, 0, Math.PI * 2);
    ctx.arc(34, 50 - shoeOffset, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Body/Outfit rendering based on skin
  if (skin === 'boy') {
    // Pants
    ctx.fillStyle = '#374151'; 
    ctx.fillRect(15, 38 + bobbing, 20, 10);
    
    // Hoodie
    ctx.fillStyle = '#3b82f6'; // bright blue
    ctx.beginPath();
    ctx.roundRect(12, 28 + bobbing, 26, 12, 4);
    ctx.fill();
    
    // Hoodie pocket
    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.roundRect(16, 32 + bobbing, 18, 6, 2);
    ctx.fill();
    
    // Sleeves
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(8, 33 + bobbing + (shoeOffset * 0.3), 3.5, 0, Math.PI * 2);
    ctx.arc(42, 33 + bobbing - (shoeOffset * 0.3), 3.5, 0, Math.PI * 2);
    ctx.fill();
  } 
  else if (skin === 'cat') {
    // Yellow Cat Costume Onesie
    ctx.fillStyle = '#fbbf24'; 
    ctx.beginPath();
    ctx.roundRect(11, 26 + bobbing, 28, 23, 8);
    ctx.fill();
    
    // Cream tummy circle
    ctx.fillStyle = '#fffbeb';
    ctx.beginPath();
    ctx.ellipse(25, 37 + bobbing, 8, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cat sleeves
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(8, 33 + bobbing + (shoeOffset * 0.3), 4, 0, Math.PI * 2);
    ctx.arc(42, 33 + bobbing - (shoeOffset * 0.3), 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Claws
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(6, 33 + bobbing + (shoeOffset * 0.3), 1.5, 0, Math.PI * 2);
    ctx.arc(44, 33 + bobbing - (shoeOffset * 0.3), 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Cat Tail
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(13, 44 + bobbing);
    ctx.quadraticCurveTo(3, 48 + Math.sin(Date.now() / 200) * 3, 2, 38);
    ctx.stroke();
  } 
  else {
    // Default girl (Pink Dress + Sailor Collar + bow tie)
    ctx.fillStyle = '#ff7597'; // pink base dress
    ctx.beginPath();
    ctx.moveTo(14, 28 + bobbing);
    ctx.lineTo(36, 28 + bobbing);
    ctx.lineTo(41, 46 + bobbing);
    ctx.lineTo(9, 46 + bobbing);
    ctx.closePath();
    ctx.fill();

    // White Sailor Collar
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(16, 28 + bobbing);
    ctx.lineTo(34, 28 + bobbing);
    ctx.lineTo(38, 35 + bobbing);
    ctx.lineTo(25, 34 + bobbing); // V-neck center
    ctx.lineTo(12, 35 + bobbing);
    ctx.closePath();
    ctx.fill();

    // Red Bowtie in V-neck center
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.ellipse(22, 34 + bobbing, 3, 2, Math.PI/4, 0, Math.PI*2);
    ctx.ellipse(28, 34 + bobbing, 3, 2, -Math.PI/4, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#fbbf24'; // gold knot center
    ctx.beginPath();
    ctx.arc(25, 34 + bobbing, 1.2, 0, Math.PI*2);
    ctx.fill();

    // Sleeves
    ctx.fillStyle = '#ff4b72'; 
    ctx.beginPath();
    ctx.arc(9, 32 + bobbing + (shoeOffset * 0.3), 3.8, 0, Math.PI * 2);
    ctx.arc(41, 32 + bobbing - (shoeOffset * 0.3), 3.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Hand skins
  ctx.fillStyle = '#ffd8b3';
  ctx.beginPath();
  ctx.arc(6, 35 + bobbing + (shoeOffset * 0.2), 3, 0, Math.PI * 2);
  ctx.arc(44, 35 + bobbing - (shoeOffset * 0.2), 3, 0, Math.PI * 2);
  ctx.fill();

  // 4. Head Skin
  ctx.fillStyle = '#ffd8b3';
  ctx.beginPath();
  ctx.arc(headX, headY, 17, 0, Math.PI * 2);
  ctx.fill();

  // 5. Hair and Hood overlays
  if (skin === 'boy') {
    ctx.fillStyle = '#1e3a8a'; // Dark blue cool spiky hair
    ctx.beginPath();
    ctx.arc(headX, headY - 1, 17, Math.PI, 0, false);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(headX - 17, headY - 3);
    ctx.lineTo(headX - 12, headY + 3);
    ctx.lineTo(headX - 7, headY - 2);
    ctx.lineTo(headX - 2, headY + 5);
    ctx.lineTo(headX + 3, headY - 2);
    ctx.lineTo(headX + 8, headY + 4);
    ctx.lineTo(headX + 13, headY - 2);
    ctx.lineTo(headX + 17, headY - 3);
    ctx.fill();
  } 
  else if (skin === 'cat') {
    // Cat hood
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(headX, headY, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffd8b3';
    ctx.beginPath();
    ctx.arc(headX, headY + 2, 14, 0, Math.PI * 2);
    ctx.fill();

    // Cat ears
    ctx.fillStyle = '#fbbf24';
    // left ear
    ctx.beginPath();
    ctx.moveTo(headX - 16, headY - 10);
    ctx.lineTo(headX - 18, headY - 24);
    ctx.lineTo(headX - 5, headY - 16);
    ctx.fill();
    // right ear
    ctx.beginPath();
    ctx.moveTo(headX + 16, headY - 10);
    ctx.lineTo(headX + 18, headY - 24);
    ctx.lineTo(headX + 5, headY - 16);
    ctx.fill();
    
    // Pink inner ears
    ctx.fillStyle = '#ff7597';
    ctx.beginPath();
    ctx.moveTo(headX - 14, headY - 12);
    ctx.lineTo(headX - 16, headY - 20);
    ctx.lineTo(headX - 7, headY - 15);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(headX + 14, headY - 12);
    ctx.lineTo(headX + 16, headY - 20);
    ctx.lineTo(headX + 7, headY - 15);
    ctx.fill();
  } 
  else {
    // Girl brown flowing pigtails hair + bows + daisy hairpin
    ctx.fillStyle = '#451a03'; 
    const sway = isMoving ? Math.sin(animFrame * 1.5) * 3 : 0;
    
    // Left ponytail wave
    ctx.beginPath();
    ctx.moveTo(headX - 15 + sway, headY - 4);
    ctx.quadraticCurveTo(headX - 25 + sway, headY + 8, headX - 19 + sway, headY + 20);
    ctx.quadraticCurveTo(headX - 11 + sway, headY + 8, headX - 15 + sway, headY - 4);
    ctx.fill();

    // Right ponytail wave
    ctx.beginPath();
    ctx.moveTo(headX + 15 + sway, headY - 4);
    ctx.quadraticCurveTo(headX + 25 + sway, headY + 8, headX + 19 + sway, headY + 20);
    ctx.quadraticCurveTo(headX + 11 + sway, headY + 8, headX + 15 + sway, headY - 4);
    ctx.fill();

    // Hair buns base
    ctx.beginPath();
    ctx.arc(headX - 15 + sway, headY - 5, 5, 0, Math.PI * 2);
    ctx.arc(headX + 15 + sway, headY - 5, 5, 0, Math.PI * 2);
    ctx.fill();

    // Cute pink bows
    ctx.fillStyle = '#ff4b72';
    ctx.beginPath();
    ctx.ellipse(headX - 18 + sway, headY - 5, 3.5, 2, Math.PI / 4, 0, Math.PI * 2);
    ctx.ellipse(headX - 12 + sway, headY - 5, 3.5, 2, -Math.PI / 4, 0, Math.PI * 2);
    ctx.ellipse(headX + 12 + sway, headY - 5, 3.5, 2, Math.PI / 4, 0, Math.PI * 2);
    ctx.ellipse(headX + 18 + sway, headY - 5, 3.5, 2, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(headX - 15 + sway, headY - 5, 1.2, 0, Math.PI * 2);
    ctx.arc(headX + 15 + sway, headY - 5, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Back of hair base & bangs
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.arc(headX, headY - 2, 17, Math.PI, 0, false);
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(headX - 17, headY - 3);
    ctx.lineTo(headX - 9, headY + 3);
    ctx.lineTo(headX - 5, headY - 3);
    ctx.lineTo(headX, headY + 4);
    ctx.lineTo(headX + 4, headY - 3);
    ctx.lineTo(headX + 10, headY + 3);
    ctx.lineTo(headX + 17, headY - 3);
    ctx.closePath();
    ctx.fill();

    // Daisy hairpin on left side
    ctx.fillStyle = '#ffffff';
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
      ctx.beginPath();
      ctx.arc(headX - 9 + Math.cos(a) * 2.5, headY - 7 + Math.sin(a) * 2.5, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#fbbf24'; // yellow center
    ctx.beginPath();
    ctx.arc(headX - 9, headY - 7, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 6. Facial details (Render only if NOT walking UP)
  if (direction !== 'up') {
    let eyeShiftX = 0;
    let mouthShiftX = 0;
    let cheekShiftX = 0;
    
    if (direction === 'left') {
      eyeShiftX = -2;
      mouthShiftX = -1.5;
      cheekShiftX = -1.5;
    } else if (direction === 'right') {
      eyeShiftX = 2;
      mouthShiftX = 1.5;
      cheekShiftX = 1.5;
    }

    // Eyes
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    
    if (isBlinking) {
      // closed eye lines
      ctx.beginPath();
      ctx.moveTo(headX - 10 + eyeShiftX, headY + 3);
      ctx.lineTo(headX - 4 + eyeShiftX, headY + 3);
      ctx.moveTo(headX + 4 + eyeShiftX, headY + 3);
      ctx.lineTo(headX + 10 + eyeShiftX, headY + 3);
      ctx.stroke();
    } else {
      // open cute circles
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(headX - 7 + eyeShiftX, headY + 2, 2.6, 0, Math.PI * 2);
      ctx.arc(headX + 7 + eyeShiftX, headY + 2, 2.6, 0, Math.PI * 2);
      ctx.fill();
      
      // shine highlight 1
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(headX - 7.8 + eyeShiftX, headY + 1.2, 0.9, 0, Math.PI * 2);
      ctx.arc(headX + 6.2 + eyeShiftX, headY + 1.2, 0.9, 0, Math.PI * 2);
      ctx.fill();

      // shine highlight 2 (secondary spark at bottom-right of eye)
      ctx.beginPath();
      ctx.arc(headX - 6.0 + eyeShiftX, headY + 3.0, 0.5, 0, Math.PI * 2);
      ctx.arc(headX + 8.0 + eyeShiftX, headY + 3.0, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cheeks
    ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
    ctx.beginPath();
    ctx.arc(headX - 11 + cheekShiftX, headY + 6, 3.2, 0, Math.PI * 2);
    ctx.arc(headX + 11 + cheekShiftX, headY + 6, 3.2, 0, Math.PI * 2);
    ctx.fill();

    // Smile
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(headX + mouthShiftX, headY + 6.5, 2, 0, Math.PI, false);
    ctx.stroke();
    
    // Whiskers for cat costume
    if (skin === 'cat') {
      ctx.strokeStyle = '#6b7280';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(headX - 15, headY + 6); ctx.lineTo(headX - 21, headY + 5);
      ctx.moveTo(headX - 15, headY + 8); ctx.lineTo(headX - 20, headY + 9);
      ctx.moveTo(headX + 15, headY + 6); ctx.lineTo(headX + 21, headY + 5);
      ctx.moveTo(headX + 15, headY + 8); ctx.lineTo(headX + 20, headY + 9);
      ctx.stroke();
    }
  } else {
    // Walking UP (back hair cover)
    ctx.fillStyle = (skin === 'boy') ? '#1e3a8a' : (skin === 'cat' ? '#fbbf24' : '#451a03');
    ctx.beginPath();
    ctx.arc(headX, headY, 17, 0, Math.PI, false);
    ctx.fill();
    
    if (skin === 'girl') {
      ctx.fillRect(headX - 14, headY, 28, 12);
    }
  }

  ctx.restore();
};
