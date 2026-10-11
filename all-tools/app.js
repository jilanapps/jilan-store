/* Jilan All-in-One Tools — pure logic + declarative tool registry.
   Pure parts (no DOM) are testable in node. DOM boot is guarded. */
'use strict';

/* ---------- pure helpers ---------- */
function toNum(v){
  if(v===null||v===undefined||v==='') return NaN;
  const n=Number(String(v).trim().replace(/,/g,''));
  return n;
}
function isBad(n){ return typeof n!=='number'||!isFinite(n); }
function fmt(n, prec){
  if(isBad(n)) return '—';
  prec=(prec===undefined||prec===null)?4:prec;
  let s=Number(n).toFixed(prec);
  if(s.indexOf('.')>=0) s=s.replace(/0+$/,'').replace(/\.$/,''); // trim trailing zeros
  if(s==='-0') s='0';
  return s;
}
function money(n){ // PKR formatting
  if(isBad(n)) return '—';
  return 'Rs ' + Number(n).toLocaleString('en-PK',{maximumFractionDigits:2});
}
function gcd(a,b){ a=Math.abs(Math.round(a)); b=Math.abs(Math.round(b));
  while(b){ const t=b; b=a%b; a=t; } return a||1; }
function lcm(a,b){ if(!a||!b) return 0; return Math.abs(a*b)/gcd(a,b); }
function isPrime(n){
  n=Math.round(n); if(n<2) return false;
  if(n===2||n===3) return true; if(n%2===0||n%3===0) return false;
  for(let i=5;i*i<=n;i+=6){ if(n%i===0||n%(i+2)===0) return false; }
  return true;
}
function parseList(s){
  return String(s||'').split(/[,;\n]+/).map(x=>toNum(x)).filter(x=>!isBad(x));
}

/* Safe expression evaluator (shunting-yard). Supports + - * / % ^ ( ) unary minus. */
function evalExpr(expr){
  expr=String(expr||'').trim();
  if(!expr) return {error:'Empty expression'};
  if(/[^0-9+\-*/%^().\s]/.test(expr)) return {error:'Invalid characters'};
  const toks=[]; let i=0;
  while(i<expr.length){
    const c=expr[i];
    if(c===' '){i++;continue;}
    if(/[0-9.]/.test(c)){ let j=i; while(j<expr.length&&/[0-9.]/.test(expr[j])) j++;
      const t=expr.slice(i,j); if(t.split('.').length>2) return {error:'Bad number: '+t};
      toks.push({t:'n',v:parseFloat(t)}); i=j; continue; }
    if('+-*/%^()'.includes(c)){ toks.push({t:'o',v:c}); i++; continue; }
    return {error:'Unexpected: '+c};
  }
  // handle unary minus
  const out=[];
  for(let k=0;k<toks.length;k++){
    const tk=toks[k];
    if(tk.t==='o'&&tk.v==='-'&&(k===0||(toks[k-1].t==='o'&&toks[k-1].v!==')'))){
      out.push({t:'o',v:'u'}); // unary minus
    } else out.push(tk);
  }
  const prec={'+':1,'-':1,'*':2,'/':2,'%':2,'^':3,'u':4};
  const rassoc={'^':true,'u':true};
  const vals=[],ops=[];
  function apply(){
    const o=ops.pop();
    if(o==='u'){ const a=vals.pop(); if(a===undefined) throw 'bad'; vals.push(-a); return; }
    const b=vals.pop(),a=vals.pop(); if(a===undefined||b===undefined) throw 'bad';
    if(o==='+') vals.push(a+b); else if(o==='-') vals.push(a-b);
    else if(o==='*') vals.push(a*b);
    else if(o==='/'){ if(b===0) throw 'div0'; vals.push(a/b); }
    else if(o==='%'){ if(b===0) throw 'div0'; vals.push(a%b); }
    else if(o==='^') vals.push(Math.pow(a,b));
  }
  try{
    for(const tk of out){
      if(tk.t==='n'){ vals.push(tk.v); continue; }
      const o=tk.v;
      if(o==='('){ ops.push(o); continue; }
      if(o===')'){ while(ops.length&&ops[ops.length-1]!=='(') apply();
        if(!ops.length) throw 'bad'; ops.pop(); continue; }
      while(ops.length&&ops[ops.length-1]!=='('&&
        (prec[ops[ops.length-1]]>prec[o]||(prec[ops[ops.length-1]]===prec[o]&&!rassoc[o]))) apply();
      ops.push(o);
    }
    while(ops.length){ if(ops[ops.length-1]==='(') throw 'bad'; apply(); }
    if(vals.length!==1) throw 'bad';
    return {value:vals[0]};
  }catch(e){ return {error: e==='div0' ? 'Cannot divide by zero' : 'Invalid expression'}; }
}

function simplifyFrac(n,d){
  if(d===0) return {error:'Denominator cannot be zero'};
  const g=gcd(n,d); n/=g; d/=g;
  if(d<0){ n=-n; d=-d; }
  return {n:Math.round(n), d:Math.round(d)};
}

/* ---------- i18n ---------- */
const STR={
 en:{search:'Search tools…',fav:'Favorites',recent:'Recent',all:'All',quick:'Quick Calculator',
     calc:'Calculators',business:'Business',convert:'Converters',date:'Date & Time',text:'Text & Smart',personal:'Personal',
     settings:'Settings',history:'History',calculate:'Calculate',reset:'Reset',copy:'Copy',share:'Share',
     result:'Result',steps:'Show steps',hideSteps:'Hide steps',copied:'Copied!',noFav:'No favorites yet — tap ⭐ on any tool.',
     noRecent:'No recent tools yet.',noHist:'No history yet.',clearHist:'Clear History',theme:'Theme',light:'Light',dark:'Dark',
     lang:'Language',prec:'Decimal precision',privacy:'Privacy',about:'About',version:'Version 1.0',
     back:'Back',errNeed:'Please fill all required fields with valid numbers.',
     privText:'All tools run 100% on your device. Nothing is uploaded. History & favorites stay in this browser/app and are erased if site data is cleared.',
     tagline:'Everyday Tools. One Smart App.',enter:'Enter expression, e.g. (25+5)*2'},
 ur:{search:'ٹولز تلاش کریں…',fav:'پسندیدہ',recent:'حالیہ',all:'تمام',quick:'فوری کیلکولیٹر',
     calc:'کیلکولیٹرز',business:'کاروبار',convert:'کنورٹرز',date:'تاریخ و وقت',text:'ٹیکسٹ و اسمارٹ',personal:'ذاتی',
     settings:'ترتیبات',history:'ہسٹری',calculate:'حساب کریں',reset:'ری سیٹ',copy:'کاپی',share:'شیئر',
     result:'نتیجہ',steps:'طریقہ دیکھیں',hideSteps:'طریقہ چھپائیں',copied:'کاپی ہو گیا!',noFav:'ابھی کوئی پسندیدہ نہیں — کسی ٹول پر ⭐ دبائیں۔',
     noRecent:'ابھی کوئی حالیہ ٹول نہیں۔',noHist:'ابھی کوئی ہسٹری نہیں۔',clearHist:'ہسٹری صاف کریں',theme:'تھیم',light:'لائٹ',dark:'ڈارک',
     lang:'زبان',prec:'اعشاریہ درستگی',privacy:'پرائیویسی',about:'ایپ کے بارے میں',version:'ورژن 1.0',
     back:'واپس',errNeed:'براہ کرم تمام خانے درست اعداد سے بھریں۔',
     privText:'تمام ٹولز 100% آپ کے ڈیوائس پر چلتے ہیں۔ کچھ بھی اپ لوڈ نہیں ہوتا۔ ہسٹری اور پسندیدہ اسی براؤزر/ایپ میں رہتے ہیں اور سائٹ ڈیٹا صاف کرنے پر مٹ جاتے ہیں۔',
     tagline:'روزمرہ ٹولز۔ ایک اسمارٹ ایپ۔',enter:'مثلاً (25+5)*2 لکھیں'}
};
const CATS=[
 {id:'calc',icon:'🧮'},{id:'business',icon:'💼'},{id:'convert',icon:'🔄'},
 {id:'date',icon:'📅'},{id:'text',icon:'🔤'},{id:'personal',icon:'🙂'}
];

/* ---------- tool registry ----------
   field: {k, label, labelUr, type:number|text|date|select|textarea|checks, ph, opts?}
   compute(inp, P) -> {main, lines:[[k,v]..], steps:[..], note, error}
   P = decimals precision */
