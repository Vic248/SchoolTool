// ═══════════════════════════════════════════════════════════════════════════════
//  STUPID DUDES — Complete Game Scripts
//  Includes: Input, Character Controller, NPC, Pen, Game Manager, Firebase Lobby
// ═══════════════════════════════════════════════════════════════════════════════

var { createScript, Vec2, Vec3, Mat4, math } = pc;

// ───────────────────────────────────────────────────────────────────────────────
//  VIRTUAL JOYSTICK (mobile)
// ───────────────────────────────────────────────────────────────────────────────
class VirtualJoystick {
    constructor(app, entity, stick, enableEvent, moveEvent, disableEvent) {
        this.app = app;
        this.entity = entity;
        this.app.on(enableEvent, function (x, y) {
            this.entity.setLocalPosition(x, -y, 0);
            stick.setLocalPosition(x, -y, 0);
            this.entity.element.enabled = true;
            stick.element.enabled = true;
        }, this);
        this.app.on(moveEvent, function (x, y) {
            stick.setLocalPosition(x, -y, 0);
        }, this);
        this.app.on(disableEvent, function () {
            this.entity.element.enabled = false;
            stick.element.enabled = false;
        }, this);
    }
}

const VirtualJoystickScript = createScript('virtualJoystick');
VirtualJoystickScript.attributes.add('stick', { type: 'entity' });
VirtualJoystickScript.attributes.add('enableEvent', { type: 'string' });
VirtualJoystickScript.attributes.add('moveEvent', { type: 'string' });
VirtualJoystickScript.attributes.add('disableEvent', { type: 'string' });
VirtualJoystickScript.prototype.initialize = function () {
    this.joystick = new VirtualJoystick(this.app, this.entity, this.stick, this.enableEvent, this.moveEvent, this.disableEvent);
};

// ───────────────────────────────────────────────────────────────────────────────
//  INPUT HELPERS
// ───────────────────────────────────────────────────────────────────────────────
function applyRadialDeadZone(input, result, deadZone, deadZoneHigh) {
    const len = input.length();
    if (len > deadZone) {
        const range = 1 - deadZoneHigh - deadZone;
        const t = Math.min(1, (len - deadZone) / range);
        result.copy(input).scale(t / len);
    } else {
        result.set(0, 0);
    }
}

// ─── Desktop Input ────────────────────────────────────────────────────────────
class DesktopInput {
    constructor(app) {
        this.app = app;
        this._canvas = app.graphicsDevice.canvas;
        this._enabled = true;
        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);
        this._onMouseDown = this._onMouseDown.bind(this);
        this._onMouseMove = this._onMouseMove.bind(this);
        this.enabled = true;
    }
    set enabled(v) {
        this._enabled = v;
        if (v) {
            window.addEventListener('keydown', this._onKeyDown);
            window.addEventListener('keyup', this._onKeyUp);
            window.addEventListener('mousedown', this._onMouseDown);
            window.addEventListener('mousemove', this._onMouseMove);
        } else {
            window.removeEventListener('keydown', this._onKeyDown);
            window.removeEventListener('keyup', this._onKeyUp);
            window.removeEventListener('mousedown', this._onMouseDown);
            window.removeEventListener('mousemove', this._onMouseMove);
        }
    }
    get enabled() { return this._enabled; }
    _handleKey(key, value) {
        switch (key.toLowerCase()) {
            case 'w': case 'arrowup':    this.app.fire('cc:move:forward', value); break;
            case 's': case 'arrowdown':  this.app.fire('cc:move:backward', value); break;
            case 'a': case 'arrowleft':  this.app.fire('cc:move:left', value); break;
            case 'd': case 'arrowright': this.app.fire('cc:move:right', value); break;
            case ' ':     this.app.fire('cc:jump', !!value); break;
            case 'shift': this.app.fire('cc:sprint', !!value); break;
            case 'e':     if (value) this.app.fire('cc:interact'); break;
            case 'f':     if (value) this.app.fire('cc:deposit'); break;
        }
    }
    _onKeyDown(e) {
        if (document.pointerLockElement !== this._canvas) return;
        if (!e.repeat) this._handleKey(e.key, 1);
    }
    _onKeyUp(e) { if (!e.repeat) this._handleKey(e.key, 0); }
    _onMouseDown(e) {
        if (document.pointerLockElement !== this._canvas) this._canvas.requestPointerLock();
        else if (e.button === 0) this.app.fire('cc:interact');
    }
    _onMouseMove(e) {
        if (document.pointerLockElement !== this._canvas) return;
        const x = e.movementX || 0, y = e.movementY || 0;
        this.app.fire('cc:look', x, y);
    }
    destroy() { this.enabled = false; }
}

