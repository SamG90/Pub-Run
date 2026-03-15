import React, { useRef, useEffect, useCallback } from 'react';
import { GAME_RULES, DIFFICULTIES, CHAOS_TIERS, getChaosTier, getActiveMechanics } from './gameRules';

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
const OFF_CENTRE_COLS = [0, 1, 3, 4];

// Difficulty-aware scaling functions
const getFovZoom = (score, diff) => {
  const level = Math.floor(score / 100);
  return 1.0 + level * diff.fovPerTier;
};

const getSpeedMultiplier = (score, diff) => {
  const level = Math.floor(score / 100);
  return 1.0 + level * diff.speedPerTier;
};

const getSpawnChance = (score, diff) => {
  const level = Math.floor(score / 100);
  return Math.min(diff.spawnRateCeiling, diff.spawnRateBase + level * diff.spawnRatePerTier);
};

const CanvasGame = ({ gameState, difficulty = 'normal', playerName, highScore, personalHighScore, onGameOver, onWin, onScoreUpdate, onDodge, onBeerHit, onBeerPickup = null, onApproachingHighScore, onApproachingLife, onTierChange }) => {
  const canvasRef = useRef(null);
  const [assetsLoaded, setAssetsLoaded] = React.useState(false);
  const diffRef = useRef(DIFFICULTIES[difficulty] || DIFFICULTIES.normal);

  // Keep diffRef in sync with prop
  useEffect(() => {
    diffRef.current = DIFFICULTIES[difficulty] || DIFFICULTIES.normal;
  }, [difficulty]);

  const stateRef = useRef({
    score: 0,
    startTime: 0,
    lanes: [],
    lastTime: 0,
    player: { col: 2 },
    lives: 3,
    images: {},
    loaded: false,
    animationId: null,
    beerHitEndTime: 0,
    // Chaos state
    currentTier: 1,
    drunkSwerveWarning: 0, // timestamp when warning started
    drunkSwervePending: 0, // timestamp when swerve will happen
    drunkSwerveDir: 0,
    blackoutActive: false,
    blackoutEnd: 0,
    blackoutNext: 0, // next time a blackout can trigger
    tierAnnouncementEnd: 0,
    tierAnnouncementText: '',
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

  const generateLane = (y, isSafe = false, score = 0) => {
    const diff = diffRef.current;
    const spawnChance = getSpawnChance(score, diff);
    const mechanics = getActiveMechanics(score, diff);
    let hasObstacle = !isSafe && Math.random() < spawnChance;
    let obstacle = null;
    let direction = Math.random() > 0.5 ? 1 : -1;
    let beerPickupCol = null;

    // Lane walls: occasionally block 3-4 lanes at once, leaving 1-2 gaps
    if (mechanics.laneWalls && !isSafe && Math.random() < 0.12) {
      return generateLaneWall(y, score);
    }

    if (hasObstacle) {
      let type = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
      const speedMult = getSpeedMultiplier(score, diff);
      const isMoving = mechanics.movingObstacles && Math.random() < 0.3;
      obstacle = {
        id: type.id,
        x: direction === 1 ? -colWidth : W + colWidth,
        speed: type.speed * direction * (0.8 + Math.random() * 0.4) * speedMult,
        // Moving obstacles drift between lanes
        drifting: isMoving,
        driftSpeed: isMoving ? (Math.random() * 1.5 + 0.5) * (Math.random() > 0.5 ? 1 : -1) : 0,
        baseY: y, // track original y for drift bounds
      };
    }

    // Beer pickup
    if (!isSafe && !hasObstacle && Math.random() < diff.beerPickupSpawnChance) {
      beerPickupCol = OFF_CENTRE_COLS[Math.floor(Math.random() * OFF_CENTRE_COLS.length)];
    }

    return { y, isSafe: isSafe || !hasObstacle, obstacle, beerPickupCol };
  };

  // Generate a lane wall: 3-4 obstacles across, leaving 1-2 gaps
  const generateLaneWall = (y, score) => {
    const diff = diffRef.current;
    const speedMult = getSpeedMultiplier(score, diff);
    const gapCount = Math.random() < 0.6 ? 1 : 2;
    const gaps = new Set();
    while (gaps.size < gapCount) {
      gaps.add(Math.floor(Math.random() * COLS));
    }

    // Create multiple obstacles in a "wall" formation
    // We'll use a single obstacle but mark lanes as blocked
    const direction = Math.random() > 0.5 ? 1 : -1;
    const type = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];

    return {
      y,
      isSafe: false,
      obstacle: {
        id: type.id,
        x: direction === 1 ? -colWidth : W + colWidth,
        speed: type.speed * direction * 0.9 * speedMult,
        isWall: true,
        gapCols: [...gaps],
      },
      beerPickupCol: null,
    };
  };

  const initGame = () => {
    const s = stateRef.current;
    const diff = diffRef.current;
    s.score = 0;
    s.startTime = Date.now();
    s.player.col = Math.floor(COLS / 2);
    s.lives = diff.startingLives;
    s.lanes = [];
    s.beerHitEndTime = 0;
    s.currentTier = 1;
    s.drunkSwerveWarning = 0;
    s.drunkSwervePending = 0;
    s.drunkSwerveDir = 0;
    s.blackoutActive = false;
    s.blackoutEnd = 0;
    s.blackoutNext = performance.now() + 5000;
    s.tierAnnouncementEnd = 0;
    s.tierAnnouncementText = '';
    // Clear cached measurements so they're recalculated
    s.leftBoxWidth = 0;
    s.topBoxWidthName = 0;
    s.topBoxWidthPB = 0;

    let currentY = H - laneHeight;
    while(currentY >= horizonY - laneHeight) {
      let isSafe = currentY >= H - laneHeight * 3;
      s.lanes.unshift(generateLane(currentY, isSafe, 0));
      currentY -= laneHeight;
    }
  };

  // ── Animated Start Screen ──────────────────────────────────────
  const initStartScreen = () => {
    const ss = startScreenRef.current;
    if (ss.initialized) return;
    ss.initialized = true;
    ss.obstacles = [];
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

    ss.groundOffset = (ss.groundOffset + 1.5) % colWidth;
    ctx.fillStyle = '#15803d';
    ctx.fillRect(0, H - laneHeight, W, laneHeight);
    ctx.fillStyle = '#166534';
    for (let gx = -colWidth + ss.groundOffset; gx < W + colWidth; gx += colWidth) {
      ctx.fillRect(gx, H - laneHeight, colWidth / 2, laneHeight);
    }

    ss.obstacles.forEach((obs) => {
      obs.x += obs.speed;
      if (obs.speed > 0 && obs.x > W + colWidth) obs.x = -colWidth;
      if (obs.speed < 0 && obs.x < -colWidth) obs.x = W + colWidth;

      const img = s.images[obs.id];
      if (img) {
        const w = colWidth * 0.85;
        const h = w * (img.height / img.width);
        ctx.drawImage(img, obs.x | 0, (obs.y + (laneHeight - h) / 2) | 0, w, h);
      }
    });

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
      if (ss.animId) { cancelAnimationFrame(ss.animId); ss.animId = null; }
      initGame();
      stateRef.current.lastTime = performance.now();
      loop(performance.now());
    } else if (gameState === 'START' || gameState === 'LEADERBOARD') {
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
    const diff = diffRef.current;
    s.score++;

    // Life gain from steps (Normal mode only)
    if (diff.lifeGainFromSteps && diff.lifeGainEverySteps > 0) {
      if (s.score > 0 && s.score % diff.lifeGainEverySteps === 0) {
        if (s.lives < diff.maxLives) s.lives++;
      }

      // Check approaching life
      if (s.score > 0 && s.score % diff.lifeGainEverySteps >= diff.lifeGainEverySteps - 5 && s.score % diff.lifeGainEverySteps < diff.lifeGainEverySteps) {
        if (onApproachingLife) onApproachingLife();
      }
    }

    // Check approaching high score
    let distToHighScore = highScore - s.score;
    if (distToHighScore > 0 && distToHighScore <= GAME_RULES.highScoreWarningDistance) {
      if (onApproachingHighScore) onApproachingHighScore();
    }

    // Check tier change
    const newTier = getChaosTier(s.score);
    if (newTier.tier !== s.currentTier) {
      s.currentTier = newTier.tier;
      s.tierAnnouncementText = newTier.name;
      s.tierAnnouncementEnd = performance.now() + 3000;
      if (onTierChange) onTierChange(newTier.tier, newTier.name);
    }

    onScoreUpdate(s.score);
    if (s.score >= GAME_RULES.targetSteps) {
      onWin((Date.now() - s.startTime) / 1000);
      return;
    }

    s.lanes.forEach(lane => lane.y += laneHeight);
    s.lanes = s.lanes.filter(lane => lane.y < H);

    let topY = s.lanes[0].y - laneHeight;
    s.lanes.unshift(generateLane(topY, false, s.score));
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
    const diff = diffRef.current;
    const mechanics = getActiveMechanics(s.score, diff);
    let pX = s.player.col * colWidth + colWidth / 2;
    const now = performance.now();

    // ── Drunk Swerve Logic ──
    if (mechanics.drunkSwerve) {
      // Trigger a random swerve every 3-6 seconds
      if (s.drunkSwervePending === 0 && s.drunkSwerveWarning === 0) {
        if (Math.random() < 0.005) { // ~0.5% per frame check
          s.drunkSwerveDir = Math.random() > 0.5 ? 1 : -1;
          s.drunkSwerveWarning = now;
          s.drunkSwervePending = now + 800; // swerve happens 800ms after warning
        }
      }
      // Execute the swerve
      if (s.drunkSwervePending > 0 && now >= s.drunkSwervePending) {
        const newCol = s.player.col + s.drunkSwerveDir;
        if (newCol >= 0 && newCol < COLS) {
          s.player.col = newCol;
        }
        s.drunkSwervePending = 0;
        s.drunkSwerveWarning = 0;
        // Update pX after swerve
        pX = s.player.col * colWidth + colWidth / 2;
      }
    }

    // ── Blackout Logic ──
    if (mechanics.blackouts) {
      if (!s.blackoutActive && now >= s.blackoutNext) {
        // Start a blackout
        s.blackoutActive = true;
        s.blackoutEnd = now + 1000 + Math.random() * 1000; // 1-2 seconds
      }
      if (s.blackoutActive && now >= s.blackoutEnd) {
        s.blackoutActive = false;
        s.blackoutNext = now + 3000 + Math.random() * 4000; // next blackout in 3-7 seconds
      }
    }

    s.lanes.forEach(lane => {
      if (lane.obstacle) {
        lane.obstacle.x += lane.obstacle.speed * (dt / 16);

        // Moving obstacles: drift vertically
        if (lane.obstacle.drifting) {
          lane.y += lane.obstacle.driftSpeed * (dt / 16);
          // Bounce within a range
          if (Math.abs(lane.y - lane.obstacle.baseY) > laneHeight * 0.4) {
            lane.obstacle.driftSpeed *= -1;
          }
        }

        if (lane.obstacle.speed > 0 && lane.obstacle.x > W + colWidth) lane.obstacle.x = -colWidth;
        if (lane.obstacle.speed < 0 && lane.obstacle.x < -colWidth) lane.obstacle.x = W + colWidth;
      }

      // Check collision
      if (Math.abs(lane.y - (H - laneHeight * 2)) < 5) {
        if (lane.beerPickupCol !== null && lane.beerPickupCol === s.player.col) {
          const gainedLife = s.lives < diff.maxLives;
          if (gainedLife) s.lives++;
          lane.beerPickupCol = null;
          if (gainedLife && onBeerPickup) onBeerPickup();
        }

        if (lane.obstacle) {
          if (lane.obstacle.isWall) {
            // Wall collision: check if player is NOT in a gap
            const inGap = lane.obstacle.gapCols.includes(s.player.col);
            // Only collide when obstacle is roughly centered on screen
            const obsCenter = lane.obstacle.x + colWidth / 2;
            const inRange = Math.abs(pX - obsCenter) < colWidth * 2;
            if (!inGap && inRange) {
              if (s.lives > 0) {
                s.lives--;
                lane.obstacle = null;
                s.beerHitEndTime = now + 5000;
                if (onBeerHit) onBeerHit();
              } else {
                onGameOver(s.score, (Date.now() - s.startTime) / 1000);
              }
            }
          } else {
            let obsX = lane.obstacle.x + colWidth / 2;
            if (Math.abs(pX - obsX) < colWidth * 0.40) {
              if (s.lives > 0) {
                s.lives--;
                lane.obstacle = null;
                s.beerHitEndTime = now + 5000;
                if (onBeerHit) onBeerHit();
              } else {
                onGameOver(s.score, (Date.now() - s.startTime) / 1000);
              }
            }
          }
        }
      }
    });
  };

  const drawPub = (ctx) => {
    const s = stateRef.current;
    ctx.fillStyle = '#skyBlue';
    if (!s.pubSkyGradient) {
      s.pubSkyGradient = ctx.createLinearGradient(0, 0, 0, horizonY);
      s.pubSkyGradient.addColorStop(0, '#0f172a');
      s.pubSkyGradient.addColorStop(1, '#87CEEB');
    }
    ctx.fillStyle = s.pubSkyGradient;
    ctx.fillRect(0, 0, W, horizonY);

    let progress = s.score / GAME_RULES.targetSteps;
    let scale = 0.4 + (progress * 1.6);

    ctx.save();
    ctx.translate(W / 2, horizonY);
    ctx.scale(scale, scale);

    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(-W, -35, W * 2, 35);

    const pubImg = s.images.pub_loading || s.images.pub;
    if (pubImg) {
        const w = 450;
        const h = w * (pubImg.height / pubImg.width);

        ctx.save();

        if (!s.pubMaskedCanvas) {
            const maskCanvas = document.createElement('canvas');
            maskCanvas.width = w;
            maskCanvas.height = h;
            const mctx = maskCanvas.getContext('2d');

            mctx.drawImage(pubImg, 0, 0, w, h);
            mctx.globalCompositeOperation = 'destination-in';

            const radGrd = mctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w/2);
            radGrd.addColorStop(0.7, 'rgba(0,0,0,1)');
            radGrd.addColorStop(1, 'rgba(0,0,0,0)');
            mctx.fillStyle = radGrd;
            mctx.fillRect(0, 0, w, h);

            const linGrd = mctx.createLinearGradient(0, 0, 0, h);
            linGrd.addColorStop(0.8, 'rgba(0,0,0,1)');
            linGrd.addColorStop(1, 'rgba(0,0,0,0)');
            mctx.fillStyle = linGrd;
            mctx.fillRect(0, 0, w, h);

            s.pubMaskedCanvas = maskCanvas;
        }

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
    const diff = diffRef.current;
    const now = performance.now();

    if (gameState === 'PLAY') {
      let isHit = now < s.beerHitEndTime;
      if (isHit && !canvas.classList.contains('beer-hit-effect')) {
        canvas.classList.add('beer-hit-effect');
      } else if (!isHit && canvas.classList.contains('beer-hit-effect')) {
        canvas.classList.remove('beer-hit-effect');
      }
    } else {
      canvas.classList.remove('beer-hit-effect');
    }

    ctx.clearRect(0, 0, W, H);

    // ── FOV zoom ──
    const fovZoom = gameState === 'PLAY' ? getFovZoom(s.score, diff) : 1.0;
    const playerCenterX = s.player.col * colWidth + colWidth / 2;
    const playerCenterY = H - laneHeight * 2 + laneHeight / 2;

    ctx.save();
    if (fovZoom > 1.0) {
      ctx.translate(playerCenterX, playerCenterY);
      ctx.scale(fovZoom, fovZoom);
      ctx.translate(-playerCenterX, -playerCenterY);
    }

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
        if (lane.obstacle.isWall) {
          // Draw wall: obstacles in every lane except gaps
          for (let c = 0; c < COLS; c++) {
            if (lane.obstacle.gapCols.includes(c)) continue;
            const img = s.images[lane.obstacle.id];
            if (img) {
              // Position each wall segment relative to the obstacle's moving x
              const segX = lane.obstacle.x + (c - 2) * colWidth;
              const cy = lane.y + laneHeight / 2;
              const w = colWidth * 0.9;
              const h = w * (img.height / img.width);
              ctx.drawImage(img, (segX - w/2 + colWidth/2) | 0, (cy - h/2) | 0, w, h);
            }
          }
        } else {
          const img = s.images[lane.obstacle.id];
          if (img) {
            let cx = lane.obstacle.x + colWidth / 2;
            let cy = lane.y + laneHeight / 2;
            let w = colWidth * 0.9;
            let h = w * (img.height / img.width);
            ctx.drawImage(img, (cx - w/2) | 0, (cy - h/2) | 0, w, h);
          }
        }
      }

      if (lane.beerPickupCol !== null) {
        const cx = lane.beerPickupCol * colWidth + colWidth / 2;
        const cy = lane.y + laneHeight / 2;
        const radius = colWidth * 0.14;
        const bobOffset = Math.sin((now + lane.y * 5) / 180) * 3;

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

    // Restore from FOV zoom
    ctx.restore();

    // ── Vignette overlay ──
    if (gameState === 'PLAY' && fovZoom > 1.0) {
      const intensity = Math.min((fovZoom - 1.0) / 0.5, 1.0);
      const vignetteGrad = ctx.createRadialGradient(W/2, H/2, W * 0.25, W/2, H/2, W * 0.7);
      vignetteGrad.addColorStop(0, 'rgba(0,0,0,0)');
      vignetteGrad.addColorStop(1, `rgba(0,0,0,${0.3 * intensity})`);
      ctx.fillStyle = vignetteGrad;
      ctx.fillRect(0, 0, W, H);
    }

    // ── Blackout overlay ──
    if (gameState === 'PLAY' && s.blackoutActive) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.92)';
      ctx.fillRect(0, 0, W, H);
      // Small circle of visibility around player
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      const grad = ctx.createRadialGradient(playerCenterX, playerCenterY, 0, playerCenterX, playerCenterY, colWidth * 1.2);
      grad.addColorStop(0, 'rgba(0,0,0,0.6)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // ── Drunk swerve warning flash ──
    if (gameState === 'PLAY' && s.drunkSwerveWarning > 0 && now < s.drunkSwervePending) {
      const flash = Math.sin(now / 80) * 0.5 + 0.5;
      // Flash arrow showing swerve direction
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 40px sans-serif';
      ctx.fillStyle = `rgba(255, 200, 0, ${0.5 + flash * 0.5})`;
      const arrow = s.drunkSwerveDir < 0 ? '⬅️' : '➡️';
      ctx.fillText(arrow, W / 2, H / 2 - 80);
      ctx.font = 'bold 18px sans-serif';
      ctx.fillStyle = `rgba(255, 200, 0, ${0.6 + flash * 0.4})`;
      ctx.fillText('SWERVING!', W / 2, H / 2 - 45);
      ctx.restore();
    }

    // --- Overlay UI ---
    if (gameState === 'PLAY') {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      // Top Left: Lives & All-Time High Score
      ctx.font = '24px sans-serif';
      if (!s.leftBoxWidth) {
        let maxLivesText = 'Lives: ' + '🍺'.repeat(diff.maxLives);
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
      ctx.fillStyle = '#fef08a';
      ctx.fillText(`PB: ${personalHighScore || 0}`, W - 20, 40);

      ctx.fillStyle = '#22c55e';
      ctx.fillText(`Score: ${s.score}`, W - 20, 60);

      // Top Center: Progress Bar
      let currentLevel = Math.floor(s.score / 100) * 100;
      let nextLevel = currentLevel + 100;
      let progress = (s.score % 100) / 100;
      let barWidth = 100;
      let barHeight = 14;
      let barX = (W - barWidth) / 2;
      let barY = 16;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(barX - 40, barY - 8, barWidth + 80, 32);

      ctx.fillStyle = '#334155';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(barX, barY, barWidth * progress, barHeight);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(barX, barY, barWidth, barHeight);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.font = '12px sans-serif';
      ctx.fillText(currentLevel.toString(), barX - 20, barY + 1);
      ctx.fillText(nextLevel.toString(), barX + barWidth + 20, barY + 1);

      // FOV warning at milestones
      const level = Math.floor(s.score / 100);
      if (level > 0 && s.score % 100 < 15) {
        const fadeAlpha = 1 - (s.score % 100) / 15;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillStyle = `rgba(239, 68, 68, ${fadeAlpha})`;
        ctx.fillText('👁️ VISION NARROWING 👁️', W / 2, barY + 42);
        ctx.restore();
      }

      // ── Tier Announcement ──
      if (now < s.tierAnnouncementEnd) {
        const elapsed = 3000 - (s.tierAnnouncementEnd - now);
        const fadeIn = Math.min(elapsed / 300, 1);
        const fadeOut = Math.min((s.tierAnnouncementEnd - now) / 500, 1);
        const alpha = Math.min(fadeIn, fadeOut);
        const pulse = 1 + Math.sin(elapsed / 150) * 0.05;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.translate(W / 2, H * 0.35);
        ctx.scale(pulse, pulse);

        ctx.font = '900 28px Impact, sans-serif';
        ctx.shadowColor = 'rgba(251, 191, 36, 0.8)';
        ctx.shadowBlur = 20;
        ctx.fillStyle = `rgba(251, 191, 36, ${alpha})`;
        ctx.strokeStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.lineWidth = 3;
        ctx.strokeText(`⚡ ${s.tierAnnouncementText.toUpperCase()} ⚡`, 0, 0);
        ctx.fillText(`⚡ ${s.tierAnnouncementText.toUpperCase()} ⚡`, 0, 0);

        ctx.restore();
      }

      // Difficulty badge in-game
      if (diff.id === 'hard') {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
        ctx.fillText('💀 HARD MODE', W / 2, H - 12);
        ctx.restore();
      }

      // Middle Screen Distraction when near high score
      let distToHighScore = highScore - s.score;
      if (distToHighScore > 0 && distToHighScore <= GAME_RULES.highScoreWarningDistance && s.score > 0) {
         let glow = Math.sin(now / 150) * 0.5 + 0.5;
         let messages = ["DON'T F*** UP NOW!", "SO CLOSE!", "DON'T BOTTLE IT!", "NO PRESSURE!"];
         let msgIndex = Math.floor(now / 800) % messages.length;
         let msg = messages[msgIndex];

         ctx.save();
         ctx.translate(W / 2, H / 2 - 50);
         let scale = 1 + glow * 0.2;
         ctx.scale(scale, scale);
         ctx.rotate((Math.sin(now / 200) * 0.1));

         ctx.font = '900 36px Impact, sans-serif';
         ctx.textAlign = 'center';
         ctx.textBaseline = 'middle';

         ctx.shadowColor = 'rgba(239, 68, 68, 0.8)';
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
