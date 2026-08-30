import type { WorkspaceTool } from '../types';
import type { FaqItem } from './structuredData';

export interface RelatedLink {
  label: string;
  href: string;
}

export interface HowItWorksStep {
  title: string;
  body: string;
}

export interface ToolLandingContent {
  /** Route this content is served at, e.g. "/merge-pdf". */
  slug: string;
  /** Workspace panel to open once a file is uploaded. */
  tool: WorkspaceTool;
  /** Breadcrumb label, e.g. "Merge PDF". */
  navLabel: string;
  h1: string;
  /** One or two sentences under the H1. */
  intro: string;
  /** ~150-160 characters, for search snippets. */
  metaDescription: string;
  howItWorks: HowItWorksStep[];
  features: string[];
  faq: FaqItem[];
  related: RelatedLink[];
}

const UPLOAD_STEP: HowItWorksStep = {
  title: 'Upload your PDF',
  body: 'Drop in a file or pick one from your device. It’s checked to make sure it’s a real, readable PDF before anything else happens.',
};

const DOWNLOAD_STEP: HowItWorksStep = {
  title: 'Download the result',
  body: 'Review the change, then download. Nothing is saved beyond the working copy, which is deleted automatically after a short while.',
};

export const TOOL_LANDING_PAGES: ToolLandingContent[] = [
  {
    slug: '/merge-pdf',
    tool: 'merge',
    navLabel: 'Merge PDF',
    h1: 'Merge PDF Files Online',
    intro:
      'Combine multiple PDF files into a single document. Upload your files, arrange them in the order you want, and download the combined PDF.',
    metaDescription:
      'Merge multiple PDF files into one document online. Reorder files by dragging, then download the combined PDF. Free, no sign-up required.',
    howItWorks: [
      UPLOAD_STEP,
      {
        title: 'Add the rest of your files',
        body: 'Add every other PDF you want in the final document, then drag to put them in the order you need.',
      },
      {
        title: 'Merge',
        body: 'Combine everything into one new PDF, ready to review before you download it.',
      },
      DOWNLOAD_STEP,
    ],
    features: [
      'Combine any number of PDF files into one document',
      'Reorder files by dragging before merging',
      'Review the combined document before downloading',
      'Works entirely in the browser — no account needed',
    ],
    faq: [
      {
        question: 'Is there a limit to how many files I can merge?',
        answer:
          'You can merge as many files as the upload limit shown on the page allows. The limit exists to keep processing fast, not to gate the feature.',
      },
      {
        question: 'Can I change the order of the files after merging?',
        answer:
          'Yes — drag files into the order you want before merging. The final document follows that order exactly.',
      },
      {
        question: 'What happens to my files after merging?',
        answer:
          'Your files are processed to produce the merged PDF and then deleted automatically. Nothing is kept after the working copy expires.',
      },
    ],
    related: [
      { label: 'Split PDF', href: '/split-pdf' },
      { label: 'Compress PDF', href: '/compress-pdf' },
      { label: 'PDF to JPG', href: '/pdf-to-jpg' },
    ],
  },
  {
    slug: '/split-pdf',
    tool: 'split',
    navLabel: 'Split PDF',
    h1: 'Split PDF Files Online',
    intro:
      'Pull specific pages, or a page range, out of a PDF into a new document. Upload a file, choose the pages, and download the result.',
    metaDescription:
      'Split a PDF into a new document by selecting pages or typing a range like 1-3, 5, 8-10. Free online PDF splitter, no sign-up required.',
    howItWorks: [
      UPLOAD_STEP,
      {
        title: 'Choose pages',
        body: 'Select pages on the page grid, or type a range such as "1-3, 5, 8-10".',
      },
      {
        title: 'Extract',
        body: 'The chosen pages are pulled into a new PDF — your original file is left untouched.',
      },
      DOWNLOAD_STEP,
    ],
    features: [
      'Select pages visually or type a page range',
      'Extract into a brand-new PDF, original file unchanged',
      'See every page before you decide what to extract',
      'Works entirely in the browser — no account needed',
    ],
    faq: [
      {
        question: 'Does splitting change my original file?',
        answer:
          'No. Splitting reads the pages you choose and writes them into a new PDF; the file you uploaded isn’t modified.',
      },
      {
        question: 'Can I extract a range and individual pages at once?',
        answer:
          'Yes — the page range field accepts a mix, like "1-3, 5, 8-10", and the page grid lets you fine-tune the same selection visually.',
      },
    ],
    related: [
      { label: 'Merge PDF', href: '/merge-pdf' },
      { label: 'Compress PDF', href: '/compress-pdf' },
      { label: 'Crop PDF', href: '/crop-pdf' },
    ],
  },
  {
    slug: '/compress-pdf',
    tool: 'compress',
    navLabel: 'Compress PDF',
    h1: 'Compress PDF Files Online',
    intro:
      'Reduce a PDF’s file size with a compression level you choose. Upload a file, pick a level, and download a smaller PDF.',
    metaDescription:
      'Compress a PDF to reduce its file size. Choose basic, balanced or strong compression and download a smaller file. Free, no sign-up required.',
    howItWorks: [
      UPLOAD_STEP,
      {
        title: 'Choose a compression level',
        body: 'Basic, balanced or strong — a stronger level shrinks the file more but reduces image and text sharpness further.',
      },
      {
        title: 'Compress',
        body: 'Each page is re-encoded at the chosen level and reassembled into a new PDF.',
      },
      DOWNLOAD_STEP,
    ],
    features: [
      'Three compression levels to balance size against quality',
      'See the before-and-after file size before you download',
      'Falls back to your original file if compression wouldn’t actually shrink it',
      'Works entirely in the browser — no account needed',
    ],
    faq: [
      {
        question: 'Will the text in my PDF still be selectable after compressing?',
        answer:
          'No. Compression works by re-rendering every page as a smaller image, so the compressed file is not searchable or selectable the way the original was. Keep the original if you need to search or copy text from it.',
      },
      {
        question: 'What if my PDF is already small?',
        answer:
          'A short, mostly-text PDF can come out larger after re-rendering as images. If that happens, the tool returns your original file instead of a bigger one.',
      },
      {
        question: 'Which level should I choose?',
        answer:
          '"Basic" keeps the most detail with the smallest size reduction; "strong" shrinks the file the most but visibly softens images and text. "Balanced" is a reasonable middle ground for most documents.',
      },
    ],
    related: [
      { label: 'Merge PDF', href: '/merge-pdf' },
      { label: 'Split PDF', href: '/split-pdf' },
      { label: 'PDF to JPG', href: '/pdf-to-jpg' },
    ],
  },
  {
    slug: '/pdf-to-word',
    tool: 'to-word',
    navLabel: 'PDF to Word',
    h1: 'Convert PDF to Word Online',
    intro:
      'Turn a PDF’s text into an editable Word document. Upload a file and download a .docx with the same text, paragraph by paragraph.',
    metaDescription:
      'Convert PDF to an editable Word (.docx) document online. Text-preserving conversion, one page break per source page. Free, no sign-up required.',
    howItWorks: [
      UPLOAD_STEP,
      {
        title: 'Convert',
        body: 'The text layer is read from every page and turned into paragraphs, with a page break where each source page ended.',
      },
      DOWNLOAD_STEP,
    ],
    features: [
      'Converts a PDF’s text into an editable .docx file',
      'One page break per original page, so page structure is kept',
      'Clear error if a PDF has no extractable text (e.g. a scanned page)',
      'Works entirely in the browser — no account needed',
    ],
    faq: [
      {
        question: 'Will the layout, fonts and images be preserved?',
        answer:
          'No — this is a text-preserving conversion, not a layout-preserving one. Each line becomes a paragraph and each page becomes a page break; original fonts, columns and images aren’t reproduced.',
      },
      {
        question: 'What happens with a scanned PDF that has no text layer?',
        answer:
          'The conversion is rejected with a clear message rather than producing an empty document. Run OCR first if you need to convert a scanned document.',
      },
    ],
    related: [
      { label: 'Word to PDF', href: '/word-to-pdf' },
      { label: 'PDF Text Extractor', href: '/pdf-text-extractor' },
      { label: 'PDF to JPG', href: '/pdf-to-jpg' },
    ],
  },
  {
    slug: '/pdf-to-jpg',
    tool: 'to-jpg',
    navLabel: 'PDF to JPG',
    h1: 'Convert PDF to JPG Online',
    intro:
      'Turn PDF pages into JPEG images. Upload a file, choose which pages, and download them individually or as a ZIP.',
    metaDescription:
      'Convert PDF pages to JPG images online. Choose specific pages or convert them all, then download individually or as a ZIP. Free, no sign-up required.',
    howItWorks: [
      UPLOAD_STEP,
      {
        title: 'Choose pages',
        body: 'Convert every page, or just the ones you select.',
      },
      {
        title: 'Convert',
        body: 'Each chosen page is rasterized to a JPEG image.',
      },
      {
        title: 'Download',
        body: 'Download each image individually, or as one ZIP file when there’s more than one.',
      },
    ],
    features: [
      'Convert every page or just the ones you choose',
      'Download images individually or bundled as a ZIP',
      'Preview pages before converting',
      'Works entirely in the browser — no account needed',
    ],
    faq: [
      {
        question: 'What resolution are the images?',
        answer:
          'Pages are rasterized at screen resolution — good for viewing and sharing, not intended as a substitute for print-resolution scanning.',
      },
      {
        question: 'Can I convert just a few pages instead of the whole document?',
        answer: 'Yes — select specific pages, or convert the entire document at once.',
      },
    ],
    related: [
      { label: 'JPG to PDF', href: '/images-to-pdf' },
      { label: 'Split PDF', href: '/split-pdf' },
      { label: 'Compress PDF', href: '/compress-pdf' },
    ],
  },
  {
    slug: '/crop-pdf',
    tool: 'crop',
    navLabel: 'Crop PDF',
    h1: 'Crop PDF Pages Online',
    intro:
      'Trim the visible area of your PDF’s pages. Upload a file, drag to set the crop area, and apply it to one, several, or all pages.',
    metaDescription:
      'Crop PDF pages online by dragging a crop area. Apply it to one page, a selection, or the whole document. Free, no sign-up required.',
    howItWorks: [
      UPLOAD_STEP,
      {
        title: 'Set the crop area',
        body: 'Drag to define the area you want to keep, using a live preview of the page.',
      },
      {
        title: 'Choose which pages',
        body: 'Apply the same crop area to one page, a selection, or every page.',
      },
      DOWNLOAD_STEP,
    ],
    features: [
      'Drag to set the crop area against a live page preview',
      'Apply to one page, a selection, or the whole document',
      'Reversible — crop a fresh copy without touching your original upload',
      'Works entirely in the browser — no account needed',
    ],
    faq: [
      {
        question: 'Can I use a different crop area on different pages?',
        answer:
          'The same crop area applies to every page you choose in one pass. For different areas on different pages, run the tool again on the result.',
      },
      {
        question: 'Does cropping remove content permanently?',
        answer: 'Cropping changes the visible page area in the new PDF; your originally uploaded file is left as-is.',
      },
    ],
    related: [
      { label: 'Watermark PDF', href: '/watermark-pdf' },
      { label: 'Split PDF', href: '/split-pdf' },
      { label: 'Compress PDF', href: '/compress-pdf' },
    ],
  },
  {
    slug: '/watermark-pdf',
    tool: 'watermark',
    navLabel: 'Watermark PDF',
    h1: 'Add a Watermark to a PDF Online',
    intro:
      'Stamp text across your PDF’s pages. Upload a file, set the text, position, size and opacity, and download the watermarked document.',
    metaDescription:
      'Add a text watermark to a PDF online. Choose position, size and opacity, and apply it to selected pages or the whole document. Free, no sign-up.',
    howItWorks: [
      UPLOAD_STEP,
      {
        title: 'Set the watermark',
        body: 'Type the text, then choose a position on a 3×3 grid, its size, and opacity.',
      },
      {
        title: 'Choose which pages',
        body: 'Apply it to every page or just the ones you select.',
      },
      DOWNLOAD_STEP,
    ],
    features: [
      'Position anywhere on a 3×3 grid — the centre position draws diagonally',
      'Adjustable opacity and font size',
      'Apply to every page or a chosen selection',
      'Works entirely in the browser — no account needed',
    ],
    faq: [
      {
        question: 'Can I watermark only some pages?',
        answer: 'Yes — choose specific pages, or apply the watermark to the whole document.',
      },
      {
        question: 'Can I use an image as a watermark instead of text?',
        answer:
          'Not currently — this tool stamps text only. Placing an image (like a signature) on a page is a separate tool.',
      },
    ],
    related: [
      { label: 'Crop PDF', href: '/crop-pdf' },
      { label: 'Redact PDF', href: '/redact-pdf' },
      { label: 'PDF Password Protector', href: '/pdf-password-protector' },
    ],
  },
  {
    slug: '/pdf-password-protector',
    tool: 'protect',
    navLabel: 'Password Protect PDF',
    h1: 'Password Protect a PDF Online',
    intro:
      'Encrypt a PDF with a password so it can’t be opened without it. Upload a file, set a password, and download the protected document.',
    metaDescription:
      'Add a password to a PDF online with AES-256 encryption. Upload a file, set a password, and download the protected document. Free, no sign-up.',
    howItWorks: [
      UPLOAD_STEP,
      {
        title: 'Set a password',
        body: 'Choose a password between 6 and 128 characters.',
      },
      {
        title: 'Encrypt',
        body: 'The document is encrypted with AES-256 so it can’t be opened without the password.',
      },
      DOWNLOAD_STEP,
    ],
    features: [
      'AES-256 encryption',
      'Password length checked (6–128 characters) before encrypting',
      'Original, unprotected file is left untouched',
      'Works entirely in the browser — no account needed',
    ],
    faq: [
      {
        question: 'Can a lost password be recovered?',
        answer:
          'No, by design — a password that could be recovered wouldn’t provide real protection. Keep your password somewhere safe.',
      },
      {
        question: 'Does this check how strong my password is?',
        answer: 'It checks length only, not complexity. Choosing a longer, less guessable password is up to you.',
      },
    ],
    related: [
      { label: 'Remove Password from PDF', href: '/remove-password' },
      { label: 'Redact PDF', href: '/redact-pdf' },
      { label: 'Watermark PDF', href: '/watermark-pdf' },
    ],
  },
  {
    slug: '/redact-pdf',
    tool: 'redact',
    navLabel: 'Redact PDF',
    h1: 'Redact PDF Pages Online',
    intro:
      'Permanently remove sensitive content from a PDF. Upload a file, mark the areas to redact, and download the redacted document.',
    metaDescription:
      'Redact sensitive content from a PDF online. Mark rectangular areas across any pages, then download a document with that content permanently removed.',
    howItWorks: [
      UPLOAD_STEP,
      {
        title: 'Mark areas to redact',
        body: 'Draw a box over each area you want removed, on any page — add as many as you need.',
      },
      {
        title: 'Redact',
        body: 'The marked areas are permanently removed from the document, not just visually covered.',
      },
      DOWNLOAD_STEP,
    ],
    features: [
      'Mark multiple redaction areas across different pages in one pass',
      'Content is permanently removed, not just hidden behind a black box',
      'Preview each page while choosing what to redact',
      'Works entirely in the browser — no account needed',
    ],
    faq: [
      {
        question: 'Is redacted content really removed, or just covered up?',
        answer:
          'Removed. A visual overlay that just covers text can still be copied out from behind it; this tool takes the marked content out of the page.',
      },
      {
        question: 'Can I redact areas on more than one page at once?',
        answer: 'Yes — add a redaction area to any page, and redact all of them together in one pass.',
      },
    ],
    related: [
      { label: 'PDF Password Protector', href: '/pdf-password-protector' },
      { label: 'Watermark PDF', href: '/watermark-pdf' },
      { label: 'PDF Text Extractor', href: '/pdf-text-extractor' },
    ],
  },
  {
    slug: '/pdf-ocr',
    tool: 'ocr',
    navLabel: 'PDF OCR',
    h1: 'OCR a Scanned PDF Online',
    intro:
      'Recognise text in a scanned PDF. Upload a file, choose a language, and get a searchable document with a text layer added.',
    metaDescription:
      'Run OCR on a scanned PDF online to recognise its text and add a searchable text layer. Supports English, French, German, Spanish, Italian and Portuguese.',
    howItWorks: [
      UPLOAD_STEP,
      {
        title: 'Choose a language and pages',
        body: 'Pick the document’s language and which pages to run OCR on.',
      },
      {
        title: 'Recognise text',
        body: 'Text is recognised on each page, with a confidence score, and (optionally) written back into a searchable PDF.',
      },
      DOWNLOAD_STEP,
    ],
    features: [
      'Supports English, French, German, Spanish, Italian and Portuguese',
      'Reports a confidence score, and flags low-quality results',
      'Optionally produces a searchable PDF with the recognised text layer added',
      'Works entirely in the browser — no account needed',
    ],
    faq: [
      {
        question: 'Which languages are supported?',
        answer: 'English, French, German, Spanish, Italian and Portuguese.',
      },
      {
        question: 'How accurate is the recognised text?',
        answer:
          'It depends on scan quality — a clean, high-resolution scan recognises far better than a low-quality or skewed one. A confidence score is shown, and low-quality results are flagged rather than presented as certain.',
      },
    ],
    related: [
      { label: 'PDF Text Extractor', href: '/pdf-text-extractor' },
      { label: 'Translate PDF', href: '/translate-pdf' },
      { label: 'Compress PDF', href: '/compress-pdf' },
    ],
  },
  {
    slug: '/pdf-text-extractor',
    tool: 'extract-text',
    navLabel: 'PDF Text Extractor',
    h1: 'Extract Text from a PDF Online',
    intro:
      'Read a PDF’s text layer in a scrollable viewer. Upload a file, then copy the text or download it as a .txt file.',
    metaDescription:
      'Extract text from a PDF online. View it in the browser, copy it, or download it as a plain-text file. Free, no sign-up required.',
    howItWorks: [
      UPLOAD_STEP,
      {
        title: 'View the text',
        body: 'The document’s text layer is read page by page into a scrollable viewer.',
      },
      {
        title: 'Copy or download',
        body: 'Copy the text to your clipboard, or download it as a .txt file.',
      },
    ],
    features: [
      'Scrollable, page-by-page text viewer',
      '"Copy text" and "Download TXT" in one click',
      'Scanned PDFs with no text layer are reported clearly, not shown as empty by accident',
      'Works entirely in the browser — no account needed',
    ],
    faq: [
      {
        question: 'What if my PDF is a scanned image with no text layer?',
        answer:
          'That’s reported clearly rather than shown as an empty result. Run OCR first to recognise the text before extracting it.',
      },
      {
        question: 'Does this preserve the original formatting?',
        answer: 'No — it reads the underlying text content, not the visual layout, fonts or columns.',
      },
    ],
    related: [
      { label: 'PDF OCR', href: '/pdf-ocr' },
      { label: 'PDF to Word', href: '/pdf-to-word' },
      { label: 'Translate PDF', href: '/translate-pdf' },
    ],
  },
  {
    slug: '/translate-pdf',
    tool: 'translate',
    navLabel: 'Translate PDF',
    h1: 'Translate a PDF Online',
    intro:
      'Translate a PDF’s text into another language. Upload a file, choose a target language, and get the translated text.',
    metaDescription:
      'Translate a PDF into another language online. Choose from 11 target languages including Spanish, French, German, Japanese and Chinese.',
    howItWorks: [
      UPLOAD_STEP,
      {
        title: 'Choose a target language',
        body: 'Pick which language to translate the document’s text into.',
      },
      {
        title: 'Translate',
        body: 'The extracted text is translated — for a scanned PDF with no text layer, OCR runs first automatically.',
      },
    ],
    features: [
      'Translate into 11 languages, including Spanish, French, German, Italian, Portuguese, Dutch, Polish, Russian, Japanese and Chinese',
      'Falls back to OCR automatically for a scanned document with no text layer',
      'Works entirely in the browser — no account needed',
    ],
    faq: [
      {
        question: 'Which languages can I translate into?',
        answer:
          'English, Spanish, French, German, Italian, Portuguese, Dutch, Polish, Russian, Japanese and Chinese.',
      },
      {
        question: 'Does it preserve the original page layout?',
        answer:
          'No — this translates the extracted text content, it doesn’t reproduce the original page design in another language.',
      },
    ],
    related: [
      { label: 'PDF OCR', href: '/pdf-ocr' },
      { label: 'PDF Text Extractor', href: '/pdf-text-extractor' },
      { label: 'PDF to Word', href: '/pdf-to-word' },
    ],
  },
];

export function getToolLandingContent(slug: string): ToolLandingContent {
  const match = TOOL_LANDING_PAGES.find((page) => page.slug === slug);
  if (!match) throw new Error(`No tool landing content for slug: ${slug}`);
  return match;
}
