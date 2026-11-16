
const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET ALL DEPARTMENTS
router.get('/departments', async (req, res) => {
    try {
        const [departments] = await pool.execute(
            `SELECT department_id, department_name
             FROM departments
             ORDER BY department_name`
        );

        return res.status(200).json({
            success: true,
            departments
        });
    } catch (error) {
        console.error('Fetch departments error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Unable to fetch departments'
        });
    }
});

// GET ALL COMPLAINT CATEGORIES
router.get('/categories', async (req, res) => {
    try {
        const [categories] = await pool.execute(
            `SELECT category_id, category_name
             FROM categories
             ORDER BY category_name`
        );

        return res.status(200).json({
            success: true,
            categories
        });
    } catch (error) {
        console.error('Fetch categories error:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Unable to fetch complaint categories'
        });
    }
});

module.exports = router;
