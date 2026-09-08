import { execFileSync, spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const repositoryRoot = resolve(import.meta.dirname, '..');
const artifactDirectory = resolve(
  process.env.VISUAL_ARTIFACT_DIR ?? join(repositoryRoot, '.artifacts', 'visual-smoke'),
);
const browserCandidates = [
  process.env.VISUAL_BROWSER_PATH,
  '/usr/bin/firefox',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
].filter(Boolean);

let server;
let browser;
let serverOutput = '';

// CSS layout uses fractional viewport units on narrow screens. Keep this small
// tolerance focused on browser rounding rather than masking real regressions.
const GEOMETRY_TOLERANCE_PX = 2;
const EXPECTED_MINIMAP_CELL_COUNT = 15 * 15;

function diagnostic(message) {
  return new Error(`[visual-smoke] ${message}`);
}

function executableExists(candidate) {
  try {
    execFileSync('test', ['-x', candidate], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function findBrowsers() {
  const candidates = [...browserCandidates];
  for (const command of ['firefox', 'firefox-esr', 'chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable']) {
    try {
      candidates.push(execFileSync('which', [command], { encoding: 'utf8' }).trim());
    } catch {
      // Keep looking so every installed browser candidate gets a chance.
    }
  }

  const installed = [...new Set(candidates)].filter(executableExists);
  if (installed.length > 0) return installed;

  throw diagnostic(
    'no usable browser found; install a system Firefox/Chromium or set VISUAL_BROWSER_PATH to an existing executable',
  );
}

async function loadPlaywright() {
  try {
    return await import('playwright-core');
  } catch (error) {
    throw diagnostic(
      `playwright-core is unavailable (${error.message}); run npm ci before running the visual smoke check`,
    );
  }
}

async function waitForServer(url) {
  const deadline = Date.now() + 12_000;
  let lastError = 'no response';
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error.message;
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 150));
  }
  throw diagnostic(`Vite did not become ready at ${url} (${lastError}); inspect server.log`);
}

async function startServer() {
  const port = await new Promise((resolvePromise, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const selectedPort = probe.address().port;
      probe.close(() => resolvePromise(selectedPort));
    });
  });
  server = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: repositoryRoot,
    env: { ...process.env, FORCE_COLOR: '0' },
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (chunk) => {
    serverOutput += chunk.toString();
  });
  server.stderr.on('data', (chunk) => {
    serverOutput += chunk.toString();
  });
  const url = `http://127.0.0.1:${port}`;
  await waitForServer(url);
  return url;
}

async function assertPage(page, condition, message) {
  if (!condition) {
    throw diagnostic(`${message}; inspect generated screenshots and server.log`);
  }
}

async function assertInitialPage(page) {
  const state = await page.evaluate(() => {
    const minimap = document.querySelector('.minimap');
    const minimapRect = minimap?.getBoundingClientRect();
    const playerCell = document.querySelector('.minimap-cell.player');
    return {
      canvas: document.querySelector('canvas'),
      canvasWidth: document.querySelector('canvas')?.width ?? 0,
      canvasHeight: document.querySelector('canvas')?.height ?? 0,
      storeHidden: document.querySelector('.store-overlay')?.hidden,
      characterHidden: document.querySelector('.character-overlay')?.hidden,
      minimapWidth: minimapRect?.width ?? 0,
      minimapHeight: minimapRect?.height ?? 0,
      minimapLeft: minimapRect?.left ?? -Infinity,
      minimapTop: minimapRect?.top ?? -Infinity,
      minimapRight: minimapRect?.right ?? Infinity,
      minimapBottom: minimapRect?.bottom ?? Infinity,
      minimapCellCount: document.querySelectorAll('.minimap-cell').length,
      playerPosition: playerCell?.getAttribute('data-position'),
      playerFacing: playerCell?.getAttribute('data-facing'),
    };
  });
  const tolerance = GEOMETRY_TOLERANCE_PX;
  const viewport = page.viewportSize();
  await assertPage(page, state.canvas !== null, 'the Three.js canvas was not created');
  await assertPage(page, state.canvasWidth > 0 && state.canvasHeight > 0, 'the canvas has no drawable pixels');
  await assertPage(page, state.storeHidden === true, 'the store overlay is visible on the initial page');
  await assertPage(page, state.characterHidden === true, 'the character overlay is visible on the initial page');
  await assertPage(page, state.minimapCellCount === EXPECTED_MINIMAP_CELL_COUNT, `the minimap has ${state.minimapCellCount} cells instead of ${EXPECTED_MINIMAP_CELL_COUNT}`);
  await assertPage(page, Math.abs(state.minimapWidth - state.minimapHeight) <= tolerance, 'the minimap is not square');
  await assertPage(page, state.minimapLeft >= -tolerance && state.minimapTop >= -tolerance, 'the minimap is clipped at the viewport origin');
  await assertPage(page, state.minimapRight <= viewport.width + tolerance && state.minimapBottom <= viewport.height + tolerance, 'the minimap is clipped by the viewport');
  await assertPage(page, state.playerPosition === '1,1' && state.playerFacing === 'east', 'the initial minimap player marker is wrong');
}

