import React, { useRef, useEffect, useCallback } from 'react';

const ASSETS = {
  player: '/assets/player.svg',
  car: '/assets/car.svg',
  taxi: '/assets/taxi.svg',
  ute: '/assets/ute.svg',
  kebab_stand: '/assets/kebab_stand.svg',
  seven_eleven: '/assets/seven_eleven.svg',
  bottle_shop: '/assets/bottle_shop.svg',
  kfc: '/assets/kfc.svg',
  burger_bar: '/assets/burger_bar.svg',
  lawn_mower: '/assets/lawn_mower.svg',
  pub: '/assets/coomera_lodge.png',
  pub_loading: '/assets/coomera_lodge_loading.png',
};

const OBSTACLE_TYPES = [
  { id: 'car', speed: 4 },
  { id: 'taxi', speed: 4.7 },
  { id: 'ute', speed: 4.2 },
  { id: 'kebab_stand', speed: 2.5 },
  { id: 'seven_eleven', speed: 3 },
  { id: 'bottle_shop', speed: 3.2 },
  { id: 'kfc', speed: 5 },
  { id: 'burger_bar', speed: 3.4 },
  { id: 'lawn_mower', speed: 2.9 }
];

const COLS = 5;
const W = 500;
const H = 800;
const colWidth = W / COLS;
const laneHeight = colWidth;
const horizonY = H * 0.25;
const BEER_PICKUP_SPAWN_CHANCE = 0.03;
const OFF_CENTRE_COLS = [0, 1, 3, 4];

