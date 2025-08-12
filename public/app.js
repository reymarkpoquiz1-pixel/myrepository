let state = { page: 1, perPage: 10, sortBy: 'id', sortDir: 'desc' };

function qs(id){ return document.getElementById(id); }

async function fetchRecords(){
  const params = new URLSearchParams({
    page: state.page,
    per_page: state.perPage,
    sort_by: state.sortBy,
    sort_dir: state.sortDir,
  });
  const t = qs('filterType').value.trim(); if (t) params.set('type', t);
  const q = qs('filterQ').value.trim(); if (q) params.set('q', q);
  const df = qs('filterFrom').value; if (df) params.set('date_from', df);
  const dt = qs('filterTo').value; if (dt) params.set('date_to', dt);

  const res = await fetch('/api/records.php?' + params.toString());
  const data = await res.json();
  renderRecords(data);
}

function renderRecords(data){
  const tbody = document.querySelector('#recordsTable tbody');
  tbody.innerHTML = '';
  for (const r of data.items){
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.id}</td>
      <td>${r.record_type}</td>
      <td>${r.primary_name}</td>
      <td>${r.registry_no ?? ''}</td>
      <td>${r.date_of_event ?? ''}</td>
      <td>${r.attachment_count ?? 0}</td>
      <td>
        <button class="btn btn-sm btn-outline-secondary me-1" data-action="view" data-id="${r.id}">View</button>
        <button class="btn btn-sm btn-outline-primary me-1" data-action="attach" data-id="${r.id}">Attachments</button>
        <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${r.id}">Delete</button>
      </td>`;
    tbody.appendChild(tr);
  }
  const pager = document.getElementById('pager');
  pager.innerHTML = '';
  for (let p=1; p<=data.total_pages; p++){
    const li = document.createElement('li');
    li.className = 'page-item' + (p===data.page?' active':'');
    li.innerHTML = `<a class="page-link" href="#">${p}</a>`;
    li.addEventListener('click', (e)=>{ e.preventDefault(); state.page=p; fetchRecords(); });
    pager.appendChild(li);
  }
}

function bindSorting(){
  document.querySelectorAll('#recordsTable thead a[data-sort]').forEach(a=>{
    a.addEventListener('click', (e)=>{
      e.preventDefault();
      const s = a.getAttribute('data-sort');
      if (state.sortBy === s) state.sortDir = (state.sortDir==='asc'?'desc':'asc');
      else { state.sortBy = s; state.sortDir = 'asc'; }
      fetchRecords();
    });
  });
}

async function addRecord(){
  const payload = {
    record_type: qs('recordType').value,
    province: qs('province').value,
    municipality: qs('municipality').value,
    registry_no: qs('registry_no').value,
    primary_name: qs('primary_name').value,
    date_of_event: qs('date_of_event').value || null,
    date_registered: qs('date_registered').value || null,
    details_json: qs('details_json').value ? JSON.parse(qs('details_json').value) : {},
    sensitive_json: qs('sensitive_json').value ? JSON.parse(qs('sensitive_json').value) : {},
  };
  const res = await fetch('/api/records.php', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': qs('csrf2').value }, body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (res.ok){
    alert('Record saved.');
    state.page=1; fetchRecords();
    document.getElementById('addForm').reset();
  } else { alert(data.error || 'Save failed'); }
}

function openAttachments(recordId){
  qs('attachRecordId').innerText = recordId;
  const modal = new bootstrap.Modal('#attachModal');
  modal.show();
  loadAttachments(recordId);
}

async function loadAttachments(recordId){
  const res = await fetch('/api/attachments.php?record_id=' + recordId);
  const data = await res.json();
  const tbody = document.querySelector('#attachTable tbody');
  tbody.innerHTML='';
  for (const a of data){
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${a.id}</td><td>${a.file_name}</td><td>${a.mime_type}</td><td>${a.file_size_bytes}</td><td>${a.uploaded_at}</td>
    <td>
      <a class="btn btn-sm btn-outline-success me-1" href="/api/attachments.php?download=${a.id}">Download</a>
      <button class="btn btn-sm btn-outline-danger" data-action="del-attach" data-id="${a.id}">Delete</button>
    </td>`;
    tbody.appendChild(tr);
  }
}

async function uploadAttachments(){
  const rid = qs('attachRecordId').innerText;
  const fd = new FormData();
  const files = qs('attachFiles').files;
  if (!files || files.length===0){ alert('Select files'); return; }
  for (const f of files) fd.append('files[]', f);
  const res = await fetch('/api/attachments.php?record_id=' + rid, { method: 'POST', headers: { 'X-CSRF-Token': qs('csrf').value }, body: fd });
  const data = await res.json();
  if (res.ok){
    alert('Upload complete');
    loadAttachments(rid);
    qs('attachFiles').value = '';
  } else {
    alert((data && data.error) || 'Upload failed');
  }
}

