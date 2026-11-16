import api from "./api";

export const adminService = {
  dashboard: () => api.get("/admin/dashboard"),
  complaints: () => api.get("/admin/complaints"),
  assign: (id, data) => api.post(`/admin/complaints/${id}/assign`, data),
  staff: () => api.get("/admin/staff"),
  createStaff: (data) => api.post("/admin/staff", data),
};
