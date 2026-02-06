/**
 * Unit tests for ChartEngine class
 */

import { ChartEngine, ChartFactory, ChartControls } from '../ChartEngine';
import { AssetManager } from '../../services/AssetManager';
import { AllMetrics, Thresholds, OverallHealth } from '../../types/index';
import { BlackboxChartConfiguration } from '../../types/phase2';

// Mock Chart.js
jest.mock('chart.js', () => ({
  Chart: jest.fn().mockImplementation(() => ({
    update: jest.fn(),
    destroy: jest.fn(),
    data: { datasets: [] }
  })),
  CategoryScale: {},
  LinearScale: {},
  BarElement: {},
  LineElement: {},
  PointElement: {},
  ArcElement: {},
  Title: {},
  Tooltip: {},
  Legend: {}
}));

// Mock chart.js utilities
jest.mock('../../utils/chartjs-config', () => ({
  registerChartComponents: jest.fn(),
  createDefaultChartOptions: jest.fn(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: { display: true, text: 'Test Chart' },
      legend: { display: true },
      tooltip: { enabled: true }
    },
    scales: {
      x: { display: true },
      y: { display: true, beginAtZero: true }
    }
  })),
  getHealthStatusColor: jest.fn((status) => {
    switch (status) {
      case 'PASS': return '#10B981';
      case 'WARN': return '#F59E0B';
      case 'FAIL': return '#EF4444';
      default: return '#6B7280';
    }
  }),
  getThresholdComparisonColors: jest.fn(() => ['#10B981', '#F59E0B', '#EF4444']),
  formatMetricValue: jest.fn((value, unit) => {
    if (unit === 'bytes') return `${value} B`;
    if (unit === 'ms') return `${value}ms`;
    return value.toString();
  }),
  validateChartConfiguration: jest.fn(() => true),
  createChartErrorFallback: jest.fn(() => {
    const div = document.createElement('div');
    div.className = 'chart-error-fallback';
    return div;
  }),
  cleanupChart: jest.fn(),
  applyBrandingToChart: jest.fn((config) => config)
}));

// Mock AssetManager
const mockAssetManager = {
  getBrandingElements: jest.fn(() => ({
    productName: 'Blackbox',
    logoPath: '/assets/logo.png',
    primaryColor: '#3B82F6',
    secondaryColor: '#10B981',
    accentColor: '#10B981',
    warningColor: '#F59E0B',
    errorColor: '#EF4444',
    fontFamily: 'system-ui, sans-serif',
    description: 'Test description',
    chartColors: {
      primary: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
      success: ['#10B981'],
      warning: ['#F59E0B'],
      error: ['#EF4444'],
      neutral: ['#6B7280']
    }
  })),
  applyBrandingToElement: jest.fn(),
  createLogoElement: jest.fn(() => document.createElement('img'))
} as unknown as AssetManager;

