// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "",
  authDomain: "urlredirect-e2640.firebaseapp.com",
  projectId: "urlredirect-e2640",
  storageBucket: "urlredirect-e2640.appspot.com",
  messagingSenderId: "841657385917",
  appId: "1:841657385917:web:93e39dace4204f649d88d4",
  measurementId: "G-T6TF32Y4FF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
