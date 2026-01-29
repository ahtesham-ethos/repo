import { OverallHealth, AllMetrics, Thresholds } from '../types';

/**
 * ResultsPresenter handles formatting and displaying analysis results
 * in a clear, non-technical format suitable for all users.
 */
export class ResultsPresenter {
  /**
   * Formats overall health summary with color-coded status
   * @param health OverallHealth assessment
   * @returns Formatted health summary string
   */
  formatHealthSummary(health: OverallHealth): string {
    const statusEmoji = this.getStatusEmoji(health.status);
    const statusText = this.getStatusText(health.status);
    
    return `${statusEmoji} ${statusText} (Score: ${health.score}/100)`;
  }

  /**
   * Formats detailed metrics with human-readable units
   * @param metrics AllMetrics collected from the page
   * @param thresholds Configured thresholds for comparison
   * @returns Formatted metrics details string
   */
  formatMetricDetails(metrics: AllMetrics, thresholds: Thresholds): string {
    const details: string[] = [];

    // Navigation metrics
    if (metrics.navigation.available) {
      details.push('📊 **Performance Metrics**');
      details.push(`• Load Time: ${this.formatTime(metrics.navigation.loadTime)} (threshold: ${this.formatTime(thresholds.loadTime)})`);
      details.push(`• Time to First Byte: ${this.formatTime(metrics.navigation.ttfb)} (threshold: ${this.formatTime(thresholds.ttfb)})`);
      details.push(`• DOM Content Loaded: ${this.formatTime(metrics.navigation.domContentLoaded)}`);
    }

    // Resource metrics
    if (metrics.resource.available) {
      details.push('');
      details.push('📦 **Resource Analysis**');
      details.push(`• Total Page Size: ${this.formatSize(metrics.resource.totalSize)} (threshold: ${this.formatSize(thresholds.pageSize)})`);
      details.push(`• Resources Loaded: ${metrics.resource.resourceCount}`);
      
      if (metrics.resource.largestResource.size > 0) {
        details.push(`• Largest Resource: ${metrics.resource.largestResource.name} (${this.formatSize(metrics.resource.largestResource.size)})`);
      }
    }

    // Rendering metrics
    if (metrics.rendering.available) {
      details.push('');
      details.push('🎨 **Rendering Performance**');
      
      if (metrics.rendering.firstPaint > 0) {
        details.push(`• First Paint: ${this.formatTime(metrics.rendering.firstPaint)}`);
      }
      
      if (metrics.rendering.largestContentfulPaint > 0) {
        details.push(`• Largest Contentful Paint: ${this.formatTime(metrics.rendering.largestContentfulPaint)}`);
      }
    }

    // Network metrics
    if (metrics.network.available && metrics.network.ajaxCount > 0) {
      details.push('');
      details.push('🌐 **Network Activity**');
      details.push(`• AJAX/API Requests: ${metrics.network.ajaxCount}`);
      
      if (metrics.network.slowestRequest.duration > 0) {
        details.push(`• Slowest Request: ${metrics.network.slowestRequest.url} (${this.formatTime(metrics.network.slowestRequest.duration)})`);
      }
    }

    return details.join('\n');
  }

