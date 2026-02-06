/**
 * ProfileManager - Data persistence for page analysis profiles
 * 
 * This class manages saving, retrieving, and organizing analysis profiles
 * using Chrome extension storage for persistence across sessions.
 */

import { 
  ProfileManager as IProfileManager,
  SavedProfile,
  ReportData,
  BrowserInfo,
  Phase2Error
} from '../types/phase2';
import { AllMetrics, Thresholds, OverallHealth } from '../types/index';

export class ProfileManager implements IProfileManager {
  private readonly STORAGE_KEY = 'blackbox_profiles';
  private readonly MAX_PROFILES = 50; // Limit to prevent storage bloat

  /**
   * Save a complete analysis profile
   */
  public async saveProfile(analysis: OverallHealth, url: string): Promise<string> {
    try {
      const profileId = this.generateProfileId();
      const timestamp = Date.now();
      
      // Get current metrics and thresholds from the analysis context
      // Note: In a real implementation, these would be passed as parameters
      const metrics = this.extractMetricsFromAnalysis(analysis);
      const thresholds = this.getDefaultThresholds();
      
      const profile: SavedProfile = {
        id: profileId,
        url: this.sanitizeUrl(url),
        timestamp,
        analysis,
        metrics,
        thresholds,
        browserInfo: this.getBrowserInfo()
      };

      // Get existing profiles
      const existingProfiles = await this.getProfiles();
      
      // Add new profile at the beginning (newest first)
      const updatedProfiles = [profile, ...existingProfiles];
      
      // Limit the number of stored profiles
      const limitedProfiles = updatedProfiles.slice(0, this.MAX_PROFILES);
      
      // Save to Chrome storage
      await this.saveToStorage(limitedProfiles);
      
      return profileId;
      
    } catch (error) {
      console.error('Failed to save profile:', error);
      throw this.createProfileError('STORAGE_ERROR', 'Failed to save analysis profile', error);
    }
  }

  /**
   * Retrieve all saved profiles
   */
  public async getProfiles(): Promise<SavedProfile[]> {
    try {
      const result = await chrome.storage.local.get([this.STORAGE_KEY]);
      const profiles = result[this.STORAGE_KEY] || [];
      
      // Sort by timestamp (newest first) and validate
      return profiles
        .filter((profile: any) => this.isValidProfile(profile))
        .sort((a: SavedProfile, b: SavedProfile) => b.timestamp - a.timestamp);
        
    } catch (error) {
      console.error('Failed to retrieve profiles:', error);
      // Return empty array as fallback
      return [];
    }
  }

  /**
   * Delete a specific profile
   */
  public async deleteProfile(profileId: string): Promise<void> {
    try {
      const existingProfiles = await this.getProfiles();
      const filteredProfiles = existingProfiles.filter(profile => profile.id !== profileId);
      
      await this.saveToStorage(filteredProfiles);
      
    } catch (error) {
      console.error('Failed to delete profile:', error);
      throw this.createProfileError('STORAGE_ERROR', 'Failed to delete profile', error);
    }
  }

  /**
   * Export profile data for reporting
   */
  public async exportProfile(profileId: string): Promise<ReportData> {
    try {
      const profiles = await this.getProfiles();
      const profile = profiles.find(p => p.id === profileId);
      
      if (!profile) {
        throw new Error(`Profile with ID ${profileId} not found`);
      }

      // Convert profile to report data format
      const reportData: ReportData = {
        metadata: {
          generatedAt: new Date(profile.timestamp),
          url: profile.url,
          browserInfo: profile.browserInfo,
          reportType: 'text'
        },
        summary: this.generateProfileSummary(profile),
        metricsTable: this.formatProfileMetrics(profile),
        recommendations: profile.analysis.worstOffenders || [],
        charts: [], // Charts will be empty for historical profiles
        rawData: profile.metrics
      };

      return reportData;
      
    } catch (error) {
      console.error('Failed to export profile:', error);
      throw this.createProfileError('STORAGE_ERROR', 'Failed to export profile data', error);
    }
  }