async function assertMinimapMarker(page, position, facing) {
  const marker = await page.evaluate(() => {
    const playerCell = document.querySelector('.minimap-cell.player');
    return {
      position: playerCell?.getAttribute('data-position'),
      facing: playerCell?.getAttribute('data-facing'),
      markerCount: document.querySelectorAll('.minimap-cell.player').length,
    };
  });
  await assertPage(page, marker.markerCount === 1, 'the minimap has an invalid player marker count');
  await assertPage(page, marker.position === position && marker.facing === facing, `the minimap marker is ${marker.position}/${marker.facing}, expected ${position}/${facing}`);
}

async function assertOverlayGeometry(page, overlaySelector, panelSelector, label) {
  const geometry = await page.evaluate(({ overlay, panel }) => {
    const overlayElement = document.querySelector(overlay);
    const panelElement = document.querySelector(panel);
    if (!overlayElement || !panelElement) return null;
    const overlayRect = overlayElement.getBoundingClientRect();
    const panelRect = panelElement.getBoundingClientRect();
    const centerElement = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    return {
      overlayLeft: overlayRect.left,
      overlayTop: overlayRect.top,
      overlayRight: overlayRect.right,
      overlayBottom: overlayRect.bottom,
      panelLeft: panelRect.left,
      panelTop: panelRect.top,
      panelRight: panelRect.right,
      panelBottom: panelRect.bottom,
      zIndex: Number.parseInt(getComputedStyle(overlayElement).zIndex, 10),
      centerIsInPanel: centerElement instanceof Element && panelElement.contains(centerElement),
    };
  }, { overlay: overlaySelector, panel: panelSelector });
  await assertPage(page, geometry !== null, `${label} overlay or panel is missing`);
  const tolerance = GEOMETRY_TOLERANCE_PX;
  const viewport = page.viewportSize();
  await assertPage(page, geometry.overlayLeft >= -tolerance && geometry.overlayTop >= -tolerance && geometry.overlayRight <= viewport.width + tolerance && geometry.overlayBottom <= viewport.height + tolerance, `the ${label} overlay does not cover the viewport`);
  await assertPage(page, geometry.panelLeft >= -tolerance && geometry.panelTop >= -tolerance && geometry.panelRight <= viewport.width + tolerance && geometry.panelBottom <= viewport.height + tolerance, `the ${label} panel is clipped by the viewport`);
  await assertPage(page, geometry.zIndex >= 2 && geometry.centerIsInPanel, `the ${label} panel is not the topmost centered layer`);
}

async function screenshot(page, filename) {
  const path = join(artifactDirectory, filename);
  await page.screenshot({ path });
  const details = await stat(path);
  await assertPage(page, details.size > 1_024, `${filename} is blank or unexpectedly small`);
}

async function waitForState(page, tile, facing) {
  const [x, y] = tile.split(',');
  const expected = `TILE ${x}, ${y}  ·  FACING ${facing.toUpperCase()}`;
  try {
    await page.waitForFunction((state) => document.querySelector('#state')?.textContent === state, expected, { timeout: 2_000 });
  } catch {
    const actual = await page.locator('#state').textContent();
    throw diagnostic(`expected ${expected}, got ${actual}; inspect generated screenshots and server.log`);
  }
}

async function waitForMovement(page) {
  await page.waitForTimeout(190);
}

