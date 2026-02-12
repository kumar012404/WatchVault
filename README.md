# KuroTracker - Premium Anime Tracker

A modern, dark-themed anime tracker built with HTML, CSS, JavaScript, and Firebase Firestore.

## 🚀 Features
- **Modern Dark UI**: Glassmorphism and premium aesthetics.
- **Real-time Sync**: Uses Firebase Firestore for live updates.
- **Mobile Responsive**: Works perfectly on phones and tablets.
- **Continue Watching**: Highlights the latest updated anime.
- **Progress Visualization**: Visual indicator for episode progress.
- **CRUD Operations**: Add, Edit, and Delete anime from your cloud database.

---

## 🛠️ Step-by-Step Setup Instructions

To get this app working with your own database, follow these steps:

### 1. Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** and give it a name (e.g., "AnimeTracker").
3. (Optional) Disable Google Analytics for a faster setup.

### 2. Set Up Firestore Database
1. In the sidebar, click on **Firestore Database**.
2. Click **Create database**.
3. Choose **Start in test mode** (this allows you to read/write data immediately).
    - *Note: For production, you should set proper security rules.*
4. Choose a location closest to you and click **Enable**.

### 3. Register your Web App
1. On the Project Overview page, click the **Web icon (</>)** to add an app.
2. Give it a nickname and click **Register app**.
3. You will see a `firebaseConfig` object. It looks like this:
   ```javascript
   const firebaseConfig = {
     apiKey: "...",
     authDomain: "...",
     projectId: "...",
     // ...
   };
   ```

### 4. Connect the App
1. Open `index.html` in your code editor.
2. Locate the section marked `<!-- Firebase Config - EDIT THIS SECTION -->`.
3. Replace the placeholder values in the `window.firebaseConfig` object with your actual keys from Step 3.

### 5. Run the App
- Since this is a pure frontend app, you can simply open `index.html` in your browser.
- **Hosting on GitHub Pages**:
  1. Push these files to a GitHub repository.
  2. Go to **Settings > Pages**.
  3. Select the `main` branch as the source and click **Save**.
  4. Your app will be live at `https://yourusername.github.io/your-repo-name/`.

---

## 🎨 Design System
- **Background**: Deep Space (#0a0b10)
- **Primary Accent**: Neon Pink (#ff2e63)
- **Secondary Accent**: Cyan (#08d9d6)
- **Typography**: Outfit (via Google Fonts)

## 📄 License
MIT
