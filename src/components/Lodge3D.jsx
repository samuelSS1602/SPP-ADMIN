import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

// Live 3D model of the lodge: one block per room, coloured by status. Loaded lazily through LodgeView,
// so three.js stays out of the main bundle. Modes: 'inspect' (tap a room), 'select' (tap free rooms to
// pick them) and 'hero' (decorative, used before login, so it shows no room statuses).

const STATUS_COLORS = { available: '#0f9f6e', occupied: '#dc3b3b', reserved: '#d98a06', cleaning: '#d98a06', maintenance: '#94a3b8' };
const WINDOW_COLORS = { available: '#cfe3ea', occupied: '#ffd98a', reserved: '#fde7b0', cleaning: '#fde7b0', maintenance: '#a3adb8' };
const GOLD = '#b98a46';
const W = 1.1, D = 1.5, H = 0.95, GAP = 0.12, SLAB = 0.16;

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function canvasTexture(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return { ctx: canvas.getContext('2d'), texture };
}

const byName = (first, second) => String(first.name).localeCompare(String(second.name), undefined, { numeric: true });

class LodgeScene {
    constructor(container, rooms, title) {
        this.container = container;
        this.props = { mode: 'inspect', activeIds: [], dimIds: [], dark: false, reduceMotion: false, onPick: null };
        this.yaw = 0;
        this.targetYaw = 0;
        this.radius = 10;
        this.lastInteract = -Infinity;
        this.hover = null;
        this.down = null;
        this.visible = true;
        this.raf = 0;
        this.rooms = new Map();
        this.pickables = [];

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        this.build(rooms, title);
        this.bindEvents();
        this.resize();
    }

