import React, { useState, useEffect } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import LoginPage from './components/Auth/LoginPage';
import AdminDashboard from './components/Admin/AdminDashboard';
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
const transformCourseData = (apiCourses, preserveEnrollmentId = false) => {
  return apiCourses.map(course => {
    // Format schedule from array of ScheduleDto objects
    const scheduleStr = course.schedule && course.schedule.length > 0
      ? course.schedule.map(s => `${s.dayOfWeek} ${s.startTime}-${s.endTime}`).join(', ')
      : 'TBD';
    
    // Get location from first schedule entry
    const location = course.schedule && course.schedule.length > 0
      ? course.schedule[0].location
      : 'TBD';
    
    const transformed = {
      id: course.courseId,
      code: course.courseCode,
      name: course.courseName,
      instructor: course.instructorName,
      seats: course.capacity,
      enrolled: course.enrolled,
      minBid: course.minBid || 0,
      avgBid: course.minBid || 0, // For now, same as minBid
      category: course.departmentName,
      rating: 4.5,
      schedule: scheduleStr,
      popularity: course.enrolled / course.capacity > 0.7 ? 'high' : 
                 course.enrolled / course.capacity > 0.4 ? 'medium' : 'low',
      credits: course.credits,
      location: location,
      description: course.description,
      prerequisites: course.prerequisites
    };

    // Preserve enrollmentId if present (for enrolled courses)
    if (course.enrollmentId) {
      transformed.enrollmentId = course.enrollmentId;
    }

    return transformed;
  });
};

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentPage, setCurrentPage] = useState('login');
  const [points, setPoints] = useState(100);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [showCart, setShowCart] = useState(false);
  
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  
  const [userProfile, setUserProfile] = useState({
    name: '',
    email: '',
    studentId: '',
    major: '',
    year: '',
    phone: '',
    address: '',
    gpa: '',
    credits: ''
  });

  const [allRounds, setAllRounds] = useState([]);
  const [tempProfile, setTempProfile] = useState({...userProfile});

  const [currentRound, setCurrentRound] = useState(1);
  const [roundStatus, setRoundStatus] = useState('active');
  const [roundEndTime] = useState('2024-10-20T23:59:59');
  const [round1EndDate] = useState('Oct 20, 2024');
  const [round2EndDate] = useState('Oct 23, 2024');
  
  const [round1Results, setRound1Results] = useState([]);
  const [coursesWon, setCoursesWon] = useState([]);
  const [coursesLost, setCoursesLost] = useState([]);

  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState(['all']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [cart, setCart] = useState([]);
  const [myBids, setMyBids] = useState([]);
  const [registeredCourses, setRegisteredCourses] = useState([]);
  const [waitlist, setWaitlist] = useState([]);

  // Helper function to get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  };

  // Check if user is already logged in (on page load/refresh)
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const isAdminStored = localStorage.getItem('isAdmin') === 'true';
    
    if (token) {
      // Token exists, user was logged in before
      setIsLoggedIn(true);
      setIsAdmin(isAdminStored);
      setCurrentPage(isAdminStored ? 'admin' : 'home');
    }
  }, []); // Empty dependency array = runs only once on mount

  // Auto-fetch data when logged in
  useEffect(() => {
    if (isLoggedIn && !isAdmin) {
      fetchUserProfile();
      fetchUserWallet();
      fetchAllRounds();
      fetchAllCourses();
      fetchMyEnrollments();
      fetchMyBids();
      fetchMyWaitlist();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, isAdmin]);

  // Fetch user profile
  const fetchUserProfile = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/students/me', {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserProfile({
          name: data.name || '',
          email: data.email || '',
          studentId: data.studentId?.toString() || '',
          department: data.department || '',  // Backend returns department name
          year: data.year?.toString() || '',
          phone: '',
          address: '',
          gpa: '',
          credits: ''
        });
        // Update points from the profile response
        if (data.bidPoints !== undefined) {
          setPoints(data.bidPoints);
        }
        setTempProfile({...userProfile, ...data});
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const handleBidCancelled = async () => {
    console.log('Bid cancelled - refreshing data...');
    // Refresh bids
    await fetchMyBids();
    // Refresh wallet balance
    await fetchUserWallet();
    console.log('Data refreshed after bid cancellation');
  };

  // NEW: Handle course dropped - refreshes all relevant data
  const handleCourseDropped = async () => {
    console.log('Course dropped - refreshing all data...');
    try {
      // Refresh all relevant data after dropping a course
      await fetchMyEnrollments();  // Update registered courses
      await fetchUserWallet();      // Update wallet balance
      await fetchMyBids();          // Update bids (in case any changed)
      await fetchMyWaitlist();      // Update waitlist (in case promoted)
      console.log('All data refreshed after course drop');
    } catch (err) {
      console.error('Error refreshing data after course drop:', err);
    }
  };

  // Fetch user wallet balance
  const fetchUserWallet = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/wallet/me', {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        setPoints(data.balance || 100);
      }
    } catch (err) {
      console.error('Error fetching wallet:', err);
    }
  };

  // Fetch all rounds
  const fetchAllRounds = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/rounds', {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        setAllRounds(data || []);
      }
    } catch (err) {
      console.error('Error fetching rounds:', err);
    }
  };

  // Fetch all courses
  const fetchAllCourses = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:8080/api/courses', {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Fetched courses:', data);
      
      const transformedCourses = transformCourseData(data);
      setCourses(transformedCourses);
      
      const uniqueCategories = ['all', ...new Set(data.map(course => course.departmentName))];
      setCategories(uniqueCategories);
      
    } catch (err) {
      console.error('Error fetching courses:', err);
      setError('Failed to load courses. Please check if the backend server is running.');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user's enrolled courses
  const fetchMyEnrollments = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/courses/my-enrollments', {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Raw enrollment data from API:', data); // DEBUG
        
        // Transform and ADD grade/status without losing enrollmentId
        const transformedEnrollments = transformCourseData(data, true).map(course => {
          console.log('Transformed course:', course); // DEBUG
          return {
            ...course,
            grade: 'A',
            status: 'ongoing',
            // enrollmentId is already in course from transformCourseData
          };
        });
        
        console.log('Final transformed enrollments:', transformedEnrollments); // DEBUG
        setRegisteredCourses(transformedEnrollments);
      }
    } catch (err) {
      console.error('Error fetching enrollments:', err);
    }
  };

  // Fetch user's bids
  const fetchMyBids = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/bids/my-bids', {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        setMyBids(data || []);
      }
    } catch (err) {
      console.error('Error fetching bids:', err);
    }
  };

  const fetchMyWaitlist = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/waitlist/my-waitlist', {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        setWaitlist(data || []);
      }
    } catch (err) {
      console.error('Error fetching waitlist:', err);
    }
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || course.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginForm.email,
          password: loginForm.password
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Login failed with status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Login successful:', data);
      
      // Check if user is admin
      const userIsAdmin = data.role === 'admin' || 
                         data.isAdmin === true || 
                         loginForm.email.toLowerCase().includes('admin');
      
      setIsAdmin(userIsAdmin);
      
      // Store token
      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }
      
      // Store admin status
      localStorage.setItem('isAdmin', userIsAdmin.toString());
      
      // Update user profile from login response
      if (!userIsAdmin) {
        setUserProfile({
          ...userProfile,
          name: data.name || '',
          email: data.email || loginForm.email,
          studentId: data.studentId?.toString() || ''
        });
        
        // Fetch full profile and wallet data
        fetchUserProfile();
        fetchUserWallet();
      }
      
      setIsLoggedIn(true);
      setCurrentPage(userIsAdmin ? 'admin' : 'home');
      setLoginForm({ email: '', password: '' });
      
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Please check your credentials.');
      alert('Login failed: ' + (err.message || 'Please check your credentials and try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('isAdmin');
    
    setIsLoggedIn(false);
    setIsAdmin(false);
    setCurrentPage('login');
    setShowMobileMenu(false);
    setCourses([]);
    setCart([]);
    setMyBids([]);
    setCoursesWon([]);
    setCoursesLost([]);
    setRegisteredCourses([]);
    setWaitlist([]);
    setPoints(100);
    setUserProfile({
      name: '',
      email: '',
      studentId: '',
      major: '',
      year: '',
      phone: '',
      address: '',
      gpa: '',
      credits: ''
    });
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

  const handleCheckout = async () => {
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

    try {
      console.log('Starting checkout process...');
      console.log('Cart items:', cart);
      console.log('Current round:', currentRound);
      
      // Submit bids to backend
      for (const item of cart) {
        const bidData = {
          courseId: item.courseId,
          bidAmount: item.bidAmount
        };
        console.log('Submitting bid:', bidData);
        
        const response = await fetch('http://localhost:8080/api/bids', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(bidData)
        });
        
        if (!response.ok) {
          const error = await response.text();
          console.error('Bid submission failed:', error);
          throw new Error('Failed to submit bid: ' + error);
        }
        
        const result = await response.json();
        console.log('Bid created:', result);
      }

      // Refresh data after successful checkout
      console.log('Fetching updated bids...');
      await fetchMyBids();
      await fetchUserWallet();
      
      setCart([]);
      setShowCart(false);
      alert('Successfully placed ' + cart.length + ' bid(s) in Round ' + currentRound + '!\n\nYour bids are now active. Check "My Bids" to track their status.');
      
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Failed to place bids. Please try again.');
    }
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

  // Login page
  if (!isLoggedIn) {
    return (
      <LoginPage
        loginForm={loginForm}
        setLoginForm={setLoginForm}
        handleLogin={handleLogin}
      />
    );
  }

  // Admin Dashboard
  if (isAdmin) {
    return <AdminDashboard handleLogout={handleLogout} />;
  }

  // Student Interface
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
          {loading && (currentPage === 'browse' || currentPage === 'home') && (
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading data from backend...</p>
            </div>
          )}

          {error && (currentPage === 'browse' || currentPage === 'home') && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
              <p className="text-red-700 font-semibold mb-2">⚠️ Error Loading Data</p>
              <p className="text-red-600 text-sm mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-semibold"
              >
                Retry Connection
              </button>
            </div>
          )}

          {currentPage === 'home' && (
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
              userProfile={userProfile}
              allRounds={allRounds}
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
              onBidCancelled={handleBidCancelled}
              points={points}
            />
          )}

          {currentPage === 'registered' && (
            <RegisteredCourses 
              registeredCourses={registeredCourses} 
              onCourseDropped={handleCourseDropped}
            />
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

      {/* Toast Notifications */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
};

export default App;