// ═══════════════════════════════════════════════════════════════════════════════
//  STUPID DUDES — Lobby (Firebase optional, Solo always works)
// ═══════════════════════════════════════════════════════════════════════════════

var FIREBASE_CONFIG = {
    apiKey:            "YOUR_API_KEY",
    authDomain:        "YOUR_PROJECT.firebaseapp.com",
    databaseURL:       "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
    projectId:         "YOUR_PROJECT",
    storageBucket:     "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId:             "YOUR_APP_ID"
};

var MAX_PLAYERS  = 8;
var MIN_TO_START = 2;
var PLAYER_COLORS = ['#e94560','#3490dc','#f5a623','#38a169','#9b59b6','#1abc9c','#e67e22','#2980b9'];

var firebaseReady  = false;
var currentRoomId  = null;
var isHost         = false;
var currentUser    = null;
var db = null, rtdb = null, auth = null;

// ─── Build Lobby HTML ─────────────────────────────────────────────────────────
function buildLobby() {
    var div = document.createElement('div');
    div.id = 'lobby-ui';
    div.innerHTML = [
        '<h1>Stupid Dudes</h1>',
        '<p class="subtitle">Grab \'em. Pen \'em. Hunt \'em.</p>',
        '<div class="lobby-card">',
        '  <input type="text" id="player-name-input" placeholder="Your nickname" maxlength="16" autocomplete="off"/>',
        '  <button class="btn btn-primary" id="solo-btn">🎮 Play Solo (Offline)</button>',
        '  <div class="divider" style="margin:14px 0">— or play online —</div>',
        '  <button class="btn btn-secondary" id="create-room-btn">🌐 Create Online Room</button>',
        '  <input type="text" id="room-code-input" placeholder="Room code (e.g. ABC123)" maxlength="6" style="text-transform:uppercase;margin-top:10px" autocomplete="off"/>',
        '  <button class="btn btn-secondary" id="join-room-btn">🚪 Join Room</button>',
        '  <div class="divider" style="margin-top:14px">— public rooms —</div>',
        '  <div id="room-list"><p style="color:#4a5568;font-size:13px;text-align:center">Connect Firebase to see rooms</p></div>',
        '</div>'
    ].join('');
    document.body.appendChild(div);
}

function buildWaitingRoom() {
    var div = document.createElement('div');
    div.id = 'waiting-room';
    div.innerHTML = [
        '<h2>Waiting Room</h2>',
        '<div class="room-code" id="wr-code">------</div>',
        '<div class="player-list">',
        '  <h3>Players (<span id="wr-count">1</span>/' + MAX_PLAYERS + ')</h3>',
        '  <div id="wr-player-list"></div>',
        '</div>',
        '<button class="btn btn-primary" id="wr-start-btn" style="width:260px;display:none">▶ Start Game</button>',
        '<p id="wr-waiting-msg" style="color:#a0aec0;font-size:14px">Waiting for host to start...</p>',
        '<button class="btn btn-secondary" id="wr-leave-btn" style="width:260px;margin-top:10px">← Leave Room</button>'
    ].join('');
    document.body.appendChild(div);
}

function getPlayerName() {
    var inp = document.getElementById('player-name-input');
    var name = inp ? inp.value.trim() : '';
    if (!name) {
        if (inp) inp.style.borderColor = '#e94560';
        alert('Enter a nickname first!');
        return null;
    }
    return name;
}

function startSolo() {
    var name = getPlayerName();
    if (!name) return;
    window.SD_syncScore = function(){};
    window.SD_remotePlayers = {};
    document.getElementById('lobby-ui').style.display = 'none';
    // HUD will be built by GameManager when scene loads
}

// ─── Firebase ─────────────────────────────────────────────────────────────────
function loadScript(src, cb) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = cb;
    s.onerror = cb; // continue even on failure
    document.head.appendChild(s);
}

