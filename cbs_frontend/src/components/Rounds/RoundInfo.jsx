import React, { useState, useEffect } from 'react';
import { Clock, Calendar, TrendingUp, AlertCircle } from 'lucide-react';

const RoundInfo = ({ allRounds, currentRound, roundStatus, roundEndTime }) => {
  const [timeDisplay, setTimeDisplay] = useState('');
  const [timerLabel, setTimerLabel] = useState('Time Left');
  const [activeRoundData, setActiveRoundData] = useState(null);

  const formatTimeRemaining = (targetTime, isPending = false) => {
    if (!targetTime) return 'N/A';
    
    const now = new Date();
    const target = new Date(targetTime);
    const diff = target - now;
    
    if (diff <= 0) {
      if (isPending) return 'Starting...';
      return 'Ended';
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
  };

  // Find and set active round data
  useEffect(() => {
    console.log('RoundInfo - All Rounds:', allRounds);
    console.log('RoundInfo - Current Round ID:', currentRound);
    console.log('RoundInfo - Round Status:', roundStatus);
    console.log('RoundInfo - Round End Time:', roundEndTime);

    if (!allRounds || allRounds.length === 0) {
      console.log('No rounds available');
      setActiveRoundData(null);
      return;
    }

    // Find the round by roundId
    const round = allRounds.find(r => r.roundId === currentRound);
    
    if (round) {
      console.log('Found active round:', round);
      setActiveRoundData(round);
    } else {
      console.log('Could not find round with ID:', currentRound);
      // Try to find any active round as fallback
      const activeRound = allRounds.find(r => r.status === 'active');
      if (activeRound) {
        console.log('Using fallback active round:', activeRound);
        setActiveRoundData(activeRound);
      } else {
        setActiveRoundData(null);
      }
    }
  }, [allRounds, currentRound]);

  // Update timer
  useEffect(() => {
    const updateTimer = () => {
      if (!activeRoundData) {
        setTimerLabel('Status');
        setTimeDisplay('No Active Round');
        return;
      }

      const status = roundStatus || activeRoundData.status;

      if (status === 'pending') {
        // Round hasn't started yet - show countdown to start
        setTimerLabel('Starts In');
        const display = formatTimeRemaining(activeRoundData.startTime, true);
        setTimeDisplay(display);
        console.log('Timer Update (Pending):', display);
      } else if (status === 'active') {
        // Round is active - show countdown to end
        setTimerLabel('Ends In');
        const endTime = activeRoundData.endTime;
        const display = formatTimeRemaining(endTime, false);
        setTimeDisplay(display);
        console.log('Timer Update (Active):', display);
      } else if (status === 'closed' || status === 'processing') {
        // Round has ended
        setTimerLabel('Status');
        setTimeDisplay(status === 'processing' ? 'Processing' : 'Closed');
        console.log('Timer Update (Closed/Processing)');
      } else {
        setTimerLabel('Status');
        setTimeDisplay('Unknown');
      }
    };

    // Initial update
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [activeRoundData, roundStatus, roundEndTime]);

  // Get display status
  const getStatusDisplay = () => {
    const status = roundStatus || activeRoundData?.status || 'unknown';
    
    if (status === 'active') {
      return { text: '● Active', className: 'bg-emerald-100 text-emerald-700' };
    } else if (status === 'pending') {
      return { text: '● Pending', className: 'bg-amber-100 text-amber-700' };
    } else if (status === 'processing') {
      return { text: '● Processing', className: 'bg-blue-100 text-blue-700' };
    } else if (status === 'closed') {
      return { text: '● Closed', className: 'bg-rose-100 text-rose-700' };
    } else {
      return { text: '● Unknown', className: 'bg-gray-100 text-gray-700' };
    }
  };

  const statusDisplay = getStatusDisplay();
  const displayRoundNumber = activeRoundData?.roundNumber || currentRound || 'N/A';
  const displayRoundName = activeRoundData?.roundName || `Round ${displayRoundNumber}`;

  // If no round data available
  if (!activeRoundData && (!allRounds || allRounds.length === 0)) {
    return (
      <div className="bg-white rounded-3xl shadow-lg p-6">
        <div className="flex items-center gap-4 text-amber-600">
          <AlertCircle className="w-8 h-8" />
          <div>
            <h3 className="text-lg font-bold">No Active Round</h3>
            <p className="text-sm text-gray-600">There is currently no bidding round available.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">
            {displayRoundName}
          </h2>
          <p className="text-gray-600">Place or modify your course bids</p>
        </div>
        {/* <div className={`px-4 py-2 rounded-xl font-semibold ${statusDisplay.className}`}>
          {statusDisplay.text}
        </div> */}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Current Round */}
        <div className="bg-gradient-to-br from-cyan-50 to-teal-50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Current Round</p>
              <p className="text-2xl font-bold text-gray-800">Round {displayRoundNumber}</p>
            </div>
          </div>
        </div>

        {/* Timer */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">{timerLabel}</p>
              <p className="text-2xl font-bold text-gray-800">{timeDisplay}</p>
            </div>
          </div>
        </div>

        {/* Next Phase */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Next Phase</p>
              <p className="text-lg font-bold text-gray-800">
                {displayRoundNumber === 1 ? 'Round 2' : 'Results'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tips based on status */}
      {(roundStatus === 'active' || activeRoundData?.status === 'active') && (
        <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-sm text-blue-800">
            <strong>💡 Tip:</strong> {displayRoundNumber === 1 
              ? 'Start with strategic bids. You can adjust them in Round 2 based on competition.'
              : 'This is your final chance! Make sure to place your best bids before time runs out.'}
          </p>
        </div>
      )}

      {(roundStatus === 'pending' || activeRoundData?.status === 'pending') && (
        <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
          <p className="text-sm text-amber-800">
            <strong>⏳ Round Starts Soon:</strong> Get ready! The bidding round will start automatically at the scheduled time.
          </p>
        </div>
      )}

      {(roundStatus === 'closed' || activeRoundData?.status === 'closed') && (
        <div className="mt-4 p-4 bg-rose-50 rounded-xl border border-rose-100">
          <p className="text-sm text-rose-800">
            <strong>🔒 Round Closed:</strong> This bidding round has ended. Results will be announced soon.
          </p>
        </div>
      )}

      {(roundStatus === 'processing' || activeRoundData?.status === 'processing') && (
        <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-sm text-blue-800">
            <strong>⚙️ Processing Bids:</strong> The system is currently processing all bids. Results will be available shortly.
          </p>
        </div>
      )}
    </div>
  );
};

export default RoundInfo;