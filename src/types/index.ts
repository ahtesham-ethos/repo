// Core Metrics Types

/**
 * Navigation timing metrics collected from Performance API
 */
export interface NavigationMetrics {
  /** Total page load time in milliseconds */
  loadTime: number;
  /** Time to First Byte in milliseconds */
  ttfb: number;
  /** DOM content loaded time in milliseconds */
  domContentLoaded: number;
  /** Whether navigation timing data was successfully collected */
  available: boolean;
}

/**
 * Resource timing metrics for page size and resource analysis
 */
export interface ResourceMetrics {
  /** Total page size in bytes */
  totalSize: number;
  /** Number of resources loaded */
  resourceCount: number;
  /** Details of the largest resource */
  largestResource: {
    name: string;
    size: number;
    type: string;
  };
  /** Whether resource timing data was successfully collected */
  available: boolean;
}

/**
 * Rendering performance metrics from Paint Timing API
 */
export interface RenderingMetrics {
  /** First Paint time in milliseconds */
  firstPaint: number;
  /** Largest Contentful Paint time in milliseconds */
  largestContentfulPaint: number;
  /** Whether rendering timing data was successfully collected */
  available: boolean;
}

/**
 * Network activity metrics for AJAX/fetch monitoring
 */
export interface NetworkMetrics {
  /** Number of AJAX/fetch/XHR requests */
  ajaxCount: number;
  /** Details of the slowest network request */
  slowestRequest: {
    url: string;
    duration: number;
  };
  /** Whether network monitoring data was successfully collected */
  available: boolean;
}

// Health Assessment Types

/**
 * Health status enumeration
 */
export type HealthStatus = 'PASS' | 'WARN' | 'FAIL';

/**
 * Individual metric evaluation result
 */
export interface HealthResult {
  /** Name of the metric being evaluated */
  metric: string;
  /** Actual measured value */
  value: number;
  /** Threshold value for comparison */
  threshold: number;
  /** Health status based on threshold comparison */
  status: HealthStatus;
  /** Human-readable message describing the result */
  message: string;
}

/**
 * Overall page health assessment
 */
export interface OverallHealth {
  /** Overall health status */
  status: HealthStatus;
  /** Composite health score from 0-100 */
  score: number;
  /** Individual metric evaluation results */
  results: HealthResult[];
  /** List of worst performing areas */
  worstOffenders: string[];
}

// Configuration Types

/**
 * Configurable thresholds for NFR evaluation
 */
export interface Thresholds {
  /** Page size threshold in bytes */
  pageSize: number;
  /** Load time threshold in milliseconds */
  loadTime: number;
  /** Time to First Byte threshold in milliseconds */
  ttfb: number;
}

/**
 * Combined metrics from all collectors
 */
export interface AllMetrics {
  navigation: NavigationMetrics;
  resource: ResourceMetrics;
  rendering: RenderingMetrics;
  network: NetworkMetrics;
}