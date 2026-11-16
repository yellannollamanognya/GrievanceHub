const labels = {
  SUBMITTED: "Submitted", UNDER_REVIEW: "Under review", ASSIGNED: "Assigned",
  IN_PROGRESS: "In progress", RESOLVED: "Resolved", CLOSED: "Closed",
  REJECTED: "Rejected", CANCELLED: "Cancelled", REOPENED: "Reopened"
};
export default function StatusBadge({ status }) {
  const value = status || "UNKNOWN";
  return <span className={`status status-${value.toLowerCase()}`}>{labels[value] || value}</span>;
}
