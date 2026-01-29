import { MetricsCollector } from './MetricsCollector';
import { NFREvaluator } from './NFREvaluator';
import { ConfigurationManager } from './ConfigurationManager';
import { ResultsPresenter } from './ResultsPresenter';
import { AllMetrics, OverallHealth, HealthResult } from '../types';

/**
 * Main PageHealthAnalyzer class that orchestrates the complete analysis pipeline
 * by coordinating metrics collection, evaluation, and results presentation.
 */
export class PageHealthAnalyzer {
  private metricsCollector: MetricsCollector;
  private nfrEvaluator: NFREvaluator;
  private configManager: ConfigurationManager;
  private resultsPresenter: ResultsPresenter;
  private analysisTimeout: number;

  constructor(timeoutMs: number = 10000) {
    this.metricsCollector = new MetricsCollector();
    this.nfrEvaluator = new NFREvaluator();
    this.configManager = new ConfigurationManager();
    this.resultsPresenter = new ResultsPresenter();
    this.analysisTimeout = timeoutMs;
  }

  /**
   * Performs complete page health analysis with timeout protection
   * @returns Promise<OverallHealth> Complete analysis results
   */
  async analyzePageHealth(): Promise<OverallHealth> {
    return new Promise((resolve, reject) => {
      // Set up timeout protection
      const timeoutId = setTimeout(() => {
        reject(new Error(`Analysis timed out after ${this.analysisTimeout}ms`));
      }, this.analysisTimeout);

      try {
        // Perform synchronous analysis in next tick to allow timeout to work
        setTimeout(() => {
          try {
            const result = this.performAnalysis();
            clearTimeout(timeoutId);
            resolve(result);
          } catch (error) {
            clearTimeout(timeoutId);
            reject(error);
          }
        }, 0);
      } catch (error) {
        // Clear timeout and reject
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Performs synchronous page health analysis with comprehensive error handling
   * @returns OverallHealth Complete analysis results
   */
  performAnalysis(): OverallHealth {
    const errors: string[] = [];
    let metrics: AllMetrics;
    let thresholds: any;
    let results: HealthResult[] = [];

    try {
      // Step 1: Collect all metrics with individual error handling
      metrics = this.collectAllMetricsWithErrorHandling(errors);

      // Step 2: Get current thresholds with error handling
      try {
        thresholds = this.configManager.getThresholds();
      } catch (error) {
        errors.push(`Configuration error: ${error instanceof Error ? error.message : 'Unknown configuration error'}`);
        // Use default thresholds as fallback
        thresholds = {
          pageSize: 2 * 1024 * 1024, // 2MB
          loadTime: 5000, // 5s
          ttfb: 3000 // 3s
        };
      }

      // Step 3: Evaluate metrics against thresholds with error handling
      try {
        results = this.evaluateMetricsWithErrorHandling(metrics, thresholds, errors);
      } catch (error) {
        errors.push(`Evaluation error: ${error instanceof Error ? error.message : 'Unknown evaluation error'}`);
      }

      // Step 4: Generate overall health assessment with error handling
      try {
        const overallHealth = this.nfrEvaluator.generateOverallHealth(results);
        
        // Add any collected errors to worst offenders
        if (errors.length > 0) {
          overallHealth.worstOffenders = [...errors, ...overallHealth.worstOffenders];
          // Downgrade status if there were errors
          if (overallHealth.status === 'PASS' && errors.length > 0) {
            overallHealth.status = 'WARN';
            overallHealth.score = Math.max(0, overallHealth.score - (errors.length * 10));
          }
        }

        return overallHealth;
      } catch (error) {
        errors.push(`Health assessment error: ${error instanceof Error ? error.message : 'Unknown assessment error'}`);
        throw error; // Re-throw to be caught by outer try-catch
      }

    } catch (error) {
      // Return failure state with comprehensive error information
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const allErrors = errors.length > 0 ? [...errors, `Critical error: ${errorMessage}`] : [`Analysis failed: ${errorMessage}`];
      
      return {
        status: 'FAIL',
        score: 0,
        results: [],
        worstOffenders: allErrors
      };
    }
  }

  /**
   * Collects all available metrics with individual error handling
   * @param errors Array to collect error messages
   * @returns AllMetrics Combined metrics from all collectors
   */
  private collectAllMetricsWithErrorHandling(errors: string[]): AllMetrics {
    const metrics: AllMetrics = {
      navigation: { loadTime: 0, ttfb: 0, domContentLoaded: 0, available: false },
      resource: { totalSize: 0, resourceCount: 0, largestResource: { name: '', size: 0, type: 'unknown' }, available: false },
      rendering: { firstPaint: 0, largestContentfulPaint: 0, available: false },
      network: { ajaxCount: 0, slowestRequest: { url: '', duration: 0 }, available: false }
    };

    // Collect navigation metrics
    try {
      metrics.navigation = this.metricsCollector.collectNavigationMetrics();
    } catch (error) {
      errors.push(`Navigation metrics collection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Collect resource metrics
    try {
      metrics.resource = this.metricsCollector.collectResourceMetrics();
    } catch (error) {
      errors.push(`Resource metrics collection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Collect rendering metrics
    try {
      metrics.rendering = this.metricsCollector.collectRenderingMetrics();
    } catch (error) {
      errors.push(`Rendering metrics collection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Collect network metrics
    try {
      metrics.network = this.metricsCollector.monitorNetworkActivity();
    } catch (error) {
      errors.push(`Network metrics collection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return metrics;
  }

  /**
   * Evaluates collected metrics against configured thresholds with error handling
   * @param metrics AllMetrics collected from the page
   * @param thresholds Current threshold configuration
   * @param errors Array to collect error messages
   * @returns HealthResult[] Individual metric evaluations
   */
  private evaluateMetricsWithErrorHandling(metrics: AllMetrics, thresholds: any, errors: string[]): HealthResult[] {
    const results: HealthResult[] = [];

    // Evaluate page size
    try {
      results.push(this.nfrEvaluator.evaluatePageSize(metrics.resource, thresholds.pageSize));
    } catch (error) {
      errors.push(`Page size evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      results.push({
        metric: 'Page Size',
        value: 0,
        threshold: thresholds.pageSize,
        status: 'FAIL',
        message: 'Evaluation failed'
      });
    }

    // Evaluate load time
    try {
      results.push(this.nfrEvaluator.evaluateLoadTime(metrics.navigation, thresholds.loadTime));
    } catch (error) {
      errors.push(`Load time evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      results.push({
        metric: 'Load Time',
        value: 0,
        threshold: thresholds.loadTime,
        status: 'FAIL',
        message: 'Evaluation failed'
      });
    }

    // Evaluate TTFB
    try {
      results.push(this.nfrEvaluator.evaluateTTFB(metrics.navigation, thresholds.ttfb));
    } catch (error) {
      errors.push(`TTFB evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      results.push({
        metric: 'Time to First Byte',
        value: 0,
        threshold: thresholds.ttfb,
        status: 'FAIL',
        message: 'Evaluation failed'
      });
    }

    return results;
  }

  /**
   * Gets formatted health summary for display with error handling
   * @returns Promise<string> Formatted health summary
   */
  async getHealthSummary(): Promise<string> {
    try {
      const health = await this.analyzePageHealth();
      return this.resultsPresenter.formatHealthSummary(health);
    } catch (error) {
      return `❌ Analysis Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }

  /**
   * Gets formatted metric details for display with error handling
   * @returns Promise<string> Formatted metric details
   */
  async getMetricDetails(): Promise<string> {
    try {
      // We need to run analysis to ensure all components are properly initialized
      await this.analyzePageHealth();
      
      const metrics = this.collectAllMetricsWithErrorHandling([]);
      const thresholds = this.configManager.getThresholds();
      
      return this.resultsPresenter.formatMetricDetails(metrics, thresholds);
    } catch (error) {
      return `Error collecting metric details: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }

  /**
   * Gets worst offenders for display with error handling
   * @returns Promise<string[]> Array of worst offender descriptions
   */
  async getWorstOffenders(): Promise<string[]> {
    try {
      const metrics = this.collectAllMetricsWithErrorHandling([]);
      const offenders = this.resultsPresenter.highlightWorstOffenders(metrics);
      return Array.isArray(offenders) ? offenders : [];
    } catch (error) {
      return [`Error identifying worst offenders: ${error instanceof Error ? error.message : 'Unknown error occurred'}`];
    }
  }

  /**
   * Renders complete results to HTML container with error handling
   * @param container HTMLElement to render results into
   * @returns Promise<void>
   */
  async renderToContainer(container: HTMLElement): Promise<void> {
    try {
      const health = await this.analyzePageHealth();
      const metrics = this.collectAllMetricsWithErrorHandling([]);
      const thresholds = this.configManager.getThresholds();
      
      this.resultsPresenter.renderResults(container, health, metrics, thresholds);
    } catch (error) {
      // Render error message to container
      container.innerHTML = `
        <div class="health-status fail">
          <div class="status-badge">❌</div>
          <div class="status-text">
            <div class="status-title">Analysis Error</div>
            <div class="status-score">${error instanceof Error ? error.message : 'Unknown error occurred'}</div>
          </div>
        </div>
      `;
    }
  }

  /**
   * Gets the configuration manager for threshold management
   * @returns ConfigurationManager instance
   */
  getConfigurationManager(): ConfigurationManager {
    return this.configManager;
  }

  /**
   * Updates analysis timeout
   * @param timeoutMs New timeout in milliseconds
   */
  setAnalysisTimeout(timeoutMs: number): void {
    if (timeoutMs > 0) {
      this.analysisTimeout = timeoutMs;
    }
  }

  /**
   * Gets current analysis timeout
   * @returns Current timeout in milliseconds
   */
  getAnalysisTimeout(): number {
    return this.analysisTimeout;
  }
}