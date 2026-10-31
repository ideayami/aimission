// キャンバスとコンテキストの初期化
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// UI要素の取得
const gameOverScreen = document.getElementById("gameOverScreen");
const gameOverTitle = document.getElementById("gameOverTitle");
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
    // ゲームオーバーまたはゲームクリア時はスペースキーでリスタートできるようにする
    if (e.code === "Space" && (isGameOver || isGameClear)) {
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
let isGameClear = false;
let gameStartTime = 0; // ゲーム開始時刻（難易度スケーリング用）

// ボス戦関連定数・変数
const BOSS_SPAWN_SCORE = 1000;
let boss = null; // ボスが存在しない場合は null

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

// 敵の出現間隔管理（初期値・ミリ秒）
const INITIAL_ENEMY_SPAWN_INTERVAL = 1000;
let lastEnemySpawnTime = 0;

/**
 * ゲームを初期状態にリセットして再開する
 */
function restartGame() {
  score = 0;
  isGameOver = false;
  isGameClear = false;
  boss = null;
  player.x = canvas.width / 2 - 16;
  player.y = canvas.height - 60;
  bullets = [];
  enemies = [];
  lastShootTime = 0;
  lastEnemySpawnTime = 0;
  gameStartTime = performance.now();
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
 * 現在のスコアや経過時間に基づいた動的な敵の出現間隔を計算する
 * スコアが上がる、または時間が経過するほど間隔が短くなり（敵が頻繁に出現）、ボス出現スコア付近で最小化する
 */
function getCurrentSpawnInterval(currentTime) {
  const elapsedSeconds = (currentTime - gameStartTime) / 1000;
  // スコアと経過時間による進行度（0.0 〜 1.0 の間で徐々に上昇）
  const progressByScore = Math.min(score / BOSS_SPAWN_SCORE, 1.0);
  const progressByTime = Math.min(elapsedSeconds / 45, 1.0); // 45秒で最大進行
  const progress = Math.max(progressByScore, progressByTime);

  // 初期値 1000ms から最小 350ms まで短縮
  const minInterval = 350;
  return INITIAL_ENEMY_SPAWN_INTERVAL - (INITIAL_ENEMY_SPAWN_INTERVAL - minInterval) * progress;
}

/**
 * 敵を生成する（ボス出現スコア未満のときのみ）
 */
function spawnEnemy(currentTime) {
  if (score >= BOSS_SPAWN_SCORE || boss !== null) return;

  const currentSpawnInterval = getCurrentSpawnInterval(currentTime);

  if (currentTime - lastEnemySpawnTime >= currentSpawnInterval) {
    const enemyWidth = 30;
    const enemyHeight = 30;
    const x = Math.random() * (canvas.width - enemyWidth);

    // 難易度スケーリングに応じた敵の速度計算（スコアや経過時間でスピードアップ）
    const elapsedSeconds = (currentTime - gameStartTime) / 1000;
    const progressByScore = Math.min(score / BOSS_SPAWN_SCORE, 1.0);
    const progressByTime = Math.min(elapsedSeconds / 45, 1.0);
    const progress = Math.max(progressByScore, progressByTime);

    // 基本スピード (2 ~ 3.5) に進行度に応じたボーナス速度 (+0 ~ +3.0) を加算
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
      direction: 1, // 1: 右向き, -1: 左向き
      hp: 30,
      maxHp: 30,
    };
    // 既存の通常の敵をクリアする
    enemies = [];
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
  gameOverTitle.textContent = "STAGE CLEAR!";
  gameOverTitle.style.color = "#66fcf1";
  finalScoreElement.textContent = score;
  gameOverScreen.classList.remove("hidden");
}

/**
 * ゲーム状態の更新
 */
function update(currentTime) {
  if (isGameOver || isGameClear) return;

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

  // ボスの移動処理（左右往復）
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
        enemies.splice(i, 1);
        bullets.splice(j, 1);
        score += 100;
        enemyDestroyed = true;
        break;
      }
    }

    if (enemyDestroyed) {
      // 撃破時にボス出現スコアに達したか確認
      spawnBoss();
      continue;
    }

    // プレイヤーと通常敵の当たり判定処理
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
        score += 20; // ボスにダメージを与えた時のスコア加算

        if (boss.hp <= 0) {
          score += 500; // ボス撃破ボーナス
          boss = null;
          triggerGameClear();
          return;
        }
      }
    }

    // プレイヤーとボスの当たり判定処理
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

  // ボスの描画
  if (boss !== null) {
    ctx.fillStyle = "#c56cf0";
    ctx.fillRect(boss.x, boss.y, boss.width, boss.height);

    // ボスのコックピット／コア装飾
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

