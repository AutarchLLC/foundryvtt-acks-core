import process from "node:process";
import prompts from "prompts";
import path from "path";
import fs from "fs";
import { MODULE_PATH, SRC_NAME } from "./common.mjs";

const windowsInstructions = process.platform === "win32" ? ' Start with a drive letter ("C:\\").' : "";
const foundryPathAnswer = await prompts({
  type: "text",
  name: "foundryPath",
  format: (v) => v.replace(/\W*$/, "").trim(),
  message: `Enter the full path to your Foundry Data folder.${windowsInstructions}`,
});

const foundryPath = foundryPathAnswer?.foundryPath ?? "";

if (!foundryPath) {
  console.error("No path entered.");
  process.exit(1);
}

const dataPath = /\bData$/.test(foundryPath) ? foundryPath : path.join(foundryPath, "Data");
const dataPathStats = fs.lstatSync(dataPath, { throwIfNoEntry: false });
if (!dataPathStats?.isDirectory()) {
  console.error(`No folder found at "${dataPath}"`);
  process.exit(1);
}

const systemFile = JSON.parse(fs.readFileSync(MODULE_PATH, { encoding: "utf8" }));
const systemId = systemFile.id;
const foundryFolder = "systems";
const symlinkPath = path.resolve(dataPath, foundryFolder, systemId);
const symlinkStats = fs.lstatSync(symlinkPath, { throwIfNoEntry: false });

if (symlinkStats) {
  const atPath = symlinkStats.isDirectory() ? "folder" : symlinkStats.isSymbolicLink() ? "symlink" : "file";
  const proceedAnswer = await prompts({
    type: "confirm",
    name: "value",
    initial: false,
    message: `A "${systemId}" ${atPath} already exists in the "${foundryFolder}" subfolder. Replace with new symlink?`,
  });
  const proceed = proceedAnswer?.value ?? false;

  if (!proceed) {
    console.log("Aborting.");
    process.exit();
  }
}

try {
  if (symlinkStats?.isDirectory()) {
    fs.rmSync(symlinkPath, { recursive: true, force: true });
  } else if (symlinkStats) {
    fs.unlinkSync(symlinkPath);
  }
  fs.symlinkSync(path.resolve(process.cwd(), `${SRC_NAME}`), symlinkPath);
} catch (error) {
  if (error instanceof Error) {
    console.error(`An error was encountered trying to create a symlink: ${error.message}`);
    process.exit(1);
  }
}

console.log(`Symlink created at "${symlinkPath}"`);
