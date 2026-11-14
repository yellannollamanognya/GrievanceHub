-- GrievanceHub MySQL schema | MySQL 8.0.16+
CREATE DATABASE IF NOT EXISTS grievancehub CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE grievancehub;

-- 1. USERS
CREATE TABLE users (
  user_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('STUDENT','STAFF','ADMIN') NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role(role)
) ENGINE=InnoDB;

-- 2. DEPARTMENTS
CREATE TABLE departments (
  department_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  department_name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. STUDENTS (shared PK/FK to users)
CREATE TABLE students (
  user_id BIGINT UNSIGNED PRIMARY KEY,
  roll_number VARCHAR(40) NOT NULL UNIQUE,
  department_id BIGINT UNSIGNED NOT NULL,
  year_of_study TINYINT UNSIGNED NOT NULL,
  address VARCHAR(255),
  CONSTRAINT fk_students_user FOREIGN KEY(user_id) REFERENCES users(user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_students_department FOREIGN KEY(department_id) REFERENCES departments(department_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_students_year CHECK(year_of_study BETWEEN 1 AND 8),
  INDEX idx_students_department(department_id)
) ENGINE=InnoDB;

-- 4. STAFF
CREATE TABLE staff (
  user_id BIGINT UNSIGNED PRIMARY KEY,
  employee_id VARCHAR(40) NOT NULL UNIQUE,
  department_id BIGINT UNSIGNED NOT NULL,
  designation VARCHAR(100),
  address VARCHAR(255),
  CONSTRAINT fk_staff_user FOREIGN KEY(user_id) REFERENCES users(user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_staff_department FOREIGN KEY(department_id) REFERENCES departments(department_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX idx_staff_department(department_id)
) ENGINE=InnoDB;

-- 5. CATEGORIES
CREATE TABLE categories (
  category_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

-- 6. COMPLAINTS
CREATE TABLE complaints (
  complaint_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id BIGINT UNSIGNED NOT NULL,
  category_id BIGINT UNSIGNED NOT NULL,
  department_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(180),
  priority ENUM('LOW','MEDIUM','HIGH','URGENT') NOT NULL DEFAULT 'MEDIUM',
  current_status ENUM('SUBMITTED','UNDER_REVIEW','ASSIGNED','IN_PROGRESS','RESOLVED','CLOSED','REJECTED','CANCELLED','REOPENED')
    NOT NULL DEFAULT 'SUBMITTED',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_complaints_student FOREIGN KEY(student_id) REFERENCES students(user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_complaints_category FOREIGN KEY(category_id) REFERENCES categories(category_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_complaints_department FOREIGN KEY(department_id) REFERENCES departments(department_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX idx_complaints_student(student_id),
  INDEX idx_complaints_category(category_id),
  INDEX idx_complaints_department(department_id),
  INDEX idx_complaints_status(current_status),
  INDEX idx_complaints_priority(priority),
  INDEX idx_complaints_created(created_at)
) ENGINE=InnoDB;

-- 7. COMPLAINT_ASSIGNMENTS: one row per assignment event/reassignment
CREATE TABLE complaint_assignments (
  assignment_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  complaint_id BIGINT UNSIGNED NOT NULL,
  staff_id BIGINT UNSIGNED NOT NULL,
  assigned_by BIGINT UNSIGNED NOT NULL,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  unassigned_at TIMESTAMP NULL,
  CONSTRAINT fk_assignments_complaint FOREIGN KEY(complaint_id) REFERENCES complaints(complaint_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_assignments_staff FOREIGN KEY(staff_id) REFERENCES staff(user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_assignments_assigner FOREIGN KEY(assigned_by) REFERENCES users(user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX idx_assignments_complaint(complaint_id),
  INDEX idx_assignments_staff(staff_id),
  INDEX idx_assignments_active(complaint_id,unassigned_at)
) ENGINE=InnoDB;

-- 8. COMPLAINT_HISTORY: initial row should be SUBMITTED; later rows record transitions
CREATE TABLE complaint_history (
  history_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  complaint_id BIGINT UNSIGNED NOT NULL,
  changed_by BIGINT UNSIGNED NOT NULL,
  old_status ENUM('SUBMITTED','UNDER_REVIEW','ASSIGNED','IN_PROGRESS','RESOLVED','CLOSED','REJECTED','CANCELLED','REOPENED'),
  new_status ENUM('SUBMITTED','UNDER_REVIEW','ASSIGNED','IN_PROGRESS','RESOLVED','CLOSED','REJECTED','CANCELLED','REOPENED') NOT NULL,
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  remarks VARCHAR(1000),
  CONSTRAINT fk_history_complaint FOREIGN KEY(complaint_id) REFERENCES complaints(complaint_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_history_actor FOREIGN KEY(changed_by) REFERENCES users(user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX idx_history_complaint_time(complaint_id,changed_at)
) ENGINE=InnoDB;

-- 9. COMMENTS
CREATE TABLE comments (
  comment_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  complaint_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_comments_complaint FOREIGN KEY(complaint_id) REFERENCES complaints(complaint_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_comments_user FOREIGN KEY(user_id) REFERENCES users(user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX idx_comments_complaint_time(complaint_id,created_at),
  INDEX idx_comments_user(user_id)
) ENGINE=InnoDB;

-- 10. ATTACHMENTS: file metadata/path only; actual files stay in storage
CREATE TABLE attachments (
  attachment_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  complaint_id BIGINT UNSIGNED NOT NULL,
  uploaded_by BIGINT UNSIGNED NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(700) NOT NULL,
  file_type VARCHAR(100),
  purpose ENUM('EVIDENCE','RESOLUTION_PROOF') NOT NULL DEFAULT 'EVIDENCE',
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_attachments_complaint FOREIGN KEY(complaint_id) REFERENCES complaints(complaint_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_attachments_uploader FOREIGN KEY(uploaded_by) REFERENCES users(user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX idx_attachments_complaint(complaint_id),
  INDEX idx_attachments_uploader(uploaded_by)
) ENGINE=InnoDB;

-- 11. FEEDBACK: at most one feedback row per complaint
CREATE TABLE feedback (
  feedback_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  complaint_id BIGINT UNSIGNED NOT NULL UNIQUE,
  rating TINYINT UNSIGNED NOT NULL,
  message VARCHAR(1000),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_feedback_complaint FOREIGN KEY(complaint_id) REFERENCES complaints(complaint_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_feedback_rating CHECK(rating BETWEEN 1 AND 5)
) ENGINE=InnoDB;

SHOW TABLES;