  /**
   * Renders results as HTML for extension popup display
   * @param container HTMLElement to render results into
   * @param health OverallHealth assessment
   * @param metrics AllMetrics collected from the page
   * @param thresholds Configured thresholds for comparison
   */
  renderResults(container: HTMLElement, health: OverallHealth, metrics: AllMetrics, thresholds: Thresholds): void {
    // Clear existing content
    container.innerHTML = '';

    // Create overall health status
    const healthDiv = document.createElement('div');
    healthDiv.className = `health-status ${health.status.toLowerCase()}`;
    healthDiv.innerHTML = `
      <div class="status-badge">${this.getStatusEmoji(health.status)}</div>
      <div class="status-text">
        <div class="status-title">${this.getStatusText(health.status)}</div>
        <div class="status-score">Score: ${health.score}/100</div>
      </div>
    `;
    container.appendChild(healthDiv);

    // Create metrics details section
    const metricsDiv = document.createElement('div');
    metricsDiv.className = 'metrics-details';
    
    // Navigation metrics
    if (metrics.navigation.available) {
      const navSection = this.createMetricsSection('Performance Metrics', '📊', [
        { label: 'Load Time', value: this.formatTime(metrics.navigation.loadTime), threshold: this.formatTime(thresholds.loadTime) },
        { label: 'Time to First Byte', value: this.formatTime(metrics.navigation.ttfb), threshold: this.formatTime(thresholds.ttfb) },
        { label: 'DOM Content Loaded', value: this.formatTime(metrics.navigation.domContentLoaded) }
      ]);
      metricsDiv.appendChild(navSection);
    }

    // Resource metrics
    if (metrics.resource.available) {
      const resourceItems = [
        { label: 'Total Page Size', value: this.formatSize(metrics.resource.totalSize), threshold: this.formatSize(thresholds.pageSize) },
        { label: 'Resources Loaded', value: metrics.resource.resourceCount.toString() }
      ];

      if (metrics.resource.largestResource.size > 0) {
        resourceItems.push({
          label: 'Largest Resource',
          value: `${metrics.resource.largestResource.name} (${this.formatSize(metrics.resource.largestResource.size)})`
        });
      }

      const resourceSection = this.createMetricsSection('Resource Analysis', '📦', resourceItems);
      metricsDiv.appendChild(resourceSection);
    }

    // Rendering metrics
    if (metrics.rendering.available && (metrics.rendering.firstPaint > 0 || metrics.rendering.largestContentfulPaint > 0)) {
      const renderingItems = [];
      
      if (metrics.rendering.firstPaint > 0) {
        renderingItems.push({ label: 'First Paint', value: this.formatTime(metrics.rendering.firstPaint) });
      }
      
      if (metrics.rendering.largestContentfulPaint > 0) {
        renderingItems.push({ label: 'Largest Contentful Paint', value: this.formatTime(metrics.rendering.largestContentfulPaint) });
      }

      if (renderingItems.length > 0) {
        const renderingSection = this.createMetricsSection('Rendering Performance', '🎨', renderingItems);
        metricsDiv.appendChild(renderingSection);
      }
    }

    // Network metrics
    if (metrics.network.available && metrics.network.ajaxCount > 0) {
      const networkItems = [
        { label: 'AJAX/API Requests', value: metrics.network.ajaxCount.toString() }
      ];

      if (metrics.network.slowestRequest.duration > 0) {
        networkItems.push({
          label: 'Slowest Request',
          value: `${metrics.network.slowestRequest.url} (${this.formatTime(metrics.network.slowestRequest.duration)})`
        });
      }

      const networkSection = this.createMetricsSection('Network Activity', '🌐', networkItems);
      metricsDiv.appendChild(networkSection);
    }

    container.appendChild(metricsDiv);

    // Create worst offenders section
    const offenders = this.highlightWorstOffenders(metrics);
    if (offenders.length > 0) {
      const offendersDiv = document.createElement('div');
      offendersDiv.className = 'worst-offenders';
      
      const title = document.createElement('h3');
      title.textContent = 'Key Issues';
      offendersDiv.appendChild(title);

      offenders.forEach(offender => {
        const offenderDiv = document.createElement('div');
        offenderDiv.className = 'offender';
        offenderDiv.textContent = offender;
        offendersDiv.appendChild(offenderDiv);
      });

      container.appendChild(offendersDiv);
    }
  }

  /**
   * Creates a metrics section with title and items
   * @param title Section title
   * @param icon Section icon
   * @param items Array of metric items
   * @returns HTMLElement containing the section
   */
  private createMetricsSection(title: string, icon: string, items: Array<{ label: string; value: string; threshold?: string }>): HTMLElement {
    const section = document.createElement('div');
    section.className = 'metrics-section';

    const header = document.createElement('h3');
    header.innerHTML = `${icon} ${title}`;
    section.appendChild(header);

    items.forEach(item => {
      const metricDiv = document.createElement('div');
      metricDiv.className = 'metric';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'metric-name';
      nameSpan.textContent = item.label;

      const valueSpan = document.createElement('span');
      valueSpan.className = 'metric-value';
      
      if (item.threshold) {
        valueSpan.textContent = `${item.value} (threshold: ${item.threshold})`;
      } else {
        valueSpan.textContent = item.value;
      }

      metricDiv.appendChild(nameSpan);
      metricDiv.appendChild(valueSpan);
      section.appendChild(metricDiv);
    });

    return section;
  }

