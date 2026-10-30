#!/usr/bin/env node

/**
 * Build Manifest Script
 * Merges assets/simulations-data.js (read-only) and scenarios/*.json
 * into assets/manifest.generated.json with validation
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import validator
import { ScenarioValidator } from '../assets/scenario-validator.js';

const SIMULATIONS_DATA_PATH = join(__dirname, '../assets/simulations-data.js');
const SCENARIOS_DIR = join(__dirname, '../scenarios');
const OUTPUT_PATH = join(__dirname, '../assets/manifest.generated.json');

console.log('Building manifest...');

// Read simulations-data.js (read-only, never regenerate)
let simulationsData = [];
try {
    const content = readFileSync(SIMULATIONS_DATA_PATH, 'utf-8');
    // Extract SIMULATIONS array from the file
    const match = content.match(/const SIMULATIONS = \[([\s\S]*?)\];/);
    if (match) {
        // Parse the array (using eval is safe here since we control the file)
        // In production, use a proper JSON parser
        simulationsData = eval(`[${match[1]}]`);
    }
} catch (error) {
    console.error('Error reading simulations-data.js:', error.message);
    process.exit(1);
}

// Read all scenario JSON files
let scenarios = [];
try {
    if (existsSync(SCENARIOS_DIR)) {
        const files = readdirSync(SCENARIOS_DIR).filter(f => f.endsWith('.json'));
        files.forEach(file => {
            try {
                const content = readFileSync(join(SCENARIOS_DIR, file), 'utf-8');
                const scenario = JSON.parse(content);
                scenarios.push(scenario);
            } catch (error) {
                console.error(`Error reading ${file}:`, error.message);
            }
        });
    }
} catch (error) {
    console.error('Error reading scenarios directory:', error.message);
    process.exit(1);
}

// Validate scenarios
const validator = new ScenarioValidator();
const validationResult = validator.validateAll(scenarios);

if (!validationResult.valid) {
    console.error('Validation failed:');
    validationResult.errors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
}

if (validationResult.warnings.length > 0) {
    console.warn('Warnings:');
    validationResult.warnings.forEach(warning => console.warn(`  - ${warning}`));
}

// Build manifest
const manifest = {
    version: new Date().toISOString(),
    total: scenarios.length,
    shown: scenarios.filter(s => s.reviewStatus === 'approved').length,
    hidden: scenarios.filter(s => s.reviewStatus === 'needs-check').length,
    scenarios: scenarios
};

// Write manifest
try {
    writeFileSync(OUTPUT_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
    console.log(`Manifest written to ${OUTPUT_PATH}`);
    console.log(`Total scenarios: ${manifest.total}`);
    console.log(`Shown: ${manifest.shown}`);
    console.log(`Hidden: ${manifest.hidden}`);
} catch (error) {
    console.error('Error writing manifest:', error.message);
    process.exit(1);
}
