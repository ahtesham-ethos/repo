# Blackbox - Auto Version Bump Hook

This directory contains an automated hook system that increments the Chrome extension version whenever tasks are completed in the project.

## How It Works

1. **Task Monitoring**: The system monitors `.kiro/specs/page-health-analyzer/tasks.md` for completed tasks (marked with `[x]`)

2. **Version Bumping**: When new completed tasks are detected, it automatically:
   - Increments the patch version in `manifest.json` (e.g., 1.0.2 → 1.0.3)
   - Rebuilds the extension with `npm run build:extension`
   - Updates the task count tracker

3. **Hook Integration**: The hook is configured to trigger on file save events for the tasks.md file

## Files

- `task-completion-hook.json` - Kiro hook configuration
- `../scripts/task-completion-monitor.js` - Task monitoring script
- `../scripts/bump-version.js` - Version bumping script
- `auto-version-bump.md` - Hook documentation

## Manual Usage

You can also run these commands manually:

```bash
# Check for completed tasks and bump version if needed
npm run check-tasks

# Force bump version (without task check)
npm run bump-version
```

## Current Status

- ✅ Hook system implemented
- ✅ Version bumping working
- ✅ Extension rebuilding working
- ✅ Task tracking working

The system is now active and will automatically increment the extension version whenever you complete tasks in the project!