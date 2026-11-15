const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

// STUDENT COMPLAINT SUBMISSION
const submitComplaint = async (req, res) => {
    const {
        category_id,
        department_id,
        title,
        description,
        location,
        priority
    } = req.body;

    // 1. Validate required fields
    if (
        category_id === undefined ||
        department_id === undefined ||
        !title ||
        !description
    ) {
        return res.status(400).json({
            success: false,
            message: 'Please provide all required complaint details'
        });
    }

    // 2. Validate and clean inputs
    const categoryId = Number(category_id);
    const departmentId = Number(department_id);
    const cleanTitle = String(title).trim();
    const cleanDescription = String(description).trim();
    const cleanLocation = location ? String(location).trim() : null;

    const allowedPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
    const complaintPriority = priority || 'MEDIUM';

    if (!Number.isSafeInteger(categoryId) || categoryId < 1) {
        return res.status(400).json({
            success: false,
            message: 'Invalid category ID'
        });
    }

    if (!Number.isSafeInteger(departmentId) || departmentId < 1) {
        return res.status(400).json({
            success: false,
            message: 'Invalid department ID'
        });
    }

    if (cleanTitle.length === 0 || cleanTitle.length > 180) {
        return res.status(400).json({
            success: false,
            message: 'Title must contain 1 to 180 characters'
        });
    }

    if (cleanDescription.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Description cannot be empty'
        });
    }

    if (cleanLocation && cleanLocation.length > 180) {
        return res.status(400).json({
            success: false,
            message: 'Location cannot exceed 180 characters'
        });
    }

    if (!allowedPriorities.includes(complaintPriority)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid complaint priority'
        });
    }

    let connection;

    try {
        connection = await pool.getConnection();

        // 3. Start transaction
        await connection.beginTransaction();

        // 4. Verify category
        const [categories] = await connection.execute(
            'SELECT category_id FROM categories WHERE category_id = ? AND is_active = 1',
            [categoryId]
        );

        if (categories.length === 0) {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: 'Category does not exist or is inactive'
            });
        }

        // 5. Verify department
        const [departments] = await connection.execute(
            'SELECT department_id FROM departments WHERE department_id = ?',
            [departmentId]
        );

        if (departments.length === 0) {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: 'Department does not exist'
            });
        }

        // 6. Insert complaint
        const [complaintResult] = await connection.execute(
            `INSERT INTO complaints
             (student_id, category_id, department_id, title,
              description, location, priority, current_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'SUBMITTED')`,
            [
                req.user.user_id,
                categoryId,
                departmentId,
                cleanTitle,
                cleanDescription,
                cleanLocation,
                complaintPriority
            ]
        );

        const complaintId = complaintResult.insertId;

        // 7. Insert initial complaint history
        await connection.execute(
            `INSERT INTO complaint_history
             (complaint_id, changed_by, old_status, new_status, remarks)
             VALUES (?, ?, NULL, 'SUBMITTED', 'Complaint submitted')`,
            [complaintId, req.user.user_id]
        );

        // 8. Commit transaction
        await connection.commit();

        return res.status(201).json({
            success: true,
            message: 'Complaint submitted successfully',
            complaint: {
                complaint_id: complaintId,
                student_id: req.user.user_id,
                category_id: categoryId,
                department_id: departmentId,
                title: cleanTitle,
                description: cleanDescription,
                location: cleanLocation,
                priority: complaintPriority,
                current_status: 'SUBMITTED'
            }
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error('Complaint submission error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Complaint submission failed'
        });

    } finally {
        if (connection) {
            connection.release();
        }
    }
};

