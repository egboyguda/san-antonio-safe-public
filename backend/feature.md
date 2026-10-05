# SanAntonioSafe

**SanAntonioSafe** is an integrated mobile emergency response system designed for natural and man-made incidents in San Antonio, Northern Samar. The system aims to improve emergency communication, incident reporting, responder coordination, and public safety through a mobile application and centralized command center.

> Note: This README focuses only on the mobile app, backend, and command center features. LoRa/LoRaWAN and IoT features are excluded.

---

## Project Overview

SanAntonioSafe provides a centralized digital platform where residents can report emergencies, receive alerts, and track incident status. Local responders and administrators can monitor reports, manage alerts, assign response teams, and coordinate emergency operations through a command center dashboard.

The system is intended to support emergency situations such as:

- Typhoons
- Floods
- Fires
- Accidents
- Medical emergencies
- Man-made incidents
- Other community safety concerns

---

## Main Objectives

- Provide real-time emergency alerts to residents.
- Allow residents to report incidents with GPS location.
- Help responders manage and track emergency reports.
- Improve communication between the community and local authorities.
- Support faster emergency response and better incident coordination.
- Evaluate the system based on response time, usability, and reliability.

---

## Core Features

## 1. Resident Mobile App

The resident mobile app is used by citizens to receive alerts and report emergencies.

### Features

#### User Registration and Login
Residents can create an account and log in securely.

Possible user information:

- Full name
- Mobile number
- Barangay
- Address
- Emergency contact
- Password

#### Emergency SOS Button
A large emergency button allows users to send a quick distress signal.

When pressed, the system can send:

- User information
- Current GPS location
- Date and time
- Emergency category
- Optional message

#### Incident Reporting
Residents can report different types of emergencies.

Example categories:

- Fire
- Flood
- Accident
- Medical emergency
- Crime or public safety issue
- Typhoon-related incident
- Other emergency

Each report may include:

- Incident type
- Description
- GPS location
- Barangay
- Photo attachment
- Date and time submitted

#### GPS Location Capture
The app automatically captures the user's location during an emergency report.

Saved location details may include:

- Latitude
- Longitude
- Location accuracy
- Timestamp
- Approximate address or barangay

#### Photo Attachment
Users can upload an image to help responders verify the situation.

Examples:

- Flooded area
- Fire incident
- Road accident
- Damaged infrastructure

#### Real-Time Emergency Alerts
Residents can receive announcements and emergency warnings from the command center.

Example alerts:

- Flood warning
- Typhoon advisory
- Fire alert
- Evacuation notice
- Road closure
- Missing person alert
- General safety announcement

#### Incident Status Tracking
Residents can track the progress of their submitted reports.

Suggested status flow:

```text
Pending → Verified → Responding → Resolved
```

#### Emergency Contacts
The app can display important local emergency contacts.

Examples:

- MDRRMO
- Police station
- Fire station
- Health center
- Coast Guard
- Barangay officials
- Rescue team

#### Evacuation Center Directory
The app can show available evacuation centers.

Information may include:

- Evacuation center name
- Address
- Barangay
- Capacity
- Contact person
- Map location

#### Report History
Users can view their previously submitted incident reports.

Displayed information:

- Incident type
- Date reported
- Status
- Location
- Responder remarks

---

## 2. Command Center Dashboard this has a android app also

The command center dashboard is used by local responders, administrators, and authorized LGU personnel.

### Features

#### Dashboard Overview
Displays a quick summary of emergency activity.

Example dashboard cards:

- Total reports
- Pending reports
- Active incidents
- Resolved incidents
- Alerts sent
- Available responders

#### Live Incident Map
Shows incident reports on a map using location pins.

Suggested map markers:

- Red: urgent or active incident
- Yellow: pending verification
- Blue: responder assigned
- Green: resolved incident

#### Incident Management
Authorized staff can view, verify, update, and manage reports.

Possible actions:

- View incident details
- Verify report
- Assign responder
- Update status
- Add remarks
- Mark as resolved
- Archive report

#### Responder Assignment
The command center can assign incidents to available responders.

Assignment details may include:

- Assigned responder or team
- Assigned vehicle
- Estimated response time
- Notes or instructions

#### Status Workflow
Recommended incident workflow:

```text
Pending → Verified → Assigned → Responding → Resolved → Archived
```

#### Alert Broadcasting
Admins can send emergency alerts to residents.

Alert targeting options:

- All users
- Specific barangay
- Specific incident area
- Specific user group

Alert information may include:

- Alert title
- Alert message
- Alert type
- Severity level
- Target barangay
- Date and time

#### Barangay-Based Alerts
The system can send alerts only to affected barangays to avoid unnecessary panic.

Example:

```text
Send flood warning only to Barangay Ward 1 and nearby areas.
```

#### Incident Verification
The command center can verify reports before dispatching responders.

Verification can use:

- User details
- GPS location
- Photo evidence
- Similar reports nearby
- Call-back confirmation

#### Analytics and Reports
The dashboard can generate reports for planning and evaluation.

Possible analytics:

- Number of incidents per barangay
- Most common incident types
- Average response time
- Number of resolved incidents
- Monthly incident trends
- Responder performance summary

#### Audit Logs
The system records important administrative actions.

Examples:

- User login
- Incident status update
- Alert sent
- Responder assigned
- Report archived

---

## 3. Admin Management Features

Admin users manage system data and user access.

### Features

#### User Management
Admins can manage different types of users.

User roles:

- Resident
- Responder
- Barangay officer
- Command center staff
- Administrator

#### Role-Based Access Control
Each user role has different permissions.

Example:

| Role | Access |
|---|---|
| Resident | Submit reports, receive alerts, view own reports |
| Responder | View assigned incidents, update response status |
| Barangay Officer | View barangay reports and alerts |
| Command Center Staff | Manage incidents and send alerts |
| Admin | Manage users, settings, reports, and system data |

#### Barangay Management
Admins can manage barangay records.

Barangay data may include:

- Barangay name
- Contact person
- Contact number
- Location
- Assigned responders

#### Emergency Contact Management
Admins can update emergency contact information.

#### Evacuation Center Management
Admins can add, edit, or remove evacuation centers.

#### Alert Template Management
Admins can create reusable alert templates.

Examples:

- Typhoon warning template
- Flood warning template
- Fire alert template
- Evacuation notice template
- Medical emergency advisory

#### System Settings
Admins can configure general system settings.

Examples:

- Alert categories
- Incident categories
- Severity levels
- Notification settings
- Response status labels

---

## Suggested System Modules

### Mobile App Module
For residents and responders.

Main functions:

- Register and log in
- Submit emergency reports
- Send GPS location
- Receive alerts
- View report status
- Access emergency contacts
- View evacuation centers

### Web Dashboard Module
For command center staff and administrators.

Main functions:

- Monitor incident reports
- View incident map
- Assign responders
- Send alerts
- Manage users
- Generate reports

### Backend API Module
Handles the communication between the mobile app, dashboard, and database.

Main functions:

- Authentication
- Incident report processing
- GPS data storage
- Alert management
- Notification delivery
- Role-based access control

### Database Module
Stores all system records.

Main data:

- Users
- Barangays
- Incident reports
- Emergency alerts
- Responders
- Evacuation centers
- Status logs
- Audit logs

---

## Suggested Technology Stack

### Mobile App
Recommended options:

- Flutter
- React Native
- Kotlin Android

Suggested choice:

```text
Flutter
```

Reason:

- Good for Android
- Can support iOS in the future
- Fast UI development
- Good plugin support for GPS and notifications

### Web Dashboard
Recommended options:

- Laravel Blade
- React.js
- Vue.js

### Backend
Recommended options:

- Laravel
- Node.js with Express or NestJS
- Django or FastAPI

Suggested choice for thesis implementation:

```text
Laravel or Node.js
```

### Database
Recommended options:

- MySQL
- PostgreSQL
- PostgreSQL with PostGIS for map features

Suggested choice:

```text
PostgreSQL with PostGIS
```

Reason:

- Good for storing GPS coordinates
- Supports location-based queries
- Useful for incident mapping

### Notifications
Recommended service:

```text
Firebase Cloud Messaging
```

Used for:

- Emergency alerts
- Incident status updates
- Responder assignment notifications

### Maps
Recommended options:

- OpenStreetMap with Leaflet
- Google Maps API

Suggested choice:

```text
OpenStreetMap + Leaflet
```

Reason:

- Free and lightweight
- Good for thesis prototype
- Useful for dashboard map display

---

## Suggested Database Tables

```text
users
roles
barangays
incident_categories
incident_reports
incident_status_logs
responders
responder_assignments
emergency_alerts
alert_recipients
evacuation_centers
emergency_contacts
notifications
audit_logs
```

---

## Example Incident Report Fields

```text
id
user_id
incident_category_id
title
description
latitude
longitude
barangay_id
photo_path
severity_level
status
assigned_responder_id
reported_at
resolved_at
created_at
updated_at
```

---

## Example Alert Fields

```text
id
title
message
alert_type
severity_level
target_barangay_id
sent_by
sent_at
created_at
updated_at
```

---

## Suggested Incident Statuses

```text
Pending
Verified
Assigned
Responding
Resolved
Archived
Rejected
```

---

## Suggested Severity Levels

```text
Low
Moderate
High
Critical
```

---

## Minimum Viable Product

For the first working version, focus on these features:

### Resident App

- Register and log in
- Submit emergency report
- Capture GPS location
- Upload photo
- Receive emergency alerts
- View report status

### Command Center Dashboard

- Admin login
- View incident reports
- View incident map
- Update incident status
- Assign responders
- Send emergency alerts

### Backend

- User authentication
- Incident report API
- Alert API
- Notification API
- Status update API

---

## Future Enhancements

Possible features for future versions:

- SMS fallback for emergency reporting
- Offline report saving and auto-sync
- Multi-language support
- Responder mobile app
- Route guidance for responders
- Advanced analytics
- Heatmap of frequent incident areas
- Integration with official weather advisories
- Public safety announcement board
- QR-based resident verification

---

## Evaluation Criteria

The system can be evaluated using the following:

### Response Time
Measures how fast the command center receives and responds to a report.

### Usability
Measures how easy the system is for residents and responders to use.

### Reliability
Measures whether reports and alerts are delivered successfully.

### GPS Accuracy
Measures how close the captured location is to the actual incident location.

### Notification Speed
Measures how quickly residents receive alerts after they are sent.

---

## Recommended Development Phases

### Phase 1: Planning and Design
- Define system requirements
- Create use case diagram
- Create database design
- Create UI wireframes
- Plan incident workflow

### Phase 2: Mobile App Development
- Build login and registration
- Build incident reporting
- Add GPS capture
- Add alert receiving
- Add report history

### Phase 3: Backend Development
- Create APIs
- Set up authentication
- Store incident reports
- Manage alerts
- Connect notification service

### Phase 4: Command Center Development
- Build admin dashboard
- Add incident list
- Add map view
- Add responder assignment
- Add alert broadcast feature

### Phase 5: Testing and Evaluation
- Test GPS accuracy
- Test report submission
- Test notification delivery
- Test dashboard workflow
- Conduct user evaluation

---

## Project Goal

The main goal of SanAntonioSafe is to make emergency reporting and response faster, more organized, and more reliable for San Antonio, Northern Samar. By combining a resident mobile app, GPS-based incident reporting, real-time alerts, and a centralized command center, the system can help improve community safety and disaster response coordination.
