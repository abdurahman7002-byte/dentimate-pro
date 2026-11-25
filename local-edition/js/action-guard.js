/* =========================================================
   ACTION GUARD - Dentix local edition
   Hides add/edit/delete UI when the signed-in user lacks the
   action permission for this page. UI honesty only: the real
   enforcement is RLS (has_perm in sql/employees.sql).
   Usage BEFORE this script:
     window.PAGE_KEY = 'drugs';
     window.ACTION_TARGETS = { add: ['#addCard'], edit: ['.x'], delete: ['.y'] };
   ========================================================= */
(async () => {
    if (window.DEMO_MODE === true) return;
    const key = window.PAGE_KEY;
    const targets = window.ACTION_TARGETS;
    if (!key || !targets) return;
    try {
        if (typeof supabaseClient === 'undefined') return;
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) return; // page-guard handles sign-in
        const perms = {};
        await Promise.all(['add', 'edit', 'delete'].map(async (a) => {
            const { data } = await supabaseClient.rpc('has_perm', { p_page_key: key, p_action: a });
            perms[a] = data === true;
        }));
        const apply = () => {
            for (const [action, sels] of Object.entries(targets)) {
                if (perms[action]) continue;
                (sels || []).forEach(sel => document.querySelectorAll(sel).forEach(el => { el.style.display = 'none'; }));
            }
        };
        apply();
        new MutationObserver(apply).observe(document.body, { childList: true, subtree: true });
    } catch (_) { /* RLS remains the enforcement */ }
})();
