/**
 * PDF utility functions for Blackbox Phase 2
 * This file demonstrates how to properly import and use jsPDF and html2canvas
 * in the browser extension environment
 */

import type { jsPDFInstance } from '../types/phase2';

/**
 * Simple options for chart capture
 */
interface SimpleChartCaptureOptions {
  backgroundColor?: string;
  scale?: number;
  useCORS?: boolean;
  allowTaint?: boolean;
  imageFormat?: 'png' | 'jpeg';
  quality?: number;
}

/**
 * Dynamically import jsPDF to avoid bundle size issues
 * This approach allows for lazy loading of the PDF library
 */
export async function createPDFInstance(): Promise<jsPDFInstance> {
  try {
    const { jsPDF } = await import('jspdf');
    return new jsPDF();
  } catch (error) {
    console.error('Failed to load jsPDF:', error);
    throw new Error('PDF generation library not available');
  }
}

/**
 * Dynamically import html2canvas for chart capture
 * This approach allows for lazy loading of the canvas library
 */
export async function captureElementAsImage(
  element: HTMLElement, 
  options: SimpleChartCaptureOptions = {}
): Promise<string> {
  try {
    const html2canvas = (await import('html2canvas')).default;
    
    const defaultOptions = {
      backgroundColor: '#ffffff',
      scale: 1,
      useCORS: true,
      allowTaint: false,
      imageFormat: 'png' as const,
      quality: 0.9,
      ...options
    };
    
    const canvas = await html2canvas(element, {
      backgroundColor: defaultOptions.backgroundColor,
      scale: defaultOptions.scale,
      useCORS: defaultOptions.useCORS,
      allowTaint: defaultOptions.allowTaint
    });
    
    return canvas.toDataURL(`image/${defaultOptions.imageFormat}`, defaultOptions.quality);
  } catch (error) {
    console.error('Failed to capture element as image:', error);
    throw new Error('Image capture library not available');
  }
}

/**
 * Create a basic PDF with text content
 * This is a utility function that demonstrates basic PDF creation
 */
export async function createBasicPDF(
  title: string,
  content: string[],
  metadata: { url?: string; timestamp?: Date } = {}
): Promise<Blob> {
  const doc = await createPDFInstance();
  
  // Add title
  doc.setFontSize(16);
  doc.text(title, 20, 20);
  
  // Add metadata
  doc.setFontSize(10);
  let yPosition = 35;
  
  if (metadata.timestamp) {
    doc.text(`Generated: ${metadata.timestamp.toISOString()}`, 20, yPosition);
    yPosition += 10;
  }
  
  if (metadata.url) {
    doc.text(`URL: ${metadata.url}`, 20, yPosition);
    yPosition += 10;
  }
  
  // Add content
  doc.setFontSize(12);
  yPosition += 10;
  
  content.forEach((line) => {
    if (yPosition > 280) { // Near bottom of page
      doc.addPage();
      yPosition = 20;
    }
    doc.text(line, 20, yPosition);
    yPosition += 8;
  });
  
  return doc.output('blob');
}

/**
 * Create a PDF with embedded chart images
 * This demonstrates combining text content with captured chart images
 */
export async function createPDFWithCharts(
  title: string,
  content: string[],
  chartElements: HTMLElement[],
  metadata: { url?: string; timestamp?: Date } = {}
): Promise<Blob> {
  const doc = await createPDFInstance();
  
  // Add title and metadata (same as basic PDF)
  doc.setFontSize(16);
  doc.text(title, 20, 20);
  
  doc.setFontSize(10);
  let yPosition = 35;
  
  if (metadata.timestamp) {
    doc.text(`Generated: ${metadata.timestamp.toISOString()}`, 20, yPosition);
    yPosition += 10;
  }
  
  if (metadata.url) {
    doc.text(`URL: ${metadata.url}`, 20, yPosition);
    yPosition += 10;
  }
  
  // Add text content
  doc.setFontSize(12);
  yPosition += 10;
  
  content.forEach((line) => {
    if (yPosition > 280) {
      doc.addPage();
      yPosition = 20;
    }
    doc.text(line, 20, yPosition);
    yPosition += 8;
  });
  
  // Capture and add charts
  for (let i = 0; i < chartElements.length; i++) {
    const chartElement = chartElements[i];
    
    try {
      const imageData = await captureElementAsImage(chartElement, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher resolution for PDF
        imageFormat: 'png'
      });
      
      // Add new page for each chart
      doc.addPage();
      
      // Add chart title
      doc.setFontSize(14);
      doc.text(`Chart ${i + 1}`, 20, 20);
      
      // Calculate image dimensions to fit on page
      const maxWidth = 170; // PDF page width minus margins
      const maxHeight = 200; // Leave space for title and margins
      
      // Add image to PDF
      doc.addImage(imageData, 'PNG', 20, 30, maxWidth, maxHeight);
      
    } catch (error) {
      console.warn(`Failed to capture chart ${i + 1}:`, error);
      
      // Add error message instead of chart
      doc.addPage();
      doc.setFontSize(14);
      doc.text(`Chart ${i + 1}`, 20, 20);
      doc.setFontSize(10);
      doc.text('Chart capture failed - please try again', 20, 40);
    }
  }
  
  return doc.output('blob');
}

/**
 * Download a PDF blob as a file
 * This utility function handles the browser download process
 */
export function downloadPDF(pdfBlob: Blob, filename: string = 'blackbox-report.pdf'): void {
  try {
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 100);
  } catch (error) {
    console.error('Failed to download PDF:', error);
    throw new Error('PDF download failed');
  }
}

/**
 * Check if PDF generation is supported in the current environment
 * This can be used to show/hide PDF features based on browser capabilities
 */
export function isPDFGenerationSupported(): boolean {
  try {
    // Check for required browser APIs
    return !!(
      typeof window !== 'undefined' &&
      window.Blob &&
      window.URL &&
      typeof window.URL.createObjectURL === 'function' &&
      document.createElement
    );
  } catch (error) {
    return false;
  }
}

/**
 * Get estimated PDF file size based on content
 * This can be used to warn users about large files
 */
export function estimatePDFSize(
  textLines: number,
  chartCount: number,
  highResolution: boolean = false
): number {
  // Base PDF size (KB)
  let estimatedSize = 50;
  
  // Add size for text content (rough estimate)
  estimatedSize += textLines * 0.1;
  
  // Add size for charts (rough estimate)
  const chartSize = highResolution ? 200 : 100; // KB per chart
  estimatedSize += chartCount * chartSize;
  
  return Math.round(estimatedSize);
}