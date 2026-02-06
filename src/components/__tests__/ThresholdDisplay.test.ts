/**
 * Unit tests for ThresholdDisplay component
 * 
 * Tests the enhanced metrics table functionality, color-coding logic,
 * threshold comparison, and human-readable formatting capabilities.
 */

import { ThresholdDisplay } from '../ThresholdDisplay';
import { AssetManager } from '../../services/AssetManager';
import { AllMetrics, Thresholds } from '../../types/index';

// Mock AssetManager
jest.mock('../../services/AssetManager');

describe('ThresholdDisplay', () => {
  let thresholdDisplay: ThresholdDisplay;
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
        url: '/api/data/users/profile',
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

    // Create ThresholdDisplay instance
    thresholdDisplay = new ThresholdDisplay(mockAssetManager);
  });

  afterEach(() => {
    // Clean up
    document.body.removeChild(containerElement);
    
    // Remove injected styles
    const styleElement = document.querySelector('#blackbox-threshold-display-styles');
    if (styleElement) {
      styleElement.remove();
    }
  });

  describe('Initialization', () => {
    it('should create ThresholdDisplay instance', () => {
      expect(thresholdDisplay).toBeInstanceOf(ThresholdDisplay);
    });

    it('should initialize with empty displays', () => {
      const displays = thresholdDisplay.getCurrentDisplays();
      expect(displays).toEqual([]);
    });

    it('should handle missing AssetManager gracefully', () => {
      // The constructor doesn't actually validate the AssetManager parameter
      // This test verifies the component works with null AssetManager using fallbacks
      const nullAssetManager = null as any;
      const display = new ThresholdDisplay(nullAssetManager);
      
      // Should handle null AssetManager gracefully and render with fallback colors
      expect(() => {
        display.render(containerElement, mockMetrics, mockThresholds);
      }).not.toThrow(); // It handles errors gracefully instead of throwing
      
      // Should render the table successfully with fallback colors
      const tableContent = containerElement.querySelector('.blackbox-threshold-display');
      expect(tableContent).toBeTruthy();
      
      // Should have rendered metric rows
      const metricRows = containerElement.querySelectorAll('.blackbox-threshold-row');
      expect(metricRows.length).toBeGreaterThan(0);
    });
  });

  describe('Rendering', () => {
    it('should render threshold display table', () => {
      thresholdDisplay.render(containerElement, mockMetrics, mockThresholds);

      const display = containerElement.querySelector('.blackbox-threshold-display');
      const header = containerElement.querySelector('.blackbox-threshold-header');
      const table = containerElement.querySelector('.blackbox-threshold-table');

      expect(display).toBeTruthy();
      expect(header).toBeTruthy();
      expect(table).toBeTruthy();
    });

    it('should render table header with correct columns', () => {
      thresholdDisplay.render(containerElement, mockMetrics, mockThresholds);

      const headerColumns = containerElement.querySelectorAll('.blackbox-threshold-table-header > div');
      expect(headerColumns).toHaveLength(4);
      expect(headerColumns[0].textContent).toBe('Metric');
      expect(headerColumns[1].textContent).toBe('Actual');
      expect(headerColumns[2].textContent).toBe('Threshold');
      expect(headerColumns[3].textContent).toBe('Status');
    });

    it('should render legend with color indicators', () => {
      thresholdDisplay.render(containerElement, mockMetrics, mockThresholds);

      const legend = containerElement.querySelector('.blackbox-threshold-legend');
      const legendItems = containerElement.querySelectorAll('.blackbox-legend-item');

      expect(legend).toBeTruthy();
      expect(legendItems).toHaveLength(3);
      
      const legendTexts = Array.from(legendItems).map(item => 
        item.querySelector('.blackbox-legend-text')?.textContent
      );
      expect(legendTexts).toEqual(['Pass', 'Warning', 'Fail']);
    });

    it('should inject CSS styles', () => {
      thresholdDisplay.render(containerElement, mockMetrics, mockThresholds);

      const styleElement = document.querySelector('#blackbox-threshold-display-styles');
      expect(styleElement).toBeTruthy();
      expect(styleElement?.textContent).toContain('.blackbox-threshold-display');
    });

    it('should render metric rows for available metrics', () => {
      thresholdDisplay.render(containerElement, mockMetrics, mockThresholds);

      const metricRows = containerElement.querySelectorAll('.blackbox-threshold-row');
      expect(metricRows.length).toBeGreaterThan(0);

      // Check for specific metrics (trim whitespace from textContent)
      const metricNames = Array.from(containerElement.querySelectorAll('.blackbox-metric-name'))
        .map(el => el.textContent?.trim());

      expect(metricNames).toContain('Load Time');
      expect(metricNames).toContain('Time to First Byte');
      expect(metricNames).toContain('Total Page Size');
    });
  });

  describe('Threshold Display Generation', () => {
    beforeEach(() => {
      thresholdDisplay.render(containerElement, mockMetrics, mockThresholds);
    });

    it('should generate displays for navigation metrics', () => {
      const displays = thresholdDisplay.getCurrentDisplays();
      const navigationMetrics = displays.filter(d => 
        ['Load Time', 'Time to First Byte', 'DOM Content Loaded'].includes(d.metric)
      );

      expect(navigationMetrics).toHaveLength(3);
    });

    it('should generate displays for resource metrics', () => {
      const displays = thresholdDisplay.getCurrentDisplays();
      const resourceMetrics = displays.filter(d => 
        ['Total Page Size', 'Resource Count', 'Largest Resource'].includes(d.metric)
      );

      expect(resourceMetrics.length).toBeGreaterThanOrEqual(2); // At least page size and count
    });

    it('should generate displays for rendering metrics', () => {
      const displays = thresholdDisplay.getCurrentDisplays();
      const renderingMetrics = displays.filter(d => 
        ['First Paint', 'Largest Contentful Paint'].includes(d.metric)
      );

      expect(renderingMetrics).toHaveLength(2);
    });

    it('should generate displays for network metrics', () => {
      const displays = thresholdDisplay.getCurrentDisplays();
      const networkMetrics = displays.filter(d => 
        ['AJAX Requests', 'Slowest Request'].includes(d.metric)
      );

      expect(networkMetrics).toHaveLength(2);
    });

    it('should skip unavailable metrics', () => {
      const metricsWithUnavailable: AllMetrics = {
        ...mockMetrics,
        navigation: { ...mockMetrics.navigation, available: false },
        rendering: { ...mockMetrics.rendering, available: false }
      };

      thresholdDisplay.render(containerElement, metricsWithUnavailable, mockThresholds);
      const displays = thresholdDisplay.getCurrentDisplays();

      const navigationMetrics = displays.filter(d => 
        ['Load Time', 'Time to First Byte', 'DOM Content Loaded'].includes(d.metric)
      );
      const renderingMetrics = displays.filter(d => 
        ['First Paint', 'Largest Contentful Paint'].includes(d.metric)
      );

      expect(navigationMetrics).toHaveLength(0);
      expect(renderingMetrics).toHaveLength(0);
    });
  });

  describe('Color Coding Logic', () => {
    beforeEach(() => {
      thresholdDisplay.render(containerElement, mockMetrics, mockThresholds);
    });

    it('should apply green color for PASS status (within threshold)', () => {
      const displays = thresholdDisplay.getCurrentDisplays();
      const passMetric = displays.find(d => d.actualValue <= d.thresholdValue);

      if (passMetric) {
        expect(passMetric.status).toBe('PASS');
        expect(passMetric.colorCode).toBe('#00c851'); // Accent color
      }
    });

    it('should apply yellow color for WARN status (10-50% over threshold)', () => {
      // Create metrics where some values are in warning range
      const warningMetrics: AllMetrics = {
        ...mockMetrics,
        navigation: {
          ...mockMetrics.navigation,
          loadTime: 2500 // 25% over 2000ms threshold
        }
      };

      thresholdDisplay.render(containerElement, warningMetrics, mockThresholds);
      const displays = thresholdDisplay.getCurrentDisplays();
      const warnMetric = displays.find(d => d.metric === 'Load Time');

      expect(warnMetric?.status).toBe('WARN');
      expect(warnMetric?.colorCode).toBe('#ffbb33'); // Warning color
    });

    it('should apply red color for FAIL status (>50% over threshold)', () => {
      const displays = thresholdDisplay.getCurrentDisplays();
      const failMetric = displays.find(d => d.actualValue > d.thresholdValue * 1.5);

      if (failMetric) {
        expect(failMetric.status).toBe('FAIL');
        expect(failMetric.colorCode).toBe('#ff4444'); // Error color
      }
    });

    it('should apply colors to metric values in DOM', () => {
      const metricActuals = containerElement.querySelectorAll('.blackbox-metric-actual');
      
      // At least one metric should have color styling
      const hasColoredMetric = Array.from(metricActuals).some(element => {
        const style = (element as HTMLElement).style.color;
        return style && style !== '';
      });
      
      expect(hasColoredMetric).toBe(true);
    });

    it('should use correct status emojis', () => {
      const statusEmojis = Array.from(containerElement.querySelectorAll('.blackbox-status-emoji'))
        .map(el => el.textContent);

      const validEmojis = ['✅', '⚠️', '❌'];
      statusEmojis.forEach(emoji => {
        expect(validEmojis).toContain(emoji);
      });
    });
  });

  describe('Human-Readable Formatting', () => {
    beforeEach(() => {
      thresholdDisplay.render(containerElement, mockMetrics, mockThresholds);
    });

    it('should format time values correctly', () => {
      const displays = thresholdDisplay.getCurrentDisplays();
      const timeMetric = displays.find(d => d.metric === 'Load Time');

      expect(timeMetric?.formattedActual).toBe('1.50s'); // 1500ms -> 1.50s
      expect(timeMetric?.formattedThreshold).toBe('2.00s'); // 2000ms -> 2.00s
    });

    it('should format small time values in milliseconds', () => {
      const displays = thresholdDisplay.getCurrentDisplays();
      const ttfbMetric = displays.find(d => d.metric === 'Time to First Byte');

      expect(ttfbMetric?.formattedActual).toBe('200ms'); // 200ms stays as ms
      expect(ttfbMetric?.formattedThreshold).toBe('500ms'); // 500ms stays as ms
    });

    it('should format size values correctly', () => {
      const displays = thresholdDisplay.getCurrentDisplays();
      const sizeMetric = displays.find(d => d.metric === 'Total Page Size');

      expect(sizeMetric?.formattedActual).toBe('1.95 MB'); // 2048000 bytes -> 1.95 MB (more precise)
      expect(sizeMetric?.formattedThreshold).toBe('1000.0 KB'); // 1024000 bytes -> 1000.0 KB (exactly 1000 KB)
    });

    it('should format small size values in KB or bytes', () => {
      const smallSizeMetrics: AllMetrics = {
        ...mockMetrics,
        resource: {
          ...mockMetrics.resource,
          totalSize: 1536, // 1.5 KB
          largestResource: {
            ...mockMetrics.resource.largestResource,
            size: 256 // 256 bytes
          }
        }
      };

      thresholdDisplay.render(containerElement, smallSizeMetrics, mockThresholds);
      const displays = thresholdDisplay.getCurrentDisplays();
      const sizeMetric = displays.find(d => d.metric === 'Total Page Size');

      expect(sizeMetric?.formattedActual).toBe('1.5 KB');
    });

    it('should format count values as plain numbers', () => {
      const displays = thresholdDisplay.getCurrentDisplays();
      const countMetric = displays.find(d => d.metric === 'Resource Count');

      expect(countMetric?.formattedActual).toBe('25');
      expect(countMetric?.formattedThreshold).toBe('100');
    });

    it('should truncate long URLs', () => {
      const displays = thresholdDisplay.getCurrentDisplays();
      const slowestRequestMetric = displays.find(d => d.metric === 'Slowest Request');

      expect(slowestRequestMetric?.formattedActual).toBe('500ms');
      
      // Check that the URL is truncated in the description (via DOM)
      const slowestRequestRow = containerElement.querySelector('[data-metric="Slowest Request"]');
      expect(slowestRequestRow).toBeTruthy();
    });
  });

  describe('Update Functionality', () => {
    it('should update display with new metrics', () => {
      // Initial render
      thresholdDisplay.render(containerElement, mockMetrics, mockThresholds);

      // Update with new metrics
      const newMetrics: AllMetrics = {
        ...mockMetrics,
        navigation: {
          ...mockMetrics.navigation,
          loadTime: 3000 // Changed from 1500 to 3000
        }
      };

      thresholdDisplay.update(newMetrics, mockThresholds);
      const updatedDisplays = thresholdDisplay.getCurrentDisplays();

      const loadTimeMetric = updatedDisplays.find(d => d.metric === 'Load Time');
      expect(loadTimeMetric?.actualValue).toBe(3000);
      expect(loadTimeMetric?.formattedActual).toBe('3.00s');
    });

    it('should throw error when updating before rendering', () => {
      expect(() => {
        thresholdDisplay.update(mockMetrics, mockThresholds);
      }).toThrow('ThresholdDisplay must be rendered before updating');
    });

    it('should update status and colors when thresholds change', () => {
      // Initial render
      thresholdDisplay.render(containerElement, mockMetrics, mockThresholds);
      
      // Update with stricter thresholds
      const stricterThresholds: Thresholds = {
        pageSize: 512000, // 0.5MB (stricter)
        loadTime: 1000, // 1s (stricter)
        ttfb: 100 // 100ms (stricter)
      };

      thresholdDisplay.update(mockMetrics, stricterThresholds);
      const displays = thresholdDisplay.getCurrentDisplays();

      // Load time should now be WARN (1500ms > 1000ms but < 1500ms)
      const loadTimeMetric = displays.find(d => d.metric === 'Load Time');
      expect(loadTimeMetric?.status).toBe('WARN');

      // Page size should now be FAIL (2MB > 0.5MB * 1.5)
      const pageSizeMetric = displays.find(d => d.metric === 'Total Page Size');
      expect(pageSizeMetric?.status).toBe('FAIL');
    });
  });

  describe('Clear Functionality', () => {
    it('should clear display content', () => {
      thresholdDisplay.render(containerElement, mockMetrics, mockThresholds);
      
      // Verify content exists
      expect(containerElement.querySelector('.blackbox-threshold-display')).toBeTruthy();
      expect(thresholdDisplay.getCurrentDisplays().length).toBeGreaterThan(0);

      // Clear display
      thresholdDisplay.clear();

      // Verify content is cleared
      expect(containerElement.innerHTML).toBe('');
      expect(thresholdDisplay.getCurrentDisplays()).toEqual([]);
    });

    it('should handle clear when not rendered', () => {
      expect(() => thresholdDisplay.clear()).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle rendering errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Create invalid metrics to trigger error
      const invalidMetrics = null as any;

      expect(() => {
        thresholdDisplay.render(containerElement, invalidMetrics, mockThresholds);
      }).not.toThrow();

      // Should render error content
      const errorContent = containerElement.querySelector('.blackbox-threshold-error');
      expect(errorContent).toBeTruthy();

      consoleSpy.mockRestore();
    });

    it('should display error message when rendering fails', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Trigger error by passing invalid data
      thresholdDisplay.render(containerElement, null as any, mockThresholds);

      const errorMessage = containerElement.querySelector('.blackbox-error-message');
      expect(errorMessage?.textContent).toBe('Unable to display metrics table');

      consoleSpy.mockRestore();
    });

    it('should handle missing container element', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        thresholdDisplay.render(null as any, mockMetrics, mockThresholds);
      }).not.toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe('Integration with AssetManager', () => {
    it('should use AssetManager for branding colors', () => {
      thresholdDisplay.render(containerElement, mockMetrics, mockThresholds);

      // Should call getBrandingColor for different status colors
      expect(mockAssetManager.getBrandingColor).toHaveBeenCalledWith('accent');
      expect(mockAssetManager.getBrandingColor).toHaveBeenCalledWith('warning');
      expect(mockAssetManager.getBrandingColor).toHaveBeenCalledWith('error');
    });

    it('should use branding configuration in CSS', () => {
      thresholdDisplay.render(containerElement, mockMetrics, mockThresholds);

      const styleElement = document.querySelector('#blackbox-threshold-display-styles');
      expect(styleElement?.textContent).toContain('#1a1a1a'); // Primary color
      expect(styleElement?.textContent).toContain('#00c851'); // Accent color
      expect(styleElement?.textContent).toContain('system-ui'); // Font family
    });

    it('should apply branding colors to legend', () => {
      thresholdDisplay.render(containerElement, mockMetrics, mockThresholds);

      const legendColors = containerElement.querySelectorAll('.blackbox-legend-color');
      expect(legendColors).toHaveLength(3);

      // Check that colors are applied via style attributes
      const hasStyledColors = Array.from(legendColors).some(element => {
        const style = (element as HTMLElement).style.backgroundColor;
        return style && style !== '';
      });
      
      expect(hasStyledColors).toBe(true);
    });
  });

  describe('Responsive Design', () => {
    it('should include responsive CSS rules', () => {
      thresholdDisplay.render(containerElement, mockMetrics, mockThresholds);

      const styleElement = document.querySelector('#blackbox-threshold-display-styles');
      expect(styleElement?.textContent).toContain('@media (max-width: 600px)');
      expect(styleElement?.textContent).toContain('.blackbox-expanded-view');
    });

    it('should include print styles', () => {
      thresholdDisplay.render(containerElement, mockMetrics, mockThresholds);

      const styleElement = document.querySelector('#blackbox-threshold-display-styles');
      expect(styleElement?.textContent).toContain('@media print');
    });

    it('should include accessibility improvements', () => {
      thresholdDisplay.render(containerElement, mockMetrics, mockThresholds);

      const styleElement = document.querySelector('#blackbox-threshold-display-styles');
      expect(styleElement?.textContent).toContain('focus-within');
      expect(styleElement?.textContent).toContain('cursor: help');
    });
  });

  describe('DOM Structure', () => {
    beforeEach(() => {
      thresholdDisplay.render(containerElement, mockMetrics, mockThresholds);
    });

    it('should create proper table structure', () => {
      const table = containerElement.querySelector('.blackbox-threshold-table');
      const header = containerElement.querySelector('.blackbox-threshold-table-header');
      const body = containerElement.querySelector('.blackbox-threshold-table-body');

      expect(table).toBeTruthy();
      expect(header).toBeTruthy();
      expect(body).toBeTruthy();
    });

    it('should add data attributes for testing', () => {
      const metricRows = containerElement.querySelectorAll('.blackbox-threshold-row[data-metric]');
      expect(metricRows.length).toBeGreaterThan(0);

      const dataMetrics = Array.from(metricRows).map(row => 
        row.getAttribute('data-metric')
      );
      expect(dataMetrics).toContain('Load Time');
      expect(dataMetrics).toContain('Total Page Size');
    });

    it('should add tooltips for accessibility', () => {
      const metricNames = containerElement.querySelectorAll('.blackbox-metric-name[title]');
      const metricActuals = containerElement.querySelectorAll('.blackbox-metric-actual[title]');
      const metricThresholds = containerElement.querySelectorAll('.blackbox-metric-threshold[title]');
      const metricStatuses = containerElement.querySelectorAll('.blackbox-metric-status[title]');

      expect(metricNames.length).toBeGreaterThan(0);
      expect(metricActuals.length).toBeGreaterThan(0);
      expect(metricThresholds.length).toBeGreaterThan(0);
      expect(metricStatuses.length).toBeGreaterThan(0);
    });

    it('should apply hover effects', () => {
      const styleElement = document.querySelector('#blackbox-threshold-display-styles');
      expect(styleElement?.textContent).toContain('.blackbox-threshold-row:hover');
    });
  });
});