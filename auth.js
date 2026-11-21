(function(){
"use strict";
const C=window.Core,CFG=window.SITE_CONFIG||{};
const REAL=!!(CFG.supabaseUrl&&CFG.anonKey&&/^https:\/\/[\w-]+\.supabase\.co\/?$/.test(CFG.supabaseUrl));
const BASE=REAL?CFG.supabaseUrl.replace(/\/$/,""):"",BUCKET=CFG.bucket||"downloads",SK="site_session",UK="demo_users";
const rd=k=>{try{return JSON.parse(localStorage.getItem(k)||"null")}catch(e){return null}};
const wr=(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
let session=rd(SK);if(!session||typeof session.email!=="string"||(REAL&&typeof session.access_token!=="string"))session=null;

function errText(st,b){
 if(st===429)return "محاولات كثيرة، حاول لاحقاً";
 const m=String(b&&(b.msg||b.error_description||b.message||b.error)||"").toLowerCase();
 if(m.includes("already")||m.includes("registered"))return "هذا البريد مسجّل مسبقاً";
 if(m.includes("invalid login")||m.includes("invalid_grant")||m.includes("credentials"))return "البريد أو كلمة المرور غير صحيحة";
 if(m.includes("not confirmed"))return "أكّد بريدك الإلكتروني أولاً";
 if(m.includes("password"))return "كلمة المرور غير مقبولة (8 أحرف على الأقل)";
 return "تعذّر تنفيذ الطلب ("+st+")";
}
async function sb(path,opt,tok){
 const r=await fetch(BASE+path,Object.assign({cache:"no-store"},opt,{headers:{"apikey":CFG.anonKey,"Content-Type":"application/json","Authorization":"Bearer "+(tok||CFG.anonKey)}}));
 let b=null;try{b=await r.json()}catch(e){}
 if(!r.ok){const e=new Error(errText(r.status,b));e.status=r.status;throw e}
 return b;
}
const mk=b=>({email:String(b.user&&b.user.email||""),access_token:b.access_token,refresh_token:b.refresh_token,expires_at:Date.now()+(b.expires_in||3600)*1000});
const setS=s=>{session=s;wr(SK,s)};

const real={
 async signup(e,p){const b=await sb("/auth/v1/signup",{method:"POST",body:JSON.stringify({email:e,password:p})});
  if(b&&b.access_token){setS(mk(b));return{confirmed:true}}return{confirmed:false}},
 async login(e,p){setS(mk(await sb("/auth/v1/token?grant_type=password",{method:"POST",body:JSON.stringify({email:e,password:p})})))},
 async logout(){const t=session&&session.access_token;setS(null);if(t){try{await sb("/auth/v1/logout",{method:"POST"},t)}catch(e){}}},
 async fresh(){
  if(!session)throw Object.assign(new Error("سجّل الدخول أولاً"),{status:401});
  if(session.expires_at-30000>Date.now())return session.access_token;
  try{setS(mk(await sb("/auth/v1/token?grant_type=refresh_token",{method:"POST",body:JSON.stringify({refresh_token:session.refresh_token})})));return session.access_token}
  catch(e){setS(null);throw Object.assign(new Error("انتهت الجلسة، سجّل الدخول من جديد"),{status:401})}
 },
 async link(path){
  const tok=await this.fresh();
  const enc=path.split("/").map(encodeURIComponent).join("/");
  const b=await sb("/storage/v1/object/sign/"+encodeURIComponent(BUCKET)+"/"+enc,{method:"POST",body:JSON.stringify({expiresIn:60})},tok);
  if(!b||typeof b.signedURL!=="string")throw new Error("تعذّر إنشاء رابط التحميل");
  const u=BASE+"/storage/v1"+b.signedURL+"&download=";
  if(u.indexOf(BASE+"/")!==0)throw new Error("رابط غير صالح");return u;
 }
};
// وضع تجريبي: حسابات في متصفح الزائر. ليس حماية حقيقية.
const sha=async s=>[...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,"0")).join("");
const demo={
 async signup(e,p){const u=rd(UK)||{};if(Object.prototype.hasOwnProperty.call(u,e))throw new Error("هذا البريد مسجّل مسبقاً");
  const s=crypto.randomUUID();u[e]={s:s,h:await sha(s+p)};wr(UK,u);setS({email:e});return{confirmed:true}},
 async login(e,p){const u=rd(UK)||{};const x=Object.prototype.hasOwnProperty.call(u,e)?u[e]:null;
  if(!x||x.h!==await sha(x.s+p))throw new Error("البريد أو كلمة المرور غير صحيحة");setS({email:e})},
 async logout(){setS(null)},
 async link(path){if(!session)throw Object.assign(new Error("سجّل الدخول أولاً"),{status:401});return path}
};
const B=REAL?real:demo;
function norm(e,p){e=String(e||"").trim().toLowerCase();
 if(!C.validEmail(e))throw new Error("البريد الإلكتروني غير صالح");
 if(!C.validPassword(p))throw new Error("كلمة المرور يجب أن تكون 8 أحرف على الأقل");return e}
window.Auth={real:REAL,check:norm,
 get user(){return session?session.email:null},
 async signup(e,p){e=norm(e,p);return B.signup(e,p)},
 async login(e,p){e=norm(e,p);return B.login(e,p)},
 logout(){return B.logout()},
 // الروابط الخارجية https تُفتح كما هي (حماية واجهة فقط)، والمسارات النسبية تُطلب برابط موقّع من الخادم
 async resolve(item){const u=C.safeUrl(item.url);if(!u)throw new Error("لا يوجد رابط تحميل");
  if(!window.Auth.user)throw Object.assign(new Error("سجّل الدخول أولاً"),{status:401});
  return /^https:/i.test(u)?u:B.link(u)}
};
})();
