/**
 * ThresholdDisplay - Enhanced metrics table component with threshold visualization
 * 
 * This component provides a comprehensive metrics display with threshold comparison,
 * color-coding logic for metric values, and human-readable formatting. It supports
 * the enhanced metrics display requirements for Blackbox Phase 2.
 */

import { 
  ThresholdDisplay as IThresholdDisplay, 
  Phase2Error 
} from '../types/phase2';
import { AllMetrics, Thresholds, HealthStatus } from '../types/index';
import { AssetManager } from '../services/AssetManager';

/**
 * Individual metric display configuration
 */
export interface MetricDisplayConfig {
  /** Metric name for display */
  name: string;
  /** Actual measured value */
  actualValue: number;
  /** Threshold value for comparison */
  thresholdValue: number;
  /** Formatting function for values */
  formatter: (value: number) => string;
  /** Optional unit for display */
  unit?: string;
  /** Optional description */
  description?: string;
}

/**
 * ThresholdDisplay component for enhanced metrics visualization
 */
export class ThresholdDisplay {
  private assetManager: AssetManager;
  private containerElement: HTMLElement | null = null;
  private currentDisplays: IThresholdDisplay[] = [];

  constructor(assetManager: AssetManager) {
    this.assetManager = assetManager;
  }

  /**
   * Render the threshold display table in the specified container
   */
  public render(container: HTMLElement, metrics: AllMetrics, thresholds: Thresholds): void {
    try {
      this.containerElement = container;
      
      // Validate inputs
      if (!container) {
        throw new Error('Container element is required');
      }
      
      if (!metrics) {
        throw new Error('Metrics data is required');
      }
      
      if (!thresholds) {
        throw new Error('Thresholds data is required');
      }
      
      // Check if AssetManager is available before proceeding
      if (!this.assetManager) {
        console.warn('AssetManager not available, using fallback colors');
      }
      
      this.currentDisplays = this.generateThresholdDisplays(metrics, thresholds);
      
      // Check if we have any displays to render
      if (this.currentDisplays.length === 0) {
        this.renderEmptyState();
        return;
      }
      
      this.renderTable();
      this.applyStyles();
      
    } catch (error) {
      console.error('ThresholdDisplay render error:', error);
      this.handleError('Failed to render threshold display', error);
    }
  }

  /**
   * Update the display with new metrics and thresholds
   */
  public update(metrics: AllMetrics, thresholds: Thresholds): void {
    if (!this.containerElement) {
      throw new Error('ThresholdDisplay must be rendered before updating');
    }
    
    this.render(this.containerElement, metrics, thresholds);
  }

  /**
   * Get the current threshold displays
   */
  public getCurrentDisplays(): IThresholdDisplay[] {
    return [...this.currentDisplays];
  }

  /**
   * Clear the display
   */
  public clear(): void {
    if (this.containerElement) {
      this.containerElement.innerHTML = '';
      this.currentDisplays = [];
    }
  }

