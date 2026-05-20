// ==========================================
// 1. TẠO 100 LEVEL CHU TRÌNH EULER  & SẮP XẾP DẦN ĐỘ KHÓ
// ==========================================
const levels = [];
const usedSignatures = new Set(); 


for (let i = 1; i <= 100; i++) {
   
    let baseNodes = 4 + Math.floor((i - 1) / 10); 
   
    let extraCyclesTarget = Math.floor((i - 1) / 15) + 1; 

    let success = false;
    let attempts = 0;

    while (!success && attempts < 1000) {
        attempts++;
        let adj = Array.from({length: baseNodes + 1}, () => new Set());
        let edgesList = [];
        
        
        let nodes = [];
        for(let n=1; n<=baseNodes; n++) nodes.push(n);
        for(let k=nodes.length-1; k>0; k--){
            let j = Math.floor(Math.random()*(k+1));
            [nodes[k], nodes[j]] = [nodes[j], nodes[k]];
        }

        
        for (let j = 0; j < baseNodes; j++) {
            let u = nodes[j], v = nodes[(j + 1) % baseNodes];
            adj[u].add(v); adj[v].add(u);
            edgesList.push([u, v]);
        }

       
        let extraCycles = extraCyclesTarget + Math.floor(Math.random() * 2);
        for (let k = 0; k < extraCycles; k++) {
            let cycleLen = (baseNodes >= 4 && Math.random() > 0.5) ? 4 : 3;
            let tempNodes = [...nodes];
            for(let x=tempNodes.length-1; x>0; x--){
                let y = Math.floor(Math.random()*(x+1));
                [tempNodes[x], tempNodes[y]] = [tempNodes[y], tempNodes[x]];
            }
            let subCycle = tempNodes.slice(0, cycleLen);
            
            
            let validCycle = true;
            for(let c=0; c<cycleLen; c++){
                let u = subCycle[c], v = subCycle[(c+1)%cycleLen];
                if(adj[u].has(v)) { validCycle = false; break; }
            }
            
            if(validCycle) {
                for(let c=0; c<cycleLen; c++){
                    let u = subCycle[c], v = subCycle[(c+1)%cycleLen];
                    adj[u].add(v); adj[v].add(u);
                    edgesList.push([u, v]);
                }
            }
        }

        
        let sigEdges = edgesList.map(e => {
            let minE = Math.min(e[0], e[1]), maxE = Math.max(e[0], e[1]);
            return `${minE}-${maxE}`;
        });
        sigEdges.sort();
        let signature = sigEdges.join('|');

       
        if (!usedSignatures.has(signature)) {
            usedSignatures.add(signature);
            levels.push({
                nodes: baseNodes,
                edges: edgesList,
                edgeCount: edgesList.length
            });
            success = true;
        }
    }
}


levels.sort((a, b) => {
    if(a.nodes !== b.nodes) return a.nodes - b.nodes;
    return a.edgeCount - b.edgeCount;
});


levels.forEach((lvl, idx) => {
    lvl.level = idx + 1;
    if (lvl.level <= 5) lvl.type = "EASY";
    else if (lvl.level <= 45) lvl.type = "MEDIUM";
    else if (lvl.level <= 85) lvl.type = "HARD";
    else lvl.type = "EXTREME";
    
    lvl.desc = `Hải trình cấp độ ${lvl.level}. Nhiệm vụ: Khám phá ${lvl.edges.length} tuyến đường biển mà không đi trùng lặp.`;
});

let currentLevelIdx = 0; let cyGame = null; 
let startNodeId = null; let currentNode = null;
let visitedEdgesCount = 0; let totalEdges = 0; let isAnimating = false;
let edgeHintTimeout = null;

// ==========================================
// 2. THEME & UI TOGGLE
// ==========================================
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const btn = document.getElementById('theme-toggle');
    if (document.body.classList.contains('light-mode')) {
        btn.innerHTML = '<i class="fas fa-moon"></i>';
    } else {
        btn.innerHTML = '<i class="fas fa-sun"></i>';
    }
}