const TOOLS=[
/* ===== CALCULATORS ===== */
{id:'basic',cat:'calc',icon:'🧮',name:'Basic Calculator',nameUr:'بنیادی کیلکولیٹر',
 fields:[{k:'expr',label:'Expression',labelUr:'عبارت',type:'text',ph:'(25+5)*2'}],
 compute(inp,P){ const r=evalExpr(inp.expr);
   if(r.error) return {error:r.error};
   return {main:fmt(r.value,P),lines:[['Expression',inp.expr]]}; }},
{id:'sci',cat:'calc',icon:'🔬',name:'Scientific Calculator',nameUr:'سائنسی کیلکولیٹر',
 fields:[
  {k:'fn',label:'Function',labelUr:'فنکشن',type:'select',opts:[
    ['sin','sin(x)'],['cos','cos(x)'],['tan','tan(x)'],['asin','asin(x)'],['acos','acos(x)'],['atan','atan(x)'],
    ['ln','ln(x)'],['log10','log₁₀(x)'],['sqrt','√x'],['cbrt','∛x'],['pow','xʸ'],['fact','x!'],
    ['inv','1/x'],['abs','|x|'],['exp','eˣ'],['pow10','10ˣ']]},
  {k:'x',label:'x',labelUr:'x',type:'number',ph:'30'},
  {k:'y',label:'y (for xʸ)',labelUr:'y (xʸ کے لیے)',type:'number',ph:'2'},
  {k:'deg',label:'Angle unit',labelUr:'زاویہ',type:'select',opts:[['deg','Degrees'],['rad','Radians']]}],
 compute(inp,P){
   const x=toNum(inp.x), y=toNum(inp.y), deg=inp.deg!=='rad';
   const D2R=v=>deg?v*Math.PI/180:v, R2D=v=>deg?v*180/Math.PI:v;
   let v, label=inp.fn;
   try{
    switch(inp.fn){
     case 'sin': v=Math.sin(D2R(x)); break;
     case 'cos': v=Math.cos(D2R(x)); break;
     case 'tan': v=Math.tan(D2R(x)); if(Math.abs(v)>1e15) return {error:'Undefined (asymptote)'}; break;
     case 'asin': if(Math.abs(x)>1) return {error:'|x| must be ≤ 1'}; v=R2D(Math.asin(x)); break;
     case 'acos': if(Math.abs(x)>1) return {error:'|x| must be ≤ 1'}; v=R2D(Math.acos(x)); break;
     case 'atan': v=R2D(Math.atan(x)); break;
     case 'ln': if(x<=0) return {error:'x must be > 0'}; v=Math.log(x); break;
     case 'log10': if(x<=0) return {error:'x must be > 0'}; v=Math.log10(x); break;
     case 'sqrt': if(x<0) return {error:'x must be ≥ 0'}; v=Math.sqrt(x); break;
     case 'cbrt': v=Math.cbrt(x); break;
     case 'pow': if(isBad(y)) return {error:'Enter y'}; v=Math.pow(x,y); break;
     case 'fact': { if(x<0||Math.round(x)!==x||x>170) return {error:'x must be integer 0–170'};
        v=1; for(let i=2;i<=x;i++) v*=i; break; }
     case 'inv': if(x===0) return {error:'Cannot divide by zero'}; v=1/x; break;
     case 'abs': v=Math.abs(x); break;
     case 'exp': v=Math.exp(x); break;
     case 'pow10': v=Math.pow(10,x); break;
     default: return {error:'Unknown function'};
    }
   }catch(e){ return {error:'Math error'}; }
   if(isBad(x)) return {error:'Enter x'};
   if(isBad(v)) return {error:'Math error'};
   return {main:fmt(v,P),lines:[['Function',label],['x',fmt(x,P)],['Angle',deg?'Degrees':'Radians']]}; }},
{id:'pct',cat:'calc',icon:'%',name:'Percentage Calculator',nameUr:'فیصد کیلکولیٹر',
 fields:[{k:'x',label:'Percentage (%)',labelUr:'فیصد',type:'number',ph:'25'},
         {k:'y',label:'of value',labelUr:'قدر',type:'number',ph:'1000'}],
 compute(inp,P){ const x=toNum(inp.x),y=toNum(inp.y);
   if(isBad(x)||isBad(y)) return {error:'errNeed'};
   const v=x*y/100;
   return {main:fmt(v,P),lines:[['Calculation',x+'% of '+fmt(y,P)],['Result',fmt(v,P)]],
     steps:[x+' ÷ 100 = '+fmt(x/100,P+2),'× '+fmt(y,P)+' = '+fmt(v,P)]}; }},
{id:'pctchg',cat:'calc',icon:'📈',name:'% Increase / Decrease',nameUr:'فیصد اضافہ / کمی',
 fields:[{k:'a',label:'Original value',labelUr:'اصل قدر',type:'number',ph:'1000'},
         {k:'b',label:'New value',labelUr:'نئی قدر',type:'number',ph:'1200'}],
 compute(inp,P){ const a=toNum(inp.a),b=toNum(inp.b);
   if(isBad(a)||isBad(b)) return {error:'errNeed'};
   if(a===0) return {error:'Original value cannot be zero'};
   const d=b-a, p=d/a*100;
   return {main:fmt(p,P)+'%',lines:[['Change',fmt(d,P)],['Percent',(p>=0?'+':'')+fmt(p,P)+'%'],['Direction',p>0?'Increase ↑':p<0?'Decrease ↓':'No change']]}; }},
{id:'avg',cat:'calc',icon:'➗',name:'Average Calculator',nameUr:'اوسط کیلکولیٹر',
 fields:[{k:'vals',label:'Numbers (comma separated)',labelUr:'اعداد (کاما سے الگ)',type:'textarea',ph:'10, 20, 30'},
         {k:'wts',label:'Weights (optional, comma separated)',labelUr:'وزن (اختیاری)',type:'textarea',ph:'1, 2, 1'}],
 compute(inp,P){ const v=parseList(inp.vals);
   if(!v.length) return {error:'errNeed'};
   const w=parseList(inp.wts);
   if(w.length && w.length!==v.length) return {error:'Weights count must match numbers count'};
   let avg, note='';
   if(w.length){ let s=0,ws=0; v.forEach((x,i)=>{s+=x*w[i];ws+=w[i];});
     if(ws===0) return {error:'Total weight cannot be zero'};
     avg=s/ws; note='Weighted average'; }
   else { avg=v.reduce((a,b)=>a+b,0)/v.length; note='Simple average'; }
   const sorted=[...v].sort((a,b)=>a-b);
   const mid=Math.floor(sorted.length/2);
   const med=sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2;
   return {main:fmt(avg,P),lines:[['Type',note],['Count',v.length],['Sum',fmt(v.reduce((a,b)=>a+b,0),P)],['Median',fmt(med,P)],['Min',fmt(sorted[0],P)],['Max',fmt(sorted[sorted.length-1],P)]]}; }},
{id:'ratio',cat:'calc',icon:'⚖️',name:'Ratio & Proportion',nameUr:'نسبت و تناسب',
 fields:[{k:'a',label:'a',labelUr:'a',type:'number',ph:'2'},{k:'b',label:'b',labelUr:'b',type:'number',ph:'3'},
         {k:'c',label:'c (for a:b = c:?)',labelUr:'c',type:'number',ph:'10'}],
 compute(inp,P){ const a=toNum(inp.a),b=toNum(inp.b),c=toNum(inp.c);
   if(isBad(a)||isBad(b)) return {error:'errNeed'};
   if(b===0||a===0) return {error:'a and b cannot be zero'};
   const g=gcd(a,b);
   const lines=[['Simplified',Math.round(a/g)+' : '+Math.round(b/g)],['As decimal','1 : '+fmt(b/a,P)]];
   let main=Math.round(a/g)+' : '+Math.round(b/g), steps=['GCD('+a+', '+b+') = '+g];
   if(!isBad(c)){ const x=b*c/a; main=fmt(x,P);
     lines.push(['a:b = c:x',''+a+' : '+b+' = '+c+' : x'],['x = b×c÷a',fmt(x,P)]);
     steps.push('x = '+b+' × '+c+' ÷ '+a+' = '+fmt(x,P)); }
   return {main,lines,steps}; }},
{id:'frac',cat:'calc',icon:'½',name:'Fraction Calculator',nameUr:'کسر کیلکولیٹر',
 fields:[{k:'n1',label:'Numerator 1',labelUr:'شمارکنندہ 1',type:'number',ph:'1'},
         {k:'d1',label:'Denominator 1',labelUr:'مخرج 1',type:'number',ph:'2'},
         {k:'op',label:'Operation',labelUr:'عمل',type:'select',opts:[['+','+'],['-','−'],['*','×'],['/','÷']]},
         {k:'n2',label:'Numerator 2',labelUr:'شمارکنندہ 2',type:'number',ph:'1'},
         {k:'d2',label:'Denominator 2',labelUr:'مخرج 2',type:'number',ph:'4'}],
 compute(inp,P){ const n1=toNum(inp.n1),d1=toNum(inp.d1),n2=toNum(inp.n2),d2=toNum(inp.d2);
   if([n1,d1,n2,d2].some(isBad)) return {error:'errNeed'};
   if(d1===0||d2===0) return {error:'Denominator cannot be zero'};
   let n,d;
   if(inp.op==='+'){n=n1*d2+n2*d1;d=d1*d2;} else if(inp.op==='-'){n=n1*d2-n2*d1;d=d1*d2;}
   else if(inp.op==='*'){n=n1*n2;d=d1*d2;} else { if(n2===0) return {error:'Cannot divide by zero'}; n=n1*d2; d=d1*n2; }
   const s=simplifyFrac(n,d); if(s.error) return s;
   const dec=s.n/s.d;
   const whole=Math.trunc(s.n/s.d), rem=Math.abs(s.n%s.d);
   const mixed=rem===0?String(whole):(whole!==0?whole+' ':'')+rem+'/'+s.d;
   return {main:s.n+'/'+s.d,lines:[['Result (fraction)',s.n+'/'+s.d],['Mixed',mixed],['Decimal',fmt(dec,P)]]}; }},
{id:'prime',cat:'calc',icon:'🔢',name:'Prime Checker',nameUr:'مفرد عدد چیکر',
 fields:[{k:'n',label:'Number',labelUr:'عدد',type:'number',ph:'17'}],
 compute(inp){ const n=toNum(inp.n);
   if(isBad(n)||Math.round(n)!==n||n<1) return {error:'Enter a positive integer'};
   const p=isPrime(n);
   const lines=[['Number',n],['Prime?',p?'Yes ✓':'No ✗']];
   if(!p&&n>1){ const f=[]; let t=n; for(let i=2;i*i<=t;i++){ while(t%i===0){f.push(i);t/=i;} } if(t>1)f.push(t);
     lines.push(['Factors',f.join(' × ')||String(n)]); }
   return {main:p?'PRIME ✓':'NOT PRIME',lines}; }},
{id:'gcdlcm',cat:'calc',icon:'🧩',name:'GCD & LCM',nameUr:'عاد اعظم و اضعاف اقل',
 fields:[{k:'a',label:'Number a',labelUr:'عدد a',type:'number',ph:'12'},
         {k:'b',label:'Number b',labelUr:'عدد b',type:'number',ph:'18'}],
 compute(inp){ const a=toNum(inp.a),b=toNum(inp.b);
   if(isBad(a)||isBad(b)||Math.round(a)!==a||Math.round(b)!==b) return {error:'Enter integers'};
   return {main:'GCD '+gcd(a,b)+' • LCM '+lcm(a,b),
     lines:[['GCD (greatest common divisor)',gcd(a,b)],['LCM (least common multiple)',lcm(a,b)]]}; }},
{id:'round',cat:'calc',icon:'🎯',name:'Rounding Tool',nameUr:'راؤنڈنگ ٹول',
 fields:[{k:'v',label:'Value',labelUr:'قدر',type:'number',ph:'3.14159'},
         {k:'d',label:'Decimals',labelUr:'اعشاریے',type:'number',ph:'2'},
         {k:'m',label:'Mode',labelUr:'طریقہ',type:'select',opts:[['r','Round (half up)'],['f','Floor'],['c','Ceil'],['t','Truncate']]}],
 compute(inp,P){ const v=toNum(inp.v); let d=Math.round(toNum(inp.d));
   if(isBad(v)||isBad(d)||d<0||d>15) return {error:'Enter value and decimals 0–15'};
   const f=Math.pow(10,d); let r;
   if(inp.m==='f') r=Math.floor(v*f)/f; else if(inp.m==='c') r=Math.ceil(v*f)/f;
   else if(inp.m==='t') r=Math.trunc(v*f)/f; else r=Math.round(v*f)/f;
   return {main:r.toFixed(d),lines:[['Mode',({r:'Round',f:'Floor',c:'Ceil',t:'Truncate'})[inp.m]||'Round'],['Result',r.toFixed(d)]]}; }},

/* ===== BUSINESS (PKR) ===== */
{id:'discount',cat:'business',icon:'🏷️',name:'Discount Calculator',nameUr:'ڈسکاؤنٹ کیلکولیٹر',
 fields:[{k:'price',label:'Original price (Rs)',labelUr:'اصل قیمت (روپے)',type:'number',ph:'1000'},
         {k:'disc',label:'Discount %',labelUr:'ڈسکاؤنٹ %',type:'number',ph:'20'}],
 compute(inp,P){ const p=toNum(inp.price),d=toNum(inp.disc);
   if(isBad(p)||isBad(d)||p<0) return {error:'errNeed'};
   if(d<0||d>100) return {error:'Discount must be 0–100%'};
   const amt=p*d/100, fin=p-amt;
   return {main:money(fin),lines:[['Original',money(p)],['Discount ('+d+'%)','− '+money(amt)],['Final price',money(fin)],['You save',money(amt)]],
     steps:['Discount = '+money(p)+' × '+d+'% = '+money(amt),'Final = '+money(p)+' − '+money(amt)+' = '+money(fin)]}; }},
{id:'profit',cat:'business',icon:'💰',name:'Profit & Loss',nameUr:'نفع و نقصان',
 fields:[{k:'cost',label:'Cost price (Rs)',labelUr:'قیمت خرید (روپے)',type:'number',ph:'800'},
         {k:'sell',label:'Selling price (Rs)',labelUr:'قیمت فروخت (روپے)',type:'number',ph:'1000'}],
 compute(inp,P){ const c=toNum(inp.cost),s=toNum(inp.sell);
   if(isBad(c)||isBad(s)||c<0||s<0) return {error:'errNeed'};
   const pl=s-c, pct=c===0?(s>0?100:0):pl/c*100;
   return {main:(pl>=0?'+ ':'− ')+money(Math.abs(pl)),
     lines:[['Cost',money(c)],['Selling',money(s)],[pl>=0?'Profit':'Loss',(pl>=0?'+':'−')+money(Math.abs(pl))],['Profit % on cost',fmt(pct,P)+'%']]}; }},
{id:'margin',cat:'business',icon:'📊',name:'Margin & Markup',nameUr:'مارجن و مارک اپ',
 fields:[{k:'cost',label:'Cost price (Rs)',labelUr:'قیمت خرید (روپے)',type:'number',ph:'800'},
         {k:'sell',label:'Selling price (Rs)',labelUr:'قیمت فروخت (روپے)',type:'number',ph:'1000'}],
 compute(inp,P){ const c=toNum(inp.cost),s=toNum(inp.sell);
   if(isBad(c)||isBad(s)||c<=0||s<0) return {error:'Cost must be > 0'};
   const mk=(s-c)/c*100, mg=s===0?0:(s-c)/s*100;
   return {main:'Markup '+fmt(mk,P)+'% • Margin '+fmt(mg,P)+'%',
     lines:[['Markup % (on cost)',fmt(mk,P)+'%'],['Margin % (on price)',fmt(mg,P)+'%']],
     note:'Markup = profit ÷ cost. Margin = profit ÷ selling price.'}; }},
{id:'unitprice',cat:'business',icon:'⚖️',name:'Unit Price Compare',nameUr:'فی یونٹ قیمت موازنہ',
 fields:[{k:'pa',label:'Price A (Rs)',labelUr:'قیمت A (روپے)',type:'number',ph:'500'},
         {k:'qa',label:'Qty A',labelUr:'مقدار A',type:'number',ph:'5'},
         {k:'pb',label:'Price B (Rs)',labelUr:'قیمت B (روپے)',type:'number',ph:'900'},
         {k:'qb',label:'Qty B',labelUr:'مقدار B',type:'number',ph:'10'}],
 compute(inp,P){ const pa=toNum(inp.pa),qa=toNum(inp.qa),pb=toNum(inp.pb),qb=toNum(inp.qb);
   if([pa,qa,pb,qb].some(isBad)||qa<=0||qb<=0) return {error:'Enter valid prices and quantities > 0'};
   const ua=pa/qa, ub=pb/qb;
   const better=ua<ub?'A':ub<ua?'B':'Equal';
   return {main:'Option '+better+' is cheaper',
     lines:[['A per unit',money(ua)],['B per unit',money(ub)],['Better deal','Option '+better]]}; }},
{id:'tax',cat:'business',icon:'🧾',name:'Tax Calculator',nameUr:'ٹیکس کیلکولیٹر',
 fields:[{k:'amt',label:'Amount (Rs)',labelUr:'رقم (روپے)',type:'number',ph:'10000'},
         {k:'rate',label:'Tax rate % (editable)',labelUr:'ٹیکس شرح %',type:'number',ph:'16'}],
 compute(inp,P){ const a=toNum(inp.amt),r=toNum(inp.rate);
   if(isBad(a)||isBad(r)||a<0||r<0) return {error:'errNeed'};
   const t=a*r/100;
   return {main:money(a+t),lines:[['Amount',money(a)],['Tax ('+r+'%)',money(t)],['Total',money(a+t)]],
     note:'⚠️ For estimation only — not official Pakistani tax advice.'}; }},
{id:'dailypl',cat:'business',icon:'🏪',name:'Daily Sales & Expense',nameUr:'روزانہ فروخت و اخراجات',
 fields:[{k:'sales',label:'Total sales (Rs)',labelUr:'کل فروخت (روپے)',type:'number',ph:'15000'},
         {k:'exp',label:'Total expenses (Rs)',labelUr:'کل اخراجات (روپے)',type:'number',ph:'4000'}],
 compute(inp){ const s=toNum(inp.sales),e=toNum(inp.exp);
   if(isBad(s)||isBad(e)||s<0||e<0) return {error:'errNeed'};
   const net=s-e;
   return {main:(net>=0?'+ ':'− ')+money(Math.abs(net)),
     lines:[['Sales',money(s)],['Expenses','− '+money(e)],['Net', (net>=0?'+':'−')+money(Math.abs(net))]]}; }},
{id:'si',cat:'business',icon:'🏦',name:'Simple Interest',nameUr:'سادہ سود',
 fields:[{k:'p',label:'Principal (Rs)',labelUr:'اصل رقم (روپے)',type:'number',ph:'100000'},
         {k:'r',label:'Rate % per year',labelUr:'شرح % سالانہ',type:'number',ph:'10'},
         {k:'t',label:'Time (years)',labelUr:'مدت (سال)',type:'number',ph:'2'}],
 compute(inp,P){ const p=toNum(inp.p),r=toNum(inp.r),t=toNum(inp.t);
   if(isBad(p)||isBad(r)||isBad(t)||p<0||t<0) return {error:'errNeed'};
   const i=p*r*t/100;
   return {main:money(i),lines:[['Principal',money(p)],['Interest',money(i)],['Total',money(p+i)]],
     steps:['I = P × R × T ÷ 100 = '+money(p)+' × '+r+'% × '+t+' = '+money(i)]}; }},
{id:'ci',cat:'business',icon:'📈',name:'Compound Interest',nameUr:'مرکب سود',
 fields:[{k:'p',label:'Principal (Rs)',labelUr:'اصل رقم (روپے)',type:'number',ph:'100000'},
         {k:'r',label:'Rate % per year',labelUr:'شرح % سالانہ',type:'number',ph:'10'},
         {k:'t',label:'Time (years)',labelUr:'مدت (سال)',type:'number',ph:'2'},
         {k:'n',label:'Compounds per year',labelUr:'سال میں مرکب',type:'select',opts:[['1','Yearly'],['2','Half-yearly'],['4','Quarterly'],['12','Monthly']]}],
 compute(inp,P){ const p=toNum(inp.p),r=toNum(inp.r),t=toNum(inp.t),n=toNum(inp.n);
   if(isBad(p)||isBad(r)||isBad(t)||p<0||t<0) return {error:'errNeed'};
   const A=p*Math.pow(1+r/100/n,n*t), i=A-p;
   return {main:money(A),lines:[['Principal',money(p)],['Interest earned',money(i)],['Maturity value',money(A)]],
     steps:['A = P(1 + r/n)^(nt) = '+money(p)+'(1+'+r+'%/'+n+')^('+n+'×'+t+') = '+money(A)]}; }},
{id:'emi',cat:'business',icon:'🏠',name:'Loan Installment (EMI)',nameUr:'قرض قسط',
 fields:[{k:'p',label:'Loan amount (Rs)',labelUr:'قرض رقم (روپے)',type:'number',ph:'500000'},
         {k:'r',label:'Annual rate %',labelUr:'سالانہ شرح %',type:'number',ph:'18'},
         {k:'y',label:'Years',labelUr:'سال',type:'number',ph:'3'}],
 compute(inp,P){ const p=toNum(inp.p),ar=toNum(inp.r),y=toNum(inp.y);
   if(isBad(p)||isBad(ar)||isBad(y)||p<=0||y<=0||ar<0) return {error:'errNeed'};
   const r=ar/1200, n=Math.round(y*12);
   let emi=p/n; if(r>0) emi=p*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1);
   const tot=emi*n, intr=tot-p;
   return {main:money(emi)+' /month',
     lines:[['Monthly installment',money(emi)],['Total payable',money(tot)],['Total interest',money(intr)],['Months',n]],
     note:'Assumes reducing-balance loan, monthly compounding, fixed rate. Estimate only.'}; }},

]; // ===== end of literal tool definitions =====

