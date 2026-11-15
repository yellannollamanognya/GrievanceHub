const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
// ADMIN DASHBOARD
const getDashboardStats = async (req, res) => {
    try {
        // Total complaints
        const [totalRows] = await pool.execute(
            'SELECT COUNT(*) AS total_complaints FROM complaints'
        );

        // Complaints grouped by status
        const [statusRows] = await pool.execute(
            `SELECT current_status, COUNT(*) AS count
             FROM complaints
             GROUP BY current_status`
        );

        // Total students
        const [studentRows] = await pool.execute(
            `SELECT COUNT(*) AS total_students
             FROM users
             WHERE role = 'STUDENT' AND is_active = TRUE`
        );

        // Total staff
        const [staffRows] = await pool.execute(
            `SELECT COUNT(*) AS total_staff
             FROM users
             WHERE role = 'STAFF' AND is_active = TRUE`
        );

        // Total admins
        const [adminRows] = await pool.execute(
            `SELECT COUNT(*) AS total_admins
             FROM users
             WHERE role = 'ADMIN' AND is_active = TRUE`
        );

        return res.status(200).json({
            success: true,
            dashboard: {
                total_complaints: totalRows[0].total_complaints,
                complaints_by_status: statusRows,
                total_students: studentRows[0].total_students,
                total_staff: staffRows[0].total_staff,
                total_admins: adminRows[0].total_admins
            }
        });

    } catch (error) {
        console.error('Dashboard error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Unable to fetch dashboard statistics'
        });
    }
};
// ADMIN: VIEW ALL COMPLAINTS
const getAllComplaints = async (req, res) => {
    try {
        const [complaints] = await pool.execute(
            `SELECT
                c.complaint_id,
                c.title,
                c.description,
                c.location,
                c.priority,
                c.current_status,
                c.created_at,
                c.updated_at,
                u.name AS student_name,
                s.roll_number,
                cat.category_name,
                d.department_name
             FROM complaints c
             JOIN students s ON c.student_id = s.user_id
             JOIN users u ON s.user_id = u.user_id
             JOIN categories cat ON c.category_id = cat.category_id
             JOIN departments d ON c.department_id = d.department_id
             ORDER BY c.created_at DESC`
        );

        return res.status(200).json({
            success: true,
            count: complaints.length,
            complaints
        });

    } catch (error) {
        console.error('Get all complaints error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Unable to fetch complaints'
        });
    }
};
// ADMIN: ASSIGN COMPLAINT TO STAFF
const assignComplaint = async (req, res) => {
    const complaintId = Number(req.params.id);
    const staffId = Number(req.body.staff_id);

    if (
        !Number.isSafeInteger(complaintId) ||
        complaintId <= 0 ||
        !Number.isSafeInteger(staffId) ||
        staffId <= 0
    ) {
        return res.status(400).json({
            success: false,
            message: 'Valid complaint ID and staff ID are required'
        });
    }

    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. Check and lock the complaint
        const [complaints] = await connection.execute(
            `SELECT complaint_id, department_id, current_status
             FROM complaints
             WHERE complaint_id = ?
             FOR UPDATE`,
            [complaintId]
        );

        if (complaints.length === 0) {
            throw Object.assign(
                new Error('Complaint not found'),
                { statusCode: 404 }
            );
        }

        const complaint = complaints[0];

        // 2. Do not assign completed or rejected complaints
        const blockedStatuses = [
            'RESOLVED',
            'CLOSED',
            'REJECTED',
            'CANCELLED'
        ];

        if (blockedStatuses.includes(complaint.current_status)) {
            throw Object.assign(
                new Error('This complaint cannot be assigned in its current status'),
                { statusCode: 409 }
            );
        }

        // 3. Check staff account and department
        const [staffRows] = await connection.execute(
            `SELECT s.user_id, s.department_id
             FROM staff s
             JOIN users u ON u.user_id = s.user_id
             WHERE s.user_id = ?
               AND u.role = 'STAFF'
               AND u.is_active = TRUE
             FOR UPDATE`,
            [staffId]
        );

        if (staffRows.length === 0) {
            throw Object.assign(
                new Error('Active staff member not found'),
                { statusCode: 404 }
            );
        }

        if (Number(staffRows[0].department_id) !==
            Number(complaint.department_id)) {
            throw Object.assign(
                new Error('Staff member must belong to the complaint department'),
                { statusCode: 400 }
            );
        }

        // 4. Check existing active assignment
        const [activeAssignments] = await connection.execute(
            `SELECT assignment_id, staff_id
             FROM complaint_assignments
             WHERE complaint_id = ?
               AND unassigned_at IS NULL
             FOR UPDATE`,
            [complaintId]
        );

        if (
            activeAssignments.length > 0 &&
            Number(activeAssignments[0].staff_id) === staffId
        ) {
            throw Object.assign(
                new Error('Complaint is already assigned to this staff member'),
                { statusCode: 409 }
            );
        }

        // 5. Close previous active assignment, if any
        await connection.execute(
            `UPDATE complaint_assignments
             SET unassigned_at = CURRENT_TIMESTAMP
             WHERE complaint_id = ?
               AND unassigned_at IS NULL`,
            [complaintId]
        );

        // 6. Create new assignment
        await connection.execute(
            `INSERT INTO complaint_assignments
             (complaint_id, staff_id, assigned_by)
             VALUES (?, ?, ?)`,
            [complaintId, staffId, req.user.user_id]
        );

        // 7. Update complaint status and history
        if (complaint.current_status !== 'ASSIGNED') {
            await connection.execute(
                `UPDATE complaints
                 SET current_status = 'ASSIGNED'
                 WHERE complaint_id = ?`,
                [complaintId]
            );

            await connection.execute(
                `INSERT INTO complaint_history
                 (complaint_id, changed_by, old_status, new_status, remarks)
                 VALUES (?, ?, ?, 'ASSIGNED', ?)`,
                [
                    complaintId,
                    req.user.user_id,
                    complaint.current_status,
                    'Complaint assigned to staff'
                ]
            );
        }

        await connection.commit();

        return res.status(200).json({
            success: true,
            message: 'Complaint assigned successfully',
            complaint_id: complaintId,
            staff_id: staffId,
            current_status: 'ASSIGNED'
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error('Assign complaint error:', error.message);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode
                ? error.message
                : 'Unable to assign complaint'
        });

    } finally {
        if (connection) {
            connection.release();
        }
    }
};