function openTab(evt, tabName) {
    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(tb => tb.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    evt.currentTarget.classList.add('active');
}

// ==========================================
// 3. ASSET LOADER
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
// 4. HYBRID AUDIO SYSTEM
// ==========================================
let audioCtx = null;
let oceanGain = null;

function initSynth() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

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
    oceanGain.gain.value = 0.35; 

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
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98]; 
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
    move: () => Audio.playSafe('sfx-move', 'sawtooth', 150, 0.5, 0.2), 
    error: () => Audio.playSafe('sfx-error', 'sawtooth', 120, 0.5, 0.4),
    win: () => {
        initSynth();
        const bgm = document.getElementById('bgm-audio');
        if (bgm) bgm.pause(); 
        if (oceanGain && audioCtx) {
            oceanGain.gain.cancelScheduledValues(audioCtx.currentTime);
            oceanGain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.5); 
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
    startOceanSound();
    const bgm = document.getElementById('bgm-audio');
    if (bgm && bgm.getAttribute('src') && bgm.getAttribute('src').trim() !== '') {
        bgm.volume = 0.4;
        bgm.play().catch(e => console.log("BGM Error:", e));
    }
    loadAssets(() => { initGame(); });
}

// ==========================================
// 5. ANIMATED EDGES & WATER BACKGROUND
// ==========================================
const edgesCanvas = document.getElementById('edges-canvas');
const eCtx = edgesCanvas.getContext('2d');
let waterTime = 0;

function renderEnv() {
    waterTime += 0.01;
    const wCtx = document.getElementById('water-bg').getContext('2d');
    
    const style = getComputedStyle(document.body);
    const c1 = style.getPropertyValue('--water-grad-1').trim() || '#0077b6';
    const c2 = style.getPropertyValue('--water-grad-2').trim() || '#023e8a';

    const grd = wCtx.createRadialGradient(edgesCanvas.width / 2, edgesCanvas.height / 2, 0, edgesCanvas.width / 2, edgesCanvas.height / 2, edgesCanvas.width);
    grd.addColorStop(0, c1); grd.addColorStop(1, c2);
    wCtx.fillStyle = grd; wCtx.fillRect(0, 0, edgesCanvas.width, edgesCanvas.height);
    
    wCtx.fillStyle = 'rgba(0, 180, 216, 0.08)';
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
            const isHint = edge.hasClass('hint-edge');

            const dx = target.x - source.x; const dy = target.y - source.y;
            const dist = Math.hypot(dx, dy); const angle = Math.atan2(dy, dx);

            eCtx.save(); eCtx.translate(source.x, source.y); eCtx.rotate(angle); eCtx.beginPath(); eCtx.moveTo(0, 0);

            const amplitude = 5; const speed = waterTime * 4;
            for (let i = 0; i <= dist; i += 5) eCtx.lineTo(i, Math.sin(i * 0.05 - speed) * amplitude);

            if (isHint) {
                let alpha = (Math.sin(waterTime * 10) + 1) / 2 + 0.2;
                eCtx.shadowBlur = 25; eCtx.shadowColor = `rgba(253, 224, 71, ${alpha})`;
                eCtx.lineWidth = 8; eCtx.strokeStyle = `rgba(250, 204, 21, ${alpha})`;
            } else {
                eCtx.setLineDash([15, 15]); eCtx.shadowBlur = 0; eCtx.lineWidth = 5; 
                eCtx.strokeStyle = document.body.classList.contains('light-mode') ? 'rgba(2, 132, 199, 0.6)' : 'rgba(0, 229, 255, 0.5)';
            }
            eCtx.stroke(); eCtx.restore();
        });
    }
    requestAnimationFrame(renderEnv);
}

