// ═══════════════════════════════════════════════════════════════════════════════
//  STUPID DUDES — Game Scripts (Fixed)
// ═══════════════════════════════════════════════════════════════════════════════

'use strict';

// ───────────────────────────────────────────────────────────────────────────────
//  VIRTUAL JOYSTICK
// ───────────────────────────────────────────────────────────────────────────────
var VirtualJoystickScript = pc.createScript('virtualJoystick');
VirtualJoystickScript.attributes.add('stick',         { type: 'entity' });
VirtualJoystickScript.attributes.add('enableEvent',   { type: 'string' });
VirtualJoystickScript.attributes.add('moveEvent',     { type: 'string' });
VirtualJoystickScript.attributes.add('disableEvent',  { type: 'string' });

VirtualJoystickScript.prototype.initialize = function () {
    var entity = this.entity;
    var stick  = this.stick;
    this.app.on(this.enableEvent, function (x, y) {
        entity.setLocalPosition(x, -y, 0);
        stick.setLocalPosition(x, -y, 0);
        entity.element.enabled = true;
        stick.element.enabled  = true;
    });
    this.app.on(this.moveEvent, function (x, y) {
        stick.setLocalPosition(x, -y, 0);
    });
    this.app.on(this.disableEvent, function () {
        entity.element.enabled = false;
        stick.element.enabled  = false;
    });
};

// ───────────────────────────────────────────────────────────────────────────────
//  DESKTOP INPUT
// ───────────────────────────────────────────────────────────────────────────────
var DesktopInputScript = pc.createScript('desktopInput');

DesktopInputScript.prototype.initialize = function () {
    this._canvas = this.app.graphicsDevice.canvas;
    this._onKeyDown   = this._onKeyDown.bind(this);
    this._onKeyUp     = this._onKeyUp.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    window.addEventListener('keydown',   this._onKeyDown);
    window.addEventListener('keyup',     this._onKeyUp);
    window.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mousemove', this._onMouseMove);
    this.on('destroy', function () {
        window.removeEventListener('keydown',   this._onKeyDown);
        window.removeEventListener('keyup',     this._onKeyUp);
        window.removeEventListener('mousedown', this._onMouseDown);
        window.removeEventListener('mousemove', this._onMouseMove);
    }, this);
};

DesktopInputScript.prototype._fire = function (key, val) {
    switch (key.toLowerCase()) {
        case 'w': case 'arrowup':    this.app.fire('cc:move:forward',  val); break;
        case 's': case 'arrowdown':  this.app.fire('cc:move:backward', val); break;
        case 'a': case 'arrowleft':  this.app.fire('cc:move:left',     val); break;
        case 'd': case 'arrowright': this.app.fire('cc:move:right',    val); break;
        case ' ':     this.app.fire('cc:jump',   !!val); break;
        case 'shift': this.app.fire('cc:sprint', !!val); break;
        case 'e':     if (val) this.app.fire('cc:grab');    break;
        case 'f':     if (val) this.app.fire('cc:deposit'); break;
    }
};
DesktopInputScript.prototype._onKeyDown = function (e) {
    if (document.pointerLockElement !== this._canvas) return;
    if (!e.repeat) this._fire(e.key, 1);
};
DesktopInputScript.prototype._onKeyUp = function (e) {
    if (!e.repeat) this._fire(e.key, 0);
};
DesktopInputScript.prototype._onMouseDown = function (e) {
    if (document.pointerLockElement !== this._canvas) {
        this._canvas.requestPointerLock();
    } else if (e.button === 0) {
        this.app.fire('cc:grab');
    }
};
DesktopInputScript.prototype._onMouseMove = function (e) {
    if (document.pointerLockElement !== this._canvas) return;
    this.app.fire('cc:look', e.movementX || 0, e.movementY || 0);
};

// ───────────────────────────────────────────────────────────────────────────────
//  MOBILE INPUT
// ───────────────────────────────────────────────────────────────────────────────
var MobileInputScript = pc.createScript('mobileInput');
MobileInputScript.attributes.add('deadZone',           { type: 'number', default: 0.3 });
MobileInputScript.attributes.add('turnSpeed',          { type: 'number', default: 30 });
MobileInputScript.attributes.add('radius',             { type: 'number', default: 50 });
MobileInputScript.attributes.add('_doubleTapInterval', { type: 'number', default: 300 });

