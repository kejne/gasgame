import * as THREE from 'three';
import { CITY_MAP, MAP_HEIGHT, MAP_WIDTH, TILE_SIZE, type Tile } from './map';

export type HouseVariant = 'brick' | 'wood';
export type FacadeSide = 'north' | 'east' | 'south' | 'west';
export type SurfaceFamily = 'cobble' | 'ground' | HouseVariant;

const BUILDING_SIZE = TILE_SIZE * 0.82;
const WINDOW_WIDTH = 0.58;
const WINDOW_HEIGHT = 0.68;
const WINDOW_VERTICAL_MARGIN = 0.1;
export const MIN_BUILDING_HEIGHT = WINDOW_HEIGHT + WINDOW_VERTICAL_MARGIN * 2;
export const MAX_BUILDING_HEIGHT = 4.5;

export interface HouseVisualVariant {
  readonly family: HouseVariant;
  readonly seed: number;
  readonly accent: string;
}

export interface WindowDescriptor {
  readonly side: FacadeSide;
  /** Offset along the facade, measured from the tile centre in world units. */
  readonly offset: number;
  /** Window centre height above the floor. */
  readonly height: number;
  readonly width: number;
  readonly windowHeight: number;
  readonly renderOnly: true;
}

export interface TileRenderPlan {
  readonly x: number;
  readonly y: number;
  readonly tile: Tile;
  readonly surface: SurfaceFamily;
  readonly floor: { readonly width: number; readonly depth: number; readonly renderOnly: true };
  readonly facade: HouseVisualVariant | null;
  readonly windows: readonly WindowDescriptor[];
  readonly renderOnly: true;
}

export interface TextureCacheSnapshot {
  readonly families: readonly string[];
  readonly created: number;
  readonly cacheHits: number;
  readonly cacheMisses: number;
}

export interface CityRenderDiagnostics {
  readonly schema: 'gasgame.city-render-diagnostics.v1';
  readonly canvas: { readonly created: boolean; readonly context: boolean };
  readonly textures: TextureCacheSnapshot & { readonly assignedFamilies: readonly string[] };
  readonly roadMaterialCount: number;
  readonly facadeMaterialCounts: { readonly brick: number; readonly wood: number };
  readonly houseCount: number;
  readonly windowMeshCount: number;
  readonly floorTileCount: number;
  readonly floorDimensions: {
    readonly minWidth: number;
    readonly maxWidth: number;
    readonly minDepth: number;
    readonly maxDepth: number;
  };
  readonly decorativeObjectsRenderOnly: boolean;
  readonly errors: readonly string[];
  readonly status: 'ok' | 'error';
}

export interface CityRenderDiagnosticsInput {
  readonly canvas: { readonly created: boolean; readonly context: boolean };
  readonly textures: {
    readonly cobble: THREE.Texture;
    readonly brick: THREE.Texture;
    readonly wood: THREE.Texture;
  };
  readonly materials: {
    readonly road: THREE.MeshStandardMaterial;
    readonly brick: THREE.MeshStandardMaterial;
    readonly wood: THREE.MeshStandardMaterial;
  };
  readonly floorObjects: readonly THREE.Mesh[];
  readonly houseObjects: readonly THREE.Mesh[];
  readonly windowObjects: readonly THREE.Mesh[];
  readonly decorativeObjects: readonly THREE.Object3D[];
  readonly errors?: readonly string[];
}

function assertCoordinate(x: number, y: number): void {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= MAP_WIDTH || y >= MAP_HEIGHT) {
    throw new RangeError(`City visual coordinate (${x}, ${y}) is outside the ${MAP_WIDTH}x${MAP_HEIGHT} map`);
  }
}

/** A stable integer hash; visual assignments never depend on runtime randomness. */
export function hashCoordinates(x: number, y: number): number {
  assertCoordinate(x, y);
  let value = Math.imul(x + 1, 0x45d9f3b) ^ Math.imul(y + 1, 0x119de1f3);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return (value ^ (value >>> 16)) >>> 0;
}

export function roadDetailSeedAt(x: number, y: number): number {
  return hashCoordinates(x, y) % 10_000;
}

export function buildingHeightAt(x: number, y: number): number {
  assertCoordinate(x, y);
  return 2.4 + ((x * 7 + y * 11) % 4) * 0.65;
}

