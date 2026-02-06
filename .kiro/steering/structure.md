# Project Structure

## Root Directory
```
├── src/                 # Source code
│   ├── core/           # Core analysis components
│   ├── components/     # UI components (Phase 2)
│   ├── services/       # Service layer
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   └── assets/         # Static assets (logos, branding)
├── dist/               # Build output
│   ├── extension/      # Browser extension build
│   └── script/         # Injectable script build
├── tests/              # Test setup and utilities
├── scripts/            # Build and utility scripts
├── .kiro/              # Kiro configuration and specs
│   ├── specs/          # Feature specifications
│   └── steering/       # Project steering documents
└── webpack configs     # Multiple build configurations
```

## Source Code Organization (`src/`)

### Core Architecture (`src/core/`)
The main business logic is organized into focused, single-responsibility classes:
- `PageHealthAnalyzer.ts`: Main orchestrator class
- `MetricsCollector.ts`: Performance data collection using Web Performance APIs
- `NFREvaluator.ts`: Health assessment logic with threshold comparison
- `ResultsPresenter.ts`: Output formatting for original UI
- `ConfigurationManager.ts`: Settings management with Chrome storage integration

### UI Components (`src/components/`) - Phase 2
Enhanced visual dashboard components:
- `VisualDashboard.ts`: Main dashboard with expandable interface
- `ThresholdDisplay.ts`: Visual threshold comparison component
- `ChartEngine.ts`: Chart generation (hidden in extension due to CSP)
- `ProfileList.ts`: Profile management UI
- `DashboardIntegration.ts`: Integration layer between dashboard and popup

### Services (`src/services/`)
Service layer for data management and export:
- `AssetManager.ts`: Branding and asset management
- `ProfileManager.ts`: Save and retrieve analysis profiles
- `ReportGenerator.ts`: Generate text and structured reports
- `ExportEngine.ts`: PDF and file export capabilities

### Entry Points
- `index.ts`: Main library entry point
- `popup.ts`: Browser extension popup controller
- `content.ts`: Extension content script for page analysis
- `background.ts`: Extension service worker for lifecycle management
- `standalone.ts`: Injectable script entry point

### Type Definitions (`src/types/`)
- `index.ts`: Core type definitions (metrics, thresholds, health status)
- `phase2.ts`: Phase 2 UI types (dashboard, events, charts)

### Utilities (`src/utils/`)
- `chartjs-config.ts`: Chart.js configuration
- `pdf-utils.ts`: PDF generation utilities

### Assets (`src/assets/`)
- `logo.png`, `logo.svg`: Application logos
- `branding.json`: Branding configuration (colors, fonts)

## Testing Structure
- Tests co-located with source in `__tests__/` directories
- Test files follow `*.test.ts` naming convention
- Unit tests for all core components and services
- Property-based tests using fast-check library
- Setup files in `tests/` directory

## Build Outputs (`dist/`)
- `extension/`: Browser extension files
  - Compiled JavaScript bundles
  - HTML and CSS files
  - Manifest and assets
- `script/`: Injectable script bundle
  - Single-file bundle for injection

## Architecture Patterns

### Design Principles
- **Dependency Injection**: Core classes accept dependencies via constructor
- **Single Responsibility**: Each core class handles one concern
- **Type Safety**: Comprehensive TypeScript interfaces
- **Error Handling**: Graceful degradation when APIs unavailable
- **Separation of Concerns**: Clear boundaries between core, UI, and services

### Component Hierarchy
```
PopupController (popup.ts)
  └── DashboardIntegration
      └── VisualDashboard
          ├── ThresholdDisplay
          ├── ChartEngine
          ├── ProfileList
          └── AssetManager
```

### Data Flow
1. **Analysis Request**: User clicks "Analyze Page" button
2. **Content Script**: Collects performance metrics from page
3. **Popup Controller**: Receives metrics and initiates analysis
4. **PageHealthAnalyzer**: Orchestrates analysis workflow
5. **NFREvaluator**: Evaluates metrics against thresholds
6. **VisualDashboard**: Displays results with visual feedback
7. **ProfileManager**: Optionally saves results for later review

### Storage Architecture
- **Chrome Storage**: Configuration and profiles
- **Local State**: Current analysis results
- **Session State**: UI state (expanded panels, etc.)

## Key Files

### Configuration
- `manifest.json`: Chrome extension manifest
- `tsconfig.json`: TypeScript configuration
- `jest.config.js`: Jest testing configuration
- `webpack.*.config.js`: Build configurations

### Documentation
- `README.md`: Project overview and usage
- `.kiro/steering/*.md`: Project steering documents
- `.kiro/specs/*/`: Feature specifications and tasks