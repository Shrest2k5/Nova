import { GoogleGenAI } from '@google/genai';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

export class GeminiService {
  constructor(apiKey = env.GEMINI_API_KEY, model = env.GEMINI_MODEL) {
    this.apiKey = apiKey;
    this.modelName = model || 'gemini-3.2-flash';
    this.client = null;

    if (this.apiKey && this.apiKey.trim().length > 0) {
      try {
        this.client = new GoogleGenAI({ apiKey: this.apiKey.trim() });
      } catch (err) {
        logger.error(`Failed to initialize GoogleGenAI client: ${err.message}`);
      }
    }
  }

  isConfigured() {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  /**
   * Divide large text into manageable chunks with overlap to stay well within token limits.
   */
  chunkText(text, maxChunkChars = 18000, overlap = 1000) {
    if (!text || text.length <= maxChunkChars) {
      return [text];
    }

    const chunks = [];
    let startIndex = 0;

    while (startIndex < text.length) {
      let endIndex = startIndex + maxChunkChars;

      if (endIndex < text.length) {
        // Try to break at a natural paragraph boundary, then sentence boundary
        const paragraphBreak = text.lastIndexOf('\n\n', endIndex);
        if (paragraphBreak > startIndex + maxChunkChars * 0.7) {
          endIndex = paragraphBreak;
        } else {
          const sentenceBreak = text.lastIndexOf('. ', endIndex);
          if (sentenceBreak > startIndex + maxChunkChars * 0.7) {
            endIndex = sentenceBreak + 1;
          }
        }
      } else {
        endIndex = text.length;
      }

      const chunk = text.slice(startIndex, endIndex).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }

      if (endIndex >= text.length) break;
      startIndex = Math.max(startIndex + 1, endIndex - overlap);
    }

    return chunks;
  }

  /**
   * Stage 3: Analyze content using Gemini AI.
   * Extracts main topics, key concepts, findings, terminology, facts, and conclusions.
   */
  async analyzeContent(text) {
    if (!this.isConfigured()) {
      throw new Error(
        'Gemini API key is not configured. Please set GEMINI_API_KEY in server/.env to enable AI summarization.'
      );
    }

    const chunks = this.chunkText(text);
    logger.info(`[GeminiService] Analyzing content across ${chunks.length} chunk(s) using ${this.modelName}`);

    // If document is multi-chunk, analyze chunks and synthesize
    if (chunks.length === 1) {
      return this.analyzeSingleChunk(chunks[0]);
    }

    const chunkSummaries = [];
    for (let i = 0; i < chunks.length; i++) {
      logger.info(`[GeminiService] Analyzing chunk ${i + 1}/${chunks.length}...`);
      const analysis = await this.analyzeSingleChunk(chunks[i], `Part ${i + 1} of ${chunks.length}`);
      chunkSummaries.push(`--- Analysis of Document Part ${i + 1} ---\n${analysis}`);
    }

    // Synthesize the chunk-level findings into a cohesive analysis
    return this.synthesizeChunkAnalyses(chunkSummaries.join('\n\n'));
  }

  async analyzeSingleChunk(chunkText, contextLabel = 'Full Document') {
    const prompt = `You are a professional document analysis engine. Analyze the following document text thoroughly.
Context: ${contextLabel}

INSTRUCTIONS:
1. Ground your analysis strictly on the text provided below. Never invent information or make unsupported assumptions.
2. Identify:
   - Main subject and overarching topic
   - Core concepts and themes
   - Key findings and takeaways
   - Important facts, dates, measurements, and numerical figures
   - Important domain-specific terminology with meanings defined in context
   - Main arguments or methodology
   - Stated conclusions or recommendations
3. If the document content is incomplete or lacks specific details, state that fact accurately.

DOCUMENT TEXT:
${chunkText}`;

    const response = await this.callGeminiWithRetry({
      model: this.modelName,
      contents: prompt,
      config: {
        temperature: 0.2,
      },
    });

    return response.text || '';
  }

  async synthesizeChunkAnalyses(combinedAnalyses) {
    const prompt = `Synthesize the following partial document section analyses into a cohesive, non-redundant, document-level analysis.

Section Analyses:
${combinedAnalyses}

Ensure you preserve all key facts, terminology, metrics, and core conclusions across all sections without hallucinating.`;

    const response = await this.callGeminiWithRetry({
      model: this.modelName,
      contents: prompt,
      config: {
        temperature: 0.2,
      },
    });

    return response.text || combinedAnalyses;
  }