const createStaff = async (req, res) => {
    const {
        name,
        email,
        password,
        employee_id,
        department_id,
        designation,
        address
    } = req.body;

    if (
        !name || !email || !password ||
        !employee_id || !department_id
    ) {
        return res.status(400).json({
            success: false,
            message: 'Name, email, password, employee ID and department are required'
        });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedName = String(name).trim();
    const normalizedEmployeeId = String(employee_id).trim();
    const deptId = Number(department_id);

    if (
        normalizedName.length > 100 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
        normalizedEmail.length > 150 ||
        typeof password !== 'string' ||
        password.length < 8 ||
        normalizedEmployeeId.length > 40 ||
        !Number.isSafeInteger(deptId) ||
        deptId <= 0 ||
        (designation && String(designation).length > 100) ||
        (address && String(address).length > 255)
    ) {
        return res.status(400).json({
            success: false,
            message: 'Please provide valid staff details'
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

        const [existing] = await connection.execute(
            `SELECT user_id FROM users WHERE email = ?
             UNION
             SELECT user_id FROM staff WHERE employee_id = ?`,
            [normalizedEmail, normalizedEmployeeId]
        );

        if (existing.length > 0) {
            await connection.rollback();
            return res.status(409).json({
                success: false,
                message: 'Email or employee ID already exists'
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const [userResult] = await connection.execute(
            `INSERT INTO users
             (name, email, password_hash, role)
             VALUES (?, ?, ?, 'STAFF')`,
            [normalizedName, normalizedEmail, passwordHash]
        );

        await connection.execute(
            `INSERT INTO staff
             (user_id, employee_id, department_id, designation, address)
             VALUES (?, ?, ?, ?, ?)`,
            [
                userResult.insertId,
                normalizedEmployeeId,
                deptId,
                designation || null,
                address || null
            ]
        );

        await connection.commit();

        return res.status(201).json({
            success: true,
            message: 'Staff account created successfully',
            staff: {
                user_id: userResult.insertId,
                name: normalizedName,
                email: normalizedEmail,
                employee_id: normalizedEmployeeId,
                department_id: deptId,
                designation: designation || null
            }
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error('Create staff error:', error);

        return res.status(
            error.code === 'ER_DUP_ENTRY' ? 409 : 500
        ).json({
            success: false,
            message: error.code === 'ER_DUP_ENTRY'
                ? 'Email or employee ID already exists'
                : 'Unable to create staff account'
        });

    } finally {
        if (connection) {
            connection.release();
        }
    }
};

const getAllStaff = async (req, res) => {
    try {
        const [staff] = await pool.execute(
            `SELECT
                u.user_id,
                u.name,
                u.email,
                u.is_active,
                u.created_at,
                s.employee_id,
                s.department_id,
                d.department_name,
                s.designation
             FROM staff s
             INNER JOIN users u
                ON s.user_id = u.user_id
             INNER JOIN departments d
                ON s.department_id = d.department_id
             ORDER BY u.created_at DESC`
        );

        return res.status(200).json({
            success: true,
            count: staff.length,
            staff
        });

    } catch (error) {
        console.error('Get all staff error:', error);

        return res.status(500).json({
            success: false,
            message: 'Unable to retrieve staff list'
        });
    }
};

module.exports = {
    getDashboardStats,
    getAllComplaints,
    assignComplaint,
    createStaff,
    getAllStaff
};
