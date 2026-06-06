"use client";

import type { CSSProperties, MouseEventHandler } from "react";

type Props = {
  href?: string | null;
  download?: string;
  label?: string;
  title?: string;
  iconOnly?: boolean;
  onClick?: () => void;
};

const baseStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  height: 26,
  padding: "0 9px",
  background: "var(--bg-hover)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  color: "var(--text-muted)",
  cursor: "pointer",
  fontSize: 11,
  fontWeight: 600,
  lineHeight: 1,
  textDecoration: "none",
  flexShrink: 0,
};

const iconOnlyStyle: CSSProperties = {
  width: 28,
  height: 28,
  padding: 0,
};

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function styleFor(iconOnly?: boolean): CSSProperties {
  return iconOnly ? { ...baseStyle, ...iconOnlyStyle } : baseStyle;
}

const handleEnter: MouseEventHandler<HTMLElement> = (e) => {
  e.currentTarget.style.background = "var(--bg-selected)";
  e.currentTarget.style.color = "var(--accent)";
  e.currentTarget.style.borderColor = "rgba(37,99,235,0.35)";
};

const handleLeave: MouseEventHandler<HTMLElement> = (e) => {
  e.currentTarget.style.background = "var(--bg-hover)";
  e.currentTarget.style.color = "var(--text-muted)";
  e.currentTarget.style.borderColor = "var(--border)";
};

export function DownloadButton({
  href,
  download,
  label = "Download",
  title,
  iconOnly,
  onClick,
}: Props) {
  const content = (
    <>
      <DownloadIcon />
      {!iconOnly && <span>{label}</span>}
    </>
  );
  const resolvedTitle = title ?? label;

  if (href) {
    return (
      <a
        href={href}
        download={download}
        title={resolvedTitle}
        aria-label={resolvedTitle}
        style={styleFor(iconOnly)}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        {content}
      </a>
    );
  }

  if (!onClick) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      title={resolvedTitle}
      aria-label={resolvedTitle}
      style={styleFor(iconOnly)}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {content}
    </button>
  );
}
