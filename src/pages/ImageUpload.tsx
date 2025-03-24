import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Upload, Wand2, RefreshCw, Image as ImageIcon, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import { supabase, checkFaceTrainingLimit, getUserPlan } from '../lib/supabase';
import { endpoints, fetchWithError } from '../lib/api';
import Navigation from '../components/Navigation';

interface TrainingRequest {
  id: string;
  request_id: string;
  user_name: string;
  trigger_phrase: string;
  status: string;
  completion_percentage: number;
  safe_tensors: string;
}

export default function ImageUpload() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [triggerPhrase, setTriggerPhrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [trainingRequests, setTrainingRequests] = useState<TrainingRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingRequestId, setRefreshingRequestId] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<any>(null);
  const [fileUploaded, setFileUploaded] = useState(false);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  const MAX_RETRIES = 3;

  useEffect(() => {
    fetchTrainingRequests();
    loadUserPlan();
  }, []);

  useEffect(() => {
    if (userPlan) {
      setLimitReached(userPlan.face_training_used >= userPlan.face_training_limit);
    }
  }, [userPlan]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (currentRequestId) {
      intervalId = setInterval(async () => {
        try {
          const result = await fetchWithError(endpoints.status(currentRequestId), {
            method: 'GET',
          });
          
          if (result.status?.toLowerCase() === 'completed') {
            clearInterval(intervalId);
            fetchTrainingRequests();
          } else if (result.status?.toLowerCase() === 'failed') {
            setError('Training failed. Please try again.');
            clearInterval(intervalId);
          }
        } catch (err) {
          console.error('Error checking status:', err);
          if (retryCount >= MAX_RETRIES) {
            setError('Failed to check training status. Please try again.');
            clearInterval(intervalId);
          }
        }
      }, 5000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [currentRequestId, retryCount]);

  const loadUserPlan = async () => {
    const plan = await getUserPlan();
    setUserPlan(plan);
  };

  const fetchTrainingRequests = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/signin');
        return;
      }

      const displayName = session.user.user_metadata.display_name;
      
      const { data: userData, error: userError } = await supabase
        .from('user_emails')
        .select('id')
        .eq('user_name', displayName)
        .single();

      if (userError) {
        console.error('Error fetching user:', userError);
        throw userError;
      }

      if (!userData) {
        throw new Error('User not found');
      }

      const { data, error } = await supabase
        .from('training_requests')
        .select('*')
        .eq('user_id', userData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrainingRequests(data || []);
    } catch (err) {
      console.error('Error fetching training requests:', err);
      setError('Failed to fetch training requests. Please try again.');
    }
  };

  const handleRefresh = async (requestId: string) => {
    if (refreshing) return;

    setRefreshingRequestId(requestId);
    setRefreshing(true);
    setError(null);

    try {
      const statusResult = await fetchWithError(endpoints.status(requestId), {
        method: 'GET',
      });

      const completion_percentage = statusResult.status?.toLowerCase() === 'completed' 
        ? 100 
        : statusResult.completion_percentage || 0;

      await fetchTrainingRequests();

      if (statusResult.status?.toLowerCase() === 'failed') {
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === 'application/zip') {
        setFile(selectedFile);
        setError(null);
        setFileUploaded(true);
      } else {
        setError('Please upload a ZIP file only');
        setFile(null);
        setFileUploaded(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !triggerPhrase.trim()) {
      setError('Please provide both a ZIP file and a trigger phrase');
      return;
    }

    const canTrain = await checkFaceTrainingLimit();
    if (!canTrain) {
      setError('You have reached your face training limit. Please upgrade your plan to train more faces.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);
    setRetryCount(0);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/signin');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('trigger_phrase', triggerPhrase.trim());
      formData.append('email', session.user.email);

      const response = await fetch(endpoints.train, {
        method: 'POST',
        body: formData,
        headers: {
          'Origin': window.location.origin,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      const result = await response.json();

      if (result.request_id) {
        setCurrentRequestId(result.request_id);
        setSuccess(true);
        setFile(null);
        setTriggerPhrase('');
        setFileUploaded(false);
        await fetchTrainingRequests();
        await handleRefresh(result.request_id);
      } else {
        throw new Error('No request ID received from server');
      }
    } catch (err) {
      console.error('Training request error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = (requestId: string) => {
    navigate('/generate', { state: { requestId } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4">
      <Navigation />
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Train Your Custom Model</h1>
          <p className="text-gray-600 mb-8">Upload your images and set a trigger phrase to create personalized thumbnails</p>

          {userPlan && (
            <div className="mb-6 p-4 bg-purple-50 rounded-lg">
              <h3 className="font-semibold text-purple-900 mb-2">Your Plan Usage</h3>
              <div className="space-y-2">
                <p className="text-sm text-purple-700">
                  Face Training: {userPlan.face_training_used} / {userPlan.face_training_limit}
                </p>
                <div className="h-2 bg-purple-200 rounded-full">
                  <div 
                    className="h-2 bg-purple-600 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${(userPlan.face_training_used / userPlan.face_training_limit) * 100}%` 
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".zip"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center justify-center"
              >
                {fileUploaded ? (
                  <>
                    <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
                    <span className="text-sm text-green-600">ZIP file uploaded successfully!</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-gray-400 mb-4" />
                    <span className="text-sm text-gray-600">
                      {file ? file.name : 'Click to upload ZIP file'}
                    </span>
                  </>
                )}
              </label>
            </div>

            <div>
              <label htmlFor="trigger-phrase" className="block text-sm font-medium text-gray-700 mb-2">
                Trigger Phrase
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Wand2 className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="trigger-phrase"
                  required
                  value={triggerPhrase}
                  onChange={(e) => setTriggerPhrase(e.target.value)}
                  placeholder="Enter your trigger phrase"
                  className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                This phrase will be used to identify your custom style
              </p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-500 p-4 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 text-green-500 p-4 rounded-lg text-sm flex items-center gap-2">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <span>
                  Training started successfully! Please click the refresh button in the Training Requests section to check the status.
                </span>
              </div>
            )}

            <div className="relative group">
              <button
                type="submit"
                disabled={!file || !triggerPhrase.trim() || loading || limitReached}
                className="w-full bg-black text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-900 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  'Processing...'
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    Start Training
                  </>
                )}
              </button>
              {limitReached && (
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-black text-white text-sm py-2 px-4 rounded shadow-lg whitespace-nowrap">
                  Face training limit reached for this month. Please upgrade your plan to continue.
                </div>
              )}
            </div>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Training Requests</h2>
            <button
              onClick={() => fetchTrainingRequests()}
              disabled={refreshing}
              className="text-gray-600 hover:text-gray-900 transition-colors duration-200"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="space-y-4">
            {trainingRequests.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No training requests yet</p>
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
                        User: {request.user_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {request.status}
                      </p>
                      <p className="text-sm text-gray-500">
                        {request.completion_percentage}%
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {request.status.toUpperCase() === 'COMPLETED' ? (
                      <button
                        onClick={() => handleGenerate(request.request_id)}
                        className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-purple-700 transition-colors duration-200 flex items-center justify-center gap-2"
                      >
                        <ImageIcon className="w-4 h-4" />
                        Generate Image
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRefresh(request.request_id)}
                        disabled={refreshing && refreshingRequestId === request.request_id}
                        className="flex-1 bg-gray-100 text-gray-600 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RefreshCw className={`w-4 h-4 ${refreshing && refreshingRequestId === request.request_id ? 'animate-spin' : ''}`} />
                        {refreshing && refreshingRequestId === request.request_id ? 'Refreshing...' : 'Refresh Status'}
                      </button>
                    )}
                    <Link
                      to={`/request/${request.request_id}`}
                      className="bg-gray-100 text-gray-600 p-2 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                      title="View details"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}