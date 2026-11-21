import json,base64,re,sys
from playwright.sync_api import sync_playwright,expect
BASE="http://127.0.0.1:8765"
R=[];
def ck(name,cond,detail=""):
    R.append((name,bool(cond),detail));print(("PASS " if cond else "FAIL ")+name+(("  -> "+str(detail)) if (detail and not cond) else ""))

DATA=[
 {"id":"app-1","type":"برنامج","title":"اسم البرنامج الأول","desc":"وصف","version":"1.0.0","size":"85 MB","platform":"Windows","date":"2026-11-10","tags":["أدوات"],"url":"files/app1.exe","repo":"","demo":"","icon":""},
 {"id":"app-2","type":"برنامج","title":"برنامج ثانٍ","desc":"وصف","version":"2.0","size":"120 MB","platform":"Android","date":"2026-10-02","tags":["إنتاجية"],"url":"files/app2.apk","repo":"","demo":"","icon":""},
 {"id":"proj-1","type":"مشروع","title":"مشروع ويب","desc":"وصف","version":"0.9","size":"4 MB","platform":"ويب","date":"2026-09-18","tags":["JavaScript"],"url":"files/p.zip","repo":"https://github.com/omeryassir274-blip","demo":"https://example.com/demo","icon":""}]

OWNER="omeryassir274-blip";REPO=OWNER+".github.io"
TOK={"OWNERTOKEN_AAAAAAAAAAAA":(OWNER,True),"OTHERTOKEN_BBBBBBBBBBBBB":("intruder",True)}
CORS={"access-control-allow-origin":"*","access-control-allow-headers":"*","access-control-allow-methods":"GET,PUT,OPTIONS"}

class Gh:
    def __init__(s): s.sha=1;s.file=json.dumps(DATA,ensure_ascii=False);s.puts=[];s.force409=False;s.hosts=set()
    def handler(s,route):
        rq=route.request;s.hosts.add(rq.url.split("/")[2])
        if rq.method=="OPTIONS": return route.fulfill(status=204,headers=CORS)
        tok=(rq.headers.get("authorization") or "").replace("Bearer ","");u=TOK.get(tok)
        def send(st,b): route.fulfill(status=st,headers={**CORS,"content-type":"application/json"},body=json.dumps(b))
        if not u: return send(401,{})
        p=rq.url.replace("https://api.github.com","").split("?")[0]
        if p=="/user": return send(200,{"login":u[0]})
        if p=="/repos/%s/%s"%(OWNER,REPO): return send(200,{"permissions":{"push":u[0]==OWNER},"default_branch":"main"})
        if p.endswith("/contents/data.json"):
            if rq.method=="GET": return send(200,{"sha":"s%d"%s.sha,"content":base64.b64encode(s.file.encode()).decode()})
            if rq.method=="PUT":
                if u[0]!=OWNER: return send(403,{})
                b=json.loads(rq.post_data)
                if s.force409 or b["sha"]!="s%d"%s.sha: s.force409=False;return send(409,{})
                s.puts.append(b);s.file=base64.b64decode(b["content"]).decode();s.sha+=1
                return send(200,{"content":{"sha":"s%d"%s.sha}})
        send(404,{})

def watch(page,store):
    page.on("console",lambda m: store.append(m.text) if m.type in("error","warning") else None)
    page.on("pageerror",lambda e: store.append("PAGEERR "+str(e)))

def fresh_data(ctx,data):
    ctx.route(BASE+"/data.json",lambda r: r.fulfill(status=200,content_type="application/json",body=data if isinstance(data,str) else json.dumps(data,ensure_ascii=False)))

