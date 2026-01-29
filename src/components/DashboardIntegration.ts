/**
 * DashboardIntegration - Integration layer between VisualDashboard and existing popup system
 * 
 * This class provides a bridge between the new VisualDashboard component and the existing
 * popup.ts implementation, ensuring backward compatibility while enabling Phase 2 features.
 * It connects the enhanced dashboard with existing ResultsPresenter functionality and
 * provides proper loading indicators for long operations.
 */

import { VisualDashboard } from './VisualDashboard';
import { AssetManager } from '../services/AssetManager';
import { ResultsPresenter } from '../core/ResultsPresenter';
import { AllMetrics, Thresholds, OverallHealth } from '../types/index';
import { UIEventType, UIEvent } from '../types/phase2';

export class DashboardIntegration {
  private dashboard: VisualDashboard | null = null;
  private assetManager: AssetManager;
  private resultsPresenter: ResultsPresenter;
  private isInitialized: boolean = false;
  private loadingOperations: Set<string> = new Set();
  private configurationManager: any = null;

  constructor(configurationManager?: any) {
    this.assetManager = new AssetManager();
    this.resultsPresenter = new ResultsPresenter();
    this.configurationManager = configurationManager;
  }

  /**
   * Initialize the dashboard integration
   */
  public async initialize(containerElement: HTMLElement): Promise<void> {
    try {
      // Initialize asset manager
      await this.assetManager.initialize();

      // Create the visual dashboard
      this.dashboard = new VisualDashboard(containerElement, this.assetManager, this.configurationManager);

      // Set up event listeners for dashboard interactions
      this.setupDashboardEventListeners();

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize dashboard integration:', error);
      // Fallback to basic functionality
      this.isInitialized = false;
    }
  }

  /**
   * Update the dashboard with analysis results
   * Integrates with existing ResultsPresenter functionality to ensure consistency
   */
  public updateAnalysisResults(health: OverallHealth, metrics: AllMetrics, thresholds: Thresholds): void {
    if (!this.isInitialized || !this.dashboard) {
      console.warn('Dashboard not initialized, falling back to ResultsPresenter');
      this.fallbackToResultsPresenter(health, metrics, thresholds);
      return;
    }

    try {
      // Use the enhanced dashboard
      this.dashboard.updateAnalysisResults(health, metrics, thresholds);
      
      // Ensure any loading operations are cleared
      this.clearAllLoadingOperations();
    } catch (error) {
      console.error('Failed to update dashboard with analysis results:', error);
      // Fallback to original ResultsPresenter
      this.fallbackToResultsPresenter(health, metrics, thresholds);
    }
  }

  /**
   * Show loading state with operation tracking
   * Implements requirement 10.5 for loading indicators on operations >500ms
   */
  public showLoading(operation: string): void {
    // Add operation to tracking set
    this.loadingOperations.add(operation);
    
    if (!this.isInitialized || !this.dashboard) {
      this.fallbackShowLoading(operation);
      return;
    }

    try {
      this.dashboard.showLoadingIndicator(operation);
    } catch (error) {
      console.error('Failed to show loading indicator:', error);
      this.fallbackShowLoading(operation);
    }
  }

  /**
   * Hide loading state with operation tracking
   */
  public hideLoading(operation?: string): void {
    if (operation) {
      this.loadingOperations.delete(operation);
    } else {
      // Clear all loading operations if no specific operation provided
      this.loadingOperations.clear();
    }

    // Only hide loading if no operations are still running
    if (this.loadingOperations.size === 0) {
      if (!this.isInitialized || !this.dashboard) {
        this.fallbackHideLoading();
        return;
      }

      try {
        this.dashboard.hideLoadingIndicator();
      } catch (error) {
        console.error('Failed to hide loading indicator:', error);
        this.fallbackHideLoading();
      }
    }
  }

  /**
   * Check if dashboard is initialized and ready
   */
  public isReady(): boolean {
    return this.isInitialized && !!this.dashboard;
  }

  /**
   * Get the dashboard instance (for advanced usage)
   */
  public getDashboard(): VisualDashboard | null {
    return this.isInitialized ? this.dashboard : null;
  }

