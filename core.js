(function(root){
"use strict";
const TYPES=["برنامج","مشروع"];
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
// يسمح فقط برابط https أو مسار نسبي داخل الموقع. يرفض javascript: و data: والمسافات والاقتباس والأقواس
function safeUrl(u){
 u=String(u==null?"":u).trim();
 if(!u||u.length>500||/[\s'"()\\<>`]/.test(u))return "";
 if(/^https:\/\/[^\/]+/i.test(u))return u;
 if(/^[\w.\-\/]+$/.test(u)&&u[0]!=="/"&&u.indexOf("..")<0)return u;
 return "";
}
const str=(v,n)=>String(v==null?"":v).trim().slice(0,n);
function validate(x){
 const e=[];x=x||{};
 const it={id:str(x.id,40),type:str(x.type,10),title:str(x.title,80),desc:str(x.desc,500),version:str(x.version,20),
  size:str(x.size,20),platform:str(x.platform,40),date:str(x.date,10),
  tags:(Array.isArray(x.tags)?x.tags:[]).map(t=>str(t,30)).filter(Boolean).slice(0,10),
  url:str(x.url,500),repo:str(x.repo,500),demo:str(x.demo,500),icon:str(x.icon,500)};
 if(!/^[\w-]{1,40}$/.test(it.id))e.push("المعرّف غير صالح");
 if(TYPES.indexOf(it.type)<0)e.push("النوع يجب أن يكون برنامج أو مشروع");
 if(!it.title)e.push("الاسم مطلوب");
 if(!/^\d{4}-\d{2}-\d{2}$/.test(it.date))e.push("التاريخ غير صالح");
 ["url","repo","demo","icon"].forEach(k=>{if(it[k]&&!safeUrl(it[k]))e.push("رابط غير آمن في الحقل "+k)});
 return {ok:!e.length,errors:e,item:it};
}
const clean=x=>{const v=validate(x);return v.ok?v.item:null};
const toB64=s=>{const b=new TextEncoder().encode(s);let bin="";b.forEach(c=>bin+=String.fromCharCode(c));return btoa(bin)};
const fromB64=b=>{const bin=atob(String(b).replace(/\s/g,""));return new TextDecoder().decode(Uint8Array.from(bin,c=>c.charCodeAt(0)))};

function errMsg(s){
 return ({401:"الرمز غير صالح أو منتهي",403:"ممنوع: صلاحية الرمز لا تكفي أو تجاوزت حد الطلبات",
  404:"غير موجود أو الرمز لا يملك صلاحية الوصول",409:"تعارض: تغيّر الملف، أعد التحميل",422:"تعارض: تغيّر الملف، أعد التحميل"})[s]||("خطأ "+s);
}
// عميل GitHub: كل صلاحية التعديل يفرضها خادم GitHub وليس هذا الكود
function GH(token,fetchFn,cfg){
 if(!/^[\w\-]{20,255}$/.test(String(token||"")))throw new Error("صيغة الرمز غير صحيحة");
 const H={Authorization:"Bearer "+token,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"};
 const base="/repos/"+cfg.owner+"/"+cfg.repo;
 async function req(path,opt){
  const r=await fetchFn("https://api.github.com"+path,Object.assign({},opt,{headers:Object.assign({},H,opt&&opt.headers),cache:"no-store"}));
  if(!r.ok){const e=new Error(errMsg(r.status));e.status=r.status;throw e}
  return r.json();
 }
 let branch="main";
 return {
  async verify(){
   const u=await req("/user");
   if(String(u.login).toLowerCase()!==cfg.owner.toLowerCase())throw new Error("هذا الحساب ليس مالك الموقع");
   const r=await req(base);
   if(!r.permissions||!r.permissions.push)throw new Error("الحساب لا يملك صلاحية الكتابة");
   branch=r.default_branch||"main";
   return {login:u.login,branch};
  },
  async read(){
   const f=await req(base+"/contents/"+cfg.file+"?ref="+encodeURIComponent(branch));
   if(!f.content)throw new Error("تعذّر قراءة الملف");
   const arr=JSON.parse(fromB64(f.content));
   if(!Array.isArray(arr))throw new Error("صيغة الملف غير صحيحة");
   return {sha:f.sha,items:arr};
  },
  async write(items,sha,message){
   const list=items.map(clean);
   if(list.some(x=>!x))throw new Error("يوجد عنصر غير صالح");
   const body={message:String(message).slice(0,100),content:toB64(JSON.stringify(list,null,1)+"\n"),sha:sha,branch:branch};
   const r=await req(base+"/contents/"+cfg.file,{method:"PUT",body:JSON.stringify(body)});
   return r.content.sha;
  }
 };
}
const api={esc,safeUrl,validate,clean,toB64,fromB64,GH,TYPES};
if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.Core=api;
})(typeof window!=="undefined"?window:globalThis);
