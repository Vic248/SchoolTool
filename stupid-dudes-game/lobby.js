// ═══════════════════════════════════════════════════════════════════════════════
//  STUPID DUDES — Firebase Lobby System
//  Replace YOUR_API_KEY etc. with your actual Firebase config
// ═══════════════════════════════════════════════════════════════════════════════

// ─── FIREBASE CONFIG ──────────────────────────────────────────────────────────
// TODO: Replace with your own Firebase project config from:
//  console.firebase.google.com → Project Settings → Your apps → SDK setup
const FIREBASE_CONFIG = {
    apiKey:            "AIzaSyDNcRxWNohQmROwUm8hSrn7qZ7qxqr2nDo",
    authDomain:        "stupid-dudes.firebaseapp.com",
    databaseURL:       "https://stupid-dudes-default-rtdb.firebaseio.com/",
    projectId:         "stupid-dudes",
    storageBucket:     "stupid-dudes.firebasestorage.app",
    messagingSenderId: "833223038326",
    appId:             "1:833223038326:web:87e7d4d69592ba010d1657"
};

// ─── GAME CONSTANTS ───────────────────────────────────────────────────────────
const MAX_PLAYERS   = 8;
const MIN_TO_START  = 2;
const HUNTER_THRESHOLD = 10;

// ─── STATE ────────────────────────────────────────────────────────────────────
let firebaseApp = null, db = null, auth = null, rtdb = null;
let currentUser = null;
let currentRoomId = null;
let isHost = false;
let localPlayerName = '';
let firebaseReady = false;

// ─── INIT ─────────────────────────────────────────────────────────────────────
async function initFirebase() {
    // Dynamically load Firebase SDK
    await loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
    await loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js');
    await loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js');
    await loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-database-compat.js');

    try {
        firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
        auth        = firebase.auth();
        db          = firebase.firestore();
        rtdb        = firebase.database();

        // Anonymous sign-in
        await auth.signInAnonymously();
        currentUser = auth.currentUser;
        console.log('[Firebase] Signed in:', currentUser.uid);
        firebaseReady = true;
    } catch (e) {
        console.warn('[Firebase] Could not connect — running in offline/solo mode.', e.message);
        firebaseReady = false;
    }
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
        const s = document.createElement('script');
        s.src = src;
        s.onload  = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    });
}

// ─── LOBBY UI ─────────────────────────────────────────────────────────────────
function buildLobbyHTML() {
    const container = document.createElement('div');
    container.id = 'lobby-ui';
    container.innerHTML = `
        <h1>Stupid Dudes</h1>
        <p class="subtitle">Grab 'em. Pen 'em. Hunt 'em.</p>
        <div class="lobby-card">
            <input type="text" id="player-name-input" placeholder="Enter your nickname" maxlength="16" autocomplete="off" />

            <button class="btn btn-primary" id="create-room-btn">🎮 Create Room</button>
            <div class="divider">— or join —</div>
            <input type="text" id="room-code-input" placeholder="Room code (e.g. ABC123)" maxlength="6" style="text-transform:uppercase" autocomplete="off" />
            <button class="btn btn-secondary" id="join-room-btn">🚪 Join Room</button>

            <div class="divider" style="margin-top:18px">— public rooms —</div>
            <div id="room-list"><p style="color:#4a5568;font-size:13px;text-align:center">Loading rooms<span class="loading-dots"></span></p></div>

            <button class="btn btn-secondary" id="solo-btn" style="margin-top:6px;font-size:13px">🤖 Play Solo (offline)</button>
        </div>
    `;
    document.body.appendChild(container);
    return container;
}

function buildWaitingRoomHTML() {
    const el = document.createElement('div');
    el.id = 'waiting-room';
    el.innerHTML = `
        <h2>Waiting Room</h2>
        <div class="room-code" id="wr-code">------</div>
        <div class="player-list">
            <h3>Players (<span id="wr-count">0</span>/${MAX_PLAYERS})</h3>
            <div id="wr-player-list"></div>
        </div>
        <button class="btn btn-primary" id="wr-start-btn" style="width:260px;display:none">▶ Start Game</button>
        <p id="wr-waiting-msg" style="color:#a0aec0;font-size:14px">Waiting for host to start...</p>
        <button class="btn btn-secondary" id="wr-leave-btn" style="width:260px;margin-top:10px">← Leave Room</button>
    `;
    document.body.appendChild(el);
    return el;
}

