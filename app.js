import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {getAuth,onAuthStateChanged,GoogleAuthProvider,signInWithPopup,signInWithRedirect,signOut} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {initializeFirestore,persistentLocalCache,persistentMultipleTabManager,collection,query,where,onSnapshot,doc,setDoc,getDoc,updateDoc,deleteDoc,arrayUnion,arrayRemove,deleteField,serverTimestamp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {firebaseConfig} from "./firebase-config.js";
const FB_OK=!!firebaseConfig.apiKey&&!String(firebaseConfig.apiKey).startsWith("YOUR");
let auth,db,me=null,TRIPS=[],TPL=null,unsub=null;
if(FB_OK){const app=initializeApp(firebaseConfig);auth=getAuth(app);db=initializeFirestore(app,{localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()})})}
const JF=["alerts","storm","sos"];
const clean=o=>JSON.parse(JSON.stringify(o));
const norm=t=>{JF.forEach(k=>{if(typeof t[k]==="string")try{t[k]=JSON.parse(t[k])}catch(e){delete t[k]}});return t};
const ser=o=>{const r={...o};JF.forEach(k=>{if(r[k]!==undefined&&typeof r[k]!=="string")r[k]=JSON.stringify(r[k])});return clean(r)};
const tdoc=t=>doc(db,"trips",t.id);
const statusOf=t=>(me&&t.st&&t.st[me.uid])||"future";
const setSt=(t,s)=>updateDoc(tdoc(t),{["st."+me.uid]:s});
function patch(t,p){if(!me){toast("請先登入");return Promise.resolve()}Object.assign(t,p);const o=TRIPS.find(x=>x.id===t.id);if(o)Object.assign(o,p);return updateDoc(tdoc(t),ser(p)).catch(e=>toast("儲存失敗："+(e.code||e.message)))}
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
const getDays=t=>Array.isArray(t.days)?JSON.parse(JSON.stringify(t.days)):[];
const nd=t=>getDays(t).length||t.nDays||1;
const setDays=(t,D)=>patch(t,{days:D});
const isT=s=>/^\d{1,2}:\d{2}$/.test(s||"");
const visible=()=>TRIPS.map(t=>({...t,status:statusOf(t),locked:false}));

/* accounting */
function settle(c){const m=c.members,paid={},owed={};m.forEach(x=>{paid[x]=0;owed[x]=0});let total=0;
 c.expenses.forEach(e=>{total+=e.amount;paid[e.paidBy]=(paid[e.paidBy]||0)+e.amount;const sw=e.splitWith?.length?e.splitWith:m;sw.forEach(x=>owed[x]=(owed[x]||0)+e.amount/sw.length)});
 const bal=m.map(x=>({m:x,b:paid[x]-owed[x]})),de=bal.filter(x=>x.b<-.5).sort((a,b)=>a.b-b.b),cr=bal.filter(x=>x.b>.5).sort((a,b)=>b.b-a.b),out=[];let i=0,j=0;
 while(i<de.length&&j<cr.length){const a=Math.min(-de[i].b,cr[j].b);out.push([de[i].m,cr[j].m,a]);de[i].b+=a;cr[j].b-=a;if(de[i].b>-.5)i++;if(cr[j].b<.5)j++}
 return{total,paid,out}}
