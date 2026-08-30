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
  seo: {
    path: '/excel-to-pdf',
    metaDescription:
      'Convert an Excel spreadsheet (.xlsx, .xls) to PDF online. Every sheet becomes its own readable table. Free, no sign-up required.',
    howItWorks: [
      { title: 'Upload your spreadsheet', body: 'Add an .xlsx or .xls file.' },
      { title: 'Convert', body: 'Every sheet is turned into its own readable table.' },
      { title: 'Download the PDF', body: 'Download the converted file once it’s ready.' },
    ],
    features: [
      'Converts .xlsx and .xls spreadsheets',
      'Every sheet becomes its own table in the PDF',
      'No account needed — convert and download directly',
    ],
    faq: [
      {
        question: 'Will formulas and formatting be preserved?',
        answer:
          'Cell values are converted into a readable table; conditional formatting, charts and cell styling aren’t reproduced.',
      },
    ],
    related: [
      { label: 'CSV to PDF', href: '/csv-to-pdf' },
      { label: 'PowerPoint to PDF', href: '/powerpoint-to-pdf' },
      { label: 'Word to PDF', href: '/word-to-pdf' },
    ],
  },
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
  seo: {
    path: '/csv-to-pdf',
    metaDescription:
      'Convert a CSV file to PDF online as a readable table. Free, no sign-up required.',
    howItWorks: [
      { title: 'Upload your CSV file', body: 'Add a .csv file.' },
      { title: 'Convert', body: 'The rows and columns are laid out as a readable table.' },
      { title: 'Download the PDF', body: 'Download the converted file once it’s ready.' },
    ],
    features: [
      'Converts CSV rows and columns into a readable table',
      'No account needed — convert and download directly',
    ],
    faq: [
      {
        question: 'Does column order matter?',
        answer: 'The table follows the same column order as your CSV file.',
      },
    ],
    related: [
      { label: 'Excel to PDF', href: '/excel-to-pdf' },
      { label: 'HTML to PDF', href: '/html-to-pdf' },
    ],
  },
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
  seo: {
    path: '/powerpoint-to-pdf',
    metaDescription:
      'Convert a PowerPoint presentation (.pptx) to PDF online, one slide per page. Free, no sign-up required.',
    howItWorks: [
      { title: 'Upload your presentation', body: 'Add a .pptx file.' },
      { title: 'Convert', body: 'Each slide’s text becomes one page in the PDF.' },
      { title: 'Download the PDF', body: 'Download the converted file once it’s ready.' },
    ],
    features: [
      'Converts .pptx presentations, one slide per page',
      'No account needed — convert and download directly',
    ],
    faq: [
      {
        question: 'Will the slide design and images be preserved?',
        answer:
          'No — each slide’s text becomes a page of text; the original visual design, layout and images aren’t reproduced.',
      },
    ],
    related: [
      { label: 'Word to PDF', href: '/word-to-pdf' },
      { label: 'Excel to PDF', href: '/excel-to-pdf' },
      { label: 'HTML to PDF', href: '/html-to-pdf' },
    ],
  },
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
  seo: {
    path: '/html-to-pdf',
    metaDescription:
      'Convert an HTML file to PDF online. Inline CSS styling is respected. Free, no sign-up required.',
    howItWorks: [
      { title: 'Upload your HTML file', body: 'Add an .html or .htm file.' },
      { title: 'Convert', body: 'The page is rendered to PDF, with inline CSS styling respected.' },
      { title: 'Download the PDF', body: 'Download the converted file once it’s ready.' },
    ],
    features: [
      'Renders inline CSS styling',
      'No account needed — convert and download directly',
    ],
    faq: [
      {
        question: 'Will external stylesheets or scripts run?',
        answer: 'Inline CSS styling is respected; the conversion doesn’t fetch external resources or run scripts.',
      },
    ],
    related: [
      { label: 'CSV to PDF', href: '/csv-to-pdf' },
      { label: 'Excel to PDF', href: '/excel-to-pdf' },
      { label: 'Text to PDF', href: '/text-to-pdf' },
    ],
  },
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
  seo: {
    path: '/text-to-pdf',
    metaDescription:
      'Convert a plain-text (.txt) file to a clean, formatted PDF online. Free, no sign-up required.',
    howItWorks: [
      { title: 'Upload your text file', body: 'Add a .txt file.' },
      { title: 'Convert', body: 'The text is laid out onto formatted PDF pages.' },
      { title: 'Download the PDF', body: 'Download the converted file once it’s ready.' },
    ],
    features: ['Converts plain text into a formatted PDF', 'No account needed — convert and download directly'],
    faq: [],
    related: [
      { label: 'HTML to PDF', href: '/html-to-pdf' },
      { label: 'CSV to PDF', href: '/csv-to-pdf' },
    ],
  },
};
