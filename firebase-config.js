// firebase-config.js - النسخة الموحدة
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc, deleteDoc, getDocs, query, where, addDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// تكوين Firebase الرئيسي (نفس التكوين المستخدم في Python)
const firebaseConfig = {
    apiKey: "AIzaSyCarL9HJ2A6d_RukqQNKtlIMyswT0phHoM",
    authDomain: "mcs-control-panel.firebaseapp.com",
    projectId: "mcs-control-panel",
    storageBucket: "mcs-control-panel.firebasestorage.app",
    messagingSenderId: "967898281194",
    appId: "1:967898281194:web:6742c63f81254ab00c1393",
    measurementId: "G-C70B24NCD2"
};

// Initialize Firebase
let app;
let auth;
let db;

try {
    app = initializeApp(firebaseConfig, "mcs-control-panel-web");
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("✅ Firebase initialized successfully in web");
} catch (error) {
    console.error("❌ Firebase initialization error:", error);
    
    // محاولة التهيئة باسم مختلف
    try {
        app = initializeApp(firebaseConfig, "mcs-control-panel-web-backup");
        auth = getAuth(app);
        db = getFirestore(app);
        console.log("✅ Firebase initialized with backup name");
    } catch (error2) {
        console.error("❌ Backup initialization also failed:", error2);
    }
}

const provider = new GoogleAuthProvider();

// إضافة نطاقات Google الإضافية
provider.addScope('email');
provider.addScope('profile');

export { 
    auth, 
    provider, 
    signInWithPopup, 
    db, 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    updateDoc, 
    deleteDoc, 
    getDocs, 
    query, 
    where, 
    addDoc 
};