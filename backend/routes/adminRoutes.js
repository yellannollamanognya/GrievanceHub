const express = require('express');
const router = express.Router();

const {
    getDashboardStats,
    getAllComplaints,
    assignComplaint,
    createStaff,
    getAllStaff
} = require('../controllers/adminController');
const {
    verifyToken,
    authorizeRoles
} = require('../middleware/authMiddleware');

// Admin Dashboard Statistics
router.get(
    '/dashboard',
    verifyToken,
    authorizeRoles('ADMIN'),
    getDashboardStats
);
// Admin: View all complaints
router.get(
    '/complaints',
    verifyToken,
    authorizeRoles('ADMIN'),
    getAllComplaints
);

// Admin: Assign complaint to staff
router.post(
    '/complaints/:id/assign',
    verifyToken,
    authorizeRoles('ADMIN'),
    assignComplaint
);

// Admin: Create staff account
router.post(
    '/staff',
    verifyToken,
    authorizeRoles('ADMIN'),
    createStaff
);

// Admin: View all staff
router.get(
    '/staff',
    verifyToken,
    authorizeRoles('ADMIN'),
    getAllStaff
);
module.exports = router;