MobileInputScript.prototype.initialize = function () {
    this._canvas = this.app.graphicsDevice.canvas;
    this._device = this.app.graphicsDevice;
    this._L = { id: -1, cx: 0, cy: 0, px: 0, py: 0 };
    this._R = { id: -1, cx: 0, cy: 0, px: 0, py: 0 };
    this._lastTap = 0;
    this._onTS = this._onTouchStart.bind(this);
    this._onTM = this._onTouchMove.bind(this);
    this._onTE = this._onTouchEnd.bind(this);
    this._canvas.addEventListener('touchstart', this._onTS, false);
    this._canvas.addEventListener('touchmove',  this._onTM, false);
    this._canvas.addEventListener('touchend',   this._onTE, false);
    this.on('destroy', function () {
        this._canvas.removeEventListener('touchstart', this._onTS, false);
        this._canvas.removeEventListener('touchmove',  this._onTM, false);
        this._canvas.removeEventListener('touchend',   this._onTE, false);
    }, this);
};
MobileInputScript.prototype._onTouchStart = function (e) {
    e.preventDefault();
    var sx = this._device.width / this._canvas.clientWidth;
    var sy = this._device.height / this._canvas.clientHeight;
    for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        if (t.pageX <= this._canvas.clientWidth / 2 && this._L.id === -1) {
            this._L.id = t.identifier; this._L.cx = t.pageX; this._L.cy = t.pageY;
            this._L.px = 0; this._L.py = 0;
            this.app.fire('leftjoystick:enable', t.pageX * sx, t.pageY * sy);
        } else if (t.pageX > this._canvas.clientWidth / 2 && this._R.id === -1) {
            this._R.id = t.identifier; this._R.cx = t.pageX; this._R.cy = t.pageY;
            var now = Date.now();
            if (now - this._lastTap < this._doubleTapInterval) {
                this.app.fire('cc:jump', true);
                var self = this;
                setTimeout(function () { self.app.fire('cc:jump', false); }, 50);
            }
            this._lastTap = now;
            this.app.fire('rightjoystick:enable', t.pageX * sx, t.pageY * sy);
        }
    }
};
MobileInputScript.prototype._onTouchMove = function (e) {
    e.preventDefault();
    var sx = this._device.width / this._canvas.clientWidth;
    var sy = this._device.height / this._canvas.clientHeight;
    for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        if (t.identifier === this._L.id) {
            this._L.px = (t.pageX - this._L.cx) / this.radius;
            this._L.py = (t.pageY - this._L.cy) / this.radius;
            this.app.fire('leftjoystick:move', t.pageX * sx, t.pageY * sy);
        } else if (t.identifier === this._R.id) {
            this._R.px = (t.pageX - this._R.cx) / this.radius;
            this._R.py = (t.pageY - this._R.cy) / this.radius;
            this.app.fire('rightjoystick:move', t.pageX * sx, t.pageY * sy);
        }
    }
};
MobileInputScript.prototype._onTouchEnd = function (e) {
    e.preventDefault();
    for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        if (t.identifier === this._L.id) {
            this._L.id = -1;
            this.app.fire('cc:move:forward', 0); this.app.fire('cc:move:backward', 0);
            this.app.fire('cc:move:left', 0);    this.app.fire('cc:move:right', 0);
            this.app.fire('leftjoystick:disable');
        } else if (t.identifier === this._R.id) {
            this._R.id = -1;
            this.app.fire('rightjoystick:disable');
        }
    }
};
MobileInputScript.prototype.update = function (dt) {
    var dz = this.deadZone;
    if (this._L.id !== -1) {
        var lx = this._L.px, ly = this._L.py;
        var ll = Math.sqrt(lx*lx + ly*ly);
        if (ll > dz) { var lt = Math.min(1,(ll-dz)/(1-dz)); lx=(lx/ll)*lt; ly=(ly/ll)*lt; }
        else { lx=0; ly=0; }
        var fwd = -ly;
        if (fwd > 0) { this.app.fire('cc:move:forward',Math.abs(fwd)); this.app.fire('cc:move:backward',0); }
        else if (fwd < 0) { this.app.fire('cc:move:forward',0); this.app.fire('cc:move:backward',Math.abs(fwd)); }
        else { this.app.fire('cc:move:forward',0); this.app.fire('cc:move:backward',0); }
        if (lx > 0) { this.app.fire('cc:move:right',Math.abs(lx)); this.app.fire('cc:move:left',0); }
        else if (lx < 0) { this.app.fire('cc:move:right',0); this.app.fire('cc:move:left',Math.abs(lx)); }
        else { this.app.fire('cc:move:right',0); this.app.fire('cc:move:left',0); }
    }
    if (this._R.id !== -1) {
        this.app.fire('cc:look', this._R.px * this.turnSpeed, this._R.py * this.turnSpeed);
    }
};

