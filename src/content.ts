import { PageHealthAnalyzer } from './core/PageHealthAnalyzer';

/**
 * Content script for the Page Health Analyzer extension
 * This script runs in the context of web pages and provides analysis capabilities
 */
class ContentScriptAnalyzer {
  private analyzer: PageHealthAnalyzer;
  private isAnalyzing: boolean = false;

  constructor() {
    this.analyzer = new PageHealthAnalyzer();
    this.setupMessageListener();
    console.log('Page Health Analyzer content script loaded');
  }

  /**
   * Set up message listener for communication with popup and background script
   */
  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep the message channel open for async response
    });
  }

  /**
   * Handle messages from popup or background script
   */
  private async handleMessage(message: any, _sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void): Promise<void> {
    try {
      switch (message.action) {
        case 'analyze':
          await this.performAnalysis(sendResponse);
          break;
        
        case 'getConfig':
          this.getConfiguration(sendResponse);
          break;
        
        case 'setConfig':
          this.setConfiguration(message.config, sendResponse);
          break;
        
        case 'ping':
          sendResponse({ success: true, message: 'Content script is ready' });
          break;
        
        default:
          sendResponse({ success: false, error: 'Unknown action: ' + message.action });
      }
    } catch (error) {
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      });
    }
  }

  /**
   * Perform comprehensive page health analysis
   */
  private async performAnalysis(sendResponse: (response: any) => void): Promise<void> {
    if (this.isAnalyzing) {
      sendResponse({ success: false, error: 'Analysis already in progress' });
      return;
    }

    this.isAnalyzing = true;

    try {
      // Force reload configuration from storage to get latest thresholds
      const configManager = this.analyzer.getConfigurationManager();
      await this.reloadConfigurationFromStorage(configManager);

      // Perform the analysis using our PageHealthAnalyzer
      const healthResult = await this.analyzer.analyzePageHealth();
      
      // Get additional formatted results
      const healthSummary = await this.analyzer.getHealthSummary();
      const metricDetails = await this.analyzer.getMetricDetails();
      const worstOffenders = await this.analyzer.getWorstOffenders();

      // Collect raw metrics for additional processing
      const rawMetrics = this.collectRawMetrics();

      sendResponse({
        success: true,
        data: {
          health: healthResult,
          summary: healthSummary,
          details: metricDetails,
          offenders: worstOffenders,
          rawMetrics,
          url: window.location.href,
          timestamp: Date.now(),
          userAgent: navigator.userAgent
        }
      });

    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Analysis failed',
        url: window.location.href,
        timestamp: Date.now()
      });
    } finally {
      this.isAnalyzing = false;
    }
  }

  /**
   * Reload configuration from browser storage to ensure latest thresholds
   */
  private async reloadConfigurationFromStorage(configManager: any): Promise<void> {
    try {
      // Use the configuration manager's async reload method to get the latest values from storage
      await configManager.reloadFromStorage();
    } catch (error) {
      console.warn('Failed to reload configuration from storage:', error);
      // Continue with existing configuration if reload fails
    }
  }

  /**
   * Collect raw performance metrics from the browser APIs
   */
  private collectRawMetrics(): any {
    try {
      const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const resourceTiming = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const paintTiming = performance.getEntriesByType('paint');

      return {
        navigation: {
          timing: navigationTiming ? {
            fetchStart: navigationTiming.fetchStart,
            domainLookupStart: navigationTiming.domainLookupStart,
            domainLookupEnd: navigationTiming.domainLookupEnd,
            connectStart: navigationTiming.connectStart,
            connectEnd: navigationTiming.connectEnd,
            requestStart: navigationTiming.requestStart,
            responseStart: navigationTiming.responseStart,
            responseEnd: navigationTiming.responseEnd,
            domContentLoadedEventStart: navigationTiming.domContentLoadedEventStart,
            domContentLoadedEventEnd: navigationTiming.domContentLoadedEventEnd,
            loadEventStart: navigationTiming.loadEventStart,
            loadEventEnd: navigationTiming.loadEventEnd
          } : null,
          available: !!navigationTiming
        },
        resources: {
          entries: resourceTiming.map(resource => ({
            name: resource.name,
            initiatorType: resource.initiatorType,
            transferSize: resource.transferSize,
            encodedBodySize: resource.encodedBodySize,
            decodedBodySize: resource.decodedBodySize,
            duration: resource.duration,
            startTime: resource.startTime,
            responseEnd: resource.responseEnd
          })),
          totalSize: resourceTiming.reduce((total, resource) => total + (resource.transferSize || 0), 0),
          count: resourceTiming.length,
          available: resourceTiming.length > 0
        },
        paint: {
          entries: paintTiming.map(paint => ({
            name: paint.name,
            startTime: paint.startTime
          })),
          available: paintTiming.length > 0
        },
        memory: (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
        } : null,
        connection: (navigator as any).connection ? {
          effectiveType: (navigator as any).connection.effectiveType,
          downlink: (navigator as any).connection.downlink,
          rtt: (navigator as any).connection.rtt
        } : null
      };
    } catch (error) {
      console.warn('Failed to collect raw metrics:', error);
      return { error: 'Failed to collect raw metrics' };
    }
  }

  /**
   * Get current configuration
   */
  private getConfiguration(sendResponse: (response: any) => void): void {
    try {
      const configManager = this.analyzer.getConfigurationManager();
      const thresholds = configManager.getThresholds();
      
      sendResponse({
        success: true,
        config: thresholds
      });
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get configuration'
      });
    }
  }

  /**
   * Set configuration
   */
  private setConfiguration(config: any, sendResponse: (response: any) => void): void {
    try {
      const configManager = this.analyzer.getConfigurationManager();
      
      if (config.pageSize !== undefined) {
        configManager.setThreshold('pageSize', config.pageSize);
      }
      if (config.loadTime !== undefined) {
        configManager.setThreshold('loadTime', config.loadTime);
      }
      if (config.ttfb !== undefined) {
        configManager.setThreshold('ttfb', config.ttfb);
      }
      
      sendResponse({
        success: true,
        message: 'Configuration updated successfully'
      });
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set configuration'
      });
    }
  }

  /**
   * Get page information for analysis context
   */
  public getPageInfo(): any {
    return {
      url: window.location.href,
      title: document.title,
      domain: window.location.hostname,
      protocol: window.location.protocol,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      documentReady: document.readyState
    };
  }

  /**
   * Inject analysis results into the page (for debugging)
   */
  public async injectResultsIntoPage(): Promise<void> {
    try {
      // Perform analysis and render results
      await this.analyzer.analyzePageHealth();
      
      // Create a floating results panel
      const resultsPanel = document.createElement('div');
      resultsPanel.id = 'page-health-results';
      resultsPanel.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        width: 300px;
        max-height: 400px;
        background: white;
        border: 2px solid #2563eb;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        overflow-y: auto;
      `;

      // Use our ResultsPresenter to render the results
      await this.analyzer.renderToContainer(resultsPanel);

      // Add close button
      const closeButton = document.createElement('button');
      closeButton.textContent = '×';
      closeButton.style.cssText = `
        position: absolute;
        top: 8px;
        right: 8px;
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #6b7280;
      `;
      closeButton.onclick = () => resultsPanel.remove();
      resultsPanel.appendChild(closeButton);

      // Remove existing panel if present
      const existingPanel = document.getElementById('page-health-results');
      if (existingPanel) {
        existingPanel.remove();
      }

      document.body.appendChild(resultsPanel);

    } catch (error) {
      console.error('Failed to inject results into page:', error);
    }
  }
}

// Initialize content script when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ContentScriptAnalyzer();
  });
} else {
  new ContentScriptAnalyzer();
}

// Export for potential use by other scripts
(window as any).PageHealthAnalyzer = ContentScriptAnalyzer;