  /**
   * Generate threshold displays from metrics and thresholds
   */
  private generateThresholdDisplays(metrics: AllMetrics, thresholds: Thresholds): IThresholdDisplay[] {
    const displays: IThresholdDisplay[] = [];

    try {
      // Navigation metrics
      if (metrics?.navigation?.available) {
        if (typeof metrics.navigation.loadTime === 'number' && metrics.navigation.loadTime >= 0) {
          displays.push(this.createThresholdDisplay({
            name: 'Load Time',
            actualValue: metrics.navigation.loadTime,
            thresholdValue: thresholds.loadTime || 2000,
            formatter: this.formatTime,
            unit: 'ms',
            description: 'Total time to load the page'
          }));
        }

        if (typeof metrics.navigation.ttfb === 'number' && metrics.navigation.ttfb >= 0) {
          displays.push(this.createThresholdDisplay({
            name: 'Time to First Byte',
            actualValue: metrics.navigation.ttfb,
            thresholdValue: thresholds.ttfb || 500,
            formatter: this.formatTime,
            unit: 'ms',
            description: 'Server response time'
          }));
        }

        if (typeof metrics.navigation.domContentLoaded === 'number' && metrics.navigation.domContentLoaded >= 0) {
          displays.push(this.createThresholdDisplay({
            name: 'DOM Content Loaded',
            actualValue: metrics.navigation.domContentLoaded,
            thresholdValue: thresholds.loadTime || 2000, // Use load time threshold as fallback
            formatter: this.formatTime,
            unit: 'ms',
            description: 'Time until DOM is ready'
          }));
        }
      }

      // Resource metrics
      if (metrics?.resource?.available) {
        if (typeof metrics.resource.totalSize === 'number' && metrics.resource.totalSize >= 0) {
          displays.push(this.createThresholdDisplay({
            name: 'Total Page Size',
            actualValue: metrics.resource.totalSize,
            thresholdValue: thresholds.pageSize || 1024000,
            formatter: this.formatSize,
            unit: 'bytes',
            description: 'Total size of all resources'
          }));
        }

        if (typeof metrics.resource.resourceCount === 'number' && metrics.resource.resourceCount >= 0) {
          displays.push(this.createThresholdDisplay({
            name: 'Resource Count',
            actualValue: metrics.resource.resourceCount,
            thresholdValue: 100, // Default threshold for resource count
            formatter: (value) => value.toString(),
            unit: 'resources',
            description: 'Number of resources loaded'
          }));
        }

        // Add largest resource if available
        if (metrics.resource.largestResource && 
            typeof metrics.resource.largestResource.size === 'number' && 
            metrics.resource.largestResource.size > 0) {
          displays.push(this.createThresholdDisplay({
            name: 'Largest Resource',
            actualValue: metrics.resource.largestResource.size,
            thresholdValue: (thresholds.pageSize || 1024000) * 0.3, // 30% of page size threshold
            formatter: this.formatSize,
            unit: 'bytes',
            description: `${metrics.resource.largestResource.name || 'Unknown'} (${metrics.resource.largestResource.type || 'unknown'})`
          }));
        }
      }

      // Rendering metrics
      if (metrics?.rendering?.available) {
        if (typeof metrics.rendering.firstPaint === 'number' && metrics.rendering.firstPaint > 0) {
          displays.push(this.createThresholdDisplay({
            name: 'First Paint',
            actualValue: metrics.rendering.firstPaint,
            thresholdValue: 1800, // Default 1.8s threshold for good UX
            formatter: this.formatTime,
            unit: 'ms',
            description: 'Time to first visual change'
          }));
        }

        if (typeof metrics.rendering.largestContentfulPaint === 'number' && metrics.rendering.largestContentfulPaint > 0) {
          displays.push(this.createThresholdDisplay({
            name: 'Largest Contentful Paint',
            actualValue: metrics.rendering.largestContentfulPaint,
            thresholdValue: 2500, // Default 2.5s threshold for good LCP
            formatter: this.formatTime,
            unit: 'ms',
            description: 'Time to largest content element'
          }));
        }
      }

      // Network metrics
      if (metrics?.network?.available && typeof metrics.network.ajaxCount === 'number' && metrics.network.ajaxCount > 0) {
        displays.push(this.createThresholdDisplay({
          name: 'AJAX Requests',
          actualValue: metrics.network.ajaxCount,
          thresholdValue: 10, // Default threshold for AJAX requests
          formatter: (value) => value.toString(),
          unit: 'requests',
          description: 'Number of AJAX/API calls'
        }));

        if (metrics.network.slowestRequest && 
            typeof metrics.network.slowestRequest.duration === 'number' && 
            metrics.network.slowestRequest.duration > 0) {
          displays.push(this.createThresholdDisplay({
            name: 'Slowest Request',
            actualValue: metrics.network.slowestRequest.duration,
            thresholdValue: 1000, // Default 1s threshold for API requests
            formatter: this.formatTime,
            unit: 'ms',
            description: `${this.truncateUrl(metrics.network.slowestRequest.url || 'Unknown URL')}`
          }));
        }
      }
    } catch (error) {
      console.error('Error generating threshold displays:', error);
      // Return empty array to trigger empty state
    }

    return displays;
  }

