/**
 * AssetManager - Manages branding assets and visual identity for Blackbox
 * 
 * This class provides centralized management of branding elements including
 * logos, colors, fonts, and consistent application of visual identity across
 * all UI components and generated reports.
 */

import { AssetManager as IAssetManager, BrandingConfig, Phase2Error } from '../types/phase2';

export class AssetManager implements IAssetManager {
  private brandingConfig: BrandingConfig | null = null;
  private fallbackBranding: BrandingConfig;

  constructor() {
    // Define fallback branding configuration
    this.fallbackBranding = {
      productName: 'Blackbox',
      logoPath: 'assets/logo.png',
      primaryColor: '#1a1a1a',
      secondaryColor: '#4a90e2',
      accentColor: '#00c851',
      warningColor: '#ffbb33',
      errorColor: '#ff4444',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      description: 'Professional webpage performance analysis tool',
      chartColors: {
        primary: [
          '#3B82F6', // Blue
          '#10B981', // Green
          '#F59E0B', // Yellow
          '#EF4444', // Red
          '#8B5CF6', // Purple
          '#06B6D4', // Cyan
        ],
        success: [
          '#10B981', // Green-500
          '#059669', // Green-600
          '#047857', // Green-700
        ],
        warning: [
          '#F59E0B', // Yellow-500
          '#D97706', // Yellow-600
          '#B45309', // Yellow-700
        ],
        error: [
          '#EF4444', // Red-500
          '#DC2626', // Red-600
          '#B91C1C', // Red-700
        ],
        neutral: [
          '#6B7280', // Gray-500
          '#9CA3AF', // Gray-400
          '#D1D5DB', // Gray-300
        ],
      }
    };
  }

