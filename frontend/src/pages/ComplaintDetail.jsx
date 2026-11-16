
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { complaintService } from "../services/complaintService";
import { adminService } from "../services/adminService";
import { useAuth } from "../context/AuthContext";
import { errorMessage } from "../services/api";
import StatusBadge from "../components/StatusBadge";

export default function ComplaintDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  const [complaint, setComplaint] = useState(null);
  const [comments, setComments] = useState([]);
  const [history, setHistory] = useState([]);
  const [attachments, setAttachments] = useState([]);

  const [comment, setComment] = useState("");
  const [feedback, setFeedback] = useState({
    rating: "5",
    message: "",
  });

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");

    try {
      let response;

      if (user?.role === "ADMIN") {
        response = await adminService.complaints();
      } else if (user?.role === "STAFF") {
        response = await complaintService.assigned();
      } else {
        response = await complaintService.mine();
      }

      const all =
        response.data.complaints ||
        response.data.rows ||
        [];

      const found = all.find(
        (item) =>
          String(item.complaint_id) === String(id)
      );

      if (!found) {
        setComplaint(null);
        setError(
          `Complaint #${id} was not found in the complaints returned for your account.`
        );
        return;
      }

      setComplaint(found);

      // Load activity separately.
      // An activity API failure should not hide complaint details.
      const results = await Promise.allSettled([
        complaintService.history(id),
        complaintService.attachments(id),
        complaintService.comments(id),
      ]);

      if (results[0].status === "fulfilled") {
        setHistory(
          results[0].value.data.history ||
          results[0].value.data.rows ||
          []
        );
      }

      if (results[1].status === "fulfilled") {
        setAttachments(
          results[1].value.data.attachments ||
          results[1].value.data.rows ||
          []
        );
      }

      if (results[2].status === "fulfilled") {
        setComments(
          results[2].value.data.comments ||
          results[2].value.data.rows ||
          []
        );
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      load();
    }
  }, [id, user?.role]);

  async function addComment(e) {
    e.preventDefault();
    if (!comment.trim()) return;

    setBusy(true);
    setError("");

    try {
      await complaintService.addComment(id, comment.trim());
      setComment("");
      setNotice("Comment added successfully.");
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function upload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setError("");

    try {
      await complaintService.upload(
        id,
        file,
        user?.role === "STAFF"
          ? "RESOLUTION_PROOF"
          : "EVIDENCE"
      );

      setNotice("File uploaded successfully.");
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  async function download(a) {
    try {
      const response = await complaintService.download(
        id,
        a.attachment_id
      );

      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");

      link.href = url;
      link.download = a.file_name || "attachment";
      link.click();

      URL.revokeObjectURL(url);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function sendFeedback(e) {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      await complaintService.submitFeedback(id, {
        rating: Number(feedback.rating),
        message: feedback.message,
      });

      setNotice("Feedback submitted successfully.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const status = complaint?.current_status || complaint?.status;

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <Link
            className="back-link"
            to={
              user?.role === "STAFF"
                ? "/staff/assigned"
                : user?.role === "ADMIN"
                  ? "/admin/complaints"
                  : "/complaints"
            }
          >
            ← Back to complaints
          </Link>

          <h1>Complaint #{id}</h1>
          <p>Review the complaint record and its activity.</p>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}
      {notice && <div className="alert success">{notice}</div>}

      {loading && <p>Loading complaint details...</p>}

      {!loading && complaint && (
        <>
          <div className="detail-grid">
            <section className="panel detail-main">
              <div className="detail-title">
                <div>
                  <span className="eyebrow">COMPLAINT DETAILS</span>
                  <h2>{complaint.title}</h2>
                </div>

                <StatusBadge status={status} />
              </div>

              {user?.role === "ADMIN" && (
                <p>
                  <strong>Student:</strong>{" "}
                  {complaint.student_name || "—"}
                </p>
              )}

              <p className="description">
                {complaint.description}
              </p>

              <div className="detail-facts">
                <div>
                  <small>Priority</small>
                  <b>{complaint.priority}</b>
                </div>

                <div>
                  <small>Category</small>
                  <b>{complaint.category_name || "—"}</b>
                </div>

                <div>
                  <small>Department</small>
                  <b>{complaint.department_name || "—"}</b>
                </div>

                <div>
                  <small>Location</small>
                  <b>{complaint.location || "—"}</b>
                </div>

                <div>
                  <small>Submitted</small>
                  <b>
                    {complaint.created_at
                      ? new Date(complaint.created_at).toLocaleString()
                      : "—"}
                  </b>
                </div>
              </div>
            </section>

            <section className="panel">
              <h3>Attachments</h3>

              {attachments.length ? (
                attachments.map((a) => (
                  <div className="file-row" key={a.attachment_id}>
                    <span>{a.file_name}</span>
                    <button
                      className="text-button"
                      onClick={() => download(a)}
                    >
                      Download
                    </button>
                  </div>
                ))
              ) : (
                <p className="muted">No attachments.</p>
              )}

              <label className="upload-label">
                Upload file
                <input
                  type="file"
                  onChange={upload}
                  disabled={busy}
                />
              </label>
            </section>
          </div>

          <div className="two-column">
            <section className="panel">
              <h3>Discussion</h3>

              <div className="activity-list">
                {comments.map((c, i) => (
                  <div
                    className="activity-item"
                    key={c.comment_id || i}
                  >
                    <b>
                      {c.name ||
                        c.user_name ||
                        `User ${c.user_id || ""}`}
                    </b>

                    <p>{c.comment_text || c.comment}</p>

                    <small>
                      {c.created_at
                        ? new Date(c.created_at).toLocaleString()
                        : ""}
                    </small>
                  </div>
                ))}

                {!comments.length && (
                  <p className="muted">No comments yet.</p>
                )}
              </div>

              <form onSubmit={addComment} className="form-stack">
                <label>
                  Add a comment
                  <textarea
                    rows="3"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Write an update..."
                  />
                </label>

                <button
                  className="btn btn-primary"
                  disabled={busy || !comment.trim()}
                >
                  Post comment
                </button>
              </form>
            </section>

            <section className="panel">
              <h3>Status history</h3>

              <div className="timeline">
                {history.map((h, i) => (
                  <div
                    className="timeline-item"
                    key={h.history_id || i}
                  >
                    <span className="timeline-dot" />

                    <div>
                      <b>{h.new_status}</b>
                      <p>{h.remarks || "Status updated"}</p>

                      <small>
                        {h.changed_at
                          ? new Date(h.changed_at).toLocaleString()
                          : ""}
                      </small>
                    </div>
                  </div>
                ))}

                {!history.length && (
                  <p className="muted">
                    No history available.
                  </p>
                )}
              </div>
            </section>
          </div>

          {user?.role === "STAFF" && (
            <StaffActions id={id} onDone={load} />
          )}

          {user?.role === "STUDENT" &&
            ["RESOLVED", "CLOSED"].includes(status) && (
              <section className="panel feedback-panel">
                <h3>Share your feedback</h3>

                <form
                  className="form-grid"
                  onSubmit={sendFeedback}
                >
                  <label>
                    Rating
                    <select
                      value={feedback.rating}
                      onChange={(e) =>
                        setFeedback({
                          ...feedback,
                          rating: e.target.value,
                        })
                      }
                    >
                      <option value="5">5 - Excellent</option>
                      <option value="4">4 - Good</option>
                      <option value="3">3 - Average</option>
                      <option value="2">2 - Poor</option>
                      <option value="1">1 - Very poor</option>
                    </select>
                  </label>

                  <label className="full-span">
                    Message
                    <textarea
                      rows="2"
                      value={feedback.message}
                      onChange={(e) =>
                        setFeedback({
                          ...feedback,
                          message: e.target.value,
                        })
                      }
                    />
                  </label>

                  <button
                    className="btn btn-primary"
                    disabled={busy}
                  >
                    Submit feedback
                  </button>
                </form>
              </section>
            )}
        </>
      )}
    </div>
  );
}

function StaffActions({ id, onDone }) {
  const [status, setStatus] = useState("IN_PROGRESS");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function update(e) {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      await complaintService.updateStatus(id, {
        status,
        remarks,
      });

      await onDone();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <h3>Update complaint status</h3>

      {error && <div className="alert error">{error}</div>}

      <form className="form-grid" onSubmit={update}>
        <label>
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="UNDER_REVIEW">Under review</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </label>

        <label>
          Remarks
          <input
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Add a short update"
          />
        </label>

        <button
          className="btn btn-primary"
          disabled={busy}
        >
          {busy ? "Updating..." : "Update status"}
        </button>
      </form>
    </section>
  );
}
