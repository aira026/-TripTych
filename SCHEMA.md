# TripTych 資料結構（含 P1/P2 預留欄位）

trips/{id}
- 既有：title, country, days[], spots[], members[], memberNames{}, st{}, booking[], expenses[], lists, memos{}
- P0 新增：`diets` = { [uid]: { tags: string[], note: string, flex: boolean } }
  - tags：ovo / wuxin / vegan / nobeef / nopork / noseafood / nutallergy
- 行程節點（days[].items[]）新增選填：`diet` = ["has_vegetarian","contains_dashi","no_vegetarian","beef_only","seafood_focus"]
- P1/P2 預留：`ext` = { liveEvents[], mealLedger{}, offlinePack{}, phrasebook{} }
  - liveEvents：現場異動紀錄 [{ ts, type, ref:{day,item}, note }]
  - mealLedger：行程脈絡分帳 — expenses[].ctx 預留為 { day, item }
  - offlinePack：零訊號離線包（地圖範圍、重要頁面清單）
  - phrasebook：多情境多語句庫（點餐、交通、緊急）

LocalStorage 快照：`tp-food-<tripId>`（飲食卡文案三語快照）、`tp-food-last`（最近一次）

## 公開範本 templates/{code}（任何人可用代碼讀取）
- 內容：title, short, country, countryCode, cities, nDays, notes, spots, days[], pack, gift, storm, currency, image
- 管理欄位：owner, ownerName, featured（只能在 Console 設為 true）, publishedAt
- 不含：members / booking / expenses / diets / memos / sos
- trips/{id}.publicCode 記錄該行程已發布的代碼；匯入的行程帶 importedFrom

## 成員即時定位 trips/{id}/live/{uid}
- 欄位：lat, lng, acc（公尺）, ts（毫秒時間戳）, name
- 只有該行程成員可讀；每人只能寫／刪自己的文件；超過 60 分鐘的紀錄不顯示。

## AI Provider 架構（app.js 的 AI_PROVIDERS）
- `{id, label, mode:"auto"|"manual", available(), run(prompt)}`；新增一個 provider 只要 push 進陣列。
- 固定流程：buildPrompt → provider.run → cleanPlan（驗證／淨化）→ 預覽 → aiApply。
