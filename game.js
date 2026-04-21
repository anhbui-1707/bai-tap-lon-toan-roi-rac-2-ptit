// ==========================================
// 1. DATA & 10 LEVELS SYSTEM
// ==========================================
const levels = [
    { level: 1, type: 'EASY', desc: "Khởi động nhẹ nhàng! Khám phá toàn bộ bản đồ mà không đi lùi.", nodes: 4, edges: [[1, 2], [2, 3], [3, 4], [4, 1]] },
    { level: 2, type: 'EASY', desc: "Ngôi sao biển. Tất cả các đảo đều liên kết hoàn hảo.", nodes: 5, edges: [[1, 2], [2, 3], [3, 4], [4, 5], [5, 1], [1, 3], [3, 5], [5, 2], [2, 4], [4, 1]] },
    { level: 3, type: 'EASY', desc: "Lục giác ma thuật. Hãy quan sát kỹ trước khi xuất phát.", nodes: 6, edges: [[1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 1], [1, 3], [3, 5], [5, 1], [2, 4], [4, 6], [6, 2]] },
    { level: 4, type: 'MEDIUM', desc: "Khó hơn một chút! Phải chọn đúng điểm nhổ neo để không bị kẹt.", nodes: 4, edges: [[1, 2], [2, 3], [3, 4], [4, 1], [1, 3]] },
    { level: 5, type: 'MEDIUM', desc: "Hải trình dài hơn. Dùng nút 'Gợi ý' nếu la bàn mất phương hướng.", nodes: 5, edges: [[1, 2], [2, 3], [3, 4], [4, 5], [5, 1], [1, 4], [2, 5]] },
    { level: 6, type: 'MEDIUM', desc: "Cẩn thận ngõ cụt! Tránh phá hủy những eo biển duy nhất nếu chưa thực sự cần thiết.", nodes: 6, edges: [[1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 1], [1, 4], [2, 5], [3, 6]] },
    { level: 7, type: 'HARD', desc: "Mạng lưới nhện. Rất dễ chìm tàu nếu đi sai một bước.", nodes: 6, edges: [[1, 2], [2, 3], [3, 4], [4, 1], [1, 5], [5, 2], [2, 6], [6, 3], [3, 5], [5, 6], [6, 4], [4, 5]] },
    { level: 8, type: 'HARD', desc: "Mê cung song sinh. Hãy kiên nhẫn tìm đường đi hợp lý nhất.", nodes: 7, edges: [[1, 2], [2, 3], [3, 4], [4, 1], [1, 5], [5, 6], [6, 7], [7, 1], [2, 5], [3, 6], [4, 7]] },
    { level: 9, type: 'HARD', desc: "Thử thách trước Mắt Bão! Chỉ những thuyền trưởng tài ba nhất mới qua được.", nodes: 8, edges: [[1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 1], [1, 5], [2, 6], [3, 7], [4, 8]] },
    { level: 10, type: 'TRAP', desc: "Lời đồn nói rằng cụm đảo này là một cái bẫy không lối thoát...", nodes: 5, edges: [[1, 2], [2, 3], [3, 4], [4, 5], [1, 3], [3, 5], [2, 4], [4, 1]] }
];

let currentLevelIdx = 0; let cyGame = null; let currentNode = null;
let visitedEdgesCount = 0; let totalEdges = 0; let isAnimating = false;
let edgeHintTimeout = null;

// ==========================================
// 2. ASSET LOADER
// ==========================================
const islandSprites = [];
let boatSprite = null;

function loadAssets(callback) {
    islandSprites.length = 0;
    for (let i = 1; i <= 6; i++) {
        let imgTag = document.getElementById('island-' + i);
        if (imgTag) islandSprites.push(imgTag.src);
    }
    boatSprite = document.getElementById('boat-sprite');
    callback();
}

// ==========================================
// 3. HYBRID AUDIO SYSTEM (SÓNG BIỂN + MP3)
// ==========================================
let audioCtx = null;
let oceanGain = null;

function initSynth() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