function initFirebase() {
    if (FIREBASE_CONFIG.apiKey === 'YOUR_API_KEY') { return; } // not configured
    loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js', function() {
    loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js', function() {
    loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js', function() {
    loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-database-compat.js', function() {
        try {
            firebase.initializeApp(FIREBASE_CONFIG);
            auth = firebase.auth();
            db   = firebase.firestore();
            rtdb = firebase.database();
            auth.signInAnonymously().then(function(cred) {
                currentUser = cred.user;
                firebaseReady = true;
                loadPublicRooms();
                console.log('[Firebase] Ready, uid:', currentUser.uid);
            }).catch(function(e){ console.warn('[Firebase] Auth failed:', e.message); });
        } catch(e) { console.warn('[Firebase] Init failed:', e.message); }
    });});});});
}

function generateCode() {
    return Math.random().toString(36).substring(2,8).toUpperCase();
}

function createRoom() {
    var name = getPlayerName();
    if (!name) return;
    if (!firebaseReady) { alert('Firebase not configured. Use Play Solo instead.'); return; }
    var code = generateCode();
    var uid  = currentUser.uid;
    db.collection('rooms').doc(code).set({
        code: code, status: 'waiting', hostId: uid, hostName: name,
        maxPlayers: MAX_PLAYERS, isPublic: true,
        settings: { hunterThreshold: 10 },
        players: {}
    }).then(function() {
        return db.collection('rooms').doc(code).update({ ['players.' + uid]: { name: name, score: 0, isHunter: false, isAlive: true } });
    }).then(function() {
        currentRoomId = code; isHost = true;
        listenRoom(code);
    }).catch(function(e){ alert('Error: ' + e.message); });
}

function joinRoom(code) {
    code = (code || '').trim().toUpperCase();
    if (!code) { alert('Enter a room code!'); return; }
    var name = getPlayerName();
    if (!name) return;
    if (!firebaseReady) { alert('Firebase not configured. Use Play Solo instead.'); return; }
    var uid = currentUser.uid;
    db.collection('rooms').doc(code).get().then(function(snap) {
        if (!snap.exists) { alert('Room ' + code + ' not found.'); return; }
        var d = snap.data();
        if (d.status !== 'waiting') { alert('Game already started!'); return; }
        if (Object.keys(d.players||{}).length >= MAX_PLAYERS) { alert('Room full!'); return; }
        return db.collection('rooms').doc(code).update({ ['players.' + uid]: { name: name, score: 0, isHunter: false, isAlive: true } });
    }).then(function() {
        if (!currentRoomId) { currentRoomId = code; isHost = false; listenRoom(code); }
    }).catch(function(e){ if(e) alert('Error: ' + e.message); });
}

function listenRoom(code) {
    db.collection('rooms').doc(code).onSnapshot(function(snap) {
        if (!snap.exists) return;
        var d = snap.data();
        showWaitingRoom(d, code);
        if (d.status === 'playing') { enterGame(); }
    });
}

function showWaitingRoom(data, code) {
    document.getElementById('lobby-ui').style.display = 'none';
    var wr = document.getElementById('waiting-room');
    wr.style.display = 'flex';
    document.getElementById('wr-code').textContent = code;
    var players = data.players || {};
    var pkeys   = Object.keys(players);
    document.getElementById('wr-count').textContent = pkeys.length;
    var list = document.getElementById('wr-player-list');
    list.innerHTML = '';
    pkeys.forEach(function(uid, i) {
        var p = players[uid];
        var isMe = uid === currentUser.uid;
        var isH  = uid === data.hostId;
        var slot = document.createElement('div');
        slot.className = 'player-slot';
        slot.innerHTML = '<div class="player-avatar" style="background:' + PLAYER_COLORS[i%PLAYER_COLORS.length] + '">' + (p.name||'?')[0].toUpperCase() + '</div>' +
            '<span class="player-name">' + (p.name||'?') + (isMe?' (You)':'') + '</span>' +
            (isH ? '<span class="host-badge">HOST</span>' : '');
        list.appendChild(slot);
    });
    var startBtn = document.getElementById('wr-start-btn');
    var waitMsg  = document.getElementById('wr-waiting-msg');
    if (isHost) {
        startBtn.style.display = 'block'; waitMsg.style.display = 'none';
        startBtn.disabled = pkeys.length < MIN_TO_START;
        startBtn.textContent = pkeys.length < MIN_TO_START ? 'Waiting for ' + (MIN_TO_START - pkeys.length) + ' more...' : '▶ Start (' + pkeys.length + ' players)';
    }
}

