# Technology Stack

## Core Technologies
- **TypeScript**: Primary language with strict configuration (ES2020 target)
- **Webpack**: Build system with multiple configurations
- **Jest**: Testing framework with jsdom environment
- **fast-check**: Property-based testing library
- **Chart.js**: Performance visualization (hidden in extension due to CSP restrictions)
- **jsPDF**: PDF report generation with fallback to text in extension environment

## Build System
Multiple webpack configurations for different deployment targets:
- `webpack.config.js`: Main development build
- `webpack.extension.config.js`: Browser extension build (production)
- `webpack.script.config.js`: Injectable script build

### Build Features
- **Code Splitting**: Separate bundles for popup, content, and background scripts
- **Asset Management**: Copy static assets (logos, branding, HTML, CSS)
- **Minification**: Production builds are minified for optimal size
- **Source Maps**: Available for debugging
- **TypeScript Compilation**: ts-loader for TypeScript processing

## Common Commands

### Development
```bash
npm install              # Install dependencies
npm run dev             # Development build with watch mode
npm run build:dev       # Development build
```

### Production Builds
```bash
npm run build:extension # Browser extension build
npm run build:script    # Injectable script build
npm run build          # Production build (all targets)
```

### Testing
```bash
npm test               # Run all tests
npm run test:watch     # Run tests in watch mode
```

### Utilities
```bash
npm run bump-version   # Bump version numbers across manifest and package.json
npm run check-tasks    # Monitor task completion in specs
```

## Key Dependencies

### Runtime Dependencies
- **@types/chrome**: Chrome extension API types
- **chart.js**: Chart rendering library
- **jspdf**: PDF generation library
- **html2canvas**: HTML to canvas conversion for PDF generation

### Development Dependencies
- **webpack**: Module bundler
- **webpack-cli**: Webpack command-line interface
- **ts-loader**: TypeScript loader for webpack
- **copy-webpack-plugin**: Asset copying for builds
- **html-webpack-plugin**: HTML template processing
- **jest**: Testing framework
- **ts-jest**: TypeScript Jest integration
- **@types/jest**: Jest type definitions
- **fast-check**: Property-based testing

## TypeScript Configuration

### Compiler Options
- **Target**: ES2020 with DOM support
- **Module**: ESNext with ES2020 library
- **Strict Mode**: Enabled with comprehensive linting
- **Path Alias**: `@/` maps to `src/` for cleaner imports
- **Source Maps**: Enabled for debugging
- **Declaration**: Type declaration files generated

### Type Checking
- Strict null checks enabled
- No implicit any
- No unused locals or parameters
- Strict function types
- Strict property initialization

## Testing Framework

### Jest Configuration
- **Environment**: jsdom for DOM testing
- **Transform**: ts-jest for TypeScript
- **Coverage**: Comprehensive coverage reporting
- **Setup Files**: Custom test setup in `tests/setup.ts`

### Test Types
- **Unit Tests**: Component and service testing
- **Property-Based Tests**: Using fast-check for invariant testing
- **Integration Tests**: Dashboard integration testing

## Browser Extension APIs

### Chrome APIs Used
- **chrome.tabs**: Tab management and messaging
- **chrome.runtime**: Extension lifecycle and messaging
- **chrome.storage**: Configuration and profile storage
- **chrome.contextMenus**: Right-click context menu
- **chrome.action**: Extension icon and badge
- **chrome.notifications**: Analysis completion notifications
- **chrome.scripting**: Content script injection

### Content Security Policy (CSP)
- **Restrictions**: No inline scripts, eval, or external scripts
- **Workarounds**: 
  - Charts hidden in extension (CSP blocks canvas operations)
  - PDF generation with fallback to text export
  - All scripts bundled and minified

## Performance Considerations

### Bundle Size
- **popup.js**: ~321 KB (includes UI components and dependencies)
- **content.js**: ~24 KB (lightweight metrics collection)
- **background.js**: ~4 KB (minimal service worker)
- **Optimization**: Code splitting and tree shaking enabled

### Runtime Performance
- **Metrics Collection**: Non-blocking, uses Performance API
- **UI Rendering**: Efficient DOM updates with minimal reflows
- **Storage**: Async Chrome storage API
- **Memory**: Cleanup on dashboard close

## Development Workflow

### Local Development
1. Install dependencies: `npm install`
2. Start development build: `npm run dev`
3. Load extension in Chrome developer mode
4. Make changes and rebuild
5. Reload extension to test

### Testing Workflow
1. Write tests alongside implementation
2. Run tests: `npm test`
3. Check coverage reports
4. Use watch mode for TDD: `npm run test:watch`

### Release Workflow
1. Update version: `npm run bump-version`
2. Build production: `npm run build:extension`
3. Test extension thoroughly
4. Package `dist/extension` for distribution
5. Submit to Chrome Web Store (if applicable)