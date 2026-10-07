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