function enterGame() {
    window.SD_syncScore = function(score, isHunter, alive) {
        if (!firebaseReady || !currentRoomId || !currentUser) return;
        var uid = currentUser.uid;
        db.collection('rooms').doc(currentRoomId).update({
            ['players.' + uid + '.score']: score,
            ['players.' + uid + '.isHunter']: isHunter,
            ['players.' + uid + '.isAlive']: alive
        });
    };
    if (rtdb && currentRoomId && currentUser) {
        var posRef = rtdb.ref('rooms/' + currentRoomId + '/pos/' + currentUser.uid);
        setInterval(function() {
            if (!window.pc || !pc.app) return;
            var pl = pc.app.root.findByName('Character Controller');
            if (!pl) return;
            var p = pl.getPosition();
            posRef.set({ x: Math.round(p.x*10)/10, y: Math.round(p.y*10)/10, z: Math.round(p.z*10)/10 });
        }, 150);
        rtdb.ref('rooms/' + currentRoomId + '/pos').on('value', function(snap) {
            window.SD_remotePlayers = snap.val() || {};
        });
    }
    document.getElementById('waiting-room').style.display = 'none';
    // HUD is built by GameManager
}

function loadPublicRooms() {
    if (!firebaseReady) return;
    var listEl = document.getElementById('room-list');
    db.collection('rooms').where('status','==','waiting').where('isPublic','==',true)
      .orderBy('createdAt','desc').limit(5)
      .onSnapshot(function(snap) {
        if (!listEl) return;
        if (snap.empty) { listEl.innerHTML = '<p style="color:#4a5568;font-size:13px;text-align:center">No open rooms — create one!</p>'; return; }
        listEl.innerHTML = '';
        snap.forEach(function(doc) {
            var d = doc.data();
            var cnt = Object.keys(d.players||{}).length;
            var item = document.createElement('div'); item.className = 'room-item';
            item.innerHTML = '<div><div class="room-name">' + (d.hostName||'?') + "'s Room</div><div class='room-meta'>" + cnt + '/' + d.maxPlayers + ' · ' + d.code + '</div></div><button class="room-join-btn">Join</button>';
            item.querySelector('.room-join-btn').onclick = function() {
                document.getElementById('room-code-input').value = d.code;
                joinRoom(d.code);
            };
            listEl.appendChild(item);
        });
    });
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────
window.addEventListener('load', function() {
    buildLobby();
    buildWaitingRoom();

    document.getElementById('solo-btn').addEventListener('click', startSolo);
    document.getElementById('create-room-btn').addEventListener('click', createRoom);
    document.getElementById('join-room-btn').addEventListener('click', function() {
        joinRoom(document.getElementById('room-code-input').value);
    });
    document.getElementById('room-code-input').addEventListener('input', function() {
        this.value = this.value.toUpperCase();
    });

    // Waiting room buttons (added after buildWaitingRoom)
    document.getElementById('wr-start-btn').addEventListener('click', function() {
        if (!isHost || !currentRoomId || !firebaseReady) return;
        db.collection('rooms').doc(currentRoomId).update({ status: 'playing' });
    });
    document.getElementById('wr-leave-btn').addEventListener('click', function() {
        if (firebaseReady && currentRoomId && currentUser) {
            db.collection('rooms').doc(currentRoomId).update({
                ['players.' + currentUser.uid]: firebase.firestore.FieldValue.delete()
            });
        }
        document.getElementById('waiting-room').style.display = 'none';
        document.getElementById('lobby-ui').style.display = 'flex';
        currentRoomId = null; isHost = false;
    });

    initFirebase();
});
