import { useEffect,useState } from "react";
import { complaintService } from "../services/complaintService";
import { errorMessage } from "../services/api";
import ComplaintTable from "../components/ComplaintTable";
import { Link } from "react-router-dom";
export default function Complaints({mode="mine"}){
  const [rows,setRows]=useState([]);const [error,setError]=useState("");const [loading,setLoading]=useState(true);
  useEffect(()=>{(async()=>{try{const r=mode==="assigned"?await complaintService.assigned():await complaintService.mine();setRows(r.data.complaints||r.data.rows||[]);}catch(e){setError(errorMessage(e));}finally{setLoading(false);}})();},[mode]);
  return <div className="page-stack"><div className="page-heading"><div><span className="eyebrow">COMPLAINT MANAGEMENT</span><h1>{mode==="assigned"?"Assigned complaints":"My complaints"}</h1><p>Track status and open a record to view its details.</p></div>{mode==="mine"&&<Link className="btn btn-primary" to="/complaints/new">New complaint</Link>}</div>{error&&<div className="alert error">{error}</div>}{loading?<div className="loading">Loading complaints...</div>:<ComplaintTable complaints={rows}/>}</div>;
}
