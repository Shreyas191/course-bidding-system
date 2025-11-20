# Course Bidding System

A web-based course bidding system that allows students to bid on courses using allocated points across multiple bidding rounds. Students can browse available courses, place bids, track their bidding status, and view enrolled courses. Administrators can manage courses, students, bidding rounds, and monitor system activity.

## Tech Stack

**Backend:**
- Java 17
- Spring Boot 3.5.7
- MySQL 8.0
- Maven 3.9.x

**Frontend:**
- React 18
- Vite 7.2.2
- Node.js 18.x or higher

## Setup Instructions

### Prerequisites
- Java 17 or higher
- Node.js 18.x or higher
- MySQL 8.0 or higher
- Maven 3.9.x or higher

### 1. Clone the Repository
```bash
git clone https://github.com/Shreyas191/course-bidding-system.git
cd course-bidding-system
```

### 2. Database Setup
```sql
CREATE DATABASE course_registration;
```

import database into MySQL

### 3. Backend Setup
```bash
cd cbs_backend
```

Update `src/main/resources/application.properties` with your MySQL credentials:
```properties
spring.datasource.url=jdbc:mysql://localhost:3306/course_registration
spring.datasource.username=your_username
spring.datasource.password=your_password
```

Start the backend server:
```bash
mvnw.cmd spring-boot:run
```

Backend will run on `http://localhost:8080`

### 4. Frontend Setup (open new terminal)
```bash
cd cbs_frontend
npm install
npm run dev
```

Frontend will run on `http://localhost:5173`

## Default Login Credentials

**Admin:**
- Email: admin@nyu.edu
- Password: admin123

**Student:**
- Email: alice.johnson@nyu.edu
- Password: password123

## Project Structure
```
course-bidding-system/
├── cbs_backend/          # Spring Boot backend
│   └── src/main/java/
└── cbs_frontend/         # React frontend
    └── src/
```

