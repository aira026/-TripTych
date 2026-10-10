// TripTych「AI 小精靈」自動模式後端（選用）：Cloudflare Worker + Google Gemini API（有免費額度）
// 目前專案預設是「手動模式」（免費、免後端）。要啟用一鍵自動生成時才需要部署這個檔案。
//
// 部署：Cloudflare Dashboard → Workers → 建立 → 貼上本檔，並設定：
//   Secret   GEMINI_API_KEY    Google AI Studio 申請的金鑰（只放在這裡，絕不要放進前端）
//   Variable FIREBASE_API_KEY  你的 Firebase 網頁 apiKey（用來驗證使用者已登入）
//   KV 綁定  RATE              （強烈建議）建立一個 KV namespace 並綁定為 RATE，用來做每人／全站每日次數上限
//   Variable USER_DAILY=5, GLOBAL_DAILY=200, MODEL=gemini-2.5-flash, ALLOWED_ORIGIN=https://aira026.github.io
// 然後把 Worker 網址填進 firebase-config.js 的 aiEndpoint。
// 注意：免費額度、可用模型名稱與「免費層資料是否用於改善產品」的條款會變動，上線前請到 Google AI Studio 官方頁面確認。
const SYSTEM=`你是旅遊行程規劃師。只輸出 JSON，不要任何說明或 Markdown。格式：{"title":"","days":[{"city":"","pos":"","items":[{"t":"HH:MM","h":"","d":"","q":""}]}]}。使用繁體中文；每天 3～8 個項目；t 為 24 小時制；q 為可在地圖搜尋的地點全名（含城市）；最多 14 天。`;
export default{async fetch(req,env){
 const origin=env.ALLOWED_ORIGIN||"https://aira026.github.io";
 const cors={"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"Content-Type, Authorization","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"};
 if(req.method==="OPTIONS")return new Response(null,{headers:cors});
 const j=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{...cors,"Content-Type":"application/json"}});
 if(req.method!=="POST")return j({error:"POST only"},405);
 if(req.headers.get("Origin")!==origin)return j({error:"forbidden"},403);
 const tok=(req.headers.get("Authorization")||"").replace(/^Bearer /,"");if(!tok)return j({error:"請先登入"},401);
 const v=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${env.FIREBASE_API_KEY}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({idToken:tok})});
 if(!v.ok)return j({error:"登入驗證失敗"},401);
 const uid=((await v.json()).users||[{}])[0].localId||"anon";
 const {prompt}=await req.json().catch(()=>({}));if(!prompt||String(prompt).length>1200)return j({error:"需求請在 800 字內"},400);
 if(env.RATE){const day=new Date().toISOString().slice(0,10),uk=`u:${uid}:${day}`,gk=`g:${day}`,[u,g]=await Promise.all([env.RATE.get(uk),env.RATE.get(gk)]);
  if(+u>=(+env.USER_DAILY||5))return j({error:"你今天的次數用完了，明天再來，或改用手動模式"},429);
  if(+g>=(+env.GLOBAL_DAILY||200))return j({error:"今日全站額度已滿，請改用手動模式"},429);
  await Promise.all([env.RATE.put(uk,String((+u||0)+1),{expirationTtl:172800}),env.RATE.put(gk,String((+g||0)+1),{expirationTtl:172800})])}
 const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${env.MODEL||"gemini-2.5-flash"}:generateContent`,{method:"POST",headers:{"x-goog-api-key":env.GEMINI_API_KEY,"Content-Type":"application/json"},
  body:JSON.stringify({systemInstruction:{parts:[{text:SYSTEM}]},contents:[{role:"user",parts:[{text:String(prompt)}]}],generationConfig:{responseMimeType:"application/json",temperature:.7,maxOutputTokens:4000}})});
 const d=await r.json().catch(()=>({}));
 if(r.status===429)return j({error:"AI 額度暫時用完，請稍後再試或改用手動模式"},429);
 if(!r.ok)return j({error:(d.error&&d.error.message)||"AI 服務錯誤"},502);
 const text=((d.candidates||[])[0]?.content?.parts||[]).map(p=>p.text||"").join("");
 return j({plan:text})}};
