# TripTych 上線檢查清單

## 一、每次更新後
1. 上傳全部檔案（含 `vendor/leaflet/` 資料夾、`sw.js`、`manifest.webmanifest`、`icon-*.png`）。
2. 手機瀏覽器清除這個網站的資料後重開（或等畫面出現「有新版本，點此更新」再按）。

## 二、安全（只有你能做）
1. Firebase 控制台 → Firestore → 規則：貼上 `firestore.rules` 並按「發布」。
2. Google Cloud 控制台 → API 和服務 → 憑證 → 你的瀏覽器金鑰 →「應用程式限制」選「HTTP 參照網址」，加入：
   - `https://aira026.github.io/*`
   「API 限制」只勾 Identity Toolkit API、Token Service API、Cloud Firestore API。
3. Firebase → Authentication → 設定 → 已授權網域：確認有 `aira026.github.io`。
4. 備忘錄內容同行程成員技術上讀得到，請勿記密碼等敏感資料。

## 三、實測流程
- [ ] 第二個 Google 帳號：輸入邀請碼加入 → 看到行程
- [ ] 建立者把該成員踢出 → 對方看不到行程
- [ ] 建立者「重設邀請碼」→ 舊碼加入失敗、新碼成功
- [ ] 刪除一個行程項目 → 出現「復原」→ 按下後還原
- [ ] 選單「匯出備份（JSON）」下載檔案；「匯入備份」可建立為新行程
- [ ] iOS：刪除舊主畫面圖示 → 重新加入主畫面 → 新圖示出現
- [ ] 開飛航模式從主畫面圖示開啟 → 頂部「離線檢視模式」、行程與票券都在
- [ ] 旅行日期內：「現在 / 下一步」與實際時間相符
- [ ] LINE 貼上網址 → 出現預覽卡片
