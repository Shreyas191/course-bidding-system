import React from 'react';
import { Search, Filter } from 'lucide-react';
import CourseCard from './CourseCard';

const BrowseCourses = ({ 
  searchTerm, 
  setSearchTerm, 
  filterCategory, 
  setFilterCategory, 
  categories, 
  filteredCourses, 
  myBids, 
  setSelectedCourse, 
  handleAddToWaitlist,
  handleAddToCart
}) => {
  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none bg-white shadow-sm"
          />
        </div>
        <div className="relative w-full sm:w-64">
          <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none z-10" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full pl-12 pr-10 py-4 rounded-2xl border-2 border-gray-200 focus:border-indigo-500 focus:outline-none bg-white shadow-sm appearance-none cursor-pointer"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.75rem center',
              backgroundSize: '1.5em 1.5em'
            }}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredCourses.map(course => {
          const myBid = myBids.find(b => b.courseId === course.id);
          return (
            <CourseCard
              key={course.id}
              course={course}
              myBid={myBid}
              setSelectedCourse={setSelectedCourse}
              handleAddToWaitlist={handleAddToWaitlist}
              handleAddToCart={handleAddToCart}
            />
          );
        })}
      </div>
    </div>
  );
};

export default BrowseCourses;