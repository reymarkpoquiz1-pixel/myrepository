-- Archiving System Database Schema
-- Create database first
CREATE DATABASE IF NOT EXISTS archiving_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE archiving_system;

-- Users table for authentication and role management
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
);

-- Records table for storing main record information
CREATE TABLE records (
    record_id INT AUTO_INCREMENT PRIMARY KEY,
    unique_identifier VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    date_of_birth DATE,
    civil_status ENUM('single', 'married', 'divorced', 'widowed', 'separated') DEFAULT 'single',
    gender ENUM('male', 'female', 'other'),
    nationality VARCHAR(50),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    phone_number VARCHAR(20),
    email_address VARCHAR(100),
    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(20),
    notes TEXT,
    record_status ENUM('active', 'archived', 'deleted') DEFAULT 'active',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id),
    INDEX idx_name (last_name, first_name),
    INDEX idx_dob (date_of_birth),
    INDEX idx_status (record_status),
    INDEX idx_created (created_at)
);

-- Attachments table for file management
CREATE TABLE attachments (
    attachment_id INT AUTO_INCREMENT PRIMARY KEY,
    record_id INT NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100),
    description TEXT,
    is_encrypted BOOLEAN DEFAULT FALSE,
    uploaded_by INT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (record_id) REFERENCES records(record_id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(user_id),
    INDEX idx_record (record_id),
    INDEX idx_filename (original_filename),
    INDEX idx_type (file_type)
);

-- Activity logs for audit trail
CREATE TABLE activity_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    record_id INT NULL,
    attachment_id INT NULL,
    action_type ENUM('create', 'read', 'update', 'delete', 'login', 'logout', 'download', 'export') NOT NULL,
    table_name VARCHAR(50),
    old_values JSON NULL,
    new_values JSON NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (record_id) REFERENCES records(record_id),
    FOREIGN KEY (attachment_id) REFERENCES attachments(attachment_id),
    INDEX idx_user (user_id),
    INDEX idx_action (action_type),
    INDEX idx_date (created_at),
    INDEX idx_record_log (record_id)
);

-- User sessions for security
CREATE TABLE user_sessions (
    session_id VARCHAR(128) PRIMARY KEY,
    user_id INT NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_expires (expires_at)
);

-- System settings
CREATE TABLE system_settings (
    setting_id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('max_file_size', '104857600', 'Maximum file upload size in bytes (100MB)'),
('allowed_file_types', 'pdf,doc,docx,xls,xlsx,jpg,jpeg,png,gif,txt', 'Comma-separated list of allowed file extensions'),
('records_per_page', '25', 'Number of records to display per page'),
('session_timeout', '3600', 'Session timeout in seconds (1 hour)'),
('backup_retention_days', '30', 'Number of days to retain backup files');

-- Create default admin user (password: admin123 - change in production)
INSERT INTO users (username, email, password_hash, role, first_name, last_name) VALUES
('admin', 'admin@archivesystem.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'System', 'Administrator');

-- Create unique identifier sequence function
DELIMITER //
CREATE FUNCTION generate_record_id() RETURNS VARCHAR(20)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE next_id INT;
    DECLARE record_id VARCHAR(20);
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(unique_identifier, 4) AS UNSIGNED)), 0) + 1 
    INTO next_id 
    FROM records 
    WHERE unique_identifier REGEXP '^REC[0-9]+$';
    
    SET record_id = CONCAT('REC', LPAD(next_id, 6, '0'));
    
    RETURN record_id;
END//
DELIMITER ;

-- Trigger to auto-generate unique identifier
DELIMITER //
CREATE TRIGGER before_record_insert 
BEFORE INSERT ON records 
FOR EACH ROW 
BEGIN
    IF NEW.unique_identifier IS NULL OR NEW.unique_identifier = '' THEN
        SET NEW.unique_identifier = generate_record_id();
    END IF;
END//
DELIMITER ;