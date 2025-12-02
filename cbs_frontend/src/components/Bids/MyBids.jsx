import React, { useState } from 'react';
import { DollarSign, CheckCircle, XCircle, Clock, Trash2, Edit2, Save, X as CloseIcon } from 'lucide-react';

const MyBids = ({ myBids = [], courses = [], currentRound = 1, coursesWon = [], coursesLost = [], onBidCancelled, points }) => {
  const [editingBid, setEditingBid] = useState(null);
  const [newBidAmount, setNewBidAmount] = useState('');
  
  const getCourseById = (id) => courses.find(c => c.id === id);

  const round1Bids = myBids.filter(b => b.roundId === 1);
  const round2Bids = myBids.filter(b => b.roundId === 2);

  const handleCancelBid = async (bidId) => {
    if (!window.confirm('Are you sure you want to cancel this bid? Your points will be refunded.')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:8080/api/bids/${bidId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert('Bid cancelled successfully! Your points have been refunded.');
        // Callback to parent to refresh data
        if (onBidCancelled) {
          onBidCancelled();
        }
      } else {
        const error = await response.text();
        alert('Failed to cancel bid: ' + error);
      }
    } catch (err) {
      console.error('Error cancelling bid:', err);
      alert('Error cancelling bid. Please try again.');
    }
  };

  const handleEditBid = (bid, course) => {
    setEditingBid(bid.bidId);
    setNewBidAmount(bid.bidAmount.toString());
  };

  const handleCancelEdit = () => {
    setEditingBid(null);
    setNewBidAmount('');
  };

  const handleUpdateBid = async (bid) => {
    const amount = parseInt(newBidAmount);
    const course = getCourseById(bid.courseId);
    
    if (!amount || amount < (course?.minBid || 0)) {
      alert(`Bid amount must be at least ${course?.minBid || 0} points`);
      return;
    }

    if (amount === bid.bidAmount) {
      alert('No changes made to bid amount');
      handleCancelEdit();
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      
      // Get current round info
      const roundResponse = await fetch('http://localhost:8080/api/rounds/current', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!roundResponse.ok) {
        throw new Error('No active round found');
      }
      
      const currentRoundData = await roundResponse.json();
      
      // Place new bid (backend will update existing one)
      const response = await fetch('http://localhost:8080/api/bids', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          courseId: bid.courseId,
          bidAmount: amount
        })
      });

      if (response.ok) {
        const difference = amount - bid.bidAmount;
        if (difference > 0) {
          alert(`Bid updated successfully! ${difference} additional points deducted.`);
        } else {
          alert(`Bid updated successfully! ${Math.abs(difference)} points refunded.`);
        }
        
        handleCancelEdit();
        
        // Callback to parent to refresh data
        if (onBidCancelled) {
          onBidCancelled();
        }
      } else {
        const error = await response.text();
        alert('Failed to update bid: ' + error);
      }
    } catch (err) {
      console.error('Error updating bid:', err);
      alert('Error updating bid: ' + err.message);
    }
  };

  const renderBidCard = (bid) => {
    const course = getCourseById(bid.courseId);
    const isEditing = editingBid === bid.bidId;
    
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
                {bid.status === 'pending' && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                    <Clock className="w-3 h-3" />
                    Pending
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
              {isEditing ? (
                <div className="space-y-2">
                  <input
                    type="number"
                    value={newBidAmount}
                    onChange={(e) => setNewBidAmount(e.target.value)}
                    className="w-24 px-3 py-2 text-center rounded-lg border-2 border-cyan-500 font-bold text-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    min={bid.minBid || 0}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateBid(bid)}
                      className="flex items-center gap-1 bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600 transition-all text-xs font-semibold"
                    >
                      <Save className="w-3 h-3" />
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex items-center gap-1 bg-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-400 transition-all text-xs font-semibold"
                    >
                      <CloseIcon className="w-3 h-3" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-3xl font-bold text-cyan-600">{bid.bidAmount}</p>
                  <p className="text-xs text-gray-500 mt-1">points</p>
                  {bid.status === 'pending' && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleEditBid(bid, course)}
                        className="flex items-center gap-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-100 transition-all text-sm font-semibold"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleCancelBid(bid.bidId)}
                        className="flex items-center gap-1 bg-red-50 text-red-600 px-3 py-2 rounded-lg hover:bg-red-100 transition-all text-sm font-semibold"
                      >
                        <Trash2 className="w-4 h-4" />
                        Cancel
                      </button>
                    </div>
                  )}
                </>
              )}
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
              {finalStatus === 'pending' && (
                <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                  <Clock className="w-3 h-3" />
                  Pending
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
              <span>Min: {course.minBid} pts</span>
              <span>•</span>
              <span>Avg: {course.avgBid} pts</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600 mb-1">Your Bid</p>
            {isEditing ? (
              <div className="space-y-2">
                <input
                  type="number"
                  value={newBidAmount}
                  onChange={(e) => setNewBidAmount(e.target.value)}
                  className="w-24 px-3 py-2 text-center rounded-lg border-2 border-cyan-500 font-bold text-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  min={course.minBid || 0}
                />
                <p className="text-xs text-gray-500">Min: {course.minBid}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateBid(bid)}
                    className="flex items-center justify-center gap-1 bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 transition-all text-sm font-semibold"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex items-center justify-center gap-1 bg-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-400 transition-all text-sm font-semibold"
                  >
                    <CloseIcon className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-3xl font-bold text-cyan-600">{bid.bidAmount}</p>
                <p className="text-xs text-gray-500 mt-1">points</p>
                {finalStatus === 'pending' && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleEditBid(bid, course)}
                      className="flex items-center justify-center gap-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-100 transition-all text-sm font-semibold"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleCancelBid(bid.bidId)}
                      className="flex items-center justify-center gap-1 bg-red-50 text-red-600 px-3 py-2 rounded-lg hover:bg-red-100 transition-all text-sm font-semibold"
                    >
                      <Trash2 className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        {isEditing && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-xs text-blue-700">
              <strong>💡 Tip:</strong> Your wallet will be adjusted automatically. 
              {parseInt(newBidAmount) > bid.bidAmount 
                ? ` Additional ${parseInt(newBidAmount) - bid.bidAmount} points will be deducted.`
                : ` ${bid.bidAmount - parseInt(newBidAmount)} points will be refunded.`
              }
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Available balance: {points} points
            </p>
          </div>
        )}
      </div>
    );
  }

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