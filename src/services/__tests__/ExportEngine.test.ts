/**
 * Tests for ExportEngine - PDF generation functionality
 */

import { ExportEngine } from '../ExportEngine';
import { ReportData, ReportMetadata, BrowserInfo, PDFGenerationOptions } from '../../types/phase2';
import { AllMetrics } from '../../types';
import * as pdfUtils from '../../utils/pdf-utils';
import { assetManager } from '../AssetManager';

// Mock dependencies
jest.mock('../../utils/pdf-utils');
jest.mock('../AssetManager');

// Mock jsPDF instance
const mockDoc = {
  setProperties: jest.fn(),
  setFontSize: jest.fn(),
  setTextColor: jest.fn(),
  setFont: jest.fn(),
  text: jest.fn(),
  setFillColor: jest.fn(),
  rect: jest.fn(),
  setDrawColor: jest.fn(),
  setLineWidth: jest.fn(),
  line: jest.fn(),
  addPage: jest.fn(),
  getNumberOfPages: jest.fn().mockReturnValue(1),
  setPage: jest.fn(),
  getTextWidth: jest.fn().mockReturnValue(50),
  addImage: jest.fn(),
  output: jest.fn().mockReturnValue(new Blob(['test pdf'], { type: 'application/pdf' }))
};

const mockPdfUtils = pdfUtils as jest.Mocked<typeof pdfUtils>;
const mockAssetManager = assetManager as jest.Mocked<typeof assetManager>;

