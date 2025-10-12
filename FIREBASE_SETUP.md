# Firebase Setup Guide for BRNNO Waitlist

## 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Name it "brnno-waitlist" (or your preferred name)
4. Enable Google Analytics (optional)
5. Create the project

## 2. Enable Firestore Database

1. In your Firebase project, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (for now)
4. Select a location (choose one close to Utah)
5. Click "Done"

## 3. Get Firebase Configuration

1. Go to Project Settings (gear icon)
2. Scroll down to "Your apps"
3. Click "Add app" and select the web icon (`</>`)
4. Register your app with a nickname like "BRNNO Waitlist"
5. Copy the Firebase configuration object

## 4. Update Environment Variables

Copy `.env.example` to `.env` and update with your actual Firebase values:

```bash
cp .env.example .env
```

Then edit `.env` with your Firebase configuration:

```env
REACT_APP_FIREBASE_API_KEY=your-actual-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-actual-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=your-actual-app-id
REACT_APP_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

The `src/firebase.js` file will automatically use these environment variables.

## 5. Set Up Firestore Security Rules

In Firestore Database > Rules, replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to waitlist collection
    match /waitlist/{document} {
      allow read, write: if true;
    }
  }
}
```

## 6. Test the Integration

1. Start your development server: `npm start`
2. Open the waitlist modal
3. Fill out the form and submit
4. Check your Firestore database to see the new document

## 7. View Analytics (Optional)

Create a simple admin page by importing the AdminDashboard component:

```javascript
import AdminDashboard from './AdminDashboard';

// Use it in a route or as a separate page
<AdminDashboard />
```

## 8. Production Considerations

Before going live:

1. **Update Security Rules**: Restrict access to authenticated users only
2. **Enable Authentication**: Add user authentication for admin access
3. **Set up Monitoring**: Enable Firebase monitoring and alerts
4. **Backup Strategy**: Set up automated backups
5. **Rate Limiting**: Consider implementing rate limiting for form submissions

## Data Structure

Each waitlist signup creates a document in the `waitlist` collection with:

```javascript
{
  name: "John Doe",
  email: "john@example.com",
  phone: "(555) 123-4567",
  city: "Salt Lake City",
  zipCode: "84101",
  vehicleType: "suv",
  servicesInterested: ["Full Detail", "Interior Detailing"],
  howSoon: "asap",
  timestamp: Timestamp,
  status: "pending",
  referralCode: "john1234",
  referredBy: null,
  referralCount: 0
}
```

## Analytics Available

The admin dashboard shows:

- Total signups
- Recent signups (last 24 hours)
- Signups by city
- Most wanted services
- Booking urgency levels
- Vehicle type preferences

This data will help you:

- Identify which Utah cities to launch in first
- Understand service demand
- Plan your provider recruitment strategy
- Track referral program effectiveness
