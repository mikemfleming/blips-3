import {Life,patterns} from './life.js';
const life=new Life();let running=false,timer,period=125;
function publish(){const cells=life.cells.slice(),density=life.density();postMessage({cells,density,generation:life.generation},[cells.buffer,density.buffer]);}
function tick(){if(!running)return;life.step();publish();timer=setTimeout(tick,period);}
onmessage=({data:d})=>{if(d.type==='play'){running=true;clearTimeout(timer);timer=setTimeout(tick,period);}if(d.type==='pause'){running=false;clearTimeout(timer);}if(d.type==='tempo')period=15000/d.bpm;if(d.type==='random')life.random();if(d.type==='clear'){life.cells.fill(0);life.generation=0;}if(d.type==='stamp')life.stamp(patterns[d.pattern],d.x,d.y);if(d.type==='paint')for(const [x,y]of d.points)life.cells[y*life.size+x]=d.value;publish();};
// Scatter small isolated organisms as an audible, evolving starting composition.
for(let i=0;i<220;i++)life.stamp(patterns[Object.keys(patterns)[i%6]],Math.floor(Math.random()*506),Math.floor(Math.random()*506));publish();
