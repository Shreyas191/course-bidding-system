// src/components/Admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { 
  Users, BookOpen, TrendingUp, DollarSign, Plus, Edit2, Trash2, 
  Search, X, Save, CheckCircle, AlertCircle, LogOut, Home as HomeIcon
} from 'lucide-react';

const AdminDashboard = ({ handleLogout }) => {
  const [currentTab, setCurrentTab] = useState('overview');
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  
  const [courseForm, setCourseForm] = useState({
    courseName: '',
    departmentName: '',
    instructorName: '',
    day: '',
    time: '',
    location: '',
    credits: '',
    minBid: '',
    capacity: ''
  });
  
  const [studentForm, setStudentForm] = useState({
    name: '',
    email: '',
    password: '',
    studentId: '',
    major: '',
    year: '',
    points: '1000'
  });

  const token = localStorage.getItem('authToken');

  // Fetch all data
  useEffect(() => {
    if (currentTab === 'courses') fetchCourses();
    else if (currentTab === 'students') fetchStudents();
    else if (currentTab === 'bids') fetchBids();
  }, [currentTab]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8080/api/courses', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setCourses(data);
    } catch (err) {
      setError('Failed to fetch courses');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8080/api/admin/students', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setStudents(data);
    } catch (err) {
      setError('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const fetchBids = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8080/api/admin/bids', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setBids(data);
    } catch (err) {
      setError('Failed to fetch bids');
    } finally {
      setLoading(false);
    }
  };

  // Course CRUD operations
  const handleAddCourse = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/admin/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(courseForm)
      });
      
      if (response.ok) {
        alert('Course added successfully!');
        setShowCourseModal(false);
        setCourseForm({
          courseName: '', departmentName: '', instructorName: '',
          day: '', time: '', location: '', credits: '', minBid: '', capacity: ''
        });
        fetchCourses();
      } else {
        throw new Error('Failed to add course');
      }
    } catch (err) {
      alert('Error adding course: ' + err.message);
    }
  };

  const handleUpdateCourse = async () => {
    try {
      const response = await fetch(`http://localhost:8080/api/admin/courses/${editingCourse.courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(courseForm)
      });
      
      if (response.ok) {
        alert('Course updated successfully!');
        setShowCourseModal(false);
        setEditingCourse(null);
        fetchCourses();
      } else {
        throw new Error('Failed to update course');
      }
    } catch (err) {
      alert('Error updating course: ' + err.message);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;
    
    try {
      const response = await fetch(`http://localhost:8080/api/admin/courses/${courseId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        alert('Course deleted successfully!');
        fetchCourses();
      } else {
        throw new Error('Failed to delete course');
      }
    } catch (err) {
      alert('Error deleting course: ' + err.message);
    }
  };

  // Student CRUD operations
  const handleAddStudent = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/admin/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(studentForm)
      });
      
      if (response.ok) {
        alert('Student added successfully!');
        setShowStudentModal(false);
        setStudentForm({
          name: '', email: '', password: '', studentId: '',
          major: '', year: '', points: '1000'
        });
        fetchStudents();
      } else {
        throw new Error('Failed to add student');
      }
    } catch (err) {
      alert('Error adding student: ' + err.message);
    }
  };

  const handleUpdateStudent = async () => {
    try {
      const response = await fetch(`http://localhost:8080/api/admin/students/${editingStudent.studentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(studentForm)
      });
      
      if (response.ok) {
        alert('Student updated successfully!');
        setShowStudentModal(false);
        setEditingStudent(null);
        fetchStudents();
      } else {
        throw new Error('Failed to update student');
      }
    } catch (err) {
      alert('Error updating student: ' + err.message);
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if (!window.confirm('Are you sure you want to delete this student?')) return;
    
    try {
      const response = await fetch(`http://localhost:8080/api/admin/students/${studentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        alert('Student deleted successfully!');
        fetchStudents();
      } else {
        throw new Error('Failed to delete student');
      }
    } catch (err) {
      alert('Error deleting student: ' + err.message);
    }
  };

  // Publish bidding results
  const handlePublishResults = async () => {
    if (!window.confirm('Are you sure you want to publish bidding results? This action cannot be undone.')) return;
    
    try {
      const response = await fetch('http://localhost:8080/api/admin/bids/publish', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        alert('Bidding results published successfully!');
        fetchBids();
      } else {
        throw new Error('Failed to publish results');
      }
    } catch (err) {
      alert('Error publishing results: ' + err.message);
    }
  };

  const openEditCourse = (course) => {
    setEditingCourse(course);
    setCourseForm({
      courseName: course.courseName,
      departmentName: course.departmentName,
      instructorName: course.instructorName,
      day: course.day,
      time: course.time,
      location: course.location,
      credits: course.credits,
      minBid: course.minBid || '',
      capacity: course.capacity
    });
    setShowCourseModal(true);
  };

  const openEditStudent = (student) => {
    setEditingStudent(student);
    setStudentForm({
      name: student.name,
      email: student.email,
      password: '',
      studentId: student.studentId,
      major: student.major,
      year: student.year || '',
      points: student.points || '1000'
    });
    setShowStudentModal(true);
  };

  const stats = [
    { title: 'Total Courses', value: courses.length, icon: BookOpen, color: 'from-cyan-600 to-teal-600' },
    { title: 'Total Students', value: students.length, icon: Users, color: 'from-purple-600 to-pink-600' },
    { title: 'Active Bids', value: bids.length, icon: TrendingUp, color: 'from-amber-500 to-orange-500' },
    { title: 'Avg Bid Points', value: '145', icon: DollarSign, color: 'from-emerald-500 to-green-500' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                <HomeIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Admin Dashboard
                </h1>
                <p className="text-xs text-gray-600">Course Bidding System</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-rose-100 text-rose-600 px-4 py-2 rounded-xl font-semibold hover:bg-rose-200 transition-all"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stats */}
        {currentTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <div key={index} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.color} flex items-center justify-center mb-4`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-gray-600 text-sm mb-1">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-3xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => setCurrentTab('courses')}
                  className="bg-gradient-to-r from-cyan-600 to-teal-600 text-white p-4 rounded-xl font-semibold hover:shadow-xl transition-all"
                >
                  Manage Courses
                </button>
                <button
                  onClick={() => setCurrentTab('students')}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-xl font-semibold hover:shadow-xl transition-all"
                >
                  Manage Students
                </button>
                <button
                  onClick={() => setCurrentTab('bids')}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 rounded-xl font-semibold hover:shadow-xl transition-all"
                >
                  View Bids
                </button>
                <button
                  onClick={handlePublishResults}
                  className="bg-gradient-to-r from-emerald-500 to-green-500 text-white p-4 rounded-xl font-semibold hover:shadow-xl transition-all"
                >
                  Publish Results
                </button>
              </div>
            </div>
          </>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg p-2 flex gap-2 overflow-x-auto">
          {['overview', 'courses', 'students', 'bids'].map(tab => (
            <button
              key={tab}
              onClick={() => setCurrentTab(tab)}
              className={`px-6 py-3 rounded-xl font-semibold transition-all capitalize ${
                currentTab === tab
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Courses Tab */}
        {currentTab === 'courses' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-lg p-4 flex justify-between items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <button
                onClick={() => {
                  setEditingCourse(null);
                  setCourseForm({
                    courseName: '', departmentName: '', instructorName: '',
                    day: '', time: '', location: '', credits: '', minBid: '', capacity: ''
                  });
                  setShowCourseModal(true);
                }}
                className="ml-4 flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-xl transition-all"
              >
                <Plus className="w-5 h-5" />
                Add Course
              </button>
            </div>

            {loading ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading courses...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {courses.filter(c => 
                  c.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  c.instructorName.toLowerCase().includes(searchTerm.toLowerCase())
                ).map(course => (
                  <div key={course.courseId} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full">
                            {course.courseName}
                          </span>
                          <span className="text-xs text-gray-600">{course.departmentName}</span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">{course.instructorName}</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-semibold">Day:</span> {course.day}
                          </div>
                          <div>
                            <span className="font-semibold">Time:</span> {course.time}
                          </div>
                          <div>
                            <span className="font-semibold">Credits:</span> {course.credits}
                          </div>
                          <div>
                            <span className="font-semibold">Capacity:</span> {course.enrolled}/{course.capacity}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditCourse(course)}
                          className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-all"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCourse(course.courseId)}
                          className="p-2 bg-rose-100 text-rose-600 rounded-lg hover:bg-rose-200 transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Students Tab */}
        {currentTab === 'students' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-lg p-4 flex justify-between items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <button
                onClick={() => {
                  setEditingStudent(null);
                  setStudentForm({
                    name: '', email: '', password: '', studentId: '',
                    major: '', year: '', points: '1000'
                  });
                  setShowStudentModal(true);
                }}
                className="ml-4 flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-xl transition-all"
              >
                <Plus className="w-5 h-5" />
                Add Student
              </button>
            </div>

            {loading ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading students...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {students.filter(s => 
                  s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  s.studentId?.toLowerCase().includes(searchTerm.toLowerCase())
                ).map(student => (
                  <div key={student.id} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">{student.name}</h3>
                        <p className="text-sm text-gray-600">{student.email}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditStudent(student)}
                          className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(student.studentId)}
                          className="p-2 bg-rose-100 text-rose-600 rounded-lg hover:bg-rose-200 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
                      <div>
                        <span className="font-semibold">ID:</span> {student.studentId}
                      </div>
                      <div>
                        <span className="font-semibold">Major:</span> {student.major}
                      </div>
                      <div>
                        <span className="font-semibold">Year:</span> {student.year || 'N/A'}
                      </div>
                      <div>
                        <span className="font-semibold">Points:</span> {student.points || 1000}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bids Tab */}
        {currentTab === 'bids' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-lg p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">All Bids</h2>
              <button
                onClick={handlePublishResults}
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-xl transition-all"
              >
                <CheckCircle className="w-5 h-5" />
                Publish Results
              </button>
            </div>

            {loading ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading bids...</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                      <tr>
                        <th className="px-6 py-4 text-left">Student</th>
                        <th className="px-6 py-4 text-left">Course</th>
                        <th className="px-6 py-4 text-left">Bid Amount</th>
                        <th className="px-6 py-4 text-left">Status</th>
                        <th className="px-6 py-4 text-left">Round</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {bids.map((bid, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4">{bid.studentName || bid.studentId}</td>
                          <td className="px-6 py-4">{bid.courseName || bid.courseId}</td>
                          <td className="px-6 py-4 font-bold text-indigo-600">{bid.bidAmount} pts</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              bid.status === 'won' ? 'bg-green-100 text-green-700' :
                              bid.status === 'lost' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {bid.status || 'Pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4">Round {bid.round || 1}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Course Modal */}
      {showCourseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingCourse ? 'Edit Course' : 'Add New Course'}
              </h2>
              <button onClick={() => setShowCourseModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Course Name</label>
                  <input
                    type="text"
                    value={courseForm.courseName}
                    onChange={(e) => setCourseForm({...courseForm, courseName: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none"
                    placeholder="CS301 Advanced Algorithms"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Department</label>
                  <input
                    type="text"
                    value={courseForm.departmentName}
                    onChange={(e) => setCourseForm({...courseForm, departmentName: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none"
                    placeholder="Computer Science"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Instructor Name</label>
                <input
                  type="text"
                  value={courseForm.instructorName}
                  onChange={(e) => setCourseForm({...courseForm, instructorName: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none"
                  placeholder="Dr. Sarah Mitchell"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Day</label>
                  <select
                    value={courseForm.day}
                    onChange={(e) => setCourseForm({...courseForm, day: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">Select Day</option>
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Time</label>
                  <input
                    type="time"
                    value={courseForm.time}
                    onChange={(e) => setCourseForm({...courseForm, time: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Location</label>
                <input
                  type="text"
                  value={courseForm.location}
                  onChange={(e) => setCourseForm({...courseForm, location: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none"
                  placeholder="CS Building Room 101"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Credits</label>
                  <input
                    type="number"
                    value={courseForm.credits}
                    onChange={(e) => setCourseForm({...courseForm, credits: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none"
                    placeholder="3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Min Bid</label>
                  <input
                    type="number"
                    value={courseForm.minBid}
                    onChange={(e) => setCourseForm({...courseForm, minBid: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none"
                    placeholder="10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Capacity</label>
                  <input
                    type="number"
                    value={courseForm.capacity}
                    onChange={(e) => setCourseForm({...courseForm, capacity: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none"
                    placeholder="30"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCourseModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={editingCourse ? handleUpdateCourse : handleAddCourse}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {editingCourse ? 'Update' : 'Add'} Course
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student Modal */}
      {showStudentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingStudent ? 'Edit Student' : 'Add New Student'}
              </h2>
              <button onClick={() => setShowStudentModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={studentForm.name}
                    onChange={(e) => setStudentForm({...studentForm, name: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Student ID</label>
                  <input
                    type="text"
                    value={studentForm.studentId}
                    onChange={(e) => setStudentForm({...studentForm, studentId: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none"
                    placeholder="STU2024001"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={studentForm.email}
                  onChange={(e) => setStudentForm({...studentForm, email: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none"
                  placeholder="john.doe@university.edu"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password {editingStudent && '(leave blank to keep current)'}
                </label>
                <input
                  type="password"
                  value={studentForm.password}
                  onChange={(e) => setStudentForm({...studentForm, password: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none"
                  placeholder="Enter password"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Major</label>
                  <input
                    type="text"
                    value={studentForm.major}
                    onChange={(e) => setStudentForm({...studentForm, major: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none"
                    placeholder="Computer Science"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Year</label>
                  <select
                    value={studentForm.year}
                    onChange={(e) => setStudentForm({...studentForm, year: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">Select Year</option>
                    <option value="Freshman">Freshman</option>
                    <option value="Sophomore">Sophomore</option>
                    <option value="Junior">Junior</option>
                    <option value="Senior">Senior</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Points</label>
                  <input
                    type="number"
                    value={studentForm.points}
                    onChange={(e) => setStudentForm({...studentForm, points: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none"
                    placeholder="1000"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowStudentModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={editingStudent ? handleUpdateStudent : handleAddStudent}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {editingStudent ? 'Update' : 'Add'} Student
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-rose-50 border-2 border-rose-200 rounded-2xl p-4 shadow-xl max-w-md z-50">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-rose-600" />
            <div className="flex-1">
              <p className="font-semibold text-rose-800">Error</p>
              <p className="text-sm text-rose-600">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;