const DesktopInputScript = createScript('desktopInput');
DesktopInputScript.prototype.initialize = function () {
    this.input = new DesktopInput(this.app);
    this.on('enable', () => this.input.enabled = true);
    this.on('disable', () => this.input.enabled = false);
    this.on('destroy', () => this.input.destroy());
};

// ─── Mobile Input ─────────────────────────────────────────────────────────────
class MobileInput {
    constructor(app) {
        this.app = app;
        this._device = app.graphicsDevice;
        this._canvas = app.graphicsDevice.canvas;
        this._enabled = true;
        this._leftStick = { identifier: -1, center: new Vec2(), pos: new Vec2() };
        this._rightStick = { identifier: -1, center: new Vec2(), pos: new Vec2() };
        this._remappedPos = new Vec2();
        this._lastRightTap = 0;
        this.deadZone = 0.3;
        this.turnSpeed = 30;
        this.radius = 50;
        this._doubleTapInterval = 300;
        this._onTouchStart = this._onTouchStart.bind(this);
        this._onTouchMove  = this._onTouchMove.bind(this);
        this._onTouchEnd   = this._onTouchEnd.bind(this);
        this.enabled = true;
    }
    set enabled(v) {
        this._enabled = v;
        if (v) {
            this._canvas.addEventListener('touchstart', this._onTouchStart, false);
            this._canvas.addEventListener('touchmove',  this._onTouchMove,  false);
            this._canvas.addEventListener('touchend',   this._onTouchEnd,   false);
        } else {
            this._canvas.removeEventListener('touchstart', this._onTouchStart, false);
            this._canvas.removeEventListener('touchmove',  this._onTouchMove,  false);
            this._canvas.removeEventListener('touchend',   this._onTouchEnd,   false);
        }
    }
    get enabled() { return this._enabled; }
    _onTouchStart(e) {
        e.preventDefault();
        const sx = this._device.width / this._canvas.clientWidth;
        const sy = this._device.height / this._canvas.clientHeight;
        for (let t of e.changedTouches) {
            if (t.pageX <= this._canvas.clientWidth / 2 && this._leftStick.identifier === -1) {
                this._leftStick.identifier = t.identifier;
                this._leftStick.center.set(t.pageX, t.pageY);
                this._leftStick.pos.set(0, 0);
                this.app.fire('leftjoystick:enable', t.pageX * sx, t.pageY * sy);
            } else if (t.pageX > this._canvas.clientWidth / 2 && this._rightStick.identifier === -1) {
                this._rightStick.identifier = t.identifier;
                this._rightStick.center.set(t.pageX, t.pageY);
                this._rightStick.pos.set(0, 0);
                this.app.fire('rightjoystick:enable', t.pageX * sx, t.pageY * sy);
                const now = Date.now();
                if (now - this._lastRightTap < this._doubleTapInterval) {
                    this.app.fire('cc:jump', true);
                    setTimeout(() => this.app.fire('cc:jump', false), 50);
                }
                this._lastRightTap = now;
            }
        }
    }
    _onTouchMove(e) {
        e.preventDefault();
        const sx = this._device.width / this._canvas.clientWidth;
        const sy = this._device.height / this._canvas.clientHeight;
        for (let t of e.changedTouches) {
            if (t.identifier === this._leftStick.identifier) {
                this._leftStick.pos.set(t.pageX, t.pageY).sub(this._leftStick.center).scale(1 / this.radius);
                this.app.fire('leftjoystick:move', t.pageX * sx, t.pageY * sy);
            } else if (t.identifier === this._rightStick.identifier) {
                this._rightStick.pos.set(t.pageX, t.pageY).sub(this._rightStick.center).scale(1 / this.radius);
                this.app.fire('rightjoystick:move', t.pageX * sx, t.pageY * sy);
            }
        }
    }
    _onTouchEnd(e) {
        e.preventDefault();
        for (let t of e.changedTouches) {
            if (t.identifier === this._leftStick.identifier) {
                this._leftStick.identifier = -1;
                ['forward','backward','left','right'].forEach(d => this.app.fire('cc:move:' + d, 0));
                this.app.fire('leftjoystick:disable');
            } else if (t.identifier === this._rightStick.identifier) {
                this._rightStick.identifier = -1;
                this.app.fire('rightjoystick:disable');
            }
        }
    }
    update(dt) {
        if (this._leftStick.identifier !== -1) {
            applyRadialDeadZone(this._leftStick.pos, this._remappedPos, this.deadZone, 0);
            const fwd = -this._remappedPos.y, strafe = this._remappedPos.x;
            fwd > 0 ? (this.app.fire('cc:move:forward', Math.abs(fwd)), this.app.fire('cc:move:backward', 0))
                    : fwd < 0 ? (this.app.fire('cc:move:forward', 0), this.app.fire('cc:move:backward', Math.abs(fwd)))
                    : (this.app.fire('cc:move:forward', 0), this.app.fire('cc:move:backward', 0));
            strafe > 0 ? (this.app.fire('cc:move:right', Math.abs(strafe)), this.app.fire('cc:move:left', 0))
                       : strafe < 0 ? (this.app.fire('cc:move:right', 0), this.app.fire('cc:move:left', Math.abs(strafe)))
                       : (this.app.fire('cc:move:right', 0), this.app.fire('cc:move:left', 0));
        }
        if (this._rightStick.identifier !== -1) {
            applyRadialDeadZone(this._rightStick.pos, this._remappedPos, this.deadZone, 0);
            this.app.fire('cc:look', this._remappedPos.x * this.turnSpeed, this._remappedPos.y * this.turnSpeed);
        }
    }
    destroy() { this.enabled = false; }
}

