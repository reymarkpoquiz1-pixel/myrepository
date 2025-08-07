const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const database = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { logActivity, logStockMovement } = require('../middleware/logger');

const router = express.Router();

// Add stock (Receive inventory)
router.post('/add', authenticateToken, [
    body('product_id').isInt({ min: 1 }).withMessage('Valid product ID is required'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
    body('unit_cost').isFloat({ min: 0 }).withMessage('Unit cost must be a positive number'),
    body('reference_number').optional().trim(),
    body('notes').optional().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { product_id, quantity, unit_cost, reference_number, notes } = req.body;

        // Start transaction
        await database.beginTransaction();

        try {
            // Get current product details
            const product = await database.get('SELECT * FROM products WHERE id = ?', [product_id]);
            if (!product) {
                await database.rollback();
                return res.status(404).json({ error: 'Product not found' });
            }

            const previousStock = product.current_stock;
            const newStock = previousStock + quantity;
            const totalCost = unit_cost * quantity;

            // Check if new stock exceeds maximum
            if (newStock > product.max_stock_level) {
                await database.rollback();
                return res.status(400).json({ 
                    error: `Adding ${quantity} units would exceed maximum stock level of ${product.max_stock_level}. Current stock: ${previousStock}` 
                });
            }

            // Update product stock
            await database.run(
                'UPDATE products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [newStock, product_id]
            );

            // Generate reference number if not provided
            const refNumber = reference_number || `ADD-${Date.now()}-${uuidv4().slice(0, 8)}`;

            // Log stock movement
            const movementId = await logStockMovement(
                product_id,
                'IN',
                quantity,
                previousStock,
                newStock,
                unit_cost,
                totalCost,
                refNumber,
                notes || 'Stock added',
                req.user.id
            );

            await database.commit();

            // Get updated product details
            const updatedProduct = await database.get('SELECT * FROM products WHERE id = ?', [product_id]);

            // Log activity
            await logActivity(
                req.user.id, 
                'STOCK_ADD', 
                'products', 
                product_id, 
                { current_stock: previousStock }, 
                { current_stock: newStock, quantity_added: quantity },
                req
            );

            res.json({
                message: 'Stock added successfully',
                movement_id: movementId,
                product: updatedProduct,
                movement: {
                    type: 'IN',
                    quantity,
                    previous_stock: previousStock,
                    new_stock: newStock,
                    unit_cost,
                    total_cost: totalCost,
                    reference_number: refNumber
                }
            });

        } catch (error) {
            await database.rollback();
            throw error;
        }

    } catch (error) {
        console.error('Add stock error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Release stock (Issue/Sell inventory)
router.post('/release', authenticateToken, [
    body('product_id').isInt({ min: 1 }).withMessage('Valid product ID is required'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
    body('unit_cost').optional().isFloat({ min: 0 }).withMessage('Unit cost must be a positive number'),
    body('reference_number').optional().trim(),
    body('notes').optional().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { product_id, quantity, unit_cost, reference_number, notes } = req.body;

        // Start transaction
        await database.beginTransaction();

        try {
            // Get current product details
            const product = await database.get('SELECT * FROM products WHERE id = ?', [product_id]);
            if (!product) {
                await database.rollback();
                return res.status(404).json({ error: 'Product not found' });
            }

            const previousStock = product.current_stock;

            // Check if sufficient stock available
            if (previousStock < quantity) {
                await database.rollback();
                return res.status(400).json({ 
                    error: `Insufficient stock. Available: ${previousStock}, Requested: ${quantity}` 
                });
            }

            const newStock = previousStock - quantity;
            const costPerUnit = unit_cost || product.unit_price;
            const totalCost = costPerUnit * quantity;

            // Update product stock
            await database.run(
                'UPDATE products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [newStock, product_id]
            );

            // Generate reference number if not provided
            const refNumber = reference_number || `REL-${Date.now()}-${uuidv4().slice(0, 8)}`;

            // Log stock movement
            const movementId = await logStockMovement(
                product_id,
                'OUT',
                quantity,
                previousStock,
                newStock,
                costPerUnit,
                totalCost,
                refNumber,
                notes || 'Stock released',
                req.user.id
            );

            await database.commit();

            // Get updated product details
            const updatedProduct = await database.get('SELECT * FROM products WHERE id = ?', [product_id]);

            // Log activity
            await logActivity(
                req.user.id, 
                'STOCK_RELEASE', 
                'products', 
                product_id, 
                { current_stock: previousStock }, 
                { current_stock: newStock, quantity_released: quantity },
                req
            );

            // Check if stock is now below minimum level
            const stockAlert = newStock <= product.min_stock_level ? {
                warning: 'Stock level is now below minimum threshold',
                current_stock: newStock,
                min_stock_level: product.min_stock_level
            } : null;

            res.json({
                message: 'Stock released successfully',
                movement_id: movementId,
                product: updatedProduct,
                movement: {
                    type: 'OUT',
                    quantity,
                    previous_stock: previousStock,
                    new_stock: newStock,
                    unit_cost: costPerUnit,
                    total_cost: totalCost,
                    reference_number: refNumber
                },
                stock_alert: stockAlert
            });

        } catch (error) {
            await database.rollback();
            throw error;
        }

    } catch (error) {
        console.error('Release stock error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Adjust stock (Manual adjustment)
router.post('/adjust', authenticateToken, [
    body('product_id').isInt({ min: 1 }).withMessage('Valid product ID is required'),
    body('new_quantity').isInt({ min: 0 }).withMessage('New quantity must be a non-negative integer'),
    body('reason').trim().notEmpty().withMessage('Reason for adjustment is required'),
    body('reference_number').optional().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { product_id, new_quantity, reason, reference_number } = req.body;

        // Start transaction
        await database.beginTransaction();

        try {
            // Get current product details
            const product = await database.get('SELECT * FROM products WHERE id = ?', [product_id]);
            if (!product) {
                await database.rollback();
                return res.status(404).json({ error: 'Product not found' });
            }

            const previousStock = product.current_stock;

            // Check if new quantity exceeds maximum
            if (new_quantity > product.max_stock_level) {
                await database.rollback();
                return res.status(400).json({ 
                    error: `Adjustment would exceed maximum stock level of ${product.max_stock_level}` 
                });
            }

            const adjustment = new_quantity - previousStock;

            // No change needed
            if (adjustment === 0) {
                await database.rollback();
                return res.status(400).json({ error: 'No adjustment needed - quantities are the same' });
            }

            // Update product stock
            await database.run(
                'UPDATE products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [new_quantity, product_id]
            );

            // Generate reference number if not provided
            const refNumber = reference_number || `ADJ-${Date.now()}-${uuidv4().slice(0, 8)}`;

            // Log stock movement
            const movementId = await logStockMovement(
                product_id,
                'ADJUSTMENT',
                Math.abs(adjustment),
                previousStock,
                new_quantity,
                product.unit_price,
                Math.abs(adjustment) * product.unit_price,
                refNumber,
                `Stock adjustment: ${reason}`,
                req.user.id
            );

            await database.commit();

            // Get updated product details
            const updatedProduct = await database.get('SELECT * FROM products WHERE id = ?', [product_id]);

            // Log activity
            await logActivity(
                req.user.id, 
                'STOCK_ADJUSTMENT', 
                'products', 
                product_id, 
                { current_stock: previousStock }, 
                { current_stock: new_quantity, adjustment, reason },
                req
            );

            res.json({
                message: 'Stock adjusted successfully',
                movement_id: movementId,
                product: updatedProduct,
                movement: {
                    type: 'ADJUSTMENT',
                    adjustment,
                    previous_stock: previousStock,
                    new_stock: new_quantity,
                    reason,
                    reference_number: refNumber
                }
            });

        } catch (error) {
            await database.rollback();
            throw error;
        }

    } catch (error) {
        console.error('Adjust stock error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get stock movements with filtering
router.get('/movements', authenticateToken, async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 50, 
            product_id, 
            movement_type, 
            start_date, 
            end_date,
            user_id 
        } = req.query;

        const offset = (page - 1) * limit;
        
        let whereClause = 'WHERE 1=1';
        const params = [];

        if (product_id) {
            whereClause += ' AND sm.product_id = ?';
            params.push(product_id);
        }

        if (movement_type) {
            whereClause += ' AND sm.movement_type = ?';
            params.push(movement_type);
        }

        if (start_date) {
            whereClause += ' AND DATE(sm.created_at) >= ?';
            params.push(start_date);
        }

        if (end_date) {
            whereClause += ' AND DATE(sm.created_at) <= ?';
            params.push(end_date);
        }

        if (user_id) {
            whereClause += ' AND sm.user_id = ?';
            params.push(user_id);
        }

        // Get total count
        const countResult = await database.get(
            `SELECT COUNT(*) as total FROM stock_movements sm ${whereClause}`,
            params
        );

        // Get movements with product and user details
        const movements = await database.all(`
            SELECT 
                sm.*,
                p.name as product_name,
                p.sku as product_sku,
                u.username
            FROM stock_movements sm
            LEFT JOIN products p ON sm.product_id = p.id
            LEFT JOIN users u ON sm.user_id = u.id
            ${whereClause}
            ORDER BY sm.created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), offset]);

        res.json({
            movements,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult.total,
                pages: Math.ceil(countResult.total / limit)
            }
        });

    } catch (error) {
        console.error('Get stock movements error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get stock movement statistics
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        
        let dateFilter = '';
        const params = [];

        if (start_date && end_date) {
            dateFilter = 'WHERE DATE(created_at) BETWEEN ? AND ?';
            params.push(start_date, end_date);
        } else if (start_date) {
            dateFilter = 'WHERE DATE(created_at) >= ?';
            params.push(start_date);
        } else if (end_date) {
            dateFilter = 'WHERE DATE(created_at) <= ?';
            params.push(end_date);
        }

        // Get movement statistics
        const stats = await database.all(`
            SELECT 
                movement_type,
                COUNT(*) as count,
                SUM(quantity) as total_quantity,
                SUM(total_cost) as total_value
            FROM stock_movements 
            ${dateFilter}
            GROUP BY movement_type
        `, params);

        // Get daily movement trends (last 30 days)
        const trends = await database.all(`
            SELECT 
                DATE(created_at) as date,
                movement_type,
                COUNT(*) as count,
                SUM(quantity) as quantity
            FROM stock_movements 
            WHERE DATE(created_at) >= DATE('now', '-30 days')
            GROUP BY DATE(created_at), movement_type
            ORDER BY date DESC
        `);

        res.json({
            statistics: stats,
            trends: trends
        });

    } catch (error) {
        console.error('Get stock stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;