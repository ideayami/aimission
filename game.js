// キャンバスとコンテキストの初期化
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// UI要素の取得
const startScreen = document.getElementById("startScreen");
const startButton = document.getElementById("startButton");
const startHighScoreElement = document.getElementById("startHighScore");
const gameOverScreen = document.getElementById("gameOverScreen");
const gameOverTitle = document.getElementById("gameOverTitle");
const finalScoreElement = document.getElementById("finalScore");
const highScoreElement = document.getElementById("highScore");
const restartButton = document.getElementById("restartButton");
const pauseButton = document.getElementById("pauseButton");
const pauseScreen = document.getElementById("pauseScreen");
const resumeButton = document.getElementById("resumeButton");

// タッチ操作用UI要素の取得
const touchLeft = document.getElementById("touchLeft");
const touchRight = document.getElementById("touchRight");
const touchShoot = document.getElementById("touchShoot");

// ローカルストレージキー定義
const HIGH_SCORE_STORAGE_KEY = "space_shooter_high_score";

/**
 * ハイスコアをローカルストレージから読み込む
 */
function loadHighScore() {
  try {
    const saved = localStorage.getItem(HIGH_SCORE_STORAGE_KEY);
    return saved ? parseInt(saved, 10) || 0 : 0;
  } catch (e) {
    return 0;
  }
}

/**
 * ハイスコアをローカルストレージに保存する
 */
function saveHighScore(newScore) {
  try {
    localStorage.setItem(HIGH_SCORE_STORAGE_KEY, newScore.toString());
  } catch (e) {
    // localStorageへのアクセスエラー対策
  }
}

// ハイスコアの初期化
let highScore = loadHighScore();
if (startHighScoreElement) {
  startHighScoreElement.textContent = highScore;
}

/**
 * スコアがハイスコアを上回っていた場合に更新して保存する
 */
function updateHighScore() {
  if (score > highScore) {
    highScore = score;
    saveHighScore(highScore);
  }
  if (highScoreElement) {
    highScoreElement.textContent = highScore;
  }
  if (startHighScoreElement) {
    startHighScoreElement.textContent = highScore;
  }
}

// Web Audio APIの初期化
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

// 効果音生成関数群
function playShootSound() {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.08);
  } catch (e) {
    // Audio context errors ignored
  }
}

function playPowerUpSound() {
  if (!audioCtx) return;
  try {
    const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
    notes.forEach((freq, index) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime + index * 0.07);

      gain.gain.setValueAtTime(0, audioCtx.currentTime + index * 0.07);
      gain.gain.linearRampToValueAtTime(0.18, audioCtx.currentTime + index * 0.07 + 0.02);
      gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + index * 0.07 + 0.2);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(audioCtx.currentTime + index * 0.07);
      osc.stop(audioCtx.currentTime + index * 0.07 + 0.2);
    });
  } catch (e) {}
}

function playExplosionSound() {
  if (!audioCtx) return;
  try {
    // ホワイトノイズによる爆発音
    const bufferSize = audioCtx.sampleRate * 0.3;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(800, audioCtx.currentTime);
    filter.linearRampToValueAtTime(50, audioCtx.currentTime + 0.3);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.linearRampToTime(0.01, audioCtx.currentTime + 0.3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    noise.start();
    noise.stop(audioCtx.currentTime + 0.3);
  } catch (e) {}
}

function playHitSound() {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(120, audioCtx.currentTime);
    osc.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
    gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.25);
  } catch (e) {}
}

function playClearSound() {
  if (!audioCtx) return;
  try {
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, index) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime + index * 0.12);

      gain.gain.setValueAtTime(0, audioCtx.currentTime + index * 0.12);
      gain.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + index * 0.12 + 0.02);
      gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + index * 0.12 + 0.35);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(audioCtx.currentTime + index * 0.12);
      osc.stop(audioCtx.currentTime + index * 0.12 + 0.35);
    });
  } catch (e) {}
}

