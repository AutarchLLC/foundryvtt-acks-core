import fs from "fs";
import { readFile, writeFile } from "node:fs/promises";
import { cleanPackEntry, PACK_SRC, walkDir } from "./common.mjs";
import path from "path";

const folders = fs.readdirSync(PACK_SRC, { withFileTypes: true }).filter((file) => file.isDirectory());

for (const folder of folders) {
  console.info(`Cleaning pack ${folder.name}`);

  for await (const src of walkDir(path.join(PACK_SRC, folder.name))) {
    const data = JSON.parse(await readFile(src, { encoding: "utf8" }));

    if (!data._id || !data._key) {
      console.log(`Failed to clean \x1b[31m${src}\x1b[0m, must have _id and _key.`);
      continue;
    }

    await cleanPackEntry(data);
    fs.rmSync(src, { force: true });
    await writeFile(src, `${JSON.stringify(data, null, "  ")}\n`, { mode: 0o664 });
  }
}
