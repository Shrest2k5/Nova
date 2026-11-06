import api from './api.js';

export const fileService = {
  async uploadFile(file, onUploadProgress) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onUploadProgress && progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onUploadProgress(percentCompleted);
        }
      },
    });

    return response.data;
  },

  async getFiles(params = {}) {
    const response = await api.get('/files', { params });
    return response;
  },

  async getFileById(id) {
    const response = await api.get(`/files/${id}`);
    return response.data;
  },

  async getFileStatus(id) {
    const response = await api.get(`/files/${id}/status`);
    return response.data;
  },

  async getExtractedText(id) {
    const response = await api.get(`/files/${id}/extracted-text`);
    return response.data;
  },

  async getSummary(id) {
    const response = await api.get(`/files/${id}/summary`);
    return response.data;
  },

  async reprocessFile(id) {
    const response = await api.post(`/files/${id}/reprocess`);
    return response.data;
  },

  async downloadFile(id, originalName) {
    // Axios request with responseType blob
    const response = await api.get(`/files/${id}/download`, {
      responseType: 'blob',
    });

    // Create a blob link and trigger download
    const blob = new Blob([response]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = originalName || 'downloaded-file';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  async deleteFile(id) {
    const response = await api.delete(`/files/${id}`);
    return response.data;
  },

  async getDashboardStats() {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },

  async getRecentUploads(limit = 5) {
    const response = await api.get('/dashboard/recent-uploads', {
      params: { limit },
    });
    return response.data;
  },
};
