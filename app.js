(function(){
"use strict";
if(top!==self){document.documentElement.textContent="";return}
const C=window.Core,$=id=>document.getElementById(id),esc=C.esc;
let items=[],cat="الكل";
function iconHtml(i,n){const u=C.safeUrl(i.icon);
 return '<div class="icon g'+(n%5)+'"'+(u?' data-icon="'+esc(u)+'"':'')+'>'+(u?'':esc(i.title[0]))+'</div>'}
function paint(root){root.querySelectorAll("[data-icon]").forEach(e=>{e.style.backgroundImage='url("'+e.dataset.icon+'")'})}
function render(){
 const t=$("q").value.trim().toLowerCase(),s=$("sort").value;
 const r=items.filter(i=>(cat==="الكل"||i.type===cat)&&(i.title+" "+i.tags.join(" ")+" "+i.platform).toLowerCase().includes(t));
 r.sort(s==="az"?(a,b)=>a.title.localeCompare(b.title,"ar"):(a,b)=>b.date.localeCompare(a.date));
 $("count").textContent=r.length+" عنصر";
 $("list").innerHTML=r.length?r.map(i=>'<button class="card" data-id="'+esc(i.id)+'">'+iconHtml(i,items.indexOf(i))+
  '<div class="t"><b>'+esc(i.title)+'</b><span class="mut">'+esc(i.type)+' · '+esc(i.platform)+' · '+esc(i.size)+'</span></div><span class="get">تحميل</span></button>').join(""):
  '<div class="empty">لا توجد نتائج. جرّب كلمة أخرى.</div>';
 paint($("list"));
}
async function load(){
 let raw=[];try{const r=await fetch("data.json",{cache:"no-store"});if(!r.ok)throw 0;raw=await r.json()}catch(e){}
 items=(Array.isArray(raw)?raw:[]).map(C.clean).filter(Boolean);render();
}
$("seg").onclick=e=>{const b=e.target.closest("button");if(!b)return;cat=b.dataset.c;
 document.querySelectorAll("#seg button").forEach(x=>x.setAttribute("aria-pressed",x===b));render()};
$("q").oninput=render;$("sort").onchange=render;
$("list").onclick=e=>{
 const c=e.target.closest(".card");if(!c)return;
 const i=items.find(x=>x.id===c.dataset.id);if(!i)return;
 $("dI").innerHTML=iconHtml(i,items.indexOf(i));paint($("dI"));
 $("dt").textContent=i.title;$("ds").textContent=i.type+(i.version?" · الإصدار "+i.version:"");$("dd").textContent=i.desc;
 $("dm").innerHTML=[["المنصة",i.platform],["الحجم",i.size],["التاريخ",i.date],["الوسوم",i.tags.join("، ")]].filter(x=>x[1]).map(x=>"<span>"+x[0]+"</span><span>"+esc(x[1])+"</span>").join("");
 const a=[],u=C.safeUrl(i.url),d=C.safeUrl(i.demo),r=C.safeUrl(i.repo);
 if(u)a.push('<a class="btn main" href="'+esc(u)+'" download rel="noopener">تحميل مباشر</a>');
 if(d)a.push('<a class="btn" href="'+esc(d)+'" target="_blank" rel="noopener noreferrer">تجربة</a>');
 if(r)a.push('<a class="btn" href="'+esc(r)+'" target="_blank" rel="noopener noreferrer">الكود المصدري</a>');
 a.push('<button class="btn" id="x">إغلاق</button>');
 $("da").innerHTML=a.join("");$("x").onclick=()=>$("dlg").close();$("dlg").showModal();
};
$("dlg").addEventListener("click",e=>{if(e.target===$("dlg"))$("dlg").close()});
$("theme").onclick=()=>{const d=document.documentElement.dataset.theme!=="dark";document.documentElement.dataset.theme=d?"dark":"light";$("theme").textContent=d?"الوضع الفاتح":"الوضع الداكن"};
if(matchMedia("(prefers-color-scheme:dark)").matches)$("theme").click();
load();
})();
