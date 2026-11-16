
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

// Generate JWT token
const generateToken = (user) => {
    return jwt.sign(
        {
            user_id: user.user_id,
            role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
    );
};

// STUDENT REGISTRATION
const registerStudent = async (req, res) => {
    const {
        name,
        email,
        password,
        roll_number,
        department_id,
        year_of_study,
        address
    } = req.body;

    if (
        !name || !email || !password ||
        !roll_number || !department_id ||
        !year_of_study
    ) {
        return res.status(400).json({
            success: false,
            message: 'Please provide all required student details'
        });
    }

    const cleanName = String(name).trim();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanRoll = String(roll_number).trim();
    const deptId = Number(department_id);
    const studyYear = Number(year_of_study);

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!cleanName || cleanName.length > 100) {
        return res.status(400).json({
            success: false,
            message: 'Name must contain 1 to 100 characters'
        });
    }

    if (!emailPattern.test(cleanEmail) || cleanEmail.length > 150) {
        return res.status(400).json({
            success: false,
            message: 'Please provide a valid email address'
        });
    }

    if (password.length < 8) {
        return res.status(400).json({
            success: false,
            message: 'Password must contain at least 8 characters'
        });
    }

    if (!cleanRoll || cleanRoll.length > 40) {
        return res.status(400).json({
            success: false,
            message: 'Please provide a valid roll number'
        });
    }

    if (!Number.isSafeInteger(deptId) || deptId < 1) {
        return res.status(400).json({
            success: false,
            message: 'Invalid department ID'
        });
    }

    if (!Number.isInteger(studyYear) || studyYear < 1 || studyYear > 8) {
        return res.status(400).json({
            success: false,
            message: 'Year of study must be between 1 and 8'
        });
    }

    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [departments] = await connection.execute(
            'SELECT department_id FROM departments WHERE department_id = ?',
            [deptId]
        );

        if (departments.length === 0) {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: 'Department does not exist'
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const [userResult] = await connection.execute(
            `INSERT INTO users (name, email, password_hash, role)
             VALUES (?, ?, ?, 'STUDENT')`,
            [cleanName, cleanEmail, passwordHash]
        );

        const userId = userResult.insertId;

        await connection.execute(
            `INSERT INTO students
             (user_id, roll_number, department_id, year_of_study, address)
             VALUES (?, ?, ?, ?, ?)`,
            [
                userId,
                cleanRoll,
                deptId,
                studyYear,
                address ? String(address).trim() : null
            ]
        );

        await connection.commit();

        return res.status(201).json({
            success: true,
            message: 'Student registered successfully',
            student: {
                user_id: userId,
                name: cleanName,
                email: cleanEmail,
                roll_number: cleanRoll,
                department_id: deptId,
                year_of_study: studyYear
            }
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error('Student registration error:', error.message);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'Email or roll number already exists'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Student registration failed'
        });

    } finally {
        if (connection) {
            connection.release();
        }
    }
};

// COMMON LOGIN - STUDENT, STAFF AND ADMIN
const login = async (req, res) => {
    const { email, password } = req.body;

    if (
        typeof email !== 'string' ||
        typeof password !== 'string' ||
        !email.trim() ||
        !password
    ) {
        return res.status(400).json({
            success: false,
            message: 'Email and password are required'
        });
    }

    try {
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not configured');
        }

        const [users] = await pool.execute(
            `SELECT user_id, name, email, password_hash, role
             FROM users
             WHERE email = ? AND is_active = TRUE`,
            [email.trim().toLowerCase()]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const user = users[0];

        const allowedRoles = ['STUDENT', 'STAFF', 'ADMIN'];

        if (!allowedRoles.includes(user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Invalid account role'
            });
        }

        const isPasswordCorrect = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!isPasswordCorrect) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const token = generateToken(user);

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                user_id: user.user_id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Common login error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Login failed'
        });
    }
};

// STUDENT LOGIN
const loginStudent = async (req, res) => {
    const { email, password } = req.body;

    if (
        typeof email !== 'string' ||
        typeof password !== 'string' ||
        !email.trim() ||
        !password
    ) {
        return res.status(400).json({
            success: false,
            message: 'Email and password are required'
        });
    }

    try {
        const [users] = await pool.execute(
            `SELECT user_id, name, email, password_hash, role
             FROM users
             WHERE email = ?
               AND role = 'STUDENT'
               AND is_active = TRUE`,
            [email.trim().toLowerCase()]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const user = users[0];

        const isPasswordCorrect = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!isPasswordCorrect) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const token = generateToken(user);

        return res.status(200).json({
            success: true,
            message: 'Student login successful',
            token,
            user: {
                user_id: user.user_id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Student login error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Student login failed'
        });
    }
};

// STAFF LOGIN
const loginStaff = async (req, res) => {
    const { email, password } = req.body;

    if (
        typeof email !== 'string' ||
        typeof password !== 'string' ||
        !email.trim() ||
        !password
    ) {
        return res.status(400).json({
            success: false,
            message: 'Email and password are required'
        });
    }

    try {
        const [users] = await pool.execute(
            `SELECT u.user_id, u.name, u.email, u.password_hash, u.role,
                    s.employee_id, s.department_id, s.designation
             FROM users u
             JOIN staff s ON u.user_id = s.user_id
             WHERE u.email = ?
               AND u.role = 'STAFF'
               AND u.is_active = TRUE`,
            [email.trim().toLowerCase()]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const user = users[0];

        const isPasswordCorrect = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!isPasswordCorrect) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const token = generateToken(user);

        return res.status(200).json({
            success: true,
            message: 'Staff login successful',
            token,
            staff: {
                user_id: user.user_id,
                name: user.name,
                email: user.email,
                role: user.role,
                employee_id: user.employee_id,
                department_id: user.department_id,
                designation: user.designation
            }
        });

    } catch (error) {
        console.error('Staff login error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Staff login failed'
        });
    }
};

// ADMIN LOGIN
const loginAdmin = async (req, res) => {
    const { email, password } = req.body;

    if (
        typeof email !== 'string' ||
        typeof password !== 'string' ||
        !email.trim() ||
        !password
    ) {
        return res.status(400).json({
            success: false,
            message: 'Email and password are required'
        });
    }

    try {
        const [users] = await pool.execute(
            `SELECT user_id, name, email, password_hash, role
             FROM users
             WHERE email = ?
               AND role = 'ADMIN'
               AND is_active = TRUE`,
            [email.trim().toLowerCase()]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const user = users[0];

        const isPasswordCorrect = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!isPasswordCorrect) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const token = generateToken(user);

        return res.status(200).json({
            success: true,
            message: 'Admin login successful',
            token,
            admin: {
                user_id: user.user_id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Admin login error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Admin login failed'
        });
    }
};

module.exports = {
    registerStudent,
    login,
    loginStudent,
    loginStaff,
    loginAdmin
};
