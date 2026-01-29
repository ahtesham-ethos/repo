import { NavigationMetrics, ResourceMetrics, RenderingMetrics, NetworkMetrics } from '../types';

/**
 * MetricsCollector handles gathering performance data from web pages
 * using standard browser Performance APIs in a safe, read-only manner.
 */
export class MetricsCollector {
  /**
   * Collects navigation timing metrics using the Performance API
   * @returns NavigationMetrics with timing data or availability flags
   */
  collectNavigationMetrics(): NavigationMetrics {
    try {
      // Check if Performance API is available
      if (!window.performance || !window.performance.getEntriesByType) {
        return this.createUnavailableNavigationMetrics();
      }

      // Get navigation timing entries
      const navigationEntries = window.performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      
      if (navigationEntries.length === 0) {
        return this.createUnavailableNavigationMetrics();
      }

      const entry = navigationEntries[0];

      // Calculate key timing metrics
      const loadTime = entry.loadEventEnd - entry.fetchStart;
      const ttfb = entry.responseStart - entry.fetchStart;
      const domContentLoaded = entry.domContentLoadedEventEnd - entry.fetchStart;

      // Validate that we have meaningful data
      if (loadTime <= 0 || ttfb <= 0) {
        return this.createUnavailableNavigationMetrics();
      }

      return {
        loadTime: Math.round(loadTime),
        ttfb: Math.round(ttfb),
        domContentLoaded: Math.round(domContentLoaded > 0 ? domContentLoaded : 0),
        available: true
      };

    } catch (error) {
      // Gracefully handle any API errors
      console.warn('Failed to collect navigation metrics:', error);
      return this.createUnavailableNavigationMetrics();
    }
  }

  /**
   * Collects resource timing metrics for page size and resource analysis
   * @returns ResourceMetrics with page size data and largest resource info
   */
  collectResourceMetrics(): ResourceMetrics {
    try {
      // Check if Performance API is available
      if (!window.performance || !window.performance.getEntriesByType) {
        return this.createUnavailableResourceMetrics();
      }

      // Get resource timing entries
      const resourceEntries = window.performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      
      if (resourceEntries.length === 0) {
        return this.createUnavailableResourceMetrics();
      }

      let totalSize = 0;
      let largestResource = {
        name: '',
        size: 0,
        type: 'unknown'
      };

      // Process each resource entry
      resourceEntries.forEach(entry => {
        // Calculate resource size (transferSize includes headers, encodedBodySize is just content)
        const resourceSize = entry.transferSize || entry.encodedBodySize || 0;
        
        if (resourceSize > 0) {
          totalSize += resourceSize;

          // Track largest resource
          if (resourceSize > largestResource.size) {
            largestResource = {
              name: this.getResourceName(entry.name),
              size: resourceSize,
              type: this.getResourceType(entry.name, entry.initiatorType)
            };
          }
        }
      });

      return {
        totalSize,
        resourceCount: resourceEntries.length,
        largestResource,
        available: true
      };

    } catch (error) {
      // Gracefully handle any API errors
      console.warn('Failed to collect resource metrics:', error);
      return this.createUnavailableResourceMetrics();
    }
  }

  /**
   * Collects rendering performance metrics from Paint Timing API
   * @returns RenderingMetrics with paint timing data
   */
  collectRenderingMetrics(): RenderingMetrics {
    try {
      // Check if Performance API is available
      if (!window.performance || !window.performance.getEntriesByType) {
        return this.createUnavailableRenderingMetrics();
      }

      // Get paint timing entries
      const paintEntries = window.performance.getEntriesByType('paint') as PerformancePaintTiming[];
      
      let firstPaint = 0;
      let largestContentfulPaint = 0;

      // Process paint entries
      paintEntries.forEach(entry => {
        if (entry.name === 'first-paint') {
          firstPaint = Math.round(entry.startTime);
        } else if (entry.name === 'first-contentful-paint') {
          // Use first-contentful-paint as a fallback for first-paint if needed
          if (firstPaint === 0) {
            firstPaint = Math.round(entry.startTime);
          }
        }
      });

      // Try to get Largest Contentful Paint from separate API
      try {
        // LCP is available through PerformanceObserver, but we can also check for existing entries
        const lcpEntries = window.performance.getEntriesByType('largest-contentful-paint') as PerformancePaintTiming[];
        if (lcpEntries.length > 0) {
          // Get the most recent LCP entry
          const latestLCP = lcpEntries[lcpEntries.length - 1];
          largestContentfulPaint = Math.round(latestLCP.startTime);
        }
      } catch (lcpError) {
        // LCP might not be available in all browsers, continue without it
        console.debug('LCP not available:', lcpError);
      }

      // Check if we have any meaningful data
      const hasData = firstPaint > 0 || largestContentfulPaint > 0;

      return {
        firstPaint,
        largestContentfulPaint,
        available: hasData
      };

    } catch (error) {
      // Gracefully handle any API errors
      console.warn('Failed to collect rendering metrics:', error);
      return this.createUnavailableRenderingMetrics();
    }
  }

