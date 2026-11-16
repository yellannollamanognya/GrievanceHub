import api from "./api";

export const complaintService = {
  submit: (data) => api.post("/complaints", data),
  mine: () => api.get("/complaints/my"),
  history: (id) => api.get(`/complaints/${id}/history`),
  comments: (id) => api.get(`/complaints/${id}/comments`),
  addComment: (id, comment_text) =>
    api.post(`/complaints/${id}/comments`, { comment_text }),
  attachments: (id) => api.get(`/complaints/${id}/attachments`),
  upload: (id, file, purpose) => {
    const body = new FormData();
    body.append("file", file);
    if (purpose) body.append("purpose", purpose);
    return api.post(`/complaints/${id}/attachments`, body, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  download: (id, attachmentId) =>
    api.get(`/complaints/${id}/attachments/${attachmentId}/download`, {
      responseType: "blob",
    }),
  feedback: (id) => api.get(`/complaints/${id}/feedback`),
  submitFeedback: (id, data) => api.post(`/complaints/${id}/feedback`, data),
  assigned: () => api.get("/complaints/staff/assigned"),
  updateStatus: (id, data) => api.patch(`/complaints/${id}/status`, data),
};
