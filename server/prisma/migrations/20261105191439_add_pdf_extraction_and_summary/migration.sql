-- CreateEnum
CREATE TYPE "ProcessingStage" AS ENUM ('VALIDATION', 'EXTRACTION', 'ANALYSIS', 'SUMMARIZATION', 'COMPLETED');

-- AlterTable
ALTER TABLE "files" ADD COLUMN     "extractedText" TEXT,
ADD COLUMN     "pageCount" INTEGER,
ADD COLUMN     "processingStage" "ProcessingStage",
ADD COLUMN     "summary" JSONB;
