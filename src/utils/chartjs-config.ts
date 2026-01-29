/**
 * Chart.js Configuration and Utility Functions for Blackbox
 * 
 * This module provides Chart.js setup, configuration, and utility functions
 * for consistent chart rendering across the Blackbox application.
 */

import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  TooltipItem,
  ChartOptions
} from 'chart.js';

import { 
  ChartColorScheme, 
  BlackboxChartConfiguration, 
  ChartAnimationConfig,
  BrandingConfig 
} from '../types/phase2';

/**
 * Register Chart.js components for use throughout the application
 * This must be called before creating any charts
 */
export function registerChartComponents(): void {
  Chart.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
  );
}

/**
 * Default color scheme for Blackbox charts
 */
export const DEFAULT_CHART_COLORS: ChartColorScheme = {
  primary: [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#06B6D4', // Cyan
  ],
  success: [
    '#10B981', // Green-500
    '#059669', // Green-600
    '#047857', // Green-700
  ],
  warning: [
    '#F59E0B', // Yellow-500
    '#D97706', // Yellow-600
    '#B45309', // Yellow-700
  ],
  error: [
    '#EF4444', // Red-500
    '#DC2626', // Red-600
    '#B91C1C', // Red-700
  ],
  neutral: [
    '#6B7280', // Gray-500
    '#9CA3AF', // Gray-400
    '#D1D5DB', // Gray-300
  ],
};

/**
 * Default animation configuration for smooth chart transitions
 */
export const DEFAULT_ANIMATION_CONFIG: ChartAnimationConfig = {
  duration: 750,
  easing: 'easeInOutQuad',
  animateRotate: true,
  animateScale: true,
};

/**
 * Get color based on health status
 */
export function getHealthStatusColor(status: 'PASS' | 'WARN' | 'FAIL'): string {
  switch (status) {
    case 'PASS':
      return DEFAULT_CHART_COLORS.success[0];
    case 'WARN':
      return DEFAULT_CHART_COLORS.warning[0];
    case 'FAIL':
      return DEFAULT_CHART_COLORS.error[0];
    default:
      return DEFAULT_CHART_COLORS.neutral[0];
  }
}

/**
 * Get color array for threshold comparison charts
 */
export function getThresholdComparisonColors(actualValues: number[], thresholds: number[]): string[] {
  return actualValues.map((value, index) => {
    const threshold = thresholds[index];
    if (value <= threshold) {
      return DEFAULT_CHART_COLORS.success[0];
    } else if (value <= threshold * 1.5) {
      return DEFAULT_CHART_COLORS.warning[0];
    } else {
      return DEFAULT_CHART_COLORS.error[0];
    }
  });
}

/**
 * Create default chart options with Blackbox branding
 */
export function createDefaultChartOptions(title: string): ChartOptions {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: DEFAULT_ANIMATION_CONFIG.duration,
      easing: DEFAULT_ANIMATION_CONFIG.easing,
    },
    plugins: {
      title: {
        display: true,
        text: title,
        font: {
          size: 16,
          weight: 'bold',
        },
        padding: {
          top: 10,
          bottom: 20,
        },
      },
      legend: {
        display: true,
        position: 'top',
        labels: {
          padding: 20,
          usePointStyle: true,
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#3B82F6',
        borderWidth: 1,
        cornerRadius: 6,
        displayColors: true,
        callbacks: {
          label: (context: TooltipItem<any>) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y || context.parsed;
            return `${label}: ${formatMetricValue(value)}`;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        ticks: {
          maxRotation: 45,
        },
      },
      y: {
        display: true,
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
  };
}

/**
 * Format metric values for display in charts and tooltips
 */
export function formatMetricValue(value: number, unit?: string): string {
  if (unit === 'bytes') {
    return formatBytes(value);
  } else if (unit === 'ms') {
    return `${value.toFixed(1)}ms`;
  } else if (unit === 'count') {
    return value.toString();
  } else {
    return value.toFixed(2);
  }
}

/**
 * Format bytes to human-readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  const value = bytes / Math.pow(k, i);
  
  // Format with 1 decimal place for values >= 1KB, no decimal for bytes
  if (i === 0) {
    return `${Math.round(value)} ${sizes[i]}`;
  } else {
    return `${value.toFixed(1)} ${sizes[i]}`;
  }
}

/**
 * Create a responsive chart container element
 */
export function createChartContainer(id: string, height: number = 300): HTMLElement {
  const container = document.createElement('div');
  container.id = id;
  container.style.position = 'relative';
  container.style.height = `${height}px`;
  container.style.width = '100%';
  container.style.marginBottom = '20px';
  
  const canvas = document.createElement('canvas');
  canvas.id = `${id}-canvas`;
  container.appendChild(canvas);
  
  return container;
}

/**
 * Apply branding colors to chart configuration
 */
export function applyBrandingToChart(
  config: BlackboxChartConfiguration, 
  branding: BrandingConfig
): BlackboxChartConfiguration {
  // Apply branded colors to datasets
  config.data.datasets.forEach((dataset: any, index: number) => {
    if (!dataset.backgroundColor) {
      dataset.backgroundColor = branding.chartColors.primary[index % branding.chartColors.primary.length];
    }
    if (!dataset.borderColor) {
      dataset.borderColor = branding.chartColors.primary[index % branding.chartColors.primary.length];
    }
  });

  // Apply branded font family
  if (config.options.plugins?.title) {
    config.options.plugins.title.font = {
      size: config.options.plugins.title.font?.size || 16,
    };
  }

  return config;
}

/**
 * Validate Chart.js configuration before rendering
 */
export function validateChartConfiguration(config: BlackboxChartConfiguration): boolean {
  try {
    // Check required properties
    if (!config.type || !config.data || !config.data.labels || !config.data.datasets) {
      console.error('Chart configuration missing required properties');
      return false;
    }

    // Check data consistency
    const labelCount = config.data.labels.length;
    for (const dataset of config.data.datasets) {
      if (dataset.data.length !== labelCount) {
        console.error('Dataset data length does not match labels length');
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error validating chart configuration:', error);
    return false;
  }
}

/**
 * Create error fallback element when chart rendering fails
 */
export function createChartErrorFallback(error: string): HTMLElement {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'chart-error-fallback';
  errorDiv.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
    background-color: #f9fafb;
    border: 2px dashed #d1d5db;
    border-radius: 8px;
    color: #6b7280;
    font-family: system-ui, -apple-system, sans-serif;
    text-align: center;
    padding: 20px;
  `;
  
  // Check if we're in a browser extension environment
  const isExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
  const title = isExtension ? 'Charts Not Available' : 'Chart Unavailable';
  const message = isExtension 
    ? 'Charts are disabled in browser extensions due to security restrictions. The metrics table above provides all performance data.'
    : error;
  
  errorDiv.innerHTML = `
    <div>
      <div style="font-size: 18px; margin-bottom: 8px;">📊</div>
      <div style="font-weight: 500; margin-bottom: 4px;">${title}</div>
      <div style="font-size: 14px; line-height: 1.4; max-width: 300px;">${message}</div>
    </div>
  `;
  
  return errorDiv;
}

/**
 * Cleanup chart instance and remove event listeners
 */
export function cleanupChart(chart: Chart): void {
  try {
    chart.destroy();
  } catch (error) {
    console.warn('Error destroying chart:', error);
  }
}