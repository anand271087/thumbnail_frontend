import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function Navigation() {
  const navigate = useNavigate();

  return (
    <div className="fixed top-4 left-4 flex gap-2">
      <button
        onClick={() => navigate(-1)}
        className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors duration-200"
        title="Go back"
      >
        <ArrowLeft className="w-5 h-5 text-gray-700" />
      </button>
      <button
        onClick={() => navigate('/')}
        className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors duration-200"
        title="Go to home"
      >
        <Home className="w-5 h-5 text-gray-700" />
      </button>
    </div>
  );
}