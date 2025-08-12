# Civil Registry Archiving System (PHP + MySQL)

A lightweight records archiving system for Birth, Marriage, and Death records with unlimited attachments, role-based access, audit logging, search/filter/sort, pagination, and CSV/PDF reporting.

## Features
- Record types: Birth, Marriage, Death
- CRUD for records and attachments (PDF/images/other types)
- Unlimited attachments per record, large file support
- Search, filter (type, dates, name, registry no.), sort, paginate
- CSV export and PDF export (via FPDF)
- Role-based access: Admin, User
- Session auth, password hashing (bcrypt)
- Audit logs for all actions
- File encryption at rest (AES-256-CBC) and metadata tracking

## Tech
- PHP 8+
- MySQL 8+
- FPDF (bundled) for PDF reports
- Bootstrap 5 frontend

## Quick Start

1) Copy environment file and configure
```bash
cp .env.example .env
```
Set your DB connection and encryption key in `.env`.

2) Create database and run migration
- Create a MySQL database (e.g., `civil_registry`).
- Import SQL schema:
```bash
mysql -u <user> -p -h <host> <db_name> < migrations/001_init.sql
```

3) Bootstrap an admin user
Use the built-in setup script to create an initial admin user:
```bash
php scripts/bootstrap_admin.php --username admin --password "StrongP@ssw0rd" --role admin
```

4) Serve the app
Using PHP built-in server:
```bash
php -S 0.0.0.0:8080 -t public
```
Open `http://localhost:8080`.

## Directory Structure
- `public/` Web root (login, dashboard, JS, CSS)
- `api/` REST endpoints (auth, records, attachments, reports)
- `config/` App configuration and env loader
- `lib/` DB, auth, crypto, uploads, utilities
- `migrations/` SQL schema
- `storage/uploads/` Encrypted file storage (non-public)
- `vendor/fpdf/` FPDF (for PDF reports)

## Environment Variables (.env)
```
APP_ENV=development
APP_KEY=base64:CHANGE_ME_GENERATE_32B_KEY==
SESSION_NAME=CRSID

DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=civil_registry
DB_USER=root
DB_PASS=secret
DB_CHARSET=utf8mb4

UPLOAD_MAX_MB=50
ALLOWED_MIME=application/pdf,image/jpeg,image/png,text/plain
```

- Set `APP_KEY` to a 32-byte key, base64-encoded. Example:
```bash
python3 - << 'PY'
import os, base64
print('base64:' + base64.b64encode(os.urandom(32)).decode())
PY
```

## Security Notes
- Files are stored outside web root and encrypted at rest.
- Passwords are hashed using `password_hash()` (bcrypt/argon2 as available).
- Session cookie name is configurable via `SESSION_NAME`.
- CSRF token is set for mutating requests via a header `X-CSRF-Token`.

## Large File Uploads
- Ensure PHP `post_max_size` and `upload_max_filesize` >= `UPLOAD_MAX_MB`.
- Example (php.ini):
```
upload_max_filesize = 100M
post_max_size = 120M
max_file_uploads = 50
```

## Reports
- CSV export: Universal support
- PDF export: Uses FPDF (simple tabular summary + attachment counts)

## Auditing
- All create/update/delete and auth actions are stored in `audit_logs` with metadata.

## License
MIT

## Docker Quickstart

```bash
docker compose up -d --build
# Wait for MySQL to initialize (first run)
# Create admin user inside container
docker compose exec app php scripts/bootstrap_admin.php --username admin --password "StrongP@ssw0rd" --role admin
```
Visit `http://localhost:8080`.

## Details JSON Field Guides
Use these structures in the "Details (JSON)" field when adding or editing records.

