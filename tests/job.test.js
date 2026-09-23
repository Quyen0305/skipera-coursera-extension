import test from 'node:test';
import assert from 'node:assert/strict';
import {JobController} from '../job.js';
function fixture(extra={}) {
  const done=new Set();const writes=[];
  const transport=()=>({api:async(path,options={})=>{
    if(path==='adminUserPermissions.v1')return {elements:[{id:'1'}]};
    if(path==='onDemandCourseMaterials.v2/')return {elements:[{id:'c'}],linked:{'onDemandCourseMaterialItems.v2':['a','b'].map(id=>({id,name:id,contentSummary:{typeName:'supplement'}}))}};
    if(path.startsWith('onDemandCoursesProgress'))return {elements:[{items:Object.fromEntries([...done].map(id=>[id,{progressState:'Completed'}]))}]};
    writes.push(options.body.itemId);done.add(options.body.itemId);return {};
  }});
  return {job:new JobController({transport,wait:async()=>{},...extra}),writes};
}
test('background continues independently, publishes progress and never persists API key',async()=>{
  const states=[];const {job,writes}=fixture({publish:s=>states.push(s)});
  await job.load({tabId:1,slug:'test'});
  await job.start({types:['supplement'],ai:{key:'secret-key'}});
  assert.deepEqual(writes,['a','b']);
  assert.equal(job.state.stats.completed,2);
  assert.equal(job.state.phase,'done');
  assert.equal(JSON.stringify(states).includes('secret-key'),false);
});
test('a second start is rejected while the background job is active',async()=>{
  let release;const wait=()=>new Promise(r=>{release=r;});
  const {job}=fixture({wait});await job.load({tabId:1,slug:'test'});
  const task=job.start({types:['supplement']});
  await assert.rejects(job.start({types:['supplement']}),/đang chạy/);
  job.stop();
  for(let i=0;i<20&&!release;i++)await Promise.resolve();
  release?.();await task;
  assert.equal(job.state.phase,'stopped');
});
test('restoring an interrupted worker never automatically repeats submissions',()=>{
  const {job,writes}=fixture({initial:{phase:'running',busy:true,loaded:{slug:'test'},logs:[]}});
  assert.equal(job.state.busy,false);assert.equal(job.state.phase,'interrupted');
  assert.equal(job.state.loaded,null);assert.deepEqual(writes,[]);
});
