(async function () {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const problemText = document.getElementById('problemText');
    const scoreEl = document.getElementById('score');
    const highEl = document.getElementById('highScore');
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const topRestartBtn = document.getElementById('topRestartBtn');
    const popup = document.getElementById('gameOverPopup');
    const finalScoreText = document.getElementById('finalScoreText');
    const popupRestart = document.getElementById('popupRestart');
    const popupBack = document.getElementById('popupBack');
    const typeSelect = document.getElementById('typeSelect');
    const difficultySelect = document.getElementById('difficultySelect');
    const speedSelect = document.getElementById('speedSelect');

    const JSON_FILE = 'math-problems-20.json';
    let GRID = 24, gridCols = 30, gridRows = 24, FPS = parseInt(speedSelect.value);
    let tickInterval = null;
    let problemsByType = [], selectedType = 'mixed', selectedDifficulty = 'mixed', currentProblem = null;
    let snake = [], dir = { x: 1, y: 0 }, nextDir = { x: 1, y: 0 };
    let foodItems = [], score = 0, highScore = parseInt(localStorage.getItem('snakeMathHigh')) || 0;
    let running = false, paused = false;

    highEl.textContent = highScore;

    try {
        const r = await fetch(JSON_FILE);
        if (!r.ok) throw new Error('JSON not found');
        const json = await r.json();
        problemsByType = json.levels;
        startBtn.disabled = false;
    } catch (e) { problemText.textContent = 'Error loading JSON'; console.error(e); return; }

    function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
    function shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = rand(0, i);[arr[i], arr[j]] = [arr[j], arr[i]] } return arr; }

    function pickProblem() {
        let types = selectedType === 'mixed' ? problemsByType : problemsByType.filter(t => t.type === selectedType);
        const type = types[rand(0, types.length - 1)];
        let diffs = selectedDifficulty === 'mixed' ? type.difficulties : type.difficulties.filter(d => d.difficulty === selectedDifficulty);
        const diff = diffs[rand(0, diffs.length - 1)];
        const prob = diff.problems[rand(0, diff.problems.length - 1)];
        const choices = Array.isArray(prob.choices) ? [...prob.choices] : [prob.correctAnswer];
        return { question: prob.question, correctAnswer: prob.correctAnswer, choices: shuffle(choices) };
    }

    function layoutCanvas() {
        const w = window.innerWidth * 0.95, h = window.innerHeight * 0.6;
        if (w < 430) { gridCols = 12; gridRows = 16; }
        else if (w < 768) { gridCols = 20; gridRows = 18; }
        else { gridCols = 30; gridRows = 24; }
        GRID = Math.floor(Math.min(w / gridCols, h / gridRows));
        canvas.width = gridCols * GRID; canvas.height = gridRows * GRID;
    }

    function resetState() {
        snake = [{ x: Math.floor(gridCols / 2), y: Math.floor(gridRows / 2) }];
        dir = { x: 1, y: 0 }; nextDir = { x: 1, y: 0 };
        score = 0; scoreEl.textContent = score; running = false; paused = false;
    }

    function startGame() {
        selectedType = typeSelect.value;
        selectedDifficulty = difficultySelect.value;
        FPS = parseInt(speedSelect.value);
        resetState();
        currentProblem = pickProblem();
        showProblem();
        spawnFoodForProblem();
        running = true;
        if (tickInterval) clearInterval(tickInterval);
        tickInterval = setInterval(gameTick, 1000 / FPS);
        startBtn.disabled = true; pauseBtn.disabled = false; topRestartBtn.disabled = false;
        draw();
    }

    function pauseResume() { if (!running) return; paused = !paused; pauseBtn.textContent = paused ? 'Resume' : 'Pause'; }

    function stopGame() {
        running = false; clearInterval(tickInterval);
        finalScoreText.textContent = `Final Score: ${score}`;
        popup.classList.remove('hidden');
        if (score > highScore) { highScore = score; localStorage.setItem('snakeMathHigh', highScore); highEl.textContent = highScore; }
    }

    function showProblem() { problemText.textContent = `${currentProblem.question} = ?`; }

    function spawnFoodForProblem() {
        let values = currentProblem.choices.slice(0, 3);
        while (values.length < 3) { const v = currentProblem.correctAnswer + (Math.random() > 0.5 ? rand(1, 3) : -rand(1, 3)); if (!values.includes(v)) values.push(v); }
        shuffle(values);
        foodItems = []; const occupied = new Set(snake.map(s => `${s.x},${s.y}`));
        let attempts = 0;
        for (let v of values) {
            let placed = false;
            while (!placed && attempts < 1000) {
                const x = rand(0, gridCols - 1), y = rand(0, gridRows - 1);
                const key = `${x},${y}`;
                if (!occupied.has(key) && !foodItems.some(f => f.x === x && f.y === y)) {
                    foodItems.push({ x, y, value: v, isCorrect: v === currentProblem.correctAnswer });
                    placed = true;
                }
                attempts++;
            }
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);

        // grid
        ctx.strokeStyle = 'rgba(30,144,255,0.2)'; ctx.lineWidth = 1;
        for (let x = 0; x <= gridCols; x++) { ctx.beginPath(); ctx.moveTo(x * GRID, 0); ctx.lineTo(x * GRID, canvas.height); ctx.stroke(); }
        for (let y = 0; y <= gridRows; y++) { ctx.beginPath(); ctx.moveTo(0, y * GRID); ctx.lineTo(canvas.width, y * GRID); ctx.stroke(); }

        // food
        foodItems.forEach(f => {
            const px = f.x * GRID, py = f.y * GRID;
            ctx.beginPath();
            ctx.fillStyle = f.isCorrect ? '#FFEB3B' : '#FFEB3B';
            ctx.arc(px + GRID / 2, py + GRID / 2, GRID * 0.55, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#052d37';
            ctx.font = `bold ${Math.max(12, GRID * 0.6)}px Fredoka One`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(f.value, px + GRID / 2, py + GRID / 2);
        });

        // snake
        snake.forEach((s, i) => {
            const px = s.x * GRID, py = s.y * GRID;
            ctx.fillStyle = i === 0 ? '#1E90FF' : '#0077ff';
            ctx.fillRect(px + 1, py + 1, GRID - 2, GRID - 2);
            if (i === 0) {
                // dot for front
                ctx.fillStyle = '#fff';
                const eyeX = px + GRID * (dir.x === 1 ? 0.75 : dir.x === -1 ? 0.25 : 0.5);
                const eyeY = py + GRID * (dir.y === 1 ? 0.75 : dir.y === -1 ? 0.25 : 0.5);
                ctx.beginPath(); ctx.arc(eyeX, eyeY, Math.max(3, GRID * 0.12), 0, Math.PI * 2); ctx.fill();
            }
        });

        scoreEl.textContent = score;
    }

    function gameTick() {
        if (!running || paused) return;
        if (!(nextDir.x === -dir.x && nextDir.y === -dir.y)) dir = nextDir;
        const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
        if (head.x < 0 || head.x >= gridCols || head.y < 0 || head.y >= gridRows) { stopGame(); return; }
        if (snake.some(p => p.x === head.x && p.y === head.y)) { stopGame(); return; }

        snake.unshift(head);
        const eatenIndex = foodItems.findIndex(f => f.x === head.x && f.y === head.y);
        if (eatenIndex >= 0) {
            const eaten = foodItems[eatenIndex]; foodItems.splice(eatenIndex, 1);
            if (eaten.isCorrect) { score++; currentProblem = pickProblem(); showProblem(); spawnFoodForProblem(); }
            else { stopGame(); return; }
        } else snake.pop();

        draw();
    }

    // keyboard
    window.addEventListener('keydown', e => {
        if (!running) return;
        const k = e.key.toLowerCase();
        if ((k === 'arrowup' || k === 'w') && dir.y === 0) nextDir = { x: 0, y: -1 };
        if ((k === 'arrowdown' || k === 's') && dir.y === 0) nextDir = { x: 0, y: 1 };
        if ((k === 'arrowleft' || k === 'a') && dir.x === 0) nextDir = { x: -1, y: 0 };
        if ((k === 'arrowright' || k === 'd') && dir.x === 0) nextDir = { x: 1, y: 0 };
    });

    // mobile swipe
    (function setupSwipe() {
        let sx = 0, sy = 0;
        canvas.addEventListener('touchstart', e => { const t = e.changedTouches[0]; sx = t.clientX; sy = t.clientY; }, { passive: true });
        canvas.addEventListener('touchend', e => {
            const t = e.changedTouches[0];
            const dx = t.clientX - sx, dy = t.clientY - sy;
            if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
            if (Math.abs(dx) > Math.abs(dy)) {
                if (dx > 0 && dir.x === 0) nextDir = { x: 1, y: 0 };
                if (dx < 0 && dir.x === 0) nextDir = { x: -1, y: 0 };
            } else {
                if (dy > 0 && dir.y === 0) nextDir = { x: 0, y: 1 };
                if (dy < 0 && dir.y === 0) nextDir = { x: 0, y: -1 };
            }
        }, { passive: true });
    })();

    // buttons
    startBtn.addEventListener('click', () => { startBtn.disabled = true; startGame(); });
    pauseBtn.addEventListener('click', pauseResume);
    topRestartBtn.addEventListener('click', () => { popup.classList.add('hidden'); startBtn.disabled = false; startGame(); });
    popupRestart.addEventListener('click', () => { popup.classList.add('hidden'); startBtn.disabled = false; startGame(); });
    popupBack.addEventListener('click', () => { popup.classList.add('hidden'); startBtn.disabled = false; });

    speedSelect.addEventListener('change', () => { FPS = parseInt(speedSelect.value); if (running) { clearInterval(tickInterval); tickInterval = setInterval(gameTick, 1000 / FPS); } });

    window.addEventListener('resize', () => { layoutCanvas(); draw(); });

    layoutCanvas(); resetState(); draw();
})();
