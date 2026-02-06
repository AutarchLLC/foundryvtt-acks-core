import fs from "fs";
import path from "path";
import { cleanPackEntry, MODULE_PATH, PACK_BASE_DIR, PACK_SRC, slugify } from "./common.mjs";
import { extractPack } from "@foundryvtt/foundryvtt-cli";

const module = JSON.parse(fs.readFileSync(MODULE_PATH, { encoding: "utf8" }));
const packs = module.packs;

for (const pack of packs) {
  const src = path.join(PACK_BASE_DIR, pack.path);
  const dest = path.join(PACK_SRC, pack.name);
  console.info(`Extracting pack ${pack.name}`);

  const folders = {};

  await extractPack(src, dest, {
    transformEntry: (e) => {
      if (e._key.startsWith("!folders")) {
        folders[e._id] = { name: slugify(e.name), folder: e.folder };
      }
      return false;
    },
  });

  const buildPath = (collection, entry, parentKey) => {
    let parent = collection[entry[parentKey]];
    entry.path = entry.name;
    while (parent) {
      entry.path = path.join(parent.name, entry.path);
      parent = collection[parent[parentKey]];
    }
  };

  Object.values(folders).forEach((f) => buildPath(folders, f, "folder"));

  await extractPack(src, dest, {
    log: false,
    transformEntry: cleanPackEntry,
    transformName: (entry) => {
      if (entry._id in folders) {
        return path.join(folders[entry._id].path, "_folder.json");
      }
      const outputName = slugify(entry.name);
      const parent = folders[entry.folder];
      return path.join(parent?.path ?? "", `${outputName}.json`);
    },
  });
}
