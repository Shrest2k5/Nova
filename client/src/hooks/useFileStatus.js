import { useState, useEffect, useRef, useCallback } from 'react';
import { fileService } from '../services/fileService.js';

/**
 * Custom hook to poll file processing status until COMPLETED or FAILED.
 * @param {string} fileId - The UUID of the file to monitor.
 * @param {object} initialData - Optional initial file status record.
 * @param {number} intervalMs - Polling interval in milliseconds (default 1500ms).
 */
export const useFileStatus = (fileId, initialData = null, intervalMs = 1500) => {
  const [data, setData] = useState(initialData);
  const [status, setStatus] = useState(initialData?.status || 'QUEUED');
  const [processingStage, setProcessingStage] = useState(initialData?.processingStage || null);
  const [progress, setProgress] = useState(initialData?.progress || 0);
  const [errorMessage, setErrorMessage] = useState(initialData?.errorMessage || null);
  const [completedAt, setCompletedAt] = useState(initialData?.completedAt || null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState(null);

  const timeoutRef = useRef(null);
  const isMountedRef = useRef(true);

  const isTerminalState = useCallback((st) => st === 'FAILED' || st === 'COMPLETED', []);

  const checkStatus = useCallback(async () => {
    if (!fileId) return;

    try {
      const response = await fileService.getFileStatus(fileId);
      if (!isMountedRef.current) return;

      setData(response);
      setStatus(response.status);
      setProcessingStage(response.processingStage);
      setProgress(response.progress);
      setErrorMessage(response.errorMessage);
      setCompletedAt(response.completedAt);
      setError(null);

      // Continue polling if still in non-terminal state
      if (!isTerminalState(response.status)) {
        timeoutRef.current = setTimeout(checkStatus, intervalMs);
      } else {
        setIsPolling(false);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      setError(err.message);
      setIsPolling(false);
    }
  }, [fileId, intervalMs, isTerminalState]);

  useEffect(() => {
    isMountedRef.current = true;

    // Reset state if fileId changes
    if (fileId) {
      if (!isTerminalState(status)) {
        setIsPolling(true);
        checkStatus();
      }
    }

    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [fileId, checkStatus, isTerminalState, status]);

  const refetch = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsPolling(true);
    checkStatus();
  }, [checkStatus]);

  return {
    data,
    status,
    processingStage,
    progress,
    errorMessage,
    completedAt,
    isPolling,
    error,
    refetch,
    isComplete: status === 'COMPLETED',
    isFailed: status === 'FAILED',
    isProcessing: ['QUEUED', 'PROCESSING', 'EXTRACTING'].includes(status),
  };
};
