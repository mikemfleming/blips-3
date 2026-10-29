import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseStartupOptions} from '../src/startup.js';
import {Life} from '../src/life.js';
test('startup modes retain defaults and ignore obsolete seed parameters',()=>{
 assert.deepEqual(parseStartupOptions(''),{speed:'hare',sound:'smooth',text:null,density:null});
 assert.deepEqual(parseStartupOptions('?speed=tortoise&sound=smooth&seed=lauren'),{speed:'tortoise',sound:'smooth',text:null,density:null});
 assert.equal(parseStartupOptions('?sound=stabby').sound,'stabby');
 assert.equal(parseStartupOptions('?speed=__proto__&sound=constructor').speed,'hare');
 assert.equal(parseStartupOptions('?speed=turbo&sound=swell').sound,'smooth');
});
test('text and density are parsed independently, including Unicode and empty text',()=>{
 assert.deepEqual(parseStartupOptions('?text=caf%C3%A9+%F0%9F%8C%B1&density=10'),{speed:'hare',sound:'smooth',text:'café 🌱',density:10});
 assert.equal(parseStartupOptions('?text=&density=10').text,'');
 assert.equal(parseStartupOptions('?text=Hello').density,null);
});
test('density accepts percentages and only activates when present',()=>{
 for(const [query,expected] of [['',null],['?density=',50],['?density=no',50],['?density=Infinity',50],['?density=0',0],['?density=100',100],['?density=12.5',12.5],['?density=-5',0],['?density=101',100]])assert.equal(parseStartupOptions(query).density,expected);
});
test('random density respects probability, including empty/full grids',()=>{
 const life=new Life(32);let index=0;life.random(()=>index++/1024,.1);
 assert.equal(life.cells.reduce((n,v)=>n+v,0),103);
 life.random(Math.random,0);assert.ok(life.cells.every(c=>c===0));
 life.random(Math.random,1);assert.ok(life.cells.every(c=>c===1));
});
test('text overlays random cells and protects only letter cells',()=>{
 const life=new Life(32);life.random(Math.random,1);const text=new Uint8Array(32*32);text[100]=1;
 life.loadText(text,true);assert.ok(life.cells.every(c=>c===1));
 assert.equal(life.protection[100],16);assert.equal(life.protection.reduce((n,v)=>n+v,0),16);
 life.step();assert.equal(life.cells[100],1);assert.equal(life.cells[500],0);
});