// Hàm khởi tạo tiếng Sóng Biển (Chạy nền liên tục)
function startOceanSound() {
    if (!audioCtx) return;
    const bufferSize = audioCtx.sampleRate * 2;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 1.5;

    let oceanNode = audioCtx.createBufferSource();
    oceanNode.buffer = buffer;
    oceanNode.loop = true;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 350;

    const lfo = audioCtx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.15;
    const lfoGain = audioCtx.createGain();
    lfoGain.gain.value = 250;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    oceanGain = audioCtx.createGain();
    oceanGain.gain.value = 0.35; // Sóng to

    oceanNode.connect(filter); filter.connect(oceanGain); oceanGain.connect(audioCtx.destination);
    oceanNode.start();
}

function playSynth(type, freq, duration, vol) {
    if (!audioCtx || audioCtx.state === 'suspended') return;
    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
    osc.type = type; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, audioCtx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + duration);
}

function playWinSynth() {
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98]; // C major arpeggio
    notes.forEach((f, i) => setTimeout(() => playSynth('square', f, 0.4, 0.3), i * 120));
}

const Audio = {
    playSafe: function (id, synthType, synthFreq, synthDur, synthVol) {
        initSynth();
        const el = document.getElementById(id);
        if (el && el.getAttribute('src') && el.getAttribute('src').trim() !== '') {
            el.currentTime = 0; el.volume = 1.0;
            let p = el.play();
            if (p !== undefined) p.catch(e => playSynth(synthType, synthFreq, synthDur, synthVol));
        } else {
            playSynth(synthType, synthFreq, synthDur, synthVol);
        }
    },

    hover: () => Audio.playSafe('sfx-hover', 'sine', 600, 0.1, 0.05),
    move: () => Audio.playSafe('sfx-move', 'sawtooth', 150, 0.5, 0.2), // Tiếng thuyền chạy
    error: () => Audio.playSafe('sfx-error', 'sawtooth', 120, 0.5, 0.4),

    win: () => {
        initSynth();
        const bgm = document.getElementById('bgm-audio');
        if (bgm) bgm.pause(); // Tạm tắt nhạc nền

        if (oceanGain && audioCtx) {
            oceanGain.gain.cancelScheduledValues(audioCtx.currentTime);
            oceanGain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.5); // Hạ tiếng sóng
        }

        const winEl = document.getElementById('sfx-win');
        if (winEl && winEl.getAttribute('src') && winEl.getAttribute('src').trim() !== '') {
            winEl.currentTime = 0; winEl.volume = 1.0;
            let p = winEl.play();
            if (p !== undefined) p.catch(e => playWinSynth());
        } else {
            playWinSynth();
        }
    }
};

function startGame() {
    document.getElementById('start-overlay').style.display = 'none';
    initSynth();

    // Khởi động lại SÓNG BIỂN
    startOceanSound();

    // Khởi động lại NHẠC NỀN
    const bgm = document.getElementById('bgm-audio');
    if (bgm && bgm.getAttribute('src') && bgm.getAttribute('src').trim() !== '') {
        bgm.volume = 0.4;
        bgm.play().catch(e => console.log("BGM Error:", e));
    }

    loadAssets(() => { initGame(); });
}

// ==========================================
// 4. ANIMATED EDGES (SÓNG NƯỚC CANVAS)
// ==========================================
const edgesCanvas = document.getElementById('edges-canvas');
const eCtx = edgesCanvas.getContext('2d');
let waterTime = 0;

