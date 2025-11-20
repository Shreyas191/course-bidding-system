import React from 'react';
import { BookOpen, DollarSign, Menu, X, ShoppingCart, Clock } from 'lucide-react';
import NotificationBell from '../Notifications/NotificationBell';

const Header = ({ userProfile, points, showMobileMenu, setShowMobileMenu, cart, setShowCart, currentRound, roundStatus }) => {
  return (
    <div className="bg-white shadow-lg border-b border-cyan-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-600 to-teal-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent">
                Course Bidding
              </h1>
              <p className="text-xs text-gray-600 hidden sm:block">Welcome, {userProfile.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Round Indicator - Updated Colors */}
            <div className={`hidden lg:flex items-center gap-2 px-4 py-2 rounded-xl ${
              currentRound === 1 ? 'bg-cyan-100 text-cyan-700' : 'bg-teal-100 text-teal-700'
            }`}>
              <Clock className="w-4 h-4" />
              <div className="text-sm">
                <span className="font-bold">Round {currentRound}</span>
                <span className="mx-1">•</span>
                <span className="capitalize">{roundStatus}</span>
              </div>
            </div>

            {/* Notification Bell */}
            <NotificationBell userProfile={userProfile} />

            <button
              onClick={() => setShowCart(true)}
              className="relative p-2 hover:bg-gray-100 rounded-xl transition-all"
            >
              <ShoppingCart className="w-6 h-6 text-gray-700" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {cart.length}
                </span>
              )}
            </button>
            <div className="hidden md:flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white px-5 py-2 rounded-xl shadow-lg">
              <DollarSign className="w-5 h-5" />
              <div>
                <p className="text-xs opacity-90">Points</p>
                <p className="text-xl font-bold">{points}</p>
              </div>
            </div>
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 rounded-xl hover:bg-gray-100"
            >
              {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;