// ───────────────────────────────────────────────────────────────────────────────
//  CHARACTER CONTROLLER
// ───────────────────────────────────────────────────────────────────────────────
var CCScript = pc.createScript('character-controller');
CCScript.attributes.add('camera',                { type: 'entity' });
CCScript.attributes.add('lookSens',              { type: 'number', default: 0.08 });
CCScript.attributes.add('speedGround',           { type: 'number', default: 40 });
CCScript.attributes.add('speedAir',              { type: 'number', default: 5 });
CCScript.attributes.add('sprintMult',            { type: 'number', default: 1.5 });
CCScript.attributes.add('velocityDampingGround', { type: 'number', default: 0.99 });
CCScript.attributes.add('velocityDampingAir',    { type: 'number', default: 0.99925 });
CCScript.attributes.add('jumpForce',             { type: 'number', default: 700 });

CCScript.prototype.initialize = function () {
    this._lx = 0; this._ly = 0;
    this._fwd = 0; this._bwd = 0; this._lft = 0; this._rgt = 0;
    this._jump = false; this._sprint = false;
    this._grounded = false; this._jumping = false;
    this._tmpV = new pc.Vec3();
    this._tmpM = new pc.Mat4();
    this.app.on('cc:look',          function (x, y) {
        this._lx = pc.math.clamp(this._lx - y * this.lookSens, -89, 89);
        this._ly -= x * this.lookSens;
    }, this);
    this.app.on('cc:move:forward',  function (v) { this._fwd = v; }, this);
    this.app.on('cc:move:backward', function (v) { this._bwd = v; }, this);
    this.app.on('cc:move:left',     function (v) { this._lft = v; }, this);
    this.app.on('cc:move:right',    function (v) { this._rgt = v; }, this);
    this.app.on('cc:jump',   function (v) { this._jump   = v; }, this);
    this.app.on('cc:sprint', function (v) { this._sprint = v; }, this);
};

CCScript.prototype.update = function (dt) {
    // Grounded check
    var pos   = this.entity.getPosition();
    var below = new pc.Vec3(pos.x, pos.y - 1.2, pos.z);
    this._grounded = !!this.entity.rigidbody.system.raycastFirst(pos, below);

    // Jump
    if (this._jump && this._grounded && !this._jumping) {
        this._jumping = true;
        var self = this;
        setTimeout(function () { self._jumping = false; }, 300);
        this.entity.rigidbody.applyImpulse(0, this.jumpForce, 0);
    }

    // Look
    this.camera.setLocalEulerAngles(this._lx, this._ly, 0);

    // Move
    this._tmpM.setFromAxisAngle(pc.Vec3.UP, this._ly);
    var dir = this._tmpV;
    dir.set(0, 0, 0);
    if (this._fwd) dir.z -= this._fwd;
    if (this._bwd) dir.z += this._bwd;
    if (this._lft) dir.x -= this._lft;
    if (this._rgt) dir.x += this._rgt;
    this._tmpM.transformVector(dir, dir);

    var carry = window.SD_carryCount || 0;
    var speed = (this._grounded ? this.speedGround : this.speedAir) * (1 - carry * 0.10);
    if (this._sprint) speed *= this.sprintMult;

    var vel = this.entity.rigidbody.linearVelocity;
    vel.x += dir.x * speed * dt;
    vel.z += dir.z * speed * dt;
    var damp = Math.pow(this._grounded ? this.velocityDampingGround : this.velocityDampingAir, 1000 * dt);
    vel.x *= damp; vel.z *= damp;
    this.entity.rigidbody.linearVelocity = vel;
};

// ───────────────────────────────────────────────────────────────────────────────
//  ADD COLLIDER
// ───────────────────────────────────────────────────────────────────────────────
var AddCollider = pc.createScript('add-collider');
AddCollider.prototype.initialize = function () {
    var renders = this.entity.findComponents('render');
    for (var i = 0; i < renders.length; i++) {
        var r = renders[i];
        var e = r.entity;
        e.addComponent('rigidbody', { type: 'static' });
        e.addComponent('collision', { type: 'mesh', renderAsset: r.asset });
    }
};

