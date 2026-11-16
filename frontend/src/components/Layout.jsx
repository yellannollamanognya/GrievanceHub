import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, FilePlus2, ClipboardList, Users, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = user?.role === "STUDENT"
    ? [{to:"/dashboard",label:"Dashboard",icon:LayoutDashboard},{to:"/complaints/new",label:"New complaint",icon:FilePlus2},{to:"/complaints",label:"My complaints",icon:ClipboardList}]
    : user?.role === "STAFF"
    ? [{to:"/dashboard",label:"Dashboard",icon:LayoutDashboard},{to:"/staff/assigned",label:"Assigned complaints",icon:ClipboardList}]
    : [{to:"/dashboard",label:"Dashboard",icon:LayoutDashboard},{to:"/admin/complaints",label:"All complaints",icon:ClipboardList},{to:"/admin/staff",label:"Staff",icon:Users}];

  function handleLogout() { logout(); navigate("/login"); }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><ShieldCheck size={21}/></span><span>GrievanceHub<small>Campus support portal</small></span></div>
      <nav>{links.map(({to,label,icon:Icon}) => <NavLink key={to} to={to} end={to==="/dashboard"}><Icon size={18}/>{label}</NavLink>)}</nav>
      <button className="sidebar-logout" onClick={handleLogout}><LogOut size={18}/> Sign out</button>
    </aside>
    <main className="main-area">
      <header className="topbar"><div><span className="eyebrow">CAMPUS GRIEVANCE MANAGEMENT</span><strong>{user?.name || "Account"}</strong></div><span className="role-pill">{user?.role || "USER"}</span></header>
      <section className="page-content"><Outlet/></section>
    </main>
  </div>;
}
