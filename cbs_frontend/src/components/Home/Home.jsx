import React from 'react';
import { ShoppingCart, TrendingUp, Users, BookOpen, Award, DollarSign, CheckCircle, XCircle, User, Mail, Calendar, GraduationCap, Coins, Clock, ArrowRight } from 'lucide-react';
import RoundInfo from '../Rounds/RoundInfo';
import RoundTimeline from '../Rounds/RoundTimeline';

const Home = ({ 
  cart, 
  courses, 
  myBids, 
  registeredCourses, 
  points, 
  setShowCart, 
  setCurrentPage,
  currentRound,
  roundStatus,
  roundEndTime,
  round1EndDate,
  round2EndDate,
  coursesWon,
  coursesLost,
  userProfile,
  allRounds
}) => {
  const getCourseById = (id) => courses.find(c => c.id === id);
  const getCartTotal = () => cart.reduce((sum, item) => sum + item.bidAmount, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-8">
      {/* Hero Section - Profile Card */}
      <div className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full -mr-32 -mt-32 opacity-50"></div>
        <div className="relative p-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900 mb-1">
                Hello, {userProfile.name?.split(' ')[0] || 'Student'}
              </h1>
              <p className="text-gray-500">Here's your course bidding overview</p>
            </div>
            <div className="flex items-center gap-3 bg-cyan-50 text-gray-800 px-5 py-3 rounded-xl shadow-sm border border-cyan-200">
  <Coins className="w-5 h-5 text-cyan-600" />
  <div>
    <p className="text-xs text-cyan-700">Wallet Balance</p>
    <p className="text-2xl font-bold text-gray-900">{points}</p>
  </div>
</div>
          </div>
          
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <Mail className="w-4 h-4" />
                <span className="text-sm font-medium">Email</span>
              </div>
              <p className="text-gray-900 text-sm truncate">{userProfile.email || 'Not available'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">Academic Year</span>
              </div>
              <p className="text-gray-900 text-sm">Year {userProfile.year || 'N/A'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <GraduationCap className="w-4 h-4" />
                <span className="text-sm font-medium">Department</span>
              </div>
              <p className="text-gray-900 text-sm">{userProfile.department || 'Not specified'}</p>
            </div>
          </div>
        </div>
      </div>


      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-200 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <BookOpen className="w-5 h-5 text-indigo-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{registeredCourses.length + coursesWon.length}</span>
          </div>
          <p className="text-sm text-gray-600 font-medium">Enrolled Courses</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-purple-200 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{cart.length}</span>
          </div>
          <p className="text-sm text-gray-600 font-medium">Courses in Cart</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-amber-200 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{myBids.filter(b => b.round === currentRound).length}</span>
          </div>
          <p className="text-sm text-gray-600 font-medium">Active Bids</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-green-200 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{coursesWon.length}</span>
          </div>
          <p className="text-sm text-gray-600 font-medium">Courses Won</p>
        </div>
      </div>

      {/* All Rounds Information */}
      {allRounds && allRounds.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            Bidding Rounds Schedule
          </h2>
          <div className="space-y-3">
            {allRounds.map((round) => (
              <div 
                key={round.roundId} 
                className={`border rounded-lg p-4 ${
                  round.status === 'active' ? 'border-green-300 bg-green-50' :
                  round.status === 'completed' ? 'border-gray-300 bg-gray-50' :
                  'border-indigo-300 bg-indigo-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Round {round.roundNumber}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        round.status === 'active' ? 'bg-green-500 text-white' :
                        round.status === 'completed' ? 'bg-gray-500 text-white' :
                        'bg-yellow-500 text-white'
                      }`}>
                        {round.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{round.roundName || 'No description'}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span>Start: {round.startTime ? new Date(round.startTime).toLocaleString() : 'TBD'}</span>
                      <span>End: {round.endTime ? new Date(round.endTime).toLocaleString() : 'TBD'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Round 1 Results */}
      {currentRound === 2 && (coursesWon.length > 0 || coursesLost.length > 0) && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Round 1 Results</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Courses Won */}
            <div className="border border-green-100 bg-green-50/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-gray-900">Won ({coursesWon.length})</h3>
              </div>
              {coursesWon.length > 0 ? (
                <div className="space-y-2">
                  {coursesWon.map((item) => {
                    const course = getCourseById(item.courseId);
                    return (
                      <div key={item.courseId} className="bg-white rounded-lg p-3 border border-green-100">
                        <p className="font-medium text-gray-900 text-sm">{course.code} - {course.name}</p>
                        <p className="text-xs text-gray-500 mt-1">Bid: {item.bidAmount} pts</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No courses won yet</p>
              )}
            </div>

            {/* Courses Lost */}
            <div className="border border-red-100 bg-red-50/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <XCircle className="w-5 h-5 text-red-600" />
                <h3 className="font-semibold text-gray-900">Lost ({coursesLost.length})</h3>
              </div>
              {coursesLost.length > 0 ? (
                <div className="space-y-2">
                  {coursesLost.map((item) => {
                    const course = getCourseById(item.courseId);
                    return (
                      <div key={item.courseId} className="bg-white rounded-lg p-3 border border-red-100">
                        <p className="font-medium text-gray-900 text-sm">{course.code} - {course.name}</p>
                        <p className="text-xs text-gray-500 mt-1">Bid: {item.bidAmount} pts (Not enough)</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">You got all courses!</p>
              )}
            </div>
          </div>
          
          {coursesLost.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm text-gray-700">
                <strong>Tip:</strong> You can rebid on the {coursesLost.length} course(s) you didn't get in Round 2.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Round Info */}
      <RoundInfo
        allRounds={allRounds}
        currentRound={currentRound}
        roundStatus={roundStatus}
        roundEndTime={roundEndTime}
      />

      {/* Round Timeline
      <RoundTimeline
        currentRound={currentRound}
        round1EndDate={round1EndDate}
        round2EndDate={round2EndDate}
      /> */}

      {/* Cart Summary */}
      {cart.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Cart Summary</h2>
              <p className="text-sm text-gray-500">Review and checkout to place your bids</p>
            </div>
            <button
              onClick={() => setShowCart(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              Checkout ({cart.length})
            </button>
          </div>
          
          <div className="space-y-2">
            {cart.slice(0, 3).map((item) => {
              const course = getCourseById(item.courseId);
              return (
                <div key={item.courseId} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{course.code} - {course.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{course.instructor}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-indigo-600">{item.bidAmount} pts</p>
                  </div>
                </div>
              );
            })}
            {cart.length > 3 && (
              <p className="text-center text-gray-400 text-sm py-2">+ {cart.length - 3} more items</p>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
            <p className="font-medium text-gray-700">Total Bid Amount</p>
            <p className="text-xl font-bold text-indigo-600">{getCartTotal()} points</p>
          </div>
          
          <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
            <p className="text-sm text-gray-700">
              <strong>Important:</strong> Your bids will be placed only after you checkout from the cart.
            </p>
          </div>
        </div>
      )}


      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button 
          onClick={() => setCurrentPage('browse')}
          className="group bg-white rounded-xl border border-gray-200 p-6 hover:border-indigo-300 hover:shadow-md transition-all text-left"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
              <Users className="w-6 h-6 text-indigo-600" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Browse Courses</h3>
          <p className="text-sm text-gray-500">Explore {courses.length} available courses and add to your cart</p>
        </button>

        <button
          onClick={() => setCurrentPage('mybids')}
          className="group bg-white rounded-xl border border-gray-200 p-6 hover:border-purple-300 hover:shadow-md transition-all text-left"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">My Bids</h3>
          <p className="text-sm text-gray-500">Track your {myBids.length} bid(s) and view results</p>
        </button>
      </div>
    </div>
  );
};

export default Home;