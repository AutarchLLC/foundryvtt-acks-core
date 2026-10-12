/**
 * Start a throwaway Foundry server for testing the system.
 *
 * Builds .foundry-test/ (license, a junction to src/, a fresh world) and launches
 * Foundry on it with the test world loaded. Your own Foundry data is never touched.
 *
 *   npm run foundry:test            # fresh world every time
 *   npm run foundry:test -- --keep  # keep the world from the previous run
 *
 * Playwright starts this automatically (see playwright.config.mjs).
 */
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { compilePack } from "@foundryvtt/foundryvtt-cli";
import { DATA_ROOT, ROOT, WORLD_ID, resolveFoundryEnv } from "./foundry-env.mjs";

const FIXTURE_DIR = path.join(ROOT, "e2e", "fixtures", "world");

/**
 * @param {number} port
 * @returns {Promise<boolean>}
 */
function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(true));
    server.once("listening", () => server.close(() => resolve(false)));
    server.listen(port);
  });
}

const keepWorld = process.argv.includes("--keep");
const env = resolveFoundryEnv();

const configDir = path.join(DATA_ROOT, "Config");
const dataDir = path.join(DATA_ROOT, "Data");
const systemLink = path.join(dataDir, "systems", "acks");
const worldDir = path.join(dataDir, "worlds", WORLD_ID);

for (const dir of [
  configDir,
  path.join(dataDir, "systems"),
  path.join(dataDir, "worlds"),
  path.join(dataDir, "modules"),
]) {
  fs.mkdirSync(dir, { recursive: true });
}

fs.copyFileSync(env.licenseFile, path.join(configDir, "license.json"));

// A server that was killed (Playwright does this on exit) leaves its lock behind. If nothing
// listens on our port no server owns it, so clear it rather than wait for it to go stale.
if (!(await isPortInUse(env.port))) {
  fs.rmSync(path.join(configDir, "options.json.lock"), { recursive: true, force: true });
}

// Link the system to this checkout's src/ (a junction needs no admin rights on Windows).
const srcDir = path.join(ROOT, "src");
let linkTarget;
try {
  linkTarget = fs.realpathSync(systemLink);
} catch {
  linkTarget = undefined;
}
if (linkTarget !== fs.realpathSync(srcDir)) {
  fs.rmSync(systemLink, { recursive: true, force: true });
  fs.symlinkSync(srcDir, systemLink, "junction");
}

if (!keepWorld || !fs.existsSync(worldDir)) {
  fs.rmSync(worldDir, { recursive: true, force: true });
  fs.mkdirSync(worldDir, { recursive: true });
  const system = JSON.parse(fs.readFileSync(path.join(srcDir, "system.json"), "utf8"));
  const { release } = JSON.parse(fs.readFileSync(path.join(path.dirname(env.mainScript), "package.json"), "utf8"));
  const world = {
    id: WORLD_ID,
    title: "ACKS E2E",
    coreVersion: `${release.generation}.${release.build}`,
    system: system.id,
    systemVersion: system.version,
    compatibility: { minimum: "14", verified: "14" },
    description: "Throwaway world for automated tests. Rebuilt on every test server start.",
    flags: {},
  };
  fs.writeFileSync(path.join(worldDir, "world.json"), JSON.stringify(world, null, 2));

  // Seed world collections from JSON, one folder per collection (e2e/fixtures/world/users → data/users).
  for (const entry of fs.readdirSync(FIXTURE_DIR, { withFileTypes: true }).filter((e) => e.isDirectory())) {
    await compilePack(path.join(FIXTURE_DIR, entry.name), path.join(worldDir, "data", entry.name), { log: false });
  }
}

console.log(`Starting Foundry on ${env.baseURL} (world "${WORLD_ID}", data in ${DATA_ROOT})`);

// Run Foundry in this process rather than as a child: on Windows, killing a parent does not
// kill its children, which would leave an orphaned server holding the data folder lock.
process.argv = [
  process.argv[0],
  env.mainScript,
  `--dataPath=${DATA_ROOT}`,
  `--port=${env.port}`,
  `--world=${WORLD_ID}`,
  "--noupdate",
  "--noupnp",
  "--hotReload",
];
await import(pathToFileURL(env.mainScript).href);
