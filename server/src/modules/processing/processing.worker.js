import { processingRepository } from './processing.repository.js';
import { fileStorageService } from '../files/file.storage.js';
import { logger } from '../../config/logger.js';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class ProcessingWorker {
  constructor() {
    this.activeJobs = new Map(); // fileId -> { abortController, timeoutId }
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

      // Check physical file existence
      if (!fileStorageService.fileExists(file.storedName)) {
        throw new Error('Physical file missing from storage volume');
      }

      // 2. Mark as PROCESSING (0%)
      await processingRepository.updateStatusAndProgress(fileId, 'PROCESSING', 5);
      logger.info(`[ProcessingWorker] File ${fileId} status updated to PROCESSING (5%)`);

      // Stages designed for a realistic ~25s processing pipeline:
      // Stage 1: Virus & integrity scan (5s) -> 25%
      // Stage 2: MIME analysis & metadata extraction (5s) -> 50%
      // Stage 3: Deep content indexing & parsing (5s) -> 75%
      // Stage 4: Format optimization & summary generation (5s) -> 90%
      // Stage 5: Finalization & persistent index commit (4s) -> 100% (COMPLETED)
      const stages = [
        { name: 'Integrity scan & virus check', duration: 4800, progress: 25 },
        { name: 'Metadata & content extraction', duration: 5200, progress: 50 },
        { name: 'Text indexing & semantic analysis', duration: 5000, progress: 75 },
        { name: 'Thumbnail & preview generation', duration: 4800, progress: 90 },
        { name: 'Final index persistence', duration: 4200, progress: 100 },
      ];

      for (const stage of stages) {
        if (abortController.signal.aborted || this.isShuttingDown) {
          logger.info(`[ProcessingWorker] File ${fileId} processing aborted at stage ${stage.name}`);
          return;
        }

        await delay(stage.duration);

        if (abortController.signal.aborted || this.isShuttingDown) {
          return;
        }

        // Verify file was not deleted while we were waiting
        const currentCheck = await processingRepository.findFileById(fileId);
        if (!currentCheck) {
          logger.info(`[ProcessingWorker] File ${fileId} was deleted during processing. Halting worker.`);
          return;
        }

        // Feature / Test hook: If filename contains "fail" or "corrupt", simulate realistic processing failure
        if (file.originalName.toLowerCase().includes('fail') || file.originalName.toLowerCase().includes('corrupt')) {
          if (stage.progress >= 50) {
            throw new Error(`Data corruption detected during ${stage.name}. File parsing failed.`);
          }
        }

        const isLastStage = stage.progress === 100;
        await processingRepository.updateStatusAndProgress(
          fileId,
          isLastStage ? 'COMPLETED' : 'PROCESSING',
          stage.progress,
          null,
          isLastStage ? new Date() : null
        );

        logger.info(
          `[ProcessingWorker] File ${fileId} progress: ${stage.progress}% - ${stage.name}`
        );
      }

      logger.info(`[ProcessingWorker] File ${fileId} processing successfully COMPLETED (100%)`);
    } catch (error) {
      logger.error(`[ProcessingWorker] Processing failed for file ${fileId}: ${error.message}`);
      try {
        await processingRepository.updateStatusAndProgress(
          fileId,
          'FAILED',
          0,
          error.message || 'Processing failed due to an unexpected worker error'
        );
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

