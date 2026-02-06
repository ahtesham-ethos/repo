# Auto Version Bump Hook

This hook automatically increments the extension version in manifest.json whenever a task is completed in the Blackbox project.

## Trigger
- When a task is marked as completed (when `[ ]` changes to `[x]` in tasks.md)

## Action
- Increment the patch version in manifest.json (e.g., 1.0.1 → 1.0.2)
- Rebuild the extension automatically

## Configuration
- **Trigger**: File save event on `.kiro/specs/page-health-analyzer/tasks.md`
- **Action**: Execute shell command
- **Command**: Auto-increment version and rebuild extension