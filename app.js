const KEY_HASH="2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b"; // 預設金鑰 "secret" 的 SHA-256，請自行更換
const $=s=>document.querySelector(s);
const esc=x=>String(x??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
let DATA=[],user="shared",unlocked=false;
const flag=cc=>String.fromCodePoint(...[...cc.toUpperCase()].map(c=>127397+c.charCodeAt()));
const fmt=(n,cur)=>`${cur} ${Math.round(n).toLocaleString()}`;
async function sha(s){try{const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}catch(e){return""}}
async function checkKey(){const p=new URLSearchParams(location.search).get("key");
 if(p&&await sha(p)===KEY_HASH){unlocked=true;try{localStorage.setItem("tk-ok","1")}catch(e){}}
 else try{unlocked=localStorage.getItem("tk-ok")==="1"}catch(e){}
 $("#lock").textContent=unlocked?"🔓 已解鎖":"🔒 訪客模式"}
const visible=()=>DATA.filter(t=>user==="shared"?t.owner==="shared":(t.owner===user||t.owner==="shared")).map(t=>({...t,locked:t.private&&!unlocked}));

/* 多人拆帳 */
function settle(c){const m=c.members,paid={},owed={};m.forEach(x=>{paid[x]=0;owed[x]=0});let total=0;
 c.expenses.forEach(e=>{total+=e.amount;paid[e.paidBy]=(paid[e.paidBy]||0)+e.amount;const sw=e.splitWith&&e.splitWith.length?e.splitWith:m;sw.forEach(x=>owed[x]=(owed[x]||0)+e.amount/sw.length)});
 const bal=m.map(x=>({m:x,b:paid[x]-owed[x]})),de=bal.filter(x=>x.b<-.5).sort((a,b)=>a.b-b.b),cr=bal.filter(x=>x.b>.5).sort((a,b)=>b.b-a.b),out=[];
 let i=0,j=0;while(i<de.length&&j<cr.length){const a=Math.min(-de[i].b,cr[j].b);out.push([de[i].m,cr[j].m,a]);de[i].b+=a;cr[j].b-=a;if(de[i].b>-.5)i++;if(cr[j].b<.5)j++}
 return{total,paid,out}}
function acct(t){const c=t.expensesConfig;if(!c)return"";const r=settle(c),cur=c.currency;
 return`<div><p class="meta">參與成員 (${c.members.length}人)：${c.members.map(esc).join("、")}</p>
 ${c.lightSplitUrl?`<a class="btn" href="${esc(c.lightSplitUrl)}" target="_blank" rel="noopener">🔗 開啟 LightSplit 記帳本</a>`:""}
 <p style="margin-top:10px">總花費 <span class="sum">${fmt(r.total,cur)}</span></p>
 <h4 style="margin:10px 0 4px">各自墊付</h4>${c.members.map(m=>`<div class="row"><span>${esc(m)}</span><b>${fmt(r.paid[m]||0,cur)}</b></div>`).join("")}
 <h4 style="margin:10px 0 4px">結算</h4>${r.out.length?r.out.map(o=>`<div class="pay">${esc(o[0])} → ${esc(o[1])}　<b>${fmt(o[2],cur)}</b></div>`).join(""):'<div class="pay">已平衡 ✅</div>'}
 <h4 style="margin:10px 0 4px">明細</h4>${c.expenses.map(e=>`<div class="row"><span>${esc(e.item)}<br><small>${esc(e.paidBy)} 付・${(e.splitWith||[]).map(esc).join("/")}</small></span><b>${fmt(e.amount,cur)}</b></div>`).join("")||'<p class="meta">尚無明細</p>'}</div>`}

function card(t){const f=flag(t.countryCode),yr=(t.startDate||"").slice(0,4);
 if(t.locked)return`<article class="card locked"><h3>🔒 私密行程</h3><p class="meta">${f} ${esc(t.country)}・${t.days} 天・${yr}</p><p class="meta">帶上 ?key= 即可解鎖完整內容</p></article>`;
 const fut=t.status==="future";
 return`<article class="card"><h3>${f} ${esc(t.title)}</h3><p class="meta">${esc(t.startDate)}${t.endDate?" – "+esc(t.endDate.slice(5)):""}・${t.days} 天</p>
 <div>${t.cities.map(c=>`<span class="chip ${fut?"fut":""}">${esc(c)}</span>`).join("")}</div>${t.notes?`<p style="font-size:.9rem">${esc(t.notes)}</p>`:""}
 ${t.spots.length?`<details><summary>📍 景點 (${t.spots.length})</summary>${t.spots.map(s=>`<div class="row"><span>D${s.day}　${esc(s.name)}</span><a href="https://maps.google.com/?q=${s.lat},${s.lng}" target="_blank" rel="noopener">地圖</a></div>`).join("")}</details>`:""}
 ${fut&&!t.expensesConfig.expenses.length?"":`<details><summary>💰 記帳與拆帳</summary>${acct(t)}</details>`}</article>`}

function render(){const v=visible(),by=s=>v.filter(t=>t.status===s);
 const real=v.filter(t=>t.status!=="future");
 $("#stats").innerHTML=`<div class="stat"><b>${new Set(real.map(t=>t.countryCode)).size}</b><small>造訪國家</small></div><div class="stat"><b>${real.reduce((s,t)=>s+t.days,0)}</b><small>總天數</small></div><div class="stat"><b>${real.length}</b><small>趟旅行</small></div>`;
 MapView.render(v);
 const none='<p class="empty">這個身份目前沒有資料</p>';
 $("#t-now").innerHTML=by("now").map(t=>t.embed&&!t.locked?`<iframe class="embed" src="${esc(t.embed)}" title="${esc(t.title)}"></iframe>${card(t)}`:card(t)).join("")||none;
 $("#t-past").innerHTML=`<div class="grid">${by("past").map(card).join("")||none}</div>`;
 $("#t-future").innerHTML=`<div class="grid">${by("future").map(card).join("")||none}</div>`}

document.querySelectorAll(".switch button").forEach(b=>b.onclick=()=>{user=b.dataset.u;document.querySelectorAll(".switch button").forEach(x=>x.classList.toggle("on",x===b));render()});
document.querySelectorAll(".tabs button").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tabs button").forEach(x=>x.classList.toggle("on",x===b));document.querySelectorAll(".panel").forEach(p=>p.classList.toggle("on",p.id==="t-"+b.dataset.t));if(b.dataset.t==="map")MapView.refresh()});
(async()=>{await checkKey();MapView.init();
 try{DATA=(await (await fetch("trips.json")).json()).trips}catch(e){$("#t-now").innerHTML='<p class="empty">無法載入 trips.json（請用 http 伺服器開啟）</p>'}
 render();
 if("serviceWorker" in navigator&&location.protocol.startsWith("http"))navigator.serviceWorker.register("sw.js").catch(()=>{})})();
