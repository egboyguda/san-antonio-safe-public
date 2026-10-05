# Seeded Accounts for Every Role

These accounts are for local development only.

## Create or Reset the Accounts

1. Start the local PostgreSQL/PostGIS database:

   ```powershell
   docker compose up -d postgres
   ```

2. Create the reference data and all role logins:

   ```powershell
   npm run db:seed
   ```

The seed is safe to run again while each configured email remains unchanged. It
updates matching users by email, restores their roles, unbans them, verifies
their email, resets their passwords, and restores their Ward I profile data.
Changing a `SEED_<ROLE>_EMAIL` creates a new user and does not remove the old
account.

## Logins

| Role | Email | Password | Supported surface |
| --- | --- | --- | --- |
| `resident` | `resident@sanantoniosafe.test` | `Resident123!` | Android app |
| `responder` | `responder@sanantoniosafe.test` | `Responder123!` | Android app |
| `barangay_officer` | `barangay.officer@sanantoniosafe.test` | `BarangayOfficer123!` | Android app |
| `command_center_staff` | `command.center@sanantoniosafe.test` | `CommandCenter123!` | Android app or web command-center |
| `admin` | `admin@sanantoniosafe.test` | `Admin123!` | Android app or web command-center |

Android users sign in inside the app after selecting the backend server. Use
one of these development addresses:

- Android emulator: `http://10.0.2.2:3000`
- Physical phone on the same Wi-Fi: `http://<your-pc-lan-ip>:3000`
- USB-connected phone after `adb reverse tcp:3000 tcp:3000`:
  `http://127.0.0.1:3000`

Do not use Android `localhost` unless `adb reverse` is active. The PC web login
at `http://localhost:3000/login` is only for `command_center_staff` and `admin`.

The accounts do not exist until `npm run db:seed` completes successfully. All
seeded users receive a Ward I profile. The responder also receives a responder
record for the Seed Response Team. A new responder row starts available through
the database default; reseeding preserves an existing responder's current
availability instead of forcing it back to available.

## Local Database Setting

The Docker database is exposed on host port `5433`, so the local `.env` must
use:

```env
DATABASE_URL="postgresql://san_antonio_safe:san_antonio_safe_password@localhost:5433/san_antonio_safe"
```

If seeding or login reports `ECONNREFUSED`, the app cannot reach PostgreSQL.
Start Docker and the `postgres` service, then run the seed again.

## Override the Development Accounts

Set any of these values in `.env` before running the seed:

```env
SEED_RESIDENT_NAME="Resident User"
SEED_RESIDENT_EMAIL="resident@sanantoniosafe.test"
SEED_RESIDENT_PASSWORD="Resident123!"

SEED_RESPONDER_NAME="Responder User"
SEED_RESPONDER_EMAIL="responder@sanantoniosafe.test"
SEED_RESPONDER_PASSWORD="Responder123!"

SEED_BARANGAY_OFFICER_NAME="Barangay Officer"
SEED_BARANGAY_OFFICER_EMAIL="barangay.officer@sanantoniosafe.test"
SEED_BARANGAY_OFFICER_PASSWORD="BarangayOfficer123!"

SEED_COMMAND_CENTER_NAME="Command Center Staff"
SEED_COMMAND_CENTER_EMAIL="command.center@sanantoniosafe.test"
SEED_COMMAND_CENTER_PASSWORD="CommandCenter123!"

SEED_ADMIN_NAME="System Administrator"
SEED_ADMIN_EMAIL="admin@sanantoniosafe.test"
SEED_ADMIN_PASSWORD="Admin123!"
```

Every password must contain at least eight characters, and every seeded email
must be unique. Use strong, different passwords outside local development. Do
not deploy the default credentials to production.