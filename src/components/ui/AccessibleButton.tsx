import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation select-none',
  {
    variants: {
      variant: {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 active:bg-blue-800',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 active:bg-red-800',
        success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 active:bg-green-800',
        warning: 'bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500 active:bg-yellow-800',
        ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500 dark:text-gray-300 dark:hover:bg-gray-700',
        link: 'text-blue-600 hover:text-blue-700 focus:ring-blue-500 underline-offset-4 hover:underline',
      },
      size: {
        sm: 'px-3 py-1.5 text-sm min-h-[32px]',
        md: 'px-4 py-2 text-sm min-h-[36px]',
        lg: 'px-6 py-3 text-base min-h-[44px]',
        xl: 'px-8 py-4 text-lg min-h-[52px]',
        icon: 'p-2 min-h-[36px] min-w-[36px]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface AccessibleButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  ariaLabel?: string;
  ariaDescribedBy?: string;
  tooltip?: string;
}

export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({
    className,
    variant,
    size,
    loading = false,
    loadingText,
    icon,
    iconPosition = 'left',
    children,
    disabled,
    ariaLabel,
    ariaDescribedBy,
    tooltip,
    ...props
  }, ref) => {
    const isDisabled = disabled || loading;
    const hasIcon = !!icon;
    const hasChildren = !!children;

    return (
      <button
        ref={ref}
        className={clsx(buttonVariants({ variant, size }), className)}
        disabled={isDisabled}
        aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
        aria-describedby={ariaDescribedBy}
        title={tooltip}
        {...props}
      >
        {loading && (
          <svg
            className={clsx(
              'animate-spin',
              size === 'sm' ? 'h-3 w-3' : 
              size === 'lg' ? 'h-5 w-5' : 
              size === 'xl' ? 'h-6 w-6' : 
              'h-4 w-4',
              hasChildren && 'mr-2'
            )}
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
        )}

        {!loading && hasIcon && iconPosition === 'left' && (
          <span className={clsx('flex-shrink-0', hasChildren && 'mr-2')} aria-hidden="true">
            {icon}
          </span>
        )}

        {loading ? (
          <span>{loadingText || (typeof children === 'string' ? children : 'Loading...')}</span>
        ) : (
          children
        )}

        {!loading && hasIcon && iconPosition === 'right' && (
          <span className={clsx('flex-shrink-0', hasChildren && 'ml-2')} aria-hidden="true">
            {icon}
          </span>
        )}
      </button>
    );
  }
);

AccessibleButton.displayName = 'AccessibleButton';

// Specialized button components

export const IconButton = forwardRef<HTMLButtonElement, Omit<AccessibleButtonProps, 'size'> & { size?: 'sm' | 'md' | 'lg' }>(
  ({ size = 'md', children, ariaLabel, ...props }, ref) => {
    const iconSize = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';
    
    return (
      <AccessibleButton
        ref={ref}
        size="icon"
        ariaLabel={ariaLabel}
        className={clsx(
          size === 'sm' && 'min-h-[28px] min-w-[28px] p-1',
          size === 'lg' && 'min-h-[44px] min-w-[44px] p-3'
        )}
        {...props}
      >
        <span className={iconSize} aria-hidden="true">
          {children}
        </span>
      </AccessibleButton>
    );
  }
);

IconButton.displayName = 'IconButton';

export const FloatingActionButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <AccessibleButton
        ref={ref}
        size="lg"
        className={clsx(
          'fixed bottom-6 right-6 z-50 rounded-full shadow-lg hover:shadow-xl',
          'min-h-[56px] min-w-[56px] p-4',
          'transform transition-all duration-300 hover:scale-105 active:scale-95',
          className
        )}
        {...props}
      >
        {children}
      </AccessibleButton>
    );
  }
);

FloatingActionButton.displayName = 'FloatingActionButton';

// Button group component for related actions
export interface ButtonGroupProps {
  children: React.ReactNode;
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  ariaLabel?: string;
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  children,
  orientation = 'horizontal',
  size = 'md',
  className,
  ariaLabel,
}) => {
  return (
    <div
      className={clsx(
        'inline-flex',
        orientation === 'horizontal' ? 'flex-row' : 'flex-col',
        '[&>button]:rounded-none',
        '[&>button:first-child]:rounded-l-lg',
        '[&>button:last-child]:rounded-r-lg',
        orientation === 'vertical' && '[&>button:first-child]:rounded-t-lg [&>button:first-child]:rounded-l-none',
        orientation === 'vertical' && '[&>button:last-child]:rounded-b-lg [&>button:last-child]:rounded-r-none',
        '[&>button:not(:first-child)]:border-l-0',
        orientation === 'vertical' && '[&>button:not(:first-child)]:border-l [&>button:not(:first-child)]:border-t-0',
        className
      )}
      role="group"
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
};

// Toggle button component
export interface ToggleButtonProps extends Omit<AccessibleButtonProps, 'variant'> {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  pressedVariant?: AccessibleButtonProps['variant'];
  unpressedVariant?: AccessibleButtonProps['variant'];
}

export const ToggleButton = forwardRef<HTMLButtonElement, ToggleButtonProps>(
  ({
    pressed,
    onPressedChange,
    pressedVariant = 'primary',
    unpressedVariant = 'secondary',
    onClick,
    ariaLabel,
    ...props
  }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onPressedChange(!pressed);
      onClick?.(e);
    };

    return (
      <AccessibleButton
        ref={ref}
        variant={pressed ? pressedVariant : unpressedVariant}
        onClick={handleClick}
        aria-pressed={pressed}
        ariaLabel={ariaLabel}
        {...props}
      />
    );
  }
);

ToggleButton.displayName = 'ToggleButton';

export default AccessibleButton;