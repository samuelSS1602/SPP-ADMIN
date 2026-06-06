# Sri Padmavati Pleasant - Hotel Management System

A professional, modern hotel management system designed for Sri Padmavati Pleasant Lodge. This system helps manage bookings, rooms, guests, check-ins/check-outs, ID verification with webcam integration, and billing.

## Features

### 📊 Dashboard
- Real-time metrics for today's bookings, occupancy rate, check-ins, and revenue
- Weekly revenue chart
- Room status overview
- Recent bookings table

### 📅 Booking Management
- Create new bookings online and offline
- View all bookings with detailed information
- Filter bookings by status and date
- Edit or cancel existing bookings
- Automatic room assignment

### 🚪 Room Management
- View all rooms with their current status
- Room types: Deluxe Single, Deluxe Double, Suite
- Real-time status updates (Occupied, Available, Maintenance)
- Quick actions for room management
- Housekeeping coordination

### 👥 Guest Management
- Centralized guest database
- Guest history tracking
- Current and past guest information
- Contact details and identification records
- Guest preferences and notes

### 🔐 Check-In / Check-Out
- Quick check-in process
- Pending check-ins and check-outs list
- Automatic room assignment
- Check-out billing integration
- Room status updates

### 📸 ID Verification & Guest Photography
- **Webcam Integration**: Live camera feed for capturing guest photos
- **Dual Capture System**: Capture both guest photo and ID proof
- **Photo Management**: View, download, and delete captured images
- **Guest Details**: Link photos to guest information
- **ID Verification**: Support for:
  - Aadhar Card
  - Passport
  - Driving License
  - Voter ID
  - PAN Card

### 💳 Billing & Invoices
- Automatic invoice generation
- Payment status tracking
- Invoice history
- Download invoices
- Tax calculations

### 📊 Reports & Analytics
- Monthly revenue reports
- Guest statistics
- Room performance metrics
- Occupancy analysis
- Customizable date ranges

## File Structure

```
sri-padmavati-pleasant/
├── index.html          # Main HTML file (all pages included)
├── styles.css          # Complete styling
├── script.js           # All JavaScript functionality
└── README.md           # This file
```

## How to Use

### 1. Setup
1. Download all three files: `index.html`, `styles.css`, and `script.js`
2. Place them in the same directory
3. Open `index.html` in a modern web browser
   - Chrome (recommended)
   - Firefox
   - Safari
   - Edge

**Note**: For local use, you can simply open `index.html` directly. No server required!

### 2. Basic Navigation
- **Left Sidebar**: Click any menu item to navigate to different sections
- **Dashboard**: Overview of daily operations
- **Bookings**: Manage all reservations
- **Rooms**: View and manage room status
- **Guests**: Guest database and history
- **Check-In/Out**: Process guest arrivals and departures
- **ID Verification**: Capture guest photos and ID proofs
- **Billing**: Generate invoices
- **Reports**: View analytics

### 3. Creating a New Booking
1. Click "Bookings" in the sidebar
2. Click "+ New Booking" button
3. Fill in guest details:
   - Guest name
   - Email address
   - Phone number
   - Select room
   - Check-in and check-out dates
   - Number of guests
   - Special requests (optional)
4. Click "Book Room"
5. Confirmation message appears

### 4. Using Webcam for ID Verification
1. Click "ID Verification" in the sidebar
2. Click "Start Camera" button
   - Browser will ask for camera permission - **Click ALLOW**
3. Position guest in frame
4. Click "Capture Photo" to take picture
5. Repeat for ID proof
6. Enter guest details in the form:
   - Guest name
   - ID type
   - ID number
   - Phone number
   - Email (optional)
   - Address (optional)
7. Click "Verify & Save"
8. Photos are saved and linked to guest profile

### 5. Processing Check-In
1. Click "Check-In / Check-Out" in the sidebar
2. Under "Pending Check-Ins", click "Process Check-In"
3. Fill in actual check-in time
4. Click "Confirm Check-In"
5. Guest room status updates automatically

### 6. Processing Check-Out
1. Click "Check-In / Check-Out" in the sidebar
2. Under "Pending Check-Outs", click "Process Check-Out"
3. Final bill amount shown
4. Click to process payment
5. Room marked as ready for housekeeping

### 7. Generating Reports
1. Click "Reports" in the sidebar
2. Select month for report
3. Click "Generate"
4. View statistics:
   - Total revenue
   - Number of bookings
   - Average room rate
   - Occupancy percentage
   - Guest statistics
   - Room performance