// GET ALL COMPLAINTS SUBMITTED BY LOGGED-IN STUDENT
const getMyComplaints = async (req, res) => {
    try {
        const [complaints] = await pool.execute(
            `SELECT
                complaint_id,
                title,
                description,
                location,
                priority,
                current_status,
                created_at,
                updated_at
             FROM complaints
             WHERE student_id = ?
             ORDER BY created_at DESC`,
            [req.user.user_id]
        );

        return res.status(200).json({
            success: true,
            count: complaints.length,
            complaints: complaints
        });

    } catch (error) {
        console.error('Get complaints error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Unable to fetch complaints'
        });
    }
};
// ADD COMMENT TO A COMPLAINT
const addComment = async (req, res) => {
    const complaintId = Number(req.params.id);
    const { comment_text } = req.body;

    if (!Number.isSafeInteger(complaintId) || complaintId < 1) {
        return res.status(400).json({
            success: false,
            message: 'Invalid complaint ID'
        });
    }

    if (typeof comment_text !== 'string' || !comment_text.trim()) {
        return res.status(400).json({
            success: false,
            message: 'Comment cannot be empty'
        });
    }

    try {
        const [complaints] = await pool.execute(
            `SELECT complaint_id FROM complaints
             WHERE complaint_id = ? AND student_id = ?`,
            [complaintId, req.user.user_id]
        );

        if (complaints.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        const [result] = await pool.execute(
            `INSERT INTO comments (complaint_id, user_id, comment_text)
             VALUES (?, ?, ?)`,
            [complaintId, req.user.user_id, comment_text.trim()]
        );

        return res.status(201).json({
            success: true,
            message: 'Comment added successfully',
            comment_id: result.insertId
        });

    } catch (error) {
        console.error('Add comment error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Unable to add comment'
        });
    }
};


// VIEW COMMENTS OF A COMPLAINT
const getComments = async (req, res) => {
    const complaintId = Number(req.params.id);

    if (!Number.isSafeInteger(complaintId) || complaintId < 1) {
        return res.status(400).json({
            success: false,
            message: 'Invalid complaint ID'
        });
    }

    try {
        const [complaints] = await pool.execute(
            `SELECT complaint_id FROM complaints
             WHERE complaint_id = ? AND student_id = ?`,
            [complaintId, req.user.user_id]
        );

        if (complaints.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        const [comments] = await pool.execute(
            `SELECT c.comment_id, c.comment_text, c.created_at,
                    u.name AS commenter_name, u.role
             FROM comments c
             JOIN users u ON c.user_id = u.user_id
             WHERE c.complaint_id = ?
             ORDER BY c.created_at ASC`,
            [complaintId]
        );

        return res.status(200).json({
            success: true,
            count: comments.length,
            comments: comments
        });

    } catch (error) {
        console.error('Get comments error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Unable to fetch comments'
        });
    }
};
// UPLOAD COMPLAINT ATTACHMENT