    add(mesh, parent = this.scene) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    }

    build(rooms, title) {
        this.hemi = new THREE.HemisphereLight(0xfff4e0, 0x24312d, 2.4);
        this.sun = new THREE.DirectionalLight(0xffffff, 2.2);
        this.sun.position.set(5, 9, 7);
        this.sun.castShadow = true;
        this.sun.shadow.mapSize.set(1024, 1024);
        Object.assign(this.sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 });
        this.sun.shadow.camera.updateProjectionMatrix();
        this.sun.shadow.bias = -0.0008;
        this.scene.add(this.hemi, this.sun);

        this.groundMat = new THREE.MeshStandardMaterial({ color: 0xe4ebe3, roughness: 1 });
        const ground = new THREE.Mesh(new THREE.CircleGeometry(7.5, 64), this.groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        const path = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 4.2), new THREE.MeshStandardMaterial({ color: 0xd9cdb4, roughness: 1 }));
        path.rotation.x = -Math.PI / 2;
        path.position.set(0, 0.005, 3.3);
        path.receiveShadow = true;
        this.scene.add(path);

        const wallMat = new THREE.MeshStandardMaterial({ color: 0xf3ede1, roughness: 0.85 });
        const slabMat = new THREE.MeshStandardMaterial({ color: 0xe9d7b0, roughness: 0.7 });
        const trimMat = new THREE.MeshStandardMaterial({ color: 0xb98a46, roughness: 0.4, metalness: 0.3 });

        const floors = [...new Set(rooms.map(room => Number(room.floor) || 1))].sort((a, b) => a - b);
        const floorRooms = floors.map(floor => rooms.filter(room => (Number(room.floor) || 1) === floor).sort(byName));
        const widthOf = count => count * W + Math.max(0, count - 1) * GAP;
        const box = (w, h, d, mat, x, y, z) => {
            const mesh = this.add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat));
            mesh.position.set(x, y, z);
            return mesh;
        };

        box(widthOf(floorRooms[0]?.length || 1) + 0.4, SLAB, D + 0.5, slabMat, 0, SLAB / 2, 0);
        floorRooms.forEach((list, level) => {
            const baseY = SLAB + level * (H + SLAB);
            const ceilingWidth = Math.max(widthOf(list.length), widthOf(floorRooms[level + 1]?.length || 0));
            box(ceilingWidth + 0.3, SLAB, D + 0.3, slabMat, 0, baseY + H + SLAB / 2, 0);
            list.forEach((room, index) => this.addRoom(room, (index - (list.length - 1) / 2) * (W + GAP), baseY + H / 2, wallMat));
        });

        // Roof trim and the lodge sign
        const topWidth = widthOf(floorRooms[floorRooms.length - 1]?.length || 1);
        const roofTop = SLAB + floorRooms.length * (H + SLAB);
        box(topWidth + 0.4, 0.06, D + 0.4, trimMat, 0, roofTop + 0.03, 0);
        const sign = canvasTexture(1024, 160);
        this.sign = { ...sign, title };
        const signFace = new THREE.MeshStandardMaterial({ map: sign.texture, emissive: 0xffffff, emissiveMap: sign.texture, emissiveIntensity: 0.3 });
        box(3.4, 0.53, 0.06, [trimMat, trimMat, trimMat, trimMat, signFace, trimMat], 0, roofTop + 0.44, D / 2 - 0.05);
        box(0.06, 0.4, 0.06, trimMat, -1.3, roofTop + 0.18, D / 2 - 0.05);
        box(0.06, 0.4, 0.06, trimMat, 1.3, roofTop + 0.18, D / 2 - 0.05);

        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 1 });
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f6b55, roughness: 0.9 });
        [[-4.7, 1.5, 1], [4.8, 1.1, 1.2], [-4.3, -2.0, 1.25], [4.4, -2.3, 0.95], [-5.6, -0.3, 0.8]].forEach(([x, z, s]) => {
            const trunk = this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.07 * s, 0.1 * s, 0.5 * s, 8), trunkMat));
            trunk.position.set(x, 0.25 * s, z);
            const crown = this.add(new THREE.Mesh(new THREE.ConeGeometry(0.48 * s, 1.15 * s, 14), leafMat));
            crown.position.set(x, 1.05 * s, z);
        });

        this.target = new THREE.Vector3(0, roofTop / 2 + 0.15, 0);
    }

    addRoom(room, x, y, wallMat) {
        const group = new THREE.Group();
        group.position.set(x, y, 0);
        this.scene.add(group);
        const body = this.add(new THREE.Mesh(new THREE.BoxGeometry(W, H, D), wallMat), group);
        const facade = canvasTexture(256, 256);
        const faceMat = new THREE.MeshStandardMaterial({ map: facade.texture, emissive: 0xffffff, emissiveMap: facade.texture, emissiveIntensity: 0.3, roughness: 0.8, transparent: true });
        const face = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.96, H * 0.94), faceMat);
        face.position.z = D / 2 + 0.004;
        group.add(face);
        const ledgeMat = new THREE.MeshStandardMaterial({ roughness: 0.5, transparent: true });
        const ledge = this.add(new THREE.Mesh(new THREE.BoxGeometry(W * 0.9, 0.07, 0.24), ledgeMat), group);
        ledge.position.set(0, -H / 2 + 0.07, D / 2 + 0.12);
        [body, face, ledge].forEach(mesh => {
            mesh.userData.roomId = room.id;
            this.pickables.push(mesh);
        });
        this.rooms.set(String(room.id), { id: room.id, room, group, faceMat, ledgeMat, ...facade, z: 0 });
    }

    drawSign() {
        const { ctx, texture, title } = this.sign;
        ctx.clearRect(0, 0, 1024, 160);
        ctx.fillStyle = '#0f3b33';
        roundRect(ctx, 0, 0, 1024, 160, 28);
        ctx.fill();
        ctx.strokeStyle = '#d9b46d';
        ctx.lineWidth = 10;
        roundRect(ctx, 8, 8, 1008, 144, 22);
        ctx.stroke();
        ctx.fillStyle = '#e9d7b0';
        ctx.font = '600 76px Fraunces, Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(title, 512, 84, 960);
        texture.needsUpdate = true;
    }

    drawFacade(entry) {
        const { ctx, room } = entry;
        const hero = this.props.mode === 'hero';
        const status = hero ? 'available' : room.status;
        ctx.fillStyle = this.props.dark ? '#3a4a44' : '#f8f3e9';
        ctx.fillRect(0, 0, 256, 256);
        if (status === 'occupied') {
            ctx.shadowColor = 'rgba(255, 200, 90, 0.9)';
            ctx.shadowBlur = 24;
        }
        ctx.fillStyle = hero ? (this.props.dark ? '#ffd98a' : '#cfe3ea') : (WINDOW_COLORS[status] || WINDOW_COLORS.available);
        roundRect(ctx, 100, 40, 136, 96, 10);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 7;
        roundRect(ctx, 100, 40, 136, 96, 10);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(168, 40);
        ctx.lineTo(168, 136);
        ctx.stroke();
        ctx.fillStyle = '#123f36';
        roundRect(ctx, 22, 74, 58, 182, 8);
        ctx.fill();
        ctx.fillStyle = GOLD;
        ctx.beginPath();
        ctx.arc(68, 170, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = hero ? '#0f3b33' : (STATUS_COLORS[status] || GOLD);
        roundRect(ctx, 100, 160, 136, 52, 10);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 30px Manrope, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(room.name, 168, 187, 128);
        entry.texture.needsUpdate = true;
    }

    isActive(id) {
        return this.props.activeIds.some(active => String(active) === String(id));
    }

    canPick(id) {
        if (id == null || this.props.mode === 'hero') return false;
        if (this.props.mode !== 'select') return true;
        const entry = this.rooms.get(String(id));
        return Boolean(entry) && (entry.room.status === 'available' || this.isActive(id));
    }

    // Colours, lights and facades for the current props
    refresh() {
        const { dark, mode, dimIds } = this.props;
        this.drawSign();
        this.groundMat.color.set(dark ? 0x1a2421 : 0xe4ebe3);
        this.hemi.intensity = dark ? 1.1 : 2.4;
        this.sun.intensity = dark ? 0.9 : 2.2;
        this.rooms.forEach(entry => {
            const picked = mode === 'select' && this.isActive(entry.id);
            const color = mode === 'hero' ? GOLD : picked ? GOLD : (STATUS_COLORS[entry.room.status] || GOLD);
            const dimmed = dimIds.some(id => String(id) === String(entry.id));
            entry.ledgeMat.color.set(color);
            entry.ledgeMat.emissive.set(color);
            entry.ledgeMat.emissiveIntensity = dark ? 0.8 : 0.35;
            entry.faceMat.emissiveIntensity = dark ? 0.55 : 0.3;
            entry.faceMat.opacity = dimmed ? 0.35 : 1;
            entry.ledgeMat.opacity = dimmed ? 0.35 : 1;
            this.drawFacade(entry);
        });
        this.wake();
    }

    setRooms(rooms) {
        rooms.forEach(room => {
            const entry = this.rooms.get(String(room.id));
            if (entry) entry.room = room;
        });
    }

    setProps(props) {
        const modeChanged = props.mode !== undefined && props.mode !== this.props.mode;
        Object.assign(this.props, props);
        if (modeChanged) this.resize();
        this.refresh();
    }

    pick(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
        this.raycaster.setFromCamera(this.pointer, this.camera);
        const hit = this.raycaster.intersectObjects(this.pickables, false)[0];
        return hit ? hit.object.userData.roomId : null;
    }

    bindEvents() {
        const el = this.renderer.domElement;
        this.onDown = event => {
            this.down = { x: event.clientX, yaw: this.targetYaw, moved: false };
            this.lastInteract = performance.now();
            el.setPointerCapture?.(event.pointerId);
        };
        this.onMove = event => {
            if (this.down) {
                const dx = event.clientX - this.down.x;
                if (Math.abs(dx) > 4) this.down.moved = true;
                this.targetYaw = Math.max(-1.2, Math.min(1.2, this.down.yaw - dx * 0.008));
                this.lastInteract = performance.now();
            } else if (event.pointerType === 'mouse') {
                const id = this.pick(event);
                this.hover = this.canPick(id) ? id : null;
                el.style.cursor = this.hover != null ? 'pointer' : 'grab';
            }
            this.wake();
        };
        this.onUp = event => {
            if (this.down && !this.down.moved) {
                const id = this.pick(event);
                if (this.canPick(id)) this.props.onPick?.(id);
            }
            this.down = null;
        };
        this.onLeave = () => {
            this.hover = null;
            this.wake();
        };
        this.onCancel = () => { this.down = null; };
        el.addEventListener('pointerdown', this.onDown);
        el.addEventListener('pointermove', this.onMove);
        el.addEventListener('pointerup', this.onUp);
        el.addEventListener('pointerleave', this.onLeave);
        el.addEventListener('pointercancel', this.onCancel);

        // Render only while on screen and the tab is visible
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.container);
        this.intersectionObserver = new IntersectionObserver(entries => {
            this.visible = entries.some(entry => entry.isIntersecting) && document.visibilityState === 'visible';
            this.wake();
        });
        this.intersectionObserver.observe(this.container);
        this.onVisibility = () => {
            this.visible = document.visibilityState === 'visible';
            this.wake();
        };
        document.addEventListener('visibilitychange', this.onVisibility);
    }

    resize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        if (!width || !height) return;
        this.renderer.setSize(width, height, false);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        const tanV = Math.tan(THREE.MathUtils.degToRad(15));
        const halfWidth = this.props.mode === 'hero' ? 3.7 : 4.9;
        this.radius = Math.max(1.9 / tanV, halfWidth / (tanV * this.camera.aspect)) + 2;
        this.wake();
    }

    wake() {
        if (!this.raf && this.visible) this.raf = requestAnimationFrame(this.frame);
    }

    frame = now => {
        this.raf = 0;
        if (!this.visible) return;
        const { reduceMotion, mode } = this.props;
        const autoRotate = !reduceMotion && mode !== 'select' && now - this.lastInteract > 4000;
        if (autoRotate) this.targetYaw = Math.sin(now / 1000 * 0.25) * 0.5;
        this.yaw += (this.targetYaw - this.yaw) * (reduceMotion ? 1 : 0.08);
        let moving = autoRotate || Math.abs(this.targetYaw - this.yaw) > 0.0005;
        this.rooms.forEach(entry => {
            const want = mode !== 'hero' && this.isActive(entry.id) ? 0.45 : (String(this.hover) === String(entry.id) ? 0.12 : 0);
            entry.z += (want - entry.z) * (reduceMotion ? 1 : 0.14);
            if (Math.abs(want - entry.z) > 0.001) moving = true;
            else entry.z = want;
            entry.group.position.z = entry.z;
        });
        const pitch = 0.4;
        this.camera.position.set(
            this.target.x + this.radius * Math.cos(pitch) * Math.sin(this.yaw),
            this.target.y + this.radius * Math.sin(pitch),
            this.target.z + this.radius * Math.cos(pitch) * Math.cos(this.yaw)
        );
        this.camera.lookAt(this.target);
        this.renderer.render(this.scene, this.camera);
        if (moving) this.raf = requestAnimationFrame(this.frame);
    };

    dispose() {
        cancelAnimationFrame(this.raf);
        this.raf = 0;
        this.visible = false;
        this.resizeObserver.disconnect();
        this.intersectionObserver.disconnect();
        document.removeEventListener('visibilitychange', this.onVisibility);
        const el = this.renderer.domElement;
        el.removeEventListener('pointerdown', this.onDown);
        el.removeEventListener('pointermove', this.onMove);
        el.removeEventListener('pointerup', this.onUp);
        el.removeEventListener('pointerleave', this.onLeave);
        el.removeEventListener('pointercancel', this.onCancel);
        this.scene.traverse(object => {
            object.geometry?.dispose();
            [].concat(object.material || []).forEach(material => {
                material.map?.dispose();
                material.dispose();
            });
        });
        this.renderer.dispose();
        this.renderer.forceContextLoss();
        el.remove();
    }
}

