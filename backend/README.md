
# GrievanceHub Backend

Backend REST API for the GrievanceHub Campus Complaint Management System.

## Technologies
- Node.js
- Express.js
- MySQL
- JWT Authentication
- bcryptjs
- Multer

## Setup

1. Install Node.js and MySQL.
2. Clone the GrievanceHub repository.
3. Navigate to the backend folder:

   cd backend

4. Install dependencies:

   npm install

5. Create your environment file:

   cp .env.example .env

6. Update the database credentials and JWT_SECRET in `.env`.

7. Create the MySQL database and import the project database schema from `database/schema.sql`.

## Run the backend

Development:

npm run dev

Production:

npm start

## Server

http://localhost:5000

## Health check

GET http://localhost:5000/api/health

## Main API modules

- /api/auth - Registration, login and profiles
- /api/complaints - Complaints, comments, attachments, feedback and history
- /api/admin - Admin dashboard, staff management and complaint assignment

## Security

- Passwords are hashed using bcrypt.
- JWT is used for authentication.
- Role-based authorization is implemented.
- Database queries use parameterized SQL.
- Environment files and uploaded attachments are excluded from Git.

## Team

GrievanceHub - Campus Grievance & Complaint Management System
