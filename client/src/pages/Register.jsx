import React, { useState, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../context/ToastContext.jsx';
import { Input } from '../components/common/Input.jsx';
import { Button } from '../components/common/Button.jsx';
import { ErrorMessage } from '../components/common/ErrorMessage.jsx';
import {
  FileCheck2,
  UserPlus,
  Shield,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
} from 'lucide-react';

export const Register = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { register } = useAuth();
  const toast = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState(() => location.state?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState('USER');
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [emailExists, setEmailExists] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: 'bg-slate-200', text: '' };

    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 2) {
      return { score: 1, label: 'Weak', color: 'bg-rose-500', width: '33%', text: 'text-rose-600' };
    }
    if (score <= 3) {
      return { score: 2, label: 'Medium', color: 'bg-amber-500', width: '66%', text: 'text-amber-600' };
    }
    return { score: 3, label: 'Strong', color: 'bg-emerald-500', width: '100%', text: 'text-emerald-600' };
  }, [password]);

  const validateForm = () => {
    const errors = {};

    if (!name.trim()) {
      errors.name = 'Full name is required';
    } else if (name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    if (!email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters long';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEmailExists(false);
    setFormError(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      });

      toast.success('Account created successfully! Welcome to Novastat.');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const isConflict =
        err.status === 409 ||
        err.code === 'EMAIL_ALREADY_EXISTS' ||
        err.message?.toLowerCase().includes('already exists');

      if (isConflict) {
        setEmailExists(true);
        setFormError('An account with this email already exists. Please log in.');
      } else {
        setFormError(err.message || 'Registration failed. Please check your information.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginRedirect = () => {
    navigate('/login', { state: { email: email.trim() } });
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
            Create Your Account
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Join Novastat to manage and process files at scale
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-8">
          {/* Email already exists callout with Login button */}
          {emailExists ? (
            <div className="mb-5 p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    Account Already Exists
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    An account with this email already exists. Please log in.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                onClick={handleLoginRedirect}
                icon={LogIn}
              >
                Log In
              </Button>
            </div>
          ) : formError ? (
            <div className="mb-5">
              <ErrorMessage message={formError} />
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              label="Full Name"
              name="name"
              placeholder="Alex Morgan"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: null }));
              }}
              error={fieldErrors.name}
              required
              disabled={isLoading}
            />

            <Input
              label="Email Address"
              name="email"
              type="email"
              placeholder="alex@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: null }));
                if (emailExists) setEmailExists(false);
              }}
              error={fieldErrors.email}
              required
              autoComplete="email"
              disabled={isLoading}
            />

            <div>
              <Input
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: null }));
                }}
                error={fieldErrors.password}
                required
                autoComplete="new-password"
                disabled={isLoading}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />

              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Strength:</span>
                    <span className={`font-semibold ${passwordStrength.text}`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${passwordStrength.color}`}
                      style={{ width: passwordStrength.width }}
                    />
                  </div>
                </div>
              )}
            </div>

            <Input
              label="Confirm Password"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Re-type your password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (fieldErrors.confirmPassword) {
                  setFieldErrors((prev) => ({ ...prev, confirmPassword: null }));
                }
              }}
              error={fieldErrors.confirmPassword}
              required
              autoComplete="new-password"
              disabled={isLoading}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            {/* Role selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Account Role
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                    role === 'USER'
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-medium ring-1 ring-indigo-600'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="role"
                      value="USER"
                      checked={role === 'USER'}
                      onChange={() => setRole('USER')}
                      disabled={isLoading}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs">Standard User</span>
                  </div>
                </label>

                <label
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                    role === 'ADMIN'
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-medium ring-1 ring-indigo-600'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="role"
                      value="ADMIN"
                      checked={role === 'ADMIN'}
                      onChange={() => setRole('ADMIN')}
                      disabled={isLoading}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-amber-600" /> Admin
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full"
                isLoading={isLoading}
                disabled={isLoading}
                icon={UserPlus}
              >
                {isLoading ? 'Creating account...' : 'Create Account'}
              </Button>
            </div>
          </form>
        </div>

        {/* Footer: Already have an account? Log in */}
        <p className="mt-6 text-center text-xs text-slate-500">
          Already have an account?{' '}
          <Link
            to="/login"
            state={{ email: email.trim() }}
            className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
};