function buildHUDHTML() {
    const el = document.createElement('div');
    el.id = 'hud';
    el.innerHTML = `
        <div id="score-display">
            <div class="label">Stupid Dudes in Pen</div>
            <div class="score-val"><span id="score-val">0</span></div>
            <div style="margin-top:6px;background:rgba(255,255,255,0.1);border-radius:99px;height:6px;width:160px">
                <div id="hunter-progress" style="height:100%;border-radius:99px;background:linear-gradient(90deg,#e94560,#f5a623);width:0%;transition:width 0.5s"></div>
            </div>
            <div id="hunter-progress-label" class="score-sub">0 / 10 to Hunt</div>
        </div>

        <div id="carry-display">
            <div class="carry-slot"></div>
            <div class="carry-slot"></div>
            <div class="carry-slot"></div>
            <div class="carry-slot"></div>
        </div>

        <div id="pen-indicator">🏠 Pen nearby</div>

        <div id="leaderboard">
            <h4>🏆 Leaderboard</h4>
            <div id="lb-rows"></div>
        </div>

        <div id="hunter-banner">
            <div class="hunter-title">🔥 HUNTER!</div>
            <div class="hunter-sub">You can now tag other players!</div>
        </div>

        <div id="status-bar">
            Phase: <span class="phase-label" id="phase-label">Collecting</span>
        </div>

        <div id="zone-warning"></div>
        <div id="crosshair"></div>
    `;
    document.body.appendChild(el);
    return el;
}

function buildGameOverHTML() {
    const el = document.createElement('div');
    el.id = 'game-over';
    el.innerHTML = `
        <h1 id="go-title">👑 WINNER!</h1>
        <p class="result-sub" id="go-sub">Last Stupid Dude Standing</p>
        <div class="final-score">Score: <span id="go-score">0</span></div>
        <button class="btn btn-primary" id="go-rematch-btn" style="width:240px">🔄 Play Again</button>
        <button class="btn btn-secondary" id="go-menu-btn" style="width:240px">🏠 Main Menu</button>
    `;
    document.body.appendChild(el);
    return el;
}

function buildNotifContainerHTML() {
    const el = document.createElement('div');
    el.id = 'notif-container';
    document.body.appendChild(el);
    return el;
}

// ─── ROOM MANAGEMENT ──────────────────────────────────────────────────────────
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function createRoom() {
    const name = getPlayerName();
    if (!name) return;

    const code = generateRoomCode();
    const roomData = {
        code,
        status: 'waiting',
        hostId: firebaseReady ? currentUser.uid : 'local',
        hostName: name,
        maxPlayers: MAX_PLAYERS,
        createdAt: firebaseReady ? firebase.firestore.FieldValue.serverTimestamp() : Date.now(),
        isPublic: true,
        settings: { hunterThreshold: HUNTER_THRESHOLD, gameDuration: 180 },
        players: {
            [firebaseReady ? currentUser.uid : 'local']: {
                name, score: 0, isHunter: false, isAlive: true, joinedAt: Date.now()
            }
        }
    };

    currentRoomId = code;
    isHost = true;

    if (firebaseReady) {
        await db.collection('rooms').doc(code).set(roomData);
        listenToRoom(code);
    } else {
        // Offline solo — go straight in
        window._offlineRoom = roomData;
        showWaitingRoom(roomData, code);
    }
}

async function joinRoom(code) {
    code = code.trim().toUpperCase();
    if (!code) { alert('Enter a room code!'); return; }
    const name = getPlayerName();
    if (!name) return;

    if (!firebaseReady) { alert('No Firebase connection. Play Solo instead.'); return; }

    const ref = db.collection('rooms').doc(code);
    const snap = await ref.get();
    if (!snap.exists) { alert('Room not found: ' + code); return; }
    const data = snap.data();
    if (data.status !== 'waiting') { alert('Game already started!'); return; }
    if (Object.keys(data.players || {}).length >= MAX_PLAYERS) { alert('Room is full!'); return; }

    await ref.update({
        ['players.' + currentUser.uid]: { name, score: 0, isHunter: false, isAlive: true, joinedAt: Date.now() }
    });

    currentRoomId = code;
    isHost = false;
    listenToRoom(code);
}

