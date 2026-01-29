#!/usr/bin/env node

/**
 * Task completion monitor for Page Health Analyzer
 * Monitors tasks.md for completed tasks and triggers version bump
 */

const fs = require('fs');
const path = require('path');
const { bumpVersion } = require('./bump-version');

function checkTaskCompletion() {
  try {
    const tasksPath = path.join(__dirname, '..', '.kiro', 'specs', 'page-health-analyzer', 'tasks.md');
    
    if (!fs.existsSync(tasksPath)) {
      console.log('Tasks file not found, skipping version bump');
      return;
    }
    
    const tasksContent = fs.readFileSync(tasksPath, 'utf8');
    
    // Count completed tasks (lines with [x])
    const completedTasks = (tasksContent.match(/- \[x\]/g) || []).length;
    
    // Read previous count from a tracking file
    const trackingPath = path.join(__dirname, '..', '.kiro', 'task-count.txt');
    let previousCount = 0;
    
    if (fs.existsSync(trackingPath)) {
      const previousCountStr = fs.readFileSync(trackingPath, 'utf8').trim();
      previousCount = parseInt(previousCountStr) || 0;
    }
    
    console.log(`Task completion check: ${completedTasks} completed (was ${previousCount})`);
    
    // If we have more completed tasks than before, bump version
    if (completedTasks > previousCount) {
      const newTasks = completedTasks - previousCount;
      console.log(`🎯 ${newTasks} new task(s) completed! Bumping version...`);
      
      // Update tracking file
      fs.writeFileSync(trackingPath, completedTasks.toString());
      
      // Bump version and rebuild
      bumpVersion();
    } else {
      console.log('No new completed tasks detected');
    }
    
  } catch (error) {
    console.error('❌ Failed to check task completion:', error.message);
  }
}

// Check if this script is being run directly
if (require.main === module) {
  checkTaskCompletion();
}

module.exports = { checkTaskCompletion };