const uploadAttachment = async (req, res) => {
    const complaintId = Number(req.params.id);

    const removeFile = () => {
        if (req.file) {
            require('fs').unlink(req.file.path, () => {});
        }
    };

    if (!Number.isSafeInteger(complaintId) || complaintId <= 0) {
        removeFile();
        return res.status(400).json({
            success: false,
            message: 'Invalid complaint ID'
        });
    }

    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'Please select a file to upload'
        });
    }

    try {
        let purpose;

        if (req.user.role === 'STUDENT') {
            purpose = 'EVIDENCE';

            const [complaints] = await pool.execute(
                `SELECT complaint_id
                 FROM complaints
                 WHERE complaint_id = ?
                 AND student_id = ?`,
                [complaintId, req.user.user_id]
            );

            if (complaints.length === 0) {
                removeFile();
                return res.status(404).json({
                    success: false,
                    message: 'Complaint not found'
                });
            }

        } else if (req.user.role === 'STAFF') {
            purpose = 'RESOLUTION_PROOF';

            const [assignments] = await pool.execute(
                `SELECT assignment_id
                 FROM complaint_assignments
                 WHERE complaint_id = ?
                 AND staff_id = ?
                 AND unassigned_at IS NULL`,
                [complaintId, req.user.user_id]
            );

            if (assignments.length === 0) {
                removeFile();
                return res.status(403).json({
                    success: false,
                    message: 'You are not assigned to this complaint'
                });
            }

        } else {
            removeFile();
            return res.status(403).json({
                success: false,
                message: 'You cannot upload complaint attachments'
            });
        }

        const [result] = await pool.execute(
            `INSERT INTO attachments
             (complaint_id, uploaded_by, file_name, file_path, file_type, purpose)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                complaintId,
                req.user.user_id,
                req.file.originalname,
                `uploads/${req.file.filename}`,
                req.file.mimetype,
                purpose
            ]
        );

        return res.status(201).json({
            success: true,
            message: 'Attachment uploaded successfully',
            attachment: {
                attachment_id: result.insertId,
                complaint_id: complaintId,
                file_name: req.file.originalname,
                file_type: req.file.mimetype,
                purpose
            }
        });

    } catch (error) {
        removeFile();

        console.error('Attachment upload error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Unable to upload attachment'
        });
    }
};

// View attachments of a student's own complaint
const getAttachments = async (req, res) => {
    try {
        const complaintId = Number(req.params.id);

        if (!Number.isSafeInteger(complaintId) || complaintId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid complaint ID'
            });
        }

        let accessQuery = '';
        let queryParams = [complaintId];

        if (req.user.role === 'STUDENT') {
            accessQuery = 'AND student_id = ?';
            queryParams.push(req.user.user_id);

        } else if (req.user.role === 'STAFF') {
            accessQuery = `
                AND EXISTS (
                    SELECT 1
                    FROM complaint_assignments ca
                    WHERE ca.complaint_id = complaints.complaint_id
                    AND ca.staff_id = ?
                    AND ca.unassigned_at IS NULL
                )`;
            queryParams.push(req.user.user_id);

        } else if (req.user.role !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'Access forbidden'
            });
        }

        const [complaints] = await pool.execute(
            `SELECT complaint_id
             FROM complaints
             WHERE complaint_id = ? ${accessQuery}`,
            queryParams
        );

        if (complaints.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found or access denied'
            });
        }

        const [attachments] = await pool.execute(
            `SELECT attachment_id, complaint_id, uploaded_by,
                    file_name, file_type, purpose, uploaded_at
             FROM attachments
             WHERE complaint_id = ?
             ORDER BY uploaded_at DESC`,
            [complaintId]
        );

        return res.status(200).json({
            success: true,
            count: attachments.length,
            attachments
        });

    } catch (error) {
        console.error('Get attachments error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Unable to fetch attachments'
        });
    }
};

// Submit feedback for a resolved complaint
const submitFeedback = async (req, res) => {
    try {
        const complaintId = Number(req.params.id);
        const { rating, message } = req.body;

        if (!Number.isSafeInteger(complaintId) || complaintId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid complaint ID'
            });
        }

        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating must be between 1 and 5'
            });
        }

        if (message !== undefined &&
            (typeof message !== 'string' || message.length > 1000)) {
            return res.status(400).json({
                success: false,
                message: 'Message must be a string of at most 1000 characters'
            });
        }

        // Verify complaint ownership and resolution status
        const [complaints] = await pool.execute(
            `SELECT complaint_id, current_status
             FROM complaints
             WHERE complaint_id = ? AND student_id = ?`,
            [complaintId, req.user.user_id]
        );

        if (complaints.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        if (!['RESOLVED', 'CLOSED'].includes(complaints[0].current_status)) {
            return res.status(400).json({
                success: false,
                message: 'Feedback can only be submitted for resolved or closed complaints'
            });
        }

        // Insert feedback
        const [result] = await pool.execute(
            `INSERT INTO feedback (complaint_id, rating, message)
             VALUES (?, ?, ?)`,
            [complaintId, rating, message || null]
        );

        return res.status(201).json({
            success: true,
            message: 'Feedback submitted successfully',
            feedback: {
                feedback_id: result.insertId,
                complaint_id: complaintId,
                rating,
                message: message || null
            }
        });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'Feedback has already been submitted for this complaint'
            });
        }

        console.error('Feedback error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Unable to submit feedback'
        });
    }
};

const getFeedback = async (req, res) => {
    try {
        const complaintId = Number(req.params.id);

        if (!Number.isSafeInteger(complaintId) || complaintId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid complaint ID'
            });
        }

        // Verify complaint belongs to logged-in student
        const [complaints] = await pool.execute(
            `SELECT complaint_id
             FROM complaints
             WHERE complaint_id = ? AND student_id = ?`,
            [complaintId, req.user.user_id]
        );

        if (complaints.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        const [feedback] = await pool.execute(
            `SELECT feedback_id, complaint_id, rating,
                    message, created_at
             FROM feedback
             WHERE complaint_id = ?`,
            [complaintId]
        );

        if (feedback.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Feedback not submitted yet'
            });
        }

        return res.status(200).json({
            success: true,
            feedback: feedback[0]
        });

    } catch (error) {
        console.error('Get feedback error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Unable to fetch feedback'
        });
    }
};
// GET COMPLAINTS ASSIGNED TO LOGGED-IN STAFF
const getAssignedComplaints = async (req, res) => {
    try {
        const staffId = req.user.user_id;

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
                s.roll_number,
                u.name AS student_name,
                cat.category_name,
                d.department_name
             FROM complaint_assignments ca
             JOIN complaints c
                ON ca.complaint_id = c.complaint_id
             JOIN students s
                ON c.student_id = s.user_id
             JOIN users u
                ON s.user_id = u.user_id
             JOIN categories cat
                ON c.category_id = cat.category_id
             JOIN departments d
                ON c.department_id = d.department_id
             WHERE ca.staff_id = ?
               AND ca.unassigned_at IS NULL
             ORDER BY ca.assigned_at DESC`,
            [staffId]
        );

        return res.status(200).json({
            success: true,
            count: complaints.length,
            complaints
        });

    } catch (error) {
        console.error('Assigned complaints error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Unable to fetch assigned complaints'
        });
    }
};
// STAFF: UPDATE ASSIGNED COMPLAINT STATUS
const updateComplaintStatus = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const complaintId = Number(req.params.id);
        const staffId = req.user.user_id;
        const { status, remarks } = req.body;

        const allowedStatuses = [
            'UNDER_REVIEW',
            'IN_PROGRESS',
            'RESOLVED',
            'REJECTED'
        ];

        if (!Number.isSafeInteger(complaintId) || complaintId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid complaint ID'
            });
        }

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid complaint status'
            });
        }

        if (
            remarks !== undefined &&
            (typeof remarks !== 'string' || remarks.length > 1000)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Remarks must be a string of at most 1000 characters'
            });
        }

        await connection.beginTransaction();

        const [rows] = await connection.execute(
            `SELECT c.current_status
             FROM complaints c
             JOIN complaint_assignments ca
                ON c.complaint_id = ca.complaint_id
             WHERE c.complaint_id = ?
               AND ca.staff_id = ?
               AND ca.unassigned_at IS NULL
             FOR UPDATE`,
            [complaintId, staffId]
        );

        if (rows.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: 'Complaint not assigned to this staff member'
            });
        }

        const oldStatus = rows[0].current_status;

        if (oldStatus === status) {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: 'Complaint already has this status'
            });
        }

        const allowedTransitions = {
            SUBMITTED: ['UNDER_REVIEW'],
            UNDER_REVIEW: ['IN_PROGRESS', 'REJECTED'],
            ASSIGNED: ['UNDER_REVIEW', 'IN_PROGRESS', 'REJECTED'],
            IN_PROGRESS: ['RESOLVED', 'REJECTED'],
            REOPENED: ['UNDER_REVIEW', 'IN_PROGRESS']
        };

        if (!(allowedTransitions[oldStatus] || []).includes(status)) {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: `Cannot change status from ${oldStatus} to ${status}`
            });
        }

        await connection.execute(
            `UPDATE complaints
             SET current_status = ?
             WHERE complaint_id = ?`,
            [status, complaintId]
        );

        await connection.execute(
            `INSERT INTO complaint_history
             (complaint_id, changed_by, old_status, new_status, remarks)
             VALUES (?, ?, ?, ?, ?)`,
            [complaintId, staffId, oldStatus, status, remarks || null]
        );

        await connection.commit();

        return res.status(200).json({
            success: true,
            message: 'Complaint status updated successfully',
            complaint_id: complaintId,
            old_status: oldStatus,
            new_status: status
        });

    } catch (error) {
        await connection.rollback();

        console.error('Status update error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Unable to update complaint status'
        });

    } finally {
        connection.release();
    }
};