  /**
   * Create a threshold display object from configuration
   */
  private createThresholdDisplay(config: MetricDisplayConfig): IThresholdDisplay {
    try {
      // Validate input values
      if (typeof config.actualValue !== 'number' || isNaN(config.actualValue)) {
        throw new Error(`Invalid actual value for ${config.name}: ${config.actualValue}`);
      }
      
      if (typeof config.thresholdValue !== 'number' || isNaN(config.thresholdValue) || config.thresholdValue <= 0) {
        throw new Error(`Invalid threshold value for ${config.name}: ${config.thresholdValue}`);
      }

      const status = this.determineHealthStatus(config.actualValue, config.thresholdValue);
      const colorCode = this.getStatusColor(status);

      return {
        metric: config.name,
        actualValue: config.actualValue,
        thresholdValue: config.thresholdValue,
        status,
        colorCode,
        formattedActual: config.formatter(config.actualValue),
        formattedThreshold: config.formatter(config.thresholdValue)
      };
    } catch (error) {
      console.error(`Error creating threshold display for ${config.name}:`, error);
      // Return a fallback display
      return {
        metric: config.name,
        actualValue: 0,
        thresholdValue: 1,
        status: 'FAIL' as HealthStatus,
        colorCode: '#ff4444',
        formattedActual: 'N/A',
        formattedThreshold: 'N/A'
      };
    }
  }

  /**
   * Determine health status based on threshold comparison
   * Requirements 3.3, 3.4, 3.5: Color-coding logic
   */
  private determineHealthStatus(actual: number, threshold: number): HealthStatus {
    if (actual <= threshold) {
      return 'PASS'; // Green: within threshold
    } else if (actual <= threshold * 1.5) {
      return 'WARN'; // Yellow: 10-50% over threshold
    } else {
      return 'FAIL'; // Red: more than 50% over threshold
    }
  }

  /**
   * Get color code for status based on branding
   */
  private getStatusColor(status: HealthStatus): string {
    try {
      switch (status) {
        case 'PASS':
          return this.assetManager.getBrandingColor('accent'); // Green
        case 'WARN':
          return this.assetManager.getBrandingColor('warning'); // Yellow
        case 'FAIL':
          return this.assetManager.getBrandingColor('error'); // Red
        default:
          return this.assetManager.getBrandingColor('primary');
      }
    } catch (error) {
      // Fallback colors if AssetManager is not available
      switch (status) {
        case 'PASS':
          return '#00c851'; // Green
        case 'WARN':
          return '#ffbb33'; // Yellow
        case 'FAIL':
          return '#ff4444'; // Red
        default:
          return '#1a1a1a'; // Dark
      }
    }
  }

  /**
   * Render the threshold display table
   */
  private renderTable(): void {
    if (!this.containerElement) return;

    const tableHTML = `
      <div class="blackbox-threshold-display">
        <div class="blackbox-threshold-header">
          <h3 class="blackbox-threshold-title">Performance Metrics</h3>
          <div class="blackbox-threshold-legend">
            <span class="blackbox-legend-item">
              <span class="blackbox-legend-color" style="background-color: ${this.getStatusColor('PASS')}"></span>
              <span class="blackbox-legend-text">Pass</span>
            </span>
            <span class="blackbox-legend-item">
              <span class="blackbox-legend-color" style="background-color: ${this.getStatusColor('WARN')}"></span>
              <span class="blackbox-legend-text">Warning</span>
            </span>
            <span class="blackbox-legend-item">
              <span class="blackbox-legend-color" style="background-color: ${this.getStatusColor('FAIL')}"></span>
              <span class="blackbox-legend-text">Fail</span>
            </span>
          </div>
        </div>
        <div class="blackbox-threshold-table">
          <div class="blackbox-threshold-table-header">
            <div class="blackbox-header-metric">Metric</div>
            <div class="blackbox-header-actual">Actual</div>
            <div class="blackbox-header-threshold">Threshold</div>
            <div class="blackbox-header-status">Status</div>
          </div>
          <div class="blackbox-threshold-table-body">
            ${this.currentDisplays.map(display => this.renderMetricRow(display)).join('')}
          </div>
        </div>
      </div>
    `;

    this.containerElement.innerHTML = tableHTML;
  }

