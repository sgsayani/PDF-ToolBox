import {
  Combine,
  Droplets,
  Eraser,
  FileImage,
  FileType2,
  Hash,
  Image,
  LayoutGrid,
  Lock,
  Minimize2,
  PenLine,
  ScanLine,
  ScanText,
  Scissors,
  SquarePen,
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
 * The product's full tool catalogue.
 *
 * Everything is listed so the roadmap is visible, but `status` is the single
 * source of truth for what can actually be used — the UI never offers a
 * `planned` tool as though it worked.
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
    id: 'convert',
    name: 'Convert',
    tools: [
      {
        id: 'pdf-to-word',
        name: 'PDF to Word',
        description: 'Turn a PDF into an editable document.',
        icon: FileType2,
        status: 'available',
        tool: 'to-word',
      },
      {
        id: 'word-to-pdf',
        name: 'Word to PDF',
        description: 'Convert a Word document into a PDF.',
        icon: FileType2,
        status: 'available',
        href: '/word-to-pdf',
      },
      {
        id: 'pdf-to-jpg',
        name: 'PDF to JPG',
        description: 'Export pages as image files.',
        icon: FileImage,
        status: 'available',
        tool: 'to-jpg',
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
    id: 'optimize',
    name: 'Optimize',
    tools: [
      {
        id: 'compress',
        name: 'Compress PDF',
        description: 'Reduce file size while keeping pages readable.',
        icon: Minimize2,
        status: 'planned',
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
    id: 'extract',
    name: 'Extract',
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
    ],
  },
];

/**
 * Tools that open a panel inside the workspace — i.e. `status: 'available'`
 * *and* scoped to an already-open document via `tool`. A `status: 'available'`
 * entry with only an `href` (Images to PDF) is a real, working feature, but
 * it has nothing to do with whichever PDF is currently open, so it is
 * excluded here and does not appear inside the workspace.
 */
export const AVAILABLE_TOOLS = TOOL_CATEGORIES.flatMap((category) =>
  category.tools.filter((tool) => tool.status === 'available' && tool.tool !== undefined),
);

/**
 * The catalogue, filtered for the workspace's tool rail: still shows what's
 * "Soon", but drops standalone tools like Images to PDF that don't apply to
 * an open document (see `AVAILABLE_TOOLS`).
 */
export const WORKSPACE_TOOL_CATEGORIES: ToolCategory[] = TOOL_CATEGORIES.map((category) => ({
  ...category,
  tools: category.tools.filter((tool) => tool.status !== 'available' || tool.tool !== undefined),
}));

export function findTool(tool: WorkspaceTool): ToolDefinition {
  const match = AVAILABLE_TOOLS.find((definition) => definition.tool === tool);
  if (!match) throw new Error(`Unknown tool: ${tool}`);
  return match;
}
