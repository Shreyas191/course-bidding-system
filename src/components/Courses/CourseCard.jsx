import React from 'react';
import { TrendingUp, Clock, MapPin, Award, Users, Star, ShoppingCart } from 'lucide-react';

const CourseCard = ({ course, myBid, setSelectedCourse, handleAddToWaitlist, handleAddToCart }) => {
  const seatsLeft = course.seats - course.enrolled;
  const seatPercentage = (course.enrolled / course.seats) * 100;

  return (
    <div className="bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-gray-100 hover:border-indigo-300">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                {course.code}
              </span>
              {course.popularity === 'high' && (
                <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-full">
                  <TrendingUp className="w-3 h-3" />
                  Hot
                </span>
              )}
            </div>
            <h3 className="text-xl font-bold text-gray-800">{course.name}</h3>
            <p className="text-gray-600 text-sm mt-1">{course.instructor}</p>
          </div>
          <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="font-semibold text-yellow-700">{course.rating}</span>
          </div>
        </div>

        <div className="space-y-2 text-sm text-gray-600 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {course.schedule}
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            {course.location}
          </div>
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            {course.credits} Credits
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600 flex items-center gap-1">
              <Users className="w-4 h-4" />
              Seats: {course.enrolled}/{course.seats}
            </span>
            <span className={`font-semibold ${seatsLeft < 10 ? 'text-red-600' : 'text-green-600'}`}>
              {seatsLeft} left
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                seatPercentage > 80 ? 'bg-red-500' : seatPercentage > 50 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: seatPercentage + '%' }}
            />
          </div>
        </div>

        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-4 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-600 mb-1">Min Bid</p>
              <p className="text-lg font-bold text-indigo-600">{course.minBid} pts</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Avg Bid</p>
              <p className="text-lg font-bold text-purple-600">{course.avgBid} pts</p>
            </div>
          </div>
        </div>

        {myBid && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-blue-800">Your Bid</span>
              <span className="text-xl font-bold text-blue-600">{myBid.amount} pts</span>
            </div>
            <span className={`text-xs font-semibold mt-2 inline-block px-3 py-1 rounded-full ${
              myBid.status === 'leading' ? 'bg-green-100 text-green-700' : myBid.status === 'outbid' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {myBid.status.toUpperCase()}
            </span>
          </div>
        )}

        {/* <div className="flex gap-2">
          <button
            onClick={() => setSelectedCourse(course)}
            className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-2xl font-semibold hover:shadow-xl transition-all hover:scale-105"
          >
            {myBid ? 'Update Bid' : 'Place Bid'}
          </button>
          <button
            onClick={() => handleAddToWaitlist(course.id)}
            className="px-4 py-3 bg-yellow-100 text-yellow-700 rounded-2xl font-semibold hover:bg-yellow-200 transition-all"
          >
            Waitlist
          </button>
        </div> */}
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedCourse(course)}
            className="flex-1 bg-gradient-to-r from-cyan-600 to-teal-600 text-white py-3 rounded-2xl font-semibold hover:shadow-xl transition-all hover:scale-105"
          >
            {myBid ? 'Update Bid' : 'Bid Now'}
          </button>
          <button
            onClick={() => handleAddToCart(course.id, course.avgBid)}
            className="p-3 bg-purple-100 text-purple-700 rounded-2xl font-semibold hover:bg-purple-200 transition-all"
            title="Add to Cart"
          >
            <ShoppingCart className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleAddToWaitlist(course.id)}
            className="px-4 py-3 bg-amber-100 text-amber-700 rounded-2xl font-semibold hover:bg-amber-200 transition-all text-sm"
          >
            Waitlist
          </button>
        </div>
      </div>
      
    </div>
  );
};

export default CourseCard;