export function houseVariantAt(x: number, y: number): HouseVisualVariant {
  const seed = hashCoordinates(x, y);
  const family: HouseVariant = seed % 2 === 0 ? 'brick' : 'wood';
  const accents = family === 'brick' ? ['#9b5144', '#b9634c', '#8f493f'] : ['#795342', '#916247', '#6e493d'];
  return { family, seed, accent: accents[(seed >>> 8) % accents.length] };
}

function sideAtIndex(index: number): FacadeSide {
  return (['north', 'east', 'south', 'west'] as const)[index % 4];
}

function oppositeSide(side: FacadeSide): FacadeSide {
  const opposites: Record<FacadeSide, FacadeSide> = { north: 'south', east: 'west', south: 'north', west: 'east' };
  return opposites[side];
}

/**
 * Creates bounded, render-only windows. `doorSide` is omitted for ordinary
 * houses and excludes the store door facade when supplied by the renderer.
 */
export function normalizeBuildingHeight(height: number, coordinate?: { readonly x: number; readonly y: number }): number {
  if (!Number.isFinite(height)) {
    const location = coordinate ? ` at (${coordinate.x}, ${coordinate.y})` : '';
    throw new RangeError(`Invalid house height ${height}${location}`);
  }
  return Math.min(MAX_BUILDING_HEIGHT, Math.max(MIN_BUILDING_HEIGHT, height));
}

export function houseWindowsAt(x: number, y: number, height = buildingHeightAt(x, y), doorSide?: FacadeSide): readonly WindowDescriptor[] {
  assertCoordinate(x, y);
  if (CITY_MAP[y][x] !== '#') throw new RangeError(`Cannot create house windows for non-building tile (${x}, ${y})`);
  const effectiveHeight = normalizeBuildingHeight(height, { x, y });

  const seed = hashCoordinates(x, y);
  const sides: FacadeSide[] = [];
  const targetCount = 3 + (seed % 2);
  for (let index = 0; sides.length < targetCount && index < 12; index += 1) {
    const side = sideAtIndex((seed >>> (index % 16)) + index * 3);
    if (side !== doorSide && !sides.includes(side)) sides.push(side);
  }
  if (sides.length === 0) sides.push(oppositeSide(doorSide ?? 'north'));

  return sides.map((side, index) => {
    const offsetSeed = (seed >>> ((index * 5) % 24)) & 0xff;
    const offset = -0.88 + (offsetSeed / 255) * 1.76;
    const minCenter = WINDOW_VERTICAL_MARGIN + WINDOW_HEIGHT / 2;
    const maxCenter = effectiveHeight - WINDOW_VERTICAL_MARGIN - WINDOW_HEIGHT / 2;
    const heightSeed = (seed >>> ((index * 7 + 3) % 24)) & 0xff;
    const centerHeight = Math.min(maxCenter, Math.max(minCenter, 1.0 + (heightSeed / 255) * Math.max(0.2, effectiveHeight - 1.2)));
    return {
      side,
      offset,
      height: centerHeight,
      width: WINDOW_WIDTH,
      windowHeight: WINDOW_HEIGHT,
      renderOnly: true,
    };
  });
}

export function tileRenderPlanAt(x: number, y: number, doorSide?: FacadeSide): TileRenderPlan {
  assertCoordinate(x, y);
  const tile = CITY_MAP[y][x] as Tile;
  const facade = tile === '#' ? houseVariantAt(x, y) : null;
  return {
    x,
    y,
    tile,
    surface: tile === '.' ? 'cobble' : facade!.family,
    floor: { width: TILE_SIZE, depth: TILE_SIZE, renderOnly: true },
    facade,
    windows: tile === '#' ? houseWindowsAt(x, y, normalizeBuildingHeight(buildingHeightAt(x, y)), doorSide) : [],
    renderOnly: true,
  };
}

export function createCityRenderPlans(doorSides: ReadonlyMap<string, FacadeSide> = new Map()): readonly TileRenderPlan[] {
  const plans: TileRenderPlan[] = [];
  for (let y = 0; y < MAP_HEIGHT; y += 1) {
    for (let x = 0; x < MAP_WIDTH; x += 1) {
      plans.push(tileRenderPlanAt(x, y, doorSides.get(`${x},${y}`)));
    }
  }
  return plans;
}

const textureCache = new Map<string, THREE.CanvasTexture>();
let textureCacheHits = 0;
let textureCacheMisses = 0;

function textureContext(family: string, size: number): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    throw new Error(`Cannot create ${family} texture: browser document is unavailable`);
  }
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error(`Cannot create ${family} texture: 2D canvas context is unavailable`);
  return { canvas, context };
}

