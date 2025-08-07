(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const timerFill = document.getElementById('timerFill');
  const leftBtn = document.getElementById('leftBtn');
  const rightBtn = document.getElementById('rightBtn');
  const gameOverOverlay = document.getElementById('gameOver');
  const finalScoreEl = document.getElementById('finalScore');
  const restartBtn = document.getElementById('restartBtn');

  const MAX_TIME = 3000; // milliseconds per turn
  const HOLD_SPACING = 120; // pixels between holds
  const SCROLL_DURATION = 400; // ms to scroll between holds
  const FRAME_RATE = 24; // frames per second for sprite animations

  // Image assets
  const imageFiles = {
    sprite: 'sprite.png',
    skyDay: 'sky_day.png',
    mountainsDay: 'mountains_day.png',
    treelineDay: 'treeline_day.png',
    rockEdge: 'rock_edge.png',
    skyNight: 'sky_night.png',
    mountainsNight: 'mountains_night.png',
    treelineNight: 'treeline_night.png'
  };
  const images = {};
  let imagesToLoad = Object.keys(imageFiles).length;
  let spriteSheet;
  let frameWidth, frameHeight;
  let framesPerRow = 24;

  // Game state variables
  let holds = [];
  let scrollOffset = 0;
  let scrollTarget = 0;
  let scrolling = false;
  let scrollSpeed = 0;

  let timeLeft = MAX_TIME;
  let score = 0;
  let gameOver = false;
  let ready = true;
  let isDay = true;

  // Animation control
  let animRow = 0;
  let animFrame = 0;
  let animQueue = [];
  let animTimeAcc = 0;
  const frameDuration = 1000 / FRAME_RATE;
  let flip = false;

  // Utility: round rectangle drawing
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
  }

  // Hold generator
  const holdTypes = ['small', 'medium', 'large', 'rounded'];
  function createHold() {
    const side = Math.random() < 0.5 ? 'left' : 'right';
    const type = holdTypes[Math.floor(Math.random() * holdTypes.length)];
    let w, h, shape, color;
    switch (type) {
      case 'small':
        w = 40;
        h = 40;
        shape = 'circle';
        color = '#cda66e';
        break;
      case 'medium':
        w = 60;
        h = 30;
        shape = 'rounded';
        color = '#b59569';
        break;
      case 'large':
        w = 80;
        h = 40;
        shape = 'rounded';
        color = '#a88250';
        break;
      default:
        // rounded
        w = 50;
        h = 50;
        shape = 'circle';
        color = '#ba9771';
        break;
    }
    return { side, type, shape, w, h, color };
  }

  // Load all images then set up game
  function loadImages() {
    Object.entries(imageFiles).forEach(([key, file]) => {
      const img = new Image();
      img.src = file;
      img.onload = () => {
        images[key] = img;
        imagesToLoad--;
        if (imagesToLoad === 0) {
          spriteSheet = images.sprite;
          // Determine frame grid dynamically based on sprite sheet dimensions.
          const rows = 5;
          frameHeight = spriteSheet.height / rows;
          // Frames are square; compute how many columns fit horizontally
          const cols = Math.floor(spriteSheet.width / frameHeight);
          framesPerRow = cols;
          frameWidth = spriteSheet.width / cols;
          // default to day theme on load
          isDay = true;
          initGame();
          lastTime = performance.now();
          requestAnimationFrame(gameLoop);
        }
      };
    });
  }

  // Initialize game state
  function initGame() {
    scrollOffset = 0;
    scrollTarget = 0;
    scrolling = false;
    timeLeft = MAX_TIME;
    score = 0;
    gameOver = false;
    ready = true;
    animRow = 0;
    animFrame = 0;
    animQueue = [];
    animTimeAcc = 0;
    flip = false;
    updateScore();
    timerFill.style.width = '100%';
    // generate holds
    holds = [];
    const numHolds = Math.ceil(canvas.height / HOLD_SPACING) + 2;
    for (let i = 0; i < numHolds; i++) {
      holds.push(createHold());
    }
  }

  // Update score display
  function updateScore() {
    scoreEl.textContent = score;
  }

  // Input handling
  function handleMove(side) {
    if (!ready || gameOver || scrolling) return;
    const bottomHold = holds[holds.length - 1];
    // wrong choice triggers fall
    if (bottomHold.side !== side) {
      // start fall animation sequence
      ready = false;
      animQueue = [3, 4];
      animRow = animQueue.shift();
      animFrame = 0;
      flip = side === 'right';
      timeLeft = MAX_TIME;
    } else {
      // correct choice, climb
      ready = false;
      score += 1;
      updateScore();
      flip = side === 'right';
      animQueue = [1, 2];
      animRow = animQueue.shift();
      animFrame = 0;
      timeLeft = MAX_TIME;
    }
  }

  // Toggle day/night view
  function toggleDayNight() {
    isDay = !isDay;
  }

  // Show game over overlay
  function showGameOver() {
    finalScoreEl.textContent = score;
    gameOverOverlay.classList.remove('hidden');
  }

  // Main game loop
  let lastTime = 0;
  function gameLoop(now) {
    const dt = now - lastTime;
    lastTime = now;
    update(dt);
    draw();
    requestAnimationFrame(gameLoop);
  }

  // Update game logic
  function update(dt) {
    if (gameOver) return;
    // countdown timer while waiting for input
    if (ready && !scrolling) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        // timer expired, start fall
        ready = false;
        animQueue = [3, 4];
        animRow = animQueue.shift();
        animFrame = 0;
        flip = false;
        timeLeft = MAX_TIME;
      }
    }
    // update timer bar
    const t = Math.max(0, timeLeft) / MAX_TIME;
    timerFill.style.width = (t * 100).toFixed(1) + '%';

    // update animation frames
    animTimeAcc += dt;
    if (animTimeAcc > frameDuration) {
      animTimeAcc -= frameDuration;
      animFrame++;
      if (animFrame >= framesPerRow) {
        const finishedRow = animRow;
        // decide next row in queue or return to idle
        if (animQueue.length > 0) {
          animRow = animQueue.shift();
          animFrame = 0;
        } else {
          // returning to idle
          animRow = 0;
          animFrame = 0;
          ready = true;
        }
        // handle end-of-row callbacks
        if (finishedRow === 2) {
          // finished pulling up: begin scrolling and add new hold
          scrolling = true;
          scrollTarget += HOLD_SPACING;
          scrollSpeed = HOLD_SPACING / SCROLL_DURATION;
        }
        if (finishedRow === 4) {
          // fall animation finished -> game over
          gameOver = true;
          showGameOver();
        }
      }
    }
    // update scrolling
    if (scrolling) {
      const distance = scrollSpeed * dt;
      scrollOffset += distance;
      if (scrollOffset >= scrollTarget) {
        // complete one hold spacing scroll
        scrollOffset -= HOLD_SPACING;
        scrollTarget -= HOLD_SPACING;
        scrolling = false;
        // shift holds array
        holds.pop();
        holds.unshift(createHold());
      }
    }
  }

  // Draw all elements
  function draw() {
    // clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // draw parallax background layers
    const layers = isDay
      ? [images.skyDay, images.mountainsDay, images.treelineDay, images.rockEdge]
      : [images.skyNight, images.mountainsNight, images.treelineNight, images.rockEdge];
    const ratios = [0.3, 0.6, 0.8, 1.0];
    for (let i = 0; i < layers.length; i++) {
      const img = layers[i];
      if (!img) continue;
      const ratio = ratios[i];
      // Scale each layer to canvas size and tile vertically
      const destW = canvas.width;
      const destH = canvas.height;
      let offsetY = -((scrollOffset) * ratio);
      offsetY = offsetY % destH;
      if (offsetY > 0) offsetY -= destH;
      // Draw two tiles to cover the canvas vertically
      ctx.drawImage(
        img,
        0,
        0,
        img.width,
        img.height,
        0,
        offsetY,
        destW,
        destH
      );
      ctx.drawImage(
        img,
        0,
        0,
        img.width,
        img.height,
        0,
        offsetY + destH,
        destW,
        destH
      );
    }
    // draw holds
    const centerLeft = canvas.width * 0.25;
    const centerRight = canvas.width * 0.75;
    for (let i = 0; i < holds.length; i++) {
      const hold = holds[i];
      const y = i * HOLD_SPACING - HOLD_SPACING + scrollOffset;
      // skip if not visible
      if (y + hold.h < -10 || y > canvas.height + 10) continue;
      const xCenter = hold.side === 'left' ? centerLeft : centerRight;
      const x = xCenter - hold.w / 2;
      ctx.fillStyle = hold.color;
      if (hold.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(x + hold.w / 2, y + hold.h / 2, hold.w / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        roundRect(ctx, x, y, hold.w, hold.h, 10);
      }
    }
    // draw climber character
    if (spriteSheet && frameWidth && frameHeight) {
      const sx = animFrame * frameWidth;
      const sy = animRow * frameHeight;
      const charW = 80;
      const charH = 200;
      const charX = canvas.width / 2 - charW / 2;
      const charY = canvas.height - charH - 80;
      ctx.save();
      if (flip) {
        // mirror horizontally around character center
        ctx.translate(charX + charW / 2, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(
          spriteSheet,
          sx,
          sy,
          frameWidth,
          frameHeight,
          -charW / 2,
          charY,
          charW,
          charH
        );
      } else {
        ctx.drawImage(
          spriteSheet,
          sx,
          sy,
          frameWidth,
          frameHeight,
          charX,
          charY,
          charW,
          charH
        );
      }
      ctx.restore();
    }
  }

  // Event listeners
  leftBtn.addEventListener('click', () => handleMove('left'));
  rightBtn.addEventListener('click', () => handleMove('right'));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') {
      handleMove('left');
    } else if (e.key === 'ArrowRight' || e.key === 'd') {
      handleMove('right');
    } else if (e.key === 't' || e.key === 'T') {
      toggleDayNight();
    }
  });
  restartBtn.addEventListener('click', () => {
    gameOverOverlay.classList.add('hidden');
    initGame();
  });

  // Start loading assets
  loadImages();
})();