/* ===== CONVERTERS ===== */
function mkConv(id,icon,name,nameUr,baseLabel,units){
  const opts=units.map(u=>[u[0],u[1]]);
  return {id,cat:'convert',icon,name,nameUr,
   fields:[{k:'v',label:'Value',labelUr:'قدر',type:'number',ph:'2'},
           {k:'from',label:'From',labelUr:'از',type:'select',opts},
           {k:'to',label:'To',labelUr:'تک',type:'select',opts}],
   compute(inp,P){
     const v=toNum(inp.v); if(isBad(v)) return {error:'errNeed'};
     const fu=units.find(u=>u[0]===inp.from), tu=units.find(u=>u[0]===inp.to);
     if(!fu||!tu) return {error:'errNeed'};
     const base=v*fu[2], out=base/tu[2];
     return {main:fmt(out,P)+' '+tu[1],
       lines:units.map(u=>[u[1],fmt(base/u[2],P)]),
       steps:[fmt(v,P)+' '+fu[1]+' = '+fmt(base,P)+' '+baseLabel,'= '+fmt(out,P)+' '+tu[1]]}; }};}
TOOLS.push(
mkConv('len','📏','Length Converter','لمبائی کنورٹر','m',
 [['km','Kilometer',1000],['m','Meter',1],['cm','Centimeter',0.01],['mm','Millimeter',0.001],
  ['mi','Mile',1609.344],['yd','Yard',0.9144],['ft','Foot',0.3048],['in','Inch',0.0254]]),
mkConv('wt','⚖️','Weight Converter','وزن کنورٹر','kg',
 [['t','Tonne',1000],['kg','Kilogram',1],['g','Gram',0.001],['mg','Milligram',1e-6],
  ['lb','Pound',0.45359237],['oz','Ounce',0.028349523125]]),
mkConv('area','🟧','Area Converter','رقبہ کنورٹر','m²',
 [['km2','Sq Kilometer',1e6],['ha','Hectare',1e4],['acre','Acre',4046.8564224],
  ['kanal','Kanal',505.857042],['marla','Marla',25.2929],['m2','Sq Meter',1],
  ['ft2','Sq Foot',0.09290304],['in2','Sq Inch',0.00064516],['cm2','Sq Centimeter',0.0001]]),
mkConv('vol','🧪','Volume Converter','حجم کنورٹر','L',
 [['m3','Cubic Meter',1000],['L','Liter',1],['mL','Milliliter',0.001],
  ['ft3','Cubic Foot',28.316846592],['gal','Gallon (US)',3.785411784],['cup','Cup (US)',0.24]]),
{id:'temp',cat:'convert',icon:'🌡️',name:'Temperature Converter',nameUr:'درجہ حرارت کنورٹر',
 fields:[{k:'v',label:'Value',labelUr:'قدر',type:'number',ph:'0'},
         {k:'from',label:'From',labelUr:'از',type:'select',opts:[['C','°C Celsius'],['F','°F Fahrenheit'],['K','K Kelvin']]},
         {k:'to',label:'To',labelUr:'تک',type:'select',opts:[['C','°C Celsius'],['F','°F Fahrenheit'],['K','K Kelvin']]}],
 compute(inp,P){ const v=toNum(inp.v); if(isBad(v)) return {error:'errNeed'};
   let c; if(inp.from==='C')c=v; else if(inp.from==='F')c=(v-32)*5/9; else c=v-273.15;
   if(c<-273.15) return {error:'Below absolute zero!'};
   let out,unit;
   if(inp.to==='C'){out=c;unit='°C';} else if(inp.to==='F'){out=c*9/5+32;unit='°F';} else {out=c+273.15;unit='K';}
   return {main:fmt(out,P)+' '+unit,
     lines:[['Celsius',fmt(c,P)+' °C'],['Fahrenheit',fmt(c*9/5+32,P)+' °F'],['Kelvin',fmt(c+273.15,P)+' K']],
     steps:['Formulas: °F = °C×9/5+32, K = °C+273.15']}; }},
mkConv('speed','🚗','Speed Converter','رفتار کنورٹر','m/s',
 [['kmh','km/h',1/3.6],['ms','m/s',1],['mph','mph',0.44704],['fts','ft/s',0.3048],['kn','Knots',0.514444]]),
mkConv('time','⏱️','Time Converter','وقت کنورٹر','s',
 [['ms','Millisecond',0.001],['s','Second',1],['min','Minute',60],['hr','Hour',3600],
  ['day','Day',86400],['wk','Week',604800],['mo','Month (30d)',2592000],['yr','Year (365d)',31536000]]),
{id:'digi',cat:'convert',icon:'💾',name:'Digital Storage',nameUr:'ڈیجیٹل اسٹوریج',
 fields:[{k:'v',label:'Value',labelUr:'قدر',type:'number',ph:'1'},
         {k:'sys',label:'System',labelUr:'نظام',type:'select',opts:[['dec','Decimal (KB=1000)'],['bin','Binary (KiB=1024)']]},
         {k:'from',label:'From',labelUr:'از',type:'select',opts:[['b','Bit'],['B','Byte'],['K','Kilo'],['M','Mega'],['G','Giga'],['T','Tera']]},
         {k:'to',label:'To',labelUr:'تک',type:'select',opts:[['b','Bit'],['B','Byte'],['K','Kilo'],['M','Mega'],['G','Giga'],['T','Tera']]}],
 compute(inp,P){ const v=toNum(inp.v); if(isBad(v)) return {error:'errNeed'};
   const base=inp.sys==='dec'?1000:1024;
   const pw={b:0,B:0,K:1,M:2,G:3,T:4};
   const di={b:0,B:1,K:2,M:3,G:4,T:5};
   let bytes=v*Math.pow(base,pw[inp.from]);
   if(inp.from==='b') bytes=v/8;
   let out=bytes/Math.pow(base,pw[inp.to]);
   if(inp.to==='b') out=bytes*8;
   const un=inp.sys==='dec'?['bit','B','KB','MB','GB','TB']:['bit','B','KiB','MiB','GiB','TiB'];
   return {main:fmt(out,P)+' '+un[di[inp.to]],
     lines:[['System',inp.sys==='dec'?'Decimal (1 KB = 1000 B)':'Binary (1 KiB = 1024 B)'],['Bytes',fmt(bytes,2)+' B']],
     note:'Decimal (KB) and Binary (KiB) are shown separately — never mixed.'}; }},
mkConv('press','🔩','Pressure Converter','دباؤ کنورٹر','Pa',
 [['Pa','Pascal',1],['kPa','Kilopascal',1000],['bar','Bar',1e5],['psi','PSI',6894.757293168],
  ['atm','Atmosphere',101325],['mmHg','mmHg',133.322387415]]),
mkConv('energy','⚡','Energy Converter','توانائی کنورٹر','J',
 [['J','Joule',1],['kJ','Kilojoule',1000],['cal','Calorie',4.184],['kcal','Kilocalorie',4184],
  ['Wh','Watt-hour',3600],['kWh','Kilowatt-hour',3.6e6],['BTU','BTU',1055.05585262]]),
{id:'ftin',cat:'convert',icon:'📐',name:'Feet/Inches ↔ cm',nameUr:'فٹ/انچ ↔ سینٹی میٹر',
 fields:[{k:'mode',label:'Direction',labelUr:'سمت',type:'select',opts:[['a','Feet+Inches → cm'],['b','cm → Feet+Inches']]},
         {k:'ft',label:'Feet',labelUr:'فٹ',type:'number',ph:'5'},
         {k:'inch',label:'Inches',labelUr:'انچ',type:'number',ph:'7'},
         {k:'cm',label:'Centimeters',labelUr:'سینٹی میٹر',type:'number',ph:'170'}],
 compute(inp,P){
   if(inp.mode==='a'){ const ft=toNum(inp.ft)||0, inch=toNum(inp.inch)||0;
     if(ft<0||inch<0) return {error:'errNeed'};
     const cm=(ft*12+inch)*2.54;
     return {main:fmt(cm,P)+' cm',lines:[['Total inches',fmt(ft*12+inch,P)],['Centimeters',fmt(cm,P)+' cm']],
       steps:[ft+' ft '+inch+' in = '+(ft*12+inch)+' in × 2.54 = '+fmt(cm,P)+' cm']}; }
   const cm=toNum(inp.cm); if(isBad(cm)||cm<0) return {error:'errNeed'};
   const totIn=cm/2.54, ft=Math.floor(totIn/12), inch=totIn-ft*12;
   return {main:ft+' ft '+fmt(inch,P)+' in',lines:[['Feet',ft],['Inches',fmt(inch,P)],['Total inches',fmt(totIn,P)]]}; }},
);