// ───────────────────────────────────────────────────────────────────────────────
//  STUPID DUDE NPC
// ───────────────────────────────────────────────────────────────────────────────
var StupidDudeScript = pc.createScript('stupidDue');

StupidDudeScript.prototype.initialize = function () {
    this._grabbed  = false;
    this.fleeTimer = 0;
    this.idleTimer = Math.random() * 3;
    this.bobTime   = Math.random() * Math.PI * 2;
    this.baseY     = this.entity.getPosition().y;
    this.fleeSpeed = 5 + Math.random() * 4;
    this.wanderX   = Math.random() - 0.5;
    this.wanderZ   = Math.random() - 0.5;
    var wl = Math.sqrt(this.wanderX*this.wanderX + this.wanderZ*this.wanderZ) || 1;
    this.wanderX /= wl; this.wanderZ /= wl;
};

StupidDudeScript.prototype.update = function (dt) {
    if (this._grabbed) return;

    this.bobTime += dt * 2.5;
    var euler = this.entity.getLocalEulerAngles();
    this.entity.setLocalEulerAngles(euler.x, euler.y + 90 * dt, euler.z);

    var pos = this.entity.getPosition();
    var player = this.app.root.findByName('Character Controller');

    var fleeing = this.fleeTimer > 0;
    if (player) {
        var pp = player.getPosition();
        var dx = pos.x - pp.x, dz = pos.z - pp.z;
        var dist = Math.sqrt(dx*dx + dz*dz);
        if (dist < 4 && !fleeing) {
            this.fleeTimer = 3 + Math.random() * 2;
        }
        if (this.fleeTimer > 0) {
            this.fleeTimer -= dt;
            var dl = Math.sqrt(dx*dx + dz*dz) || 1;
            pos.x += (dx/dl) * this.fleeSpeed * dt;
            pos.z += (dz/dl) * this.fleeSpeed * dt;
            pos.x = Math.max(-28, Math.min(28, pos.x));
            pos.z = Math.max(-28, Math.min(28, pos.z));
            this.entity.setPosition(pos.x, this.baseY, pos.z);
            return;
        }
    }

    // Idle bob + wander
    pos.y = this.baseY + Math.sin(this.bobTime) * 0.15;
    this.idleTimer -= dt;
    if (this.idleTimer <= 0) {
        this.wanderX = Math.random() - 0.5;
        this.wanderZ = Math.random() - 0.5;
        var wl2 = Math.sqrt(this.wanderX*this.wanderX + this.wanderZ*this.wanderZ) || 1;
        this.wanderX /= wl2; this.wanderZ /= wl2;
        this.idleTimer = 2 + Math.random() * 3;
    }
    pos.x += this.wanderX * 1.5 * dt;
    pos.z += this.wanderZ * 1.5 * dt;
    pos.x = Math.max(-28, Math.min(28, pos.x));
    pos.z = Math.max(-28, Math.min(28, pos.z));
    this.entity.setPosition(pos.x, pos.y, pos.z);
};

// ───────────────────────────────────────────────────────────────────────────────
//  GAME MANAGER
// ───────────────────────────────────────────────────────────────────────────────
var NPC_SPAWNS = [
    [0,0],[5,5],[-5,5],[5,-5],[-5,-5],[10,3],[-10,3],[3,10],
    [3,-10],[-3,10],[8,-8],[-8,8],[0,12],[12,0],[-12,0],
    [0,-12],[7,7],[-7,-7],[4,-4],[-4,4]
];

var GameManagerScript = pc.createScript('game-manager');
GameManagerScript.attributes.add('hunterThreshold', { type: 'number', default: 10 });
GameManagerScript.attributes.add('maxCarry',        { type: 'number', default: 4 });
GameManagerScript.attributes.add('npcSpawnCount',   { type: 'number', default: 18 });

GameManagerScript.prototype.initialize = function () {
    this.score    = 0;
    this.carrying = 0;
    this.isHunter = false;
    this.isAlive  = true;
    this._dudes   = [];
    this._penX    = -14;
    this._penZ    = -14;
    this._penR    = 4;
    this._penMat  = null;
    this._penPulse = 0;
    window.SD_carryCount = 0;

    this.app.on('cc:grab',    this.tryGrab,    this);
    this.app.on('cc:deposit', this.tryDeposit, this);

    this._buildUI();
    var self = this;
    setTimeout(function () { self._startGame(); }, 800);
};

