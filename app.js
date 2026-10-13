window.__tt=1;
let initializeApp,getAuth,onAuthStateChanged,GoogleAuthProvider,signInWithPopup,signInWithRedirect,signOut,initializeFirestore,persistentLocalCache,persistentMultipleTabManager,collection,query,where,onSnapshot,doc,setDoc,getDoc,getDocs,updateDoc,deleteDoc,arrayUnion,arrayRemove,deleteField,serverTimestamp,firebaseConfig={},FB_LOAD=false,AI_URL="",AUTHREADY=false;
try{const G="https://www.gstatic.com/firebasejs/10.12.2/",[A,B,C,Dd]=await Promise.all([import(G+"firebase-app.js"),import(G+"firebase-auth.js"),import(G+"firebase-firestore.js"),import("./firebase-config.js")]);
 ({initializeApp}=A);({getAuth,onAuthStateChanged,GoogleAuthProvider,signInWithPopup,signInWithRedirect,signOut}=B);
 ({initializeFirestore,persistentLocalCache,persistentMultipleTabManager,collection,query,where,onSnapshot,doc,setDoc,getDoc,getDocs,updateDoc,deleteDoc,arrayUnion,arrayRemove,deleteField,serverTimestamp}=C);firebaseConfig=Dd.firebaseConfig;AI_URL=Dd.aiEndpoint||"";FB_LOAD=true}
catch(e){console.warn("[offline] Firebase SDK 載入失敗，改用本機快照",e)}
const FB_OK=FB_LOAD&&!!firebaseConfig.apiKey&&!String(firebaseConfig.apiKey).startsWith("YOUR");
let auth,db,me=null,TRIPS=[],TPL=null,unsub=null,SNAP=null,SNAPRAW=null,SNAPDONE=false;
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
const visible=()=>me?TRIPS.map(t=>({...t,status:statusOf(t),locked:false})):[];

/* accounting */
function settle(c){const m=c.all||c.members,paid={},owed={};m.forEach(x=>{paid[x]=0;owed[x]=0});let total=0;
 c.expenses.forEach(e=>{total+=e.amount;paid[e.paidBy]=(paid[e.paidBy]||0)+e.amount;const sw=e.splitWith?.length?e.splitWith:c.members;sw.forEach(x=>owed[x]=(owed[x]||0)+e.amount/sw.length)});
 const bal=m.map(x=>({m:x,b:paid[x]-owed[x]})),de=bal.filter(x=>x.b<-.5).sort((a,b)=>a.b-b.b),cr=bal.filter(x=>x.b>.5).sort((a,b)=>b.b-a.b),out=[];let i=0,j=0;
 while(i<de.length&&j<cr.length){const a=Math.min(-de[i].b,cr[j].b);out.push([de[i].m,cr[j].m,a]);de[i].b+=a;cr[j].b-=a;if(de[i].b>-.5)i++;if(cr[j].b<.5)j++}
 return{total,paid,out}}
function acct(t,L,r){const c=cfg(t),S=settle({members:c.members,all:[...c.members,...c.orphans],expenses:L}),cur=c.currency,tw=v=>` <small class="meta">≈ NT$ ${Math.round(v*r).toLocaleString()}</small>`;
 return`<p class="meta">參與成員 (${c.members.length}人)：${c.members.map(m=>esc(nameOf(t,m))).join("、")}</p>${c.orphans.length?`<div class="pay">有 ${c.orphans.length} 個名稱不是目前成員（${c.orphans.map(o=>esc(lbl(t,o))).join("、")}）。<button class="cb" data-a="fixold">整理舊帳目</button></div>`:""}
 
 <p style="margin-top:12px" class="meta">總花費</p><p class="sum">${fmt(S.total,cur)}${tw(S.total)}</p>
 <h4 class="meta" style="margin:12px 0 2px">各自墊付</h4>${[...c.members,...c.orphans.filter(o=>S.paid[o])].map(m=>`<div class="row"><span>${esc(lbl(t,m))}</span><b>${fmt(S.paid[m]||0,cur)}</b></div>`).join("")}
 <h4 class="meta" style="margin:12px 0 2px">結算</h4>${S.out.length?S.out.map(o=>`<div class="pay">${esc(lbl(t,o[0]))} →${esc(lbl(t,o[1]))} <b>${fmt(o[2],cur)}</b>${tw(o[2])}</div>`).join(""):'<div class="pay">已平衡 ✅</div>'}
 <h4 class="meta" style="margin:12px 0 2px">明細</h4>${L.map((e,i)=>`<div class="row"><span>${esc(e.item)}<br><small class="meta">${esc(lbl(t,e.paidBy))} 付</small></span><b>${fmt(e.amount,cur)}</b><button class="x ed" data-a="delex" data-v="${i}" aria-label="刪除">✕</button></div>`).join("")||'<p class="meta">尚無明細</p>'}`}