// ==========================================
// 6. BOAT PHYSICS
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
            const bSize = 120; 
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
// 7. CYTOSCAPE ENGINE
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
                    'width': 180, 'height': 180,
                    'transition-property': 'width, height, shadow-blur', 'transition-duration': '0.2s',
                    'label': 'data(id)', 'color': 'white', 'text-valign': 'top', 'text-margin-y': -20,
                    'font-family': 'Nunito', 'font-size': '36px', 'font-weight': '900',
                    'text-outline-color': '#000', 'text-outline-width': 6
                }
            },
            { selector: 'edge', style: { 'opacity': 0 } },
            { selector: '.current-node', style: { 'width': 220, 'height': 220, 'shadow-blur': 60, 'shadow-color': '#00e5ff' } },
            { selector: '.start-node', style: { 'width': 200, 'height': 200, 'shadow-blur': 40, 'shadow-color': '#fde047' } },
            { selector: '.hint-node', style: { 'width': 210, 'height': 210, 'shadow-blur': 50, 'shadow-color': '#ff00ff' } }
        ],
        userZoomingEnabled: false, userPanningEnabled: false, boxSelectionEnabled: false
    });

    cyGame.on('tap', 'node', handleNodeClick);
    cyGame.on('mouseover', 'node', (e) => {
        if (!isAnimating && !e.target.hasClass('current-node')) {
            Audio.hover(); 
            document.body.style.cursor = 'pointer'; 
           
            let baseW = e.target.width(); let baseH = e.target.height();
            e.target.style({ 'width': baseW + 20, 'height': baseH + 20 });
        }
    });
    cyGame.on('mouseout', 'node', (e) => { document.body.style.cursor = 'default'; e.target.removeStyle('width'); e.target.removeStyle('height'); });

    cyGame.on('remove', updateDataTabs);

    loadLevel(currentLevelIdx);
}

function loadLevel(idx) {
    if (idx < 0) idx = 0;
    if (idx >= levels.length) {
        showModal("🏆 HUYỀN THOẠI BIỂN KHƠI", "Bạn đã phá đảo toàn bộ 100 Level! Bạn chính là Vua Hải Tặc!", () => { window.location.href = 'index.html'; });
        return;
    }
    currentLevelIdx = idx; const lvlData = levels[idx];
    document.getElementById('level-display').innerText = lvlData.level;
    document.getElementById('level-type-badge').innerText = lvlData.type;
    
    let badgeColor = '#22c55e'; 
    if(lvlData.type === 'MEDIUM') badgeColor = '#f59e0b';
    if(lvlData.type === 'HARD') badgeColor = '#ef4444';
    if(lvlData.type === 'EXTREME') badgeColor = '#000000';
    document.getElementById('level-type-badge').style.background = badgeColor;

    document.getElementById('level-desc').innerText = lvlData.desc;

    startNodeId = null; currentNode = null; visitedEdgesCount = 0; totalEdges = lvlData.edges.length; 
    updateStats(); clearHints(); stopConfetti();

    const bgm = document.getElementById('bgm-audio');
    if (bgm && bgm.paused) bgm.play().catch(e => e);
    if (oceanGain && audioCtx) {
        oceanGain.gain.cancelScheduledValues(audioCtx.currentTime);
        oceanGain.gain.exponentialRampToValueAtTime(0.35, audioCtx.currentTime + 1);
    }

    cyGame.elements().remove();
    for (let i = 1; i <= lvlData.nodes; i++) cyGame.add({ group: 'nodes', data: { id: i.toString() } });
    lvlData.edges.forEach((edge, i) => { cyGame.add({ group: 'edges', data: { id: 'e' + i, source: edge[0].toString(), target: edge[1].toString() } }); });

    
    cyGame.layout({ name: 'circle', padding: 50 }).run();

    
    let dynamicSize = lvlData.nodes > 12 ? 140 : (lvlData.nodes > 8 ? 160 : 180);
    
    cyGame.style()
        .selector('node').style({'width': dynamicSize, 'height': dynamicSize})
       
        .selector('.current-node').style({'width': dynamicSize + 40, 'height': dynamicSize + 40})
        .selector('.start-node').style({'width': dynamicSize + 20, 'height': dynamicSize + 20})
        .selector('.hint-node').style({'width': dynamicSize + 30, 'height': dynamicSize + 30})
        .update();

    updateDataTabs();
}

