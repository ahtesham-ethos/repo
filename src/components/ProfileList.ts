/**
 * ProfileList - Profile management UI component
 * 
 * This component provides a user interface for managing saved analysis profiles,
 * including listing, viewing, and generating reports from historical data.
 */

import { 
  ProfileListItem, 
  ProfileAction, 
  SavedProfile,
  Phase2Error
} from '../types/phase2';
import { AssetManager } from '../services/AssetManager';
import { profileManager } from '../services/ProfileManager';
import { reportGenerator } from '../services/ReportGenerator';
import { exportEngine } from '../services/ExportEngine';

export class ProfileList {
  private assetManager: AssetManager;
  private containerElement: HTMLElement | null = null;
  private profiles: SavedProfile[] = [];

  constructor(assetManager: AssetManager) {
    this.assetManager = assetManager;
  }

  /**
   * Render the profile list in the specified container
   */
  public async render(container: HTMLElement): Promise<void> {
    try {
      this.containerElement = container;
      this.showLoading('Loading profiles...');
      
      // Load profiles from storage
      this.profiles = await profileManager.getProfiles();
      
      this.renderProfileList();
      this.applyStyles();
      this.hideLoading();
      
    } catch (error) {
      this.handleError('Failed to load profiles', error);
    }
  }

  /**
   * Refresh the profile list
   */
  public async refresh(): Promise<void> {
    if (!this.containerElement) {
      throw new Error('ProfileList must be rendered before refreshing');
    }
    
    await this.render(this.containerElement);
  }

  /**
   * Clear the profile list display
   */
  public clear(): void {
    if (this.containerElement) {
      this.containerElement.innerHTML = '';
      this.profiles = [];
    }
  }

  /**
   * Show loading state
   */
  private showLoading(operation: string): void {
    if (this.containerElement) {
      this.containerElement.innerHTML = `
        <div class="blackbox-profile-loading">
          <div class="blackbox-loading-spinner"></div>
          <div class="blackbox-loading-text">${operation}</div>
        </div>
      `;
    }
  }

  /**
   * Hide loading state
   */
  private hideLoading(): void {
    // Loading state is cleared when content is rendered
  }

  /**
   * Render the complete profile list
   */
  private renderProfileList(): void {
    if (!this.containerElement) return;

    if (this.profiles.length === 0) {
      this.renderEmptyState();
      return;
    }

    const profileItems = this.profiles.map(profile => this.createProfileListItem(profile));
    
    const listHTML = `
      <div class="blackbox-profile-list">
        <div class="blackbox-profile-header">
          <h3 class="blackbox-profile-title">Saved Analysis Profiles</h3>
          <div class="blackbox-profile-stats">
            ${this.profiles.length} profile${this.profiles.length !== 1 ? 's' : ''} saved
          </div>
        </div>
        <div class="blackbox-profile-items">
          ${profileItems.map(item => this.renderProfileItem(item)).join('')}
        </div>
        <div class="blackbox-profile-actions">
          <button class="blackbox-profile-btn blackbox-btn-secondary" id="clear-all-profiles-btn">
            Clear All Profiles
          </button>
        </div>
      </div>
    `;

    this.containerElement.innerHTML = listHTML;
    this.setupEventListeners();
  }

  /**
   * Render empty state when no profiles exist
   */
  private renderEmptyState(): void {
    if (!this.containerElement) return;

    this.containerElement.innerHTML = `
      <div class="blackbox-profile-empty">
        <div class="blackbox-empty-icon">📋</div>
        <div class="blackbox-empty-title">No Saved Profiles</div>
        <div class="blackbox-empty-description">
          Save analysis profiles to view historical performance data and generate reports.
        </div>
      </div>
    `;
  }

  /**
   * Create a profile list item from saved profile data
   */
  private createProfileListItem(profile: SavedProfile): ProfileListItem {
    const displayDate = new Date(profile.timestamp).toLocaleString();
    const displayUrl = this.truncateUrl(profile.url, 50);
    
    const actions: ProfileAction[] = [
      {
        type: 'copy',
        label: 'Copy Report',
        icon: '📄',
        handler: (profileId: string) => this.handleCopyReport(profileId)
      },
      {
        type: 'print',
        label: 'Print PDF',
        icon: '🖨️',
        handler: (profileId: string) => this.handlePrintReport(profileId)
      },
      {
        type: 'delete',
        label: 'Delete',
        icon: '🗑️',
        handler: (profileId: string) => this.handleDeleteProfile(profileId)
      }
    ];

    return {
      profile,
      displayDate,
      displayUrl,
      actions
    };
  }

