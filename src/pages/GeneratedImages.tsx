import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Navigation from '../components/Navigation';

interface GeneratedImage {
  id: string;
  request_id: string;
  image_url: string;
  created_at: string;
}

export default function GeneratedImages() {
  const navigate = useNavigate();
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchGeneratedImages();
  }, []);

  const fetchGeneratedImages = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        navigate('/signin');
        return;
      }

      const { data, error } = await supabase
        .from('results')
        .select('*')
        .eq('user_id', session.session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching results:', error);
        throw error;
      }

      setGeneratedImages(data || []);
    } catch (err) {
      console.error('Error fetching generated images:', err);
      setError('Failed to fetch generated images. Please try again.');
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4 flex items-center justify-center">
        <Navigation />
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4">
      <Navigation />
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Generated Images</h1>
              <p className="text-gray-600 mt-2">View all your generated thumbnails</p>
            </div>
            <button
              onClick={fetchGeneratedImages}
              disabled={refreshing}
              className="p-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
              title="Refresh list"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          {generatedImages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No generated images yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {generatedImages.map((image) => (
                <div
                  key={image.id}
                  className="relative group rounded-lg overflow-hidden shadow-md"
                >
                  <img
                    src={image.image_url}
                    alt="Generated thumbnail"
                    className="w-full aspect-video object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <button
                      onClick={() => handleDownload(image.image_url)}
                      className="bg-white text-gray-900 p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
                      title="Download image"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-4 bg-white">
                    <p className="text-sm text-gray-500">
                      Generated on {new Date(image.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-500">
                      Request ID: {image.request_id}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}