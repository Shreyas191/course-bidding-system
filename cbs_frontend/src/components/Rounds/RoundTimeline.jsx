import React from 'react';
import { CheckCircle, Circle, Clock } from 'lucide-react';

const RoundTimeline = ({ currentRound, round1EndDate, round2EndDate }) => {
  const rounds = [
    {
      round: 1,
      title: 'Round 1 - Initial Bidding',
      description: 'Place your first bids on desired courses',
      startDate: 'Oct 15, 2024',
      endDate: round1EndDate,
      status: currentRound > 1 ? 'completed' : currentRound === 1 ? 'active' : 'upcoming'
    },
    {
      round: 2,
      title: 'Round 2 - Final Bidding',
      description: 'Adjust bids and secure your spots',
      startDate: round1EndDate,
      endDate: round2EndDate,
      status: currentRound > 2 ? 'completed' : currentRound === 2 ? 'active' : 'upcoming'
    },
    {
      round: 3,
      title: 'Results & Allocation',
      description: 'Course assignments finalized',
      startDate: round2EndDate,
      endDate: 'Oct 25, 2024',
      status: currentRound > 2 ? 'active' : 'upcoming'
    }
  ];

  const getStatusIcon = (status) => {
    if (status === 'completed') return <CheckCircle className="w-6 h-6 text-emerald-500" />;
    if (status === 'active') return <Clock className="w-6 h-6 text-cyan-500 animate-pulse" />;
    return <Circle className="w-6 h-6 text-gray-300" />;
  };

  const getStatusColor = (status) => {
    if (status === 'completed') return 'border-emerald-500 bg-emerald-50';
    if (status === 'active') return 'border-cyan-500 bg-cyan-50';
    return 'border-gray-300 bg-gray-50';
  };

  return (
    <div className="bg-white rounded-3xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Bidding Timeline</h2>
      
      <div className="space-y-6">
        {rounds.map((round, index) => (
          <div key={round.round} className="relative">
            {index < rounds.length - 1 && (
              <div className={`absolute left-3 top-12 w-0.5 h-full ${
                round.status === 'completed' ? 'bg-emerald-500' : 'bg-gray-300'
              }`} />
            )}
            
            <div className="flex gap-4">
              <div className="relative z-10 flex-shrink-0">
                {getStatusIcon(round.status)}
              </div>
              
              <div className={`flex-1 border-2 ${getStatusColor(round.status)} rounded-2xl p-4 transition-all`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">{round.title}</h3>
                    <p className="text-sm text-gray-600">{round.description}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    round.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                    round.status === 'active' ? 'bg-cyan-100 text-cyan-700' :
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {round.status.toUpperCase()}
                  </span>
                </div>
                
                <div className="flex gap-4 text-sm text-gray-600 mt-3">
                  <div>
                    <span className="font-semibold">Start:</span> {round.startDate}
                  </div>
                  <div>
                    <span className="font-semibold">End:</span> {round.endDate}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RoundTimeline;