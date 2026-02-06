/**
 * ProfileManager Tests
 * 
 * Tests for the ProfileManager class that handles saving, retrieving,
 * and managing analysis profiles using Chrome extension storage.
 */

import { ProfileManager } from '../ProfileManager';
import { OverallHealth } from '../../types/index';
import { SavedProfile } from '../../types/phase2';

// Mock Chrome storage API
const mockChromeStorage = {
  local: {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn()
  }
};

// Mock global chrome object
(global as any).chrome = {
  storage: mockChromeStorage
};

describe('ProfileManager', () => {
  let profileManager: ProfileManager;
  let mockHealth: OverallHealth;

  beforeEach(() => {
    profileManager = new ProfileManager();
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock health data
    mockHealth = {
      status: 'PASS',
      score: 85,
      worstOffenders: ['Large image files', 'Slow server response'],
      results: []
    };

    // Mock successful storage operations by default
    mockChromeStorage.local.get.mockResolvedValue({});
    mockChromeStorage.local.set.mockResolvedValue(undefined);
    mockChromeStorage.local.remove.mockResolvedValue(undefined);
  });

  describe('saveProfile', () => {
    it('should save a profile successfully', async () => {
      const url = 'https://example.com';
      
      const profileId = await profileManager.saveProfile(mockHealth, url);
      
      expect(profileId).toMatch(/^profile_\d+_[a-z0-9]+$/);
      expect(mockChromeStorage.local.set).toHaveBeenCalledWith({
        blackbox_profiles: expect.arrayContaining([
          expect.objectContaining({
            id: profileId,
            url: 'https://example.com',
            analysis: mockHealth,
            timestamp: expect.any(Number),
            metrics: expect.any(Object),
            thresholds: expect.any(Object),
            browserInfo: expect.any(Object)
          })
        ])
      });
    });

    it('should sanitize URLs with sensitive parameters', async () => {
      const url = 'https://example.com?token=secret&key=private&normal=value';
      
      await profileManager.saveProfile(mockHealth, url);
      
      const savedProfile = mockChromeStorage.local.set.mock.calls[0][0].blackbox_profiles[0];
      expect(savedProfile.url).toBe('https://example.com?normal=value');
    });

    it('should limit profiles to maximum count', async () => {
      // Mock existing profiles (49 profiles)
      const existingProfiles = Array.from({ length: 49 }, (_, i) => ({
        id: `profile_${i}`,
        url: `https://example${i}.com`,
        timestamp: Date.now() - i * 1000,
        analysis: mockHealth,
        metrics: {},
        thresholds: {},
        browserInfo: { name: 'Chrome', version: '100', userAgent: '', platform: 'Win32' }
      }));

      mockChromeStorage.local.get.mockResolvedValue({
        blackbox_profiles: existingProfiles
      });

      await profileManager.saveProfile(mockHealth, 'https://new.com');

      const savedProfiles = mockChromeStorage.local.set.mock.calls[0][0].blackbox_profiles;
      expect(savedProfiles).toHaveLength(50); // Should be exactly at the limit
    });

    it('should handle storage errors gracefully', async () => {
      mockChromeStorage.local.set.mockRejectedValue(new Error('Storage error'));

      await expect(profileManager.saveProfile(mockHealth, 'https://example.com'))
        .rejects.toThrow('Failed to save analysis profile');
    });
  });

  describe('getProfiles', () => {
    it('should retrieve and sort profiles by timestamp', async () => {
      const mockProfiles = [
        {
          id: 'profile_1',
          url: 'https://example1.com',
          timestamp: 1000,
          analysis: mockHealth,
          metrics: {},
          thresholds: {},
          browserInfo: { name: 'Chrome', version: '100', userAgent: '', platform: 'Win32' }
        },
        {
          id: 'profile_2',
          url: 'https://example2.com',
          timestamp: 2000,
          analysis: mockHealth,
          metrics: {},
          thresholds: {},
          browserInfo: { name: 'Chrome', version: '100', userAgent: '', platform: 'Win32' }
        }
      ];

      mockChromeStorage.local.get.mockResolvedValue({
        blackbox_profiles: mockProfiles
      });

      const profiles = await profileManager.getProfiles();

      expect(profiles).toHaveLength(2);
      expect(profiles[0].timestamp).toBe(2000); // Newest first
      expect(profiles[1].timestamp).toBe(1000);
    });

    it('should filter out invalid profiles', async () => {
      const mockProfiles = [
        {
          id: 'profile_1',
          url: 'https://example1.com',
          timestamp: 1000,
          analysis: mockHealth,
          metrics: {},
          thresholds: {},
          browserInfo: { name: 'Chrome', version: '100', userAgent: '', platform: 'Win32' }
        },
        {
          // Invalid profile - missing required fields
          id: 'profile_2',
          url: 'https://example2.com'
        }
      ];

      mockChromeStorage.local.get.mockResolvedValue({
        blackbox_profiles: mockProfiles
      });

      const profiles = await profileManager.getProfiles();

      expect(profiles).toHaveLength(1);
      expect(profiles[0].id).toBe('profile_1');
    });

    it('should return empty array when no profiles exist', async () => {
      mockChromeStorage.local.get.mockResolvedValue({});

      const profiles = await profileManager.getProfiles();

      expect(profiles).toEqual([]);
    });

    it('should handle storage errors gracefully', async () => {
      mockChromeStorage.local.get.mockRejectedValue(new Error('Storage error'));

      const profiles = await profileManager.getProfiles();

      expect(profiles).toEqual([]);
    });
  });

  describe('deleteProfile', () => {
    it('should delete a specific profile', async () => {
      const mockProfiles = [
        {
          id: 'profile_1',
          url: 'https://example1.com',
          timestamp: 1000,
          analysis: mockHealth,
          metrics: {},
          thresholds: {},
          browserInfo: { name: 'Chrome', version: '100', userAgent: '', platform: 'Win32' }
        },
        {
          id: 'profile_2',
          url: 'https://example2.com',
          timestamp: 2000,
          analysis: mockHealth,
          metrics: {},
          thresholds: {},
          browserInfo: { name: 'Chrome', version: '100', userAgent: '', platform: 'Win32' }
        }
      ];

      mockChromeStorage.local.get.mockResolvedValue({
        blackbox_profiles: mockProfiles
      });

      await profileManager.deleteProfile('profile_1');

      const savedProfiles = mockChromeStorage.local.set.mock.calls[0][0].blackbox_profiles;
      expect(savedProfiles).toHaveLength(1);
      expect(savedProfiles[0].id).toBe('profile_2');
    });

    it('should handle deletion of non-existent profile', async () => {
      mockChromeStorage.local.get.mockResolvedValue({
        blackbox_profiles: []
      });

      await expect(profileManager.deleteProfile('non-existent'))
        .resolves.not.toThrow();
    });
  });

  describe('exportProfile', () => {
    it('should export profile data for reporting', async () => {
      const mockProfile: SavedProfile = {
        id: 'profile_1',
        url: 'https://example.com',
        timestamp: 1640995200000, // 2022-01-01
        analysis: mockHealth,
        metrics: {
          navigation: {
            available: true,
            loadTime: 1500,
            ttfb: 200,
            domContentLoaded: 1000
          },
          resource: { available: false, totalSize: 0, resourceCount: 0, largestResource: { name: '', size: 0, type: '' } },
          rendering: { available: false, firstPaint: 0, largestContentfulPaint: 0 },
          network: { available: false, slowestRequest: { url: '', duration: 0 }, ajaxCount: 0 }
        },
        thresholds: { loadTime: 3000, ttfb: 1000, pageSize: 5242880 },
        browserInfo: { name: 'Chrome', version: '100', userAgent: '', platform: 'Win32' }
      };

      mockChromeStorage.local.get.mockResolvedValue({
        blackbox_profiles: [mockProfile]
      });

      const reportData = await profileManager.exportProfile('profile_1');

      expect(reportData).toMatchObject({
        metadata: {
          generatedAt: new Date(1640995200000),
          url: 'https://example.com',
          reportType: 'text'
        },
        summary: expect.stringContaining('Performance analysis from'),
        metricsTable: expect.stringContaining('HISTORICAL PERFORMANCE METRICS'),
        recommendations: mockHealth.worstOffenders,
        charts: [],
        rawData: mockProfile.metrics
      });
    });

    it('should throw error for non-existent profile', async () => {
      mockChromeStorage.local.get.mockResolvedValue({
        blackbox_profiles: []
      });

      await expect(profileManager.exportProfile('non-existent'))
        .rejects.toThrow('Failed to export profile data');
    });
  });

  describe('getProfileStats', () => {
    it('should return correct statistics', async () => {
      const mockProfiles = [
        {
          id: 'profile_1',
          timestamp: 1000,
          url: 'https://example1.com',
          analysis: mockHealth,
          metrics: {},
          thresholds: {},
          browserInfo: { name: 'Chrome', version: '100', userAgent: '', platform: 'Win32' }
        },
        {
          id: 'profile_2',
          timestamp: 3000,
          url: 'https://example2.com',
          analysis: mockHealth,
          metrics: {},
          thresholds: {},
          browserInfo: { name: 'Chrome', version: '100', userAgent: '', platform: 'Win32' }
        }
      ];

      mockChromeStorage.local.get.mockResolvedValue({
        blackbox_profiles: mockProfiles
      });

      const stats = await profileManager.getProfileStats();

      expect(stats).toEqual({
        count: 2,
        oldestDate: new Date(1000),
        newestDate: new Date(3000)
      });
    });

    it('should handle empty profiles', async () => {
      mockChromeStorage.local.get.mockResolvedValue({
        blackbox_profiles: []
      });

      const stats = await profileManager.getProfileStats();

      expect(stats).toEqual({
        count: 0,
        oldestDate: null,
        newestDate: null
      });
    });
  });

  describe('clearAllProfiles', () => {
    it('should clear all profiles', async () => {
      await profileManager.clearAllProfiles();

      expect(mockChromeStorage.local.remove).toHaveBeenCalledWith(['blackbox_profiles']);
    });

    it('should handle storage errors', async () => {
      mockChromeStorage.local.remove.mockRejectedValue(new Error('Storage error'));

      await expect(profileManager.clearAllProfiles())
        .rejects.toThrow('Failed to clear all profiles');
    });
  });

  describe('browser detection', () => {
    it('should detect Chrome browser', async () => {
      // Mock navigator
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
        configurable: true
      });

      await profileManager.saveProfile(mockHealth, 'https://example.com');

      const savedProfile = mockChromeStorage.local.set.mock.calls[0][0].blackbox_profiles[0];
      expect(savedProfile.browserInfo.name).toBe('Chrome');
      expect(savedProfile.browserInfo.version).toBe('100.0.4896.127');
    });

    it('should detect Firefox browser', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:98.0) Gecko/20100101 Firefox/98.0',
        configurable: true
      });

      await profileManager.saveProfile(mockHealth, 'https://example.com');

      const savedProfile = mockChromeStorage.local.set.mock.calls[0][0].blackbox_profiles[0];
      expect(savedProfile.browserInfo.name).toBe('Firefox');
      expect(savedProfile.browserInfo.version).toBe('98.0');
    });
  });

  describe('URL sanitization', () => {
    it('should handle malformed URLs', async () => {
      const malformedUrl = 'not-a-valid-url';
      
      await profileManager.saveProfile(mockHealth, malformedUrl);

      const savedProfile = mockChromeStorage.local.set.mock.calls[0][0].blackbox_profiles[0];
      expect(savedProfile.url).toBe(malformedUrl);
    });

    it('should truncate very long URLs', async () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(300);
      
      await profileManager.saveProfile(mockHealth, longUrl);

      const savedProfile = mockChromeStorage.local.set.mock.calls[0][0].blackbox_profiles[0];
      expect(savedProfile.url.length).toBeLessThanOrEqual(203); // 200 + '...'
      expect(savedProfile.url).toContain('...');
    });
  });

  describe('storage quota handling', () => {
    it('should handle quota exceeded errors', async () => {
      const quotaError = new Error('QUOTA_BYTES exceeded');
      mockChromeStorage.local.set
        .mockRejectedValueOnce(quotaError)
        .mockResolvedValueOnce(undefined);

      // Mock existing profiles
      const existingProfiles = Array.from({ length: 10 }, (_, i) => ({
        id: `profile_${i}`,
        url: `https://example${i}.com`,
        timestamp: Date.now() - i * 1000,
        analysis: mockHealth,
        metrics: {},
        thresholds: {},
        browserInfo: { name: 'Chrome', version: '100', userAgent: '', platform: 'Win32' }
      }));

      mockChromeStorage.local.get.mockResolvedValue({
        blackbox_profiles: existingProfiles
      });

      await profileManager.saveProfile(mockHealth, 'https://new.com');

      // Should have tried twice - once with all profiles, then with reduced set
      expect(mockChromeStorage.local.set).toHaveBeenCalledTimes(2);
      
      // Second call should have fewer profiles (80% of original)
      const secondCallProfiles = mockChromeStorage.local.set.mock.calls[1][0].blackbox_profiles;
      expect(secondCallProfiles.length).toBe(8); // 80% of 10 = 8
    });
  });
});