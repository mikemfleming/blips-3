import {Life,patterns} from './life.js';
const life=new Life();let running=false,timer,period=125;
function publish(){const cells=life.cells.slice(),density=life.density();postMessage({cells,density,width:life.size,height:life.height,generation:life.generation},[cells.buffer,density.buffer]);}
function tick(){if(!running)return;life.step();publish();timer=setTimeout(tick,period);}
onmessage=({data:d})=>{if(d.type==='resize')life.resize(d.width,d.height);if(d.type==='init'){life.resize(d.width,d.height);life.clear();const hasText=d.cells instanceof Uint8Array&&d.cells.length===life.cells.length;if(d.density!=null)life.random(Math.random,d.density/100);if(hasText)life.loadText(d.cells,true,d.protection);else if(d.density==null)populateOrganisms();}if(d.type==='play'){running=true;clearTimeout(timer);timer=setTimeout(tick,period);}if(d.type==='pause'){running=false;clearTimeout(timer);}if(d.type==='tempo')period=15000/d.bpm;if(d.type==='random')life.random();if(d.type==='clear')life.clear();if(d.type==='stamp')life.stamp(patterns[d.pattern],d.x,d.y);if(d.type==='paint')life.paint(d.points,d.value);publish();};
// With neither text nor density, retain the normal organism starter composition.
function populateOrganisms(){for(let i=0;i<220;i++)life.stamp(patterns[Object.keys(patterns)[i%6]],Math.floor(Math.random()*(life.size-6)),Math.floor(Math.random()*(life.height-6)));}