const MobileInputScript = createScript('mobileInput');
MobileInputScript.attributes.add('deadZone', { type: 'number', default: 0.3 });
MobileInputScript.attributes.add('turnSpeed', { type: 'number', default: 30 });
MobileInputScript.attributes.add('radius', { type: 'number', default: 50 });
MobileInputScript.attributes.add('_doubleTapInterval', { type: 'number', default: 300 });
MobileInputScript.prototype.initialize = function () {
    this.input = new MobileInput(this.app);
    this.input.deadZone = this.deadZone;
    this.input.turnSpeed = this.turnSpeed;
    this.input.radius = this.radius;
    this.input._doubleTapInterval = this._doubleTapInterval;
    this.on('enable', () => this.input.enabled = true);
    this.on('disable', () => this.input.enabled = false);
    this.on('destroy', () => this.input.destroy());
};
MobileInputScript.prototype.update = function (dt) { this.input.update(dt); };

// ───────────────────────────────────────────────────────────────────────────────
//  CHARACTER CONTROLLER
// ───────────────────────────────────────────────────────────────────────────────
const LOOK_MAX_ANGLE = 90;
const _tmpV1 = new Vec3(), _tmpV2 = new Vec3(), _tmpM1 = new Mat4();

class CharacterController {
    constructor(app, camera, entity) {
        this.app = app;
        this.entity = entity;
        if (!camera) throw new Error('No camera entity');
        if (!entity.rigidbody) throw new Error('No rigidbody');
        this._camera = camera;
        this._rigidbody = entity.rigidbody;
        this.look = new Vec2();
        this.controls = { forward: 0, backward: 0, left: 0, right: 0, jump: false, sprint: false };
        this.lookSens = 0.08;
        this.speedGround = 40;
        this.speedAir = 5;
        this.sprintMult = 1.5;
        this.velocityDampingGround = 0.99;
        this.velocityDampingAir = 0.99925;
        this.jumpForce = 700;
        this._grounded = false;
        this._jumping = false;

        this.app.on('cc:look', (x, y) => {
            this.look.x = math.clamp(this.look.x - y * this.lookSens, -LOOK_MAX_ANGLE, LOOK_MAX_ANGLE);
            this.look.y -= x * this.lookSens;
        });
        this.app.on('cc:move:forward',  v => this.controls.forward  = v);
        this.app.on('cc:move:backward', v => this.controls.backward = v);
        this.app.on('cc:move:left',     v => this.controls.left     = v);
        this.app.on('cc:move:right',    v => this.controls.right    = v);
        this.app.on('cc:jump',    v => this.controls.jump   = v);
        this.app.on('cc:sprint',  v => this.controls.sprint = v);
    }
    _checkGrounded() {
        const pos = this.entity.getPosition();
        const below = _tmpV1.copy(pos);
        below.y -= 1.2;
        this._grounded = !!this._rigidbody.system.raycastFirst(pos, below);
    }
    _jump() {
        if (this.controls.jump && !this._jumping && this._grounded) {
            this._jumping = true;
            setTimeout(() => this._jumping = false, 200);
            this._rigidbody.applyImpulse(0, this.jumpForce, 0);
        }
    }
    _look() {
        this._camera.setLocalEulerAngles(this.look.x, this.look.y, 0);
    }
    _move(dt) {
        _tmpM1.setFromAxisAngle(Vec3.UP, this.look.y);
        const dir = _tmpV1.set(0, 0, 0);
        if (this.controls.forward)  dir.add(_tmpV2.set(0, 0, -this.controls.forward));
        if (this.controls.backward) dir.add(_tmpV2.set(0, 0, this.controls.backward));
        if (this.controls.left)     dir.add(_tmpV2.set(-this.controls.left, 0, 0));
        if (this.controls.right)    dir.add(_tmpV2.set(this.controls.right, 0, 0));
        _tmpM1.transformVector(dir, dir);

        // Slow down when carrying dudes
        const carryPenalty = 1 - (window.SD_carryCount || 0) * 0.12;
        let speed = (this._grounded ? this.speedGround : this.speedAir) * carryPenalty;
        if (this.controls.sprint) speed *= this.sprintMult;

        const vel = this._rigidbody.linearVelocity;
        vel.add(dir.mulScalar(speed * dt));
        const damp = Math.pow(this._grounded ? this.velocityDampingGround : this.velocityDampingAir, 1000 * dt);
        vel.x *= damp; vel.z *= damp;
        this._rigidbody.linearVelocity = vel;
    }
    update(dt) {
        this._checkGrounded();
        this._jump();
        this._look();
        this._move(dt);
    }
    destroy() {}
}

