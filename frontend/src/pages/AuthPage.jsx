import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ShieldCheck, LogIn, UserPlus, Briefcase, User, Shield } from 'lucide-react';
import { registerUser, loginUser } from '../api/client';

export default function AuthPage() {
  const navigate = useNavigate();

  const existingUser = (() => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return null;
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  })();

  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'officer',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');

  const roles = [
    { value: 'admin', label: 'Administrator', icon: ShieldCheck, description: 'Full system access & user management' },
    { value: 'officer', label: 'Mining Officer', icon: Briefcase, description: 'Mine operations & compliance oversight' },
    { value: 'viewer', label: 'Viewer', icon: User, description: 'Read-only access to reports & dashboards' },
  ];

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email || !formData.email.includes('@')) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.password || formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (!isLogin && (!formData.full_name || formData.full_name.trim().length < 2)) {
      newErrors.full_name = 'Please enter your full name';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      let result;
      if (isLogin) {
        result = await loginUser({ email: formData.email, password: formData.password });
      } else {
        result = await registerUser({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          role: formData.role,
        });
      }
      // Store token and redirect
      localStorage.setItem('auth_token', result.access_token);
      localStorage.setItem('user', JSON.stringify({
        id: result.user_id,
        email: result.email,
        full_name: result.full_name,
        role: result.role,
      }));
      navigate('/');
    } catch (err) {
      const message = err.response?.data?.detail || (isLogin ? 'Invalid credentials' : 'Registration failed');
      setGeneralError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F3EE] flex items-center justify-center p-4">
      {/* Auth Card */}
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">

        {/* Header */}
        <div className="text-center mb-8 relative">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 p-0.5 mb-5 shadow-sm overflow-hidden">
            <div className="h-full w-full bg-white rounded-[14px] flex items-center justify-center p-2">
              <img src="/logo.png" alt="Maceral AI Logo" className="h-10 w-auto object-contain" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-gray-500 text-sm">
            {isLogin
              ? 'Sign in to access Maceral AI'
              : 'Join the unified geological & mining platform'}
          </p>
        </div>

        {/* Active session reminder */}
        {existingUser && (
          <div className="mb-5 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800 flex items-center justify-between">
            <span className="truncate mr-2">
              Session: <strong className="font-mono">{existingUser.email}</strong>
            </span>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="shrink-0 text-blue-600 hover:text-blue-700 font-semibold underline underline-offset-2"
            >
              Dashboard &rarr;
            </button>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex mb-6 bg-gray-50 rounded-xl p-1 border border-gray-200">
          <button
            type="button"
            onClick={() => { setIsLogin(true); setErrors({}); setGeneralError(''); }}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
              isLogin
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <LogIn className="h-4 w-4 inline mr-1.5" /> Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setErrors({}); setGeneralError(''); }}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
              !isLogin
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <UserPlus className="h-4 w-4 inline mr-1.5" /> Sign Up
          </button>
        </div>

        {/* Error Message */}
        {generalError && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
            <Shield className="h-4 w-4 flex-shrink-0" />
            <span>{generalError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name (Sign Up only) */}
          {!isLogin && (
            <div>
              <label htmlFor="full_name" className="block text-xs font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className={`w-full pl-10 pr-4 py-3 bg-white border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all ${
                    errors.full_name ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                />
              </div>
              {errors.full_name && (
                <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                  {errors.full_name}
                </p>
              )}
            </div>
          )}

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="john@coalindia.gov.in"
                autoComplete="email"
                className={`w-full pl-10 pr-4 py-3 bg-white border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all ${
                  errors.email ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              />
            </div>
            {errors.email && (
              <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                {errors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-xs font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                className={`w-full pl-10 pr-12 py-3 bg-white border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all ${
                  errors.password ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                {errors.password}
              </p>
            )}
          </div>

          {/* Role Selection (Sign Up only) */}
          {!isLogin && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Role
              </label>
              <div className="grid grid-cols-3 gap-2">
                {roles.map(role => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, role: role.value }))}
                    className={`relative p-3 rounded-xl border transition-all duration-200 text-left ${
                      formData.role === role.value
                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <role.icon className={`h-5 w-5 mb-2 ${formData.role === role.value ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div className="text-xs font-medium text-gray-900">{role.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Forgot Password (Login only) */}
          {isLogin && (
            <div className="text-right">
              <button
                type="button"
                className="text-xs text-blue-600 hover:text-blue-700 transition-colors font-medium"
              >
                Forgot password?
              </button>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2
              bg-blue-600 text-white
              hover:bg-blue-700
              active:bg-blue-800
              disabled:opacity-50 disabled:cursor-not-allowed
              shadow-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>{isLogin ? 'Signing in...' : 'Creating account...'}</span>
              </>
            ) : (
              <>
                {isLogin ? <LogIn className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
                <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setErrors({}); setGeneralError(''); }}
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
          <p className="mt-4 text-[11px] text-gray-400 font-mono tracking-wider">
            Ministry of Coal • Government of India
          </p>
        </div>
      </div>
    </div>
  );
}