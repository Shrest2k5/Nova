import fs from 'fs';
import os from 'os';
import path from 'path';
import { createWorker } from 'tesseract.js';
import { createCanvas } from '@napi-rs/canvas';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { logger } from '../../config/logger.js';

export class OcrExtractor {
  async extractImage(filePath) {
    const worker = await createWorker('eng');
    try {
      const result = await worker.recognize(filePath);
      const text = result.data.text?.trim() || '';
      if (!text) throw new Error('OCR completed but no readable text was found in the image.');
      return { text, pageCount: 1, isScanned: true, characterCount: text.length, wordCount: text.split(/\s+/).length };
    } finally {
      await worker.terminate().catch(() => {});
    }
  }
  async extractPdf(filePath, pageCount = 1) {
    const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'novastat-ocr-'));
    const worker = await createWorker('eng');
    const pdf = await pdfjsLib.getDocument({ data: await fs.promises.readFile(filePath), useSystemFonts: true }).promise;
    const pages = [];
    try {
      for (let page = 1; page <= pageCount; page += 1) {
        const pdfPage = await pdf.getPage(page);
        const viewport = pdfPage.getViewport({ scale: 1.5 });
        const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
        await pdfPage.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        const image = path.join(dir, `page-${page}.png`);
        await fs.promises.writeFile(image, await canvas.encode('png'));
        const result = await worker.recognize(image);
        const text = result.data.text?.trim() || '';
        if (text) pages.push(`--- Page ${page} ---\n${text}`);
      }
      const text = pages.join('\n\n').trim();
      if (!text) throw new Error('OCR completed but no readable text was found in the scanned PDF.');
      return { text, pageCount, isScanned: true, characterCount: text.length, wordCount: text.split(/\s+/).length };
    } catch (error) {
      logger.error(`[OcrExtractor] OCR failed: ${error.message}`);
      throw new Error('Scanned PDF OCR could not be completed. Ensure the PDF renderer and OCR language data are installed.');
    } finally {
      await worker.terminate().catch(() => {});
      await pdf?.cleanup().catch(() => {});
      await fs.promises.rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

export const ocrExtractor = new OcrExtractor();