/* --- Hokkaido sub pages --- */
const T0=()=>visible().find(x=>x.status==="now");
let cur="now";const LB={now:"行程總覽",tix:"票券與預約",storm:"備忘錄",yen:"匯率與帳本",pack:"打包清單",map:"全球足跡",past:"歷史旅程",future:"未來清單"};const SUB=["now","tix","storm","yen","pack"];
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
const cfg=t=>{const ex=t.expenses||[],mem=[...new Set(t.members||[])],ks=new Set();ex.forEach(e=>{ks.add(e.paidBy);(e.splitWith||[]).forEach(k=>ks.add(k))});return{currency:t.currency||"JPY",members:mem,orphans:[...ks].filter(k=>k&&!mem.includes(k)),expenses:ex}};
const lbl=(t,k)=>(t.members||[]).includes(k)?nameOf(t,k):(t.memberNames&&t.memberNames[k]?t.memberNames[k]+"（已離開）":k+"（舊紀錄）");
const memoOf=t=>t.memo?JSON.parse(JSON.stringify(t.memo)):{risks:((t.storm&&t.storm.risks)||[]).map(r=>({d:r[0],w:r[1],p:r[2],c:r[3]?1:0})),steps:((t.storm&&t.storm.crisis)||GST.crisis).map(c=>({t:c[0],d:c[1]})),note:""};
const saveMemo=(t,m)=>patch(t,{memo:m});
const eb=(k,i)=>`<span class="ed mb"><button class="x" data-a="memoedit" data-v="${k}:${i}" aria-label="編輯"><i class=i-edit></i></button><button class="x" data-a="memodel" data-v="${k}:${i}" aria-label="刪除">✕</button></span>`;
const stormHTML=t=>{const M=memoOf(t);return`<h2 class="sec">備案提醒</h2>${M.risks.map((r,i)=>`<div class="rw ${r.c?"crit":""}"><b>${esc(r.d)}</b><span>${esc(r.w)}</span><em>${esc(r.p)}</em>${eb("risks",i)}</div>`).join("")||'<p class="meta" style="margin:4px">還沒有備案。</p>'}<div class="pills ed"><button class="pill" data-a="memoadd" data-v="risks">＋ 新增備案</button></div>
<h2 class="sec">緊急處理步驟</h2><ol class="cr">${M.steps.map((s,i)=>`<li><div><b>${esc(s.t)}</b><span>${esc(s.d)}</span></div>${eb("steps",i)}</li>`).join("")}</ol><div class="pills ed"><button class="pill" data-a="memoadd" data-v="steps">＋ 新增步驟</button></div><div class="pills"><a class="pill" href="tel:119">撥打 119</a></div>
<h2 class="sec">個人備忘</h2><p class="meta" style="margin:0 4px 6px">同一趟行程的成員在技術上讀得到，請勿記密碼等敏感資料。</p><div class="glass blk"><div class="vw memo">${M.note?esc(M.note):'<span class="meta">（空白，按「編輯模式」可以寫）</span>'}</div><textarea class="fi ed" id="memo-note" rows="6" placeholder="想記的事…（備案、集合地點、提醒…）">${esc(M.note)}</textarea></div>`};
function memoForm(k,i){const t=T0(),M=memoOf(t),x=i!=null?M[k][i]:{};
 modal(k==="risks"?`<h3>${i!=null?"編輯":"新增"}備案</h3><div class="fm" data-k="risks" data-i="${i?gap=""}"><label>天數／標題<input id="mm-a" value="${esc(x.d)}" placeholder="例如 D3"></label><label>可能的狀況<input id="mm-b" value="${esc(x.w)}"></label><label>備案對策<input id="mm-c" value="${esc(x.p)}"></label><label class="chk"><input type="checkbox" id="mm-x" ${x.c?"checked":""}> 標為重要（紅色）</label><div class="pills"><button class="pill" data-a="memosave">儲存</button></div></div>`
 :`<h3>${i!=null?"編輯":"新增"}步驟</h3><div class="fm" data-k="steps" data-i="${i??""}"><label>步驟標題<input id="mm-a" value="${esc(x.t)}"></label><label>說明<input id="mm-b" value="${esc(x.d)}"></label><div class="pills"><button class="pill" data-a="memosave">儲存</button></div></div>`)}
