
-- Replace legacy AI fields and statuses with extraction-only processing.

-- 1. Update FileStatus enum.
ALTER TYPE "FileStatus" RENAME TO "FileStatus_old";

CREATE TYPE "FileStatus" AS ENUM (
  'QUEUED',
  'PROCESSING',
  'EXTRACTING',
  'COMPLETED',
  'FAILED'
);

ALTER TABLE "files"
  ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "files"
  ALTER COLUMN "status" TYPE "FileStatus"
  USING (
    CASE
      WHEN "status"::text = 'PENDING' THEN 'QUEUED'
      ELSE "status"::text
    END
  )::"FileStatus";

ALTER TABLE "files"
  ALTER COLUMN "status" SET DEFAULT 'QUEUED';

DROP TYPE "FileStatus_old";


-- 2. Remove legacy AI-related columns before dropping AiStatus.
ALTER TABLE "files"
  DROP COLUMN IF EXISTS "summary",
  DROP COLUMN IF EXISTS "structuredAnalysis",
  DROP COLUMN IF EXISTS "aiStatus",
  DROP COLUMN IF EXISTS "aiErrorMessage",
  DROP COLUMN IF EXISTS "aiProvider";

DROP TYPE IF EXISTS "AiStatus";


-- 3. Update ProcessingStage enum.
ALTER TYPE "ProcessingStage" RENAME TO "ProcessingStage_old";

CREATE TYPE "ProcessingStage" AS ENUM (
  'VALIDATING',
  'EXTRACTING',
  'OCR',
  'COMPLETED'
);

ALTER TABLE "files"
  ALTER COLUMN "processingStage" TYPE "ProcessingStage"
  USING (
    CASE
      WHEN "processingStage"::text IN ('VALIDATION', 'VALIDATING')
        THEN 'VALIDATING'
      WHEN "processingStage"::text IN ('ANALYSIS', 'AI_ANALYSIS', 'SUMMARIZATION')
        THEN 'EXTRACTING'
      ELSE "processingStage"::text
    END
  )::"ProcessingStage";

DROP TYPE "ProcessingStage_old";
