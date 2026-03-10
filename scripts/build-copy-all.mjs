import fs from "fs/promises";
import path from "path";
import { DIST_NAME, INCLUDES, SRC_NAME } from "./common.mjs";

const systemManifest = JSON.parse(await fs.readFile(path.join(process.cwd(), SRC_NAME, "system.json"), "utf-8"));
const packs = systemManifest.packs ?? [];
const languages = systemManifest.languages ?? [];

for (const pack of packs) {
  const srcPath = path.join(process.cwd(), SRC_NAME, pack.path);
  const destPath = path.join(process.cwd(), DIST_NAME, pack.path);
  await fs.cp(srcPath, destPath, { recursive: true });
}

for (const language of languages) {
  const srcPath = path.join(process.cwd(), SRC_NAME, language.path);
  const destPath = path.join(process.cwd(), DIST_NAME, language.path);
  await fs.cp(srcPath, destPath, { recursive: true });
}

for (const path of INCLUDES) {
  await fs.cp(path, path.replace(SRC_NAME, DIST_NAME), { recursive: true });
}
