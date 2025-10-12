# 🔍 Debug White Screen of Death

## 🚨 **Common Causes & Solutions:**

### **1. Check Browser Console**

Open browser dev tools (F12) and look for:

- ❌ **JavaScript errors** (red text)
- ❌ **Network errors** (failed requests)
- ❌ **Firebase errors** (connection issues)

### **2. Environment Variables Missing**

If Firebase variables aren't set in Vercel:

- ❌ App crashes on Firebase initialization
- ❌ White screen with no error display

### **3. Build Issues**

Check if the build completed successfully:

- ✅ Look for build logs in Vercel dashboard
- ✅ Check if `dist` folder has files

### **4. Firebase Configuration**

The app might be trying to connect to Firebase before variables are loaded.

## 🔧 **Quick Fixes:**

### **Fix 1: Add Error Boundary**

Add this to catch and display errors:

```javascript
// In your main component
React.useEffect(() => {
  window.addEventListener('error', (e) => {
    console.error('App Error:', e.error);
    document.body.innerHTML = `
      <div style="padding: 20px; font-family: Arial;">
        <h1>App Error</h1>
        <p>Error: ${e.error.message}</p>
        <p>Check console for details</p>
      </div>
    `;
  });
}, []);
```

### **Fix 2: Check Environment Variables**

In Vercel dashboard:

1. Go to Project Settings
2. Environment Variables
3. Make sure ALL Firebase variables are set
4. Redeploy after adding variables

### **Fix 3: Test Locally First**

```bash
npm run build
npm install -g serve
serve -s dist
```

### **Fix 4: Check Network Tab**

- Look for failed requests to Firebase
- Check if environment variables are loading
- Verify Firebase connection

## 🧪 **Debug Steps:**

1. **Open browser console** (F12)
2. **Look for error messages** (red text)
3. **Check Network tab** for failed requests
4. **Try incognito mode** to rule out cache issues
5. **Check Vercel build logs** for errors

## 🚀 **Quick Test:**

Try accessing your deployed URL and check:

- Does the page load at all?
- Any console errors?
- Network requests failing?
- Firebase connection working?

Let me know what errors you see in the console!
