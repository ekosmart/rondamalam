/* Sekolah Sihir Kala Wengi - interior (Three.js r128, tanpa file eksternal)
 *
 * Pakai di game Anda:
 *   const school = buildSchool(scene);          // menambah semua ruangan + lampu ke scene
 *   school.COL      // kotak tabrakan [x0,z0,x1,z1] (bidang XZ), radius pemain +-0.38
 *   school.INT      // titik interaksi {p:Vector3, r, type:'item'|'info'|'well', label, text, grp?}
 *   school.ITEMS    // {wand, book, potion, well}: grup 3D untuk disembunyikan saat diambil
 *   school.ROOMS    // persegi ruangan + nama (untuk HUD/peta)
 *   school.spawn    // {x,z,yaw} titik masuk (Serambi/Aula)
 *   school.update(t, dt, playerX, playerZ)      // panggil tiap frame (animasi lilin, akar, burung hantu)
 * Letakkan scene.fog = new THREE.FogExp2(0x0e0a16, .02) agar suasananya sama.
 * Skala: 1 unit = 1 meter. Mata pemain di y = 1.68.
 */
/*==BUILDER START== (bagian ini mandiri: salin ke game Anda, panggil buildSchool(scene))*/
function buildSchool(scene){
const T=THREE,PI=Math.PI;
let seed=11;const rnd=()=>(seed=seed*16807%2147483647)/2147483647,rr=(a,b)=>a+rnd()*(b-a),pick=a=>a[(rnd()*a.length)|0];
const COL=[],INT=[],ANIM=[],ITEMS={};

/* ---------- tekstur kanvas (gaya sama dengan kit stasiun) ---------- */
function ctex(n,m,fn){const c=document.createElement('canvas');c.width=n;c.height=m||n;fn(c.getContext('2d'),n,m||n);const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.NearestFilter;t.anisotropy=4;return t}
const stoneT=ctex(256,256,(g,n)=>{g.fillStyle='#211e2a';g.fillRect(0,0,n,n);
 for(let r=0;r<4;r++)for(let i=-1;i<3;i++){const v=rnd(),x=i*128+(r%2?64:0);g.fillStyle=`hsl(${252+v*22},${8+v*10}%,${33+v*14}%)`;g.fillRect(x+3,r*64+3,122,58)}
 for(let k=0;k<160;k++){g.fillStyle=`rgba(${rnd()<.5?'12,10,18':'150,146,170'},${.06+rnd()*.12})`;g.fillRect(rnd()*n,rnd()*n,1+rnd()*6,1+rnd()*4)}
 for(let k=0;k<20;k++){g.fillStyle='rgba(40,80,64,.16)';g.beginPath();g.arc(rnd()*n,rnd()*n,4+rnd()*14,0,7);g.fill()}});
const floorT=ctex(256,256,(g,n)=>{for(let i=0;i<4;i++)for(let j=0;j<4;j++){g.fillStyle=(i+j)%2?'#2e2b3a':'#232030';g.fillRect(i*64,j*64,64,64);
  g.fillStyle=`rgba(0,0,0,${.1+rnd()*.15})`;g.fillRect(i*64,j*64,64,64)}
 g.strokeStyle='#120f19';g.lineWidth=3;for(let i=0;i<=4;i++){g.beginPath();g.moveTo(i*64,0);g.lineTo(i*64,n);g.stroke();g.beginPath();g.moveTo(0,i*64);g.lineTo(n,i*64);g.stroke()}
 for(let k=0;k<220;k++){g.fillStyle=`rgba(${rnd()<.5?'8,6,12':'140,136,160'},${.05+rnd()*.1})`;g.fillRect(rnd()*n,rnd()*n,1+rnd()*5,1+rnd()*3)}
 g.strokeStyle='rgba(8,6,12,.7)';g.lineWidth=1.5;for(let k=0;k<5;k++){let x=rnd()*n,y=rnd()*n;g.beginPath();g.moveTo(x,y);for(let s=0;s<5;s++){x+=rnd()*26-13;y+=rnd()*26-13;g.lineTo(x,y)}g.stroke()}});
const woodT=ctex(128,128,(g,n)=>{g.fillStyle='#4a3524';g.fillRect(0,0,n,n);for(let i=0;i<6;i++){g.fillStyle=`rgba(${rnd()<.5?'20,12,6':'120,90,60'},${.18+rnd()*.2})`;g.fillRect(i*21,0,2,n)}
 for(let i=0;i<60;i++){g.fillStyle=`rgba(${rnd()<.5?'20,12,6':'130,100,70'},${.1+rnd()*.2})`;g.fillRect(rnd()*n,rnd()*n,1+rnd()*2,6+rnd()*30)}});
const carpetT=ctex(128,128,(g,n)=>{g.fillStyle='#6d0e20';g.fillRect(0,0,n,n);g.fillStyle='#8c1a2c';for(let k=0;k<200;k++)g.fillRect(rnd()*n,rnd()*n,2,2);
 g.fillStyle='#b08a3a';g.fillRect(6,0,4,n);g.fillRect(n-10,0,4,n);g.fillRect(14,0,2,n);g.fillRect(n-16,0,2,n);
 g.strokeStyle='#b08a3a';g.lineWidth=3;g.beginPath();g.moveTo(n/2,22);g.lineTo(n/2+24,n/2);g.lineTo(n/2,n-22);g.lineTo(n/2-24,n/2);g.closePath();g.stroke();g.fillStyle='#b45cff';g.fillRect(n/2-4,n/2-4,8,8)});
const grassT=ctex(128,128,(g,n)=>{g.fillStyle='#17281f';g.fillRect(0,0,n,n);for(let k=0;k<500;k++){g.fillStyle=`rgba(${20+rnd()*30|0},${50+rnd()*50|0},${40+rnd()*20|0},${.2+rnd()*.4})`;g.fillRect(rnd()*n,rnd()*n,1+rnd()*3,2+rnd()*5)}});
const glassT=ctex(128,256,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#2a2070');gr.addColorStop(.6,'#4a3a9a');gr.addColorStop(1,'#7a4aa8');g.fillStyle=gr;g.fillRect(0,0,w,h);
 for(let y=0;y<h;y+=32)for(let x=0;x<w;x+=32){g.fillStyle=pick(['rgba(255,190,90,.35)','rgba(120,255,200,.22)','rgba(190,110,255,.3)','rgba(20,10,60,.3)']);g.fillRect(x+2,y+2,28,28)}
 g.strokeStyle='#0d0816';g.lineWidth=3;for(let x=0;x<=w;x+=32){g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke()}for(let y=0;y<=h;y+=32){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke()}
 g.fillStyle='rgba(255,240,200,.85)';g.beginPath();g.arc(w/2,52,17,0,7);g.fill();g.fillStyle='#4a3a9a';g.beginPath();g.arc(w/2+8,48,15,0,7);g.fill()});
