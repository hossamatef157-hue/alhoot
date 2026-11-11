(function () {
  "use strict";

  var apps = [];
  var grid = document.getElementById("apps");
  var search = document.getElementById("search");
  var empty = document.getElementById("empty");

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null && text !== "") e.textContent = text;
    return e;
  }

  function fmtDate(s) {
    var d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
  }

  var CFG = window.ALHOOT_CONFIG || {};
  CFG.url = (CFG.url || "").trim().replace(/\/+$/, "");
  function safeUrl(u) { return typeof u === "string" && /^https?:\/\//i.test(u.trim()) ? u.trim() : ""; }
  var useDb = !!(CFG.url && CFG.anonKey);
  function hdr(extra) {
    var h = { apikey: CFG.anonKey };
    if (/^eyJ/.test(CFG.anonKey)) h.Authorization = "Bearer " + CFG.anonKey; // المفاتيح الجديدة (sb_publishable_) مش JWT
    return Object.assign(h, extra || {});
  }
  function fromRow(r) {
    return { id: r.id, name: r.name, tagline: r.tagline, description: r.description, icon: r.icon,
      iconImage: r.icon_image, color: r.color, version: r.version, versionCode: r.version_code,
      size: r.size, updated: r.updated, platform: r.platform, apk: r.apk, notes: r.notes,
      screenshots: r.screenshots || [], links: r.links || [], downloads: r.downloads };
  }
  function track(id) {
    if (!useDb) return;
    try { // مرة واحدة لكل متصفح كل 24 ساعة
      var k = "dl:" + id, last = +localStorage.getItem(k) || 0;
      if (Date.now() - last < 864e5) return;
      localStorage.setItem(k, Date.now());
    } catch (e) {}
    fetch(CFG.url + "/rest/v1/rpc/track_download", {
      method: "POST", keepalive: true, headers: hdr({ "Content-Type": "application/json" }),
      body: JSON.stringify({ p_app: id })
    }).catch(function () {});
  }

  function chip(text) {
    return el("span", "chip", text);
  }

  function buildCard(a) {
    var card = el("article", "card");
    card.style.setProperty("--accent", a.color || "#1346a8");

    var head = el("div", "card-head");
    var icon = el("div", "icon");
    if (a.iconImage && (safeUrl(a.iconImage) || /^[\w\-\/.]+$/.test(a.iconImage))) {
      var img = el("img");
      img.src = a.iconImage;
      img.alt = "";
      img.loading = "lazy";
      icon.appendChild(img);
    } else {
      icon.textContent = a.icon || "📱";
    }
    var titles = el("div", "titles");
    titles.appendChild(el("h2", null, a.name));
    if (a.tagline) titles.appendChild(el("p", "tagline", a.tagline));
    head.appendChild(icon);
    head.appendChild(titles);
    card.appendChild(head);

    if (a.description) card.appendChild(el("p", "desc", a.description));

    if (a.screenshots && a.screenshots.length) {
      var shots = el("div", "shots");
      a.screenshots.forEach(function (src) {
        if (!safeUrl(src)) return;
        var im = el("img");
        im.src = safeUrl(src);
        im.alt = "لقطة شاشة من " + a.name;
        im.loading = "lazy";
        shots.appendChild(im);
      });
      card.appendChild(shots);
    }

    var chips = el("div", "chips");
    if (a.version) chips.appendChild(chip("الإصدار " + a.version));
    if (a.size) chips.appendChild(chip(a.size));
    if (a.updated) chips.appendChild(chip("آخر تحديث: " + fmtDate(a.updated)));
    if (a.platform) chips.appendChild(chip(a.platform));
    if (typeof a.downloads === "number") chips.appendChild(chip("⬇ " + a.downloads.toLocaleString("ar-EG") + " تحميل"));
    if (chips.children.length) card.appendChild(chips);

    var actions = el("div", "actions");
    if (safeUrl(a.apk)) {
      var dl = el("a", "btn", "تحميل APK");
      dl.href = safeUrl(a.apk);
      dl.setAttribute("download", "");
      dl.rel = "noopener";
      dl.addEventListener("click", function () { track(a.id); });
      actions.appendChild(dl);
    } else {
      var soon = el("button", "btn disabled", "قريبًا");
      soon.disabled = true;
      actions.appendChild(soon);
    }
    (a.links || []).forEach(function (l) {
      if (!l || !safeUrl(l.url)) return;
      var b = el("a", "btn secondary", l.label || "رابط");
      b.href = safeUrl(l.url);
      b.target = "_blank";
      b.rel = "noopener";
      actions.appendChild(b);
    });
    card.appendChild(actions);

    return card;
  }

  function render(list) {
    grid.textContent = "";
    list.forEach(function (a) { grid.appendChild(buildCard(a)); });
    empty.textContent = apps.length ? "لا توجد تطبيقات مطابقة للبحث." : "لا توجد تطبيقات حاليًا، تابعنا قريبًا.";
    empty.hidden = list.length > 0;
    document.querySelector(".search-wrap").hidden = apps.length === 0;
  }

  function filter() {
    var q = search.value.trim().toLowerCase();
    if (!q) return render(apps);
    render(apps.filter(function (a) {
      return [a.name, a.tagline, a.description].join(" ").toLowerCase().indexOf(q) !== -1;
    }));
  }

  (function () {
    var list = (window.ALHOOT_SUPPORT || []).filter(function (x) {
      return x && (safeUrl(x.url) || /^\+?\d{8,15}$/.test(x.number || ""));
    });
    if (!list.length) return;
    var box = document.getElementById("support-links");
    list.forEach(function (x) {
      if (safeUrl(x.url)) {
        var a = el("a", "btn", x.label || "ادعم");
        a.href = safeUrl(x.url); a.target = "_blank"; a.rel = "noopener";
        box.appendChild(a);
      } else {
        var b = el("button", "btn", (x.label || "رقم") + ": " + x.number);
        b.type = "button";
        b.addEventListener("click", function () {
          var done = function () { b.textContent = "تم نسخ الرقم ✓"; setTimeout(function () { b.textContent = (x.label || "رقم") + ": " + x.number; }, 1800); };
          try { navigator.clipboard.writeText(x.number).then(done, function () {}); } catch (e) {}
        });
        box.appendChild(b);
      }
    });
    document.getElementById("support").hidden = false;
  })();

  search.addEventListener("input", filter);

  function loadJson() {
    return fetch("apps.json", { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    }).then(function (d) { return Array.isArray(d.apps) ? d.apps : []; });
  }
  function loadDb() {
    return fetch(CFG.url + "/rest/v1/apps?published=eq.true&order=sort.asc", { headers: hdr() })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (rows) { return rows.map(fromRow); });
  }

  (useDb ? loadDb().catch(loadJson) : loadJson())
    .then(function (list) { apps = list; render(apps); })
    .catch(function () {
      empty.textContent = "تعذّر تحميل قائمة التطبيقات. حاول مرة تانية.";
      empty.hidden = false;
    });
})();