function listenToRoom(code) {
    if (!firebaseReady) return;
    const ref = db.collection('rooms').doc(code);
    ref.onSnapshot(snap => {
        if (!snap.exists) return;
        const data = snap.data();
        showWaitingRoom(data, code);
        if (data.status === 'playing') startGameFromLobby(data);
    });
}

function showWaitingRoom(data, code) {
    const lobbyUI = document.getElementById('lobby-ui');
    const waitingRoom = document.getElementById('waiting-room');
    if (lobbyUI) lobbyUI.style.display = 'none';
    if (waitingRoom) {
        waitingRoom.style.display = 'flex';
        document.getElementById('wr-code').textContent = code;

        const players = data.players || {};
        const count = Object.keys(players).length;
        document.getElementById('wr-count').textContent = count;

        const listEl = document.getElementById('wr-player-list');
        listEl.innerHTML = '';
        const myId = firebaseReady ? currentUser.uid : 'local';
        Object.entries(players).forEach(([uid, p], i) => {
            const isMe = uid === myId;
            const isH = uid === data.hostId;
            const slot = document.createElement('div');
            slot.className = 'player-slot';
            slot.innerHTML = `
                <div class="player-avatar" style="background:${PLAYER_COLORS[i % PLAYER_COLORS.length]}">${(p.name||'?')[0].toUpperCase()}</div>
                <span class="player-name">${p.name}${isMe ? ' (You)' : ''}</span>
                ${isH ? '<span class="host-badge">HOST</span>' : ''}
            `;
            listEl.appendChild(slot);
        });

        const startBtn = document.getElementById('wr-start-btn');
        const waitMsg  = document.getElementById('wr-waiting-msg');
        if (isHost) {
            startBtn.style.display = 'block';
            waitMsg.style.display = 'none';
            startBtn.disabled = count < MIN_TO_START;
            startBtn.textContent = count < MIN_TO_START
                ? `Waiting for ${MIN_TO_START - count} more player(s)...`
                : '▶ Start Game (' + count + ' players)';
        }
    }
}

async function startGameFromLobby(data) {
    const waitingRoom = document.getElementById('waiting-room');
    if (waitingRoom) waitingRoom.style.display = 'none';

    // Show HUD
    const hud = document.getElementById('hud');
    if (hud) hud.style.display = 'block';

    // Set up Firebase real-time sync
    if (firebaseReady && currentRoomId) {
        setupRealtimeSync();
    }
}

function setupRealtimeSync() {
    if (!firebaseReady || !currentRoomId) return;
    const myId = currentUser.uid;
    const posRef = rtdb.ref('rooms/' + currentRoomId + '/positions/' + myId);
    const playersRef = rtdb.ref('rooms/' + currentRoomId + '/positions');

    // Sync my position every 100ms
    setInterval(() => {
        const player = window.pc && pc.app ? pc.app.root.findByName('Character Controller') : null;
        if (!player) return;
        const pos = player.getPosition();
        posRef.set({ x: pos.x, y: pos.y, z: pos.z, t: Date.now() });
    }, 100);

    // Sync score
    window.SD_syncScore = (score, isHunter, isAlive) => {
        if (!firebaseReady) return;
        db.collection('rooms').doc(currentRoomId).update({
            ['players.' + myId + '.score']: score,
            ['players.' + myId + '.isHunter']: isHunter,
            ['players.' + myId + '.isAlive']: isAlive,
        });
    };

    // Listen to all players
    playersRef.on('value', snap => {
        window.SD_remotePlayers = snap.val() || {};
    });

    // Listen for game over
    db.collection('rooms').doc(currentRoomId).onSnapshot(snap => {
        const data = snap.data();
        if (data && data.status === 'finished') {
            showGameOver(data.winnerId === myId, data.finalScores);
        }
    });
}

function showGameOver(isWinner, scores) {
    const hud = document.getElementById('hud');
    if (hud) hud.style.display = 'none';
    const go = document.getElementById('game-over');
    if (go) {
        go.style.display = 'flex';
        document.getElementById('go-title').textContent = isWinner ? '👑 YOU WIN!' : '💀 GAME OVER';
        document.getElementById('go-sub').textContent = isWinner ? 'Last Stupid Dude Standing!' : 'Better luck next time!';
    }
}

