<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../lib/auth.php';

if (current_user()) {
    header('Location: /dashboard.php');
    exit;
}
$csrf = csrf_token();
?>
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Login - Civil Registry</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="/styles.css" rel="stylesheet">
</head>
<body class="bg-light d-flex align-items-center" style="min-height: 100vh;">
  <div class="container">
    <div class="row justify-content-center">
      <div class="col-md-4">
        <div class="card shadow-sm">
          <div class="card-body">
            <h4 class="card-title mb-3">Civil Registry Login</h4>
            <div id="alert" class="alert d-none" role="alert"></div>
            <form id="loginForm">
              <input type="hidden" id="csrf" value="<?= htmlspecialchars($csrf) ?>" />
              <div class="mb-3">
                <label class="form-label">Username</label>
                <input class="form-control" id="username" required />
              </div>
              <div class="mb-3">
                <label class="form-label">Password</label>
                <input type="password" class="form-control" id="password" required />
              </div>
              <button class="btn btn-primary w-100" type="submit">Login</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
  <script>
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const res = await fetch('/api/auth/login.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': document.getElementById('csrf').value },
      body: JSON.stringify({ username: document.getElementById('username').value, password: document.getElementById('password').value })
    });
    if (res.ok) { window.location.href = '/dashboard.php'; return; }
    const data = await res.json().catch(() => ({ error: 'Login failed' }));
    const el = document.getElementById('alert');
    el.classList.remove('d-none');
    el.classList.add('alert-danger');
    el.innerText = data.error || 'Login failed';
  });
  </script>
</body>
</html>