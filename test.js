const assert=require("assert"),fs=require("fs");
const C=require("./core.js");
let pass=0,fail=0;
async function t(name,fn){try{await fn();pass++;console.log("PASS",name)}catch(e){fail++;console.log("FAIL",name,"->",e.message)}}
const CFG={owner:"omeryassir274-blip",repo:"omeryassir274-blip.github.io",file:"data.json"};
const good={id:"app-1",type:"برنامج",title:"تجربة",desc:"وصف",version:"1",size:"1 MB",platform:"ويب",date:"2026-11-21",tags:["a"],url:"files/a.zip",repo:"",demo:"",icon:""};

// ---- خادم GitHub وهمي يفرض الصلاحيات كما يفعل الخادم الحقيقي
function mock(){
 const S={sha:"s1",file:JSON.stringify([good]),writes:0,calls:0};
 const users={OWNERTOKEN_AAAAAAAAAAAA:["omeryassir274-blip",true],OTHERTOKEN_BBBBBBBBBBBBB:["intruder",true],READONLYTOKEN_CCCCCCCCC:["omeryassir274-blip",false]};
 const res=(s,b)=>({ok:s>=200&&s<300,status:s,json:async()=>b});
 const f=async(url,o={})=>{
  S.calls++;
  const tok=(o.headers.Authorization||"").replace("Bearer ","");const u=users[tok];
  if(!u)return res(401,{});
  const p=url.replace("https://api.github.com","");
  if(p==="/user")return res(200,{login:u[0]});
  if(p==="/repos/"+CFG.owner+"/"+CFG.repo)return res(200,{permissions:{push:u[0]===CFG.owner&&u[1]},default_branch:"main"});
  if(p.startsWith("/repos/"+CFG.owner+"/"+CFG.repo+"/contents/data.json")){
   if(!o.method||o.method==="GET")return res(200,{sha:S.sha,content:C.toB64(S.file)});
   if(o.method==="PUT"){
    if(u[0]!==CFG.owner||!u[1])return res(403,{});
    const b=JSON.parse(o.body);if(b.sha!==S.sha)return res(409,{});
    S.file=Buffer.from(b.content,"base64").toString("utf8");S.sha="s"+(++S.writes+1);return res(200,{content:{sha:S.sha}});
   }}
  return res(404,{});
 };
 return {S,f};
}

