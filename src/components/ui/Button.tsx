import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'outline',
  size = 'sm',
  icon,
  children,
  className = '',
  type = 'button',
  ...rest
}) => {
  const sizeClasses =
    size === 'sm'
      ? 'h-9 py-1.5 px-2.5 text-xs rounded-lg gap-1.5'
      : 'h-10 py-2.5 px-4 text-sm rounded-xl gap-2';

  const variantClasses =
    variant === 'primary'
      ? 'bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 border border-transparent shadow-xs'
      : variant === 'ghost'
      ? 'bg-transparent text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800'
      : 'border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-750 text-neutral-700 dark:text-neutral-200 shadow-2xs active:bg-neutral-100';

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center font-medium transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses} ${variantClasses} ${className}`}
      {...rest}
    >
      {icon && <span className="shrink-0 inline-flex items-center">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};

export default Button;
