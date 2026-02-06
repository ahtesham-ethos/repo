// Phase 2 Enhancement Types for Blackbox

import { AllMetrics, OverallHealth, Thresholds, HealthStatus } from './index';

// Chart.js Integration Types

/**
 * Chart.js specific imports and types
 */
export type ChartJSChart = import('chart.js').Chart;
export type ChartJSConfiguration = import('chart.js').ChartConfiguration;
export type ChartJSChartType = import('chart.js').ChartType;
export type ChartJSDataset = import('chart.js').ChartDataset;
export type ChartJSScriptableContext = import('chart.js').ScriptableContext<any>;

/**
 * Chart.js color configuration for consistent theming
 */
export interface ChartColorScheme {
  /** Primary colors for data visualization */
  primary: string[];
  /** Success/pass colors */
  success: string[];
  /** Warning colors */
  warning: string[];
  /** Error/fail colors */
  error: string[];
  /** Neutral/background colors */
  neutral: string[];
}

/**
 * Chart.js animation configuration
 */
export interface ChartAnimationConfig {
  /** Animation duration in milliseconds */
  duration: number;
  /** Animation easing function */
  easing: 'linear' | 'easeInQuad' | 'easeOutQuad' | 'easeInOutQuad';
  /** Whether to animate on initial render */
  animateRotate: boolean;
  /** Whether to animate scale changes */
  animateScale: boolean;
}

/**
 * Enhanced Chart.js dataset with Blackbox-specific properties
 */
export interface BlackboxChartDataset extends Omit<ChartJSDataset, 'data'> {
  /** Dataset label */
  label: string;
  /** Data values */
  data: number[];
  /** Background colors with theme support */
  backgroundColor: string | string[] | ((ctx: ChartJSScriptableContext) => string);
  /** Border colors with theme support */
  borderColor?: string | string[] | ((ctx: ChartJSScriptableContext) => string);
  /** Border width */
  borderWidth?: number;
  /** Threshold line value for comparison charts */
  thresholdValue?: number;
  /** Health status for color coding */
  healthStatus?: HealthStatus[];
}

/**
 * Blackbox-specific chart configuration extending Chart.js
 */
export interface BlackboxChartConfiguration extends Omit<ChartJSConfiguration, 'data'> {
  /** Chart type */
  type: ChartJSChartType;
  /** Chart title for display */
  title: string;
  /** Chart data with Blackbox enhancements */
  data: {
    labels: string[];
    datasets: BlackboxChartDataset[];
  };
  /** Chart options with Blackbox defaults */
  options: {
    responsive: boolean;
    maintainAspectRatio: boolean;
    animation: ChartAnimationConfig;
    plugins: {
      title: { display: boolean; text: string; font?: { size: number } };
      legend: { display: boolean; position?: 'top' | 'bottom' | 'left' | 'right' };
      tooltip: { 
        enabled: boolean;
        callbacks?: {
          label?: (context: any) => string;
          title?: (context: any) => string;
        };
      };
    };
    scales?: {
      x?: { 
        display: boolean; 
        title?: { display: boolean; text: string };
        grid?: { display: boolean };
      };
      y?: { 
        display: boolean; 
        beginAtZero: boolean;
        title?: { display: boolean; text: string };
        grid?: { display: boolean };
      };
    };
  };
}

// Branding and Asset Management Types

/**
 * Branding configuration for consistent visual identity
 */
export interface BrandingConfig {
  /** Official product name */
  productName: string;
  /** Path to logo image file */
  logoPath: string;
  /** Primary brand color (hex) */
  primaryColor: string;
  /** Secondary brand color (hex) */
  secondaryColor: string;
  /** Accent color for success states (hex) */
  accentColor: string;
  /** Warning color for caution states (hex) */
  warningColor: string;
  /** Error color for failure states (hex) */
  errorColor: string;
  /** Font family for consistent typography */
  fontFamily: string;
  /** Product description */
  description: string;
  /** Chart color scheme */
  chartColors: ChartColorScheme;
}

/**
 * Asset Manager interface for branding and visual identity
 */
