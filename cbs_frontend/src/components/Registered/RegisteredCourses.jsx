import React, { useState } from 'react';
import { Clock, MapPin, Award, Trash2, Loader } from 'lucide-react';
import { API_URL } from '../../config';

const RegisteredCourses = ({ registeredCourses, onCourseDropped }) => {
  const [droppingCourseId, setDroppingCourseId] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);

  const handleDropClick = (course) => {
    setCourseToDelete(course);
    setShowConfirmDialog(true);
  };

  const handleConfirmDrop = async () => {
    if (!courseToDelete) {
      alert('Cannot drop course: Missing course information');
      setShowConfirmDialog(false);
      return;
    }

    if (!courseToDelete.enrollmentId) {
      alert('Cannot drop course: Missing enrollmentId. Please refresh the page.');
      console.error('Course object:', courseToDelete);
      setShowConfirmDialog(false);
      return;
    }

    setDroppingCourseId(courseToDelete.id);
    setShowConfirmDialog(false);

    try {
      const token = localStorage.getItem('authToken');
      const url = `${API_URL}/api/enrollment/${courseToDelete.enrollmentId}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert(`Successfully dropped ${courseToDelete.name}!\n\nIf there were students on the waitlist, the next student has been automatically enrolled.`);
        
        if (onCourseDropped) {
          await onCourseDropped();
        }
      } else {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to drop course');
      }
    } catch (err) {
      console.error('Error dropping course:', err);
      alert('Failed to drop course: ' + err.message);
    } finally {
      setDroppingCourseId(null);
      setCourseToDelete(null);
    }
  };

  const handleCancelDrop = () => {
    setShowConfirmDialog(false);
    setCourseToDelete(null);
  };

  const totalCredits = registeredCourses.reduce((sum, c) => sum + (c.credits || 0), 0);
  const ongoingCount = registeredCourses.filter(c => c.status === 'ongoing').length;

  return (
    <div className="space-y-4">
      {/* Empty State */}
      {registeredCourses.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-lg p-12 text-center">
          <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No Enrolled Courses</h3>
          <p className="text-gray-500">
            Win courses through bidding to see them here. Your enrolled courses will appear automatically when you win bids.
          </p>
        </div>
      ) : (
        // Course Cards
        registeredCourses.map(course => {
          const isDropping = droppingCourseId === course.id;
          const isOngoing = course.status === 'ongoing';

          const gradeColors = {
            'A': 'text-green-600',
            'B': 'text-blue-600',
            'C': 'text-yellow-600',
            'D': 'text-orange-600',
            'F': 'text-red-600',
            'ongoing': 'text-gray-500'
          };

          const gradeColor = gradeColors[course.grade] || 'text-gray-600';

          return (
            <div key={course.id} className="bg-white rounded-3xl shadow-lg hover:shadow-xl transition-all overflow-hidden">
              {/* Course Header */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 border-b-2 border-gray-200">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full border-2 border-green-200">
                        {course.code}
                      </span>
                      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-green-100 text-green-700 border-2 border-green-200">
                        ENROLLED
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-1">{course.name}</h3>
                    <p className="text-gray-600 text-sm flex items-center gap-2">
                      <span className="font-semibold">👨‍🏫 {course.instructor}</span>
                    </p>
                  </div>
                  
                  {/* Right side with status and drop button */}
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      course.status === 'ongoing' 
                        ? 'bg-blue-50 text-blue-700 border-2 border-blue-200'
                        : course.status === 'completed'
                        ? 'bg-green-50 text-green-700 border-2 border-green-200'
                        : 'bg-gray-50 text-gray-700 border-2 border-gray-200'
                    }`}>
                      {course.status === 'ongoing' ? 'In Progress' : 
                       course.status === 'completed' ? 'Completed' : course.status}
                    </span>
                    
                    {/* Drop Button */}
                    {isOngoing && (
                      <button
                        onClick={() => handleDropClick(course)}
                        disabled={isDropping}
                        className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                          isDropping
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-300 hover:shadow-md'
                        }`}
                        title="Drop this course"
                      >
                        {isDropping ? (
                          <>
                            <Loader className="w-4 h-4 animate-spin" />
                            <span className="hidden sm:inline">Dropping...</span>
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Drop</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Course Details */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Clock className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 font-semibold">Schedule</p>
                      <p className="text-sm font-bold text-gray-800">{course.schedule}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 font-semibold">Location</p>
                      <p className="text-sm font-bold text-gray-800">{course.location}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Award className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 font-semibold">Credits</p>
                      <p className="text-sm font-bold text-gray-800">{course.credits} Credits</p>
                    </div>
                  </div>
                </div>

                {/* Prerequisites */}
                {course.prerequisites && (
                  <div className="bg-orange-50 border-l-4 border-orange-400 p-3 rounded-r-xl mb-4">
                    <p className="text-xs text-orange-600 font-semibold mb-1">Prerequisites</p>
                    <p className="text-sm text-gray-700">{course.prerequisites}</p>
                  </div>
                )}

                {/* Description */}
                {course.description && (
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-xl mb-4">
                    <p className="text-xs text-blue-600 font-semibold mb-1">Course Description</p>
                    <p className="text-sm text-gray-700">{course.description}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && courseToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Drop Course?</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to drop <span className="font-bold">{courseToDelete.name}</span>?
              </p>
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-left">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">ℹ️ Note:</span> If there are students on the waitlist for this course, the next student will be automatically enrolled.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleCancelDrop}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDrop}
                className="flex-1 bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 transition-all"
              >
                Drop Course
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisteredCourses;