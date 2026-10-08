#!/usr/bin/env node
/**
 * Capture thumbnails for gallery simulations using Playwright.
 * Iterates over each simulation, opens the page, waits 1.5s,
 * captures the canvas element, and saves as assets/thumbs/<id>.webp.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Simulations from the gallery (as identified in index.html)
const simulations = [
  'newton',
  'black-hole-orbit',
  'wave-interference',
  'pendulum-chaos',
  'galaxy-collision'
];

const thumbsDir = path.join(__dirname, '../assets', 'thumbs');
const thumbsDirAbsolute = path.resolve(thumbsDir);

// Ensure thumbs directory exists
if (!fs.existsSync(thumbsDirAbsolute)) {
  fs.mkdirSync(thumbsDirAbsolute, { recursive: true });
}

let successfulCount = 0;
let failedCount = 0;

async function captureThumbnail(simId) {
  try {
    console.log(`Capturing thumbnail for ${simId}...`);
    
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    // Navigate to the simulation page
    await page.goto(`/simulations/${simId}`, { waitUntil: 'networkidle' });
    
    // Wait for canvas to be ready
    await page.waitForSelector('canvas', { timeout: 30 });
    
    // Capture the canvas element as PNG
    const tempPngPath = path.join(__dirname, `temp-${simId}.png`);
    await page.screenshot({ path: tempPngPath, fullPage: false });
    
    // Convert PNG to WebP using sharp
    const webpPath = path.join(thumbsDirAbsolute, `${simId}.webp`);
    const writeStream = fs.createWriteStream(webpPath);
    
    await sharp(tempPngPath)
      .toWebP({ quality: 80 })
      .pipe(writeStream)
      .on('finish', () => {
        successfulCount++;
        console.log(`Successfully saved thumbnail for ${simId} (${webpPath})`);
      })
      .on('error', (err) => {
        failedCount++;
        console.error(`Failed to save thumbnail for ${simId}:`, err.message);
      });
    
    // Clean up temporary PNG file
    fs.unlinkSync(tempPngPath);
  } catch (error) {
    console.error(`Error capturing thumbnail for ${simId}:`, error.message);
    failedCount++;
  }
}

// Run for all simulations
async function main() {
  console.log(`Starting thumbnail capture for ${simulations.length} simulations...`);
  
  for (const simId of simulations) {
    await captureThumbnail(simId);
  }
  
  console.log(`\nSummary:`);
  console.log(`  Successful: ${successfulCount}`);
  console.log(`  Failed: ${failedCount}`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});