function setEdit(on){document.body.classList.toggle("editing",on);document.querySelectorAll(".edt").forEach(x=>{x.innerHTML=on?"結束並儲存":"<i class=i-edit></i> 編輯模式";x.classList.toggle("on",on)})}
function bar0(arch){const on=document.body.classList.contains("editing");return`<div class="pills topact"><button class="pill mini edt ${on?"on":""}" data-a="edtoggle">${on?"結束並儲存":"<i class=i-edit></i> 編輯模式"}</button>${arch?'<button class="pill mini" data-a="archive">結束並歸檔</button>':""}${(()=>{const tt=T0();return arch&&tt&&TPL&&tt.templateId===TPL.id?'<button class="pill mini ed" data-a="tplreset">↺ 重設為最新範例</button>':""})()}</div>`}
function yenHTML(t){const c=cfg(t),r=rate(),L=exList(t);
 return`<div class="glass blk"><p class="meta">${c.currency} 換台幣</p><div class="bigres" id="twd">NT$ 0</div>
 <label class="fl">${c.currency} 金額<input class="fi" id="jpy" type="number" inputmode="numeric" placeholder="例如 11370"></label>
 <label class="fl">匯率（1 ${c.currency} = ? NT$）<input class="fi" id="rate" type="number" step="0.001" value="${r}"></label><div class="qk" id="qk"></div></div>
 <h2 class="sec">記一筆</h2><div class="glass blk"><input class="fi" id="memo" placeholder="項目（例：午餐湯咖哩）"><select class="fi" id="payer" aria-label="付款人">${c.members.map(m=>`<option value="${esc(m)}" ${m===me?.uid?"selected":""}>付款人：${esc(nameOf(t,m))}</option>`).join("")}</select><div class="splits"><small class="meta">分攤對象</small>${c.members.map(m=>`<label class="chk"><input type="checkbox" class="sp" value="${esc(m)}" checked> ${esc(nameOf(t,m))}</label>`).join("")}</div>
 <div class="pills"><button class="pill" data-a="addex">＋ 記入帳本</button></div></div>
 <h2 class="sec">帳本與結算</h2><div class="glass blk">${acct(t,L,r)}</div>`}
function packHTML(t){const P=plist(t),sec=(k,ti)=>`<h2 class="sec">${ti}</h2><div class="glass blk">${P[k].map((x,i)=>`<div class="ck ${x.d?"done":""}"><label class="cklab"><input type="checkbox" data-k="${k}" data-i="${i}" ${x.d?"checked":""}><span>${esc(x.t)}</span></label><button class="x ed" data-a="deli" data-k="${k}" data-i="${i}" aria-label="刪除">✕</button></div>`).join("")}<div class="add ed"><input class="fi" id="in-${k}" placeholder="新增項目…"><button class="pill" data-a="addi" data-v="${k}">＋</button></div></div>`;
 return sec("pack","冬季裝備")+sec("gift","伴手禮／想買")}
function calc(){const v=parseFloat($("#jpy")?.value)\vert{}\vert{}0,r=parseFloat($("#rate")?.value)||0;if(!$("#twd"))return;if(r)store("tp-rate-"+curOf(),r);$("#twd").textContent="NT$ "+Math.round(v*r).toLocaleString();
 $("#qk").innerHTML=[1000,5000,10000,20000].map(x=>`<button data-a="q" data-v="${x}"><small>${x.toLocaleString()}</small>NT$${Math.round(x*r).toLocaleString()}</button>`).join("")}
function renderNow(t){const ids=["now","tix","storm","yen","pack"],emp=emptyNow();
 const f={now:t=>bar(1)+nowCard(t),tix:t=>bar()+tixHTML(t),storm:t=>bar()+stormHTML(t),yen:t=>bar()+yenHTML(t),pack:t=>bar()+packHTML(t)};ids.forEach(i=>{$("#t-"+i).innerHTML=t?f[i](t):emp});calc();if(t){MiniMap.render("nowmap",ptsOf(t),pickPt);try{buildFood(t)}catch(e){}}}

/* now view */
const bkList=t=>[...(t.booking||[])];
const saveBk=(t,l)=>patch(t,{booking:l});
const okUrl=u=>/^https?:\/\//i.test(u||"");
const bookHTML=t=>{const L=bkList(t);return`<h3>Booking</h3>${L.length?L.map(b=>`<div class="row"><span>${esc(b.n)}<br><small class="meta">${esc(b.c\vert{}\vert{}"尚未填寫")}</small></span><span>${b.c?`<button class="cb" data-a="cp" data-v="${esc(b.c)}">複製</button>`:""}${okUrl(b.u)?`<a class="cb" href="${esc(b.u)}" target="_blank" rel="noopener">☁️ PDF</a>`:""}</span></div>`).join(""):'<p class="meta">還沒有項目，請到「票券與預約」新增。</p>'}`};
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
 return`<div class="glass ov"><h3>${esc(d.k)}${d.city?"｜"+esc(d.city):""}</h3><p>${esc(d.date||"")}${d.wx||d.tp?` <span class="wxchip">${esc(d.wx\vert{}\vert{}"")} ${esc(d.tp||"")}</span>`:""}</p>${d.pos?`<p>${esc(d.pos)}</p>`:""}</div>${d.items.map((x,j)=>itm(x,i,j)).join("")||'<p class="meta" style="margin:8px 4px">這天還沒有行程項目。</p>'}${dayMore(d,i)}<div class="pills ed"><button class="pill" data-a="additem" data-v="${i}">＋ 新增景點／行程</button><button class="pill gl" data-a="editday" data-v="${i}">編輯本日</button><button class="pill gl" data-a="delday" data-v="${i}">刪除本日</button></div>`};
