import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pdfValidator } from '../src/modules/processing/pdf.validator.js';
import { pdfExtractor } from '../src/modules/processing/pdf.extractor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testPdfDir = path.resolve(__dirname, 'fixtures/pdf');

function buildPdf(contentPages) {
  let objects = [];
  let offsets = [];
  let count = contentPages.length;

  let body = '%PDF-1.4\n';

  // Obj 1: Catalog
  offsets.push(body.length);
  body += '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';

  // Kids references: 3 0 R, 6 0 R, etc.
  let kids = [];
  let curObj = 3;
  for (let i = 0; i < count; i++) {
    kids.push(`${curObj} 0 R`);
    curObj += 3;
  }

  // Obj 2: Pages
  offsets.push(body.length);
  body += `2 0 obj\n<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${count} >>\nendobj\n`;

  curObj = 3;
  for (let i = 0; i < count; i++) {
    const text = contentPages[i];
    const streamContent = text
      ? `BT\n/F1 12 Tf\n72 712 Td\n(${text.replace(/[()]/g, '')}) Tj\nET`
      : '';
    const streamLen = Buffer.byteLength(streamContent);

    // Page Obj
    offsets.push(body.length);
    body += `${curObj} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${curObj + 1} 0 R >> >> /Contents ${curObj + 2} 0 R >>\nendobj\n`;

    // Font Obj
    offsets.push(body.length);
    body += `${curObj + 1} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`;

    // Stream Obj
    offsets.push(body.length);
    body += `${curObj + 2} 0 obj\n<< /Length ${streamLen} >>\nstream\n${streamContent}\nendstream\nendobj\n`;

    curObj += 3;
  }

  const xrefOffset = body.length;
  body += `xref\n0 ${curObj}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    body += `${String(off).padStart(10, '0')} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${curObj} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(body);
}

describe('PDF Validation and Text Extraction', () => {
  const validPdfPath = path.join(testPdfDir, 'valid.pdf');
  const multiPagePdfPath = path.join(testPdfDir, 'multipage.pdf');
  const emptyPdfPath = path.join(testPdfDir, 'empty.pdf');
  const corruptPdfPath = path.join(testPdfDir, 'corrupt.pdf');
  const scannedPdfPath = path.join(testPdfDir, 'scanned.pdf');
  const largePdfPath = path.join(testPdfDir, 'large.pdf');

  beforeAll(() => {
    fs.mkdirSync(testPdfDir, { recursive: true });

    // 1. Valid single page PDF with realistic text
    const validContent = [
      'Novastat Artificial Intelligence and Enterprise Document Platform Report. This document contains comprehensive analysis of modern full-stack workflows.',
    ];
    fs.writeFileSync(validPdfPath, buildPdf(validContent));

    // 2. Multi-page PDF
    const multiContent = [
      'Page one executive summary discussing scalable cloud storage and distributed processing.',
      'Page two detailed architectural overview covering PostgreSQL, Prisma ORM, and Express.',
      'Page three final considerations, metrics, system performance benchmarks, and conclusions.',
    ];
    fs.writeFileSync(multiPagePdfPath, buildPdf(multiContent));

    // 3. Completely empty file (0 bytes)
    fs.writeFileSync(emptyPdfPath, Buffer.alloc(0));

    // 4. Corrupted file with PDF header but invalid xref/body
    fs.writeFileSync(corruptPdfPath, Buffer.from('%PDF-1.4\nCorrupted binary junk data with no xref or trailer'));

    // 5. Scanned PDF with no selectable text
    fs.writeFileSync(scannedPdfPath, buildPdf(['']));

    // 6. Large PDF with substantial text content
    const largePages = [];
    for (let p = 1; p <= 5; p++) {
      largePages.push(
        `Section ${p}: Detailed research methodology analyzing machine learning transformer pipelines and retrieval augmented generation. `.repeat(15)
      );
    }
    fs.writeFileSync(largePdfPath, buildPdf(largePages));
  });

  afterAll(() => {
    fs.rmSync(testPdfDir, { recursive: true, force: true });
  });

  it('1. should validate and extract text from a valid text-based PDF', async () => {
    const validation = await pdfValidator.validate(validPdfPath);
    expect(validation.isValid).toBe(true);
    expect(validation.pageCount).toBe(1);

    const extraction = await pdfExtractor.extractText(validPdfPath);
    expect(extraction.isScanned).toBe(false);
    expect(extraction.pageCount).toBe(1);
    expect(extraction.text).toContain('Novastat Artificial Intelligence');
    expect(extraction.characterCount).toBeGreaterThan(30);
  });

  it('2. should validate and extract text from a multi-page PDF with page boundaries', async () => {
    const validation = await pdfValidator.validate(multiPagePdfPath);
    expect(validation.isValid).toBe(true);
    expect(validation.pageCount).toBe(3);

    const extraction = await pdfExtractor.extractText(multiPagePdfPath);
    expect(extraction.isScanned).toBe(false);
    expect(extraction.pageCount).toBe(3);
    expect(extraction.pages.length).toBe(3);
    expect(extraction.text).toContain('--- Page 1 ---');
    expect(extraction.text).toContain('--- Page 2 ---');
    expect(extraction.text).toContain('--- Page 3 ---');
    expect(extraction.text).toContain('Page one executive summary');
    expect(extraction.text).toContain('Page three final considerations');
  });

  it('3. should reject an empty 0-byte file during validation', async () => {
    const validation = await pdfValidator.validate(emptyPdfPath);
    expect(validation.isValid).toBe(false);
    expect(validation.error).toContain('empty');
  });

  it('4. should detect corrupted PDF structure and provide an informative error', async () => {
    const validation = await pdfValidator.validate(corruptPdfPath);
    expect(validation.isValid).toBe(false);
    expect(validation.error).toMatch(/corrupt|parse|format/i);
  });

  it('5. should detect a scanned PDF without selectable text and report OCR requirement', async () => {
    const validation = await pdfValidator.validate(scannedPdfPath);
    expect(validation.isValid).toBe(true);

    const extraction = await pdfExtractor.extractText(scannedPdfPath);
    expect(extraction.isScanned).toBe(true);
    expect(extraction.error).toContain('OCR');
    expect(extraction.text).toBe('');
  });

  it('6. should extract and measure character count from a large PDF', async () => {
    const validation = await pdfValidator.validate(largePdfPath);
    expect(validation.isValid).toBe(true);
    expect(validation.pageCount).toBe(5);

    const extraction = await pdfExtractor.extractText(largePdfPath);
    expect(extraction.pageCount).toBe(5);
    expect(extraction.characterCount).toBeGreaterThan(400);
    expect(extraction.wordCount).toBeGreaterThan(50);
  });
});
