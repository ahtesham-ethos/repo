/**
 * Example usage of AssetManager for Blackbox branding
 * 
 * This file demonstrates how to use the AssetManager class to apply
 * consistent branding across the Blackbox application.
 */

import { AssetManager } from './AssetManager';

/**
 * Example: Initialize and use AssetManager
 */
export async function demonstrateAssetManager(): Promise<void> {
  // Create a new AssetManager instance
  const assetManager = new AssetManager();
  
  // Initialize the asset manager (loads branding config)
  await assetManager.initialize();
  
  // Get branding configuration
  const branding = assetManager.getBrandingElements();
  console.log('Loaded branding:', branding);
  
  // Create a sample UI element
  const container = document.createElement('div');
  container.id = 'blackbox-demo';
  
  // Apply branding to the container
  assetManager.applyBrandingToElement(container);
  
  // Generate a branded header
  const header = assetManager.generateBrandedHeader();
  container.appendChild(header);
  
  // Create a metrics display section
  const metricsSection = document.createElement('div');
  metricsSection.className = 'metrics-section';
  metricsSection.style.padding = '1rem';
  metricsSection.style.marginTop = '1rem';
  
  // Create sample metrics with status colors
  const metrics = [
    { name: 'Load Time', value: '1.2s', status: 'pass' as const },
    { name: 'TTFB', value: '800ms', status: 'warn' as const },
    { name: 'Page Size', value: '5.2MB', status: 'fail' as const }
  ];
  
  metrics.forEach(metric => {
    const metricElement = document.createElement('div');
    metricElement.style.display = 'flex';
    metricElement.style.justifyContent = 'space-between';
    metricElement.style.padding = '0.5rem 0';
    metricElement.style.borderBottom = '1px solid #eee';
    
    const nameElement = document.createElement('span');
    nameElement.textContent = metric.name;
    nameElement.style.fontWeight = '500';
    
    const valueElement = document.createElement('span');
    valueElement.textContent = metric.value;
    valueElement.style.fontWeight = '600';
    
    // Apply status-based color coding
    assetManager.applyStatusColor(valueElement, metric.status);
    
    metricElement.appendChild(nameElement);
    metricElement.appendChild(valueElement);
    metricsSection.appendChild(metricElement);
  });
  
  container.appendChild(metricsSection);
  
  // Create logo examples in different sizes
  const logoSection = document.createElement('div');
  logoSection.style.padding = '1rem';
  logoSection.style.marginTop = '1rem';
  logoSection.style.borderTop = '1px solid #eee';
  
  const logoTitle = document.createElement('h3');
  logoTitle.textContent = 'Logo Examples';
  logoTitle.style.margin = '0 0 1rem 0';
  logoTitle.style.color = assetManager.getBrandingColor('primary');
  logoSection.appendChild(logoTitle);
  
  const logoContainer = document.createElement('div');
  logoContainer.style.display = 'flex';
  logoContainer.style.gap = '1rem';
  logoContainer.style.alignItems = 'center';
  
  // Create logos in different sizes
  const sizes: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large'];
  sizes.forEach(size => {
    const logoWrapper = document.createElement('div');
    logoWrapper.style.textAlign = 'center';
    
    const logo = assetManager.createLogoElement(size);
    if (logo) {
      logoWrapper.appendChild(logo);
    }
    
    const label = document.createElement('div');
    label.textContent = size;
    label.style.fontSize = '0.75rem';
    label.style.marginTop = '0.25rem';
    label.style.color = assetManager.getBrandingColor('secondary');
    logoWrapper.appendChild(label);
    
    logoContainer.appendChild(logoWrapper);
  });
  
  logoSection.appendChild(logoContainer);
  container.appendChild(logoSection);
  
  // Generate CSS variables for use in stylesheets
  const cssVariables = assetManager.generateCSSVariables();
  console.log('CSS Variables:', cssVariables);
  
  // Add the CSS variables to the document
  const style = document.createElement('style');
  style.textContent = cssVariables;
  document.head.appendChild(style);
  
  // Add the demo container to the document
  document.body.appendChild(container);
  
  console.log('AssetManager demo complete! Check the DOM for the branded elements.');
}

/**
 * Example: Using AssetManager in a popup context
 */
export async function setupPopupBranding(): Promise<void> {
  const assetManager = new AssetManager();
  await assetManager.initialize();
  
  // Apply branding to the entire popup body
  const body = document.body;
  assetManager.applyBrandingToElement(body);
  
  // Add CSS variables to the document
  const style = document.createElement('style');
  style.textContent = assetManager.generateCSSVariables();
  document.head.appendChild(style);
  
  // Create and add a branded header
  const header = assetManager.generateBrandedHeader();
  body.insertBefore(header, body.firstChild);
}

/**
 * Example: Error handling with AssetManager
 */
export async function demonstrateErrorHandling(): Promise<void> {
  const assetManager = new AssetManager();
  
  try {
    // This will gracefully fall back to default branding if assets fail to load
    await assetManager.initialize();
    
    // AssetManager will always provide branding, even if initialization fails
    const branding = assetManager.getBrandingElements();
    console.log('Branding available:', branding.productName);
    
    // Logo creation will return null if it fails, allowing graceful degradation
    const logo = assetManager.createLogoElement();
    if (logo) {
      console.log('Logo created successfully');
    } else {
      console.log('Logo creation failed, but application continues');
    }
    
  } catch (error) {
    // AssetManager is designed to not throw errors during normal usage
    console.error('Unexpected error:', error);
  }
}

// Export the AssetManager class for easy importing
export { AssetManager };