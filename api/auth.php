<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../classes/User.php';

session_start();

$user = new User();
$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

try {
    switch ($method) {
        case 'POST':
            if (isset($_GET['action'])) {
                switch ($_GET['action']) {
                    case 'login':
                        handleLogin($user, $input);
                        break;
                    case 'logout':
                        handleLogout($user);
                        break;
                    case 'register':
                        handleRegister($user, $input);
                        break;
                    case 'change-password':
                        handleChangePassword($user, $input);
                        break;
                    default:
                        throw new Exception('Invalid action');
                }
            } else {
                throw new Exception('No action specified');
            }
            break;
            
        case 'GET':
            if (isset($_GET['action'])) {
                switch ($_GET['action']) {
                    case 'validate-session':
                        handleValidateSession($user);
                        break;
                    case 'profile':
                        handleGetProfile($user);
                        break;
                    default:
                        throw new Exception('Invalid action');
                }
            } else {
                throw new Exception('No action specified');
            }
            break;
            
        default:
            throw new Exception('Method not allowed');
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

function handleLogin($user, $input) {
    if (empty($input['username']) || empty($input['password'])) {
        throw new Exception('Username and password are required');
    }
    
    $ipAddress = $_SERVER['REMOTE_ADDR'] ?? '';
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
    
    $result = $user->login($input['username'], $input['password'], $ipAddress, $userAgent);
    
    // Store session data
    $_SESSION['user_id'] = $result['user']['user_id'];
    $_SESSION['username'] = $result['user']['username'];
    $_SESSION['role'] = $result['user']['role'];
    $_SESSION['session_id'] = $result['session_id'];
    
    echo json_encode([
        'success' => true,
        'message' => 'Login successful',
        'user' => [
            'user_id' => $result['user']['user_id'],
            'username' => $result['user']['username'],
            'email' => $result['user']['email'],
            'role' => $result['user']['role'],
            'first_name' => $result['user']['first_name'],
            'last_name' => $result['user']['last_name']
        ],
        'session_id' => $result['session_id']
    ]);
}

function handleLogout($user) {
    if (isset($_SESSION['session_id'])) {
        $user->logout($_SESSION['session_id'], $_SESSION['user_id'] ?? null);
    }
    
    session_destroy();
    
    echo json_encode([
        'success' => true,
        'message' => 'Logout successful'
    ]);
}

function handleRegister($user, $input) {
    // Check if user has admin privileges
    if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
        throw new Exception('Access denied. Admin privileges required.');
    }
    
    $required = ['username', 'email', 'password', 'first_name', 'last_name'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            throw new Exception("Field $field is required");
        }
    }
    
    $userId = $user->create($input);
    
    echo json_encode([
        'success' => true,
        'message' => 'User created successfully',
        'user_id' => $userId
    ]);
}

function handleChangePassword($user, $input) {
    if (!isset($_SESSION['user_id'])) {
        throw new Exception('Not authenticated');
    }
    
    if (empty($input['current_password']) || empty($input['new_password'])) {
        throw new Exception('Current password and new password are required');
    }
    
    $user->changePassword($_SESSION['user_id'], $input['current_password'], $input['new_password']);
    
    echo json_encode([
        'success' => true,
        'message' => 'Password changed successfully'
    ]);
}

function handleValidateSession($user) {
    if (!isset($_SESSION['session_id'])) {
        throw new Exception('No active session');
    }
    
    $userData = $user->validateSession($_SESSION['session_id']);
    
    if (!$userData) {
        session_destroy();
        throw new Exception('Session expired');
    }
    
    echo json_encode([
        'success' => true,
        'valid' => true,
        'user' => [
            'user_id' => $userData['user_id'],
            'username' => $userData['username'],
            'email' => $userData['email'],
            'role' => $userData['role'],
            'first_name' => $userData['first_name'],
            'last_name' => $userData['last_name']
        ]
    ]);
}

function handleGetProfile($user) {
    if (!isset($_SESSION['user_id'])) {
        throw new Exception('Not authenticated');
    }
    
    $userData = $user->getById($_SESSION['user_id']);
    
    if (!$userData) {
        throw new Exception('User not found');
    }
    
    echo json_encode([
        'success' => true,
        'user' => $userData
    ]);
}
?>