/* ===== DATE & TIME ===== */
function pDate(s){ // parse YYYY-MM-DD as local date
  const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s||''));
  if(!m) return null;
  const d=new Date(+m[1],+m[2]-1,+m[3]);
  if(d.getFullYear()!==+m[1]||d.getMonth()!==+m[2]-1||d.getDate()!==+m[3]) return null;
  return d;
}
function pDateTime(s){ // YYYY-MM-DDTHH:MM
  const m=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(s||''));
  if(!m) return null;
  return new Date(+m[1],+m[2]-1,+m[3],+m[4],+m[5]);
}
TOOLS.push(
{id:'age',cat:'date',icon:'🎂',name:'Age Calculator',nameUr:'عمر کیلکولیٹر',
 fields:[{k:'dob',label:'Date of birth',labelUr:'تاریخ پیدائش',type:'date'}],
 compute(){ const dob=pDate(arguments[0].dob);
   if(!dob) return {error:'Enter a valid date of birth'};
   const now=new Date(); now.setHours(0,0,0,0);
   if(dob>now) return {error:'Birth date cannot be in the future'};
   let y=now.getFullYear()-dob.getFullYear(), m=now.getMonth()-dob.getMonth(), d=now.getDate()-dob.getDate();
   if(d<0){ m--; d+=new Date(now.getFullYear(),now.getMonth(),0).getDate(); }
   if(m<0){ y--; m+=12; }
   const totalDays=Math.floor((now-dob)/86400000);
   // next birthday
   let nb=new Date(now.getFullYear(),dob.getMonth(),dob.getDate());
   if(nb<now) nb=new Date(now.getFullYear()+1,dob.getMonth(),dob.getDate());
   const toBday=Math.ceil((nb-now)/86400000);
   return {main:y+' years, '+m+' months, '+d+' days',
     lines:[['Age',y+'y '+m+'m '+d+'d'],['Total days',totalDays.toLocaleString()],['Total months',y*12+m],['Next birthday','in '+toBday+' day(s)']]}; }},
{id:'daysbetween',cat:'date',icon:'📆',name:'Days Between Dates',nameUr:'تاریخوں کے درمیان دن',
 fields:[{k:'d1',label:'From date',labelUr:'از تاریخ',type:'date'},{k:'d2',label:'To date',labelUr:'تک تاریخ',type:'date'}],
 compute(inp,P){ const a=pDate(inp.d1),b=pDate(inp.d2);
   if(!a||!b) return {error:'Enter two valid dates'};
   const days=Math.round((b-a)/86400000);
   return {main:Math.abs(days)+' day(s)',
     lines:[['From',inp.d1],['To',inp.d2],['Difference',Math.abs(days)+' days'],['Direction',days>=0?'Forward':'Backward'],['Weeks',fmt(Math.abs(days)/7,P)]]}; }},
{id:'datediff',cat:'date',icon:'🗓️',name:'Date Difference (Y/M/D)',nameUr:'تاریخ کا فرق',
 fields:[{k:'d1',label:'From date',labelUr:'از تاریخ',type:'date'},{k:'d2',label:'To date',labelUr:'تک تاریخ',type:'date'}],
 compute(inp){ let a=pDate(inp.d1),b=pDate(inp.d2);
   if(!a||!b) return {error:'Enter two valid dates'};
   if(a>b){ const t=a;a=b;b=t; }
   let y=b.getFullYear()-a.getFullYear(), m=b.getMonth()-a.getMonth(), d=b.getDate()-a.getDate();
   if(d<0){ m--; d+=new Date(b.getFullYear(),b.getMonth(),0).getDate(); }
   if(m<0){ y--; m+=12; }
   const days=Math.round((b-a)/86400000);
   return {main:y+'y '+m+'m '+d+'d',
     lines:[['Breakdown',y+' years, '+m+' months, '+d+' days'],['Total days',days.toLocaleString()],['Total weeks',(days/7).toFixed(1)]]}; }},
{id:'bday',cat:'date',icon:'🎉',name:'Birthday Countdown',nameUr:'سالگرہ الٹی گنتی',
 fields:[{k:'dob',label:'Birth date',labelUr:'تاریخ پیدائش',type:'date'}],
 compute(){ const dob=pDate(arguments[0].dob);
   if(!dob) return {error:'Enter a valid birth date'};
   const now=new Date(); now.setHours(0,0,0,0);
   let nb=new Date(now.getFullYear(),dob.getMonth(),dob.getDate());
   if(nb<now) nb=new Date(now.getFullYear()+1,dob.getMonth(),dob.getDate());
   const days=Math.ceil((nb-now)/86400000);
   const turning=nb.getFullYear()-dob.getFullYear();
   return {main:days===0?'🎉 Today!':days+' day(s) to go',
     lines:[['Next birthday',nb.toDateString()],['Days left',days],['Turning',turning+' years old']]}; }},
{id:'deadline',cat:'date',icon:'⏳',name:'Deadline Countdown',nameUr:'ڈیڈ لائن الٹی گنتی',
 fields:[{k:'dt',label:'Deadline (date & time)',labelUr:'آخری تاریخ و وقت',type:'datetime'}],
 compute(inp,P){ const t=pDateTime(inp.dt);
   if(!t) return {error:'Enter a valid date and time'};
   let ms=t-new Date();
   if(ms<0) return {main:'⏰ Passed',lines:[['Status','Deadline has passed']],error:null} ;
   const d=Math.floor(ms/86400000); ms%=86400000;
   const h=Math.floor(ms/3600000); ms%=3600000;
   const mi=Math.floor(ms/60000); const s=Math.floor(ms%60000/1000);
   return {main:d+'d '+h+'h '+mi+'m '+s+'s',
     lines:[['Days',d],['Hours',h],['Minutes',mi],['Seconds',s]],
     note:'Tip: reopen the tool to refresh the countdown.'}; }},
{id:'stopwatch',cat:'date',icon:'⏱️',name:'Stopwatch',nameUr:'اسٹاپ واچ',custom:'stopwatch',fields:[]},
{id:'timer',cat:'date',icon:'🔔',name:'Countdown Timer',nameUr:'ٹائمر',
 fields:[{k:'min',label:'Minutes',labelUr:'منٹ',type:'number',ph:'5'},{k:'sec',label:'Seconds',labelUr:'سیکنڈ',type:'number',ph:'0'}],
 custom:'timer'},
);

