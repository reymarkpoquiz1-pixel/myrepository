const database = require('../config/database');

const logActivity = async (userId, action, tableName, recordId, oldValues = null, newValues = null, req = null) => {
    try {
        const ipAddress = req ? (req.ip || req.connection.remoteAddress) : null;
        const userAgent = req ? req.get('User-Agent') : null;

        await database.run(`
            INSERT INTO activity_logs (user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            userId,
            action,
            tableName,
            recordId,
            oldValues ? JSON.stringify(oldValues) : null,
            newValues ? JSON.stringify(newValues) : null,
            ipAddress,
            userAgent
        ]);
    } catch (error) {
        console.error('Failed to log activity:', error);
        // Don't throw error to avoid breaking the main operation
    }
};

const logStockMovement = async (productId, movementType, quantity, previousStock, newStock, unitCost, totalCost, referenceNumber, notes, userId) => {
    try {
        const result = await database.run(`
            INSERT INTO stock_movements 
            (product_id, movement_type, quantity, previous_stock, new_stock, unit_cost, total_cost, reference_number, notes, user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            productId,
            movementType,
            quantity,
            previousStock,
            newStock,
            unitCost,
            totalCost,
            referenceNumber,
            notes,
            userId
        ]);

        return result.id;
    } catch (error) {
        console.error('Failed to log stock movement:', error);
        throw error;
    }
};

const createAuditMiddleware = (tableName) => {
    return async (req, res, next) => {
        const originalSend = res.send;
        
        res.send = function(data) {
            // Log successful operations
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const action = req.method;
                const userId = req.user ? req.user.id : null;
                const recordId = res.locals.recordId || null;
                const oldValues = res.locals.oldValues || null;
                const newValues = res.locals.newValues || null;

                logActivity(userId, action, tableName, recordId, oldValues, newValues, req);
            }
            
            originalSend.call(this, data);
        };

        next();
    };
};

module.exports = {
    logActivity,
    logStockMovement,
    createAuditMiddleware
};