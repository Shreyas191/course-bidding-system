import React from 'react';
import { List } from 'lucide-react';

const Waitlist = ({ waitlist, setWaitlist, courses }) => {
  const getCourseById = (id) => courses.find(c => c.id === id);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Waitlist</h2>
        <p className="text-gray-600">Courses you're waiting to join</p>
      </div>
      {waitlist.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-lg p-12 text-center">
          <List className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No waitlisted courses</h3>
          <p className="text-gray-500">Add courses to your waitlist from the browse page</p>
        </div>
      ) : (
        waitlist.map(item => {
          const course = getCourseById(item.courseId);
          return (
            <div key={item.courseId} className="bg-white rounded-3xl shadow-lg p-6 hover:shadow-xl transition-all">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-bold text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full">
                      {course.code}
                    </span>
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-yellow-100 text-yellow-700">
                      WAITLISTED
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-1">{course.name}</h3>
                  <p className="text-gray-600 text-sm mb-3">{course.instructor}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>Added: {item.addedDate}</span>
                    <span>•</span>
                    <span>Chance: {item.estimatedChance}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 mb-1">Position</p>
                  <p className="text-3xl font-bold text-yellow-600">#{item.position}</p>
                  <button
                    className="mt-4 bg-red-100 text-red-600 px-4 py-2 rounded-xl font-semibold hover:bg-red-200 transition-all"
                    onClick={() => setWaitlist(waitlist.filter(w => w.courseId !== item.courseId))}
                  >
                    Remove
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

export default Waitlist;