async function assertResponsiveGeometry(page, title, { modalSelector = null } = {}) {
  const result = await page.evaluate((modal) => {
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const selectors = modal
      ? [`${modal} [role="dialog"]`, `${modal} button`, `${modal} input`]
      : ['#minimap', '#movement-speed', '.party-card', '[data-menu-control]'];
    const elements = selectors.flatMap((selector) => [...document.querySelectorAll(selector)]);
    const visible = elements.filter((element) => {
      const style = getComputedStyle(element);
      return !element.hasAttribute('hidden') && style.display !== 'none' && style.visibility !== 'hidden';
    });
    const failures = [];
    const rects = new Map();
    const nameOf = (element) => element.getAttribute('aria-label') || element.id || element.className || element.tagName;

    for (const element of visible) {
      const rect = element.getBoundingClientRect();
      rects.set(element, rect);
      if (rect.width <= 0 || rect.height <= 0) failures.push(`${nameOf(element)} has no layout box`);
      if (rect.left < 0 || rect.top < 0 || rect.right > viewport.width || rect.bottom > viewport.height) {
        failures.push(`${nameOf(element)} is outside ${viewport.width}x${viewport.height}`);
      }
    }

    const overlaps = (left, right) => left.left < right.right && left.right > right.left && left.top < right.bottom && left.bottom > right.top;
    for (let leftIndex = 0; leftIndex < visible.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < visible.length; rightIndex += 1) {
        const left = visible[leftIndex];
        const right = visible[rightIndex];
        if (!left.contains(right) && !right.contains(left) && overlaps(rects.get(left), rects.get(right))) {
          failures.push(`${nameOf(left)} overlaps ${nameOf(right)}`);
        }
      }
    }

    for (const element of visible.filter((candidate) => candidate.matches('button, input, [role="button"], [data-menu-control]'))) {
      const rect = rects.get(element);
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      if (!(hit instanceof Element) || !(hit === element || element.contains(hit))) {
        failures.push(`${nameOf(element)} center is not its pointer hit target`);
      }
    }

    return failures;
  }, modalSelector);
  await assertPage(page, result.length === 0, `${title}: ${result.join('; ')}`);
}

async function assertModal(page, overlaySelector, panelSelector, title) {
  const state = await page.evaluate(({ overlay, panel }) => {
    const overlayElement = document.querySelector(overlay);
    const panelElement = document.querySelector(panel);
    return {
      visible: overlayElement instanceof HTMLElement && !overlayElement.hidden,
      role: panelElement?.getAttribute('role'),
      modal: panelElement?.getAttribute('aria-modal'),
      labelledBy: panelElement?.getAttribute('aria-labelledby'),
      title: panelElement?.querySelector('h2')?.id,
      focusInside: panelElement instanceof HTMLElement && panelElement.contains(document.activeElement),
    };
  }, { overlay: overlaySelector, panel: panelSelector });
  await assertPage(page, state.visible, `${title} overlay is not visible`);
  await assertPage(page, state.role === 'dialog' && state.modal === 'true', `${title} is not a modal dialog`);
  await assertPage(page, Boolean(state.labelledBy && state.labelledBy === state.title), `${title} has no valid accessible label`);
  await assertPage(page, state.focusInside, `${title} did not move focus into the dialog`);
}

async function assertPointerHitTargets(page, selector, title) {
  const results = await page.locator(selector).evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return hit === element || element.contains(hit);
  }));
  await assertPage(page, results.length > 0 && results.every(Boolean), `${title} are not the pointer hit targets`);
}

