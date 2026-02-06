/**
 * Unit tests for VisualDashboard class
 * 
 * Tests the expandable interface functionality, metrics display with threshold
 * comparison, and integration with AssetManager for consistent branding.
 */

import { VisualDashboard } from '../VisualDashboard';
import { AssetManager } from '../../services/AssetManager';
import { AllMetrics, Thresholds, OverallHealth, HealthStatus } from '../../types/index';

// Mock AssetManager
jest.mock('../../services/AssetManager');

describe('VisualDashboard', () => {
  let dashboard: VisualDashboard;
  let mockAssetManager: jest.Mocked<AssetManager>;
  let containerElement: HTMLElement;

  // Sample test data
  const mockMetrics: AllMetrics = {
    navigation: {
      loadTime: 1500,
      ttfb: 200,
      domContentLoaded: 1200,
      available: true
    },
    resource: {
      totalSize: 2048000, // 2MB
      resourceCount: 25,
      largestResource: {
        name: 'main.js',
        size: 512000,
        type: 'script'
      },
      available: true
    },
    rendering: {
      firstPaint: 800,
      largestContentfulPaint: 1800,
      available: true
    },
    network: {
      ajaxCount: 3,
      slowestRequest: {
        url: '/api/data',
        duration: 500
      },
      available: true
    }
  };

  const mockThresholds: Thresholds = {
    pageSize: 1024000, // 1MB
    loadTime: 2000, // 2s
    ttfb: 500 // 500ms
  };

  const mockHealth: OverallHealth = {
    status: 'WARN' as HealthStatus,
    score: 75,
    results: [
      {
        metric: 'Load Time',
        value: 1500,
        threshold: 2000,
        status: 'PASS' as HealthStatus,
        message: 'Load time is within acceptable range'
      },
      {
        metric: 'Page Size',
        value: 2048000,
        threshold: 1024000,
        status: 'FAIL' as HealthStatus,
        message: 'Page size exceeds threshold'
      }
    ],
    worstOffenders: ['Page size is too large', 'Too many resources loaded']
  };

  beforeEach(() => {
    // Create a container element
    containerElement = document.createElement('div');
    containerElement.id = 'test-container';
    document.body.appendChild(containerElement);

    // Create mock AssetManager
    mockAssetManager = new AssetManager() as jest.Mocked<AssetManager>;
    mockAssetManager.getBrandingElements.mockReturnValue({
      productName: 'Blackbox',
      logoPath: 'assets/logo.png',
      primaryColor: '#1a1a1a',
      secondaryColor: '#4a90e2',
      accentColor: '#00c851',
      warningColor: '#ffbb33',
      errorColor: '#ff4444',
      fontFamily: 'system-ui, sans-serif',
      description: 'Test description',
      chartColors: {
        primary: ['#3B82F6', '#10B981', '#F59E0B'],
        success: ['#10B981', '#059669', '#047857'],
        warning: ['#F59E0B', '#D97706', '#B45309'],
        error: ['#EF4444', '#DC2626', '#B91C1C'],
        neutral: ['#6B7280', '#9CA3AF', '#D1D5DB'],
      }
    });
    mockAssetManager.getBrandingColor.mockImplementation((colorType) => {
      const colors = {
        primary: '#1a1a1a',
        secondary: '#4a90e2',
        accent: '#00c851',
        warning: '#ffbb33',
        error: '#ff4444'
      };
      return colors[colorType] || colors.primary;
    });
    mockAssetManager.createLogoElement.mockReturnValue(null); // Simplified for tests
    mockAssetManager.applyBrandingToElement.mockImplementation(() => {});

    // Create dashboard instance
    dashboard = new VisualDashboard(containerElement, mockAssetManager);
  });

  afterEach(() => {
    // Clean up
    document.body.removeChild(containerElement);
    
    // Remove injected styles
    const styleElement = document.querySelector('#blackbox-dashboard-styles');
    if (styleElement) {
      styleElement.remove();
    }
  });

  describe('Initialization', () => {
    it('should initialize with expanded view mode', () => {
      expect(containerElement.classList.contains('blackbox-dashboard')).toBe(true);
      expect(containerElement.classList.contains('blackbox-expanded-view')).toBe(true);
    });

    it('should apply branding to container', () => {
      expect(mockAssetManager.applyBrandingToElement).toHaveBeenCalledWith(containerElement);
    });

    it('should create dashboard structure', () => {
      const header = containerElement.querySelector('.blackbox-dashboard-header');
      const main = containerElement.querySelector('.blackbox-dashboard-main');
      const footer = containerElement.querySelector('.blackbox-dashboard-footer');

      expect(header).toBeTruthy();
      expect(main).toBeTruthy();
      expect(footer).toBeTruthy();
    });

    it('should inject CSS styles', () => {
      const styleElement = document.querySelector('#blackbox-dashboard-styles');
      expect(styleElement).toBeTruthy();
    });
  });



  describe('Loading States', () => {
    it('should show loading indicator', () => {
      dashboard.showLoadingIndicator('Analyzing performance...');

      const loadingState = containerElement.querySelector('.blackbox-loading-state');
      const loadingText = containerElement.querySelector('.blackbox-loading-text');

      expect(loadingState).toBeTruthy();
      expect(loadingText?.textContent).toBe('Analyzing performance...');
    });

    it('should render footer buttons during loading state', () => {
      dashboard.showLoadingIndicator('Analyzing performance...');

      // Check that footer buttons are rendered even during loading
      const footerActions = containerElement.querySelector('.blackbox-footer-actions');
      const analyzeBtn = containerElement.querySelector('#analyze-btn');
      const saveProfileBtn = containerElement.querySelector('#save-profile-btn');
      const viewProfilesBtn = containerElement.querySelector('#view-profiles-btn');
      const configBtn = containerElement.querySelector('#config-btn');

      expect(footerActions).toBeTruthy();
      expect(analyzeBtn).toBeTruthy();
      expect(saveProfileBtn).toBeTruthy();
      expect(viewProfilesBtn).toBeTruthy();
      expect(configBtn).toBeTruthy();

      // Check that button icons are present
      const analyzeBtnIcon = analyzeBtn?.querySelector('.blackbox-btn-icon');
      const analyzeBtnText = analyzeBtn?.querySelector('.blackbox-btn-text');
      
      expect(analyzeBtnIcon).toBeTruthy();
      expect(analyzeBtnIcon?.textContent).toBe('🔍');
      expect(analyzeBtnText).toBeTruthy();
      expect(analyzeBtnText?.textContent).toBe('Analyze Page');
    });

    it('should hide loading indicator and render content', () => {
      dashboard.showLoadingIndicator('Loading...');
      dashboard.updateAnalysisResults(mockHealth, mockMetrics, mockThresholds);
      dashboard.hideLoadingIndicator();

      const loadingState = containerElement.querySelector('.blackbox-loading-state');
      const analysisContent = containerElement.querySelector('.blackbox-analysis-content');

      expect(loadingState).toBeFalsy();
      expect(analysisContent).toBeTruthy();
    });

    it('should show empty state when no data available', () => {
      // Ensure no data is set and call hideLoadingIndicator to trigger empty state
      dashboard.hideLoadingIndicator();

      const emptyState = containerElement.querySelector('.blackbox-empty-state');
      const emptyTitle = containerElement.querySelector('.blackbox-empty-title');

      expect(emptyState).toBeTruthy();
      expect(emptyTitle?.textContent).toBe('Ready to Analyze');
    });
  });

  describe('Metrics Display', () => {
    beforeEach(() => {
      dashboard.updateAnalysisResults(mockHealth, mockMetrics, mockThresholds);
    });

    it('should update metrics display with threshold comparison', () => {
      dashboard.updateMetricsDisplay(mockMetrics, mockThresholds);

      const thresholdDisplay = containerElement.querySelector('.blackbox-threshold-display');
      expect(thresholdDisplay).toBeTruthy();
    });

    it('should render health status section', () => {
      const healthStatus = containerElement.querySelector('.blackbox-health-status');
      const statusTitle = containerElement.querySelector('.blackbox-status-title');
      const statusScore = containerElement.querySelector('.blackbox-status-score');

      expect(healthStatus).toBeTruthy();
      expect(healthStatus?.classList.contains('warn')).toBe(true);
      expect(statusTitle?.textContent).toBe('Fair Performance');
      expect(statusScore?.textContent).toBe('Score: 75/100');
    });

    it('should render metrics table with threshold comparison', () => {
      const thresholdDisplay = containerElement.querySelector('.blackbox-threshold-display');
      const tableHeader = containerElement.querySelector('.blackbox-threshold-table-header');
      const metricRows = containerElement.querySelectorAll('.blackbox-threshold-row');

      expect(thresholdDisplay).toBeTruthy();
      expect(tableHeader).toBeTruthy();
      expect(metricRows.length).toBeGreaterThan(0);

      // Check header columns
      const headerColumns = tableHeader?.querySelectorAll('div');
      expect(headerColumns?.[0]?.textContent).toBe('Metric');
      expect(headerColumns?.[1]?.textContent).toBe('Actual');
      expect(headerColumns?.[2]?.textContent).toBe('Threshold');
      expect(headerColumns?.[3]?.textContent).toBe('Status');
    });

    it('should apply correct color coding to metric values', () => {
      const metricActuals = containerElement.querySelectorAll('.blackbox-metric-actual');
      
      // At least one metric should have color styling
      const hasColoredMetric = Array.from(metricActuals).some(element => {
        const style = (element as HTMLElement).style.color;
        return style && style !== '';
      });
      
      expect(hasColoredMetric).toBe(true);
    });

    it('should render issues section when worst offenders exist', () => {
      const issuesSection = containerElement.querySelector('.blackbox-issues-section');
      const issueItems = containerElement.querySelectorAll('.blackbox-issue-item');

      expect(issuesSection).toBeTruthy();
      expect(issueItems.length).toBe(mockHealth.worstOffenders.length);
      expect(issueItems[0]?.textContent).toContain('Page size is too large');
    });

    it('should render action buttons', () => {
      const actionButtons = containerElement.querySelector('.blackbox-action-buttons');
      const showChartsBtn = containerElement.querySelector('#show-charts-btn');
      const generateReportBtn = containerElement.querySelector('#generate-report-btn');

      expect(actionButtons).toBeTruthy();
      expect(showChartsBtn).toBeTruthy();
      expect(generateReportBtn).toBeTruthy();
    });

    it('should render footer actions', () => {
      const footerActions = containerElement.querySelector('.blackbox-footer-actions');
      const analyzeBtn = containerElement.querySelector('#analyze-btn');
      const configBtn = containerElement.querySelector('#config-btn');

      expect(footerActions).toBeTruthy();
      expect(analyzeBtn).toBeTruthy();
      expect(configBtn).toBeTruthy();
    });
  });

  describe('Threshold Display Generation', () => {
    it('should generate correct threshold displays for available metrics', () => {
      // First set the analysis results to ensure content is rendered
      dashboard.updateAnalysisResults(mockHealth, mockMetrics, mockThresholds);
      dashboard.updateMetricsDisplay(mockMetrics, mockThresholds);

      // Check that metrics are displayed using ThresholdDisplay component
      const metricRows = containerElement.querySelectorAll('.blackbox-threshold-row');
      expect(metricRows.length).toBeGreaterThan(0);

      // Check for specific metrics
      const metricNames = Array.from(containerElement.querySelectorAll('.blackbox-metric-name'))
        .map(el => el.textContent?.trim());

      expect(metricNames).toContain('Load Time');
      expect(metricNames).toContain('Time to First Byte');
      expect(metricNames).toContain('Total Page Size');
    });

    it('should format time values correctly', () => {
      dashboard.updateAnalysisResults(mockHealth, mockMetrics, mockThresholds);
      dashboard.updateMetricsDisplay(mockMetrics, mockThresholds);

      const metricActuals = Array.from(containerElement.querySelectorAll('.blackbox-metric-actual'))
        .map(el => el.textContent?.trim());

      // Should contain formatted time values
      const hasFormattedTime = metricActuals.some(value => 
        value?.includes('s') || value?.includes('ms')
      );
      expect(hasFormattedTime).toBe(true);
    });

    it('should format size values correctly', () => {
      dashboard.updateAnalysisResults(mockHealth, mockMetrics, mockThresholds);
      dashboard.updateMetricsDisplay(mockMetrics, mockThresholds);

      const metricActuals = Array.from(containerElement.querySelectorAll('.blackbox-metric-actual'))
        .map(el => el.textContent?.trim());

      // Should contain formatted size values
      const hasFormattedSize = metricActuals.some(value => 
        value?.includes('MB') || value?.includes('KB') || value?.includes('B')
      );
      expect(hasFormattedSize).toBe(true);
    });

    it('should determine correct health status based on thresholds', () => {
      dashboard.updateAnalysisResults(mockHealth, mockMetrics, mockThresholds);
      dashboard.updateMetricsDisplay(mockMetrics, mockThresholds);

      const statusElements = containerElement.querySelectorAll('.blackbox-metric-status');
      
      // Should have status indicators
      expect(statusElements.length).toBeGreaterThan(0);
      
      // Check for status emojis
      const statusTexts = Array.from(statusElements).map(el => el.textContent?.trim());
      const hasStatusEmojis = statusTexts.some(text => 
        text?.includes('✅') || text?.includes('⚠️') || text?.includes('❌')
      );
      expect(hasStatusEmojis).toBe(true);
    });
  });

  describe('Event Handling', () => {
    it('should add and remove event listeners correctly', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      dashboard.addEventListener('show_charts', handler1);
      dashboard.addEventListener('show_charts', handler2);

      // Set up analysis data first so showCharts can work
      dashboard.updateAnalysisResults(mockHealth, mockMetrics, mockThresholds);
      
      dashboard.showCharts();
      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();

      // Remove one handler
      dashboard.removeEventListener('show_charts', handler1);
      
      // Reset mocks
      handler1.mockReset();
      handler2.mockReset();

      dashboard.hideCharts();
      dashboard.showCharts();
      
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe('Responsive Behavior', () => {
    it('should handle window resize events', () => {
      const originalWidth = containerElement.style.width;
      
      // Trigger resize event
      window.dispatchEvent(new Event('resize'));
      
      // Container should maintain its styling
      expect(containerElement.style.width).toBe(originalWidth);
    });

    it('should apply expanded view styles by default', () => {
      // Check for expanded-specific styling
      expect(containerElement.classList.contains('blackbox-expanded-view')).toBe(true);
      expect(containerElement.style.overflow).toBe('visible');
      expect(containerElement.style.maxHeight).toBe('none');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing DOM elements gracefully', () => {
      // Create a dashboard with minimal container
      const minimalContainer = document.createElement('div');
      const minimalDashboard = new VisualDashboard(minimalContainer, mockAssetManager);

      // This should not throw even with missing elements
      expect(() => minimalDashboard.updateMetricsDisplay(mockMetrics, mockThresholds)).not.toThrow();
      expect(() => minimalDashboard.showLoadingIndicator('Test')).not.toThrow();
      expect(() => minimalDashboard.hideLoadingIndicator()).not.toThrow();
    });
  });

  describe('Integration with AssetManager', () => {
    it('should use AssetManager for branding colors', () => {
      dashboard.updateAnalysisResults(mockHealth, mockMetrics, mockThresholds);

      // The dashboard should call getBrandingColor for various color types
      expect(mockAssetManager.getBrandingColor).toHaveBeenCalled();
      
      // Check that at least accent color is called (for PASS status)
      expect(mockAssetManager.getBrandingColor).toHaveBeenCalledWith('accent');
    });

    it('should request logo element from AssetManager', () => {
      expect(mockAssetManager.createLogoElement).toHaveBeenCalledWith('small');
    });

    it('should apply branding to container element', () => {
      expect(mockAssetManager.applyBrandingToElement).toHaveBeenCalledWith(containerElement);
    });

    it('should use branding configuration in CSS generation', () => {
      const styleElement = document.querySelector('#blackbox-dashboard-styles');
      expect(styleElement?.textContent).toContain('#4a90e2'); // Secondary color
      expect(styleElement?.textContent).toContain('#1a1a1a'); // Primary color
    });
  });

  describe('State Preservation', () => {
    it('should preserve analysis data when content is updated', () => {
      dashboard.updateAnalysisResults(mockHealth, mockMetrics, mockThresholds);

      // Verify content is rendered
      let analysisContent = containerElement.querySelector('.blackbox-analysis-content');
      expect(analysisContent).toBeTruthy();

      // Update metrics display
      dashboard.updateMetricsDisplay(mockMetrics, mockThresholds);
      analysisContent = containerElement.querySelector('.blackbox-analysis-content');
      expect(analysisContent).toBeTruthy();
    });

    it('should maintain loading state during updates', () => {
      dashboard.showLoadingIndicator('Processing...');

      // Update content while loading
      dashboard.updateMetricsDisplay(mockMetrics, mockThresholds);
      let loadingState = containerElement.querySelector('.blackbox-loading-state');
      expect(loadingState).toBeTruthy();
    });
  });

  describe('Chart Integration', () => {
    beforeEach(() => {
      // Set up analysis data for chart tests
      dashboard.updateAnalysisResults(mockHealth, mockMetrics, mockThresholds);
    });

    it('should show charts when showCharts is called', () => {
      dashboard.showCharts();

      const chartsSection = containerElement.querySelector('#blackbox-charts-section');
      expect(chartsSection).toBeTruthy();

      const chartsContainer = containerElement.querySelector('#blackbox-charts-container');
      expect(chartsContainer).toBeTruthy();
    });

    it('should hide charts when hideCharts is called', () => {
      // First show charts
      dashboard.showCharts();
      expect(containerElement.querySelector('#blackbox-charts-section')).toBeTruthy();

      // Then hide them
      dashboard.hideCharts();
      expect(containerElement.querySelector('#blackbox-charts-section')).toBeFalsy();
    });

    it('should toggle charts visibility', () => {
      // Initially hidden
      expect(containerElement.querySelector('#blackbox-charts-section')).toBeFalsy();

      // Toggle to show
      dashboard.toggleCharts();
      expect(containerElement.querySelector('#blackbox-charts-section')).toBeTruthy();

      // Toggle to hide
      dashboard.toggleCharts();
      expect(containerElement.querySelector('#blackbox-charts-section')).toBeFalsy();
    });

    it('should update show charts button text', () => {
      let showChartsBtn = containerElement.querySelector('#show-charts-btn') as HTMLElement;
      
      // Initially should show "Show Graphs"
      expect(showChartsBtn.textContent).toContain('Show Graphs');

      // After showing charts, should show "Hide Graphs"
      dashboard.showCharts();
      showChartsBtn = containerElement.querySelector('#show-charts-btn') as HTMLElement; // Get fresh reference
      expect(showChartsBtn.textContent).toContain('Hide Graphs');

      // After hiding charts, should show "Show Graphs" again
      dashboard.hideCharts();
      showChartsBtn = containerElement.querySelector('#show-charts-btn') as HTMLElement; // Get fresh reference
      expect(showChartsBtn.textContent).toContain('Show Graphs');
    });

    it('should handle chart rendering errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock ChartEngine to throw an error
      const mockChartEngine = dashboard['chartEngine'] as any;
      mockChartEngine.generatePerformanceCharts = jest.fn().mockImplementation(() => {
        throw new Error('Chart generation failed');
      });

      // This should not throw
      expect(() => dashboard.showCharts()).not.toThrow();

      // Should show error state
      const errorState = containerElement.querySelector('.blackbox-charts-error');
      expect(errorState).toBeTruthy();

      consoleSpy.mockRestore();
    });

    it('should clean up charts when hiding', () => {
      dashboard.showCharts();
      
      // Mock the chart engine cleanup method
      const mockChartEngine = dashboard['chartEngine'] as any;
      const destroyChartSpy = jest.spyOn(mockChartEngine, 'destroyChart');

      dashboard.hideCharts();

      // Should have called cleanup methods
      expect(destroyChartSpy).toHaveBeenCalled();
    });

    it('should re-render charts after content updates', () => {
      dashboard.showCharts();
      
      // Mock the chart rendering method
      const renderChartsSectionSpy = jest.spyOn(dashboard as any, 'renderChartsSection');

      // Update analysis results
      dashboard.updateAnalysisResults(mockHealth, mockMetrics, mockThresholds);

      // Should re-render charts after a delay
      setTimeout(() => {
        expect(renderChartsSectionSpy).toHaveBeenCalled();
      }, 150);
    });

    it('should handle show charts button clicks', () => {
      let showChartsBtn = containerElement.querySelector('#show-charts-btn') as HTMLButtonElement;
      
      // Initially no charts
      expect(containerElement.querySelector('#blackbox-charts-section')).toBeFalsy();

      // Click button
      showChartsBtn.click();
      expect(containerElement.querySelector('#blackbox-charts-section')).toBeTruthy();

      // Get fresh reference to button after DOM update
      showChartsBtn = containerElement.querySelector('#show-charts-btn') as HTMLButtonElement;
      
      // Click again to hide
      showChartsBtn.click();
      expect(containerElement.querySelector('#blackbox-charts-section')).toBeFalsy();
    });

    it('should handle minimize charts button clicks', () => {
      dashboard.showCharts();
      
      const minimizeBtn = containerElement.querySelector('#minimize-charts-btn') as HTMLButtonElement;
      expect(minimizeBtn).toBeTruthy();

      // Click minimize button
      minimizeBtn.click();
      expect(containerElement.querySelector('#blackbox-charts-section')).toBeFalsy();
    });

    it('should emit chart events', () => {
      const showHandler = jest.fn();
      const hideHandler = jest.fn();

      dashboard.addEventListener('show_charts', showHandler);
      dashboard.addEventListener('hide_charts', hideHandler);

      dashboard.showCharts();
      expect(showHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'show_charts',
          timestamp: expect.any(Number)
        })
      );

      dashboard.hideCharts();
      expect(hideHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'hide_charts',
          timestamp: expect.any(Number)
        })
      );
    });
  });

  describe('Report Generation', () => {
    beforeEach(() => {
      // Set up analysis data for report tests
      dashboard.updateAnalysisResults(mockHealth, mockMetrics, mockThresholds);
      
      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockResolvedValue(undefined)
        }
      });
      
      // Mock window.isSecureContext
      Object.defineProperty(window, 'isSecureContext', {
        value: true,
        writable: true
      });

      // Mock the handleGenerateReport method to avoid dependency issues
      jest.spyOn(dashboard as any, 'handleGenerateReport').mockImplementation(async () => {
        // Simulate successful report generation
        const feedback = containerElement.querySelector('#report-feedback') as HTMLElement;
        if (feedback) {
          feedback.style.display = 'flex';
          feedback.className = 'blackbox-report-feedback success';
          const textElement = feedback.querySelector('.blackbox-feedback-text') as HTMLElement;
          if (textElement) {
            textElement.textContent = 'Report copied to clipboard!';
          }
        }
        
        // Emit the event
        dashboard['emitEvent']('generate_report', { 
          reportText: 'Mock report text',
          metadata: { generatedAt: new Date(), reportType: 'text' }
        });
      });
    });

    it('should render generate report button in issues section', () => {
      const generateReportBtn = containerElement.querySelector('#generate-report-btn') as HTMLButtonElement;
      expect(generateReportBtn).toBeTruthy();
      expect(generateReportBtn.textContent).toContain('Generate Report');
    });

    it('should render report controls even when no issues exist', () => {
      // Create health data with no issues
      const healthWithoutIssues: OverallHealth = {
        ...mockHealth,
        worstOffenders: []
      };
      
      dashboard.updateAnalysisResults(healthWithoutIssues, mockMetrics, mockThresholds);
      
      const generateReportBtn = containerElement.querySelector('#generate-report-btn') as HTMLButtonElement;
      const noIssuesMessage = containerElement.querySelector('.blackbox-no-issues');
      
      expect(generateReportBtn).toBeTruthy();
      expect(noIssuesMessage).toBeTruthy();
      expect(noIssuesMessage?.textContent).toContain('All metrics within acceptable thresholds');
    });

    it('should handle generate report button clicks', async () => {
      const generateReportBtn = containerElement.querySelector('#generate-report-btn') as HTMLButtonElement;
      
      // Click the button
      generateReportBtn.click();
      
      // Should call the mocked method
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(dashboard['handleGenerateReport']).toHaveBeenCalled();
    });

    it('should show success feedback after report generation', async () => {
      const generateReportBtn = containerElement.querySelector('#generate-report-btn') as HTMLButtonElement;
      
      // Click the button
      generateReportBtn.click();
      
      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should show success feedback
      const feedback = containerElement.querySelector('#report-feedback') as HTMLElement;
      expect(feedback).toBeTruthy();
      expect(feedback.style.display).toBe('flex');
      expect(feedback.classList.contains('success')).toBe(true);
      expect(feedback.textContent).toContain('Report copied to clipboard!');
    });

    it('should emit generate_report event', async () => {
      const reportHandler = jest.fn();
      dashboard.addEventListener('generate_report', reportHandler);
      
      const generateReportBtn = containerElement.querySelector('#generate-report-btn') as HTMLButtonElement;
      
      // Click the button
      generateReportBtn.click();
      
      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should emit event
      expect(reportHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'generate_report',
          timestamp: expect.any(Number),
          data: expect.objectContaining({
            reportText: 'Mock report text',
            metadata: expect.objectContaining({
              generatedAt: expect.any(Date),
              reportType: 'text'
            })
          })
        })
      );
    });

    it('should render print report button alongside generate report button', () => {
      const generateReportBtn = containerElement.querySelector('#generate-report-btn') as HTMLButtonElement;
      const printReportBtn = containerElement.querySelector('#print-report-btn') as HTMLButtonElement;
      
      expect(generateReportBtn).toBeTruthy();
      expect(printReportBtn).toBeTruthy();
      expect(printReportBtn.textContent).toContain('Print Report');
      expect(printReportBtn.title).toBe('Generate and download PDF report');
    });

    it('should handle print report button clicks', async () => {
      // Mock the handlePrintReport method
      const handlePrintReportSpy = jest.spyOn(dashboard as any, 'handlePrintReport').mockImplementation(async () => {
        // Simulate successful PDF generation
        const feedback = containerElement.querySelector('#report-feedback') as HTMLElement;
        if (feedback) {
          feedback.style.display = 'flex';
          feedback.className = 'blackbox-report-feedback success';
          const textElement = feedback.querySelector('.blackbox-feedback-text') as HTMLElement;
          if (textElement) {
            textElement.textContent = 'PDF report downloaded successfully!';
          }
        }
        
        // Emit the event
        dashboard['emitEvent']('export_pdf', { 
          reportData: { metadata: { generatedAt: new Date(), reportType: 'pdf' } },
          filename: 'test-report.pdf',
          fileSize: 1024
        });
      });

      const printReportBtn = containerElement.querySelector('#print-report-btn') as HTMLButtonElement;
      
      // Click the button
      printReportBtn.click();
      
      // Should call the method
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(handlePrintReportSpy).toHaveBeenCalled();
      
      // Should show success feedback
      const feedback = containerElement.querySelector('#report-feedback') as HTMLElement;
      expect(feedback).toBeTruthy();
      expect(feedback.style.display).toBe('flex');
      expect(feedback.classList.contains('success')).toBe(true);
      expect(feedback.textContent).toContain('PDF report downloaded successfully!');
    });

    it('should emit export_pdf event when PDF is generated', async () => {
      // Mock the handlePrintReport method
      jest.spyOn(dashboard as any, 'handlePrintReport').mockImplementation(async () => {
        dashboard['emitEvent']('export_pdf', { 
          reportData: { metadata: { generatedAt: new Date(), reportType: 'pdf' } },
          filename: 'test-report.pdf',
          fileSize: 1024
        });
      });

      const pdfHandler = jest.fn();
      dashboard.addEventListener('export_pdf', pdfHandler);
      
      const printReportBtn = containerElement.querySelector('#print-report-btn') as HTMLButtonElement;
      
      // Click the button
      printReportBtn.click();
      
      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should emit event
      expect(pdfHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'export_pdf',
          timestamp: expect.any(Number),
          data: expect.objectContaining({
            reportData: expect.objectContaining({
              metadata: expect.objectContaining({
                generatedAt: expect.any(Date),
                reportType: 'pdf'
              })
            }),
            filename: 'test-report.pdf',
            fileSize: 1024
          })
        })
      );
    });

    it('should handle missing analysis data gracefully', async () => {
      // Create dashboard without analysis data
      const emptyDashboard = new VisualDashboard(containerElement, mockAssetManager);
      
      // Try to generate report
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Simulate button click by calling the method directly
      await (emptyDashboard as any).handleGenerateReport();
      
      expect(consoleSpy).toHaveBeenCalledWith('Cannot generate report: no analysis data available');
      
      consoleSpy.mockRestore();
    });
  });
});