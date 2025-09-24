import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { useId } from '../../hooks/useAccessibility';

const buttonVariants = cva(
  // Base styles
  'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary:
          'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 shadow-soft hover:shadow-medium',
        secondary:
          'bg-secondary-100 text-secondary-900 hover:bg-secondary-200 focus:ring-secondary-500 dark:bg-secondary-800 dark:text-secondary-100 dark:hover:bg-secondary-700',
        outline:
          'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700',
        ghost:
          'text-gray-700 hover:bg-gray-100 focus:ring-gray-500 dark:text-gray-200 dark:hover:bg-gray-800',
        danger:
          'bg-danger-600 text-white hover:bg-danger-700 focus:ring-danger-500 shadow-soft hover:shadow-medium',
        success:
          'bg-success-600 text-white hover:bg-success-700 focus:ring-success-500 shadow-soft hover:shadow-medium',
      },
      size: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg',
        xl: 'px-8 py-4 text-xl',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  // Enhanced accessibility props
  ariaLabel?: string;
  ariaDescribedBy?: string;
  loadingText?: string;
  tooltip?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      loading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ariaLabel,
      ariaDescribedBy,
      loadingText = 'Loading...',
      tooltip,
      ...props
    },
    ref
  ) => {
    const loadingId = useId('loading');
    const tooltipId = useId('tooltip');
    return (
      <div className="relative inline-block">
        <button
          className={clsx(
            buttonVariants({ variant, size }),
            fullWidth && 'w-full',
            className
          )}
          ref={ref}
          disabled={disabled || loading}
          aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
          aria-describedby={clsx(
            loading && loadingId,
            tooltip && tooltipId,
            ariaDescribedBy
          )}
          aria-busy={loading}
          role="button"
          tabIndex={disabled && !loading ? -1 : 0}
          {...props}
        >
          {loading && (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span id={loadingId} className="sr-only">
                {loadingText}
              </span>
            </>
          )}

        {!loading && leftIcon && <span className="mr-2">{leftIcon}</span>}

        {children}

          {!loading && rightIcon && <span className="ml-2">{rightIcon}</span>}
        </button>
        
        {/* Tooltip */}
        {tooltip && (
          <div
            id={tooltipId}
            role="tooltip"
            className="absolute z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-sm rounded-lg py-2 px-3 whitespace-nowrap pointer-events-none"
          >
            {tooltip}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
          </div>
        )}
      </div>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
