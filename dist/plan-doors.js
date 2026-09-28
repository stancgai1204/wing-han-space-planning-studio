// Doors snap to either zoning edges or user-drawn wall segments.
const doorLayer=document.createElementNS(SVG_NS,'g');doorLayer.id='doorsLayer';$('#planWorld').append(doorLayer);
const doorControls=$('#doorControls');
state.doors=state.doors||[];let doorDrag=null,doorPlacement=false;

function doorSegment(d){
 if(d.wallId){const wall=(state.walls||[]).find(w=>w.id===d.wallId);if(!wall)return null;return {a:wall.points[d.segment],b:wall.points[d.segment+1],kind:'wall'}}
 const zone=state.zones.find(z=>z.id===d.zoneId);if(!zone)return null;const points=zonePolygon(zone);return {a:points[d.edge],b:points[(d.edge+1)%points.length],kind:'zone'};
}
function doorEdge(d){
 const segment=doorSegment(d);if(!segment?.a||!segment?.b)return null;const {a,b}=segment,length=Math.hypot(b.x-a.x,b.y-a.y);if(length<1)return null;
 const width=Math.min(d.widthMm/1000*PX_PER_METRE,length),offset=Math.max(0,Math.min(length-width,d.t*length));
 return {...segment,length,width,x:a.x+(b.x-a.x)*offset/length,y:a.y+(b.y-a.y)*offset/length,angle:Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI};
}
function nearestDoorAnchor(point,a,b,anchor){
 const dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy;if(l2<1)return null;const length=Math.sqrt(l2),rawT=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/l2)),offset=Math.max(0,Math.min(length,snap(rawT*length))),t=offset/length,distance=Math.hypot(point.x-a.x-dx*t,point.y-a.y-dy*t);return {...anchor,t,distance};
}
function snapDoor(point,zoneId=null){
 let best=null;
 if(!zoneId)for(const wall of state.walls||[])for(let segment=0;segment<wall.points.length-1;segment++){const candidate=nearestDoorAnchor(point,wall.points[segment],wall.points[segment+1],{target:'wall',wallId:wall.id,segment});if(candidate&&(!best||candidate.distance<best.distance))best=candidate}
 for(const zone of state.zones){if(zoneId&&zone.id!==zoneId)continue;const points=zonePolygon(zone);points.forEach((a,edge)=>{const candidate=nearestDoorAnchor(point,a,points[(edge+1)%points.length],{target:'zone',zoneId:zone.id,edge});if(candidate&&(!best||candidate.distance<best.distance))best=candidate})}
 return best;
}
function setDoorAnchor(door,anchor){delete door.zoneId;delete door.edge;delete door.wallId;delete door.segment;door.t=anchor.t;if(anchor.target==='wall'){door.wallId=anchor.wallId;door.segment=anchor.segment}else{door.zoneId=anchor.zoneId;door.edge=anchor.edge}}

