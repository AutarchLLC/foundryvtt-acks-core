const fs = require("fs");
const path = require("path");

// Read the file line by line
const filePath = path.join(__dirname, "../src/packs/acks-equipment.db");
const fileContent = fs.readFileSync(filePath, "utf-8");
const lines = fileContent.split("\n");

// Loop thru each line
for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  console.log(line);
  let a = JSON.parse(line);
  if (!a.data.weight6 || a.data.weight6 == -1) {
    let nbStones6 = Math.floor(a.data.weight / 166.66);
    a.data.weight6 = nbStones6;
    a.data.weight = -1;
    lines[i] = JSON.stringify(a);
  }
}

// Write the file
fs.writeFileSync(filePath, lines.join("\n"));
