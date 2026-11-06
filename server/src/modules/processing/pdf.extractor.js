import fs from 'fs';
import { PDFParse } from 'pdf-parse';
import { logger } from '../../config/logger.js';

export class PdfExtractor {
  /**
   * Extract selectable text and metadata from a PDF file.
   * Preserves per-page boundaries and detects empty/scanned documents without selectable text.
   *
   * @param {string} filePath - Absolute path to physical PDF file.
   * @returns {Promise<{
   *   text: string,
   *   pageCount: number,
   *   pages: Array<{ pageNumber: number, text: string }>,
   *   isScanned: boolean,
   *   characterCount: number,
   *   wordCount: number
   * }>}
   */
  async extractText(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error('Physical PDF file not found on disk storage.');
    }

    const fileBuffer = await fs.promises.readFile(filePath);
    const parser = new PDFParse({ data: fileBuffer });

    try {
      const textResult = await parser.getText();
      const pageCount = textResult.total || 0;

      const pages = [];
      let fullFormattedText = '';
      let totalMeaningfulChars = 0;

      if (Array.isArray(textResult.pages) && textResult.pages.length > 0) {
        for (const p of textResult.pages) {
          const rawText = p.text || '';
          const cleanedText = this.cleanText(rawText);
          const pageNum = p.num || pages.length + 1;

          pages.push({
            pageNumber: pageNum,
            text: cleanedText,
          });

          totalMeaningfulChars += cleanedText.replace(/\s+/g, '').length;

          // Add clear page boundary header
          if (cleanedText.trim().length > 0) {
            fullFormattedText += `--- Page ${pageNum} ---\n${cleanedText.trim()}\n\n`;
          }
        }
      } else if (textResult.text) {
        const cleaned = this.cleanText(textResult.text);
        fullFormattedText = cleaned;
        totalMeaningfulChars = cleaned.replace(/\s+/g, '').length;
      }

      fullFormattedText = fullFormattedText.trim();
      const words = fullFormattedText.split(/\s+/).filter(Boolean);

      // Scanned document detection:
      // If a document has pages but total extracted meaningful alphanumeric characters is less than 30,
      // it is an image-only / scanned PDF that lacks selectable text.
      const isScannedOrEmpty = totalMeaningfulChars < 30;

      if (isScannedOrEmpty) {
        logger.info(
          `[PdfExtractor] PDF at ${filePath} has ${pageCount} pages but only ${totalMeaningfulChars} characters. Detected as scanned / no selectable text.`
        );
        return {
          text: '',
          pageCount,
          pages,
          isScanned: true,
          characterCount: totalMeaningfulChars,
          wordCount: 0,
          error:
            'This PDF appears to be a scanned document or image without selectable text. OCR (Optical Character Recognition) is required to process scanned documents.',
        };
      }

      return {
        text: fullFormattedText,
        pageCount,
        pages,
        isScanned: false,
        characterCount: totalMeaningfulChars,
        wordCount: words.length,
      };
    } catch (err) {
      logger.error(`[PdfExtractor] Extraction failed for ${filePath}: ${err.message}`);
      throw new Error(`Failed to extract text from PDF: ${err.message}`);
    }
  }

  /**
   * Cleans text without removing meaningful punctuation, numbers, or formatting.
   */
  cleanText(raw) {
    if (!raw) return '';
    return (
      raw
        // Remove null bytes and non-printable control characters except newline and tab
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        // Normalize CRLF to LF
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        // Collapse 3+ consecutive newlines into 2
        .replace(/\n{3,}/g, '\n\n')
    );
  }
}

export const pdfExtractor = new PdfExtractor();