const CCScript = createScript('character-controller');
CCScript.attributes.add('camera', { type: 'entity' });
CCScript.attributes.add('lookSens', { type: 'number', default: 0.08 });
CCScript.attributes.add('speedGround', { type: 'number', default: 40 });
CCScript.attributes.add('speedAir', { type: 'number', default: 5 });
CCScript.attributes.add('sprintMult', { type: 'number', default: 1.5 });
CCScript.attributes.add('velocityDampingGround', { type: 'number', default: 0.99 });
CCScript.attributes.add('velocityDampingAir', { type: 'number', default: 0.99925 });
CCScript.attributes.add('jumpForce', { type: 'number', default: 700 });
CCScript.prototype.initialize = function () {
    this.controller = new CharacterController(this.app, this.camera, this.entity);
    Object.assign(this.controller, {
        lookSens: this.lookSens, speedGround: this.speedGround,
        speedAir: this.speedAir, sprintMult: this.sprintMult,
        velocityDampingGround: this.velocityDampingGround,
        velocityDampingAir: this.velocityDampingAir, jumpForce: this.jumpForce
    });
    this.on('destroy', () => this.controller.destroy());
};
CCScript.prototype.update = function (dt) { this.controller.update(dt); };

// ───────────────────────────────────────────────────────────────────────────────
//  MAP COLLIDER
// ───────────────────────────────────────────────────────────────────────────────
const AddCollider = createScript('add-collider');
AddCollider.prototype.initialize = function () {
    this.entity.findComponents('render').forEach(r => {
        const e = r.entity;
        e.addComponent('rigidbody', { type: 'static' });
        e.addComponent('collision', { type: 'mesh', renderAsset: r.asset });
    });
};

// ───────────────────────────────────────────────────────────────────────────────
//  STUPID DUDE NPC
// ───────────────────────────────────────────────────────────────────────────────
const StupidDude = createScript('stupidDude');
StupidDude.attributes.add('dudeId', { type: 'number', default: 0 });

StupidDude.prototype.initialize = function () {
    this.state = 'idle';   // idle | fleeing | grabbed | carried | deposited
    this.fleeDir = new Vec3();
    this.bobTime = Math.random() * Math.PI * 2;
    this.baseY = this.entity.getPosition().y;
    this.fleeSpeed = 6 + Math.random() * 4;
    this.fleeTimer = 0;
    this.idleTimer = Math.random() * 3;
    this.wanderDir = new Vec3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
    this.type = this.entity.tags.has('rare') ? 'rare' : this.entity.tags.has('giant') ? 'giant' : 'common';
};

StupidDude.prototype.update = function (dt) {
    if (this.state === 'grabbed' || this.state === 'carried' || this.state === 'deposited') return;

    this.bobTime += dt * 2;
    const pos = this.entity.getPosition();

    // Bob animation
    if (this.state !== 'fleeing') {
        this.entity.setPosition(pos.x, this.baseY + Math.sin(this.bobTime) * 0.15, pos.z);
    }

    // Spin
    const euler = this.entity.getLocalEulerAngles();
    this.entity.setLocalEulerAngles(euler.x, euler.y + 80 * dt, euler.z);

    // Flee logic — check if a player is nearby
    const playerEntity = this.app.root.findByName('Character Controller');
    if (playerEntity) {
        const dist = pos.distance(playerEntity.getPosition());
        const fleeRadius = this.type === 'giant' ? 5 : 3.5;
        if (dist < fleeRadius && this.state !== 'fleeing') {
            this.state = 'fleeing';
            this.fleeTimer = 3 + Math.random() * 2;
        }
    }

    if (this.state === 'fleeing') {
        this.fleeTimer -= dt;
        if (this.fleeTimer <= 0) { this.state = 'idle'; return; }

        if (playerEntity) {
            const dir = pos.clone().sub(playerEntity.getPosition()).normalize();
            dir.y = 0;
            const speed = this.type === 'giant' ? this.fleeSpeed * 0.7 : this.fleeSpeed;
            pos.x += dir.x * speed * dt;
            pos.z += dir.z * speed * dt;
            // Clamp to map bounds
            pos.x = Math.max(-28, Math.min(28, pos.x));
            pos.z = Math.max(-28, Math.min(28, pos.z));
            this.entity.setPosition(pos.x, this.baseY, pos.z);
        }
    } else {
        // Idle wander
        this.idleTimer -= dt;
        if (this.idleTimer <= 0) {
            this.wanderDir.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
            this.idleTimer = 2 + Math.random() * 3;
        }
        pos.x += this.wanderDir.x * 1.5 * dt;
        pos.z += this.wanderDir.z * 1.5 * dt;
        pos.x = Math.max(-28, Math.min(28, pos.x));
        pos.z = Math.max(-28, Math.min(28, pos.z));
        this.entity.setPosition(pos.x, this.baseY, pos.z);
    }
};