function acct(t,L,r){const c=cfg(t),S=settle({members:c.members,expenses:L}),cur=c.currency,tw=v=>` <small class="meta">≈ NT$ ${Math.round(v*r).toLocaleString()}</small>`;
 return`<p class="meta">參與成員 (${c.members.length}人)：${c.members.map(m=>esc(nameOf(t,m))).join("、")}</p>
 ${c.lightSplitUrl?`<div class="pills"><a class="pill" href="${esc(c.lightSplitUrl)}" target="_blank" rel="noopener">🔗 開啟 LightSplit 記帳本</a></div>`:""}
 <p style="margin-top:12px" class="meta">總花費</p><p class="sum">${fmt(S.total,cur)}${tw(S.total)}</p>
 <h4 class="meta" style="margin:12px 0 2px">各自墊付</h4>${c.members.map(m=>`<div class="row"><span>${esc(nameOf(t,m))}</span><b>${fmt(S.paid[m]||0,cur)}</b></div>`).join("")}
 <h4 class="meta" style="margin:12px 0 2px">結算</h4>${S.out.length?S.out.map(o=>`<div class="pay">${esc(nameOf(t,o[0]))} → ${esc(nameOf(t,o[1]))}　<b>${fmt(o[2],cur)}</b>${tw(o[2])}</div>`).join(""):'<div class="pay">已平衡 ✅</div>'}
 <h4 class="meta" style="margin:12px 0 2px">明細</h4>${L.map((e,i)=>`<div class="row"><span>${esc(e.item)}<br><small class="meta">${esc(nameOf(t,e.paidBy))} 付</small></span><b>${fmt(e.amount,cur)}</b><button class="x ed" data-a="delex" data-v="${i}" aria-label="刪除">✕</button></div>`).join("")||'<p class="meta">尚無明細</p>'}`}
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
${t.diet||t.sos?`<div class="pills" style="margin-top:14px">${t.diet?'<button class="pill gl" data-a="m" data-v="diet">🥬 飲食日文卡</button>':""}${t.sos?'<button class="pill gl" data-a="m" data-v="sos">🆘 緊急聯絡</button>':""}</div>`:""}`};
const GST={links:[["🚆","JR 運行","https://www.jrhokkaido.co.jp/travel/unkou/"],["🚗","道路情報","https://www.jartic.or.jp/"],["🌤️","天氣警報","https://www.jma.go.jp/bosai/forecast/"],["✈️","航班狀況","https://www.new-chitose-airport.jp/ja/flight/"]],risks:[],crisis:[["先保安全","開警示燈、停到路邊；有人受傷撥 119"],["聯絡租車公司","使用取車時給的救援電話，說明位置"],["通知住宿","告知會晚到，避免訂房被取消"],["拍照留收據","車況、現場、拖吊單據，回台理賠用"]]};
const DEFPACK=["護照／簽證","行動電源與充電線","常備藥品","信用卡與現金","網卡／漫遊"];
const cfg=t=>{const ex=t.expenses||[],ks=new Set(t.members||[]);ex.forEach(e=>{ks.add(e.paidBy);(e.splitWith||[]).forEach(k=>ks.add(k))});return{currency:t.currency||"JPY",members:[...ks],lightSplitUrl:t.lightSplitUrl||"",expenses:ex}};
const memoOf=t=>t.memo?JSON.parse(JSON.stringify(t.memo)):{risks:((t.storm&&t.storm.risks)||[]).map(r=>({d:r[0],w:r[1],p:r[2],c:r[3]?1:0})),steps:((t.storm&&t.storm.crisis)||GST.crisis).map(c=>({t:c[0],d:c[1]})),note:""};
const saveMemo=(t,m)=>patch(t,{memo:m});
const eb=(k,i)=>`<span class="ed mb"><button class="x" data-a="memoedit" data-v="${k}:${i}" aria-label="編輯"><i class=i-edit></i></button><button class="x" data-a="memodel" data-v="${k}:${i}" aria-label="刪除">✕</button></span>`;
const stormHTML=t=>{const M=memoOf(t);return`<h2 class="sec">備案提醒</h2>${M.risks.map((r,i)=>`<div class="rw ${r.c?"crit":""}"><b>${esc(r.d)}</b><span>${esc(r.w)}</span><em>${esc(r.p)}</em>${eb("risks",i)}</div>`).join("")||'<p class="meta" style="margin:4px">還沒有備案。</p>'}<div class="pills ed"><button class="pill" data-a="memoadd" data-v="risks">＋ 新增備案</button></div>
<h2 class="sec">緊急處理步驟</h2><ol class="cr">${M.steps.map((s,i)=>`<li><div><b>${esc(s.t)}</b><span>${esc(s.d)}</span></div>${eb("steps",i)}</li>`).join("")}</ol><div class="pills ed"><button class="pill" data-a="memoadd" data-v="steps">＋ 新增步驟</button></div><div class="pills"><a class="pill" href="tel:119">📞 撥打 119</a></div>
<h2 class="sec">個人備忘</h2><div class="glass blk"><div class="vw memo">${M.note?esc(M.note):'<span class="meta">（空白，按「編輯模式」可以寫）</span>'}</div><textarea class="fi ed" id="memo-note" rows="6" placeholder="想記的事…（備案、集合地點、提醒…）">${esc(M.note)}</textarea></div>`};
function memoForm(k,i){const t=T0(),M=memoOf(t),x=i!=null?M[k][i]:{};
 modal(k==="risks"?`<h3>${i!=null?"編輯":"新增"}備案</h3><div class="fm" data-k="risks" data-i="${i??""}"><label>天數／標題<input id="mm-a" value="${esc(x.d)}" placeholder="例如 D3"></label><label>可能的狀況<input id="mm-b" value="${esc(x.w)}"></label><label>備案對策<input id="mm-c" value="${esc(x.p)}"></label><label class="chk"><input type="checkbox" id="mm-x" ${x.c?"checked":""}> 標為重要（紅色）</label><div class="pills"><button class="pill" data-a="memosave">儲存</button></div></div>`
 :`<h3>${i!=null?"編輯":"新增"}步驟</h3><div class="fm" data-k="steps" data-i="${i??""}"><label>步驟標題<input id="mm-a" value="${esc(x.t)}"></label><label>說明<input id="mm-b" value="${esc(x.d)}"></label><div class="pills"><button class="pill" data-a="memosave">儲存</button></div></div>`)}
function setEdit(on){document.body.classList.toggle("editing",on);document.querySelectorAll(".edt").forEach(x=>{x.innerHTML=on?"結束並儲存":"<i class=i-edit></i> 編輯模式";x.classList.toggle("on",on)})}
function bar(arch){const on=document.body.classList.contains("editing");return`<div class="pills topact"><button class="pill mini edt ${on?"on":""}" data-a="edtoggle">${on?"結束並儲存":"<i class=i-edit></i> 編輯模式"}</button>${arch?'<button class="pill mini" data-a="archive">📦 結束並歸檔</button>':""}${(()=>{const tt=T0();return arch&&tt&&TPL&&tt.templateId===TPL.id?'<button class="pill mini ed" data-a="tplreset">↺ 重設為最新範例</button>':""})()}</div>`}
function yenHTML(t){const c=cfg(t),r=rate(),L=exList(t);
 return`<div class="glass blk"><p class="meta">${c.currency} 換台幣</p><div class="bigres" id="twd">NT$ 0</div>
 <label class="fl">${c.currency} 金額<input class="fi" id="jpy" type="number" inputmode="numeric" placeholder="例如 11370"></label>
 <label class="fl">匯率（1 ${c.currency} = ? NT$）<input class="fi" id="rate" type="number" step="0.001" value="${r}"></label><div class="qk" id="qk"></div></div>
 <h2 class="sec">記一筆</h2><div class="glass blk"><input class="fi" id="memo" placeholder="項目（例：午餐湯咖哩）"><select class="fi" id="payer" aria-label="付款人">${c.members.map(m=>`<option value="${esc(m)}" ${m===me?.uid?"selected":""}>付款人：${esc(nameOf(t,m))}</option>`).join("")}</select><div class="splits"><small class="meta">分攤對象</small>${c.members.map(m=>`<label class="chk"><input type="checkbox" class="sp" value="${esc(m)}" checked> ${esc(nameOf(t,m))}</label>`).join("")}</div>
 <div class="pills"><button class="pill" data-a="addex">＋ 記入帳本</button><button class="pill gl" data-a="tols">📋 複製並到 LightSplit</button></div></div>
 <h2 class="sec">帳本與結算</h2><div class="glass blk">${acct(t,L,r)}</div>`}
function packHTML(t){const P=plist(t),sec=(k,ti)=>`<h2 class="sec">${ti}</h2><div class="glass blk">${P[k].map((x,i)=>`<label class="ck ${x.d?"done":""}"><input type="checkbox" data-k="${k}" data-i="${i}" ${x.d?"checked":""}><span>${esc(x.t)}</span><button class="x ed" data-a="deli" data-k="${k}" data-i="${i}" aria-label="刪除">✕</button></label>`).join("")}<div class="add ed"><input class="fi" id="in-${k}" placeholder="新增項目…"><button class="pill" data-a="addi" data-v="${k}">＋</button></div></div>`;
 return sec("pack","🎒 冬季裝備")+sec("gift","🎁 伴手禮／想買")}
function calc(){const v=parseFloat($("#jpy")?.value)||0,r=parseFloat($("#rate")?.value)||0;if(!$("#twd"))return;if(r)store("tp-rate-"+curOf(),r);$("#twd").textContent="NT$ "+Math.round(v*r).toLocaleString();
 $("#qk").innerHTML=[1000,5000,10000,20000].map(x=>`<button data-a="q" data-v="${x}"><small>${x.toLocaleString()}</small>NT$${Math.round(x*r).toLocaleString()}</button>`).join("")}
function renderNow(t){const ids=["now","tix","storm","yen","pack"],emp=emptyNow();
 const f={now:t=>bar(1)+nowCard(t),tix:t=>bar()+tixHTML(t),storm:t=>bar()+stormHTML(t),yen:t=>bar()+yenHTML(t),pack:t=>bar()+packHTML(t)};ids.forEach(i=>{$("#t-"+i).innerHTML=t?f[i](t):emp});calc();if(t)MiniMap.render("nowmap",ptsOf(t),pickPt)}

/* now view */
const bkList=t=>[...(t.booking||[])];
const saveBk=(t,l)=>patch(t,{booking:l});
const okUrl=u=>/^https?:\/\//i.test(u||"");
const bookHTML=t=>{const L=bkList(t);return`<h3>🏨 Booking</h3>${L.length?L.map(b=>`<div class="row"><span>${esc(b.n)}<br><small class="meta">${esc(b.c||"尚未填寫")}</small></span><span>${b.c?`<button class="cb" data-a="cp" data-v="${esc(b.c)}">複製</button>`:""}${okUrl(b.u)?`<a class="cb" href="${esc(b.u)}" target="_blank" rel="noopener">☁️ PDF</a>`:""}</span></div>`).join(""):'<p class="meta">還沒有項目，請到「票券與預約」新增。</p>'}`};
const dietHTML=t=>`<h3>🥬 飲食溝通日文卡</h3><div class="jp" id="jp">${esc(t.diet)}</div><div class="pills"><button class="pill" data-a="cp" data-v="${esc(t.diet)}">複製日文</button></div>`;
const sosHTML=t=>`<h3>🆘 緊急聯絡／保險</h3>${t.sos.map(s=>`<div class="row"><span>${esc(s[0])}</span>${s[2]?`<a class="cb" href="${s[2]}">${esc(s[1])}</a>`:`<b>${esc(s[1])}</b>`}</div>`).join("")}<p class="meta" style="margin-top:8px">請先把空白欄位填進 trips.json。</p>`;
const itm=(x,di,ii)=>`<div class="it ${x.type||""}"><div class="tm">${esc(x.t)}</div><div class="bd"><b>${esc(x.h)}</b>${x.type==="crit"?'<em class="tag">重要班次</em>':""}${x.d?`<p>${esc(x.d)}</p>`:""}${x.q?`<a class="cb" href="https://maps.google.com/?q=${encodeURIComponent(x.q)}" target="_blank" rel="noopener">📍 開啟地圖</a>`:""}${x.more?`<details><summary>備案／說明</summary><p>${esc(x.more)}</p></details>`:""}</div><div class="act ed"><button class="cb" data-a="edititem" data-v="${di}:${ii}" aria-label="編輯"><i class=i-edit></i></button><button class="cb" data-a="delitem" data-v="${di}:${ii}" aria-label="刪除">✕</button></div></div>`;
const tabsHTML=(t,di)=>getDays(t).map((d,i)=>`<button class="${i===di?"on":""}" data-a="day" data-v="${i}">${esc(d.k)}</button>`).join("")+'<button class="plus ed" data-a="addday" aria-label="新增一天">＋</button>';
const dayHTML=(t,i)=>{const d=getDays(t)[i];if(!d)return'<div class="glass blk"><p class="meta">還沒有每日行程。開啟「編輯模式」後，按上方「＋」新增第一天。</p></div>';
 return`<div class="glass ov"><h3>${esc(d.k)}${d.city?"｜"+esc(d.city):""}</h3><p>${esc(d.date||"")}${d.wx||d.tp?"　"+esc(d.wx||"")+" "+esc(d.tp||""):""}</p>${d.pos?`<p>${esc(d.pos)}</p>`:""}</div>${d.items.map((x,j)=>itm(x,i,j)).join("")||'<p class="meta" style="margin:8px 4px">這天還沒有行程項目。</p>'}<div class="pills ed"><button class="pill" data-a="additem" data-v="${i}">＋ 新增景點／行程</button><button class="pill gl" data-a="editday" data-v="${i}">編輯本日</button><button class="pill gl" data-a="delday" data-v="${i}">刪除本日</button></div>`};
function todayIdx(t){const n=new Date(),s=new Date((t.startDate||"")+"T00:00"),k=Math.floor((n-s)/864e5);return k>=0&&k<getDays(t).length?k:0}
function nowCard(t){const D=getDays(t),hsp=t.hotspots&&t.mapImage,di=Math.min(dayI[t.id]??todayIdx(t),Math.max(0,D.length-1)),n=nd(t);dayI[t.id]=di;
 return`<article class="glass dark hero"><small>${flagOf(t)} 當前行程</small><h2>${esc(t.title)}</h2><p>${esc(t.startDate||"日期未定")}${t.endDate?" – "+esc(t.endDate.slice(5)):""}・${n} 天${(t.members||[]).length>1?`・👥 ${t.members.length} 人共編`:""}</p>${t.notes?`<p>${esc(t.notes)}</p>`:""}<div class="cdp" id="cd"></div>
 <div class="pills"><button class="pill lt" data-a="m" data-v="book">🏨 Booking</button><button class="pill lt" data-a="members">👥 成員</button>${t.diet?'<button class="pill lt" data-a="m" data-v="diet">🥬 飲食卡</button>':""}${t.sos?'<button class="pill lt" data-a="m" data-v="sos">🆘 緊急</button>':""}</div></article>
 ${hsp?`<h2 class="sec">熱點地圖</h2><div class="glass blk"><div class="mapw"><div class="mz" id="mz"><img src="${esc(t.mapImage)}" alt="手繪旅行地圖">${t.hotspots.map((h,i)=>`<button class="hs" aria-label="${esc(h.name)}" style="left:${h.x/t.mapSize[0]*100}%;top:${h.y/t.mapSize[1]*100}%" data-a="hs" data-v="${i}"></button>`).join("")}</div></div><div class="mi" id="mi">👆 點地圖上的地點，會放大並顯示當天資訊</div></div>`:""}
 <h2 class="sec">實際地圖</h2><div class="glass mapbox"><div id="nowmap" class="nowmap" role="application" aria-label="當前行程地圖"></div></div><div class="mi" id="mi2">👆 點黑點看當天行程簡介；再點同一個黑點可回到全覽</div><p class="meta" style="margin:6px 4px 0">新增景點時填寫「地點」，就會自動標在地圖上。</p>
 <h2 class="sec">每日行程</h2><div class="days" id="dtabs">${tabsHTML(t,di)}</div><div id="dayblk">${dayHTML(t,di)}</div>`}
function ptsOf(t){const P=[];getDays(t).forEach((d,i)=>d.items.forEach(x=>{if(x.lat!=null)P.push({lat:x.lat,lng:x.lng,day:i,dayLabel:`${d.k} ${d.date||""}`.trim(),time:x.t||"",title:x.h,place:x.q||"",note:x.d||""})}));(t.spots||[]).forEach(s=>P.push({lat:s.lat,lng:s.lng,day:(s.day||1)-1,dayLabel:s.day?"D"+s.day:"",time:"",title:s.name,place:"",note:""}));return P}
function refreshDays(t){const D=getDays(t),di=Math.min(dayI[t.id]??0,Math.max(0,D.length-1));dayI[t.id]=di;$("#dtabs").innerHTML=tabsHTML(t,di);$("#dayblk").innerHTML=dayHTML(t,di);MiniMap.render("nowmap",ptsOf(t),pickPt)}
async function saveItem(){const t=T0(),f=document.querySelector(".fm"),di=+f.dataset.di,ii=f.dataset.ii===""?null:+f.dataset.ii,v=i=>$("#fi-"+i).value.trim(),h=v("h");if(!h)return toast("請填寫標題");
 const D=getDays(t),day=D[di],old=ii!=null?day.items[ii]:{},x={...old,t:v("t"),h,d:v("d"),q:v("q")};
 if(x.q&&(x.q!==old.q||x.lat==null)){toast("查詢座標中…");const g=await geo(x.q+(t.country?" "+t.country:""));if(g){x.lat=g[0];x.lng=g[1]}else{delete x.lat;delete x.lng;toast("找不到座標，地圖不會標記")}}
 if(!x.q){delete x.lat;delete x.lng}
 if(ii!=null)day.items[ii]=x;else{let k=day.items.length;if(isT(x.t)){const n=day.items.findIndex(y=>isT(y.t)&&y.t.padStart(5,"0")>x.t.padStart(5,"0"));if(n>=0)k=n}day.items.splice(k,0,x)}
 setDays(t,D);$("#modal").classList.remove("on");refreshDays(t)}
function itemForm(di,ii){const t=T0(),x=ii!=null?getDays(t)[di].items[ii]:{};
 modal(`<h3>${ii!=null?"編輯項目":"新增景點／行程"}</h3><div class="fm" data-di="${di}" data-ii="${ii??""}"><label>時間<input id="fi-t" value="${esc(x.t)}" placeholder="例如 09:30（可留空或寫「下午」）"></label><label>標題<input id="fi-h" value="${esc(x.h)}" placeholder="例如 美瑛青池"></label><label>備註<textarea id="fi-d" rows="3">${esc(x.d)}</textarea></label><label>地點（地圖標記與導航用，可留空）<input id="fi-q" value="${esc(x.q)}" placeholder="例如 青池 美瑛"></label><div class="pills"><button class="pill" data-a="saveitem"><span class="dot">✓</span>儲存</button></div></div>`)}
function dayForm(i){const t=T0(),d=i!=null?getDays(t)[i]:{};
 modal(`<h3>${i!=null?"編輯本日":"新增一天"}</h3><div class="fm" data-i="${i??""}"><label>城市／主題<input id="fd-c" value="${esc(d.city)}" placeholder="例如 皇后鎮"></label><label>日期（留空會依出發日自動帶入）<input id="fd-date" value="${esc(d.date)}" placeholder="例如 3/12（四）"></label><label>當天重點<input id="fd-p" value="${esc(d.pos)}"></label><div class="pills"><button class="pill" data-a="saveday"><span class="dot">✓</span>儲存</button></div></div>`)}
function saveDay(){const t=T0(),f=document.querySelector(".fm"),i=f.dataset.i===""?null:+f.dataset.i,D=getDays(t),c=$("#fd-c").value.trim(),p=$("#fd-p").value.trim();let date=$("#fd-date").value.trim();
 if(i!=null){D[i].city=c;D[i].pos=p;D[i].date=date}
 else{const n=D.length;if(!date&&/^\d{4}-\d{2}-\d{2}/.test(t.startDate||"")){const x=new Date(t.startDate+"T00:00");x.setDate(x.getDate()+n);date=`${x.getMonth()+1}/${x.getDate()}（${"日一二三四五六"[x.getDay()]}）`}D.push({k:"D"+(n+1),date,city:c,wx:"",tp:"",pos:p,items:[]});dayI[t.id]=n}
 setDays(t,D);$("#modal").classList.remove("on");refreshDays(t)}

function mapZoom(t,k){const mz=$("#mz");if(zm===k){zm=null;mz.style.transform="";document.querySelectorAll(".hs").forEach(b=>b.classList.remove("act"));$("#mi").innerHTML="👆 點地圖上的地點，會放大並顯示當天資訊";return}
 zm=k;const h=t.hotspots[k],S=2.4,px=h.x/t.mapSize[0]*100,py=h.y/t.mapSize[1]*100,cl=v=>Math.min(0,Math.max(100-100*S,v));
 mz.style.transform=`translate(${cl(50-px*S)}%,${cl(50-py*S)}%) scale(${S})`;document.querySelectorAll(".hs").forEach((b,i)=>b.classList.toggle("act",i===k));
 const d=getDays(t)[h.day]||{};$("#mi").innerHTML=`<b>${esc(h.name)}</b><span class="chip">${esc(d.k)}</span><p>${esc(h.note)}</p><p>${esc(d.date)} ${esc(d.city)}・${esc(d.tp)}</p><div class="pills"><button class="pill" data-a="day" data-v="${h.day}" data-go="1">看 ${esc(d.k)} 行程</button><a class="pill gl" href="https://maps.google.com/?q=${encodeURIComponent(h.name+" 北海道")}" target="_blank" rel="noopener">📍 地圖</a></div>`}

/* cards */
function tcard(t){const fut=t.status==="future",mine=String(t.id).startsWith("u-");
 return`<article class="glass tc ${fut?"fut":""}"><div class="ph">${t.image?`<img src="${esc(t.image)}" alt="${esc(t.title)}" loading="lazy" onerror="this.remove()">`:""}<span>${flagOf(t)}</span></div><div class="in"><h3>${esc(t.title)}</h3><p class="meta">${esc(t.country)}・${esc(t.startDate||"日期未定")}${t.endDate?" – "+esc(t.endDate.slice(5)):""}・${nd(t)} 天</p>${t.notes?`<p style="margin-top:8px;font-size:.9rem">${esc(t.notes)}</p>`:""}
 <div class="pills" style="margin-top:10px">${t.spots?.length?`<a class="pill gl" href="https://maps.google.com/?q=${t.spots[0].lat},${t.spots[0].lng}" target="_blank" rel="noopener">📍 地圖</a>`:""}${t.status==="past"?`<button class="pill" data-a="setcur" data-v="${esc(t.id)}">🔄 重新設為當前行程</button>`:""}${fut?`<button class="pill" data-a="setcur" data-v="${esc(t.id)}">🚀 設為當前行程</button>`:""}${me?`<button class="pill gl" data-a="edit" data-v="${esc(t.id)}"><i class=i-edit></i> 編輯</button>`:""}${t.owner===me?.uid?`<button class="pill gl" data-a="del" data-v="${esc(t.id)}">✕ 刪除</button>`:""}</div></div></article>`}

/* add / edit */
function form(st,id){const t0=TRIPS.find(x=>x.id===id),t=t0?{...t0,status:statusOf(t0)}:{status:st,spots:[]},sp=t.spots?.[0]||{};
 modal(`<h3>${id?"編輯旅程":"新增旅程"}</h3><div class="fm" data-id="${esc(id||"")}">
 <label>地點<input id="f-place" value="${esc(t.title)}" placeholder="例如：清邁" required></label>
 <label>國家<input id="f-country" list="cl" value="${esc(t.country)}" placeholder="例如：泰國" required></label><datalist id="cl">${Object.keys(FL).map(k=>`<option value="${k}">`).join("")}</datalist>
 <div class="two"><label>出發日<input id="f-s" type="date" value="${esc(t.startDate)}"></label><label>回程日<input id="f-e" type="date" value="${esc(t.endDate)}"></label></div>
 <label>類型<select id="f-st"><option value="now" ${t.status==="now"?"selected":""}>❄️ 當前旅程</option><option value="past" ${t.status==="past"?"selected":""}>📚 歷史旅程</option><option value="future" ${t.status==="future"?"selected":""}>✨ 未來清單</option></select></label>
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
 else{if(st==="now")await archiveNow("");const ref=doc(collection(db,"trips"));await setDoc(ref,{...clean({...base,days:[],booking:[],expenses:[],currency:CUR[country]||"TWD",lightSplitUrl:"",owner:me.uid,members:[me.uid],memberNames:{[me.uid]:me.displayName||"我"},st:{[me.uid]:st}}),createdAt:serverTimestamp()})}
 $("#modal").classList.remove("on");toast("已儲存")}catch(err){toast("儲存失敗："+(err.code||err.message))}}

function render(){const v=visible(),by=s=>v.filter(t=>t.status===s);zm=null;
 renderNow(by("now")[0]);
 const real=v.filter(t=>t.status!=="future");
 $("#stats").innerHTML=`<div class="glass stat"><b>${new Set(real.map(t=>t.countryCode||t.country)).size}</b><small>造訪國家</small></div><div class="glass stat"><b>${real.reduce((s,t)=>s+nd(t),0)}</b><small>總天數</small></div><div class="glass stat"><b>${real.length}</b><small>趟旅行</small></div>`;
 MapView.render(v);
 const emp='<p class="empty">還沒有旅程，點上方「＋ 新增旅程」開始記錄</p>';
 $("#l-past").innerHTML=by("past").map(tcard).join("")||emp;$("#l-future").innerHTML=by("future").map(tcard).join("")||emp;renderDrawer();tick()}
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
 if(a==="auth"){if(!FB_OK)return toast("尚未設定 Firebase，請先填 firebase-config.js");if(me){if(confirm("要登出嗎？"))signOut(auth)}else login();return}
 if(a==="join"){if(!me)return toast("請先登入 Google 帳戶");modal('<h3>🔑 輸入邀請碼</h3><div class="fm"><label>邀請碼<input id="f-code" maxlength="8" placeholder="例如 K7M2QX" style="text-transform:uppercase"></label><div class="pills"><button class="pill" data-a="dojoin">加入行程</button></div></div>');return}
 if(a==="dojoin"){joinTrip($("#f-code").value).then(ok=>{if(ok)$("#modal").classList.remove("on")}).catch(er=>{console.error("[dojoin]",er);toast("加入失敗："+(er.code==="permission-denied"?"權限被拒（請確認 Firestore 規則已發布最新版，且邀請碼未被重設）":(er.code||er.message)))});return}
 if(a==="tpl"){importTpl();return}
 if(a==="invite"&&t){ensureInvite(t).then(c=>c?copy(c,"已複製邀請碼"):toast("產生邀請碼失敗"));return}

 if(a==="q"){$("#jpy").value=v;calc();return}
 if(a==="addex"&&t){const y=parseFloat($("#jpy").value)||0;if(!y)return toast("請先輸入金額");const L=exList(t),sp=[...document.querySelectorAll(".sp:checked")].map(x=>x.value);L.push({item:$("#memo").value.trim()||"花費",amount:y,paidBy:$("#payer").value,splitWith:sp.length?sp:cfg(t).members});saveEx(t,L);$("#t-yen").innerHTML=bar()+yenHTML(t);calc();toast("已記帳");return}
 if(a==="delex"&&t){const L=exList(t);L.splice(+v,1);saveEx(t,L);$("#t-yen").innerHTML=bar()+yenHTML(t);calc();return}
 if(a==="tols"&&t){const y=parseFloat($("#jpy").value)||0;if(!y)return toast("請先輸入金額");copy(`${$("#memo").value.trim()||"花費"} ${curOf()} ${y.toLocaleString()} ≈ NT$${Math.round(y*rate()).toLocaleString()}（匯率${rate()}）付款：${$("#payer").selectedOptions[0].text.replace("付款人：","")}`);if(cfg(t).lightSplitUrl)window.open(cfg(t).lightSplitUrl,"_blank");return}
 if(a==="addi"&&t){const i=$("#in-"+v),x=i.value.trim();if(!x)return;const P=plist(t);P[v].push({t:x,d:0});savePl(t,P);$("#t-pack").innerHTML=bar()+packHTML(t);return}
 if(a==="deli"&&t){e.preventDefault();const P=plist(t);P[b.dataset.k].splice(+b.dataset.i,1);savePl(t,P);$("#t-pack").innerHTML=bar()+packHTML(t);return}

 if(a==="home"){e.preventDefault();go("now");return}
 if(a==="archive"&&t){if(confirm(`將「${t.title}」結束並歸檔到歷史旅程？`)){setSt(t,"past").then(()=>{go("past");toast("已歸檔")})}return}
 if(a==="setcur"){const n=visible().find(x=>x.id===v),o=visible().filter(x=>x.status==="now"&&x.id!==v);if(n&&confirm(`將「${n.title}」${n.status==="past"?"重新":""}設為當前行程？${o.length?"\n原本的當前旅程會自動歸檔到歷史旅程。":""}`)){Promise.all([...o.map(x=>setSt(x,"past")),setSt(n,"now")]).then(()=>{go("now");toast("已設為當前行程")})}return}
 if(a==="addbk"&&t){const i=$("#in-bk"),x=i.value.trim();if(!x)return;const L=bkList(t);L.push({n:x,c:"",u:""});saveBk(t,L);$("#t-tix").innerHTML=bar()+tixHTML(t);return}
 if(a==="delbk"&&t){if(!confirm("刪除這個項目？"))return;const L=bkList(t);L.splice(+v,1);saveBk(t,L);$("#t-tix").innerHTML=bar()+tixHTML(t);return}
 if(a==="cpi"){const c=document.querySelector(`[data-b="c"][data-i="${v}"]`).value;c?copy(c):toast("尚未填寫編號");return}
 if(a==="openu"){const u=document.querySelector(`[data-b="u"][data-i="${v}"]`).value.trim();okUrl(u)?window.open(u,"_blank","noopener"):toast("請先貼上 https:// 開頭的雲端連結");return}

 if(a==="addday"&&t){dayForm(null);return}
 if(a==="editday"&&t){dayForm(+v);return}
 if(a==="delday"&&t){if(!confirm("刪除這一天與底下所有行程？"))return;const D=getDays(t);D.splice(+v,1);D.forEach((d,j)=>{if(/^D\d+$/.test(d.k))d.k="D"+(j+1)});setDays(t,D);dayI[t.id]=Math.max(0,+v-1);refreshDays(t);return}
 if(a==="additem"&&t){itemForm(+v,null);return}
 if(a==="edititem"&&t){const[p,q]=v.split(":");itemForm(+p,+q);return}
 if(a==="delitem"&&t){if(!confirm("刪除這個項目？"))return;const[p,q]=v.split(":"),D=getDays(t);D[+p].items.splice(+q,1);setDays(t,D);refreshDays(t);return}
 if(a==="saveitem"&&t){saveItem();return}
 if(a==="saveday"&&t){saveDay();return}

 if(a==="edtoggle"){setEdit(!document.body.classList.contains("editing"));return}
 if(a==="memoadd"&&t){memoForm(v,null);return}
 if(a==="memoedit"&&t){const[k,i]=v.split(":");memoForm(k,+i);return}
 if(a==="memodel"&&t){if(!confirm("刪除這一項？"))return;const[k,i]=v.split(":"),M=memoOf(t);M[k].splice(+i,1);saveMemo(t,M);$("#t-storm").innerHTML=bar()+stormHTML(t);return}
 if(a==="memosave"&&t){const f=document.querySelector(".fm"),k=f.dataset.k,i=f.dataset.i===""?null:+f.dataset.i,M=memoOf(t),A=$("#mm-a").value.trim(),B=$("#mm-b").value.trim();if(!A&&!B)return toast("請填寫內容");
  const it=k==="risks"?{d:A,w:B,p:$("#mm-c").value.trim(),c:$("#mm-x").checked?1:0}:{t:A,d:B};if(i!=null)M[k][i]=it;else M[k].push(it);saveMemo(t,M);$("#modal").classList.remove("on");$("#t-storm").innerHTML=bar()+stormHTML(t);return}
 if(a==="members"&&t){membersModal(t);return}
 if(a==="kick"&&t){if(!confirm(`將「${nameOf(t,v)}」移出這趟行程？`))return;updateDoc(tdoc(t),{members:arrayRemove(v),["st."+v]:deleteField()}).then(()=>{$("#modal").classList.remove("on");toast("已移除成員")}).catch(er=>toast("移除失敗："+(er.code||er.message)));return}
 if(a==="leave"&&t){if(!confirm("確定離開這趟行程？你將無法再查看。"))return;updateDoc(tdoc(t),{members:arrayRemove(me.uid),["st."+me.uid]:deleteField()}).then(()=>{$("#modal").classList.remove("on");go("now");toast("已離開行程")}).catch(er=>toast("失敗："+(er.code||er.message)));return}
 if(a==="resetinv"&&t){if(confirm("重設後舊邀請碼立刻失效（已在行程裡的人不受影響）。要重設嗎？"))resetInvite(t).then(ok=>{if(ok)membersModal(t)});return}
 if(a==="cpinv"){copy(v,"已複製邀請碼");return}
 if(a==="tplreset"&&t){if(TPL&&confirm("將每日行程與地圖標點重設為最新範例？你在每日行程上的修改會被覆蓋。"))patch(t,{days:TPL.days,spots:TPL.spots}).then(()=>{refreshDays(T0());toast("已重設為最新範例")});return}
 if(a==="close")$("#modal").classList.remove("on");
 else if(a==="cp")copy(v);
 else if(a==="m"&&t)modal({book:bookHTML,diet:dietHTML,sos:sosHTML}[v](t));
 else if(a==="hs"&&t)mapZoom(t,+v);
 else if(a==="day"&&t){dayI[t.id]=+v;$("#dayblk").innerHTML=dayHTML(t,+v);document.querySelectorAll("#dtabs button").forEach((x,i)=>x.classList.toggle("on",i===+v));if(b.dataset.go)$("#dtabs").scrollIntoView({behavior:"smooth"})}});
