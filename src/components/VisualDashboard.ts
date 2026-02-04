/**
 * VisualDashboard - Enhanced popup interface with expandable capabilities
 * 
 * This class provides the main user interface for Blackbox Phase 2, featuring
 * expandable views, smooth transitions, and enhanced metrics display with
 * threshold visualization and branding integration.
 */

import { 
  VisualDashboard as IVisualDashboard, 
  ViewMode, 
  LoadingState,
  UIEvent,
  UIEventType,
  EventHandler,
  Phase2Error,
  Phase2ErrorType,
  ChartJSChart,
  ReportMetadata,
  BrowserInfo
} from '../types/phase2';
import { AllMetrics, Thresholds, OverallHealth, HealthStatus } from '../types/index';
import { AssetManager } from '../services/AssetManager';
import { ThresholdDisplay } from './ThresholdDisplay';
import { ChartEngine } from './ChartEngine';
import { ProfileList } from './ProfileList';
import { reportGenerator } from '../services/ReportGenerator';
import { exportEngine } from '../services/ExportEngine';
import { profileManager } from '../services/ProfileManager';

export class VisualDashboard implements IVisualDashboard {
  private viewMode: ViewMode;
  private assetManager: AssetManager;
  private loadingState: LoadingState;
  private eventHandlers: Map<UIEventType, EventHandler[]>;
  private currentMetrics: AllMetrics | null = null;
  private currentThresholds: Thresholds | null = null;
  private currentHealth: OverallHealth | null = null;
  private thresholdDisplay: ThresholdDisplay;
  private chartEngine: ChartEngine;
  private profileList: ProfileList;
  private chartsVisible: boolean = false;
  private activeCharts: ChartJSChart[] = [];
  private configurationManager: any = null;

  constructor(containerElement: HTMLElement, assetManager: AssetManager, configurationManager?: any) {
    this.assetManager = assetManager;
    this.configurationManager = configurationManager;
    this.eventHandlers = new Map();
    this.loadingState = { isLoading: false, operation: '' };
    this.thresholdDisplay = new ThresholdDisplay(assetManager);
    this.chartEngine = new ChartEngine(assetManager);
    this.profileList = new ProfileList(assetManager);
    
    this.viewMode = {
      isExpanded: true, // Default to expanded
      containerElement,
      dimensions: { width: 800, height: 600 } // Start with expanded dimensions
    };

    this.initializeContainer();
    this.setupEventListeners();
  }

  /**
   * Update the metrics display with threshold comparison
   */
  public updateMetricsDisplay(metrics: AllMetrics, thresholds: Thresholds): void {
    this.currentMetrics = metrics;
    this.currentThresholds = thresholds;
    
    // Update the metrics section - this will be handled by renderContent()
    this.renderContent();
  }

  /**
   * Update the dashboard with complete analysis results
   */
  public updateAnalysisResults(health: OverallHealth, metrics: AllMetrics, thresholds: Thresholds): void {
    this.currentHealth = health;
    this.currentMetrics = metrics;
    this.currentThresholds = thresholds;
    
    this.renderContent();
    
    // Re-render charts if they were visible
    if (this.chartsVisible) {
      setTimeout(() => this.renderChartsSection(), 100);
    }
  }

  /**
   * Clean up dashboard resources
   */
  public cleanup(): void {
    // Clean up charts
    this.cleanupCharts();
    
    // Clean up chart engine
    if (this.chartEngine) {
      this.chartEngine.destroyAllCharts();
    }
    
    // Clean up profile list
    if (this.profileList) {
      this.profileList.clear();
    }
    
    // Clear event handlers
    this.eventHandlers.clear();
    
    // Reset state
    this.chartsVisible = false;
    this.currentMetrics = null;
    this.currentThresholds = null;
    this.currentHealth = null;
  }

  /**
   * Show loading indicator for operations
   */
  public showLoadingIndicator(operation: string): void {
    this.loadingState = { isLoading: true, operation };
    this.renderLoadingState();
  }

  /**
   * Hide loading indicator
   */
  public hideLoadingIndicator(): void {
    this.loadingState = { isLoading: false, operation: '' };
    if (this.currentHealth && this.currentMetrics && this.currentThresholds) {
      this.renderContent();
    }
  }

  /**
   * Add event listener for UI events
   */
  public addEventListener(eventType: UIEventType, handler: EventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  /**
   * Remove event listener
   */
  public removeEventListener(eventType: UIEventType, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Show charts section with analysis data
   */
  public showCharts(): void {
    if (!this.currentMetrics || !this.currentThresholds) {
      console.warn('Cannot show charts: no metrics data available');
      return;
    }

    try {
      this.chartsVisible = true;
      this.renderContent(); // Re-render content to include charts section
      this.renderChartsSection();
      this.emitEvent('show_charts');
    } catch (error) {
      this.handleError('CHART_RENDERING_ERROR', 'Failed to show charts', error);
    }
  }

  /**
   * Hide charts section
   */
  public hideCharts(): void {
    try {
      this.chartsVisible = false;
      this.cleanupCharts();
      this.renderContent(); // Re-render content to remove charts section and update button text
      this.emitEvent('hide_charts');
    } catch (error) {
      this.handleError('CHART_RENDERING_ERROR', 'Failed to hide charts', error);
    }
  }

  /**
   * Toggle charts visibility
   */
  public toggleCharts(): void {
    if (this.chartsVisible) {
      this.hideCharts();
    } else {
      this.showCharts();
    }
  }

  /**
   * Show profiles panel inline
   */
  public showProfilesPanel(): void {
    try {
      this.showInlinePanel('profiles');
    } catch (error) {
      console.error('Failed to show profiles panel:', error);
      this.handleError('UI_EXPANSION_ERROR', 'Failed to show profiles panel', error);
    }
  }

  /**
   * Show configuration panel inline
   */
  public showConfigurationPanel(): void {
    try {
      this.showInlinePanel('configuration');
    } catch (error) {
      console.error('Failed to show configuration panel:', error);
      this.handleError('UI_EXPANSION_ERROR', 'Failed to show configuration panel', error);
    }
  }

  /**
   * Show inline panel (configuration or profiles)
   */
  private showInlinePanel(panelType: 'configuration' | 'profiles'): void {
    const contentArea = this.viewMode.containerElement.querySelector('.blackbox-content-area') as HTMLElement;
    if (!contentArea) return;

    if (panelType === 'configuration') {
      this.renderConfigurationPanel(contentArea);
    } else if (panelType === 'profiles') {
      this.renderProfilesPanel(contentArea);
    }
  }
  /**
   * Render configuration panel inline
   */
  private renderConfigurationPanel(container: HTMLElement): void {
    const configManager = this.getConfigurationManager();
    const thresholds = configManager ? configManager.getThresholds() : this.getDefaultThresholds();
    
    container.innerHTML = `
      <div class="blackbox-config-panel">
        <div class="blackbox-panel-header">
          <h2 class="blackbox-panel-title">Configuration</h2>
          <button class="blackbox-back-btn" id="back-to-results">
            <span class="blackbox-btn-icon">←</span>
            Back to Results
          </button>
        </div>
        
        <div class="blackbox-config-content">
          <div class="blackbox-config-section">
            <h3 class="blackbox-config-section-title">Performance Thresholds</h3>
            <p class="blackbox-config-description">
              Configure the thresholds used to evaluate page performance. Values exceeding these thresholds will be flagged as warnings or failures.
            </p>
            
            <div class="blackbox-config-grid">
              <div class="blackbox-config-item">
                <label for="pageSize" class="blackbox-config-label">Page Size Threshold (MB)</label>
                <input type="number" id="pageSize" class="blackbox-config-input" 
                       value="${(thresholds.pageSize / (1024 * 1024)).toFixed(1)}" 
                       step="0.1" min="0.1" max="50">
                <div class="blackbox-config-help">Maximum acceptable total page size</div>
              </div>
              
              <div class="blackbox-config-item">
                <label for="loadTime" class="blackbox-config-label">Load Time Threshold (seconds)</label>
                <input type="number" id="loadTime" class="blackbox-config-input" 
                       value="${(thresholds.loadTime / 1000).toFixed(1)}" 
                       step="0.1" min="0.1" max="30">
                <div class="blackbox-config-help">Maximum acceptable page load time</div>
              </div>
              
              <div class="blackbox-config-item">
                <label for="ttfb" class="blackbox-config-label">TTFB Threshold (seconds)</label>
                <input type="number" id="ttfb" class="blackbox-config-input" 
                       value="${(thresholds.ttfb / 1000).toFixed(1)}" 
                       step="0.1" min="0.1" max="10">
                <div class="blackbox-config-help">Maximum acceptable Time to First Byte</div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="blackbox-config-actions">
          <button class="blackbox-config-btn blackbox-btn-primary" id="save-config">
            <span class="blackbox-btn-icon">💾</span>
            Save Configuration
          </button>
          <button class="blackbox-config-btn blackbox-btn-secondary" id="reset-config">
            <span class="blackbox-btn-icon">🔄</span>
            Reset to Defaults
          </button>
        </div>
        
        <div class="blackbox-config-feedback" id="config-feedback" style="display: none;">
          <span class="blackbox-feedback-icon">✅</span>
          <span class="blackbox-feedback-text">Configuration saved successfully!</span>
        </div>
      </div>
    `;

    // Setup event listeners for the configuration panel
    this.setupConfigPanelListeners();
  }

  /**
   * Render profiles panel inline
   */
  private renderProfilesPanel(container: HTMLElement): void {
    container.innerHTML = `
      <div class="blackbox-profiles-panel">
        <div class="blackbox-panel-header">
          <h2 class="blackbox-panel-title">Saved Profiles</h2>
          <button class="blackbox-back-btn" id="back-to-results">
            <span class="blackbox-btn-icon">←</span>
            Back to Results
          </button>
        </div>
        
        <div class="blackbox-profiles-content">
          <div class="blackbox-profiles-loading">
            <div class="blackbox-loading-spinner"></div>
            <div class="blackbox-loading-text">Loading saved profiles...</div>
          </div>
        </div>
      </div>
    `;

    // Load and render profiles
    this.loadAndRenderProfiles();
  }

  /**
   * Load and render saved profiles
   */
  private async loadAndRenderProfiles(): Promise<void> {
    try {
      const profiles = await profileManager.getProfiles();
      const profilesContent = this.viewMode.containerElement.querySelector('.blackbox-profiles-content') as HTMLElement;
      
      if (!profilesContent) return;

      if (profiles.length === 0) {
        profilesContent.innerHTML = `
          <div class="blackbox-empty-profiles">
            <div class="blackbox-empty-icon">📊</div>
            <div class="blackbox-empty-title">No Saved Profiles</div>
            <div class="blackbox-empty-description">
              Analyze pages and save profiles to see them here. Profiles help you track performance over time.
            </div>
          </div>
        `;
        return;
      }

      // Render profiles list
      profilesContent.innerHTML = `
        <div class="blackbox-profiles-list">
          ${profiles.map((profile: any) => `
            <div class="blackbox-profile-item" data-profile-id="${profile.id}">
              <div class="blackbox-profile-header">
                <div class="blackbox-profile-url">${profile.url}</div>
                <div class="blackbox-profile-date">${new Date(profile.timestamp).toLocaleDateString()}</div>
              </div>
              <div class="blackbox-profile-details">
                <div class="blackbox-profile-score ${profile.analysis.status.toLowerCase()}">
                  <span class="blackbox-score-badge">${this.getStatusEmoji(profile.analysis.status)}</span>
                  <span class="blackbox-score-text">${profile.analysis.score}/100</span>
                </div>
                <div class="blackbox-profile-actions">
                  <button class="blackbox-profile-action-btn print-profile-btn" data-profile-id="${profile.id}">
                    <span class="blackbox-btn-icon">🖨️</span>
                    Print Report
                  </button>
                  <button class="blackbox-profile-action-btn delete-profile-btn delete" data-profile-id="${profile.id}">
                    <span class="blackbox-btn-icon">🗑️</span>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;

      // Setup profile event listeners
      this.setupProfileEventListeners();

    } catch (error) {
      console.error('Failed to load profiles:', error);
      const profilesContent = this.viewMode.containerElement.querySelector('.blackbox-profiles-content') as HTMLElement;
      if (profilesContent) {
        profilesContent.innerHTML = `
          <div class="blackbox-profiles-error">
            <div class="blackbox-error-icon">❌</div>
            <div class="blackbox-error-title">Failed to Load Profiles</div>
            <div class="blackbox-error-message">Unable to load saved profiles. Please try again.</div>
            <button class="blackbox-retry-btn">
              Retry
            </button>
          </div>
        `;
      }
    }
  }

  /**
   * Setup event listeners for configuration panel
   */
  private setupConfigPanelListeners(): void {
    const container = this.viewMode.containerElement;

    // Back to results button
    const backBtn = container.querySelector('#back-to-results') as HTMLButtonElement;
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (this.currentHealth && this.currentMetrics && this.currentThresholds) {
          this.renderContent();
        } else {
          this.renderEmptyState();
        }
      });
    }

