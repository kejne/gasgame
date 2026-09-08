import * as THREE from 'three';
import { CITY_MAP, MAP_HEIGHT, MAP_WIDTH, TILE_SIZE } from './game/map';
import { START_STATE, turn, tryMove, type PlayerState } from './game/movement';
import { isDiscovered, revealTiles, tileKey } from './game/discovery';
import {
  buildCityDiagnostics,
  buildingHeightAt,
  createBrickTexture,
  createCityRenderPlans,
  createCobbleTexture,
  createWoodTexture,
  normalizeBuildingHeight,
  type CityRenderDiagnostics,
  type FacadeSide,
} from './game/cityVisuals';
import {
  chooseStoreOption,
  closeStore,
  findStore,
  openStore,
  STORES,
  type StoreSession,
} from './game/store';
import {
  closeCharacterScreen,
  findPartyMember,
  openCharacterScreen,
  partyMemberAtIndex,
  PARTY_MEMBERS,
  switchCharacterScreen,
  type CharacterScreenState,
  type PartyMember,
} from './game/party';
import './style.css';

const gameRoot = document.querySelector<HTMLDivElement>('#game');
if (!gameRoot) throw new Error('Game root is missing');
const root = gameRoot;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#101923');
scene.fog = new THREE.Fog('#101923', TILE_SIZE * 2.5, TILE_SIZE * 12);

const camera = new THREE.PerspectiveCamera(72, 1, 0.1, TILE_SIZE * 20);
camera.position.y = 2.25;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.domElement.tabIndex = 0;
renderer.domElement.setAttribute('aria-label', 'Game world. Use W/S to move and A/D to turn.');
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
root.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight('#b7d8ff', '#1e2630', 1.8));
const sun = new THREE.DirectionalLight('#fff0d0', 2.8);
sun.position.set(-20, 30, 12);
sun.castShadow = true;
scene.add(sun);

const cobbleTexture = createCobbleTexture();
const brickTexture = createBrickTexture();
const woodTexture = createWoodTexture();
const floorMaterial = new THREE.MeshStandardMaterial({ color: '#4d6572', roughness: 0.92 });
const roadMaterial = new THREE.MeshStandardMaterial({ map: cobbleTexture, color: '#a8b4ad', roughness: 0.98 });
const brickMaterial = new THREE.MeshStandardMaterial({ map: brickTexture, color: '#a95848', roughness: 0.8 });
const woodMaterial = new THREE.MeshStandardMaterial({ map: woodTexture, color: '#916347', roughness: 0.84 });
const roofMaterials = [
  new THREE.MeshStandardMaterial({ color: '#c5794c', roughness: 0.75 }),
  new THREE.MeshStandardMaterial({ color: '#a95a48', roughness: 0.78 }),
];
const markerMaterial = new THREE.MeshStandardMaterial({ color: '#ffcf4a', emissive: '#9b5710', emissiveIntensity: 0.8 });
const doorMaterial = new THREE.MeshStandardMaterial({ color: '#3b1e2c', emissive: '#7d3d46', emissiveIntensity: 0.7, roughness: 0.75 });
const doorHandleMaterial = new THREE.MeshStandardMaterial({ color: '#ffcf4a', emissive: '#9b5710', emissiveIntensity: 0.8 });
const windowFrameMaterial = new THREE.MeshStandardMaterial({ color: '#241d24', roughness: 0.72 });
const windowGlassMaterial = new THREE.MeshStandardMaterial({ color: '#f2bd68', emissive: '#9b5710', emissiveIntensity: 0.5, roughness: 0.42 });
const windowFrameGeometries = {
  northSouth: new THREE.BoxGeometry(0.58, 0.68, 0.1),
  eastWest: new THREE.BoxGeometry(0.1, 0.68, 0.58),
};
const windowGlassGeometries = {
  northSouth: new THREE.BoxGeometry(0.4, 0.48, 0.04),
  eastWest: new THREE.BoxGeometry(0.04, 0.48, 0.4),
};
const cityRenderObjects: THREE.Object3D[] = [];
const floorObjects: THREE.Mesh[] = [];
const houseObjects: THREE.Mesh[] = [];
const windowObjects: THREE.Mesh[] = [];

function addCityObject<T extends THREE.Object3D>(object: T, role: string): T {
  object.userData.renderOnly = true;
  object.userData.cityRenderRole = role;
  cityRenderObjects.push(object);
  scene.add(object);
  return object;
}