function renderEnv() {
    waterTime += 0.01;
    const wCtx = document.getElementById('water-bg').getContext('2d');
    const grd = wCtx.createRadialGradient(edgesCanvas.width / 2, edgesCanvas.height / 2, 0, edgesCanvas.width / 2, edgesCanvas.height / 2, edgesCanvas.width);
    grd.addColorStop(0, '#0077b6'); grd.addColorStop(1, '#023e8a');
    wCtx.fillStyle = grd; wCtx.fillRect(0, 0, edgesCanvas.width, edgesCanvas.height);
    wCtx.fillStyle = 'rgba(0, 180, 216, 0.05)';
    for (let j = 0; j < 3; j++) {
        wCtx.beginPath(); wCtx.moveTo(0, edgesCanvas.height);
        for (let i = 0; i <= edgesCanvas.width; i += 40) wCtx.lineTo(i, edgesCanvas.height * (0.3 + j * 0.2) + Math.sin(i * 0.01 + waterTime + j) * 30);
        wCtx.lineTo(edgesCanvas.width, edgesCanvas.height); wCtx.fill();
    }

    eCtx.clearRect(0, 0, edgesCanvas.width, edgesCanvas.height);
    if (cyGame) {
        cyGame.edges().forEach(edge => {
            const source = edge.source().renderedPosition(); const target = edge.target().renderedPosition();
            if (!source || !target) return;
            const isVisited = edge.hasClass('visited-edge'); const isHint = edge.hasClass('hint-edge');

            const dx = target.x - source.x; const dy = target.y - source.y;
            const dist = Math.hypot(dx, dy); const angle = Math.atan2(dy, dx);

            eCtx.save(); eCtx.translate(source.x, source.y); eCtx.rotate(angle); eCtx.beginPath(); eCtx.moveTo(0, 0);

            const amplitude = isVisited ? 0 : 5; const speed = waterTime * 4;
            for (let i = 0; i <= dist; i += 5) eCtx.lineTo(i, Math.sin(i * 0.05 - speed) * amplitude);

            if (isHint && !isVisited) {
                let alpha = (Math.sin(waterTime * 10) + 1) / 2 + 0.2;
                eCtx.shadowBlur = 25; eCtx.shadowColor = `rgba(253, 224, 71, ${alpha})`;
                eCtx.lineWidth = 8; eCtx.strokeStyle = `rgba(250, 204, 21, ${alpha})`;
            } else if (isVisited) {
                eCtx.shadowBlur = 20; eCtx.shadowColor = '#00e5ff'; eCtx.lineWidth = 10; eCtx.strokeStyle = '#00e5ff';
            } else {
                eCtx.setLineDash([15, 15]); eCtx.shadowBlur = 0; eCtx.lineWidth = 5; eCtx.strokeStyle = 'rgba(0, 180, 216, 0.5)';
            }
            eCtx.stroke(); eCtx.restore();
        });
    }
    requestAnimationFrame(renderEnv);
}

// ==========================================
// 5. BOAT PHYSICS 
// ==========================================
class BoatAnimator {
    constructor() {
        this.canvas = document.getElementById('boat-canvas'); this.ctx = this.canvas.getContext('2d');
        this.x = 0; this.y = 0; this.targetX = 0; this.targetY = 0;
        this.ripples = []; this.animId = null;
    }

    animateTravel(x1, y1, x2, y2, callback) {
        this.x = x1; this.y = y1; this.targetX = x2; this.targetY = y2;
        this.startTime = performance.now(); this.duration = 700;
        this.callback = callback; isAnimating = true; Audio.move();
        if (this.animId) cancelAnimationFrame(this.animId);
        this.loop();
    }

    loop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const p = Math.min((performance.now() - this.startTime) / this.duration, 1);
        const ease = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;

        this.x = this.x + (this.targetX - this.x) * ease;
        this.y = this.y + (this.targetY - this.y) * ease;
        let angle = Math.atan2(this.targetY - this.y, this.targetX - this.x);

        if (p < 0.95 && Math.random() > 0.3) {
            let nx = Math.cos(angle + Math.PI / 2); let ny = Math.sin(angle + Math.PI / 2);
            this.ripples.push({ x: this.x + nx * 18, y: this.y + ny * 18, life: 1, vx: nx, vy: ny });
            this.ripples.push({ x: this.x - nx * 18, y: this.y - ny * 18, life: 1, vx: -nx, vy: -ny });
        }

