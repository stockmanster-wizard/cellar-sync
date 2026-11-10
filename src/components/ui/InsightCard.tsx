import React from 'react';

export interface InsightCardProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

/**
 * Standardized responsive card shell for cellar and palate intelligence highlights.
 * Uses fluid width with min-w-0 to prevent flex/grid blowout and pins footer actions to the bottom.
 */
export const InsightCard: React.FC<InsightCardProps> = ({
  children,
  footer,
  className = '',
}) => {
  return (
    <div
      className={`w-full min-w-0 rounded-2xl bg-white border border-slate-200 shadow-xs p-3.5 md:p-4 flex flex-col justify-between ${className}`.trim()}
    >
      <div className="min-w-0">{children}</div>
      {footer && (
        <div className="mt-3 pt-2.5 border-t border-slate-100">{footer}</div>
      )}
    </div>
  );
};
