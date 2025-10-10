import React from 'react';

const BidModal = ({ selectedCourse, bidAmount, setBidAmount, points, setSelectedCourse, handlePlaceBid }) => {
  if (!selectedCourse) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Place Your Bid</h2>
        <p className="text-gray-600 mb-6">{selectedCourse.code} - {selectedCourse.name}</p>
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-600 mb-1">Min Bid</p>
              <p className="text-lg font-bold text-indigo-600">{selectedCourse.minBid} pts</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Avg Bid</p>
              <p className="text-lg font-bold text-purple-600">{selectedCourse.avgBid} pts</p>
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
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none text-lg"
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
            className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-xl transition-all hover:scale-105"
          >
            Confirm Bid
          </button>
        </div>
      </div>
    </div>
  );
};

export default BidModal;