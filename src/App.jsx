import React, { useState } from 'react';
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
  
  // Round 1 results - courses student got/didn't get
  const [round1Results, setRound1Results] = useState([]);
  const [coursesWon, setCoursesWon] = useState([]);
  const [coursesLost, setCoursesLost] = useState([]);

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

    // In Round 2, check if student won this course in Round 1
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

    // Create bids from cart
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

  // Simulate Round 1 end and determine results
  const handleEndRound1 = () => {
    if (currentRound !== 1) return;

    // Simulate results - some bids won, some lost
    const round1Bids = myBids.filter(b => b.round === 1);
    const won = [];
    const lost = [];

    round1Bids.forEach(bid => {
      // Simple simulation - bids >= avgBid win
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

  // For demo: Add a button to simulate round end
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
          {/* Demo Button - Remove in production */}
          {myBids.length > 0 && currentRound <= 2 && (
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
            />
          )}

          {currentPage === 'browse' && (
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