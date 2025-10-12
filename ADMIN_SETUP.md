# Admin Dashboard Setup Guide

## 🔐 **Secure Admin Access**

The admin dashboard now requires proper authentication instead of just a URL parameter.

## **Step 1: Create an Admin User**

### **Option A: Through Firebase Console**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your `brnno-enterprises` project
3. Go to **"Firestore Database"**
4. Create a new document in the `users` collection
5. Set the document ID to your user's UID
6. Add these fields:

   ```json
   {
     "uid": "your-user-uid",
     "email": "your-email@example.com",
     "displayName": "Your Name",
     "accountType": "provider",
     "role": "admin",
     "createdAt": "timestamp"
   }
   ```

### **Option B: Through Code (Temporary)**

Add this to your browser console after logging in:

```javascript
// Get your user ID from Firebase Auth
const user = firebase.auth().currentUser;
console.log('Your UID:', user.uid);

// Then manually create the admin user document in Firestore
```

## **Step 2: Access Admin Dashboard**

1. **Log in** to your BRNNO app with your Google account
2. **Go to**: <http://localhost:3001?admin=brnno2025>
3. **System will check** if your user has `role: 'admin'` in Firestore
4. **If admin**: Dashboard opens
5. **If not admin**: "Access denied" message

## **Step 3: Test Admin Access**

### **What Happens:**

- ✅ **Logged in + Admin role**: Dashboard opens
- ❌ **Logged in + Not admin**: "Access denied" alert
- ❌ **Not logged in**: "Please log in first" + Login modal opens

### **Console Logs:**

Check browser console for:

- "Checking admin status for user: [uid]"
- "Admin access granted" or "Access denied - not admin"

## **🔒 Security Features:**

1. **Authentication Required**: Must be logged in
2. **Role-Based Access**: Only users with `role: 'admin'` can access
3. **Real-time Auth**: Checks authentication state changes
4. **Secure URL**: Still requires `?admin=brnno2025` parameter
5. **User Profiles**: All users get profiles in Firestore

## **📊 Admin Dashboard Features:**

- **Waitlist Analytics**: Total signups, recent activity
- **User Data Table**: Names, emails, cities, preferences
- **Geographic Analysis**: Signups by Utah city
- **Service Demand**: Most wanted services
- **Booking Urgency**: How soon people want to book
- **Vehicle Types**: Customer vehicle preferences

## **🚀 Production Deployment:**

When you deploy to Vercel:

```
https://your-app.vercel.app?admin=brnno2025
```

## **👥 Adding More Admins:**

To add more admin users:

1. They must log in to your app first
2. Find their UID in Firebase Console → Authentication
3. Create/update their user document in Firestore
4. Set `role: 'admin'`

## **🔧 Troubleshooting:**

**"Access denied" message:**

- Check if user document exists in Firestore
- Verify `role` field is set to `'admin'`
- Check browser console for error details

**"Please log in first" message:**

- User needs to authenticate first
- Use Google sign-in or email/password

**Dashboard not loading:**

- Check Firestore security rules
- Verify Firebase project configuration
- Check browser console for errors

This secure admin system ensures only authorized users can access sensitive waitlist data! 🎯
