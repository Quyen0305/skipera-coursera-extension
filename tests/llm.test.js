import test from 'node:test';
import assert from 'node:assert/strict';
import {createAI} from '../llm.js';
test('Gemini JSON response excludes thought parts and API key stays in header',async t=>{
  let captured;
  t.mock.method(globalThis,'fetch',async(url,options)=>{captured={url,options};return new Response(JSON.stringify({candidates:[{content:{parts:[{thought:true,text:'internal'},{text:'{"responses":[]}'}]}}]}),{status:200});});
  assert.deepEqual(await createAI({provider:'gemini',model:'test-model',key:'test-secret'})({q:'Q'},'S',true),{responses:[]});
  assert.equal(captured.url.includes('test-secret'),false);
  assert.equal(captured.options.headers['x-goog-api-key'],'test-secret');
  assert.equal(JSON.parse(captured.options.body).generationConfig.responseMimeType,'application/json');
});
test('Perplexity uses the documented Sonar endpoint with structured output',async t=>{
  let captured;
  t.mock.method(globalThis,'fetch',async(url,options)=>{captured={url,options};return new Response(JSON.stringify({choices:[{message:{content:'{"responses":[]}'}}]}),{status:200});});
  assert.deepEqual(await createAI({provider:'perplexity',model:'sonar-pro',key:'test-secret'})({},'S',true),{responses:[]});
  assert.equal(captured.url,'https://api.perplexity.ai/v1/sonar');
  assert.equal(JSON.parse(captured.options.body).response_format.type,'json_schema');
});
test('AI errors do not expose provider response or API key in UI',async t=>{
  t.mock.method(globalThis,'fetch',async()=>new Response('sensitive upstream body',{status:401}));
  await assert.rejects(createAI({provider:'gemini',model:'m',key:'secret'})({},'S',false),e=>e.message.includes('401')&&!e.message.includes('sensitive')&&!e.message.includes('secret'));
});
