// src/components/Admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { 
  Users, BookOpen, TrendingUp, DollarSign, Plus, Edit2, Trash2, 
  Search, X, Save, CheckCircle, AlertCircle, LogOut, Home as HomeIcon,
  Calendar, Clock, MapPin, Eye, Activity, List, UserCheck
} from 'lucide-react';
import { API_URL } from '../../config';

const AdminDashboard = ({ handleLogout }) => {
  const [currentTab, setCurrentTab] = useState('overview');
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [bids, setBids] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [selectedRound, setSelectedRound] = useState(null);
  const [roundBids, setRoundBids] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [waitlists, setWaitlists] = useState([]);
  const [courseWaitlists, setCourseWaitlists] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Modal states
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showRoundModal, setShowRoundModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editingRound, setEditingRound] = useState(null);
  
  const [courseForm, setCourseForm] = useState({
    courseName: '',
    courseCode: '',
    deptId: 1,
    instructorName: '',
    credits: 3,
    minBid: 50,
    capacity: 30,
    description: '',
    prerequisites: '',
    dayOfWeek: 'Monday',
    startTime: '09:00',
    endTime: '12:00',
    location: ''
  });
  
  const [studentForm, setStudentForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    year: 1,
    deptId: 1
  });

  const [roundForm, setRoundForm] = useState({
    roundNumber: 1,
    roundName: '',
    startTime: '',
    endTime: '',
    status: 'pending'
  });

  const token = localStorage.getItem('authToken');

  // Log API URL on mount (for debugging)
  useEffect(() => {
    console.log('🔧 Admin Dashboard using API URL:', API_URL);
  }, []);

  // Helper function to format time (remove seconds)
  const formatTime = (time) => {
    if (!time) return '';
    return time.substring(0, 5);
  };

  // Helper function to format datetime in local timezone
  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  // Fetch departments on mount
  useEffect(() => {
    fetchDepartments();
    fetchCourses();
    fetchStudents();
    fetchBids();
  }, []);

  // Real-time clock update every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch all data
  useEffect(() => {
    if (currentTab === 'courses') fetchCourses();
    else if (currentTab === 'students') fetchStudents();
    else if (currentTab === 'bids') fetchRounds();
    else if (currentTab === 'waitlists') fetchAllWaitlists();
  }, [currentTab]);

  // Helper function to get round status based on real-time
 const getRoundStatus = (round) => {
  const now = currentTime;
  const startTime = round.startTime ? new Date(round.startTime) : null;
  const endTime = round.endTime ? new Date(round.endTime) : null;

  if (!startTime || !endTime) {
    return { status: 'pending', label: 'Not Started', color: 'bg-gray-100 text-gray-700' };
  }

  // ✅ CHECK TIME FIRST - This is the fix!
  
  // Before start time
  if (now < startTime) {
    return { status: 'pending', label: 'Not Started', color: 'bg-yellow-100 text-yellow-700' };
  }
  
  // Currently active (within time window)
  if (now >= startTime && now < endTime) {
    return { status: 'active', label: 'Active', color: 'bg-green-100 text-green-700' };
  }
  
  // After end time - NOW check if processed
  if (round.status === 'closed' || round.processedAt) {
    return { status: 'closed', label: 'Closed', color: 'bg-gray-100 text-gray-700' };
  }
  
  // After end time but not processed yet
  return { status: 'closed', label: ' closed', color: 'bg-blue-100 text-blue-700' };
};

  // Helper function to calculate countdown
  const getCountdown = (round) => {
    const now = currentTime;
    const startTime = round.startTime ? new Date(round.startTime) : null;
    const endTime = round.endTime ? new Date(round.endTime) : null;

    if (!startTime || !endTime) return 'Time not set';

    let targetTime, prefix;
    
    if (now < startTime) {
      targetTime = startTime;
      prefix = 'Starts in: ';
    } else if (now >= startTime && now < endTime) {
      targetTime = endTime;
      prefix = 'Ends in: ';
    } else {
      return 'Ended';
    }

    const diff = targetTime - now;
    if (diff <= 0) return 'Starting now...';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    let timeStr = '';
    if (days > 0) timeStr += `${days}d `;
    if (hours > 0 || days > 0) timeStr += `${hours}h `;
    if (minutes > 0 || hours > 0 || days > 0) timeStr += `${minutes}m `;
    timeStr += `${seconds}s`;

    return prefix + timeStr;
  };

  const fetchDepartments = async () => {
    try {
      console.log('📥 Fetching departments from:', `${API_URL}/api/departments`);
      const response = await fetch(`${API_URL}/api/departments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Departments fetched:', data);
        setDepartments(data);
      } else {
        console.error('❌ Failed to fetch departments:', response.status);
      }
    } catch (err) {
      console.error('❌ Failed to fetch departments:', err);
    }
  };

  const fetchCourses = async () => {
    setLoading(true);
    try {
      console.log('📥 Fetching courses from:', `${API_URL}/api/courses`);
      const response = await fetch(`${API_URL}/api/courses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      console.log('✅ Courses fetched:', data.length, 'courses');
      setCourses(data);
    } catch (err) {
      console.error('❌ Error fetching courses:', err);
      setError('Failed to fetch courses');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      console.log('📥 Fetching students from:', `${API_URL}/api/admin/students`);
      const response = await fetch(`${API_URL}/api/admin/students`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      console.log('✅ Students fetched:', data.length, 'students');
      setStudents(data);
    } catch (err) {
      console.error('❌ Error fetching students:', err);
      setError('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const fetchBids = async () => {
    setLoading(true);
    try {
      console.log('📥 Fetching bids from:', `${API_URL}/api/admin/bids`);
      const response = await fetch(`${API_URL}/api/admin/bids`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      console.log('✅ Bids fetched:', data.length, 'bids');
      setBids(data);
    } catch (err) {
      console.error('❌ Error fetching bids:', err);
      setError('Failed to fetch bids');
    } finally {
      setLoading(false);
    }
  };

  const fetchRounds = async () => {
    setLoading(true);
    try {
      console.log('📥 Fetching rounds from:', `${API_URL}/api/admin/rounds`);
      const response = await fetch(`${API_URL}/api/admin/rounds`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      console.log('✅ Rounds fetched:', data.length, 'rounds');
      setRounds(data);
    } catch (err) {
      console.error('❌ Error fetching rounds:', err);
      setError('Failed to fetch rounds');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoundBids = async (roundId) => {
    setLoading(true);
    try {
      console.log('📥 Fetching round bids from:', `${API_URL}/api/admin/rounds/${roundId}`);
      const response = await fetch(`${API_URL}/api/admin/rounds/${roundId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      console.log('✅ Round bids fetched:', data);
      setSelectedRound(data);
      setRoundBids(data.bids || []);
    } catch (err) {
      console.error('❌ Error fetching round bids:', err);
      setError('Failed to fetch round bids');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllWaitlists = async () => {
    setLoading(true);
    try {
      console.log('📥 Fetching waitlists from:', `${API_URL}/api/admin/waitlists`);
      const response = await fetch(`${API_URL}/api/admin/waitlists`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Waitlists fetched:', data);
        setWaitlists(data);
      } else {
        console.error('❌ Failed to fetch waitlists:', response.status);
      }
    } catch (err) {
      console.error('❌ Error fetching waitlists:', err);
      setError('Failed to fetch waitlists');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseWaitlist = async (courseId) => {
    try {
      console.log('📥 Fetching course waitlist from:', `${API_URL}/api/admin/waitlist/course/${courseId}`);
      const response = await fetch(`${API_URL}/api/admin/waitlist/course/${courseId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Course waitlist fetched:', data);
        setCourseWaitlists(prev => ({ ...prev, [courseId]: data }));
      } else {
        console.error('❌ Failed to fetch course waitlist:', response.status);
      }
    } catch (err) {
      console.error('❌ Failed to fetch course waitlist:', err);
    }
  };

  const handlePromoteFromWaitlist = async (courseId) => {
    if (!window.confirm('Promote the next student from the waitlist for this course?')) return;
    
    try {
      console.log('📤 Promoting from waitlist:', `${API_URL}/api/admin/waitlist/promote/${courseId}`);
      const response = await fetch(`${API_URL}/api/admin/waitlist/promote/${courseId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        console.log('✅ Student promoted successfully');
        alert('Student promoted from waitlist successfully!');
        fetchAllWaitlists();
        fetchCourses();
      } else {
        throw new Error('Failed to promote student');
      }
    } catch (err) {
      console.error('❌ Error promoting student:', err);
      alert('Error promoting student: ' + err.message);
    }
  };

  const handleProcessAllWaitlists = async () => {
    if (!window.confirm('Process all waitlists system-wide? This will promote eligible students from all waitlists.')) return;
    
    try {
      console.log('📤 Processing all waitlists:', `${API_URL}/api/admin/waitlist/process-all`);
      const response = await fetch(`${API_URL}/api/admin/waitlist/process-all`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        console.log('✅ All waitlists processed successfully');
        alert('All waitlists processed successfully!');
        fetchAllWaitlists();
        fetchCourses();
      } else {
        throw new Error('Failed to process waitlists');
      }
    } catch (err) {
      console.error('❌ Error processing waitlists:', err);
      alert('Error processing waitlists: ' + err.message);
    }
  };

  const handleRemoveFromWaitlist = async (waitlistId) => {
    if (!window.confirm('Remove this student from the waitlist?')) return;
    
    try {
      console.log('📤 Removing from waitlist:', `${API_URL}/api/admin/waitlist/${waitlistId}`);
      const response = await fetch(`${API_URL}/api/admin/waitlist/${waitlistId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        console.log('✅ Student removed successfully');
        alert('Student removed from waitlist successfully!');
        fetchAllWaitlists();
      } else {
        throw new Error('Failed to remove student');
      }
    } catch (err) {
      console.error('❌ Error removing student:', err);
      alert('Error removing student: ' + err.message);
    }
  };

  // Course CRUD operations
  const handleAddCourse = async () => {
    try {
      console.log('📤 Adding course to:', `${API_URL}/api/admin/courses`);
      const response = await fetch(`${API_URL}/api/admin/courses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(courseForm)
      });
      
      if (response.ok) {
        console.log('✅ Course added successfully');
        alert('Course added successfully!');
        setShowCourseModal(false);
        setCourseForm({
          courseName: '', courseCode: '', deptId: 1, instructorName: '',
          credits: 3, minBid: 50, capacity: 30, description: '', prerequisites: ''
        });
        fetchCourses();
      } else {
        throw new Error('Failed to add course');
      }
    } catch (err) {
      console.error('❌ Error adding course:', err);
      alert('Error adding course: ' + err.message);
    }
  };

  const handleUpdateCourse = async () => {
    try {
      const updateData = {
        ...courseForm,
        startTime: formatTime(courseForm.startTime),
        endTime: formatTime(courseForm.endTime)
      };
      
      console.log('📤 Updating course:', `${API_URL}/api/admin/courses/${editingCourse.courseId}`);
      const response = await fetch(`${API_URL}/api/admin/courses/${editingCourse.courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });
      
      if (response.ok) {
        console.log('✅ Course updated successfully');
        alert('Course updated successfully!');
        setShowCourseModal(false);
        setEditingCourse(null);
        fetchCourses();
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to update course:', errorText);
        throw new Error(errorText || 'Failed to update course');
      }
    } catch (err) {
      console.error('❌ Error updating course:', err);
      alert('Error updating course: ' + err.message);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;
    
    try {
      console.log('📤 Deleting course:', `${API_URL}/api/admin/courses/${courseId}`);
      const response = await fetch(`${API_URL}/api/admin/courses/${courseId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        console.log('✅ Course deleted successfully');
        alert('Course deleted successfully!');
        fetchCourses();
      } else {
        throw new Error('Failed to delete course');
      }
    } catch (err) {
      console.error('❌ Error deleting course:', err);
      alert('Error deleting course: ' + err.message);
    }
  };

  // Student CRUD operations
  const handleAddStudent = async () => {
    try {
      console.log('📤 Adding student to:', `${API_URL}/api/admin/students`);
      const response = await fetch(`${API_URL}/api/admin/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(studentForm)
      });
      
      if (response.ok) {
        console.log('✅ Student added successfully');
        alert('Student added successfully!');
        setShowStudentModal(false);
        setStudentForm({
          name: '', email: '', password: '', role: 'student', year: 1, deptId: 1
        });
        fetchStudents();
      } else {
        throw new Error('Failed to add student');
      }
    } catch (err) {
      console.error('❌ Error adding student:', err);
      alert('Error adding student: ' + err.message);
    }
  };

  const handleUpdateStudent = async () => {
    try {
      console.log('📤 Updating student:', `${API_URL}/api/admin/students/${editingStudent.studentId}`);
      const response = await fetch(`${API_URL}/api/admin/students/${editingStudent.studentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(studentForm)
      });
      
      if (response.ok) {
        console.log('✅ Student updated successfully');
        alert('Student updated successfully!');
        setShowStudentModal(false);
        setEditingStudent(null);
        fetchStudents();
      } else {
        throw new Error('Failed to update student');
      }
    } catch (err) {
      console.error('❌ Error updating student:', err);
      alert('Error updating student: ' + err.message);
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if (!window.confirm('Are you sure you want to delete this student?')) return;
    
    try {
      console.log('📤 Deleting student:', `${API_URL}/api/admin/students/${studentId}`);
      const response = await fetch(`${API_URL}/api/admin/students/${studentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        console.log('✅ Student deleted successfully');
        alert('Student deleted successfully!');
        fetchStudents();
      } else {
        throw new Error('Failed to delete student');
      }
    } catch (err) {
      console.error('❌ Error deleting student:', err);
      alert('Error deleting student: ' + err.message);
    }
  };

  // Round CRUD operations
  const handleAddRound = async () => {
  try {
    // ✅ NEW: Convert local datetime to UTC for MySQL
    const formatForMySQLUTC = (datetimeLocal) => {
      if (!datetimeLocal) return null;
      
      // Create Date object from local datetime-local input
      const localDate = new Date(datetimeLocal);
      
      // Get UTC components
      const year = localDate.getUTCFullYear();
      const month = String(localDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(localDate.getUTCDate()).padStart(2, '0');
      const hours = String(localDate.getUTCHours()).padStart(2, '0');
      const minutes = String(localDate.getUTCMinutes()).padStart(2, '0');
      const seconds = String(localDate.getUTCSeconds()).padStart(2, '0');
      
      // Return in MySQL UTC format
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    const roundData = {
      ...roundForm,
      startTime: formatForMySQLUTC(roundForm.startTime),
      endTime: formatForMySQLUTC(roundForm.endTime)
    };

    console.log('📤 Adding round with UTC times:', roundData);
    const response = await fetch(`${API_URL}/api/admin/rounds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(roundData)
    });
    
    if (response.ok) {
      console.log('✅ Round created successfully');
      alert('Round created successfully!');
      setRoundForm({ roundNumber: 1, roundName: '', startTime: '', endTime: '', status: 'pending' });
      await fetchRounds();
      setShowRoundModal(false);
    } else {
      throw new Error('Failed to create round');
    }
  } catch (err) {
    console.error('❌ Error creating round:', err);
    alert('Error creating round: ' + err.message);
  }
};


  const handleUpdateRound = async () => {
  try {
    // ✅ NEW: Convert local datetime to UTC for MySQL
    const formatForMySQLUTC = (datetimeLocal) => {
      if (!datetimeLocal) return null;
      
      // Create Date object from local datetime-local input
      const localDate = new Date(datetimeLocal);
      
      // Get UTC components
      const year = localDate.getUTCFullYear();
      const month = String(localDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(localDate.getUTCDate()).padStart(2, '0');
      const hours = String(localDate.getUTCHours()).padStart(2, '0');
      const minutes = String(localDate.getUTCMinutes()).padStart(2, '0');
      const seconds = String(localDate.getUTCSeconds()).padStart(2, '0');
      
      // Return in MySQL UTC format
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };
    
    const startFormatted = formatForMySQLUTC(roundForm.startTime);
    const endFormatted = formatForMySQLUTC(roundForm.endTime);
    
    console.log('=== ROUND UPDATE DEBUG (UTC) ===');
    console.log('Local form values:', roundForm.startTime, roundForm.endTime);
    console.log('UTC MySQL formatted:', startFormatted, endFormatted);
    
    // Validate BOTH times are provided
    if (!roundForm.startTime || !roundForm.endTime) {
      alert('Both start time and end time are required!');
      return;
    }
    
    // Validate end time is after start time (in local time for user feedback)
    const startDate = new Date(roundForm.startTime);
    const endDate = new Date(roundForm.endTime);
    
    console.log('Local start date:', startDate);
    console.log('Local end date:', endDate);
    console.log('End > Start?', endDate > startDate);
    
    if (endDate <= startDate) {
      alert('Error: End time must be after start time!\n\n' +
            `Start: ${startDate.toLocaleString()}\n` +
            `End: ${endDate.toLocaleString()}`);
      return;
    }
    
    const roundData = {
      roundNumber: roundForm.roundNumber,
      roundName: roundForm.roundName,
      startTime: startFormatted,  // ✅ UTC time
      endTime: endFormatted,      // ✅ UTC time
      status: roundForm.status
    };
    
    console.log('Final UTC payload:', JSON.stringify(roundData, null, 2));
    console.log('📤 Updating round:', `${API_URL}/api/admin/rounds/${editingRound.roundId}`);

    const response = await fetch(`${API_URL}/api/admin/rounds/${editingRound.roundId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(roundData)
    });
    
    console.log('Response status:', response.status);
    
    if (response.ok) {
      console.log('✅ Round updated successfully');
      alert('Round updated successfully!');
      setEditingRound(null);
      setRoundForm({ roundNumber: 1, roundName: '', startTime: '', endTime: '', status: 'pending' });
      await fetchRounds();
      setShowRoundModal(false);
    } else {
      const errorText = await response.text();
      console.error('Backend error response:', errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        console.error('Parsed error:', errorJson);
        alert('Failed to update round:\n' + (errorJson.message || errorJson.error || errorText));
      } catch (e) {
        alert('Failed to update round:\n' + errorText);
      }
      
      throw new Error(errorText);
    }
  } catch (err) {
    console.error('=== FULL ERROR ===', err);
    console.error('Error stack:', err.stack);
  }
};


  const handleDeleteRound = async (roundId) => {
    if (!window.confirm('Are you sure you want to delete this round?')) return;
    
    try {
      console.log('📤 Deleting round:', `${API_URL}/api/admin/rounds/${roundId}`);
      const response = await fetch(`${API_URL}/api/admin/rounds/${roundId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        console.log('✅ Round deleted successfully');
        alert('Round deleted successfully!');
        if (selectedRound?.roundId === roundId) {
          setSelectedRound(null);
          setRoundBids([]);
        }
        await fetchRounds(); // Wait for rounds to refresh
      } else {
        throw new Error('Failed to delete round');
      }
    } catch (err) {
      console.error('❌ Error deleting round:', err);
      alert('Error deleting round: ' + err.message);
    }
  };

  const openRoundModal = (round = null) => {
    if (round) {
      setEditingRound(round);
      
      // Convert UTC times to local time for datetime-local input
      const formatForDatetimeLocal = (utcString) => {
        if (!utcString) return '';
        const date = new Date(utcString);
        // Format: YYYY-MM-DDTHH:mm (required format for datetime-local)
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      };
      
      setRoundForm({
        roundNumber: round.roundNumber,
        roundName: round.roundName,
        startTime: formatForDatetimeLocal(round.startTime),
        endTime: formatForDatetimeLocal(round.endTime),
        status: round.status
      });
    } else {
      setEditingRound(null);
      const nextRoundNumber = rounds.length > 0 ? Math.max(...rounds.map(r => r.roundNumber)) + 1 : 1;
      setRoundForm({ roundNumber: nextRoundNumber, roundName: '', startTime: '', endTime: '', status: 'pending' });
    }
    setShowRoundModal(true);
  };

  // Publish bidding results
  const handlePublishResults = async (roundId) => {
    if (!window.confirm('Are you sure you want to publish results for this round? This will:\n- Assign courses to highest bidders\n- Refund points to unsuccessful bidders\n- This action cannot be undone.')) return;
    
    try {
      console.log('📤 Publishing results for round:', `${API_URL}/api/rounds/${roundId}/publish`);
      const response = await fetch(`${API_URL}/api/rounds/${roundId}/publish`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        console.log('✅ Results published successfully');
        alert('Results published successfully! Courses assigned and points refunded.');
        await fetchRounds(); // Wait for rounds to refresh
        await fetchBids(); // Wait for bids to refresh
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to publish results:', errorText);
        throw new Error(errorText || 'Failed to publish results');
      }
    } catch (err) {
      console.error('❌ Error publishing results:', err);
      alert('Error publishing results: ' + err.message);
    }
  };

  const openEditCourse = (course) => {
    setEditingCourse(course);
    setCourseForm({
      courseName: course.courseName,
      courseCode: course.courseCode || '',
      deptId: course.deptId || 1,
      instructorName: course.instructorName,
      credits: course.credits,
      minBid: course.minBid || 50,
      capacity: course.capacity,
      description: course.description || '',
      prerequisites: course.prerequisites || '',
      dayOfWeek: course.schedule?.[0]?.dayOfWeek || 'Monday',
      startTime: formatTime(course.schedule?.[0]?.startTime) || '09:00',
      endTime: formatTime(course.schedule?.[0]?.endTime) || '12:00',
      location: course.schedule?.[0]?.location || ''
    });
    setShowCourseModal(true);
  };

  const openEditStudent = (student) => {
    setEditingStudent(student);
    setStudentForm({
      name: student.name,
      email: student.email,
      password: '',
      role: student.role || 'student',
      year: student.year || 1,
      deptId: student.deptId || 1
    });
    setShowStudentModal(true);
  };

  const stats = [
    { title: 'Total Courses', value: courses.length, icon: BookOpen, color: 'text-blue-600 bg-blue-50' },
    { title: 'Total Students', value: students.length, icon: Users, color: 'text-purple-600 bg-purple-50' },
    { title: 'Active Bids', value: bids.length, icon: TrendingUp, color: 'text-amber-600 bg-amber-50' },
    { 
      title: 'Avg Bid Points', 
      value: bids.length > 0 
        ? Math.round(bids.reduce((sum, bid) => sum + (bid.bidAmount || 0), 0) / bids.length)
        : 0, 
      icon: DollarSign, 
      color: 'text-green-600 bg-green-50' 
    }
  ];

  // Group waitlists by course
  const waitlistsByCourse = waitlists.reduce((acc, waitlist) => {
    const courseId = waitlist.courseId;
    if (!acc[courseId]) {
      acc[courseId] = {
        courseCode: waitlist.courseCode,
        courseName: waitlist.courseName,
        students: []
      };
    }
    acc[courseId].students.push(waitlist);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center">
                <HomeIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Admin Dashboard
                </h1>
                <p className="text-xs text-gray-600">Course Bidding System</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-xl font-semibold hover:bg-gray-200 transition-all"
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
                <div key={index} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-all">
                  <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center mb-4`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                  <p className="text-gray-600 text-sm mb-1">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => setCurrentTab('courses')}
                  className="bg-blue-50 text-blue-700 p-4 rounded-xl font-semibold hover:bg-blue-100 transition-all border border-blue-200"
                >
                  Manage Courses
                </button>
                <button
                  onClick={() => setCurrentTab('students')}
                  className="bg-purple-50 text-purple-700 p-4 rounded-xl font-semibold hover:bg-purple-100 transition-all border border-purple-200"
                >
                  Manage Students
                </button>
                <button
                  onClick={() => setCurrentTab('bids')}
                  className="bg-amber-50 text-amber-700 p-4 rounded-xl font-semibold hover:bg-amber-100 transition-all border border-amber-200"
                >
                  View Bids
                </button>
              </div>
            </div>
          </>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 p-2 flex gap-2 overflow-x-auto">
          {['overview', 'courses', 'students', 'bids'].map(tab => (
            <button
              key={tab}
              onClick={() => setCurrentTab(tab)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all capitalize whitespace-nowrap ${
                currentTab === tab
                  ? 'bg-gray-900 text-white shadow-sm'
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
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex justify-between items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-gray-400 focus:outline-none"
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
                className="ml-4 flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-all"
              >
                <Plus className="w-5 h-5" />
                Add Course
              </button>
            </div>

            {loading ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading courses from Railway...</p>
                <p className="text-gray-400 text-sm mt-2">{API_URL}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {courses.filter(c => 
                  c.courseName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  c.courseCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  c.instructorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  c.departmentName?.toLowerCase().includes(searchTerm.toLowerCase())
                ).map(course => (
                  <div key={course.courseId} className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all overflow-hidden">
                    <div className="bg-gray-50 p-4 border-b border-gray-200">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-sm font-bold text-gray-700 bg-white border border-gray-300 px-3 py-1 rounded-lg">
                              {course.courseCode}
                            </span>
                            <span className="text-sm text-gray-600 bg-white border border-gray-200 px-3 py-1 rounded-lg">
                              {course.departmentName}
                            </span>
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 mb-1">{course.courseName}</h3>
                          <p className="text-gray-600">Prof. {course.instructorName}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditCourse(course)}
                            className="p-2 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg transition-all"
                          >
                            <Edit2 className="w-5 h-5 text-gray-700" />
                          </button>
                          <button
                            onClick={() => handleDeleteCourse(course.courseId)}
                            className="p-2 bg-white border border-red-200 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 className="w-5 h-5 text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                          <p className="text-xs text-gray-600 font-semibold mb-1">Schedule</p>
                          <p className="text-sm font-bold text-gray-800">
                            {course.schedule && course.schedule.length > 0 
                              ? `${course.schedule[0].dayOfWeek}`
                              : 'TBA'}
                          </p>
                          <p className="text-xs text-gray-600">
                            {course.schedule && course.schedule.length > 0 
                              ? `${formatTime(course.schedule[0].startTime)} - ${formatTime(course.schedule[0].endTime)}`
                              : ''}
                          </p>
                        </div>
                        
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                          <p className="text-xs text-gray-600 font-semibold mb-1">Credits</p>
                          <p className="text-2xl font-bold text-gray-800">{course.credits}</p>
                        </div>
                        
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                          <p className="text-xs text-gray-600 font-semibold mb-1">Capacity</p>
                          <p className="text-sm font-bold text-gray-800">
                            {course.enrolled || 0} / {course.capacity}
                          </p>
                          <p className="text-xs text-gray-600">{course.availableSeats || course.capacity} available</p>
                        </div>
                        
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                          <p className="text-xs text-gray-600 font-semibold mb-1">Min Bid</p>
                          <p className="text-2xl font-bold text-gray-800">{course.minBid || 0}</p>
                        </div>
                      </div>
                      
                      {course.prerequisites && (
                        <div className="bg-orange-50 border-l-4 border-orange-400 p-3 rounded-r-xl mb-4">
                          <p className="text-xs text-orange-600 font-semibold mb-1">Prerequisites</p>
                          <p className="text-sm text-gray-700">{course.prerequisites}</p>
                        </div>
                      )}
                      
                      {course.description && (
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                          <p className="text-xs text-gray-600 font-semibold mb-2">Description</p>
                          <p className="text-sm text-gray-700 leading-relaxed">{course.description}</p>
                        </div>
                      )}
                      
                      {course.schedule && course.schedule.length > 0 && course.schedule[0].location && (
                        <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span className="font-semibold">Location:</span>
                          <span>{course.schedule[0].location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {courses.filter(c => 
                  c.courseName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  c.courseCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  c.instructorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  c.departmentName?.toLowerCase().includes(searchTerm.toLowerCase())
                ).length === 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <p className="text-gray-600">No courses found matching "{searchTerm}"</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Students Tab */}
        {currentTab === 'students' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex justify-between items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-gray-400 focus:outline-none"
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
                className="ml-4 flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-all"
              >
                <Plus className="w-5 h-5" />
                Add Student
              </button>
            </div>

            {loading ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading students from Railway...</p>
                <p className="text-gray-400 text-sm mt-2">{API_URL}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {students.filter(s => 
                  s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  s.departmentName?.toLowerCase().includes(searchTerm.toLowerCase())
                ).map(student => (
                  <div key={student.studentId} className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all overflow-hidden">
                    <div className="bg-gray-50 p-4 border-b border-gray-200">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 mb-1">{student.name}</h3>
                          <p className="text-sm text-gray-600">{student.email}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditStudent(student)}
                            className="p-2 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg transition-all"
                          >
                            <Edit2 className="w-4 h-4 text-gray-700" />
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(student.studentId)}
                            className="p-2 bg-white border border-red-200 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                          <p className="text-xs text-gray-600 font-semibold mb-1">Student ID</p>
                          <p className="text-lg font-bold text-gray-800">{student.studentId}</p>
                        </div>
                        
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                          <p className="text-xs text-gray-600 font-semibold mb-1">Bid Points</p>
                          <p className="text-lg font-bold text-gray-800">{student.bidPoints || 0}</p>
                        </div>
                      </div>
                      
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600 font-semibold">Major</span>
                          <span className="text-sm text-gray-800 font-medium">{student.departmentName || 'N/A'}</span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600 font-semibold">Year</span>
                          <span className="text-sm text-gray-800 font-medium">
                            {student.year === 1 ? '1st Year' : 
                             student.year === 2 ? '2nd Year' : 
                             student.year === 3 ? '3rd Year' : 
                             student.year === 4 ? '4th Year' : 
                             student.year ? student.year + 'th Year' : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {students.filter(s => 
                  s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  s.departmentName?.toLowerCase().includes(searchTerm.toLowerCase())
                ).length === 0 && (
                  <div className="col-span-full bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <p className="text-gray-600">No students found matching "{searchTerm}"</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Bids Tab */}
        {currentTab === 'bids' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Rounds & Bids Management</h2>
              <button
                onClick={() => openRoundModal()}
                className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-all"
              >
                <Plus className="w-5 h-5" />
                Create New Round
              </button>
            </div>

            {loading ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading rounds from Railway...</p>
                <p className="text-gray-400 text-sm mt-2">{API_URL}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rounds.map((round) => {
                  const roundStatus = getRoundStatus(round);
                  const countdown = getCountdown(round);
                  
                  return (
                  <div key={round.roundId} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all">
                    <div className="bg-gray-50 p-6 border-b border-gray-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900">Round {round.roundNumber}</h3>
                          <p className="text-gray-600 mt-1">{round.roundName || 'Unnamed Round'}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${roundStatus.color}`}>
                          {roundStatus.label}
                        </span>
                      </div>
                    </div>

                    <div className="p-6 space-y-4">
                      {/* Real-time Countdown */}
                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                        <p className="text-xs text-gray-600 mb-1">Timer</p>
                        <p className="text-lg font-bold text-blue-700">{countdown}</p>
                      </div>

                      {/* Results Announced Badge */}
                      {round.processedAt && (
                        <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <div>
                              <p className="text-sm font-bold text-green-700">Results Announced</p>
                              <p className="text-xs text-green-600">
                                Processed on {formatDateTime(round.processedAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600">Start:</span>
                          <span className="font-medium">{formatDateTime(round.startTime)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600">End:</span>
                          <span className="font-medium">{formatDateTime(round.endTime)}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => fetchRoundBids(round.roundId)}
                          className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-all font-semibold border border-gray-300"
                        >
                          <Eye className="w-4 h-4" />
                          View Bids
                        </button>
                        <button
                          onClick={() => openRoundModal(round)}
                          className="flex items-center justify-center bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-all border border-gray-300"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRound(round.roundId)}
                          className="flex items-center justify-center bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition-all border border-red-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Publish Results button - only show if closed AND not yet processed */}
                      {roundStatus.status === 'closed' && !round.processedAt && (
                        <button
                          onClick={() => handlePublishResults(round.roundId)}
                          className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-all font-semibold"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Publish Results
                        </button>
                      )}
                    </div>
                  </div>
                )})}

                {rounds.length === 0 && (
                  <div className="col-span-full bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <p className="text-gray-600">No rounds created yet. Click "Create New Round" to get started.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
      </div>

      {/* Round Bids Modal */}
      {selectedRound && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gray-50 p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Round {selectedRound.roundNumber} - Bids</h3>
                  <p className="text-gray-600 mt-1">{selectedRound.roundName || 'Unnamed Round'}</p>
                  <p className="text-gray-600 text-sm mt-2">Total Bids: {selectedRound.totalBids || roundBids.length}</p>
                </div>
                <button
                  onClick={() => { setSelectedRound(null); setRoundBids([]); }}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-all"
                >
                  <X className="w-6 h-6 text-gray-700" />
                </button>
              </div>
            </div>

            <div className="overflow-auto flex-1">
              <table className="w-full">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Student</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Email</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Course</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Bid Amount</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Priority</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {roundBids.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                        No bids in this round yet.
                      </td>
                    </tr>
                  ) : (
                    roundBids.map((bid) => (
                      <tr key={bid.bidId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-800">{bid.studentName}</td>
                        <td className="px-6 py-4 text-gray-600">{bid.studentEmail}</td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-gray-800">{bid.courseCode}</p>
                            <p className="text-sm text-gray-500">{bid.courseName}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900">{bid.bidAmount} pts</td>
                        <td className="px-6 py-4 text-gray-600">{bid.priority || 'N/A'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            bid.status === 'won' ? 'bg-green-100 text-green-700' :
                            bid.status === 'lost' ? 'bg-red-100 text-red-700' :
                            bid.status === 'cancelled' ? 'bg-gray-100 text-gray-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {bid.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {bid.createdAt ? new Date(bid.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Course Modal */}
      {showCourseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8">
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
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-gray-400 focus:outline-none"
                    placeholder="Advanced Algorithms"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Course Code</label>
                  <input
                    type="text"
                    value={courseForm.courseCode}
                    onChange={(e) => setCourseForm({...courseForm, courseCode: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-gray-400 focus:outline-none"
                    placeholder="CS301"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Department</label>
                  <select
                    value={courseForm.deptId}
                    onChange={(e) => setCourseForm({...courseForm, deptId: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-gray-400 focus:outline-none"
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept.deptId} value={dept.deptId}>
                        {dept.deptName} ({dept.deptCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Instructor Name</label>
                  <input
                    type="text"
                    value={courseForm.instructorName}
                    onChange={(e) => setCourseForm({...courseForm, instructorName: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-gray-400 focus:outline-none"
                    placeholder="Dr. Sarah Mitchell"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Credits</label>
                  <input
                    type="number"
                    value={courseForm.credits}
                    onChange={(e) => setCourseForm({...courseForm, credits: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-gray-400 focus:outline-none"
                    placeholder="3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Min Bid</label>
                  <input
                    type="number"
                    value={courseForm.minBid}
                    onChange={(e) => setCourseForm({...courseForm, minBid: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-gray-400 focus:outline-none"
                    placeholder="50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Capacity</label>
                  <input
                    type="number"
                    value={courseForm.capacity}
                    onChange={(e) => setCourseForm({...courseForm, capacity: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-gray-400 focus:outline-none"
                    placeholder="30"
                  />
                </div>
              </div>

              {/* Schedule Section */}
              <div className="border-t-2 border-gray-200 pt-4 mt-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-700" />
                  Course Schedule
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Day of Week</label>
                    <select
                      value={courseForm.dayOfWeek}
                      onChange={(e) => setCourseForm({...courseForm, dayOfWeek: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-gray-400 focus:outline-none"
                    >
                      <option value="Monday">Monday</option>
                      <option value="Tuesday">Tuesday</option>
                      <option value="Wednesday">Wednesday</option>
                      <option value="Thursday">Thursday</option>
                      <option value="Friday">Friday</option>
                      <option value="Saturday">Saturday</option>
                      <option value="Sunday">Sunday</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Location</label>
                    <input
                      type="text"
                      value={courseForm.location}
                      onChange={(e) => setCourseForm({...courseForm, location: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-gray-400 focus:outline-none"
                      placeholder="Room 305, Building A"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Start Time</label>
                    <input
                      type="time"
                      value={courseForm.startTime}
                      onChange={(e) => setCourseForm({...courseForm, startTime: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-gray-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">End Time</label>
                    <input
                      type="time"
                      value={courseForm.endTime}
                      onChange={(e) => setCourseForm({...courseForm, endTime: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-gray-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Information Section */}
              <div className="border-t-2 border-gray-200 pt-4 mt-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Additional Information</h3>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Prerequisites (Optional)</label>
                  <input
                    type="text"
                    value={courseForm.prerequisites}
                    onChange={(e) => setCourseForm({...courseForm, prerequisites: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-gray-400 focus:outline-none"
                    placeholder="CS101, MATH201"
                  />
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                  <textarea
                    value={courseForm.description}
                    onChange={(e) => setCourseForm({...courseForm, description: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-gray-400 focus:outline-none"
                    placeholder="Course description and objectives..."
                    rows="3"
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
                  className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
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
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingStudent ? 'Edit Student' : 'Add New Student'}
              </h2>
              <button onClick={() => setShowStudentModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={studentForm.name}
                  onChange={(e) => setStudentForm({...studentForm, name: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-gray-400 focus:outline-none"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={studentForm.email}
                  onChange={(e) => setStudentForm({...studentForm, email: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-gray-400 focus:outline-none"
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
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-gray-400 focus:outline-none"
                  placeholder="Enter password"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Department</label>
                  <select
                    value={studentForm.deptId}
                    onChange={(e) => setStudentForm({...studentForm, deptId: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-gray-400 focus:outline-none"
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept.deptId} value={dept.deptId}>
                        {dept.deptName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Year</label>
                  <select
                    value={studentForm.year}
                    onChange={(e) => setStudentForm({...studentForm, year: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-gray-400 focus:outline-none"
                  >
                    <option value="1">Year 1</option>
                    <option value="2">Year 2</option>
                    <option value="3">Year 3</option>
                    <option value="4">Year 4</option>
                  </select>
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
                  className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {editingStudent ? 'Update' : 'Add'} Student
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Round Modal */}
      {showRoundModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingRound ? 'Edit Round' : 'Create New Round'}
              </h2>
              <button onClick={() => setShowRoundModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Round Number</label>
                  <input
                    type="number"
                    value={roundForm.roundNumber}
                    onChange={(e) => setRoundForm({...roundForm, roundNumber: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-gray-400 focus:outline-none"
                    placeholder="1"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                  <select
                    value={roundForm.status}
                    onChange={(e) => setRoundForm({...roundForm, status: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-gray-400 focus:outline-none"
                  >
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Round Name</label>
                <input
                  type="text"
                  value={roundForm.roundName}
                  onChange={(e) => setRoundForm({...roundForm, roundName: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-gray-400 focus:outline-none"
                  placeholder="First Round Bidding"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Start Time</label>
                  <input
                    type="datetime-local"
                    value={roundForm.startTime}
                    onChange={(e) => setRoundForm({...roundForm, startTime: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-gray-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">End Time</label>
                  <input
                    type="datetime-local"
                    value={roundForm.endTime}
                    onChange={(e) => setRoundForm({...roundForm, endTime: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-gray-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowRoundModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={editingRound ? handleUpdateRound : handleAddRound}
                  className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {editingRound ? 'Update' : 'Create'} Round
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border-2 border-red-200 rounded-2xl p-4 shadow-xl max-w-md z-50">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <div className="flex-1">
              <p className="font-semibold text-red-800">Error</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;