function drawCobble(context: CanvasRenderingContext2D, size: number, seed: number): void {
  context.fillStyle = '#26363c';
  context.fillRect(0, 0, size, size);
  const rows = 7;
  const stoneHeight = size / rows - 3;
  for (let row = 0; row < rows; row += 1) {
    const y = row * (size / rows) + 2;
    const offset = row % 2 === 0 ? 0 : size / 12;
    for (let column = -1; column < 8; column += 1) {
      const x = column * (size / 7) + offset;
      const variation = ((seed + row * 17 + column * 11) >>> 0) % 3;
      context.fillStyle = ['#405158', '#4a5c62', '#37484f'][variation];
      context.beginPath();
      context.roundRect(x + 2, y, size / 7 - 4, stoneHeight, 4);
      context.fill();
      context.strokeStyle = '#1b292f';
      context.lineWidth = 1;
      context.stroke();
    }
  }
}

function drawBrick(context: CanvasRenderingContext2D, size: number, seed: number): void {
  context.fillStyle = '#8d493f';
  context.fillRect(0, 0, size, size);
  const rows = 9;
  const rowHeight = size / rows;
  context.strokeStyle = '#542f31';
  context.lineWidth = 2;
  for (let row = 0; row <= rows; row += 1) {
    const y = row * rowHeight;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(size, y);
    context.stroke();
  }
  for (let row = 0; row < rows; row += 1) {
    const offset = row % 2 === 0 ? 0 : size / 8;
    for (let column = -1; column < 8; column += 1) {
      const x = column * (size / 7) + offset;
      context.fillStyle = ((seed + row * 13 + column * 7) % 3 === 0) ? '#a95745' : '#974c40';
      context.fillRect(x + 2, row * rowHeight + 2, size / 7 - 4, rowHeight - 4);
    }
  }
}

function drawWood(context: CanvasRenderingContext2D, size: number, seed: number): void {
  context.fillStyle = '#76503f';
  context.fillRect(0, 0, size, size);
  const plankWidth = size / 8;
  for (let column = 0; column < 8; column += 1) {
    context.fillStyle = column % 2 === 0 ? '#875c45' : '#704838';
    context.fillRect(column * plankWidth + 1, 0, plankWidth - 2, size);
    context.strokeStyle = '#3f3030';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(column * plankWidth, 0);
    context.lineTo(column * plankWidth, size);
    context.stroke();
    context.strokeStyle = ((seed + column) % 2 === 0) ? '#a26d4d' : '#614034';
    context.lineWidth = 1;
    for (let line = 1; line < 5; line += 1) {
      const y = line * size / 5 + ((seed + column) % 5);
      context.beginPath();
      context.moveTo(column * plankWidth + 4, y);
      context.lineTo((column + 1) * plankWidth - 4, y + 1);
      context.stroke();
    }
  }
}

