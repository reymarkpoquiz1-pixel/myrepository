const express = require('express');
const { body, validationResult } = require('express-validator');
const database = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { logActivity, logStockMovement } = require('../middleware/logger');

const router = express.Router();

// Get all products with filtering and pagination
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 50, 
            search = '', 
            category = '', 
            lowStock = false,
            sortBy = 'name',
            sortOrder = 'ASC'
        } = req.query;

        const offset = (page - 1) * limit;
        
        let whereClause = 'WHERE 1=1';
        const params = [];

        if (search) {
            whereClause += ' AND (name LIKE ? OR sku LIKE ? OR description LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        if (category) {
            whereClause += ' AND category = ?';
            params.push(category);
        }

        if (lowStock === 'true') {
            whereClause += ' AND current_stock <= min_stock_level';
        }

        const validSortColumns = ['name', 'sku', 'category', 'current_stock', 'unit_price', 'created_at'];
        const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'name';
        const order = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

        // Get total count
        const countResult = await database.get(
            `SELECT COUNT(*) as total FROM products ${whereClause}`,
            params
        );

        // Get products
        const products = await database.all(
            `SELECT * FROM products ${whereClause} 
             ORDER BY ${sortColumn} ${order} 
             LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), offset]
        );

        res.json({
            products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult.total,
                pages: Math.ceil(countResult.total / limit)
            }
        });
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get single product by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const product = await database.get('SELECT * FROM products WHERE id = ?', [id]);
        
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Get recent stock movements
        const movements = await database.all(
            `SELECT sm.*, u.username 
             FROM stock_movements sm 
             LEFT JOIN users u ON sm.user_id = u.id 
             WHERE sm.product_id = ? 
             ORDER BY sm.created_at DESC 
             LIMIT 10`,
            [id]
        );

        res.json({ ...product, recentMovements: movements });
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create new product
router.post('/', authenticateToken, [
    body('name').trim().notEmpty().withMessage('Product name is required'),
    body('sku').trim().notEmpty().withMessage('SKU is required'),
    body('unit_price').isFloat({ min: 0 }).withMessage('Unit price must be a positive number'),
    body('min_stock_level').isInt({ min: 0 }).withMessage('Minimum stock level must be a non-negative integer'),
    body('max_stock_level').isInt({ min: 1 }).withMessage('Maximum stock level must be a positive integer')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            name,
            description,
            sku,
            category,
            unit_price,
            min_stock_level,
            max_stock_level,
            current_stock = 0,
            location,
            supplier
        } = req.body;

        // Check if SKU already exists
        const existingProduct = await database.get('SELECT id FROM products WHERE sku = ?', [sku]);
        if (existingProduct) {
            return res.status(409).json({ error: 'SKU already exists' });
        }

        // Validate stock levels
        if (min_stock_level >= max_stock_level) {
            return res.status(400).json({ error: 'Minimum stock level must be less than maximum stock level' });
        }

        const result = await database.run(
            `INSERT INTO products 
             (name, description, sku, category, unit_price, min_stock_level, max_stock_level, current_stock, location, supplier)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, description, sku, category, unit_price, min_stock_level, max_stock_level, current_stock, location, supplier]
        );

        const newProduct = await database.get('SELECT * FROM products WHERE id = ?', [result.id]);

        // Log initial stock if any
        if (current_stock > 0) {
            await logStockMovement(
                result.id,
                'IN',
                current_stock,
                0,
                current_stock,
                unit_price,
                unit_price * current_stock,
                'INITIAL_STOCK',
                'Initial stock entry',
                req.user.id
            );
        }

        // Log product creation
        await logActivity(req.user.id, 'CREATE', 'products', result.id, null, newProduct, req);

        res.status(201).json(newProduct);
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update product
router.put('/:id', authenticateToken, [
    body('name').optional().trim().notEmpty().withMessage('Product name cannot be empty'),
    body('sku').optional().trim().notEmpty().withMessage('SKU cannot be empty'),
    body('unit_price').optional().isFloat({ min: 0 }).withMessage('Unit price must be a positive number'),
    body('min_stock_level').optional().isInt({ min: 0 }).withMessage('Minimum stock level must be a non-negative integer'),
    body('max_stock_level').optional().isInt({ min: 1 }).withMessage('Maximum stock level must be a positive integer')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        
        // Get existing product
        const existingProduct = await database.get('SELECT * FROM products WHERE id = ?', [id]);
        if (!existingProduct) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const {
            name,
            description,
            sku,
            category,
            unit_price,
            min_stock_level,
            max_stock_level,
            location,
            supplier
        } = req.body;

        // Check if SKU already exists for another product
        if (sku && sku !== existingProduct.sku) {
            const skuExists = await database.get('SELECT id FROM products WHERE sku = ? AND id != ?', [sku, id]);
            if (skuExists) {
                return res.status(409).json({ error: 'SKU already exists' });
            }
        }

        // Validate stock levels
        const newMinStock = min_stock_level !== undefined ? min_stock_level : existingProduct.min_stock_level;
        const newMaxStock = max_stock_level !== undefined ? max_stock_level : existingProduct.max_stock_level;
        
        if (newMinStock >= newMaxStock) {
            return res.status(400).json({ error: 'Minimum stock level must be less than maximum stock level' });
        }

        // Build update query
        const updateFields = [];
        const updateValues = [];

        const fieldsToUpdate = {
            name,
            description,
            sku,
            category,
            unit_price,
            min_stock_level,
            max_stock_level,
            location,
            supplier
        };

        Object.entries(fieldsToUpdate).forEach(([key, value]) => {
            if (value !== undefined) {
                updateFields.push(`${key} = ?`);
                updateValues.push(value);
            }
        });

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateValues.push(id);

        await database.run(
            `UPDATE products SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );

        const updatedProduct = await database.get('SELECT * FROM products WHERE id = ?', [id]);

        // Log activity
        await logActivity(req.user.id, 'UPDATE', 'products', id, existingProduct, updatedProduct, req);

        res.json(updatedProduct);
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete product
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const existingProduct = await database.get('SELECT * FROM products WHERE id = ?', [id]);
        if (!existingProduct) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Check if product has stock movements
        const hasMovements = await database.get('SELECT COUNT(*) as count FROM stock_movements WHERE product_id = ?', [id]);
        
        if (hasMovements.count > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete product with existing stock movements. Consider marking it as inactive instead.' 
            });
        }

        await database.run('DELETE FROM products WHERE id = ?', [id]);

        // Log activity
        await logActivity(req.user.id, 'DELETE', 'products', id, existingProduct, null, req);

        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get product categories
router.get('/meta/categories', authenticateToken, async (req, res) => {
    try {
        const categories = await database.all('SELECT * FROM categories ORDER BY name');
        res.json(categories);
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get low stock products
router.get('/reports/low-stock', authenticateToken, async (req, res) => {
    try {
        const products = await database.all(
            'SELECT * FROM products WHERE current_stock <= min_stock_level ORDER BY current_stock ASC'
        );
        res.json(products);
    } catch (error) {
        console.error('Get low stock error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;