import test from 'node:test';
import assert from 'node:assert/strict';
import {readQuestions, solveAssessment} from '../assessment.js';
test('unsupported question stops assessment rather than submitting blanks',()=>{
  assert.throws(()=>readQuestions([{__typename:'Submission_FileUploadQuestion',partId:'x'}]),/hỗ trợ/);
});
test('text blocks are skipped and HTML prompts are understood',()=>{
  assert.deepEqual(readQuestions([{__typename:'Submission_TextBlock'}, {__typename:'Submission_TextExactMatchQuestion',partId:'x',questionSchema:{prompt:{value:'<b>Hi</b>'}}}]),[{id:'x',type:'TEXT_EXACT_MATCH',text:'<b>Hi</b>',options:[]}]);
});
test('saved draft ID is used for submission and no retry occurs without feedback',async()=>{
  const mutations=[];
  const state={allowedAction:'RESUME_DRAFT',attempts:{inProgressAttempt:{id:'attempt',draft:{id:'old',parts:[{__typename:'Submission_MultipleChoiceQuestion',partId:'q',questionSchema:{prompt:{cmlValue:'Q'},options:[{optionId:'a',display:{cmlValue:'A'}}]}}]}}}};
  const ctx={courseId:'c',maxAttempts:3,sleep:async()=>{},log:()=>{},askAI:async()=>({responses:[{question_id:'q',chosen:['a']}]}),graphql:async(op,query,variables)=>{
    if(op==='QueryState')return {SubmissionState:{queryState:state}};
    if(op==='AssignmentFeedback')return {SubmissionState:{queryState:{feedback:null}}};
    mutations.push([op,variables]);
    if(op==='Submission_SaveResponses')return {Submission_SaveResponses:{__typename:'Submission_SaveResponsesSuccess',submissionState:{attempts:{inProgressAttempt:{draft:{id:'new'}}}}}};
    if(op==='Submission_SubmitLatestDraft')return {Submission_SubmitLatestDraft:{__typename:'Submission_SubmitLatestDraftSuccess'}};
    throw new Error('Unexpected operation');
  }};
  await assert.rejects(solveAssessment({id:'i'},ctx),/phản hồi/);
  assert.equal(mutations.length,2);
  assert.equal(mutations[1][1].input.submissionId,'new');
});