  /**
   * Get profile statistics
   */
  public async getProfileStats(): Promise<{ count: number; oldestDate: Date | null; newestDate: Date | null }> {
    try {
      const profiles = await this.getProfiles();
      
      if (profiles.length === 0) {
        return { count: 0, oldestDate: null, newestDate: null };
      }

      const timestamps = profiles.map(p => p.timestamp);
      const oldestTimestamp = Math.min(...timestamps);
      const newestTimestamp = Math.max(...timestamps);

      return {
        count: profiles.length,
        oldestDate: new Date(oldestTimestamp),
        newestDate: new Date(newestTimestamp)
      };
      
    } catch (error) {
      console.error('Failed to get profile stats:', error);
      return { count: 0, oldestDate: null, newestDate: null };
    }
  }

  /**
   * Clear all profiles
   */
  public async clearAllProfiles(): Promise<void> {
    try {
      await chrome.storage.local.remove([this.STORAGE_KEY]);
    } catch (error) {
      console.error('Failed to clear profiles:', error);
      throw this.createProfileError('STORAGE_ERROR', 'Failed to clear all profiles', error);
    }
  }

  // Private helper methods

  /**
   * Generate unique profile ID
   */
  private generateProfileId(): string {
    return `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sanitize URL for storage and display
   */
  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      
      // Remove sensitive query parameters
      const sensitiveParams = ['token', 'key', 'password', 'auth', 'session', 'api_key', 'access_token'];
      sensitiveParams.forEach(param => {
        urlObj.searchParams.delete(param);
      });
      
      // For display purposes, create a clean readable URL
      let displayUrl = `${urlObj.protocol}//${urlObj.hostname}`;
      
      // Add port if not standard
      if (urlObj.port && 
          !((urlObj.protocol === 'http:' && urlObj.port === '80') || 
            (urlObj.protocol === 'https:' && urlObj.port === '443'))) {
        displayUrl += `:${urlObj.port}`;
      }
      
      // Add pathname if not root
      if (urlObj.pathname && urlObj.pathname !== '/') {
        displayUrl += urlObj.pathname;
      }
      
      // Add search params if any remain after sanitization
      if (urlObj.search) {
        displayUrl += urlObj.search;
      }
      
      // Limit total length for storage
      return displayUrl.length > 150 ? displayUrl.substring(0, 147) + '...' : displayUrl;
      
    } catch (error) {
      // If URL parsing fails, clean up the raw URL
      const cleanUrl = url.replace(/[?&](token|key|password|auth|session|api_key|access_token)=[^&]*/gi, '');
      return cleanUrl.length > 150 ? cleanUrl.substring(0, 147) + '...' : cleanUrl;
    }
  }

  /**
   * Extract metrics from analysis (placeholder - would need actual metrics)
   */
  private extractMetricsFromAnalysis(_analysis: OverallHealth): AllMetrics {
    // In a real implementation, this would extract actual metrics
    // For now, return a basic structure
    return {
      navigation: {
        available: true,
        loadTime: 0,
        ttfb: 0,
        domContentLoaded: 0
      },
      resource: {
        available: false,
        totalSize: 0,
        resourceCount: 0,
        largestResource: { name: '', size: 0, type: '' }
      },
      rendering: {
        available: false,
        firstPaint: 0,
        largestContentfulPaint: 0
      },
      network: {
        available: false,
        slowestRequest: { url: '', duration: 0 },
        ajaxCount: 0
      }
    };
  }

  /**
   * Get default thresholds
   */
  private getDefaultThresholds(): Thresholds {
    return {
      loadTime: 3000,
      ttfb: 1000,
      pageSize: 5 * 1024 * 1024 // 5MB
    };
  }

  /**
   * Get browser information
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
   * Save profiles to Chrome storage
   */
  private async saveToStorage(profiles: SavedProfile[]): Promise<void> {
    try {
      await chrome.storage.local.set({ [this.STORAGE_KEY]: profiles });
    } catch (error) {
      // Check if it's a quota exceeded error
      if (error instanceof Error && error.message.includes('QUOTA_BYTES')) {
        // Remove oldest profiles and try again
        const reducedProfiles = profiles.slice(0, Math.floor(profiles.length * 0.8));
        await chrome.storage.local.set({ [this.STORAGE_KEY]: reducedProfiles });
      } else {
        throw error;
      }
    }
  }

  /**
   * Validate profile structure
   */
  private isValidProfile(profile: any): profile is SavedProfile {
    return (
      profile &&
      typeof profile.id === 'string' &&
      typeof profile.url === 'string' &&
      typeof profile.timestamp === 'number' &&
      profile.analysis &&
      profile.metrics &&
      profile.thresholds &&
      profile.browserInfo
    );
  }

  /**
   * Generate summary for profile
   */
  private generateProfileSummary(profile: SavedProfile): string {
    const date = new Date(profile.timestamp).toLocaleDateString();
    const time = new Date(profile.timestamp).toLocaleTimeString();
    const status = profile.analysis.status;
    const score = profile.analysis.score;

    return `Performance analysis from ${date} at ${time}
    
Overall Status: ${status}
Score: ${score}/100
URL: ${profile.url}
Browser: ${profile.browserInfo.name} ${profile.browserInfo.version}

This is a historical analysis profile saved from a previous session.`;
  }

  /**
   * Format profile metrics for display
   */
  private formatProfileMetrics(profile: SavedProfile): string {
    const metrics = profile.metrics;
    let output = 'HISTORICAL PERFORMANCE METRICS\n';
    output += '=====================================\n\n';

    if (metrics.navigation.available) {
      output += 'Navigation Timing:\n';
      output += `  Load Time: ${this.formatTime(metrics.navigation.loadTime)}\n`;
      output += `  Time to First Byte: ${this.formatTime(metrics.navigation.ttfb)}\n`;
      output += `  DOM Content Loaded: ${this.formatTime(metrics.navigation.domContentLoaded)}\n\n`;
    }

    if (metrics.resource.available) {
      output += 'Resource Analysis:\n';
      output += `  Total Page Size: ${this.formatSize(metrics.resource.totalSize)}\n`;
      output += `  Resource Count: ${metrics.resource.resourceCount}\n\n`;
    }

    if (metrics.rendering.available) {
      output += 'Rendering Performance:\n';
      output += `  First Paint: ${this.formatTime(metrics.rendering.firstPaint)}\n`;
      output += `  First Contentful Paint: ${this.formatTime(metrics.rendering.largestContentfulPaint)}\n`;
      output += `  Largest Contentful Paint: ${this.formatTime(metrics.rendering.largestContentfulPaint)}\n\n`;
    }

    output += `Analysis Date: ${new Date(profile.timestamp).toLocaleString()}\n`;
    output += `Browser: ${profile.browserInfo.name} ${profile.browserInfo.version}\n`;

    return output;
  }

  /**
   * Format time values
   */
  private formatTime(milliseconds: number): string {
    if (milliseconds >= 1000) {
      return `${(milliseconds / 1000).toFixed(2)}s`;
    } else {
      return `${Math.round(milliseconds)}ms`;
    }
  }

  /**
   * Format size values
   */
  private formatSize(bytes: number): string {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    } else if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else {
      return `${bytes} B`;
    }
  }

  /**
   * Create a Phase2Error for profile operations
   */
  private createProfileError(type: 'STORAGE_ERROR', message: string, originalError?: any): Phase2Error {
    const error = new Error(message) as Phase2Error;
    error.type = type;
    error.context = originalError;
    error.recoverable = true;
    error.fallback = 'Continue without profile functionality';
    return error;
  }
}

// Export singleton instance for global use
export const profileManager = new ProfileManager();