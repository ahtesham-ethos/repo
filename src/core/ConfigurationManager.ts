import { Thresholds } from '../types';

/**
 * ConfigurationManager handles threshold configuration and validation
 * for NFR evaluation with support for persistence using browser storage.
 */
export class ConfigurationManager {
  private static readonly DEFAULT_THRESHOLDS: Thresholds = {
    pageSize: 2 * 1024 * 1024, // 2MB in bytes
    loadTime: 5000, // 5 seconds in milliseconds
    ttfb: 3000 // 3 seconds in milliseconds
  };

  private static readonly STORAGE_KEY = 'page-health-analyzer-thresholds';

  private currentThresholds: Thresholds;

  constructor() {
    this.currentThresholds = this.loadFromStorage();
  }

  /**
   * Gets current threshold configuration
   * @returns Current Thresholds object
   */
  getThresholds(): Thresholds {
    return { ...this.currentThresholds };
  }

  /**
   * Sets a specific threshold value with validation and persistence
   * @param metric Name of the metric ('pageSize', 'loadTime', 'ttfb')
   * @param value New threshold value
   * @throws Error if metric name is invalid or value is not valid
   */
  setThreshold(metric: keyof Thresholds, value: number): void {
    // Validate the metric name
    if (!this.isValidMetric(metric)) {
      throw new Error(`Invalid metric name: ${metric}. Valid metrics are: pageSize, loadTime, ttfb`);
    }

    // Validate the threshold value
    if (!this.validateThreshold(value)) {
      throw new Error(`Invalid threshold value: ${value}. Value must be a positive number`);
    }

    // Update the threshold
    this.currentThresholds[metric] = value;
    
    // Persist to storage
    this.saveToStorage();
  }

  /**
   * Resets all thresholds to default values and persists the change
   */
  resetToDefaults(): void {
    this.currentThresholds = { ...ConfigurationManager.DEFAULT_THRESHOLDS };
    this.saveToStorage();
  }

  /**
   * Validates that a threshold value is positive
   * @param value Threshold value to validate
   * @returns true if value is valid, false otherwise
   */
  validateThreshold(value: number): boolean {
    return typeof value === 'number' && 
           !isNaN(value) && 
           isFinite(value) && 
           value > 0;
  }

  /**
   * Gets the default threshold values
   * @returns Default Thresholds object
   */
  getDefaults(): Thresholds {
    return { ...ConfigurationManager.DEFAULT_THRESHOLDS };
  }

  /**
   * Checks if a metric name is valid
   * @param metric Metric name to validate
   * @returns true if metric is valid, false otherwise
   */
  private isValidMetric(metric: string): metric is keyof Thresholds {
    return metric === 'pageSize' || metric === 'loadTime' || metric === 'ttfb';
  }

  /**
   * Updates multiple thresholds at once with validation and persistence
   * @param thresholds Partial or complete Thresholds object
   * @throws Error if any threshold is invalid
   */
  updateThresholds(thresholds: Partial<Thresholds>): void {
    // Validate all provided thresholds first
    for (const [metric, value] of Object.entries(thresholds)) {
      if (!this.isValidMetric(metric)) {
        throw new Error(`Invalid metric name: ${metric}`);
      }
      if (value !== undefined && !this.validateThreshold(value)) {
        throw new Error(`Invalid threshold value for ${metric}: ${value}`);
      }
    }

    // If all validations pass, update the thresholds
    Object.assign(this.currentThresholds, thresholds);
    
    // Persist to storage
    this.saveToStorage();
  }

  /**
   * Loads thresholds from browser storage or returns defaults
   * @returns Thresholds object from storage or defaults
   */
  private loadFromStorage(): Thresholds {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || !window.localStorage) {
        return { ...ConfigurationManager.DEFAULT_THRESHOLDS };
      }

      const stored = localStorage.getItem(ConfigurationManager.STORAGE_KEY);
      if (!stored) {
        return { ...ConfigurationManager.DEFAULT_THRESHOLDS };
      }

      const parsed = JSON.parse(stored);
      
      // Validate the loaded data structure
      if (!this.isValidThresholdsObject(parsed)) {
        console.warn('Invalid thresholds data in storage, using defaults');
        return { ...ConfigurationManager.DEFAULT_THRESHOLDS };
      }

      return parsed;
    } catch (error) {
      console.warn('Failed to load thresholds from storage, using defaults:', error);
      return { ...ConfigurationManager.DEFAULT_THRESHOLDS };
    }
  }

  /**
   * Saves current thresholds to browser storage
   */
  private saveToStorage(): void {
    try {
      // Use Chrome extension storage if available (but not in test environment)
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local && typeof jest === 'undefined') {
        chrome.storage.local.set({ [ConfigurationManager.STORAGE_KEY]: this.currentThresholds });
        return;
      }

      // Fallback to localStorage for non-extension environments and tests
      if (typeof window === 'undefined' || !window.localStorage) {
        return; // Silently fail in non-browser environments
      }

      const serialized = JSON.stringify(this.currentThresholds);
      localStorage.setItem(ConfigurationManager.STORAGE_KEY, serialized);
    } catch (error) {
      console.warn('Failed to save thresholds to storage:', error);
      // Don't throw error - persistence failure shouldn't break functionality
    }
  }

  /**
   * Asynchronously loads thresholds from Chrome extension storage
   * @returns Promise<Thresholds> Thresholds from storage or defaults
   */
  async loadFromChromeStorage(): Promise<Thresholds> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const result = await chrome.storage.local.get(ConfigurationManager.STORAGE_KEY);
        const stored = result[ConfigurationManager.STORAGE_KEY];
        
        if (stored && this.isValidThresholdsObject(stored)) {
          return stored;
        }
      }
      return { ...ConfigurationManager.DEFAULT_THRESHOLDS };
    } catch (error) {
      console.warn('Failed to load from Chrome storage:', error);
      return { ...ConfigurationManager.DEFAULT_THRESHOLDS };
    }
  }

  /**
   * Reloads thresholds from storage, useful when configuration might have been updated elsewhere
   */
  async reloadFromStorage(): Promise<void> {
    try {
      // Try Chrome storage first (but not in test environment)
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local && typeof jest === 'undefined') {
        this.currentThresholds = await this.loadFromChromeStorage();
        return;
      }

      // Fallback to localStorage
      this.currentThresholds = this.loadFromStorage();
    } catch (error) {
      console.warn('Failed to reload from storage:', error);
    }
  }

  /**
   * Validates that an object has the correct structure for Thresholds
   * @param obj Object to validate
   * @returns true if object is a valid Thresholds object
   */
  private isValidThresholdsObject(obj: any): obj is Thresholds {
    if (!obj || typeof obj !== 'object') {
      return false;
    }

    const requiredKeys: (keyof Thresholds)[] = ['pageSize', 'loadTime', 'ttfb'];
    
    for (const key of requiredKeys) {
      if (!(key in obj) || !this.validateThreshold(obj[key])) {
        return false;
      }
    }

    return true;
  }
}