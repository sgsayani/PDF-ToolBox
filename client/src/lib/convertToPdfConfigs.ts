import { FileCode, FileSpreadsheet, FileText, Presentation, Table } from 'lucide-react';

import { documentsApi } from '../services/documentsApi';
import type { ConvertToPdfConfig } from '../pages/ConvertToPdfPage';

export const EXCEL_TO_PDF_CONFIG: ConvertToPdfConfig = {
  title: 'Excel to PDF',
  description:
    'Add a spreadsheet to convert it right away. Every sheet becomes its own readable table.',
  icon: FileSpreadsheet,
  accept:
    '.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel',
  extensions: ['.xlsx', '.xls'],
  mimeTypes: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ],
  fileTypeLabel: ['Excel file', 'Excel files'],
  validationLabel: 'Excel',
  convert: (file, options) => documentsApi.excelToPdf(file, options),
};

export const CSV_TO_PDF_CONFIG: ConvertToPdfConfig = {
  title: 'CSV to PDF',
  description: 'Add a CSV file to convert it into a readable table.',
  icon: Table,
  accept: '.csv,text/csv',
  extensions: ['.csv'],
  mimeTypes: ['text/csv', 'application/vnd.ms-excel', 'text/plain'],
  fileTypeLabel: ['CSV file', 'CSV files'],
  validationLabel: 'CSV',
  convert: (file, options) => documentsApi.csvToPdf(file, options),
};

export const POWERPOINT_TO_PDF_CONFIG: ConvertToPdfConfig = {
  title: 'PowerPoint to PDF',
  description:
    "Add a .pptx file to convert it. Each slide's text becomes a page — the original visual design isn't reproduced.",
  icon: Presentation,
  accept: '.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation',
  extensions: ['.pptx'],
  mimeTypes: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  fileTypeLabel: ['PowerPoint file', 'PowerPoint files'],
  validationLabel: 'PowerPoint',
  convert: (file, options) => documentsApi.pptxToPdf(file, options),
};

export const HTML_TO_PDF_CONFIG: ConvertToPdfConfig = {
  title: 'HTML to PDF',
  description: 'Add an HTML file to render it to PDF. Inline CSS styling is respected.',
  icon: FileCode,
  accept: '.html,.htm,text/html',
  extensions: ['.html', '.htm'],
  mimeTypes: ['text/html'],
  fileTypeLabel: ['HTML file', 'HTML files'],
  validationLabel: 'HTML',
  convert: (file, options) => documentsApi.htmlToPdf(file, options),
};

export const TEXT_TO_PDF_CONFIG: ConvertToPdfConfig = {
  title: 'Text to PDF',
  description: 'Add a plain-text file to turn it into a clean, formatted PDF.',
  icon: FileText,
  accept: '.txt,text/plain',
  extensions: ['.txt'],
  mimeTypes: ['text/plain'],
  fileTypeLabel: ['text file', 'text files'],
  validationLabel: 'text',
  convert: (file, options) => documentsApi.textToPdf(file, options),
};
