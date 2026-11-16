import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FilePlus2, ClipboardList, Clock3, CheckCircle2, Users, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { complaintService } from "../services/complaintService";
import { adminService } from "../services/adminService";
import { errorMessage } from "../services/api";
import ComplaintTable from "../components/ComplaintTable";

function Metric({icon:Icon,label,value}) { return <div className="metric-card"><span className="metric-icon"><Icon size={20}/></span><div><small>{label}</small><strong>{value ?? "—"}</strong></div></div>; }

export default function Dashboard(){
  const {user}=useAuth(); const [rows,setRows]=useState([]); const [stats,setStats]=useState(null); const [error,setError]=useState(""); const [loading,setLoading]=useState(true);
  useEffect(()=>{let active=true;(async()=>{
    try{
      if(user?.role==="STUDENT"){const r=await complaintService.mine();if(active)setRows(r.data.complaints||r.data.rows||[]);}
      else if(user?.role==="STAFF"){const r=await complaintService.assigned();if(active)setRows(r.data.complaints||r.data.rows||[]);}
      else {const [s,c]=await Promise.all([adminService.dashboard(),adminService.complaints()]);if(active){setStats(s.data);setRows(c.data.complaints||c.data.rows||[]);}}
    }catch(e){if(active)setError(errorMessage(e));}finally{if(active)setLoading(false);}
  })();return()=>{active=false;};},[user]);
  const resolved=rows.filter(x=>["RESOLVED","CLOSED"].includes(x.current_status||x.status)).length;
  const pending=rows.filter(x=>!["RESOLVED","CLOSED","REJECTED","CANCELLED"].includes(x.current_status||x.status)).length;
  return <div className="page-stack">
    <div className="page-heading"><div><span className="eyebrow">{user?.role} WORKSPACE</span><h1>Good day, {user?.name?.split(" ")[0]||"there"}</h1><p>Here is an overview of your grievance activity.</p></div>
      {user?.role==="STUDENT"&&<Link className="btn btn-primary" to="/complaints/new"><FilePlus2 size={17}/> New complaint</Link>}
    </div>
    {error&&<div className="alert error">{error}</div>}
    <div className="metrics-grid">
      <Metric icon={ClipboardList} label={user?.role==="ADMIN"?"Total complaints":"Visible complaints"} value={rows.length}/>
      <Metric icon={Clock3} label="Open / pending" value={pending}/>
      <Metric icon={CheckCircle2} label="Resolved / closed" value={resolved}/>
      {user?.role==="ADMIN"&&<Metric icon={Users} label="Dashboard data" value={stats?"Loaded":"—"}/>}
    </div>
    <div className="section-heading"><div><h2>{user?.role==="STUDENT"?"Your recent complaints":user?.role==="STAFF"?"Your assigned complaints":"Recent campus complaints"}</h2><p>Latest records available to your account.</p></div>
      {user?.role==="STUDENT"&&<Link to="/complaints">View all</Link>}
      {user?.role==="STAFF"&&<Link to="/staff/assigned">View all</Link>}
      {user?.role==="ADMIN"&&<Link to="/admin/complaints">View all</Link>}
    </div>
    {loading?<div className="loading">Loading dashboard...</div>:<ComplaintTable complaints={rows.slice(0,8)} showStudent={user?.role==="ADMIN"}/>}
    {user?.role==="STUDENT"&&<div className="tip-card"><AlertCircle size={20}/><div><b>Need to report a concern?</b><p>Submit a complaint with a clear description and any supporting evidence.</p></div><Link to="/complaints/new">Get started</Link></div>}
  </div>;
}
