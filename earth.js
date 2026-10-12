/* earth.js — TripTych 歡迎頁的寫實地球。原生 WebGL（無外部函式庫），失敗時回傳 null，由呼叫端退回 2D 版本。
   Earth.mount(canvas,{slot,dayURL,cloudURL,onReady,onFail}) → { jump(o), push(f,ms), reset(), destroy() } | null          */
(function(root){
"use strict";
var VS="attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
var FS=[
"#ifdef GL_FRAGMENT_PRECISION_HIGH","precision highp float;","#else","precision mediump float;","#endif",
"uniform vec2 uC;uniform float uR;uniform float uRot;uniform float uCloud;uniform float uTilt;",
"uniform vec3 uSun;uniform float uBoost;uniform float uAA;uniform vec2 uTexel;",
"uniform sampler2D uDay;uniform sampler2D uCld;",
"const float PI=3.14159265359;",
"float luma(vec3 c){return dot(c,vec3(.30,.59,.11));}",
"vec3 lin(vec3 c){return pow(c,vec3(2.2));}",
"vec3 srgb(vec3 c){return pow(max(c,vec3(0.)),vec3(.4545));}",
"float cloudAt(vec2 uv){float b=texture2D(uCld,vec2(uv.x+uCloud,uv.y)).r;float d=texture2D(uCld,vec2(uv.x*3.0+uCloud*1.6+.37,1.-abs(fract(uv.y*1.5)*2.-1.))).r;return smoothstep(.14,.80,clamp(b*(.55+.95*d),0.,1.))*.80;}",
"vec4 shade(vec2 q){",
" float r2=dot(q,q); if(r2>=1.) return vec4(0.);",
" float nz=sqrt(1.-r2); vec3 n=vec3(q,nz);",
" float ct=cos(uTilt),st=sin(uTilt);",
" vec3 p=vec3(n.x,n.y*ct+n.z*st,-n.y*st+n.z*ct);",
" float lat=asin(clamp(p.y,-1.,1.)); float lon0=atan(p.x,p.z);",
" vec2 uv=vec2((lon0+uRot)/(2.*PI)+.5,.5-lat/PI);",
" vec3 dayc=texture2D(uDay,uv).rgb;",
" float ocean=smoothstep(.0,.07,dayc.b-max(dayc.r,dayc.g));",
" float h=luma(dayc);",
" float hE=luma(texture2D(uDay,uv+vec2(uTexel.x,0.)).rgb);",
" float hN=luma(texture2D(uDay,uv-vec2(0.,uTexel.y)).rgb);",
" vec2 g=clamp(vec2(hE-h,hN-h),-.05,.05);",
" vec3 Ep=vec3(cos(lon0),0.,-sin(lon0));",
" vec3 Np=vec3(-sin(lat)*sin(lon0),cos(lat),-sin(lat)*cos(lon0));",
" vec3 Ev=vec3(Ep.x,Ep.y*ct-Ep.z*st,Ep.y*st+Ep.z*ct);",
" vec3 Nv=vec3(Np.x,Np.y*ct-Np.z*st,Np.y*st+Np.z*ct);",
" vec3 nn=normalize(n-(1.-ocean)*2.2*(g.x*Ev+g.y*Nv));",
" vec3 L=normalize(uSun); float geo=dot(n,L); float ndl=dot(nn,L);",
" float li=clamp(ndl,0.,1.)*smoothstep(-.14,.32,geo);",
" vec3 alb=lin(dayc); float c=cloudAt(uv);",
" float cs=cloudAt(uv+vec2(-.006,.004))*.9;",
" vec3 sunC=vec3(1.08,1.02,.93)*1.40; vec3 amb=vec3(.042,.058,.105);",
" vec3 col=alb*(amb+sunC*li)*(1.-.30*cs*li);",
" vec3 Hh=normalize(L+vec3(0.,0.,1.));",
" float sp=pow(max(dot(n,Hh),0.),140.)*.16+pow(max(dot(n,Hh),0.),22.)*.010;",
" col+=sunC*sp*ocean*li*(1.-c);",
" vec3 cc=vec3(.95,.97,1.)*(amb*1.6+sunC*.92*li);",
" col=mix(col,cc,c);",
" float f=pow(1.-nz,3.4); float sunl=smoothstep(-.15,.55,geo);",
" col+=vec3(.26,.44,.80)*f*(.05+.30*sunl)*(1.+uBoost*1.5);",
" col=col/(1.+.12*col);",
" return vec4(srgb(col),1.);",
"}",
"void main(){",
" vec2 f=gl_FragCoord.xy; vec4 s;",
" if(uAA>.5){ s=(shade((f+vec2(-.25,-.25)-uC)/uR)+shade((f+vec2(.25,-.25)-uC)/uR)+shade((f+vec2(-.25,.25)-uC)/uR)+shade((f+vec2(.25,.25)-uC)/uR))*.25; }",
" else { s=shade((f-uC)/uR); }",
" vec2 q=(f-uC)/uR; float d=length(q); float o=max(d-1.,0.);",
" vec3 L=normalize(uSun);",
" float side=clamp(dot(q/max(d,1e-3),normalize(L.xy))*.5+.5,0.,1.);",
" float ha=exp(-o*30.)*(.07+.11*uBoost)*(.35+.65*side);",
" vec4 halo=vec4(vec3(.58,.70,.88)*ha,ha);",
" gl_FragColor=s+halo*(1.-s.a);",
"}"].join("\n");

function sh(gl,type,src){var s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);
 if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){var m=gl.getShaderInfoLog(s);gl.deleteShader(s);throw new Error("shader: "+m)}return s}