function nextLevel() { loadLevel(currentLevelIdx + 1); }
function prevLevel() { loadLevel(currentLevelIdx - 1); }
function resetLevel() { loadLevel(currentLevelIdx); }

function generateRandomMap() {
    let randIdx = Math.floor(Math.random() * levels.length);
    loadLevel(randIdx);
}

function handleNodeClick(evt) {
    if (isAnimating) return;
    clearHints();
    const node = evt.target;

    if (!currentNode) {
        startNodeId = node.id();
        currentNode = node; 
        node.addClass('current-node');
        node.addClass('start-node');
        updateStats(); Audio.hover(); 
        return;
    }

    const edgesBetween = currentNode.edgesWith(node);

    if (edgesBetween.length > 0) {
        const edgeToTraverse = edgesBetween[0];
        const p1 = currentNode.renderedPosition(); const p2 = node.renderedPosition();

        animator.animateTravel(p1.x, p1.y, p2.x, p2.y, () => {
            cyGame.remove(edgeToTraverse); 
            currentNode.removeClass('current-node');
            currentNode = node; currentNode.addClass('current-node');
            
            visitedEdgesCount++; 
            updateStats(); 
            checkWinLoseCondition();
        });
    } else { triggerError(); }
}

function triggerError() {
    Audio.error();
    const main = document.getElementById('game-main');
    main.classList.remove('shake-screen'); void main.offsetWidth; main.classList.add('shake-screen');
}

function checkWinLoseCondition() {
    if (visitedEdgesCount === totalEdges) {
        if (currentNode.id() === startNodeId) {
            Audio.win();
            fireConfetti();
            document.getElementById('modal-icon').innerText = '🌟';
            showModal("CHIẾN THẮNG!", `Quá đỉnh! Bạn đã vượt qua màn ${levels[currentLevelIdx].level} thành công.`, () => { closeModal(); nextLevel(); }, "LEVEL TIẾP THEO");
        } else {
            Audio.error();
            document.getElementById('modal-icon').innerText = '☠️';
            showModal("THẤT BẠI", "Bạn đã đi hết biển nhưng KHÔNG thể trở về đảo xuất phát!", () => { closeModal(); resetLevel(); }, "Chơi Lại", true);
        }
        return;
    }

    const availableEdges = currentNode.connectedEdges();
    if (availableEdges.length === 0) {
        Audio.error(); document.getElementById('modal-icon').innerText = '⚓';
        showModal("MẮC KẸT!", "Thuyền của bạn đã đi vào ngõ cụt. Vẫn còn tuyến đường chưa khám phá!", () => { closeModal(); resetLevel(); }, "Làm Lại", true);
    }
}

function updateStats() {
    document.getElementById('edge-progress').innerText = `${visitedEdgesCount} / ${totalEdges}`;
    document.getElementById('start-island').innerText = startNodeId ? `Đảo số ${startNodeId}` : "Chưa chọn";
    document.getElementById('current-island').innerText = currentNode ? `Đảo số ${currentNode.id()}` : "Chưa nhổ neo";
}