// キー入力の状態管理
const keys = {
  ArrowLeft: false,
  ArrowRight: false,
  ArrowUp: false,
  ArrowDown: false,
  KeyA: false,
  KeyD: false,
  KeyW: false,
  KeyS: false,
  Space: false,
};

// ゲームの状態管理変数
let gameStarted = false;
let isPaused = false;
let pauseStartTime = 0;
let score = 0;
let isGameOver = false;
let isGameClear = false;
let gameStartTime = 0; // ゲーム開始時刻（難易度スケーリング用）

// パワーアップ関連定数・変数
const POWER_UP_SCORE = 500;
let hasPowerUpTriggered = false;
let powerUpBannerTimer = 0; // パワーアップ演出用タイマー

// ボス戦関連定数・変数
const BOSS_SPAWN_SCORE = 1000;
let boss = null;

// 自機（プレイヤー）オブジェクトの初期設定
const player = {
  x: canvas.width / 2 - 16,
  y: canvas.height - 60,
  width: 32,
  height: 32,
  speed: 5,
};

// 弾・敵・パーティクル・背景の星の配列
let bullets = [];
let enemies = [];
let particles = [];
let stars = [];

// 星空背景の初期化
function initStars() {
  stars = [];
  for (let i = 0; i < 60; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 1,
      speed: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.7 + 0.3
    });
  }
}
initStars();

// 弾の発射間隔管理（ミリ秒）
const SHOOT_INTERVAL = 150;
let lastShootTime = 0;

// 敵の出現間隔管理（初期値・ミリ秒）
const INITIAL_ENEMY_SPAWN_INTERVAL = 1000;
let lastEnemySpawnTime = 0;

/**
 * ポーズ（一時停止）のトグル切り替え
 */
function togglePause() {
  // 未開始、ゲームオーバー、ゲームクリア時は何もしない
  if (!gameStarted || isGameOver || isGameClear) return;

  isPaused = !isPaused;

  if (isPaused) {
    pauseStartTime = performance.now();
    if (pauseScreen) pauseScreen.classList.remove("hidden");
    if (pauseButton) pauseButton.textContent = "▶";
  } else {
    // ポーズしていた期間を各タイムスタンプに加算し、再開直後に急激な生成・発射が起きるのを防ぐ
    const pauseDuration = performance.now() - pauseStartTime;
    gameStartTime += pauseDuration;
    lastShootTime += pauseDuration;
    lastEnemySpawnTime += pauseDuration;

    if (pauseScreen) pauseScreen.classList.add("hidden");
    if (pauseButton) pauseButton.textContent = "❚❚";
  }
}

// キー押下イベント
window.addEventListener("keydown", (e) => {
  // Pキーでポーズ切り替え
  if (e.code === "KeyP") {
    e.preventDefault();
    togglePause();
    return;
  }

  // ポーズ中は移動・攻撃キーなどの入力を無効化
  if (isPaused) return;

  if (e.code in keys) {
    // ゲームオーバーまたはゲームクリア時はスペースキーでリスタートできるようにする
    if (e.code === "Space" && (isGameOver || isGameClear || !gameStarted)) {
      e.preventDefault();
      if (!gameStarted) {
        startGame();
      } else {
        restartGame();
      }
      return;
    }

    keys[e.code] = true;
    if (e.code === "Space" || e.code.startsWith("Arrow")) {
      e.preventDefault();
    }
  }
});

// キー解放イベント
window.addEventListener("keyup", (e) => {
  if (e.code in keys) {
    keys[e.code] = false;
  }
});

/**
 * オン画面タッチコントロールのイベント設定
 * @param {HTMLElement} element - 対象のボタン要素
 * @param {string} keyCode - keysオブジェクトに対応するキー名
 */