  /**
   * Render a single metric row
   */
  private renderMetricRow(display: IThresholdDisplay): string {
    const statusClass = display.status.toLowerCase();
    const statusEmoji = this.getStatusEmoji(display.status);
    
    return `
      <div class="blackbox-threshold-row ${statusClass}" data-metric="${display.metric}">
        <div class="blackbox-metric-name" title="${display.metric}">
          ${display.metric}
        </div>
        <div class="blackbox-metric-actual" style="color: ${display.colorCode}" title="Actual value: ${display.formattedActual}">
          ${display.formattedActual}
        </div>
        <div class="blackbox-metric-threshold" title="Threshold: ${display.formattedThreshold}">
          ${display.formattedThreshold}
        </div>
        <div class="blackbox-metric-status ${statusClass}" title="${display.status}">
          <span class="blackbox-status-emoji">${statusEmoji}</span>
          <span class="blackbox-status-text">${display.status}</span>
        </div>
      </div>
    `;
  }

  /**
   * Apply styles to the threshold display
   */
  private applyStyles(): void {
    // Inject CSS if not already present
    if (!document.querySelector('#blackbox-threshold-display-styles')) {
      try {
        const style = document.createElement('style');
        style.id = 'blackbox-threshold-display-styles';
        style.textContent = this.getThresholdDisplayCSS();
        document.head.appendChild(style);
      } catch (error) {
        console.warn('Failed to apply threshold display styles:', error);
        // Continue without custom styles - browser defaults will be used
      }
    }
  }

