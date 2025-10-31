import React from 'react';
import { ShoppingCart, TrendingUp, Users, BookOpen, Award, DollarSign, CheckCircle, XCircle } from 'lucide-react';
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
  coursesLost
}) => {
  const getCourseById = (id) => courses.find(c => c.id === id);
  const getCartTotal = () => cart.reduce((sum, item) => sum + item.bidAmount, 0);

  const stats = [
    {
      title: 'Available Points',
      value: points,
      icon: DollarSign,
      color: 'from-cyan-600 to-teal-600',
      bgColor: 'bg-cyan-50',
      textColor: 'text-cyan-700'
    },
    {
      title: 'Courses in Cart',
      value: cart.length,
      icon: ShoppingCart,
      color: 'from-purple-600 to-pink-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700'
    },
    {
      title: 'Active Bids',
      value: myBids.filter(b => b.round === currentRound).length,
      icon: TrendingUp,
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700'
    },
    {
      title: 'Enrolled Courses',
      value: registeredCourses.length + coursesWon.length,
      icon: BookOpen,
      color: 'from-emerald-500 to-green-500',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-700'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-cyan-600 to-teal-600 rounded-3xl shadow-lg p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Welcome Back! 🎓</h1>
        <p className="text-cyan-100">
          {currentRound === 1 
            ? 'Add courses to cart and checkout to place your bids for Round 1!' 
            : 'Round 2 is open! Bid on courses you didn\'t get in Round 1.'}
        </p>
      </div>

      {/* Round 1 Results */}
      {currentRound === 2 && (coursesWon.length > 0 || coursesLost.length > 0) && (
        <div className="bg-white rounded-3xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Round 1 Results</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Courses Won */}
            <div className="bg-emerald-50 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
                <h3 className="text-lg font-bold text-emerald-800">Courses Won ({coursesWon.length})</h3>
              </div>
              {coursesWon.length > 0 ? (
                <div className="space-y-2">
                  {coursesWon.map((item) => {
                    const course = getCourseById(item.courseId);
                    return (
                      <div key={item.courseId} className="bg-white rounded-xl p-3">
                        <p className="font-semibold text-gray-800">{course.code} - {course.name}</p>
                        <p className="text-sm text-gray-600">Bid: {item.bidAmount} pts</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-emerald-700">No courses won yet</p>
              )}
            </div>

            {/* Courses Lost */}
            <div className="bg-rose-50 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <XCircle className="w-6 h-6 text-rose-600" />
                <h3 className="text-lg font-bold text-rose-800">Courses Lost ({coursesLost.length})</h3>
              </div>
              {coursesLost.length > 0 ? (
                <div className="space-y-2">
                  {coursesLost.map((item) => {
                    const course = getCourseById(item.courseId);
                    return (
                      <div key={item.courseId} className="bg-white rounded-xl p-3">
                        <p className="font-semibold text-gray-800">{course.code} - {course.name}</p>
                        <p className="text-sm text-gray-600">Bid: {item.bidAmount} pts (Not enough)</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-rose-700">You got all courses!</p>
              )}
            </div>
          </div>
          
          {coursesLost.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-xl">
              <p className="text-sm text-blue-800">
                <strong>💡 Tip:</strong> You can rebid on the {coursesLost.length} course(s) you didn't get in Round 2. Browse courses and add them to your cart!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Round Info */}
      <RoundInfo
        currentRound={currentRound}
        roundStatus={roundStatus}
        roundEndTime={roundEndTime}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all hover:scale-105">
            <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center mb-4`}>
              <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
            </div>
            <p className="text-gray-600 text-sm mb-1">{stat.title}</p>
            <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Round Timeline */}
      <RoundTimeline
        currentRound={currentRound}
        round1EndDate={round1EndDate}
        round2EndDate={round2EndDate}
      />

      {/* Cart Summary */}
      {cart.length > 0 && (
        <div className="bg-white rounded-3xl shadow-lg p-6 border-2 border-cyan-200">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Cart Summary</h2>
              <p className="text-sm text-gray-600">Review and checkout to place your bids</p>
            </div>
            <button
              onClick={() => setShowCart(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              <ShoppingCart className="w-5 h-5" />
              Checkout ({cart.length})
            </button>
          </div>
          
          <div className="space-y-3">
            {cart.slice(0, 3).map((item) => {
              const course = getCourseById(item.courseId);
              return (
                <div key={item.courseId} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-semibold text-gray-800">{course.code} - {course.name}</p>
                    <p className="text-sm text-gray-600">{course.instructor}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-cyan-600">{item.bidAmount} pts</p>
                  </div>
                </div>
              );
            })}
            {cart.length > 3 && (
              <p className="text-center text-gray-500 text-sm">+ {cart.length - 3} more items</p>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
            <p className="text-lg font-semibold text-gray-700">Total Bid Amount:</p>
            <p className="text-2xl font-bold text-cyan-600">{getCartTotal()} points</p>
          </div>
          
          <div className="mt-4 p-3 bg-amber-50 rounded-xl">
            <p className="text-sm text-amber-800">
              <strong>⚠️ Important:</strong> Your bids will be placed only after you checkout from the cart!
            </p>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl shadow-lg p-6 hover:shadow-xl transition-all cursor-pointer" onClick={() => setCurrentPage('browse')}>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-cyan-50 rounded-xl flex items-center justify-center">
              <Users className="w-7 h-7 text-cyan-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">Browse Courses</h3>
              <p className="text-gray-600 text-sm">Add courses to cart</p>
            </div>
          </div>
          <p className="text-gray-500">Explore {courses.length} available courses and add them to your cart</p>
        </div>

        <div className="bg-white rounded-3xl shadow-lg p-6 hover:shadow-xl transition-all cursor-pointer" onClick={() => setCurrentPage('mybids')}>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-purple-50 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-purple-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">My Bids</h3>
              <p className="text-gray-600 text-sm">Track your placed bids</p>
            </div>
          </div>
          <p className="text-gray-500">View {myBids.length} bid(s) and their results</p>
        </div>
      </div>
    </div>
  );
};

export default Home;