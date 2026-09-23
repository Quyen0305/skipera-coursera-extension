// This function is serialized by chrome.scripting; keep it self-contained.
export async function pageRequest(url, options, timeoutMs=30000) {
  const target=new URL(url);
  if(target.origin!=='https://www.coursera.org' || !(target.pathname.startsWith('/api/') || target.pathname==='/graphql-gateway')) return {ok:false,status:0,error:'Địa chỉ API không hợp lệ.'};
  if(globalThis.location?.origin!==target.origin) return {ok:false,status:0,error:'Tab Coursera đã chuyển trang. Hãy tải lại khóa học.'};
  const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),timeoutMs);
  try {
    const response=await fetch(url,{...options,credentials:'include',signal:controller.signal,redirect:'error'});
    const text=await response.text(); let data=null;
    if(text) {try{data=JSON.parse(text);}catch{return {ok:false,status:response.status,error:'Coursera không trả về JSON. Kiểm tra đăng nhập hoặc trang xác minh.'};}}
    return {ok:response.ok,status:response.status,data,error:response.ok?null:`Coursera HTTP ${response.status}`};
  } catch(error) { return {ok:false,status:0,error:error.name==='AbortError'?'Yêu cầu quá 30 giây; trạng thái chưa xác định. Hãy tải lại tiến độ.':'Không kết nối được Coursera hoặc tab đã đóng.'}; }
  finally{clearTimeout(timer);}
}
export function decodeResponse(result) {
  if(!result?.ok) {
    const error=new Error(result?.error || 'Tab Coursera không phản hồi.');
    error.fatal=[0,401,403,429].includes(result?.status??0); throw error;
  }
  const body=result.data;
  const errors=(Array.isArray(body)?body:[body]).flatMap(d=>d?.errors||[]);
  if(errors.length) throw new Error(errors.map(e=>e.message||'GraphQL error').join('; ').slice(0,400));
  return body;
}
export function createTransport(tabId, signal) {
  async function request(path,{method='GET',params={},body}={},graphql=false) {
    signal?.throwIfAborted();
    const tab=await chrome.tabs.get(tabId);
    if(!tab.url?.startsWith('https://www.coursera.org/')) throw Object.assign(new Error('Hãy giữ tab Coursera mở và tải lại khóa học.'),{fatal:true});
    const url=new URL(graphql?'/graphql-gateway':`/api/${path}`,'https://www.coursera.org');
    for(const [key,value] of Object.entries(params))url.searchParams.set(key,String(value));
    const headers={'accept':'application/json','x-requested-with':'XMLHttpRequest','x-coursera-application':'ondemand'};
    if(body!==undefined)headers['content-type']='application/json';
    for(const [cookieName,header] of [['CSRF3-Token','x-csrf3-token'],['CSRF2-Token','x-csrf2-token'],['csrftoken','x-csrftoken']]) {
      const cookie=await chrome.cookies.get({url:'https://www.coursera.org',name:cookieName});
      if(cookie)headers[header]=cookie.value;
    }
    signal?.throwIfAborted();
    let results;
    try {results=await chrome.scripting.executeScript({target:{tabId},func:pageRequest,args:[url.href,{method,headers,...(body!==undefined?{body:JSON.stringify(body)}:{})}]});}
    catch {throw Object.assign(new Error('Không liên lạc được tab Coursera. Hãy giữ tab mở và tải lại khóa học.'),{fatal:true});}
    signal?.throwIfAborted();
    return decodeResponse(results?.[0]?.result);
  }
  return {
    api:(path,options)=>request(path,options),
    graphql:async(operationName,query,variables)=>{
      const data=await request('',{method:'POST',params:{opname:operationName},body:{operationName,query,variables}},true);
      if(!data?.data)throw new Error('Thiếu dữ liệu GraphQL.');
      return data.data;
    }
  };
}
export function sleep(ms,signal) {
  signal?.throwIfAborted();
  return new Promise((resolve,reject)=>{
    const stop=()=>{clearTimeout(timer);reject(signal.reason);};
    const timer=setTimeout(()=>{signal?.removeEventListener('abort',stop);resolve();},ms);
    signal?.addEventListener('abort',stop,{once:true});
  });
}