  /**
   * Highlights worst offenders including slowest requests and largest resources
   * @param metrics AllMetrics collected from the page
   * @returns Array of formatted worst offender strings
   */
  highlightWorstOffenders(metrics: AllMetrics): string[] {
    const offenders: string[] = [];

    // Find largest resources (top 3)
    if (metrics.resource.available && metrics.resource.totalSize > 0) {
      // We only have the single largest resource from our current data structure
      // In a real implementation, we might want to track top N resources
      if (metrics.resource.largestResource.size > 0) {
        const sizeFormatted = this.formatSize(metrics.resource.largestResource.size);
        const percentage = ((metrics.resource.largestResource.size / metrics.resource.totalSize) * 100).toFixed(1);
        offenders.push(`🔴 Largest Resource: ${metrics.resource.largestResource.name} (${sizeFormatted}, ${percentage}% of total)`);
      }
    }

    // Find slowest network requests
    if (metrics.network.available && metrics.network.slowestRequest.duration > 0) {
      const timeFormatted = this.formatTime(metrics.network.slowestRequest.duration);
      offenders.push(`🐌 Slowest Request: ${metrics.network.slowestRequest.url} (${timeFormatted})`);
    }

    // Highlight poor rendering performance
    if (metrics.rendering.available) {
      if (metrics.rendering.largestContentfulPaint > 4000) { // > 4s is poor LCP
        const timeFormatted = this.formatTime(metrics.rendering.largestContentfulPaint);
        offenders.push(`🎨 Poor LCP: ${timeFormatted} (should be < 2.5s for good user experience)`);
      }
      
      if (metrics.rendering.firstPaint > 3000) { // > 3s is poor FP
        const timeFormatted = this.formatTime(metrics.rendering.firstPaint);
        offenders.push(`⏱️ Slow First Paint: ${timeFormatted} (should be < 1.8s for good user experience)`);
      }
    }

    // Highlight excessive network activity
    if (metrics.network.available && metrics.network.ajaxCount > 10) {
      offenders.push(`📡 High Network Activity: ${metrics.network.ajaxCount} requests (consider reducing API calls)`);
    }

    // Highlight large page size
    if (metrics.resource.available) {
      const pageSizeMB = metrics.resource.totalSize / (1024 * 1024);
      if (pageSizeMB > 3) { // > 3MB is quite large
        offenders.push(`📦 Large Page Size: ${this.formatSize(metrics.resource.totalSize)} (consider optimizing resources)`);
      }
    }

    // If no specific offenders found, provide general guidance
    if (offenders.length === 0) {
      offenders.push('✨ No major performance issues detected');
    }

    return offenders;
  }

  /**
   * Formats timing values in human-readable units
   * @param milliseconds Time value in milliseconds
   * @returns Formatted time string
   */
  private formatTime(milliseconds: number): string {
    if (milliseconds >= 1000) {
      return `${(milliseconds / 1000).toFixed(2)}s`;
    } else {
      return `${Math.round(milliseconds)}ms`;
    }
  }

  /**
   * Formats size values in human-readable units
   * @param bytes Size value in bytes
   * @returns Formatted size string
   */
  private formatSize(bytes: number): string {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    } else if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else {
      return `${bytes} bytes`;
    }
  }

  /**
   * Gets emoji representation for health status
   * @param status Health status
   * @returns Status emoji
   */
  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'PASS':
        return '✅';
      case 'WARN':
        return '⚠️';
      case 'FAIL':
        return '❌';
      default:
        return '❓';
    }
  }

  /**
   * Gets text representation for health status
   * @param status Health status
   * @returns Status text
   */
  private getStatusText(status: string): string {
    switch (status) {
      case 'PASS':
        return 'Excellent Performance';
      case 'WARN':
        return 'Performance Issues Detected';
      case 'FAIL':
        return 'Critical Performance Problems';
      default:
        return 'Unknown Status';
    }
  }
}