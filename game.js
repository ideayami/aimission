// キャンバスとコンテキストの初期化
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// UI要素の取得
const gameOverScreen = document.getElementById("gameOverScreen");
const finalScoreElement = document.getElementById("finalScore");
const restartButton = document.getElementById("restartButton");

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

// キー押下イベント
window.addEventListener("keydown", (e) => {
  if (e.code in keys) {
    // ゲームオーバー時はスペースキーでリスタートできるようにする
    if (e.code === "Space" && isGameOver) {
      e.preventDefault();
      restartGame();
      return;
    }

    keys[e.code] = true;
    // スペースキーや矢印キーでの画面スクロールを防止
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

// リスタートボタンクリックイベント
restartButton.addEventListener("click", () => {
  restartGame();
});

// ゲームの状態管理変数
let score = 0;
let isGameOver = false;

// 自機（プレイヤー）オブジェクトの初期設定
const player = {
  x: canvas.width / 2 - 16,
  y: canvas.height - 60,
  width: 32,
  height: 32,
  speed: 5,
};

// 弾と敵の配列
let bullets = [];
let enemies = [];

// 弾の発射間隔管理（ミリ秒）
const SHOOT_INTERVAL = 150;
let lastShootTime = 0;

// 敵の出現間隔管理（ミリ秒）
const ENEMY_SPAWN_INTERVAL = 1000;
let lastEnemySpawnTime = 0;

/**
 * ゲームを初期状態にリセットして再開する
 */
function restartGame() {
  score = 0;
  isGameOver = false;
  player.x = canvas.width / 2 - 16;
  player.y = canvas.height - 60;
  bullets = [];
  enemies = [];
  lastShootTime = 0;
  lastEnemySpawnTime = 0;
  gameOverScreen.classList.add("hidden");
}

/**
 * 弾を発射する
 */
function shootBullet(currentTime) {
  if (currentTime - lastShootTime >= SHOOT_INTERVAL) {
    bullets.push({
      x: player.x + player.width / 2 - 3,
      y: player.y - 10,
      width: 6,
      height: 12,
      speed: 8,
    });
    lastShootTime = currentTime;
  }
}

/**
 * 敵を生成する
 */
function spawnEnemy(currentTime) {
  if (currentTime - lastEnemySpawnTime >= ENEMY_SPAWN_INTERVAL) {
    const enemyWidth = 30;
    const enemyHeight = 30;
    const x = Math.random() * (canvas.width - enemyWidth);
    enemies.push({
      x: x,
      y: -enemyHeight,
      width: enemyWidth,
      height: enemyHeight,
      speed: 2 + Math.random() * 1.5,
    });
    lastEnemySpawnTime = currentTime;
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
  finalScoreElement.textContent = score;
  gameOverScreen.classList.remove("hidden");
}

/**
 * ゲーム状態の更新
 */
function update(currentTime) {
  if (isGameOver) return;

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

  // 画面外に出ないようにクランプ
  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));

  // スペースキー押下時の弾発射
  if (keys.Space) {
    shootBullet(currentTime);
  }

  // 弾の移動と画面外判定
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    bullet.y -= bullet.speed;
    if (bullet.y + bullet.height < 0) {
      bullets.splice(i, 1);
    }
  }

  // 敵の生成
  spawnEnemy(currentTime);

  // 敵の移動と画面外判定（敵が画面下部を通過した場合はゲームオーバー）
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    enemy.y += enemy.speed;
    if (enemy.y > canvas.height) {
      triggerGameOver();
      return;
    }
  }

  // 弾と敵の当たり判定処理
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    let enemyDestroyed = false;

    for (let j = bullets.length - 1; j >= 0; j--) {
      const bullet = bullets[j];
      if (checkCollision(enemy, bullet)) {
        // 当たった敵と弾を両方削除し、スコア加算
        enemies.splice(i, 1);
        bullets.splice(j, 1);
        score += 100;
        enemyDestroyed = true;
        break;
      }
    }

    if (enemyDestroyed) continue;

    // プレイヤーと敵の当たり判定処理
    if (checkCollision(player, enemy)) {
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

  // 自機（プレイヤー）の描画: 三角形
  ctx.fillStyle = "#66fcf1";
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

  // 弾の描画
  ctx.fillStyle = "#ffdd59";
  for (const bullet of bullets) {
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

  // スコア表示（UI）
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 16px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`SCORE: ${score}`, 16, 30);
}

/**
 * メインゲームループ
 */
function gameLoop(currentTime) {
  update(currentTime);
  draw();
  requestAnimationFrame(gameLoop);
}

// ゲーム開始
requestAnimationFrame(gameLoop);
