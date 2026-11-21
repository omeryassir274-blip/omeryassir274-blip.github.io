(function(){
"use strict";
if(top!==self){document.documentElement.textContent="";return}
const C=window.Core,$=id=>document.getElementById(id),esc=C.esc;
// غيّر هذه القيم فقط إذا تغيّر اسم المستودع
const CFG={owner:"omeryassir274-blip",repo:"omeryassir274-blip.github.io",file:"data.json"};
const KT="adm_t",KL="adm_l",IDLE=600000,MAXF=5,LOCK=300000;
let gh=null,items=[],sha="",edit=-1,timer=null,busy=false;
const say=(id,t,show)=>{$(id).textContent=t||"";$(id).hidden=!t};
const lk=()=>{try{return JSON.parse(localStorage.getItem(KL)||"{}")}catch(e){return{}}};
const setlk=o=>{try{localStorage.setItem(KL,JSON.stringify(o))}catch(e){}};

function reset(){clearTimeout(timer);timer=setTimeout(()=>logout("انتهت الجلسة لعدم النشاط"),IDLE)}
["click","keydown"].forEach(ev=>document.addEventListener(ev,()=>{if(gh)reset()}));
function logout(m){
 gh=null;items=[];sha="";clearTimeout(timer);
 try{sessionStorage.removeItem(KT)}catch(e){}
 $("tok").value="";$("app").hidden=true;$("f").hidden=true;$("out").hidden=true;$("login").hidden=false;say("lm",m||"");
}
async function enter(tok){
 const g=C.GH(tok,(u,o)=>fetch(u,o),CFG);
 const v=await g.verify();
 gh=g;try{sessionStorage.setItem(KT,tok)}catch(e){}
 $("who").textContent="مسجّل: "+v.login;
 await reload();
 $("login").hidden=true;$("app").hidden=false;$("out").hidden=false;reset();
}
async function reload(){const r=await gh.read();items=r.items.map(C.clean).filter(Boolean);sha=r.sha;list()}
function list(){
 $("rows").innerHTML=items.length?items.map((i,n)=>'<div class="row"><div class="t"><b>'+esc(i.title)+'</b> <span class="mut">'+esc(i.type)+' · '+esc(i.date)+'</span></div>'+
  '<button class="btn" data-a="e" data-n="'+n+'">تعديل</button><button class="btn del" data-a="d" data-n="'+n+'">حذف</button></div>').join(""):'<p class="mut">لا توجد عناصر.</p>';
}
async function commit(next,msg){
 if(busy)return;busy=true;say("am","جارٍ الحفظ...");
 try{sha=await gh.write(next,sha,msg);items=next.map(C.clean).filter(Boolean);list();say("am","تم الحفظ. يظهر التغيير في الموقع خلال دقيقة تقريباً.");return true}
 catch(e){say("am",e.message);if(e.status===409||e.status===422)await reload();return false}
 finally{busy=false}
}
$("lf").onsubmit=async e=>{
 e.preventDefault();const l=lk();
 if(l.until&&Date.now()<l.until){say("lm","محاولات كثيرة. انتظر بضع دقائق.");return}
 $("lb").disabled=true;say("lm","");
 try{await enter($("tok").value.trim());setlk({})}
 catch(err){const f=(l.n||0)+1;setlk(f>=MAXF?{n:0,until:Date.now()+LOCK}:{n:f});say("lm",err.message);gh=null}
 finally{$("lb").disabled=false;$("tok").value=""}
};
$("out").onclick=()=>logout("تم تسجيل الخروج");
$("rows").onclick=async e=>{
 const b=e.target.closest("button");if(!b)return;const n=+b.dataset.n;
 if(b.dataset.a==="e")open(n);
 else if(b.dataset.a==="d"&&confirm("حذف \""+items[n].title+"\"؟"))await commit(items.filter((_,k)=>k!==n),"حذف: "+items[n].title);
};
const F=["type","title","desc","version","size","platform","url","repo","demo","icon"];
function open(n){edit=n;const it=n>=0?items[n]:{type:"برنامج",tags:[]};
 F.forEach(k=>{$(k).value=it[k]||(k==="type"?"برنامج":"")});$("tags").value=(it.tags||[]).join(", ");
 say("fm","");$("f").hidden=false;$("title").focus()}
$("new").onclick=()=>open(-1);$("cancel").onclick=()=>{$("f").hidden=true};
$("f").onsubmit=async e=>{
 e.preventDefault();
 const o={};F.forEach(k=>o[k]=$(k).value);o.tags=$("tags").value.split(",");
 o.id=edit>=0?items[edit].id:"item-"+Date.now();
 o.date=edit>=0?items[edit].date:new Date().toISOString().slice(0,10);
 const v=C.validate(o);if(!v.ok){say("fm",v.errors.join(" - "));return}
 const next=items.slice();if(edit>=0)next[edit]=v.item;else next.unshift(v.item);
 if(await commit(next,(edit>=0?"تعديل: ":"إضافة: ")+v.item.title))$("f").hidden=true;
};
const saved=(()=>{try{return sessionStorage.getItem(KT)}catch(e){return null}})();
if(saved)enter(saved).catch(()=>logout(""));
})();
