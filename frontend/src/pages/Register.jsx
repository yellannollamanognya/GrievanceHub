
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { errorMessage } from "../services/api";

export default function Register() {
  const navigate = useNavigate();

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    roll_number: "",
    department_id: "",
    year_of_study: "",
    address: "",
  });

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await api.get("/departments");

        setDepartments(response.data.departments || []);
      } catch (err) {
        setError("Unable to load departments. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchDepartments();
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.department_id) {
      setError("Please select your department.");
      return;
    }

    try {
      setSubmitting(true);

      await api.post("/auth/register/student", {
        ...form,
        department_id: Number(form.department_id),
        year_of_study: Number(form.year_of_study),
      });

      alert("Registration successful! Please login.");
      navigate("/login");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-heading">
          <h1>Create Account</h1>
          <p>Register as a student to submit and track grievances.</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Minimum 8 characters"
              minLength={8}
              required
            />
          </div>

          <div className="form-group">
            <label>Roll Number</label>
            <input
              type="text"
              name="roll_number"
              value={form.roll_number}
              onChange={handleChange}
              placeholder="Enter your roll number"
              required
            />
          </div>

          <div className="form-group">
            <label>Department</label>
            <select
              name="department_id"
              value={form.department_id}
              onChange={handleChange}
              required
              disabled={loading || departments.length === 0}
            >
              <option value="">
                {loading
                  ? "Loading departments..."
                  : departments.length === 0
                    ? "No departments available"
                    : "Select your department"}
              </option>

              {departments.map((department) => (
                <option
                  key={department.department_id}
                  value={department.department_id}
                >
                  {department.department_name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Year of Study</label>
            <select
              name="year_of_study"
              value={form.year_of_study}
              onChange={handleChange}
              required
            >
              <option value="">Select your year</option>
              <option value="1">First Year</option>
              <option value="2">Second Year</option>
              <option value="3">Third Year</option>
              <option value="4">Fourth Year</option>
            </select>
          </div>

          <div className="form-group">
            <label>Address</label>
            <textarea
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Enter your address"
              rows={3}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || loading || departments.length === 0}
          >
            {submitting ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