GameManagerScript.prototype._buildUI = function () {
    // Hide lobby
    var lobby = document.getElementById('lobby-ui');
    if (lobby) lobby.style.display = 'none';
    var wr = document.getElementById('waiting-room');
    if (wr) wr.style.display = 'none';

    if (!document.getElementById('hud')) {
        var hud = document.createElement('div');
        hud.id = 'hud';
        hud.innerHTML =
            '<div id="score-display">' +
            '  <div class="label">Stupid Dudes in Pen</div>' +
            '  <div class="score-val"><span id="score-val">0</span></div>' +
            '  <div style="margin-top:6px;background:rgba(255,255,255,0.15);border-radius:99px;height:6px;width:160px">' +
            '    <div id="hunter-progress" style="height:100%;border-radius:99px;background:linear-gradient(90deg,#e94560,#f5a623);width:0%;transition:width 0.4s"></div>' +
            '  </div>' +
            '  <div id="hunter-progress-label" class="score-sub">0 / 10 to become Hunter</div>' +
            '</div>' +
            '<div id="carry-display">' +
            '  <div class="carry-slot"></div><div class="carry-slot"></div>' +
            '  <div class="carry-slot"></div><div class="carry-slot"></div>' +
            '</div>' +
            '<div id="pen-indicator">🏠 Walk to pen to deposit</div>' +
            '<div id="hunter-banner"><div class="hunter-title">🔥 HUNTER!</div><div class="hunter-sub">Tag other players!</div></div>' +
            '<div id="status-bar">Phase: <span class="phase-label" id="phase-label">Collecting</span></div>' +
            '<div id="zone-warning"></div>' +
            '<div id="crosshair"></div>';
        document.body.appendChild(hud);
    }
    document.getElementById('hud').style.display = 'block';

    if (!document.getElementById('notif-container')) {
        var nc = document.createElement('div');
        nc.id = 'notif-container';
        document.body.appendChild(nc);
    }

    var hint = document.createElement('div');
    hint.style.cssText = 'position:fixed;bottom:20px;left:20px;background:rgba(0,0,0,0.65);color:#cbd5e0;padding:12px 18px;border-radius:12px;font-size:13px;pointer-events:none;z-index:200;line-height:2;font-family:Arial,sans-serif;border:1px solid rgba(255,255,255,0.08)';
    hint.innerHTML = '<b style="color:white;font-size:14px">Controls</b><br>WASD — Move &nbsp;|&nbsp; Mouse — Look<br>Click canvas to lock mouse<br><b>E</b> or <b>Left Click</b> — Grab dude<br><b>F</b> or walk into pen — Deposit<br>Shift — Sprint';
    document.body.appendChild(hint);
    setTimeout(function () { hint.style.transition = 'opacity 1s'; hint.style.opacity = '0'; }, 9000);
    setTimeout(function () { if(hint.parentNode) hint.parentNode.removeChild(hint); }, 10100);
};

GameManagerScript.prototype._startGame = function () {
    this._spawnPen();
    this._spawnDudes();
    this._updateHUD();
    this.notify('Grab Stupid Dudes and bring them to your green pen!', '🎮');
};

GameManagerScript.prototype._spawnPen = function () {
    var pen = new pc.Entity('PlayerPen');
    var ring = new pc.Entity('PenRing');
    ring.addComponent('render', { type: 'cylinder' });
    ring.setLocalScale(this._penR * 2, 0.08, this._penR * 2);
    var mat = new pc.StandardMaterial();
    mat.diffuse  = new pc.Color(0.2, 0.9, 0.4);
    mat.emissive = new pc.Color(0.05, 0.3, 0.1);
    mat.opacity  = 0.5;
    mat.blendType = pc.BLEND_NORMAL;
    mat.update();
    ring.render.meshInstances[0].material = mat;
    this._penMat = mat;
    pen.addChild(ring);

    var marker = new pc.Entity('PenCenter');
    marker.addComponent('render', { type: 'box' });
    marker.setLocalScale(1.5, 0.12, 1.5);
    var mm = new pc.StandardMaterial();
    mm.diffuse  = new pc.Color(0.15, 1, 0.35);
    mm.emissive = new pc.Color(0.05, 0.4, 0.1);
    mm.update();
    marker.render.meshInstances[0].material = mm;
    pen.addChild(marker);

    pen.setPosition(this._penX, 0.1, this._penZ);
    this.app.root.addChild(pen);
};

