
import { Worker } from 'bullmq';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { redisConnection } from './redis.js';
import { documentPipeline } from './document.pipeline.js';
import { processingRepository } from './processing.repository.js';

await redisConnection.connect().catch(() => {});

const worker = new Worker(
  'fileProcessing',
  async (job) => {
    const file = await processingRepository.findFileById(
      job.data.fileId
    );

    if (!file) {
      throw new Error('File record not found.');
    }

    // Skip already completed files
    if (file.status === 'COMPLETED' && file.extractedText) {
      return { skipped: true };
    }

    // TEMPORARY: Concurrency testing delay (15 seconds)
    logger.info(`[ConcurrencyTest] Started job=${job.id}`);

    await new Promise((resolve) => setTimeout(resolve, 15000));

    logger.info(`[ConcurrencyTest] Delay finished job=${job.id}`);

    // Actual document processing
    return documentPipeline.process(file, job);
  },
  {
    connection: redisConnection,
    concurrency: env.WORKER_CONCURRENCY,
    lockDuration: 600000,
  }
);

// Handle failed jobs
worker.on('failed', async (job, error) => {
  if (!job) return;

  logger.error(
    `[FileWorker] job=${job.id} attempt=${job.attemptsMade} failed: ${error.message}`
  );

  if (job.attemptsMade >= 3) {
    await processingRepository.updateStageAndProgress(
      job.data.fileId,
      {
        status: 'FAILED',
        errorMessage: error.message,
        progress: 0,
      }
    );
  }
});

// Handle completed jobs
worker.on('completed', (job) => {
  logger.info(`[FileWorker] completed job=${job.id}`);
});

// Graceful shutdown
const shutdown = async (signal) => {
  logger.info(`[FileWorker] ${signal}: shutting down`);

  await worker.close();
  await prisma.$disconnect();
  await redisConnection.quit();

  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

logger.info(
  `File processing worker started with concurrency=${env.WORKER_CONCURRENCY}`
);
