# Firestore Security Rules

## 🔐 **Production-Ready Security Rules**

Update your Firestore rules in Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Waitlist collection - allow public read, authenticated write
    match /waitlist/{document} {
      allow read: if true; // Public can read for count/analytics
      allow write: if request.auth != null; // Only authenticated users can write
    }
    
    // Users collection - only authenticated users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Admin access - only users with admin role
    match /users/{userId} {
      allow read, write: if request.auth != null && 
        (request.auth.uid == userId || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }
  }
}
```

## 🚨 **Alternative: More Restrictive Rules**

If you want more security, use these rules instead:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Waitlist collection - authenticated users only
    match /waitlist/{document} {
      allow read, write: if request.auth != null;
    }
    
    // Users collection - users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 📋 **Rule Explanations:**

### **Waitlist Collection:**

- `allow read: if true` - Anyone can read waitlist data (for public count)
- `allow write: if request.auth != null` - Only logged-in users can add to waitlist

### **Users Collection:**

- `request.auth.uid == userId` - Users can only access their own data
- Admin role check for cross-user access

## 🔧 **How to Update Rules:**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your `brnno-enterprises` project
3. Go to **"Firestore Database"**
4. Click **"Rules"** tab
5. Replace the existing rules with the code above
6. Click **"Publish"**
7. Wait 30 seconds for rules to deploy

## 🧪 **Test After Update:**

1. **Waitlist banner** should show real count (no more permission errors)
2. **Admin dashboard** should work for authenticated admin users
3. **Regular users** can sign up to waitlist
4. **Non-authenticated users** can see waitlist count but can't write

## 🚀 **Production Considerations:**

- **Public read access** allows the waitlist count to work
- **Authenticated write** prevents spam signups
- **User data protection** ensures privacy
- **Admin role checking** provides secure admin access

These rules balance security with functionality for your BRNNO marketplace! 🎯
