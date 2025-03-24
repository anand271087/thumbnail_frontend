import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, ImageIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Navigation from '../components/Navigation';

interface TrainingRequest {
  id: string;
  request_id: string;
  user_id: string;
  trigger_phrase: string;
  status: string;
  completion_percentage: number;
  created_at: string;
}

export default function RequestStatus() {
  const navigate = useNavigate();
  const [trainingRequests, setTrainingRequests] = useState<TrainingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingRequestId, setRefreshingRequestId] = useState<string | null>(null);

  useEffect(() => {
    fetchTrainingRequests();
  }, []);

  const fetchTrainingRequests = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/signin');
        return;
      }

      const { data, error } = await supabase
        .from('training_requests')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'COMPLETED')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrainingRequests(data || []);
    } catch (err) {
      console.error('Error fetching training requests:', err);
      setError('Failed to fetch training requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async (requestId: string) => {
    if (refreshing) return;

    setRefreshingRequestId(requestId);
    setRefreshing(true);
    setError(null);

    try {
      const response = await fetch(`/api/status/${requestId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Server error: ${response.status}. ${errorData.details || 'Unknown error'}`);
      }

      const statusResult = await response.json();
      await fetchTrainingRequests();

      if (statusResult.status?.toLowerCase() === 'FAILED') {
        setError('Training failed. Please try again.');
      }
    } catch (err) {
      console.error('Status check error:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh status. Please try again.');
    } finally {
      setRefreshing(false);
      setRefreshingRequestId(null);
    }
  };

  const handleGenerate = (requestId: string) => {
    navigate('/generate', { state: { requestId } });
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
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Completed Training Requests</h1>
            <button
              onClick={() => fetchTrainingRequests()}
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

          <div className="space-y-4">
            {trainingRequests.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No completed training requests yet</p>
            ) : (
              trainingRequests.map((request) => (
                <div
                  key={request.request_id}
                  className="border border-gray-200 rounded-lg p-4 space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">
                        {request.trigger_phrase}
                      </p>
                      <p className="text-sm text-gray-500">
                        Request ID: {request.request_id}
                      </p>
                      <p className="text-sm text-gray-500">
                        Created: {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {request.status.toUpperCase()}
                      </p>
                      <p className="text-sm text-gray-500">
                        {request.completion_percentage}%
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleGenerate(request.request_id)}
                    className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-purple-700 transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    <ImageIcon className="w-4 h-4" />
                    Generate Image
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}