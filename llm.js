export const providers={gemini:'https://generativelanguage.googleapis.com/*',perplexity:'https://api.perplexity.ai/*'};
export function createAI({provider,key,model},signal) {
  return async(prompt,system,json)=>{
    signal?.throwIfAborted();
    if(!key?.trim() || !model?.trim())throw new Error('Nhập API key và model trong phần AI.');
    const text=JSON.stringify(prompt);
    let url,headers={'Content-Type':'application/json'},body;
    if(provider==='gemini') {
      url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model.trim())}:generateContent`;
      headers['x-goog-api-key']=key.trim();
      body={systemInstruction:{parts:[{text:system}]},contents:[{role:'user',parts:[{text}]}],generationConfig:json?{responseMimeType:'application/json'}:{}};
    } else if(provider==='perplexity') {
      url='https://api.perplexity.ai/v1/sonar'; headers.Authorization=`Bearer ${key.trim()}`;
      body={model:model.trim(),messages:[{role:'system',content:system},{role:'user',content:text}]};
      if(json) body.response_format={type:'json_schema',json_schema:{schema:{type:'object',properties:{responses:{type:'array',items:{type:'object',properties:{question_id:{type:'string'},chosen:{type:'array',items:{type:'string'}},answer:{type:'string'}},required:['question_id']}}},required:['responses']}}};
    } else throw new Error('Nhà cung cấp AI không hợp lệ.');
    const response=await fetch(url,{method:'POST',headers,body:JSON.stringify(body),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(120000)]):AbortSignal.timeout(120000)});
    if(!response.ok)throw new Error(`AI HTTP ${response.status}. Kiểm tra API key, model hoặc hạn mức.`);
    const data=await response.json();
    const content=provider==='gemini'?data.candidates?.[0]?.content?.parts?.filter(p=>!p.thought).map(p=>p.text||'').join(''):data.choices?.[0]?.message?.content;
    if(!content)throw new Error('AI không trả về nội dung.');
    if(!json)return content.trim();
    try{return JSON.parse(content.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));}
    catch{throw new Error('AI không trả về JSON hợp lệ.');}
  };
}
