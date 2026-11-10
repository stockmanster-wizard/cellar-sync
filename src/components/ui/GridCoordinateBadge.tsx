import React from 'react';

export interface GridCoordinateBadgeProps {
  type: 'col' | 'row';
  index: number | string;
  className?: string;
}

export const GridCoordinateBadge: React.FC<GridCoordinateBadgeProps> = ({
  type,
  index,
  className = '',
}) => {
  if (type === 'col') {
    return (
      <span
        className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-400 text-[11px] font-semibold tracking-wide uppercase select-none ${className}`}
      >
        Col {index}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center w-7 h-5 rounded-md bg-neutral-100/80 dark:bg-neutral-800/80 text-neutral-500 dark:text-neutral-400 text-[10px] font-bold tracking-tight uppercase tabular-nums select-none ${className}`}
    >
      R{index}
    </span>
  );
};

export default GridCoordinateBadge;
