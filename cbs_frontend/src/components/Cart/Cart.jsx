import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Plus, Minus, Trash2, Check, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';

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
  const [waitlistPreferences, setWaitlistPreferences] = useState({});
  const [validationResult, setValidationResult] = useState(null);
  const [isValidated, setIsValidated] = useState(false);

  useEffect(() => {
    // Initialize waitlist preferences for each item
    const prefs = {};
    cart.forEach(item => {
      if (waitlistPreferences[item.courseId] === undefined) {
        prefs[item.courseId] = false;
      }
    });
    setWaitlistPreferences(prev => ({ ...prev, ...prefs }));
    
    // Reset validation when cart changes
    setIsValidated(false);
    setValidationResult(null);
  }, [cart]);

  if (!showCart) return null;

  const getCourseById = (id) => courses.find(c => c.id === id);
  const getCartTotal = () => cart.reduce((sum, item) => sum + item.bidAmount, 0);
  const canCheckout = getCartTotal() <= points && cart.length > 0 && roundStatus === 'active' && isValidated;

  const toggleWaitlist = (courseId) => {
    setWaitlistPreferences(prev => ({
      ...prev,
      [courseId]: !prev[courseId]
    }));
  };

  // Parse time from "HH:mm" or "HH:mm:ss" format
  const parseTime = (timeStr) => {
    if (!timeStr) return null;
    const parts = timeStr.split(':');
    return {
      hours: parseInt(parts[0]),
      minutes: parseInt(parts[1])
    };
  };

  // Check if two time ranges overlap
  const timesOverlap = (start1, end1, start2, end2) => {
    const s1 = start1.hours * 60 + start1.minutes;
    const e1 = end1.hours * 60 + end1.minutes;
    const s2 = start2.hours * 60 + start2.minutes;
    const e2 = end2.hours * 60 + end2.minutes;

    return (s1 < e2 && e1 > s2);
  };

  // Validate cart for time clashes
  const validateCart = () => {
    const conflicts = [];
    const cartCourses = cart.map(item => ({
      ...getCourseById(item.courseId),
      cartItemId: item.courseId
    }));

    for (let i = 0; i < cartCourses.length; i++) {
      for (let j = i + 1; j < cartCourses.length; j++) {
        const course1 = cartCourses[i];
        const course2 = cartCourses[j];

        // Get schedule information
        const schedule1 = course1.schedule;
        const schedule2 = course2.schedule;

        if (!schedule1 || !schedule2) continue;

        // Parse schedule strings (format: "Day HH:mm-HH:mm")
        // Example: "Monday 09:00-12:00, Wednesday 14:00-16:00"
        const parseSchedule = (scheduleStr) => {
          const sessions = scheduleStr.split(',').map(s => s.trim());
          return sessions.map(session => {
            const parts = session.split(' ');
            if (parts.length < 2) return null;
            
            const day = parts[0];
            const times = parts[1]?.split('-');
            if (!times || times.length !== 2) return null;

            return {
              day,
              start: parseTime(times[0]),
              end: parseTime(times[1])
            };
          }).filter(s => s !== null);
        };

        const sessions1 = parseSchedule(schedule1);
        const sessions2 = parseSchedule(schedule2);

        // Check each session pair
        for (const sess1 of sessions1) {
          for (const sess2 of sessions2) {
            if (sess1.day === sess2.day && 
                timesOverlap(sess1.start, sess1.end, sess2.start, sess2.end)) {
              conflicts.push({
                course1: course1.name,
                course2: course2.name,
                day: sess1.day,
                time1: `${formatTimeForDisplay(sess1.start)}-${formatTimeForDisplay(sess1.end)}`,
                time2: `${formatTimeForDisplay(sess2.start)}-${formatTimeForDisplay(sess2.end)}`
              });
            }
          }
        }
      }
    }

    const result = {
      valid: conflicts.length === 0,
      conflicts: conflicts,
      message: conflicts.length === 0 
        ? 'All course timings are compatible! ✓' 
        : `Found ${conflicts.length} time conflict(s)`
    };

    setValidationResult(result);
    setIsValidated(result.valid);
    return result;
  };

  const formatTimeForDisplay = (time) => {
    if (!time) return '';
    const hours = time.hours.toString().padStart(2, '0');
    const minutes = time.minutes.toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleValidate = () => {
    if (cart.length === 0) {
      setValidationResult({
        valid: false,
        conflicts: [],
        message: 'Cart is empty'
      });
      return;
    }
    validateCart();
  };

  const handleCheckoutWithWaitlist = () => {
    const cartWithWaitlist = cart.map(item => ({
      ...item,
      addToWaitlist: waitlistPreferences[item.courseId] || false
    }));
    handleCheckout(cartWithWaitlist);
  };

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

        {/* Validation Status */}
        {validationResult && (
          <div className={`mx-6 mt-4 p-4 rounded-xl border-2 ${
            validationResult.valid 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start gap-3">
              {validationResult.valid ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`font-semibold ${validationResult.valid ? 'text-green-800' : 'text-red-800'}`}>
                  {validationResult.message}
                </p>
                {validationResult.conflicts.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {validationResult.conflicts.map((conflict, index) => (
                      <div key={index} className="text-sm text-red-700 bg-white rounded-lg p-3 border border-red-100">
                        <p className="font-medium">⚠️ {conflict.course1} ↔ {conflict.course2}</p>
                        <p className="text-xs mt-1">
                          Both scheduled on {conflict.day}: {conflict.time1} and {conflict.time2}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
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
                const seatsLeft = course.seats - course.enrolled;
                const isFull = seatsLeft <= 0;
                
                return (
                  <div key={item.courseId} className="bg-gray-50 rounded-2xl p-4 hover:bg-gray-100 transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-bold text-cyan-700 bg-cyan-100 px-3 py-1 rounded-full">
                            {course.code}
                          </span>
                          <span className="text-xs text-gray-600">{course.credits} credits</span>
                          {isFull && (
                            <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-full">
                              FULL
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-1">{course.name}</h3>
                        <p className="text-sm text-gray-600">{course.instructor}</p>
                        <p className="text-xs text-gray-500 mt-1">{course.schedule}</p>
                        
                        {/* Waitlist Option */}
                        {/* <div className="mt-3 bg-white rounded-lg p-3 border border-gray-200">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={waitlistPreferences[item.courseId] || false}
                              onChange={() => toggleWaitlist(item.courseId)}
                              className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                            />
                            <span className="text-sm text-gray-700">
                              {isFull 
                                ? 'Add to waitlist (course is full)'
                                : 'Add to waitlist if course becomes full'}
                            </span>
                          </label>
                        </div> */}
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

            <div className="flex gap-3 mb-3">
              <button
                onClick={handleValidate}
                disabled={cart.length === 0}
                className={`flex-1 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                  cart.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : isValidated
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isValidated ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                {isValidated ? 'Validated ✓' : 'Validate Schedule'}
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCart(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-all"
              >
                Continue Shopping
              </button>
              <button
                onClick={handleCheckoutWithWaitlist}
                disabled={!canCheckout}
                className={`flex-1 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                  canCheckout
                    ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white hover:shadow-xl hover:scale-105'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Check className="w-5 h-5" />
                Checkout
              </button>
            </div>
            
            {!isValidated && cart.length > 0 && (
              <p className="text-xs text-center text-amber-600 mt-2">
                ⚠️ Please validate your schedule before checkout
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;