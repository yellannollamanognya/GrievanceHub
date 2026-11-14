# GrievanceHub Database

## Files
- `schema.sql`: creates the `grievancehub` database and all 11 core tables.
- `sample-data.sql`: optional fictional data for local testing.
- `ER-diagram.pdf`: approved ER diagram; keep the team's latest version here.

## Requirements
MySQL 8.0.16+ and MySQL Workbench (or MySQL CLI).

## Run with MySQL Workbench
1. Start MySQL Workbench and connect to your local server.
2. Open `schema.sql` using File → Open SQL Script.
3. Execute the script (lightning icon).
4. Refresh Schemas, expand `grievancehub` → Tables, and confirm 11 tables.
5. Optionally run `sample-data.sql` for fictional test records.

## Run from terminal
```bash
mysql -u root -p < schema.sql
mysql -u root -p < sample-data.sql
```
Run the second command only if you want the optional sample records.

## The 11 core tables
`users`, `students`, `staff`, `departments`, `categories`, `complaints`,
`complaint_assignments`, `complaint_history`, `comments`, `attachments`, `feedback`.

## Rules the backend must follow
- Admin is a `users` row with role `ADMIN`; there is no separate admin table.
- `students.user_id` and `staff.user_id` are each both PK and FK to `users.user_id`.
- When creating a complaint, insert its initial `SUBMITTED` row in `complaint_history` in the same transaction.
- On every status transition, update `complaints.current_status` and insert a `complaint_history` row in one transaction.
- Reassignment: set the previous assignment's `unassigned_at`, then insert a new assignment row.
- Backend authorization must restrict students to their own complaints and staff to assigned complaints, except authorized admin actions.
- Hash passwords with bcrypt. Never store plaintext passwords.
- `attachments` stores metadata and a path/reference, not the file bytes.
- This design permits one feedback row per complaint through a UNIQUE constraint.
- The backend should enforce whether only one active staff assignment is allowed per complaint.

## Confirm these assumptions with the team
1. Every student belongs to one department.
2. Every staff member belongs to one department.
3. Every complaint is routed to one department on submission.
4. Each complaint receives at most one feedback record.

## Git/security
Never commit `.env`, database passwords, real student records, or private uploaded files.
Coordinate schema changes with the backend teammate before merging.
