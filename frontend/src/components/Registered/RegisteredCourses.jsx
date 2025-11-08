import React from 'react';
import { Clock, MapPin, Award } from 'lucide-react';

const RegisteredCourses = ({ registeredCourses }) => {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">My Courses</h2>
        <p className="text-gray-600">Total Credits: {registeredCourses.reduce((sum, c) => sum + c.credits, 0)}</p>
      </div>
      {registeredCourses.map(course => (
        <div key={course.id} className="bg-white rounded-3xl shadow-lg p-6 hover:shadow-xl transition-all">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                  {course.code}
                </span>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-green-100 text-green-700">
                  ENROLLED
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-1">{course.name}</h3>
              <p className="text-gray-600 text-sm mb-3">{course.instructor}</p>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {course.schedule}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {course.location}
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  {course.credits} Credits
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-1">Current Grade</p>
              <p className="text-3xl font-bold text-green-600">{course.grade}</p>
              <span className="inline-block mt-2 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">
                {course.status}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RegisteredCourses;