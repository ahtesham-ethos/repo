/**
 * ReportGenerator - Creates comprehensive text and structured reports for Blackbox
 * 
 * This class generates professional text-based reports suitable for copy/paste sharing,
 * including executive summaries, detailed metrics analysis, and actionable recommendations.
 * Supports both current analysis and historical profile data.
 */

import { 
  ReportGenerator as IReportGenerator, 
  ReportData, 
  ReportMetadata, 
  BrowserInfo,
  SavedProfile 
} from '../types/phase2';
import { 
  OverallHealth, 
  AllMetrics, 
  Thresholds, 
  HealthResult, 
  HealthStatus 
} from '../types';
import { assetManager } from './AssetManager';

export class ReportGenerator implements IReportGenerator {
  private readonly REPORT_SEPARATOR = '====================================';
  private readonly SECTION_SEPARATOR = '-----------------';

  /**
   * Generate a comprehensive text-based report
   */
  public generateTextReport(analysis: OverallHealth, metadata: ReportMetadata): string {
    const branding = assetManager.getBrandingElements();
    const sections: string[] = [];

    // Header with branding
    sections.push(this.generateReportHeader(branding.productName));
    sections.push('');

    // Metadata section
    sections.push(this.generateMetadataSection(metadata));
    sections.push('');

    // Executive summary
    sections.push('EXECUTIVE SUMMARY');
    sections.push(this.SECTION_SEPARATOR);
    sections.push(this.createExecutiveSummary(analysis));
    sections.push('');

    // Detailed metrics (if available)
    if (analysis.results && analysis.results.length > 0) {
      sections.push('DETAILED METRICS');
      sections.push(this.SECTION_SEPARATOR);
      sections.push(this.formatDetailedMetrics(analysis.results));
      sections.push('');
    }

    // Recommendations
    sections.push('RECOMMENDATIONS');
    sections.push(this.SECTION_SEPARATOR);
    sections.push(this.generateRecommendations(analysis));
    sections.push('');

    // Technical details
    sections.push('TECHNICAL DETAILS');
    sections.push(this.SECTION_SEPARATOR);
    sections.push(this.formatTechnicalDetails(analysis));

    return sections.join('\n');
  }

  /**
   * Generate structured report data for advanced use cases
   */
  public generateStructuredReport(analysis: OverallHealth, profile?: SavedProfile): ReportData {
    const metadata: ReportMetadata = profile ? {
      generatedAt: new Date(),
      url: profile.url,
      browserInfo: profile.browserInfo,
      reportType: 'text'
    } : {
      generatedAt: new Date(),
      url: window.location?.href || 'Unknown',
      browserInfo: this.getBrowserInfo(),
      reportType: 'text'
    };

    const metricsData = profile?.metrics || this.extractMetricsFromAnalysis(analysis);
    const thresholds = profile?.thresholds || this.getDefaultThresholds();

    return {
      metadata,
      summary: this.createExecutiveSummary(analysis),
      metricsTable: this.formatMetricsSection(metricsData, thresholds),
      recommendations: this.generateRecommendationsList(analysis),
      charts: [], // Charts will be populated by ChartEngine when needed
      rawData: metricsData
    };
  }

  /**
   * Format metrics section with threshold comparison
   */
  public formatMetricsSection(metrics: AllMetrics, thresholds: Thresholds): string {
    const sections: string[] = [];

    // Performance Metrics
    if (metrics.navigation.available) {
      sections.push('Performance Metrics:');
      sections.push(`  Load Time:           ${this.formatTime(metrics.navigation.loadTime)} (threshold: ${this.formatTime(thresholds.loadTime)})`);
      sections.push(`  Time to First Byte:  ${this.formatTime(metrics.navigation.ttfb)} (threshold: ${this.formatTime(thresholds.ttfb)})`);
      sections.push(`  DOM Content Loaded:  ${this.formatTime(metrics.navigation.domContentLoaded)}`);
      sections.push('');
    }

    // Resource Analysis
    if (metrics.resource.available) {
      sections.push('Resource Analysis:');
      sections.push(`  Total Page Size:     ${this.formatSize(metrics.resource.totalSize)} (threshold: ${this.formatSize(thresholds.pageSize)})`);
      sections.push(`  Resources Loaded:    ${metrics.resource.resourceCount}`);
      
      if (metrics.resource.largestResource.size > 0) {
        sections.push(`  Largest Resource:    ${this.truncateUrl(metrics.resource.largestResource.name)} (${this.formatSize(metrics.resource.largestResource.size)})`);
      }
      sections.push('');
    }

    // Rendering Performance
    if (metrics.rendering.available) {
      const hasRenderingData = metrics.rendering.firstPaint > 0 || metrics.rendering.largestContentfulPaint > 0;
      if (hasRenderingData) {
        sections.push('Rendering Performance:');
        
        if (metrics.rendering.firstPaint > 0) {
          sections.push(`  First Paint:         ${this.formatTime(metrics.rendering.firstPaint)}`);
        }
        
        if (metrics.rendering.largestContentfulPaint > 0) {
          sections.push(`  Largest Contentful Paint: ${this.formatTime(metrics.rendering.largestContentfulPaint)}`);
        }
        sections.push('');
      }
    }

    // Network Activity
    if (metrics.network.available && metrics.network.ajaxCount > 0) {
      sections.push('Network Activity:');
      sections.push(`  AJAX/API Requests:   ${metrics.network.ajaxCount}`);
      
      if (metrics.network.slowestRequest.duration > 0) {
        sections.push(`  Slowest Request:     ${this.truncateUrl(metrics.network.slowestRequest.url)} (${this.formatTime(metrics.network.slowestRequest.duration)})`);
      }
      sections.push('');
    }

    return sections.join('\n').trim();
  }

  /**
   * Create executive summary with key findings
   */
  public createExecutiveSummary(health: OverallHealth): string {
    const sections: string[] = [];

    // Overall status
    sections.push(`Overall Health: ${health.status}`);
    sections.push(`Performance Score: ${health.score}/100`);
    sections.push('');

    // Key findings
    if (health.worstOffenders && health.worstOffenders.length > 0) {
      sections.push('Key Issues:');
      health.worstOffenders.slice(0, 3).forEach(offender => {
        sections.push(`  • ${offender}`);
      });
    } else {
      sections.push('Key Issues: None detected - all metrics within acceptable thresholds');
    }

    sections.push('');

    // Status breakdown
    const statusCounts = this.getStatusCounts(health.results);
    sections.push('Metrics Status:');
    sections.push(`  ✅ Passing: ${statusCounts.pass} metrics`);
    sections.push(`  ⚠️  Warning: ${statusCounts.warn} metrics`);
    sections.push(`  ❌ Failing: ${statusCounts.fail} metrics`);

    return sections.join('\n');
  }

  /**
   * Generate actionable recommendations based on analysis
   */
  private generateRecommendations(health: OverallHealth): string {
    const recommendations = this.generateRecommendationsList(health);
    
    if (recommendations.length === 0) {
      return 'No specific recommendations - performance is within acceptable thresholds.\nContinue monitoring and consider implementing performance budgets for ongoing optimization.';
    }

    return recommendations.map((rec, index) => `${index + 1}. ${rec}`).join('\n\n');
  }

  /**
   * Generate list of recommendations
   */
  private generateRecommendationsList(health: OverallHealth): string[] {
    const recommendations: string[] = [];
    const failingMetrics = health.results.filter(r => r.status === 'FAIL');
    const warningMetrics = health.results.filter(r => r.status === 'WARN');

    // Recommendations for failing metrics (highest priority)
    failingMetrics.forEach(result => {
      const recommendation = this.getMetricRecommendation(result);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    });

    // Recommendations for warning metrics
    warningMetrics.forEach(result => {
      const recommendation = this.getMetricRecommendation(result);
      if (recommendation && !recommendations.includes(recommendation)) {
        recommendations.push(recommendation);
      }
    });

    // General recommendations if no specific issues
    if (recommendations.length === 0 && health.status === 'PASS') {
      recommendations.push('Consider implementing performance monitoring to track metrics over time');
      recommendations.push('Set up performance budgets to prevent regression');
      recommendations.push('Regularly audit third-party scripts and dependencies');
    }

    // Limit to top 5 recommendations for readability
    return recommendations.slice(0, 5);
  }

  /**
   * Get specific recommendation for a metric
   */
  private getMetricRecommendation(result: HealthResult): string | null {
    switch (result.metric) {
      case 'Load Time':
        return 'Optimize page load time by compressing images, minifying CSS/JS, enabling browser caching, and using a Content Delivery Network (CDN)';
      
      case 'Time to First Byte':
        return 'Improve server response time by optimizing database queries, upgrading hosting infrastructure, implementing server-side caching, and reducing server processing time';
      
      case 'Page Size':
        return 'Reduce page size by compressing images (WebP format), removing unused CSS/JS, implementing lazy loading, and optimizing resource delivery';
      
      default:
        return null;
    }
  }

  /**
   * Generate report header with branding
   */
  private generateReportHeader(productName: string): string {
    return [
      `${productName.toUpperCase()} PERFORMANCE ANALYSIS REPORT`,
      this.REPORT_SEPARATOR
    ].join('\n');
  }

  /**
   * Generate metadata section
   */
  private generateMetadataSection(metadata: ReportMetadata): string {
    const sections: string[] = [];

    sections.push(`Generated: ${this.formatDateTime(metadata.generatedAt)}`);
    sections.push(`URL: ${metadata.url}`);
    sections.push(`Browser: ${metadata.browserInfo.name} ${metadata.browserInfo.version}`);
    sections.push(`Platform: ${metadata.browserInfo.platform}`);

    return sections.join('\n');
  }

