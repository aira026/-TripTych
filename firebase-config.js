// ⚠️ 這個檔案必須是 ES Module：開頭要有 export，app.js 才讀得到。
// Firebase 網頁 apiKey 本來就會公開在前端，真正的保護靠 Firestore 安全規則（firestore.rules）。
export const firebaseConfig = {
  apiKey: "AIzaSyB7Xddw50fPe5_Cv2HAXVb47sJGRn1nGgU",
  authDomain: "triptych-dad14.firebaseapp.com",
  projectId: "triptych-dad14",
  storageBucket: "triptych-dad14.firebasestorage.app",
  messagingSenderId: "947728885313",
  appId: "1:947728885313:web:e513b46dddc03b2c20c8c0",
  measurementId: "G-MZ9H92XRT9"
};

// AI 小精靈後端網址（見 ai-worker.js）。留空＝只使用「手動模式」（複製提示詞 → 貼回 JSON）。
export const aiEndpoint = "";