function setupTouchButton(element, keyCode) {
  if (!element) return;

  const press = (e) => {
    e.preventDefault();
    initAudio();

    if (isPaused) return;

    // ゲームオーバー・ゲームクリア・未開始時のリスタート/スタート対応
    if (keyCode === "Space" && (!gameStarted || isGameOver || isGameClear)) {
      if (!gameStarted) {
        startGame();
      } else {
        restartGame();
      }
      return;
    }

    keys[keyCode] = true;
    element.classList.add("active");
  };

  const release = (e) => {
    e.preventDefault();
    keys[keyCode] = false;
    element.classList.remove("active");
  };

  // タッチイベント設定
  element.addEventListener("touchstart", press, { passive: false });
  element.addEventListener("touchend", release, { passive: false });
  element.addEventListener("touchcancel", release, { passive: false });

  // マウス操作でも確認・操作できるように設定
  element.addEventListener("mousedown", press);
  element.addEventListener("mouseup", release);
  element.addEventListener("mouseleave", release);
}

// タッチボタンの初期化
setupTouchButton(touchLeft, "ArrowLeft");
setupTouchButton(touchRight, "ArrowRight");
setupTouchButton(touchShoot, "Space");

// スタートボタンクリックイベント
startButton.addEventListener("click", () => {
  startGame();
});

// リスタートボタンクリックイベント
restartButton.addEventListener("click", () => {
  restartGame();
});

// ポーズボタンクリックイベント
if (pauseButton) {
  pauseButton.addEventListener("click", () => {
    togglePause();
  });
}

// ポーズ再開ボタンクリックイベント
if (resumeButton) {
  resumeButton.addEventListener("click", () => {
    if (isPaused) {
      togglePause();
    }
  });
}

/**
 * ゲームを開始する（初回）
 */
function startGame() {
  initAudio();
  gameStarted = true;
  isPaused = false;
  if (pauseScreen) pauseScreen.classList.add("hidden");
  if (pauseButton) pauseButton.textContent = "❚❚";
  startScreen.classList.add("hidden");
  restartGame();
}

/**
 * ゲームを初期状態にリセットして再開する
 */
function restartGame() {
  initAudio();
  score = 0;
  isGameOver = false;
  isGameClear = false;
  isPaused = false;
  hasPowerUpTriggered = false;
  powerUpBannerTimer = 0;
  boss = null;
  player.x = canvas.width / 2 - 16;
  player.y = canvas.height - 60;
  bullets = [];
  enemies = [];
  particles = [];
  lastShootTime = 0;
  lastEnemySpawnTime = 0;
  gameStartTime = performance.now();
  gameOverScreen.classList.add("hidden");
  if (pauseScreen) pauseScreen.classList.add("hidden");
  if (pauseButton) pauseButton.textContent = "❚❚";
}

/**
 * 爆発パーティクルを生成する
 */
function createExplosion(x, y, color = "#ff4757", count = 15) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3 + 1;
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: Math.random() * 3 + 2,
      color: color,
      alpha: 1.0,
      decay: Math.random() * 0.03 + 0.02
    });
  }
}

/**
 * スコア加算とパワーアップ判定
 */
function addScore(points) {
  score += points;
  if (score >= POWER_UP_SCORE && !hasPowerUpTriggered) {
    hasPowerUpTriggered = true;
    powerUpBannerTimer = 120; // 約2秒間バナー表示
    playPowerUpSound();
    createExplosion(player.x + player.width / 2, player.y + player.height / 2, "#00ffcc", 25);
  }
}

/**
 * 弾を発射する
 */
function shootBullet(currentTime) {
  if (currentTime - lastShootTime >= SHOOT_INTERVAL) {
    const isPoweredUp = score >= POWER_UP_SCORE;

    if (isPoweredUp) {
      // 3方向ワイドショット
      // 中央弾
      bullets.push({
        x: player.x + player.width / 2 - 3,
        y: player.y - 10,
        width: 6,
        height: 12,
        vx: 0,
        vy: 8,
        color: "#00ffcc"
      });
      // 左斜め弾
      bullets.push({
        x: player.x + player.width / 2 - 7,
        y: player.y - 8,
        width: 6,
        height: 10,
        vx: -2.2,
        vy: 7.5,
        color: "#00ffcc"
      });
      // 右斜め弾
      bullets.push({
        x: player.x + player.width / 2 + 1,
        y: player.y - 8,
        width: 6,
        height: 10,
        vx: 2.2,
        vy: 7.5,
        color: "#00ffcc"
      });
    } else {
      // 通常単発ショット
      bullets.push({
        x: player.x + player.width / 2 - 3,
        y: player.y - 10,
        width: 6,
        height: 12,
        vx: 0,
        vy: 8,
        color: "#ffdd59"
      });
    }

    playShootSound();
    lastShootTime = currentTime;
  }
}

