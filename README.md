# Blackbox - Performance Analysis Tool

A lightweight browser-based tool for analyzing webpage performance health against configurable Non-Functional Requirements (NFRs).

## Features

- Collect comprehensive performance metrics using Web Performance APIs
- Evaluate page health against configurable thresholds
- Present results in user-friendly format
- Deploy as browser extension or injectable script
- Safe operation on any website using read-only APIs

## Development

### Setup
```bash
npm install
```

### Build
```bash
# Development build
npm run build:dev

# Production builds
npm run build:extension  # Browser extension
npm run build:script     # Injectable script
```

### Testing
```bash
npm test
npm run test:watch
```

### Project Structure
```
src/
├── core/           # Core analysis components
├── types/          # TypeScript type definitions
├── popup.ts        # Extension popup script
├── content.ts      # Extension content script
├── background.ts   # Extension service worker
└── standalone.ts   # Injectable script entry point
```

## Usage

### Browser Extension
1. Build the extension: `npm run build:extension`
2. Load `dist/extension` in Chrome developer mode
3. Click the extension icon to analyze the current page

### Injectable Script
1. Build the script: `npm run build:script`
2. Copy `dist/script/blackbox.js` to your project
3. Inject and run in browser console

## License

MIT