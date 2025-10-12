# Quick Firestore Rules Fix

## 🚨 **Immediate Fix for Google Sign-in**

Go to Firebase Console → Firestore Database → Rules and replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write waitlist
    match /waitlist/{document} {
      allow read, write: if request.auth != null;
    }
    
    // Allow authenticated users to read/write users collection
    match /users/{document} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 🔧 **Steps:**

1. **Copy the rules above**
2. **Go to Firebase Console** → Firestore Database → Rules
3. **Replace existing rules** with the code above
4. **Click "Publish"**
5. **Wait 30 seconds** for deployment

## 🧪 **Test After Update:**

1. **Refresh your app**
2. **Try Google sign-in again**
3. **Should work without permission errors**
4. **Then create admin user document**

## 📋 **What This Fixes:**

- ✅ Google sign-in will work
- ✅ User documents can be created
- ✅ Waitlist signups will work
- ✅ Admin dashboard will work

The Cross-Origin warnings are just browser security warnings and won't block functionality.
