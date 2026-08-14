import * as firebaseApp from 'firebase/app';
import { getDatabase } from 'firebase/database';

// TODO: ЗАМЕНИТЕ ЭТИ ЗНАЧЕНИЯ НА ВАШИ ИЗ FIREBASE CONSOLE
// 1. Перейдите на https://console.firebase.google.com/
// 2. Создайте проект
// 3. Создайте Web App (значок </>)
// 4. Скопируйте конфиг сюда
// 5. В разделе Realtime Database -> Rules установите правила: ".read": true, ".write": true (для тестов)

const firebaseConfig = {
  apiKey: "AIzaSyCCSSEimSTtznG8cIllyzGbpruNylIZnUg",
  authDomain: "court-iq-ee2f7.firebaseapp.com",
  databaseURL: "https://court-iq-ee2f7-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "court-iq-ee2f7",
  storageBucket: "court-iq-ee2f7.firebasestorage.app",
  messagingSenderId: "609980472430",
  appId: "1:609980472430:web:efb740f60841a0da09da7f",
  measurementId: "G-Y17PBGEBWG"
};

// Use 'as any' to bypass strict TS checks in some environments while keeping runtime safe
const initializeApp = (firebaseApp as any).initializeApp || (firebaseApp as any).default?.initializeApp;

// If initializeApp is not found, this will throw at runtime, but it fixes the TS error.
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);