$("#modal").addEventListener("click",e=>{if(e.target.id==="modal")$("#modal").classList.remove("on")});
(async()=>{MapView.init();
 try{TPL=(await (await fetch("trips.json")).json()).trips[0]}catch(e){}
 if(FB_OK)onAuthStateChanged(auth,u=>{me=u;if(unsub){unsub();unsub=null}TRIPS=[];$("#who").textContent=u?(u.displayName||"我").slice(0,1):"登入";
  if(u){let first=true;unsub=onSnapshot(query(collection(db,"trips"),where("members","array-contains",u.uid)),s=>{TRIPS=s.docs.map(d=>norm({id:d.id,...d.data()}));render();if(first){first=false;migrate()}},er=>toast("讀取失敗："+(er.code||er.message)))}else render()});
 render();setInterval(tick,60000);
 if("serviceWorker" in navigator&&location.protocol.startsWith("http"))navigator.serviceWorker.register("sw.js").catch(()=>{})})();

document.addEventListener("input",e=>{if(e.target.id==="jpy"||e.target.id==="rate")calc()});
document.addEventListener("change",e=>{const c=e.target.closest("input[data-k]"),t=T0();if(!c||!t)return;const P=plist(t);P[c.dataset.k][+c.dataset.i].d=c.checked?1:0;savePl(t,P);c.closest(".ck").classList.toggle("done",c.checked)});