async function deleteRecord(id){
  if (!confirm('Delete record #' + id + '? This removes its attachments.')) return;
  const res = await fetch('/api/record.php?id=' + id, { method: 'DELETE', headers: { 'X-CSRF-Token': qs('csrf').value } });
  if (res.ok){ fetchRecords(); } else { const d = await res.json(); alert(d.error || 'Delete failed'); }
}

async function deleteAttachment(id){
  if (!confirm('Delete attachment #' + id + '?')) return;
  const res = await fetch('/api/attachments.php?id=' + id, { method: 'DELETE', headers: { 'X-CSRF-Token': qs('csrf').value } });
  if (res.ok){
    const rid = qs('attachRecordId').innerText; loadAttachments(rid);
  } else { const d = await res.json(); alert(d.error || 'Delete failed'); }
}

async function exportReport(){
  const fmt = qs('repFormat').value;
  const params = new URLSearchParams();
  const t = qs('repType').value; if (t) params.set('type', t);
  const f = qs('repFrom').value; if (f) params.set('date_from', f);
  const to = qs('repTo').value; if (to) params.set('date_to', to);
  params.set('format', fmt);
  window.location.href = '/api/reports.php?' + params.toString();
}

async function doLogout(){
  await fetch('/api/auth/logout.php', { method: 'POST', headers: { 'X-CSRF-Token': qs('csrf').value } });
  window.location.href = '/';
}

// Event wiring

document.getElementById('searchForm').addEventListener('submit', (e)=>{ e.preventDefault(); state.page=1; state.perPage = parseInt(qs('perPage').value, 10) || 10; fetchRecords(); });

document.getElementById('recordsTable').addEventListener('click', (e)=>{
  const btn = e.target.closest('button'); if (!btn) return;
  const id = btn.getAttribute('data-id');
  const action = btn.getAttribute('data-action');
  if (action==='attach') openAttachments(id);
  if (action==='delete') deleteRecord(id);
  if (action==='view') openView(id);
});

document.getElementById('attachTable').addEventListener('click', (e)=>{
  const btn = e.target.closest('button'); if (!btn) return;
  const id = btn.getAttribute('data-id');
  const action = btn.getAttribute('data-action');
  if (action==='del-attach') deleteAttachment(id);
});

document.getElementById('uploadBtn').addEventListener('click', (e)=>{ e.preventDefault(); uploadAttachments(); });

document.getElementById('addForm').addEventListener('submit', (e)=>{ e.preventDefault(); addRecord(); });

document.getElementById('reports-tab').addEventListener('click', ()=>{});

document.getElementById('reportForm').addEventListener('submit', (e)=>{ e.preventDefault(); exportReport(); });

document.getElementById('logoutBtn').addEventListener('click', (e)=>{ e.preventDefault(); doLogout(); });

bindSorting();
fetchRecords();

async function openView(id){
  const res = await fetch('/api/record.php?id=' + id);
  const r = await res.json();
  if (!res.ok){ alert(r.error || 'Failed to load'); return; }
  qs('viewRecordId').innerText = r.id;
  qs('v_recordType').value = r.record_type;
  qs('v_province').value = r.province ?? '';
  qs('v_municipality').value = r.municipality ?? '';
  qs('v_registry_no').value = r.registry_no ?? '';
  qs('v_primary_name').value = r.primary_name ?? '';
  qs('v_date_of_event').value = r.date_of_event ?? '';
  qs('v_date_registered').value = r.date_registered ?? '';
  qs('v_details_json').value = r.details_json ? JSON.stringify(JSON.parse(r.details_json), null, 2) : '';
  qs('v_sensitive_json').value = r.sensitive_json ? JSON.stringify(r.sensitive_json, null, 2) : '';
  new bootstrap.Modal('#viewModal').show();
}

async function saveView(){
  const id = qs('viewRecordId').innerText;
  const payload = {
    record_type: qs('v_recordType').value,
    province: qs('v_province').value,
    municipality: qs('v_municipality').value,
    registry_no: qs('v_registry_no').value,
    primary_name: qs('v_primary_name').value,
    date_of_event: qs('v_date_of_event').value || null,
    date_registered: qs('v_date_registered').value || null,
    details_json: qs('v_details_json').value ? JSON.parse(qs('v_details_json').value) : null,
    sensitive_json: qs('v_sensitive_json').value ? JSON.parse(qs('v_sensitive_json').value) : null,
  };
  const res = await fetch('/api/record.php?id=' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': qs('csrf').value }, body: JSON.stringify(payload) });
  const data = await res.json();
  if (res.ok){ alert('Saved'); fetchRecords(); } else { alert(data.error || 'Save failed'); }
}

// Wire save button if present
const saveBtn = document.getElementById('saveRecordBtn');
if (saveBtn){ saveBtn.addEventListener('click', (e)=>{ e.preventDefault(); saveView(); }); }