function worldPosition(x: number, y: number, height = 0): THREE.Vector3 {
  return new THREE.Vector3(
    (x - (MAP_WIDTH - 1) / 2) * TILE_SIZE,
    height,
    (y - (MAP_HEIGHT - 1) / 2) * TILE_SIZE,
  );
}

const doorSides = new Map<string, FacadeSide>();
for (const store of STORES) {
  const doorSide: FacadeSide = store.doorFacing === 'north' ? 'south' : store.doorFacing === 'south' ? 'north' : store.doorFacing === 'east' ? 'west' : 'east';
  doorSides.set(tileKey(store.buildingTile), doorSide);
}
const renderPlans = createCityRenderPlans(doorSides);
const planByTile = new Map(renderPlans.map((plan) => [tileKey({ x: plan.x, y: plan.y }), plan]));
for (let y = 0; y < MAP_HEIGHT; y += 1) {
  for (let x = 0; x < MAP_WIDTH; x += 1) {
    const position = worldPosition(x, y);
    const plan = planByTile.get(tileKey({ x, y }));
    if (!plan) throw new Error(`Missing render plan for tile (${x}, ${y})`);
    const isStreet = plan.tile === '.';
    const tile = new THREE.Mesh(new THREE.BoxGeometry(TILE_SIZE, 0.16, TILE_SIZE), isStreet ? roadMaterial : floorMaterial);
    tile.position.copy(position);
    tile.position.y = -0.1;
    tile.receiveShadow = true;
    floorObjects.push(addCityObject(tile, 'floor'));

    if (!isStreet) {
      const height = normalizeBuildingHeight(buildingHeightAt(x, y), { x, y });
      const facadeMaterial = plan.facade?.family === 'brick' ? brickMaterial : woodMaterial;
      const building = new THREE.Mesh(new THREE.BoxGeometry(TILE_SIZE * 0.82, height, TILE_SIZE * 0.82), facadeMaterial);
      building.position.copy(worldPosition(x, y, height / 2));
      building.castShadow = true;
      building.receiveShadow = true;
      houseObjects.push(addCityObject(building, 'house'));
      const roof = new THREE.Mesh(new THREE.ConeGeometry(TILE_SIZE * 0.56, 0.7, 4), roofMaterials[plan.facade?.family === 'wood' ? 0 : 1]);
      roof.position.copy(worldPosition(x, y, height + 0.35));
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      addCityObject(roof, 'roof');

      for (const window of plan.windows) {
        const sideIsHorizontal = window.side === 'north' || window.side === 'south';
        const frame = new THREE.Mesh(sideIsHorizontal ? windowFrameGeometries.northSouth : windowFrameGeometries.eastWest, windowFrameMaterial);
        const glass = new THREE.Mesh(sideIsHorizontal ? windowGlassGeometries.northSouth : windowGlassGeometries.eastWest, windowGlassMaterial);
        const frameOffset = TILE_SIZE * 0.82 / 2 + 0.055;
        const glassOffset = frameOffset + 0.07;
        const framePosition = worldPosition(x, y, window.height);
        const glassPosition = worldPosition(x, y, window.height);
        if (window.side === 'north') { framePosition.z -= frameOffset; glassPosition.z -= glassOffset; }
        if (window.side === 'south') { framePosition.z += frameOffset; glassPosition.z += glassOffset; }
        if (window.side === 'east') { framePosition.x += frameOffset; glassPosition.x += glassOffset; }
        if (window.side === 'west') { framePosition.x -= frameOffset; glassPosition.x -= glassOffset; }
        if (sideIsHorizontal) {
          framePosition.x += window.offset;
          glassPosition.x += window.offset;
        } else {
          framePosition.z += window.offset;
          glassPosition.z += window.offset;
        }
        frame.position.copy(framePosition);
        glass.position.copy(glassPosition);
        frame.castShadow = true;
        windowObjects.push(addCityObject(frame, 'window-frame'));
        windowObjects.push(addCityObject(glass, 'window-glass'));
      }

      const store = STORES.find((candidate) => candidate.buildingTile.x === x && candidate.buildingTile.y === y);
      if (store) {
        const doorIsOnXFace = store.doorFacing === 'east' || store.doorFacing === 'west';
        const door = new THREE.Mesh(
          new THREE.BoxGeometry(doorIsOnXFace ? 0.22 : TILE_SIZE * 0.3, 1.55, doorIsOnXFace ? TILE_SIZE * 0.3 : 0.22),
          doorMaterial,
        );
        const doorPosition = worldPosition(x, y, 0.78);
        if (store.doorFacing === 'west') doorPosition.x += TILE_SIZE * 0.43;
        if (store.doorFacing === 'east') doorPosition.x -= TILE_SIZE * 0.43;
        if (store.doorFacing === 'north') doorPosition.z += TILE_SIZE * 0.43;
        if (store.doorFacing === 'south') doorPosition.z -= TILE_SIZE * 0.43;
        door.position.copy(doorPosition);
        door.castShadow = true;
        addCityObject(door, 'door');

        const handle = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), doorHandleMaterial);
        handle.position.copy(doorPosition);
        if (store.doorFacing === 'east' || store.doorFacing === 'west') handle.position.x += store.doorFacing === 'west' ? 0.13 : -0.13;
        else handle.position.z += store.doorFacing === 'north' ? 0.13 : -0.13;
        handle.position.y -= 0.02;
        addCityObject(handle, 'door-handle');
      }
    }
  }
}

