// Adapted from Skipera 1.1.0 (MIT). See LICENSE.skipera.
export function parseSlug(value) {
  let slug = String(value).trim();
  if (/^https?:/i.test(slug)) {
    const url = new URL(slug);
    if (url.protocol !== 'https:' || !['coursera.org','www.coursera.org'].includes(url.hostname)) throw new Error('Hãy dùng URL Coursera hợp lệ.');
    slug = url.pathname.match(/^\/learn\/([^/]+)/)?.[1] || '';
  }
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(slug)) throw new Error('Nhập đường dẫn /learn/... hoặc slug khóa học.');
  return slug;
}
export function extractCourse(data) {
  const courseId = data?.elements?.[0]?.id;
  const items = data?.linked?.['onDemandCourseMaterialItems.v2'];
  if (!courseId || !Array.isArray(items)) throw new Error('Không đọc được khóa học. Kiểm tra đăng ký học hoặc API Coursera đã thay đổi.');
  return {courseId, items};
}
export function completedIds(progress) {
  const items = progress?.elements?.[0]?.items;
  if (!items || typeof items !== 'object' || Array.isArray(items)) throw new Error('Không đọc được tiến độ; đã dừng để tránh xử lý lại.');
  return new Set(Object.entries(items).filter(([,v])=>v?.progressState==='Completed').map(([id])=>id));
}
export function pendingItems(items, progress, attempted=new Set(), types=new Set()) {
  const done=completedIds(progress);
  return items.filter(i=>!done.has(i.id) && !i.isLocked && i.lockedStatus!=='LOCKED' && !attempted.has(i.id) && types.has(i.contentSummary?.typeName));
}
export const answerTypes = {
  MULTIPLE_CHOICE:['multipleChoiceResponse','chosen'], CHECKBOX:['checkboxResponse','chosen'],
  CHECKBOX_REFLECT:['checkboxReflectResponse','chosen'], TEXT_REFLECT:['textReflectResponse','answer'], TEXT_EXACT_MATCH:['textExactMatchResponse','answer']
};
export function formatAnswers(questions, result) {
  if (!Array.isArray(result?.responses)) throw new Error('AI không trả về danh sách đáp án.');
  const mapped=new Map();
  for (const answer of result.responses) {
    const exact=questions.filter(q=>q.id===answer.question_id);
    const matches=exact.length?exact:questions.filter(q=>q.id.split('~').at(-1)===answer.question_id);
    if(matches.length!==1 || mapped.has(matches[0].id)) throw new Error('AI trả về ID câu hỏi không hợp lệ hoặc trùng lặp.');
    mapped.set(matches[0].id,answer);
  }
  return questions.map(q=>{
    const a=mapped.get(q.id), keys=answerTypes[q.type];
    if(!a || !keys) throw new Error('Thiếu đáp án hoặc loại câu hỏi chưa hỗ trợ.');
    let value;
    if(keys[1]==='chosen') {
      if(!Array.isArray(a.chosen) || !a.chosen.length || new Set(a.chosen).size!==a.chosen.length || a.chosen.some(id=>!q.options.some(o=>o.option_id===id)) || (q.type==='MULTIPLE_CHOICE' && a.chosen.length!==1)) throw new Error('AI chọn đáp án không hợp lệ.');
      value=q.type==='MULTIPLE_CHOICE'?a.chosen[0]:a.chosen;
    } else {
      if(typeof a.answer!=='string' || !a.answer.trim()) throw new Error('AI trả về câu trả lời trống.');
      value=a.answer.trim();
    }
    return {questionId:q.id,questionType:q.type,questionResponse:{[keys[0]]:{[keys[1]]:value}}};
  });
}
export async function processBasicItem(item, ctx) {
  const {api,userId,courseId,slug}=ctx, id=encodeURIComponent(item.id);
  const uid=encodeURIComponent(userId), cid=encodeURIComponent(courseId);
  switch(item.contentSummary.typeName) {
    case 'lecture': {
      const metadata=await api(`onDemandLectureVideos.v1/${cid}~${id}`,{params:{includes:'video',fields:'disableSkippingForward,startMs,endMs'}});
      const info=metadata.elements?.[0];
      if(typeof info?.disableSkippingForward!=='boolean') throw new Error('Thiếu metadata video.');
      const base=`opencourse.v1/user/${uid}/course/${encodeURIComponent(slug)}/item/${id}/lecture/videoEvents/`;
      const event={method:'POST',params:{autoEnroll:false},body:{contentRequestBody:{}}};
      if(info.disableSkippingForward) {
        const track=metadata.linked?.['onDemandVideos.v1']?.[0]?.id;
        if(!track || !Number.isFinite(item.timeCommitment)) throw new Error('Thiếu thời lượng hoặc mã video.');
        await api(base+'play',event);
        const progressId=`${userId}~${courseId}~${track}`;
        await api(`onDemandVideoProgresses.v1/${encodeURIComponent(progressId)}`,{method:'PUT',body:{videoProgressId:progressId,viewedUpTo:item.timeCommitment+2000}});
      }
      await api(base+'ended',event); return;
    }
    case 'supplement':
      await api('onDemandSupplementCompletions.v1',{method:'POST',body:{courseId,itemId:item.id,userId:Number(userId)}}); return;
    case 'ungradedWidget': {
      const data=await api(`onDemandWidgetSessions.v1/${uid}~${cid}~${id}`,{params:{fields:'session,sessionId'}});
      const sessionId=data.elements?.[0]?.sessionId;
      if(!sessionId) throw new Error('Không lấy được phiên widget.');
      await api(`onDemandWidgetProgress.v1/${uid}~${cid}~${id}`,{method:'PUT',body:{sessionId,progressState:'Completed'}}); return;
    }
    case 'ungradedLti':
      await api('rest/v1/lti/ungradedLaunches',{method:'POST',body:{courseId,itemId:item.id,learnerId:Number(userId),markItemCompleted:true}}); return;
    case 'coach': {
      const data=await api('onDemandSessionMemberships.v1/',{params:{q:'activeByUserAndCourse',userId,courseId,includes:'sessions',fields:'onDemandSessions.v1(branchId)'}});
      const branchId=data.linked?.['onDemandSessions.v1']?.[0]?.branchId;
      if(!branchId) throw new Error('Không tìm thấy phiên Coach.');
      const result=await ctx.graphql('UpdateCoachItemProgress',`mutation UpdateCoachItemProgress($courseId: ID!, $branchId: ID!, $itemId: ID!, $progressState: CoachItem_ProgressState!) { CoachItemProgress_UpdateCoachItemProgress(input: {courseId: $courseId, branchId: $branchId, itemId: $itemId, progressState: $progressState}) { _ __typename } }`,{courseId,branchId,itemId:item.id,progressState:'COMPLETED'});
      if(result?.CoachItemProgress_UpdateCoachItemProgress?._!==true) throw new Error('Coursera chưa xác nhận Coach.'); return;
    }
    default: throw new Error('Loại mục chưa hỗ trợ.');
  }
}
export async function runCourse({scan,process,types,signal,onUpdate=()=>{}}) {
  const attempted=new Set(),failed=new Set();
  while(true) {
    signal?.throwIfAborted();
    const snapshot=await scan();
    const done=completedIds(snapshot.progress);
    const completed=snapshot.items.filter(i=>done.has(i.id)).length;
    const stats={completed,total:snapshot.items.length,failed:failed.size,pending:snapshot.items.length-completed};
    onUpdate({stats,snapshot});
    const pending=pendingItems(snapshot.items,snapshot.progress,attempted,types);
    if(!pending.length) return stats;
    for(const item of pending) {
      signal?.throwIfAborted();
      attempted.add(item.id);
      onUpdate({item,status:'running'});
      try {await process(item); onUpdate({item,status:'sent'});}
      catch(error) {
        if(signal?.aborted || error.name==='AbortError') throw error;
        failed.add(item.id); onUpdate({item,status:'error',error:error.message});
        if(error.fatal) throw error;
      }
    }
  }
}
