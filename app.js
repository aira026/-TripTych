window.__tt=1;
let initializeApp,getAuth,onAuthStateChanged,GoogleAuthProvider,signInWithPopup,signInWithRedirect,signOut,initializeFirestore,persistentLocalCache,persistentMultipleTabManager,collection,query,where,onSnapshot,doc,setDoc,getDoc,updateDoc,deleteDoc,arrayUnion,arrayRemove,deleteField,serverTimestamp,firebaseConfig={},FB_LOAD=false;
try{const G="https://www.gstatic.com/firebasejs/10.12.2/",[A,B,C,Dd]=await Promise.all([import(G+"firebase-app.js"),import(G+"firebase-auth.js"),import(G+"firebase-firestore.js"),import("./firebase-config.js")]);
 ({initializeApp}=A);({getAuth,onAuthStateChanged,GoogleAuthProvider,signInWithPopup,signInWithRedirect,signOut}=B);
 ({initializeFirestore,persistentLocalCache,persistentMultipleTabManager,collection,query,where,onSnapshot,doc,setDoc,getDoc,updateDoc,deleteDoc,arrayUnion,arrayRemove,deleteField,serverTimestamp}=C);firebaseConfig=Dd.firebaseConfig;FB_LOAD=true}
catch(e){console.warn("[offline] Firebase SDK 載入失敗，改用本機快照",e)}
const FB_OK=FB_LOAD&&!!firebaseConfig.apiKey&&!String(firebaseConfig.apiKey).startsWith("YOUR");
let auth,db,me=null,TRIPS=[],TPL=null,unsub=null,SNAP=null;
if(FB_OK){const app=initializeApp(firebaseConfig);auth=getAuth(app);db=initializeFirestore(app,{localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()})})}
const JF=["alerts","storm","sos"];
const clean=o=>JSON.parse(JSON.stringify(o));
const norm=t=>{JF.forEach(k=>{if(typeof t[k]==="string")try{t[k]=JSON.parse(t[k])}catch(e){delete t[k]}});return t};
const ser=o=>{const r={...o};JF.forEach(k=>{if(r[k]!==undefined&&typeof r[k]!=="string")r[k]=JSON.stringify(r[k])});return clean(r)};
const tdoc=t=>doc(db,"trips",t.id);
const statusOf=t=>{const u=(me&&me.uid)||(SNAP&&SNAP.uid);return(u&&t.st&&t.st[u])||"future"};
const setSt=(t,s)=>updateDoc(tdoc(t),{["st."+me.uid]:s});
const wt=v=>Array.isArray(v)?v.length+v.reduce((n,x)=>n+wt(x&&x.items!==undefined?x.items:0),0):(v&&typeof v==="object"?Object.values(v).reduce((n,x)=>n+wt(x),0):0);
function undoToast(fn){let u=document.getElementById("undo");if(!u){u=document.createElement("div");u.id="undo";document.body.appendChild(u)}u.innerHTML="<span>已刪除</span><button>復原</button>";u.classList.add("on");clearTimeout(u._t);u._t=setTimeout(()=>u.classList.remove("on"),6500);u.querySelector("button").onclick=()=>{u.classList.remove("on");fn()}}
function patch(t,p){if(!me){toast("離線檢視模式無法編輯，請連線並登入後再試");return Promise.resolve()}const _old={};for(const k in p){const base=(k==="lists"&&!t.lists)?plist(t):t[k];if(wt(base)>wt(p[k]))_old[k]=JSON.parse(JSON.stringify(base))}if(Object.keys(_old).length)setTimeout(()=>undoToast(()=>patch(t,_old).then(()=>render())),0);Object.assign(t,p);const o=TRIPS.find(x=>x.id===t.id);if(o)Object.assign(o,p);return updateDoc(tdoc(t),ser(p)).catch(e=>{console.error("[patch] 寫入失敗",e);const u=document.getElementById("undo");if(u)u.classList.remove("on");toast("儲存失敗："+(e.code||e.message))})}
const nameOf=(t,k)=>(t.memberNames&&t.memberNames[k])||k;
const rnd=n=>Array.from(crypto.getRandomValues(new Uint8Array(n)),b=>"ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b%32]).join("");
const $=s=>document.querySelector(s);
const esc=x=>String(x??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const flag=cc=>String.fromCodePoint(...[...cc.toUpperCase()].map(c=>127397+c.charCodeAt()));
const fmt=(n,c)=>`${c} ${Math.round(n).toLocaleString()}`;
let DATA=[],user="shared",unlocked=false,zm=null;const dayI={};
const store=(k,v)=>{try{v==null?localStorage.getItem(k):localStorage.setItem(k,v)}catch(e){}};
const load=k=>{try{return localStorage.getItem(k)}catch(e){return null}};
function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("on");setTimeout(()=>t.classList.remove("on"),1600)}
function copy(s,msg){(navigator.clipboard?navigator.clipboard.writeText(s):Promise.reject()).then(()=>toast(msg||"已複製"),()=>toast("請手動複製"))}
function modal(h){$("#sheet").innerHTML=h+'<div class="pills"><button class="pill gl" data-a="close">關閉</button></div>';$("#modal").classList.add("on")}
const FL={"日本":"JP","台灣":"TW","韓國":"KR","泰國":"TH","越南":"VN","新加坡":"SG","馬來西亞":"MY","香港":"HK","中國":"CN","美國":"US","加拿大":"CA","英國":"GB","法國":"FR","德國":"DE","義大利":"IT","西班牙":"ES","瑞士":"CH","冰島":"IS","澳洲":"AU","紐西蘭":"NZ","印尼":"ID","菲律賓":"PH","荷蘭":"NL","奧地利":"AT","捷克":"CZ","土耳其":"TR","希臘":"GR","挪威":"NO","芬蘭":"FI","瑞典":"SE"};
const flagOf=t=>{const c=t.countryCode||FL[t.country];return c?flag(c):"🌍"};
const getDays=t=>Array.isArray(t.days)?JSON.parse(JSON.stringify(t.days)):(()=>{try{return JSON.parse(localStorage.getItem("tp-days-snap-"+t.id))||[]}catch(e){return[]}})();
const nd=t=>getDays(t).length||t.nDays||1;
const setDays=(t,D)=>{try{localStorage.setItem("tp-days-snap-"+t.id,JSON.stringify(D))}catch(e){}return patch(t,{days:D})};
const isT=s=>/^\d{1,2}:\d{2}$/.test(s||"");
const visible=()=>TRIPS.map(t=>({...t,status:statusOf(t),locked:false}));

/* accounting */
function settle(c){const m=c.all||c.members,paid={},owed={};m.forEach(x=>{paid[x]=0;owed[x]=0});let total=0;
 c.expenses.forEach(e=>{total+=e.amount;paid[e.paidBy]=(paid[e.paidBy]||0)+e.amount;const sw=e.splitWith?.length?e.splitWith:c.members;sw.forEach(x=>owed[x]=(owed[x]||0)+e.amount/sw.length)});
 const bal=m.map(x=>({m:x,b:paid[x]-owed[x]})),de=bal.filter(x=>x.b<-.5).sort((a,b)=>a.b-b.b),cr=bal.filter(x=>x.b>.5).sort((a,b)=>b.b-a.b),out=[];let i=0,j=0;
 while(i<de.length&&j<cr.length){const a=Math.min(-de[i].b,cr[j].b);out.push([de[i].m,cr[j].m,a]);de[i].b+=a;cr[j].b-=a;if(de[i].b>-.5)i++;if(cr[j].b<.5)j++}
 return{total,paid,out}}
function acct(t,L,r){const c=cfg(t),S=settle({members:c.members,all:[...c.members,...c.orphans],expenses:L}),cur=c.currency,tw=v=>` <small class="meta">≈ NT$ ${Math.round(v*r).toLocaleString()}</small>`;
 return`<p class="meta">參與成員 (${c.members.length}人)：${c.members.map(m=>esc(nameOf(t,m))).join("、")}</p>${c.orphans.length?`<div class="pay">有 ${c.orphans.length} 個名稱不是目前成員（${c.orphans.map(o=>esc(lbl(t,o))).join("、")}）。<button class="cb" data-a="fixold">整理舊帳目</button></div>`:""}
 ${c.lightSplitUrl?`<div class="pills"><a class="pill" href="${esc(c.lightSplitUrl)}" target="_blank" rel="noopener">開啟 LightSplit 記帳本</a></div>`:""}
 <p style="margin-top:12px" class="meta">總花費</p><p class="sum">${fmt(S.total,cur)}${tw(S.total)}</p>
 <h4 class="meta" style="margin:12px 0 2px">各自墊付</h4>${[...c.members,...c.orphans.filter(o=>S.paid[o])].map(m=>`<div class="row"><span>${esc(lbl(t,m))}</span><b>${fmt(S.paid[m]||0,cur)}</b></div>`).join("")}
 <h4 class="meta" style="margin:12px 0 2px">結算</h4>${S.out.length?S.out.map(o=>`<div class="pay">${esc(lbl(t,o[0]))} → ${esc(lbl(t,o[1]))}　<b>${fmt(o[2],cur)}</b>${tw(o[2])}</div>`).join(""):'<div class="pay">已平衡 ✅</div>'}
 <h4 class="meta" style="margin:12px 0 2px">明細</h4>${L.map((e,i)=>`<div class="row"><span>${esc(e.item)}<br><small class="meta">${esc(lbl(t,e.paidBy))} 付</small></span><b>${fmt(e.amount,cur)}</b><button class="x ed" data-a="delex" data-v="${i}" aria-label="刪除">✕</button></div>`).join("")||'<p class="meta">尚無明細</p>'}`}
/* --- Hokkaido sub pages --- */
const T0=()=>visible().find(x=>x.status==="now");
let cur="now";const LB={now:"行程總覽",tix:"票券與預約",storm:"備忘錄",yen:"匯率與公費",pack:"打包清單",map:"全球足跡",past:"歷史旅程",future:"未來清單"};const SUB=["now","tix","storm","yen","pack"];
const RATES={JPY:.21,KRW:.024,THB:.9,USD:32,EUR:35,CHF:36,TWD:1};
const curOf=()=>{const t=T0();return t?cfg(t).currency:"JPY"};
const rate=()=>parseFloat(load("tp-rate-"+curOf()))||RATES[curOf()]||1;
const exList=t=>[...(t.expenses||[])];
const saveEx=(t,l)=>patch(t,{expenses:l});
const plist=t=>t.lists?JSON.parse(JSON.stringify(t.lists)):{pack:(t.pack||DEFPACK).map(x=>({t:x,d:0})),gift:(t.gift||[]).map(x=>({t:x,d:0}))};
const savePl=(t,l)=>patch(t,{lists:l});
const tixHTML=t=>{const L=bkList(t);return`<div class="glass blk"><p class="meta vw">需要新增、修改項目或雲端連結（booking PDF），請按右上「編輯模式」。</p><p class="meta ed">貼上雲端分享連結（Google 雲端硬碟／iCloud／Dropbox，權限設為「知道連結者可檢視」）。這裡的項目會同步出現在首頁的 Booking。</p></div>
${L.map((b,i)=>`<div class="glass blk"><div class="vw"><b>${esc(b.n)}</b><div class="meta">${esc(b.c||"尚未填寫編號")}</div><div class="pills">${b.c?`<button class="pill gl" data-a="cp" data-v="${esc(b.c)}">複製編號</button>`:""}${okUrl(b.u)?`<a class="pill gl" href="${esc(b.u)}" target="_blank" rel="noopener">☁️ 開啟 PDF</a>`:""}</div></div><div class="ed"><input class="fi" data-b="n" data-i="${i}" value="${esc(b.n)}" placeholder="項目名稱（例：住宿、機票）"><input class="fi" data-b="c" data-i="${i}" value="${esc(b.c)}" placeholder="booking 編號"><input class="fi" data-b="u" data-i="${i}" type="url" value="${esc(b.u)}" placeholder="雲端連結 https://…"><div class="pills"><button class="pill gl" data-a="cpi" data-v="${i}">複製編號</button><button class="pill gl" data-a="openu" data-v="${i}">☁️ 開啟 PDF</button><button class="pill gl" data-a="delbk" data-v="${i}">✕ 刪除</button></div></div></div>`).join("")||'<p class="empty">還沒有項目</p>'}
<div class="add ed"><input class="fi" id="in-bk" placeholder="新增項目名稱…"><button class="pill" data-a="addbk">＋ 新增</button></div>
`};
const GST={links:[["🚆","JR 運行","https://www.jrhokkaido.co.jp/travel/unkou/"],["🚗","道路情報","https://www.jartic.or.jp/"],["🌤️","天氣警報","https://www.jma.go.jp/bosai/forecast/"],["✈️","航班狀況","https://www.new-chitose-airport.jp/ja/flight/"]],risks:[],crisis:[["先保安全","開警示燈、停到路邊；有人受傷撥 119"],["聯絡租車公司","使用取車時給的救援電話，說明位置"],["通知住宿","告知會晚到，避免訂房被取消"],["拍照留收據","車況、現場、拖吊單據，回台理賠用"]]};
const DEFPACK=["護照／簽證","行動電源與充電線","常備藥品","信用卡與現金","網卡／漫遊"];
const cfg=t=>{const ex=t.expenses||[],mem=[...new Set(t.members||[])],ks=new Set();ex.forEach(e=>{ks.add(e.paidBy);(e.splitWith||[]).forEach(k=>ks.add(k))});return{currency:t.currency||"JPY",members:mem,orphans:[...ks].filter(k=>k&&!mem.includes(k)),lightSplitUrl:t.lightSplitUrl||"",expenses:ex}};
const lbl=(t,k)=>(t.members||[]).includes(k)?nameOf(t,k):(t.memberNames&&t.memberNames[k]?t.memberNames[k]+"（已離開）":k+"（舊紀錄）");
const memoOf=t=>t.memo?JSON.parse(JSON.stringify(t.memo)):{risks:((t.storm&&t.storm.risks)||[]).map(r=>({d:r[0],w:r[1],p:r[2],c:r[3]?1:0})),steps:((t.storm&&t.storm.crisis)||GST.crisis).map(c=>({t:c[0],d:c[1]})),note:""};
const saveMemo=(t,m)=>patch(t,{memo:m});
const eb=(k,i)=>`<span class="ed mb"><button class="x" data-a="memoedit" data-v="${k}:${i}" aria-label="編輯"><i class=i-edit></i></button><button class="x" data-a="memodel" data-v="${k}:${i}" aria-label="刪除">✕</button></span>`;
const stormHTML=t=>{const M=memoOf(t);return`<h2 class="sec">備案提醒</h2>${M.risks.map((r,i)=>`<div class="rw ${r.c?"crit":""}"><b>${esc(r.d)}</b><span>${esc(r.w)}</span><em>${esc(r.p)}</em>${eb("risks",i)}</div>`).join("")||'<p class="meta" style="margin:4px">還沒有備案。</p>'}<div class="pills ed"><button class="pill" data-a="memoadd" data-v="risks">＋ 新增備案</button></div>
<h2 class="sec">緊急處理步驟</h2><ol class="cr">${M.steps.map((s,i)=>`<li><div><b>${esc(s.t)}</b><span>${esc(s.d)}</span></div>${eb("steps",i)}</li>`).join("")}</ol><div class="pills ed"><button class="pill" data-a="memoadd" data-v="steps">＋ 新增步驟</button></div><div class="pills"><a class="pill" href="tel:119">撥打 119</a></div>
<h2 class="sec">個人備忘</h2><p class="meta" style="margin:0 4px 6px">同一趟行程的成員在技術上讀得到，請勿記密碼等敏感資料。</p><div class="glass blk"><div class="vw memo">${M.note?esc(M.note):'<span class="meta">（空白，按「編輯模式」可以寫）</span>'}</div><textarea class="fi ed" id="memo-note" rows="6" placeholder="想記的事…（備案、集合地點、提醒…）">${esc(M.note)}</textarea></div>`};
function memoForm(k,i){const t=T0(),M=memoOf(t),x=i!=null?M[k][i]:{};
 modal(k==="risks"?`<h3>${i!=null?"編輯":"新增"}備案</h3><div class="fm" data-k="risks" data-i="${i??""}"><label>天數／標題<input id="mm-a" value="${esc(x.d)}" placeholder="例如 D3"></label><label>可能的狀況<input id="mm-b" value="${esc(x.w)}"></label><label>備案對策<input id="mm-c" value="${esc(x.p)}"></label><label class="chk"><input type="checkbox" id="mm-x" ${x.c?"checked":""}> 標為重要（紅色）</label><div class="pills"><button class="pill" data-a="memosave">儲存</button></div></div>`
 :`<h3>${i!=null?"編輯":"新增"}步驟</h3><div class="fm" data-k="steps" data-i="${i??""}"><label>步驟標題<input id="mm-a" value="${esc(x.t)}"></label><label>說明<input id="mm-b" value="${esc(x.d)}"></label><div class="pills"><button class="pill" data-a="memosave">儲存</button></div></div>`)}
function setEdit(on){document.body.classList.toggle("editing",on);document.querySelectorAll(".edt").forEach(x=>{x.innerHTML=on?"結束並儲存":"<i class=i-edit></i> 編輯模式";x.classList.toggle("on",on)})}
function bar(arch){const on=document.body.classList.contains("editing");return`<div class="pills topact"><button class="pill mini edt ${on?"on":""}" data-a="edtoggle">${on?"結束並儲存":"<i class=i-edit></i> 編輯模式"}</button>${arch?'<button class="pill mini" data-a="archive">結束並歸檔</button>':""}${(()=>{const tt=T0();return arch&&tt&&TPL&&tt.templateId===TPL.id?'<button class="pill mini ed" data-a="tplreset">↺ 重設為最新範例</button>':""})()}</div>`}
function yenHTML(t){const c=cfg(t),r=rate(),L=exList(t);
 return`<div class="glass blk"><p class="meta">${c.currency} 換台幣</p><div class="bigres" id="twd">NT$ 0</div>
 <label class="fl">${c.currency} 金額<input class="fi" id="jpy" type="number" inputmode="numeric" placeholder="例如 11370"></label>
 <label class="fl">匯率（1 ${c.currency} = ? NT$）<input class="fi" id="rate" type="number" step="0.001" value="${r}"></label><div class="qk" id="qk"></div></div>
 <h2 class="sec">記一筆</h2><div class="glass blk"><input class="fi" id="memo" placeholder="項目（例：午餐湯咖哩）"><select class="fi" id="payer" aria-label="付款人">${c.members.map(m=>`<option value="${esc(m)}" ${m===me?.uid?"selected":""}>付款人：${esc(nameOf(t,m))}</option>`).join("")}</select><div class="splits"><small class="meta">分攤對象</small>${c.members.map(m=>`<label class="chk"><input type="checkbox" class="sp" value="${esc(m)}" checked> ${esc(nameOf(t,m))}</label>`).join("")}</div>
 <div class="pills"><button class="pill" data-a="addex">＋ 記入帳本</button><button class="pill gl" data-a="tols">複製並到 LightSplit</button></div></div>
 <h2 class="sec">帳本與結算</h2><div class="glass blk">${acct(t,L,r)}</div>`}
function packHTML(t){const P=plist(t),sec=(k,ti)=>`<h2 class="sec">${ti}</h2><div class="glass blk">${P[k].map((x,i)=>`<div class="ck ${x.d?"done":""}"><label class="cklab"><input type="checkbox" data-k="${k}" data-i="${i}" ${x.d?"checked":""}><span>${esc(x.t)}</span></label><button class="x ed" data-a="deli" data-k="${k}" data-i="${i}" aria-label="刪除">✕</button></div>`).join("")}<div class="add ed"><input class="fi" id="in-${k}" placeholder="新增項目…"><button class="pill" data-a="addi" data-v="${k}">＋</button></div></div>`;
 return sec("pack","冬季裝備")+sec("gift","伴手禮／想買")}
function calc(){const v=parseFloat($("#jpy")?.value)||0,r=parseFloat($("#rate")?.value)||0;if(!$("#twd"))return;if(r)store("tp-rate-"+curOf(),r);$("#twd").textContent="NT$ "+Math.round(v*r).toLocaleString();
 $("#qk").innerHTML=[1000,5000,10000,20000].map(x=>`<button data-a="q" data-v="${x}"><small>${x.toLocaleString()}</small>NT$${Math.round(x*r).toLocaleString()}</button>`).join("")}
function renderNow(t){const ids=["now","tix","storm","yen","pack"],emp=emptyNow();
 const f={now:t=>bar(1)+nowCard(t),tix:t=>bar()+tixHTML(t),storm:t=>bar()+stormHTML(t),yen:t=>bar()+yenHTML(t),pack:t=>bar()+packHTML(t)};ids.forEach(i=>{$("#t-"+i).innerHTML=t?f[i](t):emp});calc();if(t){MiniMap.render("nowmap",ptsOf(t),pickPt);try{buildFood(t)}catch(e){}}}

/* now view */
const bkList=t=>[...(t.booking||[])];
const saveBk=(t,l)=>patch(t,{booking:l});
const okUrl=u=>/^https?:\/\//i.test(u||"");
const bookHTML=t=>{const L=bkList(t);return`<h3>Booking</h3>${L.length?L.map(b=>`<div class="row"><span>${esc(b.n)}<br><small class="meta">${esc(b.c||"尚未填寫")}</small></span><span>${b.c?`<button class="cb" data-a="cp" data-v="${esc(b.c)}">複製</button>`:""}${okUrl(b.u)?`<a class="cb" href="${esc(b.u)}" target="_blank" rel="noopener">☁️ PDF</a>`:""}</span></div>`).join(""):'<p class="meta">還沒有項目，請到「票券與預約」新增。</p>'}`};
const dietHTML=t=>`<h3>飲食溝通日文卡</h3><div class="jp" id="jp">${esc(t.diet)}</div><div class="pills"><button class="pill" data-a="cp" data-v="${esc(t.diet)}">複製日文</button></div>`;
const DEFSOS=[["日本急救／火警","119","tel:119"],["日本警察","110","tel:110"],["駐日代表處","",""],["海外旅平險卡號","",""]];
const sosList=t=>Array.isArray(t.sos)&&t.sos.length?t.sos:DEFSOS;
const sosRow=x=>`<div class="sosr"><input class="fi sosl" value="${esc(x[0])}" placeholder="名稱"><input class="fi sosv" value="${esc(x[1])}" placeholder="電話／卡號"><button class="x" data-a="sosdel" aria-label="刪除">✕</button></div>`;
const sosHTML=t=>{const ed=document.body.classList.contains("editing")&&!!me,L=sosList(t);
 if(ed)return`<h3>緊急聯絡／保險</h3><div id="sosrows">${L.map(sosRow).join("")}</div><div class="pills"><button class="pill gl" data-a="sosadd">＋ 新增一列</button><button class="pill" data-a="savesos"><span class="dot">✓</span>儲存</button></div><p class="meta" style="margin-top:8px">電話請填數字，會自動變成可撥打連結。</p>`;
 return`<h3>緊急聯絡／保險</h3>${L.map(x=>`<div class="row"><span>${esc(x[0])}</span>${x[1]?(x[2]?`<a class="cb" href="${esc(x[2])}">${esc(x[1])}</a>`:`<b>${esc(x[1])}</b>`):'<span class="meta">尚未填寫</span>'}</div>`).join("")}<p class="meta" style="margin-top:8px">開啟編輯模式後再打開此視窗，即可修改。</p>`};
const itm=(x,di,ii)=>`<div class="it ${x.type||""}"><div class="tm">${esc(x.t)}</div><div class="bd">${dietWarn(x,T0())}<b>${esc(x.h)}</b>${x.type==="crit"?'<em class="tag">重要班次</em>':""}${x.d?`<p>${esc(x.d)}</p>`:""}${dietTags(x)}${x.q?`<a class="cb" href="https://maps.google.com/?q=${encodeURIComponent(x.q)}" target="_blank" rel="noopener">開啟地圖</a>`:""}${x.more?`<details><summary>備案／說明</summary><p>${esc(x.more)}</p></details>`:""}</div><div class="act ed"><button class="cb" data-a="edititem" data-v="${di}:${ii}" aria-label="編輯"><i class=i-edit></i></button><button class="cb" data-a="delitem" data-v="${di}:${ii}" aria-label="刪除">✕</button></div></div>`;
const tabsHTML=(t,di)=>getDays(t).map((d,i)=>`<button class="${i===di?"on":""}" data-a="day" data-v="${i}">${esc(d.k)}</button>`).join("")+'<button class="plus ed" data-a="addday" aria-label="新增一天">＋</button>';
const dayHTML=(t,i)=>{const d=getDays(t)[i];if(!d)return'<div class="glass blk"><p class="meta">還沒有每日行程。開啟「編輯模式」後，按上方「＋」新增第一天。</p></div>';
 return`<div class="glass ov"><h3>${esc(d.k)}${d.city?"｜"+esc(d.city):""}</h3><p>${esc(d.date||"")}${d.wx||d.tp?` <span class="wxchip">${esc(d.wx||"")} ${esc(d.tp||"")}</span>`:""}</p>${d.pos?`<p>${esc(d.pos)}</p>`:""}</div>${d.items.map((x,j)=>itm(x,i,j)).join("")||'<p class="meta" style="margin:8px 4px">這天還沒有行程項目。</p>'}${dayMore(d,i)}<div class="pills ed"><button class="pill" data-a="additem" data-v="${i}">＋ 新增景點／行程</button><button class="pill gl" data-a="editday" data-v="${i}">編輯本日</button><button class="pill gl" data-a="delday" data-v="${i}">刪除本日</button></div>`};
function todayIdx(t){const n=new Date(),s=new Date((t.startDate||"")+"T00:00"),k=Math.floor((n-s)/864e5);return k>=0&&k<getDays(t).length?k:0}
function nowCard(t){const D=getDays(t),hsp=t.hotspots&&t.mapImage,di=Math.min(dayI[t.id]??todayIdx(t),Math.max(0,D.length-1)),n=nd(t);dayI[t.id]=di;
 return`<article class="glass dark hero"><small>${flagOf(t)} 當前行程</small><h2>${esc(t.title)}</h2><p>${esc(t.startDate||"日期未定")}${t.endDate?" – "+esc(t.endDate.slice(5)):""}・${n} 天${(t.members||[]).length>1?`・${t.members.length} 人共編`:""}</p>${t.notes?`<p>${esc(t.notes)}</p>`:""}<div class="cdp" id="cd"></div>
 <div class="pills"><button class="pill lt" data-a="m" data-v="book">Booking</button><button class="pill lt" data-a="members">成員</button><button class="pill lt" data-a="goyen">公費</button><button class="pill lt" data-a="m" data-v="diet">飲食卡</button><button class="pill lt" data-a="m" data-v="sos">緊急</button></div></article>
 <div id="live" class="glass blk live">${liveHTML(t)}</div>
 
 <h2 class="sec">實際地圖</h2><div class="glass mapbox"><div id="nowmap" class="nowmap" role="application" aria-label="當前行程地圖"></div></div><div class="mi" id="mi2">點擊地圖地標查看當天摘要</div><p class="meta" style="margin:6px 4px 0">新增景點時填寫「地點」，就會自動標在地圖上。</p>
 <h2 class="sec">每日行程</h2><div class="days" id="dtabs">${tabsHTML(t,di)}</div><div id="dayblk">${daysAcc(t,di)}</div>`}
function ptsOf(t){const P=[];getDays(t).forEach((d,i)=>d.items.forEach(x=>{if(x.lat!=null)P.push({lat:x.lat,lng:x.lng,day:i,dayLabel:`${d.k} ${d.date||""}`.trim(),time:x.t||"",title:x.h,place:x.q||"",note:x.d||""})}));(t.spots||[]).forEach(s=>P.push({lat:s.lat,lng:s.lng,day:(s.day||1)-1,dayLabel:s.day?"D"+s.day:"",time:"",title:s.name,place:"",note:s.note||""}));return P}
function refreshDays(t){const D=getDays(t),di=Math.min(dayI[t.id]??0,Math.max(0,D.length-1));dayI[t.id]=di;$("#dtabs").innerHTML=tabsHTML(t,di);$("#dayblk").innerHTML=daysAcc(t,di);MiniMap.render("nowmap",ptsOf(t),pickPt)}
async function saveItem(){const t=T0(),f=document.querySelector(".fm"),di=+f.dataset.di,ii=f.dataset.ii===""?null:+f.dataset.ii,v=i=>$("#fi-"+i).value.trim(),h=v("h");if(!h)return toast("請填寫標題");
 const D=getDays(t),day=D[di],old=ii!=null?day.items[ii]:{},x={...old,t:v("t"),h,d:v("d"),q:v("q"),more:v("m")};{const dg=[...document.querySelectorAll(".rtg:checked")].map(e=>e.value);if(dg.length)x.diet=dg;else delete x.diet}
 if(x.q&&(x.q!==old.q||x.lat==null)){toast("查詢座標中…");const g=await geo(x.q+(t.country?" "+t.country:""));if(g){x.lat=g[0];x.lng=g[1]}else{delete x.lat;delete x.lng;toast("找不到座標，地圖不會標記")}}
 if(!x.q){delete x.lat;delete x.lng}
 if(ii!=null)day.items[ii]=x;else{let k=day.items.length;if(isT(x.t)){const n=day.items.findIndex(y=>isT(y.t)&&y.t.padStart(5,"0")>x.t.padStart(5,"0"));if(n>=0)k=n}day.items.splice(k,0,x)}
 setDays(t,D);$("#modal").classList.remove("on");refreshDays(t)}
function itemForm(di,ii){const t=T0(),x=ii!=null?getDays(t)[di].items[ii]:{};
 modal(`<h3>${ii!=null?"編輯項目":"新增景點／行程"}</h3><div class="fm" data-di="${di}" data-ii="${ii??""}"><label>時間<input id="fi-t" value="${esc(x.t)}" placeholder="例如 09:30（可留空或寫「下午」）"></label><label>標題<input id="fi-h" value="${esc(x.h)}" placeholder="例如 美瑛青池"></label><label>備註<textarea id="fi-d" rows="3">${esc(x.d)}</textarea></label><label>備案／說明（點開行程卡片才會看到）<textarea id="fi-m" rows="3">${esc(x.more)}</textarea></label><label>地點（地圖標記與導航用，可留空）<input id="fi-q" value="${esc(x.q)}" placeholder="例如 青池 美瑛"></label><div class="splits"><small class="meta">餐廳飲食屬性（選填；也會自動從名稱與備註推測）</small>${RT.map(([c,n])=>`<label class="chk"><input type="checkbox" class="rtg" value="${c}" ${(x.diet||[]).includes(c)?"checked":""}> ${n}</label>`).join("")}</div><div class="pills"><button class="pill" data-a="saveitem"><span class="dot">✓</span>儲存</button></div></div>`)}
function dayForm(i){const t=T0(),d=i!=null?getDays(t)[i]:{};
 modal(`<h3>${i!=null?"編輯本日":"新增一天"}</h3><div class="fm" data-i="${i??""}"><label>城市／主題<input id="fd-c" value="${esc(d.city)}" placeholder="例如 皇后鎮"></label><label>日期（留空會依出發日自動帶入）<input id="fd-date" value="${esc(d.date)}" placeholder="例如 3/12（四）"></label><label>當天重點<input id="fd-p" value="${esc(d.pos)}"></label><label>當日備案／說明<textarea id="fd-m" rows="3">${esc(d.more)}</textarea></label><div class="pills"><button class="pill" data-a="saveday"><span class="dot">✓</span>儲存</button></div></div>`)}
function saveDay(){const t=T0(),f=document.querySelector(".fm"),i=f.dataset.i===""?null:+f.dataset.i,D=getDays(t),c=$("#fd-c").value.trim(),p=$("#fd-p").value.trim();let date=$("#fd-date").value.trim();
 if(i!=null){D[i].city=c;D[i].pos=p;D[i].more=$("#fd-m").value.trim();D[i].date=date}
 else{const n=D.length;if(!date&&/^\d{4}-\d{2}-\d{2}/.test(t.startDate||"")){const x=new Date(t.startDate+"T00:00");x.setDate(x.getDate()+n);date=`${x.getMonth()+1}/${x.getDate()}（${"日一二三四五六"[x.getDay()]}）`}D.push({k:"D"+(n+1),date,city:c,wx:"",tp:"",pos:p,more:$("#fd-m").value.trim(),items:[]});dayI[t.id]=n}
 setDays(t,D);$("#modal").classList.remove("on");refreshDays(t)}

function mapZoom(t,k){const mz=$("#mz");if(zm===k){zm=null;mz.style.transform="";document.querySelectorAll(".hs").forEach(b=>b.classList.remove("act"));$("#mi").innerHTML="點地圖上的地點，會放大並顯示當天資訊";return}
 zm=k;const h=t.hotspots[k],S=2.4,px=h.x/t.mapSize[0]*100,py=h.y/t.mapSize[1]*100,cl=v=>Math.min(0,Math.max(100-100*S,v));
 mz.style.transform=`translate(${cl(50-px*S)}%,${cl(50-py*S)}%) scale(${S})`;document.querySelectorAll(".hs").forEach((b,i)=>b.classList.toggle("act",i===k));
 const d=getDays(t)[h.day]||{};$("#mi").innerHTML=`<b>${esc(h.name)}</b><span class="chip">${esc(d.k)}</span><p>${esc(h.note)}</p><p>${esc(d.date)} ${esc(d.city)}・${esc(d.tp)}</p><div class="pills"><button class="pill" data-a="day" data-v="${h.day}" data-go="1">看 ${esc(d.k)} 行程</button><a class="pill gl" href="https://maps.google.com/?q=${encodeURIComponent(h.name+" 北海道")}" target="_blank" rel="noopener">地圖</a></div>`}

/* cards */
function tcard(t){const fut=t.status==="future",mine=String(t.id).startsWith("u-");
 return`<article class="glass tc ${fut?"fut":""}"><div class="ph">${t.image?`<img src="${esc(t.image)}" alt="${esc(t.title)}" loading="lazy" onerror="this.remove()">`:""}<span>${flagOf(t)}</span></div><div class="in"><h3>${esc(t.title)}</h3><p class="meta">${esc(t.country)}・${esc(t.startDate||"日期未定")}${t.endDate?" – "+esc(t.endDate.slice(5)):""}・${nd(t)} 天</p>${t.notes?`<p style="margin-top:8px;font-size:.9rem">${esc(t.notes)}</p>`:""}
 <div class="pills" style="margin-top:10px">${t.spots?.length?`<a class="pill gl" href="https://maps.google.com/?q=${t.spots[0].lat},${t.spots[0].lng}" target="_blank" rel="noopener">地圖</a>`:""}${t.status==="past"?`<button class="pill" data-a="setcur" data-v="${esc(t.id)}">重新設為當前行程</button>`:""}${fut?`<button class="pill" data-a="setcur" data-v="${esc(t.id)}">設為當前行程</button>`:""}${me?`<button class="pill gl" data-a="edit" data-v="${esc(t.id)}"><i class=i-edit></i> 編輯</button>`:""}${t.owner===me?.uid?`<button class="pill gl" data-a="del" data-v="${esc(t.id)}">✕ 刪除</button>`:""}</div></div></article>`}

/* add / edit */
function form(st,id){const t0=TRIPS.find(x=>x.id===id),t=t0?{...t0,status:statusOf(t0)}:{status:st,spots:[]},sp=t.spots?.[0]||{};
 modal(`<h3>${id?"編輯旅程":"新增旅程"}</h3><div class="fm" data-id="${esc(id||"")}">
 <label>地點<input id="f-place" value="${esc(t.title)}" placeholder="例如：清邁" required></label>
 <label>國家<input id="f-country" list="cl" value="${esc(t.country)}" placeholder="例如：泰國" required></label><datalist id="cl">${Object.keys(FL).map(k=>`<option value="${k}">`).join("")}</datalist>
 <div class="two"><label>出發日<input id="f-s" type="date" value="${esc(t.startDate)}"></label><label>回程日<input id="f-e" type="date" value="${esc(t.endDate)}"></label></div>
 <label>類型<select id="f-st"><option value="now" ${t.status==="now"?"selected":""}>當前旅程</option><option value="past" ${t.status==="past"?"selected":""}>歷史旅程</option><option value="future" ${t.status==="future"?"selected":""}>未來清單</option></select></label>
 <label>圖片連結<input id="f-img" type="url" value="${esc(t.image)}" placeholder="https://…"></label>
 <label>備註<textarea id="f-note" rows="3">${esc(t.notes)}</textarea></label>
 <details><summary>進階：座標（留空會自動查詢）</summary><div class="two"><label>緯度<input id="f-lat" type="number" step="any" value="${sp.lat??""}"></label><label>經度<input id="f-lng" type="number" step="any" value="${sp.lng??""}"></label></div></details>
 <div class="pills"><button class="pill" data-a="save"><span class="dot">✓</span>儲存</button></div></div>`)}
async function geo(q){try{const r=await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&q="+encodeURIComponent(q));const j=await r.json();return j[0]?[+j[0].lat,+j[0].lon]:null}catch(e){return null}}
const CUR={日本:"JPY",台灣:"TWD",韓國:"KRW",泰國:"THB",美國:"USD",瑞士:"CHF",法國:"EUR",德國:"EUR",義大利:"EUR",西班牙:"EUR",荷蘭:"EUR",奧地利:"EUR",希臘:"EUR",芬蘭:"EUR"};
const archiveNow=ex=>Promise.all(visible().filter(x=>x.status==="now"&&x.id!==ex).map(x=>setSt(x,"past")));
async function saveForm(){if(!me)return toast("請先登入");
 const v=i=>$("#f-"+i).value.trim(),id=document.querySelector(".fm").dataset.id,place=v("place"),country=v("country");
 if(!place||!country)return toast("請填寫地點與國家");
 let img=v("img");if(img&&!/^https?:\/\//i.test(img)){toast("圖片連結需以 http(s):// 開頭");img=""}
 const old=id?TRIPS.find(x=>x.id===id):null,spots=old?[...(old.spots||[])]:[];let lat=parseFloat(v("lat")),lng=parseFloat(v("lng"));
 if(!isNaN(lat)&&!isNaN(lng)){if(spots.length&&spots[0].lat===lat&&spots[0].lng===lng){}else if(spots.length)spots[0]={...spots[0],lat,lng};else spots.push({name:place,lat,lng,day:1})}
 else if(!spots.length){toast("查詢座標中…");const g=await geo(place+", "+country);if(g)spots.push({name:place,lat:g[0],lng:g[1],day:1});else toast("找不到座標，可稍後編輯")}
 const s=v("e")&&v("s")?v("s"):v("s"),e=v("e"),nDays=s&&e?Math.max(1,Math.round((new Date(e)-new Date(s))/864e5)+1):(old?.nDays||1);
 const base={title:place,country,countryCode:FL[country]||"",startDate:s,endDate:e,image:img,notes:v("note"),nDays,spots},st=v("st");
 try{if(old){await patch(old,base);if(st==="now")await archiveNow(old.id);await setSt(old,st)}
 else{if(st==="now")await archiveNow("");const ref=doc(collection(db,"trips"));await setDoc(ref,{...clean({...base,days:[],booking:[],expenses:[],currency:CUR[country]||"TWD",lightSplitUrl:"",diets:{},ext:EXT0,owner:me.uid,members:[me.uid],memberNames:{[me.uid]:me.displayName||"我"},st:{[me.uid]:st}}),createdAt:serverTimestamp()})}
 $("#modal").classList.remove("on");toast("已儲存")}catch(err){toast("儲存失敗："+(err.code||err.message))}}

function render(){const v=visible(),by=s=>v.filter(t=>t.status===s);zm=null;
 renderNow(by("now")[0]);
 const real=v.filter(t=>t.status!=="future");
 $("#stats").innerHTML=`<div class="glass stat"><b>${new Set(real.map(t=>t.countryCode||t.country)).size}</b><small>造訪國家</small></div><div class="glass stat"><b>${real.reduce((s,t)=>s+nd(t),0)}</b><small>總天數</small></div><div class="glass stat"><b>${real.length}</b><small>趟旅行</small></div>`;
 MapView.render(v);if(cur==="map")MapView.refresh();
 const emp='<p class="empty">還沒有旅程，點上方「＋ 新增旅程」開始記錄</p>';
 $("#l-past").innerHTML=by("past").map(tcard).join("")||emp;$("#l-future").innerHTML=by("future").map(tcard).join("")||emp;renderDrawer();updBar();tick()}
function tick(){const el=$("#cd"),t=visible().find(x=>x.status==="now"&&!x.locked);if(!el||!t||!t.startDate)return;const now=new Date(),st=new Date(t.startDate+"T00:00");
 const al=t.alerts||[];if(now>=st&&!al.length){const dd=Math.floor((now-st)/864e5)+1;el.textContent=dd<=nd(t)?`旅程第 ${dd} 天`:"旅程結束 ✨";return}
 if(now<st){el.textContent=`出發倒數 ${Math.ceil((st-now)/864e5)} 天`;return}
 const nx=al.find(a=>new Date(a[0])>now);if(!nx){el.textContent="旅程結束 ✨";return}
 const ms=new Date(nx[0])-now,d=Math.floor(ms/864e5),h=Math.floor(ms%864e5/36e5),m=Math.floor(ms%36e5/6e4);el.textContent=`${nx[1]}・${d?d+"天":""}${h}時${m}分`}

/* events */
document.addEventListener("click",e=>{const b=e.target.closest("[data-a],[data-t]");if(!b)return;
 const t=visible().find(x=>x.status==="now"&&!x.locked),a=b.dataset.a,v=b.dataset.v;
 if(b.dataset.t){go(b.dataset.t);return}
if(b.closest("#drawer")&&a&&a!=="menu")document.body.classList.remove("dr");
 if(a==="menu"){document.body.classList.toggle("dr");return}
 if(a==="add"){if(!me)return toast("請先登入 Google 帳戶");form(v);return}
 if(a==="edit"){form(null,v);return}
 if(a==="save"){saveForm();return}
 if(a==="del"){const x=TRIPS.find(y=>y.id===v);if(x&&x.owner===me?.uid&&confirm("刪除這趟旅程？所有共編成員都會失去這份行程。"))deleteDoc(tdoc(x)).then(()=>toast("已刪除"));return}
 if(a==="auth"){if(!FB_OK)return toast("尚未設定 Firebase，請先填 firebase-config.js");if(me){if(confirm("要登出嗎？登出會清除這台裝置上的離線快照。"))signOut(auth).then(()=>{try{localStorage.removeItem("tp-snap")}catch(e){}TRIPS=[];SNAP=null;render()})}else login();return}
 if(a==="join"){if(!me)return toast("請先登入 Google 帳戶");modal('<h3>輸入邀請碼</h3><div class="fm"><label>邀請碼<input id="f-code" maxlength="8" placeholder="例如 K7M2QX" style="text-transform:uppercase"></label><div class="pills"><button class="pill" data-a="dojoin">加入行程</button></div></div>');return}
 if(a==="dojoin"){joinTrip($("#f-code").value).then(ok=>{if(ok)$("#modal").classList.remove("on")}).catch(er=>{console.error("[dojoin]",er);toast("加入失敗："+(er.code==="permission-denied"?"權限被拒（請確認 Firestore 規則已發布最新版，且邀請碼未被重設）":(er.code||er.message)))});return}
 if(a==="tpl"){importTpl();return}
 if(a==="invite"&&t){ensureInvite(t).then(c=>c?copy(c,"已複製邀請碼"):toast("產生邀請碼失敗"));return}

 if(a==="q"){$("#jpy").value=v;calc();return}
 if(a==="addex"&&t){const y=parseFloat($("#jpy").value)||0;if(!y)return toast("請先輸入金額");const L=exList(t),sp=[...document.querySelectorAll(".sp:checked")].map(x=>x.value);L.push({item:$("#memo").value.trim()||"花費",amount:y,paidBy:$("#payer").value,splitWith:sp.length?sp:cfg(t).members});saveEx(t,L);$("#t-yen").innerHTML=bar()+yenHTML(t);calc();toast("已記帳");return}
 if(a==="delex"&&t){const L=exList(t);L.splice(+v,1);saveEx(t,L);$("#t-yen").innerHTML=bar()+yenHTML(t);calc();return}
 if(a==="tols"&&t){const y=parseFloat($("#jpy").value)||0;if(!y)return toast("請先輸入金額");copy(`${$("#memo").value.trim()||"花費"} ${curOf()} ${y.toLocaleString()} ≈ NT$${Math.round(y*rate()).toLocaleString()}（匯率${rate()}）付款：${$("#payer").selectedOptions[0].text.replace("付款人：","")}`);if(cfg(t).lightSplitUrl)window.open(cfg(t).lightSplitUrl,"_blank");return}
 if(a==="addi"&&t){const i=$("#in-"+v),x=i.value.trim();if(!x)return;const P=plist(t);P[v].push({t:x,d:0});savePl(t,P);$("#t-pack").innerHTML=bar()+packHTML(t);return}
 if(a==="deli"&&t){e.preventDefault();const P=plist(t);if(!P[b.dataset.k]||!P[b.dataset.k][+b.dataset.i])return;P[b.dataset.k].splice(+b.dataset.i,1);savePl(t,P);$("#t-pack").innerHTML=bar()+packHTML(t);return}

 if(a==="home"){e.preventDefault();go("now");return}
 if(a==="archive"&&t){if(confirm(`將「${t.title}」結束並歸檔到歷史旅程？`)){setSt(t,"past").then(()=>{go("past");toast("已歸檔")})}return}
 if(a==="setcur"){const n=visible().find(x=>x.id===v),o=visible().filter(x=>x.status==="now"&&x.id!==v);if(n&&confirm(`將「${n.title}」${n.status==="past"?"重新":""}設為當前行程？${o.length?"\n原本的當前旅程會自動歸檔到歷史旅程。":""}`)){Promise.all([...o.map(x=>setSt(x,"past")),setSt(n,"now")]).then(()=>{go("now");toast("已設為當前行程")})}return}
 if(a==="addbk"&&t){const i=$("#in-bk"),x=i.value.trim();if(!x)return;const L=bkList(t);L.push({n:x,c:"",u:""});saveBk(t,L);$("#t-tix").innerHTML=bar()+tixHTML(t);return}
 if(a==="delbk"&&t){const L=bkList(t);L.splice(+v,1);saveBk(t,L);$("#t-tix").innerHTML=bar()+tixHTML(t);return}
 if(a==="cpi"){const c=document.querySelector(`[data-b="c"][data-i="${v}"]`).value;c?copy(c):toast("尚未填寫編號");return}
 if(a==="openu"){const u=document.querySelector(`[data-b="u"][data-i="${v}"]`).value.trim();okUrl(u)?window.open(u,"_blank","noopener"):toast("請先貼上 https:// 開頭的雲端連結");return}

 if(a==="addday"&&t){dayForm(null);return}
 if(a==="editday"&&t){dayForm(+v);return}
 if(a==="delday"&&t){const D=getDays(t);D.splice(+v,1);D.forEach((d,j)=>{if(/^D\d+$/.test(d.k))d.k="D"+(j+1)});setDays(t,D);dayI[t.id]=Math.max(0,+v-1);refreshDays(t);return}
 if(a==="additem"&&t){itemForm(+v,null);return}
 if(a==="edititem"&&t){const[p,q]=v.split(":");itemForm(+p,+q);return}
 if(a==="delitem"&&t){const[p,q]=v.split(":"),D=getDays(t);D[+p].items.splice(+q,1);setDays(t,D);refreshDays(t);return}
 if(a==="saveitem"&&t){saveItem();return}
 if(a==="saveday"&&t){saveDay();return}

 if(a==="edtoggle"){setEdit(!document.body.classList.contains("editing"));return}
 if(a==="memoadd"&&t){memoForm(v,null);return}
 if(a==="memoedit"&&t){const[k,i]=v.split(":");memoForm(k,+i);return}
 if(a==="memodel"&&t){const[k,i]=v.split(":"),M=memoOf(t);M[k].splice(+i,1);saveMemo(t,M);$("#t-storm").innerHTML=bar()+stormHTML(t);return}
 if(a==="memosave"&&t){const f=document.querySelector(".fm"),k=f.dataset.k,i=f.dataset.i===""?null:+f.dataset.i,M=memoOf(t),A=$("#mm-a").value.trim(),B=$("#mm-b").value.trim();if(!A&&!B)return toast("請填寫內容");
  const it=k==="risks"?{d:A,w:B,p:$("#mm-c").value.trim(),c:$("#mm-x").checked?1:0}:{t:A,d:B};if(i!=null)M[k][i]=it;else M[k].push(it);saveMemo(t,M);$("#modal").classList.remove("on");$("#t-storm").innerHTML=bar()+stormHTML(t);return}
 if(a==="members"&&t){membersModal(t);return}
 if(a==="kick"&&t){if(!confirm(`將「${nameOf(t,v)}」移出這趟行程？`))return;updateDoc(tdoc(t),{members:arrayRemove(v),["st."+v]:deleteField()}).then(()=>{$("#modal").classList.remove("on");toast("已移除成員")}).catch(er=>toast("移除失敗："+(er.code||er.message)));return}
 if(a==="leave"&&t){if(!confirm("確定離開這趟行程？你將無法再查看。"))return;updateDoc(tdoc(t),{members:arrayRemove(me.uid),["st."+me.uid]:deleteField()}).then(()=>{$("#modal").classList.remove("on");go("now");toast("已離開行程")}).catch(er=>toast("失敗："+(er.code||er.message)));return}
 if(a==="resetinv"&&t){if(confirm("重設後舊邀請碼立刻失效（已在行程裡的人不受影響）。要重設嗎？"))resetInvite(t).then(ok=>{if(ok)membersModal(t)});return}
 if(a==="cpinv"){copy(v,"已複製邀請碼");return}
 if(a==="tplreset"&&t){if(TPL&&confirm("將每日行程與地圖標點重設為最新範例？你在每日行程上的修改會被覆蓋。"))patch(t,{days:TPL.days,spots:TPL.spots}).then(()=>{refreshDays(T0());toast("已重設為最新範例")});return}
 if(a==="fixold"&&t){const c=cfg(t);modal(`<h3>整理舊帳目</h3><p class="meta">這些名稱不是目前的成員。請選擇每個名稱要歸給哪位成員，套用後帳本與結算會自動更新。</p><div class="fm">${c.orphans.map(o=>`<label>${esc(lbl(t,o))}<select class="fi" data-orph="${esc(o)}"><option value="">（暫不處理）</option>${c.members.map(m=>`<option value="${esc(m)}">${esc(nameOf(t,m))}</option>`).join("")}</select></label>`).join("")}<div class="pills"><button class="pill" data-a="fixapply">套用</button></div></div>`);return}
 if(a==="fixapply"&&t){const map={};document.querySelectorAll("[data-orph]").forEach(x=>{if(x.value)map[x.dataset.orph]=x.value});const L=exList(t).map(e=>({...e,paidBy:map[e.paidBy]||e.paidBy,splitWith:[...new Set((e.splitWith||[]).map(k=>map[k]||k))]}));saveEx(t,L);$("#modal").classList.remove("on");$("#t-yen").innerHTML=bar()+yenHTML(t);calc();toast("已整理舊帳目");return}
 if(a==="m"&&v==="diet"){openFood(T0());return}
 if(a==="flang"){FLANG=v;store("tp-flang",v);renderFood();return}
 if(a==="cpfood"){const X=((FOOD&&FOOD.cards[FLANG])||[]).map(l=>l.p).join("\n");X?copy(X,"已複製文案"):toast("沒有可複製的文案");return}
 if(a==="focus"){focusCard();return}
 if(a==="fclang"){FLANG=v;store("tp-flang",v);focusCard();return}
 if(a==="fclose"){closeFocus();return}
 if(a==="editdiet"&&t){dietForm(v);return}
 if(a==="savediet"&&t){saveDiet(t);return}
 if(a==="goyen"){go("yen");return}
 if(a==="accday"){const sec=document.getElementById("dacc-"+v);if(sec){const o=sec.classList.toggle("open");b.setAttribute("aria-expanded",o)}return}
 if(a==="print"){document.body.classList.remove("dr");go("now");{const t0=T0();if(t0&&$("#dayblk"))$("#dayblk").innerHTML=getDays(t0).map((_,n)=>dayHTML(t0,n)).join("")}setTimeout(()=>{try{MiniMap.refresh()}catch(e){}setTimeout(()=>window.print(),350)},150);return}
 if(a==="lvnext"||a==="lvprev"||a==="lvauto"){liveStep(a);return}
 if(a==="sosadd"){$("#sosrows").insertAdjacentHTML("beforeend",sosRow(["","",""]));return}
 if(a==="sosdel"){b.closest(".sosr").remove();return}
 if(a==="savesos"&&t){const arr=[...document.querySelectorAll(".sosr")].map(r=>{const l=r.querySelector(".sosl").value.trim(),x=r.querySelector(".sosv").value.trim();return[l,x,/^\+?[\d\s\-()]{3,}$/.test(x)?"tel:"+x.replace(/[^\d+]/g,""):""]}).filter(r=>r[0]||r[1]);patch(t,{sos:arr}).then(()=>{modal(sosHTML(t));toast("已儲存")});return}
 if(a==="export"){exportBackup();return}
 if(a==="import"){const inp=document.createElement("input");inp.type="file";inp.accept="application/json,.json";inp.onchange=()=>importBackup(inp.files[0]);inp.click();return}
 if(a==="close")$("#modal").classList.remove("on");
 else if(a==="cp")copy(v);
 else if(a==="m"&&t)modal({book:bookHTML,diet:dietHTML,sos:sosHTML}[v](t));
 else if(a==="hs"&&t)mapZoom(t,+v);
 else if(a==="day"&&t){focusDay(t,+v,!!b.dataset.go)}});
$("#modal").addEventListener("click",e=>{if(e.target.id==="modal")$("#modal").classList.remove("on")});
(async()=>{MapView.init();
 try{const r=JSON.parse(localStorage.getItem("tp-snap")||"null");if(r&&Array.isArray(r.trips)){SNAP={uid:r.uid,name:r.name,ts:r.ts};TRIPS=r.trips}}catch(e){}
 window.addEventListener("online",updBar);window.addEventListener("offline",updBar);
 try{TPL=(await (await fetch("trips.json")).json()).trips[0]}catch(e){}
 if(FB_OK)onAuthStateChanged(auth,u=>{me=u;if(unsub){unsub();unsub=null}
  if(u&&SNAP&&SNAP.uid!==u.uid){TRIPS=[];SNAP=null;try{localStorage.removeItem("tp-snap")}catch(e){}}
  $("#who").textContent=u?(u.displayName||"我").slice(0,1):"登入";
  if(u){let first=true;unsub=onSnapshot(query(collection(db,"trips"),where("members","array-contains",u.uid)),s=>{TRIPS=s.docs.map(d=>norm({id:d.id,...d.data()}));saveSnap(u);render();if(first){first=false;if(navigator.onLine)migrate()}},er=>console.error("[snapshot]",er))}
  else render()});
 render();setInterval(()=>{tick();refreshLive()},60000);
 if("serviceWorker" in navigator&&location.protocol.startsWith("http"))navigator.serviceWorker.register("sw.js").then(r=>{try{r.update()}catch(e){}}).catch(()=>{});(()=>{if(!navigator.serviceWorker)return;const had=!!navigator.serviceWorker.controller;navigator.serviceWorker.addEventListener("controllerchange",()=>{if(had)showUpd()})})()})();

document.addEventListener("input",e=>{if(e.target.id==="jpy"||e.target.id==="rate")calc()});
document.addEventListener("change",e=>{const c=e.target.closest("input[data-k]"),t=T0();if(!c||!t)return;const P=plist(t);P[c.dataset.k][+c.dataset.i].d=c.checked?1:0;savePl(t,P);c.closest(".ck").classList.toggle("done",c.checked)});

document.addEventListener("change",e=>{const i=e.target.closest("input[data-b]"),t=T0();if(!i||!t)return;const L=bkList(t);L[+i.dataset.i][i.dataset.b]=i.value.trim();saveBk(t,L)});
function go(id){setEdit(false);cur=id;document.body.classList.remove("dr");document.querySelectorAll(".panel").forEach(p=>p.classList.toggle("on",p.id==="t-"+id));renderDrawer();window.scrollTo({top:0});if(id==="map")MapView.refresh();if(id==="now")MiniMap.refresh()}
const ICN={now:"cal",tix:"card",storm:"note",yen:"yen",pack:"chk",map:"globe",past:"clock",future:"compass"};
function renderDrawer(){const t=T0(),nm=t?(t.short||t.title):"",b=(id,c)=>`<button class="${c} ${cur===id?"on":""}" data-t="${id}"><i class="ic ic-${ICN[id]}"></i>${LB[id]}</button>`;
 $("#drawer").innerHTML=`<p class="eyebrow brand" data-a="home">TripTych</p><h2 class="brand" data-a="home">【歷歷】/ TripTych</h2><p class="grp"><i class="ic ic-pin"></i>當前旅程　${t?esc(nm):"（目前沒有）"}</p>${t?SUB.map(i=>b(i,"sub")).join(""):""}<p class="grp">其他旅程</p>${["map","past","future"].map(i=>b(i,"")).join("")}${drawerExtra()}<p class="meta" style="margin-top:auto">資料儲存在你的 Google 帳戶雲端。</p>`;
 $("#crumb").textContent=SUB.includes(cur)?`${t?nm:"當前旅程"} › ${LB[cur]}`:LB[cur]}

/* ---- auth / invite / template / migration ---- */
const emptyNow0=()=>!FB_OK?`<div class="glass blk"><p>${FB_LOAD?"尚未設定 Firebase。請依說明填入 firebase-config.js 後重新整理。":"目前離線，且這台裝置還沒有行程快照。請連線並登入一次，之後就能離線查看。"}</p></div>`:me?'<div class="glass blk"><p>無當前行程，請新增行程或輸入邀請碼</p><div class="pills"><button class="pill" data-a="add" data-v="now"><span class="dot">＋</span>新增行程</button><button class="pill gl" data-a="join">輸入邀請碼</button><button class="pill gl" data-a="tpl">匯入範例：北海道</button></div></div>':'<div class="glass blk"><p>無當前行程，請登入後新增行程或輸入邀請碼</p><div class="pills"><button class="pill" data-a="auth">Google 一鍵登入</button></div></div>';
const guide=()=>me&&!TRIPS.length?'<div class="glass blk guide"><b>快速開始</b><ol><li>新增行程，或向朋友索取邀請碼加入。</li><li>在行程裡新增每日景點，並填寫「地點」，地圖就會自動標出位置。</li><li>出發前在有網路時登入並載入一次，之後離線也能查看。</li></ol></div>':"";
const emptyNow=()=>emptyNow0()+guide()+(foodSnap()?'<div class="pills" style="margin-top:10px"><button class="pill gl" data-a="m" data-v="diet">飲食卡（離線快照）</button></div>':"");
function drawerExtra(){const I=n=>`<i class="ic ic-${n}"></i>`,pr=`<button data-a="print">${I("print")}匯出行程懶人包 / PDF</button><button data-a="export"><i class="ic ic-up"></i>匯出備份（JSON）</button><button data-a="import"><i class="ic ic-down"></i>匯入備份</button>`;
 return me?`<p class="grp">${I("user")}${esc(me.displayName||me.email||"我")}</p><button data-a="add" data-v="now">${I("plus")}新增行程</button><button data-a="join">${I("key")}輸入邀請碼</button><button data-a="tpl">${I("down")}匯入範例：北海道</button>${pr}<button data-a="auth">${I("out")}登出</button>`:`<p class="grp">帳戶</p><button class="login" data-a="auth">Google 一鍵登入</button>${pr}`}
async function login(){const p=new GoogleAuthProvider();try{await signInWithPopup(auth,p)}catch(e){if(e.code==="auth/popup-blocked"||e.code==="auth/operation-not-supported-in-this-environment")signInWithRedirect(auth,p);else if(e.code!=="auth/popup-closed-by-user")toast("登入失敗："+e.code)}}
async function ensureInvite(t){if(t.inviteCode)return t.inviteCode;for(let i=0;i<3;i++){const c=rnd(6);try{await setDoc(doc(db,"invites",c),{tripId:t.id,owner:me.uid});await updateDoc(tdoc(t),{inviteCode:c});t.inviteCode=c;return c}catch(e){}}return null}
async function joinTrip(code){code=code.trim().toUpperCase();if(!code){toast("請輸入邀請碼");return false}
 const iv=await getDoc(doc(db,"invites",code));if(!iv.exists()){toast("找不到這個邀請碼");return false}
 const id=iv.data().tripId;if(TRIPS.some(x=>x.id===id)){toast("你已經在這趟行程裡了");return true}
 const has=visible().some(x=>x.status==="now");
 try{await updateDoc(doc(db,"trips",id),{lastJoinCode:code,members:arrayUnion(me.uid),["memberNames."+me.uid]:me.displayName||"成員",["st."+me.uid]:has?"future":"now"})}catch(e){console.error("[joinTrip] 寫入 trips/"+id+" 失敗",{code:e.code,message:e.message,uid:me.uid,inviteCode:code},e);throw e}toast("已加入行程");go(has?"future":"now");return true}
async function createFromTpl(extra){const {id,expensesConfig,owner,status,...rest}=TPL;await archiveNow("");
 const ref=doc(collection(db,"trips"));
 await setDoc(ref,{...ser({...rest,booking:[],expenses:[],lightSplitUrl:expensesConfig.lightSplitUrl,currency:expensesConfig.currency,templateId:id,diets:{},ext:EXT0,owner:me.uid,members:[me.uid],memberNames:{[me.uid]:me.displayName||"我"},st:{[me.uid]:"now"},...extra}),createdAt:serverTimestamp()})}
async function importTpl(){if(!TPL)return toast("範例資料載入失敗");if(TRIPS.some(x=>x.templateId===TPL.id)&&!confirm("你已經匯入過北海道範例，要再匯入一份嗎？"))return;
 try{await createFromTpl({});go("now");toast("已匯入北海道範例")}catch(e){toast("匯入失敗："+(e.code||e.message))}}
async function migrate(){if(!me||!TPL||sessionStorage.getItem("tp-mig"))return;const P="hokkaido-2027",J=k=>{try{return JSON.parse(load(k))}catch(e){return null}};
 if(load("tp-bk-"+P)!=null||load("tp-ex-"+P)!=null){sessionStorage.setItem("tp-mig","1");
  if(confirm("檢測到本機有舊行程（北海道冬日雪國雙人自由行），是否上傳備份至你的 Firebase 雲端帳號？")){
   try{const x={booking:J("tp-bk-"+P)||[],expenses:J("tp-ex-"+P)||[]};if(J("tp-days-"+P))x.days=J("tp-days-"+P);if(J("tp-lists-"+P))x.lists=J("tp-lists-"+P);
   await createFromTpl(x);["tp-bk-","tp-ex-","tp-days-","tp-lists-"].forEach(k=>localStorage.removeItem(k+P));toast("已上傳備份")}catch(e){toast("上傳失敗："+(e.code||e.message))}}}
 const ut=J("tp-trips");if(Array.isArray(ut)&&ut.length&&confirm(`本機還有 ${ut.length} 筆自行新增的旅程，是否一併上傳？`)){
  try{for(const u of ut){const {id,status,days,...r}=u;await setDoc(doc(collection(db,"trips")),{...clean({...r,nDays:days||1,days:[],booking:[],expenses:[],currency:CUR[u.country]||"TWD",lightSplitUrl:"",owner:me.uid,members:[me.uid],memberNames:{[me.uid]:me.displayName||"我"},st:{[me.uid]:status||"past"}}),createdAt:serverTimestamp()})}
  localStorage.removeItem("tp-trips");toast("已上傳本機旅程")}catch(e){toast("上傳失敗："+(e.code||e.message))}}}

document.addEventListener("change",e=>{if(e.target.id!=="memo-note")return;const t=T0();if(!t)return;const M=memoOf(t);M.note=e.target.value;saveMemo(t,M)});
async function membersModal(t){const code=await ensureInvite(t),mine=me.uid===t.owner;
 modal(`<h3>成員（${t.members.length}）</h3>${t.members.map(u=>`<div class="row"><span>${esc(nameOf(t,u))}${u===t.owner?' <small class="meta">建立者</small>':""}${u===me.uid?' <small class="meta">你</small>':""}</span>${mine&&u!==t.owner?`<button class="cb" data-a="kick" data-v="${esc(u)}">踢出</button>`:""}</div>`).join("")}
 <h4 class="meta" style="margin:16px 0 4px">邀請朋友加入</h4><div class="jp codebox"><span>${esc(code||"—")}</span><button class="pill" data-a="cpinv" data-v="${esc(code||"")}">複製</button></div>
 <p class="meta">把邀請碼傳給親友，他們登入後從選單「輸入邀請碼」輸入就能加入。</p><div class="pills">${mine?'<button class="pill gl" data-a="resetinv">重設邀請碼</button>':'<button class="pill gl" data-a="leave">離開此行程</button>'}</div>`)}
async function resetInvite(t){for(let i=0;i<3;i++){const c=rnd(6);try{await setDoc(doc(db,"invites",c),{tripId:t.id,owner:me.uid});await updateDoc(tdoc(t),{inviteCode:c});t.inviteCode=c;toast("已重設，舊邀請碼失效");return true}catch(e){}}toast("重設失敗");return false}
function pickPt(p){const t=T0();if(!t)return null;const d=getDays(t)[p.day]||{},k=d.k||"",hot=(t.hotspots||[]).find(h=>h.name===p.title),tag=(hot&&hot.note)||p.note||"",meta=[d.date,d.city].filter(Boolean).join(" ")+((d.wx||d.tp)?"・"+[d.wx,d.tp].filter(Boolean).join(" "):"");
 const el=document.createElement("div");el.className="pp";
 el.innerHTML=`<div class="mit"><b>${esc(p.title)}</b>${k?`<span class="chip">${esc(k)}</span>`:""}</div>${tag?`<p class="ptag">${esc(tag)}</p>`:""}${p.time?`<p>${esc(p.time)}</p>`:""}${meta?`<p class="mis">${esc(meta)}</p>`:""}<div class="pills">${k?`<button class="pill" data-ppday="${p.day}">看 ${esc(k)} 行程</button>`:""}<a class="pill gl" href="https://maps.google.com/?q=${p.lat},${p.lng}" target="_blank" rel="noopener">地圖</a></div>`;
 const b=el.querySelector("[data-ppday]");if(b)b.addEventListener("click",()=>focusDay(t,p.day,true));
 return el}
window.__tp=true;

/* ===== P0：飲食安全卡 Food Safety Guard =====
   資料：trip.diets = { [uid]: { tags:[], note:"", flex:bool } }
   預留（P1/P2）：trip.ext = { liveEvents:[], mealLedger:{}, offlinePack:{}, phrasebook:{} }，詳見 SCHEMA.md */
const EXT0={liveEvents:[],mealLedger:{},offlinePack:{},phrasebook:{}};
const DTAGS=[["ovo","蛋奶素"],["wuxin","五辛素"],["vegan","全素"],["nobeef","不吃牛肉"],["nopork","不吃豬肉"],["noseafood","不吃海鮮"],["nutallergy","堅果過敏"]];
const TAGX={ovo:["meat","sea","dashi","mext"],wuxin:["meat","sea","dashi","mext","wux"],vegan:["meat","sea","dashi","mext","egg","dairy"],nobeef:["beef"],nopork:["pork"],noseafood:["sea","dashi"],nutallergy:["nut"]};
const TERM={meat:["肉類","肉類","meat"],sea:["魚介類","魚介類","fish and seafood"],dashi:["柴魚高湯","鰹節（出汁）","bonito flakes and dashi stock"],mext:["肉類萃取物","肉エキス","meat extract"],beef:["牛肉","牛肉・牛エキス","beef and beef extract"],pork:["豬肉","豚肉・ラード","pork and lard"],wux:["五辛（蔥蒜韭等）","ネギ・ニンニク・ニラ・玉ねぎ","onion, garlic and leek"],egg:["蛋","卵","eggs"],dairy:["乳製品","乳製品","dairy"],nut:["堅果類","ナッツ類","nuts"]};
const ORDER=["meat","sea","dashi","mext","beef","pork","wux","egg","dairy","nut"];
const LANGS=[["zh","繁體中文"],["ja","日本語"],["en","English"]];
const FLEXRE=/鍋邊素|彈性|可接受|接受|方便|不給.{0,4}麻煩|不影響/;
const isFlex=d=>!!(d&&(d.flex||FLEXRE.test(d.note||"")));
let FLANG=load("tp-flang")||"zh",FOOD=null;
function foodModel(diets,members,names){const strict=new Set,soft=new Set,allergy=new Set;let veg=false;
 const rows=members.map(u=>{const d=diets[u]||{},tags=d.tags||[];tags.forEach(tg=>{if(["ovo","wuxin","vegan"].includes(tg))veg=true;(TAGX[tg]||[]).forEach(k=>{if(k==="nut")allergy.add(k);else(isFlex(d)?soft:strict).add(k)})});return{u,name:names[u]||u,tags,note:d.note||"",flex:isFlex(d)}});
 strict.forEach(k=>soft.delete(k));const o=ks=>ORDER.filter(k=>ks.has(k));
 return{rows,strict:o(strict),soft:o(soft),allergy:o(allergy),ok:veg&&!strict.has("egg")&&!strict.has("dairy")?["egg","dairy"]:[]}}
function foodLines(m,L){const sep=L===2?", ":"・",nm=ks=>ks.map(k=>TERM[k][L]);
 const mk=(ks,fn)=>{const a=nm(ks);return{h:fn(a.map(x=>`<b class="hl">${esc(x)}</b>`).join(sep)),p:fn("【"+a.join(sep)+"】")}},out=[];
 if(m.strict.length){const ok=m.ok.length?nm(m.ok).join(sep):"";out.push(mk(m.strict,X=>[`我們團隊有人不能吃${X}。${ok?ok+"可以。":""}請問有可以提供的餐點嗎？`,`すみません、私たちのグループには${X}が食べられない人がいます。${ok?ok+"は大丈夫です。":""}対応可能なメニューはありますか？`,`Excuse me, some people in our group cannot eat ${X}. ${ok?ok+" are OK. ":""}Do you have any suitable dishes?`][L]))}
 if(m.soft.length)out.push(mk(m.soft,X=>[`${m.strict.length?"另外，":""}也有人希望盡量避開${X}，只要稍微避開湯底或配料就可以，不需要特別為我們麻煩，謝謝。`,`${m.strict.length?"また、":"すみません、"}できれば${X}を避けたい人もいます。スープや具材を少し避ければ対応可能であれば助かります。無理のない範囲で結構です。`,`${m.strict.length?"Also, s":"Excuse me, s"}ome of us would prefer to avoid ${X}. If you can simply leave out the broth or ingredients, that would help — please don't go out of your way.`][L]));
 if(m.allergy.length)out.push(mk(m.allergy,X=>[`有人對${X}過敏，即使少量也不能吃，請特別留意。`,`${X}のアレルギーがある人がいます。少量でも食べられませんので、ご確認をお願いします。`,`Someone in our group has an allergy to ${X}. Even a small amount is not safe — please check carefully.`][L]));
 return out}
function buildFood(t){const m=foodModel(t.diets||{},t.members||[],t.memberNames||{}),cards={};LANGS.forEach(([c],i)=>cards[c]=foodLines(m,i));
 const f={id:t.id,title:t.title,ts:Date.now(),rows:m.rows,cards,legacy:t.diet||"",live:true};
 try{localStorage.setItem("tp-food-"+t.id,JSON.stringify({...f,live:false}));localStorage.setItem("tp-food-last",t.id)}catch(e){}return f}
function foodSnap(){try{const id=load("tp-food-last");return id?JSON.parse(load("tp-food-"+id)):null}catch(e){return null}}
function openFood(t){FOOD=t?buildFood(t):foodSnap();if(!FOOD)return toast("目前沒有飲食卡資料");renderFood()}
function renderFood(){const f=FOOD,k=LANGS.some(x=>x[0]===FLANG)?FLANG:"zh",ls=f.cards[k]||[],tg=x=>(DTAGS.find(d=>d[0]===x)||[0,x])[1];
 const rows=f.rows.map(r=>`<div class="frow"><div><b>${esc(r.name)}</b> ${r.tags.length?r.tags.map(x=>`<span class="ftag">${esc(tg(x))}</span>`).join(""):'<span class="meta">未設定</span>'}${r.flex?'<span class="ftag soft">可彈性</span>':""}${r.note?`<p class="meta">${esc(r.note)}</p>`:""}</div>${f.live?`<button class="cb ed" data-a="editdiet" data-v="${esc(r.u)}" aria-label="編輯飲食"><i class=i-edit></i></button>`:""}</div>`).join("");
 modal(`<h3>飲食溝通卡</h3><div class="lang">${LANGS.map(([c,n])=>`<button class="${c===k?"on":""}" data-a="flang" data-v="${c}">${n}</button>`).join("")}</div>
 <h4 class="meta" style="margin:14px 0 4px">團隊成員飲食${f.live?"（編輯模式下可修改）":"（離線快照）"}</h4>${rows}
 <h4 class="meta" style="margin:14px 0 6px">溝通文案</h4><div class="foodcard">${ls.length?ls.map(l=>`<p>${l.h}</p>`).join(""):(k==="ja"&&f.legacy?`<p>${esc(f.legacy)}</p>`:'<p class="meta">尚未設定任何成員的飲食偏好。開啟編輯模式後，可為每位成員設定。</p>')}</div>
 <div class="pills"><button class="pill" data-a="cpfood">複製文案</button><button class="pill" data-a="focus">現場大字卡</button></div>`)}
function focusCard(){const k=FLANG==="zh"?"ja":FLANG;let el=$("#focus");if(!el){el=document.createElement("div");el.id="focus";document.body.appendChild(el)}
 const ls=(FOOD&&FOOD.cards[k])||[];FLANG=k;
 el.innerHTML=`<div class="fbar"><div class="lang">${[["ja","日本語"],["en","English"]].map(([c,n])=>`<button class="${c===k?"on":""}" data-a="fclang" data-v="${c}">${n}</button>`).join("")}</div><button class="fclose" data-a="fclose">✕ 結束</button></div><div class="fbody">${ls.map(l=>`<p>${l.h}</p>`).join("")||"<p>（尚未設定飲食偏好）</p>"}</div>`;
 el.classList.add("on");try{document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen().catch(()=>{})}catch(e){}}
function closeFocus(){const el=$("#focus");if(el)el.classList.remove("on");try{document.fullscreenElement&&document.exitFullscreen()}catch(e){}}
function dietForm(u){const t=T0(),d=(t.diets&&t.diets[u])||{};modal(`<h3>編輯飲食：${esc(nameOf(t,u))}</h3><div class="fm" data-u="${esc(u)}"><div class="splits">${DTAGS.map(([c,n])=>`<label class="chk"><input type="checkbox" class="dtg" value="${c}" ${(d.tags||[]).includes(c)?"checked":""}> ${n}</label>`).join("")}</div><label class="chk"><input type="checkbox" id="df-flex" ${d.flex?"checked":""}> 可彈性處理（接受鍋邊素、不想給店家添麻煩）</label><label>彈性與極限備註<textarea id="df-note" rows="3" placeholder="例如：接受鍋邊素／香料味不重可接受／主要求方便、不給店家添麻煩">${esc(d.note)}</textarea></label><div class="pills"><button class="pill" data-a="savediet"><span class="dot">✓</span>儲存</button></div></div>`)}
async function saveDiet(t){const u=document.querySelector(".fm").dataset.u,diets={...(t.diets||{}),[u]:{tags:[...document.querySelectorAll(".dtg:checked")].map(x=>x.value),note:$("#df-note").value.trim(),flex:$("#df-flex").checked}};
 await patch(t,{diets});openFood(t);toast("已儲存飲食設定")}
/* 餐廳 × 成員忌口 自動比對 */
const RT=[["has_vegetarian","有素食餐點"],["contains_dashi","含柴魚高湯"],["no_vegetarian","幾乎無素食"],["beef_only","牛肉為主"],["seafood_focus","海鮮為主"]];
const RESTRE=/餐|食|咖哩|拉麵|ラーメン|壽司|寿司|燒肉|焼肉|丼|料理|食堂|レストラン|カフェ|cafe|restaurant|ramen|居酒屋|蕎麥|そば|うどん|烏龍/i;
function inferRT(x){const s=[x.h,x.d,x.more].join(" "),r=new Set(x.diet||[]);
 if(/素食|ベジ|vegan|vegetarian/i.test(s))r.add("has_vegetarian");
 if(/拉麵|ラーメン|蕎麥|そば|うどん|烏龍|柴魚|鰹|出汁|關東煮|おでん/i.test(s))r.add("contains_dashi");
 if(/燒肉|焼肉|牛排|ステーキ|烤肉|成吉思汗|ジンギスカン|豚骨|牛舌/i.test(s)){r.add("no_vegetarian");if(/牛/.test(s))r.add("beef_only")}
 if(/壽司|寿司|海鮮|刺身|螃蟹|蟹/i.test(s))r.add("seafood_focus");
 if(r.has("has_vegetarian"))r.delete("no_vegetarian");return r}
const RTL={has_vegetarian:"有素食餐點",contains_dashi:"🐟 含柴魚高湯",no_vegetarian:"🚫 幾乎無素食",beef_only:"🥩 牛肉為主",seafood_focus:"🦐 海鮮為主"};
const isRest=x=>!!((x.diet&&x.diet.length)||RESTRE.test((x.h||"")+" "+(x.d||"")));
function dietTags(x){const ex=new Set(x.diet||[]),all=isRest(x)?inferRT(x):ex;if(!all.size)return"";return`<div class="rtags">${[...all].map(k=>`<span class="rtag ${ex.has(k)?"":"inf"}">${RTL[k]||esc(k)}</span>`).join("")}</div>`}
function dietWarn(x,t){if(!t||!t.diets||!Object.keys(t.diets).length||!isRest(x))return"";
 const tg=inferRT(x),W=[],nm=us=>us.map(u=>nameOf(t,u)).join("、"),who=f=>(t.members||[]).filter(u=>{const d=t.diets[u];return d&&!isFlex(d)&&f(d.tags||[])});
 const veg=who(a=>a.some(z=>["ovo","wuxin","vegan"].includes(z)));if(veg.length&&(tg.has("no_vegetarian")||tg.has("beef_only")||tg.has("seafood_focus")))W.push(`${nm(veg)} 嚴格素食，此餐廳缺乏素食可食餐點`);
 const ds=who(a=>a.some(z=>(TAGX[z]||[]).includes("dashi")));if(ds.length&&tg.has("contains_dashi")&&!(x.diet||[]).includes("has_vegetarian"))W.push(`${nm(ds)} 不能吃柴魚高湯，此餐廳含柴魚（出汁）`);
 const nb=who(a=>a.includes("nobeef"));if(nb.length&&tg.has("beef_only"))W.push(`${nm(nb)} 不吃牛肉，此餐廳以牛肉為主`);
 const ns=who(a=>a.includes("noseafood"));if(ns.length&&tg.has("seafood_focus"))W.push(`${nm(ns)} 不吃海鮮，此餐廳以海鮮為主`);
 return W.map(w=>`<div class="dwarn">⚠️ ${esc(w)}</div>`).join("")}

/* 每日結尾「備案／說明」：檢視模式顯示摺疊，編輯模式為可編輯 Textarea（離開輸入框自動儲存） */
const dayMore=(d,i)=>`${d.more?`<details class="vw daymorev"><summary>當日備案／說明</summary><p>${esc(d.more)}</p></details>`:""}<div class="ed daymoree"><small class="meta">當日備案／說明（離開輸入框自動儲存）</small><textarea class="fi daymore" data-di="${i}" rows="3" placeholder="例如：下雨時改去室內景點…">${esc(d.more||"")}</textarea></div>`;
document.addEventListener("change",e=>{const el=e.target.closest(".daymore");if(!el)return;const t=T0();if(!t)return;const D=getDays(t),di=+el.dataset.di;if(!D[di])return;D[di].more=el.value.trim();setDays(t,D);toast("已儲存當日說明")});

/* ===== 離線優先：本機快照 ===== */
function saveSnap(u){SNAP={uid:u.uid,name:u.displayName,ts:Date.now()};try{localStorage.setItem("tp-snap",JSON.stringify({...SNAP,trips:TRIPS}))}catch(e){console.warn("[offline] 快照寫入失敗（儲存空間不足？）",e)}}
function updBar(){let b=$("#offbar");if(!b){b=document.createElement("div");b.id="offbar";b.setAttribute("role","status");document.body.prepend(b)}
 b.textContent="⚡ 目前為離線檢視模式（顯示上次同步資料）";b.style.display=(!navigator.onLine||(!me&&SNAP))?"block":"none";document.body.classList.toggle("ro",!me)}

/* ===== 現場即時模式：現在 / 下一步 ===== */
let LIVE={sim:false,d:0,i:-1};
function liveCalc(t){const D=getDays(t);if(!D.length)return null;let d,i,off=false,before=false,left=0;
 if(LIVE.sim){d=Math.min(LIVE.d,D.length-1);i=LIVE.i}
 else{const k=Math.floor((Date.now()-new Date((t.startDate||"")+"T00:00"))/864e5);
  if(isNaN(k)||k<0){d=0;i=-1;off=true;before=true;left=isNaN(k)?0:-k}
  else if(k>=D.length){d=D.length-1;i=D[d].items.length-1;off=true}
  else{d=k;const n=new Date(),cur=n.getHours()*60+n.getMinutes();i=-1;D[d].items.forEach((x,j)=>{if(isT(x.t)){const[h,m]=x.t.split(":");if(+h*60+ +m<=cur)i=j}})}}
 const its=D[d].items;return{D,d,i,off,before,left,day:D[d],now:its[i]||null,next:its[i+1]||null}}
const mins=x=>{const[h,m]=x.t.split(":");return+h*60+ +m};
function liveHTML(t){const c=liveCalc(t);if(!c)return'<div class="lvh"><span class="ldot"></span><b>現在 / 下一步</b></div><p class="meta">新增每日行程後，這裡會顯示現在與下一步。</p>';
 if(c.off)return`<div class="lvh"><span class="ldot"></span><b>非行程時段</b></div><p class="meta">${c.before?(c.left?`距離出發還有 ${c.left} 天。`:"尚未設定出發日。"):"旅程已結束。"}旅行期間會依手機時間自動標示現在與下一步。</p><div class="lvctl"><button data-a="lvnext">預覽行程</button></div>`;
 const {now,next,day}=c,stay=now&&next&&isT(now.t)&&isT(next.t)&&mins(next)>mins(now)?mins(next)-mins(now):0,
 st=stay?`預估停留 ${stay>=60?Math.floor(stay/60)+" 小時 ":""}${stay%60?stay%60+" 分":""}`:"",
 dest=next?(next.lat!=null?`${next.lat},${next.lng}`:encodeURIComponent((next.q||next.h)+(t.country?" "+t.country:""))):"";
 return`<div class="lvh"><span class="ldot ${LIVE.sim?"sim":"on"}"></span><b>${LIVE.sim?"預覽模式":"現在 / 下一步"}</b><span class="meta">${esc(day.k)}${day.date?" "+esc(day.date):""}</span></div>
 <div class="lvrow"><small>現在</small><b>${now?esc((now.t?now.t+"　":"")+now.h):"尚未開始"}</b></div>
 <div class="lvrow nx"><small>下一步</small><b>${next?esc((next.t?next.t+"　":"")+next.h):"今日行程已完成"}</b>${st?`<span class="lvst">${st}</span>`:""}</div>
 ${next?`<a class="pill lvnav" href="https://www.google.com/maps/dir/?api=1&destination=${dest}" target="_blank" rel="noopener"><i class="ic ic-nav"></i>導航至下一站</a>`:""}
 <div class="lvctl"><button data-a="lvprev">上一個</button><button data-a="lvnext">下一個</button><button data-a="lvauto" ${LIVE.sim?"":"disabled"}>回到即時</button></div>`}
function refreshLive(){const el=$("#live"),t=T0();if(el&&t)el.innerHTML=liveHTML(t)}
function liveStep(a){const t=T0();if(!t)return;if(a==="lvauto"){LIVE={sim:false,d:0,i:-1};return refreshLive()}
 const c=liveCalc(t);if(!c)return;let{d,i}=c;const D=c.D;
 if(a==="lvnext"){if(i<D[d].items.length-1)i++;else if(d<D.length-1){d++;i=-1}}else{if(i>-1)i--;else if(d>0){d--;i=D[d].items.length-1}}
 LIVE={sim:true,d,i};refreshLive()}
/* ===== 每日行程：純 Tab View（一次只顯示一天） ===== */
const daysAcc=(t,di)=>dayHTML(t,di);
function focusDay(t,i,go){dayI[t.id]=i;const b=$("#dayblk");if(b)b.innerHTML=dayHTML(t,i);document.querySelectorAll("#dtabs button").forEach((x,n)=>x.classList.toggle("on",n===i));if(go){const d=$("#dtabs");if(d)d.scrollIntoView({behavior:"smooth",block:"start"})}}
window.addEventListener("afterprint",()=>{const t=T0(),b=$("#dayblk");if(t&&b)b.innerHTML=dayHTML(t,dayI[t.id]||0)});
window.addEventListener("resize",()=>{try{MapView.refresh();MiniMap.refresh()}catch(e){}});

/* ===== 備份：匯出 / 匯入 JSON ===== */
function exportBackup(){if(!TRIPS.length)return toast("目前沒有可匯出的行程");const data={app:"TripTych",version:1,exported:new Date().toISOString(),trips:clean(TRIPS)};
 const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,1)],{type:"application/json"}));a.download="triptych-backup-"+new Date().toISOString().slice(0,10)+".json";document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},800);toast("已匯出備份")}
async function importBackup(f){if(!f)return;if(!me)return toast("請先登入再匯入");let d;try{d=JSON.parse(await f.text())}catch(e){return toast("檔案格式不正確")}
 const L=Array.isArray(d)?d:d.trips;if(!Array.isArray(L)||!L.length)return toast("檔案裡沒有行程");
 if(!confirm(`將匯入 ${L.length} 趟行程。會建立為新的行程，不會覆蓋現有資料。要繼續嗎？`))return;
 const hasNow=visible().some(x=>x.status==="now");let ok=0;
 for(const x of L){try{const {id,owner,members,memberNames,st,inviteCode,lastJoinCode,createdAt,status,...r}=x;let s0=(st&&Object.values(st)[0])||status||"past";if(s0==="now"&&hasNow)s0="past";
  await setDoc(doc(collection(db,"trips")),{...ser({...r,owner:me.uid,members:[me.uid],memberNames:{[me.uid]:me.displayName||"我"},st:{[me.uid]:s0},importedFrom:id||""}),createdAt:serverTimestamp()});ok++}catch(e){console.error("[import]",e)}}
 toast(`已匯入 ${ok}/${L.length} 趟行程`);if(ok)go("now")}
/* ===== 新版本提示 ===== */
function showUpd(){let b=document.getElementById("updbar");if(!b){b=document.createElement("button");b.id="updbar";b.textContent="有新版本，點此更新";b.onclick=()=>location.reload();document.body.appendChild(b)}b.classList.add("on")}
