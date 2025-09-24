import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { NotFoundError } from '../components/ui/ErrorStates';

const NotFound: React.FC = () => {
  const { translate } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-screen p-6">
      <NotFoundError
        resource="Page"
        onGoBack={() => navigate(-1)}
        onGoHome={() => navigate('/dashboard')}
      />
    </div>
  );
};

export default NotFound;
