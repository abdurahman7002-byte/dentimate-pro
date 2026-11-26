/* =========================================================
   EMPLOYEES MANAGEMENT - Dentix local edition
   Owner-only page: manage named employees and per-page
   permissions (view / add / edit / delete).

   Data layer: Supabase tables `employees` + `employee_permissions`
   (see sql/employees.sql). If those tables do not exist yet,
   the page falls back to DEMO MODE with fake local data and a
   visible banner, so the UI can be tested before migration.
   ========================================================= */

const PAGES = [
    { key: 'dashboard',    name: 'الرئيسية (لوحة المتابعة)', icon: 'fa-house' },
    { key: 'patients',     name: 'المرضى',                   icon: 'fa-users' },
    { key: 'patient-file', name: 'ملف المريض',               icon: 'fa-folder-open' },
    { key: 'waiting',      name: 'شاشة الانتظار',            icon: 'fa-tv' },
    { key: 'bill',         name: 'الفواتير',                 icon: 'fa-file-invoice-dollar' },
    { key: 'reports',      name: 'التقارير',                 icon: 'fa-chart-line' },
    { key: 'storage',      name: 'المخزن',                   icon: 'fa-boxes-stacked' },
    { key: 'doctors',      name: 'الأطباء',                  icon: 'fa-user-doctor' },
    { key: 'labs',         name: 'المعامل',                  icon: 'fa-flask' },
    { key: 'drugs',        name: 'الأدوية',                  icon: 'fa-pills' },
    { key: 'prints',       name: 'الطباعة',                  icon: 'fa-print' },
    { key: 'control',      name: 'إعدادات العيادة',          icon: 'fa-sliders' },
];
const ACTIONS = [
    { key: 'view',  label: 'عرض',   col: 'can_view' },
    { key: 'add',   label: 'إضافة', col: 'can_add' },
    { key: 'edit',  label: 'تعديل', col: 'can_edit' },
    { key: 'del',   label: 'حذف',   col: 'can_delete' },
];

/* Demo mode is OPT-IN ONLY via an explicit window.DEMO_MODE === true, set by
   employees.demo.html before this file loads. A database error in the
   real app is a failure, never a reason to show fake data. */
const DEMO_MODE = window.DEMO_MODE === true;
let employees = [];
let editId = null;

const DEMO_SEED = [
    { id: 'demo-1', name: 'محمد أحمد', email: 'mohamed@clinic.local', active: true,
      permissions: { dashboard: { view: 1 }, patients: { view: 1, add: 1, edit: 1 },
                     waiting: { view: 1, add: 1, edit: 1 }, 'patient-file': { view: 1 } } },
    { id: 'demo-2', name: 'د. سارة علي', email: 'sara@clinic.local', active: true,
      permissions: { dashboard: { view: 1 }, 'patient-file': { view: 1, add: 1, edit: 1 },
                     patients: { view: 1 }, drugs: { view: 1 }, labs: { view: 1, add: 1 },
                     prints: { view: 1, add: 1 } } },
    { id: 'demo-3', name: 'محمود سيد', email: 'mahmoud@clinic.local', active: false,
      permissions: { storage: { view: 1, add: 1, edit: 1 }, reports: { view: 1 } } },
];

/* ---------- data layer ---------- */

async function loadEmployees() {
    if (DEMO_MODE) {
        employees = JSON.parse(JSON.stringify(DEMO_SEED));
        document.getElementById('demoBanner').style.display = 'flex';
        return;
    }

    const { data: emps, error } = await supabaseClient
        .from('employees')
        .select('id, full_name, email, active, auth_user_id')
        .order('created_at');

    if (error) throw error;

    const { data: perms, error: pErr } = await supabaseClient
        .from('employee_permissions')
        .select('employee_id, page_key, can_view, can_add, can_edit, can_delete');

    if (pErr) throw pErr;

    employees = (emps || []).map(e => ({
        id: e.id,
        name: e.full_name,
        email: e.email,
        active: e.active,
        auth_user_id: e.auth_user_id,
        permissions: {},
    }));
    (perms || []).forEach(p => {
        const emp = employees.find(e => e.id === p.employee_id);
        if (!emp) return;
        emp.permissions[p.page_key] = {
            view: p.can_view ? 1 : 0,
            add: p.can_add ? 1 : 0,
            edit: p.can_edit ? 1 : 0,
            del: p.can_delete ? 1 : 0,
        };
    });
}

