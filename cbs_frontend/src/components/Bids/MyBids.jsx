import React from 'react';
import { DollarSign, CheckCircle, XCircle, Clock } from 'lucide-react';

const MyBids = ({ myBids = [], courses = [], currentRound = 1, coursesWon = [], coursesLost = [] }) => {
  const getCourseById = (id) => courses.find(c => c.id === id);

  const round1Bids = myBids.filter(b => b.roundId === 1);
  const round2Bids = myBids.filter(b => b.roundId === 2);

  const renderBidCard = (bid) => {
    const course = getCourseById(bid.courseId);
    
    // If course not found in courses list, use data from bid itself
    if (!course) {
      return (
        <div key={bid.bidId} className="bg-white rounded-3xl shadow-lg p-6 hover:shadow-xl transition-all">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-bold text-cyan-700 bg-cyan-50 px-3 py-1 rounded-full">
                  {bid.courseCode}
                </span>
                <span className="text-xs text-gray-500">{bid.roundName}</span>
                {bid.status === 'active' && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                    <Clock className="w-3 h-3" />
                    Active
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-1">{bid.courseName}</h3>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>{bid.createdAt}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-1">Your Bid</p>
              <p className="text-3xl font-bold text-cyan-600">{bid.bidAmount}</p>
              <p className="text-xs text-gray-500 mt-1">points</p>
            </div>
          </div>
        </div>
      );
    }
    
    const wonCourse = coursesWon.find(c => c.courseId === bid.courseId);
    const lostCourse = coursesLost.find(c => c.courseId === bid.courseId);
    const finalStatus = wonCourse ? 'won' : lostCourse ? 'lost' : bid.status;

    return (
      <div key={bid.bidId} className="bg-white rounded-3xl shadow-lg p-6 hover:shadow-xl transition-all">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-bold text-cyan-700 bg-cyan-50 px-3 py-1 rounded-full">
                {course.code || bid.courseCode}
              </span>
              <span className="text-xs text-gray-500">Round {bid.roundId}</span>
              {finalStatus === 'won' && (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                  <CheckCircle className="w-3 h-3" />
                  Won
                </span>
              )}
              {finalStatus === 'lost' && (
                <span className="flex items-center gap-1 text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-1 rounded-full">
                  <XCircle className="w-3 h-3" />
                  Lost
                </span>
              )}
              {finalStatus === 'leading' && (
                <span className="flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                  <Clock className="w-3 h-3" />
                  Leading
                </span>
              )}
              {finalStatus === 'active' && (
                <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                  <Clock className="w-3 h-3" />
                  Active
                </span>
              )}
              {finalStatus === 'outbid' && (
                <span className="flex items-center gap-1 text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                  <Clock className="w-3 h-3" />
                  Outbid
                </span>
              )}
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-1">{course.name}</h3>
            <p className="text-gray-600 text-sm mb-3">{course.instructor}</p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>{bid.createdAt}</span>
              <span>•</span>
              <span>Avg: {course.avgBid} pts</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600 mb-1">Your Bid</p>
            <p className="text-3xl font-bold text-cyan-600">{bid.bidAmount}</p>
            <p className="text-xs text-gray-500 mt-1">points</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {!myBids || myBids.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-lg p-12 text-center">
          <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No bids yet</h3>
          <p className="text-gray-500">Add courses to cart and checkout to place your bids!</p>
        </div>
      ) : (
        <>
          {/* Round 1 Bids */}
          {round1Bids.length > 0 && (
            <div>
              <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
                <h2 className="text-xl font-bold text-gray-800">Round 1 Bids</h2>
                <p className="text-sm text-gray-600">
                  {coursesWon.length > 0 || coursesLost.length > 0 
                    ? `Results: ${coursesWon.length} won, ${coursesLost.length} lost`
                    : 'Waiting for results...'}
                </p>
              </div>
              <div className="space-y-4">
                {round1Bids.map(bid => renderBidCard(bid))}
              </div>
            </div>
          )}

          {/* Round 2 Bids */}
          {round2Bids.length > 0 && (
            <div>
              <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
                <h2 className="text-xl font-bold text-gray-800">Round 2 Bids</h2>
                <p className="text-sm text-gray-600">Active bids for courses you didn't get in Round 1</p>
              </div>
              <div className="space-y-4">
                {round2Bids.map(bid => renderBidCard(bid))}
              </div>
            </div>
          )}

          {/* Fallback: Show all bids if neither round1 nor round2 has bids */}
          {round1Bids.length === 0 && round2Bids.length === 0 && myBids.length > 0 && (
            <div>
              <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
                <h2 className="text-xl font-bold text-gray-800">My Bids</h2>
                <p className="text-sm text-gray-600">All your placed bids</p>
              </div>
              <div className="space-y-4">
                {myBids.map(bid => renderBidCard(bid))}
              </div>
            </div>
          )}

          {/* Summary for Round 2 */}
          {currentRound === 2 && coursesLost.length > 0 && round2Bids.length === 0 && (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 text-center">
              <h3 className="text-lg font-bold text-amber-800 mb-2">Round 2 is Open!</h3>
              <p className="text-amber-700 mb-4">
                You didn't get {coursesLost.length} course(s) in Round 1. Browse courses and bid again!
              </p>
              <button
                onClick={() => window.location.hash = 'browse'}
                className="bg-gradient-to-r from-cyan-600 to-teal-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                Browse Courses
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MyBids;