    // Save configuration button
    const saveBtn = container.querySelector('#save-config') as HTMLButtonElement;
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveConfiguration());
    }

    // Reset configuration button
    const resetBtn = container.querySelector('#reset-config') as HTMLButtonElement;
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetConfiguration());
    }
  }

  /**
   * Setup event listeners for profiles panel
   */
  private setupProfileEventListeners(): void {
    const container = this.viewMode.containerElement;

    // Back to results button
    const backBtn = container.querySelector('#back-to-results') as HTMLButtonElement;
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (this.currentHealth && this.currentMetrics && this.currentThresholds) {
          this.renderContent();
        } else {
          this.renderEmptyState();
        }
      });
    }

    // Use event delegation for profile action buttons
    const profilesContent = container.querySelector('.blackbox-profiles-content') as HTMLElement;
    if (profilesContent) {
      profilesContent.addEventListener('click', (event) => {
        console.log('📋 Profiles content clicked:', event.target);
        const target = event.target as HTMLElement;
        const button = target.closest('.blackbox-profile-action-btn') as HTMLButtonElement;
        
        if (button) {
          console.log('🔘 Profile action button found:', button);
          const profileId = button.getAttribute('data-profile-id');
          console.log('🆔 Profile ID:', profileId);
          if (!profileId) return;

          if (button.classList.contains('print-profile-btn')) {
            console.log('🖨️ Print profile button detected');
            event.preventDefault();
            event.stopPropagation();
            this.printProfile(profileId);
          } else if (button.classList.contains('delete-profile-btn')) {
            console.log('🗑️ Delete profile button detected');
            event.preventDefault();
            event.stopPropagation();
            this.deleteProfile(profileId);
          }
        } else {
          console.log('❌ No profile action button found');
        }
      });
    } else {
      console.log('❌ Profiles content not found');
    }

    // Retry profiles button
    container.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target.classList.contains('blackbox-retry-btn')) {
        event.preventDefault();
        event.stopPropagation();
        this.loadAndRenderProfiles();
      }
    });
  }
  /**
   * Print a PDF report for a specific profile
   */
  private async printProfile(profileId: string): Promise<void> {
    try {
      console.log('🖨️ Print Profile button clicked for profileId:', profileId);
      
      const profiles = await profileManager.getProfiles();
      const profile = profiles.find(p => p.id === profileId);
      
      if (!profile) {
        console.log('Profile not found:', profileId);
        this.showProfileFeedback('Profile not found', 'error');
        return;
      }

      console.log('Profile found:', profile);

      // Show loading feedback
      this.showProfileFeedback('Generating PDF report...', 'info');

      // Check if PDF generation is supported
      const isSupported = exportEngine.isSupported();
      console.log('PDF generation supported:', isSupported);
      
      if (!isSupported) {
        console.log('PDF generation not supported, falling back to text report');
        // Fallback to text report download
        await this.downloadTextReport(profile);
        return;
      }

      console.log('Starting PDF generation...');

      try {
        // Generate report data from the profile
        const reportData = await profileManager.exportProfile(profileId);
        console.log('Report data generated:', reportData);

        // Generate PDF
        const pdfBlob = await exportEngine.generatePDF(reportData, []);
        console.log('PDF blob generated:', pdfBlob);

        // Download the PDF
        const filename = `blackbox-profile-${new Date(profile.timestamp).toISOString().split('T')[0]}.pdf`;
        console.log('Downloading PDF with filename:', filename);
        
        exportEngine.downloadPDF(pdfBlob, filename);

        // Show success feedback
        this.showProfileFeedback('PDF report downloaded successfully!', 'success');
      } catch (pdfError) {
        console.error('PDF generation failed, falling back to text report:', pdfError);
        // Fallback to text report if PDF generation fails
        await this.downloadTextReport(profile);
        return;
      }

      // Emit event for external handling
      this.emitEvent('expand_dashboard', { 
        action: 'print_profile',
        profileId, 
        filename: `blackbox-profile-${new Date(profile.timestamp).toISOString().split('T')[0]}.pdf`,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Failed to print profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate PDF report';
      this.showProfileFeedback(errorMessage, 'error');
    }
  }

  /**
   * Download a text report as fallback when PDF generation fails
   */
  private async downloadTextReport(profile: any): Promise<void> {
    try {
      // Generate text report from profile data
      const textReport = reportGenerator.generateTextReport(profile.analysis, {
        generatedAt: new Date(profile.timestamp),
        url: profile.url,
        browserInfo: this.getBrowserInfo(),
        reportType: 'text'
      });

      // Create and download text file
      const blob = new Blob([textReport], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const filename = `blackbox-profile-${new Date(profile.timestamp).toISOString().split('T')[0]}.txt`;
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 100);

      this.showProfileFeedback('Text report downloaded successfully! (PDF not available in extension)', 'success');
    } catch (error) {
      console.error('Failed to generate text report:', error);
      this.showProfileFeedback('Failed to generate report', 'error');
    }
  }

  /**
   * Delete a specific profile
   */
  private async deleteProfile(profileId: string): Promise<void> {
    try {
      console.log('🗑️ Delete Profile button clicked for profileId:', profileId);
      await profileManager.deleteProfile(profileId);
      this.showProfileFeedback('Profile deleted successfully', 'success');
      
      // Reload the profiles list
      setTimeout(() => {
        this.loadAndRenderProfiles();
      }, 1000);
    } catch (error) {
      console.error('Failed to delete profile:', error);
      this.showProfileFeedback('Failed to delete profile', 'error');
    }
  }

  /**
   * Save configuration changes
   */
  private async saveConfiguration(): Promise<void> {
    try {
      const container = this.viewMode.containerElement;
      const pageSizeInput = container.querySelector('#pageSize') as HTMLInputElement;
      const loadTimeInput = container.querySelector('#loadTime') as HTMLInputElement;
      const ttfbInput = container.querySelector('#ttfb') as HTMLInputElement;

      if (!pageSizeInput || !loadTimeInput || !ttfbInput) {
        throw new Error('Configuration inputs not found');
      }

      // Show loading state
      this.setConfigButtonLoading('save', true);

      const configManager = this.getConfigurationManager();
      if (!configManager) {
        throw new Error('Configuration manager not available');
      }

      // Convert values to appropriate units
      const pageSize = parseFloat(pageSizeInput.value) * 1024 * 1024; // MB to bytes
      const loadTime = parseFloat(loadTimeInput.value) * 1000; // seconds to ms
      const ttfb = parseFloat(ttfbInput.value) * 1000; // seconds to ms

      // Validate inputs
      if (isNaN(pageSize) || pageSize <= 0) {
        throw new Error('Invalid page size value');
      }
      if (isNaN(loadTime) || loadTime <= 0) {
        throw new Error('Invalid load time value');
      }
      if (isNaN(ttfb) || ttfb <= 0) {
        throw new Error('Invalid TTFB value');
      }

      // Save thresholds
      configManager.setThreshold('pageSize', pageSize);
      configManager.setThreshold('loadTime', loadTime);
      configManager.setThreshold('ttfb', ttfb);

      // Update current thresholds
      this.currentThresholds = configManager.getThresholds();

      // Show success feedback
      this.showConfigFeedback('Configuration saved successfully!', 'success');

    } catch (error) {
      console.error('Failed to save configuration:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save configuration';
      this.showConfigFeedback(errorMessage, 'error');
    } finally {
      this.setConfigButtonLoading('save', false);
    }
  }

  /**
   * Reset configuration to defaults
   */
  private resetConfiguration(): void {
    try {
      this.setConfigButtonLoading('reset', true);
      
      const configManager = this.getConfigurationManager();
      if (configManager) {
        configManager.resetToDefaults();
        this.currentThresholds = configManager.getThresholds();
      }

      // Re-render the configuration panel with default values
      const contentArea = this.viewMode.containerElement.querySelector('.blackbox-content-area') as HTMLElement;
      if (contentArea) {
        this.renderConfigurationPanel(contentArea);
      }

      this.showConfigFeedback('Configuration reset to defaults', 'success');
    } catch (error) {
      console.error('Failed to reset configuration:', error);
      this.showConfigFeedback('Failed to reset configuration', 'error');
    } finally {
      this.setConfigButtonLoading('reset', false);
    }
  }
  /**
   * Show configuration feedback
   */
  private showConfigFeedback(message: string, type: 'success' | 'error' | 'info'): void {
    const feedbackElement = this.viewMode.containerElement.querySelector('#config-feedback') as HTMLElement;
    if (!feedbackElement) return;

    const iconElement = feedbackElement.querySelector('.blackbox-feedback-icon') as HTMLElement;
    const textElement = feedbackElement.querySelector('.blackbox-feedback-text') as HTMLElement;

    if (iconElement && textElement) {
      iconElement.textContent = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
      textElement.textContent = message;
      
      feedbackElement.className = `blackbox-config-feedback ${type}`;
      feedbackElement.style.display = 'flex';

      setTimeout(() => {
        feedbackElement.style.display = 'none';
      }, 3000);
    }
  }

  /**
   * Set loading state on configuration buttons
   */
  private setConfigButtonLoading(buttonType: 'save' | 'reset', isLoading: boolean): void {
    const buttonId = buttonType === 'save' ? 'save-config' : 'reset-config';
    const button = this.viewMode.containerElement.querySelector(`#${buttonId}`) as HTMLButtonElement;
    if (!button) return;

    if (isLoading) {
      button.disabled = true;
      button.classList.add('loading');
      const originalText = button.textContent;
      button.setAttribute('data-original-text', originalText || '');
      button.innerHTML = `
        <span class="blackbox-btn-icon">⏳</span>
        ${buttonType === 'save' ? 'Saving...' : 'Resetting...'}
      `;
    } else {
      button.disabled = false;
      button.classList.remove('loading');
      const originalText = button.getAttribute('data-original-text');
      if (originalText) {
        button.innerHTML = originalText;
      }
    }
  }

  /**
   * Get configuration manager (needs to be implemented by parent)
   */
  private getConfigurationManager(): any {
    if (!this.configurationManager) {
      console.warn('Configuration manager not available in VisualDashboard');
    }
    return this.configurationManager;
  }

  /**
   * Get default thresholds
   */
  private getDefaultThresholds(): any {
    return {
      pageSize: 2 * 1024 * 1024, // 2MB (matches ConfigurationManager defaults)
      loadTime: 5000, // 5 seconds (matches ConfigurationManager defaults)
      ttfb: 3000 // 3 seconds (matches ConfigurationManager defaults)
    };
  }

  /**
   * Handle save profile button click
   */
  private async handleSaveProfile(): Promise<void> {
    if (!this.currentHealth || !this.currentMetrics || !this.currentThresholds) {
      console.warn('Cannot save profile: no analysis data available');
      this.showProfileFeedback('No analysis data available to save', 'error');
      return;
    }

    try {
      // Show loading state
      this.setProfileButtonLoading(true);
      this.showProfileFeedback('Saving profile...', 'info');

      // Get current tab URL (not popup URL)
      let currentUrl = 'Unknown URL';
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        currentUrl = tab.url || 'Unknown URL';
      } catch (error) {
        console.warn('Could not get current tab URL:', error);
        // Fallback to window location if tabs API fails
        currentUrl = window.location?.href || 'Unknown URL';
      }

      // Save the profile
      const profileId = await profileManager.saveProfile(this.currentHealth, currentUrl);

      // Show success feedback
      this.showProfileFeedback('Profile saved successfully!', 'success');

      // Emit event for external handling
      this.emitEvent('save_profile', { 
        profileId, 
        url: currentUrl,
        timestamp: Date.now(),
        analysis: this.currentHealth 
      });

    } catch (error) {
      console.error('Failed to save profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save profile';
      this.showProfileFeedback(errorMessage, 'error');
      this.handleError('STORAGE_ERROR', 'Failed to save profile', error);
    } finally {
      // Reset button state
      this.setProfileButtonLoading(false);
    }
  }

  /**
   * Show profile operation feedback to user
   */
  private showProfileFeedback(message: string, type: 'success' | 'error' | 'info'): void {
    // Create feedback element if it doesn't exist
    let feedbackElement = this.viewMode.containerElement.querySelector('#profile-feedback') as HTMLElement;
    
    if (!feedbackElement) {
      const footerActions = this.viewMode.containerElement.querySelector('.blackbox-footer-actions');
      if (footerActions) {
        feedbackElement = document.createElement('div');
        feedbackElement.id = 'profile-feedback';
        feedbackElement.className = 'blackbox-profile-feedback';
        feedbackElement.innerHTML = `
          <span class="blackbox-feedback-icon">ℹ️</span>
          <span class="blackbox-feedback-text"></span>
        `;
        feedbackElement.style.display = 'none';
        footerActions.appendChild(feedbackElement);
      } else {
        return; // Can't show feedback without container
      }
    }

    const iconElement = feedbackElement.querySelector('.blackbox-feedback-icon') as HTMLElement;
    const textElement = feedbackElement.querySelector('.blackbox-feedback-text') as HTMLElement;

    if (iconElement && textElement) {
      // Update content
      iconElement.textContent = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
      textElement.textContent = message;
      
      // Update styling
      feedbackElement.className = `blackbox-profile-feedback ${type}`;
      feedbackElement.style.display = 'flex';

      // Auto-hide after appropriate time
      const hideDelay = type === 'info' ? 5000 : 3000;
      setTimeout(() => {
        feedbackElement.style.display = 'none';
      }, hideDelay);
    }
  }

  /**
   * Set loading state on save profile button
   */
  private setProfileButtonLoading(isLoading: boolean): void {
    const profileButton = this.viewMode.containerElement.querySelector('#save-profile-btn') as HTMLButtonElement;
    if (!profileButton) return;

    if (isLoading) {
      profileButton.disabled = true;
      profileButton.classList.add('loading');
      profileButton.innerHTML = `
        <span class="blackbox-btn-icon">⏳</span>
        Saving...
      `;
    } else {
      profileButton.disabled = false;
      profileButton.classList.remove('loading');
      profileButton.innerHTML = `Save Profile`;
    }
  }
  /**
   * Handle generate report button click
   */
  private async handleGenerateReport(): Promise<void> {
    if (!this.currentHealth || !this.currentMetrics || !this.currentThresholds) {
      console.warn('Cannot generate report: no analysis data available');
      this.showReportFeedback('No analysis data available', 'error');
      return;
    }

    try {
      // Show loading state on button
      this.setReportButtonLoading('generate', true);

      // Generate report metadata
      const metadata: ReportMetadata = {
        generatedAt: new Date(),
        url: window.location?.href || 'Unknown',
        browserInfo: this.getBrowserInfo(),
        reportType: 'text'
      };

      // Generate the text report
      const reportText = reportGenerator.generateTextReport(this.currentHealth, metadata);

      // Copy to clipboard
      await this.copyToClipboard(reportText);

      // Show success feedback
      this.showReportFeedback('Report copied to clipboard!', 'success');

      // Emit event for external handling
      this.emitEvent('generate_report', { reportText, metadata });

    } catch (error) {
      console.error('Failed to generate report:', error);
      this.showReportFeedback('Failed to generate report', 'error');
      this.handleError('UI_EXPANSION_ERROR', 'Failed to generate report', error);
    } finally {
      // Reset button state
      this.setReportButtonLoading('generate', false);
    }
  }

  /**
   * Handle print report button click
   */
  private async handlePrintReport(): Promise<void> {
    console.log('🖨️ Main Print Report button clicked');
    if (!this.currentHealth || !this.currentMetrics || !this.currentThresholds) {
      console.warn('Cannot generate PDF report: no analysis data available');
      this.showReportFeedback('No analysis data available', 'error');
      return;
    }

    try {
      // Show loading state on button
      this.setReportButtonLoading('print', true);
      this.showReportFeedback('Generating PDF report...', 'info');

      // Check if PDF generation is supported
      if (!exportEngine.isSupported()) {
        console.log('PDF generation not supported, falling back to text report');
        // Fallback to text report download
        await this.downloadCurrentAnalysisAsText();
        return;
      }

      try {
        // Generate report metadata
        const metadata: ReportMetadata = {
          generatedAt: new Date(),
          url: window.location?.href || 'Unknown',
          browserInfo: this.getBrowserInfo(),
          reportType: 'pdf'
        };

        // Generate structured report data
        const reportData = reportGenerator.generateStructuredReport(this.currentHealth);
        reportData.metadata = metadata;

        // Capture chart elements if charts are visible
        const chartElements: HTMLElement[] = [];
        if (this.chartsVisible) {
          const chartsContainer = this.viewMode.containerElement.querySelector('#blackbox-charts-container');
          if (chartsContainer) {
            const chartWrappers = chartsContainer.querySelectorAll('.blackbox-chart-wrapper');
            chartWrappers.forEach(wrapper => {
              const canvasContainer = wrapper.querySelector('.blackbox-chart-canvas-container');
              if (canvasContainer) {
                chartElements.push(canvasContainer as HTMLElement);
              }
            });
          }
        }

        // Generate PDF
        const pdfBlob = await exportEngine.generatePDF(reportData, chartElements);

        // Download the PDF
        const filename = `blackbox-report-${new Date().toISOString().split('T')[0]}.pdf`;
        exportEngine.downloadPDF(pdfBlob, filename);

        // Show success feedback
        this.showReportFeedback('PDF report downloaded successfully!', 'success');

        // Emit event for external handling
        this.emitEvent('export_pdf', { reportData, filename, fileSize: pdfBlob.size });
      } catch (pdfError) {
        console.error('PDF generation failed, falling back to text report:', pdfError);
        // Fallback to text report if PDF generation fails
        await this.downloadCurrentAnalysisAsText();
        return;
      }

    } catch (error) {
      console.error('Failed to generate PDF report:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate PDF report';
      this.showReportFeedback(errorMessage, 'error');
      this.handleError('PDF_GENERATION_ERROR', 'Failed to generate PDF report', error);
    } finally {
      // Reset button state
      this.setReportButtonLoading('print', false);
    }
  }

  /**
   * Download current analysis as text report (fallback when PDF fails)
   */
  private async downloadCurrentAnalysisAsText(): Promise<void> {
    try {
      if (!this.currentHealth) {
        throw new Error('No analysis data available');
      }

      // Generate text report
      const metadata: ReportMetadata = {
        generatedAt: new Date(),
        url: window.location?.href || 'Unknown',
        browserInfo: this.getBrowserInfo(),
        reportType: 'text'
      };

      const textReport = reportGenerator.generateTextReport(this.currentHealth, metadata);

      // Create and download text file
      const blob = new Blob([textReport], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const filename = `blackbox-report-${new Date().toISOString().split('T')[0]}.txt`;
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 100);

      this.showReportFeedback('Text report downloaded successfully! (PDF not available in extension)', 'success');
    } catch (error) {
      console.error('Failed to generate text report:', error);
      this.showReportFeedback('Failed to generate report', 'error');
    }
  }

  /**
   * Copy text to clipboard using modern Clipboard API with fallback
   */
  private async copyToClipboard(text: string): Promise<void> {
    try {
      // Try modern Clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return;
      }

      // Fallback to legacy method
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (!successful) {
        throw new Error('Copy command failed');
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      throw new Error('Failed to copy to clipboard. Please try again.');
    }
  }

  /**
   * Show report generation feedback to user
   */
  private showReportFeedback(message: string, type: 'success' | 'error' | 'info'): void {
    const feedbackElement = this.viewMode.containerElement.querySelector('#report-feedback') as HTMLElement;
    if (!feedbackElement) return;

    const iconElement = feedbackElement.querySelector('.blackbox-feedback-icon') as HTMLElement;
    const textElement = feedbackElement.querySelector('.blackbox-feedback-text') as HTMLElement;

    if (iconElement && textElement) {
      // Update content
      iconElement.textContent = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
      textElement.textContent = message;
      
      // Update styling
      feedbackElement.className = `blackbox-report-feedback ${type}`;
      feedbackElement.style.display = 'flex';

      // Auto-hide after 3 seconds for success/error, 5 seconds for info
      const hideDelay = type === 'info' ? 5000 : 3000;
      setTimeout(() => {
        feedbackElement.style.display = 'none';
      }, hideDelay);
    }
  }

  /**
   * Set loading state on report generation buttons
   */
  private setReportButtonLoading(buttonType: 'generate' | 'print', isLoading: boolean): void {
    const buttonId = buttonType === 'generate' ? 'generate-report-btn' : 'print-report-btn';
    const reportButton = this.viewMode.containerElement.querySelector(`#${buttonId}`) as HTMLButtonElement;
    if (!reportButton) return;

    const iconElement = reportButton.querySelector('.blackbox-btn-icon') as HTMLElement;
    
    if (isLoading) {
      reportButton.disabled = true;
      reportButton.classList.add('loading');
      
      if (buttonType === 'generate') {
        if (iconElement) iconElement.textContent = '⏳';
        // Update button text
        const textNode = Array.from(reportButton.childNodes).find(node => 
          node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
        );
        if (textNode) {
          textNode.textContent = 'Generating...';
        }
      } else {
        if (iconElement) iconElement.textContent = '⏳';
        // Update button text
        const textNode = Array.from(reportButton.childNodes).find(node => 
          node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
        );
        if (textNode) {
          textNode.textContent = 'Creating PDF...';
        }
      }
    } else {
      reportButton.disabled = false;
      reportButton.classList.remove('loading');
      
      if (buttonType === 'generate') {
        if (iconElement) iconElement.textContent = '📄';
        // Restore button text
        const textNode = Array.from(reportButton.childNodes).find(node => 
          node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
        );
        if (textNode) {
          textNode.textContent = 'Generate Report';
        }
      } else {
        if (iconElement) iconElement.textContent = '🖨️';
        // Restore button text
        const textNode = Array.from(reportButton.childNodes).find(node => 
          node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
        );
        if (textNode) {
          textNode.textContent = 'Print Report';
        }
      }
    }
  }

  /**
   * Get browser information for report metadata
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
   * Initialize the container with basic structure and branding
   */
  private initializeContainer(): void {
    const container = this.viewMode.containerElement;
    
    // Apply branding to container
    this.assetManager.applyBrandingToElement(container);
    
    // Add dashboard-specific classes
    container.classList.add('blackbox-dashboard');
    container.classList.add('blackbox-expanded-view'); // Start in expanded mode
    
    // Set initial dimensions and styles
    this.updateContainerStyles();
    
    // Create the basic structure
    this.createDashboardStructure();
  }

  /**
   * Create the basic dashboard structure
   */
  private createDashboardStructure(): void {
    const container = this.viewMode.containerElement;
    
    // Get version from Chrome runtime with fallback for test environment
    let version = '2.0.13'; // Default fallback version
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
        version = chrome.runtime.getManifest().version;
      }
    } catch (error) {
      // Fallback to default version in test environment or when Chrome APIs are unavailable
      console.warn('Chrome runtime not available, using fallback version');
    }
    
    container.innerHTML = `
      <div class="blackbox-dashboard-header">
        <div class="blackbox-header-content">
          <div class="blackbox-logo-title">
            <div class="blackbox-logo-container"></div>
            <h1 class="blackbox-title">Blackbox (${version})</h1>
          </div>
        </div>
      </div>
      <div class="blackbox-dashboard-main">
        <div class="blackbox-content-area">
          <!-- Content will be rendered here -->
        </div>
      </div>
      <div class="blackbox-dashboard-footer">
        <div class="blackbox-footer-actions">
          <!-- Action buttons will be rendered here -->
        </div>
      </div>
    `;

    // Add logo to header
    this.renderHeaderLogo();
    
    // Apply initial styling
    this.applyDashboardStyles();
    
    // Render initial empty state
    this.renderEmptyState();
  }

  /**
   * Render the logo in the header
   */
  private renderHeaderLogo(): void {
    const logoContainer = this.viewMode.containerElement.querySelector('.blackbox-logo-container') as HTMLElement;
    if (logoContainer) {
      const logo = this.assetManager.createLogoElement('small');
      if (logo) {
        logoContainer.appendChild(logo);
      }
    }
  }

  /**
   * Setup event listeners for dashboard interactions
   */
  private setupEventListeners(): void {
    const container = this.viewMode.containerElement;

    // Handle window resize for responsive behavior
    window.addEventListener('resize', () => this.handleResize());

    // Set up event delegation for dynamic buttons
    container.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      console.log('🖱️ Dashboard clicked:', target);
      
      // Handle show/hide charts button
      if (target.id === 'show-charts-btn' || target.closest('#show-charts-btn')) {
        console.log('📊 Show charts button clicked');
        event.preventDefault();
        event.stopPropagation();
        this.toggleCharts();
        return;
      }

      // Handle minimize charts button
      if (target.id === 'minimize-charts-btn' || target.closest('#minimize-charts-btn')) {
        console.log('📉 Minimize charts button clicked');
        event.preventDefault();
        event.stopPropagation();
        this.hideCharts();
        return;
      }

      // Handle save profile button
      if (target.id === 'save-profile-btn' || target.closest('#save-profile-btn')) {
        console.log('💾 Save profile button clicked');
        event.preventDefault();
        event.stopPropagation();
        this.handleSaveProfile();
        return;
      }

      // Handle view profiles button
      if (target.id === 'view-profiles-btn' || target.closest('#view-profiles-btn')) {
        console.log('👁️ View profiles button clicked');
        event.preventDefault();
        event.stopPropagation();
        this.showProfilesPanel();
        return;
      }

      // Handle generate report button
      if (target.id === 'generate-report-btn' || target.closest('#generate-report-btn')) {
        console.log('📄 Generate report button clicked');
        event.preventDefault();
        event.stopPropagation();
        this.handleGenerateReport();
        return;
      }

      // Handle print report button
      if (target.id === 'print-report-btn' || target.closest('#print-report-btn')) {
        console.log('🖨️ Print report button clicked');
        event.preventDefault();
        event.stopPropagation();
        this.handlePrintReport();
        return;
      }

      // Handle configure button
      if (target.id === 'config-btn' || target.closest('#config-btn')) {
        console.log('⚙️ Configure button clicked');
        event.preventDefault();
        event.stopPropagation();
        this.showConfigurationPanel();
        return;
      }

      // Handle retry charts button
      if (target.classList.contains('blackbox-retry-btn') && target.getAttribute('data-action') === 'retry-charts') {
        console.log('🔄 Retry charts button clicked');
        event.preventDefault();
        event.stopPropagation();
        this.renderChartsSection();
        return;
      }
    });
  }

  /**
   * Handle window resize events
   */
  private handleResize(): void {
    // Update container dimensions if needed
    this.updateContainerStyles();
  }

  /**
   * Update container styles based on current view mode
   */
  private updateContainerStyles(): void {
    const container = this.viewMode.containerElement;
    const { width, height } = this.viewMode.dimensions;
    
    // Set dimensions
    container.style.width = `${width}px`;
    container.style.minHeight = `${height}px`;
    
    // Add transition for smooth animation
    container.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    
    // Set overflow behavior
    if (this.viewMode.isExpanded) {
      container.style.overflow = 'visible';
      container.style.maxHeight = 'none';
    } else {
      container.style.overflow = 'hidden';
      container.style.maxHeight = `${height}px`;
    }
  }

  /**
   * Render the main content based on current state
   */
  private renderContent(): void {
    if (this.loadingState.isLoading) {
      this.renderLoadingState();
      return;
    }

    if (!this.currentHealth || !this.currentMetrics || !this.currentThresholds) {
      this.renderEmptyState();
      return;
    }

    this.renderAnalysisContent();
  }

  /**
   * Render loading state
   */
  private renderLoadingState(): void {
    const contentArea = this.viewMode.containerElement.querySelector('.blackbox-content-area') as HTMLElement;
    if (!contentArea) return;

    contentArea.innerHTML = `
      <div class="blackbox-loading-state">
        <div class="blackbox-loading-spinner"></div>
        <div class="blackbox-loading-text">${this.loadingState.operation}</div>
        ${this.loadingState.progress !== undefined ? `
          <div class="blackbox-loading-progress">
            <div class="blackbox-progress-bar" style="width: ${this.loadingState.progress}%"></div>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Render empty state when no data is available
   */
  private renderEmptyState(): void {
    const contentArea = this.viewMode.containerElement.querySelector('.blackbox-content-area') as HTMLElement;
    if (!contentArea) return;

    contentArea.innerHTML = `
      <div class="blackbox-empty-state">
        <div class="blackbox-empty-icon">📊</div>
        <div class="blackbox-empty-title">Ready to Analyze</div>
        <div class="blackbox-empty-description">Click "Analyze Page" to start performance analysis</div>
      </div>
    `;
  }
  /**
   * Render the complete analysis content
   */
  private renderAnalysisContent(): void {
    const contentArea = this.viewMode.containerElement.querySelector('.blackbox-content-area') as HTMLElement;
    if (!contentArea || !this.currentHealth || !this.currentMetrics || !this.currentThresholds) return;

    contentArea.innerHTML = `
      <div class="blackbox-analysis-content">
        ${this.renderHealthStatusSection()}
        ${this.renderMetricsTableSection()}
        ${this.renderIssuesSection()}
        ${this.renderActionsSection()}
      </div>
    `;

    // Render the threshold display using the component
    const thresholdContainer = contentArea.querySelector('#blackbox-threshold-display-container') as HTMLElement;
    if (thresholdContainer) {
      this.thresholdDisplay.render(thresholdContainer, this.currentMetrics, this.currentThresholds);
    }

    // Update footer actions
    this.renderFooterActions();
  }

  /**
   * Render health status section
   */
  private renderHealthStatusSection(): string {
    if (!this.currentHealth) return '';

    const statusClass = this.currentHealth.status.toLowerCase();
    const statusEmoji = this.getStatusEmoji(this.currentHealth.status);
    const statusText = this.getStatusText(this.currentHealth.status);

    return `
      <div class="blackbox-health-status ${statusClass}">
        <div class="blackbox-status-badge">${statusEmoji}</div>
        <div class="blackbox-status-content">
          <div class="blackbox-status-title">${statusText}</div>
          <div class="blackbox-status-score">Score: ${this.currentHealth.score}/100</div>
        </div>
      </div>
    `;
  }

  /**
   * Render metrics table section with threshold comparison
   */
  private renderMetricsTableSection(): string {
    return `
      <div class="blackbox-metrics-section">
        <div id="blackbox-threshold-display-container"></div>
      </div>
    `;
  }

  /**
   * Render issues section with report generation controls
   */
  private renderIssuesSection(): string {
    // Check if there are no issues or only the positive message
    const hasNoIssues = !this.currentHealth || 
                       !this.currentHealth.worstOffenders || 
                       this.currentHealth.worstOffenders.length === 0 ||
                       (this.currentHealth.worstOffenders.length === 1 && 
                        this.currentHealth.worstOffenders[0] === 'All metrics within acceptable thresholds');

    if (hasNoIssues) {
      return `
        <div class="blackbox-issues-section">
          <h3 class="blackbox-section-title">Analysis Complete</h3>
          <div class="blackbox-no-issues">
            <span class="blackbox-success-icon">✅</span>
            <span class="blackbox-success-text">All metrics within acceptable thresholds</span>
          </div>
          ${this.renderReportGenerationControls()}
        </div>
      `;
    }

    return `
      <div class="blackbox-issues-section">
        <h3 class="blackbox-section-title">Issues Found</h3>
        <div class="blackbox-issues-list">
          ${this.currentHealth?.worstOffenders?.map(issue => `
            <div class="blackbox-issue-item">
              <span class="blackbox-issue-icon">⚠️</span>
              <span class="blackbox-issue-text">${issue}</span>
            </div>
          `).join('') || ''}
        </div>
        ${this.renderReportGenerationControls()}
      </div>
    `;
  }

  /**
   * Render report generation controls
   */
  private renderReportGenerationControls(): string {
    return `
      <div class="blackbox-report-controls">
        <div class="blackbox-report-buttons">
          <button class="blackbox-report-btn blackbox-btn-primary" id="generate-report-btn" title="Generate text report for copy/paste">
            <span class="blackbox-btn-icon">�</span>
            Generate Report
          </button>
          <button class="blackbox-report-btn blackbox-btn-secondary" id="print-report-btn" title="Generate and download PDF report">
            <span class="blackbox-btn-icon">🖨️</span>
            Print Report
          </button>
        </div>
        <div class="blackbox-report-feedback" id="report-feedback" style="display: none;">
          <span class="blackbox-feedback-icon">✅</span>
          <span class="blackbox-feedback-text">Report copied to clipboard!</span>
        </div>
      </div>
    `;
  }

  /**
   * Render actions section (charts controls only)
   */
  private renderActionsSection(): string {
    const showChartsText = this.chartsVisible ? 'Hide Graphs' : 'Show Graphs';
    const showChartsIcon = this.chartsVisible ? '📈' : '📊';
    
    return `
      <div class="blackbox-actions-section" style="display:none;">
        <div class="blackbox-action-buttons">
          <button class="blackbox-action-btn blackbox-btn-secondary" id="show-charts-btn">
            <span class="blackbox-btn-icon">${showChartsIcon}</span>
            ${showChartsText}
          </button>
        </div>
        ${this.chartsVisible ? this.renderChartsContainer() : ''}
      </div>
    `;
  }

  /**
   * Render charts container
   */
  private renderChartsContainer(): string {
    return `
      <div class="blackbox-charts-section" id="blackbox-charts-section">
        <div class="blackbox-charts-header">
          <h3 class="blackbox-section-title">Performance Visualizations</h3>
          <button class="blackbox-minimize-btn" id="minimize-charts-btn" title="Hide Charts">
            <span class="minimize-icon">−</span>
          </button>
        </div>
        <div class="blackbox-charts-container" id="blackbox-charts-container">
          <div class="blackbox-charts-loading">
            <div class="blackbox-loading-spinner"></div>
            <div class="blackbox-loading-text">Generating charts...</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render the charts section with actual chart data
   */
  private renderChartsSection(): void {
    if (!this.currentMetrics || !this.currentThresholds) {
      return;
    }

    // Get the charts container
    const chartsContainer = this.viewMode.containerElement.querySelector('#blackbox-charts-container') as HTMLElement;
    if (!chartsContainer) {
      // If container doesn't exist, re-render the content to include it
      this.renderContent();
      return;
    }

    try {
      // Show loading state
      this.showChartsLoading();

      // Check if ChartEngine is available and initialized
      if (!this.chartEngine || !this.chartEngine.isSupported()) {
        this.showChartsError('Chart visualization is not supported in this environment. Charts require a modern browser with Canvas support.');
        return;
      }

      // Generate chart configurations
      const chartConfigs = this.chartEngine.generatePerformanceCharts(this.currentMetrics, this.currentThresholds);

      // Clear loading state and render charts
      chartsContainer.innerHTML = '';

      // Render each chart
      chartConfigs.forEach((config, index) => {
        const chartWrapper = document.createElement('div');
        chartWrapper.className = 'blackbox-chart-wrapper';
        chartWrapper.innerHTML = `
          <div class="blackbox-chart-title">${config.title}</div>
          <div class="blackbox-chart-canvas-container" id="chart-${index}">
            <canvas></canvas>
          </div>
        `;

        chartsContainer.appendChild(chartWrapper);

        // Render the chart
        const canvasContainer = chartWrapper.querySelector(`#chart-${index}`) as HTMLElement;
        if (canvasContainer) {
          const chart = this.chartEngine.renderChart(canvasContainer, config);
          this.activeCharts.push(chart);
        }
      });

    } catch (error) {
      console.error('Chart rendering error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate charts';
      this.showChartsError(`Chart generation failed: ${errorMessage}. This may be due to browser extension limitations.`);
    }
  }

  /**
   * Show loading state for charts
   */
  private showChartsLoading(): void {
    const chartsContainer = this.viewMode.containerElement.querySelector('#blackbox-charts-container') as HTMLElement;
    if (chartsContainer) {
      chartsContainer.innerHTML = `
        <div class="blackbox-charts-loading">
          <div class="blackbox-loading-spinner"></div>
          <div class="blackbox-loading-text">Generating charts...</div>
        </div>
      `;
    }
  }

  /**
   * Show error state for charts
   */
  private showChartsError(message: string): void {
    const chartsContainer = this.viewMode.containerElement.querySelector('#blackbox-charts-container') as HTMLElement;
    if (chartsContainer) {
      chartsContainer.innerHTML = `
        <div class="blackbox-charts-error" style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 200px;
          text-align: center;
          color: #6b7280;
          padding: 20px;
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 8px;
          margin: 10px;
        ">
          <div class="blackbox-error-icon" style="
            font-size: 2rem;
            margin-bottom: 12px;
          ">⚠️</div>
          <div class="blackbox-error-title" style="
            font-size: 1.125rem;
            font-weight: 600;
            color: #92400e;
            margin-bottom: 8px;
          ">Chart Generation Failed</div>
          <div class="blackbox-error-message" style="
            font-size: 0.875rem;
            margin-bottom: 16px;
            max-width: 300px;
            color: #78350f;
          ">${message}</div>
          <button class="blackbox-retry-btn" data-action="retry-charts" style="
            padding: 8px 16px;
            background: #f59e0b;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.875rem;
            font-weight: 500;
            transition: all 0.2s ease;
          ">
            Retry
          </button>
        </div>
      `;
    }
  }

  /**
   * Clean up active charts
   */
  private cleanupCharts(): void {
    this.activeCharts.forEach(chart => {
      try {
        this.chartEngine.destroyChart(chart);
      } catch (error) {
        console.warn('Error destroying chart:', error);
      }
    });
    this.activeCharts = [];
  }

  /**
   * Render footer actions
   */
  private renderFooterActions(): void {
    const footerActions = this.viewMode.containerElement.querySelector('.blackbox-footer-actions') as HTMLElement;
    if (!footerActions) return;

    footerActions.innerHTML = `
      <button class="blackbox-footer-btn blackbox-btn-primary" id="analyze-btn">
        Analyze Page
      </button>
      <button class="blackbox-footer-btn blackbox-btn-secondary" id="save-profile-btn" title="Save current analysis as profile">
        Save Profile
      </button>
      <button class="blackbox-footer-btn blackbox-btn-secondary" id="view-profiles-btn" title="View saved analysis profiles">
        View Profiles
      </button>
      <button class="blackbox-footer-btn blackbox-btn-secondary" id="config-btn">
        Configure
      </button>
    `;
  }
  /**
   * Apply dashboard-specific styles
   */
  private applyDashboardStyles(): void {
    // Inject CSS if not already present
    if (!document.querySelector('#blackbox-dashboard-styles')) {
      const style = document.createElement('style');
      style.id = 'blackbox-dashboard-styles';
      style.textContent = this.getDashboardCSS();
      document.head.appendChild(style);
    }
  }

  /**
   * Get dashboard CSS styles
   */
  private getDashboardCSS(): string {
    const branding = this.assetManager.getBrandingElements();
    
    return `
      .blackbox-dashboard {
        display: flex;
        flex-direction: column;
        background: #ffffff;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        font-family: ${branding.fontFamily};
        overflow: hidden;
      }

      .blackbox-dashboard-header {
        background: ${branding.primaryColor};
        color: white;
        padding: 12px 16px;
        border-bottom: 2px solid ${branding.secondaryColor};
      }

      .blackbox-header-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .blackbox-logo-title {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .blackbox-title {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
      }

      .blackbox-dashboard-main {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
      }

      .blackbox-expanded-view .blackbox-dashboard-main {
        padding: 20px;
      }

      .blackbox-dashboard-footer {
        border-top: 1px solid #e5e7eb;
        padding: 12px 16px;
        background: #f8f9fa;
      }

      .blackbox-footer-actions {
        display: flex;
        gap: 8px;
        flex-direction: column;
      }

      .blackbox-footer-btn {
        flex: 1;
        padding: 8px 16px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        background: white;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s ease;
      }

      .blackbox-btn-primary {
        background: ${branding.secondaryColor};
        color: white;
        border-color: ${branding.secondaryColor};
      }

      .blackbox-btn-primary:hover {
        background: ${this.darkenColor(branding.secondaryColor, 10)};
      }

      .blackbox-btn-secondary:hover {
        background: #f3f4f6;
      }

      /* Profile feedback styles */
      .blackbox-profile-feedback {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 8px;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 500;
        animation: blackbox-slide-down 0.3s ease-out;
      }

      .blackbox-profile-feedback.success {
        background: #dcfce7;
        color: #166534;
        border: 1px solid ${branding.accentColor};
      }

      .blackbox-profile-feedback.error {
        background: #fee2e2;
        color: #991b1b;
        border: 1px solid ${branding.errorColor};
      }

      .blackbox-profile-feedback.info {
        background: #dbeafe;
        color: #1e40af;
        border: 1px solid #3b82f6;
      }

      .blackbox-health-status {
        display: flex;
        align-items: center;
        padding: 16px;
        border-radius: 8px;
        margin-bottom: 20px;
        border: 2px solid;
      }

      .blackbox-health-status.pass {
        background: #dcfce7;
        color: #166534;
        border-color: ${branding.accentColor};
      }

      .blackbox-health-status.warn {
        background: #fef3c7;
        color: #92400e;
        border-color: ${branding.warningColor};
      }

      .blackbox-health-status.fail {
        background: #fee2e2;
        color: #991b1b;
        border-color: ${branding.errorColor};
      }

      .blackbox-status-badge {
        font-size: 2rem;
        margin-right: 12px;
      }

      .blackbox-status-title {
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: 4px;
      }

      .blackbox-status-score {
        font-size: 0.875rem;
        opacity: 0.8;
      }

      .blackbox-section-title {
        margin: 0 0 12px 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: ${branding.primaryColor};
      }

      .blackbox-issues-section {
        margin-bottom: 20px;
      }

      .blackbox-issue-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: #fef3c7;
        border: 1px solid ${branding.warningColor};
        border-radius: 4px;
        margin-bottom: 6px;
        font-size: 0.875rem;
      }

      .blackbox-action-buttons {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        margin-bottom: 16px;
      }

      .blackbox-action-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 10px 16px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        background: white;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 500;
        transition: all 0.2s ease;
      }

      .blackbox-action-btn:hover {
        background: #f3f4f6;
        border-color: ${branding.secondaryColor};
      }

      /* Report Generation Controls */
      .blackbox-report-controls {
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid #e5e7eb;
      }

      .blackbox-report-buttons {
        display: flex;
        gap: 12px;
        margin-bottom: 12px;
      }

      .blackbox-report-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 20px;
        border: 1px solid;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 600;
        transition: all 0.2s ease;
        flex: 1;
        justify-content: center;
      }

      .blackbox-report-btn.blackbox-btn-primary {
        background: ${branding.secondaryColor};
        color: white;
        border-color: ${branding.secondaryColor};
      }

      .blackbox-report-btn.blackbox-btn-primary:hover:not(:disabled) {
        background: ${this.darkenColor(branding.secondaryColor, 10)};
        border-color: ${this.darkenColor(branding.secondaryColor, 10)};
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .blackbox-report-btn.blackbox-btn-secondary {
        background: white;
        color: ${branding.secondaryColor};
        border-color: ${branding.secondaryColor};
      }

      .blackbox-report-btn.blackbox-btn-secondary:hover:not(:disabled) {
        background: ${branding.secondaryColor};
        color: white;
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .blackbox-report-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }

      .blackbox-report-btn.loading {
        position: relative;
      }

      .blackbox-report-btn.loading::after {
        content: '';
        position: absolute;
        width: 16px;
        height: 16px;
        margin: auto;
        border: 2px solid transparent;
        border-top-color: rgba(255, 255, 255, 0.6);
        border-radius: 50%;
        animation: blackbox-spin 1s linear infinite;
        right: 12px;
      }

      .blackbox-report-feedback {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 12px;
        padding: 10px 16px;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 500;
        animation: blackbox-slide-down 0.3s ease-out;
      }

      .blackbox-report-feedback.success {
        background: #dcfce7;
        color: #166534;
        border: 1px solid ${branding.accentColor};
      }

      .blackbox-report-feedback.error {
        background: #fee2e2;
        color: #991b1b;
        border: 1px solid ${branding.errorColor};
      }

      .blackbox-report-feedback.info {
        background: #dbeafe;
        color: #1e40af;
        border: 1px solid #3b82f6;
      }

      .blackbox-feedback-icon {
        font-size: 1rem;
      }

      .blackbox-no-issues {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        background: #dcfce7;
        color: #166534;
        border: 1px solid ${branding.accentColor};
        border-radius: 6px;
        margin-bottom: 16px;
        font-size: 0.875rem;
        font-weight: 500;
      }

      .blackbox-success-icon {
        font-size: 1.125rem;
      }

      /* Charts Section Styles */
      .blackbox-charts-section {
        margin-top: 20px;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        background: white;
        overflow: hidden;
        animation: blackbox-slide-down 0.3s ease-out;
      }

      .blackbox-charts-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        background: #f8f9fa;
        border-bottom: 1px solid #e5e7eb;
      }

      .blackbox-charts-header .blackbox-section-title {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: ${branding.primaryColor};
      }

      .blackbox-minimize-btn {
        background: transparent;
        border: 1px solid #d1d5db;
        color: #6b7280;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 16px;
        font-weight: bold;
        transition: all 0.2s ease;
        min-width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .blackbox-minimize-btn:hover {
        background: #f3f4f6;
        border-color: ${branding.secondaryColor};
        color: ${branding.secondaryColor};
      }

      .blackbox-charts-container {
        padding: 20px;
        min-height: 200px;
      }

      .blackbox-chart-wrapper {
        margin-bottom: 32px;
      }

      .blackbox-chart-wrapper:last-child {
        margin-bottom: 0;
      }

      .blackbox-chart-title {
        font-size: 1rem;
        font-weight: 600;
        color: ${branding.primaryColor};
        margin-bottom: 12px;
        text-align: center;
      }

      .blackbox-chart-canvas-container {
        position: relative;
        height: 300px;
        background: #fafafa;
        border: 1px solid #f1f5f9;
        border-radius: 6px;
        padding: 16px;
      }

      .blackbox-expanded-view .blackbox-chart-canvas-container {
        height: 400px;
        padding: 20px;
      }

      .blackbox-charts-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 200px;
        color: #6b7280;
      }

      .blackbox-charts-loading .blackbox-loading-spinner {
        width: 24px;
        height: 24px;
        margin-bottom: 12px;
      }

      /* Animation for charts section */
      @keyframes blackbox-slide-down {
        from {
          opacity: 0;
          transform: translateY(-10px);
          max-height: 0;
        }
        to {
          opacity: 1;
          transform: translateY(0);
          max-height: 1000px;
        }
      }

      .blackbox-loading-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        text-align: center;
      }

      .blackbox-loading-spinner {
        width: 32px;
        height: 32px;
        border: 3px solid #f3f4f6;
        border-top: 3px solid ${branding.secondaryColor};
        border-radius: 50%;
        animation: blackbox-spin 1s linear infinite;
        margin-bottom: 16px;
      }

      .blackbox-loading-text {
        color: #6b7280;
        font-size: 0.875rem;
        margin-bottom: 12px;
      }

      .blackbox-loading-progress {
        width: 200px;
        height: 4px;
        background: #f3f4f6;
        border-radius: 2px;
        overflow: hidden;
      }

      .blackbox-progress-bar {
        height: 100%;
        background: ${branding.secondaryColor};
        transition: width 0.3s ease;
      }

      .blackbox-empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        text-align: center;
      }

      .blackbox-empty-icon {
        font-size: 3rem;
        margin-bottom: 16px;
        opacity: 0.6;
      }

      .blackbox-empty-title {
        font-size: 1.125rem;
        font-weight: 600;
        color: ${branding.primaryColor};
        margin-bottom: 8px;
      }

      .blackbox-empty-description {
        color: #6b7280;
        font-size: 0.875rem;
      }

      @keyframes blackbox-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      /* Expanded view adjustments */
      .blackbox-expanded-view {
        max-width: none !important;
      }

      /* Responsive adjustments */
      @media (max-width: 450px) {
        .blackbox-dashboard {
          width: 100% !important;
        }
        
        .blackbox-action-buttons {
          flex-direction: column;
        }
      }

      /* Inline Panel Styles */
      .blackbox-config-panel,
      .blackbox-profiles-panel {
        padding: 20px;
        animation: blackbox-slide-down 0.3s ease-out;
      }

      .blackbox-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 2px solid #e5e7eb;
      }

      .blackbox-panel-title {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 600;
        color: ${branding.primaryColor};
      }

      .blackbox-back-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        background: white;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 500;
        color: ${branding.primaryColor};
        transition: all 0.2s ease;
      }

      .blackbox-back-btn:hover {
        background: #f3f4f6;
        border-color: ${branding.secondaryColor};
        color: ${branding.secondaryColor};
      }

      /* Configuration Panel Styles */
      .blackbox-config-content {
        margin-bottom: 24px;
      }

      .blackbox-config-section {
        margin-bottom: 32px;
      }

      .blackbox-config-section-title {
        margin: 0 0 8px 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: ${branding.primaryColor};
      }

      .blackbox-config-description {
        margin: 0 0 20px 0;
        color: #6b7280;
        font-size: 0.875rem;
        line-height: 1.5;
      }

      .blackbox-config-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 20px;
      }

      .blackbox-config-item {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .blackbox-config-label {
        font-size: 0.875rem;
        font-weight: 600;
        color: ${branding.primaryColor};
      }

      .blackbox-config-input {
        padding: 10px 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 0.875rem;
        transition: all 0.2s ease;
      }

      .blackbox-config-input:focus {
        outline: none;
        border-color: ${branding.secondaryColor};
        box-shadow: 0 0 0 3px ${branding.secondaryColor}20;
      }

      .blackbox-config-help {
        font-size: 0.75rem;
        color: #6b7280;
        font-style: italic;
      }

      .blackbox-config-actions {
        display: flex;
        gap: 12px;
        margin-bottom: 16px;
      }

      .blackbox-config-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 20px;
        border: 1px solid;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 600;
        transition: all 0.2s ease;
        flex: 1;
        justify-content: center;
      }

      .blackbox-config-btn.blackbox-btn-primary {
        background: ${branding.secondaryColor};
        color: white;
        border-color: ${branding.secondaryColor};
      }

      .blackbox-config-btn.blackbox-btn-primary:hover:not(:disabled) {
        background: ${this.darkenColor(branding.secondaryColor, 10)};
        border-color: ${this.darkenColor(branding.secondaryColor, 10)};
      }

      .blackbox-config-btn.blackbox-btn-secondary {
        background: white;
        color: ${branding.secondaryColor};
        border-color: ${branding.secondaryColor};
      }

      .blackbox-config-btn.blackbox-btn-secondary:hover:not(:disabled) {
        background: ${branding.secondaryColor};
        color: white;
      }

      .blackbox-config-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .blackbox-config-feedback {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 500;
        animation: blackbox-slide-down 0.3s ease-out;
      }

      .blackbox-config-feedback.success {
        background: #dcfce7;
        color: #166534;
        border: 1px solid ${branding.accentColor};
      }

      .blackbox-config-feedback.error {
        background: #fee2e2;
        color: #991b1b;
        border: 1px solid ${branding.errorColor};
      }

      /* Profiles Panel Styles */
      .blackbox-profiles-content {
        min-height: 300px;
      }

      .blackbox-empty-profiles {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
        text-align: center;
      }

      .blackbox-empty-profiles .blackbox-empty-icon {
        font-size: 4rem;
        margin-bottom: 20px;
        opacity: 0.6;
      }

      .blackbox-empty-profiles .blackbox-empty-title {
        font-size: 1.25rem;
        font-weight: 600;
        color: ${branding.primaryColor};
        margin-bottom: 12px;
      }

      .blackbox-empty-profiles .blackbox-empty-description {
        color: #6b7280;
        font-size: 0.875rem;
        line-height: 1.5;
        max-width: 400px;
      }

      .blackbox-profiles-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .blackbox-profile-item {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 16px;
        background: white;
        transition: all 0.2s ease;
      }

      .blackbox-profile-item:hover {
        border-color: ${branding.secondaryColor};
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .blackbox-profile-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 12px;
      }

      .blackbox-profile-url {
        font-size: 0.875rem;
        font-weight: 500;
        color: ${branding.primaryColor};
        word-break: break-all;
        flex: 1;
        margin-right: 12px;
      }

      .blackbox-profile-date {
        font-size: 0.75rem;
        color: #6b7280;
        white-space: nowrap;
      }

      .blackbox-profile-details {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .blackbox-profile-score {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .blackbox-score-badge {
        font-size: 1.25rem;
      }

      .blackbox-score-text {
        font-size: 0.875rem;
        font-weight: 600;
      }

      .blackbox-profile-score.pass .blackbox-score-text {
        color: #166534;
      }

      .blackbox-profile-score.warn .blackbox-score-text {
        color: #92400e;
      }

      .blackbox-profile-score.fail .blackbox-score-text {
        color: #991b1b;
      }

      .blackbox-profile-actions {
        display: flex;
        gap: 8px;
      }

      .blackbox-profile-action-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px 12px;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        background: white;
        cursor: pointer;
        font-size: 0.75rem;
        font-weight: 500;
        transition: all 0.2s ease;
      }

      .blackbox-profile-action-btn:hover {
        background: #f3f4f6;
        border-color: ${branding.secondaryColor};
        color: ${branding.secondaryColor};
      }

      .blackbox-profile-action-btn.delete:hover {
        background: #fee2e2;
        border-color: ${branding.errorColor};
        color: ${branding.errorColor};
      }

      .blackbox-profiles-error {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
        text-align: center;
      }

      .blackbox-profiles-error .blackbox-error-icon {
        font-size: 3rem;
        margin-bottom: 16px;
      }

      .blackbox-profiles-error .blackbox-error-title {
        font-size: 1.125rem;
        font-weight: 600;
        color: ${branding.primaryColor};
        margin-bottom: 8px;
      }

      .blackbox-profiles-error .blackbox-error-message {
        color: #6b7280;
        font-size: 0.875rem;
        margin-bottom: 16px;
      }
    `;
  }

  /**
   * Darken a color by a percentage
   */
  private darkenColor(color: string, percent: number): string {
    // Simple color darkening - in a real implementation, you might want a more robust solution
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

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
   * Get status text for display
   */
  private getStatusText(status: HealthStatus): string {
    switch (status) {
      case 'PASS': return 'Good Performance';
      case 'WARN': return 'Fair Performance';
      case 'FAIL': return 'Poor Performance';
      default: return 'Unknown Status';
    }
  }

  /**
   * Emit UI event to registered handlers
   */
  private emitEvent(eventType: UIEventType, data?: any): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      const event: UIEvent = {
        type: eventType,
        timestamp: Date.now(),
        data
      };
      
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in event handler for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Handle errors with proper error types
   */
  private handleError(type: Phase2ErrorType, message: string, originalError?: any): void {
    const error = new Error(message) as Phase2Error;
    error.type = type;
    error.context = originalError;
    error.recoverable = true;
    
    // Set appropriate fallback based on error type
    switch (type) {
      case 'CHART_RENDERING_ERROR':
        error.fallback = 'Display text-based metrics instead of charts';
        break;
      case 'UI_EXPANSION_ERROR':
        error.fallback = 'Continue with current view mode';
        break;
      default:
        error.fallback = 'Continue with basic functionality';
    }
    
    console.error('VisualDashboard error:', error);
    
    // Emit error event for external handling
    this.emitEvent('expand_dashboard', { error });
  }
}