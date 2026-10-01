const KEY_HASH="2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b"; // 預設金鑰 "secret" 的 SHA-256，請自行更換
const $=s=>document.querySelector(s);
const esc=x=>String(x??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const flag=cc=>String.fromCodePoint(...[...cc.toUpperCase()].map(c=>127397+c.charCodeAt()));
const fmt=(n,c)=>`${c} ${Math.round(n).toLocaleString()}`;
let DATA=[],user="shared",unlocked=false,zm=null;const dayI={};
const store=(k,v)=>{try{v==null?localStorage.getItem(k):localStorage.setItem(k,v)}catch(e){}};
const load=k=>{try{return localStorage.getItem(k)}catch(e){return null}};
function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("on");setTimeout(()=>t.classList.remove("on"),1600)}
function copy(s){(navigator.clipboard?navigator.clipboard.writeText(s):Promise.reject()).then(()=>toast("已複製"),()=>toast("請手動複製"))}
function modal(h){$("#sheet").innerHTML=h+'<div class="pills"><button class="pill gl" data-a="close">關閉</button></div>';$("#modal").classList.add("on")}
async function sha(s){try{const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}catch(e){return""}}
async function init0(){const q=new URLSearchParams(location.search),m={ai:"Ai",艾庭:"Ai",partner:"Partner",隊友:"Partner",shared:"shared",we:"shared"};
 const p=q.get("user"),u=p&&m[p.toLowerCase()];if(u)store("tp-user",u);user=u||load("tp-user")||"shared";
 const k=q.get("key");if(k&&await sha(k)===KEY_HASH)store("tp-ok","1");unlocked=load("tp-ok")==="1";
 $("#lock").textContent=unlocked?"🔓 已解鎖":"🔒 訪客模式"}
const visible=()=>DATA.filter(t=>user==="shared"?t.owner==="shared":(t.owner===user||t.owner==="shared")).map(t=>({...t,locked:t.private&&!unlocked}));

/* accounting */
function settle(c){const m=c.members,paid={},owed={};m.forEach(x=>{paid[x]=0;owed[x]=0});let total=0;
 c.expenses.forEach(e=>{total+=e.amount;paid[e.paidBy]=(paid[e.paidBy]||0)+e.amount;const sw=e.splitWith?.length?e.splitWith:m;sw.forEach(x=>owed[x]=(owed[x]||0)+e.amount/sw.length)});
 const bal=m.map(x=>({m:x,b:paid[x]-owed[x]})),de=bal.filter(x=>x.b<-.5).sort((a,b)=>a.b-b.b),cr=bal.filter(x=>x.b>.5).sort((a,b)=>b.b-a.b),out=[];let i=0,j=0;
 while(i<de.length&&j<cr.length){const a=Math.min(-de[i].b,cr[j].b);out.push([de[i].m,cr[j].m,a]);de[i].b+=a;cr[j].b-=a;if(de[i].b>-.5)i++;if(cr[j].b<.5)j++}
 return{total,paid,out}}
function acct(t){const c=t.expensesConfig,r=settle(c),cur=c.currency;
 return`<p class="meta">參與成員 (${c.members.length}人)：${c.members.map(esc).join("、")}</p>
 ${c.lightSplitUrl?`<div class="pills"><a class="pill" href="${esc(c.lightSplitUrl)}" target="_blank" rel="noopener">🔗 LightSplit 記帳本</a></div>`:""}
 <p style="margin-top:12px" class="meta">總花費</p><p class="sum">${fmt(r.total,cur)}</p>
 <h4 class="meta" style="margin:12px 0 2px">各自墊付</h4>${c.members.map(m=>`<div class="row"><span>${esc(m)}</span><b>${fmt(r.paid[m]||0,cur)}</b></div>`).join("")}
 <h4 class="meta" style="margin:12px 0 2px">結算</h4>${r.out.length?r.out.map(o=>`<div class="pay">${esc(o[0])} → ${esc(o[1])}　<b>${fmt(o[2],cur)}</b></div>`).join(""):'<div class="pay">已平衡 ✅</div>'}
 <h4 class="meta" style="margin:12px 0 2px">明細</h4>${c.expenses.map(e=>`<div class="row"><span>${esc(e.item)}<br><small class="meta">${esc(e.paidBy)} 付・${(e.splitWith||[]).map(esc).join("/")}</small></span><b>${fmt(e.amount,cur)}</b></div>`).join("")||'<p class="meta">尚無明細</p>'}`}

