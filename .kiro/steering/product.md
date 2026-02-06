# Product Overview

Blackbox (formerly Page Health Analyzer) is a lightweight browser-based tool for analyzing webpage performance health against configurable Non-Functional Requirements (NFRs). It features an enhanced visual dashboard with comprehensive metrics display, profile management, and reporting capabilities.

## Core Purpose
- Collect comprehensive performance metrics using Web Performance APIs
- Evaluate page health against configurable thresholds  
- Present results in user-friendly visual dashboard
- Save and track performance profiles over time
- Generate exportable reports (text and PDF)
- Deploy as browser extension or injectable script
- Safe operation on any website using read-only APIs

## Key Features

### Performance Monitoring
- **Navigation Timing**: Load time, TTFB, DOM content loaded
- **Resource Metrics**: Total page size, resource count, largest resources
- **Rendering Performance**: First paint, largest contentful paint
- **Network Activity**: AJAX request count, slowest requests

### Visual Dashboard (Phase 2)
- **Enhanced Interface**: Always-expanded popup with smooth transitions
- **Threshold Visualization**: Side-by-side comparison of actual vs. threshold values
- **Color-Coded Status**: Green (PASS), yellow (WARN), red (FAIL) indicators
- **Formatted Display**: Automatic unit conversion (MB, KB, seconds, milliseconds)
- **Issues Summary**: Clear identification of performance problems

### Profile Management
- **Save Profiles**: Store analysis results with timestamps and URLs
- **View History**: Browse saved profiles with scores and dates
- **Export Reports**: Generate PDF or text reports from profiles
- **Profile Actions**: Print reports or delete unwanted profiles

### Configuration
- **Inline Settings**: Configure thresholds without leaving the popup
- **Adjustable Thresholds**: Page size, load time, TTFB
- **Save & Reset**: Persist configurations or restore defaults
- **Real-time Validation**: Immediate feedback on configuration changes

### Report Generation
- **Text Reports**: Copy formatted reports to clipboard
- **PDF Reports**: Download professional PDF reports (with fallback to text in extension)
- **Structured Data**: Export for integration with external tools
- **Metadata**: Include browser info, timestamps, and URLs

### Context Menu Integration
- **Quick Access**: Right-click any page to analyze with Blackbox
- **Badge Indicators**: Visual feedback in extension icon
- **Notifications**: Optional analysis completion notifications

## Target Users
- **Developers**: Quick performance checks during development
- **Performance Engineers**: Detailed analysis with configurable thresholds
- **QA Teams**: Track performance over time with saved profiles
- **DevOps**: Integrate with monitoring and reporting workflows

## Design Principles
- **User-Friendly**: Clear visual feedback and intuitive interface
- **Non-Intrusive**: Read-only APIs, no website modification
- **Configurable**: Adjust thresholds to match project requirements
- **Portable**: Works as extension or injectable script
- **Comprehensive**: Multiple export formats for different use cases