GameManagerScript.prototype._spawnDudes = function () {
    for (var i = 0; i < this.npcSpawnCount; i++) {
        this._spawnOneDude(i);
    }
    var self = this;
    setInterval(function () {
        if (self._dudes.length < self.npcSpawnCount) {
            self._spawnOneDude(self._dudes.length);
        }
    }, 6000);
};

GameManagerScript.prototype._spawnOneDude = function (idx) {
    var zone   = NPC_SPAWNS[idx % NPC_SPAWNS.length];
    var jx = (Math.random() - 0.5) * 8;
    var jz = (Math.random() - 0.5) * 8;

    var rand = Math.random();
    var r, g, b, sc, pts;
    if (rand < 0.05)      { r=1;   g=0.3; b=0.9; sc=1.5; pts=5; }
    else if (rand < 0.2)  { r=1;   g=0.85;b=0.1; sc=0.9; pts=3; }
    else                  { r=0.3; g=0.6; b=1;   sc=0.8; pts=1; }

    var dude = new pc.Entity('Dude_' + idx);

    var body = new pc.Entity('B');
    body.addComponent('render', { type: 'capsule' });
    body.setLocalScale(sc, sc, sc);
    var mat = new pc.StandardMaterial();
    mat.diffuse  = new pc.Color(r, g, b);
    mat.emissive = new pc.Color(r*0.15, g*0.15, b*0.15);
    mat.update();
    body.render.meshInstances[0].material = mat;
    dude.addChild(body);

    var em = new pc.StandardMaterial(); em.diffuse = new pc.Color(1,1,1); em.emissive = new pc.Color(0.3,0.3,0.3); em.update();
    var pm = new pc.StandardMaterial(); pm.diffuse = new pc.Color(0.05,0.05,0.05); pm.update();

    var eyeL = new pc.Entity('EL'); eyeL.addComponent('render',{type:'sphere'}); eyeL.setLocalScale(0.2,0.2,0.2); eyeL.setLocalPosition(-0.15*sc, 0.28*sc, -0.32*sc); eyeL.render.meshInstances[0].material = em; dude.addChild(eyeL);
    var eyeR = new pc.Entity('ER'); eyeR.addComponent('render',{type:'sphere'}); eyeR.setLocalScale(0.2,0.2,0.2); eyeR.setLocalPosition(0.15*sc, 0.28*sc, -0.32*sc); eyeR.render.meshInstances[0].material = em; dude.addChild(eyeR);
    var pupL = new pc.Entity('PL'); pupL.addComponent('render',{type:'sphere'}); pupL.setLocalScale(0.09,0.09,0.09); pupL.setLocalPosition(-0.15*sc, 0.28*sc, -0.37*sc); pupL.render.meshInstances[0].material = pm; dude.addChild(pupL);
    var pupR = new pc.Entity('PR'); pupR.addComponent('render',{type:'sphere'}); pupR.setLocalScale(0.09,0.09,0.09); pupR.setLocalPosition(0.15*sc, 0.28*sc, -0.37*sc); pupR.render.meshInstances[0].material = pm; dude.addChild(pupR);

    dude._pts = pts; dude._mat = mat;
    dude._grabbed = false; dude._isCarried = false;
    dude._cox = 0; dude._coy = 0; dude._coz = 0;
    dude.tags.add('stupiddude');
    dude.addComponent('script');
    dude.script.create('stupidDue');

    dude.setPosition(zone[0] + jx, 1, zone[1] + jz);
    this.app.root.addChild(dude);
    this._dudes.push(dude);
    return dude;
};

