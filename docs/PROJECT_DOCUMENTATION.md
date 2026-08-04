# Sri Padmavati Pleasants Admin Documentation

## 1. Project Overview

Sri Padmavati Pleasants Admin is a front-desk and lodge management dashboard for handling bookings, room status, guest records, payments, invoices, and basic analytics. The application is built as a lightweight static web app using HTML, CSS, and JavaScript.

The project is designed for a small hotel or lodge operation where staff can quickly:
- manage room availability and occupancy
- create and track bookings
- view guest information
- issue receipts and billing details
- review basic reports and audit activity

## 2. Main Features

### Dashboard
- overview of room occupancy and booking activity
- metrics for available and occupied rooms
- simple analytics and activity summary

### Booking Management
- create new bookings
- view booking logs
- filter by status and date
- checkout or cancel bookings

### Room Control
- view room states such as available, occupied, maintenance, or cleaning
- manage room status manually

### Diary and Room Scheduling
- daily room diary for room-level notes and occupancy planning

### Billing and Receipts
- invoice-style receipt view
- billing adjustments such as discounts and extras
- payment status tracking

### Guest and Settings Modules
- guest-related views
- audit and settings screens for operational configuration

## 3. Technology Stack

- HTML5 for the application structure
- CSS3 for layout, styling, and responsive design
- Vanilla JavaScript for app logic and interactivity
- Chart.js for charts and analytics visuals
- SheetJS (xlsx) for Excel-style export functionality
- Local storage and IndexedDB for browser-side persistence
- Optional Firebase integration for authentication and cloud sync

## 4. Project Structure

```text
.
├── index.html           # Main application shell and UI markup
├── styles.css           # Global styling and UI theme
├── script.js            # Core app logic and dashboard functions
├── booking.js           # Booking-related logic
├── receipt.js           # Receipt and invoice rendering logic
├── README.md            # Short project overview
├── QUICK_START.md       # Quick usage notes
├── SETUP_INSTRUCTIONS.txt
├── logo - Copy.jpeg     # Branding asset
├── WhatsApp Image ...jpeg  # Branding asset
└── docs/                # Project documentation
```

## 5. How the App Works

### Entry Point
The application starts from [index.html](../index.html). The main UI is rendered directly in the browser without a framework.

### UI Logic
- [script.js](../script.js) contains the core dashboard features, room actions, booking flows, and UI state updates.
- [booking.js](../booking.js) handles booking creation, filters, and booking lifecycle operations.
- [receipt.js](../receipt.js) handles invoice/receipt generation and billing UI.

### Data Handling
The app stores data in the browser using:
- localStorage for simple app state
- IndexedDB for booking photo storage

This makes the app easy to run locally while still supporting optional cloud syncing through Firebase.

## 6. Setup Instructions

### Option 1: Open Locally
1. Open the project folder in your browser.
2. Double-click [index.html](../index.html) or open it with a local web server.
3. The dashboard will load in the browser.

### Option 2: Use a Local Web Server
A simple local web server is recommended for better browser compatibility.

Example with Python:
```bash
python -m http.server 8000
```

Then open:
```text
http://localhost:8000/
```

## 7. Usage Guide

### Logging In
The interface includes a login screen. In local usage, the app typically runs through the main dashboard after the UI is loaded.

### Creating a Booking
1. Open the booking section.
2. Enter guest details.
3. Select a room.
4. Choose check-in and check-out dates.
5. Submit the booking.

### Managing Rooms
- use the room control view to update room occupancy state
- keep the room diary updated for daily operations

### Generating Receipts
- open a booking and use the receipt view to produce billing details
- update discounts, extra bed charges, and extras as required

## 8. Configuration Notes

### Firebase (Optional)
The project includes Firebase initialization references in [index.html](../index.html). If Firebase is configured, the app can support authentication and cloud syncing.

### Images and Media
The app uses local image assets such as the lodge logo and guest verification images.

## 9. Customization

You can customize the app by editing:
- [index.html](../index.html) for page content and layout structure
- [styles.css](../styles.css) for visual theme and design
- [script.js](../script.js) for behavior and data logic
- [booking.js](../booking.js) for booking workflows
- [receipt.js](../receipt.js) for invoice behavior

## 10. Deployment Notes

Because the application is static, it can be deployed to:
- GitHub Pages
- Netlify
- Vercel
- any static hosting provider

For production deployments, you may want to add:
- a secure backend
- real database storage
- authentication and authorization
- file upload security
- stronger backup and audit practices

## 11. Troubleshooting

### App does not load
- ensure all project files are present in the same folder
- open the app from a browser using a local web server if needed

### Styles look broken
- verify that [styles.css](../styles.css) is present and linked correctly

### Booking data is missing
- confirm browser storage permissions and clear stale local data if needed

## 12. Summary

This project is a practical hotel/lodge management dashboard for front-desk operations. It focuses on simplicity, speed, and local deployment while still offering room for future enhancements such as cloud storage, stronger authentication, and a backend API.
