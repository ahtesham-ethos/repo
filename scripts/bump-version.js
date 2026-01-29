#!/usr/bin/env node

/**
 * Auto-increment version script for Blackbox extension
 * This script increments the patch version in manifest.json and rebuilds the extension
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function bumpVersion() {
  try {
    // Read current manifest.json
    const manifestPath = path.join(__dirname, '..', 'manifest.json');
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContent);
    
    // Parse current version
    const currentVersion = manifest.version;
    const versionParts = currentVersion.split('.');
    
    if (versionParts.length !== 3) {
      console.error('Invalid version format in manifest.json:', currentVersion);
      process.exit(1);
    }
    
    // Increment patch version
    const major = parseInt(versionParts[0]);
    const minor = parseInt(versionParts[1]);
    const patch = parseInt(versionParts[2]) + 1;
    
    const newVersion = `${major}.${minor}.${patch}`;
    
    // Update manifest
    manifest.version = newVersion;
    
    // Write updated manifest
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    
    console.log(`✅ Version bumped: ${currentVersion} → ${newVersion}`);
    
    // Rebuild extension
    console.log('🔨 Rebuilding extension...');
    execSync('npm run build:extension', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    
    console.log('🎉 Extension rebuilt successfully with new version!');
    
  } catch (error) {
    console.error('❌ Failed to bump version:', error.message);
    process.exit(1);
  }
}

// Check if this script is being run directly
if (require.main === module) {
  bumpVersion();
}

module.exports = { bumpVersion };