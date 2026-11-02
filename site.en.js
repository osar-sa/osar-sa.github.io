/* ====== إعدادات أوسار — عدّل هنا فقط ====== */
var OSAR_CONFIG = {
  phone: "0565603814",          // رقم التواصل والاتصال
  whatsapp: "966565603814",     // نفس الرقم بالصيغة الدولية (بدون + وبدون الصفر الأول)
  email: "Osarr.sa@gmail.com",
  fal: "1100017854",           // رقم رخصة فال
  cr: "",                       // رقم السجل التجاري
  entity: "",                   // الاسم النظامي للمنشأة
  sheetEndpoint: "https://script.google.com/macros/s/AKfycbxagRHDjUKPL-mzddM_tP7tNdz-W96etMyNvoUdcZYC7UzmAg2l2rTFXgRf-AqfCBcASA/exec", // يحفظ التسجيلات في صفحة «تسجيلات اهتمام الموقع الإلكتروني»
  googleForm: null              // { action: "https://docs.google.com/forms/d/e/.../formResponse", fields: { need: "entry.X", name: "entry.X", phone: "entry.X", msg: "entry.X", source: "entry.X" } }
};
/* ========================================== */
(function () {
  var C = OSAR_CONFIG;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  // Drawer
  var burger = $('#burger'), drawer = $('#drawer'), scrim = $('#scrim');
  function setOpen(o) {
    drawer.classList.toggle('open', o); scrim.classList.toggle('open', o);
    burger.setAttribute('aria-expanded', o ? 'true' : 'false');
    drawer.setAttribute('aria-hidden', o ? 'false' : 'true');
    if (o) { var f = $('.x', drawer); if (f) f.focus(); } else burger.focus({ preventScroll: true });
  }
  if (burger) {
    burger.addEventListener('click', function () { setOpen(!drawer.classList.contains('open')); });
    scrim.addEventListener('click', function () { setOpen(false); });
    $('.x', drawer).addEventListener('click', function () { setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && drawer.classList.contains('open')) setOpen(false); });
    $$('a', drawer).forEach(function (a) { a.addEventListener('click', function () { drawer.classList.remove('open'); scrim.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }); });
  }

  // Contact values
  $$('[data-phone]').forEach(function (el) { el.textContent = C.phone; });
  $$('[data-email]').forEach(function (el) { el.textContent = C.email; });
  $$('[data-wa]').forEach(function (el) { el.href = 'https://wa.me/' + C.whatsapp; });
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  var legal = $('#legal');
  if (legal) {
    [[C.entity, ''], [C.cr, (document.documentElement.lang === 'en' ? 'CR ' : 'س.ت ')]].forEach(function (p) {
      if (!p[0]) return;
      var s = document.createElement('span');
      if (p[1]) { s.textContent = p[1]; var b = document.createElement('b'); b.textContent = p[0]; s.appendChild(b); }
      else s.textContent = p[0];
      legal.appendChild(s);
    });
  }

  // Copy buttons
  $$('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var key = btn.getAttribute('data-copy'), t = C[key], label = btn.textContent;
      function done() { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = label; }, 1600); }
      function fallback() { var el = $('[data-' + key + ']'); if (!el) return; var r = document.createRange(); r.selectNodeContents(el); var s = getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = 'Selected, copy it'; }
      try { navigator.clipboard.writeText(t).then(done, fallback); } catch (e) { fallback(); }
    });
  });

  // Interest form
  var form = $('#lead');
  if (!form) return;
  var note = $('#f-note'), btn = $('#f-submit'), label = btn.textContent;
  function waLink(text) { return 'https://wa.me/' + C.whatsapp + '?text=' + encodeURIComponent(text); }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if ($('#f-hp').value) return;
    var hasChoices = !!form.querySelector('input[name=need]');
    var picked = form.querySelector('input[name=need]:checked');
    var need = picked ? picked.value : '';
    var name = $('#f-name').value.trim(), phone = $('#f-phone').value.trim(),
        city = ($('#f-city') || { value: '' }).value.trim(), msg = ($('#f-msg') || { value: '' }).value.trim();
    if (hasChoices && !picked) { note.textContent = 'Please choose a request type.'; form.querySelector('input[name=need]').focus(); return; }
    if (!name || !phone) { note.textContent = 'Please enter your name and mobile number.'; (name ? $('#f-phone') : $('#f-name')).focus(); return; }
    var path = form.getAttribute('data-path') || need;
    need = (need && need !== path) ? (path + ' — ' + need) : path;
    var text = 'Hello OSAR, I would like to register my interest\nRequest: ' + need + '\nName: ' + name + '\nMobile: ' + phone +
      (city ? '\nCity / district: ' + city : '') + (msg ? '\nDetails: ' + msg : '');
    var source = 'Website (EN) - ' + (document.body.getAttribute('data-page') || '');
    var G = C.googleForm || {};
    var target = null, body = null;
    if (G.action && G.fields) {
      target = G.action; body = new URLSearchParams();
      var vals = { need: need, name: name, phone: phone, msg: msg, source: source };
      Object.keys(G.fields).forEach(function (k) { if (G.fields[k]) body.append(G.fields[k], vals[k] || ''); });
    } else if (C.sheetEndpoint) {
      target = C.sheetEndpoint;
      body = new URLSearchParams({ name: name, phone: phone, need: need, city: city, msg: msg, source: source });
    }
    if (!target) {
      note.textContent = 'Online registration is being activated, please contact us at ' + C.phone;
      return;
    }
    btn.disabled = true; btn.textContent = 'Sending…'; note.textContent = '';
    fetch(target, { method: 'POST', mode: 'no-cors', body: body }).then(function () {
      form.reset(); btn.disabled = false; btn.textContent = label; note.textContent = '';
      var th = $('#thanks');
      if (th) { $('#th-name').textContent = name; form.hidden = true; th.hidden = false; th.focus(); }
      else note.textContent = 'Thank you ' + name + ', we received your interest and will contact you within 24 hours.';
    }, function () {
      btn.disabled = false; btn.textContent = label;
      note.textContent = 'Could not send. Check your connection and try again, or contact us at ' + C.phone;
    });
  });
})();
