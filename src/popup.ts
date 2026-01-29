import { PageHealthAnalyzer } from './core/PageHealthAnalyzer';
import { ConfigurationManager } from './core/ConfigurationManager';
import { createDashboardIntegration, DashboardIntegration } from './components/DashboardIntegration';

/**
 * Extension popup script that provides the user interface for Blackbox
 */
class PopupController {
  private analyzer: PageHealthAnalyzer;
  private configManager: ConfigurationManager;
  private dashboardIntegration: DashboardIntegration | null = null;
  private isAnalyzing: boolean = false;

  constructor() {
    this.analyzer = new PageHealthAnalyzer();
    this.configManager = this.analyzer.getConfigurationManager();
    this.initializeEventListeners();
    this.loadInitialState();
  }

  /**
   * Initialize event listeners for popup interactions
   */
  private initializeEventListeners(): void {
    const analyzeBtn = document.getElementById('analyze-btn') as HTMLButtonElement;

    if (analyzeBtn) {
      analyzeBtn.addEventListener('click', () => this.handleAnalyzeClick());
    }

    // Note: Configure button is now handled by VisualDashboard component
  }

  /**
   * Load initial state and perform automatic analysis if needed
   */
  private async loadInitialState(): Promise<void> {
    try {
      // Initialize the dashboard integration
      await this.initializeDashboard();
      
      // Initialize configuration manager with Chrome storage
      await this.initializeConfiguration();
      
      // Automatically analyze the current page when popup opens
      await this.performAnalysis();
    } catch (error) {
      this.showError('Failed to initialize analyzer', error);
    }
  }

  /**
   * Initialize the dashboard integration
   */
  private async initializeDashboard(): Promise<void> {
    try {
      const appContainer = document.getElementById('app');
      if (appContainer) {
        console.log('Initializing dashboard with config manager:', !!this.configManager);
        this.dashboardIntegration = await createDashboardIntegration(appContainer, this.configManager);
        
        if (this.dashboardIntegration.isReady()) {
          console.log('Dashboard integration initialized successfully');
          
          // Hide the original content since we're using the new dashboard
          const originalMain = document.getElementById('results');
          const originalFooter = document.querySelector('footer');
          
          if (originalMain) originalMain.style.display = 'none';
          if (originalFooter) originalFooter.style.display = 'none';
        } else {
          console.warn('Dashboard integration failed, falling back to original UI');
        }
      }
    } catch (error) {
      console.error('Failed to initialize dashboard:', error);
      // Continue with original UI as fallback
    }
  }

  /**
   * Initialize configuration manager with Chrome storage
   */
  private async initializeConfiguration(): Promise<void> {
    try {
      // Load configuration from Chrome storage
      const configManager = this.analyzer.getConfigurationManager();
      await configManager.reloadFromStorage();
    } catch (error) {
      console.warn('Failed to initialize configuration:', error);
    }
  }

  /**
   * Handle analyze button click
   */
  private async handleAnalyzeClick(): Promise<void> {
    if (this.isAnalyzing) return;
    
    await this.performAnalysis();
  }



