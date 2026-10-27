import {test} from 'node:test';import assert from 'node:assert/strict';
import {centerTextInk} from '../src/text-grid.js';
test('actual letter ink is centered horizontally and vertically despite font padding',()=>{
 const width=20,height=15,rgba=new Uint8ClampedArray(width*height*4);
 for(let y=2;y<7;y++)for(let x=9;x<12;x++)rgba[(y*width+x)*4+3]=255;
 const cells=centerTextInk(rgba,width,height,32),points=[];
 cells.forEach((v,i)=>{if(v)points.push([i%32,Math.floor(i/32)]);});
 assert.equal(points.length,15);
 assert.deepEqual([Math.min(...points.map(p=>p[0])),Math.max(...points.map(p=>p[0]))],[14,16]);
 assert.deepEqual([Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[1]))],[13,17]);
});
test('blank text yields no cells and antialiasing is converted into binary cells',()=>{
 const rgba=new Uint8ClampedArray(4*4*4);
 assert.ok(centerTextInk(rgba,4,4,8).every(n=>n===0));
 rgba[3]=127;rgba[7]=128;
 const cells=centerTextInk(rgba,4,4,8);
 assert.equal(cells.reduce((n,v)=>n+v,0),1);assert.ok(cells.every(n=>n===0||n===1));
});

import {centerTextLayers} from '../src/text-grid.js';
test('centering moves character lifetimes with their ink cells',()=>{
 const rgba=new Uint8ClampedArray(10*10*4),lifetimes=new Uint16Array(100);
 rgba[(2*10+6)*4+3]=255;lifetimes[2*10+6]=16;
 rgba[(2*10+8)*4+3]=255;lifetimes[2*10+8]=20;
 const result=centerTextLayers(rgba,10,10,16,lifetimes);
 assert.equal(result.cells[7*16+6],1);assert.equal(result.protection[7*16+6],16);
 assert.equal(result.cells[7*16+8],1);assert.equal(result.protection[7*16+8],20);
});
