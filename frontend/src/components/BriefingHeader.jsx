import { memo } from "react";
import { Link } from "react-router-dom";

export const BriefingHeader = memo(function BriefingHeader({
  breadcrumbs = [],
  sessionState = "idle",
  onBreadcrumbClick,
}) {
  return (
    <nav className="workspace-breadcrumb" aria-label="Investigation breadcrumb">
      <Link to="/">FRONTWING</Link>
      <span aria-hidden="true">/</span>
      {breadcrumbs.map((crumb, index) => (
        <span key={`${crumb.label}-${index}`} className="breadcrumb-item">
          {index > 0 && <span aria-hidden="true">/</span>}
          <button
            onClick={() => onBreadcrumbClick?.(index)}
            aria-current={index === breadcrumbs.length - 1 ? "page" : undefined}
          >
            {crumb.label}
          </button>
        </span>
      ))}
      {sessionState !== "idle" && (
        <span className="workspace-status" role="status">
          {sessionState === "error"
            ? "ATTENTION REQUIRED"
            : "ANALYSIS IN PROGRESS"}
        </span>
      )}
    </nav>
  );
});
