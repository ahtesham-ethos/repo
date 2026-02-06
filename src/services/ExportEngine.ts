/**
 * ExportEngine - Professional PDF report generation for Blackbox
 * 
 * This class generates comprehensive PDF reports with graphical content,
 * branding elements, and complete metadata for professional presentation.
 * Integrates with ReportGenerator and AssetManager for consistent output.
 */

import { 
  ExportEngine as IExportEngine,
  ReportData,
  ReportMetadata,
  PDFLayout,
  PDFGenerationOptions,
  ChartCaptureOptions,
  jsPDFInstance,
  Phase2Error
} from '../types/phase2';
import { assetManager } from './AssetManager';
import { 
  createPDFInstance,
  captureElementAsImage,
  downloadPDF,
  isPDFGenerationSupported,
  estimatePDFSize
} from '../utils/pdf-utils';

export class ExportEngine implements IExportEngine {
  private readonly DEFAULT_LAYOUT: PDFLayout = {
    pageSize: 'a4',
    margins: { top: 20, right: 20, bottom: 20, left: 20 },
    headerHeight: 30,
    footerHeight: 15
  };

  private readonly DEFAULT_OPTIONS: PDFGenerationOptions = {
    layout: this.DEFAULT_LAYOUT,
    includeCharts: true,
    chartImageQuality: 0.9,
    maxImageWidth: 170,
    maxImageHeight: 120,
    imageCompression: 'MEDIUM'
  };

  /**
   * Generate PDF from report data with default options
   */
  public async generatePDF(reportData: ReportData, charts: HTMLElement[] = []): Promise<Blob> {
    // Update report data with charts if provided
    const updatedReportData = {
      ...reportData,
      charts: charts.length > 0 ? charts : reportData.charts
    };
    
    return this.generatePDFWithOptions(updatedReportData, {
      ...this.DEFAULT_OPTIONS,
      includeCharts: charts.length > 0 || reportData.charts.length > 0
    });
  }

  /**
   * Generate PDF with custom options
   */
  public async generatePDFWithOptions(
    reportData: ReportData, 
    options: PDFGenerationOptions
  ): Promise<Blob> {
    try {
      // Check if PDF generation is supported
      if (!isPDFGenerationSupported()) {
        throw this.createPDFError('PDF_GENERATION_ERROR', 'PDF generation not supported in this environment');
      }

      // Initialize AssetManager if needed
      await this.ensureAssetManagerInitialized();

      // Create PDF instance
      const doc = await createPDFInstance();

      // Set up document properties
      this.setupDocumentProperties(doc, reportData.metadata);

      // Add branding header
      this.addPDFHeader(doc, 'Performance Analysis Report');

      // Add content sections
      let currentY = options.layout.headerHeight + 20;
      currentY = await this.addExecutiveSummary(doc, reportData, currentY, options);
      currentY = await this.addMetricsSection(doc, reportData, currentY, options);
      currentY = await this.addRecommendationsSection(doc, reportData, currentY, options);

      // Add charts if requested and available
      if (options.includeCharts && reportData.charts.length > 0) {
        await this.addChartsSection(doc, reportData.charts, options);
      }

      // Add technical details section
      await this.addTechnicalDetailsSection(doc, reportData, options);

      // Add footer to all pages
      this.addFooterToAllPages(doc, reportData.metadata);

      return doc.output('blob');

    } catch (error) {
      console.error('PDF generation failed:', error);
      // Re-throw the original error if it's already a Phase2Error with the specific message
      if (error instanceof Error && error.message === 'PDF generation not supported in this environment') {
        throw error;
      }
      throw this.createPDFError('PDF_GENERATION_ERROR', 'Failed to generate PDF report', error);
    }
  }

  /**
   * Add branding elements to PDF
   */
  public addBrandingToPDF(doc: jsPDFInstance): void {
    try {
      const branding = assetManager.getBrandingElements();
      
      // Set document metadata
      doc.setProperties({
        title: `${branding.productName} Performance Report`,
        subject: 'Webpage Performance Analysis',
        author: branding.productName,
        creator: branding.productName
      });

      // Add branding colors as document theme
      doc.setTextColor(branding.primaryColor);
      
    } catch (error) {
      console.warn('Failed to apply branding to PDF:', error);
      // Continue without branding rather than failing
    }
  }