/**
 * 現在のスコアや経過時間に基づいた動的な敵の出現間隔を計算する
 */
function getCurrentSpawnInterval(currentTime) {
  const elapsedSeconds = (currentTime - gameStartTime) / 1000;
  const progressByScore = Math.min(score / BOSS_SPAWN_SCORE, 1.0);
  const progressByTime = Math.min(elapsedSeconds / 45, 1.0);
  const progress = Math.max(progressByScore, progressByTime);

  const minInterval = 350;
  return INITIAL_ENEMY_SPAWN_INTERVAL - (INITIAL_ENEMY_SPAWN_INTERVAL - minInterval) * progress;
}

/**
 * 敵を生成する
 */
function spawnEnemy(currentTime) {
  if (score >= BOSS_SPAWN_SCORE || boss !== null) return;

  const currentSpawnInterval = getCurrentSpawnInterval(currentTime);

  if (currentTime - lastEnemySpawnTime >= currentSpawnInterval) {
    const enemyWidth = 30;
    const enemyHeight = 30;
    const x = Math.random() * (canvas.width - enemyWidth);

    const elapsedSeconds = (currentTime - gameStartTime) / 1000;
    const progressByScore = Math.min(score / BOSS_SPAWN_SCORE, 1.0);
    const progressByTime = Math.min(elapsedSeconds / 45, 1.0);
    const progress = Math.max(progressByScore, progressByTime);

    const baseSpeed = 2 + Math.random() * 1.5;
    const speedBonus = progress * 3.0;

    enemies.push({
      x: x,
      y: -enemyHeight,
      width: enemyWidth,
      height: enemyHeight,
      speed: baseSpeed + speedBonus,
    });
    lastEnemySpawnTime = currentTime;
  }
}

/**
 * ボスを出現させる
 */
function spawnBoss() {
  if (boss === null && score >= BOSS_SPAWN_SCORE && !isGameClear && !isGameOver) {
    boss = {
      x: canvas.width / 2 - 50,
      y: 50,
      width: 100,
      height: 50,
      speed: 2,
      direction: 1,
      hp: 30,
      maxHp: 30,
    };
    enemies = [];
    playClearSound(); // ボス登場の盛り上げに流用
  }
}

/**
 * 2つの矩形同士の当たり判定（AABB）
 */
function checkCollision(rect1, rect2) {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
}

/**
 * ゲームオーバー処理
 */
function triggerGameOver() {
  isGameOver = true;
  playHitSound();
  createExplosion(player.x + player.width / 2, player.y + player.height / 2, "#66fcf1", 30);
  updateHighScore();
  gameOverTitle.textContent = "GAME OVER";
  gameOverTitle.style.color = "#ff4757";
  finalScoreElement.textContent = score;
  gameOverScreen.classList.remove("hidden");
}

/**
 * ゲームクリア処理
 */
function triggerGameClear() {
  isGameClear = true;
  playClearSound();
  createExplosion(canvas.width / 2, 75, "#c56cf0", 50);
  updateHighScore();
  gameOverTitle.textContent = "STAGE CLEAR!";
  gameOverTitle.style.color = "#66fcf1";
  finalScoreElement.textContent = score;
  gameOverScreen.classList.remove("hidden");
}

/**
 * ゲーム状態の更新
 */