        for (let i = this.ripples.length - 1; i >= 0; i--) {
            let rp = this.ripples[i]; rp.x += rp.vx; rp.y += rp.vy; rp.life -= 0.03;
            if (rp.life <= 0) { this.ripples.splice(i, 1); continue; }
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${rp.life * 0.6})`;
            this.ctx.beginPath(); this.ctx.arc(rp.x, rp.y, 5 * rp.life, 0, Math.PI * 2); this.ctx.stroke();
        }

        if (boatSprite && boatSprite.complete) {
            this.ctx.save(); this.ctx.translate(this.x, this.y); this.ctx.rotate(angle + Math.PI / 2);
            let bob = Math.sin(performance.now() / 80) * 4; this.ctx.translate(0, bob);
            this.ctx.shadowBlur = 25; this.ctx.shadowColor = 'rgba(0,0,0,0.6)';
            const bSize = 140;
            this.ctx.imageSmoothingEnabled = true; this.ctx.imageSmoothingQuality = 'high';
            this.ctx.drawImage(boatSprite, -bSize / 2, -bSize / 2, bSize, bSize);
            this.ctx.restore();
        }

        if (p < 1) { this.animId = requestAnimationFrame(() => this.loop()); }
        else {
            isAnimating = false; this.ripples = [];
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            if (this.callback) this.callback();
        }
    }
}
const animator = new BoatAnimator();

// ==========================================
// 6. CYTOSCAPE (HỆ QUẢN TRỊ ĐẢO)
// ==========================================
function initGame() {
    window.addEventListener('resize', () => {
        const m = document.getElementById('game-main');
        edgesCanvas.width = m.clientWidth; edgesCanvas.height = m.clientHeight;
        document.getElementById('boat-canvas').width = m.clientWidth; document.getElementById('boat-canvas').height = m.clientHeight;
        document.getElementById('water-bg').width = m.clientWidth; document.getElementById('water-bg').height = m.clientHeight;
        document.getElementById('confetti-canvas').width = m.clientWidth; document.getElementById('confetti-canvas').height = m.clientHeight;
    });
    window.dispatchEvent(new Event('resize'));
    requestAnimationFrame(renderEnv);

    cyGame = cytoscape({
        container: document.getElementById('cy-game'),
        style: [
            {
                selector: 'node',
                style: {
                    'shape': 'rectangle', 'background-opacity': 0, 'border-width': 0,
                    'background-image': (ele) => islandSprites[(parseInt(ele.id()) - 1) % islandSprites.length],
                    'background-fit': 'contain',
                    'width': 240, 'height': 240,
                    'transition-property': 'width, height, shadow-blur', 'transition-duration': '0.2s',
                    'label': 'data(id)', 'color': 'white', 'text-valign': 'top', 'text-margin-y': -35,
                    'font-family': 'Nunito', 'font-size': '48px', 'font-weight': '900',
                    'text-outline-color': '#000', 'text-outline-width': 8
                }
            },
            { selector: 'edge', style: { 'opacity': 0 } },
            { selector: '.current-node', style: { 'width': 270, 'height': 270, 'shadow-blur': 60, 'shadow-color': '#fde047' } },
            { selector: '.hint-node', style: { 'width': 260, 'height': 260, 'shadow-blur': 50, 'shadow-color': '#ff00ff' } }
        ],
        userZoomingEnabled: false, userPanningEnabled: false, boxSelectionEnabled: false
    });

    cyGame.on('tap', 'node', handleNodeClick);
    cyGame.on('mouseover', 'node', (e) => {
        if (!isAnimating && !e.target.hasClass('current-node')) {
            Audio.hover(); document.body.style.cursor = 'pointer'; e.target.style({ 'width': 260, 'height': 260 });
        }
    });
    cyGame.on('mouseout', 'node', (e) => { document.body.style.cursor = 'default'; e.target.removeStyle('width'); e.target.removeStyle('height'); });

    loadLevel(currentLevelIdx);
}

function loadLevel(idx) {
    if (idx < 0) idx = 0;
    if (idx >= levels.length) {
        showModal("🏆 HUYỀN THOẠI BIỂN KHƠI", "Bạn đã phá đảo toàn bộ 10 Level! Vô cùng xuất sắc!", () => { window.location.href = 'index.html'; }); return;
    }
    currentLevelIdx = idx; const lvlData = levels[idx];
    document.getElementById('level-display').innerText = lvlData.level;
    document.getElementById('level-type-badge').innerText = lvlData.type;
    document.getElementById('level-type-badge').style.background = lvlData.type === 'EASY' ? '#22c55e' : (lvlData.type === 'MEDIUM' ? '#f59e0b' : '#ef4444');

    let degrees = {};
    lvlData.edges.forEach(e => { degrees[e[0]] = (degrees[e[0]] || 0) + 1; degrees[e[1]] = (degrees[e[1]] || 0) + 1; });
    let oddCount = Object.values(degrees).filter(d => d % 2 !== 0).length;

    let eulerInfo = document.getElementById('euler-type-info');
    if (oddCount === 0) { eulerInfo.innerHTML = "🎯 CHU TRÌNH EULER<br><span style='font-size:12px; color:#a5b4fc; font-weight:normal;'>Bắt đầu ở đảo bất kỳ.</span>"; }
    else if (oddCount === 2) { eulerInfo.innerHTML = "🎯 ĐƯỜNG ĐI EULER<br><span style='font-size:12px; color:#a5b4fc; font-weight:normal;'>BẮT BUỘC bắt đầu từ đảo có số đường lẻ.</span>"; }
    else { eulerInfo.innerHTML = "💀 VÙNG BIỂN CHẾT<br><span style='font-size:12px; color:#fca5a5; font-weight:normal;'>Bản đồ này KHÔNG THỂ vẽ 1 nét! Tự lượng sức mình...</span>"; }

    document.getElementById('level-desc').innerText = lvlData.desc;

    currentNode = null; visitedEdgesCount = 0; totalEdges = lvlData.edges.length; updateStats();
    clearHints(); stopConfetti();

    // Khôi phục nhạc nền và sóng biển nếu trước đó vừa Win
    const bgm = document.getElementById('bgm-audio');
    if (bgm && bgm.paused) bgm.play().catch(e => e);
    if (oceanGain && audioCtx) {
        oceanGain.gain.cancelScheduledValues(audioCtx.currentTime);
        oceanGain.gain.exponentialRampToValueAtTime(0.35, audioCtx.currentTime + 1);
    }

    cyGame.elements().remove();
    for (let i = 1; i <= lvlData.nodes; i++) cyGame.add({ group: 'nodes', data: { id: i.toString() } });
    lvlData.edges.forEach((edge, i) => { cyGame.add({ group: 'edges', data: { id: 'e' + i, source: edge[0].toString(), target: edge[1].toString() } }); });

    cyGame.layout({ name: 'circle', padding: 60 }).run();
}

function nextLevel() { loadLevel(currentLevelIdx + 1); }
function prevLevel() { loadLevel(currentLevelIdx - 1); }
function resetLevel() { loadLevel(currentLevelIdx); }

function generateRandomMap() {
    let N = Math.floor(Math.random() * 4) + 4;
    let edges = [];
    for (let i = 1; i <= N; i++) edges.push([i, (i % N) + 1]);
    let extra = Math.floor(N / 2);
    for (let k = 0; k < extra; k++) {
        let u = Math.floor(Math.random() * N) + 1; let v = Math.floor(Math.random() * N) + 1;
        if (u !== v) edges.push([u, v]);
    }
    let isTrap = Math.random() < 0.1; if (isTrap) edges.splice(0, 2);

    levels.push({
        level: "RAND", type: isTrap ? 'TRAP' : 'RANDOM',
        desc: "Bản đồ ngẫu nhiên! Phía trước là vinh quang hay là hố sâu tử thần?",
        nodes: N, edges: edges
    });
    loadLevel(levels.length - 1);
}

function handleNodeClick(evt) {
    if (isAnimating) return;
    clearHints();
    const node = evt.target;

    if (!currentNode) {
        if (node.connectedEdges().length % 2 === 0 && cyGame.nodes().filter(n => n.connectedEdges().length % 2 !== 0).length === 2) {
            triggerError(node); showModal("🚫 Sai điểm xuất phát!", "Bản đồ này là Đường đi Euler! Bắt buộc phải nhổ neo từ hòn đảo có số đường kết nối là số LẺ."); return;
        }
        currentNode = node; node.addClass('current-node');
        updateStats(); Audio.hover(); return;
    }

    const edgesBetween = currentNode.edgesWith(node).filter(e => !e.hasClass('visited-edge'));

    if (edgesBetween.length > 0) {
        const edgeToTraverse = edgesBetween[0];
        const p1 = currentNode.renderedPosition(); const p2 = node.renderedPosition();

        animator.animateTravel(p1.x, p1.y, p2.x, p2.y, () => {
            edgeToTraverse.addClass('visited-edge');
            currentNode.removeClass('current-node');
            currentNode = node; currentNode.addClass('current-node');
            visitedEdgesCount++; updateStats(); checkWinLoseCondition();
        });
    } else { triggerError(node); }
}

function triggerError(node) {
    Audio.error();
    const main = document.getElementById('game-main');
    main.classList.remove('shake-screen'); void main.offsetWidth; main.classList.add('shake-screen');
}

function checkWinLoseCondition() {
    const isLevelTypeTrap = levels[currentLevelIdx].type === 'TRAP';
    const isGraphUnsolvable = cyGame.nodes().filter(n => n.connectedEdges().length % 2 !== 0).length > 2;

    if (visitedEdgesCount === totalEdges) {
        Audio.win();
        fireConfetti();

        if (isGraphUnsolvable) {
            document.getElementById('modal-icon').innerText = '🤯';
            showModal("HACKER?!", "Về mặt lý thuyết, đảo này không thể giải được! Phép thuật nào vậy??", () => { closeModal(); nextLevel(); }, "Chơi Level Kế");
        } else {
            document.getElementById('modal-icon').innerText = isLevelTypeTrap ? '🏆' : '🌟';
            showModal(isLevelTypeTrap ? "PHÁ BẪY THÀNH CÔNG!" : "CHIẾN THẮNG!", `Quá đỉnh! Bạn đã vượt qua thử thách và thắp sáng ${totalEdges} eo biển.`, () => { closeModal(); nextLevel(); }, "LEVEL TIẾP THEO");
        }
        return;
    }

    const availableEdges = currentNode.connectedEdges().filter(e => !e.hasClass('visited-edge'));
    if (availableEdges.length === 0) {
        Audio.error(); document.getElementById('modal-icon').innerText = '☠️';
        if (isLevelTypeTrap || isGraphUnsolvable) {
            showModal("BẪY TỬ THẦN!", "Đúng như lời đồn, đây là một cái bẫy! Hải trình của bạn đã kết thúc.", () => { closeModal(); resetLevel(); }, "Thử lại", true);
        } else {
            showModal("MẮC KẸT!", "Thuyền của bạn đã đi vào ngõ cụt. Hãy tính toán lại hải trình!", () => { closeModal(); resetLevel(); }, "Làm Lại", true);
        }
    }
}

function updateStats() {
    document.getElementById('edge-progress').innerText = `${visitedEdgesCount} / ${totalEdges}`;
    document.getElementById('current-island').innerText = currentNode ? `Đảo số ${currentNode.id()}` : "Chưa nhổ neo";
}

// ==========================================
// 7. GỢI Ý THÔNG MINH (FLEURY)
// ==========================================
function clearHints() {
    cyGame.nodes().removeClass('hint-node'); cyGame.edges().removeClass('hint-edge');
    if (edgeHintTimeout) clearTimeout(edgeHintTimeout);
}

function showHint() {
    clearHints();

    if (!currentNode) {
        let hasOdd = false;
        cyGame.nodes().forEach(n => { if (n.connectedEdges().length % 2 !== 0) { n.addClass('hint-node'); hasOdd = true; } });
        if (!hasOdd) cyGame.nodes().addClass('hint-node');

        let oddCount = cyGame.nodes().filter(n => n.connectedEdges().length % 2 !== 0).length;
        if (oddCount !== 0 && oddCount !== 2) {
            Audio.error(); showModal("CẢNH BÁO BÃO!", "La bàn chỉ ra vùng biển này KHÔNG THỂ KHÁM PHÁ TRỌN VẸN. Chắc chắn bạn sẽ bị kẹt!");
        }
    } else {
        const availableEdges = currentNode.connectedEdges().filter(e => !e.hasClass('visited-edge'));
        if (availableEdges.length === 0) return;

        if (availableEdges.length === 1) { availableEdges[0].addClass('hint-edge'); }
        else {
            let safeEdge = availableEdges.find(e => !isBridge(e));
            if (safeEdge) safeEdge.addClass('hint-edge'); else availableEdges[0].addClass('hint-edge');
        }
    }
    edgeHintTimeout = setTimeout(clearHints, 3000);
}

function isBridge(edgeToTest) {
    const allRemainingEdges = cyGame.edges().filter(e => !e.hasClass('visited-edge'));
    if (allRemainingEdges.length === 1) return true;
    const edgesAfterMove = allRemainingEdges.filter(e => e.id() !== edgeToTest.id());
    const startNodeId = edgeToTest.target().id() === currentNode.id() ? edgeToTest.source().id() : edgeToTest.target().id();

    let visitedEdges = new Set(); let queue = [startNodeId]; let reachableEdgesCount = 0;
    while (queue.length > 0) {
        let curr = queue.shift();
        edgesAfterMove.forEach(e => {
            if (!visitedEdges.has(e.id())) {
                let src = e.source().id(); let tgt = e.target().id();
                if (src === curr || tgt === curr) {
                    visitedEdges.add(e.id()); reachableEdgesCount++;
                    queue.push(src === curr ? tgt : src);
                }
            }
        });
    }
    return visitedEdges.size < edgesAfterMove.length;
}

// ==========================================
// 8. MODAL UI & CONFETTI
// ==========================================
function showModal(title, desc, actionCallback, btnText = "Tiếp tục", showAltBtn = false) {
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-desc').innerText = desc;
    const btn = document.getElementById('modal-btn');
    btn.innerText = btnText; btn.onclick = () => { if (actionCallback) actionCallback(); else closeModal(); };
    const altBtn = document.getElementById('modal-btn-alt');
    altBtn.style.display = showAltBtn ? 'block' : 'none';
    altBtn.onclick = () => { closeModal(); resetLevel(); };
    document.getElementById('game-modal').style.display = 'flex';
}
function closeModal() { document.getElementById('game-modal').style.display = 'none'; stopConfetti(); }

let confettiArr = []; let confettiLoop = null;

function fireConfetti() {
    const canvas = document.getElementById('confetti-canvas'); const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const colors = ['#fde047', '#38bdf8', '#fb7185', '#34d399', '#c084fc'];
    confettiArr = [];

    for (let i = 0; i < 200; i++) {
        confettiArr.push({
            x: canvas.width / 2, y: canvas.height / 2, r: Math.random() * 8 + 6,
            dx: Math.random() * 30 - 15, dy: Math.random() * -20 - 8,
            color: colors[Math.floor(Math.random() * colors.length)],
            tilt: Math.floor(Math.random() * 10) - 10,
            tiltAngleInc: (Math.random() * 0.07) + 0.05, tiltAngle: 0
        });
    }

    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        confettiArr.forEach((c, i) => {
            c.tiltAngle += c.tiltAngleInc;
            c.y += (Math.cos(c.tiltAngle) + 1 + c.r / 2) / 2;
            c.x += Math.sin(c.tiltAngle) * 2 + c.dx; c.dy += 0.3; c.y += c.dy;

            ctx.beginPath(); ctx.lineWidth = c.r; ctx.strokeStyle = c.color;
            ctx.moveTo(c.x + c.tilt + c.r, c.y); ctx.lineTo(c.x + c.tilt, c.y + c.tilt + c.r); ctx.stroke();

            if (c.y > canvas.height) confettiArr.splice(i, 1);
        });
        if (confettiArr.length > 0) { confettiLoop = requestAnimationFrame(render); }
        else { ctx.clearRect(0, 0, canvas.width, canvas.height); }
    }
    render();
}

function stopConfetti() {
    confettiArr = []; if (confettiLoop) cancelAnimationFrame(confettiLoop);
    const canvas = document.getElementById('confetti-canvas');
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}