glassT.magFilter=T.LinearFilter;
const glowT=ctex(64,64,(g)=>{const r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.35,'rgba(255,255,255,.35)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,64,64)});
glowT.magFilter=T.LinearFilter;

const mk=(c,o)=>new T.MeshPhongMaterial(Object.assign({color:c,flatShading:true,specular:0x0c0c0c,shininess:6},o||{}));
const bs=(c,o)=>new T.MeshBasicMaterial(Object.assign({color:c},o||{}));
const M={stone:mk(0xffffff,{map:stoneT}),floor:mk(0xffffff,{map:floorT}),wood:mk(0xffffff,{map:woodT}),carpet:mk(0xffffff,{map:carpetT}),grass:mk(0xffffff,{map:grassT}),
 stoneD:mk(0x3b3947),woodD:mk(0x2a1c14),iron:mk(0x2b2420,{specular:0x222222,shininess:12}),brass:mk(0xb08a3a,{specular:0x6b5522,shininess:30}),steel:mk(0x6b6f78,{specular:0x666666,shininess:30}),
 crimson:mk(0x8c0f22),plum:mk(0x3a1d5c),roofP:mk(0x2b1d4a),cream:mk(0xe8dcc0),dark:mk(0x101010),cloth:mk(0x4a5a6a),herb:mk(0x2a5a3a),
 leaf1:mk(0x2a7a62),leaf2:mk(0x3a9a68),bark:mk(0x6a5240,{emissive:0x1c1230}),cauldron:mk(0x17161c,{specular:0x333333,shininess:20}),
 gP:bs(0xb45cff),gA:bs(0xffb347),gG:bs(0x39ff6a),gGd:bs(0x1fd470),gO:bs(0xff7a2a),glass:bs(0xffffff,{map:glassT})};
M.stone.userData.tile=2;M.floor.userData.tile=4;M.wood.userData.tile=1.2;M.carpet.userData.tile=3;M.grass.userData.tile=4;

/* ---------- penolong geometri ---------- */
const flat=g=>{const n=g.index?g.toNonIndexed():g;n.computeVertexNormals();return n};
function scaleBoxUV(g,w,h,d,tile){const uv=g.attributes.uv,D=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];for(let f=0;f<6;f++)for(let v=0;v<4;v++){const i=f*4+v;uv.setXY(i,uv.getX(i)*D[f][0]/tile,uv.getY(i)*D[f][1]/tile)}}
function B(w,h,d,m,x,y,z,par,rx,ry,rz){const g=new T.BoxGeometry(w,h,d);if(m.map&&m.userData.tile)scaleBoxUV(g,w,h,d,m.userData.tile);const o=new T.Mesh(g,m);o.position.set(x,y,z);if(rx||ry||rz)o.rotation.set(rx||0,ry||0,rz||0);par.add(o);return o}
function Cy(r1,r2,h,s,m,x,y,z,par,rx,ry,rz){const o=new T.Mesh(flat(new T.CylinderGeometry(r1,r2,h,s)),m);o.position.set(x,y,z);if(rx||ry||rz)o.rotation.set(rx||0,ry||0,rz||0);par.add(o);return o}
function Ic(r,d,m,x,y,z,par,sx,sy,sz){const o=new T.Mesh(flat(new T.IcosahedronGeometry(r,d)),m);o.position.set(x,y,z);o.scale.set(sx||1,sy||1,sz||1);par.add(o);return o}
function Py(w,d,h,m,x,y,z,par){const g=new T.CylinderGeometry(.7071,0,1,4);g.rotateY(PI/4);g.scale(w,h,d);const o=new T.Mesh(flat(g),m);o.position.set(x,y,z);par.add(o);return o}
const grp=(par,x,y,z,ry)=>{const g=new T.Group();g.position.set(x||0,y||0,z||0);g.rotation.y=ry||0;(par||scene).add(g);return g};
const dynG=(par,x,y,z)=>{const g=grp(par,x,y,z);g.userData.dyn=true;return g};
function glow(c,s,x,y,z,par,op){const sp=new T.Sprite(new T.SpriteMaterial({map:glowT,color:c,blending:T.AdditiveBlending,transparent:true,depthWrite:false,opacity:op||.8,fog:false}));sp.scale.set(s,s,1);sp.position.set(x,y,z);par.add(sp);return sp}
function L(c,i,d,x,y,z){const l=new T.PointLight(c,i,d,2);l.position.set(x,y,z);scene.add(l);return l}
const col=(x0,z0,x1,z1)=>COL.push([Math.min(x0,x1),Math.min(z0,z1),Math.max(x0,x1),Math.max(z0,z1)]);
const colC=(cx,cz,w,d)=>col(cx-w/2,cz-d/2,cx+w/2,cz+d/2);
const inter=(x,y,z,o)=>INT.push(Object.assign({p:new T.Vector3(x,y,z),r:3.4},o));
function floor(x0,z0,x1,z1,m,par){B(x1-x0,.1,z1-z0,m,(x0+x1)/2,-.05,(z0+z1)/2,par)}
function ceil(x0,z0,x1,z1,h,par,m){B(x1-x0,.3,z1-z0,m||M.stoneD,(x0+x1)/2,h+.15,(z0+z1)/2,par)}
function wall(axis,c,a0,a1,h,gaps,par,t){t=t||.6;gaps=(gaps||[]).slice().sort((p,q)=>p[0]-q[0]);const segs=[];let cur=a0;
 gaps.forEach(g=>{if(g[0]>cur)segs.push([cur,g[0],0,h]);cur=g[1]});if(cur<a1)segs.push([cur,a1,0,h]);
 gaps.forEach(g=>{const dh=g[2]||4.2;if(h>dh)segs.push([g[0],g[1],dh,h-dh,1])});
 segs.forEach(s=>{const len=s[1]-s[0],mid=(s[0]+s[1])/2,hh=s[3],y=s[2]+hh/2;
  if(axis==='z'){B(len,hh,t,M.stone,mid,y,c,par);if(!s[4])col(s[0],c-t/2,s[1],c+t/2)}else{B(t,hh,len,M.stone,c,y,mid,par);if(!s[4])col(c-t/2,s[0],c+t/2,s[1])}});
 gaps.forEach(g=>{const dh=g[2]||4.2,w=g[1]-g[0],mid=(g[0]+g[1])/2;
  [g[0]-.2,g[1]+.2].forEach(p=>axis==='z'?B(.4,dh,t+.3,M.stoneD,p,dh/2,c,par):B(t+.3,dh,.4,M.stoneD,c,dh/2,p,par));
  if(axis==='z'){B(w+.8,.4,t+.3,M.stoneD,mid,dh+.2,c,par);Cy(.22,.22,t+.4,6,M.brass,mid,dh+.75,c,par,PI/2);Ic(.12,0,M.gP,mid,dh+.75,c-(t/2+.22),par);Ic(.12,0,M.gP,mid,dh+.75,c+(t/2+.22),par)}
  else{B(t+.3,.4,w+.8,M.stoneD,c,dh+.2,mid,par);Cy(.22,.22,t+.4,6,M.brass,c,dh+.75,mid,par,0,0,PI/2);Ic(.12,0,M.gP,c-(t/2+.22),dh+.75,mid,par);Ic(.12,0,M.gP,c+(t/2+.22),dh+.75,mid,par)}});}
function isDyn(o){while(o){if(o.userData&&o.userData.dyn)return true;o=o.parent}return false}
function bake(root){root.updateMatrixWorld(true);const bk=new Map(),kill=[];
 root.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||isDyn(o))return;kill.push(o);let g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);
  let b=bk.get(o.material);if(!b){b={p:[],n:[],u:[]};bk.set(o.material,b)}const pa=g.attributes.position.array;b.p.push(pa);b.n.push(g.attributes.normal.array);b.u.push(g.attributes.uv?g.attributes.uv.array:new Float32Array(pa.length/3*2))});
 kill.forEach(o=>o.parent.remove(o));
 bk.forEach((b,m)=>{const cat=a=>{let n=0;a.forEach(x=>n+=x.length);const r=new Float32Array(n);let q=0;a.forEach(x=>{r.set(x,q);q+=x.length});return r};
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(cat(b.p),3));g.setAttribute('normal',new T.BufferAttribute(cat(b.n),3));g.setAttribute('uv',new T.BufferAttribute(cat(b.u),2));g.computeBoundingSphere();root.add(new T.Mesh(g,m))})}
function inst(geo,mat,arr,par){const g2=geo.clone(),bb=new T.Box3();arr.forEach(a=>bb.expandByPoint(new T.Vector3(a.x,a.y,a.z)));const sph=new T.Sphere();bb.getBoundingSphere(sph);sph.radius+=1.6;g2.boundingSphere=sph;
 const m=new T.InstancedMesh(g2,mat,arr.length),d=new T.Object3D(),c=new T.Color();
 arr.forEach((a,i)=>{d.position.set(a.x,a.y,a.z);d.rotation.set(a.rx||0,a.ry||0,a.rz||0);d.scale.set(a.sx||1,a.sy||1,a.sz||1);d.updateMatrix();m.setMatrixAt(i,d.matrix);if(a.c!==undefined){c.setHex(a.c);m.setColorAt(i,c)}});
 m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;m.frustumCulled=true;par.add(m);return m}
