import { ConfigurationManager } from '../ConfigurationManager';

// Mock localStorage for testing
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

// Mock window.localStorage
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('ConfigurationManager', () => {
  let configManager: ConfigurationManager;

  beforeEach(() => {
    // Clear localStorage mock before each test
    localStorageMock.clear();
    jest.clearAllMocks();
    
    configManager = new ConfigurationManager();
  });

  describe('constructor and defaults', () => {
    it('should initialize with default thresholds', () => {
      const thresholds = configManager.getThresholds();

      expect(thresholds.pageSize).toBe(2 * 1024 * 1024); // 2MB
      expect(thresholds.loadTime).toBe(5000); // 5s
      expect(thresholds.ttfb).toBe(3000); // 3s
    });

    it('should return a copy of thresholds to prevent external modification', () => {
      const thresholds1 = configManager.getThresholds();
      const thresholds2 = configManager.getThresholds();

      expect(thresholds1).not.toBe(thresholds2); // Different objects
      expect(thresholds1).toEqual(thresholds2); // Same values
    });
  });

  describe('getDefaults', () => {
    it('should return default threshold values', () => {
      const defaults = configManager.getDefaults();

      expect(defaults.pageSize).toBe(2 * 1024 * 1024);
      expect(defaults.loadTime).toBe(5000);
      expect(defaults.ttfb).toBe(3000);
    });

    it('should return a copy of defaults to prevent modification', () => {
      const defaults1 = configManager.getDefaults();
      const defaults2 = configManager.getDefaults();

      expect(defaults1).not.toBe(defaults2);
      expect(defaults1).toEqual(defaults2);
    });
  });

  describe('setThreshold', () => {
    it('should set valid pageSize threshold', () => {
      configManager.setThreshold('pageSize', 3000000); // 3MB

      const thresholds = configManager.getThresholds();
      expect(thresholds.pageSize).toBe(3000000);
      expect(thresholds.loadTime).toBe(5000); // Others unchanged
      expect(thresholds.ttfb).toBe(3000);
    });

    it('should set valid loadTime threshold', () => {
      configManager.setThreshold('loadTime', 8000); // 8s

      const thresholds = configManager.getThresholds();
      expect(thresholds.loadTime).toBe(8000);
      expect(thresholds.pageSize).toBe(2 * 1024 * 1024); // Others unchanged
    });

    it('should set valid ttfb threshold', () => {
      configManager.setThreshold('ttfb', 2000); // 2s

      const thresholds = configManager.getThresholds();
      expect(thresholds.ttfb).toBe(2000);
      expect(thresholds.pageSize).toBe(2 * 1024 * 1024); // Others unchanged
    });

    it('should throw error for invalid metric name', () => {
      expect(() => {
        configManager.setThreshold('invalidMetric' as any, 1000);
      }).toThrow('Invalid metric name: invalidMetric');
    });

    it('should throw error for negative threshold value', () => {
      expect(() => {
        configManager.setThreshold('pageSize', -1000);
      }).toThrow('Invalid threshold value: -1000');
    });

    it('should throw error for zero threshold value', () => {
      expect(() => {
        configManager.setThreshold('loadTime', 0);
      }).toThrow('Invalid threshold value: 0');
    });

    it('should throw error for NaN threshold value', () => {
      expect(() => {
        configManager.setThreshold('ttfb', NaN);
      }).toThrow('Invalid threshold value: NaN');
    });

    it('should throw error for infinite threshold value', () => {
      expect(() => {
        configManager.setThreshold('pageSize', Infinity);
      }).toThrow('Invalid threshold value: Infinity');
    });
  });

  describe('validateThreshold', () => {
    it('should return true for valid positive numbers', () => {
      expect(configManager.validateThreshold(1000)).toBe(true);
      expect(configManager.validateThreshold(0.5)).toBe(true);
      expect(configManager.validateThreshold(1000000)).toBe(true);
    });

    it('should return false for invalid values', () => {
      expect(configManager.validateThreshold(0)).toBe(false);
      expect(configManager.validateThreshold(-100)).toBe(false);
      expect(configManager.validateThreshold(NaN)).toBe(false);
      expect(configManager.validateThreshold(Infinity)).toBe(false);
      expect(configManager.validateThreshold(-Infinity)).toBe(false);
    });

    it('should return false for non-number types', () => {
      expect(configManager.validateThreshold('1000' as any)).toBe(false);
      expect(configManager.validateThreshold(null as any)).toBe(false);
      expect(configManager.validateThreshold(undefined as any)).toBe(false);
    });
  });

  describe('resetToDefaults', () => {
    it('should reset all thresholds to default values', () => {
      // Modify thresholds
      configManager.setThreshold('pageSize', 5000000);
      configManager.setThreshold('loadTime', 10000);
      configManager.setThreshold('ttfb', 5000);

      // Reset to defaults
      configManager.resetToDefaults();

      const thresholds = configManager.getThresholds();
      expect(thresholds.pageSize).toBe(2 * 1024 * 1024);
      expect(thresholds.loadTime).toBe(5000);
      expect(thresholds.ttfb).toBe(3000);
    });

    it('should not affect defaults after reset', () => {
      configManager.setThreshold('pageSize', 5000000);
      configManager.resetToDefaults();

      const defaults = configManager.getDefaults();
      expect(defaults.pageSize).toBe(2 * 1024 * 1024);
    });
  });

  describe('updateThresholds', () => {
    it('should update multiple thresholds at once', () => {
      configManager.updateThresholds({
        pageSize: 3000000,
        loadTime: 8000
      });

      const thresholds = configManager.getThresholds();
      expect(thresholds.pageSize).toBe(3000000);
      expect(thresholds.loadTime).toBe(8000);
      expect(thresholds.ttfb).toBe(3000); // Unchanged
    });

    it('should update single threshold', () => {
      configManager.updateThresholds({
        ttfb: 2500
      });

      const thresholds = configManager.getThresholds();
      expect(thresholds.ttfb).toBe(2500);
      expect(thresholds.pageSize).toBe(2 * 1024 * 1024); // Unchanged
      expect(thresholds.loadTime).toBe(5000); // Unchanged
    });

    it('should throw error for invalid metric in batch update', () => {
      expect(() => {
        configManager.updateThresholds({
          pageSize: 3000000,
          invalidMetric: 1000
        } as any);
      }).toThrow('Invalid metric name: invalidMetric');
    });

    it('should throw error for invalid value in batch update', () => {
      expect(() => {
        configManager.updateThresholds({
          pageSize: 3000000,
          loadTime: -1000
        });
      }).toThrow('Invalid threshold value for loadTime: -1000');
    });

    it('should not modify any thresholds if validation fails', () => {
      const originalThresholds = configManager.getThresholds();

      expect(() => {
        configManager.updateThresholds({
          pageSize: 3000000,
          loadTime: -1000 // Invalid
        });
      }).toThrow();

      const currentThresholds = configManager.getThresholds();
      expect(currentThresholds).toEqual(originalThresholds);
    });

    it('should handle empty update object', () => {
      const originalThresholds = configManager.getThresholds();
      
      configManager.updateThresholds({});
      
      const currentThresholds = configManager.getThresholds();
      expect(currentThresholds).toEqual(originalThresholds);
    });
  });

  describe('persistence', () => {
    it('should save thresholds to localStorage when setting individual threshold', () => {
      configManager.setThreshold('pageSize', 3000000);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'page-health-analyzer-thresholds',
        JSON.stringify({
          pageSize: 3000000,
          loadTime: 5000,
          ttfb: 3000
        })
      );
    });

    it('should save thresholds to localStorage when updating multiple thresholds', () => {
      configManager.updateThresholds({
        pageSize: 4000000,
        loadTime: 8000
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'page-health-analyzer-thresholds',
        JSON.stringify({
          pageSize: 4000000,
          loadTime: 8000,
          ttfb: 3000
        })
      );
    });

    it('should save thresholds to localStorage when resetting to defaults', () => {
      // First modify thresholds
      configManager.setThreshold('pageSize', 5000000);
      jest.clearAllMocks();

      // Then reset
      configManager.resetToDefaults();

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'page-health-analyzer-thresholds',
        JSON.stringify({
          pageSize: 2 * 1024 * 1024,
          loadTime: 5000,
          ttfb: 3000
        })
      );
    });

    it('should load thresholds from localStorage on initialization', () => {
      // Set up localStorage with custom thresholds
      const customThresholds = {
        pageSize: 3000000,
        loadTime: 7000,
        ttfb: 2500
      };
      localStorageMock.setItem('page-health-analyzer-thresholds', JSON.stringify(customThresholds));

      // Create new instance (should load from storage)
      const newConfigManager = new ConfigurationManager();
      const thresholds = newConfigManager.getThresholds();

      expect(thresholds).toEqual(customThresholds);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('page-health-analyzer-thresholds');
    });

    it('should use defaults when localStorage is empty', () => {
      // Ensure localStorage is empty
      localStorageMock.getItem.mockReturnValue(null);

      const newConfigManager = new ConfigurationManager();
      const thresholds = newConfigManager.getThresholds();

      expect(thresholds).toEqual({
        pageSize: 2 * 1024 * 1024,
        loadTime: 5000,
        ttfb: 3000
      });
    });

    it('should use defaults when localStorage contains invalid JSON', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const newConfigManager = new ConfigurationManager();
      const thresholds = newConfigManager.getThresholds();

      expect(thresholds).toEqual({
        pageSize: 2 * 1024 * 1024,
        loadTime: 5000,
        ttfb: 3000
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load thresholds from storage, using defaults:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should use defaults when localStorage contains invalid threshold structure', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        pageSize: 'invalid',
        loadTime: 5000
        // Missing ttfb
      }));
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const newConfigManager = new ConfigurationManager();
      const thresholds = newConfigManager.getThresholds();

      expect(thresholds).toEqual({
        pageSize: 2 * 1024 * 1024,
        loadTime: 5000,
        ttfb: 3000
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        'Invalid thresholds data in storage, using defaults'
      );

      consoleSpy.mockRestore();
    });

    it('should handle localStorage save errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Should not throw error
      expect(() => {
        configManager.setThreshold('pageSize', 3000000);
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save thresholds to storage:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle missing localStorage gracefully', () => {
      // Mock environment without localStorage
      const originalLocalStorage = window.localStorage;
      delete (window as any).localStorage;

      const newConfigManager = new ConfigurationManager();
      const thresholds = newConfigManager.getThresholds();

      // Should use defaults
      expect(thresholds).toEqual({
        pageSize: 2 * 1024 * 1024,
        loadTime: 5000,
        ttfb: 3000
      });

      // Should not throw when trying to save
      expect(() => {
        newConfigManager.setThreshold('pageSize', 3000000);
      }).not.toThrow();

      // Restore localStorage
      (window as any).localStorage = originalLocalStorage;
    });
  });
});