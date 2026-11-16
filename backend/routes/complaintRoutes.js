const express = require('express');
const router = express.Router();

const {
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
} = require('../controllers/complaintController');
const {
    verifyToken,
    authorizeRoles
} = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

// Submit complaint
router.post('/', verifyToken, submitComplaint);

// Get my complaints
router.get('/my', verifyToken, getMyComplaints);
router.get('/:id/history', verifyToken, getComplaintHistory);
// Add comment
router.post('/:id/comments', verifyToken, addComment);

// View comments
router.get('/:id/comments', verifyToken, getComments);

// Upload attachment
router.post('/:id/attachments', verifyToken, upload.single('file'), uploadAttachment);
router.get('/:id/attachments/:attachmentId/download', verifyToken, downloadAttachment);
// View complaint attachments
router.get('/:id/attachments', verifyToken, getAttachments);

// Submit complaint feedback
router.post('/:id/feedback', verifyToken, submitFeedback);

// View submitted complaint feedback
router.get('/:id/feedback', verifyToken, getFeedback);

// Staff: View complaints assigned to logged-in staff
router.get(
    '/staff/assigned',
    verifyToken,
    authorizeRoles('STAFF'),
    getAssignedComplaints
);

// Staff: Update assigned complaint status
router.patch(
    '/:id/status',
    verifyToken,
    authorizeRoles('STAFF'),
    updateComplaintStatus
);
module.exports = router;
