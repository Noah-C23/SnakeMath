(async function () {
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    const problemText = document.getElementById("problemText");
    const scoreEl = document.getElementById("score");
    const highEl = document.getElementById("highScore");
    const startBtn = document.getElementById("startBtn");
    const pauseBtn = document.getElementById("pauseBtn");
    const restartBtn = document.getElementById("topRestartBtn");
    const popup = document.getElementById("gameOverPopup");
    const popupRestart = document.getElementById("popupRestart");
    const popupBack = document.getElementById("popupBack");
    const typeSelect = document.getElementById("typeSelect");
    const difficultySelect = document.getElementById("difficultySelect");
    const speedSelect = document.getElementById("speedSelect");
    const lockBtn = document.getElementById("lockScreenBtn");
    const lockOverlay = document.getElementById("lockOverlay");

    const JSON_FILE = "math-problems-20.json";

    let GRID = 24, gridCols = 30, gridRows = 24;
    let snake = [], dir = { x: 1, y: 0 }, nextDir = { x: 1, y: 0 };
    let running = false, paused = false, score = 0;
    let highScore = parseInt(localStorage.getItem("snakeMathHigh")) || 0;
    let currentProblem = null, foodItems = [], problemsByType = [];
    let screenLocked = false;

    highEl.textContent = highScore;

    try {
        const res = await fetch(JSON_FILE);
        if (!res.ok) throw new Error("JSON not found");
        const json = await res.json();
        problemsByType = json.levels;
        startBtn.disabled = false;
    } catch (err) {
        problemText.textContent = "Error loading JSON";
        console.error(err);
        return;
    }

    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const shuffle = arr => arr.sort(() => Math.random() - 0.5);

    function layoutCanvas() {
        const w = window.innerWidth * 0.95, h = window.innerHeight * 0.6;
        if (w < 430) { gridCols = 12; gridRows = 16; }
        else if (w < 768) { gridCols = 20; gridRows = 18; }
        else { gridCols = 30; gridRows = 24; }
        GRID = Math.floor(Math.min(w / gridCols, h / gridRows));
        canvas.width = gridCols * GRID;
        canvas.height = gridRows * GRID;
    }

    function resetGame() {
        snake = [{ x: Math.floor(gridCols / 2), y: Math.floor(gridRows / 2) }];
        dir = { x: 1, y: 0 };
        nextDir = { x: 1, y: 0 };
        score = 0;
        scoreEl.textContent = score;
    }

    function pickProblem() {
        const types = typeSelect.value === "mixed"
            ? problemsByType
            : problemsByType.filter(t => t.type === typeSelect.value);
        const type = types[rand(0, types.length - 1)];
        const diffs = difficultySelect.value === "mixed"
            ? type.difficulties
            : type.difficulties.filter(d => d.difficulty === difficultySelect.value);
        const diff = diffs[rand(0, diffs.length - 1)];
        const prob = diff.problems[rand(0, diff.problems.length - 1)];
        const choices = Array.isArray(prob.choices)
            ? shuffle([...prob.choices])
            : [prob.correctAnswer];

        // ✅ NEW LINE — replaces * and / with × and ÷
        const question = prob.question.replace(/\//g, "÷").replace(/\*/g, "×");

        return { question, correctAnswer: prob.correctAnswer, choices };
    }

    function showProblem() {
        problemText.textContent = `${currentProblem.question} = ?`;
    }

    function spawnFoodForProblem() {
        const colors = ["#FFEB3B", "#39FF14", "#FF5733", "#00FFFF"];
        const occupied = new Set(snake.map(s => `${s.x},${s.y}`));
        foodItems = [];
        const vals = currentProblem.choices.slice(0, 3);
        while (vals.length < 3) {
            const extra = currentProblem.correctAnswer + (Math.random() > 0.5 ? rand(1, 3) : -rand(1, 3));
            if (!vals.includes(extra)) vals.push(extra);
        }
        shuffle(vals);
        for (let v of vals) {
            let placed = false;
            while (!placed) {
                const x = rand(0, gridCols - 1), y = rand(0, gridRows - 1);
                if (!occupied.has(`${x},${y}`)) {
                    foodItems.push({
                        x, y, value: v, isCorrect: v === currentProblem.correctAnswer,
                        color: colors[rand(0, colors.length - 1)]
                    });
                    placed = true;
                }
            }
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = "rgba(30,144,255,0.25)";
        for (let x = 0; x <= gridCols; x++) {
            ctx.beginPath();
            ctx.moveTo(x * GRID, 0);
            ctx.lineTo(x * GRID, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y <= gridRows; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * GRID);
            ctx.lineTo(canvas.width, y * GRID);
            ctx.stroke();
        }

        foodItems.forEach(f => {
            const px = f.x * GRID, py = f.y * GRID;
            ctx.beginPath();
            ctx.fillStyle = f.color;

            // ✅ UPDATED: slightly smaller food circle (was 0.45 → 0.42)
            ctx.arc(px + GRID / 2, py + GRID / 2, GRID * 0.42, 0, Math.PI * 2);

            ctx.fill();
            ctx.fillStyle = "#052d37";
            ctx.font = `bold ${Math.max(12, GRID * 0.6)}px Fredoka One`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(f.value, px + GRID / 2, py + GRID / 2);
        });

        snake.forEach((s, i) => {
            const px = s.x * GRID, py = s.y * GRID;
            ctx.fillStyle = i === 0 ? "#1E90FF" : "#0077ff";
            ctx.fillRect(px + 1, py + 1, GRID - 2, GRID - 2);
            if (i === 0) {
                ctx.fillStyle = "#fff";
                const eyeX = px + GRID * (dir.x === 1 ? 0.75 : dir.x === -1 ? 0.25 : 0.5);
                const eyeY = py + GRID * (dir.y === 1 ? 0.75 : dir.y === -1 ? 0.25 : 0.5);
                ctx.beginPath();
                ctx.arc(eyeX, eyeY, Math.max(3, GRID * 0.12), 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }

    function moveSnake() {
        if (!running || paused) return;
        if (!(nextDir.x === -dir.x && nextDir.y === -dir.y)) dir = nextDir;
        const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
        if (head.x < 0 || head.y < 0 || head.x >= gridCols || head.y >= gridRows || snake.some(s => s.x === head.x && s.y === head.y)) {
            stopGame();
            return;
        }
        snake.unshift(head);
        const foodIndex = foodItems.findIndex(f => f.x === head.x && f.y === head.y);
        if (foodIndex >= 0) {
            const eaten = foodItems.splice(foodIndex, 1)[0];
            if (eaten.isCorrect) {
                score++;
                scoreEl.textContent = score;
                currentProblem = pickProblem();
                showProblem();
                spawnFoodForProblem();
            } else stopGame();
        } else snake.pop();
        draw();
    }

    function startGame() {
        resetGame();
        currentProblem = pickProblem();
        showProblem();
        spawnFoodForProblem();
        running = true;
        paused = false;
        draw();
        clearInterval(window.tickInterval);
        window.tickInterval = setInterval(moveSnake, 1400 / parseInt(speedSelect.value));
    }

    function stopGame() {
        running = false;
        clearInterval(window.tickInterval);
        popup.classList.remove("hidden");
        document.getElementById("finalScoreText").textContent = `Final Score: ${score}`;
        if (score > highScore) {
            highScore = score;
            localStorage.setItem("snakeMathHigh", highScore);
            highEl.textContent = highScore;
        }
    }

    window.addEventListener("keydown", e => {
        const k = e.key.toLowerCase();
        if ((k === "arrowup" || k === "w") && dir.y === 0) nextDir = { x: 0, y: -1 };
        if ((k === "arrowdown" || k === "s") && dir.y === 0) nextDir = { x: 0, y: 1 };
        if ((k === "arrowleft" || k === "a") && dir.x === 0) nextDir = { x: -1, y: 0 };
        if ((k === "arrowright" || k === "d") && dir.x === 0) nextDir = { x: 1, y: 0 };
    });

    let startX = 0, startY = 0;
    canvas.addEventListener("touchstart", e => {
        const t = e.touches[0];
        startX = t.clientX;
        startY = t.clientY;
    });
    canvas.addEventListener("touchend", e => {
        const t = e.changedTouches[0];
        const dx = t.clientX - startX, dy = t.clientY - startY;
        if (Math.abs(dx) > Math.abs(dy))
            nextDir = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
        else nextDir = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
    });

    startBtn.addEventListener("click", startGame);
    pauseBtn.addEventListener("click", () => paused = !paused);
    restartBtn.addEventListener("click", startGame);
    popupRestart.addEventListener("click", () => {
        popup.classList.add("hidden");
        startGame();
    });
    popupBack.addEventListener("click", () => popup.classList.add("hidden"));
    window.addEventListener("resize", () => {
        layoutCanvas();
        draw();
    });

    // ✅ FIXED LOCK FUNCTION
    lockBtn.addEventListener("click", () => {
        screenLocked = !screenLocked;
        if (screenLocked) {
            lockOverlay.style.display = "block";
            lockBtn.textContent = "🔓 Unlock Screen";
            document.body.style.overflow = "hidden";
            document.documentElement.style.overflow = "hidden";
            window.addEventListener("touchmove", preventScroll, { passive: false });
        } else {
            lockOverlay.style.display = "none";
            lockBtn.textContent = "🔒 Lock Screen";
            document.body.style.overflow = "";
            document.documentElement.style.overflow = "";
            window.removeEventListener("touchmove", preventScroll, { passive: false });
        }
    });

    function preventScroll(e) {
        e.preventDefault();
    }

    layoutCanvas();
    resetGame();
    draw();
})();