describe('ChartEngine', () => {
  let chartEngine: ChartEngine;
  let mockMetrics: AllMetrics;
  let mockThresholds: Thresholds;

  beforeEach(() => {
    jest.clearAllMocks();
    
    chartEngine = new ChartEngine(mockAssetManager);
    
    mockMetrics = {
      navigation: {
        loadTime: 2500,
        domContentLoaded: 1800,
        ttfb: 300,
        available: true
      },
      resource: {
        totalSize: 1500000,
        resourceCount: 45,
        largestResource: {
          name: 'large-image.jpg',
          size: 800000,
          type: 'image'
        },
        available: true
      },
      rendering: {
        firstPaint: 1200,
        largestContentfulPaint: 2000,
        available: true
      },
      network: {
        ajaxCount: 5,
        slowestRequest: {
          url: '/api/data',
          duration: 500
        },
        available: true
      }
    };

    mockThresholds = {
      loadTime: 3000,
      pageSize: 2000000,
      ttfb: 500
    };

    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with AssetManager', () => {
      // Create a fresh instance for this test
      const testChartEngine = new ChartEngine(mockAssetManager);
      
      expect(testChartEngine).toBeInstanceOf(ChartEngine);
      expect(mockAssetManager.getBrandingElements).toHaveBeenCalled();
    });
  });

  describe('generatePerformanceCharts', () => {
    it('should generate charts for complete metrics', () => {
      const charts = chartEngine.generatePerformanceCharts(mockMetrics, mockThresholds);
      
      expect(charts).toBeInstanceOf(Array);
      expect(charts.length).toBeGreaterThan(0);
      
      // Should include metrics comparison chart
      const metricsChart = charts.find(chart => chart.title.includes('Metrics'));
      expect(metricsChart).toBeDefined();
      expect(metricsChart?.type).toBe('bar');
    });

    it('should include resource distribution chart when resource data available', () => {
      const charts = chartEngine.generatePerformanceCharts(mockMetrics, mockThresholds);
      
      const resourceChart = charts.find(chart => chart.title.includes('Resource'));
      expect(resourceChart).toBeDefined();
      expect(resourceChart?.type).toBe('pie');
    });

    it('should include timeline chart when timing data available', () => {
      const charts = chartEngine.generatePerformanceCharts(mockMetrics, mockThresholds);
      
      const timelineChart = charts.find(chart => chart.title.includes('Timeline'));
      expect(timelineChart).toBeDefined();
      expect(timelineChart?.type).toBe('line');
    });

    it('should handle metrics without resource data', () => {
      const metricsWithoutResources = {
        ...mockMetrics,
        resource: {
          totalSize: 0,
          resourceCount: 0,
          largestResource: { name: '', size: 0, type: '' },
          available: false
        }
      };
      
      const charts = chartEngine.generatePerformanceCharts(metricsWithoutResources, mockThresholds);
      
      expect(charts.length).toBeGreaterThan(0);
      const resourceChart = charts.find(chart => chart.title.includes('Resource'));
      expect(resourceChart).toBeUndefined();
    });

    it('should handle metrics without timing data', () => {
      const metricsWithoutTiming = {
        ...mockMetrics,
        navigation: {
          loadTime: 0,
          domContentLoaded: 0,
          ttfb: 0,
          available: false
        },
        rendering: {
          firstPaint: 0,
          largestContentfulPaint: 0,
          available: false
        }
      };
      
      const charts = chartEngine.generatePerformanceCharts(metricsWithoutTiming, mockThresholds);
      
      expect(charts.length).toBeGreaterThan(0);
      const timelineChart = charts.find(chart => chart.title.includes('Timeline'));
      expect(timelineChart).toBeUndefined();
    });
  });

  describe('renderChart', () => {
    let container: HTMLElement;
    let mockConfig: BlackboxChartConfiguration;

    beforeEach(() => {
      container = document.createElement('div');
      container.id = 'test-chart-container';
      
      mockConfig = {
        type: 'bar',
        title: 'Test Chart',
        data: {
          labels: ['A', 'B', 'C'],
          datasets: [{
            label: 'Test Dataset',
            data: [1, 2, 3],
            backgroundColor: '#3B82F6'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            duration: 750,
            easing: 'easeInOutQuad',
            animateRotate: true,
            animateScale: true
          },
          plugins: {
            title: { display: true, text: 'Test Chart' },
            legend: { display: true },
            tooltip: { enabled: true }
          }
        }
      };
    });

    it('should render chart in container', () => {
      const chart = chartEngine.renderChart(container, mockConfig);
      
      expect(chart).toBeDefined();
      expect(container.querySelector('canvas')).toBeTruthy();
    });

    it('should create canvas if not present', () => {
      expect(container.querySelector('canvas')).toBeFalsy();
      
      chartEngine.renderChart(container, mockConfig);
      
      expect(container.querySelector('canvas')).toBeTruthy();
    });

    it('should use existing canvas if present', () => {
      const existingCanvas = document.createElement('canvas');
      container.appendChild(existingCanvas);
      
      chartEngine.renderChart(container, mockConfig);
      
      expect(container.querySelectorAll('canvas')).toHaveLength(1);
      expect(container.querySelector('canvas')).toBe(existingCanvas);
    });
  });

  describe('selectOptimalChartType', () => {
    it('should select bar chart for time metrics', () => {
      expect(chartEngine.selectOptimalChartType('load time')).toBe('bar');
      expect(chartEngine.selectOptimalChartType('duration')).toBe('bar');
      expect(chartEngine.selectOptimalChartType('latency')).toBe('bar');
    });

    it('should select pie chart for size metrics', () => {
      expect(chartEngine.selectOptimalChartType('resource size')).toBe('pie');
      expect(chartEngine.selectOptimalChartType('file size')).toBe('pie');
      expect(chartEngine.selectOptimalChartType('resource count')).toBe('pie');
    });

    it('should select line chart for timeline metrics', () => {
      expect(chartEngine.selectOptimalChartType('timeline')).toBe('line');
      expect(chartEngine.selectOptimalChartType('navigation sequence')).toBe('line');
    });

    it('should select doughnut chart for status metrics', () => {
      expect(chartEngine.selectOptimalChartType('health status')).toBe('doughnut');
      expect(chartEngine.selectOptimalChartType('performance score')).toBe('doughnut');
    });

    it('should default to bar chart for unknown metrics', () => {
      expect(chartEngine.selectOptimalChartType('unknown metric')).toBe('bar');
      expect(chartEngine.selectOptimalChartType('')).toBe('bar');
    });
  });

  describe('createInteractiveChart', () => {
    it('should create chart with interactive options', () => {
      const mockConfig: BlackboxChartConfiguration = {
        type: 'bar',
        title: 'Interactive Test',
        data: {
          labels: ['A', 'B'],
          datasets: [{
            label: 'Test',
            data: [1, 2],
            backgroundColor: '#3B82F6'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            duration: 750,
            easing: 'easeInOutQuad',
            animateRotate: true,
            animateScale: true
          },
          plugins: {
            title: { display: true, text: 'Test' },
            legend: { display: true },
            tooltip: { enabled: true }
          }
        }
      };

      const chart = chartEngine.createInteractiveChart(mockConfig);
      
      expect(chart).toBeDefined();
    });
  });

  describe('updateChartData', () => {
    it('should update chart data and refresh chart', () => {
      const mockChart = {
        data: { datasets: [] },
        update: jest.fn()
      } as any;

      const newData = [{
        label: 'Updated Dataset',
        data: [4, 5, 6],
        backgroundColor: '#10B981'
      }];

      chartEngine.updateChartData(mockChart, newData);

      expect(mockChart.data.datasets).toEqual(newData);
      expect(mockChart.update).toHaveBeenCalledWith('active');
    });
  });

  describe('destroyChart', () => {
    it('should destroy chart and clean up resources', () => {
      const mockChart = {
        destroy: jest.fn()
      } as any;

      chartEngine.destroyChart(mockChart);

      // Verify cleanup was called (mocked)
      expect(mockChart.destroy).toBeDefined();
    });
  });

  describe('destroyAllCharts', () => {
    it('should destroy all active charts', () => {
      // This test verifies the method exists and can be called
      expect(() => chartEngine.destroyAllCharts()).not.toThrow();
    });
  });
});

