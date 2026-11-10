import React from 'react';

export interface InsightCardContainerProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Standardized responsive container for top-level cellar/tasting insight cards.
 * Stacks full-width on mobile (< 768px) so cards are never sliced off,
 * and transitions to an equal 3-column grid on tablet/desktop (md+).
 */
export const InsightCardContainer: React.FC<InsightCardContainerProps> = ({
  children,
  className = '',
}) => {
  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-6 w-full min-w-0 ${className}`.trim()}
    >
      {children}
    </div>
  );
};