document.addEventListener("change",e=>{const i=e.target.closest("input[data-b]"),t=T0();if(!i||!t)return;const L=bkList(t);L[+i.dataset.i][i.dataset.b]=i.value.trim();saveBk(t,L)});
function go(id){setEdit(false);cur=id;document.body.classList.remove("dr");document.querySelectorAll(".panel").forEach(p=>p.classList.toggle("on",p.id==="t-"+id));renderDrawer();window.scrollTo({top:0});if(id==="map")MapView.refresh();if(id==="now")MiniMap.refresh()}
function renderDrawer(){const t=T0(),nm=t?(t.short||t.title):"",b=(id,c)=>`<button class="${c} ${cur===id?"on":""}" data-t="${id}">${id==="map"?"🌍 ":id==="past"?"📚 ":id==="future"?"✨ ":""}${LB[id]}</button>`;
 $("#drawer").innerHTML=`<p class="eyebrow brand" data-a="home">TripTych</p><h2 class="brand" data-a="home">【歷歷】/ TripTych</h2><p class="grp">❄️ 當前旅程　${t?esc(nm):"（目前沒有）"}</p>${t?SUB.map(i=>b(i,"sub")).join(""):""}<p class="grp">其他旅程</p>${["map","past","future"].map(i=>b(i,"")).join("")}${drawerExtra()}<p class="meta" style="margin-top:auto">資料儲存在你的 Google 帳戶雲端。</p>`;
 $("#crumb").textContent=SUB.includes(cur)?`${t?nm:"當前旅程"} › ${LB[cur]}`:LB[cur]}