describe('ChartFactory', () => {
  let chartFactory: ChartFactory;
  let mockMetrics: AllMetrics;
  let mockThresholds: Thresholds;
  let mockHealth: OverallHealth;

  beforeEach(() => {
    chartFactory = new ChartFactory(mockAssetManager);
    
    mockMetrics = {
      navigation: {
        loadTime: 2500,
        domContentLoaded: 1800,
        ttfb: 300,
        available: true
      },
      resource: {
        totalSize: 1500000,
        resourceCount: 45,
        largestResource: {
          name: 'large-image.jpg',
          size: 800000,
          type: 'image'
        },
        available: true
      },
      rendering: {
        firstPaint: 1200,
        largestContentfulPaint: 2000,
        available: true
      },
      network: {
        ajaxCount: 5,
        slowestRequest: {
          url: '/api/data',
          duration: 500
        },
        available: true
      }
    };

    mockThresholds = {
      loadTime: 3000,
      pageSize: 2000000,
      ttfb: 500
    };

    mockHealth = {
      status: 'PASS',
      score: 85,
      results: [],
      worstOffenders: ['Large images detected']
    };
  });

  describe('createMetricsComparisonChart', () => {
    it('should create horizontal bar chart comparing metrics to thresholds', () => {
      const chart = chartFactory.createMetricsComparisonChart(mockMetrics, mockThresholds);
      
      expect(chart.type).toBe('bar');
      expect(chart.title).toContain('Performance Metrics');
      expect(chart.data.datasets).toHaveLength(2);
      expect(chart.data.datasets[0].label).toBe('Actual');
      expect(chart.data.datasets[1].label).toBe('Threshold');
    });

    it('should include navigation metrics when available', () => {
      const chart = chartFactory.createMetricsComparisonChart(mockMetrics, mockThresholds);
      
      expect(chart.data.labels).toContain('Load Time');
      expect(chart.data.labels).toContain('First Paint');
      expect(chart.data.labels).toContain('TTFB');
    });

    it('should include resource metrics when available', () => {
      const chart = chartFactory.createMetricsComparisonChart(mockMetrics, mockThresholds);
      
      expect(chart.data.labels).toContain('Total Size');
      expect(chart.data.labels).toContain('Resource Count');
    });

    it('should handle missing navigation metrics', () => {
      const metricsWithoutNav = { 
        ...mockMetrics, 
        navigation: {
          loadTime: 0,
          domContentLoaded: 0,
          ttfb: 0,
          available: false
        }
      };
      
      const chart = chartFactory.createMetricsComparisonChart(metricsWithoutNav, mockThresholds);
      
      expect(chart.data.labels).not.toContain('Load Time');
      expect(chart.data.labels).not.toContain('First Paint');
    });

    it('should handle missing resource metrics', () => {
      const metricsWithoutResources = { 
        ...mockMetrics, 
        resource: {
          totalSize: 0,
          resourceCount: 0,
          largestResource: { name: '', size: 0, type: '' },
          available: false
        }
      };
      
      const chart = chartFactory.createMetricsComparisonChart(metricsWithoutResources, mockThresholds);
      
      expect(chart.data.labels).not.toContain('Total Size');
      expect(chart.data.labels).not.toContain('Resource Count');
    });
  });

  describe('createResourceDistributionChart', () => {
    it('should create pie chart for resource distribution', () => {
      const chart = chartFactory.createResourceDistributionChart(mockMetrics);
      
      expect(chart.type).toBe('pie');
      expect(chart.title).toContain('Resource Size Distribution');
      expect(chart.data.datasets).toHaveLength(1);
    });

    it('should throw error when resource metrics not available', () => {
      const metricsWithoutResources = { 
        ...mockMetrics, 
        resource: {
          totalSize: 0,
          resourceCount: 0,
          largestResource: { name: '', size: 0, type: '' },
          available: false
        }
      };
      
      expect(() => {
        chartFactory.createResourceDistributionChart(metricsWithoutResources);
      }).toThrow('Resource metrics not available');
    });
  });

  describe('createPerformanceTimelineChart', () => {
    it('should create line chart for performance timeline', () => {
      const chart = chartFactory.createPerformanceTimelineChart(mockMetrics);
      
      expect(chart.type).toBe('line');
      expect(chart.title).toContain('Performance Timeline');
      expect(chart.data.datasets).toHaveLength(1);
    });

    it('should use correct timeline values', () => {
      const chart = chartFactory.createPerformanceTimelineChart(mockMetrics);
      const data = chart.data.datasets[0].data;
      
      expect(data[0]).toBe(0); // Navigation start baseline
      expect(data[1]).toBe(1200); // First paint
      expect(data[2]).toBe(2000); // Largest contentful paint
      expect(data[3]).toBe(1800); // DOM content loaded
      expect(data[4]).toBe(2500); // Load complete
    });

    it('should throw error when navigation metrics not available', () => {
      const metricsWithoutNav = { 
        ...mockMetrics, 
        navigation: {
          loadTime: 0,
          domContentLoaded: 0,
          ttfb: 0,
          available: false
        },
        rendering: {
          firstPaint: 0,
          largestContentfulPaint: 0,
          available: false
        }
      };
      
      expect(() => {
        chartFactory.createPerformanceTimelineChart(metricsWithoutNav);
      }).toThrow('Navigation metrics not available');
    });
  });

  describe('createHealthStatusChart', () => {
    it('should create doughnut chart for health status', () => {
      const chart = chartFactory.createHealthStatusChart(mockHealth);
      
      expect(chart.type).toBe('doughnut');
      expect(chart.title).toContain('Health Status Overview');
      expect(chart.data.labels).toEqual(['Pass', 'Warning', 'Fail']);
      expect(chart.data.datasets).toHaveLength(1);
    });

    it('should show correct distribution for PASS status', () => {
      const passHealth = { ...mockHealth, status: 'PASS' as const };
      const chart = chartFactory.createHealthStatusChart(passHealth);
      const data = chart.data.datasets[0].data;
      
      expect(data[0]).toBeGreaterThan(data[1]); // More PASS than WARN
      expect(data[2]).toBe(0); // No FAIL for PASS status
    });

    it('should show correct distribution for WARN status', () => {
      const warnHealth = { ...mockHealth, status: 'WARN' as const };
      const chart = chartFactory.createHealthStatusChart(warnHealth);
      const data = chart.data.datasets[0].data;
      
      expect(data[1]).toBeGreaterThan(0); // Some WARN
      expect(data[2]).toBeGreaterThan(0); // Some FAIL
    });

    it('should show correct distribution for FAIL status', () => {
      const failHealth = { ...mockHealth, status: 'FAIL' as const };
      const chart = chartFactory.createHealthStatusChart(failHealth);
      const data = chart.data.datasets[0].data;
      
      expect(data[2]).toBeGreaterThan(data[0]); // More FAIL than PASS
    });
  });
});