function loadPublicRooms() {
    if (!firebaseReady) {
        const listEl = document.getElementById('room-list');
        if (listEl) listEl.innerHTML = '<p style="color:#4a5568;font-size:13px;text-align:center">Connect Firebase to see rooms</p>';
        return;
    }
    db.collection('rooms').where('status', '==', 'waiting').where('isPublic', '==', true)
        .orderBy('createdAt', 'desc').limit(6)
        .onSnapshot(snap => {
            const listEl = document.getElementById('room-list');
            if (!listEl) return;
            if (snap.empty) {
                listEl.innerHTML = '<p style="color:#4a5568;font-size:13px;text-align:center">No open rooms — create one!</p>';
                return;
            }
            listEl.innerHTML = '';
            snap.forEach(doc => {
                const d = doc.data();
                const count = Object.keys(d.players || {}).length;
                const item = document.createElement('div');
                item.className = 'room-item';
                item.innerHTML = `
                    <div>
                        <div class="room-name">${d.hostName || 'Unknown'}'s Room</div>
                        <div class="room-meta">${count}/${d.maxPlayers} players · ${d.code}</div>
                    </div>
                    <button class="room-join-btn">Join</button>
                `;
                item.querySelector('.room-join-btn').onclick = () => {
                    document.getElementById('room-code-input').value = d.code;
                    joinRoom(d.code);
                };
                listEl.appendChild(item);
            });
        });
}

function getPlayerName() {
    const inp = document.getElementById('player-name-input');
    const name = inp ? inp.value.trim() : '';
    if (!name) { inp && (inp.style.borderColor = '#e94560'); alert('Enter a nickname first!'); return null; }
    localPlayerName = name;
    return name;
}

// ─── BOOTSTRAP ────────────────────────────────────────────────────────────────
window.addEventListener('load', async () => {
    // Build all UI
    buildLobbyHTML();
    buildWaitingRoomHTML();
    buildHUDHTML();
    buildGameOverHTML();
    buildNotifContainerHTML();

    // Init Firebase
    await initFirebase();
    loadPublicRooms();

    // Wire up buttons
    document.getElementById('create-room-btn').addEventListener('click', createRoom);
    document.getElementById('join-room-btn').addEventListener('click', () => {
        joinRoom(document.getElementById('room-code-input').value);
    });
    document.getElementById('solo-btn').addEventListener('click', () => {
        const name = getPlayerName();
        if (!name) return;
        document.getElementById('lobby-ui').style.display = 'none';
        const hud = document.getElementById('hud');
        if (hud) hud.style.display = 'block';
        window.SD_syncScore = () => {}; // noop for solo
    });

    // Waiting room buttons
    document.getElementById('wr-start-btn').addEventListener('click', async () => {
        if (!isHost || !currentRoomId) return;
        if (firebaseReady) {
            await db.collection('rooms').doc(currentRoomId).update({ status: 'playing', startedAt: firebase.firestore.FieldValue.serverTimestamp() });
        } else {
            document.getElementById('waiting-room').style.display = 'none';
            document.getElementById('hud').style.display = 'block';
        }
    });
    document.getElementById('wr-leave-btn').addEventListener('click', () => {
        if (firebaseReady && currentRoomId && currentUser) {
            db.collection('rooms').doc(currentRoomId).update({
                ['players.' + currentUser.uid]: firebase.firestore.FieldValue.delete()
            });
        }
        document.getElementById('waiting-room').style.display = 'none';
        document.getElementById('lobby-ui').style.display = 'flex';
        currentRoomId = null;
        isHost = false;
    });

    document.getElementById('go-menu-btn').addEventListener('click', () => {
        document.getElementById('game-over').style.display = 'none';
        document.getElementById('lobby-ui').style.display = 'flex';
    });
    document.getElementById('go-rematch-btn').addEventListener('click', () => {
        document.getElementById('game-over').style.display = 'none';
        if (currentRoomId && firebaseReady) {
            joinRoom(currentRoomId);
        } else {
            document.getElementById('lobby-ui').style.display = 'flex';
        }
    });

    // Room code input uppercase
    const rcInput = document.getElementById('room-code-input');
    if (rcInput) rcInput.addEventListener('input', () => { rcInput.value = rcInput.value.toUpperCase(); });
});

const PLAYER_COLORS = ['#e94560','#3490dc','#f5a623','#38a169','#9b59b6','#1abc9c','#e67e22','#2980b9'];
