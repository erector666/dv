import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  TiltCard,
  StatsCard,
  FeatureCard,
  TestimonialCard,
} from './Card';
import { 
  Sparkles, 
  TrendingUp, 
  Users, 
  Zap, 
  Shield, 
  Heart,
  Star,
  Rocket
} from 'lucide-react';

/**
 * Card Showcase Component - Demonstrates all available card variants
 * Use this component to see all the different card styles available
 */
export const CardShowcase: React.FC = () => {
  return (
    <div className="p-8 space-y-12 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 min-h-screen">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
          🎨 Modern Card Showcase
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
          Explore our collection of modern, interactive card components with glassmorphism, 
          neon effects, gradients, and smooth animations.
        </p>
      </div>

      {/* Basic Variants */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Basic Variants</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card variant="default" className="h-32 flex items-center justify-center">
            <span className="text-lg font-semibold">Default</span>
          </Card>
          <Card variant="elevated" className="h-32 flex items-center justify-center">
            <span className="text-lg font-semibold">Elevated</span>
          </Card>
          <Card variant="outlined" className="h-32 flex items-center justify-center">
            <span className="text-lg font-semibold">Outlined</span>
          </Card>
          <Card variant="ghost" className="h-32 flex items-center justify-center">
            <span className="text-lg font-semibold">Ghost</span>
          </Card>
          <Card variant="primary" className="h-32 flex items-center justify-center">
            <span className="text-lg font-semibold">Primary</span>
          </Card>
          <Card variant="success" className="h-32 flex items-center justify-center">
            <span className="text-lg font-semibold">Success</span>
          </Card>
        </div>
      </section>

      {/* Glassmorphism Variants */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">🔥 Glassmorphism Effects</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card variant="glass" className="h-40 flex items-center justify-center backdrop-blur-xl">
            <div className="text-center">
              <Sparkles className="w-8 h-8 mx-auto mb-2 text-gray-700 dark:text-gray-300" />
              <span className="text-lg font-semibold text-gray-800 dark:text-gray-200">Glass</span>
            </div>
          </Card>
          <Card variant="glassBlue" className="h-40 flex items-center justify-center">
            <div className="text-center">
              <Sparkles className="w-8 h-8 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
              <span className="text-lg font-semibold text-blue-800 dark:text-blue-200">Glass Blue</span>
            </div>
          </Card>
          <Card variant="glassPurple" className="h-40 flex items-center justify-center">
            <div className="text-center">
              <Sparkles className="w-8 h-8 mx-auto mb-2 text-purple-600 dark:text-purple-400" />
              <span className="text-lg font-semibold text-purple-800 dark:text-purple-200">Glass Purple</span>
            </div>
          </Card>
        </div>
      </section>

      {/* Neon Glow Variants */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">🌟 Neon Glow Effects</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card variant="neonBlue" className="h-40 flex items-center justify-center">
            <div className="text-center">
              <Zap className="w-8 h-8 mx-auto mb-2 text-blue-400" />
              <span className="text-lg font-semibold">Neon Blue</span>
            </div>
          </Card>
          <Card variant="neonPurple" className="h-40 flex items-center justify-center">
            <div className="text-center">
              <Zap className="w-8 h-8 mx-auto mb-2 text-purple-400" />
              <span className="text-lg font-semibold">Neon Purple</span>
            </div>
          </Card>
          <Card variant="neonGreen" className="h-40 flex items-center justify-center">
            <div className="text-center">
              <Zap className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
              <span className="text-lg font-semibold">Neon Green</span>
            </div>
          </Card>
        </div>
      </section>

      {/* Gradient Variants */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">🎨 Vibrant Gradients</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card variant="gradientRainbow" className="h-40 flex items-center justify-center">
            <div className="text-center">
              <Heart className="w-8 h-8 mx-auto mb-2" />
              <span className="text-lg font-semibold">Rainbow</span>
            </div>
          </Card>
          <Card variant="gradientSunset" className="h-40 flex items-center justify-center">
            <div className="text-center">
              <Star className="w-8 h-8 mx-auto mb-2" />
              <span className="text-lg font-semibold">Sunset</span>
            </div>
          </Card>
          <Card variant="gradientOcean" className="h-40 flex items-center justify-center">
            <div className="text-center">
              <Rocket className="w-8 h-8 mx-auto mb-2" />
              <span className="text-lg font-semibold">Ocean</span>
            </div>
          </Card>
        </div>
      </section>

      {/* Special Effects */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">⚡ Special Effects</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card variant="electric" className="h-32 flex items-center justify-center">
            <span className="text-lg font-semibold">Electric</span>
          </Card>
          <Card variant="holographic" className="h-32 flex items-center justify-center">
            <span className="text-lg font-semibold">Holographic</span>
          </Card>
          <Card variant="floating" className="h-32 flex items-center justify-center">
            <span className="text-lg font-semibold text-gray-900 dark:text-white">Floating</span>
          </Card>
          <Card variant="neumorphism" className="h-32 flex items-center justify-center">
            <span className="text-lg font-semibold text-gray-900 dark:text-white">Neumorphism</span>
          </Card>
        </div>
      </section>

      {/* Professional Variants */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">🏢 Professional Modern</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card variant="modernDark" className="h-40 flex items-center justify-center">
            <div className="text-center">
              <Shield className="w-8 h-8 mx-auto mb-2" />
              <span className="text-lg font-semibold">Modern Dark</span>
            </div>
          </Card>
          <Card variant="modernLight" className="h-40 flex items-center justify-center">
            <div className="text-center">
              <Shield className="w-8 h-8 mx-auto mb-2 text-gray-700" />
              <span className="text-lg font-semibold text-gray-800">Modern Light</span>
            </div>
          </Card>
        </div>
      </section>

      {/* Specialty Components */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">🎯 Specialty Components</h2>
        
        {/* Tilt Cards */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Interactive Tilt Cards</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <TiltCard variant="glass" className="h-40 flex items-center justify-center">
              <div className="text-center">
                <Sparkles className="w-8 h-8 mx-auto mb-2 text-gray-700 dark:text-gray-300" />
                <span className="text-lg font-semibold text-gray-800 dark:text-gray-200">Hover me!</span>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">3D tilt effect</p>
              </div>
            </TiltCard>
            <TiltCard variant="neonBlue" className="h-40 flex items-center justify-center">
              <div className="text-center">
                <Zap className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                <span className="text-lg font-semibold">Interactive!</span>
                <p className="text-sm text-blue-300 mt-1">Move your mouse</p>
              </div>
            </TiltCard>
            <TiltCard variant="gradientRainbow" className="h-40 flex items-center justify-center">
              <div className="text-center">
                <Heart className="w-8 h-8 mx-auto mb-2" />
                <span className="text-lg font-semibold">Amazing!</span>
                <p className="text-sm text-pink-200 mt-1">3D perspective</p>
              </div>
            </TiltCard>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Stats Cards</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard
              icon={<Users className="w-6 h-6 text-indigo-600" />}
              label="Total Users"
              value="12,345"
              trend="up"
              trendValue="+12%"
            />
            <StatsCard
              icon={<TrendingUp className="w-6 h-6 text-indigo-600" />}
              label="Revenue"
              value="$45,678"
              trend="up"
              trendValue="+8%"
            />
            <StatsCard
              icon={<Zap className="w-6 h-6 text-indigo-600" />}
              label="Performance"
              value="98.5%"
              trend="neutral"
              trendValue="0%"
            />
          </div>
        </div>

        {/* Feature Cards */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Feature Cards</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Shield className="w-6 h-6" />}
              title="Security First"
              description="Enterprise-grade security with end-to-end encryption and advanced threat protection."
              gradient="blue"
            />
            <FeatureCard
              icon={<Rocket className="w-6 h-6" />}
              title="Lightning Fast"
              description="Optimized performance with edge computing and intelligent caching for instant responses."
              gradient="purple"
            />
            <FeatureCard
              icon={<Heart className="w-6 h-6" />}
              title="User Friendly"
              description="Intuitive design crafted with care, making complex tasks simple and enjoyable."
              gradient="pink"
            />
          </div>
        </div>

        {/* Testimonial Cards */}
        <div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Testimonial Cards</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TestimonialCard
              quote="This platform has completely transformed how we handle documents. The AI processing is incredibly accurate and fast!"
              author="Sarah Chen"
              role="Product Manager at TechCorp"
              avatar="S"
              rating={5}
            />
            <TestimonialCard
              quote="The modern interface and smooth animations make document management a pleasure. Highly recommended!"
              author="Michael Rodriguez"
              role="CEO at StartupXYZ"
              avatar="M"
              rating={5}
            />
          </div>
        </div>
      </section>

      {/* Usage Examples */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">📝 Usage Examples</h2>
        <Card variant="floating" padding="lg">
          <CardHeader>
            <CardTitle>How to Use These Cards</CardTitle>
            <CardDescription>
              Simply import the card variant you want and use it in your components
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 font-mono text-sm">
                <div className="text-green-600 dark:text-green-400">// Basic usage</div>
                <div>{`<Card variant="glass">Your content</Card>`}</div>
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 font-mono text-sm">
                <div className="text-green-600 dark:text-green-400">// Stats card</div>
                <div>{`<StatsCard 
  icon={<Users />}
  label="Users" 
  value="1,234"
  trend="up"
  trendValue="+10%"
/>`}</div>
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 font-mono text-sm">
                <div className="text-green-600 dark:text-green-400">// Interactive tilt</div>
                <div>{`<TiltCard variant="neonBlue">
  Hover for 3D effect!
</TiltCard>`}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default CardShowcase;