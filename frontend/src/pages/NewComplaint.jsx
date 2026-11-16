
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { errorMessage } from "../services/api";

export default function NewComplaint() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    category_id: "",
    department_id: "",
    title: "",
    description: "",
    priority: "MEDIUM",
  });

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [categoryResponse, departmentResponse] =
          await Promise.all([
            api.get("/categories"),
            api.get("/departments"),
          ]);

        setCategories(categoryResponse.data.categories || []);
        setDepartments(departmentResponse.data.departments || []);
      } catch (err) {
        setError("Unable to load form options. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    };

    fetchOptions();
  }, []);

  const validateForm = () => {
    const errors = {};

    if (!form.category_id) {
      errors.category_id = "Please select a complaint category.";
    }

    if (!form.department_id) {
      errors.department_id = "Please select a department.";
    }

    if (!form.title.trim()) {
      errors.title = "Complaint title is required.";
    } else if (form.title.trim().length > 180) {
      errors.title = "Title cannot exceed 180 characters.";
    }

    if (!form.description.trim()) {
      errors.description = "Complaint description is required.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setFieldErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    setError("");

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);

      await api.post("/complaints", {
        category_id: Number(form.category_id),
        department_id: Number(form.department_id),
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
      });

      alert("Complaint submitted successfully!");
      navigate("/complaints");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass = (name) =>
    `form-control ${submitted && fieldErrors[name] ? "input-error" : ""}`;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Submit a Complaint</h1>
        <p>Provide the details of your grievance below.</p>
      </div>

      <div className="form-card">
        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>

          <div className="form-group">
            <label htmlFor="category_id">
              Complaint Category <span className="required-star">*</span>
            </label>

            <select
              id="category_id"
              name="category_id"
              className={fieldClass("category_id")}
              value={form.category_id}
              onChange={handleChange}
              disabled={loading || categories.length === 0}
              aria-invalid={!!fieldErrors.category_id}
            >
              <option value="">
                {loading ? "Loading categories..." : "Select complaint category"}
              </option>

              {categories.map((category) => (
                <option
                  key={category.category_id}
                  value={category.category_id}
                >
                  {category.category_name}
                </option>
              ))}
            </select>

            {submitted && fieldErrors.category_id && (
              <small className="field-error">
                {fieldErrors.category_id}
              </small>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="department_id">
              Department <span className="required-star">*</span>
            </label>

            <select
              id="department_id"
              name="department_id"
              className={fieldClass("department_id")}
              value={form.department_id}
              onChange={handleChange}
              disabled={loading || departments.length === 0}
              aria-invalid={!!fieldErrors.department_id}
            >
              <option value="">
                {loading ? "Loading departments..." : "Select department"}
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

            {submitted && fieldErrors.department_id && (
              <small className="field-error">
                {fieldErrors.department_id}
              </small>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="title">
              Complaint Title <span className="required-star">*</span>
            </label>

            <input
              id="title"
              type="text"
              name="title"
              className={fieldClass("title")}
              value={form.title}
              onChange={handleChange}
              placeholder="Enter complaint title"
              maxLength={180}
              aria-invalid={!!fieldErrors.title}
            />

            {submitted && fieldErrors.title && (
              <small className="field-error">
                {fieldErrors.title}
              </small>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="description">
              Description <span className="required-star">*</span>
            </label>

            <textarea
              id="description"
              name="description"
              className={fieldClass("description")}
              value={form.description}
              onChange={handleChange}
              placeholder="Explain your grievance in detail"
              rows={6}
              aria-invalid={!!fieldErrors.description}
            />

            {submitted && fieldErrors.description && (
              <small className="field-error">
                {fieldErrors.description}
              </small>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="priority">Priority</label>

            <select
              id="priority"
              name="priority"
              value={form.priority}
              onChange={handleChange}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          <p className="form-required-note">
            * Fields marked with an asterisk are required.
          </p>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate(-1)}
              disabled={submitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || loading}
            >
              {submitting ? "Submitting..." : "Submit Complaint"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
