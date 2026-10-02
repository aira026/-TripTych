const MapView={map:null,layer:null,
init(){this.map=L.map("map").setView([30,120],2);
 L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap",maxZoom:18}).addTo(this.map);
 this.layer=L.layerGroup().addTo(this.map)},
render(trips){this.layer.clearLayers();const all=[],col={past:"#111111",now:"#ff7a2b",future:"#e58fa0"};
 trips.forEach(t=>{if(t.locked||!t.spots)return;const c=col[t.status],pts=[...t.spots].sort((a,b)=>a.day-b.day).map(s=>[s.lat,s.lng]);
  if(pts.length>1)L.polyline(pts,{color:c,weight:3,dashArray:t.status==="future"?"6 6":null}).addTo(this.layer);
  t.spots.forEach(s=>{all.push([s.lat,s.lng]);L.circleMarker([s.lat,s.lng],{radius:7,color:"#fff",weight:2,fillColor:c,fillOpacity:1}).bindPopup(`<b>${s.name}</b><br>${t.title}・D${s.day}`).addTo(this.layer)})});
 if(all.length)this.map.fitBounds(all,{padding:[30,30],maxZoom:6})},
refresh(){setTimeout(()=>this.map.invalidateSize(),60)}};

const MiniMap={m:null,
render(id,pts){try{if(this.m){this.m.remove()}}catch(e){}this.m=null;const el=document.getElementById(id);if(!el)return;
 this.m=L.map(id,{scrollWheelZoom:false}).setView([30,120],2);
 L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap",maxZoom:18}).addTo(this.m);
 if(!pts.length)return;const s=[...pts].sort((a,b)=>a.day-b.day),ll=s.map(p=>[p.lat,p.lng]);
 if(ll.length>1)L.polyline(ll,{color:"#ff7a2b",weight:3,opacity:.8}).addTo(this.m);
 s.forEach((p,i)=>{const d=document.createElement("div");d.textContent=p.label;L.circleMarker([p.lat,p.lng],{radius:8,color:"#fff",weight:2,fillColor:"#111111",fillOpacity:1}).bindPopup(d).addTo(this.m)});
 this.m.fitBounds(ll,{padding:[30,30],maxZoom:12});this.refresh()},
refresh(){setTimeout(()=>{try{this.m&&this.m.invalidateSize()}catch(e){}},80)}};
