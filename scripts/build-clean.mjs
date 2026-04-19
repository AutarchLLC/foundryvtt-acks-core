import fs from "node:fs";
import { DIST_NAME } from "./common.mjs";

fs.rmSync(DIST_NAME, { force: true, recursive: true });
//fs.mkdirSync(DIST_NAME);
