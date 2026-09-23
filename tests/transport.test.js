import test from 'node:test';
import assert from 'node:assert/strict';
import {pageRequest, decodeResponse} from '../transport.js';
test('transport rejects other origins before making a network request', async()=>{
  assert.equal((await pageRequest('https://evil.test/api/',{},100)).ok,false);
});
test('authentication and rate limit failures stop the whole run',()=>{
  for(const status of [401,403,429]) assert.throws(()=>decodeResponse({ok:false,status,error:'HTTP '+status}),e=>e.fatal===true);
});
test('GraphQL errors in an HTTP 200 response are failures',()=>{
  assert.throws(()=>decodeResponse({ok:true,status:200,data:{errors:[{message:'Denied'}]}}), /Denied/);
  assert.deepEqual(decodeResponse({ok:true,status:204,data:null}),null);
});