  /**
   * Add event listener for dashboard events
   */
  public addEventListener(eventType: UIEventType, handler: (event: UIEvent) => void): void {
    if (!this.isInitialized || !this.dashboard) {
      return;
    }

    this.dashboard.addEventListener(eventType, handler);
  }

  /**
   * Remove event listener
   */
  public removeEventListener(eventType: UIEventType, handler: (event: UIEvent) => void): void {
    if (!this.isInitialized || !this.dashboard) {
      return;
    }

    this.dashboard.removeEventListener(eventType, handler);
  }

  /**
   * Setup event listeners for dashboard interactions
   */
  private setupDashboardEventListeners(): void {
    if (!this.dashboard) return;

    // Listen for expansion events
    this.dashboard.addEventListener('expand_dashboard', (event) => {
      console.log('Dashboard expanded', event);
      // Could trigger analytics or other side effects here
    });

    this.dashboard.addEventListener('collapse_dashboard', (event) => {
      console.log('Dashboard collapsed', event);
      // Could trigger analytics or other side effects here
    });
  }

  /**
   * Render error state in the dashboard
   */
  public showError(message: string, _error?: any): void {
    if (!this.isInitialized || !this.dashboard) {
      return;
    }

    try {
      // For now, we'll show this as a loading state with error message
      // In the future, we could add a dedicated error state to VisualDashboard
      this.dashboard.showLoadingIndicator(`Error: ${message}`);
    } catch (err) {
      console.error('Failed to show error state:', err);
    }
  }

  /**
   * Create a fallback integration for when VisualDashboard fails to initialize
   */
  public static createFallback(configurationManager?: any): DashboardIntegration {
    const fallback = new DashboardIntegration(configurationManager);
    fallback.isInitialized = false;
    
    // Override methods to be no-ops
    fallback.updateAnalysisResults = () => {};
    fallback.showLoading = () => {};
    fallback.hideLoading = () => {};
    fallback.showError = () => {};
    fallback.addEventListener = () => {};
    fallback.removeEventListener = () => {};
    
    return fallback;
  }

  /**
   * Fallback to original ResultsPresenter when dashboard is not available
   */
  private fallbackToResultsPresenter(health: OverallHealth, metrics: AllMetrics, thresholds: Thresholds): void {
    try {
      const resultsContainer = document.getElementById('results');
      if (resultsContainer) {
        // Show the original results container if it was hidden
        resultsContainer.style.display = 'block';
        
        // Use the original ResultsPresenter to render results
        this.resultsPresenter.renderResults(resultsContainer, health, metrics, thresholds);
      }
    } catch (error) {
      console.error('Fallback to ResultsPresenter failed:', error);
    }
  }

  /**
   * Fallback loading state display
   */
  private fallbackShowLoading(operation: string): void {
    const resultsContainer = document.getElementById('results');
    if (resultsContainer) {
      resultsContainer.style.display = 'block';
      resultsContainer.innerHTML = `<div class="loading">${operation}</div>`;
    }
  }

  /**
   * Fallback loading state hide
   */
  private fallbackHideLoading(): void {
    // Loading will be hidden when results are displayed
    // No specific action needed here for fallback
  }

  /**
   * Clear all tracked loading operations
   */
  private clearAllLoadingOperations(): void {
    this.loadingOperations.clear();
  }

  /**
   * Get the ResultsPresenter instance for direct access if needed
   */
  public getResultsPresenter(): ResultsPresenter {
    return this.resultsPresenter;
  }

  /**
   * Check if any loading operations are currently active
   */
  public hasActiveLoadingOperations(): boolean {
    return this.loadingOperations.size > 0;
  }

  /**
   * Get list of currently active loading operations
   */
  public getActiveLoadingOperations(): string[] {
    return Array.from(this.loadingOperations);
  }
}

/**
 * Factory function to create and initialize dashboard integration
 */
export async function createDashboardIntegration(containerElement: HTMLElement, configurationManager?: any): Promise<DashboardIntegration> {
  const integration = new DashboardIntegration(configurationManager);
  
  try {
    await integration.initialize(containerElement);
    return integration;
  } catch (error) {
    console.error('Failed to create dashboard integration, using fallback:', error);
    return DashboardIntegration.createFallback(configurationManager);
  }
}