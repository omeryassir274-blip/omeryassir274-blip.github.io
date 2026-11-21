const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
document.title = SITE.brand + " | " + SITE.name;
$("logo").textContent = SITE.brand;
$("name").textContent = SITE.name;
$("tagline").textContent = SITE.tagline;
$("foot").textContent = "© " + SITE.name + (SITE.email ? " — " + SITE.email : "");
const empty = t => `<div class="empty">${t}</div>`;
const row = (icon, title, sub, href, label) =>
  `<a class="item" target="_blank" rel="noopener" href="${esc(href)}"><span>${icon}</span><span class="b">${esc(title)}${sub ? `<small>${esc(sub)}</small>` : ""}</span><span class="go">${label}</span></a>`;

const groups = {};
FILES.forEach(f => (groups[f.folder || "عام"] ||= []).push(f));
$("filesBox").innerHTML = Object.keys(groups).map(k =>
  `<h3>📁 ${esc(k)}</h3>` + groups[k].map(f => row("📄", f.title, "", f.file, "فتح")).join("")).join("") || empty("لسه ما في ملفات.");

$("videosBox").innerHTML = VIDEOS.map(v => `<div class="v">${
  v.youtube ? `<iframe src="https://www.youtube.com/embed/${esc(v.youtube)}" allowfullscreen></iframe>`
            : `<video controls preload="metadata" src="${esc(v.file)}"></video>`}<div>${esc(v.title)}</div></div>`).join("") || empty("لسه ما في فيديوهات.");

$("projBox").innerHTML = PROJECTS.map(p => row("🚀", p.title, p.desc, p.url, "زيارة")).join("") || empty("لسه ما في مشاريع.");
$("linkBox").innerHTML = LINKS.map(l => row("🔗", l.title, "", l.url, "فتح")).join("") || empty("لسه ما في روابط.");