  /**
   * Render a single profile item
   */
  private renderProfileItem(item: ProfileListItem): string {
    const statusClass = item.profile.analysis.status.toLowerCase();
    const statusEmoji = this.getStatusEmoji(item.profile.analysis.status);
    
    return `
      <div class="blackbox-profile-item" data-profile-id="${item.profile.id}">
        <div class="blackbox-profile-info">
          <div class="blackbox-profile-url" title="${item.profile.url}">
            ${item.displayUrl}
          </div>
          <div class="blackbox-profile-meta">
            <span class="blackbox-profile-date">${item.displayDate}</span>
            <span class="blackbox-profile-status ${statusClass}">
              ${statusEmoji} ${item.profile.analysis.status}
            </span>
            <span class="blackbox-profile-score">
              Score: ${item.profile.analysis.score}/100
            </span>
          </div>
        </div>
        <div class="blackbox-profile-actions">
          ${item.actions.map(action => `
            <button 
              class="blackbox-profile-action-btn" 
              data-action="${action.type}"
              data-profile-id="${item.profile.id}"
              title="${action.label}"
            >
              <span class="blackbox-action-icon">${action.icon}</span>
              <span class="blackbox-action-text">${action.label}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Setup event listeners for profile actions
   */
  private setupEventListeners(): void {
    if (!this.containerElement) return;

    // Handle profile action buttons
    this.containerElement.addEventListener('click', async (event) => {
      const target = event.target as HTMLElement;
      const button = target.closest('.blackbox-profile-action-btn') as HTMLButtonElement;
      
      if (button) {
        event.preventDefault();
        event.stopPropagation();
        
        const action = button.dataset.action;
        const profileId = button.dataset.profileId;
        
        if (action && profileId) {
          await this.handleProfileAction(action as 'copy' | 'print' | 'delete', profileId);
        }
        return;
      }

      // Handle clear all profiles button
      if (target.id === 'clear-all-profiles-btn' || target.closest('#clear-all-profiles-btn')) {
        event.preventDefault();
        event.stopPropagation();
        await this.handleClearAllProfiles();
        return;
      }
    });
  }

  /**
   * Handle profile action
   */
  private async handleProfileAction(action: 'copy' | 'print' | 'delete', profileId: string): Promise<void> {
    try {
      switch (action) {
        case 'copy':
          await this.handleCopyReport(profileId);
          break;
        case 'print':
          await this.handlePrintReport(profileId);
          break;
        case 'delete':
          await this.handleDeleteProfile(profileId);
          break;
      }
    } catch (error) {
      console.error(`Failed to handle ${action} action:`, error);
      this.showActionFeedback(`Failed to ${action} profile`, 'error');
    }
  }

  /**
   * Handle copy report action
   */
  private async handleCopyReport(profileId: string): Promise<void> {
    try {
      this.setActionButtonLoading(profileId, 'copy', true);
      this.showActionFeedback('Generating report...', 'info');

      // Generate report from profile
      const reportData = await profileManager.exportProfile(profileId);
      
      // Find the profile to get the analysis data
      const profile = this.profiles.find(p => p.id === profileId);
      if (!profile) {
        throw new Error('Profile not found');
      }
      
      const reportText = reportGenerator.generateTextReport(
        profile.analysis,
        reportData.metadata
      );

      // Copy to clipboard
      await this.copyToClipboard(reportText);
      
      this.showActionFeedback('Report copied to clipboard!', 'success');
      
    } catch (error) {
      console.error('Failed to copy report:', error);
      this.showActionFeedback('Failed to copy report', 'error');
    } finally {
      this.setActionButtonLoading(profileId, 'copy', false);
    }
  }

  /**
   * Handle print report action
   */
  private async handlePrintReport(profileId: string): Promise<void> {
    try {
      this.setActionButtonLoading(profileId, 'print', true);
      this.showActionFeedback('Generating PDF...', 'info');

      // Generate PDF from profile
      const reportData = await profileManager.exportProfile(profileId);
      const pdfBlob = await exportEngine.generatePDF(reportData, []);

      // Download the PDF
      const profile = this.profiles.find(p => p.id === profileId);
      const filename = `blackbox-profile-${profile?.timestamp || Date.now()}.pdf`;
      exportEngine.downloadPDF(pdfBlob, filename);
      
      this.showActionFeedback('PDF downloaded successfully!', 'success');
      
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      this.showActionFeedback('Failed to generate PDF', 'error');
    } finally {
      this.setActionButtonLoading(profileId, 'print', false);
    }
  }

  /**
   * Handle delete profile action
   */
  private async handleDeleteProfile(profileId: string): Promise<void> {
    try {
      // Show confirmation dialog
      const profile = this.profiles.find(p => p.id === profileId);
      if (!profile) return;

      const confirmed = confirm(
        `Delete profile for ${profile.url}?\n\nThis action cannot be undone.`
      );
      
      if (!confirmed) return;

      this.setActionButtonLoading(profileId, 'delete', true);
      this.showActionFeedback('Deleting profile...', 'info');

      // Delete the profile
      await profileManager.deleteProfile(profileId);
      
      // Refresh the list
      await this.refresh();
      
      this.showActionFeedback('Profile deleted successfully', 'success');
      
    } catch (error) {
      console.error('Failed to delete profile:', error);
      this.showActionFeedback('Failed to delete profile', 'error');
    } finally {
      this.setActionButtonLoading(profileId, 'delete', false);
    }
  }

  /**
   * Handle clear all profiles action
   */
  private async handleClearAllProfiles(): Promise<void> {
    try {
      const confirmed = confirm(
        `Delete all ${this.profiles.length} saved profiles?\n\nThis action cannot be undone.`
      );
      
      if (!confirmed) return;

      this.showLoading('Clearing all profiles...');

      // Clear all profiles
      await profileManager.clearAllProfiles();
      
      // Refresh the list
      await this.refresh();
      
      this.showActionFeedback('All profiles cleared successfully', 'success');
      
    } catch (error) {
      console.error('Failed to clear all profiles:', error);
      this.showActionFeedback('Failed to clear all profiles', 'error');
    }
  }

  /**
   * Set loading state on action button
   */
  private setActionButtonLoading(profileId: string, action: 'copy' | 'print' | 'delete', isLoading: boolean): void {
    const button = this.containerElement?.querySelector(
      `[data-profile-id="${profileId}"][data-action="${action}"]`
    ) as HTMLButtonElement;
    
    if (!button) return;

    if (isLoading) {
      button.disabled = true;
      button.classList.add('loading');
      const icon = button.querySelector('.blackbox-action-icon') as HTMLElement;
      if (icon) icon.textContent = '⏳';
    } else {
      button.disabled = false;
      button.classList.remove('loading');
      const icon = button.querySelector('.blackbox-action-icon') as HTMLElement;
      if (icon) {
        const originalIcon = action === 'copy' ? '📄' : action === 'print' ? '🖨️' : '🗑️';
        icon.textContent = originalIcon;
      }
    }
  }

  /**
   * Show action feedback to user
   */
  private showActionFeedback(message: string, type: 'success' | 'error' | 'info'): void {
    // Create or update feedback element
    let feedbackElement = this.containerElement?.querySelector('#profile-action-feedback') as HTMLElement;
    
    if (!feedbackElement && this.containerElement) {
      feedbackElement = document.createElement('div');
      feedbackElement.id = 'profile-action-feedback';
      feedbackElement.className = 'blackbox-profile-feedback';
      feedbackElement.innerHTML = `
        <span class="blackbox-feedback-icon">ℹ️</span>
        <span class="blackbox-feedback-text"></span>
      `;
      feedbackElement.style.display = 'none';
      this.containerElement.appendChild(feedbackElement);
    }

    if (feedbackElement) {
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
  }

  /**
   * Copy text to clipboard
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
   * Apply styles to the profile list
   */
  private applyStyles(): void {
    // Inject CSS if not already present
    if (!document.querySelector('#blackbox-profile-list-styles')) {
      const style = document.createElement('style');
      style.id = 'blackbox-profile-list-styles';
      style.textContent = this.getProfileListCSS();
      document.head.appendChild(style);
    }
  }

  /**
   * Get CSS styles for profile list
   */
  private getProfileListCSS(): string {
    const branding = this.assetManager.getBrandingElements();
    
    return `
      .blackbox-profile-list {
        background: #ffffff;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
        overflow: hidden;
        font-family: ${branding.fontFamily};
      }

      .blackbox-profile-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        background: #f8f9fa;
        border-bottom: 1px solid #e5e7eb;
      }

      .blackbox-profile-title {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: ${branding.primaryColor};
      }

      .blackbox-profile-stats {
        font-size: 0.875rem;
        color: #6b7280;
      }

      .blackbox-profile-items {
        max-height: 400px;
        overflow-y: auto;
      }

      .blackbox-profile-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid #f1f5f9;
        transition: background-color 0.2s ease;
      }

      .blackbox-profile-item:last-child {
        border-bottom: none;
      }

      .blackbox-profile-item:hover {
        background-color: #f8f9fa;
      }

      .blackbox-profile-info {
        flex: 1;
        min-width: 0;
      }

      .blackbox-profile-url {
        font-weight: 500;
        color: ${branding.primaryColor};
        font-size: 0.875rem;
        margin-bottom: 4px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .blackbox-profile-meta {
        display: flex;
        gap: 12px;
        align-items: center;
        font-size: 0.75rem;
        color: #6b7280;
      }

      .blackbox-profile-date {
        font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
      }

      .blackbox-profile-status {
        display: flex;
        align-items: center;
        gap: 4px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .blackbox-profile-status.pass {
        color: ${branding.accentColor};
      }

      .blackbox-profile-status.warn {
        color: ${branding.warningColor};
      }

      .blackbox-profile-status.fail {
        color: ${branding.errorColor};
      }

      .blackbox-profile-score {
        font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
        font-weight: 600;
      }

      .blackbox-profile-actions {
        display: flex;
        gap: 8px;
        flex-shrink: 0;
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
        white-space: nowrap;
      }

      .blackbox-profile-action-btn:hover:not(:disabled) {
        background: #f3f4f6;
        border-color: ${branding.secondaryColor};
      }

      .blackbox-profile-action-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .blackbox-profile-action-btn.loading {
        position: relative;
      }

      .blackbox-action-icon {
        font-size: 0.875rem;
      }

      .blackbox-profile-actions {
        padding: 16px 20px;
        background: #f8f9fa;
        border-top: 1px solid #e5e7eb;
        text-align: center;
      }

      .blackbox-profile-btn {
        padding: 8px 16px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        background: white;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 500;
        transition: all 0.2s ease;
      }

      .blackbox-btn-secondary:hover {
        background: #f3f4f6;
        border-color: ${branding.secondaryColor};
      }

      .blackbox-profile-empty {
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
        max-width: 300px;
        line-height: 1.5;
      }

      .blackbox-profile-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        text-align: center;
      }

      .blackbox-loading-spinner {
        width: 24px;
        height: 24px;
        border: 3px solid #f3f4f6;
        border-top: 3px solid ${branding.secondaryColor};
        border-radius: 50%;
        animation: blackbox-spin 1s linear infinite;
        margin-bottom: 16px;
      }

      .blackbox-loading-text {
        color: #6b7280;
        font-size: 0.875rem;
      }

      .blackbox-profile-feedback {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 16px 20px;
        padding: 10px 16px;
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

      @keyframes blackbox-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      @keyframes blackbox-slide-down {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* Responsive design */
      @media (max-width: 600px) {
        .blackbox-profile-item {
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
        }

        .blackbox-profile-actions {
          align-self: stretch;
        }

        .blackbox-profile-action-btn .blackbox-action-text {
          display: none;
        }

        .blackbox-profile-meta {
          flex-wrap: wrap;
          gap: 8px;
        }
      }
    `;
  }

  /**
   * Get status emoji for display
   */
  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'PASS': return '✅';
      case 'WARN': return '⚠️';
      case 'FAIL': return '❌';
      default: return '❓';
    }
  }

