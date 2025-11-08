import React from 'react';
import { Clock, Calendar, TrendingUp } from 'lucide-react';

const RoundInfo = ({ currentRound, roundStatus, roundEndTime }) => {
  const formatTimeRemaining = (endTime) => {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end - now;
    
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="bg-white rounded-3xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Bidding Round {currentRound}</h2>
          <p className="text-gray-600">Place or modify your course bids</p>
        </div>
        <div className={`px-4 py-2 rounded-xl font-semibold ${
          roundStatus === 'active' 
            ? 'bg-emerald-100 text-emerald-700' 
            : 'bg-rose-100 text-rose-700'
        }`}>
          {roundStatus === 'active' ? '● Active' : '● Closed'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-cyan-50 to-teal-50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Current Round</p>
              <p className="text-2xl font-bold text-gray-800">Round {currentRound}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Time Left</p>
              <p className="text-2xl font-bold text-gray-800">{formatTimeRemaining(roundEndTime)}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Next Phase</p>
              <p className="text-lg font-bold text-gray-800">
                {currentRound === 1 ? 'Round 2' : 'Results'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {roundStatus === 'active' && (
        <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-sm text-blue-800">
            <strong>💡 Tip:</strong> {currentRound === 1 
              ? 'Start with strategic bids. You can adjust them in Round 2 based on competition.'
              : 'This is your final chance! Make sure to place your best bids before time runs out.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default RoundInfo;