import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ShieldCheck, Sparkles, LogIn, UserPlus, Briefcase, User, Shield } from 'lucide-react';
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

  const selectedRole = roles.find(r => r.value === formData.role);

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      {/* Coal Background */}
      <div className="absolute inset-0 z-0">
        <img
          src="/coal-bg.jpg"
          alt="Coal background"
          className="w-full h-full object-cover"
        />
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#090D16]/95 via-[#090D16]/85 to-[#090D16]/95" />
        {/* Subtle amber glow overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-600/5 via-transparent to-transparent" />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 z-10 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-amber-400/10 animate-float"
            style={{
              width: `${Math.random() * 8 + 4}px`,
              height: `${Math.random() * 8 + 4}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${Math.random() * 10 + 10}s`,
            }}
          />
        ))}
      </div>

      {/* Auth Card - Glassmorphism */}
      <div className="relative z-20 w-full max-w-md px-6">
        <div className="relative">
          {/* Glassmorphism Card */}
          <div className="relative bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/50">
            {/* Top decorative border */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-amber-400/50 to-transparent rounded-b-full" />

            {/* Header */}
            <div className="text-center mb-8 relative">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 p-0.5 mb-5 shadow-lg shadow-amber-500/30 overflow-hidden">
                <div className="h-full w-full bg-white rounded-[14px] flex items-center justify-center p-2">
                  <img src="/logo.png" alt="Maceral AI Logo" className="h-10 w-auto object-contain" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight mb-2">
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </h1>
              <p className="text-slate-400 text-sm">
                {isLogin
                  ? 'Sign in to access Maceral AI'
                  : 'Join the unified geological & mining platform'}
              </p>
            </div>

            {/* Active session reminder if user is already authenticated */}
            {existingUser && (
              <div className="mb-5 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-slate-300 flex items-center justify-between">
                <span className="truncate mr-2">
                  Session: <strong className="text-amber-400 font-mono">{existingUser.email}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="shrink-0 text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2"
                >
                  Dashboard &rarr;
                </button>
              </div>
            )}

            {/* Tab Switcher */}
            <div className="flex mb-6 bg-white/5 rounded-xl p-1 border border-white/10">
              <button
                type="button"
                onClick={() => { setIsLogin(true); setErrors({}); setGeneralError(''); }}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isLogin
                    ? 'bg-amber-500/20 text-amber-300 shadow-lg shadow-amber-500/10'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LogIn className="h-4 w-4 inline mr-1.5" /> Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsLogin(false); setErrors({}); setGeneralError(''); }}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                  !isLogin
                    ? 'bg-amber-500/20 text-amber-300 shadow-lg shadow-amber-500/10'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserPlus className="h-4 w-4 inline mr-1.5" /> Sign Up
              </button>
            </div>

            {/* Error Message */}
            {generalError && (
              <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 flex-shrink-0" />
                <span>{generalError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Full Name (Sign Up only) */}
              {!isLogin && (
                <div>
                  <label htmlFor="full_name" className="block text-xs font-medium text-slate-300 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                    <input
                      type="text"
                      id="full_name"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      placeholder="John Doe"
                      className={`w-full pl-10 pr-4 py-3 bg-white/5 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all ${
                        errors.full_name ? 'border-red-500/50 bg-red-500/5' : 'border-white/10 hover:border-white/20'
                      }`}
                    />
                  </div>
                  {errors.full_name && (
                    <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                      <span className="h-1 w-1 rounded-full bg-red-400" />
                      {errors.full_name}
                    </p>
                  )}
                </div>
              )}

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-xs font-medium text-slate-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="john@coalindia.gov.in"
                    autoComplete="email"
                    className={`w-full pl-10 pr-4 py-3 bg-white/5 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all ${
                      errors.email ? 'border-red-500/50 bg-red-500/5' : 'border-white/10 hover:border-white/20'
                    }`}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                    <span className="h-1 w-1 rounded-full bg-red-400" />
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-xs font-medium text-slate-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    className={`w-full pl-10 pr-12 py-3 bg-white/5 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all ${
                      errors.password ? 'border-red-500/50 bg-red-500/5' : 'border-white/10 hover:border-white/20'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                    <span className="h-1 w-1 rounded-full bg-red-400" />
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Role Selection (Sign Up only) */}
              {!isLogin && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">
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
                            ? 'border-amber-500/50 bg-amber-500/10 shadow-lg shadow-amber-500/10'
                            : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                        }`}
                      >
                        <role.icon className={`h-5 w-5 mb-2 ${formData.role === role.value ? 'text-amber-400' : 'text-slate-500'}`} />
                        <div className="text-xs font-medium text-white">{role.label}</div>
                        <div className="text-[10px] text-slate-500 mt-1 leading-tight">{role.description}</div>
                        {formData.role === role.value && (
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-amber-500 rounded-full" />
                        )}
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
                    className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
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
                  bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950
                  hover:from-amber-400 hover:to-amber-500
                  active:from-amber-600 active:to-amber-700
                  disabled:opacity-50 disabled:cursor-not-allowed
                  shadow-lg shadow-amber-500/25
                  focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 focus:ring-offset-slate-950"
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
              <p className="text-xs text-slate-500">
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
                <button
                  type="button"
                  onClick={() => { setIsLogin(!isLogin); setErrors({}); setGeneralError(''); }}
                  className="text-amber-400 hover:text-amber-300 font-medium transition-colors"
                >
                  {isLogin ? 'Sign Up' : 'Sign In'}
                </button>
              </p>
              <p className="mt-4 text-[11px] text-slate-600 font-mono tracking-wider">
                Ministry of Coal • Government of India
              </p>
            </div>
          </div>

          {/* Subtle glow behind card */}
          <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-transparent to-transparent rounded-3xl blur-3xl opacity-50 -z-10" />
        </div>
      </div>
    </div>
  );
}