### Birth (record_type = birth)
```json
{
  "province": "",
  "municipality": "",
  "registry_no": "",
  "child_full_name": "",
  "child_date_of_birth": "YYYY-MM-DD",
  "child_place_of_birth": "",
  "type_of_birth": "Live Birth",
  "mother": {
    "first_name": "",
    "middle_name": "",
    "last_name": "",
    "maiden_name": "",
    "citizenship": "",
    "residence": {
      "house_no": "",
      "street": "",
      "barangay": "",
      "municipality": "",
      "province": ""
    },
    "occupation": "",
    "civil_status": "",
    "age_at_time_of_birth": 0,
    "date_of_birth": "YYYY-MM-DD"
  },
  "father": {
    "first_name": "",
    "middle_name": "",
    "last_name": "",
    "citizenship": "",
    "residence": {
      "house_no": "",
      "street": "",
      "barangay": "",
      "municipality": "",
      "province": ""
    },
    "occupation": "",
    "civil_status": "",
    "age_at_time_of_birth": 0,
    "date_of_birth": "YYYY-MM-DD"
  },
  "marriage_of_parents": {
    "date_of_marriage": "YYYY-MM-DD",
    "place_of_marriage": "",
    "certificate_no": ""
  },
  "informant": {
    "name": "",
    "relationship": "",
    "signature": "",
    "address": ""
  },
  "registrar": {
    "date_of_registration": "YYYY-MM-DD",
    "registered_by": "",
    "registrar_signature": "",
    "date_of_certification": "YYYY-MM-DD",
    "civil_registrar_signature": ""
  },
  "remarks": ""
}
```

### Marriage (record_type = marriage)
```json
{
  "province": "",
  "municipality": "",
  "registry_no": "",
  "husband": {
    "first_name": "",
    "middle_name": "",
    "last_name": "",
    "date_of_birth": "YYYY-MM-DD",
    "age": 0,
    "place_of_birth": { "city": "", "province": "", "country": "" },
    "sex": "Male",
    "citizenship": "",
    "residence": { "house_no": "", "street": "", "barangay": "", "city": "", "province": "", "country": "" },
    "religion": "",
    "civil_status": "",
    "father_name": { "first": "", "middle": "", "last": "" },
    "father_citizenship": "",
    "mother_maiden_name": { "first": "", "middle": "", "last": "" },
    "mother_citizenship": "",
    "relationship_to_wife": ""
  },
  "wife": {
    "first_name": "",
    "middle_name": "",
    "last_name": "",
    "date_of_birth": "YYYY-MM-DD",
    "age": 0,
    "place_of_birth": { "city": "", "province": "", "country": "" },
    "sex": "Female",
    "citizenship": "",
    "residence": { "house_no": "", "street": "", "barangay": "", "city": "", "province": "", "country": "" },
    "religion": "",
    "civil_status": "",
    "father_name": { "first": "", "middle": "", "last": "" },
    "father_citizenship": "",
    "mother_maiden_name": { "first": "", "middle": "", "last": "" },
    "mother_citizenship": ""
  },
  "marriage": {
    "date": "YYYY-MM-DD",
    "time": "HH:MM",
    "place": { "location": "", "city": "", "municipality": "", "province": "", "country": "" },
    "license_no": "",
    "license_date_issued": "YYYY-MM-DD",
    "certified_by": "",
    "contracting_parties_cert": ""
  },
  "solemnizing_officer": {
    "name": "",
    "position": "",
    "signature": "",
    "date_of_certification": "YYYY-MM-DD"
  },
  "witnesses": [
    { "name": "", "signature": "", "designation": "" },
    { "name": "", "signature": "", "designation": "" }
  ],
  "registrar": {
    "registered_by": "",
    "date_registered": "YYYY-MM-DD"
  },
  "remarks": ""
}
```

### Death (record_type = death)
```json
{
  "province": "",
  "municipality": "",
  "registry_no": "",
  "deceased": {
    "name": "",
    "sex": "",
    "date_of_death": "YYYY-MM-DD",
    "date_of_birth": "YYYY-MM-DD",
    "age": 0,
    "place_of_death": "",
    "religious_sect": "",
    "civil_status": "",
    "occupation": "",
    "father_name": "",
    "mother_name": ""
  },
  "cause_of_death": {
    "immediate_cause": "",
    "other_contributing_causes": "",
    "medical_certificate": ""
  },
  "burial": {
    "date": "YYYY-MM-DD",
    "permit_number": "",
    "cemetery_or_crematory": { "name": "", "address": "" }
  },
  "certification": {
    "physician_signature": "",
    "reviewing_officer": "",
    "reviewing_officer_signature": ""
  },
  "informant": {
    "name": "",
    "relationship": "",
    "address": "",
    "date_of_certification": "YYYY-MM-DD"
  },
  "registrar": {
    "received_by": "",
    "registered_by": "",
    "date_registered": "YYYY-MM-DD"
  },
  "remarks": ""
}
```
