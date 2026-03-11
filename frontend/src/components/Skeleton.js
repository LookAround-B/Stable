import React from 'react';

/**
 * Lightweight Skeleton loader (inspired by MUI Skeleton)
 *
 * Props:
 *   variant  — 'text' | 'circular' | 'rectangular' | 'rounded'  (default: 'text')
 *   width    — CSS width   (number → px, string passed through)
 *   height   — CSS height  (number → px, string passed through)
 *   style    — extra inline styles
 *   className — extra class names
 *   animation — 'pulse' | 'wave' | false  (default: 'wave')
 */
const Skeleton = ({
  variant = 'text',
  width,
  height,
  style = {},
  className = '',
  animation = 'wave',
}) => {
  const cls = [
    'sk',
    `sk-${variant}`,
    animation ? `sk-${animation}` : '',
    className,
  ].filter(Boolean).join(' ');

  const w = typeof width === 'number' ? `${width}px` : width;
  const h = typeof height === 'number' ? `${height}px` : height;

  return (
    <span
      className={cls}
      style={{ width: w, height: h, ...style }}
    />
  );
};

/* ─── Pre-built skeleton layouts ────────────────────────────── */

/** Table skeleton: headers row + N data rows */
export const TableSkeleton = ({ cols = 5, rows = 5 }) => (
  <div className="sk-table-wrap">
    <div className="sk-table-header">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} variant="text" height={14} style={{ width: `${60 + Math.random() * 40}%` }} />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, r) => (
      <div className="sk-table-row" key={r}>
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton key={c} variant="text" height={12} style={{ width: `${50 + Math.random() * 40}%` }} />
        ))}
      </div>
    ))}
  </div>
);

/** Stats row skeleton: N small stat boxes */
export const StatsSkeleton = ({ count = 4 }) => (
  <div className="sk-stats">
    {Array.from({ length: count }).map((_, i) => (
      <div className="sk-stat-box" key={i}>
        <Skeleton variant="text" width="60%" height={12} />
        <Skeleton variant="text" width="40%" height={20} />
      </div>
    ))}
  </div>
);

/** Card grid skeleton: N cards with optional image area */
export const CardGridSkeleton = ({ count = 6, withImage = false }) => (
  <div className="sk-card-grid">
    {Array.from({ length: count }).map((_, i) => (
      <div className="sk-card" key={i}>
        {withImage && <Skeleton variant="rectangular" width="100%" height={120} />}
        <div className="sk-card-body">
          <Skeleton variant="text" width="70%" height={14} />
          <Skeleton variant="text" width="90%" height={11} />
          <Skeleton variant="text" width="50%" height={11} />
          <Skeleton variant="text" width="80%" height={11} />
        </div>
      </div>
    ))}
  </div>
);

/** Card list skeleton: N stacked cards (like tasks) */
export const CardListSkeleton = ({ count = 4 }) => (
  <div className="sk-card-list">
    {Array.from({ length: count }).map((_, i) => (
      <div className="sk-card-row" key={i}>
        <div className="sk-card-row-header">
          <Skeleton variant="text" width="40%" height={14} />
          <Skeleton variant="rounded" width={60} height={20} />
        </div>
        <Skeleton variant="text" width="100%" height={1} style={{ opacity: 0.2, marginBlock: 8 }} />
        <Skeleton variant="text" width="60%" height={11} />
        <Skeleton variant="text" width="80%" height={11} />
        <Skeleton variant="text" width="45%" height={11} />
      </div>
    ))}
  </div>
);

/** Page skeleton: header + optional filter bar + content skeleton */
export const PageSkeleton = ({ children }) => (
  <div className="sk-page">
    <div className="sk-page-header">
      <Skeleton variant="text" width={180} height={22} />
      <Skeleton variant="text" width={260} height={12} />
    </div>
    {children}
  </div>
);

export default Skeleton;
