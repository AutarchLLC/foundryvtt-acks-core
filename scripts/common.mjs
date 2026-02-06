import { readdir } from "node:fs/promises";
import path from "path";

export const PACK_BASE_DIR = "src/";
export const PACK_DEST = "src/packs";
export const PACK_SRC = "src/packs/_source";
export const MODULE_PATH = "src/system.json";

/**
 * Standardize name format.
 * @param {string} name
 * @returns {string}
 */
export function slugify(name) {
  return name
    .toLowerCase()
    .replace("'", "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .replace(/\s+|-{2,}/g, "-");
}

/**
 * Removes unwanted flags, permissions, and other data from entries before extracting or compiling.
 * @param {object} data                           Data for a single entry to clean.
 * @param {object} [options={}]
 * @param {boolean} [options.clearSourceId=true]  Should the core sourceId flag be deleted.
 * @param {number} [options.ownership=0]          Value to reset default ownership to.
 */
export async function cleanPackEntry(data, { clearSourceId = true, ownership = 0 } = {}) {
  if (data.ownership) {
    data.ownership = { default: ownership };
  }

  if (clearSourceId) {
    delete data._stats?.compendiumSource;
    delete data.flags?.core?.sourceId;
  }

  // Remove empty entries in flags
  if (!data.flags) {
    data.flags = {};
  }
  Object.entries(data.flags).forEach(([key, contents]) => {
    if (Object.keys(contents).length === 0) {
      delete data.flags[key];
    }
  });

  if (data.effects) {
    data.effects.forEach((i) => cleanPackEntry(i, { clearSourceId: false }));
  }
  if (data.items) {
    data.items.forEach((i) => cleanPackEntry(i, { clearSourceId: false }));
  }
  if (data.pages) {
    data.pages.forEach((i) => cleanPackEntry(i, { ownership: -1 }));
  }
  if (data.system?.description) {
    data.system.description = cleanString(data.system.description);
  }
  if (data.label) {
    data.label = cleanString(data.label);
  }
  if (data.name) {
    data.name = cleanString(data.name);
  }
}

/**
 * Removes invisible whitespace characters and normalizes single- and double-quotes.
 * @param {string} str  The string to be cleaned.
 * @returns {string}    The cleaned string.
 */
function cleanString(str) {
  return str
    .replace(/\u2060/gu, "")
    .replace(/[‘’]/gu, "'")
    .replace(/[“”]/gu, '"');
}

/**
 * Walk through directories to find files.
 * @param {string} directoryPath
 * @yields {string}
 */
export async function* walkDir(directoryPath) {
  const directory = await readdir(directoryPath, { withFileTypes: true });
  for (const entry of directory) {
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      yield* walkDir(entryPath);
    } else if (path.extname(entry.name) === ".json") {
      yield entryPath;
    }
  }
}
