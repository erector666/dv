import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';

const cardVariants = cva(
  'rounded-2xl border transition-all duration-300 ease-out hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-br from-white to-gray-50 border-gray-200/60 shadow-md dark:from-gray-800 dark:to-gray-850 dark:border-gray-700/60 dark:shadow-xl',
        elevated:
          'bg-gradient-to-br from-white to-gray-50 border-gray-200/60 shadow-lg dark:from-gray-800 dark:to-gray-850 dark:border-gray-700/60 dark:shadow-2xl',
        outlined: 
          'bg-gradient-to-br from-transparent to-gray-50/50 border-2 border-gray-300 dark:border-gray-600 dark:from-transparent dark:to-gray-800/50',
        ghost: 'bg-transparent border-transparent hover:bg-gray-50/80 dark:hover:bg-gray-800/50',
        primary:
          'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200/60 shadow-md dark:from-blue-900/20 dark:to-indigo-900/20 dark:border-blue-700/60',
        success:
          'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200/60 shadow-md dark:from-green-900/20 dark:to-emerald-900/20 dark:border-green-700/60',
      },
      padding: {
        none: 'p-0',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
        xl: 'p-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(cardVariants({ variant, padding }), className)}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

// Card Header
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`flex flex-col space-y-1.5 pb-4 ${className}`}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

// Card Title
const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => (
  <h3
    ref={ref}
    className={`text-xl font-bold leading-tight tracking-tight bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent ${className}`}
    aria-label={typeof children === 'string' ? children : undefined}
    {...props}
  >
    {children}
  </h3>
));
CardTitle.displayName = 'CardTitle';

// Card Description
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={`text-sm leading-relaxed text-gray-600 dark:text-gray-300 ${className}`}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

// Card Content
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={`pt-0 ${className}`} {...props} />
));
CardContent.displayName = 'CardContent';

// Card Footer
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={`flex items-center pt-4 ${className}`} {...props} />
));
CardFooter.displayName = 'CardFooter';

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
