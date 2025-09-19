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
        
        // 🔥 MODERN GLASSMORPHISM VARIANTS
        glass:
          'bg-white/20 dark:bg-gray-800/20 border border-white/30 dark:border-gray-700/30 shadow-2xl hover:bg-white/30 dark:hover:bg-gray-800/30 hover:shadow-3xl backdrop-blur-sm',
        glassBlue:
          'bg-gradient-to-br from-blue-500/20 to-cyan-500/20 dark:from-blue-600/20 dark:to-cyan-600/20 border border-blue-300/40 dark:border-blue-400/30 shadow-2xl hover:from-blue-500/30 hover:to-cyan-500/30 backdrop-blur-sm',
        glassPurple:
          'bg-gradient-to-br from-purple-500/20 to-pink-500/20 dark:from-purple-600/20 dark:to-pink-600/20 border border-purple-300/40 dark:border-purple-400/30 shadow-2xl hover:from-purple-500/30 hover:to-pink-500/30 backdrop-blur-sm',
        
        // 🌟 NEON GLOW VARIANTS
        neonBlue:
          'bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-blue-500 shadow-blue-500/50 shadow-2xl hover:shadow-blue-500/75 hover:border-blue-400 text-white',
        neonPurple:
          'bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-purple-500 shadow-purple-500/50 shadow-2xl hover:shadow-purple-500/75 hover:border-purple-400 text-white',
        neonGreen:
          'bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-emerald-500 shadow-emerald-500/50 shadow-2xl hover:shadow-emerald-500/75 hover:border-emerald-400 text-white',
        
        // 🎨 VIBRANT GRADIENT VARIANTS
        gradientRainbow:
          'bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 border-0 shadow-2xl text-white hover:shadow-3xl',
        gradientSunset:
          'bg-gradient-to-br from-orange-400 via-red-500 to-pink-500 border-0 shadow-2xl text-white hover:shadow-3xl',
        gradientOcean:
          'bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 border-0 shadow-2xl text-white hover:shadow-3xl',
        
        // ⚡ ELECTRIC & ANIMATED VARIANTS
        electric:
          'bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 border-2 border-yellow-300 shadow-2xl text-white animate-pulse',
        holographic:
          'bg-gradient-to-br from-cyan-300 via-blue-500 to-pink-500 border-0 shadow-2xl text-white hover:shadow-3xl',
        
        // 🏢 PROFESSIONAL MODERN VARIANTS
        modernDark:
          'bg-gradient-to-br from-gray-900 to-black border border-gray-700 shadow-2xl text-white hover:border-gray-600',
        modernLight:
          'bg-gradient-to-br from-white to-gray-100 border border-gray-200 shadow-xl hover:shadow-2xl hover:border-gray-300',
        
        // 🎯 SPECIAL EFFECT VARIANTS
        floating:
          'bg-white dark:bg-gray-800 border-0 shadow-2xl hover:shadow-3xl hover:-translate-y-1',
        neumorphism:
          'bg-gray-100 dark:bg-gray-800 border-0 shadow-inner hover:shadow-lg',
        
        // 📊 STATS & DATA VARIANTS
        statsCard:
          'bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950 dark:to-blue-950 border border-indigo-200/60 dark:border-indigo-800/60 shadow-lg hover:shadow-xl hover:shadow-indigo-500/20 dark:hover:shadow-indigo-500/10 hover:scale-[1.02]',
        metricCard:
          'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 border border-emerald-200/60 dark:border-emerald-800/60 shadow-lg hover:shadow-xl hover:shadow-emerald-500/20 dark:hover:shadow-emerald-500/10 hover:scale-[1.02]',
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

// 🎨 SPECIALTY CARD COMPONENTS

