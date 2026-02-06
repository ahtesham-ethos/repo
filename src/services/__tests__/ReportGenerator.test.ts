/**
 * Unit tests for ReportGenerator class
 * Tests text report generation, executive summaries, and recommendations
 */

import { ReportGenerator } from '../ReportGenerator';
import { OverallHealth, AllMetrics, Thresholds, HealthResult } from '../../types';
import { ReportMetadata, BrowserInfo, SavedProfile } from '../../types/phase2';

// Mock AssetManager
jest.mock('../AssetManager', () => ({
  assetManager: {
    getBrandingElements: () => ({
      productName: 'Blackbox',
      logoPath: 'assets/logo.png',
      primaryColor: '#1a1a1a',
      secondaryColor: '#4a90e2',
      accentColor: '#00c851',
      warningColor: '#ffbb33',
      errorColor: '#ff4444',
      fontFamily: 'system-ui',
      description: 'Professional webpage performance analysis tool',
      chartColors: {
        primary: ['#3B82F6', '#10B981', '#F59E0B'],
        success: ['#10B981'],
        warning: ['#F59E0B'],
        error: ['#EF4444'],
        neutral: ['#6B7280']
      }
    })
  }
}));

describe('ReportGenerator', () => {
  let reportGenerator: ReportGenerator;
  let mockOverallHealth: OverallHealth;
  let mockMetrics: AllMetrics;
  let mockThresholds: Thresholds;
  let mockMetadata: ReportMetadata;

  beforeEach(() => {
    reportGenerator = new ReportGenerator();

    // Mock health results
    const mockResults: HealthResult[] = [
      {
        metric: 'Load Time',
        value: 2500,
        threshold: 3000,
        status: 'PASS',
        message: '2.50s (threshold: 3.00s)'
      },
      {
        metric: 'Page Size',
        value: 3145728, // 3MB
        threshold: 2097152, // 2MB
        status: 'WARN',
        message: '3072 KB (threshold: 2048 KB)'
      },
      {
        metric: 'Time to First Byte',
        value: 1200,
        threshold: 800,
        status: 'FAIL',
        message: '1.20s (threshold: 0.80s)'
      }
    ];

    mockOverallHealth = {
      status: 'WARN',
      score: 53,
      results: mockResults,
      worstOffenders: [
        'Time to First Byte: 1.20s (threshold: 0.80s)',
        'Page Size: 3072 KB (threshold: 2048 KB)'
      ]
    };

    mockMetrics = {
      navigation: {
        loadTime: 2500,
        ttfb: 1200,
        domContentLoaded: 2000,
        available: true
      },
      resource: {
        totalSize: 3145728,
        resourceCount: 25,
        largestResource: {
          name: 'https://example.com/large-image.jpg',
          size: 1048576,
          type: 'image'
        },
        available: true
      },
      rendering: {
        firstPaint: 1800,
        largestContentfulPaint: 2200,
        available: true
      },
      network: {
        ajaxCount: 5,
        slowestRequest: {
          url: 'https://api.example.com/data',
          duration: 800
        },
        available: true
      }
    };

    mockThresholds = {
      pageSize: 2097152, // 2MB
      loadTime: 3000, // 3s
      ttfb: 800 // 800ms
    };

    const mockBrowserInfo: BrowserInfo = {
      name: 'Chrome',
      version: '120.0.0.0',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      platform: 'Win32'
    };

    mockMetadata = {
      generatedAt: new Date('2024-01-15T10:30:00Z'),
      url: 'https://example.com',
      browserInfo: mockBrowserInfo,
      reportType: 'text'
    };
  });

  describe('generateTextReport', () => {
    it('should generate a complete text report with all sections', () => {
      const report = reportGenerator.generateTextReport(mockOverallHealth, mockMetadata);

      expect(report).toContain('BLACKBOX PERFORMANCE ANALYSIS REPORT');
      expect(report).toContain('====================================');
      expect(report).toContain('Generated: January 15, 2024');
      expect(report).toContain('URL: https://example.com');
      expect(report).toContain('Browser: Chrome 120.0.0.0');
      expect(report).toContain('Platform: Win32');
      expect(report).toContain('EXECUTIVE SUMMARY');
      expect(report).toContain('DETAILED METRICS');
      expect(report).toContain('RECOMMENDATIONS');
      expect(report).toContain('TECHNICAL DETAILS');
    });

    it('should include correct overall health status', () => {
      const report = reportGenerator.generateTextReport(mockOverallHealth, mockMetadata);

      expect(report).toContain('Overall Health: WARN');
      expect(report).toContain('Performance Score: 53/100');
    });

    it('should include worst offenders in executive summary', () => {
      const report = reportGenerator.generateTextReport(mockOverallHealth, mockMetadata);

      expect(report).toContain('Key Issues:');
      expect(report).toContain('Time to First Byte: 1.20s (threshold: 0.80s)');
      expect(report).toContain('Page Size: 3072 KB (threshold: 2048 KB)');
    });

    it('should include detailed metrics with status icons', () => {
      const report = reportGenerator.generateTextReport(mockOverallHealth, mockMetadata);

      expect(report).toContain('✅ Load Time:');
      expect(report).toContain('⚠️ Page Size:');
      expect(report).toContain('❌ Time to First Byte:');
      expect(report).toContain('Actual: 2.50s');
      expect(report).toContain('Threshold: 3.00s');
      expect(report).toContain('Status: PASS');
    });

    it('should include recommendations section', () => {
      const report = reportGenerator.generateTextReport(mockOverallHealth, mockMetadata);

      expect(report).toContain('RECOMMENDATIONS');
      expect(report).toContain('Improve server response time');
      expect(report).toContain('Reduce page size by compressing images');
    });

    it('should include technical details', () => {
      const report = reportGenerator.generateTextReport(mockOverallHealth, mockMetadata);

      expect(report).toContain('Total Metrics Evaluated: 3');
      expect(report).toContain('Score Weights: PASS=100, WARN=60, FAIL=0');
      expect(report).toContain('Threshold Logic:');
    });
  });

  describe('generateStructuredReport', () => {
    it('should generate structured report data', () => {
      const reportData = reportGenerator.generateStructuredReport(mockOverallHealth);

      expect(reportData.metadata).toBeDefined();
      expect(reportData.summary).toBeDefined();
      expect(reportData.metricsTable).toBeDefined();
      expect(reportData.recommendations).toBeDefined();
      expect(reportData.charts).toEqual([]);
      expect(reportData.rawData).toBeDefined();
    });

    it('should use profile data when provided', () => {
      const mockProfile: SavedProfile = {
        id: 'test-profile',
        url: 'https://profile-example.com',
        timestamp: Date.now(),
        analysis: mockOverallHealth,
        metrics: mockMetrics,
        thresholds: mockThresholds,
        browserInfo: mockMetadata.browserInfo
      };

      const reportData = reportGenerator.generateStructuredReport(mockOverallHealth, mockProfile);

      expect(reportData.metadata.url).toBe('https://profile-example.com');
      expect(reportData.rawData).toEqual(mockMetrics);
    });
  });

  describe('formatMetricsSection', () => {
    it('should format all available metrics sections', () => {
      const metricsTable = reportGenerator.formatMetricsSection(mockMetrics, mockThresholds);

      expect(metricsTable).toContain('Performance Metrics:');
      expect(metricsTable).toContain('Load Time:           2.50s (threshold: 3.00s)');
      expect(metricsTable).toContain('Time to First Byte:  1.20s (threshold: 800ms)');
      expect(metricsTable).toContain('DOM Content Loaded:  2.00s');

      expect(metricsTable).toContain('Resource Analysis:');
      expect(metricsTable).toContain('Total Page Size:     3.00 MB (threshold: 2.00 MB)');
      expect(metricsTable).toContain('Resources Loaded:    25');
      expect(metricsTable).toContain('Largest Resource:    https://example.com/large-image.jpg (1.00 MB)');

      expect(metricsTable).toContain('Rendering Performance:');
      expect(metricsTable).toContain('First Paint:         1.80s');
      expect(metricsTable).toContain('Largest Contentful Paint: 2.20s');

      expect(metricsTable).toContain('Network Activity:');
      expect(metricsTable).toContain('AJAX/API Requests:   5');
      expect(metricsTable).toContain('Slowest Request:     https://api.example.com/data (800ms)');
    });

    it('should handle unavailable metrics gracefully', () => {
      const unavailableMetrics: AllMetrics = {
        navigation: { loadTime: 0, ttfb: 0, domContentLoaded: 0, available: false },
        resource: { totalSize: 0, resourceCount: 0, largestResource: { name: '', size: 0, type: '' }, available: false },
        rendering: { firstPaint: 0, largestContentfulPaint: 0, available: false },
        network: { ajaxCount: 0, slowestRequest: { url: '', duration: 0 }, available: false }
      };

      const metricsTable = reportGenerator.formatMetricsSection(unavailableMetrics, mockThresholds);

      expect(metricsTable).toBe('');
    });

    it('should truncate long URLs for readability', () => {
      const longUrlMetrics: AllMetrics = {
        ...mockMetrics,
        resource: {
          ...mockMetrics.resource,
          largestResource: {
            name: 'https://very-long-domain-name-example.com/path/to/very/long/resource/name/that/should/be/truncated.jpg',
            size: 1048576,
            type: 'image'
          }
        }
      };

      const metricsTable = reportGenerator.formatMetricsSection(longUrlMetrics, mockThresholds);

      expect(metricsTable).toContain('...');
      // The truncated URL should be shorter than the original
      const lines = metricsTable.split('\n');
      const resourceLine = lines.find(line => line.includes('Largest Resource:'));
      expect(resourceLine).toBeDefined();
      expect(resourceLine!.length).toBeLessThan(longUrlMetrics.resource.largestResource.name.length + 50);
    });
  });

  describe('createExecutiveSummary', () => {
    it('should create comprehensive executive summary', () => {
      const summary = reportGenerator.createExecutiveSummary(mockOverallHealth);

      expect(summary).toContain('Overall Health: WARN');
      expect(summary).toContain('Performance Score: 53/100');
      expect(summary).toContain('Key Issues:');
      expect(summary).toContain('Metrics Status:');
      expect(summary).toContain('✅ Passing: 1 metrics');
      expect(summary).toContain('⚠️  Warning: 1 metrics');
      expect(summary).toContain('❌ Failing: 1 metrics');
    });

    it('should handle perfect health status', () => {
      const perfectHealth: OverallHealth = {
        status: 'PASS',
        score: 100,
        results: [
          { metric: 'Load Time', value: 1000, threshold: 3000, status: 'PASS', message: 'Good' },
          { metric: 'Page Size', value: 1000000, threshold: 2000000, status: 'PASS', message: 'Good' }
        ],
        worstOffenders: []
      };

      const summary = reportGenerator.createExecutiveSummary(perfectHealth);

      expect(summary).toContain('Overall Health: PASS');
      expect(summary).toContain('Performance Score: 100/100');
      expect(summary).toContain('Key Issues: None detected - all metrics within acceptable thresholds');
      expect(summary).toContain('✅ Passing: 2 metrics');
      expect(summary).toContain('⚠️  Warning: 0 metrics');
      expect(summary).toContain('❌ Failing: 0 metrics');
    });
  });

  describe('time and size formatting', () => {
    it('should format time values correctly', () => {
      const report = reportGenerator.generateTextReport(mockOverallHealth, mockMetadata);

      // Should format milliseconds
      expect(report).toContain('800ms');
      // Should format seconds
      expect(report).toContain('2.50s');
      expect(report).toContain('1.20s');
    });

    it('should format size values correctly', () => {
      const metricsTable = reportGenerator.formatMetricsSection(mockMetrics, mockThresholds);

      // Should format MB
      expect(metricsTable).toContain('3.00 MB');
      expect(metricsTable).toContain('2.00 MB');
      expect(metricsTable).toContain('1.00 MB');
    });
  });

  describe('recommendations generation', () => {
    it('should generate specific recommendations for failing metrics', () => {
      const summary = reportGenerator.generateStructuredReport(mockOverallHealth);

      expect(summary.recommendations).toContain('Improve server response time by optimizing database queries, upgrading hosting infrastructure, implementing server-side caching, and reducing server processing time');
      expect(summary.recommendations).toContain('Reduce page size by compressing images (WebP format), removing unused CSS/JS, implementing lazy loading, and optimizing resource delivery');
    });

    it('should generate general recommendations for perfect health', () => {
      const perfectHealth: OverallHealth = {
        status: 'PASS',
        score: 100,
        results: [
          { metric: 'Load Time', value: 1000, threshold: 3000, status: 'PASS', message: 'Good' }
        ],
        worstOffenders: []
      };

      const summary = reportGenerator.generateStructuredReport(perfectHealth);

      expect(summary.recommendations).toContain('Consider implementing performance monitoring to track metrics over time');
      expect(summary.recommendations).toContain('Set up performance budgets to prevent regression');
    });

    it('should limit recommendations to top 5', () => {
      const manyFailures: OverallHealth = {
        status: 'FAIL',
        score: 0,
        results: Array.from({ length: 10 }, (_, i) => ({
          metric: `Metric ${i}`,
          value: 1000,
          threshold: 500,
          status: 'FAIL' as const,
          message: `Failing metric ${i}`
        })),
        worstOffenders: []
      };

      const summary = reportGenerator.generateStructuredReport(manyFailures);

      expect(summary.recommendations.length).toBeLessThanOrEqual(5);
    });
  });

  describe('error handling', () => {
    it('should handle empty results gracefully', () => {
      const emptyHealth: OverallHealth = {
        status: 'FAIL',
        score: 0,
        results: [],
        worstOffenders: []
      };

      const report = reportGenerator.generateTextReport(emptyHealth, mockMetadata);

      expect(report).toContain('BLACKBOX PERFORMANCE ANALYSIS REPORT');
      expect(report).toContain('Total Metrics Evaluated: 0');
    });

    it('should handle missing browser info gracefully', () => {
      // Mock navigator for browser detection
      const originalNavigator = global.navigator;
      
      // Create a proper mock with the required properties
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          platform: 'Win32'
        },
        configurable: true
      });

      const reportData = reportGenerator.generateStructuredReport(mockOverallHealth);

      expect(reportData.metadata.browserInfo.name).toBe('Chrome');
      expect(reportData.metadata.browserInfo.version).toBe('120.0.0.0');

      // Restore original navigator
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        configurable: true
      });
    });
  });

  describe('date formatting', () => {
    it('should format dates in readable format', () => {
      const testDate = new Date('2024-01-15T10:30:00Z');
      const metadata: ReportMetadata = {
        ...mockMetadata,
        generatedAt: testDate
      };

      const report = reportGenerator.generateTextReport(mockOverallHealth, metadata);

      expect(report).toContain('Generated: January 15, 2024');
    });
  });
});