function createRenderer(gl){
 var vs=sh(gl,gl.VERTEX_SHADER,VS),fs=sh(gl,gl.FRAGMENT_SHADER,FS),pr=gl.createProgram();
 gl.attachShader(pr,vs);gl.attachShader(pr,fs);gl.linkProgram(pr);
 if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw new Error("link: "+gl.getProgramInfoLog(pr));
 gl.useProgram(pr);
 var buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
 gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
 var a=gl.getAttribLocation(pr,"p");gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
 var U={};["uC","uR","uRot","uCloud","uTilt","uSun","uBoost","uAA","uTexel","uDay","uCld"].forEach(function(n){U[n]=gl.getUniformLocation(pr,n)});
 var tD=gl.createTexture(),tC=gl.createTexture(),dw=2048,dh=1024;
 function up(tex,src,unit){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,tex);
  if(src.data)gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,src.width,src.height,0,gl.RGBA,gl.UNSIGNED_BYTE,src.data);
  else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,src);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  return [src.width,src.height]}
 var sun=[-.55,.42,.72],sl=Math.hypot(sun[0],sun[1],sun[2]);sun=sun.map(function(v){return v/sl});
 return{
  setTextures:function(day,cld){var s=up(tD,day,0);dw=s[0];dh=s[1];up(tC,cld,1)},
  draw:function(o){gl.useProgram(pr);gl.viewport(0,0,o.W,o.H);gl.disable(gl.SCISSOR_TEST);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
   var pad=o.R*1.4,x0=Math.max(0,Math.floor(o.cx-pad)),y0=Math.max(0,Math.floor(o.cy-pad)),x1=Math.min(o.W,Math.ceil(o.cx+pad)),y1=Math.min(o.H,Math.ceil(o.cy+pad));
   if(x1<=x0||y1<=y0)return;gl.enable(gl.SCISSOR_TEST);gl.scissor(x0,y0,x1-x0,y1-y0);
   gl.uniform2f(U.uC,o.cx,o.cy);gl.uniform1f(U.uR,o.R);gl.uniform1f(U.uRot,o.rot);gl.uniform1f(U.uCloud,o.cloud||0);gl.uniform1f(U.uTilt,o.tilt==null?.32:o.tilt);
   gl.uniform3f(U.uSun,sun[0],sun[1],sun[2]);gl.uniform1f(U.uBoost,o.boost||0);gl.uniform1f(U.uAA,o.aa?1:0);gl.uniform2f(U.uTexel,1/dw,1/dh);
   gl.uniform1i(U.uDay,0);gl.uniform1i(U.uCld,1);gl.drawArrays(gl.TRIANGLE_STRIP,0,4)},
  dispose:function(){try{gl.deleteTexture(tD);gl.deleteTexture(tC);gl.deleteBuffer(buf);gl.deleteProgram(pr);gl.deleteShader(vs);gl.deleteShader(fs)}catch(e){}}}
}

function loadImg(u){return new Promise(function(res,rej){var im=new Image();im.onload=function(){res(im)};im.onerror=function(){rej(new Error("img "+u))};im.src=u})}

