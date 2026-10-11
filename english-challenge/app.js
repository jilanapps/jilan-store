/* Jilan English Challenge - App Logic */
'use strict';
/* ---------- storage ---------- */
const DB={
 get(k,d){try{const v=localStorage.getItem('jec_'+k);return v?JSON.parse(v):d;}catch(e){return d;}},
 set(k,v){try{localStorage.setItem('jec_'+k,JSON.stringify(v));}catch(e){}}
};
/* ---------- state ---------- */
let S={
 settings:DB.get('settings',{theme:'light',lang:'en',goal:10,font:16}),
 learned:DB.get('learned',{}),       // word -> true
 fav:DB.get('fav',{}),               // word -> true
 needPractice:DB.get('needPractice',{}),
 streak:DB.get('streak',{days:{},count:0,longest:0}),
 grammarDone:DB.get('grammarDone',{}),
 quizHist:DB.get('quizHist',[]),
 speakDone:DB.get('speakDone',{}),
 cats:DB.get('cats',null),
};
/* ---------- i18n ---------- */
const T={
 en:{home:"Home",words:"Words",cards:"Flashcards",quiz:"Quiz",grammar:"Grammar",speak:"Speaking",progress:"Progress",settings:"Settings",dailyWords:"Today's 10 Words",continue:"Continue Learning",dailyQuiz:"Daily Quiz",speakBtn:"Speaking Practice",grammarBtn:"Grammar Lesson",streak:"Day Streak",wordsLearned:"Words Learned",viewAll:"View All",markLearned:"Learned ✓",markUnlearn:"Mark Unlearned",listen:"🔊 Listen",fav:"⭐ Favorite",unfav:"⭐ Favorited",reveal:"Reveal Meaning",iknow:"I Know ✓",needPrac:"Need Practice",search:"Search words...",noRes:"No results",settingsT:"Settings",theme:"Theme",light:"Light",dark:"Dark",lang:"Language",goal:"Daily Goal (words)",fontSize:"Font Size",reset:"Reset All Progress",resetConf:"Are you sure? All progress will be deleted!",yes:"Yes",no:"Cancel",about:"About",privacy:"Privacy",back:"← Back",next:"Next →",finish:"Finish",score:"Score",correct:"Correct!",wrong:"Wrong!",retryWrong:"Retry Incorrect",playAgain:"Play Again",easy:"Easy",medium:"Medium",hard:"Hard",mixed:"Mixed",startQuiz:"Start Quiz",chooseLevel:"Choose difficulty",excellent:"Excellent! 🎉",good:"Good job! 👍",keepTrying:"Keep trying! 💪",explanation:"Explanation",yourAns:"Your answer",correctAns:"Correct answer",history:"Quiz History",noHist:"No quizzes yet",totalQ:"Questions",pct:"%",date:"Date",level:"Level",lessonsDone:"Lessons Completed",quizzesTaken:"Quizzes Taken",speakDone:"Speaking Done",weeklyCal:"This Week",badges:"Badges",goalDone:"Daily goal complete! 🎯",wordsLeft:"words left today",tapToFlip:"Tap card to flip",en2ur:"English → Urdu",ur2en:"Urdu → English",revision:"Revision Mode",allCards:"All Cards",shuffle:"Shuffle",prev:"← Prev",nextC:"Next →",of:"of",dialogue:"Dialogue",phrases:"Useful Phrases",tips:"Tips",practice:"Practice",exampleAns:"Example Answer",markDone:"Mark as Done ✓",done:"Done ✓",catAll:"All",listenWord:"Listen",listenEx:"Listen example",syn:"Synonyms",ant:"Antonyms",example:"Example",meaningUr:"Urdu Meaning",meaningRm:"Roman Urdu",levelB:"Beginner",levelI:"Intermediate",levelA:"Advanced",dayStreak:"day streak",best:"Best",total:"Total",dict:"Dictionary",noWords:"No words found",learnedFilter:"Learned",favFilter:"Favorites",allFilter:"All",practiceFilter:"Need Practice",ttsNA:"Text-to-speech not available on this device.",copied:"Copied!",share:"Share",close:"Close",results:"Results",avgTime:"",accuracy:"Accuracy",avgReact:"",playAgain2:"Play Again",categories:"Categories",recent:"Recent",welcome:"Welcome to Jilan English Challenge!",tagline:"Roz 10 alfaaz seekhein — Learn 10 words daily!",startLearning:"Start Learning",continueReading:"Continue",bookLib:"",speakPractice:"Speaking Practice",grammarCourse:"Grammar Course",flashcards:"Flashcards",quizZone:"Quiz Zone",wordBank:"Word Bank",dailyGoal:"Daily Goal",wordsToday:"words today"},
 ur:{home:"ہوم",words:"الفاظ",cards:"فلیش کارڈز",quiz:"کوئز",grammar:"گرامر",speak:"بول چال",progress:"پیش رفت",settings:"ترتیبات",dailyWords:"آج کے 10 الفاظ",continue:"جاری رکھیں",dailyQuiz:"روزانہ کوئز",speakBtn:"بولنے کی مشق",grammarBtn:"گرامر سبق",streak:"دن مسلسل",wordsLearned:"سیکھے گئے الفاظ",viewAll:"سب دیکھیں",markLearned:"یاد ہوگیا ✓",markUnlearn:"ان یاد کریں",listen:"🔊 سنیں",fav:"⭐ پسندیدہ",unfav:"⭐ پسندیدہ ہے",reveal:"مطلب دیکھیں",iknow:"آتا ہے ✓",needPrac:"مشق چاہیے",search:"الفاظ تلاش کریں...",noRes:"کوئی نتیجہ نہیں",settingsT:"ترتیبات",theme:"تھیم",light:"روشن",dark:"گہرا",lang:"زبان",goal:"روزانہ ہدف (الفاظ)",fontSize:"فونٹ سائز",reset:"تمام پیش رفت مٹائیں",resetConf:"کیا آپ واقعی تمام پیش رفت مٹانا چاہتے ہیں؟",yes:"جی ہاں",no:"منسوخ",about:"ایپ کے بارے میں",privacy:"پرائیویسی",back:"← واپس",next:"اگلا →",finish:"ختم",score:"اسکور",correct:"صحیح!",wrong:"غلط!",retryWrong:"غلط جواب دہرائیں",playAgain:"دوبارہ کھیلیں",easy:"آسان",medium:"درمیانہ",hard:"مشکل",mixed:"مکس",startQuiz:"کوئز شروع کریں",chooseLevel:"مشکل چنیں",excellent:"بہترین! 🎉",good:"شاباش! 👍",keepTrying:"کوشش جاری رکھیں! 💪",explanation:"وضاحت",yourAns:"آپ کا جواب",correctAns:"صحیح جواب",history:"کوئز کی تاریخ",noHist:"ابھی کوئی کوئز نہیں",totalQ:"سوالات",pct:"٪",date:"تاریخ",level:"لیول",lessonsDone:"مکمل اسباق",quizzesTaken:"کوئز کی تعداد",speakDone:"مکمل مشقیں",weeklyCal:"اس ہفتے",badges:"بیجز",goalDone:"روزانہ ہدف مکمل! 🎯",wordsLeft:"الفاظ باقی آج",tapToFlip:"کارڈ پلٹنے کے لیے تھپتھپائیں",en2ur:"انگریزی ← اردو",ur2en:"اردو ← انگریزی",revision:"نظرثانی",allCards:"تمام کارڈز",shuffle:"شفل",prev:"← پچھلا",nextC:"اگلا →",of:"کا",dict:"لغت",noWords:"کوئی لفظ نہیں ملا",learnedFilter:"یاد شدہ",favFilter:"پسندیدہ",allFilter:"سب",practiceFilter:"مشق والے",ttsNA:"اس ڈیوائس پر آواز دستیاب نہیں۔",copied:"کاپی ہوگیا!",share:"شیئر",close:"بند کریں",results:"نتائج",accuracy:"درستگی",categories:"زمرے",recent:"حالیہ",welcome:"جیلان انگلش چیلنج میں خوش آمدید!",tagline:"روز 10 الفاظ سیکھیں!",startLearning:"سیکھنا شروع کریں",dailyGoal:"روزانہ ہدف",wordsToday:"الفاظ آج"}
};
function t(k){const l=S.settings.lang==='ur'?'ur':'en';return (T[l]&&T[l][k])||T.en[k]||k;}
function isUrdu(){return S.settings.lang==='ur';}
/* ---------- helpers ---------- */
const $=id=>document.getElementById(id);
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function speak(text,lang){
 if(!('speechSynthesis' in window)){toast(t('ttsNA'));return;}
 try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=lang||'en-US';u.rate=0.9;speechSynthesis.speak(u);}catch(e){toast(t('ttsNA'));}
}
let toastTimer=null;
function toast(m){const el=$('toast');el.textContent=m;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2200);}
function todayStr(){const d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();}
/* ---------- streak ---------- */
function touchStreak(){
 const td=todayStr();const st=S.streak;
 if(!st.days[td]){
  st.days[td]=1;
  // count consecutive
  let c=0;let d=new Date();
  while(true){const k=d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();if(st.days[k]){c++;d.setDate(d.getDate()-1);}else break;}
  st.count=c;if(c>st.longest)st.longest=c;
  DB.set('streak',st);
 }
}
function learnedToday(){const td=todayStr();const log=DB.get('learnLog',{});return (log[td]||[]).length;}
function logLearned(w){const td=todayStr();const log=DB.get('learnLog',{});log[td]=log[td]||[];if(!log[td].includes(w)){log[td].push(w);DB.set('learnLog',log);}touchStreak();}
function markLearned(w,on){
 if(on){S.learned[w]=1;delete S.needPractice[w];logLearned(w);}else{delete S.learned[w];}
 DB.set('learned',S.learned);DB.set('needPractice',S.needPractice);
}
/* ---------- daily words ---------- */
function dailyWords(){
 const n=S.settings.goal||10;
 const all=WORDS.slice();
 // seed by date
 const td=todayStr();let seed=0;for(const c of td)seed=(seed*31+c.charCodeAt(0))>>>0;
 const rnd=()=>{seed=(seed*1103515245+12345)>>>0;return seed/4294967296;};
 // shuffle
 for(let i=all.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[all[i],all[j]]=[all[j],all[i]];}
 // prefer unlearned first
 const un=all.filter(w=>!S.learned[w.w]),ln=all.filter(w=>S.learned[w.w]);
 const pick=[...un,...ln].slice(0,n);
 return pick;
}
/* ---------- navigation ---------- */
let NAV='home',NAVSTACK=[];
function go(page,push=true){
 if(push&&NAV!==page)NAVSTACK.push(NAV);
 NAV=page;
 document.querySelectorAll('.page').forEach(p=>p.classList.remove('on'));
 const el=$('pg-'+page);if(el)el.classList.add('on');
 document.querySelectorAll('.navbtn').forEach(b=>b.classList.toggle('on',b.dataset.pg===page));
 window.scrollTo(0,0);
 render(page);
}
function back(){const p=NAVSTACK.pop();if(p)go(p,false);else go('home',false);}
document.addEventListener('backbutton',back,false);
/* ---------- render dispatch ---------- */
function render(page){
 ({home:renderHome,words:renderWords,cards:renderCards,quiz:renderQuizHome,grammar:renderGrammarList,speak:renderSpeakList,progress:renderProgress,settings:renderSettings,dict:renderDict}[page]||(()=>{}))();
}
/* ---------- HOME ---------- */
function catName(c){return {conversation:isUrdu()?'گفتگو':'Conversation',shopping:isUrdu()?'خریداری':'Shopping',travel:isUrdu()?'سفر':'Travel',education:isUrdu()?'تعلیم':'Education',verbs:isUrdu()?'افعال':'Verbs',emotions:isUrdu()?'جذبات':'Emotions',business:isUrdu()?'کاروبار':'Business',technology:isUrdu()?'ٹیکنالوجی':'Technology',jobs:isUrdu()?'نوکری':'Jobs',advanced:isUrdu()?'اعلیٰ':'Advanced'}[c]||c;}
function lvlName(l){return [t('levelB'),t('levelI'),t('levelA')][l]||'';}
function wordCard(w,compact){
 const learned=!!S.learned[w.w],fav=!!S.fav[w.w];
 return `<div class="wcard${compact?' compact':''}" data-w="${esc(w.w)}">
  <div class="wtop"><span class="weng">${esc(w.w)}</span>
  <button class="icbtn favb${fav?' on':''}" data-act="fav" aria-label="favorite">${fav?'★':'☆'}</button></div>
  <div class="wur">${esc(w.u)}</div>
  ${compact?'':`<div class="wrm">${esc(w.r)}</div>
  <div class="wex">“${esc(w.ex)}”</div><div class="wexu">${esc(w.exu)}</div>
  <div class="wmeta"><span>${catName(w.cat)}</span> · <span>${lvlName(w.lvl)}</span>${w.syn&&w.syn!=='—'?' · <span>'+t('syn')+': '+esc(w.syn)+'</span>':''}</div>`}
  <div class="wbtns">
   <button class="btn sm" data-act="listen">🔊</button>
   <button class="btn sm ${learned?'ok':''}" data-act="learn">${learned?t('markLearned'):t('markLearned').replace(' ✓','')}</button>
  </div></div>`;
}
function applyHomeLabels(){
 $('homeTitle').textContent=t('welcome');$('homeTag').textContent=t('tagline');
 $('secWords').textContent=t('dailyWords');$('secActions').textContent=t('categories');
 $('viewAllWords').textContent=t('viewAll');$('viewAllWords').onclick=()=>go('words');
 const acts=[['words','📝',t('wordBank'),'words'],['cards','🃏',t('flashcards'),'cards'],['quiz','❓',t('quizZone'),'quiz'],['grammar','📖',t('grammarCourse'),'grammar'],['speak','🎤',t('speakPractice'),'speak'],['dict','🔍',t('dict'),'dict']];
 $('homeActions').innerHTML=acts.map(a=>`<button class="act" data-go="${a[3]}"><span class="aico">${a[1]}</span><span>${a[2]}</span></button>`).join('');
 $('homeActions').querySelectorAll('.act').forEach(b=>b.onclick=()=>go(b.dataset.go));
 $('quizQuick').innerHTML=`<button class="btn" id="hqQuiz">❓ ${t('dailyQuiz')}</button> <button class="btn ghost" id="hqSpeak">🎤 ${t('speakBtn')}</button> <button class="btn ghost" id="hqGram">📖 ${t('grammarBtn')}</button>`;
 $('hqQuiz').onclick=()=>go('quiz');$('hqSpeak').onclick=()=>go('speak');$('hqGram').onclick=()=>go('grammar');
}
function renderHome(){
 applyHomeLabels();
 const dw=dailyWords();const lt=learnedToday();const goal=S.settings.goal||10;
 const pct=Math.min(100,Math.round(lt/goal*100));
 const st=S.streak;
 $('homeWords').innerHTML=dw.map(w=>wordCard(w,true)).join('');
 $('streakNum').textContent=st.count;$('streakLong').textContent=st.longest;
 $('learnedNum').textContent=Object.keys(S.learned).length;
 $('goalRing').style.setProperty('--p',pct);
 $('goalTxt').textContent=lt+'/'+goal;
 $('goalMsg').textContent=pct>=100?t('goalDone'):(goal-lt)+' '+t('wordsLeft');
 bindWordCards($('homeWords'));
}
function bindWordCards(root){
 root.querySelectorAll('.wcard').forEach(c=>{
  const w=c.dataset.w;
  c.querySelector('[data-act="fav"]').onclick=e=>{e.stopPropagation();S.fav[w]=!S.fav[w];if(!S.fav[w])delete S.fav[w];DB.set('fav',S.fav);render(NAV);};
  c.querySelector('[data-act="listen"]').onclick=e=>{e.stopPropagation();const wd=WORDS.find(x=>x.w===w);if(wd)speak(wd.w,'en-US');};
  c.querySelector('[data-act="learn"]').onclick=e=>{e.stopPropagation();markLearned(w,!S.learned[w]);render(NAV);};
  c.onclick=()=>openWord(w);
 });
}
function openWord(w){
 const wd=WORDS.find(x=>x.w===w);if(!wd)return;
 $('wordDetail').innerHTML=`<button class="btn ghost" onclick="go('words',false)">${t('back')}</button>`+wordCard(wd,false);
 bindWordCards($('wordDetail'));
 go('worddetail',false);
 $('pg-worddetail').classList.add('on');NAV='worddetail';
 document.querySelectorAll('.navbtn').forEach(b=>b.classList.remove('on'));
 window.scrollTo(0,0);
}
/* ---------- WORDS page ---------- */
let wordsFilter={q:'',cat:'all',f:'all'};
function renderWords(){
 const cats=['all',...new Set(WORDS.map(w=>w.cat))];
 $('wordsCats').innerHTML=cats.map(c=>`<button class="chip${wordsFilter.cat===c?' on':''}" data-c="${c}">${c==='all'?t('catAll'):catName(c)}</button>`).join('');
 $('wordsCats').querySelectorAll('.chip').forEach(b=>b.onclick=()=>{wordsFilter.cat=b.dataset.c;renderWords();});
 $('wordsSearch').value=wordsFilter.q;$('wordsSearch').placeholder=t('search');
 $('wordsSearch').oninput=e=>{wordsFilter.q=e.target.value;drawWordsList();};
 $('wordsFFilter').innerHTML=['all','learned','fav','practice'].map(f=>`<button class="chip${wordsFilter.f===f?' on':''}" data-f="${f}">${t(f==='all'?'allFilter':f==='learned'?'learnedFilter':f==='fav'?'favFilter':'practiceFilter')}</button>`).join('');
 $('wordsFFilter').querySelectorAll('.chip').forEach(b=>b.onclick=()=>{wordsFilter.f=b.dataset.f;renderWords();});
 drawWordsList();
}
function drawWordsList(){
 const q=wordsFilter.q.trim().toLowerCase();
 let list=WORDS.filter(w=>{
  if(wordsFilter.cat!=='all'&&w.cat!==wordsFilter.cat)return false;
  if(wordsFilter.f==='learned'&&!S.learned[w.w])return false;
  if(wordsFilter.f==='fav'&&!S.fav[w.w])return false;
  if(wordsFilter.f==='practice'&&!S.needPractice[w.w])return false;
  if(q&&!(w.w.toLowerCase().includes(q)||w.u.includes(wordsFilter.q)||w.r.toLowerCase().includes(q)))return false;
  return true;
 });
 $('wordsList').innerHTML=list.length?list.map(w=>wordCard(w,true)).join(''):`<div class="empty">${t('noWords')}</div>`;
 bindWordCards($('wordsList'));
}
/* ---------- FLASHCARDS ---------- */
let FC={list:[],i:0,dir:'en2ur',mode:'all',flipped:false};
function renderCards(){
 $('fcDir').innerHTML=`<button class="chip${FC.dir==='en2ur'?' on':''}" data-d="en2ur">${t('en2ur')}</button><button class="chip${FC.dir==='ur2en'?' on':''}" data-d="ur2en">${t('ur2en')}</button>`;
 $('fcDir').querySelectorAll('.chip').forEach(b=>b.onclick=()=>{FC.dir=b.dataset.d;fcReset();});
 $('fcMode').innerHTML=`<button class="chip${FC.mode==='all'?' on':''}" data-m="all">${t('allCards')}</button><button class="chip${FC.mode==='rev'?' on':''}" data-m="rev">${t('revision')}</button>`;
 $('fcMode').querySelectorAll('.chip').forEach(b=>b.onclick=()=>{FC.mode=b.dataset.m;fcReset();});
 if(!FC.list.length)fcReset();else fcDraw();
 $('fcShuffle').onclick=()=>{fcReset(true);};
 $('fcKnow').onclick=()=>{const w=FC.list[FC.i];markLearned(w.w,true);delete S.needPractice[w.w];DB.set('needPractice',S.needPractice);fcNext();};
 $('fcNeed').onclick=()=>{const w=FC.list[FC.i];S.needPractice[w.w]=1;DB.set('needPractice',S.needPractice);fcNext();};
 $('fcPrev').onclick=()=>{FC.i=(FC.i-1+FC.list.length)%FC.list.length;FC.flipped=false;fcDraw();};
 $('fcNextB').onclick=()=>fcNext();
 $('fcCard').onclick=()=>{FC.flipped=!FC.flipped;fcDraw();};
 let sx=null;
 $('fcCard').ontouchstart=e=>{sx=e.touches[0].clientX;};
 $('fcCard').ontouchend=e=>{if(sx===null)return;const dx=e.changedTouches[0].clientX-sx;if(dx<-40)fcNext();else if(dx>40){FC.i=(FC.i-1+FC.list.length)%FC.list.length;FC.flipped=false;fcDraw();}sx=null;};
}
function fcReset(shuffle){
 let list=FC.mode==='rev'?WORDS.filter(w=>S.needPractice[w.w]):WORDS.slice();
 if(!list.length)list=WORDS.slice();
 for(let i=list.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[list[i],list[j]]=[list[j],list[i]];}
 FC.list=list;FC.i=0;FC.flipped=false;fcDraw();
}
function fcNext(){FC.i=(FC.i+1)%FC.list.length;FC.flipped=false;fcDraw();}
function fcDraw(){
 const w=FC.list[FC.i];if(!w)return;
 const front=FC.dir==='en2ur'?esc(w.w):esc(w.u),backT=FC.dir==='en2ur'?esc(w.u):esc(w.w);
 $('fcCard').innerHTML=`<div class="fccount">${FC.i+1} ${t('of')} ${FC.list.length}</div>
  <div class="fcmain">${FC.flipped?backT:front}</div>
  <div class="fcsub">${FC.flipped?(FC.dir==='en2ur'?esc(w.r):esc(w.w)):t('tapToFlip')}</div>
  ${FC.flipped?`<button class="btn sm" id="fcListen">🔊</button>`:''}`;
 const lb=$('fcListen');if(lb)lb.onclick=e=>{e.stopPropagation();speak(FC.dir==='en2ur'?w.w:w.w,'en-US');};
 $('fcPrev').textContent=t('prev');$('fcNextB').textContent=t('nextC');
 $('fcKnow').textContent=t('iknow');$('fcNeed').textContent=t('needPrac');$('fcShuffle').textContent='🔀 '+t('shuffle');
}
/* ---------- QUIZ ---------- */
let QZ={list:[],i:0,score:0,wrong:[],done:false,lvl:'mixed'};
function renderQuizHome(){
 $('quizLevels').innerHTML=['mixed','easy','medium','hard'].map(l=>`<button class="chip${QZ.lvl===l?' on':''}" data-l="${l}">${t(l)}</button>`).join('');
 $('quizLevels').querySelectorAll('.chip').forEach(b=>b.onclick=()=>{QZ.lvl=b.dataset.l;renderQuizHome();});
 $('quizStart').textContent=t('startQuiz');$('quizStart').onclick=startQuiz;
 $('chooseLvlLbl').textContent=t('chooseLevel');
 const h=S.quizHist.slice(-5).reverse();
 $('quizHist').innerHTML=h.length?('<h3>'+t('history')+'</h3>'+h.map(x=>`<div class="hrow"><span>${esc(x.date)}</span><span>${t(x.lvl)}</span><b>${x.score}/${x.total} (${x.pct}%)</b></div>`).join('')):`<div class="empty">${t('noHist')}</div>`;
}
function startQuiz(){
 const lvlMap={easy:0,medium:1,hard:2};
 let pool=QZ.lvl==='mixed'?QUIZ.slice():QUIZ.filter(q=>q.lvl===lvlMap[QZ.lvl]);
 for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
 QZ.list=pool.slice(0,10);QZ.i=0;QZ.score=0;QZ.wrong=[];QZ.done=false;
 go('quizplay',false);$('pg-quizplay').classList.add('on');NAV='quizplay';
 document.querySelectorAll('.navbtn').forEach(b=>b.classList.remove('on'));
 qDraw();
}
function qDraw(){
 const q=QZ.list[QZ.i];if(!q)return qFinish();
 const typeLbl={mcq:'EN→UR',ur2en:'UR→EN',fill:t('fill')||'Fill',grammar:'Grammar',correct:'Correction'}[q.type]||'';
 $('quizPlay').innerHTML=`<div class="qprog">${QZ.i+1} ${t('of')} ${QZ.list.length} · ${t('score')}: ${QZ.score}</div>
  <div class="qtype">${typeLbl}</div><div class="qq">${esc(q.q)}</div>
  <div class="qopts">${q.opts.map((o,i)=>`<button class="qopt" data-i="${i}">${esc(o)}</button>`).join('')}</div>
  <div id="qfeed"></div>`;
 $('quizPlay').querySelectorAll('.qopt').forEach(b=>b.onclick=()=>qAnswer(parseInt(b.dataset.i)));
}
function qAnswer(i){
 const q=QZ.list[QZ.i];const ok=i===q.a;
 if(ok)QZ.score++;else QZ.wrong.push(QZ.list[QZ.i]);
 $('quizPlay').querySelectorAll('.qopt').forEach(b=>{
  const bi=parseInt(b.dataset.i);b.disabled=true;
  if(bi===q.a)b.classList.add('ok');else if(bi===i)b.classList.add('bad');
 });
 $('qfeed').innerHTML=`<div class="qfb ${ok?'ok':'bad'}">${ok?'✅ '+t('correct'):'❌ '+t('wrong')}</div>
  <div class="qexp"><b>${t('explanation')}:</b> ${esc(q.exp)}</div>
  <button class="btn" id="qNext">${QZ.i+1>=QZ.list.length?t('finish'):t('next')}</button>`;
 $('qNext').onclick=()=>{QZ.i++;qDraw();};
}
function qFinish(){
 QZ.done=true;const total=QZ.list.length,pct=Math.round(QZ.score/total*100);
 const msg=pct>=80?t('excellent'):pct>=50?t('good'):t('keepTrying');
 const rec={date:todayStr(),lvl:QZ.lvl,score:QZ.score,total,pct};
 S.quizHist.push(rec);DB.set('quizHist',S.quizHist);touchStreak();
 $('quizPlay').innerHTML=`<div class="qdone"><div class="bigscore">${QZ.score}/${total}</div>
  <div class="pct">${pct}${t('pct')}</div><div class="qmsg">${msg}</div>
  <button class="btn" id="qRetry" ${QZ.wrong.length?'':'disabled'}>${t('retryWrong')} (${QZ.wrong.length})</button>
  <button class="btn ghost" id="qAgain">${t('playAgain')}</button>
  <button class="btn ghost" id="qHome">${t('back')}</button></div>`;
 $('qAgain').onclick=startQuiz;
 $('qHome').onclick=()=>go('quiz');
 $('qRetry').onclick=()=>{if(!QZ.wrong.length)return;QZ.list=QZ.wrong;QZ.i=0;QZ.score=0;QZ.wrong=[];QZ.done=false;qDraw();};
}
/* ---------- GRAMMAR ---------- */
function renderGrammarList(){
 $('grammarList').innerHTML=GRAMMAR.map((g,i)=>{const done=!!S.grammarDone[i];
  return `<div class="gcard" data-i="${i}"><div class="grow"><b>${esc(g.t)}</b><span class="gdone">${done?'✅':''}</span></div><div class="gsub">${esc(g.u)}</div></div>`;}).join('');
 $('grammarList').querySelectorAll('.gcard').forEach(c=>c.onclick=()=>openGrammar(parseInt(c.dataset.i)));
}
let GQ={i:0,score:0};
function openGrammar(i){
 const g=GRAMMAR[i];
 $('grammarDetail').innerHTML=`<button class="btn ghost" id="gBack">${t('back')}</button>
  <h2>${esc(g.t)}</h2><div class="gsub">${esc(g.u)}</div>
  <div class="gbody">${g.body}</div>
  <h3>${t('example')}</h3>${g.ex.map(e=>`<div class="gex"><div>${esc(e[0])}</div><div class="wexu">${esc(e[1])}</div></div>`).join('')}
  <h3>${t('quiz')}</h3><div id="gQuiz"></div>
  <button class="btn" id="gDone">${S.grammarDone[i]?t('done'):t('markDone')}</button>`;
 $('gBack').onclick=()=>go('grammar');
 $('gDone').onclick=()=>{S.grammarDone[i]=1;DB.set('grammarDone',S.grammarDone);touchStreak();openGrammar(i);};
 GQ={i,score:0,qi:0};gQuizDraw(g);
 go('grammardetail',false);$('pg-grammardetail').classList.add('on');NAV='grammardetail';
 document.querySelectorAll('.navbtn').forEach(b=>b.classList.remove('on'));window.scrollTo(0,0);
}
function gQuizDraw(g){
 const q=g.quiz[GQ.qi];
 if(!q){$('gQuiz').innerHTML=`<div class="qdone">${t('score')}: ${GQ.score}/${g.quiz.length}</div>`;return;}
 $('gQuiz').innerHTML=`<div class="qq">${esc(q.q)}</div><div class="qopts">${q.opts.map((o,i2)=>`<button class="qopt" data-i="${i2}">${esc(o)}</button>`).join('')}</div><div id="gqfeed"></div>`;
 $('gQuiz').querySelectorAll('.qopt').forEach(b=>b.onclick=()=>{
  const ok=parseInt(b.dataset.i)===q.a;if(ok)GQ.score++;
  $('gQuiz').querySelectorAll('.qopt').forEach(x=>{x.disabled=true;const xi=parseInt(x.dataset.i);if(xi===q.a)x.classList.add('ok');else if(xi===parseInt(b.dataset.i))x.classList.add('bad');});
  $('gqfeed').innerHTML=`<div class="qfb ${ok?'ok':'bad'}">${ok?'✅':('❌ '+esc(q.exp))}</div><button class="btn sm" id="gqNext">${t('next')}</button>`;
  $('gqNext').onclick=()=>{GQ.qi++;gQuizDraw(g);};
 });
}
/* ---------- SPEAKING ---------- */
function renderSpeakList(){
 $('speakList').innerHTML=SPEAK.map((s,i)=>{const done=!!S.speakDone[i];
  return `<div class="gcard" data-i="${i}"><div class="grow"><b>${s.icon} ${esc(s.t)}</b><span class="gdone">${done?'✅':''}</span></div><div class="gsub">${esc(s.tu)}</div></div>`;}).join('');
 $('speakList').querySelectorAll('.gcard').forEach(c=>c.onclick=()=>openSpeak(parseInt(c.dataset.i)));
}
function openSpeak(i){
 const s=SPEAK[i];
 $('speakDetail').innerHTML=`<button class="btn ghost" id="sBack">${t('back')}</button>
  <h2>${s.icon} ${esc(s.t)}</h2><div class="gsub">${esc(s.tu)}</div>
  <h3>💬 ${t('dialogue')}</h3><div class="dlg">${s.dlg.map(d=>`<div class="dline"><div class="den">${esc(d[0])} <button class="icbtn spk" data-t="${esc(d[0])}">🔊</button></div><div class="dur">${esc(d[1])}</div></div>`).join('')}</div>
  <h3>📌 ${t('phrases')}</h3><div class="phr">${s.phrases.map(p=>`<span class="chip">${esc(p)}</span>`).join('')}</div>
  <h3>💡 ${t('tips')}</h3><div class="tip">${esc(s.tips)}</div>
  <h3>✍️ ${t('practice')}</h3><div class="tip">${esc(s.prompt)}</div>
  <textarea id="sAns" rows="3" placeholder="..."></textarea>
  <h3>✅ ${t('exampleAns')}</h3><div class="tip">${esc(s.example)} <button class="icbtn spk" data-t="${esc(s.example)}">🔊</button></div>
  <button class="btn" id="sDone">${S.speakDone[i]?t('done'):t('markDone')}</button>
  <div class="note">🎤 ${isUrdu()?'آواز کی پہچان دستیاب ہونے پر مائیک بٹن آئے گا۔ فی الحال تحریری مشق کریں۔':'Voice recognition coming when supported. Practice in writing for now.'}</div>`;
 $('sBack').onclick=()=>go('speak');
 $('speakDetail').querySelectorAll('.spk').forEach(b=>b.onclick=e=>{e.stopPropagation();speak(b.dataset.t,'en-US');});
 $('sDone').onclick=()=>{S.speakDone[i]=1;DB.set('speakDone',S.speakDone);touchStreak();openSpeak(i);};
 go('speakdetail',false);$('pg-speakdetail').classList.add('on');NAV='speakdetail';
 document.querySelectorAll('.navbtn').forEach(b=>b.classList.remove('on'));window.scrollTo(0,0);
}
/* ---------- DICTIONARY ---------- */
function renderDict(){
 $('dictSearch').placeholder=t('search');$('dictSearch').value='';
 $('dictSearch').oninput=e=>drawDict(e.target.value);
 drawDict('');
}
function drawDict(q){
 q=q.trim().toLowerCase();
 const list=WORDS.filter(w=>!q||w.w.toLowerCase().includes(q)||w.u.includes(q)||w.r.toLowerCase().includes(q)).slice(0,60);
 $('dictList').innerHTML=list.length?list.map(w=>wordCard(w,true)).join(''):`<div class="empty">${t('noRes')}</div>`;
 bindWordCards($('dictList'));
}
/* ---------- PROGRESS ---------- */
function renderProgress(){
 const st=S.streak;
 const wl=Object.keys(S.learned).length;
 const gd=Object.keys(S.grammarDone).length;
 const sd=Object.keys(S.speakDone).length;
 const qn=S.quizHist.length;
 const bestPct=S.quizHist.length?Math.max(...S.quizHist.map(h=>h.pct)):0;
 // weekly calendar
 const days=[];const now=new Date();
 for(let k=6;k>=0;k--){const d=new Date(now);d.setDate(d.getDate()-k);
  const key=d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
  days.push({d:d.getDate(),on:!!st.days[key],today:k===0});}
 const badgeDefs=[[3,'🥉'],[7,'🥈'],[14,'🥇'],[30,'🏆'],[100,'👑']];
 $('progressBody').innerHTML=`
  <div class="pgrid">
   <div class="pcard"><div class="pnum">${st.count}</div><div class="plbl">${t('streak')}</div></div>
   <div class="pcard"><div class="pnum">${wl}</div><div class="plbl">${t('wordsLearned')}</div></div>
   <div class="pcard"><div class="pnum">${gd}/16</div><div class="plbl">${t('lessonsDone')}</div></div>
   <div class="pcard"><div class="pnum">${qn}</div><div class="plbl">${t('quizzesTaken')}</div></div>
   <div class="pcard"><div class="pnum">${sd}/8</div><div class="plbl">${t('speakDone')}</div></div>
   <div class="pcard"><div class="pnum">${bestPct}%</div><div class="plbl">${t('best')}</div></div>
  </div>
  <h3>📅 ${t('weeklyCal')}</h3>
  <div class="week">${days.map(d=>`<div class="wday${d.on?' on':''}${d.today?' td':''}">${d.d}</div>`).join('')}</div>
  <h3>🏅 ${t('badges')}</h3>
  <div class="badges">${badgeDefs.map(b=>`<div class="badge${st.longest>=b[0]?' got':''}"><div class="bico">${b[1]}</div><div class="blbl">${b[0]} ${t('dayStreak')}</div></div>`).join('')}</div>
  <h3>${t('history')}</h3>
  ${S.quizHist.length?S.quizHist.slice(-10).reverse().map(x=>`<div class="hrow"><span>${esc(x.date)}</span><span>${t(x.lvl)}</span><b>${x.score}/${x.total} (${x.pct}%)</b></div>`).join(''):`<div class="empty">${t('noHist')}</div>`}`;
}
/* ---------- SETTINGS ---------- */
function renderSettings(){
 const s=S.settings;
 $('setBody').innerHTML=`
  <div class="setrow"><label>${t('theme')}</label><div>
   <button class="chip${s.theme==='light'?' on':''}" data-th="light">${t('light')}</button>
   <button class="chip${s.theme==='dark'?' on':''}" data-th="dark">${t('dark')}</button></div></div>
  <div class="setrow"><label>${t('lang')}</label><div>
   <button class="chip${s.lang==='en'?' on':''}" data-lg="en">English</button>
   <button class="chip${s.lang==='ur'?' on':''}" data-lg="ur">اردو</button></div></div>
  <div class="setrow"><label>${t('goal')}</label>
   <select id="setGoal">${[5,10,15,20].map(g=>`<option value="${g}"${s.goal===g?' selected':''}>${g}</option>`).join('')}</select></div>
  <div class="setrow"><label>${t('fontSize')}</label>
   <input type="range" id="setFont" min="14" max="22" value="${s.font}"></div>
  <div class="setrow"><button class="btn danger" id="setReset">${t('reset')}</button></div>
  <div class="setrow"><button class="btn ghost" id="setAbout">${t('about')}</button>
  <button class="btn ghost" id="setPrivacy">${t('privacy')}</button></div>
  <div class="ver">Jilan English Challenge v1.0</div>`;
 $('setBody').querySelectorAll('[data-th]').forEach(b=>b.onclick=()=>{S.settings.theme=b.dataset.th;DB.set('settings',S.settings);applySettings();renderSettings();});
 $('setBody').querySelectorAll('[data-lg]').forEach(b=>b.onclick=()=>{S.settings.lang=b.dataset.lg;DB.set('settings',S.settings);applySettings();buildNav();render(NAV);});
 $('setGoal').onchange=e=>{S.settings.goal=parseInt(e.target.value);DB.set('settings',S.settings);};
 $('setFont').oninput=e=>{S.settings.font=parseInt(e.target.value);DB.set('settings',S.settings);applySettings();};
 $('setReset').onclick=()=>{if(confirm(t('resetConf'))){Object.keys(localStorage).filter(k=>k.startsWith('jec_')).forEach(k=>localStorage.removeItem(k));location.reload();}};
 $('setAbout').onclick=()=>alert(isUrdu()?'جیلان انگلش چیلنج — اردو بولنے والوں کے لیے انگریزی سیکھنے کی ایپ۔':'Jilan English Challenge — learn English for Urdu speakers. Made by Jilan Apps.');
 $('setPrivacy').onclick=()=>alert(isUrdu()?'تمام ڈیٹا آپ کے فون میں محفوظ رہتا ہے۔ کوئی اکاؤنٹ یا انٹرنیٹ درکار نہیں۔':'All data stays on your device. No account or internet required.');
}
function applySettings(){
 document.body.classList.toggle('dark',S.settings.theme==='dark');
 document.body.classList.toggle('rtl',isUrdu());
 document.documentElement.style.setProperty('--fs',S.settings.font+'px');
 document.documentElement.lang=isUrdu()?'ur':'en';
}
/* ---------- nav labels ---------- */
function buildNav(){
 const items=[['home','🏠'],['words','📝'],['cards','🃏'],['quiz','❓'],['grammar','📖'],['speak','🎤'],['progress','📊'],['settings','⚙️']];
 $('bottomNav').innerHTML=items.map(i=>`<button class="navbtn${NAV===i[0]?' on':''}" data-pg="${i[0]}"><span>${i[1]}</span><small>${t(i[0])}</small></button>`).join('');
 document.querySelectorAll('.navbtn').forEach(b=>b.onclick=()=>go(b.dataset.pg));
 $('appTitle').textContent='Jilan English Challenge';
}
/* ---------- init ---------- */
function init(){
 applySettings();buildNav();
 go('home',false);
}
document.addEventListener('DOMContentLoaded',init);
