import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { CITY_MAP, MAP_HEIGHT, MAP_WIDTH, TILE_SIZE } from './map';
import {
  buildCityDiagnostics,
  buildingHeightAt,
  createCityRenderPlans,
  hashCoordinates,
  houseVariantAt,
  houseWindowsAt,
  roadDetailSeedAt,
  tileRenderPlanAt,
  MIN_BUILDING_HEIGHT,
  MAX_BUILDING_HEIGHT,
} from './cityVisuals';

const buildingTiles = CITY_MAP.flatMap((row, y) => [...row].flatMap((tile, x) => tile === '#' ? [{ x, y }] : []));
const streetTiles = CITY_MAP.flatMap((row, y) => [...row].flatMap((tile, x) => tile === '.' ? [{ x, y }] : []));

 describe('deterministic city render plans', () => {
  it('covers every map tile with exact render-only floor dimensions', () => {
    const plans = createCityRenderPlans();
    expect(plans).toHaveLength(MAP_WIDTH * MAP_HEIGHT);
    expect(plans.every((plan) => plan.renderOnly && plan.floor.renderOnly)).toBe(true);
    expect(plans.every((plan) => plan.floor.width === TILE_SIZE && plan.floor.depth === TILE_SIZE)).toBe(true);
    expect(plans.filter((plan) => plan.surface === 'cobble')).toHaveLength(streetTiles.length);
    expect(plans.filter((plan) => plan.facade !== null)).toHaveLength(buildingTiles.length);
  });

  it('keeps coordinate-derived assignments stable and uses both facade families', () => {
    const first = createCityRenderPlans();
    const second = createCityRenderPlans();
    expect(first).toEqual(second);
    expect(new Set(buildingTiles.map(({ x, y }) => houseVariantAt(x, y).family))).toEqual(new Set(['brick', 'wood']));
    expect(streetTiles.every(({ x, y }) => roadDetailSeedAt(x, y) >= 0)).toBe(true);
    expect(first.filter((plan) => plan.tile === '.').map((plan) => roadDetailSeedAt(plan.x, plan.y)))
      .toEqual(second.filter((plan) => plan.tile === '.').map((plan) => roadDetailSeedAt(plan.x, plan.y)));
    expect(first.filter((plan) => plan.facade).map((plan) => plan.facade)).toEqual(second.filter((plan) => plan.facade).map((plan) => plan.facade));
    expect(first.filter((plan) => plan.tile === '#').map((plan) => plan.windows)).toEqual(second.filter((plan) => plan.tile === '#').map((plan) => plan.windows));
    expect(buildingTiles.every(({ x, y }) => hashCoordinates(x, y) === hashCoordinates(x, y))).toBe(true);
  });

  it('gives every house bounded windows inside its height envelope', () => {
    for (const { x, y } of buildingTiles) {
      const height = buildingHeightAt(x, y);
      const windows = houseWindowsAt(x, y, height);
      expect(windows.length).toBeGreaterThanOrEqual(3);
      expect(windows.length).toBeLessThanOrEqual(4);
      expect(windows.every((window) => window.renderOnly
        && Math.abs(window.offset) <= 0.88
        && window.height - window.windowHeight / 2 >= 0.1
        && window.height + window.windowHeight / 2 <= height - 0.1
        && window.height > 0
        && window.height < height)).toBe(true);
    }
    const minimumWindows = houseWindowsAt(buildingTiles[0].x, buildingTiles[0].y, 0.01);
    expect(minimumWindows.every((window) => window.height - window.windowHeight / 2 >= 0.1
      && window.height + window.windowHeight / 2 <= MIN_BUILDING_HEIGHT - 0.1)).toBe(true);
    const maximumWindows = houseWindowsAt(buildingTiles[0].x, buildingTiles[0].y, 99);
    expect(maximumWindows.every((window) => window.height + window.windowHeight / 2 <= MAX_BUILDING_HEIGHT - 0.1)).toBe(true);
  });

  it('rejects invalid coordinates and non-building window requests', () => {
    expect(() => tileRenderPlanAt(-1, 0)).toThrow(RangeError);
    expect(() => tileRenderPlanAt(MAP_WIDTH, 0)).toThrow(RangeError);
    expect(() => houseWindowsAt(streetTiles[0].x, streetTiles[0].y)).toThrow(RangeError);
  });

  it('can exclude a store door facade without changing the window bounds', () => {
    for (const side of ['north', 'east', 'south', 'west'] as const) {
      const windows = houseWindowsAt(6, 2, buildingHeightAt(6, 2), side);
      expect(windows.every((window) => window.side !== side)).toBe(true);
      expect(windows.every((window) => Math.abs(window.offset) + window.width / 2 <= 1.64)).toBe(true);
    }
  });

  it('rejects missing material maps for every required texture family', () => {
    const textures = { cobble: new THREE.Texture(), brick: new THREE.Texture(), wood: new THREE.Texture() };
    const materials = {
      road: new THREE.MeshStandardMaterial({ map: textures.cobble }),
      brick: new THREE.MeshStandardMaterial({ map: textures.brick }),
      wood: new THREE.MeshStandardMaterial({ map: textures.wood }),
    };
    for (const family of ['cobble', 'brick', 'wood'] as const) {
      materials[family === 'cobble' ? 'road' : family].map = null;
      const diagnostics = buildCityDiagnostics({
        canvas: { created: true, context: true },
        textures,
        materials,
        floorObjects: [new THREE.Mesh(new THREE.BoxGeometry(TILE_SIZE, 0.16, TILE_SIZE), materials.road)],
        houseObjects: [new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), materials.brick), new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), materials.wood)],
        windowObjects: [],
        decorativeObjects: [new THREE.Object3D()],
      });
      expect(diagnostics.status).toBe('error');
      expect(diagnostics.errors).toContain(`${family} material has no texture map`);
      materials[family === 'cobble' ? 'road' : family].map = textures[family];
    }
  });

  it('inspects the complete registered render-only object set', () => {
    const object = new THREE.Object3D();
    object.userData.renderOnly = false;
    const diagnostics = buildCityDiagnostics({
      canvas: { created: true, context: true },
      textures: { cobble: new THREE.Texture(), brick: new THREE.Texture(), wood: new THREE.Texture() },
      materials: {
        road: new THREE.MeshStandardMaterial(),
        brick: new THREE.MeshStandardMaterial(),
        wood: new THREE.MeshStandardMaterial(),
      },
      floorObjects: [],
      houseObjects: [],
      windowObjects: [],
      decorativeObjects: [new THREE.Object3D(), object],
    });
    expect(diagnostics.decorativeObjectsRenderOnly).toBe(false);
    expect(diagnostics.errors).toContain('decorative objects are not render-only');
  });
});
