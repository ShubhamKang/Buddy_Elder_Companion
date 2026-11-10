// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD0DH1NwY46fGKN1eSC-knTt0a43PAtk-Q",
  authDomain: "buddy-86007.firebaseapp.com",
  projectId: "buddy-86007",
  storageBucket: "buddy-86007.appspot.com",
  messagingSenderId: "493603515864",
  appId: "1:493603515864:web:129ac319ce84a1381956ad",
  measurementId: "G-C8ZM9ZYHFF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Configure storage for CORS
const storageConfig = {
  maxUploadRetryTime: 60000,
  maxOperationRetryTime: 60000
};

export { db, storage, auth };
export default app;
