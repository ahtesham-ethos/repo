import { ResultsPresenter } from '../ResultsPresenter';
import { OverallHealth, AllMetrics, Thresholds } from '../../types';

describe('ResultsPresenter', () => {
  let presenter: ResultsPresenter;

  beforeEach(() => {
    presenter = new ResultsPresenter();
  });

  describe('formatHealthSummary', () => {
    it('should format PASS status correctly', () => {
      const health: OverallHealth = {
        status: 'PASS',
        score: 95,
        results: [],
        worstOffenders: []
      };

      const result = presenter.formatHealthSummary(health);

      expect(result).toBe('✅ Excellent Performance (Score: 95/100)');
    });

    it('should format WARN status correctly', () => {
      const health: OverallHealth = {
        status: 'WARN',
        score: 70,
        results: [],
        worstOffenders: []
      };

      const result = presenter.formatHealthSummary(health);

      expect(result).toBe('⚠️ Performance Issues Detected (Score: 70/100)');
    });

    it('should format FAIL status correctly', () => {
      const health: OverallHealth = {
        status: 'FAIL',
        score: 25,
        results: [],
        worstOffenders: []
      };

      const result = presenter.formatHealthSummary(health);

      expect(result).toBe('❌ Critical Performance Problems (Score: 25/100)');
    });

    it('should handle unknown status', () => {
      const health: OverallHealth = {
        status: 'UNKNOWN' as any,
        score: 0,
        results: [],
        worstOffenders: []
      };

      const result = presenter.formatHealthSummary(health);

      expect(result).toBe('❓ Unknown Status (Score: 0/100)');
    });
  });

  describe('formatMetricDetails', () => {
    const mockThresholds: Thresholds = {
      pageSize: 2000000, // 2MB
      loadTime: 5000, // 5s
      ttfb: 3000 // 3s
    };

    it('should format all available metrics', () => {
      const metrics: AllMetrics = {
        navigation: {
          loadTime: 3500,
          ttfb: 1200,
          domContentLoaded: 2000,
          available: true
        },
        resource: {
          totalSize: 1500000,
          resourceCount: 25,
          largestResource: {
            name: 'bundle.js',
            size: 500000,
            type: 'script'
          },
          available: true
        },
        rendering: {
          firstPaint: 1800,
          largestContentfulPaint: 2500,
          available: true
        },
        network: {
          ajaxCount: 3,
          slowestRequest: {
            url: 'api/data',
            duration: 800
          },
          available: true
        }
      };

      const result = presenter.formatMetricDetails(metrics, mockThresholds);

      expect(result).toContain('📊 **Performance Metrics**');
      expect(result).toContain('• Load Time: 3.50s (threshold: 5.00s)');
      expect(result).toContain('• Time to First Byte: 1.20s (threshold: 3.00s)');
      expect(result).toContain('• DOM Content Loaded: 2.00s');
      
      expect(result).toContain('📦 **Resource Analysis**');
      expect(result).toContain('• Total Page Size: 1.43 MB (threshold: 1.91 MB)');
      expect(result).toContain('• Resources Loaded: 25');
      expect(result).toContain('• Largest Resource: bundle.js (488.3 KB)');
      
      expect(result).toContain('🎨 **Rendering Performance**');
      expect(result).toContain('• First Paint: 1.80s');
      expect(result).toContain('• Largest Contentful Paint: 2.50s');
      
      expect(result).toContain('🌐 **Network Activity**');
      expect(result).toContain('• AJAX/API Requests: 3');
      expect(result).toContain('• Slowest Request: api/data (800ms)');
    });

    it('should handle unavailable navigation metrics', () => {
      const metrics: AllMetrics = {
        navigation: {
          loadTime: 0,
          ttfb: 0,
          domContentLoaded: 0,
          available: false
        },
        resource: {
          totalSize: 1000000,
          resourceCount: 10,
          largestResource: { name: '', size: 0, type: 'unknown' },
          available: true
        },
        rendering: {
          firstPaint: 0,
          largestContentfulPaint: 0,
          available: false
        },
        network: {
          ajaxCount: 0,
          slowestRequest: { url: '', duration: 0 },
          available: false
        }
      };

      const result = presenter.formatMetricDetails(metrics, mockThresholds);

      expect(result).not.toContain('📊 **Performance Metrics**');
      expect(result).toContain('📦 **Resource Analysis**');
      expect(result).not.toContain('🎨 **Rendering Performance**');
      expect(result).not.toContain('🌐 **Network Activity**');
    });

    it('should handle zero rendering metrics', () => {
      const metrics: AllMetrics = {
        navigation: {
          loadTime: 3000,
          ttfb: 1000,
          domContentLoaded: 2000,
          available: true
        },
        resource: {
          totalSize: 1000000,
          resourceCount: 10,
          largestResource: { name: '', size: 0, type: 'unknown' },
          available: true
        },
        rendering: {
          firstPaint: 0,
          largestContentfulPaint: 0,
          available: true
        },
        network: {
          ajaxCount: 0,
          slowestRequest: { url: '', duration: 0 },
          available: true
        }
      };

      const result = presenter.formatMetricDetails(metrics, mockThresholds);

      expect(result).toContain('🎨 **Rendering Performance**');
      expect(result).not.toContain('• First Paint:');
      expect(result).not.toContain('• Largest Contentful Paint:');
      expect(result).not.toContain('🌐 **Network Activity**');
    });

    it('should format small timing values in milliseconds', () => {
      const metrics: AllMetrics = {
        navigation: {
          loadTime: 800, // Less than 1 second
          ttfb: 250,
          domContentLoaded: 600,
          available: true
        },
        resource: {
          totalSize: 500000,
          resourceCount: 5,
          largestResource: { name: '', size: 0, type: 'unknown' },
          available: true
        },
        rendering: {
          firstPaint: 0,
          largestContentfulPaint: 0,
          available: false
        },
        network: {
          ajaxCount: 0,
          slowestRequest: { url: '', duration: 0 },
          available: false
        }
      };

      const result = presenter.formatMetricDetails(metrics, mockThresholds);

      expect(result).toContain('• Load Time: 800ms');
      expect(result).toContain('• Time to First Byte: 250ms');
      expect(result).toContain('• DOM Content Loaded: 600ms');
    });

    it('should format small size values in KB and bytes', () => {
      const metrics: AllMetrics = {
        navigation: {
          loadTime: 3000,
          ttfb: 1000,
          domContentLoaded: 2000,
          available: true
        },
        resource: {
          totalSize: 500, // Less than 1KB
          resourceCount: 3,
          largestResource: {
            name: 'small.css',
            size: 1500, // 1.5KB
            type: 'stylesheet'
          },
          available: true
        },
        rendering: {
          firstPaint: 0,
          largestContentfulPaint: 0,
          available: false
        },
        network: {
          ajaxCount: 0,
          slowestRequest: { url: '', duration: 0 },
          available: false
        }
      };

      const result = presenter.formatMetricDetails(metrics, mockThresholds);

      expect(result).toContain('• Total Page Size: 500 bytes');
      expect(result).toContain('• Largest Resource: small.css (1.5 KB)');
    });

    it('should skip network section when no AJAX requests', () => {
      const metrics: AllMetrics = {
        navigation: {
          loadTime: 3000,
          ttfb: 1000,
          domContentLoaded: 2000,
          available: true
        },
        resource: {
          totalSize: 1000000,
          resourceCount: 10,
          largestResource: { name: '', size: 0, type: 'unknown' },
          available: true
        },
        rendering: {
          firstPaint: 0,
          largestContentfulPaint: 0,
          available: false
        },
        network: {
          ajaxCount: 0, // No AJAX requests
          slowestRequest: { url: '', duration: 0 },
          available: true
        }
      };

      const result = presenter.formatMetricDetails(metrics, mockThresholds);

      expect(result).not.toContain('🌐 **Network Activity**');
    });
  });

  describe('highlightWorstOffenders', () => {
    it('should highlight largest resource', () => {
      const metrics: AllMetrics = {
        navigation: {
          loadTime: 3000,
          ttfb: 1000,
          domContentLoaded: 2000,
          available: true
        },
        resource: {
          totalSize: 2000000, // 2MB total
          resourceCount: 10,
          largestResource: {
            name: 'huge-image.jpg',
            size: 800000, // 800KB
            type: 'image'
          },
          available: true
        },
        rendering: {
          firstPaint: 1500,
          largestContentfulPaint: 2000,
          available: true
        },
        network: {
          ajaxCount: 2,
          slowestRequest: { url: '', duration: 0 },
          available: true
        }
      };

      const result = presenter.highlightWorstOffenders(metrics);

      expect(result).toContain('🔴 Largest Resource: huge-image.jpg (781.3 KB, 40.0% of total)');
    });

    it('should highlight slowest request', () => {
      const metrics: AllMetrics = {
        navigation: {
          loadTime: 3000,
          ttfb: 1000,
          domContentLoaded: 2000,
          available: true
        },
        resource: {
          totalSize: 1000000,
          resourceCount: 10,
          largestResource: { name: '', size: 0, type: 'unknown' },
          available: true
        },
        rendering: {
          firstPaint: 1500,
          largestContentfulPaint: 2000,
          available: true
        },
        network: {
          ajaxCount: 3,
          slowestRequest: {
            url: 'api/slow-endpoint',
            duration: 2500
          },
          available: true
        }
      };

      const result = presenter.highlightWorstOffenders(metrics);

      expect(result).toContain('🐌 Slowest Request: api/slow-endpoint (2.50s)');
    });

    it('should highlight poor LCP performance', () => {
      const metrics: AllMetrics = {
        navigation: {
          loadTime: 3000,
          ttfb: 1000,
          domContentLoaded: 2000,
          available: true
        },
        resource: {
          totalSize: 1000000,
          resourceCount: 10,
          largestResource: { name: '', size: 0, type: 'unknown' },
          available: true
        },
        rendering: {
          firstPaint: 1500,
          largestContentfulPaint: 5000, // Poor LCP > 4s
          available: true
        },
        network: {
          ajaxCount: 2,
          slowestRequest: { url: '', duration: 0 },
          available: true
        }
      };

      const result = presenter.highlightWorstOffenders(metrics);

      expect(result).toContain('🎨 Poor LCP: 5.00s (should be < 2.5s for good user experience)');
    });

    it('should highlight slow first paint', () => {
      const metrics: AllMetrics = {
        navigation: {
          loadTime: 3000,
          ttfb: 1000,
          domContentLoaded: 2000,
          available: true
        },
        resource: {
          totalSize: 1000000,
          resourceCount: 10,
          largestResource: { name: '', size: 0, type: 'unknown' },
          available: true
        },
        rendering: {
          firstPaint: 3500, // Slow FP > 3s
          largestContentfulPaint: 2000,
          available: true
        },
        network: {
          ajaxCount: 2,
          slowestRequest: { url: '', duration: 0 },
          available: true
        }
      };

      const result = presenter.highlightWorstOffenders(metrics);

      expect(result).toContain('⏱️ Slow First Paint: 3.50s (should be < 1.8s for good user experience)');
    });

    it('should highlight high network activity', () => {
      const metrics: AllMetrics = {
        navigation: {
          loadTime: 3000,
          ttfb: 1000,
          domContentLoaded: 2000,
          available: true
        },
        resource: {
          totalSize: 1000000,
          resourceCount: 10,
          largestResource: { name: '', size: 0, type: 'unknown' },
          available: true
        },
        rendering: {
          firstPaint: 1500,
          largestContentfulPaint: 2000,
          available: true
        },
        network: {
          ajaxCount: 15, // High network activity > 10
          slowestRequest: { url: '', duration: 0 },
          available: true
        }
      };

      const result = presenter.highlightWorstOffenders(metrics);

      expect(result).toContain('📡 High Network Activity: 15 requests (consider reducing API calls)');
    });

    it('should highlight large page size', () => {
      const metrics: AllMetrics = {
        navigation: {
          loadTime: 3000,
          ttfb: 1000,
          domContentLoaded: 2000,
          available: true
        },
        resource: {
          totalSize: 4000000, // 4MB - large page
          resourceCount: 20,
          largestResource: { name: '', size: 0, type: 'unknown' },
          available: true
        },
        rendering: {
          firstPaint: 1500,
          largestContentfulPaint: 2000,
          available: true
        },
        network: {
          ajaxCount: 2,
          slowestRequest: { url: '', duration: 0 },
          available: true
        }
      };

      const result = presenter.highlightWorstOffenders(metrics);

      expect(result).toContain('📦 Large Page Size: 3.81 MB (consider optimizing resources)');
    });

    it('should return positive message when no issues found', () => {
      const metrics: AllMetrics = {
        navigation: {
          loadTime: 2000,
          ttfb: 800,
          domContentLoaded: 1500,
          available: true
        },
        resource: {
          totalSize: 1000000, // 1MB - reasonable
          resourceCount: 8,
          largestResource: { name: '', size: 0, type: 'unknown' },
          available: true
        },
        rendering: {
          firstPaint: 1200, // Good FP
          largestContentfulPaint: 1800, // Good LCP
          available: true
        },
        network: {
          ajaxCount: 3, // Reasonable network activity
          slowestRequest: { url: '', duration: 0 },
          available: true
        }
      };

      const result = presenter.highlightWorstOffenders(metrics);

      expect(result).toContain('✨ No major performance issues detected');
    });

    it('should handle multiple offenders', () => {
      const metrics: AllMetrics = {
        navigation: {
          loadTime: 3000,
          ttfb: 1000,
          domContentLoaded: 2000,
          available: true
        },
        resource: {
          totalSize: 4000000, // Large page
          resourceCount: 20,
          largestResource: {
            name: 'massive-bundle.js',
            size: 1500000, // Large resource
            type: 'script'
          },
          available: true
        },
        rendering: {
          firstPaint: 3500, // Slow FP
          largestContentfulPaint: 5000, // Poor LCP
          available: true
        },
        network: {
          ajaxCount: 12, // High network activity
          slowestRequest: {
            url: 'api/slow',
            duration: 3000 // Slow request
          },
          available: true
        }
      };

      const result = presenter.highlightWorstOffenders(metrics);

      expect(result.length).toBeGreaterThan(1);
      expect(result).toContain('🔴 Largest Resource: massive-bundle.js (1.43 MB, 37.5% of total)');
      expect(result).toContain('🐌 Slowest Request: api/slow (3.00s)');
      expect(result).toContain('🎨 Poor LCP: 5.00s (should be < 2.5s for good user experience)');
      expect(result).toContain('⏱️ Slow First Paint: 3.50s (should be < 1.8s for good user experience)');
      expect(result).toContain('📡 High Network Activity: 12 requests (consider reducing API calls)');
      expect(result).toContain('📦 Large Page Size: 3.81 MB (consider optimizing resources)');
    });

    it('should handle unavailable metrics gracefully', () => {
      const metrics: AllMetrics = {
        navigation: {
          loadTime: 0,
          ttfb: 0,
          domContentLoaded: 0,
          available: false
        },
        resource: {
          totalSize: 0,
          resourceCount: 0,
          largestResource: { name: '', size: 0, type: 'unknown' },
          available: false
        },
        rendering: {
          firstPaint: 0,
          largestContentfulPaint: 0,
          available: false
        },
        network: {
          ajaxCount: 0,
          slowestRequest: { url: '', duration: 0 },
          available: false
        }
      };

      const result = presenter.highlightWorstOffenders(metrics);

      expect(result).toContain('✨ No major performance issues detected');
    });
  });

  describe('renderResults', () => {
    let container: HTMLElement;
    
    const mockHealth: OverallHealth = {
      status: 'WARN',
      score: 75,
      results: [],
      worstOffenders: []
    };

    const mockThresholds: Thresholds = {
      pageSize: 2000000,
      loadTime: 5000,
      ttfb: 3000
    };

    beforeEach(() => {
      container = document.createElement('div');
    });

    it('should render overall health status', () => {
      const metrics: AllMetrics = {
        navigation: { loadTime: 0, ttfb: 0, domContentLoaded: 0, available: false },
        resource: { totalSize: 0, resourceCount: 0, largestResource: { name: '', size: 0, type: 'unknown' }, available: false },
        rendering: { firstPaint: 0, largestContentfulPaint: 0, available: false },
        network: { ajaxCount: 0, slowestRequest: { url: '', duration: 0 }, available: false }
      };

      presenter.renderResults(container, mockHealth, metrics, mockThresholds);

      const healthStatus = container.querySelector('.health-status');
      expect(healthStatus).toBeTruthy();
      expect(healthStatus?.classList.contains('warn')).toBe(true);
      expect(healthStatus?.textContent).toContain('Performance Issues Detected');
      expect(healthStatus?.textContent).toContain('Score: 75/100');
    });

    it('should render navigation metrics when available', () => {
      const metrics: AllMetrics = {
        navigation: {
          loadTime: 3500,
          ttfb: 1200,
          domContentLoaded: 2000,
          available: true
        },
        resource: { totalSize: 0, resourceCount: 0, largestResource: { name: '', size: 0, type: 'unknown' }, available: false },
        rendering: { firstPaint: 0, largestContentfulPaint: 0, available: false },
        network: { ajaxCount: 0, slowestRequest: { url: '', duration: 0 }, available: false }
      };

      presenter.renderResults(container, mockHealth, metrics, mockThresholds);

      const metricsSection = container.querySelector('.metrics-section');
      expect(metricsSection).toBeTruthy();
      expect(metricsSection?.textContent).toContain('📊 Performance Metrics');
      expect(metricsSection?.textContent).toContain('Load Time');
      expect(metricsSection?.textContent).toContain('3.50s');
      expect(metricsSection?.textContent).toContain('threshold: 5.00s');
    });

    it('should render resource metrics when available', () => {
      const metrics: AllMetrics = {
        navigation: { loadTime: 0, ttfb: 0, domContentLoaded: 0, available: false },
        resource: {
          totalSize: 1500000,
          resourceCount: 25,
          largestResource: {
            name: 'bundle.js',
            size: 500000,
            type: 'script'
          },
          available: true
        },
        rendering: { firstPaint: 0, largestContentfulPaint: 0, available: false },
        network: { ajaxCount: 0, slowestRequest: { url: '', duration: 0 }, available: false }
      };

      presenter.renderResults(container, mockHealth, metrics, mockThresholds);

      const content = container.textContent || '';
      expect(content).toContain('📦 Resource Analysis');
      expect(content).toContain('Total Page Size');
      expect(content).toContain('1.43 MB');
      expect(content).toContain('Resources Loaded');
      expect(content).toContain('25');
      expect(content).toContain('Largest Resource');
      expect(content).toContain('bundle.js');
    });

    it('should render rendering metrics when available', () => {
      const metrics: AllMetrics = {
        navigation: { loadTime: 0, ttfb: 0, domContentLoaded: 0, available: false },
        resource: { totalSize: 0, resourceCount: 0, largestResource: { name: '', size: 0, type: 'unknown' }, available: false },
        rendering: {
          firstPaint: 1800,
          largestContentfulPaint: 2500,
          available: true
        },
        network: { ajaxCount: 0, slowestRequest: { url: '', duration: 0 }, available: false }
      };

      presenter.renderResults(container, mockHealth, metrics, mockThresholds);

      const content = container.textContent || '';
      expect(content).toContain('🎨 Rendering Performance');
      expect(content).toContain('First Paint');
      expect(content).toContain('1.80s');
      expect(content).toContain('Largest Contentful Paint');
      expect(content).toContain('2.50s');
    });

    it('should render network metrics when available', () => {
      const metrics: AllMetrics = {
        navigation: { loadTime: 0, ttfb: 0, domContentLoaded: 0, available: false },
        resource: { totalSize: 0, resourceCount: 0, largestResource: { name: '', size: 0, type: 'unknown' }, available: false },
        rendering: { firstPaint: 0, largestContentfulPaint: 0, available: false },
        network: {
          ajaxCount: 5,
          slowestRequest: {
            url: 'api/data',
            duration: 800
          },
          available: true
        }
      };

      presenter.renderResults(container, mockHealth, metrics, mockThresholds);

      const content = container.textContent || '';
      expect(content).toContain('🌐 Network Activity');
      expect(content).toContain('AJAX/API Requests');
      expect(content).toContain('5');
      expect(content).toContain('Slowest Request');
      expect(content).toContain('api/data');
      expect(content).toContain('800ms');
    });

    it('should render worst offenders section', () => {
      const metrics: AllMetrics = {
        navigation: { loadTime: 0, ttfb: 0, domContentLoaded: 0, available: false },
        resource: {
          totalSize: 4000000, // Large page
          resourceCount: 10,
          largestResource: {
            name: 'huge-image.jpg',
            size: 1500000,
            type: 'image'
          },
          available: true
        },
        rendering: { firstPaint: 0, largestContentfulPaint: 0, available: false },
        network: { ajaxCount: 0, slowestRequest: { url: '', duration: 0 }, available: false }
      };

      presenter.renderResults(container, mockHealth, metrics, mockThresholds);

      const offendersSection = container.querySelector('.worst-offenders');
      expect(offendersSection).toBeTruthy();
      expect(offendersSection?.textContent).toContain('Key Issues');
      expect(offendersSection?.textContent).toContain('🔴 Largest Resource: huge-image.jpg');
      expect(offendersSection?.textContent).toContain('📦 Large Page Size: 3.81 MB');
    });

    it('should clear existing content before rendering', () => {
      container.innerHTML = '<div>Existing content</div>';
      
      const metrics: AllMetrics = {
        navigation: { loadTime: 0, ttfb: 0, domContentLoaded: 0, available: false },
        resource: { totalSize: 0, resourceCount: 0, largestResource: { name: '', size: 0, type: 'unknown' }, available: false },
        rendering: { firstPaint: 0, largestContentfulPaint: 0, available: false },
        network: { ajaxCount: 0, slowestRequest: { url: '', duration: 0 }, available: false }
      };

      presenter.renderResults(container, mockHealth, metrics, mockThresholds);

      expect(container.textContent).not.toContain('Existing content');
      expect(container.querySelector('.health-status')).toBeTruthy();
    });

    it('should skip rendering sections for unavailable metrics', () => {
      const metrics: AllMetrics = {
        navigation: { loadTime: 0, ttfb: 0, domContentLoaded: 0, available: false },
        resource: { totalSize: 0, resourceCount: 0, largestResource: { name: '', size: 0, type: 'unknown' }, available: false },
        rendering: { firstPaint: 0, largestContentfulPaint: 0, available: false },
        network: { ajaxCount: 0, slowestRequest: { url: '', duration: 0 }, available: false }
      };

      presenter.renderResults(container, mockHealth, metrics, mockThresholds);

      const content = container.textContent || '';
      expect(content).not.toContain('📊 Performance Metrics');
      expect(content).not.toContain('📦 Resource Analysis');
      expect(content).not.toContain('🎨 Rendering Performance');
      expect(content).not.toContain('🌐 Network Activity');
    });
  });
});