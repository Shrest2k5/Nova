import fs from 'fs';
import { PDFParse } from 'pdf-parse';
import { logger } from '../../config/logger.js';
import { env } from '../../config/env.js';

export class PdfValidator {
  /**
   * Validate a PDF file on disk.
   * Checks file existence, size, magic numbers (%PDF-), password protection, and structural integrity.
   * Returns metadata { isValid, pageCount, info, error }
   */
  async validate(filePath, options = {}) {
    // 1. Verify file existence
    if (!fs.existsSync(filePath)) {
      return {
        isValid: false,
        error: 'File does not exist on disk storage.',
      };
    }

    // 2. Check file size
    const stats = await fs.promises.stat(filePath);
    if (stats.size === 0) {
      return {
        isValid: false,
        error: 'The uploaded PDF file is completely empty (0 bytes).',
      };
    }

    if (stats.size > env.MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `File size (${Math.round(stats.size / (1024 * 1024))}MB) exceeds maximum allowed limit of ${Math.round(env.MAX_FILE_SIZE / (1024 * 1024))}MB.`,
      };
    }

    // 3. Verify magic bytes (%PDF) in header
    const buffer = Buffer.alloc(1024);
    const fd = await fs.promises.open(filePath, 'r');
    try {
      await fd.read(buffer, 0, 1024, 0);
    } finally {
      await fd.close();
    }

    const header = buffer.toString('latin1', 0, 16);
    if (!header.startsWith('%PDF-')) {
      return {
        isValid: false,
        error: 'Invalid file format: file header does not contain standard PDF signature (%PDF-).',
      };
    }

    // 4. Validate readability and check for encryption/password or corruption
    try {
      const fileBuffer = await fs.promises.readFile(filePath);
      const parser = new PDFParse({ data: fileBuffer });
      const info = await parser.getInfo();
      const pageCount = info.total || 0;

      if (pageCount === 0) {
        return {
          isValid: false,
          error: 'PDF structure is valid but contains 0 pages.',
        };
      }

      return {
        isValid: true,
        pageCount,
        title: info.info?.Title || null,
        author: info.info?.Author || null,
        creator: info.info?.Creator || null,
        producer: info.info?.Producer || null,
      };
    } catch (err) {
      logger.warn(`PDF structural inspection failed for ${filePath}: ${err.message}`);

      const errLower = err.message.toLowerCase();
      if (errLower.includes('password') || errLower.includes('encrypted') || err.name === 'PasswordException') {
        return {
          isValid: false,
          error: 'The PDF is password-protected or encrypted. Please remove password encryption before uploading.',
        };
      }

      if (errLower.includes('format') || errLower.includes('corrupt') || errLower.includes('invalid') || err.name === 'InvalidPDFException') {
        return {
          isValid: false,
          error: `Corrupted or unreadable PDF structure: ${err.message}`,
        };
      }

      return {
        isValid: false,
        error: `Failed to parse PDF document structure: ${err.message}`,
      };
    }
  }
}

export const pdfValidator = new PdfValidator();

