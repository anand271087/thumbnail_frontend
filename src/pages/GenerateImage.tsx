import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Wand2, CheckCircle2, RefreshCw, Download, AlertCircle } from 'lucide-react';
import { supabase, checkImageGenerationLimit, getUserPlan } from '../lib/supabase';
import { endpoints, fetchWithError, checkStatusAndInsertImages } from '../lib/api';
import Navigation from '../components/Navigation';

interface GenerationResponse {
  status: string;
  completion_percentage: number;
  request_id: string;
  image_url?: string;
  message?: string;
}

interface GeneratedImage {
  id: string;
  request_id: string;
  image_url: string;
  created_at: string;
}

export default function GenerateImage() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialRequestId = location.state?.requestId;

  const [youtubeTitle, setYoutubeTitle] = useState('');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<GenerationResponse | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [userPlan, setUserPlan] = useState<any>(null);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    const setup = async () => {
      const plan = await getUserPlan();
      setUserPlan(plan);
      
      if (initialRequestId) {
        setCurrentRequestId(initialRequestId);
      }
    };
    setup();
  }, [initialRequestId]);

  const fetchGeneratedImages = async (requestId: string) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        navigate('/signin');
        return;
      }

      const { data, error } = await supabase
        .from('results')
        .select('*')
        .eq('request_id', requestId);

      if (error) {
        console.error('Error fetching results:', error);
        return;
      }

      if (data) {
        setGeneratedImages(data);
      }
    } catch (err) {
      console.error('Error fetching generated images:', err);
    }
  };

  const handleDownload = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `thumbnail-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading image:', err);
      setError('Failed to download image. Please try again.');
    }
  };

  const handleRefresh = async (requestId: string) => {
    if (!requestId || refreshing) return;

    setRefreshing(true);
    setError(null);

    try {
      // Use the combined status check and image insertion function
      const statusResult = await checkStatusAndInsertImages(requestId);

      // Handle both object and string responses
      const status = typeof statusResult === 'string' ? statusResult : statusResult.status;
      const completion_percentage = status?.toLowerCase() === 'completed' 
        ? 100 
        : (statusResult.completion_percentage || 0);

      setResponse({
        status: status || 'pending',
        completion_percentage,
        request_id: requestId,
        message: statusResult.message
      });

      // If status is completed, fetch the generated images
      if (status?.toLowerCase() === 'completed') {
        // Add a small delay to allow the database to update
        await new Promise(resolve => setTimeout(resolve, 1000));
        await fetchGeneratedImages(requestId);
      }
    } catch (err) {
      console.error('Status check error:', err);
      if (retryCount < MAX_RETRIES) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => handleRefresh(requestId), 2000); // Retry after 2 seconds
      } else {
        setError(err instanceof Error ? err.message : 'Failed to check status. Please try again.');
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeTitle || !gender) {
      setError('Please fill in all fields');
      return;
    }

    const canGenerate = await checkImageGenerationLimit();
    if (!canGenerate) {
      setError('You have reached your image generation limit. Please upgrade your plan to generate more images.');
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);
    setRetryCount(0);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/signin');
        return;
      }

      const requestBody = {
        request_id: initialRequestId,
        prompt: youtubeTitle,
        gender: gender,
        email: session.user.email
      };

      const result = await fetchWithError(endpoints.generateImage, {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      // Handle both object and string responses
      const newRequestId = typeof result === 'string' ? result : result.request_id;
      setCurrentRequestId(newRequestId);

      setResponse({
        status: 'pending',
        completion_percentage: 0,
        request_id: newRequestId,
        message: typeof result === 'string' ? result : result.message
      });
    } catch (err) {
      console.error('Generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!initialRequestId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4 flex items-center justify-center">
        <Navigation />
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
          <p className="text-red-500 text-center">No request ID provided</p>
          <button
            onClick={() => navigate('/upload')}
            className="mt-4 w-full bg-black text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-900"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4">
      <Navigation />
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Generate Thumbnail</h1>
            <p className="text-gray-600 mb-8">Training Request ID: {initialRequestId}</p>

            {userPlan && (
              <div className="mb-6 p-4 bg-purple-50 rounded-lg">
                <h3 className="font-semibold text-purple-900 mb-2">Your Plan Usage</h3>
                <div className="space-y-2">
                  <p className="text-sm text-purple-700">
                    Images Generated: {userPlan.images_generated} / {userPlan.image_limit}
                  </p>
                  <div className="h-2 bg-purple-200 rounded-full">
                    <div 
                      className="h-2 bg-purple-600 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${(userPlan.images_generated / userPlan.image_limit) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleGenerate} className="space-y-6">
              <div>
                <label htmlFor="youtube-title" className="block text-sm font-medium text-gray-700 mb-2">
                  YouTube Title
                </label>
                <input
                  type="text"
                  id="youtube-title"
                  value={youtubeTitle}
                  onChange={(e) => setYoutubeTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter your YouTube video title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setGender('Male')}
                    className={`px-4 py-2 rounded-lg border ${
                      gender === 'Male'
                        ? 'bg-purple-600 text-white border-transparent'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Male
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('Female')}
                    className={`px-4 py-2 rounded-lg border ${
                      gender === 'Female'
                        ? 'bg-purple-600 text-white border-transparent'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Female
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-500 p-4 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !youtubeTitle || !gender}
                className="w-full bg-black text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-900 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  'Generating...'
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    Generate Image
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Generation Status</h2>
              <button
                onClick={() => currentRequestId && handleRefresh(currentRequestId)}
                disabled={refreshing}
                className="p-2 text-gray-600 hover:text-gray-900 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh status"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {response && (
                  <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <p className="text-lg font-medium text-gray-900">{response.status}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Completion</p>
                      <div className="mt-2 relative">
                        <div className="h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-2 bg-purple-600 rounded-full transition-all duration-300"
                            style={{ width: `${response.completion_percentage}%` }}
                          />
                        </div>
                        <p className="absolute right-0 top-[-24px] text-sm text-gray-600">
                          {response.completion_percentage}%
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Request ID</p>
                      <p className="text-lg font-medium text-gray-900">{currentRequestId}</p>
                    </div>
                    {response.message && (
                      <div>
                        <p className="text-sm text-gray-600">Message</p>
                        <p className="text-lg font-medium text-gray-900">{response.message}</p>
                      </div>
                    )}
                  </div>
                )}
                
                {generatedImages.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Generated Images</h3>
                    <div className="grid grid-cols-1 gap-4">
                      {generatedImages.map((image) => (
                        <div key={image.id} className="relative group">
                          <button
                            onClick={() => handleDownload(image.image_url)}
                            className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-gray-50"
                            title="Download image"
                          >
                            <Download className="w-5 h-5 text-gray-700" />
                          </button>
                          <img 
                            src={image.image_url} 
                            alt="Generated thumbnail"
                            className="w-full rounded-lg shadow-sm"
                          />
                          <p className="mt-2 text-sm text-gray-500">
                            Generated on {new Date(image.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}