// GET COMPLAINT STATUS HISTORY
const getComplaintHistory = async (req, res) => {
    try {
        const complaintId = Number(req.params.id);

        if (!Number.isSafeInteger(complaintId) || complaintId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid complaint ID'
            });
        }

        // Check complaint access based on user role
        let accessQuery = '';
        let accessParams = [complaintId];

        if (req.user.role === 'STUDENT') {
            accessQuery = `
                SELECT complaint_id
                FROM complaints
                WHERE complaint_id = ?
                AND student_id = ?
            `;
            accessParams.push(req.user.user_id);

        } else if (req.user.role === 'STAFF') {
            accessQuery = `
                SELECT c.complaint_id
                FROM complaints c
                INNER JOIN complaint_assignments ca
                    ON c.complaint_id = ca.complaint_id
                WHERE c.complaint_id = ?
                AND ca.staff_id = ?
            `;
            accessParams.push(req.user.user_id);

        } else if (req.user.role === 'ADMIN') {
            accessQuery = `
                SELECT complaint_id
                FROM complaints
                WHERE complaint_id = ?
            `;
        } else {
            return res.status(403).json({
                success: false,
                message: 'Access forbidden'
            });
        }

        const [accessRows] = await pool.query(
            accessQuery,
            accessParams
        );

        if (accessRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found or access denied'
            });
        }

        // Fetch status history
        const [history] = await pool.query(
            `SELECT
                ch.history_id,
                ch.complaint_id,
                ch.old_status,
                ch.new_status,
                ch.remarks,
                ch.changed_at,
                u.name AS changed_by_name,
                u.role AS changed_by_role
             FROM complaint_history ch
             INNER JOIN users u
                ON ch.changed_by = u.user_id
             WHERE ch.complaint_id = ?
             ORDER BY ch.changed_at ASC, ch.history_id ASC`,
            [complaintId]
        );

        return res.status(200).json({
            success: true,
            complaint_id: complaintId,
            count: history.length,
            history
        });

    } catch (error) {
        console.error('Get complaint history error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve complaint history'
        });
    }
};

