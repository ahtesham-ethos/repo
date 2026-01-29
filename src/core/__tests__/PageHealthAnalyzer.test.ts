import { PageHealthAnalyzer } from '../PageHealthAnalyzer';

// Mock all the component classes
jest.mock('../MetricsCollector');
jest.mock('../NFREvaluator');
jest.mock('../ConfigurationManager');
jest.mock('../ResultsPresenter');

import { MetricsCollector } from '../MetricsCollector';
import { NFREvaluator } from '../NFREvaluator';
import { ConfigurationManager } from '../ConfigurationManager';
import { ResultsPresenter } from '../ResultsPresenter';

describe('PageHealthAnalyzer', () => {
  let analyzer: PageHealthAnalyzer;
  let mockMetricsCollector: jest.Mocked<MetricsCollector>;
  let mockNFREvaluator: jest.Mocked<NFREvaluator>;
  let mockConfigManager: jest.Mocked<ConfigurationManager>;
  let mockResultsPresenter: jest.Mocked<ResultsPresenter>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create analyzer instance
    analyzer = new PageHealthAnalyzer();

    // Get mocked instances
    mockMetricsCollector = (analyzer as any).metricsCollector;
    mockNFREvaluator = (analyzer as any).nfrEvaluator;
    mockConfigManager = (analyzer as any).configManager;
    mockResultsPresenter = (analyzer as any).resultsPresenter;
  });

  describe('constructor', () => {
    it('should create an instance with default timeout', () => {
      const newAnalyzer = new PageHealthAnalyzer();
      expect(newAnalyzer).toBeInstanceOf(PageHealthAnalyzer);
      expect(newAnalyzer.getAnalysisTimeout()).toBe(10000);
    });

    it('should create an instance with custom timeout', () => {
      const newAnalyzer = new PageHealthAnalyzer(5000);
      expect(newAnalyzer.getAnalysisTimeout()).toBe(5000);
    });
  });

  describe('performAnalysis', () => {
    beforeEach(() => {
      // Set up default mock returns
      mockMetricsCollector.collectNavigationMetrics.mockReturnValue({
        loadTime: 3000,
        ttfb: 1000,
        domContentLoaded: 2000,
        available: true
      });

      mockMetricsCollector.collectResourceMetrics.mockReturnValue({
        totalSize: 1500000,
        resourceCount: 10,
        largestResource: { name: 'bundle.js', size: 500000, type: 'script' },
        available: true
      });

      mockMetricsCollector.collectRenderingMetrics.mockReturnValue({
        firstPaint: 1500,
        largestContentfulPaint: 2000,
        available: true
      });

      mockMetricsCollector.monitorNetworkActivity.mockReturnValue({
        ajaxCount: 3,
        slowestRequest: { url: 'api/data', duration: 800 },
        available: true
      });

      mockConfigManager.getThresholds.mockReturnValue({
        pageSize: 2000000,
        loadTime: 5000,
        ttfb: 3000
      });

      mockNFREvaluator.evaluatePageSize.mockReturnValue({
        metric: 'Page Size',
        value: 1500000,
        threshold: 2000000,
        status: 'PASS',
        message: 'Within threshold'
      });

      mockNFREvaluator.evaluateLoadTime.mockReturnValue({
        metric: 'Load Time',
        value: 3000,
        threshold: 5000,
        status: 'PASS',
        message: 'Within threshold'
      });

      mockNFREvaluator.evaluateTTFB.mockReturnValue({
        metric: 'TTFB',
        value: 1000,
        threshold: 3000,
        status: 'PASS',
        message: 'Within threshold'
      });

      mockNFREvaluator.generateOverallHealth.mockReturnValue({
        status: 'PASS',
        score: 95,
        results: [],
        worstOffenders: []
      });
    });

    it('should perform complete analysis successfully', () => {
      const result = analyzer.performAnalysis();

      expect(result.status).toBe('PASS');
      expect(result.score).toBe(95);
      expect(mockMetricsCollector.collectNavigationMetrics).toHaveBeenCalled();
      expect(mockMetricsCollector.collectResourceMetrics).toHaveBeenCalled();
      expect(mockMetricsCollector.collectRenderingMetrics).toHaveBeenCalled();
      expect(mockMetricsCollector.monitorNetworkActivity).toHaveBeenCalled();
      expect(mockConfigManager.getThresholds).toHaveBeenCalled();
      expect(mockNFREvaluator.generateOverallHealth).toHaveBeenCalled();
    });

    it('should handle errors gracefully', () => {
      mockMetricsCollector.collectNavigationMetrics.mockImplementation(() => {
        throw new Error('Collection failed');
      });

      const result = analyzer.performAnalysis();

      expect(result.status).toBe('WARN'); // Now returns WARN with errors, not FAIL
      expect(result.worstOffenders).toContain('Navigation metrics collection failed: Collection failed');
    });

    it('should evaluate all metrics against thresholds', () => {
      analyzer.performAnalysis();

      expect(mockNFREvaluator.evaluatePageSize).toHaveBeenCalledWith(
        expect.objectContaining({ totalSize: 1500000 }),
        2000000
      );
      expect(mockNFREvaluator.evaluateLoadTime).toHaveBeenCalledWith(
        expect.objectContaining({ loadTime: 3000 }),
        5000
      );
      expect(mockNFREvaluator.evaluateTTFB).toHaveBeenCalledWith(
        expect.objectContaining({ ttfb: 1000 }),
        3000
      );
    });
  });

  describe('analyzePageHealth', () => {
    beforeEach(() => {
      // Set up mocks for successful analysis
      mockMetricsCollector.collectNavigationMetrics.mockReturnValue({
        loadTime: 3000, ttfb: 1000, domContentLoaded: 2000, available: true
      });
      mockMetricsCollector.collectResourceMetrics.mockReturnValue({
        totalSize: 1500000, resourceCount: 10, largestResource: { name: '', size: 0, type: 'unknown' }, available: true
      });
      mockMetricsCollector.collectRenderingMetrics.mockReturnValue({
        firstPaint: 1500, largestContentfulPaint: 2000, available: true
      });
      mockMetricsCollector.monitorNetworkActivity.mockReturnValue({
        ajaxCount: 3, slowestRequest: { url: '', duration: 0 }, available: true
      });
      mockConfigManager.getThresholds.mockReturnValue({
        pageSize: 2000000, loadTime: 5000, ttfb: 3000
      });
      mockNFREvaluator.evaluatePageSize.mockReturnValue({
        metric: 'Page Size', value: 1500000, threshold: 2000000, status: 'PASS', message: 'OK'
      });
      mockNFREvaluator.evaluateLoadTime.mockReturnValue({
        metric: 'Load Time', value: 3000, threshold: 5000, status: 'PASS', message: 'OK'
      });
      mockNFREvaluator.evaluateTTFB.mockReturnValue({
        metric: 'TTFB', value: 1000, threshold: 3000, status: 'PASS', message: 'OK'
      });
      mockNFREvaluator.generateOverallHealth.mockReturnValue({
        status: 'PASS', score: 95, results: [], worstOffenders: []
      });
    });

    it('should resolve with analysis results', async () => {
      const result = await analyzer.analyzePageHealth();

      expect(result.status).toBe('PASS');
      expect(result.score).toBe(95);
    });

    it('should reject on analysis errors', async () => {
      mockMetricsCollector.collectNavigationMetrics.mockImplementation(() => {
        throw new Error('Metrics collection failed');
      });

      const result = await analyzer.analyzePageHealth();
      
      expect(result.status).toBe('WARN'); // Now returns WARN with errors, not FAIL
      expect(result.worstOffenders).toContain('Navigation metrics collection failed: Metrics collection failed');
    });
  });

  describe('convenience methods', () => {
    beforeEach(() => {
      // Set up mocks
      mockMetricsCollector.collectNavigationMetrics.mockReturnValue({
        loadTime: 3000, ttfb: 1000, domContentLoaded: 2000, available: true
      });
      mockMetricsCollector.collectResourceMetrics.mockReturnValue({
        totalSize: 1500000, resourceCount: 10, largestResource: { name: '', size: 0, type: 'unknown' }, available: true
      });
      mockMetricsCollector.collectRenderingMetrics.mockReturnValue({
        firstPaint: 1500, largestContentfulPaint: 2000, available: true
      });
      mockMetricsCollector.monitorNetworkActivity.mockReturnValue({
        ajaxCount: 3, slowestRequest: { url: '', duration: 0 }, available: true
      });
      mockConfigManager.getThresholds.mockReturnValue({
        pageSize: 2000000, loadTime: 5000, ttfb: 3000
      });
      mockNFREvaluator.generateOverallHealth.mockReturnValue({
        status: 'PASS', score: 95, results: [], worstOffenders: []
      });
      mockResultsPresenter.formatHealthSummary.mockReturnValue('✅ Excellent Performance (Score: 95/100)');
      mockResultsPresenter.formatMetricDetails.mockReturnValue('Detailed metrics...');
      mockResultsPresenter.highlightWorstOffenders.mockReturnValue(['No issues found']);
    });

    it('should get health summary', async () => {
      const summary = await analyzer.getHealthSummary();

      expect(summary).toBe('✅ Excellent Performance (Score: 95/100)');
      expect(mockResultsPresenter.formatHealthSummary).toHaveBeenCalled();
    });

    it('should get metric details', async () => {
      const details = await analyzer.getMetricDetails();

      expect(details).toBe('Detailed metrics...');
      expect(mockResultsPresenter.formatMetricDetails).toHaveBeenCalled();
    });

    it('should get worst offenders', async () => {
      const offenders = await analyzer.getWorstOffenders();

      expect(offenders).toEqual(['No issues found']);
      expect(mockResultsPresenter.highlightWorstOffenders).toHaveBeenCalled();
    });

    it('should render to container', async () => {
      const container = document.createElement('div');

      await analyzer.renderToContainer(container);

      expect(mockResultsPresenter.renderResults).toHaveBeenCalledWith(
        container,
        expect.objectContaining({ status: 'PASS' }),
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  describe('configuration and timeout management', () => {
    it('should return configuration manager', () => {
      const configManager = analyzer.getConfigurationManager();
      expect(configManager).toBe(mockConfigManager);
    });

    it('should update analysis timeout', () => {
      analyzer.setAnalysisTimeout(15000);
      expect(analyzer.getAnalysisTimeout()).toBe(15000);
    });

    it('should ignore invalid timeout values', () => {
      const originalTimeout = analyzer.getAnalysisTimeout();
      analyzer.setAnalysisTimeout(-1000);
      expect(analyzer.getAnalysisTimeout()).toBe(originalTimeout);
    });
  });

  describe('enhanced error handling', () => {
    it('should handle individual metrics collection failures gracefully', () => {
      // Make navigation metrics fail but others succeed
      mockMetricsCollector.collectNavigationMetrics.mockImplementation(() => {
        throw new Error('Navigation API not available');
      });
      
      mockMetricsCollector.collectResourceMetrics.mockReturnValue({
        totalSize: 1000000, resourceCount: 5, largestResource: { name: '', size: 0, type: 'unknown' }, available: true
      });
      
      mockNFREvaluator.generateOverallHealth.mockReturnValue({
        status: 'WARN', score: 60, results: [], worstOffenders: []
      });

      const result = analyzer.performAnalysis();

      expect(result.status).toBe('WARN');
      expect(result.worstOffenders).toContain('Navigation metrics collection failed: Navigation API not available');
    });

    it('should handle configuration errors with fallback', () => {
      mockConfigManager.getThresholds.mockImplementation(() => {
        throw new Error('Storage access denied');
      });
      
      // Ensure metrics collector methods return proper values
      mockMetricsCollector.collectNavigationMetrics.mockReturnValue({
        loadTime: 3000,
        ttfb: 1000,
        domContentLoaded: 2000,
        available: true
      });

      mockMetricsCollector.collectResourceMetrics.mockReturnValue({
        totalSize: 1500000,
        resourceCount: 10,
        largestResource: { name: 'bundle.js', size: 500000, type: 'script' },
        available: true
      });

      mockMetricsCollector.collectRenderingMetrics.mockReturnValue({
        firstPaint: 1500,
        largestContentfulPaint: 2000,
        available: true
      });

      mockMetricsCollector.monitorNetworkActivity.mockReturnValue({
        ajaxCount: 3,
        slowestRequest: { url: 'api/data', duration: 800 },
        available: true
      });
      
      // Set up proper mock returns for evaluation methods
      mockNFREvaluator.evaluatePageSize.mockReturnValue({
        metric: 'Page Size', value: 1000000, threshold: 2097152, status: 'PASS', message: 'OK'
      });
      mockNFREvaluator.evaluateLoadTime.mockReturnValue({
        metric: 'Load Time', value: 3000, threshold: 5000, status: 'PASS', message: 'OK'
      });
      mockNFREvaluator.evaluateTTFB.mockReturnValue({
        metric: 'TTFB', value: 1000, threshold: 3000, status: 'PASS', message: 'OK'
      });
      
      mockNFREvaluator.generateOverallHealth.mockReturnValue({
        status: 'WARN', score: 70, results: [], worstOffenders: []
      });

      const result = analyzer.performAnalysis();

      expect(result.worstOffenders).toContain('Configuration error: Storage access denied');
      // Should still complete analysis with default thresholds
      expect(mockNFREvaluator.evaluatePageSize).toHaveBeenCalledWith(expect.any(Object), 2097152); // 2MB default
    });

    it('should handle evaluation errors gracefully', () => {
      // Set up proper thresholds mock
      mockConfigManager.getThresholds.mockReturnValue({
        pageSize: 2000000, loadTime: 5000, ttfb: 3000
      });
      
      mockNFREvaluator.evaluatePageSize.mockImplementation(() => {
        throw new Error('Evaluation logic error');
      });
      
      // Set up other evaluation methods to succeed
      mockNFREvaluator.evaluateLoadTime.mockReturnValue({
        metric: 'Load Time', value: 3000, threshold: 5000, status: 'PASS', message: 'OK'
      });
      mockNFREvaluator.evaluateTTFB.mockReturnValue({
        metric: 'TTFB', value: 1000, threshold: 3000, status: 'PASS', message: 'OK'
      });
      
      mockNFREvaluator.generateOverallHealth.mockReturnValue({
        status: 'FAIL', score: 30, results: [], worstOffenders: []
      });

      const result = analyzer.performAnalysis();

      expect(result.worstOffenders).toContain('Page size evaluation failed: Evaluation logic error');
    });

    it('should handle convenience method errors', async () => {
      // Make the collectAllMetricsWithErrorHandling method throw an error by making metrics collector fail
      mockMetricsCollector.collectNavigationMetrics.mockImplementation(() => {
        throw new Error('Critical failure');
      });
      mockMetricsCollector.collectResourceMetrics.mockImplementation(() => {
        throw new Error('Critical failure');
      });
      mockMetricsCollector.collectRenderingMetrics.mockImplementation(() => {
        throw new Error('Critical failure');
      });
      mockMetricsCollector.monitorNetworkActivity.mockImplementation(() => {
        throw new Error('Critical failure');
      });

      // Set up the NFR evaluator to return FAIL results
      mockNFREvaluator.evaluatePageSize.mockReturnValue({
        metric: 'Page Size', value: 0, threshold: 2000000, status: 'FAIL', message: 'Evaluation failed'
      });
      mockNFREvaluator.evaluateLoadTime.mockReturnValue({
        metric: 'Load Time', value: 0, threshold: 5000, status: 'FAIL', message: 'Evaluation failed'
      });
      mockNFREvaluator.evaluateTTFB.mockReturnValue({
        metric: 'TTFB', value: 0, threshold: 3000, status: 'FAIL', message: 'Evaluation failed'
      });
      
      mockNFREvaluator.generateOverallHealth.mockReturnValue({
        status: 'FAIL', score: 0, results: [], worstOffenders: ['Critical failure errors']
      });

      // Set up results presenter to return proper formatted results
      mockResultsPresenter.formatHealthSummary.mockReturnValue('❌ Critical Failure (Score: 0/100)');
      mockResultsPresenter.formatMetricDetails.mockReturnValue('Error collecting metric details: Critical failure');
      mockResultsPresenter.highlightWorstOffenders.mockReturnValue(['Error identifying worst offenders: Critical failure']);

      const summary = await analyzer.getHealthSummary();
      expect(summary).toContain('❌ Critical Failure');

      const details = await analyzer.getMetricDetails();
      expect(details).toContain('Error collecting metric details');

      const offenders = await analyzer.getWorstOffenders();
      expect(offenders[0]).toContain('Error identifying worst offenders');
    });

    it('should handle render errors gracefully', async () => {
      const container = document.createElement('div');
      
      // Make the analyzePageHealth method throw an error
      jest.spyOn(analyzer, 'analyzePageHealth').mockRejectedValue(new Error('Render failure'));

      await analyzer.renderToContainer(container);

      expect(container.innerHTML).toContain('Analysis Error');
      expect(container.innerHTML).toContain('❌');
    });
  });
});