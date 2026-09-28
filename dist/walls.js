// 100 mm snapped architectural polyline walls.
const WALL_THICKNESS_MM=100;
const WALL_THICKNESS_PX=PX_PER_METRE*WALL_THICKNESS_MM/1000;
const wallLayer=$('#wallsLayer');
const wallControls=$('#wallControls');
state.walls=state.walls||[];
let wallDraft=[];
let wallHover=null;

function wallPoint(point){return {x:snapZoneX(point.x),y:snapZoneY(point.y)}}
function wallPath(points){return points.length?`M${points.map(point=>`${point.x} ${point.y}`).join('L')}`:''}
function cleanWallPoints(points){return points.filter((point,index)=>!index||Math.hypot(point.x-points[index-1].x,point.y-points[index-1].y)>=GRID_SIZE*.5)}

function renderWalls(){
 const walls=(state.walls||[]).map(wall=>{const selected=state.selectedKind==='wall'&&state.selectedId===wall.id,path=wallPath(wall.points);return `<g class="plan-wall ${selected?'selected':''}" data-wall-id="${wall.id}"><title>100 mm wall · click to select</title><path d="${path}" fill="none" stroke="#353a35" stroke-width="${WALL_THICKNESS_PX}" stroke-linecap="square" stroke-linejoin="miter" pointer-events="none"/><path data-wall-id="${wall.id}" d="${path}" fill="none" stroke="transparent" stroke-width="18" pointer-events="stroke"/>${selected?wall.points.map(point=>`<circle cx="${point.x}" cy="${point.y}" r="4" fill="white" stroke="#667653" stroke-width="1.5" pointer-events="none"/>`).join(''):''}</g>`}).join('');
 const preview=wallDraft.length?`<g class="wall-preview" pointer-events="none"><path d="${wallPath(wallHover?[...wallDraft,wallHover]:wallDraft)}" fill="none" stroke="#657254" stroke-width="${WALL_THICKNESS_PX}" stroke-dasharray="12 8" stroke-linecap="square" stroke-linejoin="miter"/>${wallDraft.map(point=>`<circle cx="${point.x}" cy="${point.y}" r="4" fill="white" stroke="#657254" stroke-width="1.5"/>`).join('')}</g>`:'';
 wallLayer.innerHTML=walls+preview;
}

function renderWallControls(){
 const active=state.canvasTool==='wall',selected=state.selectedKind==='wall'&&state.walls.some(w=>w.id===state.selectedId);
 wallControls.innerHTML=`<button class="tool-chip ${active?'active':''}" data-wall-action="start">+ Wall</button>${active?'<span class="wall-hint">100 mm · click points</span><button class="tool-chip" data-wall-action="finish">Finish</button><button class="tool-chip" data-wall-action="cancel">Cancel</button>':''}${selected&&!active?'<button class="tool-chip" data-wall-action="delete">Delete wall</button>':''}`;
}

function startWallDraft(){
 if(typeof doorPlacement!=='undefined')doorPlacement=false;
 wallDraft=[];wallHover=null;state.selectedId=null;state.selectedKind=null;setCanvasTool('wall');renderWalls();
 if(typeof renderPlanDoors==='function')renderPlanDoors();
 toast('Wall tool · 100 mm snap · click points · Enter or double-click to finish');
}
function cancelWallDraft(){wallDraft=[];wallHover=null;setCanvasTool('select');renderWalls();toast('Wall drawing cancelled')}
function finishWallDraft(){
 const points=cleanWallPoints(wallDraft);
 if(points.length<2)return cancelWallDraft();
 checkpoint();const wall={id:`wall${nextId++}`,thicknessMm:WALL_THICKNESS_MM,points};state.walls.push(wall);
 wallDraft=[];wallHover=null;state.selectedKind='wall';state.selectedId=wall.id;setCanvasTool('select');renderAll();toast('100 mm wall created');
}
function addWallPoint(point){const snapped=wallPoint(point),last=wallDraft.at(-1);if(last&&Math.hypot(snapped.x-last.x,snapped.y-last.y)<GRID_SIZE*.5)return;wallDraft.push(snapped);wallHover=snapped;renderWalls()}

wallControls.addEventListener('click',event=>{const action=event.target.closest('[data-wall-action]')?.dataset.wallAction;if(!action)return;if(action==='start')startWallDraft();if(action==='finish')finishWallDraft();if(action==='cancel')cancelWallDraft();if(action==='delete')deleteSelected()});
svg.addEventListener('pointerdown',event=>{
 if(event.button!==0)return;
 if(typeof doorPlacement!=='undefined'&&doorPlacement)return;
 if(state.canvasTool==='wall'){event.preventDefault();event.stopImmediatePropagation();addWallPoint(clientToSvg(event));return}
 const hit=event.target.closest('[data-wall-id]');if(!hit)return;
 event.preventDefault();event.stopImmediatePropagation();selectItem('wall',hit.dataset.wallId);
},true);
svg.addEventListener('pointermove',event=>{if(state.canvasTool!=='wall'||!wallDraft.length)return;wallHover=wallPoint(clientToSvg(event));renderWalls()},true);
svg.addEventListener('dblclick',event=>{if(state.canvasTool!=='wall')return;event.preventDefault();event.stopImmediatePropagation();finishWallDraft()},true);
document.addEventListener('keydown',event=>{if(state.canvasTool!=='wall')return;if(event.key==='Enter'){event.preventDefault();event.stopImmediatePropagation();finishWallDraft()}if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();cancelWallDraft()}},true);

renderWalls();
renderWallControls();
