import fs from 'fs';
import { logger } from '../../config/logger.js';

// Supported encodings to try in order when reading a text file
const ENCODING_CANDIDATES = ['utf8', 'latin1'];

export class TextExtractor {
  /**
   * Extract plain text content from a .txt file.
   * Attempts UTF-8 first; falls back to latin1 if the file is not valid UTF-8.
   *
   * @param {string} filePath - Absolute path to the .txt file on disk.
   * @returns {Promise<{ text: string, characterCount: number, encoding: string }>}
   */
  async extractText(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error('Text file not found on disk storage.');
    }

    const stats = await fs.promises.stat(filePath);
    if (stats.size === 0) {
      throw new Error('Text file is empty (0 bytes).');
    }

    let text = null;
    let usedEncoding = null;

    for (const encoding of ENCODING_CANDIDATES) {
      try {
        const raw = await fs.promises.readFile(filePath, encoding);
        text = this.cleanText(raw);
        usedEncoding = encoding;
        break;
      } catch {
        // Try next encoding
      }
    }

    if (text === null) {
      // Last resort: read as buffer and convert
      const buf = await fs.promises.readFile(filePath);
      text = this.cleanText(buf.toString('utf8', 0, buf.length));
      usedEncoding = 'buffer-utf8';
    }

    logger.info(
      `[TextExtractor] Read ${text.length} characters (encoding: ${usedEncoding}) from ${filePath}`
    );

    return {
      text,
      characterCount: text.length,
      encoding: usedEncoding,
    };
  }

  /**
   * Normalize line endings and strip control characters from raw text.
   */
  cleanText(raw) {
    if (!raw) return '';
    return raw
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // strip non-printable
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{4,}/g, '\n\n\n') // collapse excessive blank lines (allow up to 2 blanks)
      .trim();
  }
}

export const textExtractor = new TextExtractor();