  /**
   * Stage 4: Generate a structured summary adhering strictly to the required JSON schema.
   */
  async generateSummary(extractedText, analysisContent = '') {
    if (!this.isConfigured()) {
      throw new Error(
        'Gemini API key is not configured. Please set GEMINI_API_KEY in server/.env to enable AI summarization.'
      );
    }

    const inputData = analysisContent
      ? `DOCUMENT ANALYSIS & FINDINGS:\n${analysisContent}\n\nEXCERPT OF SOURCE TEXT:\n${extractedText.slice(0, 10000)}`
      : `DOCUMENT SOURCE TEXT:\n${extractedText.slice(0, 25000)}`;

    const prompt = `You are a precision AI document summarizer. Generate a comprehensive, strictly-formatted JSON summary based solely on the provided document content.

CRITICAL RULES:
- Use ONLY facts, data, terminology, and conclusions explicitly found in the document.
- NEVER invent information, dates, figures, or assumptions.
- If information for a field is not available, provide an appropriate factual note rather than fabricating.
- The output MUST be valid JSON adhering strictly to the schema below.

REQUIRED JSON FORMAT:
{
  "title": "Document Title (inferred accurately from the document)",
  "overview": "Concise executive overview of the document (2-4 clear sentences)",
  "keyPoints": [
    "First crucial takeaway or argument",
    "Second crucial takeaway or argument",
    "Third crucial takeaway or argument"
  ],
  "importantTerms": [
    {
      "term": "Term or concept name",
      "definition": "Accurate definition based on how it is explained in the document"
    }
  ],
  "importantFacts": [
    "Specific factual metric, date, statistic, or finding from the text",
    "Another verified fact or finding"
  ],
  "conclusion": "The document's final conclusion, resolution, or closing recommendation"
}

CONTENT TO SUMMARIZE:
${inputData}`;

    const response = await this.callGeminiWithRetry({
      model: this.modelName,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const rawText = response.text || '';
    return this.parseAndValidateSummaryJson(rawText);
  }

  /**
   * Validates and sanitizes structured JSON summary output.
   */
  parseAndValidateSummaryJson(rawJson) {
    if (!rawJson || typeof rawJson !== 'string') {
      throw new Error('Gemini returned an empty or invalid response.');
    }

    // Strip markdown code fences if present
    let cleaned = rawJson.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/```$/, '').trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      logger.error(`[GeminiService] JSON parse error: ${parseErr.message}. Raw output: ${rawJson.slice(0, 300)}`);
      throw new Error(`Gemini returned malformed JSON: ${parseErr.message}`);
    }

    // Validate structure against contract
    const summary = {
      title: typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : 'Document Summary',
      overview:
        typeof parsed.overview === 'string' && parsed.overview.trim()
          ? parsed.overview.trim()
          : 'No overview provided in the document.',
      keyPoints: Array.isArray(parsed.keyPoints)
        ? parsed.keyPoints.filter((p) => typeof p === 'string' && p.trim().length > 0)
        : [],
      importantTerms: Array.isArray(parsed.importantTerms)
        ? parsed.importantTerms
            .filter((t) => t && typeof t.term === 'string')
            .map((t) => ({
              term: t.term.trim(),
              definition: typeof t.definition === 'string' ? t.definition.trim() : '',
            }))
        : [],
      importantFacts: Array.isArray(parsed.importantFacts)
        ? parsed.importantFacts.filter((f) => typeof f === 'string' && f.trim().length > 0)
        : [],
      conclusion:
        typeof parsed.conclusion === 'string' && parsed.conclusion.trim()
          ? parsed.conclusion.trim()
          : 'No explicit conclusion found in document.',
    };

    if (summary.keyPoints.length === 0) {
      summary.keyPoints.push('Document text was analyzed; no discrete bullet points were detailed.');
    }

    return summary;
  }

  /**
   * Helper with timeout and retry handling for network transient glitches.
   */
  async callGeminiWithRetry(params, maxRetries = 2) {
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Gemini API call timed out after 60 seconds')), 60000)
        );

        const apiPromise = this.client.models.generateContent(params);
        return await Promise.race([apiPromise, timeoutPromise]);
      } catch (err) {
        lastError = err;
        logger.warn(`[GeminiService] Call failed on attempt ${attempt + 1}/${maxRetries + 1}: ${err.message}`);

        if (attempt < maxRetries) {
          const delayMs = 1000 * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }
    }

    throw lastError || new Error('Gemini request failed.');
  }
}

export const geminiService = new GeminiService();

