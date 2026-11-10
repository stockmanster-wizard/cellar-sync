import React from 'react';

export interface FormFieldProps {
  label: string;
  required?: boolean;
  helperText?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required = false,
  helperText,
  children,
  className = '',
}) => {
  return (
    <div className={`flex flex-col gap-1.5 mb-4 ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <label className="text-xs font-bold text-neutral-900 dark:text-white">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        {helperText && (
          <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
            {helperText}
          </span>
        )}
      </div>
      {children}
    </div>
  );
};

export default FormField;