/* ---- auth / invite / template / migration ---- */
const emptyNow=()=>!FB_OK?'<div class="glass blk"><p>尚未設定 Firebase。請依說明填入 firebase-config.js 後重新整理。</p></div>':me?'<div class="glass blk"><p>無當前行程，請新增行程或輸入邀請碼</p><div class="pills"><button class="pill" data-a="add" data-v="now"><span class="dot">＋</span>新增行程</button><button class="pill gl" data-a="join">🔑 輸入邀請碼</button><button class="pill gl" data-a="tpl">📥 匯入範例：北海道</button></div></div>':'<div class="glass blk"><p>無當前行程，請登入後新增行程或輸入邀請碼</p><div class="pills"><button class="pill" data-a="auth">Google 一鍵登入</button></div></div>';
function drawerExtra(){return me?`<p class="grp">👤 ${esc(me.displayName||me.email||"我")}</p><button data-a="add" data-v="now">＋ 新增行程</button><button data-a="join">🔑 輸入邀請碼</button><button data-a="tpl">📥 匯入範例：北海道</button><button data-a="auth">登出</button>`:`<p class="grp">帳戶</p><button class="login" data-a="auth">Google 一鍵登入</button>`}
async function login(){const p=new GoogleAuthProvider();try{await signInWithPopup(auth,p)}catch(e){if(e.code==="auth/popup-blocked"||e.code==="auth/operation-not-supported-in-this-environment")signInWithRedirect(auth,p);else if(e.code!=="auth/popup-closed-by-user")toast("登入失敗："+e.code)}}
async function ensureInvite(t){if(t.inviteCode)return t.inviteCode;for(let i=0;i<3;i++){const c=rnd(6);try{await setDoc(doc(db,"invites",c),{tripId:t.id,owner:me.uid});await updateDoc(tdoc(t),{inviteCode:c});t.inviteCode=c;return c}catch(e){}}return null}
async function joinTrip(code){code=code.trim().toUpperCase();if(!code){toast("請輸入邀請碼");return false}
 const iv=await getDoc(doc(db,"invites",code));if(!iv.exists()){toast("找不到這個邀請碼");return false}
 const id=iv.data().tripId;if(TRIPS.some(x=>x.id===id)){toast("你已經在這趟行程裡了");return true}
 const has=visible().some(x=>x.status==="now");
 try{await updateDoc(doc(db,"trips",id),{lastJoinCode:code,members:arrayUnion(me.uid),["memberNames."+me.uid]:me.displayName||"成員",["st."+me.uid]:has?"future":"now"})}catch(e){console.error("[joinTrip] 寫入 trips/"+id+" 失敗",{code:e.code,message:e.message,uid:me.uid,inviteCode:code},e);throw e}toast("已加入行程");go(has?"future":"now");return true}
