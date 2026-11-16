import api from "./api";

export const authService = {
  login: (data) => api.post("/auth/login", data),
  registerStudent: (data) => api.post("/auth/register/student", data),
  getStudentProfile: () => api.get("/auth/profile"),
  getStaffProfile: () => api.get("/auth/staff-profile"),
  getAdminProfile: () => api.get("/auth/admin-profile"),
};