(async()=>{
await t("safeUrl يقبل https والمسار النسبي",()=>{
 assert.equal(C.safeUrl("https://example.com/a.zip"),"https://example.com/a.zip");
 assert.equal(C.safeUrl("files/app.exe"),"files/app.exe")});
await t("safeUrl يرفض الروابط الخطرة",()=>{
 ["javascript:alert(1)","JaVaScript:alert(1)","data:text/html,<script>","http://x.com","//evil.com","/etc/passwd","../secret","files/../../x",
  "https://a.com/x'),url(https://evil","https://a.com/ x","vbscript:x","https://a.com/<b>"].forEach(u=>assert.equal(C.safeUrl(u),"",u))});
await t("esc يمنع حقن HTML",()=>{
 const s=C.esc('<img src=x onerror="alert(1)">\'');assert.ok(!/[<>"']/.test(s))});
await t("validate يرفض الإدخال الخاطئ",()=>{
 assert.ok(C.validate(good).ok);
 assert.ok(!C.validate({...good,type:"فيلم"}).ok);
 assert.ok(!C.validate({...good,title:""}).ok);
 assert.ok(!C.validate({...good,id:"a b<"}).ok);
 assert.ok(!C.validate({...good,date:"x"}).ok);
 assert.ok(!C.validate({...good,url:"javascript:alert(1)"}).ok);
 assert.ok(!C.validate({...good,icon:"https://a.com/x\")"}).ok)});
await t("clean يحذف العنصر الخبيث من data.json",()=>{
 assert.equal(C.clean({...good,demo:"javascript:alert(1)"}),null);
 assert.equal(C.clean(null),null)});
await t("ترميز base64 يحفظ العربية",()=>{
 const s="برنامج ✓ مشروع";assert.equal(C.fromB64(C.toB64(s)),s)});
await t("طول الحقول محدود",()=>{
 assert.equal(C.validate({...good,title:"x".repeat(500)}).item.title.length,80)});

await t("زائر بلا رمز أو برمز مزيّف الصيغة لا يستطيع إنشاء عميل",()=>{
 assert.throws(()=>C.GH("",()=>{},CFG));assert.throws(()=>C.GH("short",()=>{},CFG));assert.throws(()=>C.GH("x y z<>".repeat(5),()=>{},CFG))});
await t("رمز غير صالح يُرفض (401)",async()=>{
 const m=mock();const g=C.GH("WRONGTOKEN_DDDDDDDDDDDDDD",m.f,CFG);
 await assert.rejects(g.verify(),e=>e.status===401)});
await t("حساب آخر برمز صحيح يُرفض لأنه ليس المالك",async()=>{
 const m=mock();const g=C.GH("OTHERTOKEN_BBBBBBBBBBBBB",m.f,CFG);
 await assert.rejects(g.verify(),/ليس مالك/)});
await t("المالك برمز بلا صلاحية كتابة: الخادم يمنع التعديل (403)",async()=>{
 const m=mock();const g=C.GH("READONLYTOKEN_CCCCCCCCC",m.f,CFG);
 await assert.rejects(g.verify(),/صلاحية الكتابة/);
 const before=m.S.file;
 await assert.rejects(g.write([good],"s1","x"),e=>e.status===403);
 assert.equal(m.S.file,before)});
await t("المالك برمز صحيح: دخول ثم قراءة ثم حفظ",async()=>{
 const m=mock();const g=C.GH("OWNERTOKEN_AAAAAAAAAAAA",m.f,CFG);
 const v=await g.verify();assert.equal(v.login,CFG.owner);
 const r=await g.read();assert.equal(r.items.length,1);
 const n=await g.write([{...good,title:"عنوان جديد"},...r.items],r.sha,"إضافة");
 assert.equal(n,"s2");assert.equal(JSON.parse(m.S.file)[0].title,"عنوان جديد")});
await t("تعارض الإصدار (sha قديم) يُرفض ولا يكتب فوق الملف",async()=>{
 const m=mock();const g=C.GH("OWNERTOKEN_AAAAAAAAAAAA",m.f,CFG);await g.verify();
 await assert.rejects(g.write([good],"stale","x"),e=>e.status===409);assert.equal(m.S.writes,0)});
await t("عنصر غير صالح لا يصل للشبكة أصلاً",async()=>{
 const m=mock();const g=C.GH("OWNERTOKEN_AAAAAAAAAAAA",m.f,CFG);await g.verify();const c=m.S.calls;
 await assert.rejects(g.write([{...good,url:"javascript:alert(1)"}],"s1","x"),/غير صالح/);assert.equal(m.S.calls,c)});

// ---- فحص ثابت للملفات
const rd=f=>fs.readFileSync(f,"utf8");
for(const f of ["index.html","admin.html"]){
 const h=rd(f);
 await t(f+": سياسة CSP صارمة بلا unsafe-inline",()=>{
  assert.match(h,/Content-Security-Policy/);assert.match(h,/default-src 'none'/);assert.match(h,/script-src 'self'/);assert.ok(!/unsafe-inline|unsafe-eval/.test(h))});
 await t(f+": لا سكربت مضمّن ولا onclick ولا style",()=>{
  assert.ok(![...h.matchAll(/<script(?![^>]*\ssrc=)[^>]*>/g)].length);assert.ok(!/\son\w+\s*=/.test(h));assert.ok(!/\sstyle\s*=/.test(h))});
}
await t("الموقع العام خالٍ من أي كود تعديل أو اتصال بـ GitHub API",()=>{
 const pub=rd("index.html")+rd("app.js");
 assert.ok(!/api\.github\.com|\bPUT\b|Authorization|sessionStorage|\btoken\b/i.test(pub));
 assert.match(rd("index.html"),/connect-src 'self'/)});
await t("صفحة الإدارة تسمح بالاتصال بـ GitHub فقط وغير مفهرسة",()=>{
 const a=rd("admin.html");assert.match(a,/connect-src 'self' https:\/\/api\.github\.com/);assert.match(a,/noindex/)});
await t("الرمز يُخزَّن في sessionStorage وليس localStorage",()=>{
 const a=rd("admin.js");assert.match(a,/sessionStorage\.setItem\(KT/);assert.ok(!/localStorage\.setItem\(KT/.test(a))});
await t("data.json صالح وكل عناصره تجتاز الفحص",()=>{
 const d=JSON.parse(rd("data.json"));assert.ok(Array.isArray(d));d.forEach(x=>assert.ok(C.clean(x),x.id))});
console.log("\nالنتيجة: نجح "+pass+" / فشل "+fail);process.exit(fail?1:0);
})();