const UB=new T.BoxGeometry(1,1,1),UC=flat(new T.CylinderGeometry(.5,.5,1,8)),UC6=flat(new T.CylinderGeometry(.5,.5,1,6)),UCone=flat(new T.CylinderGeometry(0,.5,1,5));
const UBook=(()=>{const g=new T.BoxGeometry(1,1,1),ix=g.index.array,k=[];for(let f=0;f<6;f++){if(f!==0&&f!==2&&f!==4)continue;for(let i=0;i<6;i++)k.push(ix[f*6+i])}g.setIndex(k);return g})();
const instM=mk(0xffffff,{});

/* ---------- komponen dipakai ulang ---------- */
const BOOKC=[0x6d0e20,0x3a1d5c,0x4a3524,0x1d4a3e,0x23304f,0x8a6a2a,0x5a2a4a,0x2f2f38];
function shelf(par,x,z,len,ry,rows,y0,kind,books,cols){ // unit rak, depan = +z lokal
 const g=grp(par,x,y0,z,ry),h=rows*.55+.2,cs=Math.cos(ry),sn=Math.sin(ry);
 B(len,h,.08,M.woodD,0,h/2,-.26,g);[-1,1].forEach(s=>B(.1,h,.6,M.woodD,s*len/2,h/2,0,g));
 for(let i=0;i<=rows;i++)B(len,.06,.56,M.woodD,0,.05+i*.55,0,g);
 for(let i=0;i<rows;i++){let lx=-len/2+.15;while(lx<len/2-.15){
   if(kind==='book'){const w=rr(.05,.13),hh=rr(.26,.46);if(rnd()<.05){lx+=rr(.1,.3);continue}const lz=rr(-.05,.06);
    books.push({x:x+(lx+w/2)*cs+lz*sn,y:y0+.08+i*.55+hh/2,z:z-(lx+w/2)*sn+lz*cs,sx:w,sy:hh,sz:.34,ry:ry,rz:rr(-.04,.04),c:pick(BOOKC)});lx+=w+.004}
   else{const w=rr(.12,.2),hh=rr(.2,.34);if(rnd()<.18){lx+=.2;continue}const lz=rr(-.05,.05);
    cols.push({x:x+(lx+w/2)*cs+lz*sn,y:y0+.08+i*.55+hh/2,z:z-(lx+w/2)*sn+lz*cs,sx:w,sy:hh,sz:w,c:pick([0x2fa86a,0x7a3fd0,0xd08a2a,0x2a7ad0,0xb02a4a,0x6ad0b0])});lx+=w+.06}}}
 return g}
function tableSet(par,x,z0,z1,w,h){const L=z1-z0,cz=(z0+z1)/2;B(w,.12,L,M.wood,x,h,cz,par);
 for(let z=z0+1;z<z1;z+=4){B(.1,h,.9,M.woodD,x-w/2+.2,h/2,z,par);B(.1,h,.9,M.woodD,x+w/2-.2,h/2,z,par)}
 return cz}
function bench(par,x,z0,z1){const L=z1-z0,cz=(z0+z1)/2;B(.5,.08,L,M.wood,x,.5,cz,par);for(let z=z0+1;z<z1;z+=4){B(.4,.5,.1,M.woodD,x,.25,z,par)}}
function lancet(par,x,y,z,ry,floorX,floorZ){const s=new T.Shape();s.moveTo(-.8,0);s.lineTo(.8,0);s.lineTo(.8,3.6);s.quadraticCurveTo(.8,5,0,5.8);s.quadraticCurveTo(-.8,5,-.8,3.6);s.closePath();
 const g=new T.ShapeGeometry(s,5),uv=g.attributes.uv,p=g.attributes.position;for(let i=0;i<uv.count;i++)uv.setXY(i,(p.getX(i)+.8)/1.6,p.getY(i)/5.8);
 const o=new T.Mesh(g,M.glass);o.position.set(x,y,z);o.rotation.y=ry;par.add(o);
 const nx=Math.sin(ry),nz=Math.cos(ry);const f=(w,h,d,lx,ly,m)=>B(w,h,d,m||M.iron,x+nx*.03+nz*lx,y+ly,z+nz*.03-nx*lx,par,0,ry,0);
 f(.1,5.8,.1,-.85,2.9);f(.1,5.8,.1,.85,2.9);f(1.7,.1,.1,0,.02);f(1.7,.08,.08,0,2.2);f(1.7,.08,.08,0,3.6);f(.06,3.6,.06,0,1.8);
 const tip=new T.Vector3(x,y+3,z),end=new T.Vector3(floorX,0,floorZ),dir=tip.clone().sub(end),len=dir.length();
 const sh=new T.Mesh(new T.CylinderGeometry(1.0,2.0,len,4,1,true),new T.MeshBasicMaterial({color:0x8f86ff,transparent:true,opacity:.055,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide,fog:false}));
 sh.position.copy(tip.clone().add(end).multiplyScalar(.5));sh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());sh.userData.dyn=true;par.add(sh)}
function banner(par,x,y,z,ry,m){const g=grp(par,x,y,z,ry);B(1.1,3.6,.06,m||M.crimson,0,0,0,g);B(1.3,.12,.12,M.brass,0,1.86,0,g);Cy(.3,.3,.04,6,M.brass,0,.5,.05,g,PI/2);Ic(.12,0,M.gP,0,.5,.09,g);
 [-.4,0,.4].forEach(i=>Cy(.12,0,.5,3,m||M.crimson,i,-1.95,0,g,PI))}
