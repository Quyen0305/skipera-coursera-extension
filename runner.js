import {parseSlug,pendingItems} from './core.js';
import {providers} from './llm.js';
const $=id=>document.getElementById(id);
let state=null,requesting=false,initialized=false;
const labels={idle:'Sẵn sàng',loading:'Đang tải',ready:'Đã tải',running:'Đang chạy',stopping:'Đang dừng',stopped:'Đã dừng',done:'Đã kết thúc',error:'Có lỗi',interrupted:'Bị gián đoạn'};
const videoTypes=['lecture'];
const assignmentTypes=['ungradedAssignment','staffGraded'];
async function send(type,options){const response=await chrome.runtime.sendMessage({type,options});if(!response?.ok)throw new Error(response?.error||'Không kết nối được tác vụ nền.');return response.state;}
function matching(){try{return state?.loaded?.slug===parseSlug($('slug').value)&&state.loaded.tabId===Number($('courseTab').value);}catch{return false;}}
function render(next=state){
  if(!next)return;state=next;const busy=state.busy||requesting;
  $('state').textContent=labels[state.phase]||state.phase;
  $('completed').textContent=state.stats?.completed??'—';$('total').textContent=state.stats?.total??'—';
  $('progress').max=state.stats?.total||1;$('progress').value=state.stats?.completed||0;
  $('current').textContent=state.current||'';$('notice').textContent=state.message;
  $('log').textContent=state.logs?.join('\n')||'Chưa có tác vụ.';
  for(const el of document.querySelectorAll('input,select,#load,#allowAI,#saveKey,#deleteKey'))el.disabled=busy;
  $('skipVideo').disabled=busy||!matching();$('doAssignments').disabled=busy||!matching();
  $('stop').hidden=!state.busy;$('stop').disabled=!state.busy||state.phase==='stopping';
  const snapshot=state.loaded?.snapshot;
  const count=types=>pendingItems(snapshot.items,snapshot.progress,new Set(),new Set(types)).length;
  $('selected').textContent=snapshot?`${count(videoTypes)} video · ${count(assignmentTypes)} bài tập`:'';
}
async function command(type,options){
  requesting=true;render();
  try{render(await send(type,options));}
  catch(e){$('notice').textContent=e.message;if(type==='start'&&options?.types?.includes('staffGraded'))$('options').open=true;}
  finally{requesting=false;const notice=$('notice').textContent;render();$('notice').textContent=notice;}
}
async function load(){await command('load',{tabId:Number($('courseTab').value),slug:$('slug').value});}
function savePrefs(){return chrome.storage.local.set({popupPrefs:{provider:$('provider').value,model:$('model').value,attempts:$('attempts').value}});}
async function restoreKey(provider){
  const slot=`apiKey_${provider}`;
  const saved=(await chrome.storage.local.get(slot))[slot];
  if($('provider').value!==provider)return;
  $('apiKey').value=typeof saved==='string'?saved:'';
  $('keyStatus').textContent=saved?'Đã dùng API key lưu trên trình duyệt.':'Chưa lưu API key.';
}
$('saveKey').addEventListener('click',async()=>{
  const provider=$('provider').value,key=$('apiKey').value.trim();
  if(!key){$('keyStatus').textContent='Nhập API key trước khi lưu.';return;}
  try{await chrome.storage.local.set({[`apiKey_${provider}`]:key});await savePrefs();$('keyStatus').textContent='Đã lưu API key trên trình duyệt.';}
  catch{$('keyStatus').textContent='Không lưu được API key. Hãy thử lại.';}
});
$('deleteKey').addEventListener('click',async()=>{
  const provider=$('provider').value;
  try{await chrome.storage.local.remove(`apiKey_${provider}`);if($('provider').value===provider){$('apiKey').value='';$('keyStatus').textContent='Đã xóa key của nhà cung cấp này.';}}
  catch{$('keyStatus').textContent='Không xóa được API key. Hãy thử lại.';}
});
$('load').addEventListener('click',load);
$('skipVideo').addEventListener('click',()=>command('start',{types:videoTypes}));
$('doAssignments').addEventListener('click',()=>command('start',{types:assignmentTypes,maxAttempts:Number($('attempts').value),ai:{provider:$('provider').value,model:$('model').value,key:$('apiKey').value}}));
$('stop').addEventListener('click',()=>command('stop'));
$('slug').addEventListener('input',()=>{render();if(!matching())$('notice').textContent='Bấm Tải để cập nhật khóa học.';});
$('courseTab').addEventListener('change',()=>{try{$('slug').value=parseSlug($('courseTab').selectedOptions[0]?.dataset.url);}catch{$('slug').value='';}render();});
$('provider').addEventListener('change',()=>{$('model').value=$('provider').value==='gemini'?'gemini-3.1-flash-lite':'sonar-pro';$('apiKey').value='';$('aiStatus').textContent='';restoreKey($('provider').value).catch(()=>{$('keyStatus').textContent='Không đọc được key đã lưu.';});savePrefs().catch(()=>{});});
for(const id of ['model','attempts'])$(id).addEventListener('change',()=>savePrefs().catch(()=>{}));
$('allowAI').addEventListener('click',async()=>{try{const yes=await chrome.permissions.request({origins:[providers[$('provider').value]]});$('aiStatus').textContent=yes?'Đã cho phép kết nối.':'Chưa cấp quyền AI.';}catch(e){$('aiStatus').textContent=e.message;}});
chrome.storage.onChanged.addListener((changes,area)=>{if(initialized&&area==='session'&&changes.jobState?.newValue)render(changes.jobState.newValue);});
async function init(){
  await chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'});
  const prefs=(await chrome.storage.local.get('popupPrefs')).popupPrefs;
  if(prefs){if(providers[prefs.provider])$('provider').value=prefs.provider;if(prefs.model)$('model').value=prefs.model;if(['1','2','3'].includes(prefs.attempts))$('attempts').value=prefs.attempts;}
  await restoreKey($('provider').value);
  state=await send('state');
  const tabs=await chrome.tabs.query({url:'https://www.coursera.org/*'});
  const active=(await chrome.tabs.query({active:true,currentWindow:true}))[0];
  for(const tab of tabs){const option=document.createElement('option');option.value=tab.id;option.textContent=tab.title||tab.url;option.dataset.url=tab.url;$('courseTab').append(option);}
  const selected=state.busy?state.loaded?.tabId:tabs.some(t=>t.id===active?.id)?active.id:state.loaded?.tabId;
  if(tabs.some(t=>t.id===selected))$('courseTab').value=String(selected);
  if(!tabs.length){const option=document.createElement('option');option.value='';option.textContent='Chưa mở Coursera';$('courseTab').append(option);}
  if(state.busy&&state.loaded)$('slug').value=state.loaded.slug;
  else{try{$('slug').value=parseSlug($('courseTab').selectedOptions[0]?.dataset.url||'');}catch{$('slug').value=state.loaded?.slug||'';}}
  // Fetch once more after async UI initialization, so no state transition is missed.
  state=await send('state');initialized=true;render(state);
  if(!state.busy&&!matching()&&$('slug').value&&tabs.length)await load();
  else if(!tabs.length)$('notice').textContent='Mở khóa học tại www.coursera.org rồi mở lại popup.';
}
init().catch(e=>{$('notice').textContent=e.message;});
