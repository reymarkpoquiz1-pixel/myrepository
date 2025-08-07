const express = require('express');
const database = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Dashboard overview report
router.get('/dashboard', authenticateToken, async (req, res) => {
    try {
        // Get total products
        const totalProducts = await database.get('SELECT COUNT(*) as count FROM products');
        
        // Get total stock value
        const stockValue = await database.get(
            'SELECT SUM(current_stock * unit_price) as total_value FROM products'
        );

        // Get low stock products count
        const lowStockCount = await database.get(
            'SELECT COUNT(*) as count FROM products WHERE current_stock <= min_stock_level'
        );

        // Get out of stock products count
        const outOfStockCount = await database.get(
            'SELECT COUNT(*) as count FROM products WHERE current_stock = 0'
        );

        // Get recent activities (last 10)
        const recentActivities = await database.all(`
            SELECT 
                al.action,
                al.table_name,
                al.created_at,
                u.username,
                p.name as product_name
            FROM activity_logs al
            LEFT JOIN users u ON al.user_id = u.id
            LEFT JOIN products p ON al.record_id = p.id AND al.table_name = 'products'
            WHERE al.table_name IN ('products', 'stock_movements')
            ORDER BY al.created_at DESC
            LIMIT 10
        `);

        // Get top 5 most active products (by movement count)
        const topProducts = await database.all(`
            SELECT 
                p.name,
                p.sku,
                p.current_stock,
                COUNT(sm.id) as movement_count
            FROM products p
            LEFT JOIN stock_movements sm ON p.id = sm.product_id
            GROUP BY p.id
            ORDER BY movement_count DESC
            LIMIT 5
        `);

        // Get monthly movement trends (last 6 months)
        const monthlyTrends = await database.all(`
            SELECT 
                strftime('%Y-%m', created_at) as month,
                movement_type,
                COUNT(*) as count,
                SUM(quantity) as total_quantity
            FROM stock_movements
            WHERE created_at >= date('now', '-6 months')
            GROUP BY month, movement_type
            ORDER BY month DESC
        `);

        res.json({
            summary: {
                total_products: totalProducts.count,
                total_stock_value: stockValue.total_value || 0,
                low_stock_products: lowStockCount.count,
                out_of_stock_products: outOfStockCount.count
            },
            recent_activities: recentActivities,
            top_products: topProducts,
            monthly_trends: monthlyTrends
        });

    } catch (error) {
        console.error('Dashboard report error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Inventory valuation report
router.get('/valuation', authenticateToken, async (req, res) => {
    try {
        const { category, low_stock_only = false } = req.query;

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (category) {
            whereClause += ' AND category = ?';
            params.push(category);
        }

        if (low_stock_only === 'true') {
            whereClause += ' AND current_stock <= min_stock_level';
        }

        const products = await database.all(`
            SELECT 
                id,
                name,
                sku,
                category,
                current_stock,
                unit_price,
                (current_stock * unit_price) as stock_value,
                min_stock_level,
                max_stock_level,
                CASE 
                    WHEN current_stock = 0 THEN 'Out of Stock'
                    WHEN current_stock <= min_stock_level THEN 'Low Stock'
                    WHEN current_stock >= max_stock_level THEN 'Overstock'
                    ELSE 'Normal'
                END as stock_status
            FROM products
            ${whereClause}
            ORDER BY stock_value DESC
        `, params);

        // Calculate totals
        const totals = products.reduce((acc, product) => {
            acc.total_items += product.current_stock;
            acc.total_value += product.stock_value;
            acc.total_products += 1;
            
            switch (product.stock_status) {
                case 'Out of Stock':
                    acc.out_of_stock += 1;
                    break;
                case 'Low Stock':
                    acc.low_stock += 1;
                    break;
                case 'Overstock':
                    acc.overstock += 1;
                    break;
                default:
                    acc.normal_stock += 1;
            }
            
            return acc;
        }, {
            total_products: 0,
            total_items: 0,
            total_value: 0,
            out_of_stock: 0,
            low_stock: 0,
            normal_stock: 0,
            overstock: 0
        });

        // Category breakdown
        const categoryBreakdown = await database.all(`
            SELECT 
                category,
                COUNT(*) as product_count,
                SUM(current_stock) as total_stock,
                SUM(current_stock * unit_price) as total_value
            FROM products
            ${category ? 'WHERE category = ?' : ''}
            GROUP BY category
            ORDER BY total_value DESC
        `, category ? [category] : []);

        res.json({
            products,
            summary: totals,
            category_breakdown: categoryBreakdown,
            generated_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Valuation report error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Stock movement report
router.get('/movements', authenticateToken, async (req, res) => {
    try {
        const { 
            start_date, 
            end_date, 
            product_id, 
            movement_type, 
            user_id,
            group_by = 'day' // day, week, month
        } = req.query;

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (start_date) {
            whereClause += ' AND DATE(sm.created_at) >= ?';
            params.push(start_date);
        }

        if (end_date) {
            whereClause += ' AND DATE(sm.created_at) <= ?';
            params.push(end_date);
        }

        if (product_id) {
            whereClause += ' AND sm.product_id = ?';
            params.push(product_id);
        }

        if (movement_type) {
            whereClause += ' AND sm.movement_type = ?';
            params.push(movement_type);
        }

        if (user_id) {
            whereClause += ' AND sm.user_id = ?';
            params.push(user_id);
        }

        // Get detailed movements
        const movements = await database.all(`
            SELECT 
                sm.*,
                p.name as product_name,
                p.sku as product_sku,
                p.category,
                u.username
            FROM stock_movements sm
            LEFT JOIN products p ON sm.product_id = p.id
            LEFT JOIN users u ON sm.user_id = u.id
            ${whereClause}
            ORDER BY sm.created_at DESC
        `, params);

        // Get summary by movement type
        const summary = await database.all(`
            SELECT 
                movement_type,
                COUNT(*) as transaction_count,
                SUM(quantity) as total_quantity,
                SUM(total_cost) as total_value,
                AVG(quantity) as avg_quantity
            FROM stock_movements sm
            ${whereClause}
            GROUP BY movement_type
        `, params);

        // Get trends based on group_by parameter
        let dateFormat;
        switch (group_by) {
            case 'week':
                dateFormat = '%Y-W%W';
                break;
            case 'month':
                dateFormat = '%Y-%m';
                break;
            default:
                dateFormat = '%Y-%m-%d';
        }

        const trends = await database.all(`
            SELECT 
                strftime('${dateFormat}', sm.created_at) as period,
                movement_type,
                COUNT(*) as transaction_count,
                SUM(quantity) as total_quantity,
                SUM(total_cost) as total_value
            FROM stock_movements sm
            ${whereClause}
            GROUP BY period, movement_type
            ORDER BY period DESC
        `, params);

        // Top products by movement volume
        const topProducts = await database.all(`
            SELECT 
                p.name,
                p.sku,
                sm.movement_type,
                COUNT(*) as movement_count,
                SUM(sm.quantity) as total_quantity,
                SUM(sm.total_cost) as total_value
            FROM stock_movements sm
            LEFT JOIN products p ON sm.product_id = p.id
            ${whereClause}
            GROUP BY sm.product_id, sm.movement_type
            ORDER BY total_quantity DESC
            LIMIT 10
        `, params);

        res.json({
            movements,
            summary,
            trends,
            top_products: topProducts,
            filters: {
                start_date,
                end_date,
                product_id,
                movement_type,
                user_id,
                group_by
            },
            generated_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Movement report error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ABC Analysis Report (Pareto analysis)
router.get('/abc-analysis', authenticateToken, async (req, res) => {
    try {
        // Get products with their movement value (last 12 months)
        const products = await database.all(`
            SELECT 
                p.id,
                p.name,
                p.sku,
                p.category,
                p.current_stock,
                p.unit_price,
                COALESCE(SUM(CASE WHEN sm.movement_type = 'OUT' THEN sm.total_cost ELSE 0 END), 0) as consumption_value,
                COALESCE(SUM(CASE WHEN sm.movement_type = 'OUT' THEN sm.quantity ELSE 0 END), 0) as consumption_quantity
            FROM products p
            LEFT JOIN stock_movements sm ON p.id = sm.product_id 
                AND sm.created_at >= date('now', '-12 months')
            GROUP BY p.id
            ORDER BY consumption_value DESC
        `);

        // Calculate total consumption value
        const totalValue = products.reduce((sum, product) => sum + product.consumption_value, 0);

        // Assign ABC categories
        let cumulativeValue = 0;
        const analysisResults = products.map((product, index) => {
            cumulativeValue += product.consumption_value;
            const cumulativePercentage = (cumulativeValue / totalValue) * 100;
            
            let category;
            if (cumulativePercentage <= 80) {
                category = 'A';
            } else if (cumulativePercentage <= 95) {
                category = 'B';
            } else {
                category = 'C';
            }

            return {
                ...product,
                rank: index + 1,
                consumption_percentage: totalValue > 0 ? (product.consumption_value / totalValue) * 100 : 0,
                cumulative_percentage: cumulativePercentage,
                abc_category: category
            };
        });

        // Summary by category
        const categorySummary = analysisResults.reduce((acc, product) => {
            const cat = product.abc_category;
            if (!acc[cat]) {
                acc[cat] = {
                    product_count: 0,
                    total_value: 0,
                    percentage_of_total: 0
                };
            }
            acc[cat].product_count += 1;
            acc[cat].total_value += product.consumption_value;
            return acc;
        }, {});

        // Calculate percentages for summary
        Object.keys(categorySummary).forEach(cat => {
            categorySummary[cat].percentage_of_total = totalValue > 0 
                ? (categorySummary[cat].total_value / totalValue) * 100 
                : 0;
        });

        res.json({
            analysis_results: analysisResults,
            category_summary: categorySummary,
            total_consumption_value: totalValue,
            analysis_period: '12 months',
            generated_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('ABC analysis error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Activity log report
router.get('/activity-logs', authenticateToken, async (req, res) => {
    try {
        const { 
            start_date, 
            end_date, 
            user_id, 
            action, 
            table_name,
            page = 1,
            limit = 100
        } = req.query;

        const offset = (page - 1) * limit;
        let whereClause = 'WHERE 1=1';
        const params = [];

        if (start_date) {
            whereClause += ' AND DATE(al.created_at) >= ?';
            params.push(start_date);
        }

        if (end_date) {
            whereClause += ' AND DATE(al.created_at) <= ?';
            params.push(end_date);
        }

        if (user_id) {
            whereClause += ' AND al.user_id = ?';
            params.push(user_id);
        }

        if (action) {
            whereClause += ' AND al.action = ?';
            params.push(action);
        }

        if (table_name) {
            whereClause += ' AND al.table_name = ?';
            params.push(table_name);
        }

        // Get total count
        const countResult = await database.get(
            `SELECT COUNT(*) as total FROM activity_logs al ${whereClause}`,
            params
        );

        // Get activity logs
        const activities = await database.all(`
            SELECT 
                al.*,
                u.username,
                u.email
            FROM activity_logs al
            LEFT JOIN users u ON al.user_id = u.id
            ${whereClause}
            ORDER BY al.created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), offset]);

        // Get activity summary
        const activitySummary = await database.all(`
            SELECT 
                action,
                table_name,
                COUNT(*) as count
            FROM activity_logs al
            ${whereClause}
            GROUP BY action, table_name
            ORDER BY count DESC
        `, params);

        // Get user activity summary
        const userSummary = await database.all(`
            SELECT 
                u.username,
                COUNT(al.id) as activity_count,
                COUNT(DISTINCT al.action) as unique_actions
            FROM activity_logs al
            LEFT JOIN users u ON al.user_id = u.id
            ${whereClause}
            GROUP BY al.user_id
            ORDER BY activity_count DESC
        `, params);

        res.json({
            activities,
            summary: {
                total_activities: countResult.total,
                activity_breakdown: activitySummary,
                user_summary: userSummary
            },
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult.total,
                pages: Math.ceil(countResult.total / limit)
            },
            filters: {
                start_date,
                end_date,
                user_id,
                action,
                table_name
            },
            generated_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Activity log report error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Custom report builder
router.post('/custom', authenticateToken, async (req, res) => {
    try {
        const { 
            report_type, 
            filters = {}, 
            group_by = [], 
            metrics = [],
            date_range = {}
        } = req.body;

        let baseQuery = '';
        let whereClause = 'WHERE 1=1';
        const params = [];

        // Build base query based on report type
        switch (report_type) {
            case 'products':
                baseQuery = `
                    SELECT 
                        p.*,
                        (p.current_stock * p.unit_price) as stock_value,
                        CASE 
                            WHEN p.current_stock = 0 THEN 'Out of Stock'
                            WHEN p.current_stock <= p.min_stock_level THEN 'Low Stock'
                            WHEN p.current_stock >= p.max_stock_level THEN 'Overstock'
                            ELSE 'Normal'
                        END as stock_status
                    FROM products p
                `;
                break;

            case 'stock_movements':
                baseQuery = `
                    SELECT 
                        sm.*,
                        p.name as product_name,
                        p.sku as product_sku,
                        p.category,
                        u.username
                    FROM stock_movements sm
                    LEFT JOIN products p ON sm.product_id = p.id
                    LEFT JOIN users u ON sm.user_id = u.id
                `;
                break;

            default:
                return res.status(400).json({ error: 'Invalid report type' });
        }

        // Apply filters
        if (filters.category) {
            whereClause += ' AND p.category = ?';
            params.push(filters.category);
        }

        if (filters.movement_type && report_type === 'stock_movements') {
            whereClause += ' AND sm.movement_type = ?';
            params.push(filters.movement_type);
        }

        if (date_range.start_date) {
            const dateField = report_type === 'stock_movements' ? 'sm.created_at' : 'p.created_at';
            whereClause += ` AND DATE(${dateField}) >= ?`;
            params.push(date_range.start_date);
        }

        if (date_range.end_date) {
            const dateField = report_type === 'stock_movements' ? 'sm.created_at' : 'p.created_at';
            whereClause += ` AND DATE(${dateField}) <= ?`;
            params.push(date_range.end_date);
        }

        // Execute query
        const results = await database.all(`${baseQuery} ${whereClause}`, params);

        // Apply grouping if specified
        let groupedResults = results;
        if (group_by.length > 0) {
            groupedResults = results.reduce((acc, row) => {
                const key = group_by.map(field => row[field]).join('|');
                if (!acc[key]) {
                    acc[key] = [];
                }
                acc[key].push(row);
                return acc;
            }, {});
        }

        res.json({
            report_type,
            data: groupedResults,
            filters,
            group_by,
            metrics,
            date_range,
            record_count: results.length,
            generated_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Custom report error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;