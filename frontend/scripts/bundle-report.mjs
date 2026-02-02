import fs from "node:fs";
import path from "node:path";

const nextDir = path.join(process.cwd(), ".next");
const chunksDir = path.join(nextDir, "static", "chunks");

if (!fs.existsSync(chunksDir)) {
  console.error("No .next/static/chunks directory found. Run `next build` first.");
  process.exit(1);
}

const files = fs.readdirSync(chunksDir).filter((file) => file.endsWith(".js"));
let total = 0;
const sizes = files.map((file) => {
  const filePath = path.join(chunksDir, file);
  const size = fs.statSync(filePath).size;
  total += size;
  return { file, size };
});

sizes.sort((a, b) => b.size - a.size);

const top = sizes.slice(0, 10);
console.log("Total JS (bytes):", total);
console.log("Top 10 chunks:");
for (const entry of top) {
  console.log(`${entry.file} ${entry.size}`);
}
