import React from 'react';
import { Search, DollarSign, BookOpen, List, User, LogOut, X } from 'lucide-react';

const Sidebar = ({ 
  currentPage, 
  setCurrentPage, 
  showMobileMenu, 
  setShowMobileMenu, 
  myBids, 
  registeredCourses, 
  waitlist, 
  points, 
  handleLogout 
}) => {
  return (
    <div className={`${showMobileMenu ? 'block' : 'hidden'} md:block fixed md:relative inset-0 md:inset-auto z-40 md:z-auto bg-black bg-opacity-50 md:bg-transparent`}>
      <div className="bg-white md:w-64 h-full md:h-auto rounded-2xl shadow-lg p-4 m-4 md:m-0">
        <div className="md:hidden flex justify-end mb-4">
          <button onClick={() => setShowMobileMenu(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="md:hidden mb-4 p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl">
          <p className="text-xs opacity-90">Available Points</p>
          <p className="text-2xl font-bold">{points}</p>
        </div>

        <nav className="space-y-2">
          <button
            onClick={() => { setCurrentPage('browse'); setShowMobileMenu(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${
              currentPage === 'browse' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Search className="w-5 h-5" />
            Browse Courses
          </button>
          
          <button
            onClick={() => { setCurrentPage('mybids'); setShowMobileMenu(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${
              currentPage === 'mybids' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <DollarSign className="w-5 h-5" />
            My Bids
            {myBids.length > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {myBids.length}
              </span>
            )}
          </button>

          <button
            onClick={() => { setCurrentPage('registered'); setShowMobileMenu(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${
              currentPage === 'registered' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            My Courses
            {registeredCourses.length > 0 && (
              <span className="ml-auto bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                {registeredCourses.length}
              </span>
            )}
          </button>

          <button
            onClick={() => { setCurrentPage('waitlist'); setShowMobileMenu(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${
              currentPage === 'waitlist' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <List className="w-5 h-5" />
            Waitlist
            {waitlist.length > 0 && (
              <span className="ml-auto bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                {waitlist.length}
              </span>
            )}
          </button>

          <button
            onClick={() => { setCurrentPage('profile'); setShowMobileMenu(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${
              currentPage === 'profile' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <User className="w-5 h-5" />
            Profile
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-red-600 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;