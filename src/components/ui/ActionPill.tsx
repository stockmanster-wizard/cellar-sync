/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export interface ActionPillProps {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  fullWidth?: boolean;
  title?: string;
}

export const ActionPill: React.FC<ActionPillProps> = ({
  label,
  icon,
  onClick,
  fullWidth = true,
  title,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`${
        fullWidth ? 'w-full' : ''
      } py-1.5 px-2 rounded-lg border border-neutral-200 dark:border-neutral-750 bg-neutral-50 dark:bg-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-200 shadow-xs flex items-center justify-center gap-1.5 min-w-0 active:bg-neutral-100 dark:active:bg-neutral-700 transition-colors cursor-pointer`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
};

export const SecondaryActionPill = ActionPill;
