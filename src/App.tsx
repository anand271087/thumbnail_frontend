import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, Palette, Share2, Check, Zap, Users, Clock, Download, Shield, Settings, ListFilter, Image } from 'lucide-react';
import { supabase, getUserPlan } from './lib/supabase';

function App() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/signin');
      } else {
        setDisplayName(session.user.user_metadata.display_name);
        const plan = await getUserPlan();
        setIsAdmin(plan?.is_admin || false);
      }
    };
    
    checkUser();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/signin');
  };

  const handleStartCreating = () => {
    navigate('/upload');
  };

  const handleSubscribe = async (planType: 'starter' | 'creator' | 'pro') => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/signin');
        return;
      }

      const planLimits = {
        starter: { face: 1, image: 10 },
        creator: { face: 1, image: 25 },
        pro: { face: 3, image: 100 }
      };

      const { error: upsertError } = await supabase
        .from('user_plans')
        .upsert({
          user_id: session.user.id,
          plan_type: planType,
          face_training_limit: planLimits[planType].face,
          image_limit: planLimits[planType].image,
          subscription_start: new Date().toISOString(),
          subscription_end: planType === 'starter' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          face_training_used: 0,
          images_generated: 0
        }, {
          onConflict: 'user_id'
        });

      if (upsertError) throw upsertError;

      navigate('/upload');
    } catch (err) {
      console.error('Error subscribing to plan:', err);
      setError('Failed to subscribe to plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Navigation */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="text-gray-600">
            {displayName && (
              <span className="font-medium">{displayName}</span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/requests')}
              className="flex items-center gap-2 text-purple-600 hover:text-purple-800 font-medium"
            >
              <ListFilter className="w-5 h-5" />
              View Requests
            </button>
            <button
              onClick={() => navigate('/generated-images')}
              className="flex items-center gap-2 text-purple-600 hover:text-purple-800 font-medium"
            >
              <Image className="w-5 h-5" />
              View Images
            </button>
            {isAdmin && (
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center gap-2 text-purple-600 hover:text-purple-800 font-medium"
              >
                <Settings className="w-5 h-5" />
                Admin Panel
              </button>
            )}
            <button
              onClick={handleSignOut}
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-6">
            Create Stunning YouTube Thumbnails
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Design eye-catching thumbnails that drive more clicks. Simple, fast, and professional.
          </p>
          <button 
            onClick={handleStartCreating}
            className="bg-black text-white px-8 py-4 rounded-full text-lg font-medium hover:bg-gray-900 transition-colors duration-200 flex items-center gap-2 mx-auto"
          >
            Start Creating Now
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Preview Image */}
        <div className="mt-16 relative">
          <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl">
            <img
              src="https://images.unsplash.com/photo-1626908013351-800ddd734b8a?auto=format&fit=crop&w=2000&q=80"
              alt="Thumbnail Preview"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-gradient-to-b from-white to-gray-50 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-16">
            Create with Confidence
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <FeatureCard
              icon={<Sparkles className="w-8 h-8" />}
              title="AI-Powered Templates"
              description="Access hundreds of professionally designed templates optimized for engagement."
            />
            <FeatureCard
              icon={<Palette className="w-8 h-8" />}
              title="Custom Branding"
              description="Maintain consistency with your brand using custom colors and fonts."
            />
            <FeatureCard
              icon={<Share2 className="w-8 h-8" />}
              title="One-Click Export"
              description="Download in perfect YouTube dimensions or share directly to your channel."
            />
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-gray-600">Choose the plan that works best for your content creation needs</p>
          </div>

          {error && (
            <div className="max-w-md mx-auto mb-8 bg-red-50 text-red-500 p-4 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Starter Plan */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-gray-100 hover:border-purple-500 transition-colors duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold">Starter Plan</h3>
                <div className="p-2 bg-purple-100 rounded-full">
                  <Zap className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <div className="mb-6">
                <p className="text-4xl font-bold">$10</p>
                <p className="text-gray-600">Includes 1 face training</p>
              </div>
              <ul className="space-y-4 mb-8">
                <PricingFeature text="10 thumbnails included" />
                <PricingFeature text="No subscription" />
                <PricingFeature text="Perfect for occasional creators" />
                <PricingFeature text="Extra face training: $10 each" />
              </ul>
              <button
                onClick={() => handleSubscribe('starter')}
                disabled={loading}
                className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-900 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Get Started'}
              </button>
            </div>

            {/* Creator Plan */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-purple-500 relative transform hover:-translate-y-1 transition-transform duration-300">
              <div className="absolute top-0 right-8 -translate-y-1/2">
                <span className="bg-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium">Popular</span>
              </div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold">Creator Plan</h3>
                <div className="p-2 bg-purple-100 rounded-full">
                  <Palette className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <div className="mb-6">
                <p className="text-4xl font-bold">$14.99<span className="text-lg text-gray-600">/month</span></p>
                <p className="text-gray-600">Includes 1 face training</p>
              </div>
              <ul className="space-y-4 mb-8">
                <PricingFeature text="25 thumbnails/month included" />
                <PricingFeature text="$0.50 per extra thumbnail" />
                <PricingFeature text="Cancel anytime" />
                <PricingFeature text="Priority thumbnail generation" />
                <PricingFeature text="Extra face training: $10 each" />
              </ul>
              <button
                onClick={() => handleSubscribe('creator')}
                disabled={loading}
                className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Subscribe Now'}
              </button>
            </div>

            {/* Pro Team Plan */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-gray-100 hover:border-purple-500 transition-colors duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold">Pro Team Plan</h3>
                <div className="p-2 bg-purple-100 rounded-full">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <div className="mb-6">
                <p className="text-4xl font-bold">$59<span className="text-lg text-gray-600">/month</span></p>
                <p className="text-gray-600">Includes 3 face training</p>
              </div>
              <ul className="space-y-4 mb-8">
                <PricingFeature text="100 thumbnails/month included" />
                <PricingFeature text="$0.50 per extra thumbnail" />
                <PricingFeature text="Great for YouTube teams, editors" />
                <PricingFeature text="Bulk download access" />
                <PricingFeature text="Extra face training: $10 each" />
              </ul>
              <button
                onClick={() => handleSubscribe('pro')}
                disabled={loading}
                className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-900 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Join the Team Plan'}
              </button>
            </div>
          </div>

          {/* Why Choose Us */}
          <div className="mt-24">
            <h3 className="text-3xl font-bold text-center mb-12">Why Choose Us?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <WhyChooseUsCard
                icon={<Users className="w-6 h-6" />}
                title="100% Personalized"
                description="Your face on every thumbnail"
              />
              <WhyChooseUsCard
                icon={<Sparkles className="w-6 h-6" />}
                title="AI-Powered Designs"
                description="Professional look, zero effort"
              />
              <WhyChooseUsCard
                icon={<Download className="w-6 h-6" />}
                title="Affordable & Scalable"
                description="Plans for all types of creators"
              />
              <WhyChooseUsCard
                icon={<Shield className="w-6 h-6" />}
                title="24/7 Support"
                description="We're here for you"
              />
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-black text-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Transform Your Thumbnails?
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            Join thousands of content creators who trust our platform
          </p>
          <button 
            onClick={handleStartCreating}
            className="bg-white text-black px-8 py-4 rounded-full text-lg font-medium hover:bg-gray-100 transition-colors duration-200"
          >
            Get Started for Free
          </button>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-200">
      <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-4">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function PricingFeature({ text }) {
  return (
    <li className="flex items-center gap-3">
      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
      <span className="text-gray-600">{text}</span>
    </li>
  );
}

function WhyChooseUsCard({ icon, title, description }) {
  return (
    <div className="text-center">
      <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
        <div className="text-purple-600">
          {icon}
        </div>
      </div>
      <h4 className="text-lg font-semibold mb-2">{title}</h4>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

export default App;