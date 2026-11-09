import fs from 'fs';
import mammoth from 'mammoth';
import { logger } from '../../config/logger.js';

export class DocxExtractor {
  /**
   * Extract plain text from a DOCX file using mammoth.
   *
   * @param {string} filePath - Absolute path to the .docx file on disk.
   * @returns {Promise<{ text: string, wordCount: number, characterCount: number }>}
   */
  async extractText(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error('DOCX file not found on disk storage.');
    }

    const stats = await fs.promises.stat(filePath);
    if (stats.size === 0) {
      throw new Error('DOCX file is empty (0 bytes).');
    }

    try {
      const fileBuffer = await fs.promises.readFile(filePath);

      // Extract raw text — mammoth converts all paragraphs, tables, and lists to plain text
      const result = await mammoth.extractRawText({ buffer: fileBuffer });

      if (result.messages && result.messages.length > 0) {
        const warnings = result.messages.filter((m) => m.type === 'warning');
        if (warnings.length > 0) {
          logger.warn(
            `[DocxExtractor] ${warnings.length} warning(s) during DOCX extraction for ${filePath}: ${warnings.map((m) => m.message).join('; ')}`
          );
        }
      }

      const text = this.cleanText(result.value || '');

      if (!text || text.trim().length === 0) {
        throw new Error('No readable text could be extracted from this DOCX document.');
      }

      const words = text.split(/\s+/).filter(Boolean);

      logger.info(
        `[DocxExtractor] Extracted ${text.length} characters / ${words.length} words from ${filePath}`
      );

      return {
        text,
        wordCount: words.length,
        characterCount: text.length,
      };
    } catch (err) {
      if (err.message.includes('No readable text') || err.message.includes('empty')) {
        throw err;
      }
      logger.error(`[DocxExtractor] Extraction failed for ${filePath}: ${err.message}`);
      throw new Error(`Failed to extract text from DOCX: ${err.message}`);
    }
  }

  /**
   * Normalize whitespace and remove control characters from raw extracted text.
   */
  cleanText(raw) {
    if (!raw) return '';
    return raw
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // strip control chars
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n') // collapse excess blank lines
      .trim();
  }
}

export const docxExtractor = new DocxExtractor();