// ───────────────────────────────────────────────────────────────────────────────
//  PLAYER PEN (deposit zone)
// ───────────────────────────────────────────────────────────────────────────────
const PlayerPen = createScript('playerPen');
PlayerPen.attributes.add('radius', { type: 'number', default: 3.5 });
PlayerPen.attributes.add('playerColor', { type: 'rgba', default: { r: 0.2, g: 0.8, b: 0.4, a: 1 } });

PlayerPen.prototype.initialize = function () {
    this.depositCooldown = 0;
    // Draw a glowing ring on the ground using a flat cylinder entity
    const ring = new pc.Entity('PenRing');
    ring.addComponent('render', { type: 'cylinder' });
    ring.setLocalScale(this.radius * 2, 0.05, this.radius * 2);
    ring.setLocalPosition(0, 0.05, 0);
    const mat = new pc.StandardMaterial();
    mat.diffuse.set(this.playerColor.r, this.playerColor.g, this.playerColor.b);
    mat.emissive.set(this.playerColor.r * 0.5, this.playerColor.g * 0.5, this.playerColor.b * 0.5);
    mat.opacity = 0.55;
    mat.blendType = pc.BLEND_NORMAL;
    mat.update();
    ring.render.meshInstances[0].material = mat;
    this.entity.addChild(ring);
    this._mat = mat;
    this._pulseTime = 0;
};

PlayerPen.prototype.update = function (dt) {
    this._pulseTime += dt * 2;
    const pulse = 0.45 + Math.sin(this._pulseTime) * 0.15;
    this._mat.opacity = pulse;
    this._mat.update();

    if (this.depositCooldown > 0) { this.depositCooldown -= dt; return; }

    const playerEntity = this.app.root.findByName('Character Controller');
    if (!playerEntity) return;

    const dist = playerEntity.getPosition().distance(this.entity.getPosition());
    if (dist < this.radius) {
        // Auto-deposit carried dudes
        const gm = this.app.root.findByTag('gamemanager');
        if (gm && gm[0]) {
            const gmScript = gm[0].script && gm[0].script['game-manager'];
            if (gmScript) {
                gmScript.depositDudes();
                this.depositCooldown = 1.0;
            }
        }
    }
};

// ───────────────────────────────────────────────────────────────────────────────
//  GAME MANAGER
// ───────────────────────────────────────────────────────────────────────────────
const GameManagerScript = createScript('game-manager');
GameManagerScript.attributes.add('hunterThreshold', { type: 'number', default: 10 });
GameManagerScript.attributes.add('maxCarry', { type: 'number', default: 4 });
GameManagerScript.attributes.add('npcSpawnCount', { type: 'number', default: 18 });

// Spawn positions across the map (center area)
const NPC_SPAWN_ZONES = [
    [0, 0], [5, 5], [-5, 5], [5, -5], [-5, -5],
    [10, 3], [-10, 3], [3, 10], [3, -10], [-3, 10],
    [8, -8], [-8, 8], [0, 12], [12, 0], [-12, 0],
    [0, -12], [7, 7], [-7, -7], [4, -4], [-4, 4]
];

const PLAYER_COLORS = ['#e94560', '#3490dc', '#f5a623', '#38a169', '#9b59b6', '#1abc9c', '#e67e22', '#2980b9'];

GameManagerScript.prototype.initialize = function () {
    this.score = 0;          // dudes safely in pen
    this.carrying = 0;       // dudes currently being carried
    this.isHunter = false;
    this.isAlive = true;
    this.phase = 'collecting'; // collecting | hunting | endgame
    this.spawnedDudes = [];
    this.nearbyDude = null;
    this.players = {};        // multiplayer player list
    this.localPlayerId = null;

    // Expose carry count globally for CC speed penalty
    window.SD_carryCount = 0;

    // HUD refs
    this._hudEl = document.getElementById('hud');
    this._scoreEl = document.getElementById('score-val');
    this._carrySlots = document.querySelectorAll('.carry-slot');
    this._penIndicator = document.getElementById('pen-indicator');
    this._hunterBanner = document.getElementById('hunter-banner');
    this._statusPhase = document.getElementById('phase-label');
    this._lbContainer = document.getElementById('lb-rows');
    this._notifContainer = document.getElementById('notif-container');

    this.app.on('cc:interact', () => this.tryGrabNearby());
    this.app.on('cc:deposit',  () => this.depositDudes());

    // Start game after short delay
    setTimeout(() => this.startGame(), 500);
};

