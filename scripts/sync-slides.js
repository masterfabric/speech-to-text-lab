#!/usr/bin/env node
/** slides/ → public/slides/ kopyası (Next.js statik servis için). */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const src = path.join(root, "slides");
const dest = path.join(root, "public", "slides");

function copyRecursive(from, to) {
  const stat = fs.statSync(from);
  if (stat.isDirectory()) {
    fs.mkdirSync(to, { recursive: true });
    for (const name of fs.readdirSync(from)) {
      copyRecursive(path.join(from, name), path.join(to, name));
    }
    return;
  }
  fs.copyFileSync(from, to);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });
copyRecursive(src, dest);

console.log("Slaytlar senkronize edildi: public/slides/");
