import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSlug, extractCourse, pendingItems, formatAnswers, runCourse, processBasicItem} from '../core.js';

test('only accepts a slug or an actual Coursera course URL', () => {
  assert.equal(parseSlug(' https://www.coursera.org/learn/test-course/home/module/1 '), 'test-course');
  assert.equal(parseSlug('test-course'), 'test-course');
  for (const s of ['', 'https://evil.test/learn/test', 'https://coursera.org.evil.test/learn/test', '../test', 'https://www.coursera.org/learn/']) assert.throws(() => parseSlug(s));
});
test('missing course/progress structure fails rather than treating everything as pending', () => {
  assert.throws(() => extractCourse({elements: []}));
  assert.throws(() => pendingItems([{id:'1'}], {elements:[]}));
});
test('completed, locked, failed and disabled categories are not processed', () => {
  const items = [
    {id:'1',contentSummary:{typeName:'lecture'}},
    {id:'2',isLocked:true,contentSummary:{typeName:'lecture'}},
    {id:'3',contentSummary:{typeName:'supplement'}},
    {id:'4',contentSummary:{typeName:'staffGraded'}},
    {id:'5',contentSummary:{typeName:'lecture'}}
  ];
  assert.deepEqual(pendingItems(items, {elements:[{items:{'1':{progressState:'Completed'}}}]}, new Set(['5']), new Set(['lecture','supplement'])).map(x=>x.id), ['3']);
});
test('model output cannot submit missing, unknown or duplicate answers', () => {
  const q = [{id:'p~q',type:'MULTIPLE_CHOICE',options:[{option_id:'a'},{option_id:'b'}]}];
  assert.deepEqual(formatAnswers(q, {responses:[{question_id:'q',chosen:['b']}]}), [{questionId:'p~q',questionType:'MULTIPLE_CHOICE',questionResponse:{multipleChoiceResponse:{chosen:'b'}}}]);
  for (const responses of [[],[{question_id:'q',chosen:['x']}],[{question_id:'q',chosen:['a','b']}],[{question_id:'q',chosen:['a']},{question_id:'q',chosen:['b']}]]) assert.throws(()=>formatAnswers(q,{responses}));
});
test('lecture failure propagates instead of claiming successful completion', async () => {
  const api = async path => { if (path.startsWith('onDemandLecture')) return {elements:[{disableSkippingForward:false}],linked:{'onDemandVideos.v1':[{id:'v'}]}}; throw new Error('HTTP 403'); };
  await assert.rejects(processBasicItem({id:'i',contentSummary:{typeName:'lecture'}},{api,userId:'1',courseId:'c',slug:'s'}), /403/);
});
test('non-skippable video sends play, tracked watchtime, then ended in order', async () => {
  const calls=[];
  await processBasicItem({id:'i',timeCommitment:10000,contentSummary:{typeName:'lecture'}},{userId:'1',courseId:'c',slug:'s',api:async (p,o={})=>{calls.push([p,o]);return {elements:[{disableSkippingForward:true}],linked:{'onDemandVideos.v1':[{id:'v'}]}};}});
  assert.match(calls[1][0], /videoEvents\/play/);
  assert.equal(calls[2][1].body.viewedUpTo, 12000);
  assert.match(calls[3][0], /videoEvents\/ended/);
});
test('runner refreshes locks and verifies completion without repeating failed requests', async () => {
  const done = new Set(); const processed=[]; let rounds=0;
  const scan=async()=>({items:[{id:'a',contentSummary:{typeName:'supplement'}},{id:'b',isLocked:!done.has('a'),contentSummary:{typeName:'supplement'}},{id:'x',contentSummary:{typeName:'supplement'}}],progress:{elements:[{items:Object.fromEntries([...done].map(id=>[id,{progressState:'Completed'}]))}]}});
  const result=await runCourse({scan,types:new Set(['supplement']),process:async item=>{processed.push(item.id); if(item.id==='x')throw new Error('403');done.add(item.id);},onUpdate:()=>rounds++});
  assert.deepEqual(processed,['a','x','b']);
  assert.equal(result.completed,2);
  assert.equal(result.failed,1);
  assert.equal(result.total,3);
  assert.ok(rounds>0);
});
test('stop prevents the next item from being sent', async () => {
  const abort=new AbortController(); const processed=[];
  const scan=async()=>({items:['a','b'].map(id=>({id,contentSummary:{typeName:'supplement'}})),progress:{elements:[{items:{}}]}});
  await assert.rejects(runCourse({scan,types:new Set(['supplement']),signal:abort.signal,process:async item=>{processed.push(item.id);abort.abort();}}), {name:'AbortError'});
  assert.deepEqual(processed,['a']);
});
test('HTTP success without completed progress is reported as pending', async () => {
  const result=await runCourse({scan:async()=>({items:[{id:'a',contentSummary:{typeName:'supplement'}}],progress:{elements:[{items:{}}]}}),types:new Set(['supplement']),process:async()=>{}});
  assert.equal(result.completed,0); assert.equal(result.pending,1);
});
