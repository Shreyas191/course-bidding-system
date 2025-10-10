import React, { useState } from 'react';
import LoginPage from './components/Auth/LoginPage';
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';
import BrowseCourses from './components/Courses/BrowseCourses';
import BidModal from './components/Courses/BidModal';
import MyBids from './components/Bids/MyBids';
import RegisteredCourses from './components/Registered/RegisteredCourses';
import Waitlist from './components/Waitlist/Waitlist';
import Profile from './components/Profile/Profile';

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState('login');
  const [points, setPoints] = useState(1000);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    studentId: '',
    major: ''
  });
  const [isSignup, setIsSignup] = useState(false);
  const [userProfile, setUserProfile] = useState({
    name: 'Alex Johnson',
    email: 'alex.johnson@university.edu',
    studentId: 'STU2024001',
    major: 'Computer Science',
    year: 'Junior',
    phone: '+1 (555) 123-4567',
    address: '123 Campus Drive, University City, ST 12345',
    gpa: '3.85',
    credits: '84'
  });
  const [tempProfile, setTempProfile] = useState({...userProfile});

  const categories = ['all', 'Computer Science', 'Business', 'Arts', 'Mathematics', 'English', 'Physics'];

  const [courses] = useState([
    {
      id: 1, code: 'CS301', name: 'Advanced Algorithms', instructor: 'Dr. Sarah Chen',
      seats: 30, enrolled: 18, minBid: 50, avgBid: 85, category: 'Computer Science',
      rating: 4.8, schedule: 'MWF 10:00-11:30', popularity: 'high', credits: 3, location: 'Tech Building 205'
    },
    {
      id: 2, code: 'BUS205', name: 'Strategic Management', instructor: 'Prof. Michael Roberts',
      seats: 40, enrolled: 35, minBid: 40, avgBid: 92, category: 'Business',
      rating: 4.6, schedule: 'TTh 14:00-16:00', popularity: 'high', credits: 4, location: 'Business Hall 301'
    },
    {
      id: 3, code: 'ART150', name: 'Digital Media Design', instructor: 'Dr. Emily Foster',
      seats: 25, enrolled: 12, minBid: 30, avgBid: 45, category: 'Arts',
      rating: 4.9, schedule: 'MW 13:00-15:30', popularity: 'medium', credits: 3, location: 'Arts Center 102'
    },
    {
      id: 4, code: 'MATH220', name: 'Linear Algebra', instructor: 'Prof. David Kim',
      seats: 35, enrolled: 28, minBid: 45, avgBid: 78, category: 'Mathematics',
      rating: 4.5, schedule: 'MWF 09:00-10:00', popularity: 'high', credits: 4, location: 'Math Building 410'
    },
    {
      id: 5, code: 'ENG180', name: 'Creative Writing Workshop', instructor: 'Dr. Amanda Brooks',
      seats: 20, enrolled: 8, minBid: 25, avgBid: 35, category: 'English',
      rating: 4.7, schedule: 'TTh 16:00-18:00', popularity: 'low', credits: 3, location: 'Library 220'
    },
    {
      id: 6, code: 'PHYS201', name: 'Quantum Mechanics', instructor: 'Prof. James Wilson',
      seats: 30, enrolled: 22, minBid: 55, avgBid: 88, category: 'Physics',
      rating: 4.4, schedule: 'MWF 11:00-12:30', popularity: 'medium', credits: 4, location: 'Science Complex 315'
    }
  ]);

  const [myBids, setMyBids] = useState([
    { courseId: 1, amount: 85, status: 'leading', timestamp: '2 hours ago' },
    { courseId: 4, amount: 70, status: 'outbid', timestamp: '5 hours ago' }
  ]);

  const [registeredCourses] = useState([
    {
      id: 7, code: 'CS201', name: 'Data Structures', instructor: 'Dr. Lisa Martinez',
      schedule: 'MWF 14:00-15:30', credits: 4, location: 'Tech Building 103', grade: 'A', status: 'ongoing'
    },
    {
      id: 8, code: 'MATH180', name: 'Calculus II', instructor: 'Prof. Robert Chen',
      schedule: 'TTh 10:00-11:30', credits: 4, location: 'Math Building 205', grade: 'B+', status: 'ongoing'
    }
  ]);

  const [waitlist, setWaitlist] = useState([
    { courseId: 2, position: 3, addedDate: '2024-10-05', estimatedChance: 'High' }
  ]);

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || course.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleLogin = (e) => {
    e.preventDefault();
    setIsLoggedIn(true);
    setCurrentPage('browse');
  };

  const handleSignup = (e) => {
    e.preventDefault();
    setUserProfile({
      ...userProfile,
      name: signupForm.name,
      email: signupForm.email,
      studentId: signupForm.studentId,
      major: signupForm.major
    });
    setIsLoggedIn(true);
    setCurrentPage('browse');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentPage('login');
    setShowMobileMenu(false);
  };

  const handlePlaceBid = () => {
    if (!selectedCourse || !bidAmount) return;
    const bid = parseInt(bidAmount);
    if (bid > points) {
      alert('Insufficient points!');
      return;
    }
    if (bid < selectedCourse.minBid) {
      alert('Minimum bid is ' + selectedCourse.minBid + ' points');
      return;
    }

    const existingBidIndex = myBids.findIndex(b => b.courseId === selectedCourse.id);
    if (existingBidIndex >= 0) {
      const oldBid = myBids[existingBidIndex].amount;
      setPoints(points + oldBid - bid);
      const newBids = [...myBids];
      newBids[existingBidIndex] = {
        courseId: selectedCourse.id,
        amount: bid,
        status: bid >= selectedCourse.avgBid ? 'leading' : 'active',
        timestamp: 'Just now'
      };
      setMyBids(newBids);
    } else {
      setPoints(points - bid);
      setMyBids([...myBids, {
        courseId: selectedCourse.id,
        amount: bid,
        status: bid >= selectedCourse.avgBid ? 'leading' : 'active',
        timestamp: 'Just now'
      }]);
    }
    setSelectedCourse(null);
    setBidAmount('');
  };

  const handleAddToWaitlist = (courseId) => {
    const isAlreadyOnWaitlist = waitlist.some(w => w.courseId === courseId);
    if (!isAlreadyOnWaitlist) {
      setWaitlist([...waitlist, {
        courseId,
        position: waitlist.length + 1,
        addedDate: new Date().toISOString().split('T')[0],
        estimatedChance: 'Medium'
      }]);
      alert('Added to waitlist successfully!');
    } else {
      alert('Already on waitlist!');
    }
  };

  const handleSaveProfile = () => {
    setUserProfile(tempProfile);
    setEditingProfile(false);
  };

  if (!isLoggedIn) {
    return (
      <LoginPage
        loginForm={loginForm}
        setLoginForm={setLoginForm}
        signupForm={signupForm}
        setSignupForm={setSignupForm}
        isSignup={isSignup}
        setIsSignup={setIsSignup}
        handleLogin={handleLogin}
        handleSignup={handleSignup}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <Header
        userProfile={userProfile}
        points={points}
        showMobileMenu={showMobileMenu}
        setShowMobileMenu={setShowMobileMenu}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-6 py-6">
        <Sidebar
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          showMobileMenu={showMobileMenu}
          setShowMobileMenu={setShowMobileMenu}
          myBids={myBids}
          registeredCourses={registeredCourses}
          waitlist={waitlist}
          points={points}
          handleLogout={handleLogout}
        />

        <div className="flex-1 overflow-auto">
          {currentPage === 'browse' && (
            <BrowseCourses
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              filterCategory={filterCategory}
              setFilterCategory={setFilterCategory}
              categories={categories}
              filteredCourses={filteredCourses}
              myBids={myBids}
              setSelectedCourse={setSelectedCourse}
              handleAddToWaitlist={handleAddToWaitlist}
            />
          )}

          {currentPage === 'mybids' && (
            <MyBids
              myBids={myBids}
              courses={courses}
              setSelectedCourse={setSelectedCourse}
            />
          )}

          {currentPage === 'registered' && (
            <RegisteredCourses registeredCourses={registeredCourses} />
          )}

          {currentPage === 'waitlist' && (
            <Waitlist
              waitlist={waitlist}
              setWaitlist={setWaitlist}
              courses={courses}
            />
          )}

          {currentPage === 'profile' && (
            <Profile
              userProfile={userProfile}
              tempProfile={tempProfile}
              setTempProfile={setTempProfile}
              editingProfile={editingProfile}
              setEditingProfile={setEditingProfile}
              handleSaveProfile={handleSaveProfile}
              points={points}
            />
          )}
        </div>
      </div>

      <BidModal
        selectedCourse={selectedCourse}
        bidAmount={bidAmount}
        setBidAmount={setBidAmount}
        points={points}
        setSelectedCourse={setSelectedCourse}
        handlePlaceBid={handlePlaceBid}
      />
    </div>
  );
};

export default App;