const startMarker = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.08, 24), markerMaterial);
startMarker.position.copy(worldPosition(START_STATE.tile.x, START_STATE.tile.y, 0.08));
addCityObject(startMarker, 'start-marker');

const cityDiagnostics = buildCityDiagnostics({
  canvas: { created: Boolean(renderer.domElement), context: Boolean(renderer.getContext()) },
  textures: { cobble: cobbleTexture, brick: brickTexture, wood: woodTexture },
  materials: { road: roadMaterial, brick: brickMaterial, wood: woodMaterial },
  floorObjects,
  houseObjects,
  windowObjects,
  decorativeObjects: cityRenderObjects,
});
if (cityDiagnostics.status !== 'ok') throw new Error(`City visual initialization failed: ${cityDiagnostics.errors.join('; ')}`);
(window as Window & { __GASGAME_DIAGNOSTICS__?: CityRenderDiagnostics }).__GASGAME_DIAGNOSTICS__ = cityDiagnostics;

const hud = document.createElement('section');
hud.className = 'hud';
hud.innerHTML = '<div class="hud-top"><div><div class="title">GASGAME <span>// GRID MOVEMENT</span></div><div id="state"></div></div><div id="minimap" class="minimap" role="img" aria-label="City minimap"></div></div><div class="help">W/S move · A/D turn · exact tile steps</div>';
root.appendChild(hud);
const stateElement = hud.querySelector<HTMLDivElement>('#state');
if (!stateElement) throw new Error('HUD state label is missing');
const stateLabel = stateElement;
const minimapElement = hud.querySelector<HTMLDivElement>('#minimap');
if (!minimapElement) throw new Error('HUD minimap is missing');
const minimap = minimapElement;

let player: PlayerState = START_STATE;
let discoveredTiles = revealTiles(player);
const DEFAULT_MOVEMENT_DURATION_MS = 420;
let movementDurationMs = DEFAULT_MOVEMENT_DURATION_MS;
type MovementAnimation = {
  from: PlayerState;
  to: PlayerState;
  fromPosition: THREE.Vector3;
  toPosition: THREE.Vector3;
  fromYaw: number;
  toYaw: number;
  startedAt: number;
  durationMs: number;
};
let activeAnimation: MovementAnimation | null = null;
let storeSession: StoreSession | null = null;
let characterScreen: CharacterScreenState | null = null;
const cameraYaw: Record<PlayerState['facing'], number> = {
  north: 0,
  east: -Math.PI / 2,
  south: Math.PI,
  west: Math.PI / 2,
};

const speedControl = document.createElement('label');
speedControl.className = 'speed-control';
speedControl.innerHTML = '<span>MOVE DURATION</span><input id="movement-speed" type="range" min="150" max="1200" step="50" value="420" aria-label="Movement animation duration"><output>420 ms</output>';
hud.appendChild(speedControl);
const speedInput = speedControl.querySelector<HTMLInputElement>('#movement-speed');
const speedOutput = speedControl.querySelector<HTMLOutputElement>('output');
if (!speedInput || !speedOutput) throw new Error('Movement speed control is missing');

speedInput.addEventListener('input', () => {
  movementDurationMs = Number(speedInput.value);
  speedOutput.value = `${movementDurationMs} ms`;
  if (activeAnimation) activeAnimation.durationMs = movementDurationMs;
});