function paint(i){return ctex(128,160,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);const hs=[250,210,330,20,150][i%5];gr.addColorStop(0,`hsl(${hs},30%,14%)`);gr.addColorStop(1,`hsl(${hs},35%,6%)`);g.fillStyle=gr;g.fillRect(0,0,w,h);
 g.fillStyle=pick(['#2a1c40','#3a2a24','#1d3a38','#40202a']);g.beginPath();g.moveTo(8,h);g.lineTo(26,100);g.lineTo(w-26,100);g.lineTo(w-8,h);g.fill();
 g.fillStyle='#d9b79a';g.beginPath();g.ellipse(w/2,76,20,26,0,0,7);g.fill();const t=i%4;g.fillStyle='#1a1226';
 if(t===0){g.beginPath();g.moveTo(w/2-44,64);g.lineTo(w/2+44,64);g.lineTo(w/2+16,56);g.lineTo(w/2+6,10);g.lineTo(w/2-16,56);g.fill()}
 else if(t===1){g.beginPath();g.ellipse(w/2,54,24,12,0,0,7);g.fill();g.fillStyle='#f2efe0';for(let k=0;k<5;k++){g.beginPath();g.arc(w/2-20+k*10,50,3,0,7);g.fill()}}
 else if(t===2){g.fillRect(w/2-24,46,48,16);g.fillStyle='#b08a3a';g.fillRect(w/2-24,58,48,3)}
 else{g.beginPath();g.moveTo(w/2-22,60);g.lineTo(w/2+22,60);g.lineTo(w/2+8,6);g.lineTo(w/2-8,6);g.fill();g.fillStyle='#b45cff';g.fillRect(w/2-3,26,6,6)}
 g.fillStyle='#b45cff';g.fillRect(w/2-11,74,5,4);g.fillRect(w/2+6,74,5,4);g.fillStyle='#2a1c14';g.fillRect(w/2-8,92,16,3)})}
const FR=mk(0x4a3322);
function portrait(par,x,y,z,ry,i,title,text){const g=grp(par,x,y,z,ry);B(1.2,1.5,.1,FR,0,0,0,g);B(1.3,1.6,.04,M.brass,0,0,-.04,g);
 const p=new T.Mesh(new T.PlaneGeometry(.98,1.26),bs(0xc8c0d8,{map:paint(i)}));p.position.z=.06;g.add(p);
 const w=new T.Vector3(x,y,z);inter(x+Math.sin(ry)*.5,y,z+Math.cos(ry)*.5,{type:'info',label:title,text,r:3.6})}
function armor(par,x,z,ry,text){const g=grp(par,x,0,z,ry);B(1,.3,1,M.stoneD,0,.15,0,g);
 [-.14,.14].forEach(s=>B(.2,.9,.22,M.steel,s,.75,0,g));B(.5,.25,.35,M.steel,0,1.3,0,g);B(.62,.7,.4,M.steel,0,1.78,0,g);
 [-1,1].forEach(s=>{B(.26,.2,.32,M.steel,s*.44,2.05,0,g);B(.16,.6,.16,M.steel,s*.5,1.65,.05,g,-.3)});
 B(.34,.38,.34,M.steel,0,2.37,0,g);B(.24,.05,.02,M.gP,0,2.38,.18,g);Cy(.12,0,.5,4,M.crimson,0,2.8,0,g);
 Cy(.025,.025,2.4,5,M.iron,.62,1.3,.15,g);B(.26,.4,.04,M.steel,.62,2.6,.15,g);
 colC(x,z,.9,.9);inter(x,1.6,z,{type:'info',label:'Arca Penjaga',text,r:3.6});
 const eye=new T.Mesh(new T.BoxGeometry(.24,.05,.02),M.gP);eye.userData.dyn=true;eye.position.set(0,2.38,.19);g.add(eye)}
function pickup(par,id,label,text,x,y,z,color,build){const g=dynG(par,x,y,z);build(g);glow(color,1.5,0,.1,0,g);ITEMS[id]={grp:g};
 inter(x,y+.2,z,{type:'item',id,label,text,grp:g,r:3.4});ANIM.push(t=>{if(!g.visible)return;g.position.y=y+Math.sin(t*1.6+x)*.07;g.rotation.y=t*.9})}
function chandelier(par,x,y,z,r){const g=dynG(par,x,y,z);Cy(r,r,.1,12,M.brass,0,0,0,g);Cy(r*.98,r*.98,.04,12,M.iron,0,-.05,0,g);
 for(let i=0;i<3;i++){const a=i*2.094;Cy(.02,.02,2,4,M.iron,Math.cos(a)*r*.7,1,Math.sin(a)*r*.7,g)}
 for(let i=0;i<8;i++){const a=i*PI/4;Cy(.04,.04,.28,6,M.cream,Math.cos(a)*r,.2,Math.sin(a)*r,g);Cy(.03,0,.12,5,M.gA,Math.cos(a)*r,.4,Math.sin(a)*r,g)}
 glow(0xffb347,2.4,0,.4,0,g,.35)}
const ROOMS=[{n:'Aula Utama',s:'Meja panjang, lilin melayang, dan kursi kepala sekolah',x0:-12,x1:12,z0:-24,z1:16},{n:'Serambi',s:'Pintu depan terkunci sejak tengah malam',x0:-3,x1:3,z0:16,z1:19.7},
 {n:'Lorong Barat',s:'Wajah-wajah di bingkai mengikuti langkahmu',x0:-26,x1:-12,z0:-2.5,z1:2.5},{n:'Perpustakaan',s:'Buku-buku berbisik saat lampu padam',x0:-44,x1:-26,z0:-14,z1:14},
 {n:'Lorong Timur',s:'Bau melati dan belerang',x0:12,x1:26,z0:-2.5,z1:2.5},{n:'Kelas Ramuan',s:'Kuali tua masih mendidih',x0:26,x1:44,z0:-14,z1:14},
 {n:'Halaman Dalam',s:'Beringin tua dan sumur yang tak pernah kering',x0:-14,x1:14,z0:-48,z1:-24}];

