import { PageHealthAnalyzer } from './core/PageHealthAnalyzer';
import { ConfigurationManager } from './core/ConfigurationManager';

/**
 * Extension popup script that provides the user interface for the Page Health Analyzer
 */
class PopupController {
  private analyzer: PageHealthAnalyzer;
  private configManager: ConfigurationManager;
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
    const configBtn = document.getElementById('config-btn') as HTMLButtonElement;

    if (analyzeBtn) {
      analyzeBtn.addEventListener('click', () => this.handleAnalyzeClick());
    }

    if (configBtn) {
      configBtn.addEventListener('click', () => this.handleConfigClick());
    }
  }

  /**
   * Load initial state and perform automatic analysis if needed
   */
  private async loadInitialState(): Promise<void> {
    try {
      // Initialize configuration manager with Chrome storage
      await this.initializeConfiguration();
      
      // Automatically analyze the current page when popup opens
      await this.performAnalysis();
    } catch (error) {
      this.showError('Failed to initialize analyzer', error);
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
   * Handle configuration button click
   */
  private handleConfigClick(): void {
    this.showConfigurationPanel();
  }

  /**
   * Perform page health analysis and display results
   */
  private async performAnalysis(): Promise<void> {
    if (this.isAnalyzing) return;

    this.isAnalyzing = true;
    this.showLoadingState();
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
      } else {
        throw new Error(response?.error || 'No analysis results received');
      }

    } catch (error) {
      // If content script is not loaded, try to inject it
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab.id) {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });
          
          // Wait a bit for the content script to initialize
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Try the analysis again
          const response = await chrome.tabs.sendMessage(tab.id, { action: 'analyze' });
          if (response && response.success) {
            await this.displayResults(response.data);
          } else {
            throw new Error(response?.error || 'Analysis failed after content script injection');
          }
        }
      } catch (injectionError) {
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
    const resultsContainer = document.getElementById('results');
    if (!resultsContainer) return;

    try {
      if (!analysisData) {
        throw new Error('No analysis data received');
      }

      // Use the health data from the content script analysis
      const { health, rawMetrics } = analysisData;
      
      this.renderAnalysisResults(resultsContainer, health, rawMetrics);

    } catch (error) {
      this.showError('Failed to display results', error);
    }
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
   * Show loading state
   */
  private showLoadingState(): void {
    const resultsContainer = document.getElementById('results');
    if (resultsContainer) {
      resultsContainer.innerHTML = '<div class="loading">Analyzing page health...</div>';
    }
  }

  /**
   * Show error message
   */
  private showError(message: string, error: any): void {
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
   * Save configuration changes
   */
  private saveConfiguration(): void {
    try {
      const pageSizeInput = document.getElementById('pageSize') as HTMLInputElement;
      const loadTimeInput = document.getElementById('loadTime') as HTMLInputElement;
      const ttfbInput = document.getElementById('ttfb') as HTMLInputElement;

      if (pageSizeInput && loadTimeInput && ttfbInput) {
        const pageSize = parseFloat(pageSizeInput.value) * 1024 * 1024; // Convert MB to bytes
        const loadTime = parseFloat(loadTimeInput.value) * 1000; // Convert seconds to ms
        const ttfb = parseFloat(ttfbInput.value) * 1000; // Convert seconds to ms

        this.configManager.setThreshold('pageSize', pageSize);
        this.configManager.setThreshold('loadTime', loadTime);
        this.configManager.setThreshold('ttfb', ttfb);

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
      case 'PASS': return 'Excellent Performance';
      case 'WARN': return 'Good Performance';
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