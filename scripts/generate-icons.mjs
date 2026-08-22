#!/usr/bin/env node

import { mkdir } from "node:fs/promises";
import sharp from "sharp";

await mkdir("src-tauri/icons", { recursive: true });

const icon = Buffer.from(`
  <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <rect width="1024" height="1024" rx="228" fill="#102424"/>
    <circle cx="512" cy="512" r="330" fill="none" stroke="#294642" stroke-width="6"/>
    <text x="492" y="690" text-anchor="middle" font-family="Georgia,serif" font-size="570" font-style="italic" fill="#c9f45b">L</text>
    <circle cx="785" cy="238" r="38" fill="#c9f45b"/>
  </svg>
`);

await sharp(icon).png().toFile("src-tauri/app-icon.png");
await sharp(icon).resize(512, 512).png().toFile("public/icon-512.png");
await sharp(icon).resize(192, 192).png().toFile("public/icon-192.png");

console.log("Základní ikony Licentia byly vytvořeny.");
