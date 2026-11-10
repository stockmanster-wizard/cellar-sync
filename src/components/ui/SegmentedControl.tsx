import React from 'react';

export interface SegmentedControlOption<T extends string = string> {
  label: string;
  value: T;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  size = 'sm',
  className = '',
}: SegmentedControlProps<T>) {
  const isSmall = size === 'sm';

  return (
    <div
      role="tablist"
      className={`inline-flex items-center p-1 rounded-lg bg-neutral-200/70 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 max-w-full ${
        isSmall ? 'h-9' : 'h-10'
      } ${className}`}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={`h-full flex-1 sm:flex-initial inline-flex items-center justify-center font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
              isSmall ? 'py-1 px-2.5 text-xs' : 'py-1.5 px-3.5 text-sm'
            } ${
              isActive
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