export interface AssetManager {
  /** Get the path to the logo file */
  getLogoPath(): string;
  /** Get complete branding configuration */
  getBrandingElements(): BrandingConfig;
  /** Apply branding styles to a DOM element */
  applyBrandingToElement(element: HTMLElement): void;
  /** Generate a branded header element */
  generateBrandedHeader(): HTMLElement;
  /** Get chart color scheme for consistent visualization */
  getChartColorScheme(): ChartColorScheme;
}

// UI and Dashboard Types

/**
 * View mode configuration for expandable interface
 */
export interface ViewMode {
  /** Whether the interface is in expanded mode */
  isExpanded: boolean;
  /** Container element for the interface */
  containerElement: HTMLElement;
  /** Current dimensions of the interface */
  dimensions: { width: number; height: number };
}

/**
 * Enhanced metrics display with threshold comparison
 */
export interface ThresholdDisplay {
  /** Metric name */
  metric: string;
  /** Actual measured value */
  actualValue: number;
  /** Threshold value for comparison */
  thresholdValue: number;
  /** Health status based on comparison */
  status: HealthStatus;
  /** Color code for visual indication */
  colorCode: string;
  /** Human-readable formatted actual value */
  formattedActual: string;
  /** Human-readable formatted threshold value */
  formattedThreshold: string;
}

/**
 * Visual Dashboard interface for enhanced popup
 */
export interface VisualDashboard {
  /** Update the metrics display with threshold comparison */
  updateMetricsDisplay(metrics: AllMetrics, thresholds: Thresholds): void;
  /** Show loading indicator for operations */
  showLoadingIndicator(operation: string): void;
  /** Hide loading indicator */
  hideLoadingIndicator(): void;
}

// Chart and Visualization Types

/**
 * Chart type enumeration for Blackbox visualizations
 */
export type ChartType = 'bar' | 'line' | 'pie' | 'doughnut' | 'radar';

/**
 * Chart dataset configuration (legacy compatibility)
 */
export interface Dataset {
  /** Dataset label */
  label: string;
  /** Data values */
  data: number[];
  /** Background colors */
  backgroundColor: string | string[];
  /** Border colors */
  borderColor?: string | string[];
  /** Border width */
  borderWidth?: number;
}

/**
 * Chart data structure (legacy compatibility)
 */
export interface ChartData {
  /** Chart labels */
  labels: string[];
  /** Chart datasets */
  datasets: Dataset[];
}

/**
 * Chart configuration options (legacy compatibility)
 */
export interface ChartOptions {
  /** Whether chart is responsive */
  responsive: boolean;
  /** Chart plugins configuration */
  plugins?: {
    title?: { display: boolean; text: string };
    legend?: { display: boolean; position?: string };
  };
  /** Chart scales configuration */
  scales?: {
    x?: { display: boolean };
    y?: { display: boolean; beginAtZero?: boolean };
  };
}

/**
 * Complete chart configuration (legacy compatibility)
 */
export interface ChartConfiguration {
  /** Chart type */
  type: ChartType;
  /** Chart title */
  title: string;
  /** Chart data */
  data: ChartData;
  /** Chart options */
  options: ChartOptions;
}

/**
 * Chart Engine interface for data visualization
 */
export interface ChartEngine {
  /** Generate chart configurations for performance metrics */
  generatePerformanceCharts(metrics: AllMetrics, thresholds: Thresholds): BlackboxChartConfiguration[];
  /** Render a chart in the specified container */
  renderChart(container: HTMLElement, config: BlackboxChartConfiguration): ChartJSChart;
  /** Select optimal chart type for a metric */
  selectOptimalChartType(metric: string): ChartJSChartType;
  /** Create an interactive chart instance */
  createInteractiveChart(config: BlackboxChartConfiguration): ChartJSChart;
  /** Update chart data dynamically */
  updateChartData(chart: ChartJSChart, newData: BlackboxChartDataset[]): void;
  /** Destroy chart instance and clean up resources */
  destroyChart(chart: ChartJSChart): void;
}

/**
 * Chart factory for creating specific chart types
 */
