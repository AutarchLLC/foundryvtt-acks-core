import autoprefixer from "autoprefixer";
import postcss from "postcss";
import fs from "fs/promises";
import path from "path";
import { CSS_MAIN_NAME, DIST_NAME, SRC_NAME } from "./common.mjs";

const inputPath = path.join(process.cwd(), SRC_NAME, CSS_MAIN_NAME);
const outputPath = path.join(process.cwd(), DIST_NAME, CSS_MAIN_NAME);

try {
  const css = await fs.readFile(inputPath, "utf8");
  const result = await postcss([autoprefixer]).process(css, { from: inputPath, to: outputPath });
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, result.css);
  console.log(`CSS built successfully to ${outputPath}`);
} catch (error) {
  console.error("Error building CSS:", error);
  process.exit(1);
}
