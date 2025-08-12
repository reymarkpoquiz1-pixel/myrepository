# 📁 Archive Management System

A comprehensive, web-based archiving system built with PHP, MySQL, HTML, CSS, and JavaScript. This system provides complete record management with file attachments, user authentication, role-based access control, and comprehensive reporting capabilities.

## ✨ Features

### Core Functionality
- **Complete Record Management**: Add, update, delete, and view records with extensive personal data fields
- **Unlimited File Attachments**: Support for PDF, documents, images, and other file types with no limit on attachments per record
- **Advanced Search & Filtering**: Powerful search capabilities with multiple filter criteria and pagination
- **Secure User Authentication**: Session-based authentication with role-based access control (Admin/User)
- **Activity Logging**: Comprehensive audit trail of all user actions and system activities
- **Data Encryption**: Sensitive data fields are encrypted for security

### User Interface
- **Responsive Design**: Modern, mobile-friendly interface that works on all devices
- **Intuitive Navigation**: Clean sidebar navigation with easy-to-use forms and tables
- **Real-time Notifications**: User-friendly notification system for actions and errors
- **Dashboard Analytics**: Overview of system statistics and recent activities

### Reporting & Analytics
- **PDF/HTML Reports**: Generate comprehensive system reports with statistics and data
- **CSV Export**: Export records and system data in CSV format
- **Daily Summaries**: Automated daily activity summaries
- **Analytics Dashboard**: Visual representation of system usage and trends

### Security Features
- **Data Encryption**: Sensitive fields encrypted using AES-256-CBC
- **Role-Based Access**: Different permissions for Admin and User roles
- **Session Management**: Secure session handling with timeout
- **Activity Auditing**: All actions logged with user details and timestamps
- **File Upload Security**: File type validation and secure storage

## 🚀 Installation

### System Requirements
- **PHP**: Version 7.4 or higher
- **MySQL**: Version 5.7 or higher
- **Web Server**: Apache or Nginx
- **PHP Extensions**: PDO, OpenSSL, FileInfo, JSON

### Quick Installation

1. **Clone or Download** the archive system files to your web server directory.

2. **Run the Installation Script**:
   ```
   http://yourdomain.com/install.php
   ```

3. **Follow the Installation Wizard**:
   - Check system requirements
   - Configure database settings
   - Set up admin user account
   - Complete installation

4. **Access Your System**:
   ```
   http://yourdomain.com/public/index.html
   ```

### Manual Installation

If you prefer manual installation:

1. **Configure Database**:
   - Edit `config/database.php` with your database credentials
   - Import `database/schema.sql` into your MySQL database

2. **Set Permissions**:
   ```bash
   chmod 755 uploads/
   chmod 644 config/database.php
   ```

3. **Create Admin User** (optional):
   ```sql
   INSERT INTO users (username, email, password_hash, role, first_name, last_name) 
   VALUES ('admin', 'admin@example.com', '$2y$10$...', 'admin', 'Admin', 'User');
   ```

## 📖 User Guide

### Getting Started

1. **Login**: Access the system at `/public/index.html` and log in with your credentials.

2. **Dashboard**: View system overview, statistics, and recent activities.

3. **Add Records**: Navigate to "Add Record" to create new records with personal information.

4. **Manage Files**: Upload unlimited attachments to any record (PDFs, documents, images).

5. **Search Records**: Use the powerful search and filter system to find specific records.

### Record Management

#### Adding a New Record
1. Click "Add Record" in the sidebar or dashboard
2. Fill in the required fields (First Name, Last Name)
3. Add optional information (contact details, address, emergency contacts)
4. Save the record
5. Upload attachments if needed

#### Searching Records
- **Quick Search**: Use the search bar to find records by name or ID
- **Advanced Filters**: Filter by status, civil status, gender, date ranges
- **Sorting**: Click column headers to sort results
- **Pagination**: Navigate through large datasets easily

#### File Attachments
- **Upload**: Drag and drop or click to select files
- **Supported Types**: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, GIF, TXT
- **File Size**: Up to 100MB per file (configurable)
- **Management**: View, download, or delete attachments
- **Descriptions**: Add descriptions to organize attachments

### User Roles

#### Admin Users Can:
- Access all system features
- Create, edit, and delete any records
- Manage user accounts
- View activity logs and system reports
- Access system administration features
- Delete records and attachments

#### Regular Users Can:
- Create and edit records
- Upload and manage attachments
- Search and view records
- Generate basic reports
- View their own activity

### Reporting

#### System Reports
- **Overview**: Total records, attachments, storage usage
- **Breakdowns**: Records by status, civil status, gender
- **File Analysis**: Attachment types and storage statistics
- **User Activity**: Most active users and action summaries

#### Export Options
- **CSV Export**: Export filtered record data to CSV
- **HTML Reports**: Generate printable HTML reports
- **Daily Summaries**: Automated daily activity reports