function useBodyClass(name) {
    const [has, setHas] = useState(() => document.body.classList.contains(name));
    useEffect(() => {
        const observer = new MutationObserver(() => setHas(document.body.classList.contains(name)));
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, [name]);
    return has;
}

function useReducedMotion() {
    const [reduce, setReduce] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    useEffect(() => {
        const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
        const onChange = () => setReduce(mql.matches);
        mql.addEventListener('change', onChange);
        return () => mql.removeEventListener('change', onChange);
    }, []);
    return reduce;
}

/**
 * @param rooms [{ id, name, floor, status }]
 * @param activeIds rooms lifted out of the building (selected / picked)
 * @param dimIds rooms faded out (hidden by a filter)
 * @param onPick called with a room id when a room is tapped
 */
export default function Lodge3D({ rooms, mode = 'inspect', activeIds = [], dimIds = [], onPick, title = 'Sri Padmavati Pleasants' }) {
    const hostRef = useRef(null);
    const sceneRef = useRef(null);
    const onPickRef = useRef(onPick);
    const [failed, setFailed] = useState(false);
    const dark = useBodyClass('dark-theme');
    const reduceMotion = useReducedMotion();
    const roomIdsKey = rooms.map(room => room.id).join(',');
    const statusKey = rooms.map(room => `${room.id}:${room.status}`).join('|');
    const activeKey = activeIds.join(',');
    const dimKey = dimIds.join(',');
    onPickRef.current = onPick;

    useEffect(() => {
        let scene;
        try {
            scene = new LodgeScene(hostRef.current, rooms, title);
        } catch (error) {
            console.warn('3D lodge view unavailable:', error);
            setFailed(true);
            return undefined;
        }
        scene.props.onPick = id => onPickRef.current?.(id);
        sceneRef.current = scene;
        // Fonts may finish loading after the first draw
        document.fonts?.ready.then(() => { if (sceneRef.current === scene) scene.refresh(); });
        return () => {
            sceneRef.current = null;
            scene.dispose();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomIdsKey, title]);

    // Redraw only when something visible changed, not on every parent render
    useEffect(() => {
        const scene = sceneRef.current;
        if (!scene) return;
        scene.setRooms(rooms);
        scene.setProps({ mode, activeIds, dimIds, dark, reduceMotion });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomIdsKey, title, statusKey, mode, activeKey, dimKey, dark, reduceMotion]);

    if (failed) {
        return <div className="lodge-3d-msg"><i className="fas fa-cube" /> 3D view is not supported on this device.</div>;
    }
    return <div ref={hostRef} className="lodge-3d-canvas" />;
}
