import { Queue } from 'bullmq';
import { redisConnection } from './redis.js';
import { logger } from '../../config/logger.js';
export const fileProcessingQueue = new Queue('fileProcessing', { connection: redisConnection, defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 1000 }, removeOnComplete: { age: 86400, count: 1000 }, removeOnFail: { age: 604800, count: 1000 } } });
export class ProcessingService { async scheduleProcessing(fileId) { const existing = await fileProcessingQueue.getJob(`file-${fileId}`); if (existing) return existing; const job = await fileProcessingQueue.add('extract-document', { fileId }, { jobId: `file-${fileId}` }); logger.info(`[ProcessingService] queued file=${fileId}`); return job; } async cancelProcessing(fileId) { const job = await fileProcessingQueue.getJob(`file-${fileId}`); if (job) await job.remove(); } async shutdown() { await fileProcessingQueue.close(); } }
export const processingService = new ProcessingService();
