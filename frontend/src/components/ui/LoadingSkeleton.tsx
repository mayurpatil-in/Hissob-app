import React from 'react';

export interface LoadingSkeletonProps {
  type?: 'card' | 'table' | 'list';
  count?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  type = 'card',
  count = 3,
  height = 100,
  className = '',
  style,
}) => {
  if (type === 'table') {
    return (
      <div className={`hissob-skeleton-table ${className}`} style={{ width: '100%', ...style }}>
        <div className="hissob-shimmer" style={{ height: 40, width: '100%', marginBottom: 12, borderRadius: 8 }} />
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="hissob-shimmer" style={{ height: 32, width: '100%', marginBottom: 8, opacity: 0.7 - i * 0.1, borderRadius: 6 }} />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`hissob-skeleton-grid ${className}`}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fill, minmax(220px, 1fr))`,
        gap: 16,
        width: '100%',
        ...style,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="hissob-shimmer"
          style={{ height, borderRadius: 12, padding: 16 }}
        />
      ))}
    </div>
  );
};

export default LoadingSkeleton;
