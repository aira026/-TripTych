const popEl=(rows)=>{const d=document.createElement("div");d.className="pp";rows.forEach(([c,t])=>{if(!t)return;const e=document.createElement("div");e.className=c;e.textContent=t;d.appendChild(e)});return d};
const MapView={map:null,layer:null,
init(){this.map=L.map("map").setView([30,120],2);
 L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap",maxZoom:18}).addTo(this.map);
 this.layer=L.layerGroup().addTo(this.map)},
render(trips){this.layer.clearLayers();const all=[],col={past:"#8a8178",now:"#FF7A00",future:"#8c9a8b"};
 trips.forEach(t=>{if(t.locked||!t.spots)return;const c=col[t.status],pts=[...t.spots].sort((a,b)=>a.day-b.day).map(s=>[s.lat,s.lng]);
  if(pts.length>1)L.polyline(pts,{color:c,weight:3.5,opacity:.85,dashArray:'6, 8'}).addTo(this.layer);
  t.spots.forEach(s=>{all.push([s.lat,s.lng]);L.circleMarker([s.lat,s.lng],{radius:7,color:"#FFFFFF",weight:2,fillColor:"#FF7A00",fillOpacity:.9}).bindPopup(popEl([["pt",s.name],["pd",t.title+(s.day?"・D"+s.day:"")]])).addTo(this.layer)})});
 this.pts=all;if(all.length)this.map.fitBounds(all,{padding:[30,30],maxZoom:6})},
refresh(){setTimeout(()=>{try{this.map.invalidateSize();if(this.pts&&this.pts.length)this.map.fitBounds(this.pts,{padding:[30,30],maxZoom:6})}catch(e){}},60)}};

const MiniMap={m:null,ks:[],sel:null,ll:[],tok:0,
icon(){return L.divIcon({className:"pdot-w",html:'<span class="pdot"><i></i><b></b></span>',iconSize:[26,26],iconAnchor:[13,13]})},
mark(k,key){this.ks.forEach(x=>x._icon&&x._icon.classList.toggle("sel",x===k));this.sel=key},
render(id,pts,mk){try{if(this.m)this.m.remove()}catch(e){}this.m=null;this.ks=[];this.sel=null;this.ll=[];const el=document.getElementById(id);if(!el)return;
 this.m=L.map(id,{scrollWheelZoom:false}).setView([30,120],2);
 L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap",maxZoom:18}).addTo(this.m);
 if(!pts.length)return;const s=[...pts].sort((a,b)=>a.day-b.day),ll=s.map(p=>[p.lat,p.lng]);this.ll=ll;
 if(ll.length>1)L.polyline(ll,{color:'#FF7A00',weight:3.5,opacity:.85,dashArray:'6, 8'}).addTo(this.m);
 this.m.on("popupclose",()=>{this.sel=null;this.ks.forEach(x=>x._icon&&x._icon.classList.remove("sel"))});
 s.forEach(p=>{const key=p.lat+","+p.lng+"|"+p.title,k=L.marker([p.lat,p.lng],{icon:this.icon(),title:p.title,keyboard:true}).addTo(this.m);this.ks.push(k);
  k.on("click",e=>{L.DomEvent.stopPropagation(e);if(this.sel===key){this.reset();return}
   const c=mk&&mk(p),tok=++this.tok,open=()=>{if(tok!==this.tok)return;if(c)L.popup({offset:[0,-4],maxWidth:260,minWidth:210,autoPan:true,autoPanPadding:[20,20],closeOnClick:false}).setLatLng([p.lat,p.lng]).setContent(c).openOn(this.m);this.mark(k,key)};
   if(this.m.getZoom()===14&&this.m.getCenter().distanceTo([p.lat,p.lng])<5)open();else{this.m.once("moveend",open);this.m.flyTo([p.lat,p.lng],14,{duration:.8})}})});
 this.m.fitBounds(ll,{padding:[30,30],maxZoom:12});this.refresh()},
reset(){if(!this.m)return;this.tok++;this.m.closePopup();this.sel=null;this.ks.forEach(x=>x._icon&&x._icon.classList.remove("sel"));if(this.ll.length)this.m.flyToBounds(this.ll,{padding:[30,30],maxZoom:12,duration:.8})},
refresh(){setTimeout(()=>{try{if(this.m){this.m.invalidateSize();if(!this.sel&&this.ll.length)this.m.fitBounds(this.ll,{padding:[30,30],maxZoom:12})}}catch(e){}},80)}};
