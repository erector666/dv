import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const Login: React.FC = () => {
  const { signIn, logOut, resendVerificationEmail } = useAuth();
  const { translate } = useLanguage();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);

  // Scroll to and focus on error message when it appears
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth' });
      errorRef.current.focus();
    }
  }, [error]);

  // Scroll to and focus on message when it appears
  useEffect(() => {
    if (message && messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: 'smooth' });
      messageRef.current.focus();
    }
  }, [message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setError('');
      setLoading(true);
      const userCredential = await signIn(email, password);
      if (userCredential.user && !userCredential.user.emailVerified) {
        await logOut();
        setError(
          'Please verify your email to log in. Check your spam folder or click "Resend Verification Email" below.'
        );
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Login error:', err);

      // Provide more specific error messages based on Firebase error codes
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password'
      ) {
        setError('Invalid email or password');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed login attempts. Please try again later');
      } else if (err.code === 'auth/user-disabled') {
        setError('This account has been disabled');
      } else {
        setError(
          'Failed to sign in. Please check your credentials and try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      setError('');
      setMessage('');
      setResendLoading(true);
      await resendVerificationEmail(email, password);
      setMessage(
        'Verification email sent! Please check your email (including spam folder).'
      );
    } catch (err: any) {
      console.error('Resend verification error:', err);
      if (err.message === 'Email is already verified') {
        setError('Email is already verified. You can now sign in.');
      } else if (err.message === 'User not found') {
        setError('User not found. Please check your email address.');
      } else {
        setError(
          'Failed to resend verification email. Please check your credentials and try again.'
        );
      }
    } finally {
      setResendLoading(false);
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
            Sign In
          </h2>
          <p className="mt-2 text-center text-sm text-blue-300">
            Sign in to your account
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <input type="hidden" name="remember" defaultValue="true" />
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
                placeholder="Enter your email"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                {translate('auth.fields.password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-700 bg-gray-800 placeholder-gray-400 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div
              ref={errorRef}
              className="bg-red-900/30 border border-red-500 text-red-300 px-4 py-3 rounded-md text-sm text-center"
              tabIndex={-1}
              role="alert"
              aria-live="assertive"
            >
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

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-700 rounded"
              />
              <label
                htmlFor="remember-me"
                className="ml-2 block text-sm text-gray-300"
              >
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <Link
                to="/forgot-password"
                className="font-medium text-blue-400 hover:text-blue-300"
              >
                Forgot password?
              </Link>
            </div>
          </div>

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
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </div>

          {/* Resend Verification Email Button */}
          <div className="mt-4">
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resendLoading || !email || !password}
              className={`w-full flex justify-center py-2 px-4 border border-gray-600 text-sm font-medium rounded-md text-gray-300 ${
                resendLoading || !email || !password
                  ? 'bg-gray-700 cursor-not-allowed'
                  : 'bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500'
              }`}
            >
              {resendLoading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin h-4 w-4 mr-2"
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
                  Sending...
                </span>
              ) : (
                <span className="flex items-center">
                  <svg
                    className="h-4 w-4 mr-2"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  Resend Verification Email
                </span>
              )}
            </button>
          </div>
        </form>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-400">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-medium text-blue-400 hover:text-blue-300"
            >
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
