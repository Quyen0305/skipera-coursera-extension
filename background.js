import {JobController} from './job.js';
import {providers} from './llm.js';
let saves=Promise.resolve();
function publish(state){
  saves=saves.catch(()=>{}).then(()=>chrome.storage.session.set({jobState:state}));
  chrome.action.setBadgeText({text:state.busy?'…':''}).catch(()=>{});
  chrome.action.setBadgeBackgroundColor({color:'#355f24'}).catch(()=>{});
}
const ready=(async()=>{
  await chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'});
  const {jobState}=await chrome.storage.session.get('jobState');
  const job=new JobController({initial:jobState,publish,keepAlive:()=>{
    const timer=setInterval(()=>chrome.runtime.getPlatformInfo().catch(()=>{}),20000);
    return ()=>clearInterval(timer);
  }});
  job.emit();return job;
})();
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
  if(sender.id!==chrome.runtime.id || sender.url!==chrome.runtime.getURL('runner.html'))return;
  (async()=>{
    const job=await ready;
    if(message.type==='state')return {ok:true,state:job.state};
    if(message.type==='stop'){job.stop();return {ok:true,state:job.state};}
    if(!['load','start'].includes(message.type))throw new Error('Lệnh không hợp lệ.');
    if(job.state.busy)throw new Error('Một tác vụ đang chạy.');
    if(message.type==='start'){
      if(message.options?.types?.some(t=>['staffGraded','ungradedAssignment','discussionPrompt'].includes(t))){
        const ai=message.options.ai;
        if(!ai?.key?.trim()||!ai.model?.trim()||!providers[ai.provider])throw new Error('Nhập API key và model trong Tùy chọn.');
        if(!await chrome.permissions.contains({origins:[providers[ai.provider]]}))throw new Error('Bấm Cho phép kết nối AI trong Tùy chọn.');
      }
    }
    // Reply immediately: closing the popup must not cancel the operation.
    const task=message.type==='load'?job.load(message.options):job.start(message.options);
    task.catch(error=>{job.state.message=error.message;job.emit();});
    return {ok:true,state:job.state};
  })().then(respond,error=>respond({ok:false,error:error.message}));
  return true;
});
