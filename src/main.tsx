import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import App from './App';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import ImageUpload from './pages/ImageUpload';
import GenerateImage from './pages/GenerateImage';
import RequestStatus from './pages/RequestStatus';
import GeneratedImages from './pages/GeneratedImages';
import Admin from './pages/Admin';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/upload" element={<ImageUpload />} />
        <Route path="/generate" element={<GenerateImage />} />
        <Route path="/requests" element={<RequestStatus />} />
        <Route path="/generated-images" element={<GeneratedImages />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Router>
  </StrictMode>
);