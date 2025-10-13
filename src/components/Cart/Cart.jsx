import React from 'react';
import { X, ShoppingCart, Plus, Minus, Trash2, Check, AlertCircle } from 'lucide-react';

const Cart = ({
  showCart,
  setShowCart,
  cart,
  courses,
  points,
  handleRemoveFromCart,
  handleUpdateCartBid,
  handleCheckout,
  currentRound,
  roundStatus
}) => {
  if (!showCart) return null;

  const getCourseById = (id) => courses.find(c => c.id === id);
  const getCartTotal = () => cart.reduce((sum, item) => sum + item.bidAmount, 0);
  const canCheckout = getCartTotal() <= points && cart.length > 0 && roundStatus === 'active';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-600 to-teal-600 rounded-xl flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Shopping Cart</h2>
              <p className="text-sm text-gray-600">{cart.length} courses selected</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${currentRound === 1 ? 'bg-cyan-100 text-cyan-700' : 'bg-teal-100 text-teal-700'
              }`}>
              Round {currentRound}
            </div>
            <button
              onClick={() => setShowCart(false)}
              className="p-2 hover:bg-gray-100 rounded-xl transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {roundStatus === 'closed' && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-700 font-semibold">Bidding is closed for this round</p>
          </div>
        )}

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6">
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">Your cart is empty</h3>
              <p className="text-gray-500">Add courses from the browse page to get started!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => {
                const course = getCourseById(item.courseId);
                return (
                  <div key={item.courseId} className="bg-gray-50 rounded-2xl p-4 hover:bg-gray-100 transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-bold text-cyan-700 bg-cyan-100 px-3 py-1 rounded-full">
                            {course.code}
                          </span>
                          <span className="text-xs text-gray-600">{course.credits} credits</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-1">{course.name}</h3>
                        <p className="text-sm text-gray-600">{course.instructor}</p>
                        <p className="text-xs text-gray-500 mt-1">{course.schedule}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveFromCart(item.courseId)}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        disabled={roundStatus === 'closed'}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between bg-white rounded-xl p-3">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Bid Amount</p>
                        <p className="text-sm text-gray-500">Min: {course.minBid} | Avg: {course.avgBid}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdateCartBid(item.courseId, Math.max(course.minBid, item.bidAmount - 5))}
                          className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center transition-all"
                          disabled={roundStatus === 'closed'}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          value={item.bidAmount}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || course.minBid;
                            handleUpdateCartBid(item.courseId, Math.max(course.minBid, val));
                          }}
                          className="w-20 text-center py-2 rounded-lg border-2 border-gray-200 font-bold text-cyan-600"
                          disabled={roundStatus === 'closed'}
                        />
                        <button
                          onClick={() => handleUpdateCartBid(item.courseId, item.bidAmount + 5)}
                          className="w-8 h-8 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg flex items-center justify-center transition-all"
                          disabled={roundStatus === 'closed'}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-gray-600">
                <span>Courses:</span>
                <span className="font-semibold">{cart.length}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Available Points:</span>
                <span className="font-semibold">{points}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-gray-800 pt-3 border-t border-gray-300">
                <span>Total Bid:</span>
                <span className={getCartTotal() > points ? 'text-rose-600' : 'text-cyan-600'}>
                  {getCartTotal()} pts
                </span>
              </div>
              {getCartTotal() > points && (
                <p className="text-sm text-rose-600 text-center">
                  Insufficient points! You need {getCartTotal() - points} more points.
                </p>
              )}
              {roundStatus === 'closed' && (
                <p className="text-sm text-rose-600 text-center">
                  Bidding is closed for Round {currentRound}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCart(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-all"
              >
                Continue Shopping
              </button>
              <button
                onClick={handleCheckout}
                disabled={!canCheckout}
                className={`flex-1 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${canCheckout
                    ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white hover:shadow-xl hover:scale-105'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
              >
                <Check className="w-5 h-5" />
                Checkout
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;