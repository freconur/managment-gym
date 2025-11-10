// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCqKesb5M9e0hDGn2j7VFZ7-jVpA1LzeAs",
  authDomain: "managment-gym.firebaseapp.com",
  projectId: "managment-gym",
  storageBucket: "managment-gym.firebasestorage.app",
  messagingSenderId: "492163052523",
  appId: "1:492163052523:web:51345714947f23b2771fae",
  measurementId: "G-LZ7KQMQZNF"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
/* const analytics = getAnalytics(app); */