function update(currentTime) {
  if (!gameStarted || isGameOver || isGameClear || isPaused) return;

  // パワーアップバナータイマーの更新
  if (powerUpBannerTimer > 0) {
    powerUpBannerTimer--;
  }

  // 星空背景のスクロール更新
  for (const star of stars) {
    star.y += star.speed;
    if (star.y > canvas.height) {
      star.y = 0;
      star.x = Math.random() * canvas.width;
    }
  }

  // パーティクルの更新
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= p.decay;
    if (p.alpha <= 0) {
      particles.splice(i, 1);
    }
  }

  // プレイヤー移動（左右）
  if (keys.ArrowLeft || keys.KeyA) {
    player.x -= player.speed;
  }
  if (keys.ArrowRight || keys.KeyD) {
    player.x += player.speed;
  }
  // プレイヤー移動（上下）
  if (keys.ArrowUp || keys.KeyW) {
    player.y -= player.speed;
  }
  if (keys.ArrowDown || keys.KeyS) {
    player.y += player.speed;
  }

  // 画面外クランプ
  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));

  // スペースキーまたはSHOTボタン押下時の弾発射
  if (keys.Space) {
    shootBullet(currentTime);
  }

  // 弾の移動と画面外判定
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    bullet.x += bullet.vx || 0;
    bullet.y -= (bullet.vy !== undefined ? bullet.vy : 8);
    if (
      bullet.y + bullet.height < 0 ||
      bullet.x + bullet.width < 0 ||
      bullet.x > canvas.width
    ) {
      bullets.splice(i, 1);
    }
  }

  // ボス出現チェック
  spawnBoss();

  // 通常の敵の生成と移動
  spawnEnemy(currentTime);

  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    enemy.y += enemy.speed;
    if (enemy.y > canvas.height) {
      triggerGameOver();
      return;
    }
  }

  // ボスの移動処理
  if (boss !== null) {
    boss.x += boss.speed * boss.direction;
    if (boss.x <= 10) {
      boss.x = 10;
      boss.direction = 1;
    } else if (boss.x + boss.width >= canvas.width - 10) {
      boss.x = canvas.width - 10 - boss.width;
      boss.direction = -1;
    }
  }

  // 弾と通常敵の当たり判定処理
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    let enemyDestroyed = false;

    for (let j = bullets.length - 1; j >= 0; j--) {
      const bullet = bullets[j];
      if (checkCollision(enemy, bullet)) {
        createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, "#ff4757", 12);
        playExplosionSound();
        enemies.splice(i, 1);
        bullets.splice(j, 1);
        addScore(100);
        enemyDestroyed = true;
        break;
      }
    }

    if (enemyDestroyed) {
      spawnBoss();
      continue;
    }

    // プレイヤーと通常敵の当たり判定
    if (checkCollision(player, enemy)) {
      triggerGameOver();
      return;
    }
  }

  // 弾とボスの当たり判定処理
  if (boss !== null) {
    for (let j = bullets.length - 1; j >= 0; j--) {
      const bullet = bullets[j];
      if (checkCollision(boss, bullet)) {
        bullets.splice(j, 1);
        boss.hp -= 1;
        addScore(20);
        playHitSound();
        createExplosion(bullet.x, bullet.y, "#ffdd59", 5);

        if (boss.hp <= 0) {
          createExplosion(boss.x + boss.width / 2, boss.y + boss.height / 2, "#c56cf0", 40);
          addScore(500);
          boss = null;
          triggerGameClear();
          return;
        }
      }
    }

    // プレイヤーとボスの当たり判定
    if (checkCollision(player, boss)) {
      triggerGameOver();
      return;
    }
  }
}

/**
 * ゲーム画面の描画
 */