async function createFromTpl(extra){const {id,expensesConfig,owner,status,...rest}=TPL;await archiveNow("");
 const ref=doc(collection(db,"trips"));
 await setDoc(ref,{...ser({...rest,booking:[],expenses:[],lightSplitUrl:expensesConfig.lightSplitUrl,currency:expensesConfig.currency,templateId:id,owner:me.uid,members:[me.uid],memberNames:{[me.uid]:me.displayName||"我"},st:{[me.uid]:"now"},...extra}),createdAt:serverTimestamp()})}
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
 modal(`<h3>👥 成員（${t.members.length}）</h3>${t.members.map(u=>`<div class="row"><span>${esc(nameOf(t,u))}${u===t.owner?' <small class="meta">建立者</small>':""}${u===me.uid?' <small class="meta">你</small>':""}</span>${mine&&u!==t.owner?`<button class="cb" data-a="kick" data-v="${esc(u)}">踢出</button>`:""}</div>`).join("")}
 <h4 class="meta" style="margin:16px 0 4px">邀請朋友加入</h4><div class="jp codebox"><span>${esc(code||"—")}</span><button class="pill" data-a="cpinv" data-v="${esc(code||"")}">複製</button></div>
 <p class="meta">把邀請碼傳給親友，他們登入後從選單「🔑 輸入邀請碼」輸入就能加入。</p><div class="pills">${mine?'<button class="pill gl" data-a="resetinv">🔄 重設邀請碼</button>':'<button class="pill gl" data-a="leave">離開此行程</button>'}</div>`)}
