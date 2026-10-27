import {test} from 'node:test';import assert from 'node:assert/strict';import {Life,patterns} from '../src/life.js';import {level,pitches} from '../src/audio.js';
test('block remains stable and blinker has period two',()=>{const l=new Life(64);l.stamp(patterns.Block,8,8);l.stamp(patterns.Blinker,20,20);const a=l.cells.slice();l.step();assert.equal(l.cells[19*64+21],1);assert.equal(l.cells[20*64+20],0);l.step();assert.deepEqual(l.cells,a);});
test('wrapping corners count as neighbors',()=>{const l=new Life(32);l.cells[31*32+31]=l.cells[31*32]=l.cells[31]=1;l.step();assert.equal(l.cells[0],1);});
test('512 grid aggregates into 32 square music regions',()=>{const l=new Life();l.cells.fill(1);assert.equal(l.density().length,1024);assert.ok(l.density().every(n=>n===256));l.cells.fill(0);l.cells[16*512+16]=1;assert.equal(l.density()[33],1);});
test('volume silence, soft onset, saturation and pitch range',()=>{assert.equal(level(0,32),0);assert.ok(level(1,32)>0&&level(1,32)<.1);assert.equal(level(32,32),1);assert.equal(level(256,32),1);assert.equal(pitches.length,32);assert.equal(pitches[0],84);assert.equal(pitches[31],48);});
import {AudioEngine} from '../src/audio.js';
function engine(){const a=new AudioEngine();a.ctx={currentTime:0};a.next=.04;a.voices=Array.from({length:32},()=>{const calls=[];return {calls,cancelScheduledValues:t=>calls.push(['cancel',t]),cancelAndHoldAtTime:t=>calls.push(['hold',t]),setValueAtTime:(v,t)=>calls.push(['set',v,t]),linearRampToValueAtTime:(v,t)=>calls.push(['ramp',v,t]),exponentialRampToValueAtTime:(v,t)=>calls.push(['decay',v,t]),setTargetAtTime:(v,t,c)=>calls.push(['target',v,t,c])};});return a;}
test('trigger articulates and schedules visual events on audio time',()=>{const a=engine();a.mode='trigger';a.density[0]=32;a.schedule();assert.deepEqual(a.events,[{time:.04,column:0}]);assert.ok(a.voices[0].calls.some(c=>c[0]==='ramp'&&c[1]===1));assert.ok(a.voices[0].calls.some(c=>c[0]==='decay'));});
test('swell holds adjacent active steps and fades on empty',()=>{const a=engine();a.mode='swell';a.density[0]=32;a.density[1]=16;a.schedule();a.ctx.currentTime=.1;a.schedule();a.ctx.currentTime=.23;a.schedule();const calls=a.voices[0].calls;assert.equal(calls.length,3);assert.ok(calls.every(c=>c[0]==='target'));assert.equal(calls[0][1],1);assert.ok(calls[1][1]>0&&calls[1][1]<1);assert.equal(calls[2][1],0);a.pause();assert.equal(a.events.length,0);assert.equal(calls.at(-1)[1],0);});

import {MIX_GAIN} from '../src/audio.js';
test('full-polyphony mix reserves headroom',()=>{assert.ok(pitches.length*MIX_GAIN<.8);});
test('late scheduler skips expired steps instead of bursting envelopes',()=>{const a=engine();a.ctx.currentTime=2;a.schedule();assert.ok(a.events.length<=1);assert.ok(a.events.every(e=>e.time>=2.005));assert.ok(a.next>=2.1);});
test('pause holds the live envelope before fading',()=>{const a=engine();a.pause();assert.deepEqual(a.voices[0].calls,[['hold',0],['target',0,0,.015]]);});

test('pencil paints a 3 by 3 area, clips at edges, and erases',()=>{
 const life=new Life(32);life.paint([[10,10]],1);
 assert.equal(life.cells.reduce((a,b)=>a+b),9);
 for(let y=9;y<=11;y++)for(let x=9;x<=11;x++)assert.equal(life.cells[y*32+x],1);
 life.paint([[10,10]],0);assert.equal(life.cells.reduce((a,b)=>a+b),0);
 life.paint([[0,0]],1);assert.equal(life.cells.reduce((a,b)=>a+b),4);
 assert.equal(life.cells[31],0);assert.equal(life.cells[31*32],0);
});

test('painted cells survive exactly N protected generations, then follow Conway',()=>{
 const life=new Life(32);life.paint([[10,10]],1,3);const center=10*32+10;
 for(let generation=1;generation<=3;generation++){
  life.step();assert.equal(life.cells[center],1);assert.equal(life.protection[center],3-generation);
 }
 // Isolate a cell whose protection expired; ordinary Conway now kills it.
 life.cells.fill(0);life.cells[center]=1;life.step();assert.equal(life.cells[center],0);
});
test('N=0 is ordinary Conway and protected cells still contribute neighbors',()=>{
 const ordinary=new Life(32);ordinary.paint([[10,10]],1,0);ordinary.step();assert.equal(ordinary.cells[10*32+10],0);
 const life=new Life(32);life.paint([[10,10]],1,2);life.step();
 assert.equal(life.cells[10*32+8],1);assert.equal(life.cells[10*32+10],1);
});
test('erase, clear, and random remove protection; repaint refreshes it',()=>{
 const life=new Life(32);const center=10*32+10;life.paint([[10,10]],1,4);life.step();
 life.paint([[10,10]],1,7);assert.equal(life.protection[center],7);
 life.paint([[10,10]],0,8);assert.equal(life.cells[center],0);assert.equal(life.protection[center],0);
 life.paint([[10,10]],1,5);life.clear();assert.equal(life.generation,0);assert.ok(life.protection.every(n=>n===0));
 life.paint([[10,10]],1,5);life.random();assert.ok(life.protection.every(n=>n===0));
});
test('internal protection duration is bounded',()=>{
 const life=new Life(32);life.paint([[10,10]],1,100000);assert.equal(life.protection[10*32+10],1000);
 life.paint([[10,10]],1,-3);assert.equal(life.protection[10*32+10],0);
});

import {PENCIL_LIFETIME} from '../src/life.js';
test('pencil defaults to 16 protected generations, then follows normal Conway',()=>{
 assert.equal(PENCIL_LIFETIME,16);const life=new Life(32);life.paint([[10,10]],1);const center=10*32+10;
 for(let i=1;i<=16;i++){life.step();assert.equal(life.cells[center],1);assert.equal(life.protection[center],16-i);}
 life.step();assert.equal(life.cells[center],0);
});

test('loaded text cells survive 16 generations, then resume Conway; erase clears protection',()=>{
 const life=new Life(32),mask=new Uint8Array(32*32);mask[10*32+10]=1;life.loadText(mask);
 for(let i=1;i<=16;i++){life.step();assert.equal(life.cells[10*32+10],1);}
 life.step();assert.equal(life.cells[10*32+10],0);
 life.loadText(mask);life.paint([[10,10]],0);assert.equal(life.protection[10*32+10],0);
 assert.equal(life.cells.reduce((n,v)=>n+v,0),0);
});

test('text cells with longer character lifetimes remain protected after earlier ones expire',()=>{
 const life=new Life(32),mask=new Uint8Array(1024),lifetimes=new Uint16Array(1024);
 const first=5*32+5,last=20*32+20;mask[first]=mask[last]=1;lifetimes[first]=16;lifetimes[last]=20;
 life.loadText(mask,false,lifetimes);
 for(let i=1;i<=21;i++){life.step();assert.equal(life.cells[first],i<=16?1:0);assert.equal(life.cells[last],i<=20?1:0);}
});
