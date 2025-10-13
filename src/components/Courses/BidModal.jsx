import React from 'react';
import { AlertCircle } from 'lucide-react';

const BidModal = ({ selectedCourse, bidAmount, setBidAmount, points, setSelectedCourse, handlePlaceBid, currentRound, roundStatus }) => {
  if (!selectedCourse) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Place Your Bid</h2>
            <p className="text-gray-600">{selectedCourse.code} - {selectedCourse.name}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
            currentRound === 1 ? 'bg-cyan-100 text-cyan-700' : 'bg-teal-100 text-teal-700'
          }`}>
            Round {currentRound}
          </div>
        </div>

        {roundStatus === 'closed' && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            <p className="text-sm text-rose-700 font-semibold">Bidding is closed for this round</p>
          </div>
        )}
        
        <div className="bg-gradient-to-r from-cyan-50 to-teal-50 rounded-2xl p-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-600 mb-1">Min Bid</p>
              <p className="text-lg font-bold text-cyan-700">{selectedCourse.minBid} pts</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Avg Bid</p>
              <p className="text-lg font-bold text-teal-700">{selectedCourse.avgBid} pts</p>
            </div>
          </div>
        </div>
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Bid Amount</label>
          <input
            type="number"
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
            placeholder={'Min: ' + selectedCourse.minBid + ' pts'}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-cyan-500 focus:outline-none text-lg"
            disabled={roundStatus === 'closed'}
          />
          <p className="text-sm text-gray-500 mt-2">Available: {points} points</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setSelectedCourse(null);
              setBidAmount('');
            }}
            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handlePlaceBid}
            disabled={roundStatus === 'closed'}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
              roundStatus === 'closed'
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white hover:shadow-xl hover:scale-105'
            }`}
          >
            Confirm Bid
          </button>
        </div>
      </div>
    </div>
  );
};

export default BidModal;