  /**
   * Get CSS styles for threshold display
   */
  private getThresholdDisplayCSS(): string {
    try {
      // Handle null AssetManager gracefully
      const branding = this.assetManager ? this.assetManager.getBrandingElements() : null;
      
      // Use branding if available, otherwise use fallback values
      const fontFamily = branding?.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const primaryColor = branding?.primaryColor || '#1a1a1a';
      const secondaryColor = branding?.secondaryColor || '#4a90e2';
      const accentColor = branding?.accentColor || '#00c851';
      const warningColor = branding?.warningColor || '#ffbb33';
      const errorColor = branding?.errorColor || '#ff4444';
      
      return `
        .blackbox-threshold-display {
          background: #ffffff;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          overflow: hidden;
          margin-bottom: 20px;
          font-family: ${fontFamily};
        }

        .blackbox-threshold-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: #f8f9fa;
          border-bottom: 1px solid #e5e7eb;
        }

        .blackbox-threshold-title {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: ${primaryColor};
        }

        .blackbox-threshold-legend {
          display: flex;
          gap: 16px;
          align-items: center;
        }

        .blackbox-legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          color: #6b7280;
        }

        .blackbox-legend-color {
          width: 12px;
          height: 12px;
          border-radius: 2px;
          display: inline-block;
        }

        .blackbox-threshold-table {
          width: 100%;
        }

        .blackbox-threshold-table-header {
          display: grid;
          grid-template-columns: 2fr 1.2fr 1.2fr 100px;
          background: #f8f9fa;
          padding: 12px 20px;
          font-weight: 600;
          font-size: 0.875rem;
          color: ${primaryColor};
          border-bottom: 1px solid #e5e7eb;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }

        .blackbox-threshold-table-body {
          background: #ffffff;
        }

        .blackbox-threshold-row {
          display: grid;
          grid-template-columns: 2fr 1.2fr 1.2fr 100px;
          padding: 14px 20px;
          border-bottom: 1px solid #f1f5f9;
          align-items: center;
          transition: background-color 0.2s ease;
        }

        .blackbox-threshold-row:last-child {
          border-bottom: none;
        }

        .blackbox-threshold-row:hover {
          background-color: #f8f9fa;
        }

        .blackbox-metric-name {
          font-weight: 500;
          color: ${primaryColor};
          font-size: 0.875rem;
        }

        .blackbox-metric-actual {
          font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', monospace;
          font-size: 0.875rem;
          font-weight: 600;
          letter-spacing: -0.025em;
        }

        .blackbox-metric-threshold {
          font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', monospace;
          font-size: 0.875rem;
          color: #6b7280;
          letter-spacing: -0.025em;
        }

        .blackbox-metric-status {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .blackbox-status-emoji {
          font-size: 1rem;
        }

        .blackbox-status-text {
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* Status-specific styling */
        .blackbox-threshold-row.pass .blackbox-status-text {
          color: ${accentColor};
        }

        .blackbox-threshold-row.warn .blackbox-status-text {
          color: ${warningColor};
        }

        .blackbox-threshold-row.fail .blackbox-status-text {
          color: ${errorColor};
        }

        /* Responsive design */
        @media (max-width: 600px) {
          .blackbox-threshold-header {
            flex-direction: column;
            gap: 12px;
            align-items: flex-start;
          }

          .blackbox-threshold-legend {
            gap: 12px;
          }

          .blackbox-threshold-table-header,
          .blackbox-threshold-row {
            grid-template-columns: 2fr 1fr 1fr 80px;
            padding: 10px 16px;
            font-size: 0.75rem;
          }

          .blackbox-metric-name {
            font-size: 0.75rem;
          }

          .blackbox-metric-actual,
          .blackbox-metric-threshold {
            font-size: 0.75rem;
          }

          .blackbox-status-text {
            display: none; /* Show only emoji on mobile */
          }
        }

        /* Expanded view adjustments */
        .blackbox-expanded-view .blackbox-threshold-table-header,
        .blackbox-expanded-view .blackbox-threshold-row {
          grid-template-columns: 3fr 1.5fr 1.5fr 120px;
          padding: 16px 24px;
        }

        .blackbox-expanded-view .blackbox-threshold-header {
          padding: 20px 24px;
        }

        .blackbox-expanded-view .blackbox-threshold-title {
          font-size: 1.25rem;
        }

        .blackbox-expanded-view .blackbox-metric-name {
          font-size: 1rem;
        }

        .blackbox-expanded-view .blackbox-metric-actual,
        .blackbox-expanded-view .blackbox-metric-threshold {
          font-size: 1rem;
        }

        /* Animation for status changes */
        .blackbox-metric-actual {
          transition: color 0.3s ease;
        }

        .blackbox-threshold-row {
          transition: all 0.2s ease;
        }

        /* Accessibility improvements */
        .blackbox-threshold-row:focus-within {
          outline: 2px solid ${secondaryColor};
          outline-offset: -2px;
        }

        .blackbox-metric-status[title] {
          cursor: help;
        }

        /* Print styles */
        @media print {
          .blackbox-threshold-display {
            border: 1px solid #000;
            break-inside: avoid;
          }

          .blackbox-threshold-row {
            border-bottom: 1px solid #ccc;
          }

          .blackbox-status-emoji {
            display: none;
          }

          .blackbox-status-text {
            display: inline !important;
            color: #000 !important;
          }
        }
      `;
    } catch (error) {
      console.warn('Failed to get branding elements, using fallback styles:', error);
      // Return fallback CSS without branding colors
      return `
        .blackbox-threshold-display {
          background: #ffffff;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          overflow: hidden;
          margin-bottom: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .blackbox-threshold-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: #f8f9fa;
          border-bottom: 1px solid #e5e7eb;
        }

        .blackbox-threshold-title {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #1a1a1a;
        }

        .blackbox-threshold-table {
          width: 100%;
        }

        .blackbox-threshold-table-header {
          display: grid;
          grid-template-columns: 2fr 1.2fr 1.2fr 100px;
          background: #f8f9fa;
          padding: 12px 20px;
          font-weight: 600;
          font-size: 0.875rem;
          color: #1a1a1a;
          border-bottom: 1px solid #e5e7eb;
        }

        .blackbox-threshold-row {
          display: grid;
          grid-template-columns: 2fr 1.2fr 1.2fr 100px;
          padding: 14px 20px;
          border-bottom: 1px solid #f1f5f9;
          align-items: center;
        }

        .blackbox-metric-name {
          font-weight: 500;
          color: #1a1a1a;
          font-size: 0.875rem;
        }

        .blackbox-metric-actual {
          font-family: monospace;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .blackbox-metric-threshold {
          font-family: monospace;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .blackbox-metric-status {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          font-size: 0.75rem;
          font-weight: 500;
        }
      `;
    }
  }