function renderPixelArt(rows: readonly string[], className: string, label: string): string {
  const columns = rows[0]?.length ?? 1;
  const pixels = rows
    .flatMap((row) => Array.from(row))
    .map((pixel) => `<span class="portrait-pixel pixel-${pixel === ' ' ? 'blank' : pixel.toLowerCase()}"></span>`)
    .join('');
  return `<div class="${className}" role="img" aria-label="${label}" style="--pixel-columns: ${columns}">${pixels}</div>`;
}

const partyHud = document.createElement('section');
partyHud.className = 'party-hud';
partyHud.setAttribute('aria-label', 'Party members');
root.appendChild(partyHud);

function renderPartyHud(): void {
  partyHud.innerHTML = PARTY_MEMBERS.map((member, index) => `
    <button type="button" class="party-card" data-party-member="${member.id}" aria-label="Open ${member.name}, ${member.className} character screen">
      ${renderPixelArt(member.portrait, 'party-portrait', `${member.className} pixel-art portrait`)}
      <span class="party-card-copy"><strong>${index + 1}. ${member.name}</strong><small>${member.className}</small></span>
    </button>`).join('');
}

renderPartyHud();

function syncCamera(position = worldPosition(player.tile.x, player.tile.y, 2.25), yaw = cameraYaw[player.facing]): void {
  camera.position.copy(position);
  camera.rotation.set(0, yaw, 0);
  stateLabel.textContent = `TILE ${player.tile.x}, ${player.tile.y}  ·  FACING ${player.facing.toUpperCase()}`;
}

const facingMarkers: Record<PlayerState['facing'], string> = {
  north: '▲',
  east: '▶',
  south: '▼',
  west: '◀',
};

function renderMinimap(): void {
  const cells: HTMLSpanElement[] = [];
  for (let y = 0; y < MAP_HEIGHT; y += 1) {
    for (let x = 0; x < MAP_WIDTH; x += 1) {
      const position = { x, y };
      const cell = document.createElement('span');
      const discovered = isDiscovered(discoveredTiles, position);
      const isPlayer = player.tile.x === x && player.tile.y === y;
      cell.className = `minimap-cell ${discovered ? (CITY_MAP[y][x] === '.' ? 'street' : 'building') : 'fog'}${isPlayer ? ' player' : ''}`;
      cell.dataset.position = tileKey(position);
      if (isPlayer) {
        const marker = document.createElement('span');
        marker.className = 'minimap-marker';
        marker.textContent = facingMarkers[player.facing];
        marker.setAttribute('aria-hidden', 'true');
        cell.dataset.facing = player.facing;
        cell.setAttribute('aria-label', `Player at tile ${x}, ${y}, facing ${player.facing}`);
        cell.append(marker);
      }
      cells.push(cell);
    }
  }
  minimap.replaceChildren(...cells);
  minimap.setAttribute('aria-label', `City minimap. ${discoveredTiles.size} tiles discovered. Player at tile ${player.tile.x}, ${player.tile.y}, facing ${player.facing}.`);
}