GameManagerScript.prototype.startGame = function () {
    if (this._hudEl) this._hudEl.style.display = 'block';
    this.spawnDudes();
    this.spawnPen();
    this.updateHUD();
};

GameManagerScript.prototype.spawnPen = function () {
    const playerEntity = this.app.root.findByName('Character Controller');
    if (!playerEntity) return;

    // Place pen near spawn but offset
    const pen = new pc.Entity('PlayerPen');
    pen.addComponent('script');
    pen.tags.add('pen');
    pen.setPosition(-15, 0.1, -15);

    const penScript = pen.script.create('playerPen');
    this.app.root.addChild(pen);
    this._penEntity = pen;
};

GameManagerScript.prototype.spawnDudes = function () {
    // Clear old
    this.spawnedDudes.forEach(d => d.destroy());
    this.spawnedDudes = [];

    for (let i = 0; i < this.npcSpawnCount; i++) {
        this.spawnSingleDude(i);
    }

    // Respawn loop
    this._respawnInterval = setInterval(() => {
        if (this.spawnedDudes.length < this.npcSpawnCount) {
            this.spawnSingleDude(this.spawnedDudes.length);
        }
    }, 5000);
};

GameManagerScript.prototype.spawnSingleDude = function (index) {
    const zone = NPC_SPAWN_ZONES[index % NPC_SPAWN_ZONES.length];
    const jitter = () => (Math.random() - 0.5) * 8;
    const x = zone[0] + jitter(), z = zone[1] + jitter();

    const dude = new pc.Entity('StupidDude_' + index);

    // Determine rarity
    const rand = Math.random();
    let color, scale, points;
    if (rand < 0.05) {
        // Giant (5 pts)
        dude.tags.add('giant');
        color = { r: 1, g: 0.3, b: 0.8 };
        scale = 1.4;
        points = 5;
    } else if (rand < 0.2) {
        // Rare golden (3 pts)
        dude.tags.add('rare');
        color = { r: 1, g: 0.85, b: 0.1 };
        scale = 0.9;
        points = 3;
    } else {
        // Common (1 pt)
        color = { r: 0.3, g: 0.7, b: 1 };
        scale = 0.75;
        points = 1;
    }
    dude._dudePoints = points;

    // Body (capsule)
    const body = new pc.Entity('DudeBody');
    body.addComponent('render', { type: 'capsule' });
    body.setLocalScale(scale, scale, scale);
    const mat = new pc.StandardMaterial();
    mat.diffuse.set(color.r, color.g, color.b);
    mat.emissive.set(color.r * 0.2, color.g * 0.2, color.b * 0.2);
    mat.update();
    body.render.meshInstances[0].material = mat;
    dude.addChild(body);

    // Eyes
    const eyeL = new pc.Entity('EyeL');
    eyeL.addComponent('render', { type: 'sphere' });
    eyeL.setLocalScale(0.18, 0.18, 0.18);
    eyeL.setLocalPosition(-0.12 * scale, 0.3 * scale, -0.3 * scale);
    const eyeMat = new pc.StandardMaterial();
    eyeMat.diffuse.set(1, 1, 1);
    eyeMat.update();
    eyeL.render.meshInstances[0].material = eyeMat;
    dude.addChild(eyeL);

    const eyeR = eyeL.clone();
    eyeR.setLocalPosition(0.12 * scale, 0.3 * scale, -0.3 * scale);
    dude.addChild(eyeR);

    // Collision
    dude.addComponent('collision', { type: 'sphere', radius: 0.7 * scale });
    dude.addComponent('script');
    dude.script.create('stupidDude');

    dude.setPosition(x, 1, z);
    dude._mat = mat;
    this.app.root.addChild(dude);
    this.spawnedDudes.push(dude);
    dude.tags.add('stupiddude');
    return dude;
};

GameManagerScript.prototype.tryGrabNearby = function () {
    if (this.carrying >= this.maxCarry) {
        this.notify('Hands full! (max ' + this.maxCarry + ')', '⚠️');
        return;
    }
    if (!this.isAlive) return;

    const player = this.app.root.findByName('Character Controller');
    if (!player) return;
    const pPos = player.getPosition();

    let closest = null, closestDist = 2.5;
    this.spawnedDudes.forEach(d => {
        if (!d._grabbed && d.enabled) {
            const dist = d.getPosition().distance(pPos);
            if (dist < closestDist) { closest = d; closestDist = dist; }
        }
    });

    if (closest) {
        closest._grabbed = true;
        const script = closest.script && closest.script.stupidDude;
        if (script) script.state = 'grabbed';

        // Change color to show grabbed
        if (closest._mat) {
            closest._mat.diffuse.set(1, 0.5, 0.1);
            closest._mat.update();
        }
        this.carrying++;
        window.SD_carryCount = this.carrying;
        this.notify('Grabbed a Stupid Dude! (' + this.carrying + '/' + this.maxCarry + ')', '✊');
        this.updateHUD();
        this._attachDudeToPlayer(closest);
    } else {
        this.notify('No Stupid Dude nearby!', '🔍');
    }
};

