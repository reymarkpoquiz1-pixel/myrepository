const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const stockRoutes = require('./routes/stock');
const reportRoutes = require('./routes/reports');

// Import database
const database = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined'));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/reports', reportRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
    res.json({
        title: 'Inventory Management System API',
        version: '1.0.0',
        description: 'RESTful API for inventory management with stock tracking and reporting',
        endpoints: {
            authentication: {
                'POST /api/auth/login': 'User login',
                'POST /api/auth/register': 'User registration',
                'GET /api/auth/profile': 'Get user profile',
                'PUT /api/auth/profile': 'Update user profile'
            },
            products: {
                'GET /api/products': 'Get all products with filtering',
                'GET /api/products/:id': 'Get single product',
                'POST /api/products': 'Create new product',
                'PUT /api/products/:id': 'Update product',
                'DELETE /api/products/:id': 'Delete product',
                'GET /api/products/meta/categories': 'Get product categories',
                'GET /api/products/reports/low-stock': 'Get low stock products'
            },
            stock_management: {
                'POST /api/stock/add': 'Add stock to product',
                'POST /api/stock/release': 'Release stock from product',
                'POST /api/stock/adjust': 'Manually adjust stock level',
                'GET /api/stock/movements': 'Get stock movements with filtering',
                'GET /api/stock/stats': 'Get stock movement statistics'
            },
            reports: {
                'GET /api/reports/dashboard': 'Dashboard overview report',
                'GET /api/reports/valuation': 'Inventory valuation report',
                'GET /api/reports/movements': 'Stock movement report',
                'GET /api/reports/abc-analysis': 'ABC analysis report',
                'GET /api/reports/activity-logs': 'Activity log report',
                'POST /api/reports/custom': 'Custom report builder'
            }
        },
        authentication: {
            type: 'Bearer Token',
            header: 'Authorization: Bearer <token>',
            note: 'All endpoints except /auth/login and /auth/register require authentication'
        }
    });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../frontend/build')));
    
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
    });
}

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    
    // Database errors
    if (err.code === 'SQLITE_CONSTRAINT') {
        return res.status(400).json({ 
            error: 'Database constraint violation',
            details: err.message 
        });
    }
    
    // Validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({ 
            error: 'Validation error',
            details: err.message 
        });
    }
    
    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
            error: 'Invalid token',
            details: err.message 
        });
    }
    
    // Default error
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : err.message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ 
        error: 'API endpoint not found',
        path: req.path,
        method: req.method
    });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    try {
        await database.close();
        console.log('Database connection closed');
        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    try {
        await database.close();
        console.log('Database connection closed');
        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Inventory Management Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
    console.log(`❤️  Health Check: http://localhost:${PORT}/api/health`);
    
    // Default admin credentials reminder
    if (process.env.NODE_ENV !== 'production') {
        console.log('\n🔑 Default Admin Credentials:');
        console.log('   Username: admin');
        console.log('   Password: admin123');
        console.log('   Please change these credentials in production!\n');
    }
});

module.exports = app;