function mount(canvas,opts){
 opts=opts||{};var gl=null;
 try{gl=canvas.getContext("webgl",{alpha:true,premultipliedAlpha:true,antialias:false,powerPreference:"low-power"})}catch(e){}
 if(!gl)return null;
 var rd;try{rd=createRenderer(gl)}catch(e){console.warn("[earth] 無法建立 WebGL 著色器，改用 2D 版本",e);return null}
 var S={W:2,H:2,cx0:0,cy0:0,R0:40,rot:2.055,boost:0,aa:1,zoom:1,ox:0,oy:0,t:0},alive=true,ready=false,jumping=false,raf=0,last=0,tween=null;
 var reduced=!!(root.matchMedia&&root.matchMedia("(prefers-reduced-motion: reduce)").matches);
 function layout(){var r=canvas.getBoundingClientRect(),dpr=Math.min(root.devicePixelRatio||1,2),k=Math.min(1,Math.sqrt(1.4e6/Math.max(1,r.width*r.height*dpr*dpr)));dpr*=k;
  S.W=canvas.width=Math.max(2,Math.round(r.width*dpr));S.H=canvas.height=Math.max(2,Math.round(r.height*dpr));
  var sl=opts.slot?opts.slot.getBoundingClientRect():r;S.cx0=(sl.left-r.left+sl.width/2)*dpr;S.cy0=(sl.top-r.top+sl.height/2)*dpr;S.R0=Math.max(30,sl.width*.5*.88*dpr)}
 function draw(){if(!ready||!alive)return;rd.draw({W:S.W,H:S.H,cx:S.cx0+S.ox,cy:S.H-(S.cy0+S.oy),R:S.R0*S.zoom,rot:S.rot,cloud:-S.t*.0025,boost:S.boost,aa:S.aa})}
 function loop(now){if(!alive)return;raf=root.requestAnimationFrame(loop);if(jumping||document.hidden)return;if(now-last<33)return;
  var dt=Math.min(.1,(now-last)/1000||.033);last=now;if(!reduced){S.rot-=dt*.055;S.t+=dt}
  if(tween){var k=Math.min(1,(now-tween.t0)/tween.ms),e=1-Math.pow(1-k,3);S.zoom=tween.a+(tween.b-tween.a)*e;if(k>=1)tween=null}
  draw()}
 function onResize(){if(!jumping){layout();draw()}}
 function onLost(e){e.preventDefault();alive=false;if(opts.onFail)opts.onFail()}
 canvas.addEventListener("webglcontextlost",onLost);root.addEventListener("resize",onResize);
 layout();
 Promise.all([loadImg(opts.dayURL||"earth.jpg"),loadImg(opts.cloudURL||"earth-clouds.jpg")]).then(function(im){
  if(!alive)return;try{rd.setTextures(im[0],im[1])}catch(e){throw e}ready=true;draw();if(opts.onReady)opts.onReady()
 }).catch(function(e){console.warn("[earth] 貼圖載入失敗，改用 2D 版本",e);if(alive&&opts.onFail)opts.onFail()});
 raf=root.requestAnimationFrame(loop);
 return{
  push:function(f,ms){tween={a:S.zoom,b:f,ms:ms||500,t0:performance.now()}},
  reset:function(){tween={a:S.zoom,b:1,ms:500,t0:performance.now()}},
  jump:function(o){o=o||{};return new Promise(function(res){
   if(!alive||!ready||jumping)return res();jumping=true;tween=null;layout();
   var dur=o.dur||1700,t0=0,pv=0,covered=false,cxT=S.W/2,cyT=S.H*.5,far=Math.hypot(Math.max(S.cx0,S.W-S.cx0),Math.max(S.cy0,S.H-S.cy0)),Zf=Math.max(6,far*3.2/S.R0),z0=S.zoom;
   function step(now){if(!alive){jumping=false;return res()}if(!t0){t0=now;pv=now}var t=Math.min(1,(now-t0)/dur),dt=Math.max(0,(now-pv)/1000);pv=now;
    S.zoom=z0*Math.pow(Zf/z0,Math.pow(t,2.3));var m=1-Math.pow(1-Math.min(1,t*1.15),3);S.ox=(cxT-S.cx0)*m;S.oy=(cyT-S.cy0)*m;
    S.rot-=(.055+2.6*t*t)*dt;S.boost=Math.sin(Math.PI*Math.min(1,Math.max(0,(t-.1)/.75)));S.aa=S.zoom>2?0:1;
    draw();if(o.onFrame)o.onFrame(t);if(!covered&&t>=(o.coverAt||.9)){covered=true;if(o.onCover)o.onCover()}
    if(t<1)root.requestAnimationFrame(step);else{jumping=false;res()}}
   root.requestAnimationFrame(step)})},
  destroy:function(){alive=false;root.cancelAnimationFrame(raf);canvas.removeEventListener("webglcontextlost",onLost);root.removeEventListener("resize",onResize);
   rd.dispose();try{var x=gl.getExtension("WEBGL_lose_context");if(x)x.loseContext()}catch(e){}}}
}
var Earth={mount:mount,_createRenderer:createRenderer};
root.Earth=Earth;if(typeof module!=="undefined"&&module.exports)module.exports=Earth;
})(typeof window!=="undefined"?window:globalThis);