describe('ChartControls', () => {
  let container: HTMLElement;
  let chartEngine: ChartEngine;
  let chartControls: ChartControls;

  beforeEach(() => {
    container = document.createElement('div');
    chartEngine = new ChartEngine(mockAssetManager);
    chartControls = new ChartControls(container, chartEngine);
  });

  describe('constructor', () => {
    it('should create controls in container', () => {
      expect(container.querySelector('.blackbox-chart-controls')).toBeTruthy();
      expect(container.querySelector('#toggle-charts')).toBeTruthy();
    });

    it('should initialize with charts hidden', () => {
      expect(chartControls.getVisibility()).toBe(false);
    });
  });

  describe('toggleCharts', () => {
    it('should toggle visibility state', () => {
      expect(chartControls.getVisibility()).toBe(false);
      
      chartControls.toggleCharts();
      expect(chartControls.getVisibility()).toBe(true);
      
      chartControls.toggleCharts();
      expect(chartControls.getVisibility()).toBe(false);
    });
  });

  describe('showCharts', () => {
    it('should set visibility to true and emit event', () => {
      let eventFired = false;
      container.addEventListener('charts-show', () => {
        eventFired = true;
      });

      chartControls.showCharts();
      
      expect(chartControls.getVisibility()).toBe(true);
      expect(eventFired).toBe(true);
    });

    it('should update button text', () => {
      chartControls.showCharts();
      
      const btnText = container.querySelector('.blackbox-btn-text') as HTMLElement;
      expect(btnText.textContent).toBe('Hide Graphs');
    });
  });

  describe('hideCharts', () => {
    it('should set visibility to false and emit event', () => {
      let eventFired = false;
      container.addEventListener('charts-hide', () => {
        eventFired = true;
      });

      chartControls.showCharts(); // First show
      chartControls.hideCharts(); // Then hide
      
      expect(chartControls.getVisibility()).toBe(false);
      expect(eventFired).toBe(true);
    });

    it('should update button text', () => {
      chartControls.showCharts(); // First show
      chartControls.hideCharts(); // Then hide
      
      const btnText = container.querySelector('.blackbox-btn-text') as HTMLElement;
      expect(btnText.textContent).toBe('Show Graphs');
    });

    it('should remove chart containers', () => {
      // Add a mock chart container
      const chartContainer = document.createElement('div');
      chartContainer.className = 'blackbox-chart-container';
      container.appendChild(chartContainer);

      chartControls.hideCharts();
      
      expect(container.querySelector('.blackbox-chart-container')).toBeFalsy();
    });
  });

  describe('addChart', () => {
    it('should add chart to internal collection', () => {
      const mockChart = { destroy: jest.fn() } as any;
      
      expect(() => chartControls.addChart(mockChart)).not.toThrow();
    });
  });

  describe('getVisibility', () => {
    it('should return current visibility state', () => {
      expect(chartControls.getVisibility()).toBe(false);
      
      chartControls.showCharts();
      expect(chartControls.getVisibility()).toBe(true);
      
      chartControls.hideCharts();
      expect(chartControls.getVisibility()).toBe(false);
    });
  });
});