async function resetInvite(t){for(let i=0;i<3;i++){const c=rnd(6);try{await setDoc(doc(db,"invites",c),{tripId:t.id,owner:me.uid});await updateDoc(tdoc(t),{inviteCode:c});t.inviteCode=c;toast("已重設，舊邀請碼失效");return true}catch(e){}}toast("重設失敗");return false}
function pickPt(p){const t=T0();if(!t)return null;const d=getDays(t)[p.day]||{},k=d.k||"",hot=(t.hotspots||[]).find(h=>h.name===p.title),tag=(hot&&hot.note)||p.note||"",meta=[d.date,d.city].filter(Boolean).join(" ")+((d.wx||d.tp)?"・"+[d.wx,d.tp].filter(Boolean).join(" "):"");
 const el=document.createElement("div");el.className="pp";
 el.innerHTML=`<div class="mit"><b>${esc(p.title)}</b>${k?`<span class="chip">${esc(k)}</span>`:""}</div>${tag?`<p class="ptag">${esc(tag)}</p>`:""}${p.time?`<p>🕒 ${esc(p.time)}</p>`:""}${meta?`<p class="mis">${esc(meta)}</p>`:""}<div class="pills">${k?`<button class="pill" data-ppday="${p.day}">看 ${esc(k)} 行程</button>`:""}<a class="pill gl" href="https://maps.google.com/?q=${p.lat},${p.lng}" target="_blank" rel="noopener">📍 地圖</a></div>`;
 const b=el.querySelector("[data-ppday]");if(b)b.addEventListener("click",()=>{dayI[t.id]=p.day;$("#dayblk").innerHTML=dayHTML(t,p.day);document.querySelectorAll("#dtabs button").forEach((x,n)=>x.classList.toggle("on",n===p.day));$("#dtabs").scrollIntoView({behavior:"smooth"})});
 return el}
window.__tp=true;
