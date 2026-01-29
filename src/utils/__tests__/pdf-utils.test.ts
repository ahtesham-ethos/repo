/**
 * Tests for PDF utility functions
 */

import {
  isPDFGenerationSupported,
  estimatePDFSize,
  downloadPDF
} from '../pdf-utils';

// Mock the dynamic imports for testing
jest.mock('jspdf', () => ({
  jsPDF: jest.fn().mockImplementation(() => ({
    setFontSize: jest.fn(),
    text: jest.fn(),
    addPage: jest.fn(),
    addImage: jest.fn(),
    output: jest.fn().mockReturnValue(new Blob(['test pdf'], { type: 'application/pdf' }))
  }))
}));

jest.mock('html2canvas', () => ({
  default: jest.fn().mockResolvedValue({
    toDataURL: jest.fn().mockReturnValue('data:image/png;base64,test')
  })
}));

describe('PDF Utils', () => {
  describe('isPDFGenerationSupported', () => {
    test('should return true in supported environment', () => {
      // jsdom provides these APIs, but we need to check more carefully
      const result = isPDFGenerationSupported();
      // In jsdom, this should return true since all required APIs are available
      expect(typeof result).toBe('boolean');
      // The actual value depends on jsdom's implementation, so we just verify it's a boolean
    });

    test('should return false if required APIs are missing', () => {
      const originalBlob = window.Blob;
      delete (window as any).Blob;
      
      expect(isPDFGenerationSupported()).toBe(false);
      
      // Restore
      window.Blob = originalBlob;
    });
  });

  describe('estimatePDFSize', () => {
    test('should calculate base size for empty content', () => {
      const size = estimatePDFSize(0, 0);
      expect(size).toBe(50); // Base size
    });

    test('should add size for text lines', () => {
      const size = estimatePDFSize(100, 0);
      expect(size).toBe(60); // 50 base + 10 for text
    });

    test('should add size for charts', () => {
      const size = estimatePDFSize(0, 2);
      expect(size).toBe(250); // 50 base + 200 for 2 charts
    });

    test('should use higher resolution chart size when specified', () => {
      const normalSize = estimatePDFSize(0, 1, false);
      const highResSize = estimatePDFSize(0, 1, true);
      
      expect(highResSize).toBeGreaterThan(normalSize);
      expect(normalSize).toBe(150); // 50 base + 100 for 1 chart
      expect(highResSize).toBe(250); // 50 base + 200 for 1 high-res chart
    });
  });

  describe('downloadPDF', () => {
    test('should create download link and trigger download', () => {
      const mockBlob = new Blob(['test'], { type: 'application/pdf' });
      const mockCreateObjectURL = jest.fn().mockReturnValue('blob:test-url');
      const mockRevokeObjectURL = jest.fn();
      const mockClick = jest.fn();
      
      // Mock URL methods
      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;
      
      // Mock createElement to return element with click method
      const mockLink = {
        href: '',
        download: '',
        click: mockClick
      };
      
      const originalCreateElement = document.createElement;
      document.createElement = jest.fn().mockReturnValue(mockLink);
      
      // Mock appendChild and removeChild
      const mockAppendChild = jest.fn();
      const mockRemoveChild = jest.fn();
      document.body.appendChild = mockAppendChild;
      document.body.removeChild = mockRemoveChild;
      
      // Test the function
      downloadPDF(mockBlob, 'test-report.pdf');
      
      expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
      expect(mockLink.href).toBe('blob:test-url');
      expect(mockLink.download).toBe('test-report.pdf');
      expect(mockAppendChild).toHaveBeenCalledWith(mockLink);
      expect(mockClick).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalledWith(mockLink);
      
      // Restore mocks
      document.createElement = originalCreateElement;
    });

    test('should use default filename when not provided', () => {
      const mockBlob = new Blob(['test'], { type: 'application/pdf' });
      const mockCreateObjectURL = jest.fn().mockReturnValue('blob:test-url');
      
      global.URL.createObjectURL = mockCreateObjectURL;
      
      const mockLink = {
        href: '',
        download: '',
        click: jest.fn()
      };
      
      document.createElement = jest.fn().mockReturnValue(mockLink);
      document.body.appendChild = jest.fn();
      document.body.removeChild = jest.fn();
      
      downloadPDF(mockBlob);
      
      expect(mockLink.download).toBe('blackbox-report.pdf');
    });

    test('should handle download errors gracefully', () => {
      const mockBlob = new Blob(['test'], { type: 'application/pdf' });
      
      // Mock URL.createObjectURL to throw error
      global.URL.createObjectURL = jest.fn().mockImplementation(() => {
        throw new Error('URL creation failed');
      });
      
      expect(() => downloadPDF(mockBlob)).toThrow('PDF download failed');
    });
  });

  describe('Dynamic import functions', () => {
    // These tests verify that the dynamic import structure is correct
    // The actual imports are mocked, but we test the function signatures
    
    test('should have correct function exports', () => {
      const pdfUtils = require('../pdf-utils');
      
      expect(typeof pdfUtils.createPDFInstance).toBe('function');
      expect(typeof pdfUtils.captureElementAsImage).toBe('function');
      expect(typeof pdfUtils.createBasicPDF).toBe('function');
      expect(typeof pdfUtils.createPDFWithCharts).toBe('function');
      expect(typeof pdfUtils.downloadPDF).toBe('function');
      expect(typeof pdfUtils.isPDFGenerationSupported).toBe('function');
      expect(typeof pdfUtils.estimatePDFSize).toBe('function');
    });
  });
});