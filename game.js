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

  const MAX_TIME = 3000;
  const HOLD_SPACING = 120;
  const SCROLL_DURATION = 400;
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

  const holdTypes = ['small', 'medium', 'large', 'rounded'];
  function createHold() {
    const side = Math.random() < 0.5 ? 'left' : 'right';
    const type = holdTypes[Math.floor(Math.random() * holdTypes.length)];
    let w, h, shape, color;
    switch (type) {
      case 'small':
        w = 40; h = 40; shape = 'circle'; color = '#cda66e'; break;
      case 'medium':
        w = 60; h = 30; shape = 'rounded'; color = '#b59569'; break;
      case 'large':
        w = 80; h = 40; shape = 'rounded'; color = '#a88250'; break;
      default:
        w = 50; h = 50; shape = 'circle'; color = '#ba9771'; break;
    }
    return { side, shape, w, h, color };
  }

  function initGame() {
    scrollOffset = 0;
    scrollTarget = 0;
    scrolling = false;
    timeLeft = MAX_TIME;
    score = 0;
    gameOver = false;
    ready = true;
    updateScore();
    timerFill.style.width = '100%';
    holds = [];
    const numHolds = Math.ceil(canvas.height / HOLD_SPACING) + 2;
    for (let i = 0; i < numHolds; i++) holds.push(createHold());
  }

  function updateScore() {
    scoreEl.textContent = score;
  }

  function handleMove(side) {
    if (!ready || gameOver || scrolling) return;
    const bottomHold = holds[holds.length - 1];
    if (bottomHold.side !== side) {
      ready = false;
      gameOver = true;
      finalScoreEl.textContent = score;
      gameOverOverlay.classList.remove('hidden');
    } else {
      ready = false;
      score += 1;
      updateScore();
      timeLeft = MAX_TIME;
      scrollTarget += HOLD_SPACING;
      scrollSpeed = HOLD_SPACING / SCROLL_DURATION;
      scrolling = true;
    }
  }

  function toggleDayNight() { isDay = !isDay; }

  let lastTime = performance.now();
  function gameLoop(now) {
    const dt = now - lastTime;
    lastTime = now;
    update(dt);
    draw();
    if (!gameOver) requestAnimationFrame(gameLoop);
  }

  function update(dt) {
    if (gameOver) return;
    if (!scrolling) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        ready = false;
        gameOver = true;
        finalScoreEl.textContent = score;
        gameOverOverlay.classList.remove('hidden');
      }
    }
    timerFill.style.width = Math.max(0, timeLeft) / MAX_TIME * 100 + '%';
    if (scrolling) {
      const distance = scrollSpeed * dt;
      scrollOffset += distance;
      if (scrollOffset >= scrollTarget) {
        scrollOffset -= HOLD_SPACING;
        scrollTarget -= HOLD_SPACING;
        scrolling = false;
        ready = true;
        holds.pop();
        holds.unshift(createHold());
      }
    }
  }

  // helper for drawing rounded rectangles
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

  function draw() {
    // simple gradient background and rock edge
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    if (isDay) {
      grad.addColorStop(0, '#bfe9ff');
      grad.addColorStop(1, '#e6f6ff');
    } else {
      grad.addColorStop(0, '#00223d');
      grad.addColorStop(1, '#00172b');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // rock wall edge on the right
    ctx.fillStyle = '#bfa98b';
    ctx.fillRect(canvas.width - 60, 0, 60, canvas.height);

    // holds
    const centerLeft = canvas.width * 0.25;
    const centerRight = canvas.width * 0.75;
    for (let i = 0; i < holds.length; i++) {
      const hold = holds[i];
      const y = i * HOLD_SPACING - HOLD_SPACING + scrollOffset;
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

    // draw climber body as a simple rectangle and rope
    const charW = 40, charH = 80;
    const charX = canvas.width / 2 - charW / 2;
    const charY = canvas.height - charH - 80;
    ctx.fillStyle = '#2f6f99';
    ctx.fillRect(charX, charY, charW, charH);

    ctx.strokeStyle = '#f47a30';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(charX + charW / 2, charY + charH);
    ctx.lineTo(charX + charW / 2, charY + charH + 150);
    ctx.stroke();
  }

  // input handling
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

  initGame();
  requestAnimationFrame(gameLoop);
})();
