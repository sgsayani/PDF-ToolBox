import {
  Combine,
  Crop,
  Droplets,
  Eraser,
  EyeOff,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType2,
  Hash,
  Image,
  Languages,
  LayoutGrid,
  Lock,
  Minimize2,
  PenLine,
  Presentation,
  ScanLine,
  ScanText,
  Scissors,
  SquarePen,
  Table,
  Type,
  Unlock,
  type LucideIcon,
} from 'lucide-react';

import type { WorkspaceTool } from '../types';

export interface ToolDefinition {
  id: string;
  name: string;
  /** One line, written for someone who does not know PDF jargon. */
  description: string;
  icon: LucideIcon;
  /** `planned` tools are shown but never presented as usable. */
  status: 'available' | 'planned';
  /** Set for tools that open a panel inside an already-open document's workspace. */
  tool?: WorkspaceTool;
  /**
   * Set for a tool that doesn't operate on an already-open document — it has
   * nothing to do with "this PDF," so it links to its own page instead of a
   * workspace panel. Mutually exclusive with `tool`.
   */
  href?: string;
}

export interface ToolCategory {
  id: string;
  name: string;
  tools: ToolDefinition[];
}

/**
 * The product's full tool catalogue, grouped the way a person looks for a
 * task ("I need to convert something", "I need to protect this") rather
 * than by how the app implements it. `status` is the single source of truth
 * for what can actually be used — the UI never offers a `planned` tool as
 * though it worked.
 */
export const TOOL_CATEGORIES: ToolCategory[] = [
  {
    id: 'organize',
    name: 'Organize',
    tools: [
      {
        id: 'organize-pages',
        name: 'Organize pages',
        description: 'Reorder, rotate and delete pages on one canvas.',
        icon: LayoutGrid,
        status: 'available',
        tool: 'organize',
      },
      {
        id: 'split',
        name: 'Split & extract',
        description: 'Pull selected pages or a range into a new PDF.',
        icon: Scissors,
        status: 'available',
        tool: 'split',
      },
      {
        id: 'merge',
        name: 'Merge PDFs',
        description: 'Combine several files into a single document.',
        icon: Combine,
        status: 'available',
        tool: 'merge',
      },
      {
        id: 'crop',
        name: 'Crop pages',
        description: 'Trim the visible area of one, several, or all pages.',
        icon: Crop,
        status: 'available',
        tool: 'crop',
      },
    ],
  },
  {
    id: 'edit',
    name: 'Edit',
    tools: [
      {
        id: 'watermark',
        name: 'Add watermark',
        description: 'Stamp text across selected pages or the whole document.',
        icon: Droplets,
        status: 'available',
        tool: 'watermark',
      },
      {
        id: 'page-numbers',
        name: 'Add page numbers',
        description: 'Number pages with control over position and start.',
        icon: Hash,
        status: 'available',
        tool: 'page-numbers',
      },
      {
        id: 'signature',
        name: 'Add signature',
        description: 'Draw a signature and place it on a page.',
        icon: PenLine,
        status: 'available',
        tool: 'sign',
      },
      {
        id: 'forms',
        name: 'Fill forms',
        description: 'Complete interactive PDF form fields.',
        icon: SquarePen,
        status: 'available',
        tool: 'fill-form',
      },
      {
        id: 'redact',
        name: 'Redact PDF',
        description: 'Permanently remove sensitive content from selected areas.',
        icon: EyeOff,
        status: 'available',
        tool: 'redact',
      },
    ],
  },
  {
    id: 'security',
    name: 'Security',
    tools: [
      {
        id: 'add-password',
        name: 'Add password',
        description: 'Protect a document with a password.',
        icon: Lock,
        status: 'available',
        tool: 'protect',
      },
      {
        id: 'remove-password',
        name: 'Remove password',
        description: 'Unlock a PDF you have the password for.',
        icon: Unlock,
        status: 'available',
        href: '/remove-password',
      },
      {
        id: 'remove-metadata',
        name: 'Metadata',
        description: 'View and strip author, title and other hidden details.',
        icon: Eraser,
        status: 'available',
        tool: 'metadata',
      },
    ],
  },
  {
    id: 'convert-to-pdf',
    name: 'Convert to PDF',
    tools: [
      {
        id: 'word-to-pdf',
        name: 'Word to PDF',
        description: 'Convert a Word document into a PDF.',
        icon: FileType2,
        status: 'available',
        href: '/word-to-pdf',
      },
      {
        id: 'excel-to-pdf',
        name: 'Excel to PDF',
        description: 'Turn a spreadsheet into readable, printable tables.',
        icon: FileSpreadsheet,
        status: 'available',
        href: '/excel-to-pdf',
      },
      {
        id: 'powerpoint-to-pdf',
        name: 'PowerPoint to PDF',
        description: 'Convert a presentation into a PDF, slide by slide.',
        icon: Presentation,
        status: 'available',
        href: '/powerpoint-to-pdf',
      },
      {
        id: 'html-to-pdf',
        name: 'HTML to PDF',
        description: 'Render an HTML file to PDF, preserving basic styling.',
        icon: FileCode,
        status: 'available',
        href: '/html-to-pdf',
      },
      {
        id: 'text-to-pdf',
        name: 'Text to PDF',
        description: 'Turn a plain-text file into a clean, formatted PDF.',
        icon: FileText,
        status: 'available',
        href: '/text-to-pdf',
      },
      {
        id: 'csv-to-pdf',
        name: 'CSV to PDF',
        description: 'Convert a CSV file into a readable table.',
        icon: Table,
        status: 'available',
        href: '/csv-to-pdf',
      },
      {
        id: 'jpg-to-pdf',
        name: 'JPG to PDF',
        description: 'Build a PDF from a set of images.',
        icon: Image,
        status: 'available',
        href: '/images-to-pdf',
      },
    ],
  },
  {
    id: 'convert-from-pdf',
    name: 'Convert from PDF',
    tools: [
      {
        id: 'pdf-to-jpg',
        name: 'PDF to JPG',
        description: 'Export pages as image files.',
        icon: FileImage,
        status: 'available',
        tool: 'to-jpg',
      },
      {
        id: 'pdf-to-word',
        name: 'PDF to Word',
        description: 'Turn a PDF into an editable document.',
        icon: FileType2,
        status: 'available',
        tool: 'to-word',
      },
      {
        id: 'pdf-to-excel',
        name: 'PDF to Excel',
        description: 'Extract table-like content into a spreadsheet.',
        icon: FileSpreadsheet,
        status: 'available',
        tool: 'to-excel',
      },
      {
        id: 'pdf-to-powerpoint',
        name: 'PDF to PowerPoint',
        description: 'One slide per page, as an image — text stays in the PDF.',
        icon: Presentation,
        status: 'available',
        tool: 'to-pptx',
      },
      {
        id: 'pdf-to-html',
        name: 'PDF to HTML',
        description: 'Export clean, readable HTML — not the PDF re-wrapped.',
        icon: FileCode,
        status: 'available',
        tool: 'to-html',
      },
      {
        id: 'pdf-to-text',
        name: 'PDF to Text',
        description: 'Copy the text content out of a PDF.',
        icon: Type,
        status: 'available',
        tool: 'extract-text',
      },
      {
        id: 'pdf-to-csv',
        name: 'PDF to CSV',
        description: 'Best-effort extraction of table rows and columns.',
        icon: Table,
        status: 'available',
        tool: 'to-csv',
      },
    ],
  },
  {
    id: 'optimize',
    name: 'Optimize',
    tools: [
      {
        id: 'compress',
        name: 'Compress PDF',
        description: 'Reduce file size, with a level you choose.',
        icon: Minimize2,
        status: 'available',
        tool: 'compress',
      },
      {
        id: 'scanner-cleanup',
        name: 'Scanner cleanup',
        description: 'Straighten and clean up scanned pages.',
        icon: ScanLine,
        status: 'available',
        tool: 'scanner-cleanup',
      },
    ],
  },
  {
    id: 'extract-ai',
    name: 'Extract / AI',
    tools: [
      {
        id: 'extract-text',
        name: 'Extract text',
        description: 'Copy the text content out of a PDF.',
        icon: Type,
        status: 'available',
        tool: 'extract-text',
      },
      {
        id: 'ocr',
        name: 'OCR',
        description: 'Recognise text in scanned documents.',
        icon: ScanText,
        status: 'available',
        tool: 'ocr',
      },
      {
        id: 'translate',
        name: 'Translate PDF',
        description: 'Translate a document into another language.',
        icon: Languages,
        status: 'available',
        tool: 'translate',
      },
    ],
  },
];

