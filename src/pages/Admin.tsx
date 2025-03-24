import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Navigation from '../components/Navigation';

interface UserPlan {
  id: string;
  user_id: string;
  plan_type: string;
  face_training_limit: number;
  face_training_used: number;
  image_limit: number;
  images_generated: number;
  subscription_start: string;
  subscription_end: string | null;
  is_admin: boolean;
}

export default function Admin() {
  const navigate = useNavigate();
  const [userPlans, setUserPlans] = useState<UserPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAndLoadData();
  }, []);

  const checkAdminAndLoadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/signin');
        return;
      }

      // Check if user is admin
      const { data: userPlan } = await supabase
        .from('user_plans')
        .select('is_admin')
        .eq('user_id', session.user.id)
        .single();

      if (!userPlan?.is_admin) {
        navigate('/');
        return;
      }

      setIsAdmin(true);
      await fetchUserPlans();
    } catch (err) {
      console.error('Error checking admin status:', err);
      navigate('/');
    }
  };

  const fetchUserPlans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_plans')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserPlans(data || []);
    } catch (err) {
      console.error('Error fetching user plans:', err);
      setError('Failed to load user plans');
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('user_plans')
        .update({ is_admin: !currentStatus })
        .eq('user_id', userId);

      if (error) throw error;
      await fetchUserPlans();
    } catch (err) {
      console.error('Error toggling admin status:', err);
      setError('Failed to update admin status');
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4">
      <Navigation />
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-2">Manage user plans and permissions</p>
            </div>
            <button
              onClick={fetchUserPlans}
              className="p-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b-2 border-gray-100">
                    <th className="pb-4 font-semibold text-gray-600">User ID</th>
                    <th className="pb-4 font-semibold text-gray-600">Plan</th>
                    <th className="pb-4 font-semibold text-gray-600">Face Training</th>
                    <th className="pb-4 font-semibold text-gray-600">Images</th>
                    <th className="pb-4 font-semibold text-gray-600">Admin</th>
                    <th className="pb-4 font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {userPlans.map((plan) => (
                    <tr key={plan.id} className="border-b border-gray-50">
                      <td className="py-4 text-sm">{plan.user_id}</td>
                      <td className="py-4">
                        <span className="capitalize font-medium">{plan.plan_type}</span>
                      </td>
                      <td className="py-4">
                        {plan.face_training_used} / {plan.face_training_limit}
                      </td>
                      <td className="py-4">
                        {plan.images_generated} / {plan.image_limit}
                      </td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          plan.is_admin 
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {plan.is_admin ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="py-4">
                        <button
                          onClick={() => toggleAdminStatus(plan.user_id, plan.is_admin)}
                          className="text-sm text-purple-600 hover:text-purple-800"
                        >
                          {plan.is_admin ? 'Remove Admin' : 'Make Admin'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}