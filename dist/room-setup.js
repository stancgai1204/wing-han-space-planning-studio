// Teik office review sample. Drawing units are centimetres; furniture uses fixed dimensions.
const roomDialog=document.createElement('dialog');
roomDialog.id='roomSetupDialog';
roomDialog.setAttribute('aria-label','Room setup review');
document.body.append(roomDialog);
function showRoomSetup(id){
 const z=state.zones.find(zone=>zone.id===id);
 if(!z||z.type!=='Office - Teik')return;
 const w=z.w/PX_PER_METRE*100,h=z.h/PX_PER_METRE*100;
 const desk={x:w*.48,y:h-195,w:80,h:180};
 const chair=(x,y,rotation)=>`<g transform="translate(${x} ${y}) rotate(${rotation})" fill="#ece8de" stroke="#8a806c" stroke-width="1.5"><rect x="-26" y="-26" width="52" height="52" rx="12"/><path d="M-28 -18Q-40 0 -28 18M-18 -29H18M-18 29H18" fill="none"/></g>`;
 const cabinet=(x,y,cw,ch)=>`<g fill="#dce4e4" stroke="#7c9296" stroke-width="1.5"><rect x="${x}" y="${y}" width="${cw}" height="${ch}"/><path d="M${x} ${y}L${x+cw} ${y+ch}M${x+cw} ${y}L${x} ${y+ch}" opacity=".55"/></g>`;
 roomDialog.innerHTML=`<header class="room-heading"><div><small>ROOM SETUP · SAMPLE 01</small><h2>${esc(z.name)}</h2><p>${zoneArea(z)} m² net · ${Math.round(w*10).toLocaleString()} × ${Math.round(h*10).toLocaleString()} mm · provisional scale</p></div><button id="closeRoomSetup" aria-label="Close room setup">×</button></header>
 <div class="room-body"><div class="room-drawing"><svg viewBox="-30 -35 ${w+60} ${h+70}" role="img" aria-label="Teik office sample with sofa, desk, one task chair, two visitor chairs, storage and inward swinging entry door">
 <rect width="${w}" height="${h}" fill="#fafbf8"/>
 <path d="M${w-110} 0H0V${h}H${w}V0H${w-20}" fill="none" stroke="#566454" stroke-width="5"/>
 <path d="M${w-20} 0V90M${w-110} 0A90 90 0 0 0 ${w-20} 90" fill="none" stroke="#b49c7c" stroke-width="1.5"/>
 <text x="${w-68}" y="-12" text-anchor="middle" font-size="9" fill="#75816f">ENTRY · 900</text>
 <g transform="translate(${w*.26} 25)" fill="#d7dfc9" stroke="#7c8968" stroke-width="1.5"><rect width="210" height="85" rx="8"/><rect x="12" y="18" width="186" height="61" rx="7"/><path d="M105 18V79"/><text x="105" y="49" text-anchor="middle" font-size="10" fill="#4e5a44" stroke="none">SOFA · 2100 × 850</text></g>
 ${cabinet(12,25,45,h-40)}${cabinet(w-57,110,45,Math.min(275,h-125))}
 <rect x="17" y="145" width="35" height="35" fill="#f9faf7" stroke="#7c9296"/><text x="34" y="165" text-anchor="middle" font-size="7">PRINTER</text>
 <rect x="${desk.x}" y="${desk.y}" width="80" height="180" rx="2" fill="#d9c9ad" stroke="#948261" stroke-width="1.5"/>
 <text transform="translate(${desk.x+40} ${desk.y+90}) rotate(-90)" text-anchor="middle" font-size="10" fill="#65573e">DESK · 1800 × 800</text>
 ${chair(desk.x-55,desk.y+90,0)}${chair(desk.x+135,desk.y+43,180)}${chair(desk.x+135,desk.y+137,180)}
 <text x="${w/2}" y="${h*.39}" text-anchor="middle" font-size="15" fill="#57644d">TEIK OFFICE</text>
 <text x="${w/2}" y="${h*.39+18}" text-anchor="middle" font-size="10" fill="#7d8677">${zoneArea(z)} m² NET</text>
 </svg></div><aside class="room-notes"><h3>Reference arrangement</h3><p>Two visitor seats opposite Teik’s desk, with a sofa at the far wall and storage along both sides.</p><dl><dt>Desk</dt><dd>1800 × 800 mm</dd><dt>Seating</dt><dd>1 task chair + 2 visitor chairs</dd><dt>Sofa</dt><dd>2100 × 850 mm</dd><dt>Storage depth</dt><dd>450 mm</dd><dt>Entry door</dt><dd>900 mm · proposed position</dd></dl><p class="room-note">Review concept based on your reference. The entry position and furniture clearances are proposals. Zone area excludes the traced columns.</p><button id="backToZoning" class="room-back">Back to zoning</button></aside></div>`;
 roomDialog.querySelector('#closeRoomSetup').onclick=()=>roomDialog.close();
 roomDialog.querySelector('#backToZoning').onclick=()=>roomDialog.close();
 roomDialog.showModal();
}
roomDialog.addEventListener('click',event=>{if(event.target===roomDialog){const r=roomDialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)roomDialog.close()}});
