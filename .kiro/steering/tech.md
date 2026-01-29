# Technology Stack

## Core Technologies
- **TypeScript**: Primary language with strict configuration
- **Webpack**: Build system with multiple configurations
- **Jest**: Testing framework with jsdom environment
- **fast-check**: Property-based testing library

## Build System
Multiple webpack configurations for different deployment targets:
- `webpack.config.js`: Main development build
- `webpack.extension.config.js`: Browser extension build
- `webpack.script.config.js`: Injectable script build

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
npm run build          # Production build
```

### Testing
```bash
npm test               # Run all tests
npm run test:watch     # Run tests in watch mode
```

### Utilities
```bash
npm run bump-version   # Bump version numbers
npm run check-tasks    # Monitor task completion
```

## Key Dependencies
- **@types/chrome**: Chrome extension API types
- **copy-webpack-plugin**: Asset copying for builds
- **html-webpack-plugin**: HTML template processing
- **ts-jest**: TypeScript Jest integration

## TypeScript Configuration
- Target: ES2020 with DOM support
- Strict mode enabled with comprehensive linting
- Path alias: `@/` maps to `src/`
- Source maps enabled for debugging