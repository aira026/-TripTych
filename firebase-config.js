// Firebase 設定檔
export const firebaseConfig = {
  apiKey: "AIzaSyB7Xddw50fPe5_Cv2HAXVb47sJGRn1nGgU",
  authDomain: "triptych-dad14.firebaseapp.com",
  projectId: "triptych-dad14",
  storageBucket: "triptych-dad14.firebasestorage.app",
  messagingSenderId: "947728885313",
  appId: "1:947728885313:web:e513b46dddc03b2c20c8c0",
  measurementId: "G-MZ9H92XRT9"
};

// 如果專案直接使用全域的 window.firebaseConfig，順便掛載上去
if (typeof window !== 'undefined') {
  window.firebaseConfig = firebaseConfig;
}