  /**
   * Capture chart elements as images
   */
  public async captureChartsAsImages(chartElements: HTMLElement[]): Promise<string[]> {
    const images: string[] = [];
    
    for (const element of chartElements) {
      try {
        const imageData = await this.captureChartAsImage(element, {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true,
          allowTaint: false,
          imageFormat: 'png',
          quality: 0.9
        });
        images.push(imageData);
      } catch (error) {
        console.warn('Failed to capture chart:', error);
        // Add placeholder for failed chart
        images.push('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
      }
    }
    
    return images;
  }

  /**
   * Capture single chart as image with options
   */
  public async captureChartAsImage(
    chartElement: HTMLElement, 
    options: ChartCaptureOptions
  ): Promise<string> {
    return captureElementAsImage(chartElement, options);
  }

  /**
   * Format PDF layout based on content
   */
  public formatPDFLayout(content: ReportData): PDFLayout {
    const layout = { ...this.DEFAULT_LAYOUT };
    
    // Adjust layout based on content complexity
    const hasCharts = content.charts.length > 0;
    const hasLongContent = content.metricsTable.length > 1000;
    
    if (hasCharts || hasLongContent) {
      layout.margins.top = 25;
      layout.margins.bottom = 25;
      layout.headerHeight = 35;
    }
    
    return layout;
  }

  /**
   * Add PDF header with branding
   */
  public addPDFHeader(doc: jsPDFInstance, title: string): void {
    try {
      const branding = assetManager.getBrandingElements();
      
      // Header background
      doc.setFillColor(248, 249, 250); // Light gray background
      doc.rect(0, 0, 210, 30, 'F'); // A4 width
      
      // Product name
      doc.setFontSize(18);
      doc.setTextColor(branding.primaryColor);
      doc.setFont('helvetica', 'bold');
      doc.text(branding.productName.toUpperCase(), 20, 15);
      
      // Report title
      doc.setFontSize(12);
      doc.setTextColor(branding.secondaryColor);
      doc.setFont('helvetica', 'normal');
      doc.text(title, 20, 25);
      
      // Separator line
      doc.setDrawColor(branding.secondaryColor);
      doc.setLineWidth(0.5);
      doc.line(20, 28, 190, 28);
      
    } catch (error) {
      console.warn('Failed to add PDF header:', error);
      // Add simple fallback header
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text(title, 20, 20);
    }
  }

  /**
   * Add PDF footer with metadata
   */
  public addPDFFooter(doc: jsPDFInstance, metadata: ReportMetadata): void {
    try {
      const pageCount = doc.getNumberOfPages();
      
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        
        // Footer background
        doc.setFillColor(248, 249, 250);
        doc.rect(0, 282, 210, 15, 'F'); // A4 height - footer height
        
        // Footer content
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'normal');
        
        // Left side - generation info
        const generatedText = `Generated: ${this.formatDateTime(metadata.generatedAt)}`;
        doc.text(generatedText, 20, 290);
        
        // Center - URL (truncated if too long)
        const urlText = this.truncateText(metadata.url, 40);
        const urlWidth = doc.getTextWidth(urlText);
        doc.text(urlText, (210 - urlWidth) / 2, 290);
        
        // Right side - page number
        const pageText = `Page ${i} of ${pageCount}`;
        const pageWidth = doc.getTextWidth(pageText);
        doc.text(pageText, 190 - pageWidth, 290);
        
        // Browser info on first page
        if (i === 1) {
          const browserText = `${metadata.browserInfo.name} ${metadata.browserInfo.version} | ${metadata.browserInfo.platform}`;
          doc.text(browserText, 20, 294);
        }
      }
      
    } catch (error) {
      console.warn('Failed to add PDF footer:', error);
    }
  }

  /**
   * Calculate optimal image dimensions for PDF
   */
  public calculateImageDimensions(
    originalWidth: number, 
    originalHeight: number, 
    maxWidth: number, 
    maxHeight: number
  ): { width: number; height: number } {
    // Handle zero or invalid dimensions
    if (originalWidth <= 0 || originalHeight <= 0) {
      return { width: 0, height: 0 };
    }
    
    const aspectRatio = originalWidth / originalHeight;
    
    let width = originalWidth;
    let height = originalHeight;
    
    // Scale down if too wide
    if (width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }
    
    // Scale down if too tall
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }
    
    return { width: Math.round(width), height: Math.round(height) };
  }

  /**
   * Download generated PDF
   */
  public downloadPDF(pdfBlob: Blob, filename?: string): void {
    const defaultFilename = `blackbox-report-${new Date().toISOString().split('T')[0]}.pdf`;
    downloadPDF(pdfBlob, filename || defaultFilename);
  }

  /**
   * Get estimated PDF file size
   */
  public estimateFileSize(reportData: ReportData, includeCharts: boolean = true): number {
    const textLines = reportData.metricsTable.split('\n').length + 
                     reportData.summary.split('\n').length + 
                     reportData.recommendations.length * 2;
    
    const chartCount = includeCharts ? reportData.charts.length : 0;
    
    return estimatePDFSize(textLines, chartCount, true);
  }

  /**
   * Check if PDF generation is supported
   */
  public isSupported(): boolean {
    return isPDFGenerationSupported();
  }

  // Private helper methods

  /**
   * Ensure AssetManager is initialized
   */
  private async ensureAssetManagerInitialized(): Promise<void> {
    try {
      // Check if already initialized by testing branding access
      assetManager.getBrandingElements();
    } catch (error) {
      // Initialize if not already done
      await assetManager.initialize();
    }
  }

  /**
   * Setup document properties
   */
  private setupDocumentProperties(doc: jsPDFInstance, metadata: ReportMetadata): void {
    const branding = assetManager.getBrandingElements();
    
    doc.setProperties({
      title: `${branding.productName} Performance Report`,
      subject: `Performance analysis for ${metadata.url}`,
      author: branding.productName,
      creator: branding.productName,
      keywords: 'performance, analysis, web, metrics, blackbox'
    });
  }

  /**
   * Add executive summary section
   */
  private async addExecutiveSummary(
    doc: jsPDFInstance, 
    reportData: ReportData, 
    startY: number, 
    options: PDFGenerationOptions
  ): Promise<number> {
    let currentY = startY;
    
    // Section title
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('EXECUTIVE SUMMARY', options.layout.margins.left, currentY);
    currentY += 10;
    
    // Summary content
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const summaryLines = this.splitTextToLines(doc, reportData.summary, 170);
    summaryLines.forEach(line => {
      if (currentY > 270) {
        doc.addPage();
        currentY = options.layout.headerHeight + 10;
      }
      doc.text(line, options.layout.margins.left, currentY);
      currentY += 5;
    });
    
    return currentY + 10;
  }

  /**
   * Add metrics section
   */
  private async addMetricsSection(
    doc: jsPDFInstance, 
    reportData: ReportData, 
    startY: number, 
    options: PDFGenerationOptions
  ): Promise<number> {
    let currentY = startY;
    
    // Section title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('DETAILED METRICS', options.layout.margins.left, currentY);
    currentY += 10;
    
    // Metrics content
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    const metricsLines = this.splitTextToLines(doc, reportData.metricsTable, 170);
    metricsLines.forEach(line => {
      if (currentY > 270) {
        doc.addPage();
        currentY = options.layout.headerHeight + 10;
      }
      doc.text(line, options.layout.margins.left, currentY);
      currentY += 4;
    });
    
    return currentY + 10;
  }

  /**
   * Add recommendations section
   */
  private async addRecommendationsSection(
    doc: jsPDFInstance, 
    reportData: ReportData, 
    startY: number, 
    options: PDFGenerationOptions
  ): Promise<number> {
    let currentY = startY;
    
    if (reportData.recommendations.length === 0) {
      return currentY;
    }
    
    // Section title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('RECOMMENDATIONS', options.layout.margins.left, currentY);
    currentY += 10;
    
    // Recommendations content
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    reportData.recommendations.forEach((recommendation, index) => {
      if (currentY > 260) {
        doc.addPage();
        currentY = options.layout.headerHeight + 10;
      }
      
      const recommendationText = `${index + 1}. ${recommendation}`;
      const lines = this.splitTextToLines(doc, recommendationText, 170);
      
      lines.forEach(line => {
        doc.text(line, options.layout.margins.left, currentY);
        currentY += 5;
      });
      
      currentY += 3; // Extra space between recommendations
    });
    
    return currentY + 10;
  }

  /**
   * Add charts section
   */
  private async addChartsSection(
    doc: jsPDFInstance, 
    charts: HTMLElement[], 
    options: PDFGenerationOptions
  ): Promise<void> {
    if (charts.length === 0) return;
    
    // Add new page for charts
    doc.addPage();
    let currentY = options.layout.headerHeight + 10;
    
    // Section title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('PERFORMANCE VISUALIZATIONS', options.layout.margins.left, currentY);
    currentY += 15;
    
    // Capture and add charts
    const chartImages = await this.captureChartsAsImages(charts);
    
    for (let i = 0; i < chartImages.length; i++) {
      const imageData = chartImages[i];
      
      // Check if we need a new page
      if (currentY > 200) {
        doc.addPage();
        currentY = options.layout.headerHeight + 10;
      }
      
      try {
        // Calculate image dimensions
        const dimensions = this.calculateImageDimensions(
          400, 300, // Assume standard chart dimensions
          options.maxImageWidth,
          options.maxImageHeight
        );
        
        // Add chart title
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Chart ${i + 1}`, options.layout.margins.left, currentY);
        currentY += 10;
        
        // Add image
        doc.addImage(
          imageData, 
          'PNG', 
          options.layout.margins.left, 
          currentY, 
          dimensions.width, 
          dimensions.height
        );
        
        currentY += dimensions.height + 15;
        
      } catch (error) {
        console.warn(`Failed to add chart ${i + 1} to PDF:`, error);
        
        // Add error message
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.text('Chart could not be rendered', options.layout.margins.left, currentY);
        currentY += 10;
      }
    }
  }

  /**
   * Add technical details section
   */
  private async addTechnicalDetailsSection(
    doc: jsPDFInstance, 
    reportData: ReportData, 
    options: PDFGenerationOptions
  ): Promise<void> {
    // Add new page for technical details
    doc.addPage();
    let currentY = options.layout.headerHeight + 10;
    
    // Section title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('TECHNICAL DETAILS', options.layout.margins.left, currentY);
    currentY += 10;
    
    // Raw data summary
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const technicalInfo = [
      'Analysis Configuration:',
      `• Report generated: ${this.formatDateTime(reportData.metadata.generatedAt)}`,
      `• Target URL: ${reportData.metadata.url}`,
      `• Browser: ${reportData.metadata.browserInfo.name} ${reportData.metadata.browserInfo.version}`,
      `• Platform: ${reportData.metadata.browserInfo.platform}`,
      '',
      'Metrics Collection:',
      `• Navigation timing: ${reportData.rawData.navigation.available ? 'Available' : 'Not available'}`,
      `• Resource analysis: ${reportData.rawData.resource.available ? 'Available' : 'Not available'}`,
      `• Rendering metrics: ${reportData.rawData.rendering.available ? 'Available' : 'Not available'}`,
      `• Network monitoring: ${reportData.rawData.network.available ? 'Available' : 'Not available'}`,
      '',
      'Threshold Logic:',
      '• PASS: Value ≤ threshold',
      '• WARN: Value ≤ threshold × 1.5 (10-50% over)',
      '• FAIL: Value > threshold × 1.5 (>50% over)',
      '',
      'Report Information:',
      `• Generated by: ${assetManager.getBrandingElements().productName} v2.0.0`,
      `• Report format: PDF with embedded charts`,
      `• Estimated file size: ${this.estimateFileSize(reportData)} KB`
    ];
    
    technicalInfo.forEach(line => {
      if (currentY > 270) {
        doc.addPage();
        currentY = options.layout.headerHeight + 10;
      }
      doc.text(line, options.layout.margins.left, currentY);
      currentY += 5;
    });
  }

  /**
   * Add footer to all pages
   */
  private addFooterToAllPages(doc: jsPDFInstance, metadata: ReportMetadata): void {
    this.addPDFFooter(doc, metadata);
  }

  /**
   * Split text into lines that fit within specified width
   */
  private splitTextToLines(doc: jsPDFInstance, text: string, maxWidth: number): string[] {
    const lines: string[] = [];
    const paragraphs = text.split('\n');
    
    paragraphs.forEach(paragraph => {
      if (paragraph.trim() === '') {
        lines.push('');
        return;
      }
      
      const words = paragraph.split(' ');
      let currentLine = '';
      
      words.forEach(word => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const lineWidth = doc.getTextWidth(testLine);
        
        if (lineWidth <= maxWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) {
            lines.push(currentLine);
          }
          currentLine = word;
        }
      });
      
      if (currentLine) {
        lines.push(currentLine);
      }
    });
    
    return lines;
  }

  /**
   * Format date and time for display
   */
  private formatDateTime(date: Date): string {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  }

  /**
   * Truncate text to specified length
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Create a Phase2Error for PDF operations
   */
  private createPDFError(type: 'PDF_GENERATION_ERROR', message: string, originalError?: any): Phase2Error {
    const error = new Error(message) as Phase2Error;
    error.type = type;
    error.context = originalError;
    error.recoverable = true;
    error.fallback = 'Generate text report instead';
    return error;
  }
}

// Export singleton instance for global use
export const exportEngine = new ExportEngine();