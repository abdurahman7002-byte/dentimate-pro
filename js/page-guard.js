/* =========================================================
   PAGE GUARD (fail closed) - Dentix local edition
   Included on protected pages via:
     <script> window.PAGE_KEY = 'patients'; </script>
     <script src="js/page-guard.js"></script>

   Behavior:
   - window.DEMO_MODE === true  -> skip entirely (isolated demo
     files only; never set in the real app)
   - not signed in              -> redirect to the login page
   - signed in, page permitted  -> stay
   - signed in, page denied     -> redirect to the user's first
     permitted page (first_allowed_page RPC); if none, show an
     explicit "no access" panel. Never bounce a signed-in user
     to the login page: that looks signed out and is not true.

   This is UI routing only. Enforcement lives in the database
   policies (sql/rls-clinical.sql); the guard keeps employees
   out of screens they cannot use.
   ========================================================= */

(async () => {
    if (window.DEMO_MODE === true) return;

    const pageKey = window.PAGE_KEY;
    if (!pageKey) return;

    const noAccessPanel = () => {
        document.body.innerHTML =
            '<div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;' +
            'background:#020617;color:#e2e8f0;font-family:sans-serif;direction:rtl;text-align:center;padding:2rem;">' +
            '<div><div style="font-size:2.2rem;margin-bottom:.75rem;">🔒</div>' +
            '<div style="font-size:1.15rem;font-weight:700;margin-bottom:.5rem;">لا توجد صلاحية للوصول</div>' +
            '<div style="opacity:.75;">حسابك لا يملك صلاحية عرض أي صفحة حاليًا. تواصل مع مدير العيادة.</div></div></div>';
    };

    try {
        if (typeof supabaseClient === 'undefined') {
            window.location.replace('index.html');
            return;
        }

        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) { window.location.replace('index.html'); return; }

        const { data, error } = await supabaseClient
            .rpc('can_access_page', { p_page_key: pageKey });

        if (!error && data === true) return; // permitted: stay

        // denied: send the user to a page they CAN use
        const { data: target } = await supabaseClient.rpc('first_allowed_page');
        const here = window.location.pathname.split('/').pop();
        if (target && target !== here) {
            window.location.replace(target);
            return;
        }
        noAccessPanel();
    } catch (err) {
        // fail closed, but keep the signed-in user visibly signed in
        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session) { noAccessPanel(); return; }
        } catch (_) { /* fall through */ }
        window.location.replace('index.html');
    }
})();