/* ===== TEXT & SMART ===== */
TOOLS.push(
{id:'counter',cat:'text',icon:'🔤',name:'Word & Character Counter',nameUr:'الفاظ و حروف گنتی',
 fields:[{k:'t',label:'Text',labelUr:'متن',type:'textarea',ph:'Type or paste text here…'}],
 compute(inp){ const t=String(inp.t||'');
   const words=(t.trim().match(/\S+/g)||[]).length;
   const chars=t.length, noSp=t.replace(/\s/g,'').length;
   const sent=(t.match(/[^.!?]+[.!?]+/g)||[]).length || (t.trim()?1:0);
   const paras=t.split(/\n\s*\n/).filter(x=>x.trim()).length;
   const readMin=words/200;
   return {main:words+' words • '+chars+' chars',
     lines:[['Words',words],['Characters (with spaces)',chars],['Characters (no spaces)',noSp],
            ['Sentences',t.trim()?sent:0],['Paragraphs',paras],['Reading time','~'+readMin.toFixed(1)+' min (200 wpm)']]}; }},
{id:'caseconv',cat:'text',icon:'🔠',name:'Case Converter',nameUr:'حروف کنورٹر',
 fields:[{k:'t',label:'Text',labelUr:'متن',type:'textarea',ph:'hello world'},
         {k:'m',label:'Convert to',labelUr:'تبدیل کریں',type:'select',
          opts:[['u','UPPERCASE'],['l','lowercase'],['t','Title Case'],['s','Sentence case'],['a','aLtErNaTiNg']]}],
 compute(inp){ const t=String(inp.t||''); let out=t;
   if(inp.m==='u') out=t.toUpperCase();
   else if(inp.m==='l') out=t.toLowerCase();
   else if(inp.m==='t') out=t.toLowerCase().replace(/(^|[\s\-'"(])\S/g,c=>c.toUpperCase());
   else if(inp.m==='s') out=t.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g,c=>c.toUpperCase());
   else if(inp.m==='a') out=[...t].map((c,i)=>i%2?c.toLowerCase():c.toUpperCase()).join('');
   return {main:'Converted ✓',lines:[['Output','(copied below)']],raw:out,
     note:'Use Copy to grab the converted text.'}; }},
{id:'trim',cat:'text',icon:'✂️',name:'Trim Extra Spaces',nameUr:'اضافی اسپیس صاف کریں',
 fields:[{k:'t',label:'Text',labelUr:'متن',type:'textarea',ph:'too   many    spaces'},
         {k:'m',label:'Options',labelUr:'آپشنز',type:'select',
          opts:[['a','Collapse spaces + trim lines'],['t','Trim each line only'],['e','Remove ALL whitespace']]}],
 compute(inp){ let t=String(inp.t||'');
   if(inp.m==='a') t=t.split('\n').map(l=>l.replace(/\s+/g,' ').trim()).join('\n').replace(/\n{3,}/g,'\n\n');
   else if(inp.m==='t') t=t.split('\n').map(l=>l.trim()).join('\n');
   else t=t.replace(/\s+/g,'');
   return {main:'Cleaned ✓',lines:[['Characters',t.length]],raw:t,
     note:'Use Copy to grab the cleaned text.'}; }},
{id:'qr',cat:'text',icon:'🔳',name:'QR Code Generator',nameUr:'کیو آر جنریٹر',
 fields:[{k:'t',label:'Text / URL / contact',labelUr:'متن / لنک',type:'textarea',ph:'https://example.com'},
         {k:'s',label:'Size',labelUr:'سائز',type:'select',opts:[['4','Small'],['6','Medium'],['8','Large'],['10','X-Large']]}],
 custom:'qr'},
{id:'passgen',cat:'text',icon:'🔐',name:'Password Generator',nameUr:'پاس ورڈ جنریٹر',
 fields:[{k:'len',label:'Length',labelUr:'لمبائی',type:'number',ph:'16'},
         {k:'up',label:'Include',labelUr:'شامل',type:'checks',opts:[['A','A-Z'],['a','a-z'],['9','0-9'],['#','!@#$%…']]},
         {k:'n',label:'How many',labelUr:'کتنے',type:'number',ph:'3'}],
 compute(inp){ const len=Math.round(toNum(inp.len))||16, n=Math.min(Math.round(toNum(inp.n))||1,20);
   if(len<4||len>128) return {error:'Length must be 4–128'};
   const sel=Array.isArray(inp.up)?inp.up:[];
   let pool='';
   if(sel.includes('A'))pool+='ABCDEFGHJKLMNPQRSTUVWXYZ';
   if(sel.includes('a'))pool+='abcdefghijkmnopqrstuvwxyz';
   if(sel.includes('9'))pool+='23456789';
   if(sel.includes('#'))pool+='!@#$%^&*()-_=+[]{};:,.<>?';
   if(!pool) return {error:'Select at least one character type'};
   const rnd=new Uint32Array(len*n);
   const cryptoObj=(typeof crypto!=='undefined'&&crypto.getRandomValues)?crypto:null;
   if(!cryptoObj) return {error:'Secure random not available on this device'};
   cryptoObj.getRandomValues(rnd);
   const out=[];
   for(let j=0;j<n;j++){ let s=''; for(let i=0;i<len;i++) s+=pool[rnd[j*len+i]%pool.length]; out.push(s); }
   return {main:out[0],lines:out.map((p,i)=>['Password '+(i+1),p]),raw:out.join('\n'),
     note:'Uses your device\u2019s secure random generator. Store passwords in a password manager.'}; }},
{id:'randnum',cat:'text',icon:'🎲',name:'Random Number',nameUr:'رینڈم نمبر',
 fields:[{k:'min',label:'Min',labelUr:'کم از کم',type:'number',ph:'1'},
         {k:'max',label:'Max',labelUr:'زیادہ سے زیادہ',type:'number',ph:'100'},
         {k:'c',label:'Count',labelUr:'تعداد',type:'number',ph:'5'},
         {k:'u',label:'Unique only',labelUr:'منفرد',type:'select',opts:[['n','No'],['y','Yes']]}],
 compute(inp){ let a=Math.round(toNum(inp.min)),b=Math.round(toNum(inp.max)),c=Math.min(Math.round(toNum(inp.c))||1,100);
   if(isBad(a)||isBad(b)||a>b) return {error:'Min must be ≤ Max'};
   if(inp.u==='y'&&(b-a+1)<c) return {error:'Range too small for '+c+' unique numbers'};
   const out=[],seen={};
   const cryptoOk=typeof crypto!=='undefined'&&crypto.getRandomValues;
   function rint(){ if(cryptoOk){const r=new Uint32Array(1);crypto.getRandomValues(r);return a+r[0]%(b-a+1);}
     return a+Math.floor(Math.random()*(b-a+1)); }
   let guard=0;
   while(out.length<c&&guard++<10000){ const v=rint();
     if(inp.u==='y'){ if(seen[v])continue; seen[v]=1; } out.push(v); }
   return {main:out.join(', '),lines:[['Numbers',out.join(', ')],['Range',a+' – '+b]],raw:out.join(', ')}; }},
{id:'colorconv',cat:'text',icon:'🎨',name:'Color Converter',nameUr:'رنگ کنورٹر',
 fields:[{k:'hex',label:'HEX (e.g. #14b8a6)',labelUr:'ہیکس',type:'text',ph:'#14b8a6'}],
 compute(inp,P){ let h=String(inp.hex||'').trim().replace('#','');
   if(/^[0-9a-fA-F]{3}$/.test(h)) h=h.split('').map(c=>c+c).join('');
   if(!/^[0-9a-fA-F]{6}$/.test(h)) return {error:'Enter a valid HEX like #14b8a6'};
   const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
   const R=r/255,G=g/255,B=b/255, mx=Math.max(R,G,B),mn=Math.min(R,G,B);
   let H=0; const d=mx-mn;
   if(d){ if(mx===R)H=((G-B)/d)%6; else if(mx===G)H=(B-R)/d+2; else H=(R-G)/d+4; H*=60; if(H<0)H+=360; }
   const L=(mx+mn)/2, S=d?(d/(1-Math.abs(2*L-1))):0;
   return {main:'#'+h.toUpperCase(),
     lines:[['HEX','#'+h.toUpperCase()],['RGB','rgb('+r+', '+g+', '+b+')'],
            ['HSL','hsl('+Math.round(H)+', '+Math.round(S*100)+'%, '+Math.round(L*100)+'%)']],
     swatch:'#'+h}; }},
{id:'jsonfmt',cat:'text',icon:'🧾',name:'JSON Formatter',nameUr:'جیسون فارمیٹر',
 fields:[{k:'t',label:'JSON',labelUr:'جیسون',type:'textarea',ph:'{"a":1,"b":[2,3]}'}],
 compute(inp){ const t=String(inp.t||'').trim();
   if(!t) return {error:'Paste JSON first'};
   try{ const o=JSON.parse(t);
     const pretty=JSON.stringify(o,null,2);
     return {main:'Valid JSON ✓',lines:[['Keys',Array.isArray(o)?o.length+' items':Object.keys(o).length+' keys'],['Size',pretty.length+' chars']],raw:pretty}; }
   catch(e){ return {error:'Invalid JSON: '+e.message}; } }},
);

/* ===== PERSONAL ===== */
TOOLS.push(
{id:'bmi',cat:'personal',icon:'⚖️',name:'BMI Calculator',nameUr:'بی ایم آئی کیلکولیٹر',
 fields:[{k:'sys',label:'Units',labelUr:'اکائی',type:'select',opts:[['m','Metric (kg, cm)'],['i','Imperial (lb, in)']]},
         {k:'w',label:'Weight',labelUr:'وزن',type:'number',ph:'70'},
         {k:'h',label:'Height',labelUr:'قد',type:'number',ph:'170'}],
 compute(inp,P){ const w=toNum(inp.w),h=toNum(inp.h);
   if(isBad(w)||isBad(h)||w<=0||h<=0) return {error:'errNeed'};
   let kg=w, m=h/100;
   if(inp.sys==='i'){ kg=w*0.45359237; m=h*0.0254; }
   const bmi=kg/(m*m);
   let cat=bmi<18.5?'Underweight':bmi<25?'Normal':bmi<30?'Overweight':'Obese';
   return {main:fmt(bmi,P)+' — '+cat,
     lines:[['BMI',fmt(bmi,P)],['Category (adult)',cat]],
     note:'⚠️ BMI is a general screening measure, not a medical diagnosis. Consult a doctor for health advice.'}; }},
{id:'water',cat:'personal',icon:'💧',name:'Water Intake Estimator',nameUr:'پانی کا تخمینہ',
 fields:[{k:'w',label:'Weight (kg)',labelUr:'وزن (کلو)',type:'number',ph:'70'},
         {k:'act',label:'Activity',labelUr:'سرگرمی',type:'select',opts:[['l','Light'],['m','Moderate'],['h','Heavy']]}],
 compute(inp,P){ const w=toNum(inp.w);
   if(isBad(w)||w<=0||w>500) return {error:'Enter a valid weight'};
   let ml=w*35; if(inp.act==='m')ml*=1.15; if(inp.act==='h')ml*=1.3;
   return {main:fmt(ml/1000,P)+' liters / day',
     lines:[['Estimated intake',fmt(ml,0)+' ml / day'],['Glasses (250ml)',Math.round(ml/250)]],
     note:'⚠️ Rough estimate only — not personalized medical advice. Hot weather, illness & exercise change needs.'}; }},
{id:'savegoal',cat:'personal',icon:'🎯',name:'Savings Goal',nameUr:'بچت کا ہدف',
 fields:[{k:'target',label:'Goal amount (Rs)',labelUr:'ہدف رقم (روپے)',type:'number',ph:'100000'},
         {k:'have',label:'Already saved (Rs)',labelUr:'موجودہ بچت (روپے)',type:'number',ph:'20000'},
         {k:'mo',label:'Months',labelUr:'مہینے',type:'number',ph:'10'}],
 compute(inp,P){ const t=toNum(inp.target),h=toNum(inp.have)||0,mo=toNum(inp.mo);
   if(isBad(t)||isBad(mo)||t<=0||mo<=0) return {error:'errNeed'};
   const need=t-h;
   if(need<=0) return {main:'Goal already reached! 🎉',lines:[['Target',money(t)],['Saved',money(h)]]};
   return {main:money(need/mo)+' / month',
     lines:[['Still needed',money(need)],['Per month',money(need/mo)],['Per week','~'+money(need/mo*12/52)]],
     note:'Assumes no interest. Split monthly amount into weekly savings to stay on track.'}; }},
{id:'saveint',cat:'personal',icon:'🏦',name:'Savings Interest',nameUr:'بچت پر منافع',
 fields:[{k:'p',label:'Deposit (Rs)',labelUr:'رقم (روپے)',type:'number',ph:'100000'},
         {k:'r',label:'Annual rate %',labelUr:'سالانہ شرح %',type:'number',ph:'12'},
         {k:'t',label:'Years',labelUr:'سال',type:'number',ph:'3'},
         {k:'n',label:'Compound',labelUr:'مرکب',type:'select',opts:[['1','Yearly'],['4','Quarterly'],['12','Monthly']]}],
 compute(inp,P){ const p=toNum(inp.p),r=toNum(inp.r),t=toNum(inp.t),n=toNum(inp.n);
   if(isBad(p)||isBad(r)||isBad(t)||p<0||t<0) return {error:'errNeed'};
   const A=p*Math.pow(1+r/100/n,n*t);
   return {main:money(A),
     lines:[['Deposit',money(p)],['Profit earned',money(A-p)],['Maturity value',money(A)]],
     note:'Assumes fixed rate, no withdrawals, no taxes/fees.'}; }},
);

/* ---------- tool lookup (pure) ---------- */
function getTool(id){ return TOOLS.find(t=>t.id===id); }
function catName(id,lang){ const s=STR[lang]||STR.en; return s[id]||id; }

/* ================= APP (DOM layer — browser only) ================= */
function appInit(){
'use strict';
const $=id=>document.getElementById(id);
const app=$('app');

/* ----- persistent state ----- */
function lsGet(k,def){ try{ const v=localStorage.getItem('jato_'+k); return v===null?def:JSON.parse(v); }catch(e){ return def; } }
function lsSet(k,v){ try{ localStorage.setItem('jato_'+k,JSON.stringify(v)); }catch(e){} }
let settings=Object.assign({theme:'light',lang:'en',prec:4},lsGet('settings',{}));
let favs=lsGet('favs',[]), recents=lsGet('recents',[]), hist=lsGet('hist',[]);
function saveState(){ lsSet('settings',settings); lsSet('favs',favs); lsSet('recents',recents); lsSet('hist',hist.slice(0,50)); }

function t(k){ return (STR[settings.lang]&&STR[settings.lang][k])||STR.en[k]||k; }
function toolName(tl){ return settings.lang==='ur'&&tl.nameUr?tl.nameUr:tl.name; }
function fieldLabel(f){ return settings.lang==='ur'&&f.labelUr?f.labelUr:f.label; }
function toast(msg){ const d=document.createElement('div'); d.className='toast'; d.textContent=msg;
  document.body.appendChild(d); setTimeout(()=>d.remove(),1800); }
function esc(s){ return String(s===undefined||s===null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

function applyPrefs(){
  document.documentElement.dataset.theme=settings.theme;
  document.documentElement.dir=settings.lang==='ur'?'rtl':'ltr';
  document.documentElement.lang=settings.lang==='ur'?'ur':'en';
}

/* ----- navigation stack ----- */
let viewStack=[];
function go(view){ viewStack.push(view); render(); try{window.scrollTo(0,0);}catch(e){} }
function back(){
  stopCustom();
  if(viewStack.length>1){ viewStack.pop(); render(); try{window.scrollTo(0,0);}catch(e){} return true; }
  return false;
}
function appBack(){ return back(); } // Android WebView hook
window.appBack=appBack;

/* ----- dashboard ----- */
let dashCat='all', dashQ='';
function toolCard(tl){
  const fav=favs.includes(tl.id)?'<span class="fav">⭐</span>':'';
  return '<div class="tcard" data-tool="'+tl.id+'">'+fav+'<div class="ic">'+tl.icon+'</div><div class="nm">'+esc(toolName(tl))+'</div></div>';
}
function renderDash(){
  const q=dashQ.trim().toLowerCase();
  const tools=TOOLS.filter(tl=>
    (dashCat==='all'||tl.cat===dashCat)&&
    (!q||toolName(tl).toLowerCase().includes(q)||tl.name.toLowerCase().includes(q)));
  let h='<div class="hdr"><div class="row"><div class="logo">🛠️</div>'+
    '<div><h1>Jilan All-in-One Tools</h1><div class="tag">'+esc(t('tagline'))+'</div></div>'+
    '<div class="sp"></div>'+
    '<button class="icobtn" id="bHist" title="'+esc(t('history'))+'">🕘</button>'+
    '<button class="icobtn" id="bSet" title="'+esc(t('settings'))+'">⚙️</button></div>'+
    '<div class="search"><input id="q" placeholder="'+esc(t('search'))+'" value="'+esc(dashQ)+'"><span>🔍</span></div></div>';
  h+='<div class="main">';
  // quick calculator
  h+='<div class="sec-t">⚡ '+esc(t('quick'))+'</div><div class="qc"><div class="qr">'+
     '<input id="qcexpr" inputmode="decimal" placeholder="'+esc(t('enter'))+'">'+
     '<button class="btn btn-p" id="qcgo" style="width:auto;margin:0;padding:11px 18px">=</button></div>'+
     '<div class="out" id="qcout"></div></div>';
  if(favs.length){
    h+='<div class="sec-t">⭐ '+esc(t('fav'))+'</div><div class="grid">'+
       favs.map(id=>getTool(id)).filter(Boolean).map(toolCard).join('')+'</div>';
  }
  if(recents.length){
    h+='<div class="sec-t">🕘 '+esc(t('recent'))+'</div><div class="grid">'+
       recents.map(id=>getTool(id)).filter(Boolean).slice(0,6).map(toolCard).join('')+'</div>';
  }
  h+='<div class="sec-t">🧰 '+esc(t('all'))+' <span class="c">('+TOOLS.length+')</span></div><div class="chips">';
  h+='<button class="chip'+(dashCat==='all'?' on':'')+'" data-cat="all">'+esc(t('all'))+'</button>';
  h+=CATS.map(c=>'<button class="chip'+(dashCat===c.id?' on':'')+'" data-cat="'+c.id+'">'+c.icon+' '+esc(catName(c.id,settings.lang))+'</button>').join('');
  h+='</div><div class="grid">'+(tools.map(toolCard).join('')||'<div class="empty">'+esc(t('search'))+' — 0</div>')+'</div>';
  h+='<div class="foot">Jilan All-in-One Tools • '+esc(t('version'))+'<br>🔒 '+esc(t('privText')).slice(0,60)+'…</div>';
  h+='</div>';
  app.innerHTML=h;
  $('q').addEventListener('input',e=>{dashQ=e.target.value; renderDash(); const nq=$('q'); nq.focus(); nq.setSelectionRange(nq.value.length,nq.value.length);});
  document.querySelectorAll('.chip').forEach(c=>c.addEventListener('click',()=>{dashCat=c.dataset.cat;renderDash();}));
  document.querySelectorAll('.tcard').forEach(c=>c.addEventListener('click',()=>go({v:'tool',id:c.dataset.tool})));
  $('bSet').addEventListener('click',()=>go({v:'settings'}));
  $('bHist').addEventListener('click',()=>go({v:'history'}));
  const qcRun=()=>{ const r=evalExpr($('qcexpr').value);
    $('qcout').textContent=r.error?('⚠️ '+r.error):('= '+fmt(r.value,settings.prec)); };
  $('qcgo').addEventListener('click',qcRun);
  $('qcexpr').addEventListener('keydown',e=>{if(e.key==='Enter')qcRun();});
}

/* ----- field rendering ----- */
function fieldHtml(f){
  const id='f_'+f.k, lb=fieldLabel(f);
  let inner='';
  if(f.type==='select'){
    inner='<select id="'+id+'">'+f.opts.map(o=>'<option value="'+esc(o[0])+'">'+esc(o[1])+'</option>').join('')+'</select>';
  }else if(f.type==='textarea'){
    inner='<textarea id="'+id+'" placeholder="'+esc(f.ph||'')+'"></textarea>';
  }else if(f.type==='date'){
    inner='<input type="date" id="'+id+'">';
  }else if(f.type==='datetime'){
    inner='<input type="datetime-local" id="'+id+'">';
  }else if(f.type==='checks'){
    inner='<div class="checks">'+f.opts.map((o,i)=>'<label><input type="checkbox" name="'+id+'" value="'+esc(o[0])+'"'+(i<3?' checked':'')+'> '+esc(o[1])+'</label>').join('')+'</div>';
  }else{
    inner='<input id="'+id+'" type="'+(f.type==='number'?'number':'text')+'" inputmode="decimal" placeholder="'+esc(f.ph||'')+'">';
  }
  return '<div class="field"><label>'+esc(lb)+'</label>'+inner+'</div>';
}
function gatherInputs(tool){
  const inp={};
  (tool.fields||[]).forEach(f=>{
    if(f.type==='checks'){
      inp[f.k]=[...document.querySelectorAll('input[name="f_'+f.k+'"]:checked')].map(c=>c.value);
    }else{ const el=$('f_'+f.k); inp[f.k]=el?el.value:''; }
  });
  return inp;
}

/* ----- custom interactive tools ----- */
let customTimer=null;
function stopCustom(){ if(customTimer){clearInterval(customTimer);customTimer=null;} }

function renderCustom(tool,box){
  if(tool.custom==='stopwatch'){
    box.innerHTML='<div class="sw-big" id="swd">00:00.0</div>'+
      '<div class="btnrow"><button class="btn btn-p" id="sws">▶ Start</button>'+
      '<button class="btn btn-o" id="swl">🏁 Lap</button>'+
      '<button class="btn btn-o" id="swr">↺</button></div><div class="laps" id="swlaps"></div>';
    let start=0,acc=0,run=false,laps=[];
    const draw=()=>{const e=acc+(run?Date.now()-start:0);
      const m=Math.floor(e/60000),s=Math.floor(e%60000/1000),d=Math.floor(e%1000/100);
      $('swd').textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')+'.'+d;};
    $('sws').onclick=()=>{ if(run){acc+=Date.now()-start;run=false;$('sws').textContent='▶ Start';}
      else{start=Date.now();run=true;$('sws').textContent='⏸ Pause';}
      stopCustom(); if(run) customTimer=setInterval(draw,50); };
    $('swr').onclick=()=>{stopCustom();run=false;acc=0;laps=[];$('swlaps').innerHTML='';$('sws').textContent='▶ Start';draw();};
    $('swl').onclick=()=>{ if(!run&&acc===0)return; const e=acc+(run?Date.now()-start:0);
      laps.push(e); $('swlaps').innerHTML=laps.map((l,i)=>'<div><span>Lap '+(i+1)+'</span><b>'+(l/1000).toFixed(1)+'s</b></div>').join(''); };
    draw(); return;
  }
  if(tool.custom==='timer'){
    box.innerHTML='<div class="sw-big" id="tmd">--:--</div>'+
      '<div class="btnrow"><button class="btn btn-p" id="tms">▶ Start</button>'+
      '<button class="btn btn-o" id="tmr">↺</button></div>'+
      '<div class="note" style="font-size:12px;color:var(--mut)">Uses the Minutes/Seconds above.</div>';
    let end=0,left=0,run=false;
    const draw=()=>{const ms=run?Math.max(0,end-Date.now()):left;
      const m=Math.floor(ms/60000),s=Math.ceil(ms%60000/1000);
      $('tmd').textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');};
    const beep=()=>{try{const C=window.AudioContext||window.webkitAudioContext;const c=new C();
      [0,0.25,0.5].forEach(dt=>{const o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);
      o.frequency.value=880;g.gain.setValueAtTime(0.001,c.currentTime+dt);g.gain.exponentialRampToValueAtTime(0.5,c.currentTime+dt+0.02);
      g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+dt+0.22);o.start(c.currentTime+dt);o.stop(c.currentTime+dt+0.25);});}catch(e){}};
    const tick=()=>{ if(Date.now()>=end){stopCustom();run=false;left=0;draw();$('tms').textContent='▶ Start';beep();toast('⏰ Time up!');} else draw(); };
    $('tms').onclick=()=>{ if(run){left=end-Date.now();run=false;stopCustom();$('tms').textContent='▶ Start';}
      else{ const inp=gatherInputs(tool); const ms=((toNum(inp.min)||0)*60+(toNum(inp.sec)||0))*1000;
        if(ms<=0){toast('⚠️ '+t('errNeed'));return;}
        left=left>0?left:ms; end=Date.now()+left; run=true; $('tms').textContent='⏸ Pause';
        stopCustom(); customTimer=setInterval(tick,200);} draw(); };
    $('tmr').onclick=()=>{stopCustom();run=false;left=0;$('tms').textContent='▶ Start';draw();};
    draw(); return;
  }
  if(tool.custom==='qr'){
    box.innerHTML='<div id="qrz"></div><button class="btn btn-p" id="qrg">Generate QR</button>';
    $('qrg').onclick=()=>{
      const inp=gatherInputs(tool); const txt=String(inp.t||'').trim();
      if(!txt){$('qrz').innerHTML='<div class="err">Enter some text first.</div>';return;}
      if(typeof qrcode==='undefined'){$('qrz').innerHTML='<div class="err">QR library not loaded (needs the local qrcode.min.js file).</div>';return;}
      try{
        const qr=qrcode(0,'M'); qr.addData(txt); qr.make(); // 0 = auto version
        const size={4:4,6:6,8:8,10:10}[inp.s]||6;
        $('qrz').innerHTML='<div class="qrbox"><img src="'+qr.createDataURL(size,4)+'" alt="QR"></div>'+
          '<div class="note" style="font-size:12px;color:var(--mut)">Scan with any camera app. Generated 100% offline on your device.</div>';
      }catch(e){ $('qrz').innerHTML='<div class="err">Text too long for QR (max ~1500 chars). Try shorter text.</div>'; }
    };
    return;
  }
}

/* ----- tool screen ----- */
let lastResult=null,lastTool=null,showSteps=false;
function renderTool(id){
  const tool=getTool(id); if(!tool){back();return;}
  const isFav=favs.includes(id);
  let h='<div class="tbar"><button class="icobtn" id="bk">←</button><h2>'+tool.icon+' '+esc(toolName(tool))+'</h2>'+
        '<button class="favb" id="fv">'+(isFav?'⭐':'☆')+'</button></div><div class="main">';
  const fields=tool.fields||[];
  for(let i=0;i<fields.length;i+=2){
    const pair=fields.slice(i,i+2);
    if(pair.length===2&&(pair[0].type==='number'||pair[0].type==='select')&&(pair[1].type==='number'||pair[1].type==='select'))
      h+='<div class="frow">'+pair.map(fieldHtml).join('')+'</div>';
    else h+=pair.map(fieldHtml).join('');
  }
  h+='<div id="custom"></div>';
  if(!tool.custom||tool.fields.length) h+='<button class="btn btn-p" id="calcBtn">'+esc(t('calculate'))+'</button>';
  h+='<div id="res"></div>';
  h+='<div class="btnrow"><button class="btn btn-o" id="cpBtn">📋 '+esc(t('copy'))+'</button>'+
     '<button class="btn btn-o" id="shBtn">📤 '+esc(t('share'))+'</button>'+
     '<button class="btn btn-o" id="rsBtn">↺ '+esc(t('reset'))+'</button></div>';
  h+='</div>';
  app.innerHTML=h;
  $('bk').onclick=()=>back();
  $('fv').onclick=()=>{ const i=favs.indexOf(id);
    if(i>=0)favs.splice(i,1); else favs.unshift(id); saveState(); renderTool(id); };
  renderCustom(tool,$('custom'));
  const run=()=>{
    stopCustom();
    const inp=gatherInputs(tool);
    let r;
    try{ r=tool.compute(inp,settings.prec); }catch(e){ r={error:'Calculation error'}; }
    if(r.error){ const msg=r.error==='errNeed'?t('errNeed'):r.error;
      $('res').innerHTML='<div class="err">⚠️ '+esc(msg)+'</div>'; lastResult=null; return; }
    lastResult=r; lastTool=tool;
    let rh='<div class="res"><div style="font-size:12px;color:var(--mut);font-weight:700">'+esc(t('result'))+'</div>'+
           '<div class="main-v">'+esc(r.main)+'</div>';
    if(r.swatch) rh+='<div style="height:44px;border-radius:8px;background:'+esc(r.swatch)+';margin:8px 0;border:1px solid var(--line)"></div>';
    (r.lines||[]).forEach(L=>{ rh+='<div class="ln"><span>'+esc(L[0])+'</span><b>'+esc(L[1])+'</b></div>'; });
    if(r.steps&&r.steps.length){
      rh+='<button class="btn btn-o" id="stBtn" style="margin-top:10px">'+esc(showSteps?t('hideSteps'):t('steps'))+'</button>';
      if(showSteps) rh+='<div class="steps">'+r.steps.map(s=>esc(s)).join('<br>')+'</div>';
    }
    if(r.note) rh+='<div class="note">'+esc(r.note)+'</div>';
    if(r.raw) rh+='<textarea id="rawOut" readonly style="width:100%;min-height:90px;margin-top:8px;border:1px solid var(--line);border-radius:8px;padding:10px;background:var(--bg);color:var(--txt)">'+esc(r.raw)+'</textarea>';
    rh+='</div>';
    $('res').innerHTML=rh;
    const sb=$('stBtn'); if(sb) sb.onclick=()=>{showSteps=!showSteps;run();};
    // history + recents
    const summ=Object.keys(inp).slice(0,3).map(k=>String(inp[k]).slice(0,24)).join(' · ');
    hist.unshift({tool:id,name:toolName(tool),summ,main:String(r.main).slice(0,80),time:Date.now()});
    hist=hist.slice(0,50);
    recents=[id,...recents.filter(x=>x!==id)].slice(0,12);
    saveState();
    try{ $('res').scrollIntoView({behavior:'smooth',block:'nearest'}); }catch(e){}
  };
  const cb=$('calcBtn'); if(cb) cb.onclick=run;
  (tool.fields||[]).forEach(f=>{ const el=$('f_'+f.k);
    if(el&&el.tagName==='INPUT') el.addEventListener('keydown',e=>{if(e.key==='Enter')run();}); });
  $('cpBtn').onclick=()=>{
    if(!lastResult){toast('—');return;}
    const txt=lastResult.raw||(toolName(lastTool)+': '+lastResult.main);
    copyText(txt); };
  $('shBtn').onclick=()=>{
    if(!lastResult){toast('—');return;}
    const txt=toolName(lastTool)+': '+lastResult.main;
    if(navigator.share) navigator.share({title:'Jilan All-in-One Tools',text:txt}).catch(()=>{});
    else copyText(txt); };
  $('rsBtn').onclick=()=>{ renderTool(id); };
}
function copyText(txt){
  const done=()=>toast('✅ '+t('copied'));
  if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done).catch(()=>fallback());
  else fallback();
  function fallback(){ const ta=document.createElement('textarea'); ta.value=txt; document.body.appendChild(ta);
    ta.select(); try{document.execCommand('copy');done();}catch(e){} ta.remove(); }
}

/* ----- settings & history ----- */
function renderSettings(){
  let h='<div class="tbar"><button class="icobtn" id="bk">←</button><h2>⚙️ '+esc(t('settings'))+'</h2></div><div class="main">';
  h+='<div class="setrow"><div><div class="sl">'+esc(t('theme'))+'</div></div><div class="seg">'+
     '<button data-th="light" class="'+(settings.theme==='light'?'on':'')+'">'+esc(t('light'))+'</button>'+
     '<button data-th="dark" class="'+(settings.theme==='dark'?'on':'')+'">'+esc(t('dark'))+'</button></div></div>';
  h+='<div class="setrow"><div><div class="sl">'+esc(t('lang'))+'</div></div><div class="seg">'+
     '<button data-lg="en" class="'+(settings.lang==='en'?'on':'')+'">English</button>'+
     '<button data-lg="ur" class="'+(settings.lang==='ur'?'on':'')+'">اردو</button></div></div>';
  h+='<div class="setrow"><div><div class="sl">'+esc(t('prec'))+'</div></div>'+
     '<select id="precS">'+[0,1,2,3,4,5,6].map(p=>'<option value="'+p+'"'+(settings.prec===p?' selected':'')+'>'+p+'</option>').join('')+'</select></div>';
  h+='<div class="setrow"><div><div class="sl">🔒 '+esc(t('privacy'))+'</div><div class="sd">'+esc(t('privText'))+'</div></div></div>';
  h+='<button class="btn btn-o" id="clrH">🗑️ '+esc(t('clearHist'))+'</button>';
  h+='<button class="btn btn-o" id="clrF">⭐🕘 Clear favorites & recent</button>';
  h+='<div class="setrow"><div><div class="sl">'+esc(t('about'))+'</div><div class="sd">Jilan All-in-One Tools • '+esc(t('version'))+'<br>'+esc(t('tagline'))+'<br>By Jilan Apps • Offline-first</div></div></div>';
  h+='</div>';
  app.innerHTML=h;
  $('bk').onclick=()=>back();
  document.querySelectorAll('[data-th]').forEach(b=>b.onclick=()=>{settings.theme=b.dataset.th;saveState();applyPrefs();renderSettings();});
  document.querySelectorAll('[data-lg]').forEach(b=>b.onclick=()=>{settings.lang=b.dataset.lg;saveState();applyPrefs();renderSettings();});
  $('precS').onchange=e=>{settings.prec=+e.target.value;saveState();};
  $('clrH').onclick=()=>{ if(confirm('Clear all history?')){hist=[];saveState();toast('✅');} };
  $('clrF').onclick=()=>{ if(confirm('Clear favorites & recent?')){favs=[];recents=[];saveState();toast('✅');} };
}
function renderHistory(){
  let h='<div class="tbar"><button class="icobtn" id="bk">←</button><h2>🕘 '+esc(t('history'))+'</h2></div><div class="main">';
  if(!hist.length) h+='<div class="empty">'+esc(t('noHist'))+'</div>';
  else hist.forEach(x=>{
    h+='<div class="hist"><div class="hh"><span>'+esc(x.name)+'</span><span>'+new Date(x.time).toLocaleString()+'</span></div>'+
       '<div>'+(x.summ?esc(x.summ)+'<br>':'')+'<b>'+esc(x.main)+'</b></div></div>'; });
  if(hist.length) h+='<button class="btn btn-o" id="clrH2">🗑️ '+esc(t('clearHist'))+'</button>';
  h+='</div>';
  app.innerHTML=h;
  $('bk').onclick=()=>back();
  const c=$('clrH2'); if(c) c.onclick=()=>{hist=[];saveState();renderHistory();};
}

/* ----- render dispatch ----- */
function render(){
  stopCustom();
  const v=viewStack[viewStack.length-1]||{v:'dash'};
  if(v.v==='tool') renderTool(v.id);
  else if(v.v==='settings') renderSettings();
  else if(v.v==='history') renderHistory();
  else renderDash();
}

applyPrefs();
viewStack=[{v:'dash'}];
render();
document.addEventListener('backbutton',()=>{back();},false);
}

/* node export guard for testing */
if(typeof module!=='undefined'&&module.exports){
  module.exports={TOOLS,getTool,evalExpr,fmt,money,toNum,gcd,lcm,isPrime,parseList,simplifyFrac,pDate,pDateTime,STR,CATS,catName,mkConv};
}
if(typeof window!=='undefined'&&typeof document!=='undefined'){
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',appInit);
  else appInit();
}
