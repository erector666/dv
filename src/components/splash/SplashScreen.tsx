import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

const SplashScreen: React.FC = () => {
  const { translate } = useLanguage();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      
      // Wait for fade out animation to complete before navigating
      setTimeout(() => {
        // Navigate to dashboard if user is logged in, otherwise to login
        navigate(currentUser ? '/dashboard' : '/login');
      }, 500); // 500ms for fade out animation
    }, 3000); // Show splash for 3 seconds

    return () => clearTimeout(timer);
  }, [navigate, currentUser]);

  return (
    <div 
      className={`fixed inset-0 flex items-center justify-center bg-primary-600 dark:bg-primary-900 z-50 transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="text-center">
        <div className="mb-4">
          <img src="/logo2.png" alt="DocVault Logo" className="h-40 w-40 animate-pulse rounded-full" />
        </div>
        <p className="text-white text-2xl font-semibold opacity-90 animate-pulse">loading DocVault...</p>
      </div>
    </div>
  );
};

export default SplashScreen;