export function createCityTexture(family: 'cobble' | 'brick' | 'wood', size = 128): THREE.CanvasTexture {
  if (!Number.isInteger(size) || size < 16) throw new RangeError(`Invalid ${family} texture size ${size}`);
  const key = `${family}:${size}`;
  const cached = textureCache.get(key);
  if (cached) {
    textureCacheHits += 1;
    return cached;
  }
  textureCacheMisses += 1;
  const { canvas, context } = textureContext(family, size);
  try {
    if (family === 'cobble') drawCobble(context, size, 31);
    if (family === 'brick') drawBrick(context, size, 47);
    if (family === 'wood') drawWood(context, size, 73);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    texture.needsUpdate = true;
    textureCache.set(key, texture);
    return texture;
  } catch (error) {
    throw new Error(`Failed to generate ${family} texture: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function createCobbleTexture(size = 128): THREE.CanvasTexture { return createCityTexture('cobble', size); }
export function createBrickTexture(size = 128): THREE.CanvasTexture { return createCityTexture('brick', size); }
export function createWoodTexture(size = 128): THREE.CanvasTexture { return createCityTexture('wood', size); }

export function textureCacheSnapshot(): TextureCacheSnapshot {
  return {
    families: [...new Set([...textureCache.keys()].map((key) => key.split(':')[0]))],
    created: textureCacheMisses,
    cacheHits: textureCacheHits,
    cacheMisses: textureCacheMisses,
  };
}

export function resetTextureCache(): void {
  for (const texture of textureCache.values()) texture.dispose();
  textureCache.clear();
  textureCacheHits = 0;
  textureCacheMisses = 0;
}

function meshMap(material: THREE.MeshStandardMaterial): THREE.Texture | null {
  return material.map ?? null;
}

function geometryDimension(mesh: THREE.Mesh, dimension: 'width' | 'depth'): number {
  const parameters = (mesh.geometry as THREE.BufferGeometry & { parameters?: Record<string, number> }).parameters;
  return parameters?.[dimension] ?? Number.NaN;
}

export function buildCityDiagnostics(input: CityRenderDiagnosticsInput): CityRenderDiagnostics {
  const textures = textureCacheSnapshot();
  const errors = [...(input.errors ?? [])];
  const assignedFamilies: string[] = [];
  const expectedTextures: readonly [string, THREE.Texture, THREE.MeshStandardMaterial][] = [
    ['cobble', input.textures.cobble, input.materials.road],
    ['brick', input.textures.brick, input.materials.brick],
    ['wood', input.textures.wood, input.materials.wood],
  ];

  if (!input.canvas.created || !input.canvas.context) errors.push('Three.js canvas/context initialization failed');
  for (const [family, texture, material] of expectedTextures) {
    if (meshMap(material) === texture) assignedFamilies.push(family);
    else if (!meshMap(material)) errors.push(`${family} material has no texture map`);
    else errors.push(`${family} material has the wrong texture map`);
  }
  if (!['cobble', 'brick', 'wood'].every((family) => assignedFamilies.includes(family))) errors.push('one or more required texture families were not assigned');
  if (textures.created !== 3 || textures.cacheMisses !== 3 || textures.families.length !== 3) errors.push('texture cache did not create exactly one texture per family');

  const floorDimensions = input.floorObjects.reduce((dimensions, mesh) => {
    const width = geometryDimension(mesh, 'width');
    const depth = geometryDimension(mesh, 'depth');
    dimensions.minWidth = Math.min(dimensions.minWidth, width);
    dimensions.maxWidth = Math.max(dimensions.maxWidth, width);
    dimensions.minDepth = Math.min(dimensions.minDepth, depth);
    dimensions.maxDepth = Math.max(dimensions.maxDepth, depth);
    if (width !== TILE_SIZE || depth !== TILE_SIZE) errors.push('floor dimensions do not match TILE_SIZE');
    return dimensions;
  }, {
    minWidth: Number.POSITIVE_INFINITY,
    maxWidth: Number.NEGATIVE_INFINITY,
    minDepth: Number.POSITIVE_INFINITY,
    maxDepth: Number.NEGATIVE_INFINITY,
  });
  if (input.floorObjects.length === 0) errors.push('no floor objects were registered');

  const roadMaterialCount = input.floorObjects.filter((mesh) => mesh.material === input.materials.road).length;
  const facadeMaterialCounts = {
    brick: input.houseObjects.filter((mesh) => mesh.material === input.materials.brick).length,
    wood: input.houseObjects.filter((mesh) => mesh.material === input.materials.wood).length,
  };
  if (roadMaterialCount === 0) errors.push('no road objects use the road material');
  if (facadeMaterialCounts.brick === 0 || facadeMaterialCounts.wood === 0) errors.push('one or more facade families have no house objects');
  if (input.houseObjects.some((mesh) => mesh.material !== input.materials.brick && mesh.material !== input.materials.wood)) errors.push('a house object uses an unregistered facade material');

  const decorativeObjectsRenderOnly = input.decorativeObjects.length > 0
    && input.decorativeObjects.every((object) => object.userData.renderOnly === true);
  if (!decorativeObjectsRenderOnly) errors.push('decorative objects are not render-only');

  return {
    schema: 'gasgame.city-render-diagnostics.v1',
    canvas: input.canvas,
    textures: { ...textures, assignedFamilies },
    roadMaterialCount,
    facadeMaterialCounts,
    houseCount: input.houseObjects.length,
    windowMeshCount: input.windowObjects.length,
    floorTileCount: input.floorObjects.length,
    floorDimensions,
    decorativeObjectsRenderOnly,
    errors,
    status: errors.length === 0 ? 'ok' : 'error',
  };
}

export const CITY_VISUAL_CONSTANTS = {
  buildingSize: BUILDING_SIZE,
  windowWidth: WINDOW_WIDTH,
  windowHeight: WINDOW_HEIGHT,
} as const;
