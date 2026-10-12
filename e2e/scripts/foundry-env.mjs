import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

/** Repository root. */
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** Local, per-machine config file (gitignored). */
export const CONFIG_FILE = path.join(ROOT, "e2e", "foundry.config.json");

/** Throwaway Foundry user data folder (gitignored), rebuilt on every start. */
export const DATA_ROOT = path.join(ROOT, ".foundry-test");

/** Id of the test world created inside DATA_ROOT. */
export const WORLD_ID = "acks-e2e";

/**
 * GM user the tests log in as (seeded from e2e/fixtures/world/users). Foundry allows one session
 * per user, so people watching the world join as "Gamemaster" instead and aren't kicked out.
 */
export const TEST_USER = "Playwright";

/**
 * @typedef {object} FoundryEnv
 * @property {string} mainScript   Absolute path to Foundry's main.js
 * @property {string} licenseFile  Absolute path to a license.json activated on this machine
 * @property {number} port         Port the test server listens on
 * @property {string} baseURL      http://localhost:<port>
 * @property {string} [browserChannel]  Playwright browser channel ("chrome", "msedge"), or "" for bundled Chromium
 */

/**
 * Default Foundry user data folders per platform.
 * See https://foundryvtt.com/article/user-data/
 * @returns {string[]}
 */
function defaultUserDataPaths() {
  const home = os.homedir();
  switch (process.platform) {
    case "win32":
      return [path.join(process.env.LOCALAPPDATA ?? path.join(home, "AppData", "Local"), "FoundryVTT")];
    case "darwin":
      return [path.join(home, "Library", "Application Support", "FoundryVTT")];
    default:
      return [path.join(home, ".local", "share", "FoundryVTT")];
  }
}

/**
 * Read the local config file, if any.
 * @returns {Record<string, any>}
 */
function readConfigFile() {
  if (!fs.existsSync(CONFIG_FILE)) return {};
  return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
}

/**
 * Resolve Foundry's main.js from an install folder. Accepts the Electron install root,
 * its resources/app folder, or an unzipped Node.js build.
 * @param {string} installPath
 * @returns {string|undefined}
 */
function findMainScript(installPath) {
  return [
    path.join(installPath, "resources", "app", "main.js"),
    path.join(installPath, "App", "resources", "app", "main.js"), // Windows portable root
    path.join(installPath, "main.js"),
  ].find((p) => fs.existsSync(p));
}

/**
 * Resolve the test environment from env vars, then e2e/foundry.config.json, then defaults.
 * Throws with setup instructions when Foundry or the license can't be found.
 * @returns {FoundryEnv}
 */
export function resolveFoundryEnv() {
  const config = readConfigFile();

  const installPath = process.env.FOUNDRY_INSTALL_PATH ?? config.installPath;
  if (!installPath) {
    throw new Error(
      `Foundry install path not configured. Copy e2e/foundry.config.example.json to ${CONFIG_FILE} ` +
        `and set "installPath", or set FOUNDRY_INSTALL_PATH.`,
    );
  }
  const mainScript = findMainScript(path.resolve(installPath));
  if (!mainScript) {
    throw new Error(`Could not find Foundry's main.js under "${installPath}".`);
  }

  // license.json lives in <user data>/Config. A portable install keeps it next to App/.
  const appDir = path.dirname(mainScript); // …/resources/app
  const userDataPaths = [
    process.env.FOUNDRY_USER_DATA_PATH ?? config.userDataPath,
    path.resolve(appDir, "..", "..", ".."), // portable: <root>/App/resources/app → <root>
    ...defaultUserDataPaths(),
  ].filter(Boolean);
  const licenseFile = userDataPaths.map((p) => path.join(p, "Config", "license.json")).find((p) => fs.existsSync(p));
  if (!licenseFile) {
    throw new Error(
      `No Foundry license.json found (looked in ${userDataPaths.map((p) => path.join(p, "Config")).join(", ")}). ` +
        `Activate Foundry once on this machine, or set "userDataPath" to the folder that contains Config/license.json.`,
    );
  }

  const port = Number(process.env.FOUNDRY_PORT ?? config.port ?? 30001);
  const browserChannel = process.env.FOUNDRY_BROWSER_CHANNEL ?? config.browserChannel ?? "chrome";

  return { mainScript, licenseFile, port, baseURL: `http://localhost:${port}`, browserChannel };
}
