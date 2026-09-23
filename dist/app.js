const SVG_NS = 'http://www.w3.org/2000/svg';
// The PDF's 4,600 mm meeting-room dimension spans approximately 221 rendered pixels.
// This calibration is provisional until the original CAD dimension set is supplied.
const PX_PER_METRE = 48;
const AREA_SCALE = 1 / (PX_PER_METRE * PX_PER_METRE);
const PHASE_TWO_BOUNDARY = [[670,100],[1850,100],[1973,215],[1973,670],[1125,670],[1125,1190],[1085,1190],[1085,1740],[670,1740]];
const STRUCTURAL_COLUMNS = [
  {x:670,y:100,w:38,h:44},{x:1251,y:100,w:58,h:97},{x:1715,y:100,w:58,h:97},
  {x:670,y:664,w:40,h:178},{x:1005,y:664,w:28,h:54},{x:670,y:968,w:60,h:200},
  {x:670,y:1670,w:55,h:70},{x:1185,y:1650,w:60,h:90},{x:1745,y:1650,w:60,h:90}
];
const FIT_VIEW = {x:590,y:35,w:1450,h:1780};
const zoneTypes = [
  ['Golf Sim','#aebd9c'],['Putting Green','#c9d5b7'],['Gym','#adc4ca'],['Dining Area','#d7c49d'],
  ['Kitchen','#c9b7a0'],['Showers + Washrooms','#a9c3cc'],['Event + Speaker','#d5b7aa'],
  ['Office - Teik','#b8b1cb'],['Office - Alvin','#aab7cf'],['Part-time Office - Marvin','#d0c8b6'],['Karaoke','#bdaec7'],
  ['Conference Room','#b7c8c0'],['Leisure Seating','#d4c3b6'],['Foyer Display','#c7c3a8'],
  ['Circulation','#dfe3d8']
];
const furnitureCatalog = [
  ['Workstation desk',1400,700],['Workstation bench',2800,1400],['Manager desk',1800,800],['Meeting table 4P',1400,800],
  ['Meeting table 6P',2000,900],['Meeting table 8P',2600,1000],['Meeting table 10P',3200,1100],['Lounge sofa',2100,850],
  ['Armchair',850,850],['Storage cabinet',1200,450],['Phone booth',1000,1000]
];
const programSpecs=[
  ['Golf Sim',1,29,'Must Have'],['Putting Green',1,48,'Must Have'],['Gym',1,34,'Must Have'],
  ['Dining Area - 18+ people',18,63,'Must Have'],['Kitchen',1,33,'Must Have'],
  ['Showers + Washrooms',2,13,'Must Have'],['Event Space + Speaker - 20-30 people',30,85,'Must Have'],
  ['Office - Teik',1,10,'Must Have'],['Office - Alvin',1,10,'Must Have'],
  ['Part-time Office - Marvin',1,12,'Preferred'],['Karaoke',1,24,'Preferred'],
  ['Conference Room',1,19,'Must Have'],['Leisure Seating',1,19,'Preferred'],['Foyer Display',1,20,'Preferred']
];
// Startup arrangement traced from the user's Update 03 reference image.
const initialZones=[
 ['Gym',670,100,456,200],['Golf Sim',1126,100,180,200],
 ['Dining Area',1306,100,408,200],['Kitchen',1714,100,259,344],
 ['Karaoke',1714,444,259,226],['Putting Green',994,300,312,300],
 ['Office - Teik',670,300,252,216],['Office - Alvin',670,516,252,240],
 ['Part-time Office - Marvin',670,756,252,216],
 ['Showers + Washrooms',994,670,132,300],
 ['Leisure Seating',1414,336,216,108],['Foyer Display',1522,552,108,48],
 ['Leisure Seating',778,996,120,120],['Event + Speaker',670,1140,324,408],
 ['Conference Room',670,1548,415,192]
];
let nextId=20;
const state={
  plan:{projectName:'Southmark Tower A · 23F',totalArea:521,circulationPct:22,background:null,boundary:PHASE_TWO_BOUNDARY,calibrationPxPerMetre:PX_PER_METRE,areaProvisional:true,viewBox:{...FIT_VIEW}},
  lockedAreas:[{id:'phase-1',name:'Phase 1 existing fit-out',type:'existing',polygon:[[1085,1195],[1990,1195],[1990,1740],[1085,1740]]},{id:'core',name:'Building core',type:'core',polygon:[[1125,670],[1990,670],[1990,1140],[1125,1140]]}],
  programRequirements:programSpecs.map((r,i)=>({id:`p${i}`,name:r[0],quantity:r[1],target:r[2],priority:r[3],status:'New'})),
  zones:initialZones.map((z,i)=>({id:`z${i}`,name:z[0],type:z[0],x:z[1],y:z[2],w:z[3],h:z[4],color:zoneTypes.find(t=>t[0]===z[0])[1]})),
  furniture:[],dimensions:[],
  activeTab:'zone',canvasTool:'select',selectedId:null,selectedKind:null,zoneType:'Golf Sim',history:[],future:[]
};
const svg=document.getElementById('planCanvas'), stage=document.getElementById('canvasStage');
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const GRID_SIZE=PX_PER_METRE*.1;
const snap=(n,g=GRID_SIZE)=>Math.round(n/g)*g;
const snapZoneX=n=>PHASE_TWO_BOUNDARY[0][0]+snap(n-PHASE_TWO_BOUNDARY[0][0]);
const snapZoneY=n=>PHASE_TWO_BOUNDARY[0][1]+snap(n-PHASE_TWO_BOUNDARY[0][1]);
const ZONE_GRID_MAX_X=PHASE_TWO_BOUNDARY[0][0]+Math.floor((1973-PHASE_TWO_BOUNDARY[0][0])/GRID_SIZE)*GRID_SIZE;
const ZONE_GRID_MAX_Y=PHASE_TWO_BOUNDARY[0][1]+Math.floor((1740-PHASE_TWO_BOUNDARY[0][1])/GRID_SIZE)*GRID_SIZE;
function quantizeZone(zone){const x=snapZoneX(zone.x),y=snapZoneY(zone.y),right=Math.min(ZONE_GRID_MAX_X,snapZoneX(zone.x+zone.w)),bottom=Math.min(ZONE_GRID_MAX_Y,snapZoneY(zone.y+zone.h));return {...zone,x,y,w:Math.max(GRID_SIZE,right-x),h:Math.max(GRID_SIZE,bottom-y)}}
function clipEdge(points,inside,intersect){const out=[];for(let i=0;i<points.length;i++){const current=points[i],previous=points[(i+points.length-1)%points.length],currentIn=inside(current),previousIn=inside(previous);if(currentIn){if(!previousIn)out.push(intersect(previous,current));out.push(current)}else if(previousIn)out.push(intersect(previous,current))}return out}
function clipPolygonToRect(points,rect){let p=points.map(v=>Array.isArray(v)?{x:v[0],y:v[1]}:{x:v.x,y:v.y});const right=rect.x+rect.w,bottom=rect.y+rect.h;p=clipEdge(p,q=>q.x>=rect.x,(a,b)=>({x:rect.x,y:a.y+(b.y-a.y)*(rect.x-a.x)/(b.x-a.x)}));p=clipEdge(p,q=>q.x<=right,(a,b)=>({x:right,y:a.y+(b.y-a.y)*(right-a.x)/(b.x-a.x)}));p=clipEdge(p,q=>q.y>=rect.y,(a,b)=>({x:a.x+(b.x-a.x)*(rect.y-a.y)/(b.y-a.y),y:rect.y}));p=clipEdge(p,q=>q.y<=bottom,(a,b)=>({x:a.x+(b.x-a.x)*(bottom-a.y)/(b.y-a.y),y:bottom}));return p}
function polygonArea(points){if(points.length<3)return 0;let sum=0;for(let i=0;i<points.length;i++){const next=points[(i+1)%points.length];sum+=points[i].x*next.y-next.x*points[i].y}return Math.abs(sum/2)}
const zonePolygon=z=>clipPolygonToRect(PHASE_TWO_BOUNDARY,z);
const zoneGrossPixels=z=>polygonArea(zonePolygon(z));
const zoneColumnPixels=z=>{const poly=zonePolygon(z);return STRUCTURAL_COLUMNS.reduce((sum,column)=>sum+polygonArea(clipPolygonToRect(poly,column)),0)};
const roundArea=n=>Math.round(n*100)/100;
const zoneGrossArea=z=>roundArea(zoneGrossPixels(z)*AREA_SCALE);
const zoneColumnDeduction=z=>roundArea(zoneColumnPixels(z)*AREA_SCALE);
const zoneArea=z=>Math.max(0,roundArea((zoneGrossPixels(z)-zoneColumnPixels(z))*AREA_SCALE));
const allocatedArea=()=>roundArea(state.zones.reduce((sum,z)=>sum+(zoneGrossPixels(z)-zoneColumnPixels(z))*AREA_SCALE,0));
function pointInPolygon(point,poly){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,yi]=poly[i],[xj,yj]=poly[j];if(((yi>point.y)!==(yj>point.y))&&(point.x<(xj-xi)*(point.y-yi)/(yj-yi)+xi))inside=!inside}return inside}
function zoneFits(z,ignoreId=null){const right=z.x+z.w,bottom=z.y+z.h,clipped=zoneGrossPixels(z);if(z.w<48||z.h<48||z.x<670||z.y<100||right>1973||bottom>1740||clipped<z.w*z.h*.55)return false;return !state.zones.some(other=>other.id!==ignoreId&&z.x<other.x+other.w&&right>other.x&&z.y<other.y+other.h&&bottom>other.y)}
function nearestSnap(value,targets,threshold=GRID_SIZE){let best=value,distance=threshold+1;for(const target of targets){const d=Math.abs(value-target);if(d<distance){best=target;distance=d}}return distance<=threshold?best:value}
function snapZoneToEdges(zone,handle='move',ignoreId=null){const others=state.zones.filter(z=>z.id!==ignoreId),xs=[670,1085,1125,1850,1973].map(snapZoneX),ys=[100,670,1190,1740].map(snapZoneY);for(const z of others){const q=quantizeZone(z);xs.push(q.x,q.x+q.w);ys.push(q.y,q.y+q.h)}const out=quantizeZone(zone),right=out.x+out.w,bottom=out.y+out.h;if(handle==='move'){const leftSnap=nearestSnap(out.x,xs),rightSnap=nearestSnap(right,xs);out.x=Math.abs(leftSnap-out.x)<=Math.abs(rightSnap-right)?leftSnap:rightSnap-out.w;const topSnap=nearestSnap(out.y,ys),bottomSnap=nearestSnap(bottom,ys);out.y=Math.abs(topSnap-out.y)<=Math.abs(bottomSnap-bottom)?topSnap:bottomSnap-out.h}else{if(handle.includes('w')){const fixed=out.x+out.w;out.x=nearestSnap(out.x,xs);out.w=fixed-out.x}if(handle.includes('e'))out.w=nearestSnap(out.x+out.w,xs)-out.x;if(handle.includes('n')){const fixed=out.y+out.h;out.y=nearestSnap(out.y,ys);out.h=fixed-out.y}if(handle.includes('s'))out.h=nearestSnap(out.y+out.h,ys)-out.y}return quantizeZone(out)}
const cloneData=()=>JSON.stringify({plan:state.plan,programRequirements:state.programRequirements,zones:state.zones,furniture:state.furniture,dimensions:state.dimensions,roomLayouts:state.roomLayouts||{},doors:state.doors||[]});
function restoreData(serialized){Object.assign(state,JSON.parse(serialized));renderAll();if(typeof renderRoom==='function')renderRoom()}
function checkpoint(){state.history.push(cloneData());if(state.history.length>40)state.history.shift();state.future=[];updateHistoryButtons()}
function undo(){if(!state.history.length)return;state.future.push(cloneData());restoreData(state.history.pop());updateHistoryButtons();toast('Last change undone')}
function redo(){if(!state.future.length)return;state.history.push(cloneData());restoreData(state.future.pop());updateHistoryButtons();toast('Change restored')}
function updateHistoryButtons(){}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),1800)}
function setTab(tab){state.activeTab=tab;$$('.panel-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));renderPanel()}
function updateCanvasCursor(){svg.style.cursor=gesture?.type==='pan'?'grabbing':spacePressed||state.canvasTool==='pan'?'grab':state.canvasTool==='zone'?'crosshair':'default'}
function setCanvasTool(tool){state.canvasTool=tool;$$('[data-canvas-tool]').forEach(b=>b.classList.toggle('active',b.dataset.canvasTool===tool));$('.mode-hint')?.remove();if(tool==='boundary'){const hint=document.createElement('div');hint.className='mode-hint';hint.textContent='Phase 2 boundary traced from 23F PDF · provisional';stage.append(hint)}updateCanvasCursor()}
function zoneLabelLines(name){const labels={
  'Dining Area':['DINING AREA','18+ PEOPLE'],'Showers + Washrooms':['SHOWERS +','WASHROOMS'],
  'Event + Speaker':['EVENT + SPEAKER','20-30 PEOPLE'],'Office - Teik':['OFFICE','TEIK'],
  'Office - Alvin':['OFFICE','ALVIN'],'Part-time Office - Marvin':['PART-TIME OFFICE','MARVIN'],
  'Conference Room':['CONFERENCE','ROOM'],'Leisure Seating':['LEISURE','SEATING'],'Foyer Display':['FOYER','DISPLAY']
};return labels[name]||[name.toUpperCase()]}
function zoneHandlePoints(z,polygon){const corners=[['nw',{x:z.x,y:z.y}],['ne',{x:z.x+z.w,y:z.y}],['se',{x:z.x+z.w,y:z.y+z.h}],['sw',{x:z.x,y:z.y+z.h}]];return corners.map(([name,corner])=>{if(pointInPolygon(corner,PHASE_TWO_BOUNDARY))return{name,...corner};let nearest=polygon[0],distance=Infinity;for(const point of polygon){const d=(point.x-corner.x)**2+(point.y-corner.y)**2;if(d<distance){nearest=point;distance=d}}return{name,x:nearest.x,y:nearest.y}})}
function renderZones(){
  $('#zonesLayer').innerHTML=state.zones.map(z=>{const polygon=zonePolygon(z),points=polygon.map(p=>`${p.x},${p.y}`).join(' '),lines=zoneLabelLines(z.name),fontSize=16,labelTop=z.y+z.h/2-lines.length*14,areaY=labelTop+lines.length*28,deduction=zoneColumnDeduction(z),selected=state.selectedKind==='zone'&&state.selectedId===z.id,handles=selected?zoneHandlePoints(z,polygon):[];return `<g class="zone ${selected?'selected':''}" data-kind="zone" data-id="${z.id}"><title>${esc(z.name)} · ${zoneArea(z)} m² net${deduction?` · ${deduction} m² column deduction`:''}</title><polygon points="${points}" fill="${z.color}" fill-opacity=".72" stroke="${z.color}" stroke-width="2.5"/>${lines.map((line,i)=>`<text text-anchor="middle" x="${z.x+z.w/2}" y="${labelTop+i*28}" font-size="${fontSize}" font-weight="700" fill="#485044">${esc(line)}</text>`).join('')}<text text-anchor="middle" x="${z.x+z.w/2}" y="${areaY}" font-size="${Math.min(17,(z.w-12)/8)}" fill="#485044">${zoneArea(z)} m² NET</text>${handles.map(h=>`<circle class="resize-handle" data-handle="${h.name}" cx="${h.x}" cy="${h.y}" r="3.25"><title>Resize ${h.name.toUpperCase()} corner</title></circle>`).join('')}</g>`}).join('');
}
function renderFurniture(){
  if(typeof renderPlanDoors==='function')renderPlanDoors();
  renderDimensions();
  $('#furnitureLayer').innerHTML=state.furniture.map(f=>{const w=f.wMm/1000*PX_PER_METRE,h=f.hMm/1000*PX_PER_METRE,sel=state.selectedKind==='furniture'&&state.selectedId===f.id;return `<g class="furniture ${sel?'selected':''}" data-kind="furniture" data-id="${f.id}" transform="translate(${f.x} ${f.y}) rotate(${f.rotation} ${w/2} ${h/2})"><rect class="furniture-shape" width="${w}" height="${h}" rx="5"/><line class="furniture-shape" x1="${w/2}" y1="0" x2="${w/2}" y2="${h}"/><text x="${w/2}" y="${h/2+6}" font-size="14">${esc(f.name.replace('Workstation ','WS ').replace('Meeting table ','MT '))}</text>${sel?`<line class="dimension-line" x1="0" y1="${h+14}" x2="${w}" y2="${h+14}"/><text class="dimension-text" x="${w/2}" y="${h+35}" font-size="17">${f.wMm} × ${f.hMm} mm</text>`:''}</g>`}).join('');
}
function renderBackground(){let el=svg.querySelector('#uploadedPlan');if(!state.plan.background){el?.remove();$('#sourcePlan').style.opacity='1';return}if(!el){el=document.createElementNS(SVG_NS,'image');el.id='uploadedPlan';el.classList.add('background-plan');el.setAttribute('x','0');el.setAttribute('y','0');el.setAttribute('width','2647');el.setAttribute('height','1872');el.setAttribute('preserveAspectRatio','xMidYMid meet');svg.querySelector('#planWorld').prepend(el)}el.setAttribute('href',state.plan.background);$('#sourcePlan').style.opacity='.32'}
function renderAll(){svg.setAttribute('viewBox',`${state.plan.viewBox.x} ${state.plan.viewBox.y} ${state.plan.viewBox.w} ${state.plan.viewBox.h}`);renderBackground();renderZones();renderFurniture();renderPanel();updateZoom();updateHistoryButtons()}
function areaPanel(){const allocated=allocatedArea(),remaining=roundArea(state.plan.totalArea-allocated),pct=Math.round(allocated/state.plan.totalArea*100),circ=Math.round(state.plan.totalArea*state.plan.circulationPct/100);return `<h2 class="panel-title">Area schedule</h2><p class="panel-kicker">Net areas follow the sloped perimeter and automatically deduct structural columns.</p><div class="metric-grid"><div class="metric"><span>Planning area*</span><strong>${state.plan.totalArea.toLocaleString()} <small>m²</small></strong></div><div class="metric"><span>Allocated net</span><strong>${allocated.toLocaleString()} <small>m²</small></strong></div><div class="metric"><span>Remaining</span><strong>${remaining.toLocaleString()} <small>m²</small></strong></div><div class="metric"><span>Allocation</span><strong>${pct}<small>%</small></strong><div class="progress"><span style="width:${Math.min(100,pct)}%"></span></div></div></div><label class="field"><span>Circulation allowance</span><div class="field-row"><input id="circulationInput" type="number" min="0" max="50" value="${state.plan.circulationPct}"/><input value="${circ} m²" disabled/></div></label><div class="section-label"><span>Editable schedule</span><span>${state.zones.length} zones</span></div>${state.zones.length?`<table class="schedule"><thead><tr><th>Zone</th><th>Net area</th><th>%</th></tr></thead><tbody>${state.zones.map(z=>{const deduction=zoneColumnDeduction(z);return `<tr><td><span class="swatch" style="background:${z.color}"></span><input class="table-input" data-zone-name="${z.id}" value="${esc(z.name)}" aria-label="Zone name"/></td><td title="${zoneGrossArea(z)} m² gross${deduction?` − ${deduction} m² columns`:''}">${zoneArea(z)} m²${deduction?` <small>−${deduction}</small>`:''}</td><td>${Math.round(zoneArea(z)/state.plan.totalArea*100)}%</td></tr>`}).join('')}</tbody></table>`:'<div class="empty-note">No Phase 2 zones yet. Open Zone to draw the first planning area.</div>'}<p class="area-caveat">* PDF-calibrated area. Column deductions are calculated from the visible structural footprints.</p>`}
function programPanel(){return `<h2 class="panel-title">Program brief</h2><p class="panel-kicker">Set target quantities and areas for the test fit.</p><label class="field"><span>Project name</span><input id="projectName" value="${esc(state.plan.projectName)}"/></label><div class="field-row"><label class="field"><span>Total usable area</span><input id="totalArea" type="number" min="1" value="${state.plan.totalArea}"/></label><label class="field"><span>Unit</span><input value="m²" disabled/></label></div><div class="section-label"><span>Requirements</span><span>Qty · m² · Priority · Type</span></div>${state.programRequirements.map(r=>`<div class="requirement-card"><div class="requirement-head"><span>${esc(r.name)}</span><small>${r.target} m²</small></div><div class="requirement-fields"><input data-program="${r.id}" data-field="quantity" type="number" min="0" value="${r.quantity}" aria-label="${esc(r.name)} quantity"/><input data-program="${r.id}" data-field="target" type="number" min="0" value="${r.target}" aria-label="${esc(r.name)} target area"/><select data-program="${r.id}" data-field="priority" aria-label="${esc(r.name)} priority">${['Must Have','Preferred','Optional'].map(v=>`<option ${v===r.priority?'selected':''}>${v}</option>`).join('')}</select><select data-program="${r.id}" data-field="status" aria-label="${esc(r.name)} type">${['Existing','Shared','New'].map(v=>`<option ${v===r.status?'selected':''}>${v}</option>`).join('')}</select></div></div>`).join('')}`}
function zonePanel(){const selected=state.selectedKind==='zone'?state.zones.find(z=>z.id===state.selectedId):null;return `<h2 class="panel-title">Zoning</h2><p class="panel-kicker">Choose a zone name, then draw directly on plan. Right-drag to pan. Aligned: click an edge. Distance: click two edges to measure the horizontal or vertical gap; each measurement uses two new points. Esc cancels.</p>${selected?`<div class="selection-box"><label class="field"><span>Zone label</span><input id="selectedZoneName" value="${esc(selected.name)}" aria-label="Edit selected zone label"/></label><span>${zoneArea(selected)} m² net · ${zoneGrossArea(selected)} m² gross${zoneColumnDeduction(selected)?` · ${zoneColumnDeduction(selected)} m² columns`:''}</span><div class="selection-actions"><button data-action="duplicate-zone">Duplicate</button><button class="danger" data-action="delete-selected">Delete</button></div></div>`:''}<div class="section-label"><span>Select zone to draw</span><span>Click + drag on plan</span></div><div class="zone-palette">${zoneTypes.map(t=>`<button data-zone-type="${esc(t[0])}" class="${state.zoneType===t[0]&&state.canvasTool==='zone'?'active':''}"><i class="swatch" style="background:${t[1]}"></i>${esc(t[0])}</button>`).join('')}</div><div class="section-label"><span>Zones on plan</span><span>${state.zones.length}</span></div><div class="zone-list">${state.zones.map(z=>`<button class="zone-row" data-select-zone="${z.id}"><span><i class="swatch" style="background:${z.color}"></i>${esc(z.name)}</span><small>${zoneArea(z)} m²</small></button>`).join('')}</div>`}
function furniturePanel(){const selected=state.selectedKind==='furniture'?state.furniture.find(f=>f.id===state.selectedId):null;return `<h2 class="panel-title">Furniture library</h2><p class="panel-kicker">Blocks use real dimensions and snap to a 100 mm grid.</p>${selected?`<div class="selection-box"><strong>${esc(selected.name)}</strong><span>${selected.wMm} × ${selected.hMm} mm · ${selected.rotation}°</span><div class="selection-actions"><button data-action="rotate-furniture">↻ Rotate 90°</button><button class="danger" data-action="delete-selected">Delete</button></div></div>`:''}<div class="furniture-grid">${furnitureCatalog.map(f=>`<button class="furniture-card" data-add-furniture="${esc(f[0])}"><strong>${esc(f[0])}</strong><span>${f[1]} × ${f[2]} mm</span></button>`).join('')}</div><div class="section-label"><span>Placed blocks</span><span>${state.furniture.length}</span></div>${state.furniture.length?state.furniture.map(f=>`<button class="furniture-row" data-select-furniture="${f.id}"><span>${esc(f.name)}</span><small>${f.rotation}°</small></button>`).join(''):'<div class="empty-note">Select a furniture type above to place it on the plan.</div>'}`}
function renderPanel(){$('#panelContent').innerHTML=state.activeTab==='program'?programPanel():state.activeTab==='area'?areaPanel():state.activeTab==='zone'?zonePanel():furniturePanel()}
function selectItem(kind,id){state.selectedKind=kind;state.selectedId=id;renderZones();renderFurniture();if(kind==='zone')setTab('zone');else setTab('furniture')}
function addFurniture(name){const c=furnitureCatalog.find(f=>f[0]===name);checkpoint();const item={id:`f${nextId++}`,name:c[0],wMm:c[1],hMm:c[2],x:snap(760+state.furniture.length*18),y:snap(285+state.furniture.length*18),rotation:0};state.furniture.push(item);selectItem('furniture',item.id);toast(`${name} placed`)}
function deleteSelected(){if(!state.selectedId)return;checkpoint();if(state.selectedKind==='door'){state.doors=state.doors.filter(d=>d.id!==state.selectedId);state.selectedId=null;renderPlanDoors();return}if(state.selectedKind==='zone')state.zones=state.zones.filter(z=>z.id!==state.selectedId);else state.furniture=state.furniture.filter(f=>f.id!==state.selectedId);state.selectedId=null;state.selectedKind=null;renderAll();toast('Selection deleted')}
function duplicateZone(){const z=state.zones.find(z=>z.id===state.selectedId);if(!z)return;const copy={...z,id:`z${nextId++}`,x:z.x+z.w+24,y:z.y,name:`${z.name} copy`};if(!zoneFits(copy))return toast('No adjacent Phase 2 space for a duplicate');checkpoint();state.zones.push(copy);selectItem('zone',copy.id);toast('Zone duplicated')}
function rotateFurniture(){const f=state.furniture.find(f=>f.id===state.selectedId);if(!f)return;checkpoint();f.rotation=(f.rotation+90)%360;renderAll();toast('Furniture rotated 90°')}
function clientToSvg(evt){const pt=svg.createSVGPoint();pt.x=evt.clientX;pt.y=evt.clientY;return pt.matrixTransform(svg.getScreenCTM().inverse())}
let gesture=null,spacePressed=false;
svg.addEventListener('pointerdown',evt=>{
  const p=clientToSvg(evt),target=evt.target.closest('[data-kind]');
  if(evt.button===2||state.canvasTool==='pan'||(spacePressed&&evt.button===0)){gesture={type:'pan',start:{x:evt.clientX,y:evt.clientY},view:{...state.plan.viewBox},scale:1/svg.getScreenCTM().a};evt.preventDefault();svg.setPointerCapture(evt.pointerId);updateCanvasCursor();return}
  if(evt.button!==0)return;
  if(state.canvasTool==='dimension'){if($('#dimensionMode').value==='distance')addDistanceDimension(p);else addEdgeDimension(p);return}
  if(state.canvasTool==='zone'){gesture={type:'draw',start:p,current:p};svg.setPointerCapture(evt.pointerId);renderPreview();return}
  if(target){const kind=target.dataset.kind,id=target.dataset.id,handle=evt.target.dataset.handle||null;selectItem(kind,id);checkpoint();const item=kind==='zone'?state.zones.find(z=>z.id===id):state.furniture.find(f=>f.id===id);gesture={type:handle?'resize':'move',handle,kind,id,start:p,original:{...item}};svg.setPointerCapture(evt.pointerId)}else{state.selectedId=null;state.selectedKind=null;renderZones();renderFurniture();renderPanel()}
});
svg.addEventListener('pointermove',evt=>{if(!gesture)return;const p=clientToSvg(evt);if(gesture.type==='pan'){const vb=state.plan.viewBox,scale=gesture.scale;vb.x=gesture.view.x-(evt.clientX-gesture.start.x)*scale;vb.y=gesture.view.y-(evt.clientY-gesture.start.y)*scale;svg.setAttribute('viewBox',`${vb.x} ${vb.y} ${vb.w} ${vb.h}`);return}if(gesture.type==='draw'){gesture.current=p;renderPreview();return}const item=gesture.kind==='zone'?state.zones.find(z=>z.id===gesture.id):state.furniture.find(f=>f.id===gesture.id);let candidate={...item};const dx=snap(p.x-gesture.start.x),dy=snap(p.y-gesture.start.y);if(gesture.type==='resize'){const original=gesture.original,right=original.x+original.w,bottom=original.y+original.h;if(gesture.handle.includes('w')){candidate.x=Math.min(original.x+dx,right-48);candidate.w=right-candidate.x}if(gesture.handle.includes('e'))candidate.w=Math.max(48,original.w+dx);if(gesture.handle.includes('n')){candidate.y=Math.min(original.y+dy,bottom-48);candidate.h=bottom-candidate.y}if(gesture.handle.includes('s'))candidate.h=Math.max(48,original.h+dy)}else{candidate.x=gesture.original.x+dx;candidate.y=gesture.original.y+dy}if(gesture.kind==='zone')candidate=snapZoneToEdges(candidate,gesture.type==='resize'?gesture.handle:'move',item.id);if(gesture.kind==='zone'&&!zoneFits(candidate,item.id))return;Object.assign(item,candidate);renderZones();renderFurniture();if(gesture.kind==='zone')renderPanel()});
svg.addEventListener('pointerup',evt=>{if(!gesture)return;if(gesture.type==='draw'){const a=gesture.start,b=gesture.current,x=snap(Math.min(a.x,b.x)),y=snap(Math.min(a.y,b.y)),w=snap(Math.abs(b.x-a.x)),h=snap(Math.abs(b.y-a.y));$('#drawPreview')?.remove();const type=zoneTypes.find(t=>t[0]===state.zoneType);let z={id:`z${nextId++}`,name:type[0],type:type[0],x,y,w,h,color:type[1]};z=snapZoneToEdges(z,'move');if(w>=48&&h>=48&&zoneFits(z)){checkpoint();state.zones.push(z);selectItem('zone',z.id);toast(`${type[0]} zone created · edges snapped`)}else toast('Draw a non-overlapping shape within Phase 2');setCanvasTool('select')}else if(gesture.type!=='pan'){renderAll();if(gesture.type==='move'&&gesture.kind==='zone'&&Math.hypot(clientToSvg(evt).x-gesture.start.x,clientToSvg(evt).y-gesture.start.y)<4){showRoomSetup(gesture.id)}}gesture=null;svg.releasePointerCapture(evt.pointerId);updateCanvasCursor()});
function renderPreview(){let r=$('#drawPreview');if(!r){r=document.createElementNS(SVG_NS,'rect');r.id='drawPreview';r.classList.add('draw-preview');$('#zonesLayer').append(r)}const a=gesture.start,b=gesture.current;r.setAttribute('x',Math.min(a.x,b.x));r.setAttribute('y',Math.min(a.y,b.y));r.setAttribute('width',Math.abs(b.x-a.x));r.setAttribute('height',Math.abs(b.y-a.y))}
function zoomAt(factor,clientX,clientY){const v=state.plan.viewBox,rect=svg.getBoundingClientRect(),focus=clientToSvg({clientX,clientY}),rx=(clientX-rect.left)/rect.width,ry=(clientY-rect.top)/rect.height,newW=Math.max(430,Math.min(2800,v.w*factor)),newH=newW*(FIT_VIEW.h/FIT_VIEW.w);v.x=focus.x-rx*newW;v.y=focus.y-ry*newH;v.w=newW;v.h=newH;svg.setAttribute('viewBox',`${v.x} ${v.y} ${v.w} ${v.h}`);updateZoom()}
function setZoom(factor){const v=state.plan.viewBox,cx=v.x+v.w/2,cy=v.y+v.h/2,w=Math.max(430,Math.min(2800,v.w*factor)),h=w*FIT_VIEW.h/FIT_VIEW.w;Object.assign(v,{x:cx-w/2,y:cy-h/2,w,h});svg.setAttribute('viewBox',`${v.x} ${v.y} ${v.w} ${v.h}`);updateZoom()}
function updateZoom(){$('#zoomReadout').textContent=`${Math.round(FIT_VIEW.w/state.plan.viewBox.w*100)}%`}
function fitPlan(){state.plan.viewBox={...FIT_VIEW};renderAll();toast('23F plan fitted to canvas')}
svg.addEventListener('contextmenu',evt=>evt.preventDefault());
svg.addEventListener('wheel',evt=>{evt.preventDefault();if(!gesture)setZoom(Math.exp(Math.max(-100,Math.min(100,evt.deltaY))*.0015))},{passive:false});
async function exportPlan(){try{const clone=svg.cloneNode(true),style=document.createElementNS(SVG_NS,'style');style.textContent='.phase-two-outline{fill:#a7b58d;fill-opacity:.065;stroke:#76825e;stroke-width:7;stroke-dasharray:20 12}.locked-outline{fill:#747974;fill-opacity:.08;stroke:#7c817b;stroke-width:5;stroke-dasharray:17 12}.drawing-tag rect{fill:#6f7855}.drawing-tag text{fill:white;font:700 24px Arial}.furniture-shape{fill:#f8f9f6;stroke:#5e665a;stroke-width:3}text{font-family:Arial,sans-serif}';clone.prepend(style);const sourceBlob=await(await fetch('23f-plan.png')).blob(),sourceData=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(sourceBlob)});clone.querySelector('#sourcePlan').setAttribute('href',sourceData);const blob=new Blob([new XMLSerializer().serializeToString(clone)],{type:'image/svg+xml'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='wing-han-23f-space-plan.svg';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('23F plan exported as SVG')}catch{toast('Export could not be completed')}}
function uploadPlan(file){if(!file||!file.type.startsWith('image/'))return toast('Please choose an image file');const reader=new FileReader();reader.onload=()=>{checkpoint();state.plan.background=reader.result;renderAll();toast('Image overlaid; 23F trace remains active')};reader.readAsDataURL(file)}
document.addEventListener('click',evt=>{const b=evt.target.closest('button');if(!b)return;if(b.dataset.tab)setTab(b.dataset.tab);if(b.dataset.canvasTool)setCanvasTool(b.dataset.canvasTool);if(b.dataset.zoneType){state.zoneType=b.dataset.zoneType;setCanvasTool('zone');renderPanel();toast(`Draw ${b.dataset.zoneType} on the plan`)}if(b.dataset.addFurniture)addFurniture(b.dataset.addFurniture);if(b.dataset.selectZone){selectItem('zone',b.dataset.selectZone);showRoomSetup(b.dataset.selectZone)}if(b.dataset.selectFurniture)selectItem('furniture',b.dataset.selectFurniture);if(b.dataset.action==='delete-selected')deleteSelected();if(b.dataset.action==='rotate-furniture')rotateFurniture();if(b.dataset.action==='duplicate-zone')duplicateZone();if(b.id==='uploadButton')$('#planUpload').click()});
$('#panelContent').addEventListener('change',evt=>{const t=evt.target;if(t.id==='projectName'){checkpoint();state.plan.projectName=t.value}if(t.id==='totalArea'){checkpoint();state.plan.totalArea=Math.max(1,+t.value);renderPanel()}if(t.id==='circulationInput'){checkpoint();state.plan.circulationPct=Math.max(0,Math.min(50,+t.value));renderPanel()}if(t.id==='selectedZoneName'){checkpoint();const z=state.zones.find(z=>z.id===state.selectedId);if(z)z.name=t.value.trim()||z.type;renderAll()}if(t.dataset.zoneName){checkpoint();state.zones.find(z=>z.id===t.dataset.zoneName).name=t.value;renderAll()}if(t.dataset.program){checkpoint();const r=state.programRequirements.find(r=>r.id===t.dataset.program);r[t.dataset.field]=t.type==='number'?+t.value:t.value;renderPanel()}});
$('#planUpload').addEventListener('change',evt=>uploadPlan(evt.target.files[0]));
$('#zoomInButton').onclick=()=>setZoom(.9);$('#zoomOutButton').onclick=()=>setZoom(1.1);
$('#dimensionButton').onclick=()=>toggleDimensions(state.canvasTool!=='dimension');
$('#cancelDimensionButton').onclick=()=>toggleDimensions(false);
$('#removeDimensionButton').onclick=()=>{if(state.dimensions.length){checkpoint();state.dimensions.pop();renderDimensions()}};
$$('[data-mode]').forEach(b=>b.addEventListener('click',()=>{const mode=b.dataset.mode;$$('[data-mode]').forEach(x=>x.classList.toggle('active',x===b));if(['program','zone','furniture'].includes(mode))setTab(mode);if(mode==='zone')setCanvasTool('zone');if(mode==='circulation'){state.zoneType='Circulation';setTab('zone');setCanvasTool('zone')}if(mode==='compare')toast('Comparison view is reserved for the next planning version')}));
document.addEventListener('keydown',evt=>{if(document.querySelector('#roomSetupDialog')?.open)return;const editing=['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName);if(editing)return;if(evt.key==='Escape'){toggleDimensions(false);renderPanel()}if(evt.code==='Space'&&!editing){evt.preventDefault();if(!spacePressed){spacePressed=true;updateCanvasCursor()}}if((evt.key==='Delete'||evt.key==='Backspace')&&!editing)deleteSelected();if((evt.ctrlKey||evt.metaKey)&&evt.key.toLowerCase()==='z'){evt.preventDefault();evt.shiftKey?redo():undo()}if((evt.ctrlKey||evt.metaKey)&&evt.key.toLowerCase()==='y'){evt.preventDefault();redo()}});
document.addEventListener('keyup',evt=>{if(evt.code==='Space'){spacePressed=false;updateCanvasCursor()}});
window.addEventListener('blur',()=>{spacePressed=false;updateCanvasCursor()});
function registerWebMCP(){const context=document.modelContext;if(!context?.registerTool)return;const tools=[{name:'read_space_plan_summary',title:'Read space plan summary',description:'Read the current project area, zoning, and furniture summary.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:()=>({projectName:state.plan.projectName,totalAreaM2:state.plan.totalArea,areaProvisional:true,allocatedNetAreaM2:allocatedArea(),remainingAreaM2:state.plan.totalArea-allocatedArea(),columnDeductionM2:state.zones.reduce((sum,z)=>sum+zoneColumnDeduction(z),0),zones:state.zones.length,furnitureBlocks:state.furniture.length})},{name:'create_rectangular_zone',title:'Create rectangular zone',description:'Add a snapping zone that clips to the Phase 2 perimeter and deducts structural columns.',inputSchema:{type:'object',properties:{type:{type:'string',enum:zoneTypes.map(t=>t[0])},x:{type:'number'},y:{type:'number'},width:{type:'number',minimum:48},height:{type:'number',minimum:48}},required:['type','x','y','width','height'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:input=>{const type=zoneTypes.find(t=>t[0]===input.type),values=[input.x,input.y,input.width,input.height];if(!type||!values.every(Number.isFinite)||input.width<48||input.height<48)throw new Error('Invalid zone geometry');let z={id:`z${nextId++}`,name:type[0],type:type[0],x:snap(input.x),y:snap(input.y),w:snap(input.width),h:snap(input.height),color:type[1]};z=snapZoneToEdges(z,'move');if(!zoneFits(z))throw new Error('Zone must fit within Phase 2 without overlapping another zone');checkpoint();state.zones.push(z);selectItem('zone',z.id);return {id:z.id,grossAreaM2:zoneGrossArea(z),columnDeductionM2:zoneColumnDeduction(z),netAreaM2:zoneArea(z),allocatedNetAreaM2:allocatedArea()}}}];for(const tool of tools){try{Promise.resolve(context.registerTool(tool)).catch(()=>{})}catch{}}}

let dimensionStart=null;
$('#dimensionMode').onchange=()=>{dimensionStart=null;toggleDimensions(true)};
$('#exportPdfButton').onclick=exportPdf;
function toggleDimensions(active){
 dimensionStart=null;
 setCanvasTool(active?'dimension':'select');
 $('#dimensionButton').classList.toggle('active',active);
 $('#cancelDimensionButton').hidden=!active;$('#removeDimensionButton').hidden=!active;
 svg.style.cursor=active?'crosshair':'default';
 renderDimensions();
 if(active)toast($('#dimensionMode').value==='distance'?'Click two edges for one distance; each new dimension starts fresh':'Click zone edges to add aligned dimensions');
}
function findDimensionSnap(point){
 let best=null;
 for(const z of state.zones){const poly=zonePolygon(z);poly.forEach((a,i)=>{
 const b=poly[(i+1)%poly.length],dx=b.x-a.x,dy=b.y-a.y,len2=dx*dx+dy*dy;if(!len2)return;
 const t=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/len2));
 const distance=Math.hypot(point.x-a.x-t*dx,point.y-a.y-t*dy);
 if(!best||distance<best.distance)best={zoneId:z.id,edge:i,t,distance};
 })}
 return best&&best.distance<=24/svg.getScreenCTM().a?best:null;
}
function resolveSnap(ref){
 const z=state.zones.find(z=>z.id===ref.zoneId);if(!z)return null;
 const poly=zonePolygon(z),a=poly[ref.edge],b=poly[(ref.edge+1)%poly.length];if(!a||!b)return null;
 return {x:a.x+(b.x-a.x)*ref.t,y:a.y+(b.y-a.y)*ref.t};
}
function addEdgeDimension(point){
 const best=findDimensionSnap(point);
 if(!best)return toast('Click close to a zone edge');
 if(state.dimensions.some(d=>!d.kind&&d.zoneId===best.zoneId&&d.edge===best.edge))return;
 checkpoint();state.dimensions.push(best);renderDimensions();
}
function addDistanceDimension(point){
 const next=findDimensionSnap(point);if(!next)return toast('Click close to a zone edge');
 if(!dimensionStart){dimensionStart=next;renderDimensions();return toast('First edge snapped — click the opposite edge')}
 const a=resolveSnap(dimensionStart),b=resolveSnap(next);if(!a||!b){dimensionStart=next;return}
 const axis=Math.abs(b.x-a.x)>=Math.abs(b.y-a.y)?'x':'y';
 if(Math.abs(b[axis]-a[axis])<1)return toast('Choose a different edge');
 checkpoint();state.dimensions.push({kind:'distance',from:dimensionStart,to:next,axis});
 dimensionStart=null;renderDimensions();toast('Distance complete — click two new points for the next measurement');
}
function dimensionEndpoints(d){
 if(d.kind==='distance'){
 const a=resolveSnap(d.from),b=resolveSnap(d.to);if(!a||!b)return null;
 return d.axis==='x'?{a,b:{x:b.x,y:a.y},sourceB:b}:{a,b:{x:a.x,y:b.y},sourceB:b};
 }
 const z=state.zones.find(z=>z.id===d.zoneId);if(!z)return null;
 const poly=zonePolygon(z);return {a:poly[d.edge],b:poly[(d.edge+1)%poly.length]};
}
function renderDimensions(){
 $('#dimensionsLayer').innerHTML=state.dimensions.map(d=>{
 const ends=dimensionEndpoints(d);if(!ends)return '';const {a,b}=ends;if(!a||!b)return '';
 const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);if(!len)return '';
 const nx=dy/len,ny=-dx/len,p={x:a.x+nx*30,y:a.y+ny*30},q={x:b.x+nx*30,y:b.y+ny*30};
 let angle=Math.atan2(dy,dx)*180/Math.PI;if(angle>90||angle<-90)angle+=180;
 const line=(x1,y1,x2,y2)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
 const dimensionMm=Math.round(len/PX_PER_METRE*10)*100;
 return `<g fill="none" stroke="#505b48" stroke-width="1.5">${line(a.x,a.y,a.x+nx*40,a.y+ny*40)}${line((ends.sourceB||b).x,(ends.sourceB||b).y,b.x+nx*40,b.y+ny*40)}${line(p.x,p.y,q.x,q.y)}${line(p.x-6,p.y+6,p.x+6,p.y-6)}${line(q.x-6,q.y+6,q.x+6,q.y-6)}<text transform="translate(${(p.x+q.x)/2} ${(p.y+q.y)/2}) rotate(${angle})" y="-7" text-anchor="middle" fill="#505b48" stroke="white" stroke-width="4" paint-order="stroke" font-size="18">${dimensionMm.toLocaleString()} mm</text></g>`;
 }).join('');
 if(dimensionStart){const p=resolveSnap(dimensionStart);if(p)$('#dimensionsLayer').innerHTML+=`<circle cx="${p.x}" cy="${p.y}" r="4.5" fill="white" stroke="#6f7855" stroke-width="1.5"/>`}
}
// A self-contained PDF download; no upload or print service is needed.
function makeImagePdf(jpeg,width,height){
 const enc=new TextEncoder(),parts=[],offsets=[0];let size=0;
 const push=value=>{const bytes=typeof value==='string'?enc.encode(value):value;parts.push(bytes);size+=bytes.length};
 const object=(id,body)=>{offsets[id]=size;push(`${id} 0 obj\n${body}\nendobj\n`)};
 push('%PDF-1.4\n');
 object(1,'<< /Type /Catalog /Pages 2 0 R >>');
 object(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
 object(3,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 1191] /Resources << /XObject << /Plan 4 0 R >> >> /Contents 5 0 R >>');
 offsets[4]=size;push(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);push(jpeg);push('\nendstream\nendobj\n');
 const w=794,h=w*height/width,content=`q ${w} 0 0 ${h} 24 ${(1191-h)/2} cm /Plan Do Q`;
 object(5,`<< /Length ${enc.encode(content).length} >>\nstream\n${content}\nendstream`);
 const xref=size;push('xref\n0 6\n0000000000 65535 f \n');for(let i=1;i<=5;i++)push(`${String(offsets[i]).padStart(10,'0')} 00000 n \n`);
 push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
 return new Blob(parts,{type:'application/pdf'});
}
async function exportPdf(){
 const button=$('#exportPdfButton');button.disabled=true;
 let imageUrl;
 try{
 const clone=svg.cloneNode(true);clone.setAttribute('xmlns',SVG_NS);clone.setAttribute('viewBox','590 20 1480 1810');clone.setAttribute('width','2220');clone.setAttribute('height','2715');
 clone.querySelectorAll('.resize-handle,#drawPreview').forEach(el=>el.remove());
 clone.querySelectorAll('.selected').forEach(el=>el.classList.remove('selected'));
 const style=document.createElementNS(SVG_NS,'style');style.textContent=await(await fetch('styles.css')).text();clone.prepend(style);
 for(const el of clone.querySelectorAll('image')){const href=el.getAttribute('href');if(href&&!href.startsWith('data:')){const blob=await(await fetch(href)).blob();const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob)});el.setAttribute('href',data)}}
 imageUrl=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)],{type:'image/svg+xml'}));
 const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=imageUrl});
 const canvas=document.createElement('canvas');canvas.width=2220;canvas.height=2715;const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0);
 const bytes=Uint8Array.from(atob(canvas.toDataURL('image/jpeg',.96).split(',')[1]),c=>c.charCodeAt(0));
 const url=URL.createObjectURL(makeImagePdf(bytes,canvas.width,canvas.height)),link=document.createElement('a');link.href=url;link.download='Wing-Han-23F-Zoning.pdf';link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);toast('PDF downloaded · A3 portrait');
 }catch(error){console.error(error);toast('PDF export failed — please try again')}finally{if(imageUrl)URL.revokeObjectURL(imageUrl);button.disabled=false}
}
renderAll();registerWebMCP();
