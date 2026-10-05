export default function DashboardLoading() {
  return (
    <div className="page-stack">
      <div className="skeleton skeleton-title" />
      <div className="summary-grid">
        {Array.from({ length: 6 }).map((_, index) => (
          <div className="skeleton skeleton-card" key={index} />
        ))}
      </div>
      <div className="skeleton skeleton-panel" />
    </div>
  );
}
