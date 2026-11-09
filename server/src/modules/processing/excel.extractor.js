import fs from 'fs';
import ExcelJS from 'exceljs';
import XLSX from 'xlsx';
import { logger } from '../../config/logger.js';

export class ExcelExtractor {
  /**
   * Extract text content from XLSX files using ExcelJS.
   *
   * @param {string} filePath - Absolute path to the .xlsx or .xls file on disk.
   * @returns {Promise<{ text: string, sheetCount: number, structuredData: object }>}
   */
  async extractText(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error('Excel file not found on disk storage.');
    }

    const stats = await fs.promises.stat(filePath);
    if (stats.size === 0) {
      throw new Error('Excel file is empty (0 bytes).');
    }

    try {
      const fileBuffer = await fs.promises.readFile(filePath);
      if (filePath.toLowerCase().endsWith('.xls')) {
        const legacy = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true });
        const textParts = legacy.SheetNames.map((name) => this.sheetToText(name, XLSX.utils.sheet_to_json(legacy.Sheets[name], { header: 1, defval: '', blankrows: false })));
        const text = textParts.join('\n\n').trim();
        if (!text) throw new Error('No readable content could be extracted from this Excel document.');
        return { text, sheetCount: legacy.SheetNames.length };
      }
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer);

      if (!workbook.worksheets || workbook.worksheets.length === 0) {
        throw new Error('Excel workbook contains no sheets.');
      }

      const sheetCount = workbook.worksheets.length;
      const textParts = [];

      for (const sheet of workbook.worksheets) {
        const sheetName = sheet.name;
        const rows = [];
        sheet.eachRow({ includeEmpty: false }, (row) => rows.push(row.values.slice(1)));

        // Build human-readable text representation for this sheet
        const sheetText = this.sheetToText(sheetName, rows);
        if (sheetText.trim().length > 0) {
          textParts.push(sheetText);
        }
      }

      const text = textParts.join('\n\n').trim();

      if (!text || text.length === 0) {
        throw new Error('No readable content could be extracted from this Excel document.');
      }

      logger.info(
        `[ExcelExtractor] Extracted ${text.length} characters from ${sheetCount} sheet(s) in ${filePath}`
      );

      return {
        text,
        sheetCount,
      };
    } catch (err) {
      if (err.message.includes('No readable') || err.message.includes('empty') || err.message.includes('no sheets')) {
        throw err;
      }
      logger.error(`[ExcelExtractor] Extraction failed for ${filePath}: ${err.message}`);
      throw new Error(`Failed to extract content from Excel file: ${err.message}`);
    }
  }

  /**
   * Convert a sheet's row data to a formatted text representation.
   *
   * @param {string} sheetName
   * @param {Array<Array<any>>} rows - Array of row arrays
   * @returns {string}
   */
  sheetToText(sheetName, rows) {
    if (!rows || rows.length === 0) return '';

    const lines = [`=== Sheet: ${sheetName} ===`];

    // First row is treated as header if it contains any non-empty cells
    const headerRow = rows[0];
    const hasHeaders =
      Array.isArray(headerRow) && headerRow.some((cell) => cell !== null && cell !== undefined && cell !== '');

    if (hasHeaders) {
      lines.push(`Headers: ${headerRow.map((h) => String(h)).join(' | ')}`);
    }

    const dataRows = rows.slice(hasHeaders ? 1 : 0);
    for (const row of dataRows) {
      if (!Array.isArray(row)) continue;
      const rowText = row
        .map((cell) => {
          if (cell === null || cell === undefined || cell === '') return '';
          if (cell instanceof Date) return cell.toISOString().split('T')[0]; // date only
          return String(cell);
        })
        .filter((v) => v !== '')
        .join(' | ');
      if (rowText.trim().length > 0) {
        lines.push(rowText);
      }
    }

    return lines.join('\n');
  }
}

export const excelExtractor = new ExcelExtractor();

