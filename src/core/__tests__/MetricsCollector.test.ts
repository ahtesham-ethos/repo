import { MetricsCollector } from '../MetricsCollector';

describe('MetricsCollector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector();
  });

  describe('collectNavigationMetrics', () => {
    it('should return unavailable metrics when Performance API is not available', () => {
      // Mock missing Performance API
      const originalPerformance = window.performance;
      (window as any).performance = undefined;

      const result = collector.collectNavigationMetrics();

      expect(result.available).toBe(false);
      expect(result.loadTime).toBe(0);
      expect(result.ttfb).toBe(0);
      expect(result.domContentLoaded).toBe(0);

      // Restore original performance
      window.performance = originalPerformance;
    });

    it('should return unavailable metrics when getEntriesByType is not available', () => {
      // Mock Performance API without getEntriesByType
      const originalPerformance = window.performance;
      (window as any).performance = {};

      const result = collector.collectNavigationMetrics();

      expect(result.available).toBe(false);

      // Restore original performance
      window.performance = originalPerformance;
    });

    it('should return unavailable metrics when no navigation entries exist', () => {
      // Mock Performance API with empty navigation entries
      const mockPerformance = {
        getEntriesByType: jest.fn().mockReturnValue([])
      };
      (window as any).performance = mockPerformance;

      const result = collector.collectNavigationMetrics();

      expect(result.available).toBe(false);
      expect(mockPerformance.getEntriesByType).toHaveBeenCalledWith('navigation');
    });

    it('should collect valid navigation metrics when API is available', () => {
      // Mock valid navigation timing entry
      const mockEntry = {
        fetchStart: 1000,
        responseStart: 1200,
        domContentLoadedEventEnd: 1500,
        loadEventEnd: 2000
      };

      const mockPerformance = {
        getEntriesByType: jest.fn().mockReturnValue([mockEntry])
      };
      (window as any).performance = mockPerformance;

      const result = collector.collectNavigationMetrics();

      expect(result.available).toBe(true);
      expect(result.loadTime).toBe(1000); // 2000 - 1000
      expect(result.ttfb).toBe(200); // 1200 - 1000
      expect(result.domContentLoaded).toBe(500); // 1500 - 1000
    });

    it('should handle invalid timing data gracefully', () => {
      // Mock entry with invalid timing (negative values)
      const mockEntry = {
        fetchStart: 2000,
        responseStart: 1000, // Earlier than fetchStart
        domContentLoadedEventEnd: 1500,
        loadEventEnd: 1800
      };

      const mockPerformance = {
        getEntriesByType: jest.fn().mockReturnValue([mockEntry])
      };
      (window as any).performance = mockPerformance;

      const result = collector.collectNavigationMetrics();

      expect(result.available).toBe(false);
    });

    it('should handle API exceptions gracefully', () => {
      // Mock Performance API that throws an error
      const mockPerformance = {
        getEntriesByType: jest.fn().mockImplementation(() => {
          throw new Error('API Error');
        })
      };
      (window as any).performance = mockPerformance;

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = collector.collectNavigationMetrics();

      expect(result.available).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to collect navigation metrics:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('collectResourceMetrics', () => {
    it('should return unavailable metrics when Performance API is not available', () => {
      // Mock missing Performance API
      const originalPerformance = window.performance;
      (window as any).performance = undefined;

      const result = collector.collectResourceMetrics();

      expect(result.available).toBe(false);
      expect(result.totalSize).toBe(0);
      expect(result.resourceCount).toBe(0);
      expect(result.largestResource.name).toBe('');

      // Restore original performance
      window.performance = originalPerformance;
    });

    it('should return unavailable metrics when no resource entries exist', () => {
      // Mock Performance API with empty resource entries
      const mockPerformance = {
        getEntriesByType: jest.fn().mockReturnValue([])
      };
      (window as any).performance = mockPerformance;

      const result = collector.collectResourceMetrics();

      expect(result.available).toBe(false);
      expect(mockPerformance.getEntriesByType).toHaveBeenCalledWith('resource');
    });

    it('should collect valid resource metrics when API is available', () => {
      // Mock resource timing entries
      const mockEntries = [
        {
          name: 'https://example.com/script.js',
          transferSize: 50000,
          encodedBodySize: 45000,
          initiatorType: 'script'
        },
        {
          name: 'https://example.com/style.css',
          transferSize: 20000,
          encodedBodySize: 18000,
          initiatorType: 'link'
        },
        {
          name: 'https://example.com/image.png',
          transferSize: 100000,
          encodedBodySize: 95000,
          initiatorType: 'img'
        }
      ];

      const mockPerformance = {
        getEntriesByType: jest.fn().mockReturnValue(mockEntries)
      };
      (window as any).performance = mockPerformance;

      const result = collector.collectResourceMetrics();

      expect(result.available).toBe(true);
      expect(result.totalSize).toBe(170000); // 50000 + 20000 + 100000
      expect(result.resourceCount).toBe(3);
      expect(result.largestResource.name).toBe('image.png');
      expect(result.largestResource.size).toBe(100000);
      expect(result.largestResource.type).toBe('img');
    });

    it('should handle resources with missing size data', () => {
      // Mock resource entries with missing transferSize
      const mockEntries = [
        {
          name: 'https://example.com/script.js',
          transferSize: 0,
          encodedBodySize: 45000,
          initiatorType: 'script'
        },
        {
          name: 'https://example.com/style.css',
          transferSize: 20000,
          encodedBodySize: 0,
          initiatorType: 'link'
        }
      ];

      const mockPerformance = {
        getEntriesByType: jest.fn().mockReturnValue(mockEntries)
      };
      (window as any).performance = mockPerformance;

      const result = collector.collectResourceMetrics();

      expect(result.available).toBe(true);
      expect(result.totalSize).toBe(65000); // 45000 + 20000 (fallback to encodedBodySize)
      expect(result.resourceCount).toBe(2);
      expect(result.largestResource.size).toBe(45000);
    });

    it('should determine resource types correctly', () => {
      // Mock resource entries with different types
      const mockEntries = [
        {
          name: 'https://example.com/unknown-file',
          transferSize: 10000,
          encodedBodySize: 9000,
          initiatorType: 'other'
        },
        {
          name: 'https://example.com/font.woff2',
          transferSize: 15000,
          encodedBodySize: 14000,
          initiatorType: 'other'
        }
      ];

      const mockPerformance = {
        getEntriesByType: jest.fn().mockReturnValue(mockEntries)
      };
      (window as any).performance = mockPerformance;

      const result = collector.collectResourceMetrics();

      expect(result.available).toBe(true);
      expect(result.largestResource.type).toBe('font'); // Should detect .woff2 as font
    });

    it('should handle API exceptions gracefully', () => {
      // Mock Performance API that throws an error
      const mockPerformance = {
        getEntriesByType: jest.fn().mockImplementation(() => {
          throw new Error('Resource API Error');
        })
      };
      (window as any).performance = mockPerformance;

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = collector.collectResourceMetrics();

      expect(result.available).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to collect resource metrics:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('collectRenderingMetrics', () => {
    it('should return unavailable metrics when Performance API is not available', () => {
      // Mock missing Performance API
      const originalPerformance = window.performance;
      (window as any).performance = undefined;

      const result = collector.collectRenderingMetrics();

      expect(result.available).toBe(false);
      expect(result.firstPaint).toBe(0);
      expect(result.largestContentfulPaint).toBe(0);

      // Restore original performance
      window.performance = originalPerformance;
    });

    it('should return unavailable metrics when no paint entries exist', () => {
      // Mock Performance API with empty paint entries
      const mockPerformance = {
        getEntriesByType: jest.fn().mockReturnValue([])
      };
      (window as any).performance = mockPerformance;

      const result = collector.collectRenderingMetrics();

      expect(result.available).toBe(false);
      expect(mockPerformance.getEntriesByType).toHaveBeenCalledWith('paint');
    });

    it('should collect first-paint timing when available', () => {
      // Mock paint timing entries
      const mockPaintEntries = [
        {
          name: 'first-paint',
          startTime: 1250.5
        }
      ];

      const mockPerformance = {
        getEntriesByType: jest.fn()
          .mockReturnValueOnce(mockPaintEntries) // for paint entries
          .mockReturnValueOnce([]) // for LCP entries
      };
      (window as any).performance = mockPerformance;

      const result = collector.collectRenderingMetrics();

      expect(result.available).toBe(true);
      expect(result.firstPaint).toBe(1251); // Rounded
      expect(result.largestContentfulPaint).toBe(0);
    });

    it('should use first-contentful-paint as fallback for first-paint', () => {
      // Mock paint timing entries with only first-contentful-paint
      const mockPaintEntries = [
        {
          name: 'first-contentful-paint',
          startTime: 1500.7
        }
      ];

      const mockPerformance = {
        getEntriesByType: jest.fn()
          .mockReturnValueOnce(mockPaintEntries) // for paint entries
          .mockReturnValueOnce([]) // for LCP entries
      };
      (window as any).performance = mockPerformance;

      const result = collector.collectRenderingMetrics();

      expect(result.available).toBe(true);
      expect(result.firstPaint).toBe(1501); // Rounded, used FCP as fallback
      expect(result.largestContentfulPaint).toBe(0);
    });

    it('should collect LCP timing when available', () => {
      // Mock paint and LCP timing entries
      const mockPaintEntries = [
        {
          name: 'first-paint',
          startTime: 1200
        }
      ];

      const mockLCPEntries = [
        {
          startTime: 2500.3
        },
        {
          startTime: 2800.9 // Latest LCP entry
        }
      ];

      const mockPerformance = {
        getEntriesByType: jest.fn()
          .mockReturnValueOnce(mockPaintEntries) // for paint entries
          .mockReturnValueOnce(mockLCPEntries) // for LCP entries
      };
      (window as any).performance = mockPerformance;

      const result = collector.collectRenderingMetrics();

      expect(result.available).toBe(true);
      expect(result.firstPaint).toBe(1200);
      expect(result.largestContentfulPaint).toBe(2801); // Latest LCP, rounded
    });

    it('should handle LCP API errors gracefully', () => {
      // Mock paint entries but LCP throws error
      const mockPaintEntries = [
        {
          name: 'first-paint',
          startTime: 1300
        }
      ];

      const mockPerformance = {
        getEntriesByType: jest.fn()
          .mockReturnValueOnce(mockPaintEntries) // for paint entries
          .mockImplementationOnce(() => {
            throw new Error('LCP not supported');
          }) // for LCP entries
      };
      (window as any).performance = mockPerformance;

      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

      const result = collector.collectRenderingMetrics();

      expect(result.available).toBe(true);
      expect(result.firstPaint).toBe(1300);
      expect(result.largestContentfulPaint).toBe(0);
      expect(consoleSpy).toHaveBeenCalledWith('LCP not available:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should handle API exceptions gracefully', () => {
      // Mock Performance API that throws an error
      const mockPerformance = {
        getEntriesByType: jest.fn().mockImplementation(() => {
          throw new Error('Paint API Error');
        })
      };
      (window as any).performance = mockPerformance;

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = collector.collectRenderingMetrics();

      expect(result.available).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to collect rendering metrics:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('monitorNetworkActivity', () => {
    it('should return unavailable metrics when Performance API is not available', () => {
      // Mock missing Performance API
      const originalPerformance = window.performance;
      (window as any).performance = undefined;

      const result = collector.monitorNetworkActivity();

      expect(result.available).toBe(false);
      expect(result.ajaxCount).toBe(0);
      expect(result.slowestRequest.url).toBe('');
      expect(result.slowestRequest.duration).toBe(0);

      // Restore original performance
      window.performance = originalPerformance;
    });

    it('should identify network requests by initiator type', () => {
      // Mock resource entries with network request initiator types
      const mockEntries = [
        {
          name: 'https://api.example.com/users',
          initiatorType: 'fetch',
          requestStart: 1000,
          responseEnd: 1200
        },
        {
          name: 'https://api.example.com/posts',
          initiatorType: 'xmlhttprequest',
          requestStart: 1100,
          responseEnd: 1400
        },
        {
          name: 'https://example.com/script.js',
          initiatorType: 'script',
          requestStart: 1000,
          responseEnd: 1100
        }
      ];

      const mockPerformance = {
        getEntriesByType: jest.fn().mockReturnValue(mockEntries)
      };
      (window as any).performance = mockPerformance;

      const result = collector.monitorNetworkActivity();

      expect(result.available).toBe(true);
      expect(result.ajaxCount).toBe(2); // Only fetch and xmlhttprequest
      expect(result.slowestRequest.url).toBe('posts'); // 300ms duration
      expect(result.slowestRequest.duration).toBe(300);
    });

    it('should identify network requests by URL patterns', () => {
      // Mock resource entries with API-like URLs
      const mockEntries = [
        {
          name: 'https://example.com/api/data.json',
          initiatorType: 'other',
          requestStart: 1000,
          responseEnd: 1150
        },
        {
          name: 'https://example.com/graphql',
          initiatorType: 'other',
          requestStart: 1100,
          responseEnd: 1300
        },
        {
          name: 'https://example.com/style.css',
          initiatorType: 'link',
          requestStart: 1000,
          responseEnd: 1050
        },
        {
          name: 'https://example.com/image.png',
          initiatorType: 'img',
          requestStart: 1000,
          responseEnd: 1080
        }
      ];

      const mockPerformance = {
        getEntriesByType: jest.fn().mockReturnValue(mockEntries)
      };
      (window as any).performance = mockPerformance;

      const result = collector.monitorNetworkActivity();

      expect(result.available).toBe(true);
      expect(result.ajaxCount).toBe(2); // Only API and GraphQL requests
      expect(result.slowestRequest.url).toBe('graphql'); // 200ms duration
      expect(result.slowestRequest.duration).toBe(200);
    });

    it('should handle entries with missing timing data', () => {
      // Mock resource entries with missing timing
      const mockEntries = [
        {
          name: 'https://api.example.com/data',
          initiatorType: 'fetch',
          requestStart: 0,
          responseEnd: 0
        },
        {
          name: 'https://api.example.com/valid',
          initiatorType: 'fetch',
          requestStart: 1000,
          responseEnd: 1250
        }
      ];

      const mockPerformance = {
        getEntriesByType: jest.fn().mockReturnValue(mockEntries)
      };
      (window as any).performance = mockPerformance;

      const result = collector.monitorNetworkActivity();

      expect(result.available).toBe(true);
      expect(result.ajaxCount).toBe(2); // Both counted as network requests
      expect(result.slowestRequest.url).toBe('valid'); // Only valid timing
      expect(result.slowestRequest.duration).toBe(250);
    });

    it('should return zero count when no network requests found', () => {
      // Mock resource entries with only static resources
      const mockEntries = [
        {
          name: 'https://example.com/script.js',
          initiatorType: 'script',
          requestStart: 1000,
          responseEnd: 1100
        },
        {
          name: 'https://example.com/style.css',
          initiatorType: 'link',
          requestStart: 1000,
          responseEnd: 1050
        }
      ];

      const mockPerformance = {
        getEntriesByType: jest.fn().mockReturnValue(mockEntries)
      };
      (window as any).performance = mockPerformance;

      const result = collector.monitorNetworkActivity();

      expect(result.available).toBe(true);
      expect(result.ajaxCount).toBe(0);
      expect(result.slowestRequest.url).toBe('');
      expect(result.slowestRequest.duration).toBe(0);
    });

    it('should handle beacon requests', () => {
      // Mock resource entries with beacon requests
      const mockEntries = [
        {
          name: 'https://analytics.example.com/track',
          initiatorType: 'beacon',
          requestStart: 1000,
          responseEnd: 1050
        }
      ];

      const mockPerformance = {
        getEntriesByType: jest.fn().mockReturnValue(mockEntries)
      };
      (window as any).performance = mockPerformance;

      const result = collector.monitorNetworkActivity();

      expect(result.available).toBe(true);
      expect(result.ajaxCount).toBe(1);
      expect(result.slowestRequest.url).toBe('track');
      expect(result.slowestRequest.duration).toBe(50);
    });

    it('should handle API exceptions gracefully', () => {
      // Mock Performance API that throws an error
      const mockPerformance = {
        getEntriesByType: jest.fn().mockImplementation(() => {
          throw new Error('Network monitoring error');
        })
      };
      (window as any).performance = mockPerformance;

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = collector.monitorNetworkActivity();

      expect(result.available).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to monitor network activity:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });
});