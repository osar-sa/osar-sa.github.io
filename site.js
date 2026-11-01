/* ====== إعدادات أوسار — عدّل هنا فقط ====== */
var OSAR_CONFIG = {
  phone: "0565603814",          // رقم التواصل والاتصال
  whatsapp: "966565603814",     // نفس الرقم بالصيغة الدولية (بدون + وبدون الصفر الأول)
  email: "Osarr.sa@gmail.com",
  fal: "11100017854",           // رقم رخصة فال
  cr: "",                       // رقم السجل التجاري
  entity: "",                   // الاسم النظامي للمنشأة
  sheetEndpoint: ""             // رابط Google Apps Script لحفظ تسجيلات الاهتمام في الشيت
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
      function done() { btn.textContent = 'تم النسخ'; setTimeout(function () { btn.textContent = label; }, 1600); }
      function fallback() { var el = $('[data-' + key + ']'); if (!el) return; var r = document.createRange(); r.selectNodeContents(el); var s = getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = 'محدد، انسخه'; }
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
    var need = (form.querySelector('input[name=need]:checked') || {}).value || (document.body.getAttribute('data-page') || '');
    var name = $('#f-name').value.trim(), phone = $('#f-phone').value.trim(),
        city = ($('#f-city') || { value: '' }).value.trim(), msg = ($('#f-msg') || { value: '' }).value.trim();
    if (!name || !phone) { note.textContent = 'فضلاً اكتب الاسم ورقم الجوال.'; (name ? $('#f-phone') : $('#f-name')).focus(); return; }
    var text = 'السلام عليكم، أرغب بتسجيل اهتمامي\nنوع الطلب: ' + need + '\nالاسم: ' + name + '\nالجوال: ' + phone +
      (city ? '\nالمدينة / الحي: ' + city : '') + (msg ? '\nالتفاصيل: ' + msg : '');
    if (C.sheetEndpoint) {
      btn.disabled = true; btn.textContent = 'جارٍ التسجيل…'; note.textContent = '';
      var body = new URLSearchParams({ name: name, phone: phone, need: need, city: city, msg: msg, source: 'الموقع - ' + (document.body.getAttribute('data-page') || '') });
      fetch(C.sheetEndpoint, { method: 'POST', mode: 'no-cors', body: body }).then(function () {
        form.reset(); btn.disabled = false; btn.textContent = label; note.textContent = '';
        note.append('شكراً ' + name + '، وصلنا اهتمامك وبنتواصل معك قريباً. ');
        var l = document.createElement('a'); l.href = waLink(text); l.target = '_blank'; l.rel = 'noopener'; l.textContent = 'تواصل فوراً عبر واتساب'; note.append(l);
      }, function () {
        btn.disabled = false; btn.textContent = label;
        note.textContent = 'تعذّر الإرسال. تحقق من الاتصال وحاول مرة أخرى، أو تواصل معنا على ' + C.phone;
      });
      return;
    }
    var w = document.createElement('a'); w.href = waLink(text); w.target = '_blank'; w.rel = 'noopener';
    document.body.appendChild(w); w.click(); w.remove();
    note.textContent = 'إذا لم يُفتح واتساب، تواصل معنا على ' + C.phone;
  });
})();