GameManagerScript.prototype.tryGrab = function () {
    if (this.carrying >= this.maxCarry) { this.notify('Hands full! Deposit at pen first.', '⚠️'); return; }
    var player = this.app.root.findByName('Character Controller');
    if (!player) return;
    var pp = player.getPosition();
    var best = null, bd = 3.0;
    for (var i = 0; i < this._dudes.length; i++) {
        var d = this._dudes[i];
        if (d._grabbed) continue;
        var dp = d.getPosition();
        var dx = dp.x-pp.x, dy = dp.y-pp.y, dz = dp.z-pp.z;
        var dist = Math.sqrt(dx*dx+dy*dy+dz*dz);
        if (dist < bd) { best = d; bd = dist; }
    }
    if (best) {
        best._grabbed = true; best._isCarried = true;
        var ci = this.carrying;
        best._cox = (Math.random()-0.5)*0.6;
        best._coy = 1.8 + ci*0.5;
        best._coz = (Math.random()-0.5)*0.6;
        if (best._mat) { best._mat.diffuse = new pc.Color(1,0.55,0.1); best._mat.update(); }
        var sc2 = best.script && best.script['stupidDue'];
        if (sc2) sc2._grabbed = true;
        this.carrying++;
        window.SD_carryCount = this.carrying;
        this.notify('Grabbed! (' + this.carrying + '/' + this.maxCarry + ')', '✊');
        this._updateHUD();
    } else {
        this.notify('No Stupid Dude nearby!', '🔍');
    }
};

GameManagerScript.prototype.tryDeposit = function () {
    if (this.carrying === 0) return;
    var player = this.app.root.findByName('Character Controller');
    if (!player) return;
    var pp = player.getPosition();
    var dx = pp.x - this._penX, dz = pp.z - this._penZ;
    if (Math.sqrt(dx*dx+dz*dz) > this._penR + 2) { this.notify('Walk to your green pen to deposit!', '🏠'); return; }
    this._doDeposit();
};

GameManagerScript.prototype._doDeposit = function () {
    if (this.carrying === 0) return;
    var gained = 0;
    var self = this;
    for (var i = 0; i < this._dudes.length; i++) {
        var d = this._dudes[i];
        if (!d._isCarried) continue;
        d._isCarried = false; d._grabbed = false;
        gained += d._pts || 1;
        if (d._mat) { d._mat.diffuse = new pc.Color(0.3,0.6,1); d._mat.update(); }
        var sc3 = d.script && d.script['stupidDue'];
        if (sc3) { sc3._grabbed = false; sc3.fleeTimer = 0; }
        (function(dd){
            setTimeout(function(){
                var z2 = NPC_SPAWNS[Math.floor(Math.random()*NPC_SPAWNS.length)];
                dd.setPosition(z2[0]+(Math.random()-0.5)*6, 1, z2[1]+(Math.random()-0.5)*6);
            }, 2000);
        })(d);
    }
    this.score += gained; this.carrying = 0; window.SD_carryCount = 0;
    this.notify('+' + gained + ' Stupid Dude' + (gained!==1?'s':'') + ' deposited!', '🏠');
    this._updateHUD();
    if (!this.isHunter && this.score >= this.hunterThreshold) { this._becomeHunter(); }
};

GameManagerScript.prototype._becomeHunter = function () {
    this.isHunter = true;
    var banner = document.getElementById('hunter-banner');
    if (banner) { banner.classList.add('show'); setTimeout(function(){banner.classList.remove('show');}, 3500); }
    var lbl = document.getElementById('phase-label');
    if (lbl) lbl.textContent = '🔥 HUNTER MODE';
    this.notify('You are now a HUNTER! Tag other players!', '🔥');
    this._updateHUD();
};

GameManagerScript.prototype._updateHUD = function () {
    var sv = document.getElementById('score-val');
    if (sv) sv.textContent = this.score;
    var slots = document.querySelectorAll('.carry-slot');
    for (var i = 0; i < slots.length; i++) {
        if (i < this.carrying) { slots[i].classList.add('filled'); slots[i].textContent = '😵'; }
        else { slots[i].classList.remove('filled'); slots[i].textContent = ''; }
    }
    var pct = Math.min(100, Math.round((this.score / this.hunterThreshold) * 100));
    var bar = document.getElementById('hunter-progress');
    if (bar) bar.style.width = pct + '%';
    var lbl2 = document.getElementById('hunter-progress-label');
    if (lbl2) lbl2.textContent = this.isHunter ? '🔥 HUNTER UNLOCKED' : (this.score + ' / ' + this.hunterThreshold + ' to become Hunter');
};

GameManagerScript.prototype.notify = function (msg, icon) {
    var nc = document.getElementById('notif-container');
    if (!nc) return;
    var el = document.createElement('div');
    el.className = 'notif';
    el.textContent = (icon ? icon + ' ' : '') + msg;
    nc.appendChild(el);
    setTimeout(function(){ if(el.parentNode) el.parentNode.removeChild(el); }, 2800);
};