GameManagerScript.prototype._attachDudeToPlayer = function (dude) {
    // Float dudes above the player's head
    const player = this.app.root.findByName('Character Controller');
    if (!player) return;
    const offset = new pc.Vec3(
        (Math.random() - 0.5) * 0.8,
        1.5 + this.carrying * 0.4,
        (Math.random() - 0.5) * 0.8
    );
    dude._carryOffset = offset;
    dude._isCarried = true;
};

GameManagerScript.prototype.depositDudes = function () {
    if (this.carrying === 0) return;

    const player = this.app.root.findByName('Character Controller');
    if (!player || !this._penEntity) return;
    const pDist = player.getPosition().distance(this._penEntity.getPosition());
    if (pDist > 5) return; // Not close enough to pen

    let deposited = 0;
    this.spawnedDudes.forEach(d => {
        if (d._isCarried) {
            d._isCarried = false;
            d._grabbed = false;

            const script = d.script && d.script.stupidDude;
            if (script) script.state = 'deposited';

            // Score based on type
            const pts = d._dudePoints || 1;
            this.score += pts;
            deposited += pts;

            // Respawn the dude after delay
            setTimeout(() => {
                const zone = NPC_SPAWN_ZONES[Math.floor(Math.random() * NPC_SPAWN_ZONES.length)];
                d.setPosition(zone[0] + (Math.random()-0.5)*6, 1, zone[1] + (Math.random()-0.5)*6);
                d._grabbed = false;
                d._isCarried = false;
                if (script) { script.state = 'idle'; script.fleeTimer = 0; }
                if (d._mat) { d._mat.diffuse.set(0.3, 0.7, 1); d._mat.update(); }
            }, 1500);
        }
    });

    this.carrying = 0;
    window.SD_carryCount = 0;
    this.notify('+' + deposited + ' dudes deposited!', '🏠');
    this.updateHUD();

    // Check hunter threshold
    if (!this.isHunter && this.score >= this.hunterThreshold) {
        this.becomeHunter();
    }

    // Sync to Firebase if available
    this.syncToFirebase();
};

GameManagerScript.prototype.becomeHunter = function () {
    this.isHunter = true;
    this.phase = 'hunting';
    if (this._hunterBanner) {
        this._hunterBanner.classList.add('show');
        setTimeout(() => this._hunterBanner.classList.remove('show'), 3000);
    }
    if (this._statusPhase) this._statusPhase.textContent = '🔥 HUNTER MODE';
    this.notify('You are now a HUNTER! Tag other players!', '🔥');
    this.updateHUD();
};

GameManagerScript.prototype.updateHUD = function () {
    if (this._scoreEl) this._scoreEl.textContent = this.score;

    // Carry slots
    if (this._carrySlots) {
        this._carrySlots.forEach((slot, i) => {
            if (i < this.carrying) {
                slot.classList.add('filled');
                slot.textContent = '😵';
            } else {
                slot.classList.remove('filled');
                slot.textContent = '';
            }
        });
    }

    const progress = Math.min(100, Math.round((this.score / this.hunterThreshold) * 100));
    const progressEl = document.getElementById('hunter-progress');
    if (progressEl) progressEl.style.width = progress + '%';

    const progressLabelEl = document.getElementById('hunter-progress-label');
    if (progressLabelEl) {
        if (this.isHunter) {
            progressLabelEl.textContent = '🔥 HUNTER';
        } else {
            progressLabelEl.textContent = this.score + ' / ' + this.hunterThreshold + ' to Hunt';
        }
    }
};

GameManagerScript.prototype.notify = function (msg, icon) {
    if (!this._notifContainer) return;
    const el = document.createElement('div');
    el.className = 'notif';
    el.textContent = (icon || '') + ' ' + msg;
    this._notifContainer.appendChild(el);
    setTimeout(() => el.remove(), 2600);
};

GameManagerScript.prototype.syncToFirebase = function () {
    // Firebase sync - called from lobby.js externally
    if (window.SD_syncScore) window.SD_syncScore(this.score, this.isHunter, this.isAlive);
};

