import React from 'react';
import { BookOpen, DollarSign, Menu, X } from 'lucide-react';

const Header = ({ userProfile, points, showMobileMenu, setShowMobileMenu }) => {
  return (
    <div className="bg-white shadow-lg border-b border-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Course Bidding
              </h1>
              <p className="text-xs text-gray-600 hidden sm:block">Welcome, {userProfile.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2 rounded-xl shadow-lg">
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