function permRows(employeeId, perms) {
    const rows = [];
    Object.keys(perms).forEach(pageKey => {
        const r = perms[pageKey];
        if (!r.view) return;
        rows.push({
            employee_id: employeeId,
            page_key: pageKey,
            can_view: true,
            can_add: !!r.add,
            can_edit: !!r.edit,
            can_delete: !!r.del,
        });
    });
    return rows;
}

async function saveEmployeeRecord({ id, name, email, perms }) {
    if (DEMO_MODE) {
        if (id) {
            const e = employees.find(x => x.id === id);
            Object.assign(e, { name, email, permissions: perms });
        } else {
            employees.push({ id: 'demo-' + Date.now(), name, email, active: true, permissions: perms });
        }
        return;
    }

    let employeeId = id;
    if (id) {
        const { error } = await supabaseClient
            .from('employees')
            .update({ full_name: name, email })
            .eq('id', id);
        if (error) throw error;
        await supabaseClient.from('employee_permissions').delete().eq('employee_id', id);
    } else {
        const { data, error } = await supabaseClient
            .from('employees')
            .insert({ full_name: name, email })
            .select('id')
            .single();
        if (error) throw error;
        employeeId = data.id;
    }

    const rows = permRows(employeeId, perms);
    if (rows.length) {
        const { error } = await supabaseClient.from('employee_permissions').insert(rows);
        if (error) throw error;
    }
}

async function setEmployeeActive(emp, active) {
    if (DEMO_MODE) { emp.active = active; return; }
    const { error } = await supabaseClient
        .from('employees')
        .update({ active })
        .eq('id', emp.id);
    if (error) throw error;
    emp.active = active;
}

async function deleteEmployeeRecord(id) {
    if (DEMO_MODE) {
        employees = employees.filter(x => x.id !== id);
        return;
    }
    const { error } = await supabaseClient.from('employees').delete().eq('id', id);
    if (error) throw error;
    employees = employees.filter(x => x.id !== id);
}

/* ---------- UI ---------- */

function renderPermMatrix(perms) {
    const body = document.getElementById('permBody');
    body.innerHTML = '';
    PAGES.forEach(p => {
        const row = (perms && perms[p.key]) || {};
        const tr = document.createElement('tr');
        let tds = `<td class="page-name"><i class="fa-solid ${p.icon}"></i> ${p.name}</td>`;
        ACTIONS.forEach(a => {
            const checked = row[a.key] ? 'checked' : '';
            tds += `<td><input type="checkbox" class="chk ${a.key === 'del' ? 'del' : ''}"
                data-page="${p.key}" data-act="${a.key}" ${checked}
                aria-label="${a.label} - ${p.name}"></td>`;
        });
        tr.innerHTML = tds;
        body.appendChild(tr);
    });
}

document.addEventListener('change', e => {
    if (!e.target.classList.contains('chk')) return;
    const { page, act } = e.target.dataset;
    if (act !== 'view' && e.target.checked) {
        const v = document.querySelector(`.chk[data-page="${page}"][data-act="view"]`);
        if (v) v.checked = true;
    }
    if (act === 'view' && !e.target.checked) {
        document.querySelectorAll(`.chk[data-page="${page}"]`).forEach(c => {
            if (c.dataset.act !== 'view') c.checked = false;
        });
    }
});

function collectPerms() {
    const perms = {};
    document.querySelectorAll('.chk').forEach(c => {
        const { page, act } = c.dataset;
        if (!perms[page]) perms[page] = {};
        if (c.checked) perms[page][act] = 1;
    });
    Object.keys(perms).forEach(p => { if (!perms[p].view) delete perms[p]; });
    return perms;
}

function permSummary(perms) {
    const names = PAGES.filter(p => perms[p.key] && perms[p.key].view).map(p => p.name.split(' (')[0]);
    if (!names.length) return 'بدون صلاحيات';
    const extra = names.length > 3 ? ` +${names.length - 3}` : '';
    return `${names.length} صفحات: ${names.slice(0, 3).join('، ')}${extra}`;
}

