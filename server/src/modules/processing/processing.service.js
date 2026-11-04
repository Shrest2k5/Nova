import { processingWorker } from './processing.worker.js';
import { processingRepository } from './processing.repository.js';
import { logger } from '../../config/logger.js';

export class ProcessingService {
  /**
   * Schedule a background file processing task.
   * Runs asynchronously without blocking the calling thread or HTTP response.
   */
  scheduleProcessing(fileId) {
    logger.info(`[ProcessingService] Queuing background processing for file: ${fileId}`);
    // Non-blocking invocation
    setImmediate(() => {
      processingWorker.processFile(fileId).catch((err) => {
        logger.error(`[ProcessingService] Unhandled error processing file ${fileId}:`, err);
      });
    });
  }

  cancelProcessing(fileId) {
    processingWorker.cancel(fileId);
  }

  async getStatus(fileId) {
    return processingRepository.getFileStatus(fileId);
  }

  async shutdown() {
    await processingWorker.shutdown();
  }
}

export const processingService = new ProcessingService();

