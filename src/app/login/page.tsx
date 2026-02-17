"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/AuthProvider';
import { saveAuthToStorage } from '../../lib/auth/storage';
import { Button } from '../../components/ui/Common';
import { Lock, User, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { api } from '../../lib/api';

export default function Login() {
  const { setAuth } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [pwdChanged, setPwdChanged] = useState<string | null>(null);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      setPwdChanged(params.get('changed'));
    } catch (e) {
      setPwdChanged(null);
    }
  }, []);

  // Redirect if already logged in
  const { user, token, isLoading: authLoading } = useAuth();
  useEffect(() => {
    if (!authLoading && user && token) {
      router.replace('/admin/dashboard');
    }
  }, [user, token, authLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Call login API - returns companies user has access to
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      const { token, user, companies, requireCompanySelection, autoSelectedCompany } = data;

      // Save to auth storage
      if (token && user) {
        saveAuthToStorage(token, user);
        setAuth(token, user);
      }

      // Explicitly save to storage for PWA persistence
      saveAuthToStorage(token, user);

      // Always redirect to company selection as requested
      window.location.href = '/select-company';
    } catch (err) {
      const msg = (err as any)?.message || 'Invalid username or password.';
      setError(msg.includes('Invalid') ? 'Invalid username or password.' : msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white overflow-hidden">

      {/* Left Side - Brand Visuals (Desktop Only) */}
      <div className="hidden lg:flex lg:w-[60%] relative bg-orange-50 overflow-hidden items-center justify-center">
        {/* Background Image/Texture */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-orange-100 opacity-90" />
          <div
            className="absolute inset-0 bg-center bg-no-repeat bg-cover opacity-5"
            style={{ backgroundImage: "url('/login-bg.png')" }}
          />
          {/* Decorative Blobs */}
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-orange-200 blur-3xl animate-pulse" />
          <div className="absolute top-[40%] -right-[10%] w-[60%] h-[60%] rounded-full bg-blue-100 blur-3xl animate-pulse delay-700" />
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 flex flex-col items-center justify-center p-12 text-center">
          <div className="w-64 h-64 mb-8 bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-white/50 shadow-xl flex items-center justify-center transform hover:scale-105 transition-transform duration-500">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/login-bg.png"
              alt="Gurukrupa ERP Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-5xl font-bold text-slate-900 mb-4 tracking-tight">
            Gurukrupa
            <span className="text-orange-600"> ERP</span>
          </h1>
          <p className="text-xl text-slate-600 max-w-lg font-light">
            Streamline your business operations with our advanced enterprise management solution.
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-[40%] flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24 bg-white relative">
        {/* Mobile Logo (Visible only on small screens) */}
        <div className="lg:hidden flex justify-center mb-8">
          <div className="w-24 h-24 bg-slate-50 rounded-2xl p-4 shadow-lg border border-slate-100 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/login-bg.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
        </div>

        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="text-center lg:text-left mb-10">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Please enter your details to sign in
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>

            {pwdChanged === '1' && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center animate-in fade-in slide-in-from-top-2">
                <ShieldCheck className="h-4 w-4 mr-2 text-green-600" />
                Password updated successfully.
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1.5 ml-1">
                Username
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="off"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:bg-white sm:text-sm transition-all duration-200"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5 ml-1">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:bg-white sm:text-sm transition-all duration-200"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Button
                type="submit"
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-orange-500/20 text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transform transition-all active:scale-[0.98]"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
                {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </div>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-slate-400 font-medium">
                  Protected System
                </span>
              </div>
            </div>
            <div className="mt-6 text-center text-xs text-slate-400">
              &copy; {new Date().getFullYear()} Gurukrupa Multi Ventures Pvt Ltd.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
