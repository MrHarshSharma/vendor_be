// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider} from "firebase/auth";
import {getFirestore} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBh31YwebUDWQjMnIe_dD_ZgV2RQMPC4Bc",
  authDomain: "vendor-ad50b.firebaseapp.com",
  projectId: "vendor-ad50b",
  storageBucket: "vendor-ad50b.appspot.com",
  messagingSenderId: "541612049057",
  appId: "1:541612049057:web:38b10b76adec6e44bea6e0",
  measurementId: "G-NEX6DVFKWP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();;
export default app;
