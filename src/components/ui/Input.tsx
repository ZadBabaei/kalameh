'use client';

import { forwardRef, InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', id, ...rest }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[#f0e6d3]"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute inset-y-0 left-3 flex items-center text-[#a89b8c] pointer-events-none">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            suppressHydrationWarning
            className={[
              'w-full rounded-lg border bg-[#2a2035] px-3 py-2 text-sm text-[#f0e6d3]',
              'placeholder:text-[#a89b8c]',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              error
                ? 'border-[#e74c3c] focus:ring-[#e74c3c]'
                : 'border-[#3d3248] focus:ring-[#f5a623] focus:border-[#f5a623] focus:shadow-[0_0_8px_rgba(245,166,35,0.3)]',
              icon ? 'pl-10' : '',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            {...rest}
          />
        </div>
        {error && (
          <p className="text-xs text-[#e74c3c]" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