// ==========================================
// 8. DATA TABS & SIDEBAR LOGIC
// ==========================================
function updateDataTabs() {
    if(!cyGame) return;
    const nodes = cyGame.nodes().map(n => parseInt(n.id())).sort((a,b) => a - b);
    const edges = cyGame.edges();
    
    if (nodes.length === 0) return;

    let matrixHTML = `<table class="data-table"><thead><tr><th></th>`;
    nodes.forEach(n => matrixHTML += `<th>${n}</th>`);
    matrixHTML += `</tr></thead><tbody>`;
    nodes.forEach(u => {
        matrixHTML += `<tr><th>${u}</th>`;
        nodes.forEach(v => {
            let hasEdge = edges.filter(e => 
                (parseInt(e.source().id()) === u && parseInt(e.target().id()) === v) || 
                (parseInt(e.source().id()) === v && parseInt(e.target().id()) === u)
            ).length > 0;
            matrixHTML += `<td style="${hasEdge ? 'font-weight: bold; color: var(--primary);' : 'color: var(--text-muted); opacity: 0.3;'}">${hasEdge ? "1" : "0"}</td>`;
        });
        matrixHTML += `</tr>`;
    });
    matrixHTML += `</tbody></table>`;
    document.getElementById('tab-matrix').innerHTML = matrixHTML;

    let edgesHTML = `<table class="data-table"><thead><tr><th>Đỉnh đầu</th><th>Đỉnh cuối</th></tr></thead><tbody>`;
    if (edges.length === 0) {
        edgesHTML += `<tr><td colspan="2" style="color: var(--text-muted)">Không còn cạnh nào</td></tr>`;
    } else {
        edges.forEach(e => {
            edgesHTML += `<tr><td>${e.source().id()}</td><td>${e.target().id()}</td></tr>`;
        });
    }
    edgesHTML += `</tbody></table>`;
    document.getElementById('tab-edge-list').innerHTML = edgesHTML;

    let adjHTML = `<table class="data-table"><thead><tr><th>Đỉnh</th><th>Các đỉnh kề (Chưa đi)</th></tr></thead><tbody>`;
    nodes.forEach(u => {
        let neighbors = [];
        edges.forEach(e => {
            if (parseInt(e.source().id()) === u) neighbors.push(parseInt(e.target().id()));
            if (parseInt(e.target().id()) === u) neighbors.push(parseInt(e.source().id()));
        });
        let uniqueNeighbors = [...new Set(neighbors)].sort((a,b) => a - b).join(", ");
        adjHTML += `<tr><td><b>${u}</b></td><td style="${uniqueNeighbors ? 'color: var(--primary);' : 'color: var(--text-muted);'}">${uniqueNeighbors || "-"}</td></tr>`;
    });
    adjHTML += `</tbody></table>`;
    document.getElementById('tab-adj-list').innerHTML = adjHTML;
}

function copyData() {
    const activeTab = document.querySelector('.tab-content.active');
    if(!activeTab) return;
    
    let text = "";
    activeTab.querySelectorAll('tr').forEach(row => {
        let rowData = [];
        row.querySelectorAll('th, td').forEach(cell => rowData.push(cell.innerText));
        text += rowData.join("\t") + "\n";
    });
    
    navigator.clipboard.writeText(text).then(() => {
        alert("Đã copy dữ liệu vào Clipboard!");
    });
}

// ==========================================
// 9. GỢI Ý THÔNG MINH (FLEURY)
// ==========================================
function clearHints() {
    cyGame.nodes().removeClass('hint-node'); cyGame.edges().removeClass('hint-edge');
    if (edgeHintTimeout) clearTimeout(edgeHintTimeout);
}

function showHint() {
    clearHints();

    if (!currentNode) {
        cyGame.nodes().addClass('hint-node');
    } else {
        const availableEdges = currentNode.connectedEdges();
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
    const allRemainingEdges = cyGame.edges();
    if (allRemainingEdges.length === 1) return true;
    const edgesAfterMove = allRemainingEdges.filter(e => e.id() !== edgeToTest.id());
    const startNodeId = edgeToTest.target().id() === currentNode.id() ? edgeToTest.source().id() : edgeToTest.target().id();

    let visitedEdges = new Set(); let queue = [startNodeId];
    while (queue.length > 0) {
        let curr = queue.shift();
        edgesAfterMove.forEach(e => {
            if (!visitedEdges.has(e.id())) {
                let src = e.source().id(); let tgt = e.target().id();
                if (src === curr || tgt === curr) {
                    visitedEdges.add(e.id());
                    queue.push(src === curr ? tgt : src);
                }
            }
        });
    }
    return visitedEdges.size < edgesAfterMove.length;
}

// ==========================================
// 10. MODAL UI & CONFETTI
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