export interface ChartFactory {
  /** Create performance metrics comparison chart */
  createMetricsComparisonChart(metrics: AllMetrics, thresholds: Thresholds): BlackboxChartConfiguration;
  /** Create resource size distribution chart */
  createResourceDistributionChart(metrics: AllMetrics): BlackboxChartConfiguration;
  /** Create performance timeline chart */
  createPerformanceTimelineChart(metrics: AllMetrics): BlackboxChartConfiguration;
  /** Create health status overview chart */
  createHealthStatusChart(health: OverallHealth): BlackboxChartConfiguration;
}

// Report Generation Types

/**
 * Browser information for report metadata
 */
export interface BrowserInfo {
  /** Browser name */
  name: string;
  /** Browser version */
  version: string;
  /** Full user agent string */
  userAgent: string;
  /** Operating system platform */
  platform: string;
}

/**
 * Report metadata for context information
 */
export interface ReportMetadata {
  /** Report generation timestamp */
  generatedAt: Date;
  /** Target webpage URL */
  url: string;
  /** Browser information */
  browserInfo: BrowserInfo;
  /** Report type */
  reportType: 'text' | 'pdf';
}

/**
 * Structured report data
 */
export interface ReportData {
  /** Report metadata */
  metadata: ReportMetadata;
  /** Executive summary text */
  summary: string;
  /** Formatted metrics table */
  metricsTable: string;
  /** Performance recommendations */
  recommendations: string[];
  /** Chart elements for PDF inclusion */
  charts: HTMLElement[];
  /** Raw metrics data */
  rawData: AllMetrics;
}

/**
 * Report Generator interface for text-based reports
 */
export interface ReportGenerator {
  /** Generate a text-based report */
  generateTextReport(analysis: OverallHealth, metadata: ReportMetadata): string;
  /** Generate structured report data */
  generateStructuredReport(analysis: OverallHealth, profile?: SavedProfile): ReportData;
  /** Format metrics section for reports */
  formatMetricsSection(metrics: AllMetrics, thresholds: Thresholds): string;
  /** Create executive summary */
  createExecutiveSummary(health: OverallHealth): string;
}

// PDF Export Types

/**
 * jsPDF and html2canvas specific imports and types
 */
export type jsPDFInstance = import('jspdf').jsPDF;
export type Html2CanvasOptions = import('html2canvas').Options;

/**
 * PDF layout configuration
 */
export interface PDFLayout {
  /** Page size */
  pageSize: 'a4' | 'letter';
  /** Page margins */
  margins: { top: number; right: number; bottom: number; left: number };
  /** Header height */
  headerHeight: number;
  /** Footer height */
  footerHeight: number;
}

/**
 * PDF generation options
 */
export interface PDFGenerationOptions {
  /** PDF layout configuration */
  layout: PDFLayout;
  /** Include charts as images */
  includeCharts: boolean;
  /** Chart image quality (0-1) */
  chartImageQuality: number;
  /** Maximum image width in PDF */
  maxImageWidth: number;
  /** Maximum image height in PDF */
  maxImageHeight: number;
  /** Compression level for images */
  imageCompression: 'NONE' | 'FAST' | 'MEDIUM' | 'SLOW';
}

/**
 * html2canvas configuration for chart capture
 */
export interface ChartCaptureOptions extends Partial<Html2CanvasOptions> {
  /** Background color for transparent elements */
  backgroundColor?: string;
  /** Scale factor for high-DPI displays */
  scale?: number;
  /** Whether to use CORS for cross-origin images */
  useCORS?: boolean;
  /** Whether to allow tainted canvas */
  allowTaint?: boolean;
  /** Image format for output */
  imageFormat?: 'png' | 'jpeg';
  /** JPEG quality (0-1) when using jpeg format */
  quality?: number;
}

/**
 * PDF content section configuration
 */
export interface PDFSection {
  /** Section title */
  title: string;
  /** Section content */
  content: string;
  /** Y position on page */
  yPosition: number;
  /** Font size for section */
  fontSize: number;
  /** Whether to add page break after section */
  pageBreak: boolean;
}

/**
 * Export Engine interface for PDF generation
 */
