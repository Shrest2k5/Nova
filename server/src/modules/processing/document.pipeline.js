import fs from 'fs';
import { extractionService } from './extraction.service.js';
import { ocrExtractor } from './ocr.extractor.js';
import { processingRepository } from './processing.repository.js';
import { fileStorageService } from '../files/file.storage.js';
export class DocumentPipeline {
  async process(file, job) {
    if (!fileStorageService.fileExists(file.storedName)) throw new Error('Uploaded document is no longer available.');
    const filePath = fileStorageService.getFilePath(file.storedName);
    if (!(await fs.promises.stat(filePath)).size) throw new Error('The uploaded document is empty.');
    await job.updateProgress(10); await processingRepository.updateStageAndProgress(file.id, { status: 'PROCESSING', stage: 'VALIDATING', progress: 10 });
    await job.updateProgress(25); await processingRepository.updateStageAndProgress(file.id, { status: 'EXTRACTING', stage: 'EXTRACTING', progress: 25 });
    let result = await extractionService.extract(filePath, file.originalName);
    if (result.type === 'pdf' && result.isScanned) { await job.updateProgress(45); await processingRepository.updateStageAndProgress(file.id, { status: 'EXTRACTING', stage: 'OCR', progress: 45 }); result = { ...result, ...(await ocrExtractor.extractPdf(filePath, result.pageCount || 1)) }; }
    if (!result.text?.length) throw new Error('No readable text could be extracted from this document.');
    await job.updateProgress(90); await processingRepository.saveExtractedText(file.id, result.text, result.pageCount || result.sheetCount || 1); await job.updateProgress(100);
    return { fileId: file.id, characterCount: result.text.length };
  }
}
export const documentPipeline = new DocumentPipeline();
