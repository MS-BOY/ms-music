
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAvaWUe61dMllz5LXafDXn28sMyPB2a1N8",
  authDomain: "msq1-d7b2b.firebaseapp.com",
  projectId: "msq1-d7b2b",
  storageBucket: "msq1-d7b2b.firebasestorage.app",
  messagingSenderId: "639083662846",
  appId: "1:639083662846:web:13aea7e536da9a51dfc4af",
  measurementId: "G-J5NW11PKTP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
