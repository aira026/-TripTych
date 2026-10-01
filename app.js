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
let UT=[];
const FL={"日本":"JP","台灣":"TW","韓國":"KR","泰國":"TH","越南":"VN","新加坡":"SG","馬來西亞":"MY","香港":"HK","中國":"CN","美國":"US","加拿大":"CA","英國":"GB","法國":"FR","德國":"DE","義大利":"IT","西班牙":"ES","瑞士":"CH","冰島":"IS","澳洲":"AU","紐西蘭":"NZ","印尼":"ID","菲律賓":"PH","荷蘭":"NL","奧地利":"AT","捷克":"CZ","土耳其":"TR","希臘":"GR","挪威":"NO","芬蘭":"FI","瑞典":"SE"};
const flagOf=t=>{const c=t.countryCode||FL[t.country];return c?flag(c):"🌍"};
const nd=t=>Array.isArray(t.days)?t.days.length:(t.days||1);
async function init0(){try{UT=JSON.parse(load("tp-trips")||"[]")}catch(e){UT=[]}}
const saveUT=()=>store("tp-trips",JSON.stringify(UT));
const visible=()=>[...DATA,...UT].map(t=>({...t,locked:false}));

/* accounting */
function settle(c){const m=c.members,paid={},owed={};m.forEach(x=>{paid[x]=0;owed[x]=0});let total=0;
 c.expenses.forEach(e=>{total+=e.amount;paid[e.paidBy]=(paid[e.paidBy]||0)+e.amount;const sw=e.splitWith?.length?e.splitWith:m;sw.forEach(x=>owed[x]=(owed[x]||0)+e.amount/sw.length)});
 const bal=m.map(x=>({m:x,b:paid[x]-owed[x]})),de=bal.filter(x=>x.b<-.5).sort((a,b)=>a.b-b.b),cr=bal.filter(x=>x.b>.5).sort((a,b)=>b.b-a.b),out=[];let i=0,j=0;
 while(i<de.length&&j<cr.length){const a=Math.min(-de[i].b,cr[j].b);out.push([de[i].m,cr[j].m,a]);de[i].b+=a;cr[j].b-=a;if(de[i].b>-.5)i++;if(cr[j].b<.5)j++}
 return{total,paid,out}}
function acct(t,L,r){const c=t.expensesConfig,S=settle({members:c.members,expenses:L}),cur=c.currency,tw=v=>` <small class="meta">≈ NT$ ${Math.round(v*r).toLocaleString()}</small>`;
 return`<p class="meta">參與成員 (${c.members.length}人)：${c.members.map(esc).join("、")}</p>
 ${c.lightSplitUrl?`<div class="pills"><a class="pill" href="${esc(c.lightSplitUrl)}" target="_blank" rel="noopener">🔗 開啟 LightSplit 記帳本</a></div>`:""}
 <p style="margin-top:12px" class="meta">總花費</p><p class="sum">${fmt(S.total,cur)}${tw(S.total)}</p>
 <h4 class="meta" style="margin:12px 0 2px">各自墊付</h4>${c.members.map(m=>`<div class="row"><span>${esc(m)}</span><b>${fmt(S.paid[m]||0,cur)}</b></div>`).join("")}
 <h4 class="meta" style="margin:12px 0 2px">結算</h4>${S.out.length?S.out.map(o=>`<div class="pay">${esc(o[0])} → ${esc(o[1])}　<b>${fmt(o[2],cur)}</b>${tw(o[2])}</div>`).join(""):'<div class="pay">已平衡 ✅</div>'}
 <h4 class="meta" style="margin:12px 0 2px">明細</h4>${L.map((e,i)=>`<div class="row"><span>${esc(e.item)}<br><small class="meta">${esc(e.paidBy)} 付</small></span><b>${fmt(e.amount,cur)}</b><button class="x" data-a="delex" data-v="${i}" aria-label="刪除">✕</button></div>`).join("")||'<p class="meta">尚無明細</p>'}`}