GameManagerScript.prototype.update = function (dt) {
    this._penPulse += dt * 2;
    if (this._penMat) { this._penMat.opacity = 0.35 + Math.sin(this._penPulse) * 0.2; this._penMat.update(); }

    var player = this.app.root.findByName('Character Controller');
    if (!player) return;
    var pp = player.getPosition();

    // Float carried dudes over player
    for (var i = 0; i < this._dudes.length; i++) {
        var d = this._dudes[i];
        if (!d._isCarried) continue;
        var tx = pp.x + d._cox, ty = pp.y + d._coy, tz = pp.z + d._coz;
        var cp = d.getPosition();
        var s = Math.min(1, 12 * dt);
        d.setPosition(cp.x + (tx-cp.x)*s, cp.y + (ty-cp.y)*s, cp.z + (tz-cp.z)*s);
    }

    // Auto-deposit when walking into pen
    if (this.carrying > 0) {
        var pdx = pp.x - this._penX, pdz = pp.z - this._penZ;
        var pdist = Math.sqrt(pdx*pdx + pdz*pdz);
        var pi = document.getElementById('pen-indicator');
        if (pdist <= this._penR) {
            this._doDeposit();
        } else if (pi) {
            if (pdist < 12) { pi.textContent = '🏠 ' + Math.round(pdist) + 'm to pen'; pi.classList.add('visible'); }
            else { pi.classList.remove('visible'); }
        }
    } else {
        var pi2 = document.getElementById('pen-indicator');
        if (pi2) pi2.classList.remove('visible');
    }
};

// ───────────────────────────────────────────────────────────────────────────────
//  HUNTER ZONE
// ───────────────────────────────────────────────────────────────────────────────
var HunterZoneScript = pc.createScript('hunter-zone');
HunterZoneScript.attributes.add('shrinkDelay',    { type: 'number', default: 90 });
HunterZoneScript.attributes.add('shrinkDuration', { type: 'number', default: 120 });

HunterZoneScript.prototype.initialize = function () {
    this._timer    = 0;
    this._radius   = 35;
    this._shrinking = false;
    var zone = new pc.Entity('ZoneVisual');
    zone.addComponent('render', { type: 'cylinder' });
    zone.setLocalScale(this._radius * 2, 0.15, this._radius * 2);
    zone.setPosition(0, 0.15, 0);
    var mat = new pc.StandardMaterial();
    mat.diffuse  = new pc.Color(0.9, 0.15, 0.15);
    mat.emissive = new pc.Color(0.3, 0.05, 0.05);
    mat.opacity  = 0.1;
    mat.blendType = pc.BLEND_NORMAL;
    mat.update();
    zone.render.meshInstances[0].material = mat;
    this.app.root.addChild(zone);
    this._zoneEntity = zone;
    this._zoneMat    = mat;
};

HunterZoneScript.prototype.update = function (dt) {
    this._timer += dt;
    if (!this._shrinking && this._timer > this.shrinkDelay) {
        this._shrinking = true;
        var zw = document.getElementById('zone-warning');
        if (zw) { zw.textContent = '⚠️ Zone is closing!'; zw.classList.add('visible'); }
    }
    if (this._shrinking) {
        var t = Math.min(1, (this._timer - this.shrinkDelay) / this.shrinkDuration);
        this._radius = 35 - t * 27;
        this._zoneEntity.setLocalScale(this._radius * 2, 0.15, this._radius * 2);
        this._zoneMat.opacity = 0.07 + Math.abs(Math.sin(this._timer * 2)) * 0.07;
        this._zoneMat.update();
        var player = this.app.root.findByName('Character Controller');
        var zw2 = document.getElementById('zone-warning');
        if (player && zw2) {
            var p = player.getPosition();
            var od = Math.sqrt(p.x*p.x + p.z*p.z);
            if (od > this._radius) { zw2.textContent = '🔥 OUTSIDE ZONE — move in!'; zw2.style.background = 'rgba(233,69,96,0.9)'; }
            else { zw2.textContent = '⚠️ Zone: ' + Math.round(this._radius) + 'm'; zw2.style.background = 'rgba(245,166,35,0.85)'; }
        }
    }
};
