import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import NewComplaint from "./pages/NewComplaint";
import Complaints from "./pages/Complaints";
import ComplaintDetail from "./pages/ComplaintDetail";
import AdminComplaints from "./pages/AdminComplaints";
import AdminStaff from "./pages/AdminStaff";

function HomeRedirect(){
  const {isAuthenticated}=useAuth();
  return <Navigate to={isAuthenticated?"/dashboard":"/login"} replace/>;
}

export default function App(){
  return <Routes>
    <Route path="/" element={<HomeRedirect/>}/>
    <Route path="/login" element={<Login/>}/>
    <Route path="/register" element={<Register/>}/>
    <Route element={<ProtectedRoute/>}>
      <Route element={<Layout/>}>
        <Route path="/dashboard" element={<Dashboard/>}/>
        <Route path="/complaints/:id" element={<ComplaintDetail/>}/>
        <Route element={<ProtectedRoute roles={["STUDENT"]}/>}>
          <Route path="/complaints/new" element={<NewComplaint/>}/>
          <Route path="/complaints" element={<Complaints/>}/>
        </Route>
        <Route element={<ProtectedRoute roles={["STAFF"]}/>}>
          <Route path="/staff/assigned" element={<Complaints mode="assigned"/>}/>
        </Route>
        <Route element={<ProtectedRoute roles={["ADMIN"]}/>}>
          <Route path="/admin/complaints" element={<AdminComplaints/>}/>
          <Route path="/admin/staff" element={<AdminStaff/>}/>
        </Route>
      </Route>
    </Route>
    <Route path="*" element={<HomeRedirect/>}/>
  </Routes>;
}
