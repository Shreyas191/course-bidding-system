import React from 'react';
import { ShoppingCart, TrendingUp, Users, BookOpen, Award, DollarSign } from 'lucide-react';

const Home = ({ cart, courses, myBids, registeredCourses, points, setShowCart, setCurrentPage }) => {
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
      value: myBids.length,
      icon: TrendingUp,
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700'
    },
    {
      title: 'Enrolled Courses',
      value: registeredCourses.length,
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
        <p className="text-cyan-100">Ready to bid on your favorite courses?</p>
      </div>

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

      {/* Cart Summary */}
      {cart.length > 0 && (
        <div className="bg-white rounded-3xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Cart Summary</h2>
            <button
              onClick={() => setShowCart(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              <ShoppingCart className="w-5 h-5" />
              View Cart ({cart.length})
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
              <p className="text-gray-600 text-sm">Find and bid on courses</p>
            </div>
          </div>
          <p className="text-gray-500">Explore {courses.length} available courses and start bidding</p>
        </div>

        <div className="bg-white rounded-3xl shadow-lg p-6 hover:shadow-xl transition-all cursor-pointer" onClick={() => setCurrentPage('mybids')}>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-purple-50 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-purple-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">My Bids</h3>
              <p className="text-gray-600 text-sm">Track your active bids</p>
            </div>
          </div>
          <p className="text-gray-500">Monitor {myBids.length} active bids and their status</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-3xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {myBids.slice(0, 3).map((bid) => {
            const course = getCourseById(bid.courseId);
            return (
              <div key={bid.courseId} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    bid.status === 'leading' ? 'bg-emerald-100' : bid.status === 'outbid' ? 'bg-rose-100' : 'bg-blue-100'
                  }`}>
                    <Award className={`w-5 h-5 ${
                      bid.status === 'leading' ? 'text-emerald-600' : bid.status === 'outbid' ? 'text-rose-600' : 'text-blue-600'
                    }`} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{course.name}</p>
                    <p className="text-sm text-gray-600">{bid.timestamp}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  bid.status === 'leading' ? 'bg-emerald-100 text-emerald-700' : 
                  bid.status === 'outbid' ? 'bg-rose-100 text-rose-700' : 
                  'bg-blue-100 text-blue-700'
                }`}>
                  {bid.status.toUpperCase()}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Home;