function renderList() {
    const wrap = document.getElementById('empListWrap');
    if (!employees.length) { wrap.innerHTML = '<div class="empty">لا يوجد موظفون بعد</div>'; return; }
    const rows = employees.map(e => `
        <tr>
            <td><div class="emp-name"><div class="avatar">${e.name.trim().charAt(0)}</div>
                <div>${e.name}<div class="emp-email">${e.email}</div></div></div></td>
            <td class="perm-summary">${permSummary(e.permissions)}</td>
            <td><button class="pill ${e.active ? 'on' : 'off'}" onclick="toggleActive('${e.id}')">
                ${e.active ? 'نشط' : 'معطّل'}</button></td>
            <td><div class="row-actions">
                ${!e.auth_user_id
                    ? `<button class="icon-btn" title="إنشاء حساب دخول" onclick="provisionAccount('${e.id}')"><i class="fa-solid fa-key"></i></button>`
                    : `<button class="icon-btn" title="كلمة مرور جديدة" onclick="resetAccountPassword('${e.id}')"><i class="fa-solid fa-rotate"></i></button>`}
                <button class="icon-btn" title="تعديل" onclick="startEdit('${e.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="icon-btn danger" title="حذف" onclick="removeEmp('${e.id}')"><i class="fa-solid fa-trash"></i></button>
            </div></td>
        </tr>`).join('');
    wrap.innerHTML = `<table class="emp-table">
        <thead><tr><th>الموظف</th><th>الصلاحيات</th><th>الحالة</th><th></th></tr></thead>
        <tbody>${rows}</tbody></table>`;
}

async function saveEmployee() {
    const name = document.getElementById('empName').value.trim();
    const email = document.getElementById('empEmail').value.trim();
    if (!name || !email) { toast('اكتب الاسم والبريد الإلكتروني'); return; }
    const perms = collectPerms();
    try {
        await saveEmployeeRecord({ id: editId, name, email, perms });
        toast(editId ? 'تم تحديث بيانات ' + name : 'تمت إضافة ' + name);
        resetForm();
        await loadEmployees(); // re-read from the DB: the real path does not mutate the in-memory list
        renderList();
    } catch (err) {
        console.error(err);
        toast('حصل خطأ أثناء الحفظ: ' + (err.message || err));
    }
}

function startEdit(id) {
    const e = employees.find(x => x.id === id);
    if (!e) return;
    editId = id;
    document.getElementById('empName').value = e.name;
    document.getElementById('empEmail').value = e.email;
    document.getElementById('formTitle').textContent = 'تعديل: ' + e.name;
    renderPermMatrix(e.permissions);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
    editId = null;
    document.getElementById('empName').value = '';
    document.getElementById('empEmail').value = '';
    document.getElementById('formTitle').textContent = 'إضافة موظف جديد';
    renderPermMatrix(null);
}

async function toggleActive(id) {
    const e = employees.find(x => x.id === id);
    if (!e) return;
    try {
        await setEmployeeActive(e, !e.active);
        renderList();
        toast(e.active ? 'تم تفعيل حساب ' + e.name : 'تم تعطيل حساب ' + e.name);
    } catch (err) { toast('حصل خطأ: ' + (err.message || err)); }
}

let pendingDeleteId = null;
async function removeEmp(id) {
    const e = employees.find(x => x.id === id);
    if (!e) return;
    if (pendingDeleteId !== id) {
        pendingDeleteId = id;
        toast('اضغط حذف مرة تانية للتأكيد - الأفضل التعطيل بدل الحذف');
        setTimeout(() => { if (pendingDeleteId === id) pendingDeleteId = null; }, 4000);
        return;
    }
    pendingDeleteId = null;
    try {
        await deleteEmployeeRecord(id);
        renderList();
        toast('تم حذف ' + e.name);
    } catch (err) { toast('حصل خطأ: ' + (err.message || err)); }
}

function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2600);
}

document.addEventListener('DOMContentLoaded', async () => {
    renderPermMatrix(null);
    try {
        await loadEmployees();
    } catch (err) {
        // fail closed: show the error, never fake data
        console.error(err);
        toast('تعذر تحميل الموظفين: ' + (err.message || err));
    }
    renderList();
});

/* =========================================================
   LOGIN ACCOUNT PROVISIONING (owner only)
   The actual work happens in server/provision-server.mjs which
   holds the service_role key SERVER-SIDE. This page only sends
   the owner's session token + employee_id and receives the
   generated password ONCE (shown in a one-time modal).
   ========================================================= */
