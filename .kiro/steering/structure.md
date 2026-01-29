# Project Structure

## Root Directory
```
├── src/                 # Source code
├── dist/               # Build output
├── tests/              # Test setup and utilities
├── scripts/            # Build and utility scripts
├── .kiro/              # Kiro configuration and specs
└── webpack configs     # Multiple build configurations
```

## Source Code Organization (`src/`)

### Core Architecture (`src/core/`)
The main business logic is organized into focused, single-responsibility classes:
- `PageHealthAnalyzer.ts`: Main orchestrator class
- `MetricsCollector.ts`: Performance data collection
- `NFREvaluator.ts`: Health assessment logic
- `ResultsPresenter.ts`: Output formatting
- `ConfigurationManager.ts`: Settings management

### Entry Points
- `index.ts`: Main library entry point
- `popup.ts`: Browser extension popup
- `content.ts`: Extension content script
- `background.ts`: Extension service worker
- `standalone.ts`: Injectable script entry

### Supporting Files
- `types/index.ts`: TypeScript type definitions
- `popup.html` & `popup.css`: Extension UI

## Testing Structure
- Tests co-located with source in `__tests__/` directories
- Test files follow `*.test.ts` naming convention
- Property-based tests use fast-check library
- Setup files in `tests/` directory

## Build Outputs (`dist/`)
- `extension/`: Browser extension files
- `script/`: Injectable script bundle
- Development builds for testing

## Architecture Patterns
- **Dependency Injection**: Core classes accept dependencies via constructor
- **Single Responsibility**: Each core class handles one concern
- **Type Safety**: Comprehensive TypeScript interfaces
- **Error Handling**: Graceful degradation when APIs unavailable