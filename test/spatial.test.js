import {test} from 'node:test';import assert from 'node:assert/strict';
import {AudioEngine,STEREO_WIDTH,spatialX} from '../src/audio.js';
test('spatial placement meets at center on wrap and retains stereo inside the sweep',()=>{
 assert.equal(STEREO_WIDTH,.66);assert.ok(Math.abs(spatialX(0))===0);assert.equal(spatialX(31),0);
 for(let col=0;col<32;col++)assert.ok(Math.abs(spatialX(col)+spatialX(31-col))<1e-12);
 assert.ok(Math.abs(spatialX(1))<Math.abs(spatialX(2)));
 assert.ok(Math.abs(spatialX(2))<Math.abs(spatialX(3)));
 assert.equal(spatialX(4),(4*4/31-2)*STEREO_WIDTH);
 assert.ok(spatialX(4)<0);assert.ok(spatialX(27)>0);
 assert.equal(spatialX(15.5),0);assert.equal(spatialX(-1),0);
});
test('spatial position is scheduled on the note clock and recenters when paused',()=>{
 const audio=new AudioEngine();audio.ctx={currentTime:0};let position,centered=false;
 audio.spatialController={position:(column,time)=>{position={column,time};},center:()=>{centered=true;}};
 audio.scheduleStep(.04,12);assert.deepEqual(position,{column:12,time:.04});
 audio.pause();assert.equal(centered,true);assert.deepEqual(audio.events,[]);
});