function todayIdx(t){const n=new Date(),s=new Date((t.startDate||"")+"T00:00"),k=Math.floor((n-s)/864e5);return k>=0&&k<getDays(t).length?k:0}
function nowCard(t){const D=getDays(t),hsp=t.hotspots&&t.mapImage,di=Math.min(dayI[t.id]??todayIdx(t),Math.max(0,D.length-1)),n=nd(t);dayI[t.id]=di;
 return`<article class="glass dark hero"><small>${flagOf(t)} 當前行程</small><h2>${esc(t.title)}</h2><p>${esc(t.startDate||"日期未定")}${t.endDate?" – "+esc(t.endDate.slice(5)):""}・${n} 天${(t.members||[]).length>1?`・${t.members.length} 人共編`:""}</p>${t.notes?`<p>${esc(t.notes)}</p>`:""}<div class="cdp" id="cd"></div>
 <div class="pills"><button class="pill lt" data-a="m" data-v="book">Booking</button><button class="pill lt" data-a="members">成員</button><button class="pill lt" data-a="goyen">帳本</button><button class="pill lt" data-a="m" data-v="diet">飲食卡</button><button class="pill lt" data-a="m" data-v="sos">緊急</button></div></article>
 <div id="live" class="glass blk live">${liveHTML(t)}</div>
 
 <h2 class="sec">實際地圖</h2><div class="locbar" id="locbar">${locBarHTML(t)}</div><div class="glass mapbox"><div id="nowmap" class="nowmap" role="application" aria-label="當前行程地圖"></div></div><div class="mi" id="mi2">點擊地圖地標查看當天摘要</div><p class="meta" style="margin:6px 4px 0">新增景點時填寫「地點」，就會自動標在地圖上。</p>
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
 modal(`<h3>${ii!=null?"編輯項目":"新增景點／行程"}</h3><div class="fm" data-di="${di}" data-ii="${ii??""}"><label>時間<input id="fi-t" value="${esc(x.t)}" placeholder="例如 09:30（可留空或寫「下午」）"></label><label>標題<input id="fi-h" value="${esc(x.h)}" placeholder="例如 美瑛青池"></label><label>備註<textarea id="fi-d" rows="3">${esc(x.d)}</textarea></label><label>備案／說明（點開行程卡片才會看到）<textarea id="fi-m" rows="3">${esc(x.more)}</textarea></label><label>地點（地圖標記與導航用，可留空）<input id="fi-q" value="${esc(x.q)}" placeholder="例如 青池 美瑛"></label><div class="splits"><small class="meta">餐廳飲食屬性（選填；也會自動從名稱與備註推測）</small>${RT.map(([c,n])=>`<label class="chk"><input type="checkbox" class="rtg" value="${c}" ${(x.diet\vert{}\vert{}[]).includes(c)?"checked":""}> ${n}</label>`).join("")}</div><div class="pills"><button class="pill" data-a="saveitem"><span class="dot">✓</span>儲存</button></div></div>`)}
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
 try{if(old){await patch(old,base);await setSt(old,st);if(st==="now")await archiveNow(old.id)}else{const id="u-"+rnd(9),currency=CUR[country]||"JPY";const n={id,owner:me.uid,...base,currency,expenses:[],booking:[],days:[],st:{[me.uid]:st}};if(st==="now")await archiveNow(id);await setDoc(tdoc(n),ser(n));TRIPS.push(n)}
 $("#modal").classList.remove("on");render()}catch(e){console.error("[saveForm]",e);toast("儲存失敗")}}

/* 登入頁與狀態管理 */
function landingHTML(){const G='<svg class="gic" viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>'; return`<div class="lc"><h1>【歷歷】<small>TripTych</small></h1><p class="ltag">展開地圖，點亮旅程中的每一個細節與故事。</p>${FB_OK?`<button class="lbtn" data-a="landlogin">${G}<span class="spin"></span><span class="lbl">使用 Google 登入</span></button>`:'<p class="meta">目前離線，連線後即可登入。</p>'}</div>`}
function landSet(txt,pend){const b=document.querySelector(".lbtn");if(!b)return;b.classList.toggle("pending",!!pend);b.querySelector(".lbl").textContent=txt}
function closeLanding(el){if(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches){el.classList.add("out");setTimeout(()=>el.remove(),400);return} const b=el.querySelector(".lbtn"),r=b&&b.getBoundingClientRect(),W=innerWidth,H=innerHeight,ox=r?r.left+r.width/2:W/2,oy=r?r.top+r.height/2:H*.7; el.style.setProperty("--ox",ox+"px");el.style.setProperty("--oy",oy+"px");el.style.setProperty("--R",Math.hypot(Math.max(ox,W-ox),Math.max(oy,H-oy))+8+"px"); void el.offsetWidth;el.classList.add("iris");setTimeout(()=>el.remove(),950)}
function updLanding(){const need=AUTHREADY&&!me;document.body.classList.toggle("ready",AUTHREADY);let el=document.getElementById("landing"); if(need){if(!el){el=document.createElement("div");el.id="landing";el.className="landing v2";el.innerHTML=landingHTML();document.body.appendChild(el)}return} if(!el||el._closing)return; if(me&&!SNAPDONE){if(!el.classList.contains("arriving")){el.classList.add("arriving");landSet("登入成功",false);setTimeout(()=>{if(el.isConnected&&!el._closing)landSet("載入行程中…",true)},900)}  if(!el._to)el._to=setTimeout(()=>{SNAPDONE=true;updLanding()},8000);return} el._closing=true;closeLanding(el)}
function doLogin(){landSet("登入中…",true);const p=login();p.then(ok=>{if(!ok&&!me)landSet("使用 Google 登入",false)});return p}

// 監聽 Auth 狀態變更
if(FB_OK){onAuthStateChanged(auth,u=>{me=u;AUTHREADY=true;if(!u)SNAPDONE=false;$("#who").textContent=u?(u.displayName||u.email):"未登入";updLanding();if(unsub){unsub();unsub=null}if(u){unsub=onSnapshot(query(collection(db,"trips"),where("members","array-contains",u.uid)),s=>{saveSnap(u);SNAPDONE=true;render();updLanding()},er=>{console.error("[snapshot]",er);SNAPDONE=true;updLanding()})}else{saveSnap(null);render();updLanding()})}
}else{AUTHREADY=true;updLanding();render()}
