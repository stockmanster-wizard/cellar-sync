import React from 'react';

export interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div
      className={`animate-pulse rounded bg-zinc-200 dark:bg-zinc-700/60 ${className}`.trim()}
      aria-hidden="true"
    />
  );
};

export default Skeleton;
