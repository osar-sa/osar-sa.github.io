/* مساحة فريق أوسار · OSAR WORKSPACE — الواجهة */
(function () {
  'use strict';
  const API = window.OSAR_API;
  const $app = document.getElementById('app');
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} },
  };
  let token = store.get('osar_token');
  let D = null, view = location.hash.slice(1) || 'home', asEmail = null, clientId = null, taskTab = 'mine', menuOpen = false;

  /* ---------- قواميس ---------- */
  const T = {
    task: { new: ['جديد', 's-new'], doing: ['جاري', 's-doing'], review: ['بانتظار الاعتماد', 's-review'], done: ['تم', 's-done'] },
    client: { pending: ['بانتظار الاعتماد', 's-review'], active: ['نشط', 's-doing'], negotiation: ['تفاوض', 's-new'], ended: ['منتهي', 's-done'], rejected: ['مرفوض', 's-late'] },
    pkg: { asas: 'أساس', bina: 'بناء', mujtama: 'مجتمع', custom: 'عرض خاص' },
    type: { realestate: 'عقاري / مطوّر', other: 'أخرى' },
    req: { design: 'تصاميم', video: 'تصوير وريلز', motion: 'موشن AI', ads: 'حملات', community: 'رد على العملاء', reports: 'تقارير', plan: 'خطة محتوى' },
    kind: { post: 'بوست', reel: 'ريل', story: 'ستوري', carousel: 'كاروسيل' },
    post: { written: 'مكتوب', design: 'في التصميم', ready: 'جاهز', published: 'منشور' },
    stage: { contact: 'تواصل', meeting: 'اجتماع', quote: 'عرض سعر', won: 'تم التعاقد', lost: 'مرفوض' },
    pay: { unpaid: 'غير مدفوعة', paid: 'مدفوعة' },
    appr: { client_new: 'عميل جديد', client_edit: 'تعديل بيانات عميل', contract: 'رفع عقد', invoice: 'رفع فاتورة', payments_new: 'جدول دفعات', payment_edit: 'تعديل دفعة', task_done: 'تسليم مهمة', delete: 'طلب حذف' },
    roles: { admin: 'مدير', sales: 'جلب عملاء', creative: 'تصميم ومحتوى', ads: 'حملات إعلانية' },
  };
  const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

  /* ---------- أدوات ---------- */
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (v) => (v === '' || v == null) ? '—' : '<span class="en">' + Number(v).toLocaleString('en-US') + '</span>';
  const fdate = (d) => { if (!d) return '—'; const x = new Date(d.slice(0, 10) + 'T12:00:00'); return isNaN(x) ? esc(d) : x.getDate() + ' ' + MONTHS[x.getMonth()] + (x.getFullYear() !== new Date().getFullYear() ? ' ' + x.getFullYear() : ''); };
  const dnum = (d) => Math.round((new Date(d + 'T00:00:00') - new Date(D.today + 'T00:00:00')) / 864e5);
  const uname = (e) => { const u = (D.users || []).find((x) => x.email === e); return u ? u.name : (e || '—'); };
  const cname = (id) => { const c = (D.clients || []).find((x) => x.id === id); return c ? c.name : ''; };
  const initial = (n) => esc(String(n || '?').trim().charAt(0));
  const tag = (map, k) => { const v = T[map][k]; return v ? '<span class="tag ' + v[1] + '">' + v[0] + '</span>' : ''; };
  const P = () => D.view.perms;
  const RO = () => !!D.readOnly;
  const isLate = (t) => t.due && t.status !== 'done' && t.status !== 'review' && dnum(t.due) < 0;
  function toast(msg, bad) { const t = document.getElementById('toast'); t.textContent = msg; t.className = 'show' + (bad ? ' bad' : ''); clearTimeout(toast.t); toast.t = setTimeout(() => (t.className = ''), 2600); }

  async function api(action, data) {
    if (!API || /PASTE_/.test(API)) throw new Error('النظام لم يُفعَّل بعد: رابط الخلفية غير مضاف');
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ action, token }, data || {})) });
    const j = await r.json();
    if (!j.ok) { if (j.error === 'AUTH') { logout(); throw new Error('انتهت الجلسة، سجّل دخولك من جديد'); } throw new Error(j.error || 'خطأ'); }
    return j;
  }
  async function act(action, data, msg) {
    if (RO()) { toast('وضع المعاينة: قراءة فقط', true); return null; }
    try { const r = await api(action, data); toast(r.pending ? 'تم الإرسال، بانتظار اعتماد المدير' : (msg || 'تم الحفظ')); await load(); return r; }
    catch (e) { toast(e.message, true); return null; }
  }
  function logout() { token = null; store.set('osar_token', null); D = null; renderLogin(); }

  /* ---------- الدخول ---------- */
  function renderLogin(step, email) {
    $app.innerHTML = '<div class="login"><div class="lb"><img src="logo.png" alt="أوسار"><h2>مساحة الفريق</h2>' +
      (step === 'code'
        ? '<p>أرسلنا كود من 6 أرقام إلى<br><span class="en">' + esc(email) + '</span></p><input class="inp code" id="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••"><button class="btn" id="go">دخول</button><div class="err" id="err"></div><p style="margin:14px 0 0"><button class="link" id="back">تغيير الإيميل</button> · <button class="link" id="again">إعادة إرسال</button></p>'
        : '<p>اكتب إيميلك، ويوصلك كود دخول.</p><input class="inp en" id="email" type="email" autocomplete="email" placeholder="name@email.com"><button class="btn" id="go">أرسل الكود</button><div class="err" id="err"></div><p style="margin:14px 0 0;font-size:11px">الدخول للأسماء اللي أضافها المدير فقط.</p>') +
      '</div></div>';
    const err = document.getElementById('err'), go = document.getElementById('go');
    const send = async (em) => {
      go.disabled = true; err.textContent = '';
      try { await api('requestCode', { email: em }); store.set('osar_email', em); renderLogin('code', em); }
      catch (e) { err.textContent = e.message; go.disabled = false; }
    };
    if (step === 'code') {
      const c = document.getElementById('code'); c.focus();
      const verify = async () => {
        go.disabled = true; err.textContent = '';
        try { const r = await api('verifyCode', { email, code: c.value }); token = r.token; store.set('osar_token', token); await load(); }
        catch (e) { err.textContent = e.message; go.disabled = false; }
      };
      go.onclick = verify; c.onkeydown = (e) => { if (e.key === 'Enter') verify(); };
      c.oninput = () => { if (c.value.replace(/\D/g, '').length === 6) verify(); };
      document.getElementById('back').onclick = () => renderLogin();
      document.getElementById('again').onclick = () => send(email);
    } else {
      const em = document.getElementById('email'); em.value = store.get('osar_email') || ''; em.focus();
      const s = () => { const v = em.value.trim().toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { err.textContent = 'الإيميل غير صحيح'; return; } send(v); };
      go.onclick = s; em.onkeydown = (e) => { if (e.key === 'Enter') s(); };
    }
  }

  async function load() {
    try { D = await api('data', asEmail ? { asEmail } : {}); render(); }
    catch (e) { if (!token) return; $app.innerHTML = '<div class="login"><div class="lb"><img src="logo.png" alt=""><p>' + esc(e.message) + '</p><button class="btn" id="rt">إعادة المحاولة</button></div></div>'; document.getElementById('rt').onclick = load; }
  }

  /* ---------- الهيكل ---------- */
  function navItems() {
    const p = P(), n = [];
    const myOpen = D.tasks.filter((t) => t.assignee === D.view.email && t.status !== 'done').length;
    n.push(['home', 'الرئيسية', 'Home', '']);
    n.push(['tasks', 'المهام', 'Tasks', myOpen || '']);
    n.push(['clients', 'العملاء', 'Clients', D.clients.length || '']);
    n.push(['content', 'خطة المحتوى', 'Content plan', '']);
    if (p.pipeline) n.push(['pipeline', 'الفرص البيعية', 'Pipeline', D.pipeline.filter((x) => x.stage !== 'won' && x.stage !== 'lost').length || '']);
    if (p.money) n.push(['billing', 'الفواتير والعقود', 'Billing', D.reminders.filter((r) => /دفعة/.test(r.text)).length || '']);
    if (p.admin) n.push(['approvals', 'الاعتمادات', 'Approvals', D.approvals.length || '']);
    if (p.admin) n.push(['team', 'الفريق والإعدادات', 'Team', '']);
    return n;
  }
  function render() {
    if (!navItems().some((n) => n[0] === view)) view = 'home';
    const v = D.view, me = D.me;
    const body = { home: vHome, tasks: vTasks, clients: clientId ? vClient : vClients, content: vContent, pipeline: vPipeline, billing: vBilling, approvals: vApprovals, team: vTeam }[view]();
    $app.innerHTML = '<div class="app"><aside class="' + (menuOpen ? 'open' : '') + '"><div class="brand"><img src="mark.png" alt=""><div><b>مساحة الفريق</b><small class="en">OSAR WORKSPACE</small></div></div><nav class="nav">' +
      navItems().map((n) => '<button data-nav="' + n[0] + '" class="' + (view === n[0] ? 'on' : '') + '">' + n[1] + '<span class="e">' + n[2] + '</span>' + (n[3] !== '' ? '<span class="c">' + n[3] + '</span>' : '') + '</button>').join('') +
      '</nav><div class="me"><div class="av">' + initial(me.name) + '</div><div><b>' + esc(me.name) + '</b><small>' + esc(me.roleLabel) + '</small></div><button class="link" id="out" title="تسجيل خروج">خروج</button></div></aside>' +
      '<div><div class="mtop"><img src="mark.png" alt=""><button class="btn ghost sm" id="menu">القائمة ☰</button></div><main>' +
      (D.readOnly ? '<div class="banner"><span>تشوف الحساب كـ <b>' + esc(v.name) + '</b> · قراءة فقط</span><button class="btn sm" id="exitAs">رجوع لحسابي</button></div>' : '') +
      body + '</main></div></div>' + bottomNav() + (menuOpen ? '<div class="scrim" id="scrim"></div>' : '');
    $app.querySelectorAll('[data-nav]').forEach((b) => (b.onclick = () => { view = b.dataset.nav; clientId = null; menuOpen = false; location.hash = view; render(); scrollTo(0, 0); }));
    document.getElementById('out').onclick = logout;
    document.querySelectorAll('#menu,#bmenu').forEach((m) => (m.onclick = () => { menuOpen = !menuOpen; render(); }));
    const sc = document.getElementById('scrim'); if (sc) sc.onclick = () => { menuOpen = false; render(); };
    labelTables();
    const ex = document.getElementById('exitAs'); if (ex) ex.onclick = () => { asEmail = null; view = 'team'; load(); };
    bind();
  }

  function bottomNav() {
    const items = navItems(); const main = ['home', 'tasks', 'clients', 'content'];
    const ic = { home: '⌂', tasks: '✓', clients: '◎', content: '▦' };
    const more = items.filter((n) => main.indexOf(n[0]) < 0);
    const moreCount = more.reduce((s, n) => s + (Number(n[3]) || 0), 0);
    return '<nav class="bnav">' + items.filter((n) => main.indexOf(n[0]) >= 0).map((n) => '<button data-nav="' + n[0] + '" class="' + (view === n[0] ? 'on' : '') + '"><i>' + ic[n[0]] + '</i>' + n[1] + (n[3] !== '' ? '<b>' + n[3] + '</b>' : '') + '</button>').join('') +
      '<button id="bmenu" class="' + (main.indexOf(view) < 0 ? 'on' : '') + '"><i>☰</i>المزيد' + (moreCount ? '<b>' + moreCount + '</b>' : '') + '</button></nav>';
  }
  function labelTables() {
    document.querySelectorAll('.tbl table').forEach((t) => {
      const heads = [...t.querySelectorAll('tr:first-child th')].map((th) => (th.childNodes[0] && th.childNodes[0].textContent || th.textContent).trim());
      t.querySelectorAll('tr').forEach((tr) => [...tr.children].forEach((td, i) => { if (td.tagName === 'TD' && heads[i]) td.setAttribute('data-l', heads[i]); }));
    });
  }

  /* ---------- مكوّنات ---------- */
  function taskRow(t, showWho) {
    const late = isLate(t);
    return '<div class="row clickable" data-task="' + t.id + '">' + (showWho ? '<div class="av sm" style="background:' + colorOf(t.assignee) + '">' + initial(uname(t.assignee)) + '</div>' : '') +
      '<div class="x"><b>' + esc(t.title) + (t.clientId ? ' · ' + esc(cname(t.clientId)) : '') + '</b><small>' + (showWho ? esc(uname(t.assignee)) + ' · ' : '') + (t.due ? 'الموعد ' + fdate(t.due) : 'بدون موعد') + '</small></div>' +
      (late ? '<span class="tag s-late">متأخرة</span>' : tag('task', t.status)) + '</div>';
  }
  function colorOf(email) { const r = (D.users.find((u) => u.email === email) || {}).role; return { admin: '#CDF98A', sales: '#00AD6D', creative: '#8FD6BE', ads: '#b9a6ff' }[r] || '#8C948F'; }
  function weekGrid() {
    const t = new Date(D.today + 'T12:00:00'); const s = new Date(t); s.setDate(t.getDate() - t.getDay());
    let h = '<div class="week">';
    for (let i = 0; i < 7; i++) {
      const d = new Date(s); d.setDate(s.getDate() + i); const iso = d.toISOString().slice(0, 10);
      const ps = D.posts.filter((p) => p.date === iso);
      h += '<div class="' + (iso === D.today ? 'today' : '') + '"><b>' + DAYS[i] + ' <span class="en">' + d.getDate() + '</span></b>' +
        ps.map((p) => '<span class="pp p-' + esc(p.status) + '" data-post="' + p.id + '">' + esc(cname(p.clientId)) + ' · ' + (T.kind[p.kind] || esc(p.kind)) + '</span>').join('') + '</div>';
    }
    return h + '</div>';
  }
  const kpi = (v, l, cls) => '<div class="k ' + (cls || '') + '"><div class="kv">' + v + '</div><div class="kl">' + l + '</div></div>';

  /* ---------- الصفحات ---------- */
  function vHome() {
    const p = P(), v = D.view;
    const scope = p.team ? D.tasks : D.tasks.filter((t) => t.assignee === v.email);
    const open = scope.filter((t) => t.status !== 'done');
    const todays = open.filter((t) => !t.due || dnum(t.due) <= 0);
    const late = open.filter(isLate);
    const waiting = p.admin ? D.approvals.length : scope.filter((t) => t.status === 'review').length;
    const doneWeek = scope.filter((t) => t.status === 'done' && t.updatedAt && (Date.now() - new Date(t.updatedAt)) < 7 * 864e5).length;
    const list = open.slice().sort((a, b) => (a.due || '9') < (b.due || '9') ? -1 : 1).slice(0, 8);
    const hour = new Date().getHours();
    return '<div class="top"><div><h1>' + (hour < 12 ? 'صباح الخير' : 'مساء الخير') + '، ' + esc(v.name) + '</h1><p>' + fdate(D.today) + ' · <span class="e">' + (p.team ? 'Team overview' : 'My day') + '</span></p></div>' + (RO() ? '' : '<button class="btn" data-newtask>+ مهمة جديدة</button>') + '</div>' +
      '<div class="kpis">' + kpi(todays.length, 'مهام اليوم · <span class="e">Today</span>') + kpi(late.length, 'متأخرة · <span class="e">Overdue</span>', late.length ? 'al' : '') + kpi(waiting, (p.admin ? 'بانتظار اعتمادك' : 'بانتظار الاعتماد') + ' · <span class="e">Approval</span>') + kpi(doneWeek, 'منجزة هذا الأسبوع · <span class="e">Done</span>', 'ok') + '</div>' +
      '<div class="grid"><div class="card"><h3>' + (p.team ? 'مهام الفريق' : 'مهامي') + ' <span class="e">' + (p.team ? 'Team tasks' : 'My tasks') + '</span></h3>' + (list.length ? list.map((t) => taskRow(t, p.team)).join('') : '<div class="empty">ما فيه مهام مفتوحة 👌</div>') + '</div>' +
      '<div class="stack">' +
      (D.reminders.length ? '<div class="card"><h3>تنبيهات <span class="e">Reminders</span></h3>' + D.reminders.slice(0, 8).map((r) => '<div class="rem"><i class="' + r.level + '"></i>' + esc(r.text) + '<small>' + (r.days < 0 ? 'متأخر ' + -r.days + ' يوم' : r.days === 0 ? 'اليوم' : 'بعد ' + r.days + ' يوم') + '</small></div>').join('') + '</div>' : '') +
      '<div class="card note"><h3>إعلانات الفريق <span class="e">Announcements</span></h3>' + (D.notes.length ? D.notes.slice(0, 3).map((n) => '<p style="font-size:13px;margin-bottom:8px">' + esc(n.text) + '<br><small style="color:var(--mut)">' + esc(n.by) + ' · ' + fdate(n.date) + '</small></p>').join('') : '<div class="empty">ما فيه إعلانات</div>') + (p.admin && !RO() ? '<button class="link" data-note>+ إعلان جديد</button>' : '') + '</div>' +
      '<div class="card"><h3>العملاء <span class="e">Clients</span></h3>' + (D.clients.length ? D.clients.slice(0, 6).map((c) => '<div class="row clickable" data-client="' + c.id + '"><div class="x"><b>' + esc(c.name) + '</b><small>' + (T.type[c.type] || '') + (c.package ? ' · ' + T.pkg[c.package] : '') + '</small></div>' + tag('client', c.status) + '</div>').join('') : '<div class="empty">ما فيه عملاء بعد</div>') + '</div>' +
      '</div></div>' +
      '<div class="card" style="margin-top:14px"><h3>خطة المحتوى هذا الأسبوع <span class="e">Content plan</span></h3>' + weekGrid() + '</div>';
  }

  function vTasks() {
    const p = P(), v = D.view;
    let list = D.tasks;
    if (taskTab === 'mine' || !p.team) list = list.filter((t) => t.assignee === v.email);
    else if (taskTab === 'byme') list = list.filter((t) => t.createdBy === v.email && t.assignee !== v.email);
    const order = { review: 0, doing: 1, new: 2, done: 3 };
    list = list.slice().sort((a, b) => (isLate(b) - isLate(a)) || (order[a.status] - order[b.status]) || ((a.due || '9') < (b.due || '9') ? -1 : 1));
    const tabs = [['mine', 'مهامي'], ['byme', 'طلبتها من زملائي']].concat(p.team ? [['all', 'كل الفريق']] : []);
    return '<div class="top"><div><h1>المهام</h1><p><span class="e">Tasks</span> · غيّر الحالة وارفع التسليم</p></div>' + (RO() ? '' : '<button class="btn" data-newtask>+ مهمة جديدة</button>') + '</div>' +
      '<div class="tabs">' + tabs.map((t) => '<button data-ttab="' + t[0] + '" class="' + (taskTab === t[0] ? 'on' : '') + '">' + t[1] + '</button>').join('') + '</div>' +
      (list.length ? list.map((t) => {
        const mine = t.assignee === v.email || p.admin;
        const del = t.delivery ? (t.delivery.indexOf('file:') === 0 ? '<button class="link" data-file="' + esc(t.delivery.slice(5)) + '">📎 ملف التسليم</button>' : '<a href="' + esc(t.delivery) + '" target="_blank" rel="noopener">🔗 رابط التسليم</a>') : '';
        return '<div class="task ' + (isLate(t) ? 'late' : '') + '"><div class="r"><div><b>' + esc(t.title) + '</b></div>' + (isLate(t) ? '<span class="tag s-late">متأخرة</span>' : tag('task', t.status)) + '</div>' +
          '<p>' + (t.clientId ? esc(cname(t.clientId)) + ' · ' : '') + 'لـ ' + esc(uname(t.assignee)) + ' · من ' + esc(uname(t.createdBy)) + ' · ' + (t.due ? 'الموعد ' + fdate(t.due) : 'بدون موعد') + (t.notes ? '<br>' + esc(t.notes).replace(/\n/g, '<br>') : '') + '</p>' +
          '<div class="ac">' + del + (RO() || !mine ? '' :
            (t.status === 'new' ? '<button class="btn ghost sm" data-st="' + t.id + ':doing">ابدأ</button>' : '') +
            (t.status !== 'done' && t.status !== 'review' ? '<button class="btn ghost sm" data-deliver="' + t.id + '">رفع التسليم</button><button class="btn sm" data-st="' + t.id + ':done">تم</button>' : '') +
            '<button class="link" data-task="' + t.id + '">تعديل</button>') + '</div></div>';
      }).join('') : '<div class="card empty">ما فيه مهام هنا</div>');
  }

  function vClients() {
    const p = P();
    return '<div class="top"><div><h1>العملاء</h1><p><span class="e">Clients</span> · النوع والباقة والعقد والفواتير</p></div>' + (RO() ? '' : '<button class="btn" data-newclient>+ إضافة عميل</button>') + '</div>' +
      '<div class="card tbl"><table><tr><th>العميل<span class="e">Client</span></th><th>النوع<span class="e">Type</span></th><th>الباقة<span class="e">Package</span></th><th>الطلبات<span class="e">Requests</span></th><th>المدة<span class="e">Term</span></th>' + (p.money ? '<th>القيمة<span class="e">Value</span></th>' : '') + '<th>الحالة<span class="e">Status</span></th></tr>' +
      (D.clients.length ? D.clients.map((c) => '<tr class="clickable" data-client="' + c.id + '"><td><b>' + esc(c.name) + '</b><div style="color:var(--mut);font-size:11px">أضافه ' + esc(uname(c.createdBy)) + '</div></td><td>' + (T.type[c.type] || '—') + (c.type === 'other' && c.sector ? ' · ' + esc(c.sector) : '') + '</td><td>' + (c.package ? '<span class="pk pk-' + c.package + '">' + T.pkg[c.package] + '</span>' : '—') + '</td><td class="chips">' + (c.requests || '').split(',').filter(Boolean).map((r) => '<span>' + (T.req[r] || esc(r)) + '</span>').join('') + '</td><td style="font-size:12px">' + (c.start ? fdate(c.start) + ' ← ' + fdate(c.end) : '—') + '</td>' + (p.money ? '<td>' + money(c.value) + '</td>' : '') + '<td>' + tag('client', c.status) + '</td></tr>').join('') : '<tr><td colspan="7" class="empty">ما فيه عملاء بعد. أضف أول عميل.</td></tr>') + '</table></div>';
  }

  function vClient() {
    const c = D.clients.find((x) => x.id === clientId); if (!c) { clientId = null; return vClients(); }
    const p = P();
    const pays = D.payments.filter((x) => x.clientId === c.id).sort((a, b) => Number(a.n) - Number(b.n));
    const dls = D.deadlines.filter((x) => x.clientId === c.id).sort((a, b) => a.date < b.date ? -1 : 1);
    const tasks = D.tasks.filter((t) => t.clientId === c.id && t.status !== 'done');
    const months = c.start && c.end ? Math.max(1, Math.round((new Date(c.end) - new Date(c.start)) / (30.44 * 864e5))) : 0;
    let tl = '';
    if (c.start && c.end) {
      const s = new Date(c.start).getTime(), e = new Date(c.end).getTime(), span = Math.max(1, e - s);
      const pos = (d) => Math.min(100, Math.max(0, (new Date(d).getTime() - s) / span * 100));
      tl = '<div class="tl"><i style="width:' + pos(D.today) + '%"></i><span class="m" style="right:0%">البداية<br>' + fdate(c.start) + '</span>' +
        (D.today >= c.start && D.today <= c.end ? '<span class="m now" style="right:' + pos(D.today) + '%">اليوم</span>' : '') +
        dls.map((d) => '<span class="m dl" style="right:' + pos(d.date) + '%">⚑ ' + esc(d.title) + '<br>' + fdate(d.date) + '</span>').join('') +
        '<span class="m" style="right:100%">النهاية<br>' + fdate(c.end) + '</span></div>';
    }
    return '<div class="top"><div><button class="link" data-back>→ العملاء</button><h1>' + esc(c.name) + '</h1><p>' + (T.type[c.type] || '') + (c.sector ? ' · ' + esc(c.sector) : '') + (c.package ? ' · باقة ' + T.pkg[c.package] : '') + ' · أضافه ' + esc(uname(c.createdBy)) + '</p></div><div style="display:flex;gap:8px;align-items:center">' + tag('client', c.status) + (RO() ? '' : '<button class="btn ghost sm" data-editclient="' + c.id + '">تعديل</button>') + '</div></div>' +
      '<div class="info"><div><small>بداية العقد · <span class="e">Start</span></small><b>' + fdate(c.start) + '</b></div><div><small>نهاية العقد · <span class="e">End</span></small><b>' + fdate(c.end) + '</b></div><div><small>المدة · <span class="e">Term</span></small><b>' + (months ? months + (months > 2 && months < 11 ? ' أشهر' : ' شهر') : '—') + '</b></div><div><small>قيمة العقد · <span class="e">Total</span></small><b>' + (p.money ? money(c.value) + (c.value ? ' <span class="en" style="font-size:11px">SAR</span>' : '') : '🔒') + '</b></div></div>' +
      '<div class="card"><h3>المدة والددلاينات <span class="e">Timeline</span></h3>' + (tl || '<div class="empty">حدّد بداية ونهاية العقد عشان يطلع الشريط الزمني</div>') +
      '<div style="margin-top:10px">' + dls.map((d) => '<div class="rem"><i class="' + (dnum(d.date) <= 3 && dnum(d.date) >= 0 ? 'hi' : 'md') + '"></i>⚑ ' + esc(d.title) + '<small>' + fdate(d.date) + '</small></div>').join('') + '</div>' +
      (RO() ? '' : '<button class="link" data-newdl="' + c.id + '">+ ددلاين</button>') + '<p style="color:var(--mut);font-size:11.5px;margin-top:6px">⏰ تذكير قبل الددلاين بـ ٣ أيام، وقبل نهاية العقد بـ ١٤ يوم.</p></div>' +
      (p.money ? '<div class="card" style="margin-top:14px"><h3>الدفعات والعقد <span class="e">Payments · ' + pays.length + '</span></h3>' +
        '<div class="rem"><i class="' + (c.contractFile ? 'md' : 'hi') + '" style="background:' + (c.contractFile ? 'var(--lime)' : '') + '"></i>العقد: ' + (c.contractFile ? '<button class="link" data-file="' + esc(c.contractFile) + '">📎 فتح العقد</button>' : 'غير مرفوع') + (RO() ? '' : '<small><button class="link" data-upload="contract:' + c.id + '">رفع عقد</button></small>') + '</div>' +
        (pays.length ? '<div class="tbl"><table><tr><th>الدفعة</th><th>الاستحقاق</th><th>المبلغ</th><th>الفاتورة</th><th>الحالة</th></tr>' + pays.map((x) => {
          const n = dnum(x.due);
          const st = x.approved !== '1' ? '<span class="tag s-review">بانتظار الاعتماد</span>' : x.status === 'paid' ? '<span class="tag s-doing">مدفوعة</span>' : n < 0 ? '<span class="tag s-late">متأخرة ' + -n + ' يوم</span>' : n <= 7 ? '<span class="tag s-review">بعد ' + n + ' يوم · تذكير</span>' : '<span class="tag s-new">قادمة</span>';
          return '<tr><td>' + esc(x.n) + '</td><td>' + fdate(x.due) + '</td><td>' + money(x.amount) + '</td><td>' + (x.invoiceFile ? '<button class="link" data-file="' + esc(x.invoiceFile) + '">📎 الفاتورة</button>' : (RO() ? '—' : '<button class="link" data-upload="invoice:' + x.id + '">+ رفع</button>')) + '</td><td>' + st + (RO() || x.approved !== '1' ? '' : ' <button class="link" data-paid="' + x.id + ':' + (x.status === 'paid' ? 'unpaid' : 'paid') + '">' + (x.status === 'paid' ? 'إلغاء' : 'تم الدفع') + '</button>') + '</td></tr>';
        }).join('') + '</table></div>' : '<div class="empty">ما فيه دفعات. ' + (months > 1 ? 'العقد ' + months + ' أشهر، تقدر تسوي جدول دفعات.' : '') + '</div>') +
        (RO() ? '' : '<button class="link" data-mkpay="' + c.id + '">+ ' + (pays.length ? 'دفعات إضافية' : 'إنشاء جدول الدفعات') + '</button>') + '</div>' : '') +
      '<div class="card" style="margin-top:14px"><h3>مهام العميل <span class="e">Open tasks</span></h3>' + (tasks.length ? tasks.map((t) => taskRow(t, true)).join('') : '<div class="empty">ما فيه مهام مفتوحة</div>') + '</div>' +
      (c.notes ? '<div class="card" style="margin-top:14px"><h3>ملاحظات</h3><p style="font-size:13px">' + esc(c.notes).replace(/\n/g, '<br>') + '</p></div>' : '') +
      (P().admin && !RO() ? '<p style="margin-top:14px"><button class="link" style="color:#ffb4b4" data-del="client:' + c.id + '">حذف العميل</button></p>' : '');
  }

  function vContent() {
    const up = D.posts.filter((p) => p.date >= D.today).sort((a, b) => a.date < b.date ? -1 : 1).slice(0, 30);
    return '<div class="top"><div><h1>خطة المحتوى</h1><p><span class="e">Content plan</span> · مكتوب ← في التصميم ← جاهز ← منشور</p></div>' + (RO() ? '' : '<button class="btn" data-newpost>+ محتوى</button>') + '</div>' +
      '<div class="card"><h3>هذا الأسبوع <span class="e">This week</span></h3>' + weekGrid() + '</div>' +
      '<div class="card tbl" style="margin-top:14px"><h3>القادم <span class="e">Upcoming</span></h3><table><tr><th>التاريخ</th><th>العميل</th><th>النوع</th><th>العنوان</th><th>المسؤول</th><th>الحالة</th></tr>' +
      (up.length ? up.map((p) => '<tr class="clickable" data-post="' + p.id + '"><td>' + fdate(p.date) + '</td><td>' + esc(cname(p.clientId)) + '</td><td>' + (T.kind[p.kind] || '') + '</td><td>' + esc(p.title) + '</td><td>' + esc(uname(p.assignee)) + '</td><td><span class="pp p-' + esc(p.status) + '" style="display:inline-block">' + (T.post[p.status] || '') + '</span></td></tr>').join('') : '<tr><td colspan="6" class="empty">ما فيه محتوى مجدول</td></tr>') + '</table></div>';
  }

  function vPipeline() {
    const st = Object.keys(T.stage);
    const won = D.pipeline.filter((x) => x.stage === 'won').length, quote = D.pipeline.filter((x) => x.stage === 'quote').length, meet = D.pipeline.filter((x) => x.stage === 'meeting').length;
    return '<div class="top"><div><h1>الفرص البيعية</h1><p><span class="e">Pipeline</span> · حدّث المرحلة بعد كل تواصل</p></div>' + (RO() ? '' : '<button class="btn" data-newopp>+ شركة جديدة</button>') + '</div>' +
      '<div class="kpis">' + kpi(D.pipeline.length, 'في القائمة') + kpi(meet, 'اجتماعات') + kpi(quote, 'عروض سعر') + kpi(won, 'تم التعاقد', 'ok') + '</div>' +
      '<div class="pipe">' + st.map((s) => { const items = D.pipeline.filter((x) => x.stage === s); return '<div class="col"><h4>' + T.stage[s] + ' <span class="en" style="color:var(--mut)">' + items.length + '</span></h4>' + items.map((x) => '<div class="co ' + (s === 'won' ? 'won' : '') + '" data-opp="' + x.id + '"><b>' + esc(x.company) + '</b><small>' + esc(x.contact || '') + (x.updatedAt ? ' · ' + fdate(x.updatedAt) : '') + '</small></div>').join('') + '</div>'; }).join('') + '</div>';
  }

  function vBilling() {
    const pays = D.payments.filter((x) => x.approved === '1');
    const unpaid = pays.filter((x) => x.status !== 'paid');
    const late = unpaid.filter((x) => dnum(x.due) < 0);
    const month = D.today.slice(0, 7);
    const sum = (a) => a.reduce((s, x) => s + (Number(x.amount) || 0), 0);
    const list = pays.slice().sort((a, b) => a.due < b.due ? -1 : 1);
    return '<div class="top"><div><h1>الفواتير والعقود</h1><p><span class="e">Billing</span> · كل الدفعات بكل العملاء</p></div></div>' +
      '<div class="kpis">' + kpi(money(sum(pays.filter((x) => x.due.slice(0, 7) === month))), 'مستحق هذا الشهر') + kpi(money(sum(pays.filter((x) => x.status === 'paid' && x.due.slice(0, 7) === month))), 'محصّل هذا الشهر', 'ok') + kpi(late.length, 'دفعات متأخرة', late.length ? 'al' : '') + kpi(money(sum(unpaid)), 'إجمالي غير المدفوع') + '</div>' +
      '<div class="card tbl"><table><tr><th>العميل</th><th>الدفعة</th><th>الاستحقاق</th><th>المبلغ</th><th>الفاتورة</th><th>الحالة</th></tr>' +
      (list.length ? list.map((x) => { const n = dnum(x.due); return '<tr class="clickable" data-client="' + x.clientId + '"><td><b>' + esc(cname(x.clientId)) + '</b></td><td>' + esc(x.n) + '</td><td>' + fdate(x.due) + '</td><td>' + money(x.amount) + '</td><td>' + (x.invoiceFile ? '📎' : '—') + '</td><td>' + (x.status === 'paid' ? '<span class="tag s-doing">مدفوعة</span>' : n < 0 ? '<span class="tag s-late">متأخرة ' + -n + ' يوم</span>' : '<span class="tag s-new">' + (n <= 7 ? 'بعد ' + n + ' يوم' : 'قادمة') + '</span>') + '</td></tr>'; }).join('') : '<tr><td colspan="6" class="empty">ما فيه دفعات. أنشئها من صفحة العميل.</td></tr>') + '</table></div>';
  }

  function vApprovals() {
    return '<div class="top"><div><h1>الاعتمادات</h1><p><span class="e">Approvals</span> · محد يعتمد غيرك</p></div></div>' +
      (D.approvals.length ? D.approvals.map((a) => {
        let p = {}; try { p = JSON.parse(a.payload || '{}'); } catch (e) {}
        let detail = '';
        if (a.kind === 'client_edit') { const cur = D.clients.find((c) => c.id === a.refId) || {}; const L = { name: 'الاسم', type: 'النوع', sector: 'القطاع', package: 'الباقة', requests: 'الطلبات', start: 'البداية', end: 'النهاية', value: 'القيمة', status: 'الحالة', notes: 'ملاحظات' }; const fmt = (k, v) => k === 'type' ? (T.type[v] || v) : k === 'package' ? (T.pkg[v] || v) : k === 'requests' ? String(v || '').split(',').filter(Boolean).map((r) => T.req[r] || r).join('، ') : (k === 'start' || k === 'end') ? fdate(v) : k === 'value' ? money(v) : esc(v); const ch = Object.keys(p).filter((k) => L[k] && String(p[k] || '') !== String(cur[k] || '')); detail = ch.length ? ch.map((k) => '<b>' + L[k] + ':</b> ' + (cur[k] ? fmt(k, cur[k]) + ' ← ' : '') + fmt(k, p[k])).join('<br>') : 'بدون تغيير فعلي'; }
        else if (a.kind === 'payments_new') detail = esc(p.client) + ' · ' + esc(p.count) + ' دفعات × ' + money(p.amount);
        else if (a.kind === 'contract' || a.kind === 'invoice') detail = '<button class="link" data-file="' + esc(p.fileId) + '">📎 ' + esc(p.name) + '</button>';
        else if (a.kind === 'task_done') detail = esc(p.title) + (p.delivery ? (String(p.delivery).indexOf('file:') === 0 ? ' · <button class="link" data-file="' + esc(p.delivery.slice(5)) + '">📎 التسليم</button>' : ' · <a target="_blank" rel="noopener" href="' + esc(p.delivery) + '">🔗 التسليم</a>') : '');
        else detail = esc(p.name || p.label || p.client || '');
        const ref = a.kind.indexOf('client') === 0 || a.kind === 'contract' || a.kind === 'payments_new' ? cname(a.refId) : '';
        return '<div class="task"><div class="r"><b>' + (T.appr[a.kind] || a.kind) + (ref ? ' · ' + esc(ref) : '') + '</b><span class="tag s-review">بانتظار</span></div><p>من ' + esc(uname(a.by)) + ' · ' + fdate(a.createdAt) + '<br>' + detail + '</p>' +
          (RO() ? '' : '<div class="ac"><button class="btn sm" data-decide="' + a.id + ':approve">اعتماد</button><button class="btn red sm" data-decide="' + a.id + ':reject">رفض</button></div>') + '</div>';
      }).join('') : '<div class="card empty">ما فيه شي ينتظر اعتمادك ✓</div>');
  }

  function vTeam() {
    return '<div class="top"><div><h1>الفريق والإعدادات</h1><p><span class="e">Team & settings</span> · أضف موظف واختر دوره</p></div><button class="btn" data-newuser>+ إضافة موظف</button></div>' +
      '<div class="card tbl"><table><tr><th>الاسم</th><th>الإيميل</th><th>الدور</th><th>مهام مفتوحة</th><th>متأخرة</th><th>آخر دخول</th><th></th></tr>' +
      D.users.map((u) => {
        const open = D.tasks.filter((t) => t.assignee === u.email && t.status !== 'done');
        return '<tr><td><div class="fb"><div class="av sm" style="background:' + colorOf(u.email) + '">' + initial(u.name) + '</div><b>' + esc(u.name) + '</b></div></td><td class="en" style="font-size:12px">' + esc(u.email) + '</td><td>' + esc(u.roleLabel) + (u.active !== '1' ? ' <span class="tag s-late">موقوف</span>' : '') + '</td><td>' + open.length + '</td><td>' + open.filter(isLate).length + '</td><td style="font-size:12px">' + (u.lastLogin ? fdate(u.lastLogin) : 'لم يدخل بعد') + '</td><td style="white-space:nowrap">' +
          (u.email !== D.me.email ? '<button class="link" data-as="' + esc(u.email) + '">اعرض كـ ' + esc(u.name) + '</button> · <button class="link" data-edituser="' + esc(u.email) + '">تعديل</button>' : '<span style="color:var(--mut);font-size:12px">أنت</span>') + '</td></tr>';
      }).join('') + '</table></div>' +
      '<div class="card" style="margin-top:14px"><h3>الصلاحيات <span class="e">Roles</span></h3><p style="font-size:12.5px;color:var(--mut);line-height:1.9">' +
      '<b style="color:var(--iv)">مدير:</b> كل شي، والاعتماد والحذف بيده.<br><b style="color:var(--iv)">جلب عملاء:</b> مهام الفريق، والعملاء، والمبالغ، والفرص البيعية.<br><b style="color:var(--iv)">تصميم ومحتوى:</b> مهامه، والعملاء بدون مبالغ، وخطة المحتوى.<br><b style="color:var(--iv)">حملات إعلانية:</b> مهامه، والعملاء بدون مبالغ، وخطة المحتوى، والحملات والليدز (قريبًا).<br>أي إضافة أو تعديل أو رفع ملف من موظف يوصل لك للاعتماد.</p></div>';
  }

  /* ---------- النوافذ ---------- */
  function modal(html, onSave) {
    const ov = document.createElement('div'); ov.className = 'ov';
    ov.innerHTML = '<div class="modal" role="dialog">' + html + '<div class="mact"><button class="btn" data-save>حفظ</button><button class="btn ghost" data-cancel>إلغاء</button></div></div>';
    document.body.appendChild(ov);
    const close = () => ov.remove();
    ov.onclick = (e) => { if (e.target === ov) close(); };
    ov.querySelector('[data-cancel]').onclick = close;
    ov.querySelectorAll('.seg').forEach((s) => s.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (s.dataset.multi) b.classList.toggle('on'); else { s.querySelectorAll('button').forEach((x) => x.classList.remove('on')); b.classList.add('on'); }
      s.dispatchEvent(new Event('segchange'));
    }));
    const save = ov.querySelector('[data-save]');
    save.onclick = async () => { save.disabled = true; const ok = await onSave(ov); save.disabled = false; if (ok !== false) close(); };
    const f = ov.querySelector('input,textarea'); if (f) f.focus();
    return ov;
  }
  const val = (ov, id) => (ov.querySelector('#' + id) || {}).value || '';
  const segv = (ov, id) => [...ov.querySelectorAll('#' + id + ' button.on')].map((b) => b.dataset.v).join(',');
  const seg = (id, map, cur, multi) => '<div class="seg" id="' + id + '"' + (multi ? ' data-multi="1"' : '') + '>' + Object.keys(map).map((k) => '<button type="button" data-v="' + k + '" class="' + ((multi ? (cur || '').split(',').includes(k) : cur === k) ? 'on' : '') + '">' + map[k] + '</button>').join('') + '</div>';
  const fld = (label, en, inner) => '<div class="fld"><label>' + label + '<span class="e">' + en + '</span></label>' + inner + '</div>';
  const opts = (list, cur, empty) => (empty ? '<option value="">' + empty + '</option>' : '') + list.map((o) => '<option value="' + esc(o[0]) + '"' + (o[0] === cur ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('');
  const userOpts = (cur) => opts(D.users.filter((u) => u.active === '1').map((u) => [u.email, u.name + ' · ' + u.roleLabel]), cur);
  const clientOpts = (cur, empty) => opts(D.clients.filter((c) => c.status !== 'rejected').map((c) => [c.id, c.name]), cur, empty);

  function taskModal(t) {
    t = t || { assignee: D.view.email };
    modal('<h3>' + (t.id ? 'تعديل مهمة' : 'مهمة جديدة') + '</h3><p class="sub">' + (t.id ? '' : 'تقدر تضيفها لنفسك أو لزميلك') + '</p>' +
      fld('العنوان', 'Title', '<input class="inp" id="title" value="' + esc(t.title || '') + '">') +
      '<div class="two">' + fld('المسؤول', 'Assignee', '<select class="inp" id="assignee">' + userOpts(t.assignee) + '</select>') + fld('الموعد', 'Due', '<input class="inp" type="date" id="due" value="' + esc(t.due || '') + '">') + '</div>' +
      fld('العميل', 'Client', '<select class="inp" id="clientId">' + clientOpts(t.clientId, 'بدون عميل') + '</select>') +
      fld('تفاصيل', 'Notes', '<textarea class="inp" id="notes">' + esc(t.notes || '') + '</textarea>') +
      (t.id && P().admin ? '<p style="margin-top:10px"><button type="button" class="link" style="color:#ffb4b4" data-del="task:' + t.id + '">حذف المهمة</button></p>' : t.id ? '<p style="margin-top:10px"><button type="button" class="link" style="color:#ffb4b4" data-del="task:' + t.id + '">طلب حذف</button></p>' : ''),
      async (ov) => !!(await act('saveTask', { task: { id: t.id, title: val(ov, 'title'), assignee: val(ov, 'assignee'), due: val(ov, 'due'), clientId: val(ov, 'clientId'), notes: val(ov, 'notes') } })));
  }
  function clientModal(c) {
    c = c || {};
    const ov = modal('<h3>' + (c.id ? 'تعديل عميل' : 'إضافة عميل') + ' <span class="e" style="color:var(--lime)">' + (c.id ? 'Edit client' : 'New client') + '</span></h3><p class="sub">' + (P().admin ? '' : 'يُحفظ ويوصل لعبدالرحيم للاعتماد.') + '</p>' +
      fld('اسم الشركة', 'Name', '<input class="inp" id="name" value="' + esc(c.name || '') + '">') +
      fld('النوع', 'Type', seg('type', T.type, c.type || 'realestate')) +
      '<div class="fld" id="sectorBox" style="' + (c.type === 'other' ? '' : 'display:none') + '"><input class="inp" id="sector" placeholder="القطاع: مطاعم، تجزئة، خدمات…" value="' + esc(c.sector || '') + '"></div>' +
      fld('الباقة', 'Package', seg('package', { asas: 'أساس', bina: 'بناء', mujtama: 'مجتمع', custom: 'بدون باقة · عرض خاص' }, c.package || '')) +
      fld('الطلبات', 'Requests', seg('requests', T.req, c.requests || '', true)) +
      '<div class="two">' + fld('بداية العقد', 'Start', '<input class="inp" type="date" id="start" value="' + esc(c.start || '') + '">') + fld('نهاية العقد', 'End', '<input class="inp" type="date" id="end" value="' + esc(c.end || '') + '">') + '</div>' +
      (P().money ? fld('قيمة العقد (ريال)', 'Value', '<input class="inp en" inputmode="numeric" id="value" value="' + esc(c.value || '') + '">') : '') +
      (c.id && P().admin ? fld('الحالة', 'Status', seg('status', { active: 'نشط', negotiation: 'تفاوض', ended: 'منتهي' }, c.status)) : (!c.id && P().admin ? fld('الحالة', 'Status', seg('status', { active: 'نشط', negotiation: 'تفاوض' }, 'active')) : '')) +
      fld('ملاحظات', 'Notes', '<textarea class="inp" id="notes">' + esc(c.notes || '') + '</textarea>') +
      (P().admin ? '' : '<div class="appr">⏳ لا يصير العميل «نشط» ولا يتغيّر إلا بعد اعتماد عبدالرحيم</div>') +
      (c.id ? '' : '<p class="sub" style="margin-top:10px">بعد الحفظ ترفع العقد وتسوي جدول الدفعات من صفحة العميل.</p>'),
      async (ov) => {
        const data = { id: c.id, name: val(ov, 'name'), type: segv(ov, 'type'), sector: segv(ov, 'type') === 'other' ? val(ov, 'sector') : '', package: segv(ov, 'package'), requests: segv(ov, 'requests'), start: val(ov, 'start'), end: val(ov, 'end'), notes: val(ov, 'notes') };
        if (P().money) data.value = val(ov, 'value').replace(/[^\d.]/g, '');
        if (P().admin && ov.querySelector('#status')) data.status = segv(ov, 'status');
        if (!data.name) { toast('اكتب اسم العميل', true); return false; }
        if (data.start && data.end && data.end < data.start) { toast('النهاية قبل البداية', true); return false; }
        const r = await act('saveClient', { client: data });
        if (r && !c.id) { view = 'clients'; clientId = r.id; render(); }
        return !!r;
      });
    ov.querySelector('#type').addEventListener('segchange', () => { ov.querySelector('#sectorBox').style.display = segv(ov, 'type') === 'other' ? '' : 'none'; });
  }
  function postModal(p) {
    p = p || { date: D.today, status: 'written', kind: 'post', assignee: D.view.email };
    modal('<h3>' + (p.id ? 'تعديل محتوى' : 'محتوى جديد') + '</h3>' +
      '<div class="two">' + fld('العميل', 'Client', '<select class="inp" id="clientId">' + clientOpts(p.clientId) + '</select>') + fld('التاريخ', 'Date', '<input class="inp" type="date" id="date" value="' + esc(p.date || '') + '">') + '</div>' +
      fld('النوع', 'Type', seg('kind', T.kind, p.kind)) + fld('العنوان / الفكرة', 'Title', '<input class="inp" id="title" value="' + esc(p.title || '') + '">') +
      fld('المسؤول', 'Assignee', '<select class="inp" id="assignee">' + userOpts(p.assignee) + '</select>') + fld('الحالة', 'Status', seg('status', T.post, p.status)) +
      (p.id ? '<p style="margin-top:10px"><button type="button" class="link" style="color:#ffb4b4" data-del="post:' + p.id + '">' + (P().admin ? 'حذف' : 'طلب حذف') + '</button></p>' : ''),
      async (ov) => !!(await act('savePost', { post: { id: p.id, clientId: val(ov, 'clientId'), date: val(ov, 'date'), kind: segv(ov, 'kind'), title: val(ov, 'title'), assignee: val(ov, 'assignee'), status: segv(ov, 'status') } })));
  }
  function oppModal(o) {
    o = o || { stage: 'contact' };
    modal('<h3>' + (o.id ? esc(o.company) : 'شركة جديدة') + '</h3>' +
      fld('اسم الشركة', 'Company', '<input class="inp" id="company" value="' + esc(o.company || '') + '">') +
      '<div class="two">' + fld('الشخص المسؤول', 'Contact', '<input class="inp" id="contact" value="' + esc(o.contact || '') + '">') + fld('الجوال', 'Phone', '<input class="inp en" id="phone" value="' + esc(o.phone || '') + '">') + '</div>' +
      fld('المرحلة', 'Stage', seg('stage', T.stage, o.stage)) + fld('ملاحظات المتابعة', 'Notes', '<textarea class="inp" id="notes">' + esc(o.notes || '') + '</textarea>') +
      (o.id ? '<p style="margin-top:10px"><button type="button" class="link" style="color:#ffb4b4" data-del="pipeline:' + o.id + '">' + (P().admin ? 'حذف' : 'طلب حذف') + '</button></p>' : ''),
      async (ov) => !!(await act('savePipeline', { item: { id: o.id, company: val(ov, 'company'), contact: val(ov, 'contact'), phone: val(ov, 'phone'), stage: segv(ov, 'stage'), notes: val(ov, 'notes') } })));
  }
  function userModal(u) {
    u = u || { role: 'creative' };
    const roles = Object.assign({}, T.roles); if (u.email !== D.me.email) delete roles.admin;
    modal('<h3>' + (u.email ? 'تعديل ' + esc(u.name) : 'إضافة موظف') + '</h3><p class="sub">' + (u.email ? '' : 'يوصله إيميل دعوة، ويدخل بإيميله مع كود.') + '</p>' +
      fld('الاسم', 'Name', '<input class="inp" id="name" value="' + esc(u.name || '') + '">') +
      fld('الإيميل', 'Email', '<input class="inp en" id="email" type="email" value="' + esc(u.email || '') + '"' + (u.email ? ' disabled' : '') + '>') +
      fld('الدور', 'Role', seg('role', roles, u.role)) +
      (u.email ? fld('الحساب', 'Access', seg('active', { 1: 'مفعّل', 0: 'موقوف' }, u.active || '1')) : ''),
      async (ov) => !!(await act('saveUser', { email: u.email || val(ov, 'email'), name: val(ov, 'name'), role: segv(ov, 'role'), active: u.email ? segv(ov, 'active') : '1' }, u.email ? 'تم التعديل' : 'تمت الإضافة وأُرسلت الدعوة')));
  }
  function pickFile(cb) {
    const i = document.createElement('input'); i.type = 'file'; i.accept = '.pdf,image/*,.doc,.docx,.xls,.xlsx,.zip';
    i.onchange = () => { const f = i.files[0]; if (!f) return; if (f.size > 15 * 1024 * 1024) { toast('الملف أكبر من 15MB', true); return; } const r = new FileReader(); r.onload = () => cb({ name: f.name, mime: f.type || 'application/octet-stream', data: String(r.result).split(',')[1] }); r.readAsDataURL(f); };
    i.click();
  }
  async function openFile(id) {
    try { toast('جاري فتح الملف…'); const r = await api('getFile', { fileId: id }); const bin = atob(r.data); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); const url = URL.createObjectURL(new Blob([u8], { type: r.mime })); const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; if (!/pdf|image/.test(r.mime)) a.download = r.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000); }
    catch (e) { toast(e.message, true); }
  }

  /* ---------- ربط الأحداث ---------- */
  function bind() {
    const on = (sel, fn) => document.querySelectorAll(sel).forEach((el) => (el.onclick = (e) => { e.stopPropagation(); fn(el, e); }));
    on('[data-newtask]', () => taskModal());
    on('[data-task]', (el) => taskModal(D.tasks.find((t) => t.id === el.dataset.task)));
    on('[data-ttab]', (el) => { taskTab = el.dataset.ttab; render(); });
    on('[data-st]', (el) => { const [id, s] = el.dataset.st.split(':'); act('saveTask', { task: { id, status: s } }, s === 'done' && !P().admin ? 'أُرسلت للاعتماد' : 'تم التحديث'); });
    on('[data-deliver]', (el) => {
      const id = el.dataset.deliver;
      modal('<h3>رفع التسليم</h3><p class="sub">ارفع ملف، أو حط رابط (Drive، Canva، Figma…)</p>' + fld('رابط', 'Link', '<input class="inp en" id="link" placeholder="https://">') + '<p style="margin-top:12px"><button type="button" class="btn ghost sm" id="pf">📎 اختيار ملف بدل الرابط</button> <span id="fn" style="font-size:12px;color:var(--mut)"></span></p>', async (ov) => {
        if (ov._file) return !!(await act('uploadFile', Object.assign({ kind: 'delivery', refId: id }, ov._file), 'تم رفع التسليم'));
        const l = val(ov, 'link'); if (!/^https?:\/\//.test(l)) { toast('حط رابط صحيح أو اختر ملف', true); return false; }
        return !!(await act('saveTask', { task: { id, delivery: l } }, 'تم رفع التسليم'));
      });
      const ov = document.querySelector('.ov:last-child'); ov.querySelector('#pf').onclick = () => pickFile((f) => { ov._file = f; ov.querySelector('#fn').textContent = f.name; });
    });
    on('[data-newclient]', () => clientModal());
    on('[data-client]', (el) => { view = 'clients'; clientId = el.dataset.client; location.hash = 'clients'; render(); scrollTo(0, 0); });
    on('[data-back]', () => { clientId = null; render(); });
    on('[data-editclient]', (el) => clientModal(D.clients.find((c) => c.id === el.dataset.editclient)));
    on('[data-newdl]', (el) => modal('<h3>ددلاين جديد</h3>' + fld('العنوان', 'Title', '<input class="inp" id="title" placeholder="مثل: إطلاق الحملة">') + fld('التاريخ', 'Date', '<input class="inp" type="date" id="date">'), async (ov) => !!(await act('saveDeadline', { deadline: { clientId: el.dataset.newdl, title: val(ov, 'title'), date: val(ov, 'date') } }))));
    on('[data-mkpay]', (el) => {
      const c = D.clients.find((x) => x.id === el.dataset.mkpay);
      const months = c.start && c.end ? Math.max(1, Math.round((new Date(c.end) - new Date(c.start)) / (30.44 * 864e5))) : 1;
      const per = c.value ? Math.round(Number(c.value) / months) : '';
      modal('<h3>جدول الدفعات</h3><p class="sub">' + esc(c.name) + (months > 1 ? ' · العقد ' + months + ' أشهر' : '') + '</p><div class="two">' + fld('عدد الدفعات', 'Count', '<input class="inp en" id="count" inputmode="numeric" value="' + months + '">') + fld('مبلغ الدفعة', 'Amount', '<input class="inp en" id="amount" inputmode="numeric" value="' + per + '">') + '</div>' + fld('أول استحقاق', 'First due', '<input class="inp" type="date" id="start" value="' + esc(c.start || D.today) + '">') + '<p class="sub" style="margin-top:8px">كل دفعة بعد الثانية تستحق بعد شهر من اللي قبلها.</p>',
        async (ov) => !!(await act('makePayments', { clientId: c.id, count: val(ov, 'count'), amount: val(ov, 'amount').replace(/[^\d.]/g, ''), start: val(ov, 'start') }, 'تم إنشاء الدفعات')));
    });
    on('[data-paid]', (el) => { const [id, s] = el.dataset.paid.split(':'); act('setPayment', { id, status: s }); });
    on('[data-upload]', (el) => { const [kind, refId] = el.dataset.upload.split(':'); pickFile((f) => { toast('جاري الرفع…'); act('uploadFile', Object.assign({ kind, refId }, f), 'تم الرفع'); }); });
    on('[data-file]', (el) => openFile(el.dataset.file));
    on('[data-newpost]', () => postModal());
    on('[data-post]', (el) => postModal(D.posts.find((p) => p.id === el.dataset.post)));
    on('[data-newopp]', () => oppModal());
    on('[data-opp]', (el) => oppModal(D.pipeline.find((o) => o.id === el.dataset.opp)));
    on('[data-note]', () => modal('<h3>إعلان للفريق</h3>' + fld('النص', 'Text', '<textarea class="inp" id="text"></textarea>'), async (ov) => !!(await act('addNote', { text: val(ov, 'text') }, 'تم النشر للفريق'))));
    on('[data-decide]', (el) => {
      const [id, d] = el.dataset.decide.split(':');
      if (d === 'approve') return act('decide', { id, decision: 'approve' }, 'تم الاعتماد');
      modal('<h3>رفض الطلب</h3>' + fld('السبب (يوصل للموظف)', 'Comment', '<textarea class="inp" id="c"></textarea>'), async (ov) => !!(await act('decide', { id, decision: 'reject', comment: val(ov, 'c') }, 'تم الرفض')));
    });
    on('[data-newuser]', () => userModal());
    on('[data-edituser]', (el) => userModal(D.users.find((u) => u.email === el.dataset.edituser)));
    on('[data-as]', (el) => { asEmail = el.dataset.as; view = 'home'; load(); });
    document.body.onclick = (e) => {
      const d = e.target.closest('[data-del]'); if (!d) return;
      const [kind, id] = d.dataset.del.split(':');
      const ov = d.closest('.ov'); if (ov) ov.remove();
      modal('<h3>' + (P().admin ? 'تأكيد الحذف' : 'طلب حذف') + '</h3><p class="sub">' + (P().admin ? 'الحذف نهائي وما يتراجع.' : 'يوصل الطلب لعبدالرحيم، وهو يقرر.') + '</p>', async () => { const r = await act('requestDelete', { kind, id }, 'تم الحذف'); if (r && kind === 'client' && P().admin) { clientId = null; render(); } return !!r; });
      const sv = document.querySelector('.ov:last-child [data-save]'); sv.textContent = P().admin ? 'احذف' : 'أرسل الطلب'; sv.classList.add('red');
    };
  }

  /* ---------- البداية ---------- */
  window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (D && h && h !== view) { view = h; clientId = null; render(); } });
  if (token) load(); else renderLogin();
})();