async function assertFocus(page, selector, title) {
  const focused = await page.locator(selector).evaluate((element) => element === document.activeElement);
  const active = await page.evaluate(() => `${document.activeElement?.tagName ?? 'none'}${document.activeElement instanceof HTMLElement && document.activeElement.id ? `#${document.activeElement.id}` : ''}`);
  await assertPage(page, focused, `${title} did not receive focus (active element: ${active})`);
}

async function launchBrowser(playwright, browserPaths) {
  const launchErrors = [];
  for (const browserPath of browserPaths) {
    const browserType = /firefox/i.test(browserPath) ? playwright.firefox : playwright.chromium;
    try {
      return {
        browser: await browserType.launch({ executablePath: browserPath, headless: true, timeout: 10_000 }),
        browserPath,
      };
    } catch (error) {
      launchErrors.push(`${browserPath}: ${error.message}`);
    }
  }

  throw diagnostic(
    `could not launch any browser candidate headlessly (${launchErrors.join(' | ')}); install a compatible headless browser or set VISUAL_BROWSER_PATH`,
  );
}

async function runChecks(playwright, url, browserPath, launchedBrowser) {
  browser = launchedBrowser;
  const pageErrors = [];
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(350);
  await assertPage(page, pageErrors.length === 0, `the app reported a browser error: ${pageErrors.join('; ')}`);
  await assertInitialPage(page);
  await assertMinimapMarker(page, '1,1', 'east');
  await assertResponsiveGeometry(page, 'desktop base layout');
  await screenshot(page, 'desktop.png');

  const mage = page.locator('[data-party-member="mage"]');
  await mage.click();
  await page.locator('.character-overlay .character-panel').waitFor({ state: 'visible' });
  await assertModal(page, '.character-overlay', '.character-overlay .character-panel', 'character');
  await assertOverlayGeometry(page, '.character-overlay', '.character-overlay .character-panel', 'character');
  await assertFocus(page, '.character-overlay [data-character-close]', 'character close button');
  await assertPointerHitTargets(page, '.character-overlay button', 'character controls');
  await assertResponsiveGeometry(page, 'desktop character dialog', { modalSelector: '.character-overlay' });
  await screenshot(page, 'character-open.png');

  const stateBeforeCharacterInput = await page.locator('#state').textContent();
  await page.keyboard.press('w');
  await waitForMovement(page);
  await page.keyboard.press('Space');
  await assertPage(page, await page.locator('#state').textContent() === stateBeforeCharacterInput, 'movement leaked through the character dialog');
  await assertPage(page, await page.locator('.store-overlay').getAttribute('hidden') !== null, 'store opened through the character dialog');
  await page.keyboard.press('2');
  await assertPage(page, await page.locator('#character-title').textContent() === 'Bran', 'keyboard character switching failed');
  await assertFocus(page, '.character-overlay [data-character-close]', 'character close button after switching');
  await page.keyboard.press('Escape');
  await page.locator('.character-overlay').waitFor({ state: 'hidden' });
  await assertFocus(page, '[data-party-member="mage"]', 'character trigger after Escape');

  for (const member of ['knight', 'priest', 'monk']) {
    const trigger = page.locator(`[data-party-member="${member}"]`);
    await trigger.click();
    await assertModal(page, '.character-overlay', '.character-overlay .character-panel', `${member} character`);
    await trigger.evaluate((element) => element === document.activeElement);
    await page.locator('.character-overlay [data-character-close]').click();
    await page.locator('.character-overlay').waitFor({ state: 'hidden' });
    await assertFocus(page, `[data-party-member="${member}"]`, `${member} trigger after Back`);
  }
  await page.locator('[data-party-member="priest"]').click();
  await page.keyboard.press('Backspace');
  await page.locator('.character-overlay').waitFor({ state: 'hidden' });
  await assertFocus(page, '[data-party-member="priest"]', 'character trigger after Backspace');
  await page.locator('[data-party-member="monk"]').click();
  await page.keyboard.press('b');
  await page.locator('.character-overlay').waitFor({ state: 'hidden' });
  await assertFocus(page, '[data-party-member="monk"]', 'character trigger after B');

  await page.evaluate(() => {
    const input = document.querySelector('#movement-speed');
    if (!(input instanceof HTMLInputElement)) throw new Error('movement speed input missing');
    input.value = '150';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  for (let index = 0; index < 6; index += 1) {
    await page.keyboard.press('w');
    await waitForState(page, `${index + 2},1`, 'east');
  }
  await assertMinimapMarker(page, '7,1', 'east');
  await page.keyboard.press('d');
  await waitForState(page, '7,1', 'south');
  await assertMinimapMarker(page, '7,1', 'south');
  await page.keyboard.press('w');
  await waitForState(page, '7,2', 'south');
  await assertMinimapMarker(page, '7,2', 'south');
  await page.keyboard.press('d');
  await waitForState(page, '7,2', 'west');
  await assertMinimapMarker(page, '7,2', 'west');
  await page.keyboard.press('Space');
  await assertPage(page, await page.locator('.store-overlay').getAttribute('hidden') === null, 'store did not open from its approach tile');
  await page.locator('.store-overlay .store-panel').waitFor({ state: 'visible' });
  await assertModal(page, '.store-overlay', '.store-overlay .store-panel', 'store');
  await assertOverlayGeometry(page, '.store-overlay', '.store-overlay .store-panel', 'store');
  await assertFocus(page, '.store-overlay [data-store-option="0"]', 'store first option');
  await assertPointerHitTargets(page, '.store-overlay button', 'store controls');
  await assertResponsiveGeometry(page, 'desktop store dialog', { modalSelector: '.store-overlay' });
  const stateBeforeStoreInput = await page.locator('#state').textContent();
  await page.keyboard.press('w');
  await waitForMovement(page);
  await page.keyboard.press('1');
  await assertPage(page, await page.locator('#state').textContent() === stateBeforeStoreInput, 'movement leaked through the store dialog');
  await assertPage(page, await page.locator('.character-overlay').getAttribute('hidden') !== null, 'character opened through the store dialog');

  const dialogueBeforeOption = await page.locator('.shopkeeper-dialogue').textContent();
  await page.locator('[data-store-option="0"]').click();
  await assertPage(page, await page.locator('.shopkeeper-dialogue').textContent() !== dialogueBeforeOption, 'pointer store option did not update dialogue');
  await assertFocus(page, '.store-overlay [data-store-option="0"]', 'store option after pointer activation');
  await page.locator('[data-store-option="1"]').focus();
  await page.keyboard.press('Enter');
  await assertPage(page, (await page.locator('.shopkeeper-dialogue').textContent()).includes('hat-titude'), 'keyboard store option did not update dialogue');
  await page.locator('.store-overlay .leave-button').focus();
  await page.keyboard.press('Tab');
  await assertFocus(page, '.store-overlay [data-store-option="0"]', 'store focus loop');
  await page.locator('.store-overlay [data-store-option="0"]').focus();
  await page.keyboard.press('Shift+Tab');
  await assertFocus(page, '.store-overlay .leave-button', 'reverse store focus loop');
  await screenshot(page, 'store-open.png');
  await page.keyboard.press('Escape');
  await page.locator('.store-overlay').waitFor({ state: 'hidden' });
  await assertFocus(page, 'canvas', 'store trigger after Escape');

  await page.keyboard.press('Space');
  await page.locator('.store-overlay .store-panel').waitFor({ state: 'visible' });
  await page.keyboard.press('l');
  await page.locator('.store-overlay').waitFor({ state: 'hidden' });
  await assertFocus(page, 'canvas', 'store trigger after L');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(350);
  await assertInitialPage(page);
  await assertResponsiveGeometry(page, 'narrow base layout');
  await screenshot(page, 'narrow.png');

  await page.locator('[data-party-member="mage"]').click();
  await page.locator('.character-overlay .character-panel').waitFor({ state: 'visible' });
  await assertModal(page, '.character-overlay', '.character-overlay .character-panel', 'narrow character');
  await assertOverlayGeometry(page, '.character-overlay', '.character-overlay .character-panel', 'narrow character');
  await assertResponsiveGeometry(page, 'narrow character dialog', { modalSelector: '.character-overlay' });
  await screenshot(page, 'narrow-character-open.png');
  await page.keyboard.press('Escape');
  await page.locator('.character-overlay').waitFor({ state: 'hidden' });

  await page.evaluate(() => {
    const input = document.querySelector('#movement-speed');
    if (!(input instanceof HTMLInputElement)) throw new Error('movement speed input missing');
    input.value = '150';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  for (let index = 0; index < 6; index += 1) {
    await page.keyboard.press('w');
    await waitForState(page, `${index + 2},1`, 'east');
  }
  await page.keyboard.press('d');
  await waitForState(page, '7,1', 'south');
  await page.keyboard.press('w');
  await waitForState(page, '7,2', 'south');
  await page.keyboard.press('d');
  await waitForState(page, '7,2', 'west');
  await page.keyboard.press('Space');
  await page.locator('.store-overlay .store-panel').waitFor({ state: 'visible' });
  await assertModal(page, '.store-overlay', '.store-overlay .store-panel', 'narrow store');
  await assertOverlayGeometry(page, '.store-overlay', '.store-overlay .store-panel', 'narrow store');
  await assertResponsiveGeometry(page, 'narrow store dialog', { modalSelector: '.store-overlay' });
  await screenshot(page, 'narrow-store-open.png');
  await page.keyboard.press('Escape');
  await page.locator('.store-overlay').waitFor({ state: 'hidden' });
  await assertPage(page, pageErrors.length === 0, `the app reported a browser error: ${pageErrors.join('; ')}`);
}

async function cleanup() {
  if (browser) await browser.close().catch(() => {});
  if (server?.pid) {
    try {
      process.kill(-server.pid, 'SIGTERM');
    } catch {
      // The process group may already be gone after a failed server start.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
    try {
      process.kill(-server.pid, 'SIGKILL');
    } catch {
      // The process group exited cleanly.
    }
  }
  await writeFile(join(artifactDirectory, 'server.log'), serverOutput);
}

await mkdir(artifactDirectory, { recursive: true });
try {
  const browserPaths = findBrowsers();
  const playwright = await loadPlaywright();
  const url = await startServer();
  const { browser: launchedBrowser, browserPath } = await launchBrowser(playwright, browserPaths);
  await runChecks(playwright, url, browserPath, launchedBrowser);
  console.log(`[visual-smoke] passed with ${browserPath}`);
  console.log(`[visual-smoke] artifacts: ${artifactDirectory}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await cleanup();
}