function resize(): void {
  const width = root.clientWidth || window.innerWidth;
  const height = root.clientHeight || window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function sameState(left: PlayerState, right: PlayerState): boolean {
  return left.tile.x === right.tile.x && left.tile.y === right.tile.y && left.facing === right.facing;
}

function shortestAngleDelta(from: number, to: number): number {
  const fullTurn = Math.PI * 2;
  return ((to - from + Math.PI) % fullTurn + fullTurn) % fullTurn - Math.PI;
}

function easeInOut(progress: number): number {
  return progress * progress * (3 - 2 * progress);
}

function startAnimation(next: PlayerState): void {
  if (sameState(player, next)) return;

  discoveredTiles = revealTiles(next, discoveredTiles);
  renderMinimap();
  const fromYaw = cameraYaw[player.facing];
  const targetYaw = cameraYaw[next.facing];
  activeAnimation = {
    from: player,
    to: next,
    fromPosition: worldPosition(player.tile.x, player.tile.y, 2.25),
    toPosition: worldPosition(next.tile.x, next.tile.y, 2.25),
    fromYaw,
    toYaw: fromYaw + shortestAngleDelta(fromYaw, targetYaw),
    startedAt: performance.now(),
    durationMs: movementDurationMs,
  };
}

const storeOverlay = document.createElement('div');
storeOverlay.className = 'store-overlay';
storeOverlay.hidden = true;
root.appendChild(storeOverlay);

const characterOverlay = document.createElement('div');
characterOverlay.className = 'character-overlay';
characterOverlay.hidden = true;
root.appendChild(characterOverlay);

let storeReturnFocus: HTMLElement | null = null;
let characterReturnFocus: HTMLElement | null = null;

function focusOrigin(): HTMLElement {
  const activeElement = document.activeElement;
  return activeElement instanceof HTMLElement && activeElement !== document.body && activeElement.isConnected
    ? activeElement
    : renderer.domElement;
}

function restoreFocus(origin: HTMLElement | null): void {
  if (origin?.isConnected) origin.focus();
}

function modalFocusables(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
    .filter((element) => !element.hasAttribute('disabled') && !element.getAttribute('aria-hidden'));
}

function trapModalFocus(event: KeyboardEvent, overlay: HTMLElement): void {
  const focusables = modalFocusables(overlay);
  if (!focusables.length) return;
  const currentIndex = focusables.indexOf(document.activeElement as HTMLElement);
  const nextIndex = event.shiftKey
    ? (currentIndex <= 0 ? focusables.length - 1 : currentIndex - 1)
    : (currentIndex < 0 || currentIndex === focusables.length - 1 ? 0 : currentIndex + 1);
  event.preventDefault();
  focusables[nextIndex].focus();
}

function renderCharacterOverlay(focusClose = false): void {
  if (!characterScreen) {
    characterOverlay.hidden = true;
    characterOverlay.replaceChildren();
    return;
  }

  const member = findPartyMember(characterScreen.memberId);
  characterOverlay.hidden = false;
  characterOverlay.innerHTML = `
    <section class="character-panel" role="dialog" aria-modal="true" aria-labelledby="character-title">
      <div class="character-heading">
        <div><span class="character-kicker">PARTY DOSSIER</span><h2 id="character-title">${member.name}</h2><p>${member.className}</p></div>
        <button type="button" class="back-button" data-character-close="true">← Back <span>(Esc)</span></button>
      </div>
      <div class="character-content">
        ${renderPixelArt(member.paperDoll, 'paper-doll', `${member.name} paper doll`)}
        <div class="inventory"><h3>Starter Inventory</h3><ul>${member.inventory.map((item) => `<li><span>${item.name}</span><strong>×${item.quantity}</strong></li>`).join('')}</ul></div>
      </div>
      <p class="character-hint">Press 1–4 to inspect another party member. World controls are paused.</p>
    </section>`;

  if (focusClose) characterOverlay.querySelector<HTMLButtonElement>('[data-character-close]')?.focus();
}

function openMemberScreen(member: PartyMember): void {
  if (storeSession || activeAnimation) return;
  if (!characterScreen) characterReturnFocus = focusOrigin();
  characterScreen = characterScreen
    ? switchCharacterScreen(characterScreen, member.id)
    : openCharacterScreen(member.id);
  renderCharacterOverlay(true);
}

function leaveCharacterScreen(): void {
  characterScreen = closeCharacterScreen();
  renderCharacterOverlay();
  restoreFocus(characterReturnFocus);
  characterReturnFocus = null;
}

partyHud.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const button = target.closest<HTMLButtonElement>('[data-party-member]');
  if (!button) return;
  const member = PARTY_MEMBERS.find((candidate) => candidate.id === button.dataset.partyMember);
  if (member) openMemberScreen(member);
});

characterOverlay.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element) || !target.closest('[data-character-close]')) return;
  leaveCharacterScreen();
});

