import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC98jmzhidmuuiOZVQorrj-EZKgpdje8oI",
  authDomain: "milano-ef597.firebaseapp.com",
  projectId: "milano-ef597",
  storageBucket: "milano-ef597.firebasestorage.app",
  messagingSenderId: "101910591701",
  appId: "1:101910591701:web:a88c515402385487904a5c",
  measurementId: "G-BSTEDFN4CP"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut };