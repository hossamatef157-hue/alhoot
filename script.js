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

  // ===== الاشتراك بحساب Google =====
  (function () {
    var box = document.getElementById("subscribe");
    if (!useDb || !box) return;
    var note = document.getElementById("sub-note"), acts = document.getElementById("sub-actions");
    var KEY = "alhoot_u", INTENT = "alhoot_sub", S = null;
    function load() { try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { S = null; } }
    function save(s) { S = s; try { s ? localStorage.setItem(KEY, JSON.stringify(s)) : localStorage.removeItem(KEY); } catch (e) {} }
    function jwt(t) { try { return JSON.parse(atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))); } catch (e) { return {}; } }
    function takeHash() {
      var p = new URLSearchParams(location.hash.slice(1));
      if (p.get("access_token")) {
        save({ t: p.get("access_token"), r: p.get("refresh_token"), exp: Date.now() + (+p.get("expires_in") || 3600) * 1000 });
      }
      var err = p.get("error_description");
      if (p.get("access_token") || err) history.replaceState(null, "", location.pathname + location.search);
      return err;
    }
    function token() {
      if (!S) return Promise.reject(new Error("no session"));
      if (S.exp - Date.now() > 60000) return Promise.resolve(S.t);
      if (!S.r) { save(null); return Promise.reject(new Error("expired")); }
      return fetch(CFG.url + "/auth/v1/token?grant_type=refresh_token", { method: "POST", headers: hdr({ "Content-Type": "application/json" }), body: JSON.stringify({ refresh_token: S.r }) })
        .then(function (r) { if (!r.ok) throw new Error("expired"); return r.json(); })
        .then(function (j) { save({ t: j.access_token, r: j.refresh_token, exp: Date.now() + (j.expires_in || 3600) * 1000 }); return S.t; })
        .catch(function (e) { save(null); throw e; });
    }
    function call(path, opt) {
      return token().then(function (t) {
        opt = opt || {};
        opt.headers = Object.assign(hdr({ "Content-Type": "application/json" }), { Authorization: "Bearer " + t });
        return fetch(CFG.url + "/rest/v1/" + path, opt);
      });
    }
    function google() { location.href = CFG.url + "/auth/v1/authorize?provider=google&redirect_to=" + encodeURIComponent(location.origin + location.pathname); }
    function btn(label, cls, fn) { var b = el("button", "btn " + cls, label); b.type = "button"; b.addEventListener("click", fn); return b; }
    function say(t) { note.textContent = t; }
    function view(state, email) {
      acts.textContent = ""; box.hidden = false;
      if (state === "out") {
        say("اشترك بحساب Google عشان توصلك أخبار التطبيقات الجديدة والتحديثات. بنحفظ إيميلك بس، وتقدر تلغي اشتراكك في أي وقت.");
        acts.appendChild(btn("🔔 اشترك بحساب Google", "", function () { try { sessionStorage.setItem(INTENT, "1"); } catch (e) {} google(); }));
      } else if (state === "in") {
        say("أهلاً " + email + ". اضغط اشتراك عشان توصلك أخبار المنصة.");
        acts.appendChild(btn("🔔 اشتراك", "", doSub)); acts.appendChild(btn("خروج", "secondary", out));
      } else {
        say("✓ أنت مشترك بالإيميل " + email + ". هتوصلك أخبار التطبيقات الجديدة والتحديثات.");
        acts.appendChild(btn("إلغاء الاشتراك", "secondary", doUnsub)); acts.appendChild(btn("خروج", "secondary", out));
      }
    }
    function out() { save(null); view("out"); }
    function doSub() {
      say("جاري الاشتراك...");
      call("rpc/subscribe", { method: "POST", body: "{}" })
        .then(function (r) { if (!r.ok) throw new Error(r.status); view("sub", jwt(S.t).email || ""); })
        .catch(function () { say("تعذّر الاشتراك. حاول مرة تانية."); });
    }
    function doUnsub() {
      say("جاري إلغاء الاشتراك...");
      call("subscribers?user_id=eq." + encodeURIComponent(jwt(S.t).sub || ""), { method: "DELETE" })
        .then(function (r) { if (!r.ok) throw new Error(r.status); view("in", jwt(S.t).email || ""); })
        .catch(function () { say("تعذّر إلغاء الاشتراك. حاول مرة تانية."); });
    }
    var authErr = takeHash();
    load();
    if (!S) { view("out"); if (authErr) say("تعذّر تسجيل الدخول: " + authErr); return; }
    token().then(function (t) {
      return call("subscribers?select=user_id").then(function (r) { return r.ok ? r.json() : []; }).then(function (rows) {
        var intent = false;
        try { intent = sessionStorage.getItem(INTENT) === "1"; sessionStorage.removeItem(INTENT); } catch (e) {}
        var email = jwt(t).email || "";
        if (rows.length) view("sub", email); else if (intent) doSub(); else view("in", email);
      });
    }).catch(function () { view("out"); });
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