export interface ExportEngine {
  /** Generate PDF from report data */
  generatePDF(reportData: ReportData, charts: HTMLElement[]): Promise<Blob>;
  /** Generate PDF with custom options */
  generatePDFWithOptions(reportData: ReportData, options: PDFGenerationOptions): Promise<Blob>;
  /** Add branding elements to PDF */
  addBrandingToPDF(doc: jsPDFInstance): void;
  /** Capture chart elements as images */
  captureChartsAsImages(chartElements: HTMLElement[]): Promise<string[]>;
  /** Capture single chart as image with options */
  captureChartAsImage(chartElement: HTMLElement, options: ChartCaptureOptions): Promise<string>;
  /** Format PDF layout */
  formatPDFLayout(content: ReportData): PDFLayout;
  /** Add PDF header with branding */
  addPDFHeader(doc: jsPDFInstance, title: string): void;
  /** Add PDF footer with metadata */
  addPDFFooter(doc: jsPDFInstance, metadata: ReportMetadata): void;
  /** Calculate optimal image dimensions for PDF */
  calculateImageDimensions(originalWidth: number, originalHeight: number, maxWidth: number, maxHeight: number): { width: number; height: number };
}

// Profile Management Types

/**
 * Saved profile data structure
 */
export interface SavedProfile {
  /** Unique profile identifier */
  id: string;
  /** Target webpage URL */
  url: string;
  /** Analysis timestamp */
  timestamp: number;
  /** Complete analysis results */
  analysis: OverallHealth;
  /** Raw metrics data */
  metrics: AllMetrics;
  /** Thresholds used for analysis */
  thresholds: Thresholds;
  /** Browser context information */
  browserInfo: BrowserInfo;
}

/**
 * Profile Manager interface for data persistence
 */
export interface ProfileManager {
  /** Save a complete analysis profile */
  saveProfile(analysis: OverallHealth, url: string): Promise<string>;
  /** Retrieve all saved profiles */
  getProfiles(): Promise<SavedProfile[]>;
  /** Delete a specific profile */
  deleteProfile(profileId: string): Promise<void>;
  /** Export profile data for reporting */
  exportProfile(profileId: string): Promise<ReportData>;
}

// UI Component Types

/**
 * Profile list item for UI display
 */
export interface ProfileListItem {
  /** Profile data */
  profile: SavedProfile;
  /** Formatted display date */
  displayDate: string;
  /** Formatted display URL */
  displayUrl: string;
  /** Available actions */
  actions: ProfileAction[];
}

/**
 * Profile action configuration
 */
export interface ProfileAction {
  /** Action type */
  type: 'copy' | 'print' | 'delete';
  /** Action label */
  label: string;
  /** Action icon */
  icon: string;
  /** Action handler */
  handler: (profileId: string) => void;
}

/**
 * Loading state configuration
 */
export interface LoadingState {
  /** Whether loading is active */
  isLoading: boolean;
  /** Loading operation description */
  operation: string;
  /** Progress percentage (0-100) */
  progress?: number;
}

// Event and Interaction Types

/**
 * UI event types for Phase 2 interactions
 */
export type UIEventType = 
  | 'expand_dashboard'
  | 'collapse_dashboard'
  | 'show_charts'
  | 'hide_charts'
  | 'generate_report'
  | 'export_pdf'
  | 'save_profile'
  | 'load_profile'
  | 'delete_profile';

/**
 * UI event data structure
 */
export interface UIEvent {
  /** Event type */
  type: UIEventType;
  /** Event timestamp */
  timestamp: number;
  /** Event data payload */
  data?: any;
}

/**
 * Event handler function type
 */
export type EventHandler = (event: UIEvent) => void;

// Error Handling Types

/**
 * Phase 2 specific error types
 */
export type Phase2ErrorType = 
  | 'ASSET_LOADING_ERROR'
  | 'CHART_RENDERING_ERROR'
  | 'PDF_GENERATION_ERROR'
  | 'STORAGE_ERROR'
  | 'UI_EXPANSION_ERROR';

/**
 * Enhanced error information for Phase 2
 */
export interface Phase2Error extends Error {
  /** Error type classification */
  type: Phase2ErrorType;
  /** Error context information */
  context?: any;
  /** Whether error is recoverable */
  recoverable: boolean;
  /** Suggested fallback action */
  fallback?: string;
}