import { Link } from "react-router-dom";
import StatusBadge from "./StatusBadge";

export default function ComplaintTable({ complaints = [], showStudent = false }) {
  if (!complaints.length) return <div className="empty-state"><h3>No complaints found</h3><p>There are no records to display yet.</p></div>;
  return <div className="table-wrap"><table><thead><tr><th>ID</th><th>Complaint</th>{showStudent && <th>Student</th>}<th>Priority</th><th>Status</th><th>Date</th><th></th></tr></thead>
    <tbody>{complaints.map((c) => <tr key={c.complaint_id}><td>#{c.complaint_id}</td><td><strong>{c.title}</strong><small>{c.category_name || "General"}</small></td>{showStudent && <td>{c.student_name || c.name || c.student_id}</td>}<td><span className={`priority priority-${(c.priority||"medium").toLowerCase()}`}>{c.priority || "MEDIUM"}</span></td><td><StatusBadge status={c.current_status || c.status}/></td><td>{c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}</td><td><Link className="table-link" to={`/complaints/${c.complaint_id}`}>View</Link></td></tr>)}</tbody>
  </table></div>;
}
