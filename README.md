# SanAntonioSafe — Running the Local Server and Resident App

The resident app connects to a backend running on a local computer. Connect the computer and phones to the same Wi-Fi router or LAN. The router does not need an internet connection for phones to reach the server.

## Project folders

Both applications are in this repository:

```text
san-antonio-safe-public/
  backend/    # Next.js backend and web dashboard
  resident/   # Flutter resident app
```

Commands below use Windows PowerShell. Open separate terminals for the backend and Flutter app.

## 1. Prepare the computer

Install Node.js 20.9 or newer with npm, Docker Desktop with Linux containers, and Flutter with the Android SDK. Start Docker Desktop. For a physical Android phone, enable Developer options and USB debugging, then connect it by USB to install the app.

The first setup requires internet to download tools, npm/Flutter packages, and the database container image. Download these before operating without internet. Keep the installed dependencies and Docker image on the server computer.

## 2. Configure the backend

From the repository root, enter the backend folder and install its dependencies:

```powershell
cd .\backend
npm ci
ipconfig
```

Find the IPv4 address of the computer's active Wi-Fi or Ethernet adapter, for example `192.168.1.50`. Use your actual address wherever that example appears below. Avoid virtual adapters and disconnected interfaces.

Create or update `.env` in the backend folder. Preserve any existing settings you need. This example matches the database settings in `docker-compose.yml`:

```dotenv
DATABASE_URL=postgresql://san_antonio_safe:san_antonio_safe_password@localhost:5433/san_antonio_safe
BETTER_AUTH_SECRET=replace-with-a-random-secret
BETTER_AUTH_URL=http://192.168.1.50:3000
NEXT_PUBLIC_AUTH_BASE_URL=http://192.168.1.50:3000
BETTER_AUTH_TRUSTED_ORIGINS=http://192.168.1.50:3000,http://localhost:3000
```

Generate a secret and paste its output into `BETTER_AUTH_SECRET`:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Keep the secret stable between server restarts. If the LAN IP changes, update the URLs above and the app's server address. Reserving the computer's IP in the router avoids repeated changes.

## 3. Start and initialize the database

In the backend folder:

```powershell
docker compose up -d postgres
docker compose ps
```

Wait until the database is healthy, then apply the existing migrations:

```powershell
npx drizzle-kit migrate
```

For a new installation, create the reference data and demo accounts:

```powershell
npm run db:seed
```

Seeding is an initialization step; it is not needed for each server start. Default demo accounts include:

| Role | Email | Password |
| --- | --- | --- |
| Resident | resident@sanantoniosafe.test | Resident123! |
| Responder | responder@sanantoniosafe.test | Responder123! |
| Command center | command.center@sanantoniosafe.test | CommandCenter123! |
| Admin | admin@sanantoniosafe.test | Admin123! |

These defaults come from `scripts/seed.ts` and can be overridden with `SEED_*` environment variables. Change demo passwords before real use.

## 4. Run the local server

For development:

```powershell
npm run dev
```

For normal operation, build once and start the built app:

```powershell
npm run build
npm start
```

Rebuild after changing backend code or build-time settings such as `NEXT_PUBLIC_AUTH_BASE_URL`. Keep the server terminal open. The start scripts listen on `0.0.0.0:3000`, allowing other devices on the LAN to connect, and advertise a LAN discovery service.

Open the dashboard at `http://192.168.1.50:3000`. To check the API, open `http://192.168.1.50:3000/api/discovery` on the server and then in a phone browser. A successful API response on the phone confirms LAN access before configuring Flutter.

If Windows Firewall asks, allow Node.js on your private network. If the phone cannot connect, allow inbound TCP port 3000 on the private network. Check that the router does not isolate Wi-Fi clients or place the phone on an isolated guest network.

## 5. Run the resident app

In a second PowerShell terminal, starting from the repository root:

```powershell
cd .\resident
flutter pub get
flutter devices
```

For a physical phone on the same Wi-Fi, run with the server computer's IP:

```powershell
flutter run --dart-define=API_BASE_URL=http://192.168.1.50:3000
```

If Flutter lists multiple devices, add `-d DEVICE_ID` using the ID shown by `flutter devices`.

For the Android emulator:

```powershell
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000
```

For a USB-connected physical phone using port forwarding:

```powershell
adb reverse tcp:3000 tcp:3000
flutter run --dart-define=API_BASE_URL=http://127.0.0.1:3000
```

Use the resident demo account above to sign in. `API_BASE_URL` is compiled into the app; changing it requires rebuilding or rerunning the app. The current Flutter app uses this explicit URL, so configure it even though the backend advertises LAN discovery.

To make an installable APK for Wi-Fi use:

```powershell
flutter build apk --release --dart-define=API_BASE_URL=http://192.168.1.50:3000
```

The APK is created at `build\app\outputs\flutter-apk\app-release.apk` inside the Flutter project. Install it on the phone and keep the phone on the server's LAN.

## Daily startup and shutdown

After the initial setup, start Docker Desktop and run these commands in the backend folder:

```powershell
docker compose up -d postgres
npm start
```

Use `npm run dev` instead if you have not made a production build. Open the installed resident app on the same Wi-Fi. The server computer must stay awake and connected.

Press `Ctrl+C` in the server terminal to stop the backend. To stop the database:

```powershell
docker compose stop postgres
```

Database data persists in the Docker volume. Incident photos are stored in the backend's `storage` directory by default; keep both when backing up the installation.

## What works without internet

The resident app can communicate with the local backend without internet while the server and database are running and reachable. Being disconnected from the local server is different from having no internet.

The current code still has these external dependencies:

- The Flutter map screens request tiles from `tile.openstreetmap.org`; uncached map tiles need internet. Fully offline maps require local or bundled tiles.
- Firebase push notifications need internet. The Flutter app currently uses an API inbox service with push marked as unconfigured. Check alerts through the local app/API; do not rely on Firebase delivery offline.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| Phone cannot reach the server | Test `/api/discovery` in the phone browser; check IP, Wi-Fi, firewall, router client isolation, and that the server is running. |
| App tries to connect to `10.0.2.2` on a real phone | Rebuild with `API_BASE_URL` set to the server's LAN IP. `10.0.2.2` is for the Android emulator. |
| Database connection fails | Start Docker Desktop, check `docker compose ps`, and confirm `.env` uses host port `5433`. |
| Missing database tables | Apply migrations with `npx drizzle-kit migrate` in the backend folder. |
| Login fails | Confirm the database was seeded and that auth URLs/trusted origins match the LAN address. Restart after `.env` changes; rebuild after public URL changes. |
| Map is blank without internet | The current map tiles are online; local API access does not make those tiles available offline. |
| Port 3000 is already in use | Stop the other process using that port, then restart the backend. |
| LAN discovery fails but direct HTTP works | Set `$env:LAN_DISCOVERY_ENABLED = 'false'` in PowerShell before starting the backend; connect the app using its explicit server URL. |

For detailed endpoint documentation, see the backend's [Android API guide](backend/README.md).