## Webcam Feature Details

### Requirements for Webcam
- **HTTPS or Local File**: Works in both secure HTTPS and local file contexts
- **Modern Browser**: Chrome, Firefox, Safari, or Edge
- **Permission**: User must grant camera access when prompted
- **Device**: Webcam or built-in camera required

### Webcam Tips
- Ensure good lighting for better photo quality
- Position guest directly in front of camera
- Keep camera clean and at eye level
- For ID proof, place document flat and ensure all text is visible
- Capture multiple angles if needed

## Data Storage

### Local Storage
- **Backup Cache**: Uses browser local storage as a fallback cache
- **Data Persistence**: Bookings and customer updates are persisted locally
- **Realtime Sync**: Firebase can be enabled for cloud sync and authentication

### For Production Use
To connect with a real database:
1. Backend database (MySQL, PostgreSQL, MongoDB)
2. API endpoint (Node.js, Django, PHP)
3. Modify JavaScript to send data to your API
4. Implement authentication and security

## Customization

### Change Hotel Name
1. Open `index.html`
2. Find "Sri Padmavati Pleasant" 
3. Replace with your hotel name
4. Update tagline if needed

### Adjust Room Details
1. Open `script.js`
2. Find the room array around line 950
3. Add or modify room objects with:
   - Room ID
   - Room type
   - Room rate per night

### Change Colors
1. Open `styles.css`
2. Find `:root` section (top of file)
3. Modify CSS variables:
   - `--primary-color`: Main theme color
   - `--accent-color`: Highlight color
   - `--success-color`: Success messages
   - `--danger-color`: Warning/delete actions

### Add Room Types
1. Open `script.js`
2. Modify the room selection dropdown
3. Add new options with unique room numbers

## Keyboard Shortcuts

- **Ctrl/Cmd + K**: Focus search bar
- **Escape**: Close modals and notifications

## Browser Compatibility

| Browser | Support |
|---------|---------|
| Chrome  | ✅ Full |
| Firefox | ✅ Full |
| Safari  | ✅ Full |
| Edge    | ✅ Full |
| IE 11   | ❌ Not supported |

## Performance

- **Fast Loading**: All files load instantly
- **Responsive**: Works on desktop, tablet, mobile
- **Lightweight**: Total size under 500KB
- **No Dependencies**: Pure HTML, CSS, JavaScript

## Security Considerations

### Current Application Mode
- Data stored in browser's local storage
- No encryption
- Firebase authentication supported

### For Production Use
Implement:
1. **SSL/HTTPS**: Encrypt all data in transit
2. **Authentication**: Login system with secure passwords
3. **Authorization**: Role-based access control
4. **Data Encryption**: Encrypt sensitive data at rest
5. **Audit Logs**: Track all system activities
6. **Backup**: Regular database backups
7. **Rate Limiting**: Prevent abuse
8. **Input Validation**: Server-side validation of all inputs

## Troubleshooting

### Webcam Not Working
1. Check browser permissions
2. Ensure camera isn't used by another app
3. Try different browser
4. Restart browser
5. Check camera hardware

### Files Won't Load
1. Ensure all three files in same directory
2. Check file extensions (.html, .css, .js)
3. Clear browser cache
4. Try different browser

### Data Not Saving
1. Browser local storage might be full
2. Private/Incognito mode clears data on close
3. Check browser storage settings
4. Try clearing cache and reload

### Notifications Not Appearing
- Enable JavaScript in browser settings
- Check browser console for errors

## Contact & Support

For Sri Padmavati Pleasant:
📞 Support: +91 948 888 6101

## Future Enhancements

- [ ] SMS/Email notifications to guests
- [ ] Payment gateway integration
- [ ] Loyalty program management
- [ ] Staff management system
- [ ] Multi-language support
- [ ] Advanced analytics
- [ ] Inventory management
- [ ] Housekeeping tracking
- [ ] Guest feedback system
- [ ] PMS integration with OTAs

## License

This hotel management system is provided for use by Sri Padmavati Pleasant.

## Notes

- This is a frontend application with optional Firebase real-time integration
- For production, connect to a real database
- Always validate data on the server side
- Regular backups are essential
- Keep software and browsers updated
- Test thoroughly before going live

---

**Version**: 1.0
**Last Updated**: March 2026
**Developed for**: Sri Padmavati Pleasant Lodge, Coimbatore
