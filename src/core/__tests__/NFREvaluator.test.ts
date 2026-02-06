import { NFREvaluator } from '../NFREvaluator';
import { NavigationMetrics, ResourceMetrics, HealthResult } from '../../types';

describe('NFREvaluator', () => {
  let evaluator: NFREvaluator;

  beforeEach(() => {
    evaluator = new NFREvaluator();
  });

  describe('evaluatePageSize', () => {
    it('should return FAIL when metrics are unavailable', () => {
      const metrics: ResourceMetrics = {
        totalSize: 0,
        resourceCount: 0,
        largestResource: { name: '', size: 0, type: 'unknown' },
        available: false
      };

      const result = evaluator.evaluatePageSize(metrics, 2000000); // 2MB

      expect(result.status).toBe('FAIL');
      expect(result.metric).toBe('Page Size');
      expect(result.message).toBe('Page size data unavailable');
    });

    it('should return PASS when page size is within threshold', () => {
      const metrics: ResourceMetrics = {
        totalSize: 1500000, // 1.5MB
        resourceCount: 10,
        largestResource: { name: 'image.png', size: 500000, type: 'image' },
        available: true
      };

      const result = evaluator.evaluatePageSize(metrics, 2000000); // 2MB

      expect(result.status).toBe('PASS');
      expect(result.value).toBe(1500000);
      expect(result.threshold).toBe(2000000);
      expect(result.message).toBe('1465 KB (threshold: 1953 KB)');
    });

    it('should return WARN when page size is 10-50% over threshold', () => {
      const metrics: ResourceMetrics = {
        totalSize: 2500000, // 2.5MB (25% over 2MB threshold)
        resourceCount: 15,
        largestResource: { name: 'bundle.js', size: 800000, type: 'script' },
        available: true
      };

      const result = evaluator.evaluatePageSize(metrics, 2000000); // 2MB

      expect(result.status).toBe('WARN');
      expect(result.value).toBe(2500000);
      expect(result.message).toBe('2441 KB (threshold: 1953 KB)');
    });

    it('should return FAIL when page size is more than 50% over threshold', () => {
      const metrics: ResourceMetrics = {
        totalSize: 3500000, // 3.5MB (75% over 2MB threshold)
        resourceCount: 20,
        largestResource: { name: 'video.mp4', size: 2000000, type: 'other' },
        available: true
      };

      const result = evaluator.evaluatePageSize(metrics, 2000000); // 2MB

      expect(result.status).toBe('FAIL');
      expect(result.value).toBe(3500000);
      expect(result.message).toBe('3418 KB (threshold: 1953 KB)');
    });
  });

  describe('evaluateLoadTime', () => {
    it('should return FAIL when metrics are unavailable', () => {
      const metrics: NavigationMetrics = {
        loadTime: 0,
        ttfb: 0,
        domContentLoaded: 0,
        available: false
      };

      const result = evaluator.evaluateLoadTime(metrics, 5000); // 5s

      expect(result.status).toBe('FAIL');
      expect(result.metric).toBe('Load Time');
      expect(result.message).toBe('Load time data unavailable');
    });

    it('should return PASS when load time is within threshold', () => {
      const metrics: NavigationMetrics = {
        loadTime: 3500, // 3.5s
        ttfb: 800,
        domContentLoaded: 2000,
        available: true
      };

      const result = evaluator.evaluateLoadTime(metrics, 5000); // 5s

      expect(result.status).toBe('PASS');
      expect(result.value).toBe(3500);
      expect(result.threshold).toBe(5000);
      expect(result.message).toBe('3.50s (threshold: 5.00s)');
    });

    it('should return WARN when load time is 10-50% over threshold', () => {
      const metrics: NavigationMetrics = {
        loadTime: 6000, // 6s (20% over 5s threshold)
        ttfb: 1200,
        domContentLoaded: 3000,
        available: true
      };

      const result = evaluator.evaluateLoadTime(metrics, 5000); // 5s

      expect(result.status).toBe('WARN');
      expect(result.message).toBe('6.00s (threshold: 5.00s)');
    });

    it('should return FAIL when load time is more than 50% over threshold', () => {
      const metrics: NavigationMetrics = {
        loadTime: 8000, // 8s (60% over 5s threshold)
        ttfb: 2000,
        domContentLoaded: 4000,
        available: true
      };

      const result = evaluator.evaluateLoadTime(metrics, 5000); // 5s

      expect(result.status).toBe('FAIL');
      expect(result.message).toBe('8.00s (threshold: 5.00s)');
    });
  });

  describe('evaluateTTFB', () => {
    it('should return FAIL when metrics are unavailable', () => {
      const metrics: NavigationMetrics = {
        loadTime: 0,
        ttfb: 0,
        domContentLoaded: 0,
        available: false
      };

      const result = evaluator.evaluateTTFB(metrics, 3000); // 3s

      expect(result.status).toBe('FAIL');
      expect(result.metric).toBe('Time to First Byte');
      expect(result.message).toBe('TTFB data unavailable');
    });

    it('should return PASS when TTFB is within threshold', () => {
      const metrics: NavigationMetrics = {
        loadTime: 5000,
        ttfb: 2000, // 2s
        domContentLoaded: 3000,
        available: true
      };

      const result = evaluator.evaluateTTFB(metrics, 3000); // 3s

      expect(result.status).toBe('PASS');
      expect(result.value).toBe(2000);
      expect(result.threshold).toBe(3000);
      expect(result.message).toBe('2.00s (threshold: 3.00s)');
    });

    it('should return WARN when TTFB is 10-50% over threshold', () => {
      const metrics: NavigationMetrics = {
        loadTime: 6000,
        ttfb: 3600, // 3.6s (20% over 3s threshold)
        domContentLoaded: 4000,
        available: true
      };

      const result = evaluator.evaluateTTFB(metrics, 3000); // 3s

      expect(result.status).toBe('WARN');
      expect(result.message).toBe('3.60s (threshold: 3.00s)');
    });

    it('should return FAIL when TTFB is more than 50% over threshold', () => {
      const metrics: NavigationMetrics = {
        loadTime: 8000,
        ttfb: 5000, // 5s (67% over 3s threshold)
        domContentLoaded: 6000,
        available: true
      };

      const result = evaluator.evaluateTTFB(metrics, 3000); // 3s

      expect(result.status).toBe('FAIL');
      expect(result.message).toBe('5.00s (threshold: 3.00s)');
    });
  });

  describe('threshold boundary conditions', () => {
    it('should handle exact threshold values correctly', () => {
      const metrics: NavigationMetrics = {
        loadTime: 5000, // Exactly 5s
        ttfb: 1000,
        domContentLoaded: 2000,
        available: true
      };

      const result = evaluator.evaluateLoadTime(metrics, 5000); // 5s

      expect(result.status).toBe('PASS');
    });

    it('should handle 50% threshold boundary correctly', () => {
      const metrics: NavigationMetrics = {
        loadTime: 7500, // Exactly 50% over 5s threshold
        ttfb: 1000,
        domContentLoaded: 2000,
        available: true
      };

      const result = evaluator.evaluateLoadTime(metrics, 5000); // 5s

      expect(result.status).toBe('WARN'); // Should be WARN at exactly 50%
    });

    it('should handle just over 50% threshold correctly', () => {
      const metrics: NavigationMetrics = {
        loadTime: 7501, // Just over 50% of 5s threshold
        ttfb: 1000,
        domContentLoaded: 2000,
        available: true
      };

      const result = evaluator.evaluateLoadTime(metrics, 5000); // 5s

      expect(result.status).toBe('FAIL'); // Should be FAIL just over 50%
    });
  });

  describe('generateOverallHealth', () => {
    it('should return FAIL status with score 0 when no results provided', () => {
      const result = evaluator.generateOverallHealth([]);

      expect(result.status).toBe('FAIL');
      expect(result.score).toBe(0);
      expect(result.results).toEqual([]);
      expect(result.worstOffenders).toEqual(['No metrics available for evaluation']);
    });

    it('should return PASS status when all metrics pass', () => {
      const results: HealthResult[] = [
        {
          metric: 'Page Size',
          value: 1000000,
          threshold: 2000000,
          status: 'PASS',
          message: '977 KB (threshold: 1953 KB)'
        },
        {
          metric: 'Load Time',
          value: 3000,
          threshold: 5000,
          status: 'PASS',
          message: '3.00s (threshold: 5.00s)'
        },
        {
          metric: 'TTFB',
          value: 1500,
          threshold: 3000,
          status: 'PASS',
          message: '1.50s (threshold: 3.00s)'
        }
      ];

      const result = evaluator.generateOverallHealth(results);

      expect(result.status).toBe('PASS');
      expect(result.score).toBe(100); // All pass = 100% score
      expect(result.results).toEqual(results);
      expect(result.worstOffenders).toEqual(['All metrics within acceptable thresholds']);
    });

    it('should return PASS status when overall score is good despite some warnings', () => {
      const results: HealthResult[] = [
        {
          metric: 'Page Size',
          value: 1000000,
          threshold: 2000000,
          status: 'PASS',
          message: '977 KB (threshold: 1953 KB)'
        },
        {
          metric: 'Load Time',
          value: 6000,
          threshold: 5000,
          status: 'WARN',
          message: '6.00s (threshold: 5.00s)'
        }
      ];

      const result = evaluator.generateOverallHealth(results);

      expect(result.status).toBe('PASS'); // Score 80 >= 70, so PASS
      expect(result.score).toBe(80); // (100 + 60) / 2 = 80
      expect(result.worstOffenders).toEqual(['Load Time: 6.00s (threshold: 5.00s)']);
    });

    it('should return WARN status when overall score is fair (50-69)', () => {
      const results: HealthResult[] = [
        {
          metric: 'Page Size',
          value: 1000000,
          threshold: 2000000,
          status: 'WARN',
          message: '977 KB (threshold: 1953 KB)'
        },
        {
          metric: 'Load Time',
          value: 6000,
          threshold: 5000,
          status: 'WARN',
          message: '6.00s (threshold: 5.00s)'
        }
      ];

      const result = evaluator.generateOverallHealth(results);

      expect(result.status).toBe('WARN'); // Score 60 < 70, so WARN
      expect(result.score).toBe(60); // (60 + 60) / 2 = 60
      expect(result.worstOffenders.length).toBeGreaterThan(0);
    });

    it('should return FAIL status when any metric fails', () => {
      const results: HealthResult[] = [
        {
          metric: 'Page Size',
          value: 4000000,
          threshold: 2000000,
          status: 'FAIL',
          message: '3906 KB (threshold: 1953 KB)'
        },
        {
          metric: 'Load Time',
          value: 6000,
          threshold: 5000,
          status: 'WARN',
          message: '6.00s (threshold: 5.00s)'
        },
        {
          metric: 'TTFB',
          value: 1500,
          threshold: 3000,
          status: 'PASS',
          message: '1.50s (threshold: 3.00s)'
        }
      ];

      const result = evaluator.generateOverallHealth(results);

      expect(result.status).toBe('FAIL');
      expect(result.score).toBe(53); // (0 + 60 + 100) / 3 = 53.33, rounded to 53
      expect(result.worstOffenders).toEqual(['Page Size: 3906 KB (threshold: 1953 KB)']);
    });

    it('should prioritize FAIL results over WARN in worst offenders', () => {
      const results: HealthResult[] = [
        {
          metric: 'Page Size',
          value: 4000000,
          threshold: 2000000,
          status: 'FAIL',
          message: 'Page size too large'
        },
        {
          metric: 'Load Time',
          value: 8000,
          threshold: 5000,
          status: 'FAIL',
          message: 'Load time too slow'
        },
        {
          metric: 'TTFB',
          value: 4000,
          threshold: 3000,
          status: 'WARN',
          message: 'TTFB slightly high'
        }
      ];

      const result = evaluator.generateOverallHealth(results);

      expect(result.status).toBe('FAIL');
      expect(result.worstOffenders).toEqual([
        'Page Size: Page size too large',
        'Load Time: Load time too slow'
      ]);
      // WARN result should not be included when FAIL results exist
      expect(result.worstOffenders).not.toContain('TTFB: TTFB slightly high');
    });

    it('should include WARN results when no FAIL results exist', () => {
      const results: HealthResult[] = [
        {
          metric: 'Page Size',
          value: 2500000,
          threshold: 2000000,
          status: 'WARN',
          message: 'Page size warning'
        },
        {
          metric: 'Load Time',
          value: 6000,
          threshold: 5000,
          status: 'WARN',
          message: 'Load time warning'
        }
      ];

      const result = evaluator.generateOverallHealth(results);

      expect(result.status).toBe('WARN');
      expect(result.worstOffenders).toEqual([
        'Page Size: Page size warning',
        'Load Time: Load time warning'
      ]);
    });

    it('should calculate correct scores for mixed results', () => {
      const results: HealthResult[] = [
        { metric: 'Test1', value: 1, threshold: 2, status: 'PASS', message: 'pass' },
        { metric: 'Test2', value: 1, threshold: 2, status: 'WARN', message: 'warn' },
        { metric: 'Test3', value: 1, threshold: 2, status: 'FAIL', message: 'fail' }
      ];

      const result = evaluator.generateOverallHealth(results);

      expect(result.score).toBe(53); // (100 + 60 + 0) / 3 = 53.33, rounded to 53
    });
  });
});