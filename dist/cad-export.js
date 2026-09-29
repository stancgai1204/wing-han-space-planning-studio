(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.CadDxf=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const crlf='\r\n';
 const pair=(code,value)=>`${code}${crlf}${value}${crlf}`;
 const number=value=>Number(value.toFixed(6)).toString();
 const aciByColor={aebd9c:83,c9d5b7:93,adc4ca:143,d7c49d:43,c9b7a0:33,a9c3cc:153,d5b7aa:23,b8b1cb:193,aab7cf:163,d0c8b6:33,bdaec7:203,b7c8c0:123,d4c3b6:33,c7c3a8:53,dfe3d8:253};
 const aci=hex=>{const key=String(hex).replace('#','').toLowerCase();if(aciByColor[key])return aciByColor[key];const value=parseInt(key,16);if(!Number.isFinite(value))return 254;const r=(value>>16&255)/255,g=(value>>8&255)/255,b=(value&255)/255,max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;if(delta<.08)return max>.75?253:max>.45?252:250;let hue=max===r?60*((g-b)/delta%6):max===g?60*((b-r)/delta+2):60*((r-g)/delta+4);if(hue<0)hue+=360;return 10+(Math.round(hue/15)%24)*10+3};
 const safe=value=>String(value).replace(/[\r\n]+/g,' ').replace(/[{}]/g,'').trim();
 const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
 const insideTriangle=(p,a,b,c)=>cross(a,b,p)>=-1e-7&&cross(b,c,p)>=-1e-7&&cross(c,a,p)>=-1e-7;
 function cleanPolygon(points){
  const cleaned=[];
  for(const point of points){const previous=cleaned[cleaned.length-1];if(!previous||Math.hypot(point.x-previous.x,point.y-previous.y)>.001)cleaned.push(point)}
  if(cleaned.length>2&&Math.hypot(cleaned[0].x-cleaned.at(-1).x,cleaned[0].y-cleaned.at(-1).y)<.001)cleaned.pop();
  return cleaned;
 }
 function triangulate(points){
  const polygon=cleanPolygon(points);
  if(polygon.length<3)return [];
  const signed=polygon.reduce((sum,p,index)=>{const next=polygon[(index+1)%polygon.length];return sum+p.x*next.y-next.x*p.y},0);
  const vertices=(signed<0?polygon.slice().reverse():polygon.slice()).map((point,index)=>({point,index})),triangles=[];
  let guard=vertices.length*vertices.length;
  while(vertices.length>3&&guard--){let clipped=false;
   for(let i=0;i<vertices.length;i++){const previous=vertices[(i+vertices.length-1)%vertices.length].point,current=vertices[i].point,next=vertices[(i+1)%vertices.length].point;if(cross(previous,current,next)<=1e-7)continue;
    if(vertices.some((candidate,index)=>index!==i&&index!==(i+vertices.length-1)%vertices.length&&index!==(i+1)%vertices.length&&insideTriangle(candidate.point,previous,current,next)))continue;
    triangles.push([previous,current,next]);vertices.splice(i,1);clipped=true;break;
   }
   if(!clipped)break;
  }
  if(vertices.length===3)triangles.push(vertices.map(vertex=>vertex.point));
  return triangles;
 }
 function solid(triangle,color){const [a,b,c]=triangle;return pair(0,'SOLID')+pair(8,'ZONING-FILL')+pair(62,color)+pair(10,number(a.x))+pair(20,number(a.y))+pair(30,0)+pair(11,number(b.x))+pair(21,number(b.y))+pair(31,0)+pair(12,number(c.x))+pair(22,number(c.y))+pair(32,0)+pair(13,number(c.x))+pair(23,number(c.y))+pair(33,0);}
 function polyline(layer,points,color,closed=true,width=0){return pair(0,'POLYLINE')+pair(8,layer)+pair(62,color)+pair(66,1)+pair(70,closed?1:0)+pair(10,0)+pair(20,0)+pair(30,0)+points.map(point=>pair(0,'VERTEX')+pair(8,layer)+pair(10,number(point.x))+pair(20,number(point.y))+pair(30,0)+(width?pair(40,number(width))+pair(41,number(width)):'')).join('')+pair(0,'SEQEND')+pair(8,layer);}
 function text(layer,value,x,y,height,color){return pair(0,'TEXT')+pair(8,layer)+pair(62,color)+pair(10,number(x))+pair(20,number(y))+pair(30,0)+pair(40,number(height))+pair(1,safe(value))+pair(50,0)+pair(41,1)+pair(7,'STANDARD')+pair(72,1)+pair(11,number(x))+pair(21,number(y))+pair(31,0)+pair(73,2);}
 function buildColorZoningDxf({boundary,boundaries,zones,walls=[],pxPerMetre}){
  const zoningLimits=Array.isArray(boundaries)&&boundaries.length?boundaries:(Array.isArray(boundary)?[boundary]:[]);
  if(!zoningLimits.length||zoningLimits.some(limit=>!Array.isArray(limit)||limit.length<3)||!Array.isArray(zones)||!Number.isFinite(pxPerMetre)||pxPerMetre<=0)throw new Error('Invalid CAD export geometry');
  const limitPoints=zoningLimits.flat(),originX=Math.min(...limitPoints.map(point=>point.x)),originY=Math.max(...limitPoints.map(point=>point.y));
  const cadPoint=point=>({x:(point.x-originX)/pxPerMetre*1000,y:(originY-point.y)/pxPerMetre*1000});
  const cadBoundaries=zoningLimits.map(limit=>limit.map(cadPoint)),cadZones=zones.map(zone=>({...zone,points:zone.points.map(cadPoint)})),cadWalls=walls.map(wall=>({...wall,points:wall.points.map(cadPoint)}));
  const allPoints=[...cadBoundaries.flat(),...cadZones.flatMap(zone=>zone.points),...cadWalls.flatMap(wall=>wall.points)],maxX=Math.max(...allPoints.map(point=>point.x)),maxY=Math.max(...allPoints.map(point=>point.y));
  let dxf=pair(0,'SECTION')+pair(2,'HEADER')+pair(9,'$ACADVER')+pair(1,'AC1009')+pair(9,'$MEASUREMENT')+pair(70,1)+pair(9,'$EXTMIN')+pair(10,0)+pair(20,0)+pair(30,0)+pair(9,'$EXTMAX')+pair(10,number(maxX))+pair(20,number(maxY))+pair(30,0)+pair(0,'ENDSEC')+pair(0,'SECTION')+pair(2,'ENTITIES');
  for(const zone of cadZones){const color=aci(zone.color);for(const triangle of triangulate(zone.points))dxf+=solid(triangle,color)}
  for(const cadBoundary of cadBoundaries)dxf+=polyline('ZONING-LIMIT',cadBoundary,83);
  for(const zone of cadZones){if(zone.points.length<3)continue;dxf+=polyline('ZONING-BOUNDARY',zone.points,82);if(zone.showLabel===false)continue;const xs=zone.points.map(point=>point.x),ys=zone.points.map(point=>point.y),cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2,width=Math.max(...xs)-Math.min(...xs),height=Math.max(115,Math.min(250,width/11));dxf+=text('ZONING-TEXT',String(zone.name).toUpperCase(),cx,cy+height*.7,height,253)+text('ZONING-TEXT',`${zone.area} m2 NET`,cx,cy-height*.7,height*.72,253)}
  for(const wall of cadWalls)if(wall.points.length>1)dxf+=polyline('WALL-100MM',wall.points,7,false,100);
  return dxf+pair(0,'ENDSEC')+pair(0,'EOF');
 }
 return {buildColorZoningDxf};
});
