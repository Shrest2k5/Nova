import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../context/ToastContext.jsx';
import { Input } from '../components/common/Input.jsx';
import { Button } from '../components/common/Button.jsx';
import { ErrorMessage } from '../components/common/ErrorMessage.jsx';
import {
  FileCheck2,
  LogIn,
  Eye,
  EyeOff,
  UserPlus,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

export const Login = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState(() => location.state?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [userNotFound, setUserNotFound] = useState(false);

  // Field validation errors
  const [fieldErrors, setFieldErrors] = useState({});

  const isExpired = new URLSearchParams(location.search).get('expired');
  const from = location.state?.from?.pathname || '/dashboard';

  const validateForm = () => {
    const errors = {};
    if (!email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUserNotFound(false);
    setFormError(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      await login(email.trim(), password);
      toast.success('Signed in successfully!');
      navigate(from, { replace: true });
    } catch (err) {
      const isNotFound =
        err.code === 'USER_NOT_FOUND' ||
        err.message?.toLowerCase().includes('no account found') ||
        err.message?.toLowerCase().includes('not registered');

      if (isNotFound) {
        setUserNotFound(true);
        setFormError('No account found with this email. Please sign up to continue.');
      } else {
        setFormError(err.message || 'Invalid email or password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccountRedirect = () => {
    navigate('/register', { state: { email: email.trim() } });
  };

  const fillDemoAccount = (role) => {
    setUserNotFound(false);
    setFormError(null);
    setFieldErrors({});
    if (role === 'admin') {
      setEmail('admin@example.com');
      setPassword('Admin123!');
    } else {
      setEmail('user@example.com');
      setPassword('User123!');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-lg mb-3">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Novastat File Engine
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in to access your file processing workspace
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-8">
          {isExpired && (
            <div className="mb-5 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Your session has expired. Please log in again to continue.</span>
            </div>
          )}

          {/* User Not Found Callout with Create Account button */}
          {userNotFound ? (
            <div className="mb-5 p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    No account found with this email
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    No account found with this email. Please sign up to continue.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                onClick={handleCreateAccountRedirect}
                icon={UserPlus}
              >
                Create Account
              </Button>
            </div>
          ) : formError ? (
            <div className="mb-5">
              <ErrorMessage message={formError} />
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              label="Email Address"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) {
                  setFieldErrors((prev) => ({ ...prev, email: null }));
                }
                if (userNotFound) setUserNotFound(false);
              }}
              error={fieldErrors.email}
              required
              autoComplete="email"
              disabled={isLoading}
            />

            <Input
              label="Password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) {
                  setFieldErrors((prev) => ({ ...prev, password: null }));
                }
              }}
              error={fieldErrors.password}
              required
              autoComplete="current-password"
              disabled={isLoading}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              }
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full"
                isLoading={isLoading}
                disabled={isLoading}
                icon={LogIn}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </div>
          </form>

          {/* Demo account autofill buttons */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-xs text-slate-400 font-medium mb-2 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Demo Quick Fill:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillDemoAccount('user')}
                disabled={isLoading}
                className="px-2.5 py-1.5 text-xs text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                User (user@...)
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('admin')}
                disabled={isLoading}
                className="px-2.5 py-1.5 text-xs text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Admin (admin@...)
              </button>
            </div>
          </div>
        </div>

        {/* Footer: Don't have an account? Sign up */}
        <p className="mt-6 text-center text-xs text-slate-500">
          Don't have an account?{' '}
          <Link
            to="/register"
            state={{ email: email.trim() }}
            className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};
