// Data storage starts clean and is populated from real usage/storage.
const data = {
    rooms: [
        { id: 101, name: 'F1-102', floor: 1, type: 'family', capacity: 3, price: 2500, status: 'available', emoji: '👨‍👩‍👧‍👦' },
        { id: 102, name: 'F1-103', floor: 1, type: 'family', capacity: 3, price: 2500, status: 'available', emoji: '👨‍👩‍👧‍👦' },
        { id: 103, name: 'F1-104', floor: 1, type: 'family', capacity: 3, price: 2500, status: 'available', emoji: '👨‍👩‍👧‍👦' },
        { id: 104, name: 'F1-105', floor: 1, type: 'family', capacity: 3, price: 2500, status: 'available', emoji: '👨‍👩‍👧‍👦' },
        { id: 105, name: 'F1-101', floor: 1, type: 'single', capacity: 2, price: 2500, status: 'available', emoji: '🧑' },
        { id: 201, name: 'F2-201', floor: 2, type: 'family', capacity: 3, price: 2500, status: 'available', emoji: '👨‍👩‍👧‍👦' },
        { id: 202, name: 'F2-202', floor: 2, type: 'family', capacity: 3, price: 2500, status: 'available', emoji: '👨‍👩‍👧‍👦' },
        { id: 203, name: 'F2-203', floor: 2, type: 'family', capacity: 3, price: 2500, status: 'available', emoji: '👨‍👩‍👧‍👦' },
        { id: 204, name: 'F2-204', floor: 2, type: 'family', capacity: 3, price: 2500, status: 'available', emoji: '👨‍👩‍👧‍👦' }
    ],
    bookings: [],
    customers: [],
    guests: [],
    diary: {},
    staff: [],
    housekeepingTasks: [],
    notifications: [],
    settings: {
        lodgeName: 'Sri Padmavati Pleasants',
        gstNumber: '33ANCPP8116B1ZF',
        taxes: { cgst: 2.5, sgst: 2.5 },
        roomCategories: ['Single', 'Double', 'Family', 'Suite'],
        backupSchedule: 'Weekly'
    },
    auditLogs: []
};

let charts = {};
let currentPriceRoom = null;
let currentRoomDetailsRoomId = null;
let liveClockTimer = null;
let firebaseEnabled = false;
let firebaseAuth = null;
let firebaseDb = null;
let firebaseStorage = null;
let checkoutReminderTimer = null;
const LODGE_GST_NUMBER = '33ANCPP8116B1ZF';
