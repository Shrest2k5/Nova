import path from 'path';
import { pdfExtractor } from './pdf.extractor.js';
import { docxExtractor } from './docx.extractor.js';
import { excelExtractor } from './excel.extractor.js';
import { textExtractor } from './text.extractor.js';
import { ocrExtractor } from './ocr.extractor.js';

const extOf = (name) => path.extname(name).toLowerCase();

export class ExtractionService {
  async extract(filePath, originalName) {
    const extension = extOf(originalName);
    if (extension === '.pdf') return { type: 'pdf', ...(await pdfExtractor.extractText(filePath)) };
    if (extension === '.docx') return { type: 'docx', ...(await docxExtractor.extractText(filePath)) };
    if (extension === '.txt') return { type: 'txt', ...(await textExtractor.extractText(filePath)) };
    if (extension === '.xlsx' || extension === '.xls') return { type: 'excel', ...(await excelExtractor.extractText(filePath)) };
    if (['.png', '.jpg', '.jpeg'].includes(extension)) return { type: 'image', ...(await ocrExtractor.extractImage(filePath)) };
    throw new Error('Unsupported document format.');
  }
}

export const extractionService = new ExtractionService();
