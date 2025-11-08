import React from 'react';
import { User, Edit2, Check, Award, BookOpen, DollarSign } from 'lucide-react';

const Profile = ({ 
  userProfile, 
  tempProfile, 
  setTempProfile, 
  editingProfile, 
  setEditingProfile, 
  handleSaveProfile, 
  points 
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl shadow-lg p-8">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center">
              <User className="w-10 h-10 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{userProfile.name}</h2>
              <p className="text-gray-600">{userProfile.major}</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (editingProfile) {
                handleSaveProfile();
              } else {
                setEditingProfile(true);
                setTempProfile(userProfile);
              }
            }}
            className="flex items-center gap-2 bg-indigo-100 text-indigo-600 px-4 py-2 rounded-xl font-semibold hover:bg-indigo-200 transition-all"
          >
            {editingProfile ? <Check className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
            {editingProfile ? 'Save' : 'Edit'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Student ID</label>
            {editingProfile ? (
              <input
                type="text"
                value={tempProfile.studentId}
                onChange={(e) => setTempProfile({...tempProfile, studentId: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none"
              />
            ) : (
              <p className="text-gray-800 bg-gray-50 px-4 py-3 rounded-xl">{userProfile.studentId}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
            {editingProfile ? (
              <input
                type="email"
                value={tempProfile.email}
                onChange={(e) => setTempProfile({...tempProfile, email: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none"
              />
            ) : (
              <p className="text-gray-800 bg-gray-50 px-4 py-3 rounded-xl">{userProfile.email}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Year</label>
            {editingProfile ? (
              <select
                value={tempProfile.year}
                onChange={(e) => setTempProfile({...tempProfile, year: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none"
              >
                <option>Freshman</option>
                <option>Sophomore</option>
                <option>Junior</option>
                <option>Senior</option>
              </select>
            ) : (
              <p className="text-gray-800 bg-gray-50 px-4 py-3 rounded-xl">{userProfile.year}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
            {editingProfile ? (
              <input
                type="tel"
                value={tempProfile.phone}
                onChange={(e) => setTempProfile({...tempProfile, phone: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none"
              />
            ) : (
              <p className="text-gray-800 bg-gray-50 px-4 py-3 rounded-xl">{userProfile.phone}</p>
            )}
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
            {editingProfile ? (
              <input
                type="text"
                value={tempProfile.address}
                onChange={(e) => setTempProfile({...tempProfile, address: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none"
              />
            ) : (
              <p className="text-gray-800 bg-gray-50 px-4 py-3 rounded-xl">{userProfile.address}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-500 rounded-3xl shadow-lg p-6 text-white">
          <Award className="w-8 h-8 mb-3 opacity-80" />
          <p className="text-sm opacity-90 mb-1">GPA</p>
          <p className="text-3xl font-bold">{userProfile.gpa}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-3xl shadow-lg p-6 text-white">
          <BookOpen className="w-8 h-8 mb-3 opacity-80" />
          <p className="text-sm opacity-90 mb-1">Credits Earned</p>
          <p className="text-3xl font-bold">{userProfile.credits}</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-3xl shadow-lg p-6 text-white">
          <DollarSign className="w-8 h-8 mb-3 opacity-80" />
          <p className="text-sm opacity-90 mb-1">Bid Points</p>
          <p className="text-3xl font-bold">{points}</p>
        </div>
      </div>
    </div>
  );
};

export default Profile;