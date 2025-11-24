import React from 'react';
import { User, Award, Wallet, GraduationCap, Mail, Hash, BookOpen, Building2, Calendar } from 'lucide-react';

const Profile = ({ 
  userProfile, 
  points 
}) => {
  // Available fields from backend:
  // studentId, name, email, year, department, role, bidPoints

  const getYearDisplay = (year) => {
    if (!year) return 'Not specified';
    const yearMap = {
      1: 'First Year',
      2: 'Second Year',
      3: 'Third Year',
      4: 'Fourth Year'
    };
    return yearMap[year] || `Year ${year}`;
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Hero Section with Profile Card */}
      <div className="relative">
        {/* Profile Card */}
        <div className="mx-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Avatar */}
              <div className="relative">
                <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl ring-4 ring-white">
                  <User className="w-16 h-16 text-white" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-green-500 rounded-full border-4 border-white flex items-center justify-center shadow-lg">
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                </div>
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-bold text-gray-900 mb-1">
                  {userProfile.name || 'Student Name'}
                </h1>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium">
                    <GraduationCap className="w-4 h-4" />
                    {getYearDisplay(userProfile.year)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm font-medium">
                    <Building2 className="w-4 h-4" />
                    {userProfile.department || 'Department'}
                  </span>
                  {userProfile.role === 'admin' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 rounded-full text-sm font-medium">
                      <Award className="w-4 h-4" />
                      Administrator
                    </span>
                  )}
                </div>
                <p className="text-gray-600 flex items-center justify-center md:justify-start gap-2">
                  <Mail className="w-4 h-4" />
                  {userProfile.email || 'email@university.edu'}
                </p>
              </div>

              {/* Bid Points Badge */}
              <div className="md:ml-auto">
                <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-6 text-center shadow-xl min-w-[160px]">
                  <div className="flex justify-center mb-2">
                    <Wallet className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-white/90 text-sm font-medium mb-1">Bid Points</p>
                  <p className="text-4xl font-bold text-white">{points || 0}</p>
                  <p className="text-white/80 text-xs mt-1">Available</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-4">
        {/* Student ID Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Hash className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Student ID</p>
              <p className="text-xl font-bold text-gray-900">{userProfile.studentId || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Year Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Academic Year</p>
              <p className="text-xl font-bold text-gray-900">{getYearDisplay(userProfile.year)}</p>
            </div>
          </div>
        </div>

        {/* Department Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Department</p>
              <p className="text-xl font-bold text-gray-900">{userProfile.department || 'Not Assigned'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Information Card */}
      <div className="px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <User className="w-5 h-5 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Profile Details</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Full Name */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name
              </label>
              <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                <p className="text-gray-900 font-medium">{userProfile.name || 'Not provided'}</p>
              </div>
            </div>

            {/* Student ID */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                <Hash className="w-4 h-4" />
                Student ID
              </label>
              <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                <p className="text-gray-900 font-medium">{userProfile.studentId || 'Not assigned'}</p>
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Address
              </label>
              <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                <p className="text-gray-900 font-medium break-all">{userProfile.email || 'Not provided'}</p>
              </div>
            </div>

            {/* Department */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Department
              </label>
              <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                <p className="text-gray-900 font-medium">{userProfile.department || 'Not assigned'}</p>
              </div>
            </div>

            {/* Academic Year */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Academic Year
              </label>
              <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                <p className="text-gray-900 font-medium">{getYearDisplay(userProfile.year)}</p>
              </div>
            </div>

            {/* Bid Points */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                Available Bid Points
              </label>
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl px-4 py-3 border border-yellow-200">
                <p className="text-gray-900 font-bold text-lg">{points || 0} points</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Status */}
      <div className="px-4">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-lg p-6 border border-green-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center shadow-lg">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Account Status</h3>
              <p className="text-gray-600 text-sm mb-3">Your account is active and in good standing</p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  ✓ Verified Account
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  ✓ Bidding Enabled
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                  ✓ Enrollment Active
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="px-4">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Need Help?</h3>
              <p className="text-gray-600 text-sm mb-3">
                If you need to update your profile information, please contact the registrar's office or your academic advisor.
              </p>
              <p className="text-gray-500 text-xs">
                Note: Profile information is managed by the university administration and cannot be edited directly through this portal.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;