import {parseSlug,extractCourse,completedIds,processBasicItem,runCourse} from './core.js';
import {createTransport,sleep} from './transport.js';
import {solveAssessment,solveDiscussion} from './assessment.js';
import {createAI} from './llm.js';
import {materialParams} from './materials.js';
// The service worker owns this controller, independently of the popup.
export class JobController {
  constructor({initial,publish=()=>{},transport=createTransport,wait=sleep,keepAlive=()=>()=>{}}={}) {
    this.publish=publish;this.transport=transport;this.wait=wait;this.keepAlive=keepAlive;
    this.state={phase:'idle',busy:false,loaded:null,stats:null,message:'Mở khóa học Coursera rồi bấm Tải.',current:'',logs:[],...initial};
    if(this.state.busy)Object.assign(this.state,{busy:false,phase:'interrupted',loaded:null,message:'Tác vụ đã gián đoạn. Tải lại tiến độ trước khi chạy tiếp.'});
  }
  emit(){this.publish(structuredClone(this.state));}
  log(text){this.state.logs.push(`[${new Date().toLocaleTimeString('vi-VN')}] ${text}`);this.state.logs=this.state.logs.slice(-100);}
  stop(){if(this.controller){this.controller.abort();this.state.phase='stopping';this.state.message='Đang dừng; yêu cầu đã gửi có thể vẫn hoàn tất.';this.emit();}}
  async load({tabId,slug}) {
    if(this.state.busy)throw new Error('Một tác vụ đang chạy.');
    slug=parseSlug(slug);if(!Number.isInteger(tabId)||tabId<=0)throw new Error('Mở tab Coursera và đăng nhập trước.');
    this.controller=new AbortController();const signal=this.controller.signal;
    Object.assign(this.state,{busy:true,phase:'loading',loaded:null,stats:null,current:'',logs:[],message:'Đang tải khóa học…'});this.emit();
    const release=this.keepAlive();
    try {
      const api=this.transport(tabId,signal).api;
      const user=await api('adminUserPermissions.v1',{params:{q:'my'}});
      const userId=String(user.elements?.[0]?.id||'');
      if(!/^\d+$/.test(userId))throw new Error('Không tìm thấy phiên đăng nhập Coursera.');
      const data=extractCourse(await api('onDemandCourseMaterials.v2/',{params:{...materialParams,slug}}));
      const progress=await api(`onDemandCoursesProgress.v1/${encodeURIComponent(userId+'~'+data.courseId)}`,{params:{fields:'gradedAssignmentGroupProgress'}});
      signal.throwIfAborted();const done=completedIds(progress);
      this.state.loaded={slug,tabId,userId,courseId:data.courseId,snapshot:{items:data.items,progress}};
      this.state.stats={completed:data.items.filter(i=>done.has(i.id)).length,total:data.items.length};
      this.state.phase='ready';this.state.message='Chọn Skip video hoặc Làm bài tập. Bài tập cần API key AI.';this.log(`Đã tải ${slug}.`);
    }catch(e){this.state.phase=signal.aborted?'stopped':'error';this.state.message=signal.aborted?'Đã dừng tải khóa học.':e.message;this.log(this.state.message);}
    finally{release();this.controller=null;this.state.busy=false;this.emit();}
  }
  async start({types=[],ai={},maxAttempts=1}) {
    if(this.state.busy)throw new Error('Một tác vụ đang chạy.');
    if(!this.state.loaded)throw new Error('Tải khóa học trước.');
    if(!types.length)throw new Error('Chọn ít nhất một tác vụ.');
    const run=this.state.loaded;
    this.controller=new AbortController();const signal=this.controller.signal;
    Object.assign(this.state,{busy:true,phase:'running',message:'Bạn có thể đóng popup. Giữ tab Coursera mở.',current:'',logs:[]});this.emit();
    const release=this.keepAlive();
    try {
      const ctx={...run,...this.transport(run.tabId,signal),signal,maxAttempts,askAI:createAI(ai,signal),sleep:ms=>this.wait(ms,signal),log:text=>{this.log(text);this.emit();}};
      const user=await ctx.api('adminUserPermissions.v1',{params:{q:'my'}});
      if(String(user.elements?.[0]?.id)!==run.userId)throw new Error('Tài khoản đã đổi. Tải lại khóa học.');
      const scan=async()=>{
        const data=extractCourse(await ctx.api('onDemandCourseMaterials.v2/',{params:{...materialParams,slug:run.slug}}));
        if(data.courseId!==run.courseId)throw new Error('Khóa học thay đổi; hãy tải lại.');
        const progress=await ctx.api(`onDemandCoursesProgress.v1/${encodeURIComponent(run.userId+'~'+run.courseId)}`,{params:{fields:'gradedAssignmentGroupProgress'}});
        return run.snapshot={items:data.items,progress};
      };
      const process=async item=>{
        const kind=item.contentSummary?.typeName;
        if(kind==='discussionPrompt')await solveDiscussion(item,ctx);
        else if(['staffGraded','ungradedAssignment'].includes(kind))await solveAssessment(item,ctx);
        else await processBasicItem(item,ctx);
        await this.wait(800,signal);
      };
      const stats=await runCourse({scan,process,types:new Set(types),signal,onUpdate:update=>{
        if(update.stats)this.state.stats=update.stats;
        if(update.item){this.state.current=update.item.name||update.item.id;this.log(`${this.state.current}: ${update.status==='running'?'đang xử lý':update.status==='sent'?'đã gửi yêu cầu':update.error}`);}
        this.emit();
      }});
      this.state.phase='done';this.state.current='';this.state.message=`Hoàn tất ${stats.completed}/${stats.total} mục. Còn ${stats.pending} mục; ${stats.failed} mục lỗi.`;
    }catch(e){this.state.phase=signal.aborted?'stopped':'error';this.state.message=signal.aborted?'Đã dừng. Bấm Tải để kiểm tra lại tiến độ.':e.message;}
    finally{release();this.controller=null;this.state.busy=false;this.log(this.state.message);this.emit();}
  }
}
