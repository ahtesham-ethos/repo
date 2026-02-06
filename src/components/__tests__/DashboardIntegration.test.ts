/**
 * Unit tests for DashboardIntegration class
 * 
 * Tests the integration layer between VisualDashboard and existing popup system,
 * ensuring backward compatibility and proper error handling.
 */

import { DashboardIntegration, createDashboardIntegration } from '../DashboardIntegration';
import { VisualDashboard } from '../VisualDashboard';
import { AssetManager } from '../../services/AssetManager';
import { ResultsPresenter } from '../../core/ResultsPresenter';
import { AllMetrics, Thresholds, OverallHealth, HealthStatus } from '../../types/index';

// Mock dependencies
jest.mock('../VisualDashboard');
jest.mock('../../services/AssetManager');
jest.mock('../../core/ResultsPresenter');

describe('DashboardIntegration', () => {
  let integration: DashboardIntegration;
  let containerElement: HTMLElement;
  let mockAssetManager: jest.Mocked<AssetManager>;
  let mockDashboard: jest.Mocked<VisualDashboard>;
  let mockResultsPresenter: jest.Mocked<ResultsPresenter>;

  // Sample test data
  const mockMetrics: AllMetrics = {
    navigation: {
      loadTime: 1500,
      ttfb: 200,
      domContentLoaded: 1200,
      available: true
    },
    resource: {
      totalSize: 2048000,
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
    pageSize: 1024000,
    loadTime: 2000,
    ttfb: 500
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
      }
    ],
    worstOffenders: ['Page size is too large']
  };

  beforeEach(() => {
    // Create container element
    containerElement = document.createElement('div');
    containerElement.id = 'test-container';
    document.body.appendChild(containerElement);

    // Reset all mocks
    jest.clearAllMocks();

    // Create mock AssetManager
    mockAssetManager = new AssetManager() as jest.Mocked<AssetManager>;
    mockAssetManager.initialize.mockResolvedValue();

    // Create mock ResultsPresenter
    mockResultsPresenter = new ResultsPresenter() as jest.Mocked<ResultsPresenter>;
    mockResultsPresenter.renderResults.mockImplementation(() => {});

    // Create mock VisualDashboard
    mockDashboard = {
      updateAnalysisResults: jest.fn(),
      showLoadingIndicator: jest.fn(),
      hideLoadingIndicator: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      renderExpandedView: jest.fn(),
      renderNormalView: jest.fn(),
      toggleExpansion: jest.fn(),
      updateMetricsDisplay: jest.fn()
    } as any;

    // Mock the VisualDashboard constructor to return our mock
    (VisualDashboard as jest.MockedClass<typeof VisualDashboard>).mockImplementation(() => mockDashboard);

    // Create integration instance
    integration = new DashboardIntegration();
  });

  afterEach(() => {
    // Clean up
    if (containerElement.parentNode) {
      document.body.removeChild(containerElement);
    }
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize successfully with valid container', async () => {
      // Mock AssetManager initialization to succeed
      mockAssetManager.initialize.mockResolvedValue();
      
      await integration.initialize(containerElement);

      expect(integration.isReady()).toBe(true);
      expect(VisualDashboard).toHaveBeenCalledWith(containerElement, expect.any(AssetManager), undefined);
    });

    it('should handle AssetManager initialization failure gracefully', async () => {
      // Mock AssetManager constructor to return a failing instance
      const originalAssetManager = AssetManager;
      (AssetManager as any) = jest.fn().mockImplementation(() => {
        const mockInstance = {
          initialize: jest.fn().mockRejectedValue(new Error('Asset loading failed'))
        };
        return mockInstance;
      });

      const testIntegration = new DashboardIntegration();
      await testIntegration.initialize(containerElement);

      expect(testIntegration.isReady()).toBe(false);
      
      // Restore original constructor
      (AssetManager as any) = originalAssetManager;
    });

    it('should handle VisualDashboard creation failure gracefully', async () => {
      (VisualDashboard as jest.MockedClass<typeof VisualDashboard>).mockImplementation(() => {
        throw new Error('Dashboard creation failed');
      });

      await integration.initialize(containerElement);

      expect(integration.isReady()).toBe(false);
    });

    it('should set up dashboard event listeners after initialization', async () => {
      await integration.initialize(containerElement);

      expect(mockDashboard.addEventListener).toHaveBeenCalledWith('expand_dashboard', expect.any(Function));
      expect(mockDashboard.addEventListener).toHaveBeenCalledWith('collapse_dashboard', expect.any(Function));
    });
  });

  describe('Analysis Results Update', () => {
    beforeEach(async () => {
      await integration.initialize(containerElement);
    });

    it('should update dashboard with analysis results when initialized', () => {
      integration.updateAnalysisResults(mockHealth, mockMetrics, mockThresholds);

      expect(mockDashboard.updateAnalysisResults).toHaveBeenCalledWith(mockHealth, mockMetrics, mockThresholds);
    });

    it('should handle update gracefully when not initialized', () => {
      const uninitializedIntegration = new DashboardIntegration();
      
      // Mock DOM element for fallback
      const mockResultsContainer = document.createElement('div');
      mockResultsContainer.id = 'results';
      document.body.appendChild(mockResultsContainer);
      
      // Should not throw and should use fallback
      expect(() => {
        uninitializedIntegration.updateAnalysisResults(mockHealth, mockMetrics, mockThresholds);
      }).not.toThrow();
      
      // Clean up
      document.body.removeChild(mockResultsContainer);
    });

    it('should handle dashboard update errors gracefully', () => {
      mockDashboard.updateAnalysisResults.mockImplementation(() => {
        throw new Error('Update failed');
      });

      // Should not throw
      expect(() => {
        integration.updateAnalysisResults(mockHealth, mockMetrics, mockThresholds);
      }).not.toThrow();
    });
  });

  describe('Loading State Management', () => {
    beforeEach(async () => {
      await integration.initialize(containerElement);
    });

    it('should show loading indicator when initialized', () => {
      integration.showLoading('Analyzing performance...');

      expect(mockDashboard.showLoadingIndicator).toHaveBeenCalledWith('Analyzing performance...');
    });

    it('should hide loading indicator when initialized', () => {
      integration.hideLoading();

      expect(mockDashboard.hideLoadingIndicator).toHaveBeenCalled();
    });

    it('should handle loading operations gracefully when not initialized', () => {
      const uninitializedIntegration = new DashboardIntegration();

      expect(() => {
        uninitializedIntegration.showLoading('Test');
        uninitializedIntegration.hideLoading();
      }).not.toThrow();
    });

    it('should handle dashboard loading errors gracefully', () => {
      mockDashboard.showLoadingIndicator.mockImplementation(() => {
        throw new Error('Loading failed');
      });

      expect(() => {
        integration.showLoading('Test operation');
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await integration.initialize(containerElement);
    });

    it('should show error state when initialized', () => {
      integration.showError('Test error', new Error('Details'));

      expect(mockDashboard.showLoadingIndicator).toHaveBeenCalledWith('Error: Test error');
    });

    it('should handle error display gracefully when not initialized', () => {
      const uninitializedIntegration = new DashboardIntegration();

      expect(() => {
        uninitializedIntegration.showError('Test error');
      }).not.toThrow();
    });

    it('should handle dashboard error display failures gracefully', () => {
      mockDashboard.showLoadingIndicator.mockImplementation(() => {
        throw new Error('Error display failed');
      });

      expect(() => {
        integration.showError('Test error');
      }).not.toThrow();
    });
  });

  describe('Event Management', () => {
    beforeEach(async () => {
      await integration.initialize(containerElement);
    });

    it('should add event listeners to dashboard', () => {
      const handler = jest.fn();
      integration.addEventListener('expand_dashboard', handler);

      expect(mockDashboard.addEventListener).toHaveBeenCalledWith('expand_dashboard', handler);
    });

    it('should remove event listeners from dashboard', () => {
      const handler = jest.fn();
      integration.removeEventListener('expand_dashboard', handler);

      expect(mockDashboard.removeEventListener).toHaveBeenCalledWith('expand_dashboard', handler);
    });

    it('should handle event operations gracefully when not initialized', () => {
      const uninitializedIntegration = new DashboardIntegration();
      const handler = jest.fn();

      expect(() => {
        uninitializedIntegration.addEventListener('expand_dashboard', handler);
        uninitializedIntegration.removeEventListener('expand_dashboard', handler);
      }).not.toThrow();
    });
  });

  describe('ResultsPresenter Integration', () => {
    beforeEach(async () => {
      await integration.initialize(containerElement);
    });

    it('should provide access to ResultsPresenter instance', () => {
      const resultsPresenter = integration.getResultsPresenter();
      expect(resultsPresenter).toBeInstanceOf(ResultsPresenter);
    });

    it('should track loading operations', () => {
      expect(integration.hasActiveLoadingOperations()).toBe(false);
      
      integration.showLoading('Test operation');
      expect(integration.hasActiveLoadingOperations()).toBe(true);
      expect(integration.getActiveLoadingOperations()).toContain('Test operation');
      
      integration.hideLoading('Test operation');
      expect(integration.hasActiveLoadingOperations()).toBe(false);
    });

    it('should handle multiple loading operations', () => {
      integration.showLoading('Operation 1');
      integration.showLoading('Operation 2');
      
      expect(integration.hasActiveLoadingOperations()).toBe(true);
      expect(integration.getActiveLoadingOperations()).toHaveLength(2);
      
      integration.hideLoading('Operation 1');
      expect(integration.hasActiveLoadingOperations()).toBe(true);
      
      integration.hideLoading('Operation 2');
      expect(integration.hasActiveLoadingOperations()).toBe(false);
    });

    it('should clear all loading operations when hiding without specific operation', () => {
      integration.showLoading('Operation 1');
      integration.showLoading('Operation 2');
      
      integration.hideLoading(); // No specific operation
      expect(integration.hasActiveLoadingOperations()).toBe(false);
    });
  });

  describe('Dashboard Access', () => {
    it('should return dashboard instance when initialized', async () => {
      await integration.initialize(containerElement);

      const dashboard = integration.getDashboard();
      expect(dashboard).toBe(mockDashboard);
    });

    it('should return null when not initialized', () => {
      const dashboard = integration.getDashboard();
      expect(dashboard).toBeNull();
    });

    it('should report ready state correctly', async () => {
      expect(integration.isReady()).toBe(false);

      await integration.initialize(containerElement);
      expect(integration.isReady()).toBe(true);
    });
  });

  describe('Fallback Creation', () => {
    it('should create fallback integration', () => {
      const fallback = DashboardIntegration.createFallback();

      expect(fallback.isReady()).toBe(false);
      expect(fallback.getDashboard()).toBeNull();
    });

    it('should have no-op methods in fallback', () => {
      const fallback = DashboardIntegration.createFallback();

      // These should not throw and should be no-ops
      expect(() => {
        fallback.updateAnalysisResults(mockHealth, mockMetrics, mockThresholds);
        fallback.showLoading('Test');
        fallback.hideLoading();
        fallback.showError('Test error');
        fallback.addEventListener('expand_dashboard', jest.fn());
        fallback.removeEventListener('expand_dashboard', jest.fn());
      }).not.toThrow();
    });
  });
});

