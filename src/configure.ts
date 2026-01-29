/**
 * Configuration page for Blackbox extension
 * Handles threshold configuration and settings management
 */

import { ConfigurationManager } from './core/ConfigurationManager';

class ConfigurePage {
  private configManager: ConfigurationManager;

  constructor() {
    this.configManager = new ConfigurationManager();
    this.initialize();
  }

  /**
   * Initialize the configuration page
   */
  private async initialize(): Promise<void> {
    try {
      // ConfigurationManager doesn't need initialization, it loads from storage in constructor
      this.loadCurrentConfiguration();
      this.setupEventListeners();
    } catch (error) {
      console.error('Failed to initialize configuration page:', error);
    }
  }

  /**
   * Load current configuration values into the form
   */
  private loadCurrentConfiguration(): void {
    const thresholds = this.configManager.getThresholds();
    
    const pageSizeInput = document.getElementById('pageSize') as HTMLInputElement;
    const loadTimeInput = document.getElementById('loadTime') as HTMLInputElement;
    const ttfbInput = document.getElementById('ttfb') as HTMLInputElement;

    if (pageSizeInput) {
      pageSizeInput.value = (thresholds.pageSize / (1024 * 1024)).toFixed(1);
    }
    
    if (loadTimeInput) {
      loadTimeInput.value = (thresholds.loadTime / 1000).toFixed(1);
    }
    
    if (ttfbInput) {
      ttfbInput.value = (thresholds.ttfb / 1000).toFixed(1);
    }
  }

  /**
   * Setup event listeners for the configuration page
   */
  private setupEventListeners(): void {
    const saveBtn = document.getElementById('save-config');
    const resetBtn = document.getElementById('reset-config');
    const backBtn = document.getElementById('back-to-popup');

    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveConfiguration());
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetConfiguration());
    }

    if (backBtn) {
      backBtn.addEventListener('click', () => this.goBackToPopup());
    }
  }

  /**
   * Save configuration changes
   */
  private async saveConfiguration(): Promise<void> {
    try {
      const pageSizeInput = document.getElementById('pageSize') as HTMLInputElement;
      const loadTimeInput = document.getElementById('loadTime') as HTMLInputElement;
      const ttfbInput = document.getElementById('ttfb') as HTMLInputElement;

      if (!pageSizeInput || !loadTimeInput || !ttfbInput) {
        throw new Error('Configuration form elements not found');
      }

      // Validate inputs
      const pageSize = parseFloat(pageSizeInput.value);
      const loadTime = parseFloat(loadTimeInput.value);
      const ttfb = parseFloat(ttfbInput.value);

      if (isNaN(pageSize) || pageSize <= 0) {
        throw new Error('Page size must be a positive number');
      }

      if (isNaN(loadTime) || loadTime <= 0) {
        throw new Error('Load time must be a positive number');
      }

      if (isNaN(ttfb) || ttfb <= 0) {
        throw new Error('TTFB must be a positive number');
      }

      // Convert to appropriate units and save
      const newThresholds = {
        pageSize: Math.round(pageSize * 1024 * 1024), // Convert MB to bytes
        loadTime: Math.round(loadTime * 1000), // Convert seconds to milliseconds
        ttfb: Math.round(ttfb * 1000) // Convert seconds to milliseconds
      };

      await this.configManager.updateThresholds(newThresholds);
      
      // Show success message
      this.showSuccessMessage('Configuration saved successfully!');

    } catch (error) {
      console.error('Failed to save configuration:', error);
      this.showErrorMessage(error instanceof Error ? error.message : 'Failed to save configuration');
    }
  }

  /**
   * Reset configuration to defaults
   */
  private async resetConfiguration(): Promise<void> {
    try {
      this.configManager.resetToDefaults();
      this.loadCurrentConfiguration();
      this.showSuccessMessage('Configuration reset to defaults!');
    } catch (error) {
      console.error('Failed to reset configuration:', error);
      this.showErrorMessage('Failed to reset configuration');
    }
  }

  /**
   * Go back to the main popup
   */
  private goBackToPopup(): void {
    // Close current tab and focus on the popup
    window.close();
  }

  /**
   * Show success message
   */
  private showSuccessMessage(message: string): void {
    const successElement = document.getElementById('success-message');
    if (successElement) {
      successElement.textContent = message;
      successElement.style.display = 'block';
      
      // Hide after 3 seconds
      setTimeout(() => {
        successElement.style.display = 'none';
      }, 3000);
    }
  }

  /**
   * Show error message
   */
  private showErrorMessage(message: string): void {
    // Create or update error message element
    let errorElement = document.getElementById('error-message');
    
    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.id = 'error-message';
      errorElement.style.cssText = `
        background: #fee2e2;
        color: #991b1b;
        padding: 12px 16px;
        border-radius: 6px;
        border: 1px solid #ff4444;
        margin-bottom: 20px;
      `;
      
      const container = document.querySelector('.config-container');
      const successMessage = document.getElementById('success-message');
      if (container && successMessage) {
        container.insertBefore(errorElement, successMessage.nextSibling);
      }
    }
    
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
      errorElement.style.display = 'none';
    }, 5000);
  }
}

// Initialize the configuration page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ConfigurePage();
});