import { HealthResult, HealthStatus, NavigationMetrics, ResourceMetrics, OverallHealth } from '../types';

/**
 * NFREvaluator handles evaluation of performance metrics against configurable thresholds
 * to determine health status (PASS/WARN/FAIL) for each metric.
 */
export class NFREvaluator {
  /**
   * Evaluates page size against threshold
   * @param metrics ResourceMetrics containing page size data
   * @param threshold Page size threshold in bytes
   * @returns HealthResult with evaluation status
   */
  evaluatePageSize(metrics: ResourceMetrics, threshold: number): HealthResult {
    if (!metrics.available) {
      return {
        metric: 'Page Size',
        value: 0,
        threshold,
        status: 'FAIL',
        message: 'Page size data unavailable'
      };
    }

    const pageSizeKB = Math.round(metrics.totalSize / 1024);
    const thresholdKB = Math.round(threshold / 1024);
    const status = this.determineHealthStatus(metrics.totalSize, threshold);
    
    return {
      metric: 'Page Size',
      value: metrics.totalSize,
      threshold,
      status,
      message: `${pageSizeKB} KB (threshold: ${thresholdKB} KB)`
    };
  }

  /**
   * Evaluates total load time against threshold
   * @param metrics NavigationMetrics containing load time data
   * @param threshold Load time threshold in milliseconds
   * @returns HealthResult with evaluation status
   */
  evaluateLoadTime(metrics: NavigationMetrics, threshold: number): HealthResult {
    if (!metrics.available) {
      return {
        metric: 'Load Time',
        value: 0,
        threshold,
        status: 'FAIL',
        message: 'Load time data unavailable'
      };
    }

    const loadTimeSeconds = (metrics.loadTime / 1000).toFixed(2);
    const thresholdSeconds = (threshold / 1000).toFixed(2);
    const status = this.determineHealthStatus(metrics.loadTime, threshold);
    
    return {
      metric: 'Load Time',
      value: metrics.loadTime,
      threshold,
      status,
      message: `${loadTimeSeconds}s (threshold: ${thresholdSeconds}s)`
    };
  }

  /**
   * Evaluates Time to First Byte against threshold
   * @param metrics NavigationMetrics containing TTFB data
   * @param threshold TTFB threshold in milliseconds
   * @returns HealthResult with evaluation status
   */
  evaluateTTFB(metrics: NavigationMetrics, threshold: number): HealthResult {
    if (!metrics.available) {
      return {
        metric: 'Time to First Byte',
        value: 0,
        threshold,
        status: 'FAIL',
        message: 'TTFB data unavailable'
      };
    }

    const ttfbSeconds = (metrics.ttfb / 1000).toFixed(2);
    const thresholdSeconds = (threshold / 1000).toFixed(2);
    const status = this.determineHealthStatus(metrics.ttfb, threshold);
    
    return {
      metric: 'Time to First Byte',
      value: metrics.ttfb,
      threshold,
      status,
      message: `${ttfbSeconds}s (threshold: ${thresholdSeconds}s)`
    };
  }

  /**
   * Generates overall health assessment by combining individual results
   * @param results Array of individual HealthResult evaluations
   * @returns OverallHealth with composite score and worst offenders
   */
  generateOverallHealth(results: HealthResult[]): OverallHealth {
    if (results.length === 0) {
      return {
        status: 'FAIL',
        score: 0,
        results: [],
        worstOffenders: ['No metrics available for evaluation']
      };
    }

    // Calculate composite health score (0-100)
    let totalScore = 0;
    let passCount = 0;
    let warnCount = 0;
    let failCount = 0;

    results.forEach(result => {
      switch (result.status) {
        case 'PASS':
          totalScore += 100;
          passCount++;
          break;
        case 'WARN':
          totalScore += 60;
          warnCount++;
          break;
        case 'FAIL':
          totalScore += 0;
          failCount++;
          break;
      }
    });

    const averageScore = Math.round(totalScore / results.length);

    // Determine overall status based on worst result
    let overallStatus: HealthStatus;
    if (failCount > 0) {
      overallStatus = 'FAIL';
    } else if (warnCount > 0) {
      overallStatus = 'WARN';
    } else {
      overallStatus = 'PASS';
    }

    // Identify worst offenders (FAIL and WARN results)
    const worstOffenders: string[] = [];
    
    // Add FAIL results first (highest priority)
    results
      .filter(result => result.status === 'FAIL')
      .forEach(result => {
        worstOffenders.push(`${result.metric}: ${result.message}`);
      });

    // Add WARN results if we have space and no FAIL results
    if (worstOffenders.length === 0) {
      results
        .filter(result => result.status === 'WARN')
        .forEach(result => {
          worstOffenders.push(`${result.metric}: ${result.message}`);
        });
    }

    // If no issues found, add a positive message
    if (worstOffenders.length === 0) {
      worstOffenders.push('All metrics within acceptable thresholds');
    }

    return {
      status: overallStatus,
      score: averageScore,
      results,
      worstOffenders
    };
  }

  /**
   * Determines health status based on value vs threshold comparison
   * @param value Actual measured value
   * @param threshold Configured threshold
   * @returns HealthStatus (PASS/WARN/FAIL)
   */
  private determineHealthStatus(value: number, threshold: number): HealthStatus {
    if (value <= threshold) {
      return 'PASS';
    } else if (value <= threshold * 1.5) {
      // WARN if 10-50% over threshold
      return 'WARN';
    } else {
      // FAIL if more than 50% over threshold
      return 'FAIL';
    }
  }
}