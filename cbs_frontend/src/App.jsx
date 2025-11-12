import React, { useState, useEffect } from 'react';
import LoginPage from './components/Auth/LoginPage';
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';
import Home from './components/Home/Home';
import BrowseCourses from './components/Courses/BrowseCourses';
import Cart from './components/Cart/Cart';
import MyBids from './components/Bids/MyBids';
import RegisteredCourses from './components/Registered/RegisteredCourses';
import Waitlist from './components/Waitlist/Waitlist';
import Profile from './components/Profile/Profile';

// Helper function to transform API response to app format
const transformCourseData = (apiCourses) => {
  // Group courses by courseId to handle multiple meeting days
  const courseMap = new Map();
  
  apiCourses.forEach(course => {
    if (!courseMap.has(course.courseId)) {
      // First occurrence - create the course entry
      courseMap.set(course.courseId, {
        id: course.courseId,
        code: course.courseName.split(' ')[0] || course.courseName,
        name: course.courseName,
        instructor: course.instructorName,
        seats: course.capacity,
        enrolled: course.enrolled,
        minBid: course.minBid || 0,
        avgBid: course.avgBid || course.minBid || 0,
        category: course.departmentName,
        rating: 4.5, // Default rating
        schedule: `${course.day} ${course.time}`,
        popularity: course.enrolled / course.capacity > 0.7 ? 'high' : 
                   course.enrolled / course.capacity > 0.4 ? 'medium' : 'low',
        credits: course.credits,
        location: course.location,
        days: [course.day],
        time: course.time
      });
    } else {
      // Additional meeting day - add to days array
      const existingCourse = courseMap.get(course.courseId);
      if (!existingCourse.days.includes(course.day)) {
        existingCourse.days.push(course.day);
        existingCourse.schedule = `${existingCourse.days.join('/')} ${course.time}`;
      }
    }
  });
  
  return Array.from(courseMap.values());
};

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState('login');
  const [points, setPoints] = useState(1000);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [showCart, setShowCart] = useState(false);
  
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

  // Round system state
  const [currentRound, setCurrentRound] = useState(1);
  const [roundStatus, setRoundStatus] = useState('active');
  const [roundEndTime] = useState('2024-10-20T23:59:59');
  const [round1EndDate] = useState('Oct 20, 2024');
  const [round2EndDate] = useState('Oct 23, 2024');
  
  const [round1Results, setRound1Results] = useState([]);
  const [coursesWon, setCoursesWon] = useState([]);
  const [coursesLost, setCoursesLost] = useState([]);

  // API state
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState(['all']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [cart, setCart] = useState([]);
  const [myBids, setMyBids] = useState([]);
  
  const [registeredCourses, setRegisteredCourses] = useState([
    {
      id: 7, code: 'CS201', name: 'Data Structures', instructor: 'Dr. Lisa Martinez',
      schedule: 'MWF 14:00-15:30', credits: 4, location: 'Tech Building 103', grade: 'A', status: 'ongoing'
    },
    {
      id: 8, code: 'MATH180', name: 'Calculus II', instructor: 'Prof. Robert Chen',
      schedule: 'TTh 10:00-11:30', credits: 4, location: 'Math Building 205', grade: 'B+', status: 'ongoing'
    }
  ]);

  const [waitlist, setWaitlist] = useState([]);

  // Fetch courses from API
  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch('http://localhost:8080/api/courses');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Fetched courses:', data); // Debug log
        
        const transformedCourses = transformCourseData(data);
        console.log('Transformed courses:', transformedCourses); // Debug log
        
        setCourses(transformedCourses);
        
        // Extract unique categories
        const uniqueCategories = ['all', ...new Set(data.map(course => course.departmentName))];
        setCategories(uniqueCategories);
        
      } catch (err) {
        console.error('Error fetching courses:', err);
        setError('Failed to load courses. Please check if the backend server is running at http://localhost:8080');
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };

    if (isLoggedIn) {
      fetchCourses();
    }
  }, [isLoggedIn]);

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || course.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleLogin = (e) => {
    e.preventDefault();
    setIsLoggedIn(true);
    setCurrentPage('home');
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
    setCurrentPage('home');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentPage('login');
    setShowMobileMenu(false);
  };

  const handleAddToCart = (courseId, bidAmount) => {
    if (roundStatus === 'closed') {
      alert('Bidding is closed for this round!');
      return;
    }
    
    const course = courses.find(c => c.id === courseId);
    const existingCartItem = cart.find(item => item.courseId === courseId);
    
    if (existingCartItem) {
      alert('Course already in cart!');
      return;
    }
    
    const existingBid = myBids.find(b => b.courseId === courseId && b.round === currentRound);
    if (existingBid) {
      alert('You already have an active bid for this course in Round ' + currentRound + '!');
      return;
    }

    if (currentRound === 2) {
      const wonInRound1 = coursesWon.find(c => c.courseId === courseId);
      if (wonInRound1) {
        alert('You already got this course in Round 1!');
        return;
      }
    }
    
    setCart([...cart, {
      courseId,
      bidAmount: bidAmount || course.minBid,
      addedAt: new Date().toISOString(),
      round: currentRound
    }]);
    alert('Added to cart! Go to cart to review and checkout.');
  };

  const handleRemoveFromCart = (courseId) => {
    setCart(cart.filter(item => item.courseId !== courseId));
  };

  const handleUpdateCartBid = (courseId, newAmount) => {
    setCart(cart.map(item => 
      item.courseId === courseId ? {...item, bidAmount: newAmount} : item
    ));
  };

  const handleCheckout = () => {
    if (roundStatus === 'closed') {
      alert('Bidding is closed for this round!');
      return;
    }
    
    const totalBid = cart.reduce((sum, item) => sum + item.bidAmount, 0);
    
    if (totalBid > points) {
      alert('Insufficient points! You need ' + (totalBid - points) + ' more points.');
      return;
    }

    if (cart.length === 0) {
      alert('Your cart is empty!');
      return;
    }

    const newBids = cart.map(item => ({
      courseId: item.courseId,
      amount: item.bidAmount,
      status: item.bidAmount >= courses.find(c => c.id === item.courseId).avgBid ? 'leading' : 'active',
      timestamp: 'Just now',
      round: currentRound
    }));

    setMyBids([...myBids, ...newBids]);
    setPoints(points - totalBid);
    setCart([]);
    setShowCart(false);
    alert('Successfully placed ' + newBids.length + ' bid(s) in Round ' + currentRound + '!\n\nYour bids are now active. Check "My Bids" to track their status.');
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

  const handleEndRound1 = () => {
    if (currentRound !== 1) return;

    const round1Bids = myBids.filter(b => b.round === 1);
    const won = [];
    const lost = [];

    round1Bids.forEach(bid => {
      if (bid.amount >= courses.find(c => c.id === bid.courseId).avgBid) {
        won.push({
          courseId: bid.courseId,
          bidAmount: bid.amount,
          round: 1
        });
      } else {
        lost.push({
          courseId: bid.courseId,
          bidAmount: bid.amount,
          round: 1
        });
      }
    });

    setCoursesWon(won);
    setCoursesLost(lost);
    setRound1Results([...won, ...lost]);
    setCurrentRound(2);
    setRoundStatus('active');
    
    alert(`Round 1 Results:\n✅ Won: ${won.length} course(s)\n❌ Lost: ${lost.length} course(s)\n\nRound 2 is now open! You can rebid for courses you didn't get.`);
  };

  const handleSimulateRoundEnd = () => {
    if (currentRound === 1) {
      handleEndRound1();
    } else {
      alert('Round 2 has ended! Final results will be processed.');
    }
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
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-teal-50 to-emerald-50">
      <Header
        userProfile={userProfile}
        points={points}
        showMobileMenu={showMobileMenu}
        setShowMobileMenu={setShowMobileMenu}
        cart={cart}
        setShowCart={setShowCart}
        currentRound={currentRound}
        roundStatus={roundStatus}
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
          {/* Loading State */}
          {loading && (currentPage === 'browse' || currentPage === 'home') && (
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading courses from backend...</p>
            </div>
          )}

          {/* Error State */}
          {error && (currentPage === 'browse' || currentPage === 'home') && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
              <p className="text-red-700 font-semibold mb-2">⚠️ Error Loading Courses</p>
              <p className="text-red-600 text-sm mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-semibold"
              >
                Retry Connection
              </button>
            </div>
          )}

          {/* Demo Button */}
          {!loading && !error && myBids.length > 0 && currentRound <= 2 && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
              <p className="text-sm text-amber-800 mb-2">
                <strong>Demo Mode:</strong> Simulate round ending to see results
              </p>
              <button
                onClick={handleSimulateRoundEnd}
                className="px-4 py-2 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition-all"
              >
                End Round {currentRound} & View Results
              </button>
            </div>
          )}

          {!loading && !error && currentPage === 'home' && (
            <Home
              cart={cart}
              courses={courses}
              myBids={myBids}
              registeredCourses={registeredCourses}
              points={points}
              setShowCart={setShowCart}
              setCurrentPage={setCurrentPage}
              currentRound={currentRound}
              roundStatus={roundStatus}
              roundEndTime={roundEndTime}
              round1EndDate={round1EndDate}
              round2EndDate={round2EndDate}
              coursesWon={coursesWon}
              coursesLost={coursesLost}
            />
          )}

          {!loading && !error && currentPage === 'browse' && (
            <BrowseCourses
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              filterCategory={filterCategory}
              setFilterCategory={setFilterCategory}
              categories={categories}
              filteredCourses={filteredCourses}
              myBids={myBids}
              handleAddToWaitlist={handleAddToWaitlist}
              handleAddToCart={handleAddToCart}
              currentRound={currentRound}
              coursesWon={coursesWon}
            />
          )}

          {currentPage === 'mybids' && (
            <MyBids
              myBids={myBids}
              courses={courses}
              currentRound={currentRound}
              coursesWon={coursesWon}
              coursesLost={coursesLost}
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

      <Cart
        showCart={showCart}
        setShowCart={setShowCart}
        cart={cart}
        courses={courses}
        points={points}
        handleRemoveFromCart={handleRemoveFromCart}
        handleUpdateCartBid={handleUpdateCartBid}
        handleCheckout={handleCheckout}
        currentRound={currentRound}
        roundStatus={roundStatus}
      />
    </div>
  );
};

export default App;