  /**
   * Perform page health analysis and display results
   */
  private async performAnalysis(): Promise<void> {
    if (this.isAnalyzing) return;

    this.isAnalyzing = true;
    const analysisOperation = 'Analyzing page performance...';
    this.showLoadingState(analysisOperation);
    this.updateAnalyzeButton(true);

    try {
      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.id) {
        throw new Error('No active tab found');
      }

      // Send message to content script to perform analysis
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'analyze' });

      if (response && response.success) {
        await this.displayResults(response.data);
        this.hideLoadingState(analysisOperation);
      } else {
        throw new Error(response?.error || 'No analysis results received');
      }

    } catch (error) {
      // If content script is not loaded, try to inject it
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab.id) {
          // Show injection loading state
          const injectionOperation = 'Initializing analyzer...';
          this.showLoadingState(injectionOperation);
          
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });
          
          // Wait a bit for the content script to initialize
          await new Promise(resolve => setTimeout(resolve, 500));
          
          this.hideLoadingState(injectionOperation);
          
          // Try the analysis again
          const response = await chrome.tabs.sendMessage(tab.id, { action: 'analyze' });
          if (response && response.success) {
            await this.displayResults(response.data);
            this.hideLoadingState(analysisOperation);
          } else {
            throw new Error(response?.error || 'Analysis failed after content script injection');
          }
        }
      } catch (injectionError) {
        this.hideLoadingState(analysisOperation);
        this.showError('Analysis failed', error);
      }
    } finally {
      this.isAnalyzing = false;
      this.updateAnalyzeButton(false);
    }
  }

  /**
   * Display analysis results in the popup
   */
  private async displayResults(analysisData: any): Promise<void> {
    try {
      if (!analysisData) {
        throw new Error('No analysis data received');
      }

      console.log('Received analysis data:', analysisData);

      // Use the health data from the content script analysis
      const { health, rawMetrics } = analysisData;
      
      console.log('Raw metrics:', rawMetrics);
      
      // Transform raw metrics to AllMetrics format for ThresholdDisplay
      const transformedMetrics = this.transformRawMetrics(rawMetrics);
      
      console.log('Transformed metrics:', transformedMetrics);
      
      if (this.dashboardIntegration && this.dashboardIntegration.isReady()) {
        // Use the new dashboard - it integrates with ResultsPresenter functionality
        const thresholds = this.configManager.getThresholds();
        console.log('Using dashboard integration with thresholds:', thresholds);
        this.dashboardIntegration.updateAnalysisResults(health, transformedMetrics, thresholds);
      } else {
        console.log('Dashboard integration not ready, using fallback');
        // Fallback to original rendering using ResultsPresenter
        const resultsContainer = document.getElementById('results');
        if (resultsContainer) {
          // Show the original container
          resultsContainer.style.display = 'block';
          
          // Use ResultsPresenter through the integration layer
          if (this.dashboardIntegration) {
            const resultsPresenter = this.dashboardIntegration.getResultsPresenter();
            const thresholds = this.configManager.getThresholds();
            resultsPresenter.renderResults(resultsContainer, health, transformedMetrics, thresholds);
          } else {
            // Final fallback to manual rendering
            this.renderAnalysisResults(resultsContainer, health, rawMetrics);
          }
        }
      }

    } catch (error) {
      console.error('Error in displayResults:', error);
      this.showError('Failed to display results', error);
    }
  }

  /**
   * Transform raw metrics from content script to AllMetrics format
   */
  private transformRawMetrics(rawMetrics: any): any {
    if (!rawMetrics) {
      return this.getEmptyMetrics();
    }

    try {
      // Transform navigation metrics
      const navigation = {
        loadTime: 0,
        ttfb: 0,
        domContentLoaded: 0,
        available: false
      };

      if (rawMetrics.navigation?.available && rawMetrics.navigation.timing) {
        const timing = rawMetrics.navigation.timing;
        navigation.loadTime = timing.loadEventEnd - timing.fetchStart;
        navigation.ttfb = timing.responseStart - timing.fetchStart;
        navigation.domContentLoaded = timing.domContentLoadedEventEnd - timing.fetchStart;
        navigation.available = true;
      }

      // Transform resource metrics
      const resource = {
        totalSize: 0,
        resourceCount: 0,
        largestResource: {
          name: '',
          size: 0,
          type: ''
        },
        available: false
      };

      if (rawMetrics.resources?.available) {
        resource.totalSize = rawMetrics.resources.totalSize || 0;
        resource.resourceCount = rawMetrics.resources.count || 0;
        resource.available = true;

        // Find largest resource
        if (rawMetrics.resources.entries && rawMetrics.resources.entries.length > 0) {
          const largest = rawMetrics.resources.entries.reduce((prev: any, current: any) => {
            return (current.transferSize || 0) > (prev.transferSize || 0) ? current : prev;
          });
          
          resource.largestResource = {
            name: largest.name || 'Unknown',
            size: largest.transferSize || 0,
            type: largest.initiatorType || 'unknown'
          };
        }
      }

      // Transform rendering metrics
      const rendering = {
        firstPaint: 0,
        largestContentfulPaint: 0,
        available: false
      };

      if (rawMetrics.paint?.available && rawMetrics.paint.entries) {
        const firstPaintEntry = rawMetrics.paint.entries.find((entry: any) => entry.name === 'first-paint');
        const lcpEntry = rawMetrics.paint.entries.find((entry: any) => entry.name === 'largest-contentful-paint');
        
        if (firstPaintEntry) {
          rendering.firstPaint = firstPaintEntry.startTime;
          rendering.available = true;
        }
        
        if (lcpEntry) {
          rendering.largestContentfulPaint = lcpEntry.startTime;
          rendering.available = true;
        }
      }

      // Transform network metrics (basic implementation)
      const network = {
        ajaxCount: 0,
        slowestRequest: {
          url: '',
          duration: 0
        },
        available: false
      };

      // For now, we'll estimate network activity from resource entries
      if (rawMetrics.resources?.entries) {
        const apiRequests = rawMetrics.resources.entries.filter((entry: any) => 
          entry.initiatorType === 'xmlhttprequest' || 
          entry.initiatorType === 'fetch' ||
          entry.name.includes('/api/') ||
          entry.name.includes('.json')
        );
        
        network.ajaxCount = apiRequests.length;
        
        if (apiRequests.length > 0) {
          const slowest = apiRequests.reduce((prev: any, current: any) => {
            return (current.duration || 0) > (prev.duration || 0) ? current : prev;
          });
          
          network.slowestRequest = {
            url: slowest.name || 'Unknown',
            duration: slowest.duration || 0
          };
          network.available = true;
        }
      }

      return {
        navigation,
        resource,
        rendering,
        network
      };

    } catch (error) {
      console.error('Failed to transform raw metrics:', error);
      return this.getEmptyMetrics();
    }
  }

  /**
   * Get empty metrics structure when data is unavailable
   */
  private getEmptyMetrics(): any {
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
        largestResource: {
          name: '',
          size: 0,
          type: ''
        },
        available: false
      },
      rendering: {
        firstPaint: 0,
        largestContentfulPaint: 0,
        available: false
      },
      network: {
        ajaxCount: 0,
        slowestRequest: {
          url: '',
          duration: 0
        },
        available: false
      }
    };
  }

  /**
   * Render analysis results in the popup
   */
  private renderAnalysisResults(container: HTMLElement, health: any, rawMetrics: any): void {
    container.innerHTML = `
      <div class="health-status ${health.status.toLowerCase()}">
        <div class="status-badge">${this.getStatusEmoji(health.status)}</div>
        <div class="status-text">
          <div class="status-title">${this.getStatusText(health.status)}</div>
          <div class="status-score">Score: ${health.score}/100</div>
        </div>
      </div>

      <div class="metrics-section">
        <h3>Performance Metrics</h3>
        ${rawMetrics?.navigation?.available ? `
          <div class="metric">
            <span class="metric-name">Load Time</span>
            <span class="metric-value">${this.formatTime(rawMetrics.navigation.timing?.loadEventEnd - rawMetrics.navigation.timing?.fetchStart || 0)}</span>
          </div>
          <div class="metric">
            <span class="metric-name">Time to First Byte</span>
            <span class="metric-value">${this.formatTime(rawMetrics.navigation.timing?.responseStart - rawMetrics.navigation.timing?.fetchStart || 0)}</span>
          </div>
          <div class="metric">
            <span class="metric-name">DOM Content Loaded</span>
            <span class="metric-value">${this.formatTime(rawMetrics.navigation.timing?.domContentLoadedEventEnd - rawMetrics.navigation.timing?.fetchStart || 0)}</span>
          </div>
        ` : '<div class="metric-unavailable">Navigation metrics unavailable</div>'}
        
        ${rawMetrics?.resources?.available ? `
          <div class="metric">
            <span class="metric-name">Total Page Size</span>
            <span class="metric-value">${this.formatSize(rawMetrics.resources.totalSize)}</span>
          </div>
          <div class="metric">
            <span class="metric-name">Resources Loaded</span>
            <span class="metric-value">${rawMetrics.resources.count}</span>
          </div>
        ` : ''}
      </div>

      ${health.worstOffenders && health.worstOffenders.length > 0 ? `
        <div class="worst-offenders">
          <h3>Issues Found</h3>
          ${health.worstOffenders.map((offender: string) => `
            <div class="offender">${offender}</div>
          `).join('')}
        </div>
      ` : ''}
    `;
  }

  /**
   * Execute an operation with loading indicator for operations >500ms
   * Implements requirement 10.5 for loading indicators
   */
  private async executeWithLoadingIndicator<T>(
    operation: string,
    task: () => Promise<T>,
    minLoadingTime: number = 500
  ): Promise<T> {
    const startTime = Date.now();
    
    // Start loading indicator after 500ms if operation is still running
    const loadingTimeout = setTimeout(() => {
      this.showLoadingState(operation);
    }, minLoadingTime);

    try {
      const result = await task();
      
      // Clear the loading timeout
      clearTimeout(loadingTimeout);
      
      // If we showed loading, hide it
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime >= minLoadingTime) {
        this.hideLoadingState(operation);
      }
      
      return result;
    } catch (error) {
      clearTimeout(loadingTimeout);
      this.hideLoadingState(operation);
      throw error;
    }
  }
  private showLoadingState(operation: string = 'Loading...'): void {
    if (this.dashboardIntegration && this.dashboardIntegration.isReady()) {
      this.dashboardIntegration.showLoading(operation);
    } else {
      // Fallback to original loading state
      const resultsContainer = document.getElementById('results');
      if (resultsContainer) {
        resultsContainer.innerHTML = `<div class="loading">${operation}</div>`;
      }
    }
  }

  /**
   * Hide loading state with operation tracking
   */
  private hideLoadingState(operation?: string): void {
    if (this.dashboardIntegration && this.dashboardIntegration.isReady()) {
      this.dashboardIntegration.hideLoading(operation);
    } else {
      // Loading will be hidden when results are displayed in fallback mode
      // No specific action needed here
    }
  }

  /**
   * Show error message
   */
  private showError(message: string, error: any): void {
    if (this.dashboardIntegration && this.dashboardIntegration.isReady()) {
      this.dashboardIntegration.showError(message, error);
    } else {
      // Fallback to original error display
      const resultsContainer = document.getElementById('results');
      if (resultsContainer) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        resultsContainer.innerHTML = `
          <div class="health-status fail">
            <div class="status-badge">❌</div>
            <div class="status-text">
              <div class="status-title">${message}</div>
              <div class="status-score">${errorMessage}</div>
            </div>
          </div>
        `;
      }
    }
  }

  /**
   * Update analyze button state
   */
  private updateAnalyzeButton(isAnalyzing: boolean): void {
    const analyzeBtn = document.getElementById('analyze-btn') as HTMLButtonElement;
    if (analyzeBtn) {
      analyzeBtn.disabled = isAnalyzing;
      analyzeBtn.textContent = isAnalyzing ? 'Analyzing...' : 'Analyze Page';
    }
  }

  /**
   * Show configuration panel
   */
  private showConfigurationPanel(): void {
    const resultsContainer = document.getElementById('results');
    if (!resultsContainer) return;

    const thresholds = this.configManager.getThresholds();
    
    resultsContainer.innerHTML = `
      <div class="config-panel">
        <h3>Configuration</h3>
        <div class="config-section">
          <label for="pageSize">Page Size Threshold (MB)</label>
          <input type="number" id="pageSize" value="${(thresholds.pageSize / (1024 * 1024)).toFixed(1)}" step="0.1" min="0.1">
        </div>
        <div class="config-section">
          <label for="loadTime">Load Time Threshold (seconds)</label>
          <input type="number" id="loadTime" value="${(thresholds.loadTime / 1000).toFixed(1)}" step="0.1" min="0.1">
        </div>
        <div class="config-section">
          <label for="ttfb">TTFB Threshold (seconds)</label>
          <input type="number" id="ttfb" value="${(thresholds.ttfb / 1000).toFixed(1)}" step="0.1" min="0.1">
        </div>
        <div class="config-actions">
          <button id="save-config">Save</button>
          <button id="reset-config">Reset to Defaults</button>
          <button id="back-to-results">Back to Results</button>
        </div>
      </div>
    `;

    // Add event listeners for config panel
    this.setupConfigPanelListeners();
  }

  /**
   * Setup event listeners for configuration panel
   */
  private setupConfigPanelListeners(): void {
    const saveBtn = document.getElementById('save-config');
    const resetBtn = document.getElementById('reset-config');
    const backBtn = document.getElementById('back-to-results');

    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveConfiguration());
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetConfiguration());
    }

    if (backBtn) {
      backBtn.addEventListener('click', () => this.performAnalysis());
    }
  }

  /**
   * Save configuration changes with loading indicator
   */
  private async saveConfiguration(): Promise<void> {
    try {
      const pageSizeInput = document.getElementById('pageSize') as HTMLInputElement;
      const loadTimeInput = document.getElementById('loadTime') as HTMLInputElement;
      const ttfbInput = document.getElementById('ttfb') as HTMLInputElement;

      if (pageSizeInput && loadTimeInput && ttfbInput) {
        const pageSize = parseFloat(pageSizeInput.value) * 1024 * 1024; // Convert MB to bytes
        const loadTime = parseFloat(loadTimeInput.value) * 1000; // Convert seconds to ms
        const ttfb = parseFloat(ttfbInput.value) * 1000; // Convert seconds to ms

        // Use loading indicator for configuration save
        await this.executeWithLoadingIndicator('Saving configuration...', async () => {
          this.configManager.setThreshold('pageSize', pageSize);
          this.configManager.setThreshold('loadTime', loadTime);
          this.configManager.setThreshold('ttfb', ttfb);
          
          // Simulate async save operation (in case Chrome storage is slow)
          await new Promise(resolve => setTimeout(resolve, 100));
        });

        // Show success message briefly
        const saveBtn = document.getElementById('save-config');
        if (saveBtn) {
          const originalText = saveBtn.textContent;
          saveBtn.textContent = 'Saved!';
          setTimeout(() => {
            if (saveBtn) saveBtn.textContent = originalText;
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Failed to save configuration:', error);
      this.showError('Failed to save configuration', error);
    }
  }

  /**
   * Reset configuration to defaults
   */
  private resetConfiguration(): void {
    this.configManager.resetToDefaults();
    this.showConfigurationPanel(); // Refresh the panel with default values
  }

  // Helper methods for formatting and status determination
  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'PASS': return '✅';
      case 'WARN': return '⚠️';
      case 'FAIL': return '❌';
      default: return '❓';
    }
  }

  private getStatusText(status: string): string {
    switch (status) {
      case 'PASS': return 'Good Performance';
      case 'WARN': return 'Fair Performance';
      case 'FAIL': return 'Poor Performance';
      default: return 'Unknown Status';
    }
  }

  private formatTime(milliseconds: number): string {
    if (milliseconds >= 1000) {
      return `${(milliseconds / 1000).toFixed(2)}s`;
    } else {
      return `${Math.round(milliseconds)}ms`;
    }
  }

  private formatSize(bytes: number): string {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    } else if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else {
      return `${bytes} B`;
    }
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});