function draw() {
  // 背景クリア
  ctx.fillStyle = "#0b0c10";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 星空背景の描画
  for (const star of stars) {
    ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
    ctx.fillRect(star.x, star.y, star.size, star.size);
  }

  // パーティクルの描画
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (gameStarted) {
    // 自機（プレイヤー）の描画: 三角形
    ctx.fillStyle = score >= POWER_UP_SCORE ? "#00ffcc" : "#66fcf1";
    ctx.beginPath();
    ctx.moveTo(player.x + player.width / 2, player.y);
    ctx.lineTo(player.x, player.y + player.height);
    ctx.lineTo(player.x + player.width, player.y + player.height);
    ctx.closePath();
    ctx.fill();

    // コックピットのワンポイント装飾
    ctx.fillStyle = "#1f2833";
    ctx.beginPath();
    ctx.arc(
      player.x + player.width / 2,
      player.y + player.height * 0.6,
      player.width * 0.15,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // パワーアップ中のウィング装飾
    if (score >= POWER_UP_SCORE) {
      ctx.fillStyle = "#ffdd59";
      ctx.fillRect(player.x - 2, player.y + player.height - 8, 4, 8);
      ctx.fillRect(player.x + player.width - 2, player.y + player.height - 8, 4, 8);
    }
  }

  // 弾の描画
  for (const bullet of bullets) {
    ctx.fillStyle = bullet.color || "#ffdd59";
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
  }

  // 敵の描画: 逆三角形
  ctx.fillStyle = "#ff4757";
  for (const enemy of enemies) {
    ctx.beginPath();
    ctx.moveTo(enemy.x, enemy.y);
    ctx.lineTo(enemy.x + enemy.width, enemy.y);
    ctx.lineTo(enemy.x + enemy.width / 2, enemy.y + enemy.height);
    ctx.closePath();
    ctx.fill();
  }

  // ボスの描画
  if (boss !== null) {
    ctx.fillStyle = "#c56cf0";
    ctx.fillRect(boss.x, boss.y, boss.width, boss.height);

    ctx.fillStyle = "#ff4757";
    ctx.beginPath();
    ctx.arc(
      boss.x + boss.width / 2,
      boss.y + boss.height / 2,
      12,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // ボスHPバーの描画
    const barWidth = 120;
    const barHeight = 10;
    const barX = canvas.width / 2 - barWidth / 2;
    const barY = 15;

    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.fillRect(barX, barY, barWidth, barHeight);

    const currentBarWidth = (barWidth * boss.hp) / boss.maxHp;
    ctx.fillStyle = "#ff4757";
    ctx.fillRect(barX, barY, currentBarWidth, barHeight);

    ctx.strokeStyle = "#ffffff";
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("BOSS", canvas.width / 2, barY + barHeight + 14);
  }

  // スコア表示（UI）
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 16px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`SCORE: ${score}`, 16, 30);

  // 武器レベル表示（UI左側サブ）
  ctx.font = "bold 12px sans-serif";
  if (score >= POWER_UP_SCORE) {
    ctx.fillStyle = "#00ffcc";
    ctx.fillText("WEAPON: 3-WAY", 16, 48);
  } else {
    ctx.fillStyle = "#c5c6c7";
    ctx.fillText(`NEXT LV: ${POWER_UP_SCORE - score}`, 16, 48);
  }

  // ハイスコア表示（UI右上）
  const displayHighScore = Math.max(score, highScore);
  ctx.textAlign = "right";
  ctx.fillStyle = "#ffdd59";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText(`HIGH SCORE: ${displayHighScore}`, canvas.width - 60, 30);

  // パワーアップ達成時の通知バナー
  if (powerUpBannerTimer > 0) {
    ctx.save();
    const alpha = Math.min(1.0, powerUpBannerTimer / 30);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#00ffcc";
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("★ 3-WAY WIDE SHOT UNLOCKED! ★", canvas.width / 2, canvas.height / 2 - 40);
    ctx.restore();
  }

  // ポーズ中のキャンバス中央テキスト表示
  if (isPaused) {
    ctx.save();
    ctx.fillStyle = "rgba(11, 12, 16, 0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#66fcf1";
    ctx.font = "bold 40px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2 - 20);

    ctx.fillStyle = "#c5c6c7";
    ctx.font = "14px sans-serif";
    ctx.fillText("Pキー または ボタンを押して再開", canvas.width / 2, canvas.height / 2 + 25);
    ctx.restore();
  }
}

/**
 * メインゲームループ
 */
function gameLoop(currentTime) {
  update(currentTime);
  draw();
  requestAnimationFrame(gameLoop);
}

// ゲーム開始時のタイムスタンプ初期化
gameStartTime = performance.now();

// ゲーム開始
requestAnimationFrame(gameLoop);