// Interactive Tilt Card with 3D effect
const TiltCard = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, ...props }, ref) => {
    const [tilt, setTilt] = React.useState({ x: 0, y: 0 });
    const cardRef = React.useRef<HTMLDivElement>(null);

    const handleMouseMove = (e: React.MouseEvent) => {
      if (!cardRef.current) return;
      
      const rect = cardRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const tiltX = (e.clientY - centerY) / 10;
      const tiltY = (centerX - e.clientX) / 10;
      
      setTilt({ x: tiltX, y: tiltY });
    };

    const handleMouseLeave = () => {
      setTilt({ x: 0, y: 0 });
    };

    return (
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        }}
        className={clsx(
          'transition-transform duration-300 ease-out transform-gpu',
          cardVariants(props),
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
TiltCard.displayName = 'TiltCard';

// Animated Stats Card
const StatsCard = React.forwardRef<
  HTMLDivElement,
  CardProps & {
    icon?: React.ReactNode;
    label?: string;
    value?: string | number;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
  }
>(({ className, icon, label, value, trend, trendValue, variant, ...props }, ref) => {
  const trendColors: Record<'up' | 'down' | 'neutral', string> = {
    up: 'text-green-600 dark:text-green-400',
    down: 'text-red-600 dark:text-red-400',
    neutral: 'text-gray-600 dark:text-gray-400',
  };

  const trendIcons: Record<'up' | 'down' | 'neutral', string> = {
    up: '↗️',
    down: '↘️',
    neutral: '➡️',
  };

  return (
    <Card
      ref={ref}
      variant={variant || "statsCard"}
      className={clsx('group cursor-pointer', className)}
      {...props}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={clsx(
          'p-3 rounded-xl group-hover:scale-110 transition-transform duration-200',
          variant?.includes('neon') ? 'bg-white/10' : 'bg-indigo-100 dark:bg-indigo-900/50'
        )}>
          {icon}
        </div>
        {trend && trendValue && (
          <div className={clsx('flex items-center space-x-1 text-sm font-medium', trendColors[trend as keyof typeof trendColors])}>
            <span>{trendIcons[trend as keyof typeof trendIcons]}</span>
            <span>{trendValue}</span>
          </div>
        )}
      </div>
      <div>
        <p className={clsx(
          'text-2xl font-bold mb-1 transition-colors',
          variant?.includes('neon') || variant?.includes('gradient') 
            ? 'text-white' 
            : 'text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
        )}>
          {value}
        </p>
        <p className={clsx(
          'text-sm',
          variant?.includes('neon') || variant?.includes('gradient')
            ? 'text-gray-200'
            : 'text-gray-600 dark:text-gray-400'
        )}>{label}</p>
      </div>
    </Card>
  );
});
StatsCard.displayName = 'StatsCard';

// Feature Card with Icon
const FeatureCard = React.forwardRef<
  HTMLDivElement,
  CardProps & {
    icon?: React.ReactNode;
    title?: string;
    description?: string;
    gradient?: 'blue' | 'purple' | 'green' | 'orange' | 'pink';
  }
>(({ className, icon, title, description, gradient = 'blue', ...props }, ref) => {
  const gradientClasses: Record<'blue' | 'purple' | 'green' | 'orange' | 'pink', string> = {
    blue: 'from-blue-500 to-cyan-500',
    purple: 'from-purple-500 to-pink-500',
    green: 'from-green-500 to-emerald-500',
    orange: 'from-orange-500 to-red-500',
    pink: 'from-pink-500 to-rose-500',
  };

  return (
    <Card
      ref={ref}
      variant="floating"
      className={clsx('group cursor-pointer overflow-hidden', className)}
      {...props}
    >
      <div className={clsx('absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-300', gradientClasses[gradient as keyof typeof gradientClasses])} />
      <div className="relative">
        <div className={clsx('inline-flex p-3 rounded-xl bg-gradient-to-br text-white mb-4 group-hover:scale-110 transition-transform duration-200', gradientClasses[gradient as keyof typeof gradientClasses])}>
          {icon}
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
          {title}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          {description}
        </p>
      </div>
    </Card>
  );
});
FeatureCard.displayName = 'FeatureCard';

// Testimonial Card
const TestimonialCard = React.forwardRef<
  HTMLDivElement,
  CardProps & {
    quote?: string;
    author?: string;
    role?: string;
    avatar?: string;
    rating?: number;
  }
>(({ className, quote, author, role, avatar, rating = 5, ...props }, ref) => {
  return (
    <Card
      ref={ref}
      variant="glass"
      className={clsx('group cursor-pointer', className)}
      {...props}
    >
      <div className="mb-4">
        <div className="flex mb-2">
          {[...Array(5)].map((_, i) => (
            <span
              key={i}
              className={clsx(
                'text-lg',
                i < rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'
              )}
            >
              ⭐
            </span>
          ))}
        </div>
        <blockquote className="text-gray-700 dark:text-gray-300 italic leading-relaxed">
          "{quote}"
        </blockquote>
      </div>
      <div className="flex items-center">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold mr-3 group-hover:scale-110 transition-transform duration-200">
          {avatar || author?.charAt(0) || '?'}
        </div>
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">{author}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{role}</p>
        </div>
      </div>
    </Card>
  );
});
TestimonialCard.displayName = 'TestimonialCard';

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  TiltCard,
  StatsCard,
  FeatureCard,
  TestimonialCard,
};