  /**
   * Monitors network activity using PerformanceObserver for AJAX/fetch/XHR requests
   * @returns NetworkMetrics with request count and slowest request info
   */
  monitorNetworkActivity(): NetworkMetrics {
    try {
      // Check if Performance API is available
      if (!window.performance || !window.performance.getEntriesByType) {
        return this.createUnavailableNetworkMetrics();
      }

      // Get resource entries that represent network requests
      const resourceEntries = window.performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      
      let ajaxCount = 0;
      let slowestRequest = {
        url: '',
        duration: 0
      };

      // Filter and analyze network requests
      resourceEntries.forEach(entry => {
        // Identify AJAX/fetch/XHR requests by initiator type or resource type
        const isNetworkRequest = this.isNetworkRequest(entry);
        
        if (isNetworkRequest) {
          ajaxCount++;
          
          // Calculate request duration
          const duration = entry.responseEnd - entry.requestStart;
          
          if (duration > slowestRequest.duration) {
            slowestRequest = {
              url: this.getResourceName(entry.name),
              duration: Math.round(duration)
            };
          }
        }
      });

      // Also try to use PerformanceObserver for real-time monitoring if available
      // This is more for future requests, but we can check if it's supported
      // Note: For now we rely on existing resource entries, but this could be extended
      // to use PerformanceObserver for real-time monitoring in the future

      return {
        ajaxCount,
        slowestRequest,
        available: true
      };

    } catch (error) {
      // Gracefully handle any API errors
      console.warn('Failed to monitor network activity:', error);
      return this.createUnavailableNetworkMetrics();
    }
  }

  /**
   * Determines if a resource entry represents a network request (AJAX/fetch/XHR)
   * @param entry PerformanceResourceTiming entry
   * @returns true if the entry represents a network request
   */
  private isNetworkRequest(entry: PerformanceResourceTiming): boolean {
    // Check initiator type for common network request types
    if (entry.initiatorType === 'fetch' || 
        entry.initiatorType === 'xmlhttprequest' ||
        entry.initiatorType === 'beacon') {
      return true;
    }

    // Check for common API endpoints and data formats
    const url = entry.name.toLowerCase();
    const isApiEndpoint = url.includes('/api/') || 
                         url.includes('/graphql') ||
                         url.includes('/rest/') ||
                         url.includes('/v1/') ||
                         url.includes('/v2/');

    const isDataFormat = url.endsWith('.json') ||
                        url.endsWith('.xml') ||
                        url.includes('json') ||
                        url.includes('api');

    // Also check if it's not a typical static resource
    const isNotStaticResource = !url.endsWith('.css') &&
                               !url.endsWith('.js') &&
                               !url.endsWith('.png') &&
                               !url.endsWith('.jpg') &&
                               !url.endsWith('.jpeg') &&
                               !url.endsWith('.gif') &&
                               !url.endsWith('.svg') &&
                               !url.endsWith('.woff') &&
                               !url.endsWith('.woff2') &&
                               !url.endsWith('.ttf') &&
                               !url.endsWith('.ico');

    return (isApiEndpoint || isDataFormat) && isNotStaticResource;
  }

  /**
   * Creates a NetworkMetrics object indicating data is unavailable
   * @returns NetworkMetrics with available: false
   */
  private createUnavailableNetworkMetrics(): NetworkMetrics {
    return {
      ajaxCount: 0,
      slowestRequest: {
        url: '',
        duration: 0
      },
      available: false
    };
  }

  /**
   * Extracts a readable resource name from a full URL
   * @param url Full resource URL
   * @returns Shortened resource name
   */
  private getResourceName(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop() || pathname;
      return filename || urlObj.hostname;
    } catch {
      // If URL parsing fails, return last part of the string
      return url.split('/').pop() || url.substring(0, 50);
    }
  }

  /**
   * Determines resource type from URL and initiator type
   * @param url Resource URL
   * @param initiatorType Browser-provided initiator type
   * @returns Human-readable resource type
   */
  private getResourceType(url: string, initiatorType: string): string {
    // Use initiator type if available and meaningful
    if (initiatorType && initiatorType !== 'other') {
      return initiatorType;
    }

    // Fallback to URL-based detection
    const extension = url.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'js':
        return 'script';
      case 'css':
        return 'stylesheet';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
      case 'webp':
        return 'image';
      case 'woff':
      case 'woff2':
      case 'ttf':
      case 'otf':
        return 'font';
      case 'json':
      case 'xml':
        return 'fetch';
      default:
        return 'other';
    }
  }

  /**
   * Creates a RenderingMetrics object indicating data is unavailable
   * @returns RenderingMetrics with available: false
   */
  private createUnavailableRenderingMetrics(): RenderingMetrics {
    return {
      firstPaint: 0,
      largestContentfulPaint: 0,
      available: false
    };
  }

  /**
   * Creates a ResourceMetrics object indicating data is unavailable
   * @returns ResourceMetrics with available: false
   */
  private createUnavailableResourceMetrics(): ResourceMetrics {
    return {
      totalSize: 0,
      resourceCount: 0,
      largestResource: {
        name: '',
        size: 0,
        type: 'unknown'
      },
      available: false
    };
  }

  /**
   * Creates a NavigationMetrics object indicating data is unavailable
   * @returns NavigationMetrics with available: false
   */
  private createUnavailableNavigationMetrics(): NavigationMetrics {
    return {
      loadTime: 0,
      ttfb: 0,
      domContentLoaded: 0,
      available: false
    };
  }
}