  /**
   * Initialize the AssetManager by loading branding configuration
   */
  public async initialize(): Promise<void> {
    try {
      await this.loadBrandingConfig();
      // Skip logo preloading in test environment or browser extension to avoid issues
      if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
        // Only preload logo in standalone mode, not in browser extension
        if (typeof chrome === 'undefined' || !chrome.runtime) {
          await this.preloadLogo();
        }
      }
    } catch (error) {
      console.warn('AssetManager initialization failed, using fallback branding:', error);
      this.brandingConfig = this.fallbackBranding;
    }
  }

  /**
   * Get the path to the logo file
   */
  public getLogoPath(): string {
    const config = this.getBrandingElements();
    return config.logoPath;
  }

  /**
   * Get complete branding configuration
   */
  public getBrandingElements(): BrandingConfig {
    return this.brandingConfig || this.fallbackBranding;
  }

  /**
   * Apply branding styles to a DOM element
   */
  public applyBrandingToElement(element: HTMLElement): void {
    const branding = this.getBrandingElements();
    
    // Apply CSS custom properties for consistent theming
    element.style.setProperty('--blackbox-primary-color', branding.primaryColor);
    element.style.setProperty('--blackbox-secondary-color', branding.secondaryColor);
    element.style.setProperty('--blackbox-accent-color', branding.accentColor);
    element.style.setProperty('--blackbox-warning-color', branding.warningColor);
    element.style.setProperty('--blackbox-error-color', branding.errorColor);
    element.style.setProperty('--blackbox-font-family', branding.fontFamily);

    // Apply font family directly
    element.style.fontFamily = branding.fontFamily;

    // Add branding class for CSS targeting
    element.classList.add('blackbox-branded');
  }

  /**
   * Generate a branded header element
   */
  public generateBrandedHeader(): HTMLElement {
    const branding = this.getBrandingElements();
    const header = document.createElement('div');
    header.className = 'blackbox-header';

    // Create logo container
    const logoContainer = document.createElement('div');
    logoContainer.className = 'blackbox-logo-container';

    // Create logo image
    const logo = this.createLogoElement();
    if (logo) {
      logoContainer.appendChild(logo);
    }

    // Create title
    const title = document.createElement('h1');
    title.className = 'blackbox-title';
    title.textContent = branding.productName;
    title.style.color = branding.primaryColor;
    title.style.fontFamily = branding.fontFamily;
    title.style.margin = '0';
    title.style.fontSize = '1.5rem';
    title.style.fontWeight = '600';

    // Create description
    const description = document.createElement('p');
    description.className = 'blackbox-description';
    description.textContent = branding.description;
    description.style.color = branding.secondaryColor;
    description.style.fontFamily = branding.fontFamily;
    description.style.margin = '0.25rem 0 0 0';
    description.style.fontSize = '0.875rem';

    // Assemble header
    header.appendChild(logoContainer);
    
    const textContainer = document.createElement('div');
    textContainer.className = 'blackbox-text-container';
    textContainer.appendChild(title);
    textContainer.appendChild(description);
    header.appendChild(textContainer);

    // Apply header styling
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.gap = '0.75rem';
    header.style.padding = '1rem';
    header.style.borderBottom = `2px solid ${branding.secondaryColor}`;
    header.style.backgroundColor = '#ffffff';

    // Apply branding to the entire header
    this.applyBrandingToElement(header);

    return header;
  }

  /**
   * Create a logo element with fallback handling
   */
  public createLogoElement(size: 'small' | 'medium' | 'large' = 'medium'): HTMLImageElement | null {
    const branding = this.getBrandingElements();
    
    try {
      const logo = document.createElement('img');
      logo.className = `blackbox-logo blackbox-logo-${size}`;
      logo.alt = `${branding.productName} Logo`;
      
      // Set size based on parameter
      const dimensions = this.getLogoDimensions(size);
      logo.style.width = `${dimensions.width}px`;
      logo.style.height = `${dimensions.height}px`;
      logo.style.objectFit = 'contain';

      // Set logo source with fallback handling
      logo.src = this.resolveAssetPath(branding.logoPath);
      
      // Handle loading errors
      logo.onerror = () => {
        console.warn('Logo failed to load, using fallback');
        this.handleLogoLoadError(logo);
      };

      return logo;
    } catch (error) {
      console.error('Failed to create logo element:', error);
      return null;
    }
  }

  /**
   * Get CSS color value for a specific branding color
   */
  public getBrandingColor(colorType: 'primary' | 'secondary' | 'accent' | 'warning' | 'error'): string {
    const branding = this.getBrandingElements();
    
    switch (colorType) {
      case 'primary':
        return branding.primaryColor;
      case 'secondary':
        return branding.secondaryColor;
      case 'accent':
        return branding.accentColor;
      case 'warning':
        return branding.warningColor;
      case 'error':
        return branding.errorColor;
      default:
        return branding.primaryColor;
    }
  }

  /**
   * Apply status-based color coding to an element
   */
  public applyStatusColor(element: HTMLElement, status: 'pass' | 'warn' | 'fail'): void {
    const branding = this.getBrandingElements();
    
    switch (status) {
      case 'pass':
        element.style.color = branding.accentColor;
        break;
      case 'warn':
        element.style.color = branding.warningColor;
        break;
      case 'fail':
        element.style.color = branding.errorColor;
        break;
    }
  }

  /**
   * Get chart color scheme for consistent visualization
   */
  public getChartColorScheme(): import('../types/phase2').ChartColorScheme {
    const branding = this.getBrandingElements();
    return branding.chartColors;
  }

  /**
   * Generate CSS variables string for injection into stylesheets
   */
  public generateCSSVariables(): string {
    const branding = this.getBrandingElements();
    
    return `
      :root {
        --blackbox-primary-color: ${branding.primaryColor};
        --blackbox-secondary-color: ${branding.secondaryColor};
        --blackbox-accent-color: ${branding.accentColor};
        --blackbox-warning-color: ${branding.warningColor};
        --blackbox-error-color: ${branding.errorColor};
        --blackbox-font-family: ${branding.fontFamily};
      }
    `;
  }

  /**
   * Load branding configuration from assets
   */
  private async loadBrandingConfig(): Promise<void> {
    try {
      // Try to load from extension context first
      const response = await this.fetchBrandingConfig();
      this.brandingConfig = response;
    } catch (error) {
      throw this.createAssetError('ASSET_LOADING_ERROR', 'Failed to load branding configuration', error);
    }
  }

  /**
   * Fetch branding configuration with environment detection
   */
  private async fetchBrandingConfig(): Promise<BrandingConfig> {
    // Check if we're in a Chrome extension context
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
      const url = chrome.runtime.getURL('assets/branding.json');
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch branding config: ${response.status}`);
      }
      return await response.json();
    }
    
    // Fallback for standalone/development context
    const response = await fetch('./assets/branding.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch branding config: ${response.status}`);
    }
    return await response.json();
  }

  /**
   * Preload logo image for better performance
   */
  private async preloadLogo(): Promise<void> {
    return new Promise((resolve) => {
      const branding = this.getBrandingElements();
      const img = new Image();
      
      // Set a shorter timeout for browser extensions to prevent hanging
      const isExtension = typeof chrome !== 'undefined' && chrome.runtime;
      const timeoutDuration = isExtension ? 1000 : 2000;
      
      const timeout = setTimeout(() => {
        if (!isExtension) {
          console.warn('Logo preload timed out, continuing without preload');
        }
        resolve();
      }, timeoutDuration);
      
      img.onload = () => {
        clearTimeout(timeout);
        resolve();
      };
      
      img.onerror = () => {
        clearTimeout(timeout);
        if (!isExtension) {
          console.warn('Logo preload failed, will use fallback when needed');
        }
        resolve(); // Don't reject, just continue without preloaded logo
      };
      
      img.src = this.resolveAssetPath(branding.logoPath);
    });
  }

  /**
   * Resolve asset path based on current environment
   */
  private resolveAssetPath(assetPath: string): string {
    // Check if we're in a Chrome extension context
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
      return chrome.runtime.getURL(assetPath);
    }
    
    // Fallback for standalone/development context
    return `./${assetPath}`;
  }

  /**
   * Handle logo loading errors with fallback
   */
  private handleLogoLoadError(logoElement: HTMLImageElement): void {
    // Try SVG fallback first
    const svgPath = this.resolveAssetPath('assets/logo.svg');
    logoElement.src = svgPath;
    
    logoElement.onerror = () => {
      // If SVG also fails, create a text-based fallback
      const textFallback = this.createTextLogoFallback();
      if (logoElement.parentNode) {
        logoElement.parentNode.replaceChild(textFallback, logoElement);
      }
    };
  }

  /**
   * Create a text-based logo fallback
   */
  private createTextLogoFallback(): HTMLElement {
    const branding = this.getBrandingElements();
    const fallback = document.createElement('div');
    fallback.className = 'blackbox-logo-fallback';
    fallback.textContent = branding.productName.charAt(0).toUpperCase();
    
    // Style the fallback
    fallback.style.width = '32px';
    fallback.style.height = '32px';
    fallback.style.backgroundColor = branding.secondaryColor;
    fallback.style.color = '#ffffff';
    fallback.style.display = 'flex';
    fallback.style.alignItems = 'center';
    fallback.style.justifyContent = 'center';
    fallback.style.borderRadius = '4px';
    fallback.style.fontFamily = branding.fontFamily;
    fallback.style.fontSize = '1.25rem';
    fallback.style.fontWeight = '600';
    
    return fallback;
  }

  /**
   * Get logo dimensions based on size parameter
   */
  private getLogoDimensions(size: 'small' | 'medium' | 'large'): { width: number; height: number } {
    switch (size) {
      case 'small':
        return { width: 16, height: 16 };
      case 'medium':
        return { width: 32, height: 32 };
      case 'large':
        return { width: 48, height: 48 };
      default:
        return { width: 32, height: 32 };
    }
  }

  /**
   * Create a Phase2Error with proper context
   */
  private createAssetError(type: 'ASSET_LOADING_ERROR', message: string, originalError?: any): Phase2Error {
    const error = new Error(message) as Phase2Error;
    error.type = type;
    error.context = originalError;
    error.recoverable = true;
    error.fallback = 'Use fallback branding configuration';
    return error;
  }
}

// Export singleton instance for global use
export const assetManager = new AssetManager();

// Note: Auto-initialization removed to prevent issues in test environment
// Call assetManager.initialize() manually when needed