/**
 * Tools that open a panel inside the workspace — i.e. `status: 'available'`
 * *and* scoped to an already-open document via `tool`. A `status: 'available'`
 * entry with only an `href` (Images to PDF) is a real, working feature, but
 * it has nothing to do with whichever PDF is currently open, so it is
 * excluded here and does not appear inside the workspace.
 *
 * A `tool` id can legitimately appear on more than one catalogue entry
 * (e.g. "Extract text" is listed both under Extract/AI and, as "PDF to
 * Text", under Convert from PDF) — same real feature, findable from more
 * than one place a person might look for it. De-duplicated here by `tool`
 * so the workspace rail shows it once.
 */
export const AVAILABLE_TOOLS = dedupeByTool(
  TOOL_CATEGORIES.flatMap((category) =>
    category.tools.filter((tool) => tool.status === 'available' && tool.tool !== undefined),
  ),
);

function dedupeByTool(tools: ToolDefinition[]): ToolDefinition[] {
  const seen = new Set<WorkspaceTool>();
  const result: ToolDefinition[] = [];
  for (const tool of tools) {
    if (!tool.tool || seen.has(tool.tool)) continue;
    seen.add(tool.tool);
    result.push(tool);
  }
  return result;
}

/**
 * The catalogue, filtered for the workspace's tool rail: still shows what's
 * "Soon", but drops standalone tools like Images to PDF that don't apply to
 * an open document (see `AVAILABLE_TOOLS`), and — within a category — a
 * `tool` id already shown by an earlier category.
 */
export const WORKSPACE_TOOL_CATEGORIES: ToolCategory[] = (() => {
  const seen = new Set<WorkspaceTool>();
  return TOOL_CATEGORIES.map((category) => ({
    ...category,
    tools: category.tools.filter((tool) => {
      if (tool.status !== 'available') return true;
      if (tool.tool === undefined) return false;
      if (seen.has(tool.tool)) return false;
      seen.add(tool.tool);
      return true;
    }),
  })).filter((category) => category.tools.length > 0);
})();

export function findTool(tool: WorkspaceTool): ToolDefinition {
  const match = AVAILABLE_TOOLS.find((definition) => definition.tool === tool);
  if (!match) throw new Error(`Unknown tool: ${tool}`);
  return match;
}
