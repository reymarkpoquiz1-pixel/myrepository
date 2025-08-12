<?php
/**
 * Archive Management System Installation Script
 * 
 * This script sets up the database and creates the initial configuration
 */

set_time_limit(0);

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Archive System Installation</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container { 
            max-width: 800px; 
            margin: 0 auto; 
            background: white; 
            padding: 40px; 
            border-radius: 10px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .header { 
            text-align: center; 
            margin-bottom: 40px; 
            color: #333;
        }
        .header h1 { 
            color: #2563eb; 
            margin-bottom: 10px;
        }
        .step { 
            margin-bottom: 30px; 
            padding: 20px; 
            border: 1px solid #e2e8f0; 
            border-radius: 8px;
            background: #f8fafc;
        }
        .step h3 { 
            color: #2563eb; 
            margin-bottom: 15px;
        }
        .success { 
            background: #d1fae5; 
            border-color: #a7f3d0; 
            color: #065f46;
        }
        .error { 
            background: #fee2e2; 
            border-color: #fecaca; 
            color: #991b1b;
        }
        .warning { 
            background: #fef3c7; 
            border-color: #fde68a; 
            color: #92400e;
        }
        .btn { 
            background: #2563eb; 
            color: white; 
            padding: 12px 24px; 
            border: none; 
            border-radius: 6px; 
            cursor: pointer; 
            font-size: 16px;
            text-decoration: none;
            display: inline-block;
        }
        .btn:hover { 
            background: #1d4ed8; 
        }
        .form-group { 
            margin-bottom: 20px; 
        }
        .form-group label { 
            display: block; 
            margin-bottom: 5px; 
            font-weight: 500;
        }
        .form-group input { 
            width: 100%; 
            padding: 10px; 
            border: 1px solid #d1d5db; 
            border-radius: 6px; 
            font-size: 14px;
        }
        .requirements { 
            margin-bottom: 30px; 
        }
        .req-item { 
            display: flex; 
            align-items: center; 
            margin-bottom: 10px; 
        }
        .req-status { 
            margin-right: 10px; 
            font-weight: bold; 
        }
        .ok { color: #16a34a; }
        .fail { color: #dc2626; }
        pre { 
            background: #f3f4f6; 
            padding: 15px; 
            border-radius: 6px; 
            overflow-x: auto;
            border-left: 4px solid #2563eb;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📁 Archive Management System</h1>
            <p>Installation & Setup Wizard</p>
        </div>

        <?php
        if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['install'])) {
            performInstallation();
        } else {
            showInstallationForm();
        }

        function showInstallationForm() {
            // Check system requirements
            $requirements = checkRequirements();
            ?>

            <div class="step">
                <h3>🔍 System Requirements Check</h3>
                <div class="requirements">
                    <?php foreach ($requirements as $req): ?>
                    <div class="req-item">
                        <span class="req-status <?php echo $req['status'] ? 'ok' : 'fail'; ?>">
                            <?php echo $req['status'] ? '✓' : '✗'; ?>
                        </span>
                        <span><?php echo $req['name']; ?></span>
                    </div>
                    <?php endforeach; ?>
                </div>
                
                <?php if (array_filter($requirements, function($r) { return !$r['status']; })): ?>
                    <div class="error">
                        <strong>⚠️ Requirements Not Met</strong><br>
                        Please ensure all requirements are satisfied before proceeding.
                    </div>
                <?php else: ?>
                    <div class="success">
                        <strong>✅ All Requirements Met</strong><br>
                        Your system is ready for installation.
                    </div>
                <?php endif; ?>
            </div>

            <div class="step">
                <h3>⚙️ Database Configuration</h3>
                <form method="POST">
                    <div class="form-group">
                        <label for="db_host">Database Host:</label>
                        <input type="text" id="db_host" name="db_host" value="localhost" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="db_name">Database Name:</label>
                        <input type="text" id="db_name" name="db_name" value="archiving_system" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="db_user">Database Username:</label>
                        <input type="text" id="db_user" name="db_user" value="root" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="db_pass">Database Password:</label>
                        <input type="password" id="db_pass" name="db_pass">
                    </div>

                    <h3>👤 Admin User Setup</h3>
                    
                    <div class="form-group">
                        <label for="admin_username">Admin Username:</label>
                        <input type="text" id="admin_username" name="admin_username" value="admin" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="admin_email">Admin Email:</label>
                        <input type="email" id="admin_email" name="admin_email" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="admin_password">Admin Password:</label>
                        <input type="password" id="admin_password" name="admin_password" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="admin_first_name">Admin First Name:</label>
                        <input type="text" id="admin_first_name" name="admin_first_name" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="admin_last_name">Admin Last Name:</label>
                        <input type="text" id="admin_last_name" name="admin_last_name" required>
                    </div>

                    <button type="submit" name="install" class="btn">🚀 Install Archive System</button>
                </form>
            </div>

            <div class="step">
                <h3>📝 Installation Notes</h3>
                <div class="warning">
                    <strong>⚠️ Important:</strong>
                    <ul>
                        <li>Make sure your web server has write permissions to the uploads directory</li>
                        <li>The installation will create the database if it doesn't exist</li>
                        <li>Change the default encryption key in config/database.php after installation</li>
                        <li>For production use, update the database configuration file with secure credentials</li>
                    </ul>
                </div>
            </div>

            <?php
        }

        function performInstallation() {
            $errors = [];
            $success = [];

            try {
                // Step 1: Test database connection
                $host = $_POST['db_host'];
                $dbname = $_POST['db_name'];
                $username = $_POST['db_user'];
                $password = $_POST['db_pass'];

                echo '<div class="step"><h3>🔗 Testing Database Connection</h3>';
                
                $dsn = "mysql:host=$host;charset=utf8mb4";
                $pdo = new PDO($dsn, $username, $password, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
                ]);
                
                echo '<div class="success">✅ Database connection successful</div>';

                // Step 2: Create database
                echo '<h4>Creating Database</h4>';
                $pdo->exec("CREATE DATABASE IF NOT EXISTS `$dbname` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                $pdo->exec("USE `$dbname`");
                echo '<div class="success">✅ Database created/selected successfully</div>';

                // Step 3: Run schema
                echo '<h4>Creating Tables</h4>';
                $schema = file_get_contents(__DIR__ . '/database/schema.sql');
                
                // Remove the database creation part since we already did it
                $schema = preg_replace('/CREATE DATABASE.*?;/', '', $schema);
                $schema = preg_replace('/USE .*?;/', '', $schema);
                
                // Execute schema
                $statements = explode(';', $schema);
                foreach ($statements as $statement) {
                    $statement = trim($statement);
                    if (!empty($statement)) {
                        $pdo->exec($statement);
                    }
                }
                
                echo '<div class="success">✅ Database schema created successfully</div>';

                // Step 4: Create admin user
                echo '<h4>Creating Admin User</h4>';
                $adminPassword = password_hash($_POST['admin_password'], PASSWORD_DEFAULT);
                
                $stmt = $pdo->prepare("
                    INSERT INTO users (username, email, password_hash, role, first_name, last_name) 
                    VALUES (?, ?, ?, 'admin', ?, ?)
                    ON DUPLICATE KEY UPDATE 
                    email = VALUES(email), 
                    password_hash = VALUES(password_hash),
                    first_name = VALUES(first_name),
                    last_name = VALUES(last_name)
                ");
                
                $stmt->execute([
                    $_POST['admin_username'],
                    $_POST['admin_email'],
                    $adminPassword,
                    $_POST['admin_first_name'],
                    $_POST['admin_last_name']
                ]);
                
                echo '<div class="success">✅ Admin user created successfully</div>';

                // Step 5: Update configuration
                echo '<h4>Updating Configuration</h4>';
                updateDatabaseConfig($host, $dbname, $username, $password);
                echo '<div class="success">✅ Configuration updated successfully</div>';

                // Step 6: Create uploads directory
                echo '<h4>Setting up File Storage</h4>';
                $uploadsDir = __DIR__ . '/uploads';
                if (!is_dir($uploadsDir)) {
                    mkdir($uploadsDir, 0755, true);
                }
                
                if (is_writable($uploadsDir)) {
                    echo '<div class="success">✅ Uploads directory is ready and writable</div>';
                } else {
                    echo '<div class="warning">⚠️ Uploads directory exists but may not be writable. Please check permissions.</div>';
                }

                echo '</div>';

                // Installation complete
                echo '<div class="step success">';
                echo '<h3>🎉 Installation Complete!</h3>';
                echo '<p>Your Archive Management System has been successfully installed.</p>';
                echo '<p><strong>Admin Login Details:</strong></p>';
                echo '<ul>';
                echo '<li><strong>Username:</strong> ' . htmlspecialchars($_POST['admin_username']) . '</li>';
                echo '<li><strong>Email:</strong> ' . htmlspecialchars($_POST['admin_email']) . '</li>';
                echo '<li><strong>Password:</strong> [As entered during installation]</li>';
                echo '</ul>';
                echo '<a href="public/index.html" class="btn">🏠 Go to Archive System</a>';
                echo '</div>';

                // Security recommendations
                echo '<div class="step warning">';
                echo '<h3>🔒 Security Recommendations</h3>';
                echo '<ol>';
                echo '<li>Delete this installation file (install.php) for security</li>';
                echo '<li>Change the encryption key in config/database.php</li>';
                echo '<li>Update database passwords and use environment variables in production</li>';
                echo '<li>Set up regular database backups</li>';
                echo '<li>Configure your web server to restrict access to sensitive directories</li>';
                echo '</ol>';
                echo '</div>';

            } catch (Exception $e) {
                echo '<div class="error">';
                echo '<h4>❌ Installation Failed</h4>';
                echo '<p>Error: ' . htmlspecialchars($e->getMessage()) . '</p>';
                echo '</div>';
                echo '</div>';
            }
        }

        function checkRequirements() {
            return [
                [
                    'name' => 'PHP Version 7.4 or higher',
                    'status' => version_compare(PHP_VERSION, '7.4.0', '>=')
                ],
                [
                    'name' => 'PDO MySQL Extension',
                    'status' => extension_loaded('pdo_mysql')
                ],
                [
                    'name' => 'OpenSSL Extension (for encryption)',
                    'status' => extension_loaded('openssl')
                ],
                [
                    'name' => 'FileInfo Extension (for file uploads)',
                    'status' => extension_loaded('fileinfo')
                ],
                [
                    'name' => 'JSON Extension',
                    'status' => extension_loaded('json')
                ],
                [
                    'name' => 'Session Support',
                    'status' => function_exists('session_start')
                ],
                [
                    'name' => 'File Upload Support',
                    'status' => ini_get('file_uploads') == 1
                ]
            ];
        }

        function updateDatabaseConfig($host, $dbname, $username, $password) {
            $configFile = __DIR__ . '/config/database.php';
            $config = file_get_contents($configFile);
            
            // Update database configuration
            $config = preg_replace("/private const HOST = '.*?';/", "private const HOST = '$host';", $config);
            $config = preg_replace("/private const DB_NAME = '.*?';/", "private const DB_NAME = '$dbname';", $config);
            $config = preg_replace("/private const USERNAME = '.*?';/", "private const USERNAME = '$username';", $config);
            $config = preg_replace("/private const PASSWORD = '.*?';/", "private const PASSWORD = '$password';", $config);
            
            file_put_contents($configFile, $config);
        }
        ?>
    </div>
</body>
</html>