const CanvasGame = ({ gameState, playerName, highScore, personalHighScore, onGameOver, onWin, onScoreUpdate, onDodge, onBeerHit, onBeerPickup, onApproachingHighScore, onApproachingLife }) => {
  const canvasRef = useRef(null);
  const [assetsLoaded, setAssetsLoaded] = React.useState(false);

  const stateRef = useRef({
    score: 0,
    startTime: 0,
    lanes: [],
    lastTime: 0,
    player: { col: 2 },
    lives: 1, // Start with 1 life
    images: {},
    loaded: false,
    animationId: null,
    beerHitEndTime: 0
  });

  // Separate state for animated start screen
  const startScreenRef = useRef({
    animId: null,
    time: 0,
    obstacles: [],
    groundOffset: 0,
    initialized: false,
  });

  // Pre-load images
  useEffect(() => {
    let loadedCount = 0;
    const keys = Object.keys(ASSETS);
    keys.forEach((key) => {
      const img = new Image();
      img.src = ASSETS[key];
      img.onload = () => {
        stateRef.current.images[key] = img;
        loadedCount++;
        if (loadedCount === keys.length) {
          stateRef.current.loaded = true;
          setAssetsLoaded(true);
        }
      };
    });
    
    return () => {
      if (stateRef.current.animationId) {
        cancelAnimationFrame(stateRef.current.animationId);
      }
    };
    // eslint-disable-next-line
  }, []);

  const generateLane = (y, isSafe = false) => {
    let hasObstacle = !isSafe && Math.random() > 0.35;
    let obstacle = null;
    let direction = Math.random() > 0.5 ? 1 : -1;
    let beerPickupCol = null;
    
    if (hasObstacle) {
      let type = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
      obstacle = {
        id: type.id,
        x: direction === 1 ? -colWidth : W + colWidth,
        speed: type.speed * direction * (0.8 + Math.random() * 0.4)
      };
    }
    
    // Rare off-centre free beer pickup to reward risky side moves on mobile.
    // Only spawn on obstacle-free lanes so the pickup is actually collectible.
    if (!isSafe && !hasObstacle && Math.random() < BEER_PICKUP_SPAWN_CHANCE) {
      beerPickupCol = OFF_CENTRE_COLS[Math.floor(Math.random() * OFF_CENTRE_COLS.length)];
    }

    return { y, isSafe: isSafe || !hasObstacle, obstacle, beerPickupCol };
  };

  const initGame = () => {
    const s = stateRef.current;
    s.score = 0;
    s.startTime = Date.now();
    s.player.col = Math.floor(COLS / 2);
    s.lives = 1;
    s.lanes = [];
    s.beerHitEndTime = 0;
    
    let currentY = H - laneHeight;
    while(currentY >= horizonY - laneHeight) {
      let isSafe = currentY >= H - laneHeight * 3; 
      s.lanes.unshift(generateLane(currentY, isSafe));
      currentY -= laneHeight;
    }
  };

  // ── Animated Start Screen ──────────────────────────────────────
  const initStartScreen = () => {
    const ss = startScreenRef.current;
    if (ss.initialized) return;
    ss.initialized = true;
    ss.obstacles = [];
    // Create 6 auto-scrolling obstacles at various heights
    const laneYs = [horizonY + 40, horizonY + 140, horizonY + 240, horizonY + 340, horizonY + 440, horizonY + 540];
    const obstacleKeys = ['car', 'kebab_stand', 'kfc', 'taxi', 'seven_eleven', 'ute'];
    laneYs.forEach((ly, i) => {
      const dir = i % 2 === 0 ? 1 : -1;
      ss.obstacles.push({
        id: obstacleKeys[i % obstacleKeys.length],
        x: Math.random() * W,
        y: ly,
        speed: (2 + Math.random() * 2) * dir,
      });
    });
  };

  const drawStartScreen = (time) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;
    const ss = startScreenRef.current;
    ss.time = time;

    ctx.clearRect(0, 0, W, H);

    // Sky gradient and static background caching
    if (!ss.bgCanvas) {
      ss.bgCanvas = document.createElement('canvas');
      ss.bgCanvas.width = W;
      ss.bgCanvas.height = H;
      const bctx = ss.bgCanvas.getContext('2d');
      
      const sky = bctx.createLinearGradient(0, 0, 0, horizonY + 60);
      sky.addColorStop(0, '#1a1a2e');
      sky.addColorStop(0.4, '#16213e');
      sky.addColorStop(0.7, '#e67e22');
      sky.addColorStop(1, '#f39c12');
      bctx.fillStyle = sky;
      bctx.fillRect(0, 0, W, horizonY + 60);

      const pubLoadImg = s.images.pub_loading || s.images.pub;
      if (pubLoadImg) {
        bctx.save();
        bctx.translate(W / 2, horizonY); 
        const w = W; 
        const h = w * (pubLoadImg.height / pubLoadImg.width);
        bctx.drawImage(pubLoadImg, -w / 2, -h + 220, w, h);
        bctx.restore();
      }

      const laneYs = [horizonY + 40, horizonY + 140, horizonY + 240, horizonY + 340, horizonY + 440, horizonY + 540];
      laneYs.forEach((ly, i) => {
        const isGrass = i % 2 === 0;
        bctx.fillStyle = isGrass ? '#22c55e' : '#334155';
        bctx.fillRect(0, ly, W, laneHeight);

        if (!isGrass) {
          bctx.fillStyle = '#cbd5e1';
          for (let j = 1; j < COLS; j++) {
            bctx.fillRect(j * colWidth - 2, ly + 15, 4, laneHeight - 30);
          }
        }
      });
    }

    ctx.drawImage(ss.bgCanvas, 0, 0);

    // Scrolling ground at the bottom
    ss.groundOffset = (ss.groundOffset + 1.5) % colWidth;
    ctx.fillStyle = '#15803d';
    ctx.fillRect(0, H - laneHeight, W, laneHeight);
    // Ground stripes
    ctx.fillStyle = '#166534';
    for (let gx = -colWidth + ss.groundOffset; gx < W + colWidth; gx += colWidth) {
      ctx.fillRect(gx, H - laneHeight, colWidth / 2, laneHeight);
    }

    // Draw auto-scrolling obstacles
    ss.obstacles.forEach((obs) => {
      obs.x += obs.speed;
      // Wrap around
      if (obs.speed > 0 && obs.x > W + colWidth) obs.x = -colWidth;
      if (obs.speed < 0 && obs.x < -colWidth) obs.x = W + colWidth;

      const img = s.images[obs.id];
      if (img) {
        const w = colWidth * 0.85;
        const h = w * (img.height / img.width);
        ctx.drawImage(img, obs.x | 0, (obs.y + (laneHeight - h) / 2) | 0, w, h);
      }
    });

    // Bobbing player character
    if (s.loaded && s.images.player) {
      const bobY = Math.sin(time / 300) * 8;
      const cx = W / 2;
      const cy = H - laneHeight * 1.5 + bobY;
      const w = colWidth * 0.8;
      const h = w * (s.images.player.height / s.images.player.width);
      ctx.drawImage(s.images.player, (cx - w / 2) | 0, (cy - h / 2) | 0, w, h);
    }
  };

  const startScreenLoop = useCallback((time) => {
    drawStartScreen(time);
    startScreenRef.current.animId = requestAnimationFrame(startScreenLoop);
    // eslint-disable-next-line
  }, []);

  // Handle Game State Transitions
  useEffect(() => {
    if (!assetsLoaded) return;
    
    const ss = startScreenRef.current;

    if (gameState === 'PLAY') {
      // Stop start screen loop
      if (ss.animId) { cancelAnimationFrame(ss.animId); ss.animId = null; }
      initGame();
      stateRef.current.lastTime = performance.now();
      loop(performance.now());
    } else if (gameState === 'START' || gameState === 'LEADERBOARD') {
      // Stop game loop
      if (stateRef.current.animationId) {
        cancelAnimationFrame(stateRef.current.animationId);
        stateRef.current.animationId = null;
      }
      if (stateRef.current.loaded) {
        initStartScreen();
        if (!ss.animId) {
          ss.animId = requestAnimationFrame(startScreenLoop);
        }
      }
    } else {
      // GAMEOVER / WIN: stop everything, draw static
      if (ss.animId) { cancelAnimationFrame(ss.animId); ss.animId = null; }
      if (stateRef.current.animationId) {
        cancelAnimationFrame(stateRef.current.animationId);
        stateRef.current.animationId = null;
      }
      if (stateRef.current.loaded) {
        draw();
      }
    }

    return () => {
      if (ss.animId) { cancelAnimationFrame(ss.animId); ss.animId = null; }
    };
    // eslint-disable-next-line
  }, [gameState, assetsLoaded, startScreenLoop]);

  const moveForward = () => {
    const s = stateRef.current;
    s.score++;
    
    // Gain a life every 50 steps
    if (s.score > 0 && s.score % 50 === 0) {
      if (s.lives < 5) s.lives++;
    }

    // Check approaching life
    if (s.score > 0 && s.score % 50 >= 45 && s.score % 50 < 50) {
      if (onApproachingLife) onApproachingLife();
    }

    // Check approaching high score
    let distToHighScore = highScore - s.score;
    if (distToHighScore > 0 && distToHighScore <= 15) {
      if (onApproachingHighScore) onApproachingHighScore();
    }

    onScoreUpdate(s.score);
    
    if (s.score >= 1000) {
      onWin((Date.now() - s.startTime) / 1000);
      return;
    }
    
    s.lanes.forEach(lane => lane.y += laneHeight);
    s.lanes = s.lanes.filter(lane => lane.y < H); 
    
    let topY = s.lanes[0].y - laneHeight;
    s.lanes.unshift(generateLane(topY));
  };

  const handlePointerDown = (e) => {
    if (gameState !== 'PLAY') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    let rect = canvas.getBoundingClientRect();
    let scaleX = canvas.width / rect.width;
    let x = (e.clientX - rect.left) * scaleX;

    const s = stateRef.current;
    if (x < W / 3) {
      if (s.player.col > 0) {
        s.player.col--;
        onDodge();
      }
    } else if (x > (W * 2) / 3) {
      if (s.player.col < COLS - 1) {
        s.player.col++;
        onDodge();
      }
    } else {
      moveForward(); 
    }
  };

  const update = (dt) => {
    const s = stateRef.current;
    let pX = s.player.col * colWidth + colWidth / 2;

    s.lanes.forEach(lane => {
      if (lane.obstacle) {
        lane.obstacle.x += lane.obstacle.speed * (dt / 16);
        if (lane.obstacle.speed > 0 && lane.obstacle.x > W + colWidth) lane.obstacle.x = -colWidth;
        if (lane.obstacle.speed < 0 && lane.obstacle.x < -colWidth) lane.obstacle.x = W + colWidth;
      }

      // Check collision
      if (Math.abs(lane.y - (H - laneHeight * 2)) < 5) {
        if (lane.beerPickupCol !== null && lane.beerPickupCol === s.player.col) {
          const gainedLife = s.lives < 5;
          if (gainedLife) s.lives++;
          lane.beerPickupCol = null;
          if (gainedLife && onBeerPickup) onBeerPickup();
        }

        if (lane.obstacle) {
          let obsX = lane.obstacle.x + colWidth / 2;
          if (Math.abs(pX - obsX) < colWidth * 0.40) {
            // Collision logic with lives
            if (s.lives > 0) {
              s.lives--;
              lane.obstacle = null; // Consume the obstacle
              s.beerHitEndTime = performance.now() + 5000;
              if (onBeerHit) onBeerHit();
            } else {
              onGameOver(s.score, (Date.now() - s.startTime) / 1000);
            }
          }
        }
      }
    });
  };

  const drawPub = (ctx) => {
    const s = stateRef.current;
    ctx.fillStyle = '#skyBlue';
    // Draw sky gradient
    if (!s.pubSkyGradient) {
      s.pubSkyGradient = ctx.createLinearGradient(0, 0, 0, horizonY);
      s.pubSkyGradient.addColorStop(0, '#0f172a');
      s.pubSkyGradient.addColorStop(1, '#87CEEB');
    }
    ctx.fillStyle = s.pubSkyGradient;
    ctx.fillRect(0, 0, W, horizonY);

    let progress = s.score / 1000;
    let scale = 0.4 + (progress * 1.6);
    
    ctx.save();
    ctx.translate(W / 2, horizonY); 
    ctx.scale(scale, scale);

    // River
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(-W, -35, W * 2, 35); 

    // Draw pub image at center — use the higher quality Loading image
    const pubImg = s.images.pub_loading || s.images.pub;
    if (pubImg) {
        const w = 450; 
        const h = w * (pubImg.height / pubImg.width);
        
        ctx.save();
        
        if (!s.pubMaskedCanvas) {
            // Create a soft vignette/mask to blend the building edges
            const maskCanvas = document.createElement('canvas');
            maskCanvas.width = w;
            maskCanvas.height = h;
            const mctx = maskCanvas.getContext('2d');
            
            mctx.drawImage(pubImg, 0, 0, w, h);
            
            // Use 'destination-in' to apply a soft alpha mask
            mctx.globalCompositeOperation = 'destination-in';
            
            // Radial gradient for soft side edges
            const radGrd = mctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w/2);
            radGrd.addColorStop(0.7, 'rgba(0,0,0,1)');
            radGrd.addColorStop(1, 'rgba(0,0,0,0)');
            mctx.fillStyle = radGrd;
            mctx.fillRect(0, 0, w, h);
            
            // Linear gradient for soft bottom/river blend
            const linGrd = mctx.createLinearGradient(0, 0, 0, h);
            linGrd.addColorStop(0.8, 'rgba(0,0,0,1)');
            linGrd.addColorStop(1, 'rgba(0,0,0,0)');
            mctx.fillStyle = linGrd;
            mctx.fillRect(0, 0, w, h);
            
            s.pubMaskedCanvas = maskCanvas;
        }
        
        // Draw the masked result
        ctx.drawImage(s.pubMaskedCanvas, -w/2, -h + 20);
        ctx.restore();
    }

    ctx.restore();
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;

    if (gameState === 'PLAY') {
      let isHit = performance.now() < s.beerHitEndTime;
      if (isHit && !canvas.classList.contains('beer-hit-effect')) {
        canvas.classList.add('beer-hit-effect');
      } else if (!isHit && canvas.classList.contains('beer-hit-effect')) {
        canvas.classList.remove('beer-hit-effect');
      }
    } else {
      canvas.classList.remove('beer-hit-effect');
    }

    ctx.clearRect(0, 0, W, H);
    
    // Draw lanes
    s.lanes.forEach(lane => {
      ctx.fillStyle = lane.isSafe ? '#22c55e' : '#334155';
      ctx.fillRect(0, lane.y, W, laneHeight);

      if (!lane.isSafe) {
        ctx.fillStyle = '#cbd5e1';
        for (let i = 1; i < COLS; i++) {
          ctx.fillRect(i * colWidth - 2, lane.y + 15, 4, laneHeight - 30);
        }
      }

      // Draw obstacle
      if (lane.obstacle) {
        const img = s.images[lane.obstacle.id];
        if (img) {
          let cx = lane.obstacle.x + colWidth / 2;
          let cy = lane.y + laneHeight / 2;
          // Scale image to fit lane
          let w = colWidth * 0.9;
          let h = w * (img.height / img.width);
          ctx.drawImage(img, (cx - w/2) | 0, (cy - h/2) | 0, w, h);
        }
      }

      if (lane.beerPickupCol !== null) {
        const cx = lane.beerPickupCol * colWidth + colWidth / 2;
        const cy = lane.y + laneHeight / 2;
        const radius = colWidth * 0.14;
        const bobOffset = Math.sin((performance.now() + lane.y * 5) / 180) * 3;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
        ctx.beginPath();
        ctx.arc(cx + 1, cy + 4, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(cx, cy + bobOffset, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fde68a';
        ctx.fillRect(cx - radius * 0.85, cy - radius * 0.72 + bobOffset, radius * 1.7, radius * 0.38);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🍺', cx, cy + bobOffset + 1);
      }
    });

    drawPub(ctx);

    if (s.loaded && s.images.player) {
       let cx = s.player.col * colWidth + colWidth / 2;
       let cy = H - laneHeight * 2 + laneHeight / 2;
       let w = colWidth * 0.7;
       let h = w * (s.images.player.height / s.images.player.width);
       ctx.drawImage(s.images.player, (cx - w/2) | 0, (cy - h/2) | 0, w, h);
    }

    // --- Overlay UI (Lives, Progress Bar, Player/High Score, Distractions) ---
    if (gameState === 'PLAY') {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      
      // Top Left: Lives & All-Time High Score
      ctx.font = '24px sans-serif';
      // Max width computation for lives and high score title
      if (!s.leftBoxWidth) {
        let maxLivesText = 'Lives: 🍺🍺🍺🍺🍺';
        let allText = `All-Time High: ${highScore}`;
        s.leftBoxWidth = Math.max(ctx.measureText(maxLivesText).width, ctx.measureText(allText).width) + 20;
      }
      
      let livesText = 'Lives: ' + '🍺'.repeat(s.lives);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(8, 8, s.leftBoxWidth, 64);
      
      ctx.fillStyle = 'white';
      ctx.fillText(livesText, 14, 12);
      ctx.font = '16px sans-serif';
      ctx.fillStyle = '#fcd34d';
      ctx.fillText(`All-Time High: ${highScore}`, 14, 44);

      // Top Right: Player Name, Personal Best & Current Score
      ctx.textAlign = 'right';
      ctx.font = 'bold 20px sans-serif';
      if (!s.topBoxWidthName) {
         s.topBoxWidthName = ctx.measureText(playerName || 'Player').width;
         s.topBoxWidthPB = ctx.measureText(`PB: ${personalHighScore || 0}`).width;
      }
      let topBoxWidth = Math.max(s.topBoxWidthName, ctx.measureText(`Score: ${s.score}`).width, s.topBoxWidthPB) + 20;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(W - topBoxWidth - 10, 8, topBoxWidth, 76);
      
      ctx.fillStyle = 'white';
      ctx.fillText(playerName || 'Player', W - 20, 14);
      
      ctx.font = '16px sans-serif';
      ctx.fillStyle = '#fef08a'; // subtle yellow for PB
      ctx.fillText(`PB: ${personalHighScore || 0}`, W - 20, 40);
      
      ctx.fillStyle = '#22c55e'; // green for live score
      ctx.fillText(`Score: ${s.score}`, W - 20, 60);

      // Top Center: Progress Bar
      let currentLevel = Math.floor(s.score / 100) * 100;
      let nextLevel = currentLevel + 100;
      let progress = (s.score % 100) / 100;
      let barWidth = 100; // Reduced to prevent overlap with left/right boxes
      let barHeight = 14;
      let barX = (W - barWidth) / 2;
      let barY = 16;

      // Draw outer box for progress bar to ensure it doesn't overlap text
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(barX - 40, barY - 8, barWidth + 80, 32);

      // Progress bar background
      ctx.fillStyle = '#334155';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      // Fill
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(barX, barY, barWidth * progress, barHeight);
      // Border
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(barX, barY, barWidth, barHeight);
      
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.font = '12px sans-serif';
      ctx.fillText(currentLevel.toString(), barX - 20, barY + 1);
      ctx.fillText(nextLevel.toString(), barX + barWidth + 20, barY + 1);

      // Middle Screen Distraction when near high score
      let distToHighScore = highScore - s.score;
      if (distToHighScore > 0 && distToHighScore <= 15 && s.score > 0) {
         let time = performance.now();
         let glow = Math.sin(time / 150) * 0.5 + 0.5; // 0 to 1 oscillating
         let messages = ["DON'T F*** UP NOW!", "SO CLOSE!", "DON'T BOTTLE IT!", "NO PRESSURE!"];
         // rotate message based on time (change every ~800ms)
         let msgIndex = Math.floor(time / 800) % messages.length;
         let msg = messages[msgIndex];

         ctx.save();
         ctx.translate(W / 2, H / 2 - 50);
         let scale = 1 + glow * 0.2; // pulse size slightly
         ctx.scale(scale, scale);
         // Rotate slightly back and forth
         ctx.rotate((Math.sin(time / 200) * 0.1));

         ctx.font = '900 36px Impact, sans-serif';
         ctx.textAlign = 'center';
         ctx.textBaseline = 'middle';
         
         // Glow/shadow
         ctx.shadowColor = 'rgba(239, 68, 68, 0.8)'; // red glow
         ctx.shadowBlur = 20;

         ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + glow * 0.4})`;
         ctx.strokeStyle = `rgba(0, 0, 0, ${0.4 + glow * 0.4})`;
         ctx.lineWidth = 4;
         
         ctx.strokeText(msg, 0, 0);
         ctx.fillText(msg, 0, 0);
         
         ctx.restore();
      }
    }
  };

  const loop = (time) => {
    const s = stateRef.current;
    if (gameState !== 'PLAY') return;

    let dt = time - s.lastTime;
    s.lastTime = time;
    
    update(dt);
    draw();
    
    if (gameState === 'PLAY') {
      s.animationId = requestAnimationFrame(loop);
    }
  };

  return (
    <canvas 
      ref={canvasRef} 
      width={W} 
      height={H} 
      onPointerDown={handlePointerDown}
      style={{ cursor: 'pointer', width: '100%', height: '100%', display: 'block' }}
    />
  );
};

export default CanvasGame;