function renderStoreOverlay(focusFirstOption = false, focusSelector?: string): void {
  if (!storeSession) {
    storeOverlay.hidden = true;
    storeOverlay.replaceChildren();
    return;
  }

  const store = findStore(storeSession.storeId);
  if (!store) {
    storeSession = closeStore();
    renderStoreOverlay();
    return;
  }

  const selectedOption = storeSession.selectedOption === null ? undefined : store.options[storeSession.selectedOption];
  const portraitPixels = store.portrait
    .flatMap((row) => Array.from(row))
    .map((pixel) => `<span class="portrait-pixel pixel-${pixel === ' ' ? 'blank' : pixel.toLowerCase()}"></span>`)
    .join('');

  storeOverlay.hidden = false;
  storeOverlay.innerHTML = `
    <section class="store-panel" role="dialog" aria-modal="true" aria-labelledby="store-title">
      <div class="store-heading">
        <span class="store-kicker">OPEN FOR BUSINESS</span>
        <h2 id="store-title">${store.name}</h2>
      </div>
      <div class="store-content">
        <div class="portrait" role="img" aria-label="Pixel-art portrait of the shopkeeper">${portraitPixels}</div>
        <div class="store-copy">
          <p class="shopkeeper-dialogue">${selectedOption?.response ?? store.dialogue}</p>
          <div class="store-options" aria-label="Shopkeeper responses">
            ${store.options.map((option, index) => `<button type="button" data-store-option="${index}">${option.label}</button>`).join('')}
            <button type="button" class="leave-button" data-store-leave="true">(L)eave</button>
          </div>
        </div>
      </div>
      <p class="store-hint">Choose a reply, or press L / Escape to return to the street.</p>
    </section>`;

  const focusTarget = focusSelector
    ? storeOverlay.querySelector<HTMLButtonElement>(focusSelector)
    : focusFirstOption
      ? storeOverlay.querySelector<HTMLButtonElement>('[data-store-option]')
      : null;
  focusTarget?.focus();
}

function leaveStore(): void {
  storeSession = closeStore();
  renderStoreOverlay();
  restoreFocus(storeReturnFocus);
  storeReturnFocus = null;
}

storeOverlay.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  if (target.dataset.storeLeave) {
    leaveStore();
  } else if (target.dataset.storeOption) {
    const selectedOption = target.dataset.storeOption;
    storeSession = chooseStoreOption(storeSession!, Number(selectedOption));
    renderStoreOverlay(false, `[data-store-option="${selectedOption}"]`);
  }
});

function handleKey(event: KeyboardEvent): void {
  if (event.repeat) return;
  const key = event.key.toLowerCase();

  if (characterScreen) {
    if (key === 'tab') {
      trapModalFocus(event, characterOverlay);
      return;
    }
    if (key === 'escape' || key === 'backspace' || key === 'b') {
      event.preventDefault();
      leaveCharacterScreen();
      return;
    }
    const memberIndex = Number(key) - 1;
    const member = partyMemberAtIndex(memberIndex);
    if (member) {
      event.preventDefault();
      characterScreen = switchCharacterScreen(characterScreen, member.id);
      renderCharacterOverlay(true);
    }
    return;
  }

  if (storeSession) {
    if (key === 'tab') {
      trapModalFocus(event, storeOverlay);
      return;
    }
    if (key === 'l' || key === 'escape') {
      event.preventDefault();
      leaveStore();
    }
    return;
  }

  if (activeAnimation) return;

  const memberIndex = Number(key) - 1;
  const member = partyMemberAtIndex(memberIndex);
  if (member) {
    event.preventDefault();
    openMemberScreen(member);
    return;
  }

  if (key === ' ') {
    const openedStore = openStore(player);
    if (openedStore) {
      event.preventDefault();
      storeReturnFocus = focusOrigin();
      storeSession = openedStore;
      renderStoreOverlay(true);
    }
    return;
  }

  if (!['w', 's', 'a', 'd'].includes(key)) return;
  event.preventDefault();
  renderer.domElement.focus();
  let next = player;
  if (key === 'w') next = tryMove(player, 'forward');
  if (key === 's') next = tryMove(player, 'backward');
  if (key === 'a') next = turn(player, 'left');
  if (key === 'd') next = turn(player, 'right');
  startAnimation(next);
}

window.addEventListener('keydown', handleKey);
window.addEventListener('resize', resize);
syncCamera();
renderMinimap();
resize();

function render(timestamp: number): void {
  if (activeAnimation) {
    const elapsed = timestamp - activeAnimation.startedAt;
    const progress = Math.min(elapsed / activeAnimation.durationMs, 1);
    const easedProgress = easeInOut(progress);
    const position = activeAnimation.fromPosition.clone().lerp(activeAnimation.toPosition, easedProgress);
    const yaw = activeAnimation.fromYaw + (activeAnimation.toYaw - activeAnimation.fromYaw) * easedProgress;
    if (progress >= 1) {
      player = activeAnimation.to;
      activeAnimation = null;
      syncCamera();
      renderMinimap();
    } else {
      syncCamera(position, yaw);
    }
  }
  renderer.render(scene, camera);
  window.requestAnimationFrame(render);
}
window.requestAnimationFrame(render);