describe('ExportEngine', () => {
  let exportEngine: ExportEngine;
  let mockReportData: ReportData;
  let mockMetadata: ReportMetadata;
  let mockBrowserInfo: BrowserInfo;
  let mockMetrics: AllMetrics;

  beforeEach(() => {
    jest.clearAllMocks();
    
    exportEngine = new ExportEngine();
    
    // Setup mock data
    mockBrowserInfo = {
      name: 'Chrome',
      version: '120.0.0',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      platform: 'Win32'
    };

    mockMetadata = {
      generatedAt: new Date('2024-01-15T10:30:00Z'),
      url: 'https://example.com',
      browserInfo: mockBrowserInfo,
      reportType: 'pdf'
    };

    mockMetrics = {
      navigation: {
        loadTime: 1500,
        ttfb: 200,
        domContentLoaded: 1200,
        available: true
      },
      resource: {
        totalSize: 1024000,
        resourceCount: 25,
        largestResource: { name: 'main.js', size: 512000, type: 'script' },
        available: true
      },
      rendering: {
        firstPaint: 800,
        largestContentfulPaint: 1400,
        available: true
      },
      network: {
        ajaxCount: 3,
        slowestRequest: { url: 'https://api.example.com/data', duration: 500 },
        available: true
      }
    };

    mockReportData = {
      metadata: mockMetadata,
      summary: 'Overall Health: PASS\nPerformance Score: 85/100\n\nKey Issues: None detected',
      metricsTable: 'Load Time: 1.5s (threshold: 3.0s)\nTTFB: 200ms (threshold: 800ms)',
      recommendations: [
        'Consider implementing performance monitoring',
        'Set up performance budgets'
      ],
      charts: [],
      rawData: mockMetrics
    };

    // Setup mocks
    mockPdfUtils.isPDFGenerationSupported.mockReturnValue(true);
    mockPdfUtils.createPDFInstance.mockResolvedValue(mockDoc as any);
    mockPdfUtils.captureElementAsImage.mockResolvedValue('data:image/png;base64,test');
    mockPdfUtils.estimatePDFSize.mockReturnValue(150);

    mockAssetManager.getBrandingElements.mockReturnValue({
      productName: 'Blackbox',
      logoPath: 'assets/logo.png',
      primaryColor: '#1a1a1a',
      secondaryColor: '#4a90e2',
      accentColor: '#00c851',
      warningColor: '#ffbb33',
      errorColor: '#ff4444',
      fontFamily: 'system-ui',
      description: 'Professional webpage performance analysis tool',
      chartColors: {
        primary: ['#3B82F6'],
        success: ['#10B981'],
        warning: ['#F59E0B'],
        error: ['#EF4444'],
        neutral: ['#6B7280']
      }
    });

    mockAssetManager.initialize.mockResolvedValue();
  });

  describe('generatePDF', () => {
    test('should generate PDF with default options', async () => {
      const result = await exportEngine.generatePDF(mockReportData);

      expect(result).toBeInstanceOf(Blob);
      expect(mockPdfUtils.createPDFInstance).toHaveBeenCalled();
      expect(mockDoc.output).toHaveBeenCalledWith('blob');
    });

    test('should handle charts when provided', async () => {
      const mockChart = document.createElement('div');
      mockChart.innerHTML = '<canvas></canvas>';
      
      const result = await exportEngine.generatePDF(mockReportData, [mockChart]);

      expect(result).toBeInstanceOf(Blob);
      expect(mockPdfUtils.captureElementAsImage).toHaveBeenCalledWith(
        mockChart,
        expect.objectContaining({
          backgroundColor: '#ffffff',
          scale: 2,
          imageFormat: 'png'
        })
      );
    });

    test('should throw error when PDF generation not supported', async () => {
      mockPdfUtils.isPDFGenerationSupported.mockReturnValue(false);

      await expect(exportEngine.generatePDF(mockReportData))
        .rejects.toThrow('PDF generation not supported in this environment');
    });

    test('should handle PDF creation failure gracefully', async () => {
      mockPdfUtils.createPDFInstance.mockRejectedValue(new Error('PDF library error'));

      await expect(exportEngine.generatePDF(mockReportData))
        .rejects.toThrow('Failed to generate PDF report');
    });
  });

  describe('generatePDFWithOptions', () => {
    test('should use custom options', async () => {
      const customOptions: PDFGenerationOptions = {
        layout: {
          pageSize: 'letter',
          margins: { top: 30, right: 30, bottom: 30, left: 30 },
          headerHeight: 40,
          footerHeight: 20
        },
        includeCharts: false,
        chartImageQuality: 0.8,
        maxImageWidth: 150,
        maxImageHeight: 100,
        imageCompression: 'FAST'
      };

      const result = await exportEngine.generatePDFWithOptions(mockReportData, customOptions);

      expect(result).toBeInstanceOf(Blob);
      expect(mockDoc.output).toHaveBeenCalledWith('blob');
    });

    test('should initialize AssetManager if needed', async () => {
      mockAssetManager.getBrandingElements.mockImplementationOnce(() => {
        throw new Error('Not initialized');
      }).mockReturnValueOnce({
        productName: 'Blackbox',
        logoPath: 'assets/logo.png',
        primaryColor: '#1a1a1a',
        secondaryColor: '#4a90e2',
        accentColor: '#00c851',
        warningColor: '#ffbb33',
        errorColor: '#ff4444',
        fontFamily: 'system-ui',
        description: 'Professional webpage performance analysis tool',
        chartColors: {
          primary: ['#3B82F6'],
          success: ['#10B981'],
          warning: ['#F59E0B'],
          error: ['#EF4444'],
          neutral: ['#6B7280']
        }
      });

      await exportEngine.generatePDFWithOptions(mockReportData, {
        layout: {
          pageSize: 'a4',
          margins: { top: 20, right: 20, bottom: 20, left: 20 },
          headerHeight: 30,
          footerHeight: 15
        },
        includeCharts: true,
        chartImageQuality: 0.9,
        maxImageWidth: 170,
        maxImageHeight: 120,
        imageCompression: 'MEDIUM'
      });

      expect(mockAssetManager.initialize).toHaveBeenCalled();
    });
  });

  describe('addBrandingToPDF', () => {
    test('should apply branding to PDF document', () => {
      exportEngine.addBrandingToPDF(mockDoc as any);

      expect(mockDoc.setProperties).toHaveBeenCalledWith({
        title: 'Blackbox Performance Report',
        subject: 'Webpage Performance Analysis',
        author: 'Blackbox',
        creator: 'Blackbox'
      });
    });

    test('should handle branding failure gracefully', () => {
      mockAssetManager.getBrandingElements.mockImplementation(() => {
        throw new Error('Branding error');
      });

      expect(() => exportEngine.addBrandingToPDF(mockDoc as any)).not.toThrow();
    });
  });

  describe('captureChartsAsImages', () => {
    test('should capture multiple charts', async () => {
      const chart1 = document.createElement('div');
      const chart2 = document.createElement('div');
      
      const result = await exportEngine.captureChartsAsImages([chart1, chart2]);

      expect(result).toHaveLength(2);
      expect(mockPdfUtils.captureElementAsImage).toHaveBeenCalledTimes(2);
      expect(result[0]).toBe('data:image/png;base64,test');
      expect(result[1]).toBe('data:image/png;base64,test');
    });

    test('should handle chart capture failure with placeholder', async () => {
      const chart = document.createElement('div');
      mockPdfUtils.captureElementAsImage.mockRejectedValueOnce(new Error('Capture failed'));

      const result = await exportEngine.captureChartsAsImages([chart]);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
    });

    test('should return empty array for no charts', async () => {
      const result = await exportEngine.captureChartsAsImages([]);

      expect(result).toHaveLength(0);
      expect(mockPdfUtils.captureElementAsImage).not.toHaveBeenCalled();
    });
  });

  describe('captureChartAsImage', () => {
    test('should capture single chart with options', async () => {
      const chart = document.createElement('div');
      const options = {
        backgroundColor: '#ffffff',
        scale: 2,
        imageFormat: 'png' as const,
        quality: 0.9
      };

      const result = await exportEngine.captureChartAsImage(chart, options);

      expect(result).toBe('data:image/png;base64,test');
      expect(mockPdfUtils.captureElementAsImage).toHaveBeenCalledWith(chart, options);
    });
  });

  describe('formatPDFLayout', () => {
    test('should return default layout for simple content', () => {
      const simpleData = {
        ...mockReportData,
        charts: [],
        metricsTable: 'Simple metrics'
      };

      const layout = exportEngine.formatPDFLayout(simpleData);

      expect(layout.pageSize).toBe('a4');
      expect(layout.margins.top).toBe(20);
      expect(layout.headerHeight).toBe(30);
    });

    test('should adjust layout for complex content', () => {
      const complexData = {
        ...mockReportData,
        charts: [document.createElement('div')],
        metricsTable: 'x'.repeat(1500) // Long content
      };

      const layout = exportEngine.formatPDFLayout(complexData);

      expect(layout.margins.top).toBe(25);
      expect(layout.headerHeight).toBe(35);
    });
  });

  describe('addPDFHeader', () => {
    test('should add header with branding', () => {
      exportEngine.addPDFHeader(mockDoc as any, 'Test Report');

      expect(mockDoc.setFillColor).toHaveBeenCalledWith(248, 249, 250);
      expect(mockDoc.rect).toHaveBeenCalledWith(0, 0, 210, 30, 'F');
      expect(mockDoc.text).toHaveBeenCalledWith('BLACKBOX', 20, 15);
      expect(mockDoc.text).toHaveBeenCalledWith('Test Report', 20, 25);
    });

    test('should handle header creation failure with fallback', () => {
      mockAssetManager.getBrandingElements.mockImplementation(() => {
        throw new Error('Branding error');
      });

      exportEngine.addPDFHeader(mockDoc as any, 'Test Report');

      expect(mockDoc.text).toHaveBeenCalledWith('Test Report', 20, 20);
    });
  });

  describe('addPDFFooter', () => {
    test('should add footer to all pages', () => {
      mockDoc.getNumberOfPages.mockReturnValue(2);

      exportEngine.addPDFFooter(mockDoc as any, mockMetadata);

      expect(mockDoc.setPage).toHaveBeenCalledTimes(2);
      expect(mockDoc.setPage).toHaveBeenCalledWith(1);
      expect(mockDoc.setPage).toHaveBeenCalledWith(2);
      expect(mockDoc.text).toHaveBeenCalledWith(
        expect.stringContaining('Generated:'),
        20,
        290
      );
    });

    test('should handle footer creation failure gracefully', () => {
      mockDoc.getNumberOfPages.mockImplementation(() => {
        throw new Error('Page count error');
      });

      expect(() => exportEngine.addPDFFooter(mockDoc as any, mockMetadata)).not.toThrow();
    });
  });

  describe('calculateImageDimensions', () => {
    test('should maintain aspect ratio when scaling down width', () => {
      const result = exportEngine.calculateImageDimensions(400, 300, 200, 300);

      expect(result.width).toBe(200);
      expect(result.height).toBe(150); // 200 / (400/300) = 150
    });

    test('should maintain aspect ratio when scaling down height', () => {
      const result = exportEngine.calculateImageDimensions(300, 400, 300, 200);

      expect(result.width).toBe(150); // 200 * (300/400) = 150
      expect(result.height).toBe(200);
    });

    test('should not scale up images', () => {
      const result = exportEngine.calculateImageDimensions(100, 100, 200, 200);

      expect(result.width).toBe(100);
      expect(result.height).toBe(100);
    });

    test('should handle zero dimensions', () => {
      const result = exportEngine.calculateImageDimensions(0, 100, 200, 200);

      expect(result.width).toBe(0);
      expect(result.height).toBe(0);
    });
  });

  describe('estimateFileSize', () => {
    test('should estimate file size without charts', () => {
      const size = exportEngine.estimateFileSize(mockReportData, false);

      expect(typeof size).toBe('number');
      expect(size).toBeGreaterThan(0);
      expect(mockPdfUtils.estimatePDFSize).toHaveBeenCalledWith(
        expect.any(Number),
        0,
        true
      );
    });

    test('should estimate file size with charts', () => {
      const dataWithCharts = {
        ...mockReportData,
        charts: [document.createElement('div'), document.createElement('div')]
      };

      const size = exportEngine.estimateFileSize(dataWithCharts, true);

      expect(typeof size).toBe('number');
      expect(mockPdfUtils.estimatePDFSize).toHaveBeenCalledWith(
        expect.any(Number),
        2,
        true
      );
    });
  });

  describe('isSupported', () => {
    test('should return true when PDF generation is supported', () => {
      mockPdfUtils.isPDFGenerationSupported.mockReturnValue(true);

      const result = exportEngine.isSupported();

      expect(result).toBe(true);
    });

    test('should return false when PDF generation is not supported', () => {
      mockPdfUtils.isPDFGenerationSupported.mockReturnValue(false);

      const result = exportEngine.isSupported();

      expect(result).toBe(false);
    });
  });

  describe('downloadPDF', () => {
    test('should download PDF with default filename', () => {
      const mockBlob = new Blob(['test'], { type: 'application/pdf' });

      exportEngine.downloadPDF(mockBlob);

      expect(mockPdfUtils.downloadPDF).toHaveBeenCalledWith(
        mockBlob,
        expect.stringMatching(/^blackbox-report-\d{4}-\d{2}-\d{2}\.pdf$/)
      );
    });

    test('should download PDF with custom filename', () => {
      const mockBlob = new Blob(['test'], { type: 'application/pdf' });
      const customFilename = 'custom-report.pdf';

      exportEngine.downloadPDF(mockBlob, customFilename);

      expect(mockPdfUtils.downloadPDF).toHaveBeenCalledWith(mockBlob, customFilename);
    });
  });

  describe('error handling', () => {
    test('should create proper Phase2Error for PDF generation failures', async () => {
      mockPdfUtils.createPDFInstance.mockRejectedValue(new Error('Library error'));

      try {
        await exportEngine.generatePDF(mockReportData);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('Failed to generate PDF report');
        expect(error.type).toBe('PDF_GENERATION_ERROR');
        expect(error.recoverable).toBe(true);
        expect(error.fallback).toBe('Generate text report instead');
      }
    });

    test('should handle AssetManager initialization failure', async () => {
      mockAssetManager.getBrandingElements.mockImplementation(() => {
        throw new Error('Not initialized');
      });
      mockAssetManager.initialize.mockRejectedValue(new Error('Init failed'));

      // Should still work with fallback branding
      await expect(exportEngine.generatePDF(mockReportData)).rejects.toThrow();
    });
  });

  describe('integration scenarios', () => {
    test('should generate complete PDF with all sections', async () => {
      const completeData = {
        ...mockReportData,
        charts: [document.createElement('div')],
        recommendations: [
          'Optimize images for better load times',
          'Implement lazy loading for non-critical resources',
          'Use a Content Delivery Network (CDN)'
        ]
      };

      const result = await exportEngine.generatePDFWithOptions(completeData, {
        layout: {
          pageSize: 'a4',
          margins: { top: 20, right: 20, bottom: 20, left: 20 },
          headerHeight: 30,
          footerHeight: 15
        },
        includeCharts: true,
        chartImageQuality: 0.9,
        maxImageWidth: 170,
        maxImageHeight: 120,
        imageCompression: 'MEDIUM'
      });

      expect(result).toBeInstanceOf(Blob);
      expect(mockDoc.addPage).toHaveBeenCalled(); // Multiple pages expected
      expect(mockPdfUtils.captureElementAsImage).toHaveBeenCalled();
    });

    test('should handle minimal report data', async () => {
      const minimalData: ReportData = {
        metadata: mockMetadata,
        summary: 'Basic summary',
        metricsTable: 'No metrics available',
        recommendations: [],
        charts: [],
        rawData: {
          navigation: { loadTime: 0, ttfb: 0, domContentLoaded: 0, available: false },
          resource: { totalSize: 0, resourceCount: 0, largestResource: { name: '', size: 0, type: '' }, available: false },
          rendering: { firstPaint: 0, largestContentfulPaint: 0, available: false },
          network: { ajaxCount: 0, slowestRequest: { url: '', duration: 0 }, available: false }
        }
      };

      const result = await exportEngine.generatePDF(minimalData);

      expect(result).toBeInstanceOf(Blob);
      expect(mockDoc.output).toHaveBeenCalledWith('blob');
    });
  });
});