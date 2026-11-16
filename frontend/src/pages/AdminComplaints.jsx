import { useEffect,useState } from "react";
import { adminService } from "../services/adminService";
import { errorMessage } from "../services/api";
import ComplaintTable from "../components/ComplaintTable";
export default function AdminComplaints(){
  const [rows,setRows]=useState([]);const [staff,setStaff]=useState([]);const [assign,setAssign]=useState({complaint_id:"",staff_id:""});const [error,setError]=useState("");const [notice,setNotice]=useState("");
  async function load(){try{const [c,s]=await Promise.all([adminService.complaints(),adminService.staff()]);setRows(c.data.complaints||c.data.rows||[]);setStaff(s.data.staff||s.data.rows||[]);}catch(e){setError(errorMessage(e));}}
  useEffect(()=>{load();},[]);
  async function submit(e){e.preventDefault();setError("");setNotice("");try{await adminService.assign(assign.complaint_id,{staff_id:Number(assign.staff_id)});setNotice("Complaint assignment saved.");setAssign({complaint_id:"",staff_id:""});await load();}catch(e){setError(errorMessage(e));}}
  return <div className="page-stack"><div className="page-heading"><div><span className="eyebrow">ADMINISTRATION</span><h1>All complaints</h1><p>Monitor complaints and assign them to the appropriate staff member.</p></div></div>{error&&<div className="alert error">{error}</div>}{notice&&<div className="alert success">{notice}</div>}
    <section className="panel"><h3>Assign a complaint</h3><form className="form-grid" onSubmit={submit}><label>Complaint ID<input type="number" min="1" required value={assign.complaint_id} onChange={e=>setAssign({...assign,complaint_id:e.target.value})}/></label><label>Staff member<select required value={assign.staff_id} onChange={e=>setAssign({...assign,staff_id:e.target.value})}><option value="">Select staff</option>{staff.map(s=><option key={s.user_id} value={s.user_id}>{s.name} · {s.employee_id||s.user_id}</option>)}</select></label><button className="btn btn-primary">Assign complaint</button></form></section>
    <div className="section-heading"><div><h2>Complaint records</h2><p>{rows.length} records returned by the backend.</p></div></div><ComplaintTable complaints={rows} showStudent/>
  </div>;
}
