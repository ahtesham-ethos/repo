# Blackbox - Performance Analysis Tool

A lightweight browser-based tool for analyzing webpage performance health against configurable Non-Functional Requirements (NFRs). Features an enhanced visual dashboard with expandable interface, threshold visualization, profile management, and comprehensive reporting capabilities.

## Features

### Core Analysis
- **Performance Monitoring**: Collect comprehensive metrics using Web Performance APIs
  - Navigation timing (load time, TTFB, DOM content loaded)
  - Resource metrics (page size, resource count, largest resources)
  - Rendering performance (first paint, largest contentful paint)
  - Network activity (AJAX requests, slowest requests)
- **Health Assessment**: Evaluate page health against configurable thresholds with PASS/WARN/FAIL status
- **Safe Operation**: Read-only APIs, no website modification

### Phase 2 Enhancements
- **Visual Dashboard**: Enhanced popup interface with expandable capabilities
  - Always-expanded mode for better visibility
  - Smooth transitions and animations
  - Comprehensive metrics display with color-coded status indicators
- **Threshold Visualization**: Side-by-side comparison of actual values vs. thresholds
  - Color-coded status indicators (green/yellow/red)
  - Formatted values with appropriate units
  - Clear visual feedback for performance issues
- **Profile Management**: Save and manage analysis profiles
  - Save analysis results with timestamps
  - View saved profiles with scores and dates
  - Export profiles as PDF or text reports
  - Delete unwanted profiles
- **Configuration Panel**: Inline configuration without leaving the popup
  - Adjust performance thresholds (page size, load time, TTFB)
  - Save and reset configurations
  - Real-time validation
- **Report Generation**: Multiple export formats
  - Text reports (copy to clipboard)
  - PDF reports (download)
  - Structured data for external tools
- **Context Menu Integration**: Right-click any page to analyze with Blackbox

### Deployment Options
- **Browser Extension**: Chrome extension with popup interface
- **Injectable Script**: Standalone script for custom integrations

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
npm test               # Run all tests
npm run test:watch     # Run tests in watch mode
```

### Utilities
```bash
npm run bump-version   # Bump version numbers
npm run check-tasks    # Monitor task completion
```

### Project Structure
```
src/
├── core/              # Core analysis components
│   ├── PageHealthAnalyzer.ts
│   ├── MetricsCollector.ts
│   ├── NFREvaluator.ts
│   ├── ResultsPresenter.ts
│   └── ConfigurationManager.ts
├── components/        # UI components (Phase 2)
│   ├── VisualDashboard.ts
│   ├── ThresholdDisplay.ts
│   ├── ChartEngine.ts
│   ├── ProfileList.ts
│   └── DashboardIntegration.ts
├── services/          # Service layer
│   ├── AssetManager.ts
│   ├── ProfileManager.ts
│   ├── ReportGenerator.ts
│   └── ExportEngine.ts
├── types/             # TypeScript type definitions
│   ├── index.ts
│   └── phase2.ts
├── popup.ts           # Extension popup script
├── content.ts         # Extension content script
├── background.ts      # Extension service worker
└── standalone.ts      # Injectable script entry point
```

## Usage

### Browser Extension
1. Build the extension: `npm run build:extension`
2. Load `dist/extension` in Chrome developer mode
3. Click the extension icon to analyze the current page
4. Use the visual dashboard to:
   - View performance metrics with threshold comparison
   - Save analysis profiles for tracking over time
   - Generate and export reports
   - Configure performance thresholds
5. Right-click any page and select "Analyze with Blackbox" for quick analysis

### Injectable Script
1. Build the script: `npm run build:script`
2. Copy `dist/script/blackbox.js` to your project
3. Inject and run in browser console

## Technology Stack

- **TypeScript**: Strict type safety with ES2020 target
- **Webpack**: Multi-configuration build system
- **Jest**: Testing framework with jsdom environment
- **fast-check**: Property-based testing library
- **Chart.js**: Performance visualization (hidden in extension due to CSP)
- **jsPDF**: PDF report generation

## Architecture

### Core Principles
- **Dependency Injection**: Components accept dependencies via constructor
- **Single Responsibility**: Each class handles one concern
- **Type Safety**: Comprehensive TypeScript interfaces
- **Error Handling**: Graceful degradation when APIs unavailable
- **Testability**: Unit and property-based tests for all components

### Key Components
- **PageHealthAnalyzer**: Main orchestrator for analysis workflow
- **VisualDashboard**: Enhanced UI with expandable interface
- **ThresholdDisplay**: Visual comparison of metrics vs. thresholds
- **ProfileManager**: Save and retrieve analysis profiles
- **ReportGenerator**: Generate text and structured reports
- **ExportEngine**: PDF and file export capabilities

## License

MIT