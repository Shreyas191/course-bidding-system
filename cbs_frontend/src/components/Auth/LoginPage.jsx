import React from 'react';
import { BookOpen, Mail, Lock, GraduationCap, CreditCard, ArrowRight } from 'lucide-react';

const LoginPage = ({ 
  loginForm, 
  setLoginForm, 
  handleLogin
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-teal-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Branding */}
        <div className="hidden lg:block">
          <div className="bg-gradient-to-br from-cyan-600 to-teal-600 rounded-3xl shadow-2xl p-12 text-white">
            <div className="w-20 h-20 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center mb-6">
              <BookOpen className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-4">
              Course Bidding System
            </h1>
            <p className="text-cyan-100 text-lg mb-8">
              Secure your spot in high-demand courses with our innovative bidding platform
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-white bg-opacity-10 rounded-xl p-4">
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold">Smart Bidding</p>
                  <p className="text-sm text-cyan-100">Place strategic bids on your favorite courses</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 bg-white bg-opacity-10 rounded-xl p-4">
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold">Point System</p>
                  <p className="text-sm text-cyan-100">Manage your bidding points wisely</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 bg-white bg-opacity-10 rounded-xl p-4">
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold">Real-time Updates</p>
                  <p className="text-sm text-cyan-100">Track your bid status instantly</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login/Signup Form */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 lg:p-12">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-600 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent">
              Course Bidding
            </h1>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              Welcome Back!
            </h2>
            <p className="text-gray-600">
              Login to continue bidding on courses
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                    className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-gray-200 focus:border-cyan-500 focus:outline-none transition-all"
                    placeholder="your.email@university.edu"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                    className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-gray-200 focus:border-cyan-500 focus:outline-none transition-all"
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500" />
                  <span className="text-sm text-gray-600">Remember me</span>
                </label>
                <a href="#" className="text-sm font-semibold text-cyan-600 hover:text-cyan-700">
                  Forgot Password?
                </a>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 text-white py-4 rounded-xl font-semibold hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center gap-2"
              >
                Login
                <ArrowRight className="w-5 h-5" />
              </button>

              <div className="text-center pt-4">
                <p className="text-gray-600 text-sm">
                  Don't have an account? Contact your administrator.
                </p>
              </div>
            </form>

          {/* Trust Badges */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex flex-wrap justify-center gap-6 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Secure Login
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Encrypted Data
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                24/7 Support
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;