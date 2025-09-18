import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const ForgotPassword: React.FC = () => {
  const { resetPassword } = useAuth();
  const { translate } = useLanguage();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);

  // Scroll to and focus on message when it appears
  useEffect(() => {
    if (message && messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: 'smooth' });
      messageRef.current.focus();
    }
  }, [message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic email validation
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setError('');
      setMessage('');
      setLoading(true);
      await resetPassword(email);
      setMessage(
        'Password reset email sent. Check your inbox for instructions.'
      );
    } catch (err: any) {
      console.error('Password reset error:', err);

      // Provide more specific error messages based on Firebase error codes
      if (err.code === 'auth/user-not-found') {
        setError('No account exists with this email address');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email format');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later');
      } else {
        setError(
          'Failed to reset password. Please check your email and try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <img
            className="mx-auto h-24 w-auto rounded-full"
            src="/logo2.png"
            alt="DocVault Logo"
          />
          <h2 className="mt-6 text-center text-4xl font-bold text-white">
            Forgot Password
          </h2>
          <p className="mt-2 text-center text-sm text-blue-300">
            Enter your email to reset your password
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email-address" className="sr-only">
                {translate('auth.fields.email')}
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-700 bg-gray-800 placeholder-gray-400 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-500 text-red-300 px-4 py-3 rounded-md text-sm text-center">
              {error}
            </div>
          )}

          {message && (
            <div
              ref={messageRef}
              className="bg-green-900/30 border border-green-500 text-green-300 px-4 py-3 rounded-md text-sm text-center"
              tabIndex={-1}
              role="alert"
              aria-live="assertive"
            >
              {message}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                loading
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
            >
              {loading ? (
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                </span>
              ) : (
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                  <svg
                    className="h-5 w-5 text-blue-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              )}
              {loading ? 'Sending Reset Link...' : 'Reset Password'}
            </button>
          </div>
        </form>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-400">
            Remember your password?{' '}
            <Link
              to="/login"
              className="font-medium text-blue-400 hover:text-blue-300"
            >
              Back to Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