async function callProvisioner(path, id) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) { toast('سجّل الدخول أولًا'); return null; }
    try {
        const r = await fetch(`${window.DENTIX_SUPABASE_URL}${path}`, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + session.access_token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ employee_id: id })
        });
        const body = await r.json().catch(() => ({}));
        if (!r.ok) { toast(body.error || 'تعذر تنفيذ العملية'); return null; }
        return body;
    } catch (e) { toast('خدمة إنشاء الحسابات غير متاحة'); return null; }
}

async function provisionAccount(id) {
    const res = await callProvisioner('/provision', id);
    if (!res) return;
    showPasswordOnce(res.email, res.password, false);
    await loadEmployees(); renderList();
}

async function resetAccountPassword(id) {
    const res = await callProvisioner('/reset-password', id);
    if (!res) return;
    showPasswordOnce(res.email, res.password, true);
}

function showPasswordOnce(email, password, isReset) {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(2,6,23,.86);display:flex;align-items:center;justify-content:center;direction:rtl;font-family:sans-serif;';
    d.innerHTML = '<div style="background:#0f172a;border:1px solid #334155;border-radius:16px;padding:24px;max-width:420px;color:#e2e8f0;text-align:center;">'
        + '<div style="font-size:1.15rem;font-weight:700;margin-bottom:8px;">' + (isReset ? 'تم تعيين كلمة مرور جديدة' : 'تم إنشاء حساب الدخول') + '</div>'
        + '<div style="opacity:.8;margin-bottom:12px;direction:ltr;">' + email + '</div>'
        + '<div style="background:#020617;border:1px dashed #475569;border-radius:10px;padding:14px;font-size:1.2rem;letter-spacing:1px;direction:ltr;user-select:all;">' + password + '</div>'
        + '<div style="color:#fbbf24;font-size:.88rem;margin:12px 0;">انسخ كلمة المرور الآن وسلّمها للموظف - لن تظهر مرة أخرى.</div>'
        + '<button class="btn" id="provCopy" style="margin-inline-end:8px;">نسخ</button>'
        + '<button class="btn-ghost" id="provClose">تم</button></div>';
    document.body.appendChild(d);
    d.querySelector('#provCopy').onclick = () => {
        if (navigator.clipboard) navigator.clipboard.writeText(password);
        d.querySelector('#provCopy').textContent = 'تم النسخ';
    };
    d.querySelector('#provClose').onclick = () => {
        // امسح النص من الـ DOM قبل الإزالة حتى لا يبقى قابلًا للقراءة
        const pw = d.querySelector('[style*="dashed"]'); if (pw) pw.textContent = '';
        d.remove();
    };
}

/* =========================================================
   OWNER ACCOUNT (owner only)
   Edit the owner's OWN login email/password. The server
   re-authenticates the CURRENT password against GoTrue before
   applying anything; secrets travel only over the app origin
   and are never shown back. Empty field = no change.
   ========================================================= */
async function saveOwnerAccount() {
    const newEmail = (document.getElementById('accNewEmail').value || '').trim();
    const p1 = document.getElementById('accNewPassword').value || '';
    const p2 = document.getElementById('accNewPassword2').value || '';
    const current = document.getElementById('accCurrentPassword').value || '';
    if (!newEmail && !p1) { toast('لا يوجد تغيير - املأ البريد الجديد أو كلمة المرور الجديدة'); return; }
    if (p1 && p1.length < 8) { toast('كلمة المرور الجديدة قصيرة - ٨ أحرف على الأقل'); return; }
    if (p1 !== p2) { toast('تأكيد كلمة المرور الجديدة غير مطابق'); return; }
    if (!current) { toast('أدخل كلمة المرور الحالية للتأكد من هويتك'); return; }
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) { toast('سجّل الدخول أولًا'); return; }
    try {
        const r = await fetch(`${window.DENTIX_SUPABASE_URL}/account`, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + session.access_token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ current_password: current, new_email: newEmail || undefined, new_password: p1 || undefined })
        });
        const body = await r.json().catch(() => ({}));
        if (!r.ok) { toast(body.error || 'تعذر تحديث الحساب'); return; }
        ['accNewEmail', 'accNewPassword', 'accNewPassword2', 'accCurrentPassword'].forEach(id => { document.getElementById(id).value = ''; });
        let msg = 'تم تحديث الحساب';
        if (body.email_changed) msg += ' - استخدم البريد الجديد عند تسجيل الدخول القادم';
        toast(msg);
    } catch (e) { toast('خدمة الحساب غير متاحة'); }
}