  /**
   * Format detailed metrics with status indicators
   */
  private formatDetailedMetrics(results: HealthResult[]): string {
    const sections: string[] = [];

    results.forEach(result => {
      const statusIcon = this.getStatusIcon(result.status);
      const formattedValue = this.formatMetricValue(result.value, result.metric);
      const formattedThreshold = this.formatMetricValue(result.threshold, result.metric);
      
      sections.push(`${statusIcon} ${result.metric}:`);
      sections.push(`    Actual: ${formattedValue}`);
      sections.push(`    Threshold: ${formattedThreshold}`);
      sections.push(`    Status: ${result.status}`);
      sections.push('');
    });

    return sections.join('\n').trim();
  }

  /**
   * Format technical details section
   */
  private formatTechnicalDetails(health: OverallHealth): string {
    const sections: string[] = [];

    sections.push(`Total Metrics Evaluated: ${health.results.length}`);
    sections.push(`Composite Score Calculation: Average of individual metric scores`);
    sections.push(`Score Weights: PASS=100, WARN=60, FAIL=0`);
    sections.push('');

    sections.push('Threshold Logic:');
    sections.push('  • PASS: Value ≤ threshold');
    sections.push('  • WARN: Value ≤ threshold × 1.5 (10-50% over)');
    sections.push('  • FAIL: Value > threshold × 1.5 (>50% over)');

    return sections.join('\n');
  }

  /**
   * Get status counts from results
   */
  private getStatusCounts(results: HealthResult[]): { pass: number; warn: number; fail: number } {
    return results.reduce((counts, result) => {
      switch (result.status) {
        case 'PASS':
          counts.pass++;
          break;
        case 'WARN':
          counts.warn++;
          break;
        case 'FAIL':
          counts.fail++;
          break;
      }
      return counts;
    }, { pass: 0, warn: 0, fail: 0 });
  }

  /**
   * Get status icon for text reports
   */
  private getStatusIcon(status: HealthStatus): string {
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
   * Format metric value based on metric type
   */
  private formatMetricValue(value: number, metricName: string): string {
    if (metricName.toLowerCase().includes('time') || metricName.toLowerCase().includes('ttfb')) {
      return this.formatTime(value);
    } else if (metricName.toLowerCase().includes('size')) {
      return this.formatSize(value);
    } else {
      return value.toString();
    }
  }

  /**
   * Format time values in human-readable units
   */
  private formatTime(milliseconds: number): string {
    if (milliseconds >= 1000) {
      return `${(milliseconds / 1000).toFixed(2)}s`;
    } else {
      return `${Math.round(milliseconds)}ms`;
    }
  }

  /**
   * Format size values in human-readable units
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
   * Format date and time for reports
   */
  private formatDateTime(date: Date): string {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  }

  /**
   * Truncate long URLs for better readability
   */
  private truncateUrl(url: string, maxLength: number = 50): string {
    if (url.length <= maxLength) {
      return url;
    }
    
    const start = url.substring(0, maxLength / 2);
    const end = url.substring(url.length - maxLength / 2);
    return `${start}...${end}`;
  }

  /**
   * Get browser information from current environment
   */
  private getBrowserInfo(): BrowserInfo {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    
    // Simple browser detection
    let name = 'Unknown';
    let version = 'Unknown';
    
    if (userAgent.includes('Chrome')) {
      name = 'Chrome';
      const match = userAgent.match(/Chrome\/([0-9.]+)/);
      version = match ? match[1] : 'Unknown';
    } else if (userAgent.includes('Firefox')) {
      name = 'Firefox';
      const match = userAgent.match(/Firefox\/([0-9.]+)/);
      version = match ? match[1] : 'Unknown';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      name = 'Safari';
      const match = userAgent.match(/Version\/([0-9.]+)/);
      version = match ? match[1] : 'Unknown';
    } else if (userAgent.includes('Edge')) {
      name = 'Edge';
      const match = userAgent.match(/Edge\/([0-9.]+)/);
      version = match ? match[1] : 'Unknown';
    }

    return {
      name,
      version,
      userAgent,
      platform
    };
  }

  /**
   * Extract metrics from analysis results (fallback when no direct metrics available)
   */
  private extractMetricsFromAnalysis(_analysis: OverallHealth): AllMetrics {
    // This is a fallback method when we don't have direct access to AllMetrics
    // In practice, this should be passed in or retrieved from the analysis context
    return {
      navigation: {
        loadTime: 0,
        ttfb: 0,
        domContentLoaded: 0,
        available: false
      },
      resource: {
        totalSize: 0,
        resourceCount: 0,
        largestResource: { name: '', size: 0, type: '' },
        available: false
      },
      rendering: {
        firstPaint: 0,
        largestContentfulPaint: 0,
        available: false
      },
      network: {
        ajaxCount: 0,
        slowestRequest: { url: '', duration: 0 },
        available: false
      }
    };
  }

  /**
   * Get default thresholds (fallback when no thresholds available)
   */
  private getDefaultThresholds(): Thresholds {
    return {
      pageSize: 2 * 1024 * 1024, // 2MB
      loadTime: 3000, // 3 seconds
      ttfb: 800 // 800ms
    };
  }
}

// Export singleton instance for global use
export const reportGenerator = new ReportGenerator();