## 🔧 Configuration

### Database Configuration
Edit `config/database.php` to update:
- Database host, name, username, password
- Encryption key (change from default for production)

### System Settings
Modify these settings in the `system_settings` table:
- `max_file_size`: Maximum file upload size (bytes)
- `allowed_file_types`: Comma-separated list of allowed extensions
- `records_per_page`: Default pagination size
- `session_timeout`: Session timeout in seconds

### File Upload Settings
- **Upload Directory**: `uploads/` (ensure proper permissions)
- **Max File Size**: Configurable in settings (default 100MB)
- **Allowed Types**: Configurable list of file extensions

## 🔒 Security

### Data Protection
- **Encryption**: Sensitive data encrypted with AES-256-CBC
- **Secure Sessions**: Session-based authentication with CSRF protection
- **File Validation**: Strict file type and size validation
- **SQL Injection**: All queries use prepared statements

### Best Practices
1. **Change Default Encryption Key**: Update the key in `config/database.php`
2. **Use Strong Passwords**: Enforce strong password policies
3. **Regular Backups**: Implement automated database backups
4. **Update Regularly**: Keep PHP and MySQL updated
5. **Secure File Permissions**: Restrict access to sensitive directories

### Production Deployment
- Remove `install.php` after installation
- Use HTTPS for all connections
- Configure web server security headers
- Set up proper file permissions
- Use environment variables for sensitive configuration

## 🗄️ Database Structure

### Main Tables
- **users**: User accounts and authentication
- **records**: Personal records with encrypted sensitive data
- **attachments**: File attachments linked to records
- **activity_logs**: Comprehensive audit trail
- **user_sessions**: Active user sessions
- **system_settings**: Configurable system settings

### Key Features
- **Auto-generated Record IDs**: Unique identifiers (REC000001, REC000002, etc.)
- **Soft Deletes**: Records marked as deleted rather than removed
- **Audit Trail**: Complete history of all changes
- **Referential Integrity**: Foreign key constraints maintain data consistency

## 🤝 API Documentation

### Authentication Endpoints
- `POST /api/auth.php?action=login` - User login
- `POST /api/auth.php?action=logout` - User logout
- `GET /api/auth.php?action=validate-session` - Validate session

### Record Endpoints
- `GET /api/records.php` - List records (with pagination/filters)
- `GET /api/records.php?id={id}` - Get specific record
- `POST /api/records.php` - Create new record
- `PUT /api/records.php?id={id}` - Update record
- `DELETE /api/records.php?id={id}` - Delete record (admin only)

### Attachment Endpoints
- `GET /api/attachments.php?record_id={id}` - List record attachments
- `POST /api/attachments.php` - Upload attachment
- `GET /api/attachments.php?action=download&id={id}` - Download file
- `DELETE /api/attachments.php?id={id}` - Delete attachment

### Reporting Endpoints
- `GET /api/reports.php?action=system-report` - Generate system report
- `GET /api/reports.php?action=export-csv` - Export CSV
- `GET /api/reports.php?action=daily-summary` - Get daily summary

## 🛠️ Troubleshooting

### Common Issues

#### File Upload Problems
- Check `uploads/` directory permissions (755)
- Verify `file_uploads = On` in PHP configuration
- Increase `upload_max_filesize` and `post_max_size` in PHP

#### Database Connection Issues
- Verify database credentials in `config/database.php`
- Ensure MySQL service is running
- Check database exists and user has proper permissions

#### Session Issues
- Verify session configuration in PHP
- Check that session directory is writable
- Clear browser cookies and cache

#### Permission Errors
- Ensure web server has read access to all files
- Set proper permissions on uploads directory
- Check file ownership (should be web server user)

### Error Logging
- Check PHP error logs for detailed error information
- Application errors are logged in the `activity_logs` table
- Enable PHP error reporting for development

## 📄 License

This Archive Management System is released under the MIT License. You are free to use, modify, and distribute this software in accordance with the license terms.

## 🆘 Support

For support, documentation, or feature requests:

1. **Check the documentation** in this README
2. **Review the installation guide** and troubleshooting section
3. **Check system logs** for error details
4. **Verify system requirements** and configuration

---

## 🎯 Quick Start Summary

1. **Install**: Run `install.php` and follow the wizard
2. **Login**: Use your admin credentials at `/public/index.html`
3. **Add Records**: Start adding records with personal information
4. **Upload Files**: Attach documents, PDFs, and images to records
5. **Search**: Use filters and search to find specific records
6. **Reports**: Generate comprehensive system reports
7. **Secure**: Change default encryption key and follow security best practices

**Default Admin Credentials** (change during installation):
- Username: `admin`
- Password: `admin123` (or as set during installation)

Your Archive Management System is now ready to use! 🎉
