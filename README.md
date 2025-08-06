# Council E-Sign SAAS

A comprehensive digital signature platform built for administrators and councilors, featuring secure document management, e-signature capabilities, and role-based access control.

## Features

### For Administrators
- **Dashboard**: Complete overview of system statistics and activity
- **Document Management**: Upload, manage, and track documents requiring signatures
- **User Management**: Create and manage councilor accounts
- **Document Tracking**: Monitor signature progress and completion status
- **Role-based Access Control**: Secure admin-only functionality

### For Councilors
- **Document Portal**: View and access documents requiring signatures
- **E-Signature**: Digital signature capability with audit trail
- **Personal Dashboard**: Track assigned documents and signing progress
- **Profile Management**: Update personal information and signature

### Technical Features
- **Secure Authentication**: JWT-based authentication with role management
- **File Upload**: Support for PDF, DOC, DOCX, XLS, XLSX, and image files
- **E-Signature**: Canvas-based signature capture with legal audit trail
- **Real-time Updates**: Live status updates and notifications
- **Responsive Design**: Mobile-friendly interface using Material-UI
- **API Security**: Rate limiting, CORS protection, and input validation

## Technology Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **Multer** for file uploads
- **bcryptjs** for password hashing
- **express-validator** for input validation

### Frontend
- **React** with TypeScript
- **Material-UI (MUI)** for UI components
- **React Router** for navigation
- **React Query** for state management
- **Axios** for API calls
- **react-signature-canvas** for e-signatures

## Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd council-esign-saas
   ```

2. **Install dependencies**
   ```bash
   npm run setup
   ```

3. **Configure environment variables**
   ```bash
   cp server/.env.example server/.env
   ```
   Update the `.env` file with your MongoDB connection string and JWT secret.

4. **Start the development servers**
   ```bash
   npm run dev
   ```

   This will start:
   - Backend server on `http://localhost:5000`
   - Frontend development server on `http://localhost:3000`

### Demo Credentials

**Administrator Account:**
- Email: `admin@council.gov`
- Password: `admin123`

**Councilor Account:**
- Email: `councilor@council.gov`
- Password: `councilor123`

## Project Structure

```
council-esign-saas/
├── server/                 # Backend Node.js application
│   ├── config/            # Database configuration
│   ├── controllers/       # Route controllers
│   ├── middleware/        # Custom middleware
│   ├── models/           # MongoDB models
│   ├── routes/           # API routes
│   ├── uploads/          # File upload directory
│   └── index.js          # Server entry point
├── client/               # Frontend React application
│   ├── public/          # Static assets
│   ├── src/             # Source code
│   │   ├── components/  # Reusable components
│   │   ├── contexts/    # React contexts
│   │   ├── hooks/       # Custom hooks
│   │   ├── pages/       # Page components
│   │   └── App.tsx      # Main app component
│   └── package.json     # Frontend dependencies
├── package.json         # Root package.json
└── README.md           # This file
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration (admin only)
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-password` - Change password

### Documents
- `GET /api/documents` - Get documents (filtered by role)
- `POST /api/documents/upload` - Upload document (admin only)
- `GET /api/documents/:id` - Get single document
- `POST /api/documents/:id/sign` - Sign document
- `GET /api/documents/:id/download` - Download document
- `PUT /api/documents/:id` - Update document (admin only)
- `DELETE /api/documents/:id` - Delete document (admin only)

### Users (Admin Only)
- `GET /api/users` - Get all users
- `POST /api/users` - Create new user
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `PUT /api/users/:id/toggle-status` - Toggle user active status

## Development

### Running Tests
```bash
# Backend tests
cd server && npm test

# Frontend tests
cd client && npm test
```

### Building for Production
```bash
# Build frontend
npm run build

# Start production server
npm start
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment | `development` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/council_esign` |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRE` | JWT expiration time | `7d` |
| `CLIENT_URL` | Frontend URL for CORS | `http://localhost:3000` |
| `UPLOAD_PATH` | File upload directory | `./uploads` |
| `MAX_FILE_SIZE` | Max file size in bytes | `10485760` (10MB) |

## Security Features

- **Authentication**: JWT-based with secure token storage
- **Authorization**: Role-based access control (admin/councilor)
- **Input Validation**: Server-side validation for all inputs
- **File Security**: File type and size restrictions
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS Protection**: Configured CORS for secure cross-origin requests
- **Password Security**: bcrypt hashing with salt rounds

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please contact the development team or create an issue in the repository.