/* --- Hokkaido sub pages --- */
const T0=()=>DATA.find(x=>x.status==="now");
const rate=()=>parseFloat(load("tp-rate"))||0.21;
const exList=t=>{try{const v=JSON.parse(load("tp-ex-"+t.id));if(Array.isArray(v))return v}catch(e){}return t.expensesConfig.expenses.map(e=>({...e}))};
const saveEx=(t,l)=>store("tp-ex-"+t.id,JSON.stringify(l));
const plist=t=>{try{const v=JSON.parse(load("tp-lists-"+t.id));if(v&&v.pack)return v}catch(e){}return{pack:t.pack.map(x=>({t:x,d:0})),gift:t.gift.map(x=>({t:x,d:0}))}};
const savePl=(t,l)=>store("tp-lists-"+t.id,JSON.stringify(l));
const tixHTML=t=>`<div class="glass blk">${bookHTML(t).replace(/<h3>.*?<\/h3>/,"")}</div><div class="pills"><button class="pill" data-a="m" data-v="diet">🥬 飲食日文卡</button><button class="pill gl" data-a="m" data-v="sos">🆘 緊急聯絡</button></div>`;
const stormHTML=t=>{const s=t.storm;return`<div class="tiles">${s.links.map(l=>`<a class="tile" href="${esc(l[2])}" target="_blank" rel="noopener"><i>${l[0]}</i>${esc(l[1])}</a>`).join("")}</div>
<h2 class="sec">每天最怕什麼</h2>${s.risks.map(r=>`<div class="rw ${r[3]?"crit":""}"><b>${esc(r[0])}</b><span>${esc(r[1])}</span><em>${esc(r[2])}</em></div>`).join("")}
<h2 class="sec">自駕危機處理</h2><ol class="cr">${s.crisis.map(c=>`<li><div><b>${esc(c[0])}</b><span>${esc(c[1])}</span></div></li>`).join("")}</ol><div class="pills"><a class="pill" href="tel:119">📞 撥打 119</a></div>`};
function yenHTML(t){const c=t.expensesConfig,r=rate(),L=exList(t);
 return`<div class="glass blk"><p class="meta">日幣換台幣</p><div class="bigres" id="twd">NT$ 0</div>
 <label class="fl">日幣金額（¥）<input class="fi" id="jpy" type="number" inputmode="numeric" placeholder="例如 11370"></label>
 <label class="fl">匯率（1 ¥ = ? NT$）<input class="fi" id="rate" type="number" step="0.001" value="${r}"></label><div class="qk" id="qk"></div></div>
 <h2 class="sec">記一筆</h2><div class="glass blk"><input class="fi" id="memo" placeholder="項目（例：午餐湯咖哩）"><select class="fi" id="payer">${c.members.map(m=>`<option>${esc(m)}</option>`).join("")}</select>
 <div class="pills"><button class="pill" data-a="addex">＋ 記入帳本</button><button class="pill gl" data-a="tols">📋 複製並到 LightSplit</button></div></div>
 <h2 class="sec">帳本與結算</h2><div class="glass blk">${acct(t,L,r)}</div>`}
function packHTML(t){const P=plist(t),sec=(k,ti)=>`<h2 class="sec">${ti}</h2><div class="glass blk">${P[k].map((x,i)=>`<label class="ck ${x.d?"done":""}"><input type="checkbox" data-k="${k}" data-i="${i}" ${x.d?"checked":""}><span>${esc(x.t)}</span><button class="x" data-a="deli" data-k="${k}" data-i="${i}" aria-label="刪除">✕</button></label>`).join("")}<div class="add"><input class="fi" id="in-${k}" placeholder="新增項目…"><button class="pill" data-a="addi" data-v="${k}">＋</button></div></div>`;
 return sec("pack","🎒 冬季裝備")+sec("gift","🎁 伴手禮／想買")}
function calc(){const v=parseFloat($("#jpy")?.value)||0,r=parseFloat($("#rate")?.value)||0;if(!$("#twd"))return;if(r)store("tp-rate",r);$("#twd").textContent="NT$ "+Math.round(v*r).toLocaleString();
 $("#qk").innerHTML=[1000,5000,10000,20000].map(x=>`<button data-a="q" data-v="${x}"><small>¥${x.toLocaleString()}</small>NT$${Math.round(x*r).toLocaleString()}</button>`).join("")}
