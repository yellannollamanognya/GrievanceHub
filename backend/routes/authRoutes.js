const express = require('express');
const router = express.Router();

const {
    registerStudent,
    loginStudent,
    loginStaff,
    loginAdmin
} = require('../controllers/authController');
const {
    verifyToken,
    authorizeRoles
} = require('../middleware/authMiddleware');
const { pool } = require('../config/db');
// Student registration
router.post('/register/student', registerStudent);

// Student login
router.post('/login/student', loginStudent);

// Staff login
router.post('/login/staff', loginStaff);

// Admin login
router.post('/login/admin', loginAdmin);
// Protected student profile
router.get('/profile', verifyToken, async (req, res) => {
    try {
        const [users] = await pool.execute(
            `SELECT u.user_id, u.name, u.email, u.role,
                    s.roll_number, s.department_id,
                    s.year_of_study, s.address
             FROM users u
             JOIN students s ON u.user_id = s.user_id
             WHERE u.user_id = ? AND u.role = 'STUDENT'`,
            [req.user.user_id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Student profile not found'
            });
        }

        res.status(200).json({
            success: true,
            student: users[0]
        });

    } catch (error) {
        console.error('Profile error:', error.message);

        res.status(500).json({
            success: false,
            message: 'Unable to fetch student profile'
        });
    }
});

// Protected staff profile
router.get(
    '/staff-profile',
    verifyToken,
    authorizeRoles('STAFF'),
    async (req, res) => {
        try {
            const [staff] = await pool.execute(
                `SELECT u.user_id, u.name, u.email, u.role,
                        s.employee_id, s.department_id,
                        s.designation, s.address
                 FROM users u
                 JOIN staff s ON u.user_id = s.user_id
                 WHERE u.user_id = ? AND u.role = 'STAFF'
                 AND u.is_active = TRUE`,
                [req.user.user_id]
            );

            if (staff.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Staff profile not found'
                });
            }

            return res.status(200).json({
                success: true,
                staff: staff[0]
            });

        } catch (error) {
            console.error('Staff profile error:', error.message);

            return res.status(500).json({
                success: false,
                message: 'Unable to fetch staff profile'
            });
        }
    }
);
// Protected Admin Profile
router.get(
    '/admin-profile',
    verifyToken,
    authorizeRoles('ADMIN'),
    async (req, res) => {
        try {
            const [admins] = await pool.execute(
                `SELECT user_id, name, email, role
                 FROM users
                 WHERE user_id = ?
                 AND role = 'ADMIN'
                 AND is_active = TRUE`,
                [req.user.user_id]
            );

            if (admins.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Admin profile not found'
                });
            }

            return res.status(200).json({
                success: true,
                admin: admins[0]
            });

        } catch (error) {
            console.error('Admin profile error:', error.message);

            return res.status(500).json({
                success: false,
                message: 'Unable to fetch Admin profile'
            });
        }
    }
);
module.exports = router;
