// 到 Firebase 控制台 → 專案設定 → 一般 → 你的應用程式（Web）複製這份設定貼上。
// 這些值本來就會公開在前端，真正的保護靠 Firestore 安全規則（見 firestore.rules）。
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