  /**
   * Truncate URL for display
   */
  private truncateUrl(url: string, maxLength: number): string {
    if (url.length <= maxLength) return url;
    
    // Try to keep the domain and path structure visible
    const urlParts = url.split('/');
    if (urlParts.length > 3) {
      const domain = urlParts[2];
      const path = urlParts.slice(3).join('/');
      
      if (domain.length + path.length + 3 <= maxLength) {
        return `${domain}/${path}`;
      } else if (domain.length <= maxLength - 3) {
        const remainingLength = maxLength - domain.length - 6; // Account for ".../" 
        return `${domain}/...${path.slice(-remainingLength)}`;
      }
    }
    
    return url.slice(0, maxLength - 3) + '...';
  }

  /**
   * Handle errors with proper error types
   */
  private handleError(message: string, originalError?: any): void {
    const error = new Error(message) as Phase2Error;
    error.type = 'STORAGE_ERROR';
    error.context = originalError;
    error.recoverable = true;
    error.fallback = 'Display empty profile list';
    
    console.error('ProfileList error:', error);
    
    // Render error state
    if (this.containerElement) {
      this.containerElement.innerHTML = `
        <div class="blackbox-profile-error">
          <div class="blackbox-error-icon">⚠️</div>
          <div class="blackbox-error-message">Failed to load profiles</div>
          <div class="blackbox-error-details">${message}</div>
          <button class="blackbox-retry-btn" onclick="this.closest('.blackbox-profile-list').dispatchEvent(new CustomEvent('retry-profiles'))">
            Retry
          </button>
        </div>
      `;
    }
  }
}