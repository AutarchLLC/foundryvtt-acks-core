import autoprefixer from "autoprefixer";
import postcss from "postcss";
import fs from "fs/promises";
import path from "path";
import { DIST_NAME, MODULE_PATH, SRC_NAME, styleSources } from "./common.mjs";

const manifest = JSON.parse(await fs.readFile(path.join(process.cwd(), MODULE_PATH), "utf8"));
const processor = postcss([autoprefixer]);

try {
  for (const src of styleSources(manifest)) {
    const inputPath = path.join(process.cwd(), SRC_NAME, src);
    const outputPath = path.join(process.cwd(), DIST_NAME, src);
    const css = await fs.readFile(inputPath, "utf8");
    const result = await processor.process(css, { from: inputPath, to: outputPath });
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, result.css);
  }
  console.log(`CSS built successfully to ${path.join(process.cwd(), DIST_NAME)}`);
} catch (error) {
  console.error("Error building CSS:", error);
  process.exit(1);
}
