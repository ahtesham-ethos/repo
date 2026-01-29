/**
 * Profiles page for Blackbox extension
 * Handles viewing, managing, and exporting saved analysis profiles
 */

import { profileManager } from './services/ProfileManager';
import { SavedProfile } from './types/phase2';
import { reportGenerator } from './services/ReportGenerator';

class ProfilesPage {
  private profiles: SavedProfile[] = [];

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the profiles page
   */
  private async initialize(): Promise<void> {
    try {
      this.setupEventListeners();
      await this.loadProfiles();
    } catch (error) {
      console.error('Failed to initialize profiles page:', error);
      this.showError('Failed to load profiles');
    }
  }

  /**
   * Setup event listeners for the profiles page
   */
  private setupEventListeners(): void {
    const backBtn = document.getElementById('back-to-popup');
    const clearAllBtn = document.getElementById('clear-all-btn');
    const exportAllBtn = document.getElementById('export-all-btn');
    const goToDashboardBtn = document.getElementById('go-to-dashboard');

    if (backBtn) {
      backBtn.addEventListener('click', () => this.goBackToPopup());
    }

    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => this.clearAllProfiles());
    }

    if (exportAllBtn) {
      exportAllBtn.addEventListener('click', () => this.exportAllProfiles());
    }

    if (goToDashboardBtn) {
      goToDashboardBtn.addEventListener('click', () => this.goBackToPopup());
    }
  }

  /**
   * Load all saved profiles
   */
  private async loadProfiles(): Promise<void> {
    try {
      this.showLoading();
      
      this.profiles = await profileManager.getProfiles();
      const stats = await profileManager.getProfileStats();
      
      this.hideLoading();
      
      if (this.profiles.length === 0) {
        this.showEmptyState();
      } else {
        this.showProfilesList();
        this.updateStats(stats);
      }
      
    } catch (error) {
      console.error('Failed to load profiles:', error);
      this.hideLoading();
      this.showError('Failed to load profiles');
    }
  }

  /**
   * Show loading state
   */
  private showLoading(): void {
    const loadingState = document.getElementById('loading-state');
    const profilesList = document.getElementById('profiles-list');
    const emptyState = document.getElementById('empty-state');
    const profilesStats = document.getElementById('profiles-stats');
    const profilesActions = document.getElementById('profiles-actions');

    if (loadingState) loadingState.style.display = 'block';
    if (profilesList) profilesList.style.display = 'none';
    if (emptyState) emptyState.style.display = 'none';
    if (profilesStats) profilesStats.style.display = 'none';
    if (profilesActions) profilesActions.style.display = 'none';
  }

  /**
   * Hide loading state
   */
  private hideLoading(): void {
    const loadingState = document.getElementById('loading-state');
    if (loadingState) loadingState.style.display = 'none';
  }

  /**
   * Show empty state
   */
  private showEmptyState(): void {
    const emptyState = document.getElementById('empty-state');
    const profilesList = document.getElementById('profiles-list');
    const profilesStats = document.getElementById('profiles-stats');
    const profilesActions = document.getElementById('profiles-actions');

    if (emptyState) emptyState.style.display = 'block';
    if (profilesList) profilesList.style.display = 'none';
    if (profilesStats) profilesStats.style.display = 'none';
    if (profilesActions) profilesActions.style.display = 'none';
  }

  /**
   * Show profiles list
   */
  private showProfilesList(): void {
    const profilesList = document.getElementById('profiles-list');
    const emptyState = document.getElementById('empty-state');
    const profilesStats = document.getElementById('profiles-stats');
    const profilesActions = document.getElementById('profiles-actions');

    if (profilesList) {
      profilesList.style.display = 'block';
      this.renderProfiles();
    }
    if (emptyState) emptyState.style.display = 'none';
    if (profilesStats) profilesStats.style.display = 'flex';
    if (profilesActions) profilesActions.style.display = 'flex';
  }

  /**
   * Render profiles list
   */
  private renderProfiles(): void {
    const profilesList = document.getElementById('profiles-list');
    if (!profilesList) return;

    profilesList.innerHTML = this.profiles.map(profile => this.renderProfileItem(profile)).join('');

    // Add event listeners for profile actions
    this.setupProfileActionListeners();
  }

  /**
   * Render individual profile item
   */
  private renderProfileItem(profile: SavedProfile): string {
    const date = new Date(profile.timestamp).toLocaleDateString();
    const time = new Date(profile.timestamp).toLocaleTimeString();
    const statusClass = profile.analysis.status.toLowerCase();
    const statusText = this.getStatusText(profile.analysis.status);

    return `
      <div class="profile-item" data-profile-id="${profile.id}">
        <div class="profile-info">
          <div class="profile-url">${profile.url}</div>
          <div class="profile-meta">
            <span>📅 ${date} at ${time}</span>
            <span>🌐 ${profile.browserInfo.name} ${profile.browserInfo.version}</span>
            <span>📊 Score: ${profile.analysis.score}/100</span>
          </div>
        </div>
        <div class="profile-status">
          <div class="status-badge status-${statusClass}">${statusText}</div>
        </div>
        <div class="profile-actions">
          <button class="profile-btn profile-btn-copy" data-action="copy" data-profile-id="${profile.id}" title="Copy Report">
            📄 Copy
          </button>
          <button class="profile-btn profile-btn-print" data-action="print" data-profile-id="${profile.id}" title="Export PDF">
            🖨️ PDF
          </button>
          <button class="profile-btn profile-btn-delete" data-action="delete" data-profile-id="${profile.id}" title="Delete Profile">
            🗑️ Delete
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Setup event listeners for profile actions
   */
  private setupProfileActionListeners(): void {
    const profilesList = document.getElementById('profiles-list');
    if (!profilesList) return;

    profilesList.addEventListener('click', async (event) => {
      const target = event.target as HTMLElement;
      const button = target.closest('[data-action]') as HTMLElement;
      
      if (!button) return;

      const action = button.getAttribute('data-action');
      const profileId = button.getAttribute('data-profile-id');

      if (!action || !profileId) return;

      event.preventDefault();
      event.stopPropagation();

      try {
        switch (action) {
          case 'copy':
            await this.copyProfile(profileId);
            break;
          case 'print':
            await this.printProfile(profileId);
            break;
          case 'delete':
            await this.deleteProfile(profileId);
            break;
        }
      } catch (error) {
        console.error(`Failed to ${action} profile:`, error);
        this.showError(`Failed to ${action} profile`);
      }
    });
  }

  /**
   * Copy profile report to clipboard
   */
  private async copyProfile(profileId: string): Promise<void> {
    const profile = this.profiles.find(p => p.id === profileId);
    if (!profile) return;

    const reportData = await profileManager.exportProfile(profileId);
    const reportText = reportGenerator.generateTextReport(profile.analysis, reportData.metadata);

    await this.copyToClipboard(reportText);
    this.showSuccess('Profile report copied to clipboard!');
  }

  /**
   * Export profile as PDF
   */
  private async printProfile(profileId: string): Promise<void> {
    // For now, just copy the report text since PDF generation is complex
    // In a full implementation, this would generate and download a PDF
    await this.copyProfile(profileId);
    this.showSuccess('Profile report copied to clipboard! (PDF export coming soon)');
  }

  /**
   * Delete a profile
   */
  private async deleteProfile(profileId: string): Promise<void> {
    if (!confirm('Are you sure you want to delete this profile? This action cannot be undone.')) {
      return;
    }

    await profileManager.deleteProfile(profileId);
    
    // Remove from local array and re-render
    this.profiles = this.profiles.filter(p => p.id !== profileId);
    
    if (this.profiles.length === 0) {
      this.showEmptyState();
    } else {
      this.renderProfiles();
      const stats = await profileManager.getProfileStats();
      this.updateStats(stats);
    }
    
    this.showSuccess('Profile deleted successfully!');
  }

  /**
   * Clear all profiles
   */
  private async clearAllProfiles(): Promise<void> {
    if (!confirm('Are you sure you want to delete ALL profiles? This action cannot be undone.')) {
      return;
    }

    await profileManager.clearAllProfiles();
    this.profiles = [];
    this.showEmptyState();
    this.showSuccess('All profiles cleared successfully!');
  }

  /**
   * Export all profiles
   */
  private async exportAllProfiles(): Promise<void> {
    if (this.profiles.length === 0) return;

    let allReports = 'BLACKBOX ANALYSIS PROFILES EXPORT\n';
    allReports += '=====================================\n\n';

    for (const profile of this.profiles) {
      const reportData = await profileManager.exportProfile(profile.id);
      const reportText = reportGenerator.generateTextReport(profile.analysis, reportData.metadata);
      allReports += reportText + '\n\n' + '='.repeat(50) + '\n\n';
    }

    await this.copyToClipboard(allReports);
    this.showSuccess('All profiles exported to clipboard!');
  }

  /**
   * Update statistics display
   */
  private updateStats(stats: { count: number; oldestDate: Date | null; newestDate: Date | null }): void {
    const totalElement = document.getElementById('total-profiles');
    const newestElement = document.getElementById('newest-date');
    const oldestElement = document.getElementById('oldest-date');

    if (totalElement) totalElement.textContent = stats.count.toString();
    if (newestElement) newestElement.textContent = stats.newestDate ? stats.newestDate.toLocaleDateString() : '-';
    if (oldestElement) oldestElement.textContent = stats.oldestDate ? stats.oldestDate.toLocaleDateString() : '-';
  }

  /**
   * Go back to the main popup
   */
  private goBackToPopup(): void {
    window.close();
  }

  /**
   * Copy text to clipboard
   */
  private async copyToClipboard(text: string): Promise<void> {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return;
      }

      // Fallback method
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
      throw new Error('Failed to copy to clipboard');
    }
  }

  /**
   * Get status text for display
   */
  private getStatusText(status: string): string {
    switch (status) {
      case 'PASS': return 'Good';
      case 'WARN': return 'Fair';
      case 'FAIL': return 'Poor';
      default: return 'Unknown';
    }
  }

  /**
   * Show success message
   */
  private showSuccess(message: string): void {
    const successElement = document.getElementById('success-message');
    if (successElement) {
      successElement.textContent = message;
      successElement.style.display = 'block';
      
      setTimeout(() => {
        successElement.style.display = 'none';
      }, 3000);
    }
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
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
      
      const container = document.querySelector('.profiles-container');
      const successMessage = document.getElementById('success-message');
      if (container && successMessage) {
        container.insertBefore(errorElement, successMessage.nextSibling);
      }
    }
    
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    
    setTimeout(() => {
      errorElement.style.display = 'none';
    }, 5000);
  }
}

// Initialize the profiles page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ProfilesPage();
});