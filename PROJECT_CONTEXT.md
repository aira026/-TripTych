專案交接文件：TripTick (歷歷)
專案名稱：TripTick / 歷歷

核心 Slogan：Take a Trip, Tick Every Moment.

專案定位：極簡、高質感、iOS 風格導向的輕量化旅遊 PWA（Progressive Web App）應用程式，整合行程規劃、即時地圖互動、記帳及 AI 智慧協助。

1. 核心功能說明
極簡歡迎與登入體驗：具備高質感過場與 Google 帳號身分驗證，支援流暢的登入/登出狀態切換。
行程規劃與打勾管理：以「Tick（打勾完成）」為核心互動，方便使用者在旅途中快速管理待辦事項與行程節點。
即時定位與分享（實際地圖）：支援位置互動與分享，讓同行夥伴能掌握彼此動態。
AI 智慧助理：提供輕量化、隨手可及的 AI 輔助互動介面，協助行程與旅遊決策。
行動優先 PWA 體驗：針對手機瀏覽器與加入主畫面（PWA 容器）優化，具備離線快取與流暢動畫。

2. 目前使用的技術棧 (Tech Stack)
前端架構：純原生 JavaScript (ES Modules)、HTML5、CSS3（迎合 iOS 視覺規範，強調大面積留白、無過度裝飾、無 Emoji 汙染）。
託管與部署：GitHub Pages 靜態網頁託管。
後端與服務：Firebase (Authentication 用於身分驗證、Firestore 用於資料同步)。
儲存機制：
localStorage / sessionStorage 用於輕量狀態與導向標記。
Firebase 內建快取與資料持久化機制。
架構特色：無大型前端框架（如 React/Vue）包袱，完全以原生效能優化 PWA 載入速度。

3. 目前的專案檔案結構 (File Structure)
(依據目前的專案模組與清理後的狀態)
Plaintext
├── index.html            # 主頁面與 DOM 結構容器
├── app.js                # 核心應用程式邏輯與狀態管理
├── auth.js               # Firebase 驗證邏輯與登入/登出控制
├── firebase-config.js    # Firebase 初始化與設定檔
├── welcome.css           # 歡迎頁專屬樣式（已移除 3D 地球容器與殘留渲染）
└── assets/               # 靜態資源與圖示

4. 已完成的核心功能與關鍵邏輯摘要
Google Auth 登入防護：於 auth.js 中調整 GoogleAuthProvider 參數，強化帳號選擇機制，避免 Safari 瀏覽器快取強制綁定單一舊帳號。
安全登出機制 (signOutUser)：清除對應的驗證標記與 Firebase Session，並安全地執行頁面重整，維持乾淨的驗證狀態同時保護全域設定。
UI 減法工程：全面拔除冗長的說明文字與干擾視覺的 Emoji，轉向精簡、俐落的高質感 iOS 介面。
清理幽靈藍球：徹底自專案中移除過時的 3D 地球模組（如 earth.js 及其紋理貼圖），確保歡迎頁面輕量、純粹。

5. 目前的資料結構 / Schema
Firebase Auth 狀態：
追蹤使用者 UID、Email、Display Name。
本地儲存 (localStorage / 狀態管理)：
記錄使用者偏好、登入導向標記（REDIRECT_FLAG）與輕量暫存。
