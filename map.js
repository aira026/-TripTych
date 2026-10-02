const popEl=(rows)=>{const d=document.createElement("div");d.className="pp";rows.forEach(([c,t])=>{if(!t)return;const e=document.createElement("div");e.className=c;e.textContent=t;d.appendChild(e)});return d};
const MapView={map:null,layer:null,
init(){this.map=L.map("map").setView([30,120],2);
 L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap",maxZoom:18}).addTo(this.map);
 this.layer=L.layerGroup().addTo(this.map)},
render(trips){this.layer.clearLayers();const all=[],col={past:"#111111",now:"#ff7a2b",future:"#e58fa0"};
 trips.forEach(t=>{if(t.locked||!t.spots)return;const c=col[t.status],pts=[...t.spots].sort((a,b)=>a.day-b.day).map(s=>[s.lat,s.lng]);
  if(pts.length>1)L.polyline(pts,{color:c,weight:3,dashArray:t.status==="future"?"6 6":null}).addTo(this.layer);
  t.spots.forEach(s=>{all.push([s.lat,s.lng]);L.circleMarker([s.lat,s.lng],{radius:7,color:"#fff",weight:2,fillColor:c,fillOpacity:1}).bindPopup(popEl([["pt",s.name],["pd",t.title+(s.day?"・D"+s.day:"")]])).addTo(this.layer)})});
 if(all.length)this.map.fitBounds(all,{padding:[30,30],maxZoom:6})},
refresh(){setTimeout(()=>this.map.invalidateSize(),60)}};

const MiniMap={m:null,ks:[],sel:null,ll:[],
render(id,pts,mk){try{if(this.m)this.m.remove()}catch(e){}this.m=null;this.ks=[];this.sel=null;this.ll=[];const el=document.getElementById(id);if(!el)return;
 this.m=L.map(id,{scrollWheelZoom:false}).setView([30,120],2);
 L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap",maxZoom:18}).addTo(this.m);
 if(!pts.length)return;const s=[...pts].sort((a,b)=>a.day-b.day),ll=s.map(p=>[p.lat,p.lng]);this.ll=ll;
 if(ll.length>1)L.polyline(ll,{color:"#ff7a2b",weight:3,opacity:.8}).addTo(this.m);
 this.m.on("popupclose",()=>{this.sel=null;this.ks.forEach(x=>x.setStyle({fillColor:"#111111"}))});
 s.forEach(p=>{const key=p.lat+","+p.lng+"|"+p.title,k=L.circleMarker([p.lat,p.lng],{radius:9,color:"#fff",weight:2,fillColor:"#111111",fillOpacity:1}).addTo(this.m);this.ks.push(k);
  k.on("click",e=>{L.DomEvent.stopPropagation(e);
   if(this.sel===key){this.reset();return}
   const c=mk&&mk(p);this.m.flyTo([p.lat,p.lng],14,{duration:.8});
   if(c)L.popup({offset:[0,-6],maxWidth:260,minWidth:210,autoPan:false,closeOnClick:false}).setLatLng([p.lat,p.lng]).setContent(c).openOn(this.m);
   this.ks.forEach(x=>x.setStyle({fillColor:"#111111"}));k.setStyle({fillColor:"#e0342b"});this.sel=key})});
 this.m.fitBounds(ll,{padding:[30,30],maxZoom:12});this.refresh()},
reset(){if(!this.m)return;this.m.closePopup();this.sel=null;this.ks.forEach(x=>x.setStyle({fillColor:"#111111"}));if(this.ll.length)this.m.flyToBounds(this.ll,{padding:[30,30],maxZoom:12,duration:.8})},
refresh(){setTimeout(()=>{try{this.m&&this.m.invalidateSize()}catch(e){}},80)}};