function renderNow(t){const ids=["now","tix","storm","yen","pack"],emp='<p class="empty">目前沒有進行中的旅程</p>';
 const f={now:nowCard,tix:tixHTML,storm:stormHTML,yen:yenHTML,pack:packHTML};ids.forEach(i=>{$("#t-"+i).innerHTML=t?f[i](t):emp});calc()}

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
 <h2 class="sec">每日行程</h2><div class="days" id="dtabs">${t.days.map((d,i)=>`<button class="${i===di?"on":""}" data-a="day" data-v="${i}">${esc(d.k)}</button>`).join("")}</div><div id="dayblk">${dayHTML(t,di)}</div>`}
function mapZoom(t,k){const mz=$("#mz");if(zm===k){zm=null;mz.style.transform="";document.querySelectorAll(".hs").forEach(b=>b.classList.remove("act"));$("#mi").innerHTML="👆 點地圖上的地點，會放大並顯示當天資訊";return}
 zm=k;const h=t.hotspots[k],S=2.4,px=h.x/t.mapSize[0]*100,py=h.y/t.mapSize[1]*100,cl=v=>Math.min(0,Math.max(100-100*S,v));
 mz.style.transform=`translate(${cl(50-px*S)}%,${cl(50-py*S)}%) scale(${S})`;document.querySelectorAll(".hs").forEach((b,i)=>b.classList.toggle("act",i===k));
 const d=t.days[h.day];$("#mi").innerHTML=`<b>${esc(h.name)}</b><span class="chip">${esc(d.k)}</span><p>${esc(h.note)}</p><p>${esc(d.date)} ${esc(d.city)}・${esc(d.tp)}</p><div class="pills"><button class="pill" data-a="day" data-v="${h.day}" data-go="1">看 ${esc(d.k)} 行程</button><a class="pill gl" href="https://maps.google.com/?q=${encodeURIComponent(h.name+" 北海道")}" target="_blank" rel="noopener">📍 地圖</a></div>`}

/* cards */
function tcard(t){const fut=t.status==="future",mine=String(t.id).startsWith("u-");
 return`<article class="glass tc ${fut?"fut":""}"><div class="ph">${t.image?`<img src="${esc(t.image)}" alt="${esc(t.title)}" loading="lazy" onerror="this.remove()">`:""}<span>${flagOf(t)}</span></div><div class="in"><h3>${esc(t.title)}</h3><p class="meta">${esc(t.country)}・${esc(t.startDate||"日期未定")}${t.endDate?" – "+esc(t.endDate.slice(5)):""}・${nd(t)} 天</p>${t.notes?`<p style="margin-top:8px;font-size:.9rem">${esc(t.notes)}</p>`:""}
 <div class="pills" style="margin-top:10px">${t.spots?.length?`<a class="pill gl" href="https://maps.google.com/?q=${t.spots[0].lat},${t.spots[0].lng}" target="_blank" rel="noopener">📍 地圖</a>`:""}${mine?`<button class="pill gl" data-a="edit" data-v="${esc(t.id)}">✏️ 編輯</button><button class="pill gl" data-a="del" data-v="${esc(t.id)}">🗑 刪除</button>`:""}</div></div></article>`}

/* add / edit */
function form(st,id){const t=UT.find(x=>x.id===id)||{status:st,spots:[]},sp=t.spots?.[0]||{};
 modal(`<h3>${id?"編輯旅程":"新增旅程"}</h3><div class="fm" data-id="${esc(id||"")}">
 <label>地點<input id="f-place" value="${esc(t.title)}" placeholder="例如：清邁" required></label>
 <label>國家<input id="f-country" list="cl" value="${esc(t.country)}" placeholder="例如：泰國" required></label><datalist id="cl">${Object.keys(FL).map(k=>`<option value="${k}">`).join("")}</datalist>
 <div class="two"><label>出發日<input id="f-s" type="date" value="${esc(t.startDate)}"></label><label>回程日<input id="f-e" type="date" value="${esc(t.endDate)}"></label></div>
 <label>類型<select id="f-st"><option value="past" ${t.status==="past"?"selected":""}>📚 歷史旅程</option><option value="future" ${t.status==="future"?"selected":""}>✨ 未來清單</option></select></label>
 <label>圖片連結<input id="f-img" type="url" value="${esc(t.image)}" placeholder="https://…"></label>
 <label>備註<textarea id="f-note" rows="3">${esc(t.notes)}</textarea></label>
 <details><summary>進階：座標（留空會自動查詢）</summary><div class="two"><label>緯度<input id="f-lat" type="number" step="any" value="${sp.lat??""}"></label><label>經度<input id="f-lng" type="number" step="any" value="${sp.lng??""}"></label></div></details>
 <div class="pills"><button class="pill" data-a="save"><span class="dot">✓</span>儲存</button></div></div>`)}
async function geo(q){try{const r=await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&q="+encodeURIComponent(q));const j=await r.json();return j[0]?[+j[0].lat,+j[0].lon]:null}catch(e){return null}}
async function saveForm(){const v=i=>$("#f-"+i).value.trim(),id=document.querySelector(".fm").dataset.id,place=v("place"),country=v("country");
 if(!place||!country)return toast("請填寫地點與國家");
 let img=v("img");if(img&&!/^https?:\/\//i.test(img)){toast("圖片連結需以 http(s):// 開頭");img=""}
 let lat=parseFloat(v("lat")),lng=parseFloat(v("lng"));
 if(isNaN(lat)||isNaN(lng)){toast("查詢座標中…");const g=await geo(place+", "+country);if(g)[lat,lng]=g;else toast("找不到座標，可稍後編輯")}
 const s=v("s"),e=v("e"),days=s&&e?Math.max(1,Math.round((new Date(e)-new Date(s))/864e5)+1):1;
 const t={id:id||"u-"+Date.now(),status:v("st"),title:place,country,countryCode:FL[country]||"",startDate:s,endDate:e,days,image:img,notes:v("note"),spots:isNaN(lat)||isNaN(lng)?[]:[{name:place,lat,lng,day:1}]};
 const i=UT.findIndex(x=>x.id===t.id);i>=0?UT[i]=t:UT.push(t);saveUT();$("#modal").classList.remove("on");render();toast("已儲存")}

function render(){const v=visible(),by=s=>v.filter(t=>t.status===s);zm=null;
 renderNow(by("now")[0]);
 const real=v.filter(t=>t.status!=="future");
 $("#stats").innerHTML=`<div class="glass stat"><b>${new Set(real.map(t=>t.countryCode||t.country)).size}</b><small>造訪國家</small></div><div class="glass stat"><b>${real.reduce((s,t)=>s+nd(t),0)}</b><small>總天數</small></div><div class="glass stat"><b>${real.length}</b><small>趟旅行</small></div>`;
 MapView.render(v);
 const emp='<p class="empty">還沒有旅程，點上方「＋ 新增旅程」開始記錄</p>';
 $("#l-past").innerHTML=by("past").map(tcard).join("")||emp;$("#l-future").innerHTML=by("future").map(tcard).join("")||emp;tick()}
function tick(){const el=$("#cd"),t=visible().find(x=>x.status==="now"&&!x.locked);if(!el||!t)return;const now=new Date(),st=new Date(t.startDate+"T00:00");
 if(now<st){el.textContent=`出發倒數 ${Math.ceil((st-now)/864e5)} 天`;return}
 const nx=t.alerts.find(a=>new Date(a[0])>now);if(!nx){el.textContent="旅程結束 ✨";return}
 const ms=new Date(nx[0])-now,d=Math.floor(ms/864e5),h=Math.floor(ms%864e5/36e5),m=Math.floor(ms%36e5/6e4);el.textContent=`${nx[1]}・${d?d+"天":""}${h}時${m}分`}

/* events */
document.addEventListener("click",e=>{const b=e.target.closest("[data-a],[data-t]");if(!b)return;
 const t=visible().find(x=>x.status==="now"&&!x.locked),a=b.dataset.a,v=b.dataset.v;
 if(b.dataset.t){document.body.classList.remove("dr");document.querySelectorAll(".drawer button").forEach(x=>x.classList.toggle("on",x===b));document.querySelectorAll(".panel").forEach(p=>p.classList.toggle("on",p.id==="t-"+b.dataset.t));window.scrollTo({top:0});$("#crumb").textContent=b.dataset.c||"";if(b.dataset.t==="map")MapView.refresh();return}
 if(a==="menu"){document.body.classList.toggle("dr");return}
 if(a==="add"){form(v);return}
 if(a==="edit"){form(null,v);return}
 if(a==="save"){saveForm();return}
 if(a==="del"){if(confirm("刪除這趟旅程？")){UT=UT.filter(x=>x.id!==v);saveUT();render()}return}

 if(a==="q"){$("#jpy").value=v;calc();return}
 if(a==="addex"&&t){const y=parseFloat($("#jpy").value)||0;if(!y)return toast("請先輸入日幣");const L=exList(t);L.push({item:$("#memo").value.trim()||"花費",amount:y,paidBy:$("#payer").value,splitWith:t.expensesConfig.members});saveEx(t,L);$("#t-yen").innerHTML=yenHTML(t);calc();toast("已記帳");return}
 if(a==="delex"&&t){const L=exList(t);L.splice(+v,1);saveEx(t,L);$("#t-yen").innerHTML=yenHTML(t);calc();return}
 if(a==="tols"&&t){const y=parseFloat($("#jpy").value)||0;if(!y)return toast("請先輸入日幣");copy(`${$("#memo").value.trim()||"花費"} ¥${y.toLocaleString()} ≈ NT$${Math.round(y*rate()).toLocaleString()}（匯率${rate()}）付款：${$("#payer").value}`);if(t.expensesConfig.lightSplitUrl)window.open(t.expensesConfig.lightSplitUrl,"_blank");return}
 if(a==="addi"&&t){const i=$("#in-"+v),x=i.value.trim();if(!x)return;const P=plist(t);P[v].push({t:x,d:0});savePl(t,P);$("#t-pack").innerHTML=packHTML(t);return}
 if(a==="deli"&&t){e.preventDefault();const P=plist(t);P[b.dataset.k].splice(+b.dataset.i,1);savePl(t,P);$("#t-pack").innerHTML=packHTML(t);return}
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

document.addEventListener("input",e=>{if(e.target.id==="jpy"||e.target.id==="rate")calc()});
document.addEventListener("change",e=>{const c=e.target.closest("input[data-k]"),t=T0();if(!c||!t)return;const P=plist(t);P[c.dataset.k][+c.dataset.i].d=c.checked?1:0;savePl(t,P);c.closest(".ck").classList.toggle("done",c.checked)});