/* =============== AULA UTAMA =============== */
{const g=grp();floor(-12,-24,12,16,M.floor,g);B(3,.04,38,M.carpet,0,.02,-4,g);ceil(-12,-24,12,16,12,g,M.woodD);
 for(let z=-22;z<=14;z+=4)B(24,.5,.6,M.woodD,0,11.6,z,g);[-6,6].forEach(x=>B(.6,.6,40,M.woodD,x,11.5,-4,g));
 wall('z',16,-12.3,12.3,12,[[-2.2,2.2,4.8]],g);wall('z',-24,-14.3,14.3,12,[[-2.2,2.2,4.8]],g);
 wall('x',-12,-24.3,16.3,12,[[-1.6,1.6,4.2]],g);wall('x',12,-24.3,16.3,12,[[-1.6,1.6,4.2]],g);
 [-9,-4,4,9].forEach(x=>{tableSet(g,x,-18,-4,1.6,.95);bench(g,x-1.3,-18,-4);bench(g,x+1.3,-18,-4);colC(x,-11,3.4,14)});
 // piring & gelas
 const plates=[],cups=[];[-9,-4,4,9].forEach(x=>{for(let z=-17;z<-4.5;z+=1.3){[-1,1].forEach(s=>{plates.push({x:x+s*.5,y:1.02,z:z,sx:.34,sy:.03,sz:.34,c:0xb08a3a});cups.push({x:x+s*.2,y:1.12,z:z+.3,sx:.1,sy:.2,sz:.1,c:0xb45cff})})}});
 inst(UC,instM,plates,g);inst(UC,instM,cups,g);
 // meja kepala sekolah (dua sisi, jalan ke halaman dalam tetap terbuka)
 [-1,1].forEach(s=>{const cx=s*6.3;B(5.4,.25,4,M.stoneD,cx,.125,-21.4,g);B(5,.12,1.4,M.wood,cx,1.05,-21.7,g);B(5,.9,.1,M.woodD,cx,.55,-21.2,g);colC(cx,-21.7,5.2,1.6);
  for(let i=0;i<3;i++){const px=cx-1.6+i*1.6;B(.6,.12,.6,M.woodD,px,.62,-22.9,g);B(.6,1.2,.1,M.woodD,px,1.2,-23.25,g);Ic(.07,0,M.gA,px,1.9,-23.25,g)}});
 // lambang sekolah
 Cy(1.7,1.7,.2,6,M.brass,0,8.6,-23.6,g,PI/2);Cy(1.3,1.3,.22,6,M.plum,0,8.6,-23.55,g,PI/2);Ic(.7,1,M.gP,0,8.6,-23.35,g);
 for(let i=0;i<8;i++){const a=i*PI/4;Cy(.1,0,.7,4,M.brass,Math.cos(a)*2.2,8.6+Math.sin(a)*2.2,-23.6,g,0,0,a-PI/2)}
 // jendela & berkas cahaya, spanduk
 [-18,-12,-6,6,12].forEach(z=>{lancet(g,-11.68,3.2,z,PI/2,-7,z);lancet(g,11.68,3.2,z,-PI/2,7,z)});
 [-15,-9,-3.6,3.6,9].forEach((z,i)=>{banner(g,-11.65,7.4,z,PI/2,i%2?M.plum:M.crimson);banner(g,11.65,7.4,z,-PI/2,i%2?M.crimson:M.plum)});
 [-1,1].forEach(s=>{lancet(g,s*6.2,3.4,-23.68,0,s*6.2,-17)});
 // lilin melayang
 const cand=[],fl=[];for(let i=0;i<90;i++){const p={x:rr(-11,11),y:rr(6,10.5),z:rr(-22,14),ph:rnd()*6.28};cand.push(p);}
 const cm=inst(UC,mk(0xe8dcc0,{}),cand.map(p=>({x:p.x,y:p.y,z:p.z,sx:.09,sy:.4,sz:.09})),g),fm=inst(UCone,M.gA,cand.map(p=>({x:p.x,y:p.y+.3,z:p.z,sx:.08,sy:.2,sz:.08})),g),d=new T.Object3D();
 ANIM.push(t=>{cand.forEach((p,i)=>{const y=p.y+Math.sin(t*.7+p.ph)*.18;d.rotation.set(0,0,0);d.position.set(p.x+Math.sin(t*.3+p.ph)*.1,y,p.z);d.scale.set(.09,.4,.09);d.updateMatrix();cm.setMatrixAt(i,d.matrix);
  d.position.y=y+.3+Math.sin(t*9+p.ph)*.01;d.scale.set(.08,.2*(1+.2*Math.sin(t*11+p.ph*3)),.08);d.updateMatrix();fm.setMatrixAt(i,d.matrix)});cm.instanceMatrix.needsUpdate=true;fm.instanceMatrix.needsUpdate=true});
 // tongkat sihir (item 1)
 pickup(g,'wand','Tongkat Sihir','Tergeletak di meja kepala sekolah, ujungnya berdenyut ungu.',-6.3,1.2,-21.7,0xb45cff,o=>{Cy(.02,.012,.4,6,M.wood,0,0,0,o,0,0,PI/2);Ic(.03,1,M.gP,.22,0,0,o);Cy(.026,.026,.04,6,M.brass,-.04,0,0,o,0,0,PI/2)});
 // burung hantu di tiang dekat pintu masuk
 {const og=grp(g,10.4,0,13);Cy(.05,.05,1.5,6,M.woodD,0,.75,0,og);B(.5,.06,.12,M.woodD,0,1.52,0,og);B(.5,.12,.5,M.stoneD,0,.06,0,og);
  const ow=dynG(og,0,1.5,0);const ob=Ic(.2,1,mk(0x6b5a48),0,.28,0,ow,.9,1.3,.8);Ic(.14,1,mk(0xd9c7a1),0,.25,.1,ow,.9,1.2,.5);B(.18,.06,.3,M.woodD,0,.1,-.2,ow);
  const hd=new T.Group();hd.position.set(0,.62,0);ow.add(hd);Ic(.17,1,mk(0x6b5a48),0,0,0,hd,1.15,.95,.9);
  [-1,1].forEach(s=>{Cy(.07,.07,.02,8,mk(0xd9c7a1),s*.07,0,.14,hd,PI/2);Ic(.045,1,M.gA,s*.07,0,.16,hd);Ic(.02,0,M.dark,s*.07,0,.2,hd);Cy(.04,0,.12,4,mk(0x6b5a48),s*.1,.15,0,hd,0,0,s*-.3)});Cy(.025,0,.07,4,M.brass,0,-.03,.17,hd,PI/2);
  ow.rotation.y=PI;ANIM.push((t,dt,px,pz)=>{let rel=Math.atan2(px-10.4,pz-13)-PI;rel=Math.atan2(Math.sin(rel),Math.cos(rel));hd.rotation.y+=(T.MathUtils.clamp(rel,-1.9,1.9)-hd.rotation.y)*Math.min(1,dt*4)});
  colC(10.4,13,.6,.6);inter(10.4,2.1,13,{type:'info',label:'Burung hantu penjaga',text:'"Hu… kamu terlambat. Sekarang sudah lewat tengah malam, dan jam di stasiun masih berhenti."',r:4})}
 inter(0,8.6,-23.3,{type:'info',label:'Lambang Kala Wengi',text:'Segi enam bermata ungu. Katanya matanya berkedip setiap jam sebelas malam.',r:9});
 L(0x9b5cff,1.3,30,0,8,-4);L(0xffb347,1.1,24,0,5,9);L(0xffb347,1.1,24,0,5,-17);
 bake(g)}

/* =============== SERAMBI =============== */
{const g=grp();floor(-3,16,3,19.7,M.floor,g);ceil(-3,16,3,19.7,6,g);wall('x',-3,15.7,19.9,6,[],g);wall('x',3,15.7,19.9,6,[],g);wall('z',19.7,-3.3,3.3,6,[],g);
 [-1,1].forEach(s=>{B(1.4,4.2,.12,M.crimson,s*.75,2.2,19.35,g);Cy(.1,.1,.1,8,M.brass,s*.25,2.2,19.28,g,PI/2);B(.12,4.2,.14,M.brass,s*1.45,2.2,19.35,g);B(.35,.4,.35,M.iron,s*2.4,2.4,19.2,g);B(.2,.3,.2,M.gG,s*2.4,2.8,19.2,g)});
 L(0x5dff9a,1.0,12,0,3.5,18);inter(0,2.2,19.2,{type:'info',label:'Pintu depan',text:'Terkunci dari luar. Rantainya berkarat, tapi gemboknya masih berembun hijau.',r:4});bake(g)}