// Securely download a complaint attachment
const downloadAttachment = async (req, res) => {
    try {
        const attachmentId = Number(req.params.attachmentId);

        if (!Number.isSafeInteger(attachmentId) || attachmentId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid attachment ID'
            });
        }

        // Get attachment and complaint ownership details
        const [rows] = await pool.execute(
            `SELECT a.attachment_id, a.file_name, a.file_path,
                    c.complaint_id, c.student_id
             FROM attachments a
             JOIN complaints c ON a.complaint_id = c.complaint_id
             WHERE a.attachment_id = ?`,
            [attachmentId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Attachment not found'
            });
        }

        const attachment = rows[0];
        let hasAccess = false;

        if (req.user.role === 'STUDENT') {
            hasAccess = attachment.student_id === req.user.user_id;

        } else if (req.user.role === 'STAFF') {
            const [assignments] = await pool.execute(
                `SELECT assignment_id
                 FROM complaint_assignments
                 WHERE complaint_id = ?
                   AND staff_id = ?
                   AND unassigned_at IS NULL`,
                [attachment.complaint_id, req.user.user_id]
            );

            hasAccess = assignments.length > 0;

        } else if (req.user.role === 'ADMIN') {
            hasAccess = true;
        }

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to download this attachment'
            });
        }

        // Resolve the stored path safely inside the uploads directory
        const uploadDirectory = path.resolve(__dirname, '../uploads');
        const storedFileName = path.basename(attachment.file_path);
        const filePath = path.resolve(uploadDirectory, storedFileName);

        if (path.dirname(filePath) !== uploadDirectory) {
            return res.status(400).json({
                success: false,
                message: 'Invalid attachment path'
            });
        }

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'Attachment file not found on server'
            });
        }

        return res.download(filePath, attachment.file_name);

    } catch (error) {
        console.error('Download attachment error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Unable to download attachment'
        });
    }
};

module.exports = {
    submitComplaint,
    getMyComplaints,
    addComment,
    getComments,
    uploadAttachment,
    getAttachments,
    downloadAttachment,
    submitFeedback,
    getFeedback,
    getAssignedComplaints,
    updateComplaintStatus,
    getComplaintHistory
};
