import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDeoj_ZlCCgvDD5JYGAcJkhoVC4YnHhW-8",
    authDomain: "mandarim-aula.firebaseapp.com",
    projectId: "mandarim-aula",
    storageBucket: "mandarim-aula.firebasestorage.app",
    messagingSenderId: "739717844830",
    appId: "1:739717844830:web:7ebb6984e02481062ac9cf"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