  /**
   * Format time values for display
   */
  private formatTime = (milliseconds: number): string => {
    if (milliseconds >= 1000) {
      return `${(milliseconds / 1000).toFixed(2)}s`;
    } else {
      return `${Math.round(milliseconds)}ms`;
    }
  };

  /**
   * Format size values for display
   */
  private formatSize = (bytes: number): string => {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    } else if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else {
      return `${bytes} B`;
    }
  };

  /**
   * Get status emoji for display
   */
  private getStatusEmoji(status: HealthStatus): string {
    switch (status) {
      case 'PASS': return '✅';
      case 'WARN': return '⚠️';
      case 'FAIL': return '❌';
      default: return '❓';
    }
  }

  /**
   * Truncate URL for display
   */
  private truncateUrl(url: string, maxLength: number = 30): string {
    if (url.length <= maxLength) return url;
    
    // Try to keep the domain and path structure visible
    const urlParts = url.split('/');
    if (urlParts.length > 3) {
      const domain = urlParts[2];
      const path = urlParts.slice(3).join('/');
      
      if (domain.length + path.length + 3 <= maxLength) {
        return `${domain}/${path}`;
      } else if (domain.length <= maxLength - 3) {
        const remainingLength = maxLength - domain.length - 6; // Account for ".../" 
        return `${domain}/...${path.slice(-remainingLength)}`;
      }
    }
    
    return url.slice(0, maxLength - 3) + '...';
  }

  /**
   * Render empty state when no metrics are available
   */
  private renderEmptyState(): void {
    if (!this.containerElement) return;

    this.containerElement.innerHTML = `
      <div class="blackbox-threshold-empty" style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        margin: 10px 0;
        text-align: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div class="blackbox-empty-icon" style="
          font-size: 3rem;
          margin-bottom: 16px;
          opacity: 0.6;
        ">📊</div>
        <div class="blackbox-empty-title" style="
          font-size: 1.25rem;
          font-weight: 600;
          color: #495057;
          margin-bottom: 8px;
        ">No Metrics Available</div>
        <div class="blackbox-empty-message" style="
          font-size: 0.875rem;
          color: #6c757d;
          max-width: 300px;
          line-height: 1.4;
        ">Performance metrics are not available for this page. This may happen if the page hasn't finished loading or if performance APIs are not supported.</div>
      </div>
    `;
  }

  /**
   * Handle errors with proper error types
   */
  private handleError(message: string, originalError?: any): void {
    const error = new Error(message) as Phase2Error;
    error.type = 'UI_EXPANSION_ERROR'; // Reusing existing error type
    error.context = originalError;
    error.recoverable = true;
    error.fallback = 'Display basic metrics without threshold comparison';
    
    console.error('ThresholdDisplay error:', error);
    
    // Render fallback content with inline styles to ensure it displays
    if (this.containerElement) {
      this.containerElement.innerHTML = `
        <div class="blackbox-threshold-error" style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: #fee2e2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          margin: 10px 0;
          text-align: center;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">
          <div class="blackbox-error-icon" style="
            font-size: 2rem;
            margin-bottom: 12px;
          ">⚠️</div>
          <div class="blackbox-error-message" style="
            font-size: 1rem;
            font-weight: 600;
            color: #991b1b;
            margin-bottom: 8px;
          ">Unable to display metrics table</div>
          <div class="blackbox-error-details" style="
            font-size: 0.875rem;
            color: #7f1d1d;
            max-width: 300px;
          ">${message}</div>
          <button onclick="window.location.reload()" style="
            margin-top: 12px;
            padding: 8px 16px;
            background: #dc2626;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.875rem;
            font-weight: 500;
          ">Retry</button>
        </div>
      `;
    }
  }
}