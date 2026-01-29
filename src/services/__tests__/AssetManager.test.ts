/**
 * Unit tests for AssetManager class
 */

import { AssetManager } from '../AssetManager';
import { BrandingConfig } from '../../types/phase2';

// Mock Chrome extension APIs
const mockChrome = {
  runtime: {
    getURL: jest.fn((path: string) => `chrome-extension://test/${path}`)
  }
};

// Mock fetch
global.fetch = jest.fn();

describe('AssetManager', () => {
  let assetManager: AssetManager;
  let mockBrandingConfig: BrandingConfig;

  beforeEach(() => {
    assetManager = new AssetManager();
    mockBrandingConfig = {
      productName: 'Blackbox',
      logoPath: 'assets/logo.png',
      primaryColor: '#1a1a1a',
      secondaryColor: '#4a90e2',
      accentColor: '#00c851',
      warningColor: '#ffbb33',
      errorColor: '#ff4444',
      fontFamily: 'system-ui, sans-serif',
      description: 'Test description',
      chartColors: {
        primary: ['#3B82F6', '#10B981', '#F59E0B'],
        success: ['#10B981', '#059669', '#047857'],
        warning: ['#F59E0B', '#D97706', '#B45309'],
        error: ['#EF4444', '#DC2626', '#B91C1C'],
        neutral: ['#6B7280', '#9CA3AF', '#D1D5DB'],
      }
    };

    // Reset mocks
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    
    // Setup global chrome mock
    (global as any).chrome = mockChrome;
  });

  afterEach(() => {
    // Clean up global chrome mock
    delete (global as any).chrome;
  });

  describe('initialization', () => {
    it('should initialize with fallback branding when config loading fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const newAssetManager = new AssetManager();
      await newAssetManager.initialize();

      const branding = newAssetManager.getBrandingElements();
      expect(branding.productName).toBe('Blackbox');
      expect(branding.logoPath).toBe('assets/logo.png');
    });

    it('should load branding config successfully in Chrome extension context', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockBrandingConfig)
      });

      const newAssetManager = new AssetManager();
      await newAssetManager.initialize();

      expect(mockChrome.runtime.getURL).toHaveBeenCalledWith('assets/branding.json');
      const branding = newAssetManager.getBrandingElements();
      expect(branding).toEqual(mockBrandingConfig);
    });

    it('should load branding config in standalone context when chrome is not available', async () => {
      delete (global as any).chrome;
      
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockBrandingConfig)
      });

      const newAssetManager = new AssetManager();
      await newAssetManager.initialize();

      expect(global.fetch).toHaveBeenCalledWith('./assets/branding.json');
      const branding = newAssetManager.getBrandingElements();
      expect(branding).toEqual(mockBrandingConfig);
    });
  });

  describe('getLogoPath', () => {
    it('should return the logo path from branding config', () => {
      const logoPath = assetManager.getLogoPath();
      expect(logoPath).toBe('assets/logo.png');
    });
  });

  describe('getBrandingElements', () => {
    it('should return fallback branding when not initialized', () => {
      const branding = assetManager.getBrandingElements();
      expect(branding.productName).toBe('Blackbox');
      expect(branding.primaryColor).toBe('#1a1a1a');
    });
  });

  describe('applyBrandingToElement', () => {
    it('should apply CSS custom properties to element', () => {
      const element = document.createElement('div');
      
      assetManager.applyBrandingToElement(element);

      expect(element.style.getPropertyValue('--blackbox-primary-color')).toBe('#1a1a1a');
      expect(element.style.getPropertyValue('--blackbox-secondary-color')).toBe('#4a90e2');
      expect(element.style.getPropertyValue('--blackbox-accent-color')).toBe('#00c851');
      expect(element.style.fontFamily).toContain('system-ui');
      expect(element.classList.contains('blackbox-branded')).toBe(true);
    });
  });

  describe('generateBrandedHeader', () => {
    it('should create a branded header element with logo and text', () => {
      const header = assetManager.generateBrandedHeader();

      expect(header.classList.contains('blackbox-header')).toBe(true);
      expect(header.classList.contains('blackbox-branded')).toBe(true);
      expect(header.style.display).toBe('flex');
      expect(header.style.alignItems).toBe('center');

      const logoContainer = header.querySelector('.blackbox-logo-container');
      expect(logoContainer).toBeTruthy();

      const title = header.querySelector('.blackbox-title');
      expect(title?.textContent).toBe('Blackbox');

      const description = header.querySelector('.blackbox-description');
      expect(description?.textContent).toBe('Professional webpage performance analysis tool');
    });

    it('should apply proper styling to header elements', () => {
      const header = assetManager.generateBrandedHeader();
      
      const title = header.querySelector('.blackbox-title') as HTMLElement;
      expect(title.style.color).toBe('rgb(26, 26, 26)'); // CSS converts hex to rgb
      expect(title.style.margin).toBe('0px');
      expect(title.style.fontSize).toBe('1.5rem');

      const description = header.querySelector('.blackbox-description') as HTMLElement;
      expect(description.style.color).toBe('rgb(74, 144, 226)'); // CSS converts hex to rgb
      expect(description.style.fontSize).toBe('0.875rem');
    });
  });

  describe('createLogoElement', () => {
    it('should create logo element with correct attributes', () => {
      const logo = assetManager.createLogoElement('medium');

      expect(logo).toBeTruthy();
      expect(logo?.tagName).toBe('IMG');
      expect(logo?.alt).toBe('Blackbox Logo');
      expect(logo?.className).toBe('blackbox-logo blackbox-logo-medium');
      expect(logo?.style.width).toBe('32px');
      expect(logo?.style.height).toBe('32px');
    });

    it('should set correct dimensions for different sizes', () => {
      const smallLogo = assetManager.createLogoElement('small');
      const mediumLogo = assetManager.createLogoElement('medium');
      const largeLogo = assetManager.createLogoElement('large');

      expect(smallLogo?.style.width).toBe('16px');
      expect(mediumLogo?.style.width).toBe('32px');
      expect(largeLogo?.style.width).toBe('48px');
    });

    it('should handle logo creation errors gracefully', () => {
      // Mock document.createElement to throw an error
      const originalCreateElement = document.createElement;
      document.createElement = jest.fn().mockImplementation(() => {
        throw new Error('DOM error');
      });

      const logo = assetManager.createLogoElement();
      expect(logo).toBeNull();

      // Restore original function
      document.createElement = originalCreateElement;
    });
  });

  describe('getBrandingColor', () => {
    it('should return correct colors for each type', () => {
      expect(assetManager.getBrandingColor('primary')).toBe('#1a1a1a');
      expect(assetManager.getBrandingColor('secondary')).toBe('#4a90e2');
      expect(assetManager.getBrandingColor('accent')).toBe('#00c851');
      expect(assetManager.getBrandingColor('warning')).toBe('#ffbb33');
      expect(assetManager.getBrandingColor('error')).toBe('#ff4444');
    });

    it('should return primary color for unknown types', () => {
      expect(assetManager.getBrandingColor('unknown' as any)).toBe('#1a1a1a');
    });
  });

  describe('applyStatusColor', () => {
    it('should apply correct colors based on status', () => {
      const element = document.createElement('div');

      assetManager.applyStatusColor(element, 'pass');
      expect(element.style.color).toBe('rgb(0, 200, 81)'); // CSS converts hex to rgb

      assetManager.applyStatusColor(element, 'warn');
      expect(element.style.color).toBe('rgb(255, 187, 51)'); // CSS converts hex to rgb

      assetManager.applyStatusColor(element, 'fail');
      expect(element.style.color).toBe('rgb(255, 68, 68)'); // CSS converts hex to rgb
    });
  });

  describe('getChartColorScheme', () => {
    it('should return chart color scheme from branding config', () => {
      const colorScheme = assetManager.getChartColorScheme();
      
      expect(colorScheme).toBeDefined();
      expect(colorScheme.primary).toEqual(expect.arrayContaining(['#3B82F6', '#10B981', '#F59E0B']));
      expect(colorScheme.success).toEqual(expect.arrayContaining(['#10B981', '#059669', '#047857']));
      expect(colorScheme.warning).toEqual(expect.arrayContaining(['#F59E0B', '#D97706', '#B45309']));
      expect(colorScheme.error).toEqual(expect.arrayContaining(['#EF4444', '#DC2626', '#B91C1C']));
      expect(colorScheme.neutral).toEqual(expect.arrayContaining(['#6B7280', '#9CA3AF', '#D1D5DB']));
    });
  });

  describe('generateCSSVariables', () => {
    it('should generate CSS variables string with all branding colors', () => {
      const cssVars = assetManager.generateCSSVariables();

      expect(cssVars).toContain('--blackbox-primary-color: #1a1a1a');
      expect(cssVars).toContain('--blackbox-secondary-color: #4a90e2');
      expect(cssVars).toContain('--blackbox-accent-color: #00c851');
      expect(cssVars).toContain('--blackbox-warning-color: #ffbb33');
      expect(cssVars).toContain('--blackbox-error-color: #ff4444');
      expect(cssVars).toContain('--blackbox-font-family: system-ui');
    });
  });

  describe('error handling', () => {
    it('should handle fetch errors gracefully during initialization', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const newAssetManager = new AssetManager();
      // Should not throw
      await expect(newAssetManager.initialize()).resolves.toBeUndefined();

      // Should fall back to default branding
      const branding = newAssetManager.getBrandingElements();
      expect(branding.productName).toBe('Blackbox');
    });

    it('should handle invalid JSON response gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      const newAssetManager = new AssetManager();
      await newAssetManager.initialize();

      // Should fall back to default branding
      const branding = newAssetManager.getBrandingElements();
      expect(branding.productName).toBe('Blackbox');
    });

    it('should handle HTTP error responses', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404
      });

      const newAssetManager = new AssetManager();
      await newAssetManager.initialize();

      // Should fall back to default branding
      const branding = newAssetManager.getBrandingElements();
      expect(branding.productName).toBe('Blackbox');
    });
  });

  describe('logo fallback handling', () => {
    it('should create text fallback when logo fails to load', () => {
      const logo = assetManager.createLogoElement();
      
      // Simulate logo load error
      if (logo && logo.onerror) {
        logo.onerror(new Event('error'));
      }

      // Should attempt SVG fallback first
      expect(logo?.src).toContain('logo.svg');
    });
  });

  describe('environment detection', () => {
    it('should use Chrome extension URLs when chrome.runtime is available', () => {
      const logo = assetManager.createLogoElement();
      expect(logo?.src).toBe('chrome-extension://test/assets/logo.png');
    });

    it('should use relative URLs when chrome.runtime is not available', () => {
      delete (global as any).chrome;
      
      const newAssetManager = new AssetManager();
      const logo = newAssetManager.createLogoElement();
      // In test environment, relative URLs get resolved to localhost
      expect(logo?.src).toContain('assets/logo.png');
    });
  });
});