/* =============== LORONG BARAT & TIMUR =============== */
function corridor(sgn){const g=grp(),x0=sgn<0?-26:12,x1=sgn<0?-12:26;floor(x0,-2.5,x1,2.5,M.floor,g);B(x1-x0,.04,3,M.carpet,(x0+x1)/2,.02,0,g,0,PI/2,0);
 B(3,.04,x1-x0,M.carpet,(x0+x1)/2,.022,0,g);ceil(x0,-2.5,x1,2.5,5,g,M.woodD);wall('z',-2.5,x0,x1,5,[],g);wall('z',2.5,x0,x1,5,[],g);
 for(let x=x0+1.5;x<x1;x+=3.5){B(.4,.4,5,M.woodD,x,4.8,0,g);B(.5,.5,.5,M.stoneD,x,4.5,-2.3,g);B(.5,.5,.5,M.stoneD,x,4.5,2.3,g)}
 const nm=[['Nyai Kala Wengi','Kepala sekolah pertama. Konon ia menenun jam stasiun dari benang bulan.'],['Ki Joko Samudra','Guru Ramuan yang menolak mengajar hari Kliwon.'],['Mbok Laras','Penjaga perpustakaan. Tidak pernah terlihat membuka buku, tapi tahu semua isinya.'],['Raden Gagak','Murid pertama yang lulus lewat portal bata, dan tidak pernah kembali.'],['Nyi Melati','Ahli penawar. Resepnya masih tertulis di papan kelas.'],['Kyai Bayu','Pembuat sapu terbang pertama di Sukarame.']];
 for(let i=0;i<3;i++){const x=(x0+x1)/2+(i-1)*4.2,k=(sgn<0?i:i+3);portrait(g,x,2.4,-2.18,0,k,nm[k][0],nm[k][1]);
  const sx=(x0+x1)/2+(i-1)*4.2+2.1;B(.1,.5,.1,M.iron,sx,2.6,2.2,g);B(.3,.4,.3,M.gA,sx,2.2,2.0,g);B(.4,.08,.4,M.iron,sx,2.42,2.0,g)}
 const ax=(x0+x1)/2;armor(g,ax-2.1,1.75,PI,'Arca Penjaga. Celah di helmnya menyala ungu dan seperti mengikuti langkahmu.');armor(g,ax+2.1,1.75,PI,'Arca Penjaga. Kalau kamu diam lama-lama, terdengar napas dari dalam baju zirahnya.');
 L(0xffb347,1.0,16,(x0+x1)/2,3.5,0);bake(g)}
corridor(-1);corridor(1);

/* =============== PERPUSTAKAAN =============== */
{const g=grp(),books=[],X0=-44,X1=-26,Z0=-14,Z1=14;floor(X0,Z0,X1,Z1,M.floor,g);ceil(X0,Z0,X1,Z1,9,g,M.woodD);
 B(8,.04,8,M.carpet,-35,.02,0,g,0,0,0);
 wall('x',X0,Z0-.3,Z1+.3,9,[],g);wall('z',Z0,X0-.3,X1+.3,9,[],g);wall('z',Z1,X0-.3,X1+.3,9,[],g);wall('x',X1,Z0-.3,Z1+.3,9,[[-1.6,1.6,4.2]],g);
 for(let x=X0+2;x<X1;x+=4)B(.5,.5,28,M.woodD,x,8.7,0,g);for(let z=-12;z<=12;z+=6)B(18,.4,.4,M.woodD,-35,8.5,z,g);
 // rak dinding bawah & atas (balkon)
 const rows=6,sets=[],sh=(x,z,len,ry,rw,y0)=>{const a=[];shelf(g,x,z,len,ry,rw,y0,'book',a);sets.push(a)};
 [[X0+.3+.3,0,26.4,PI/2],[-35,Z0+.3+.3,17.4,0],[-35,Z1-.3-.3,17.4,PI],[X1-.6,-7.7,10.6,-PI/2],[X1-.6,7.7,10.6,-PI/2]].forEach(r=>{
  sh(r[0],r[1],r[2],r[3],rows,0);sh(r[0],r[1],r[2],r[3],5,4.5)});
 col(X0+.3,Z0+.3,X0+.9,Z1-.3);col(X0+.3,Z0+.3,X1,Z0+.9);col(X0+.3,Z1-.9,X1,Z1-.3);col(X1-.9,Z0,X1-.3,-2.4);col(X1-.9,2.4,X1-.3,Z1);
 // balkon (hanya hiasan, di atas kepala)
 B(1.4,.14,27.4,M.woodD,X0+1.2,4.4,0,g);B(17.4,.14,1.4,M.woodD,-35,4.4,Z0+1.2,g);B(17.4,.14,1.4,M.woodD,-35,4.4,Z1-1.2,g);
 for(let i=0;i<14;i++){B(.08,.9,.08,M.woodD,X0+1.9,4.95,-13+i*2,g);B(.08,.9,.08,M.woodD,-43+i*1.3,4.95,Z0+1.9,g);B(.08,.9,.08,M.woodD,-43+i*1.3,4.95,Z1-1.9,g)}
 B(.08,.08,27,M.woodD,X0+1.9,5.4,0,g);B(17,.08,.08,M.woodD,-35,5.4,Z0+1.9,g);B(17,.08,.08,M.woodD,-35,5.4,Z1-1.9,g);
 // rak bebas
 [[-39.5,-7.5],[-39.5,7.5],[-30.5,-7.5],[-30.5,7.5]].forEach(p=>{sh(p[0]-.3,p[1],6,PI/2,5,0);sh(p[0]+.3,p[1],6,-PI/2,5,0);colC(p[0],p[1],1.4,6.4)});
 sets.forEach(a=>a.length&&inst(UBook,instM,a,g));
 // mimbar dengan Buku Mantra (item 2)
 B(.9,1,.7,M.woodD,-35,.5,0,g);B(.9,.08,.7,M.wood,-35,1.1,0,g,-.35);Cy(.5,.6,.12,8,M.stoneD,-35,.06,0,g);colC(-35,0,1.1,1.0);
 pickup(g,'book','Buku Mantra','Sampulnya hangat. Di halaman pertama tertulis: "Penawar dibuat di sumur, bukan di kuali."',-35,1.38,0,0xb45cff,o=>{B(.3,.05,.4,M.plum,0,0,0,o);B(.27,.04,.37,M.cream,0,.005,0,o);B(.3,.015,.4,M.plum,0,.035,0,o);Cy(.06,.06,.01,6,M.brass,0,.045,0,o);Ic(.03,0,M.gP,0,.055,0,o)});
 // buku-buku melayang
 const fb=[];for(let i=0;i<7;i++)fb.push({a:i*.9,r:1.5+rnd()*.5,h:2.4+rnd()*1.6,s:rr(.4,.9)});
 const fm=inst(UB,mk(0xffffff,{}),fb.map((b,i)=>({x:-35,y:3,z:0,sx:.28,sy:.06,sz:.38,c:pick(BOOKC)})),g),dm=new T.Object3D();
 ANIM.push(t=>{fb.forEach((b,i)=>{const a=b.a+t*b.s*.35;dm.position.set(-35+Math.cos(a)*b.r,b.h+Math.sin(t+b.a)*.15,Math.sin(a)*b.r);dm.rotation.set(Math.sin(t*.7+b.a)*.3,-a,Math.cos(t*.6+b.a)*.3);dm.scale.set(.28,.06,.38);dm.updateMatrix();fm.setMatrixAt(i,dm.matrix)});fm.instanceMatrix.needsUpdate=true});
 // meja baca
 [[-35,-9.5],[-35,9.5]].forEach(p=>{B(2.8,.1,1.2,M.wood,p[0],.9,p[1],g);[-1.2,1.2].forEach(s=>B(.12,.9,1,M.woodD,p[0]+s,.45,p[1],g));
  [-1,1].forEach(s=>Cy(.25,.2,.45,6,M.woodD,p[0]+s*.7,.22,p[1]+s*1.1,g));B(.5,.05,.35,M.plum,p[0]-.5,.96,p[1],g);Cy(.03,.03,.4,5,M.brass,p[0]+.8,1.15,p[1],g);Cy(.1,.22,.2,6,M.gG,p[0]+.8,1.45,p[1],g);colC(p[0],p[1],3,1.4)});
 chandelier(g,-35,6.6,0,1.6);
 // tangga geser
 B(.1,3.6,.05,M.woodD,-42.4,1.8,-4,g,0,0,.2);B(.1,3.6,.05,M.woodD,-42.4,1.8,-3.2,g,0,0,.2);for(let i=0;i<7;i++)B(.12,.04,.8,M.woodD,-42.4+i*.025,.4+i*.5,-3.6,g,0,0,.2);
 L(0xffb347,1.2,26,-35,5,0);inter(-35,1.8,-12,{type:'info',label:'Rak Larangan',text:'Rak paling pojok diberi segel ungu. Label di punggung bukunya terhapus oleh jari-jari yang sama.',r:6});bake(g)}

