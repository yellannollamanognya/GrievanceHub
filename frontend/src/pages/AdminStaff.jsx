import { useEffect,useState } from "react";
import { adminService } from "../services/adminService";
import { errorMessage } from "../services/api";
export default function AdminStaff(){
  const initial={name:"",email:"",password:"",employee_id:"",department_id:"",designation:"",address:""};
  const [form,setForm]=useState(initial);const [rows,setRows]=useState([]);const [error,setError]=useState("");const [notice,setNotice]=useState("");const [busy,setBusy]=useState(false);
  async function load(){try{const r=await adminService.staff();setRows(r.data.staff||r.data.rows||[]);}catch(e){setError(errorMessage(e));}}
  useEffect(()=>{load();},[]);
  async function submit(e){e.preventDefault();setBusy(true);setError("");setNotice("");try{await adminService.createStaff({...form,department_id:Number(form.department_id)});setNotice("Staff account created.");setForm(initial);await load();}catch(e){setError(errorMessage(e));}finally{setBusy(false);}}
  return <div className="page-stack"><div className="page-heading"><div><span className="eyebrow">ADMINISTRATION</span><h1>Staff management</h1><p>Create staff accounts and view existing staff members.</p></div></div>{error&&<div className="alert error">{error}</div>}{notice&&<div className="alert success">{notice}</div>}
    <section className="panel"><h3>Create staff account</h3><form className="form-grid" onSubmit={submit}>
      <label>Full name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Email<input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
      <label>Temporary password<input type="password" minLength="6" required value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label><label>Employee ID<input required value={form.employee_id} onChange={e=>setForm({...form,employee_id:e.target.value})}/></label>
      <label>Department ID<input type="number" min="1" required value={form.department_id} onChange={e=>setForm({...form,department_id:e.target.value})}/></label><label>Designation<input value={form.designation} onChange={e=>setForm({...form,designation:e.target.value})}/></label>
      <label className="full-span">Address<input value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></label><button className="btn btn-primary" disabled={busy}>{busy?"Creating...":"Create staff"}</button>
    </form></section>
    <section className="panel"><h3>Staff directory</h3>{!rows.length?<p className="muted">No staff records returned.</p>:<div className="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Employee ID</th><th>Department</th><th>Designation</th></tr></thead><tbody>{rows.map(s=><tr key={s.user_id}><td>{s.name}</td><td>{s.email}</td><td>{s.employee_id}</td><td>{s.department_name||s.department_id}</td><td>{s.designation||"—"}</td></tr>)}</tbody></table></div>}</section>
  </div>;
}
