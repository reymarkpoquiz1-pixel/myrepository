# Inventory Management System

A comprehensive web-based inventory management system built with Node.js, React, and SQLite. This system provides complete stock tracking, transaction logging, dynamic reporting, and user management capabilities.

## Features

### 🏢 Core Functionality
- **Product Management**: Add, update, delete, and view inventory items
- **Stock Operations**: Add stock, release stock, manual adjustments
- **Transaction Logging**: Complete audit trail of all stock movements
- **User Management**: Authentication, authorization, and user profiles
- **Activity Monitoring**: Real-time tracking of all system activities

### 📊 Reporting & Analytics
- **Dashboard**: Real-time overview with key metrics and charts
- **Inventory Valuation**: Complete stock value analysis
- **Stock Movement Reports**: Detailed transaction history
- **ABC Analysis**: Pareto analysis for inventory optimization
- **Custom Reports**: Dynamic report builder with filters
- **Low Stock Alerts**: Automated monitoring of stock levels

### 🔧 Technical Features
- **RESTful API**: Complete backend API with proper validation
- **SQLite Database**: Lightweight, embedded database solution
- **Modern UI**: Material-UI React components with responsive design
- **Authentication**: JWT-based secure authentication
- **Transaction Safety**: Database transactions for data integrity
- **Activity Logging**: Complete system audit trail

## Technology Stack

### Backend
- **Node.js** with Express.js framework
- **SQLite3** database with proper relationships
- **JWT** for authentication
- **Express Validator** for input validation
- **bcryptjs** for password hashing
- **Morgan** for request logging

### Frontend
- **React 18** with TypeScript
- **Material-UI (MUI)** for modern UI components
- **React Router** for navigation
- **Axios** for API communication
- **React Hook Form** with Yup validation
- **Recharts** for data visualization

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Initialize the database:
```bash
npm run init-db
```

4. Start the backend server:
```bash
npm start
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

## Default Credentials

**Admin User:**
- Username: `admin`
- Password: `admin123`

⚠️ **Important**: Change these credentials immediately in production!

## API Documentation

The API provides comprehensive endpoints for all operations:

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Products
- `GET /api/products` - Get all products with filtering
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Stock Management
- `POST /api/stock/add` - Add stock to product
- `POST /api/stock/release` - Release stock from product
- `POST /api/stock/adjust` - Manual stock adjustment
- `GET /api/stock/movements` - Get stock movements

### Reports
- `GET /api/reports/dashboard` - Dashboard overview
- `GET /api/reports/valuation` - Inventory valuation
- `GET /api/reports/movements` - Stock movement reports
- `GET /api/reports/abc-analysis` - ABC analysis
- `POST /api/reports/custom` - Custom report builder

Visit `http://localhost:5000/api/docs` for complete API documentation.

## Database Schema

### Core Tables
- **users**: User accounts and authentication
- **products**: Inventory items with stock levels
- **stock_movements**: All stock transactions
- **activity_logs**: System audit trail
- **categories**: Product categories
- **suppliers**: Supplier information

### Key Relationships
- Products have stock movements (1:many)
- Users perform stock movements (1:many)
- All activities are logged with user attribution

## Features Overview

### Dashboard
- Real-time inventory metrics
- Stock movement trends
- Low stock alerts
- Recent activity feed
- Top products by activity

### Product Management
- Complete CRUD operations
- SKU management
- Category organization
- Stock level monitoring
- Supplier tracking

### Stock Operations
- **Add Stock**: Receive inventory with purchase details
- **Release Stock**: Issue inventory for sales/consumption
- **Adjust Stock**: Manual corrections with audit trail
- **Transaction History**: Complete movement tracking

### Reporting System
- **Valuation Reports**: Current stock values
- **Movement Analysis**: Transaction patterns
- **ABC Analysis**: Product classification
- **Activity Reports**: User and system activity
- **Custom Reports**: Flexible report builder

### Security Features
- JWT authentication
- Password hashing
- Input validation
- SQL injection protection
- Rate limiting
- Activity logging

## Development

### Backend Development
```bash
cd backend
npm run dev  # Uses nodemon for auto-restart
```

### Frontend Development
```bash
cd frontend
npm start  # Hot reload development server
```

### Database Management
```bash
# Reinitialize database
npm run init-db

# View database content (backend directory)
sqlite3 database/inventory.db
```

## Production Deployment

### Environment Variables
Create appropriate `.env` files:

**Backend (.env):**
```
NODE_ENV=production
PORT=5000
JWT_SECRET=your-super-secret-jwt-key
FRONTEND_URL=https://your-domain.com
```

**Frontend (.env.production):**
```
REACT_APP_API_URL=https://your-api-domain.com/api
```

### Build & Deploy
```bash
# Build frontend
cd frontend
npm run build

# Backend serves frontend in production
cd ../backend
NODE_ENV=production npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Check the API documentation at `/api/docs`
- Review the application logs
- Create an issue in the repository

---

**Inventory Management System v1.0** - Built with ❤️ using Node.js and React