describe('createDashboardIntegration factory', () => {
  let containerElement: HTMLElement;

  beforeEach(() => {
    containerElement = document.createElement('div');
    document.body.appendChild(containerElement);
  });

  afterEach(() => {
    if (containerElement.parentNode) {
      document.body.removeChild(containerElement);
    }
    jest.clearAllMocks();
  });

  it('should create and initialize integration successfully', async () => {
    const mockAssetManager = new AssetManager() as jest.Mocked<AssetManager>;
    mockAssetManager.initialize.mockResolvedValue();

    const integration = await createDashboardIntegration(containerElement);

    expect(integration).toBeInstanceOf(DashboardIntegration);
    expect(integration.isReady()).toBe(true);
  });

  it('should return fallback integration on initialization failure', async () => {
    // Create a new AssetManager mock that fails
    const failingAssetManager = new AssetManager() as jest.Mocked<AssetManager>;
    failingAssetManager.initialize.mockRejectedValue(new Error('Initialization failed'));
    
    // Mock AssetManager constructor to return failing instance
    (AssetManager as jest.MockedClass<typeof AssetManager>).mockImplementation(() => failingAssetManager);

    const integration = await createDashboardIntegration(containerElement);

    expect(integration).toBeInstanceOf(DashboardIntegration);
    expect(integration.isReady()).toBe(false);
  });

  it('should handle container element issues gracefully', async () => {
    // Pass null as container to simulate error
    const integration = await createDashboardIntegration(null as any);

    expect(integration).toBeInstanceOf(DashboardIntegration);
    expect(integration.isReady()).toBe(false);
  });
});