/* =============== KELAS RAMUAN =============== */
{const g=grp(),jars=[],X0=26,X1=44,Z0=-14,Z1=14;floor(X0,Z0,X1,Z1,M.floor,g);ceil(X0,Z0,X1,Z1,6.5,g,M.woodD);
 wall('x',X1,Z0-.3,Z1+.3,6.5,[],g);wall('z',Z0,X0-.3,X1+.3,6.5,[],g);wall('z',Z1,X0-.3,X1+.3,6.5,[],g);wall('x',X0,Z0-.3,Z1+.3,6.5,[[-1.6,1.6,4.2]],g);
 for(let x=X0+2;x<X1;x+=4)B(.5,.5,28,M.woodD,x,6.2,0,g);for(let z=-12;z<=12;z+=6)B(18,.4,.4,M.woodD,35,6,z,g);
 shelf(g,35,Z0+.6,16,0,5,0,'jar',null,jars);shelf(g,35,Z1-.6,16,PI,5,0,'jar',null,jars);col(X0,Z0+.3,X1,Z0+.9);col(X0,Z1-.9,X1,Z1-.3);
 inst(UC6,bs(0xffffff),jars,g);
 // meja murid + kuali kecil
 [31,36].forEach(x=>[-10,-4.5,4.5,10].forEach(z=>{B(2.4,.1,1.1,M.wood,x,.9,z,g);[-1,1].forEach(s=>B(.1,.9,1,M.woodD,x+s*1.1,.45,z,g));
  Cy(.28,.2,.3,8,M.cauldron,x-.5,1.1,z,g);Cy(.22,.22,.02,8,M.gGd,x-.5,1.24,z,g);Cy(.09,.09,.22,6,M.gP,x+.4,1.07,z-.2,g);Cy(.07,.07,.18,6,M.gA,x+.7,1.05,z+.1,g);colC(x,z,2.4,1.1)}));
 // kuali besar + perapian
 B(2.6,.5,2.6,M.stoneD,39.8,.25,0,g);Cy(1.1,.9,1.1,8,M.cauldron,39.8,1.05,0,g);Cy(1.05,1.05,.04,8,M.gGd,39.8,1.5,0,g);Cy(1.15,1.15,.12,8,M.iron,39.8,1.6,0,g);
 [-.9,.9].forEach(s=>B(.08,.5,.08,M.gO,39.8+s*.5,.55,s*.4,g));colC(39.8,0,2.8,2.8);
 // meja guru + papan tulis (petunjuk)
 B(1.4,1,11,M.wood,42.6,.5,0,g);B(1.5,.12,11.2,M.woodD,42.6,1.02,0,g);colC(42.6,0,1.5,11.2);
 const bc=ctex(512,160,(c,w,h)=>{c.fillStyle='#1b2a26';c.fillRect(0,0,w,h);c.strokeStyle='#4a3524';c.lineWidth=8;c.strokeRect(4,4,w-8,h-8);c.fillStyle='#e8e4d0';c.font='bold 20px Georgia';c.fillText('PENAWAR KUTUKAN — Nyi Melati',22,36);c.font='18px Georgia';
  ['1. Kelopak melati tiga helai','2. Garam laut tiga sendok','3. Air dari SUMUR halaman dalam','4. Aduk searah jarum jam,','    bisikkan: "lepaskan, lepaskan".'].forEach((t,i)=>c.fillText(t,22,66+i*20))});
 B(7.4,2.5,.1,M.woodD,43.7,3.6,0,g,0,PI/2,0);const cb=new T.Mesh(new T.PlaneGeometry(7,2.2),bs(0xcccccc,{map:bc}));cb.position.set(43.64,3.6,0);cb.rotation.y=-PI/2;g.add(cb);
 inter(43.5,3.6,0,{type:'info',label:'Papan tulis',text:'"Penawar: melati, garam laut, dan air dari sumur halaman dalam." Seseorang menggarisbawahi kata SUMUR tiga kali.',r:8});
 pickup(g,'potion','Ramuan Penawar','Cairan hijau berpendar di dalam botol bulat. Belum lengkap, kata papan tulis: perlu air sumur.',42.6,1.3,3.8,0x39ff6a,o=>{Ic(.13,1,bs(0xbfe8ff,{transparent:true,opacity:.4}),0,0,0,o);Ic(.11,1,M.gG,0,-.02,0,o);Cy(.04,.04,.14,8,bs(0xbfe8ff,{transparent:true,opacity:.4}),0,.17,0,o);Cy(.05,.04,.07,8,mk(0x8a6a40),0,.27,0,o)});
 // rempah menggantung
 for(let i=0;i<22;i++){const x=rr(27,43),z=rr(-12,12);Cy(.01,.01,rr(.4,1),3,M.woodD,x,6.1-.3,z,g);Cy(.12,0,.5,5,M.herb,x,5.3-rnd()*.4,z,g,PI)}
 // gelembung
 const N=70,pp=new Float32Array(N*3),pg=new T.BufferGeometry();for(let i=0;i<N;i++)pp.set([39.8+rr(-.7,.7),1.5+rnd()*3.5,rr(-.7,.7)],i*3);pg.setAttribute('position',new T.BufferAttribute(pp,3));
 const pts=new T.Points(pg,new T.PointsMaterial({color:0x7dffb0,size:.08,transparent:true,opacity:.8,blending:T.AdditiveBlending,depthWrite:false}));g.add(pts);
 ANIM.push((t,dt)=>{const a=pg.attributes.position;for(let i=0;i<N;i++){let y=a.getY(i)+dt*(.5+(i%5)*.12);if(y>5.2){y=1.5;a.setX(i,39.8+rr(-.7,.7));a.setZ(i,rr(-.7,.7))}a.setY(i,y);a.setX(i,a.getX(i)+Math.sin(t*2+i)*.002)}a.needsUpdate=true});
 glow(0x39ff6a,4,39.8,2,0,g,.4);L(0x39ff6a,1.4,22,39.8,3,0);L(0xffb347,.8,16,31,4.5,0);
 inter(39.8,1.5,0,{type:'info',label:'Kuali besar',text:'Mendidih sendiri sejak penyihir itu lari. Uapnya berbau melati.',r:5});bake(g)}