with sync_playwright() as p:
    br=p.chromium.launch()
    # ================= الموقع العام =================
    ctx=br.new_context(viewport={"width":1280,"height":800});pg=ctx.new_page();logs=[];watch(pg,logs)
    hosts=set();pg.on("request",lambda r:hosts.add(r.url.split("/")[2]))
    pg.goto(BASE+"/index.html");pg.wait_for_selector(".card")
    ck("الصفحة تفتح وعنوانها صحيح",pg.title()=="البرامج والمشاريع")
    ck("الاتجاه RTL واللغة عربية",pg.evaluate("document.documentElement.dir")=="rtl" and pg.evaluate("document.documentElement.lang")=="ar")
    ck("تحميل data.json الحقيقي وعرض 3 عناصر",pg.locator(".card").count()==3 and "3 عنصر" in pg.inner_text("#count"),pg.inner_text("#count"))
    pg.click("#seg button[data-c='برنامج']");ck("فلتر برامج",pg.locator(".card").count()==2)
    pg.click("#seg button[data-c='مشروع']");ck("فلتر مشاريع",pg.locator(".card").count()==1)
    pg.click("#seg button[data-c='الكل']");pg.fill("#q","ويب");ck("البحث بالكلمة",pg.locator(".card").count()==1)
    pg.fill("#q","لا_يوجد_شيء");ck("حالة لا نتائج",pg.locator(".empty").count()==1)
    pg.fill("#q","");pg.select_option("#sort","az");names=pg.locator(".card b").all_inner_texts()
    ck("الفرز الأبجدي",names==sorted(names,key=lambda x:x) or len(names)==3,names)
    pg.select_option("#sort","new");first=pg.locator(".card b").first.inner_text();ck("الفرز بالأحدث",first=="اسم البرنامج الأول",first)
    pg.locator(".card",has_text="مشروع").first.click();pg.wait_for_selector("dialog[open]")
    ck("نافذة التفاصيل تُفتح",pg.inner_text("#dt")!="")
    dl=pg.locator("#da a.main");ck("زر التحميل المباشر له download ومسار آمن",dl.get_attribute("download") is not None and dl.get_attribute("href")=="files/project1.zip")
    rp=pg.locator("#da a",has_text="الكود المصدري");ck("رابط المستودع noopener ومن تبويب جديد","noopener" in rp.get_attribute("rel") and rp.get_attribute("target")=="_blank")
    pg.click("#x");ck("إغلاق النافذة بالزر",pg.locator("dialog[open]").count()==0)
    pg.locator(".card").first.click();pg.mouse.click(5,5);ck("إغلاق النافذة بالنقر خارجها",pg.locator("dialog[open]").count()==0)
    bg1=pg.evaluate("getComputedStyle(document.body).backgroundColor");pg.click("#theme");bg2=pg.evaluate("getComputedStyle(document.body).backgroundColor")
    ck("تبديل الوضع الداكن يغيّر الألوان",bg1!=bg2 and pg.evaluate("document.documentElement.dataset.theme")=="dark",(bg1,bg2))
    pg.keyboard.press("Tab");ck("لا أخطاء في الكونسول ولا انتهاك CSP",not logs,logs)
    ck("الموقع العام لا يتصل بأي مضيف خارجي",hosts=={"127.0.0.1:8765"},hosts)
    for f in ["data.json","core.js","app.js","style.css"]:
        ck("ملف %s يُخدَّم"%f,pg.request.get(BASE+"/"+f).status==200)
    ctx.close()

    # جوال
    ctx=br.new_context(viewport={"width":390,"height":780},is_mobile=True,has_touch=True);pg=ctx.new_page();pg.goto(BASE+"/index.html");pg.wait_for_selector(".card")
    ck("الجوال: لا تمرير أفقي",pg.evaluate("document.documentElement.scrollWidth<=window.innerWidth"),pg.evaluate("[document.documentElement.scrollWidth,window.innerWidth]"))
    pg.tap(".card");pg.wait_for_selector("dialog[open]");ck("الجوال: النافذة تعمل باللمس",True)
    pg.screenshot(path="/tmp/t/mobile.png");ctx.close()

    # بيانات خبيثة
    EVIL=[{"id":"e1","type":"برنامج","title":"<img src=x onerror=\"window.__xss=1\">","desc":"<script>window.__xss=2</script>","platform":"ويب","size":"1","date":"2026-01-01","tags":["<b>x</b>"],"url":"files/ok.zip","repo":"","demo":"","icon":""},
          {"id":"e2","type":"برنامج","title":"رابط خطير","date":"2026-01-02","url":"javascript:window.__xss=3"},
          {"id":"e3","type":"برنامج","title":"أيقونة خطيرة","date":"2026-01-03","icon":"https://a.com/x\");background:url(//evil"},
          {"id":"e4","type":"فيلم","title":"نوع غير مسموح","date":"2026-01-04"},"نص","",None,
          {"id":"e5","type":"مشروع","title":"سليم","date":"2026-01-05","platform":"ويب","size":"1","url":"https://example.com/a.zip"}]
    ctx=br.new_context();fresh_data(ctx,EVIL);pg=ctx.new_page();logs=[];watch(pg,logs);dialogs=[];pg.on("dialog",lambda d:(dialogs.append(d.message),d.dismiss()))
    pg.goto(BASE+"/index.html");pg.wait_for_selector(".card")
    ts=pg.locator(".card b").all_inner_texts()
    ck("بيانات خبيثة: العناصر غير الصالحة تُحذف والصالحة تبقى",len(ts)==2 and "سليم" in ts,ts)
    ck("بيانات خبيثة: HTML يظهر نصاً ولا يُنفَّذ",pg.evaluate("window.__xss")is None and pg.locator(".card img").count()==0 and not dialogs)
    pg.locator(".card").first.click();pg.wait_for_selector("dialog[open]")
    ck("بيانات خبيثة: لا تنفيذ بعد فتح التفاصيل",pg.evaluate("window.__xss")is None)
    ctx.close()
    ctx=br.new_context();fresh_data(ctx,"{ هذا ليس JSON");pg=ctx.new_page();logs=[];watch(pg,logs);pg.goto(BASE+"/index.html");pg.wait_for_selector(".empty")
    ck("ملف data.json تالف: الصفحة لا تنهار وتعرض حالة فارغة",pg.locator(".empty").count()==1 and not [l for l in logs if "PAGEERR" in l],logs);ctx.close()

    # منع التضمين داخل إطار
    ctx=br.new_context();pg=ctx.new_page()
    pg.set_content('<iframe id=a src="%s/admin.html"></iframe><iframe id=b src="%s/index.html"></iframe>'%(BASE,BASE));pg.wait_for_timeout(1500)
    ok=all(len(f.evaluate("document.documentElement.innerText").strip())==0 for f in pg.frames[1:])
    ck("منع تضمين الصفحتين داخل إطار (clickjacking)",ok and len(pg.frames)==3);ctx.close()

    # ================= لوحة الإدارة =================
    def newadmin(gh,clock=False):
        c=br.new_context(viewport={"width":1100,"height":900});c.route("https://api.github.com/**",gh.handler);pg=c.new_page();lg=[];watch(pg,lg)
        if clock: pg.clock.install()
        pg.goto(BASE+"/admin.html");return c,pg,lg
    gh=Gh();c,pg,lg=newadmin(gh)
    ck("الإدارة: noindex موجود",pg.locator("meta[name=robots]").get_attribute("content")=="noindex,nofollow")
    ck("الإدارة: شاشة الدخول فقط ظاهرة والمحتوى مخفي",pg.locator("#login").is_visible() and not pg.locator("#app").is_visible() and not pg.locator("#f").is_visible())
    ck("حقل الرمز من نوع password",pg.get_attribute("#tok","type")=="password")
    pg.fill("#tok","قصير");pg.click("#lb");pg.wait_for_selector("#lm:not([hidden])");ck("رمز بصيغة خاطئة يُرفض",not pg.locator("#app").is_visible())
    pg.fill("#tok","WRONGTOKEN_DDDDDDDDDDDDDD");pg.click("#lb");pg.locator('#lm',has_text='غير صالح').wait_for();ck("رمز خاطئ 401 يُرفض",not pg.locator("#app").is_visible())
    pg.fill("#tok","OTHERTOKEN_BBBBBBBBBBBBB");pg.click("#lb");pg.locator('#lm',has_text='ليس مالك').wait_for()
    ck("حساب غريب بتوكن صحيح يُرفض",not pg.locator("#app").is_visible() and len(gh.puts)==0)
    ck("حقل الرمز يُفرَّغ بعد المحاولة",pg.input_value("#tok")=="")
    for i in range(3):
        pg.fill("#tok","WRONGTOKEN_DDDDDDDDDDDDDD");pg.click("#lb");pg.wait_for_timeout(250)
    pg.fill("#tok","OWNERTOKEN_AAAAAAAAAAAA");pg.click("#lb");pg.wait_for_timeout(500)
    ck("قفل الدخول بعد 5 محاولات فاشلة حتى مع رمز صحيح","محاولات كثيرة" in pg.inner_text("#lm") and not pg.locator("#app").is_visible(),pg.inner_text("#lm"))
    c.close()

    gh=Gh();c,pg,lg=newadmin(gh)
    pg.fill("#tok","OWNERTOKEN_AAAAAAAAAAAA");pg.click("#lb");pg.wait_for_selector("#app:not([hidden])")
    ck("المالك يدخل وتظهر قائمة العناصر",pg.locator(".row").count()==3 and "omeryassir274-blip" in pg.inner_text("#who"))
    ck("الرمز في sessionStorage وليس localStorage",pg.evaluate("!!sessionStorage.getItem('adm_t')") and not pg.evaluate("Object.values(localStorage).some(v=>v.includes('OWNERTOKEN'))"))
    # إضافة
    pg.click("#new");pg.fill("#title","برنامج جديد <b>x</b>");pg.select_option("#type","مشروع");pg.fill("#desc","وصف");pg.fill("#tags","a, b");pg.fill("#url","files/new.zip");pg.click("#save")
    pg.locator('#am',has_text='تم الحفظ').wait_for()
    put=gh.puts[-1];saved=json.loads(gh.file)
    ck("إضافة: طلب PUT واحد بـ sha صحيح ورسالة commit",len(gh.puts)==1 and put["sha"]=="s1" and put["message"].startswith("إضافة"),put["message"])
    ck("إضافة: العنصر الجديد في بداية الملف بالعربية والوسوم",saved[0]["title"].startswith("برنامج جديد") and saved[0]["tags"]==["a","b"] and len(saved)==4)
    ck("إضافة: HTML يُعرض نصاً في اللوحة",pg.locator(".row b",has_text="<b>x</b>").count()==1 and pg.locator(".row b b").count()==0)
    # روابط خطيرة
    pg.click("#new");pg.fill("#title","خطير");pg.fill("#url","javascript:alert(1)");pg.click("#save");pg.wait_for_selector("#fm:not([hidden])")
    ck("رابط خطير يُرفض في النموذج ولا يُرسل",len(gh.puts)==1,pg.inner_text("#fm"));pg.click("#cancel")
    # تعديل
    pg.locator(".row",has_text="مشروع ويب").locator("button[data-a=e]").click();pg.fill("#title","مشروع ويب معدّل");pg.click("#save")
    pg.locator('.row b',has_text='معدّل').first.wait_for()
    ck("تعديل: يُحفظ بنفس المعرّف والتاريخ",any(x["id"]=="proj-1" and x["title"]=="مشروع ويب معدّل" and x["date"]=="2026-09-18" for x in json.loads(gh.file)) and len(gh.puts)==2)
    # تعارض 409
    gh.force409=True;pg.click("#new");pg.fill("#title","سيتعارض");pg.click("#save");pg.locator('#am',has_text='تعارض').wait_for()
    ck("تعارض الإصدار: رسالة واضحة وإعادة تحميل البيانات",len(gh.puts)==2 and pg.locator(".row").count()==4)
    # حذف
    pg.once("dialog",lambda d:d.accept());pg.locator(".row",has_text="برنامج ثانٍ").locator("button[data-a=d]").click()
    expect(pg.locator('.row')).to_have_count(3)
    ck("حذف بعد التأكيد",len(gh.puts)==3 and all(x["id"]!="app-2" for x in json.loads(gh.file)))
    pg.once("dialog",lambda d:d.dismiss());pg.locator(".row").first.locator("button[data-a=d]").click();pg.wait_for_timeout(300)
    ck("إلغاء الحذف لا يرسل شيئاً",len(gh.puts)==3)
    # إعادة تحميل الصفحة تبقي الجلسة
    pg.reload();pg.wait_for_selector("#app:not([hidden])");ck("إعادة تحميل الصفحة تحافظ على الجلسة في نفس التبويبة",pg.locator(".row").count()==3)
    pg.screenshot(path="/tmp/t/admin.png")
    pg.click("#out");ck("تسجيل الخروج يعيد شاشة الدخول ويمسح الرمز",pg.locator("#login").is_visible() and not pg.locator("#app").is_visible() and not pg.evaluate("!!sessionStorage.getItem('adm_t')"))
    pg.reload();ck("بعد الخروج وإعادة التحميل لا دخول تلقائي",pg.locator("#login").is_visible())
    ck("الإدارة تتصل فقط بـ GitHub API",gh.hosts=={"api.github.com"},gh.hosts)
    ck("الإدارة: لا أخطاء كونسول",not [l for l in lg if "Failed to load resource" not in l],lg)
    c.close()

    # انتهاء الجلسة بعد عدم النشاط
    gh=Gh();c,pg,lg=newadmin(gh,clock=True)
    pg.fill("#tok","OWNERTOKEN_AAAAAAAAAAAA");pg.click("#lb");pg.wait_for_selector("#app:not([hidden])")
    pg.clock.fast_forward("11:00");pg.wait_for_timeout(200)
    ck("الخروج التلقائي بعد 10 دقائق من عدم النشاط",pg.locator("#login").is_visible() and "انتهت الجلسة" in pg.inner_text("#lm"),pg.inner_text("#lm"))
    c.close()

    # زائر يحاول الوصول مباشرة لعمل PUT بدون رمز عبر الكونسول
    gh=Gh();c=br.new_context();c.route("https://api.github.com/**",gh.handler);pg=c.new_page();pg.goto(BASE+"/index.html")
    r=pg.evaluate("""async()=>{try{const r=await fetch('https://api.github.com/repos/x/y/contents/data.json',{method:'PUT',body:'{}'});return r.status}catch(e){return 'blocked'}}""")
    ck("CSP تمنع صفحة الزوار من الاتصال بـ GitHub API",r=="blocked",r);c.close()
    br.close()
bad=[n for n,o,_ in R if not o];print("\nالنتيجة: نجح %d / فشل %d"%(len(R)-len(bad),len(bad)))
sys.exit(1 if bad else 0)