/* now view */
const bookHTML=t=>`<h3>🏨 預約與票券</h3>${t.booking.map(b=>`<div class="row"><span>${esc(b.n)}<br><small class="meta">${esc(b.c||"尚未填寫")}</small></span>${b.c?`<button class="cb" data-a="cp" data-v="${esc(b.c.replace(/^No\.\s*/,""))}">複製</button>`:""}</div>`).join("")}`;
const dietHTML=t=>`<h3>🥬 飲食溝通日文卡</h3><div class="jp" id="jp">${esc(t.diet)}</div><div class="pills"><button class="pill" data-a="cp" data-v="${esc(t.diet)}">複製日文</button></div>`;
const sosHTML=t=>`<h3>🆘 緊急聯絡／保險</h3>${t.sos.map(s=>`<div class="row"><span>${esc(s[0])}</span>${s[2]?`<a class="cb" href="${s[2]}">${esc(s[1])}</a>`:`<b>${esc(s[1])}</b>`}</div>`).join("")}<p class="meta" style="margin-top:8px">請先把空白欄位填進 trips.json。</p>`;
const itm=x=>`<div class="it ${x.type}"><div class="tm">${esc(x.t)}</div><div class="bd"><b>${esc(x.h)}</b>${x.type==="crit"?'<em class="tag">重要班次</em>':""}${x.d?`<p>${esc(x.d)}</p>`:""}${x.q?`<a class="cb" href="https://maps.google.com/?q=${encodeURIComponent(x.q)}" target="_blank" rel="noopener">📍 開啟地圖</a>`:""}${x.more?`<details><summary>備案／說明</summary><p>${esc(x.more)}</p></details>`:""}</div></div>`;
const dayHTML=(t,i)=>{const d=t.days[i];return`<div class="glass ov"><h3>${esc(d.k)}｜${esc(d.city)}</h3><p>${esc(d.date)}　${d.wx} ${esc(d.tp)}</p><p>${esc(d.pos)}</p></div>${d.items.map(itm).join("")}`};
function todayIdx(t){const n=new Date(),s=new Date(t.startDate+"T00:00"),k=Math.floor((n-s)/864e5);return k>=0&&k<t.days.length?k:0}
function nowCard(t){const hs=t.hotspots,[W,H]=t.mapSize,di=dayI[t.id]??todayIdx(t);
 return`<article class="glass dark hero"><small>${flag(t.countryCode)} 當前行程</small><h2>${esc(t.title)}</h2><p>${esc(t.startDate)} – ${esc(t.endDate.slice(5))}・${t.days.length} 天</p><div class="cdp" id="cd"></div>
 <div class="pills"><button class="pill lt" data-a="m" data-v="book">🏨 預約號</button><button class="pill lt" data-a="m" data-v="diet">🥬 飲食卡</button><button class="pill lt" data-a="m" data-v="sos">🆘 緊急</button></div></article>
 <h2 class="sec">熱點地圖</h2><div class="glass blk"><div class="mapw"><div class="mz" id="mz"><img src="${esc(t.mapImage)}" alt="北海道手繪旅行地圖">${hs.map((h,i)=>`<button class="hs" aria-label="${esc(h.name)}" style="left:${h.x/W*100}%;top:${h.y/H*100}%" data-a="hs" data-v="${i}"></button>`).join("")}</div></div><div class="mi" id="mi">👆 點地圖上的地點，會放大並顯示當天資訊</div></div>
 <h2 class="sec">每日行程</h2><div class="days" id="dtabs">${t.days.map((d,i)=>`<button class="${i===di?"on":""}" data-a="day" data-v="${i}">${esc(d.k)}</button>`).join("")}</div><div id="dayblk">${dayHTML(t,di)}</div>
 <h2 class="sec">預約與票券</h2><div class="glass blk">${bookHTML(t).replace(/<h3>.*?<\/h3>/,"")}</div>
 <h2 class="sec">記帳與拆帳</h2><div class="glass blk">${acct(t)}</div>
 <div class="pills" style="margin-top:6px"><a class="pill gl" href="${esc(t.manual)}">📘 完整手冊（暴風雪／清單／匯率）</a></div>`}
function mapZoom(t,k){const mz=$("#mz");if(zm===k){zm=null;mz.style.transform="";document.querySelectorAll(".hs").forEach(b=>b.classList.remove("act"));$("#mi").innerHTML="👆 點地圖上的地點，會放大並顯示當天資訊";return}
 zm=k;const h=t.hotspots[k],S=2.4,px=h.x/t.mapSize[0]*100,py=h.y/t.mapSize[1]*100,cl=v=>Math.min(0,Math.max(100-100*S,v));
 mz.style.transform=`translate(${cl(50-px*S)}%,${cl(50-py*S)}%) scale(${S})`;document.querySelectorAll(".hs").forEach((b,i)=>b.classList.toggle("act",i===k));
 const d=t.days[h.day];$("#mi").innerHTML=`<b>${esc(h.name)}</b><span class="chip">${esc(d.k)}</span><p>${esc(h.note)}</p><p>${esc(d.date)} ${esc(d.city)}・${esc(d.tp)}</p><div class="pills"><button class="pill" data-a="day" data-v="${h.day}" data-go="1">看 ${esc(d.k)} 行程</button><a class="pill gl" href="https://maps.google.com/?q=${encodeURIComponent(h.name+" 北海道")}" target="_blank" rel="noopener">📍 地圖</a></div>`}