GameManagerScript.prototype.update = function (dt) {
    if (!this.isAlive) return;

    // Follow carried dudes to player
    const player = this.app.root.findByName('Character Controller');
    if (player) {
        const pPos = player.getPosition();
        this.spawnedDudes.forEach(d => {
            if (d._isCarried && d._carryOffset) {
                const target = pPos.clone().add(d._carryOffset);
                const cur = d.getPosition();
                const lerped = cur.lerp(cur, target, 0.2);
                d.setPosition(
                    cur.x + (target.x - cur.x) * 8 * dt,
                    cur.y + (target.y - cur.y) * 8 * dt,
                    cur.z + (target.z - cur.z) * 8 * dt
                );
            }
        });

        // Check pen proximity for indicator
        if (this._penEntity && this.carrying > 0) {
            const penDist = pPos.distance(this._penEntity.getPosition());
            if (this._penIndicator) {
                if (penDist < 8) {
                    this._penIndicator.textContent = penDist < 5
                        ? '✅ Press F or walk in to DEPOSIT!'
                        : '🏠 Pen nearby — ' + Math.round(penDist) + 'm';
                    this._penIndicator.classList.add('visible');
                } else {
                    this._penIndicator.classList.remove('visible');
                }
            }
        } else if (this._penIndicator) {
            this._penIndicator.classList.remove('visible');
        }
    }

    // Sync remote players (Firebase)
    if (window.SD_remotePlayers) this.updateRemotePlayers(window.SD_remotePlayers);
};

GameManagerScript.prototype.updateRemotePlayers = function (playersData) {
    // Update leaderboard
    if (!this._lbContainer) return;
    const entries = Object.entries(playersData)
        .map(([id, p]) => ({ id, ...p }))
        .sort((a, b) => (b.score || 0) - (a.score || 0));

    this._lbContainer.innerHTML = '';
    entries.slice(0, 6).forEach(p => {
        const row = document.createElement('div');
        row.className = 'lb-row' + (p.isHunter ? ' hunter' : '') + (p.id === this.localPlayerId ? ' you' : '');
        row.innerHTML = `<span class="lb-name">${p.name || 'Player'}</span><span class="lb-score">${p.score || 0}</span>`;
        this._lbContainer.appendChild(row);
    });
};

// ───────────────────────────────────────────────────────────────────────────────
//  HUNTER ZONE (shrinking boundary in endgame)
// ───────────────────────────────────────────────────────────────────────────────
const HunterZone = createScript('hunter-zone');
HunterZone.attributes.add('shrinkDelay', { type: 'number', default: 60 });  // seconds before shrink
HunterZone.attributes.add('shrinkDuration', { type: 'number', default: 90 });

HunterZone.prototype.initialize = function () {
    this._timer = 0;
    this._shrinking = false;
    this._radius = 35;
    this._minRadius = 8;
    this._zoneWarning = document.getElementById('zone-warning');

    // Draw zone boundary as a transparent cylinder
    const zone = new pc.Entity('ZoneVisual');
    zone.addComponent('render', { type: 'cylinder' });
    zone.setLocalScale(this._radius * 2, 0.3, this._radius * 2);
    zone.setPosition(0, 0.2, 0);
    const mat = new pc.StandardMaterial();
    mat.diffuse.set(0.9, 0.2, 0.2);
    mat.emissive.set(0.4, 0.05, 0.05);
    mat.opacity = 0.15;
    mat.blendType = pc.BLEND_NORMAL;
    mat.update();
    zone.render.meshInstances[0].material = mat;
    this.app.root.addChild(zone);
    this._zoneEntity = zone;
    this._zoneMat = mat;
};

HunterZone.prototype.update = function (dt) {
    this._timer += dt;

    if (!this._shrinking && this._timer > this.shrinkDelay) {
        this._shrinking = true;
        if (this._zoneWarning) {
            this._zoneWarning.textContent = '⚠️ Zone is closing in!';
            this._zoneWarning.classList.add('visible');
        }
    }

    if (this._shrinking) {
        const t = Math.min(1, (this._timer - this.shrinkDelay) / this.shrinkDuration);
        this._radius = 35 - t * (35 - this._minRadius);
        this._zoneEntity.setLocalScale(this._radius * 2, 0.3, this._radius * 2);

        // Pulse opacity
        this._zoneMat.opacity = 0.1 + Math.sin(this._timer * 3) * 0.05;
        this._zoneMat.update();

        // Check if local player is outside zone
        const player = this.app.root.findByName('Character Controller');
        if (player) {
            const pos = player.getPosition();
            const dist = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
            if (dist > this._radius) {
                if (this._zoneWarning) {
                    this._zoneWarning.textContent = '🔥 YOU ARE OUTSIDE THE ZONE! Move in!';
                    this._zoneWarning.classList.add('visible');
                }
                // Damage player (for multiplayer — fires event)
                this.app.fire('zone:damage', 5 * dt);
            } else if (this._zoneWarning && this._shrinking) {
                this._zoneWarning.textContent = '⚠️ Zone closing — ' + Math.round(this._radius) + 'm radius';
            }
        }
    }
};