function renderPlanDoors(){
 doorLayer.innerHTML=(state.doors||[]).map(d=>{const e=doorEdge(d);if(!e)return '';const selected=state.selectedKind==='door'&&state.selectedId===d.id,w=e.width,cut=e.kind==='wall'?WALL_THICKNESS_PX+3:7;return `<g data-plan-door="${d.id}" transform="translate(${e.x} ${e.y}) rotate(${e.angle})" style="cursor:move"><title>Door · ${Math.round(w/PX_PER_METRE*1000)} mm · drag along a wall or zoning edge</title><path d="M0 0H${w}" stroke="white" stroke-width="${cut}" stroke-linecap="butt"/><g transform="translate(${d.flipX?w:0} 0) scale(${d.flipX?-1:1} ${d.flipY?-1:1})"><rect x="-5" y="-5" width="${w+10}" height="${w+10}" fill="transparent"/><path d="M0 0V${w}M${w} 0A${w} ${w} 0 0 1 0 ${w}" fill="none" stroke="${selected?'#51683b':'#937346'}" stroke-width="${selected?3:2}"/><circle r="${selected?5:3}" fill="#937346"/></g></g>`}).join('');
 const d=state.selectedKind==='door'?state.doors.find(d=>d.id===state.selectedId):null;
 doorControls.innerHTML=`<button class="tool-chip ${doorPlacement?'active':''}" data-door-action="add">+ Door</button>${doorPlacement?'<span style="font-size:11px">Click a wall or zoning edge</span><button class="tool-chip" data-door-action="cancel">Cancel</button>':''}${d?`<label style="font-size:11px">Width mm <input id="planDoorWidth" aria-label="Door width mm" type="number" min="300" step="100" value="${d.widthMm}" style="width:68px"/></label><button class="tool-chip" data-door-action="flipX">Flip left / right</button><button class="tool-chip" data-door-action="flipY">Flip up / down</button><button class="tool-chip" data-door-action="delete">Delete door</button>`:''}`;
}
function startPlanDoor(){if(typeof cancelWallDraft==='function'&&state.canvasTool==='wall')cancelWallDraft();setCanvasTool('select');doorPlacement=true;svg.style.cursor='crosshair';renderPlanDoors();toast('Click a wall or zoning boundary to place the door')}
doorControls.addEventListener('click',event=>{const action=event.target.closest('[data-door-action]')?.dataset.doorAction;if(!action)return;if(action==='add')return startPlanDoor();if(action==='cancel'){doorPlacement=false;updateCanvasCursor()}const d=state.doors.find(d=>d.id===state.selectedId);if(d&&['flipX','flipY','delete'].includes(action)){checkpoint();if(action==='delete'){state.doors=state.doors.filter(x=>x.id!==d.id);state.selectedId=null}else d[action]=!d[action]}renderPlanDoors()});
doorControls.addEventListener('change',event=>{if(event.target.id!=='planDoorWidth')return;const d=state.doors.find(d=>d.id===state.selectedId),value=+event.target.value;if(!d||!Number.isFinite(value))return;checkpoint();const e=doorEdge(d),maxWidth=Math.floor(e.length/PX_PER_METRE*10)*100;d.widthMm=Math.min(maxWidth,Math.max(300,Math.round(value/100)*100));renderPlanDoors()});
svg.addEventListener('pointerdown',event=>{if(event.button!==0)return;const target=event.target.closest('[data-plan-door]');if(!target&&!doorPlacement)return;event.preventDefault();event.stopImmediatePropagation();const point=clientToSvg(event);
 if(doorPlacement){const anchor=snapDoor(point);if(!anchor||anchor.distance>24/svg.getScreenCTM().a)return toast('Click close to a wall or zoning boundary');checkpoint();const door={id:'door'+nextId++,widthMm:900,flipX:false,flipY:false};setDoorAnchor(door,anchor);state.doors.push(door);state.selectedId=door.id;state.selectedKind='door';doorPlacement=false;updateCanvasCursor()}else{state.selectedId=target.dataset.planDoor;state.selectedKind='door';checkpoint();doorDrag=state.selectedId;svg.setPointerCapture(event.pointerId)}renderZones();renderWalls();renderPlanDoors();},true);
svg.addEventListener('pointermove',event=>{if(!doorDrag)return;event.stopImmediatePropagation();const anchor=snapDoor(clientToSvg(event)),door=state.doors.find(d=>d.id===doorDrag);if(anchor&&door){setDoorAnchor(door,anchor);renderPlanDoors()}},true);
svg.addEventListener('pointerup',event=>{if(!doorDrag)return;event.stopImmediatePropagation();doorDrag=null;if(svg.hasPointerCapture(event.pointerId))svg.releasePointerCapture(event.pointerId)},true);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&doorPlacement){doorPlacement=false;renderPlanDoors();updateCanvasCursor()}},true);

// Initial door positions match the circulation-facing zoning edges.
if(!state.doors.length)for(const [type,side,t] of [['Family Office 01','right',.75],['Family Office 02','right',.7],['Family Office 03','right',.75],['Showers + Washrooms','top',.55],['Karaoke','left',.85],['Conference Room','top',.82]]){const zone=state.zones.find(z=>z.type===type);if(!zone)continue;const point=side==='right'?{x:zone.x+zone.w,y:zone.y+zone.h*t}:side==='left'?{x:zone.x,y:zone.y+zone.h*t}:{x:zone.x+zone.w*t,y:zone.y};const anchor=snapDoor(point,zone.id);if(!anchor)continue;const door={id:'door'+nextId++,widthMm:900,flipX:false,flipY:false};setDoorAnchor(door,anchor);state.doors.push(door)}
renderPlanDoors();
