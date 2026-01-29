/**
 * Unit tests for Chart.js configuration and utility functions
 */

import {
  registerChartComponents,
  DEFAULT_CHART_COLORS,
  DEFAULT_ANIMATION_CONFIG,
  getHealthStatusColor,
  getThresholdComparisonColors,
  createDefaultChartOptions,
  formatMetricValue,
  formatBytes,
  createChartContainer,
  validateChartConfiguration,
  createChartErrorFallback
} from '../chartjs-config';

import { BlackboxChartConfiguration } from '../../types/phase2';

// Mock Chart.js to avoid actual registration in tests
jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn()
  },
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

describe('Chart.js Configuration', () => {
  describe('registerChartComponents', () => {
    it('should register Chart.js components without errors', () => {
      expect(() => registerChartComponents()).not.toThrow();
    });
  });

  describe('DEFAULT_CHART_COLORS', () => {
    it('should have all required color categories', () => {
      expect(DEFAULT_CHART_COLORS).toHaveProperty('primary');
      expect(DEFAULT_CHART_COLORS).toHaveProperty('success');
      expect(DEFAULT_CHART_COLORS).toHaveProperty('warning');
      expect(DEFAULT_CHART_COLORS).toHaveProperty('error');
      expect(DEFAULT_CHART_COLORS).toHaveProperty('neutral');
    });

    it('should have valid hex colors', () => {
      const hexColorRegex = /^#[0-9A-F]{6}$/i;
      
      DEFAULT_CHART_COLORS.primary.forEach(color => {
        expect(color).toMatch(hexColorRegex);
      });
      
      DEFAULT_CHART_COLORS.success.forEach(color => {
        expect(color).toMatch(hexColorRegex);
      });
    });
  });

  describe('DEFAULT_ANIMATION_CONFIG', () => {
    it('should have valid animation configuration', () => {
      expect(DEFAULT_ANIMATION_CONFIG.duration).toBeGreaterThan(0);
      expect(DEFAULT_ANIMATION_CONFIG.easing).toBe('easeInOutQuad');
      expect(typeof DEFAULT_ANIMATION_CONFIG.animateRotate).toBe('boolean');
      expect(typeof DEFAULT_ANIMATION_CONFIG.animateScale).toBe('boolean');
    });
  });

  describe('getHealthStatusColor', () => {
    it('should return correct colors for health statuses', () => {
      expect(getHealthStatusColor('PASS')).toBe(DEFAULT_CHART_COLORS.success[0]);
      expect(getHealthStatusColor('WARN')).toBe(DEFAULT_CHART_COLORS.warning[0]);
      expect(getHealthStatusColor('FAIL')).toBe(DEFAULT_CHART_COLORS.error[0]);
    });

    it('should return neutral color for unknown status', () => {
      expect(getHealthStatusColor('UNKNOWN' as any)).toBe(DEFAULT_CHART_COLORS.neutral[0]);
    });
  });

  describe('getThresholdComparisonColors', () => {
    it('should return green for values within threshold', () => {
      const actualValues = [100, 200];
      const thresholds = [150, 250];
      const colors = getThresholdComparisonColors(actualValues, thresholds);
      
      expect(colors[0]).toBe(DEFAULT_CHART_COLORS.success[0]);
      expect(colors[1]).toBe(DEFAULT_CHART_COLORS.success[0]);
    });

    it('should return yellow for values 1-1.5x threshold', () => {
      const actualValues = [180]; // 1.2x threshold of 150
      const thresholds = [150];
      const colors = getThresholdComparisonColors(actualValues, thresholds);
      
      expect(colors[0]).toBe(DEFAULT_CHART_COLORS.warning[0]);
    });

    it('should return red for values >1.5x threshold', () => {
      const actualValues = [300]; // 2x threshold of 150
      const thresholds = [150];
      const colors = getThresholdComparisonColors(actualValues, thresholds);
      
      expect(colors[0]).toBe(DEFAULT_CHART_COLORS.error[0]);
    });
  });

  describe('createDefaultChartOptions', () => {
    it('should create valid chart options with title', () => {
      const title = 'Test Chart';
      const options = createDefaultChartOptions(title);
      
      expect(options.responsive).toBe(true);
      expect(options.maintainAspectRatio).toBe(false);
      expect(options.plugins?.title?.display).toBe(true);
      expect(options.plugins?.title?.text).toBe(title);
      expect(options.plugins?.legend?.display).toBe(true);
      expect(options.plugins?.tooltip?.enabled).toBe(true);
    });

    it('should have proper animation configuration', () => {
      const options = createDefaultChartOptions('Test');
      
      expect(options.animation).toBeDefined();
      expect(typeof options.animation).toBe('object');
    });

    it('should have proper scales configuration', () => {
      const options = createDefaultChartOptions('Test');
      
      expect(options.scales?.x?.display).toBe(true);
      expect(options.scales?.y?.display).toBe(true);
    });
  });

  describe('formatMetricValue', () => {
    it('should format bytes correctly', () => {
      expect(formatMetricValue(1024, 'bytes')).toBe('1.0 KB');
      expect(formatMetricValue(1048576, 'bytes')).toBe('1.0 MB');
      expect(formatMetricValue(0, 'bytes')).toBe('0 B');
      expect(formatMetricValue(512, 'bytes')).toBe('512 B');
    });

    it('should format milliseconds correctly', () => {
      expect(formatMetricValue(123.456, 'ms')).toBe('123.5ms');
      expect(formatMetricValue(1000, 'ms')).toBe('1000.0ms');
    });

    it('should format counts correctly', () => {
      expect(formatMetricValue(42, 'count')).toBe('42');
      expect(formatMetricValue(0, 'count')).toBe('0');
    });

    it('should format generic numbers correctly', () => {
      expect(formatMetricValue(123.456)).toBe('123.46');
      expect(formatMetricValue(1)).toBe('1.00');
    });
  });

  describe('formatBytes', () => {
    it('should format bytes to human-readable format', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(512)).toBe('512 B');
      expect(formatBytes(1024)).toBe('1.0 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(1048576)).toBe('1.0 MB');
      expect(formatBytes(1073741824)).toBe('1.0 GB');
    });
  });

  describe('createChartContainer', () => {
    it('should create a chart container with correct structure', () => {
      const container = createChartContainer('test-chart', 400);
      
      expect(container.id).toBe('test-chart');
      expect(container.style.position).toBe('relative');
      expect(container.style.height).toBe('400px');
      expect(container.style.width).toBe('100%');
      
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeTruthy();
      expect(canvas?.id).toBe('test-chart-canvas');
    });

    it('should use default height when not specified', () => {
      const container = createChartContainer('test-chart');
      expect(container.style.height).toBe('300px');
    });
  });

  describe('validateChartConfiguration', () => {
    const validConfig: BlackboxChartConfiguration = {
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
        animation: DEFAULT_ANIMATION_CONFIG,
        plugins: {
          title: { display: true, text: 'Test' },
          legend: { display: true },
          tooltip: { enabled: true }
        }
      }
    };

    it('should validate correct chart configuration', () => {
      expect(validateChartConfiguration(validConfig)).toBe(true);
    });

    it('should reject configuration without required properties', () => {
      const invalidConfig = { ...validConfig };
      delete (invalidConfig as any).type;
      
      expect(validateChartConfiguration(invalidConfig)).toBe(false);
    });

    it('should reject configuration with mismatched data lengths', () => {
      const invalidConfig: BlackboxChartConfiguration = {
        ...validConfig,
        data: {
          labels: ['A', 'B'],
          datasets: [{
            label: 'Test',
            data: [1, 2, 3], // Length mismatch with labels
            backgroundColor: '#3B82F6'
          }]
        }
      };
      
      expect(validateChartConfiguration(invalidConfig)).toBe(false);
    });

    it('should handle validation errors gracefully', () => {
      const invalidConfig = null as any;
      expect(validateChartConfiguration(invalidConfig)).toBe(false);
    });
  });

  describe('createChartErrorFallback', () => {
    it('should create error fallback element', () => {
      const errorMessage = 'Chart rendering failed';
      const fallback = createChartErrorFallback(errorMessage);
      
      expect(fallback.className).toBe('chart-error-fallback');
      expect(fallback.textContent).toContain('Chart Unavailable');
      expect(fallback.textContent).toContain(errorMessage);
      expect(fallback.style.display).toBe('flex');
      expect(fallback.style.height).toBe('200px');
    });
  });
});