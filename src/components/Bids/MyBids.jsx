import React from 'react';
import { DollarSign } from 'lucide-react';

const MyBids = ({ myBids, courses, setSelectedCourse }) => {
  const getCourseById = (id) => courses.find(c => c.id === id);

  return (
    <div className="space-y-4">
      {myBids.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-lg p-12 text-center">
          <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No bids yet</h3>
          <p className="text-gray-500">Start bidding on courses to see them here!</p>
        </div>
      ) : (
        myBids.map(bid => {
          const course = getCourseById(bid.courseId);
          return (
            <div key={bid.courseId} className="bg-white rounded-3xl shadow-lg p-6 hover:shadow-xl transition-all">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                      {course.code}
                    </span>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      bid.status === 'leading' ? 'bg-green-100 text-green-700' : 
                      bid.status === 'outbid' ? 'bg-red-100 text-red-700' : 
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {bid.status.toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-1">{course.name}</h3>
                  <p className="text-gray-600 text-sm mb-3">{course.instructor}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{bid.timestamp}</span>
                    <span>•</span>
                    <span>Avg: {course.avgBid} pts</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 mb-1">Your Bid</p>
                  <p className="text-3xl font-bold text-indigo-600">{bid.amount}</p>
                  <p className="text-xs text-gray-500 mt-1">points</p>
                  <button
                    onClick={() => setSelectedCourse(course)}
                    className="mt-4 bg-indigo-100 text-indigo-600 px-4 py-2 rounded-xl font-semibold hover:bg-indigo-200 transition-all"
                  >
                    Modify
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default MyBids;