const MapView={map:null,layer:null,
init(){this.map=L.map("map").setView([38,120],3);
 L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap",maxZoom:18}).addTo(this.map);
 this.layer=L.layerGroup().addTo(this.map)},
render(trips){this.layer.clearLayers();const all=[];
 const col={past:"#2b5876",now:"#00b8e6",future:"#f09a2b"};
 trips.forEach(t=>{if(t.locked)return;const c=col[t.status],pts=[...t.spots].sort((a,b)=>a.day-b.day).map(s=>[s.lat,s.lng]);
  if(pts.length>1)L.polyline(pts,{color:c,weight:3,dashArray:t.status==="future"?"6 6":null}).addTo(this.layer);
  t.spots.forEach(s=>{all.push([s.lat,s.lng]);L.circleMarker([s.lat,s.lng],{radius:7,color:"#fff",weight:2,fillColor:c,fillOpacity:1}).bindPopup(`<b>${s.name}</b><br>${t.title}・D${s.day}`).addTo(this.layer)})});
 if(all.length)this.map.fitBounds(all,{padding:[30,30],maxZoom:6})},
refresh(){setTimeout(()=>this.map.invalidateSize(),60)}};
