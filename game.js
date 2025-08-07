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

  // Gameplay constants
  const MAX_TIME = 3000;     // milliseconds for timer
  const HOLD_SPACING = 120;  // vertical distance between holds
  const SCROLL_DURATION = 400; // ms to scroll to next hold

  // Game state
  let holds = [];
  let scrollOffset = 0;
  let scrollRemaining = 0;
  let scrollSpeed = 0;
  let timeLeft = MAX_TIME;
  let score = 0;
  let gameOver = false;
  let ready = true;
  let isDay = true;

  // Arm animation state (0 = down, 1 = fully raised)
  let leftArmProgress = 0;
  let rightArmProgress = 0;
  let leftArmTarget = 0;
  let rightArmTarget = 0;

  // Random hold generator
  const holdTypes = ['small', 'medium', 'large', 'rounded'];
  function createHold() {
    const side = Math.random() < 0.5 ? 'left' : 'right';
    const type = holdTypes[Math.floor(Math.random() * holdTypes.length)];
    let w, h, shape, color;
    switch (type) {
      case 'small':
        w = 40; h = 40; shape = 'circle'; color = '#d1b182'; break;
      case 'medium':
        w = 60; h = 30; shape = 'rounded'; color = '#bfa98b'; break;
      case 'large':
        w = 80; h = 40; shape = 'rounded'; color = '#9e8868'; break;
      default: // rounded
        w = 50; h = 50; shape = 'circle'; color = '#c5a377'; break;
    }
    return { side, w, h, shape, color };
  }

  // Initialize/reset game state
  function initGame() {
    scrollOffset = 0;
    scrollRemaining = 0;
    scrollSpeed = 0;
    timeLeft = MAX_TIME;
    score = 0;
    gameOver = false;
    ready = true;
    leftArmProgress = 0;
    rightArmProgress = 0;
    leftArmTarget = 0;
    rightArmTarget = 0;
    updateScore();
    timerFill.style.width = '100%';
    holds = [];
    const count = Math.ceil(canvas.height / HOLD_SPACING) + 2;
    for (let i = 0; i < count; i++) {
      holds.push(createHold());
    }
  }

  // Update score display
  function updateScore() {
    scoreEl.textContent = score;
  }

  // Handle player input
  function handleMove(side) {
    // Ignore if not ready or currently scrolling
    if (!ready || gameOver || scrollRemaining > 0) return;
    const bottomHold = holds[holds.length - 1];
    if (bottomHold.side !== side) {
      // Wrong side -> game over
      gameOver = true;
      finalScoreEl.textContent = score;
      gameOverOverlay.classList.remove('hidden');
      return;
    }
    // Correct side -> begin move
    score++;
    updateScore();
    timeLeft = MAX_TIME;
    ready = false;
    scrollRemaining = HOLD_SPACING;
    scrollSpeed = HOLD_SPACING / SCROLL_DURATION;
    if (side === 'left') {
      leftArmTarget = 1;
      rightArmTarget = 0;
    } else {
      rightArmTarget = 1;
      leftArmTarget = 0;
    }
  }

  // Toggle day/night backgrounds
  function toggleDayNight() {
    isDay = !isDay;
  }

  // Game loop timing
  let lastTime = performance.now();
  function gameLoop(now) {
    const dt = now - lastTime;
    lastTime = now;
    update(dt);
    draw();
    if (!gameOver) requestAnimationFrame(gameLoop);
  }

  // Update timers, arm animations, and scrolling
  function update(dt) {
    // Timer countdown
    if (ready && scrollRemaining === 0 && !gameOver) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        gameOver = true;
        finalScoreEl.textContent = score;
        gameOverOverlay.classList.remove('hidden');
        return;
      }
    }
    // Smoothly animate arms
    const armSpeed = dt / 200; // controls raise/lower speed
    leftArmProgress += (leftArmTarget - leftArmProgress) * Math.min(1, armSpeed);
    rightArmProgress += (rightArmTarget - rightArmProgress) * Math.min(1, armSpeed);
    // Scroll the holds and generate new ones as needed
    if (scrollRemaining > 0) {
      const dist = Math.min(scrollRemaining, scrollSpeed * dt);
      scrollOffset += dist;
      scrollRemaining -= dist;
      if (scrollRemaining <= 0) {
        scrollOffset = 0;
        holds.pop();
        holds.unshift(createHold());
        leftArmTarget = 0;
        rightArmTarget = 0;
        ready = true;
      }
    }
    // Update timer bar width
    timerFill.style.width = Math.max(0, timeLeft) / MAX_TIME * 100 + '%';
  }

  // Draw the climber with detailed vector shapes and animated arms
  function drawClimber() {
    // Dimensions for body parts
    const torsoW = 50;
    const torsoH = 70;
    const headSize = 40;
    const legW = 16;
    const legH = 50;
    const armW = 12;
    const armH = 50;
    // Positioning
    const charX = canvas.width / 2 - torsoW / 2;
    const baseY = canvas.height - 120; // base (foot) height
    const torsoY = baseY - legH - torsoH;

    // Legs
    ctx.fillStyle = '#3e444d';
    ctx.fillRect(charX + 6, baseY - legH, legW, legH);
    ctx.fillRect(charX + torsoW - legW - 6, baseY - legH, legW, legH);

    // Rope
    ctx.strokeStyle = '#f47a30';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(charX + torsoW / 2, baseY);
    ctx.lineTo(charX + torsoW / 2, canvas.height);
    ctx.stroke();

    // Belt and harness loop
    ctx.fillStyle = '#f7bf4f';
    ctx.fillRect(charX, torsoY + torsoH - 12, torsoW, 12);
    ctx.fillStyle = '#f47a30';
    ctx.beginPath();
    const loopCenterX = charX + torsoW / 2;
    const loopCenterY = torsoY + torsoH + 9;
    ctx.ellipse(loopCenterX, loopCenterY, 8, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Torso
    ctx.fillStyle = '#2f6f99';
    ctx.fillRect(charX, torsoY, torsoW, torsoH);

    // Head
    const headX = charX + torsoW / 2 - headSize / 2;
    const headY = torsoY - headSize + 6;
    ctx.fillStyle = '#f7bf85';
    ctx.beginPath();
    ctx.arc(headX + headSize / 2, headY + headSize / 2, headSize / 2, 0, Math.PI * 2);
    ctx.fill();
    // Hair
    ctx.fillStyle = '#5a3d2c';
    ctx.beginPath();
    ctx.ellipse(
      headX + headSize / 2,
      headY + headSize / 3,
      headSize / 2.5,
      headSize / 2.5,
      0,
      Math.PI,
      Math.PI * 2
    );
    ctx.fill();

    // Shoulders
    const shoulderY = torsoY + 10;
    const leftShoulderX = charX - armW;
    const rightShoulderX = charX + torsoW;

    // Arms with animated vertical offset based on armProgress
    const leftArmTopY = shoulderY - leftArmProgress * HOLD_SPACING;
    const rightArmTopY = shoulderY - rightArmProgress * HOLD_SPACING;
    ctx.fillStyle = '#f7bf85';
    ctx.fillRect(leftShoulderX, leftArmTopY, armW, armH);
    ctx.fillRect(rightShoulderX, rightArmTopY, armW, armH);

    // Hands
    const handSize = 14;
    ctx.beginPath();
    ctx.arc(leftShoulderX + armW / 2, leftArmTopY - handSize / 2, handSize / 2, 0, Math.PI * 2);
    ctx.arc(rightShoulderX + armW / 2, rightArmTopY - handSize / 2, handSize / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw the entire scene
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background gradient: day vs night
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    if (isDay) {
      grad.addColorStop(0, '#bfe9ff');
      grad.addColorStop(1, '#e6f6ff');
    } else {
      grad.addColorStop(0, '#0a1931');
      grad.addColorStop(1, '#0c2340');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Rock wall edge on the right
    ctx.fillStyle = '#bfa98b';
    ctx.fillRect(canvas.width - 80, 0, 80, canvas.height);

    // Draw holds
    const leftX = canvas.width * 0.25;
    const rightX = canvas.width * 0.75;
    for (let i = 0; i < holds.length; i++) {
      const hold = holds[i];
      const y = i * HOLD_SPACING - HOLD_SPACING + scrollOffset;
      if (y + hold.h < -10 || y > canvas.height + 10) continue;
      const cx = hold.side === 'left' ? leftX : rightX;
      const x = cx - hold.w / 2;
      ctx.fillStyle = hold.color;
      if (hold.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(x + hold.w / 2, y + hold.h / 2, hold.w / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Rounded rectangle
        const r = 8;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + hold.w - r, y);
        ctx.quadraticCurveTo(x + hold.w, y, x + hold.w, y + r);
        ctx.lineTo(x + hold.w, y + hold.h - r);
        ctx.quadraticCurveTo(x + hold.w, y + hold.h, x + hold.w - r, y + hold.h);
        ctx.lineTo(x + r, y + hold.h);
        ctx.quadraticCurveTo(x, y + hold.h, x, y + hold.h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Draw the climber
    drawClimber();
  }

  // Event listeners for controls
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
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
  });

  // Start the game
  initGame();
  requestAnimationFrame(gameLoop);
})();
