import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Configuration de ton projet Firebase "mgmr-bbb"
const firebaseConfig = {
  apiKey: "AIzaSyDurXVycwbMq_ACTkMMlTskKPC4VH5khmA",
  authDomain: "mgmr-bbb.firebaseapp.com",
  projectId: "mgmr-bbb",
  storageBucket: "mgmr-bbb.firebasestorage.app",
  messagingSenderId: "152570133581",
  appId: "1:152570133581:web:eb2d5c5326d5306ee3b004",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);
