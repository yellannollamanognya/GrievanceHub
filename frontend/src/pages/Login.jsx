import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, LockKeyhole } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { errorMessage } from "../services/api";

export default function Login() {
  const [form, setForm] = useState({email:"",password:""});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      const user = await login(form);
      navigate(user.role === "ADMIN" ? "/dashboard" : user.role === "STAFF" ? "/dashboard" : "/dashboard");
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  }

  return <div className="auth-page"><div className="auth-panel">
    <div className="auth-brand"><span className="brand-mark"><ShieldCheck/></span><div><b>GrievanceHub</b><small>Campus support portal</small></div></div>
    <div className="auth-heading"><span className="eyebrow">WELCOME BACK</span><h1>Sign in to your account</h1><p>Use your registered email and password. Your role is detected automatically.</p></div>
    {error && <div className="alert error">{error}</div>}
    <form onSubmit={submit} className="form-stack">
      <label>Email address<input type="email" required autoComplete="username" placeholder="you@college.edu" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
      <label>Password<input type="password" required autoComplete="current-password" placeholder="Enter your password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label>
      <button className="btn btn-primary btn-wide" disabled={busy}>{busy ? "Signing in..." : <><LockKeyhole size={17}/> Sign in</>}</button>
    </form>
    <p className="auth-foot">Student new to GrievanceHub? <Link to="/register">Create an account</Link></p>
  </div><div className="auth-side"><div className="side-orb"></div><span className="eyebrow">YOUR VOICE MATTERS</span><h2>A better campus starts with listening.</h2><p>Submit concerns, follow progress and stay connected with the people working to resolve them.</p><div className="side-note">One place to raise, manage and resolve campus concerns.</div></div></div>;
}