/* cards */
function tcard(t){const f=flag(t.countryCode),fut=t.status==="future";
 if(t.locked)return`<article class="glass tc lk"><div class="ph">🔒</div><div class="in"><h3>私密行程</h3><p class="meta">${f} ${esc(t.country)}・${t.days} 天・${t.startDate.slice(0,4)}</p><p class="meta">帶上 ?key= 即可解鎖</p></div></article>`;
 return`<article class="glass tc ${fut?"fut":""}"><div class="ph">${f}</div><div class="in"><h3>${esc(t.title)}</h3><p class="meta">${esc(t.startDate)}${t.endDate?" – "+esc(t.endDate.slice(5)):""}・${t.days} 天</p>${t.cities.map(c=>`<span class="cc">${esc(c)}</span>`).join("")}${t.notes?`<p style="margin-top:8px;font-size:.9rem">${esc(t.notes)}</p>`:""}
 ${t.spots.length?`<details><summary>📍 景點 (${t.spots.length})</summary>${t.spots.map(s=>`<div class="row"><span>D${s.day}　${esc(s.name)}</span><a class="cb" href="https://maps.google.com/?q=${s.lat},${s.lng}" target="_blank" rel="noopener">地圖</a></div>`).join("")}</details>`:""}
 ${t.expensesConfig.expenses.length||t.expensesConfig.lightSplitUrl?`<details><summary>💰 記帳與拆帳</summary>${acct(t)}</details>`:""}</div></article>`}

function render(){const v=visible(),by=s=>v.filter(t=>t.status===s),none='<p class="empty">這個身份目前沒有資料</p>';
 document.querySelectorAll(".seg button").forEach(b=>b.classList.toggle("on",b.dataset.u===user));zm=null;
 $("#t-now").innerHTML=by("now").map(t=>t.locked?tcard(t):nowCard(t)).join("")||none;
 const real=v.filter(t=>t.status!=="future");
 $("#stats").innerHTML=`<div class="glass stat"><b>${new Set(real.map(t=>t.countryCode)).size}</b><small>造訪國家</small></div><div class="glass stat"><b>${real.reduce((s,t)=>s+t.days,0)}</b><small>總天數</small></div><div class="glass stat"><b>${real.length}</b><small>趟旅行</small></div>`;
 MapView.render(v);
 $("#t-past").innerHTML=`<div class="grid">${by("past").map(tcard).join("")||none}</div>`;
 $("#t-future").innerHTML=`<div class="grid">${by("future").map(tcard).join("")||none}</div>`;tick()}
function tick(){const el=$("#cd"),t=visible().find(x=>x.status==="now"&&!x.locked);if(!el||!t)return;const now=new Date(),st=new Date(t.startDate+"T00:00");
 if(now<st){el.textContent=`出發倒數 ${Math.ceil((st-now)/864e5)} 天`;return}
 const nx=t.alerts.find(a=>new Date(a[0])>now);if(!nx){el.textContent="旅程結束 ✨";return}
 const ms=new Date(nx[0])-now,d=Math.floor(ms/864e5),h=Math.floor(ms%864e5/36e5),m=Math.floor(ms%36e5/6e4);el.textContent=`${nx[1]}・${d?d+"天":""}${h}時${m}分`}

/* events */
document.addEventListener("click",e=>{const b=e.target.closest("[data-a],[data-u],[data-t]");if(!b)return;
 const t=visible().find(x=>x.status==="now"&&!x.locked),a=b.dataset.a,v=b.dataset.v;
 if(b.dataset.u){user=b.dataset.u;store("tp-user",user);render();return}
 if(b.dataset.t){document.querySelectorAll(".bar button").forEach(x=>x.classList.toggle("on",x===b));document.querySelectorAll(".panel").forEach(p=>p.classList.toggle("on",p.id==="t-"+b.dataset.t));window.scrollTo({top:0});if(b.dataset.t==="map")MapView.refresh();return}
 if(a==="close")$("#modal").classList.remove("on");
 else if(a==="cp")copy(v);
 else if(a==="m"&&t)modal({book:bookHTML,diet:dietHTML,sos:sosHTML}[v](t));
 else if(a==="hs"&&t)mapZoom(t,+v);
 else if(a==="day"&&t){dayI[t.id]=+v;$("#dayblk").innerHTML=dayHTML(t,+v);document.querySelectorAll("#dtabs button").forEach((x,i)=>x.classList.toggle("on",i===+v));if(b.dataset.go)$("#dtabs").scrollIntoView({behavior:"smooth"})}});
$("#modal").addEventListener("click",e=>{if(e.target.id==="modal")$("#modal").classList.remove("on")});
(async()=>{await init0();MapView.init();
 try{DATA=(await (await fetch("trips.json")).json()).trips}catch(e){$("#t-now").innerHTML='<p class="empty">無法載入 trips.json（請用 http 伺服器開啟）</p>'}
 render();setInterval(tick,60000);
 if("serviceWorker" in navigator&&location.protocol.startsWith("http"))navigator.serviceWorker.register("sw.js").catch(()=>{})})();
