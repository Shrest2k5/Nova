import { processingRepository } from './processing.repository.js';
import { documentPipeline } from './document.pipeline.js';
import { logger } from '../../config/logger.js';

export class ProcessingWorker {
  constructor() {
    this.activeJobs = new Map(); // fileId -> { abortController }
    this.isShuttingDown = false;
  }

  isProcessing(fileId) {
    return this.activeJobs.has(fileId);
  }

  cancel(fileId) {
    const job = this.activeJobs.get(fileId);
    if (job) {
      job.abortController.abort();
      this.activeJobs.delete(fileId);
      logger.info(`Cancelled background processing job for file: ${fileId}`);
    }
  }

  async processFile(fileId) {
    if (this.isShuttingDown) {
      logger.warn(`Server is shutting down. Refusing new processing job: ${fileId}`);
      return;
    }

    if (this.activeJobs.has(fileId)) {
      logger.warn(`File ${fileId} is already being processed. Skipping duplicate trigger.`);
      return;
    }

    const abortController = new AbortController();
    this.activeJobs.set(fileId, { abortController });

    try {
      logger.info(`[ProcessingWorker] Starting background workflow for file: ${fileId}`);

      // 1. Fetch file record
      const file = await processingRepository.findFileById(fileId);
      if (!file) {
        logger.error(`[ProcessingWorker] File ${fileId} not found in database.`);
        return;
      }

      // Execute genuine 4-stage document processing pipeline
      await documentPipeline.process(file, abortController.signal);

      logger.info(`[ProcessingWorker] File ${fileId} processing successfully finished.`);
    } catch (error) {
      if (abortController.signal.aborted) {
        logger.info(`[ProcessingWorker] Processing for file ${fileId} was aborted.`);
        return;
      }

      logger.error(`[ProcessingWorker] Processing failed for file ${fileId}: ${error.message}`);
      try {
        await processingRepository.updateStageAndProgress(fileId, {
          status: 'FAILED',
          errorMessage: error.message || 'Processing failed due to an unexpected worker error',
        });
      } catch (dbError) {
        logger.error(`[ProcessingWorker] Failed to update file status to FAILED in DB: ${dbError.message}`);
      }
    } finally {
      this.activeJobs.delete(fileId);
    }
  }

  async shutdown() {
    logger.info(`[ProcessingWorker] Initiating graceful shutdown. Active jobs: ${this.activeJobs.size}`);
    this.isShuttingDown = true;
    for (const [fileId, job] of this.activeJobs.entries()) {
      job.abortController.abort();
      logger.info(`[ProcessingWorker] Aborted job for file ${fileId} during shutdown`);
    }
    this.activeJobs.clear();
  }
}

export const processingWorker = new ProcessingWorker();
