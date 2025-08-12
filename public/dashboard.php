<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../lib/auth.php';
require_auth();
$csrf = csrf_token();
$user = current_user();
?>
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Civil Registry - Dashboard</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="/styles.css" rel="stylesheet">
</head>
<body>
<nav class="navbar navbar-expand-lg navbar-dark bg-primary">
  <div class="container-fluid">
    <a class="navbar-brand" href="#">Civil Registry</a>
    <div class="d-flex align-items-center text-white">Hello, <?= htmlspecialchars($user['username']) ?> (<?= htmlspecialchars($user['role']) ?>)</div>
    <button class="btn btn-outline-light ms-3" id="logoutBtn">Logout</button>
  </div>
</nav>
<div class="container my-4">
  <ul class="nav nav-tabs" id="mainTabs" role="tablist">
    <li class="nav-item" role="presentation">
      <button class="nav-link active" id="records-tab" data-bs-toggle="tab" data-bs-target="#records" type="button" role="tab">Records</button>
    </li>
    <li class="nav-item" role="presentation">
      <button class="nav-link" id="add-tab" data-bs-toggle="tab" data-bs-target="#add" type="button" role="tab">Add Record</button>
    </li>
    <li class="nav-item" role="presentation">
      <button class="nav-link" id="reports-tab" data-bs-toggle="tab" data-bs-target="#reports" type="button" role="tab">Reports</button>
    </li>
  </ul>
  <div class="tab-content" id="mainTabsContent">
    <div class="tab-pane fade show active" id="records" role="tabpanel">
      <div class="card mt-3">
        <div class="card-body">
          <form id="searchForm" class="row g-2 align-items-end">
            <input type="hidden" id="csrf" value="<?= htmlspecialchars($csrf) ?>" />
            <div class="col-md-2">
              <label class="form-label">Type</label>
              <select id="filterType" class="form-select">
                <option value="">All</option>
                <option value="birth">Birth</option>
                <option value="marriage">Marriage</option>
                <option value="death">Death</option>
              </select>
            </div>
            <div class="col-md-3">
              <label class="form-label">Name / Registry No.</label>
              <input id="filterQ" class="form-control" placeholder="Search..." />
            </div>
            <div class="col-md-2">
              <label class="form-label">Date From</label>
              <input type="date" id="filterFrom" class="form-control" />
            </div>
            <div class="col-md-2">
              <label class="form-label">Date To</label>
              <input type="date" id="filterTo" class="form-control" />
            </div>
            <div class="col-md-1">
              <label class="form-label">Per Page</label>
              <select id="perPage" class="form-select">
                <option>10</option>
                <option>25</option>
                <option>50</option>
              </select>
            </div>
            <div class="col-md-2 text-end">
              <button class="btn btn-primary" type="submit">Search</button>
            </div>
          </form>
          <div class="table-responsive mt-3">
            <table class="table table-hover" id="recordsTable">
              <thead>
                <tr>
                  <th><a href="#" data-sort="id">ID</a></th>
                  <th><a href="#" data-sort="record_type">Type</a></th>
                  <th><a href="#" data-sort="primary_name">Name</a></th>
                  <th><a href="#" data-sort="registry_no">Registry No.</a></th>
                  <th><a href="#" data-sort="date_of_event">Date</a></th>
                  <th>Attachments</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
          <nav>
            <ul class="pagination" id="pager"></ul>
          </nav>
        </div>
      </div>
    </div>
    <div class="tab-pane fade" id="add" role="tabpanel">
      <div class="card mt-3">
        <div class="card-body">
          <h5 class="mb-3">Add Record</h5>
          <form id="addForm" class="row g-3">
            <input type="hidden" id="csrf2" value="<?= htmlspecialchars($csrf) ?>" />
            <div class="col-md-3">
              <label class="form-label">Record Type</label>
              <select id="recordType" class="form-select" required>
                <option value="birth">Birth</option>
                <option value="marriage">Marriage</option>
                <option value="death">Death</option>
              </select>
            </div>
            <div class="col-md-3">
              <label class="form-label">Province</label>
              <input id="province" class="form-control" />
            </div>
            <div class="col-md-3">
              <label class="form-label">Municipality</label>
              <input id="municipality" class="form-control" />
            </div>
            <div class="col-md-3">
              <label class="form-label">Registry No.</label>
              <input id="registry_no" class="form-control" />
            </div>
            <div class="col-md-6">
              <label class="form-label">Primary Name</label>
              <input id="primary_name" class="form-control" placeholder="Child / Couple / Deceased" required />
            </div>
            <div class="col-md-3">
              <label class="form-label">Event Date</label>
              <input type="date" id="date_of_event" class="form-control" />
            </div>
            <div class="col-md-3">
              <label class="form-label">Date Registered</label>
              <input type="date" id="date_registered" class="form-control" />
            </div>
            <div class="col-12">
              <label class="form-label">Details (JSON)</label>
              <textarea id="details_json" class="form-control" rows="6" placeholder='{"child_full_name":"...", ...}'></textarea>
              <div class="form-text">Provide the structured details for Birth/Marriage/Death as JSON. See placeholders in the prompt.</div>
            </div>
            <div class="col-12">
              <label class="form-label">Sensitive Details (JSON, encrypted at rest)</label>
              <textarea id="sensitive_json" class="form-control" rows="4" placeholder='{"mother_maiden_name":"..."}'></textarea>
            </div>
            <div class="col-12 text-end">
              <button class="btn btn-success" type="submit">Save Record</button>
            </div>
          </form>
        </div>
      </div>
    </div>
    <div class="tab-pane fade" id="reports" role="tabpanel">
      <div class="card mt-3">
        <div class="card-body">
          <form id="reportForm" class="row g-2 align-items-end">
            <input type="hidden" id="csrf3" value="<?= htmlspecialchars($csrf) ?>" />
            <div class="col-md-2">
              <label class="form-label">Type</label>
              <select id="repType" class="form-select">
                <option value="">All</option>
                <option value="birth">Birth</option>
                <option value="marriage">Marriage</option>
                <option value="death">Death</option>
              </select>
            </div>
            <div class="col-md-2">
              <label class="form-label">From</label>
              <input type="date" id="repFrom" class="form-control" />
            </div>
            <div class="col-md-2">
              <label class="form-label">To</label>
              <input type="date" id="repTo" class="form-control" />
            </div>
            <div class="col-md-2">
              <label class="form-label">Format</label>
              <select id="repFormat" class="form-select">
                <option value="csv">CSV</option>
                <option value="pdf">PDF</option>
              </select>
            </div>
            <div class="col-md-4 text-end">
              <button class="btn btn-secondary" type="submit">Export</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Attachment Modal -->
