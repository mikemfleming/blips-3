import {test} from 'node:test';import assert from 'node:assert/strict';
import {AudioEngine,STEREO_WIDTH,spatialX} from '../src/audio.js';
test('fixed spatial placement follows the scanner at 66 percent of Blips 2 range',()=>{
 assert.equal(STEREO_WIDTH,.66);assert.equal(spatialX(0),-1.32);assert.equal(spatialX(31),1.32);
 assert.equal(spatialX(15.5),0);assert.equal(spatialX(-1),0);
});
test('spatial position is scheduled on the note clock and recenters when paused',()=>{
 const audio=new AudioEngine();audio.ctx={currentTime:0};let position,centered=false;
 audio.spatialController={position:(column,time)=>{position={column,time};},center:()=>{centered=true;}};
 audio.scheduleStep(.04,12);assert.deepEqual(position,{column:12,time:.04});
 audio.pause();assert.equal(centered,true);assert.deepEqual(audio.events,[]);
});