/* =============== HALAMAN DALAM =============== */
{const g=grp();floor(-14,-48,14,-24,M.grass,g);B(3,.06,24,M.floor,0,.0,-36,g);B(28,.06,3,M.floor,0,.0,-36,g);
 wall('x',-14,-48.3,-23.7,8,[],g);wall('x',14,-48.3,-23.7,8,[],g);wall('z',-48,-14.3,14.3,8,[],g);
 [-1,1].forEach(s=>{for(let z=-46;z<=-26;z+=4){Cy(.35,.4,5,6,M.stoneD,s*12.8,2.5,z,g);B(1,.3,1,M.stoneD,s*12.8,5.15,z,g);colC(s*12.8,z,.8,.8)}B(1.8,.3,22,M.stoneD,s*12.8,5.45,-36,g)});
 for(let z=-46;z<=-26;z+=4)[-1,1].forEach(s=>B(.3,.5,.3,M.iron,s*3,.4,z,g));
 // beringin
 const tx=-4.5,tz=-39;B(.1,.1,.1,M.bark,tx,0,tz,g);Cy(1.3,.8,7,7,M.bark,tx,3.5,tz,g);colC(tx,tz,2.6,2.6);
 for(let i=0;i<6;i++){const a=i*1.05,r=1.9+rnd()*.8;Cy(.5,.2,6,5,M.bark,tx+Math.cos(a)*r,3,tz+Math.sin(a)*r,g,Math.sin(a)*.18,0,-Math.cos(a)*.18);colC(tx+Math.cos(a)*r,tz+Math.sin(a)*r,1,1)}
 for(let i=0;i<10;i++){const a=i*.7;Ic(rr(2.4,3.6),1,i%2?M.leaf1:M.leaf2,tx+Math.cos(a)*rr(1.5,4),rr(7.5,10.5),tz+Math.sin(a)*rr(1.5,4),g,1.2,.7,1.2)}
 const roots=[];for(let i=0;i<46;i++){const a=rnd()*6.28,r=rr(1.5,5),len=rr(3,6),m=new T.Mesh(flat(new T.CylinderGeometry(.03,.07,len,4)),M.bark);m.position.set(tx+Math.cos(a)*r,7.4-len/2,tz+Math.sin(a)*r);m.userData.dyn=true;m.userData.ph=rnd()*6;g.add(m);roots.push(m)}
 ANIM.push(t=>roots.forEach(m=>{m.rotation.z=Math.sin(t*.6+m.userData.ph)*.04;m.rotation.x=Math.cos(t*.5+m.userData.ph)*.04}));
 // roh ungu
 const orbs=[];for(let i=0;i<7;i++){const o=dynG(g,tx+rr(-4,4),rr(1.5,5),tz+rr(-4,4));Ic(.1,1,M.gP,0,0,0,o);glow(0xb45cff,1,0,0,0,o,.7);o.userData.b=[o.position.x,o.position.y,o.position.z,rnd()*6];orbs.push(o)}
 ANIM.push(t=>orbs.forEach(o=>{const b=o.userData.b;o.position.set(b[0]+Math.sin(t*.4+b[3])*.8,b[1]+Math.sin(t*.8+b[3])*.4,b[2]+Math.cos(t*.35+b[3])*.8)}));
 inter(tx,2.2,tz,{type:'info',label:'Beringin tua',text:'Akarnya menjuntai sampai ke tanah. Di antaranya, bola-bola ungu mengambang pelan, seperti menunggu seseorang.',r:6});
 // sumur
 const wx=7,wz=-36;Cy(1.3,1.3,1,8,M.stone,wx,.5,wz,g);Cy(1.45,1.45,.18,8,M.stoneD,wx,1.05,wz,g);const water=new T.Mesh(flat(new T.CylinderGeometry(1.05,1.05,.02,8)),bs(0x1fd470));water.position.set(wx,.98,wz);water.userData.dyn=true;g.add(water);
 [-1,1].forEach(s=>B(.2,2.8,.2,M.woodD,wx+s*1.2,2.3,wz,g));B(.3,.3,3,M.woodD,wx,3.6,wz,g,0,PI/2,0);Cy(.25,.25,.9,6,M.woodD,wx,3.2,wz,g,0,0,PI/2);Py(3.4,3,1.2,M.roofP,wx,4.7,wz,g);
 Cy(.015,.015,1.7,4,M.iron,wx+.3,2.4,wz,g);Cy(.2,.16,.3,6,M.woodD,wx+.3,1.45,wz,g);colC(wx,wz,3,3);
 const wellG=dynG(g,wx,1,wz);const beam=new T.Mesh(new T.CylinderGeometry(.5,1,16,10,1,true),new T.MeshBasicMaterial({color:0xb45cff,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide,fog:false}));beam.position.y=8;wellG.add(beam);
 const wg=glow(0xb45cff,5,0,.4,0,wellG,0);ITEMS.well={beam,wg,water};
 inter(wx,1.4,wz,{type:'well',label:'Sumur halaman dalam',text:'Airnya hijau pucat dan tidak pernah surut. Pantulan bulannya tampak tidak mengikuti langit.',r:4.5});
 // bangku, lentera, bulan, bintang
 [-1,1].forEach(s=>{B(2,.1,.6,M.wood,s*8,.5,-44,g);B(.1,.5,.5,M.woodD,s*8-.8,.25,-44,g);B(.1,.5,.5,M.woodD,s*8+.8,.25,-44,g);colC(s*8,-44,2,.7)});
 [[-3,-27],[3,-27],[-3,-45],[3,-45]].forEach(p=>{Cy(.06,.06,2.4,5,M.iron,p[0],1.2,p[1],g);B(.3,.4,.3,M.gG,p[0],2.6,p[1],g);Py(.5,.5,.3,M.iron,p[0],2.95,p[1],g)});
 const moon=new T.Mesh(flat(new T.IcosahedronGeometry(9,1)),new T.MeshBasicMaterial({color:0xe9e4ff,fog:false}));moon.position.set(-40,70,-110);moon.userData.dyn=true;g.add(moon);glow(0x9a8cff,70,-40,70,-110,g,.5);
 const sp=new Float32Array(900*3);for(let i=0;i<900;i++){const u=rnd()*6.28,v=rnd()*1.3+.12,r=170;sp.set([Math.cos(u)*Math.cos(v)*r,Math.sin(v)*r,Math.sin(u)*Math.cos(v)*r-30],i*3)}
 const sg=new T.BufferGeometry();sg.setAttribute('position',new T.BufferAttribute(sp,3));g.add(new T.Points(sg,new T.PointsMaterial({color:0xcfc8ff,size:1.3,sizeAttenuation:false,fog:false})));
 scene.add(new T.DirectionalLight(0x7a8ccf,.6).translateX(-30).translateY(50).translateZ(-60));
 L(0xb45cff,1.8,24,tx+3,4,tz+4.5);L(0x5dff9a,.9,14,0,3,-27);L(0x8a9aff,1.1,48,0,13,-36);
 bake(g)}

scene.add(new T.HemisphereLight(0x7a6aa8,0x1a1424,.7));
return{COL,INT,ROOMS,ITEMS,spawn:{x:0,z:12.5,yaw:0},update(t,dt,px,pz){ANIM.forEach(f=>f(t,dt,px,pz))}};
}
/*==BUILDER END==*/
