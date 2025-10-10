import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAIxMwqKK2UNNOaInAOo5C62h3WejIfgFM",
  authDomain: "leaderboardorder.firebaseapp.com",
  projectId: "leaderboardorder",
  storageBucket: "leaderboardorder.appspot.com", // ✅ fixed
  messagingSenderId: "257786521113",
  appId: "1:257786521113:web:ec2025848331e430dfac88"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