<div class="modal fade" id="attachModal" tabindex="-1">
  <div class="modal-dialog modal-lg">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Attachments for Record <span id="attachRecordId"></span></h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <div class="mb-3">
          <label class="form-label">Upload Files</label>
          <input type="file" id="attachFiles" class="form-control" multiple />
          <small class="text-muted">Allowed: PDF, JPG, PNG, TXT</small>
        </div>
        <button class="btn btn-primary mb-3" id="uploadBtn">Upload</button>
        <div class="table-responsive">
          <table class="table table-sm" id="attachTable">
            <thead><tr><th>ID</th><th>Name</th><th>Type</th><th>Size</th><th>Uploaded</th><th>Actions</th></tr></thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- View/Edit Record Modal -->
<div class="modal fade" id="viewModal" tabindex="-1">
  <div class="modal-dialog modal-lg">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Record Details (#<span id="viewRecordId"></span>)</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <form id="viewForm" class="row g-3">
          <div class="col-md-3">
            <label class="form-label">Type</label>
            <select id="v_recordType" class="form-select">
              <option value="birth">Birth</option>
              <option value="marriage">Marriage</option>
              <option value="death">Death</option>
            </select>
          </div>
          <div class="col-md-3">
            <label class="form-label">Province</label>
            <input id="v_province" class="form-control" />
          </div>
          <div class="col-md-3">
            <label class="form-label">Municipality</label>
            <input id="v_municipality" class="form-control" />
          </div>
          <div class="col-md-3">
            <label class="form-label">Registry No.</label>
            <input id="v_registry_no" class="form-control" />
          </div>
          <div class="col-md-6">
            <label class="form-label">Primary Name</label>
            <input id="v_primary_name" class="form-control" />
          </div>
          <div class="col-md-3">
            <label class="form-label">Event Date</label>
            <input type="date" id="v_date_of_event" class="form-control" />
          </div>
          <div class="col-md-3">
            <label class="form-label">Date Registered</label>
            <input type="date" id="v_date_registered" class="form-control" />
          </div>
          <div class="col-12">
            <label class="form-label">Details (JSON)</label>
            <textarea id="v_details_json" class="form-control" rows="6"></textarea>
          </div>
          <div class="col-12">
            <label class="form-label">Sensitive (JSON)</label>
            <textarea id="v_sensitive_json" class="form-control" rows="4"></textarea>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" id="saveRecordBtn">Save Changes</button>
      </div>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="/app.js"></script>
</body>
</html>