const puppeteer = require("puppeteer");

// --- Constants -----------------------------------------------------------

const VIEWPORT_W = 960;
const VIEWPORT_H = 540;
const SERVER_PORT = 5555;

// Game resolution is 1920x1080 rendered into a 960x540 viewport with
// Phaser.Scale.FIT — viewport coords = game coords / 2.

// --- State ---------------------------------------------------------------

let browser = null;
let page = null;
let screenshotCounter = 0;

// --- Helpers -------------------------------------------------------------

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// --- Core ----------------------------------------------------------------

async function launchGame(opts = {}) {
  const port = opts.port || SERVER_PORT;
  const waitMs = opts.wait || 3000;

  browser = await puppeteer.launch({ headless: true });
  page = await browser.newPage();
  await page.setViewport({ width: VIEWPORT_W, height: VIEWPORT_H });
  await page.goto(`http://localhost:${port}/`, {
    waitUntil: "domcontentloaded",
    timeout: 10000,
  });
  await sleep(waitMs);
  return page;
}

async function screenshot(name) {
  if (!name) {
    screenshotCounter++;
    name = `screenshot-${screenshotCounter}`;
  }
  const path = `${name}.png`;
  await page.screenshot({ path });
  return path;
}

async function cleanup() {
  if (browser) {
    await browser.close();
    browser = null;
    page = null;
  }
}

// --- Interactions --------------------------------------------------------

async function click(x, y, waitMs = 500) {
  await page.mouse.click(x, y);
  await sleep(waitMs);
}

async function hover(x, y, waitMs = 400) {
  await page.mouse.move(x, y);
  await sleep(waitMs);
}

async function drag(fromX, fromY, toX, toY, waitMs = 500) {
  await page.mouse.move(fromX, fromY);
  await page.mouse.down();
  await sleep(100);
  await page.mouse.move(toX, toY, { steps: 10 });
  await sleep(100);
  await page.mouse.up();
  await sleep(waitMs);
}

async function pressKey(key, waitMs = 300) {
  await page.keyboard.press(key);
  await sleep(waitMs);
}

// --- Exports -------------------------------------------------------------

module.exports = {
  // Core
  launchGame,
  screenshot,
  cleanup,
  sleep,
  // Low-level
  click,
  hover,
  drag,
  pressKey,
  // Access for advanced scripts
  getPage: () => page,
  // Constants
  VIEWPORT_W,
  VIEWPORT_H,
  SERVER_PORT,
};
