import { cleanPackEntry, PACK_DEST, PACK_SRC } from "./common.mjs";
import fs from "fs";
import path from "path";
import { compilePack } from "@foundryvtt/foundryvtt-cli";

// Determine which source folders to process
const folders = fs.readdirSync(PACK_SRC, { withFileTypes: true }).filter((file) => file.isDirectory());

for (const folder of folders) {
  const src = path.join(PACK_SRC, folder.name);
  const dest = path.join(PACK_DEST, folder.name);
  console.info(`Compiling pack ${folder.name}`);
  await compilePack(src, dest, {
    recursive: true,
    log: true,
    transformEntry: cleanPackEntry,
  });
}
