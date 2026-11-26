if (window.__dentixLoaded && window.__dentixLoaded.includes('supabase')) { throw new Error('Skip double load'); }
window.__dentixLoaded = window.__dentixLoaded || [];
window.__dentixLoaded.push('supabase');

/* الاتصال يُقرأ من js/config.local.js عبر js/config.js - لا توجد بيانات
   اتصال مضمّنة هنا، وأي فشل في الإعداد يوقف التطبيق بوضوح. */

window.supabaseClient =
    supabase.createClient(
        window.DENTIX_SUPABASE_URL,
        window.DENTIX_SUPABASE_ANON_KEY
);

/* Employee sessions: the page scripts filter rows by user_id = auth user id.
   An employee's own uid is NOT the clinic's tenant id, so those filters
   returned nothing. getUser() now reports the CLINIC id (public.clinic_owner_id())
   as user.id for employees. Access is still enforced by RLS/has_perm in the
   database; this only fixes the id the pages filter on. getSession() (tokens)
   is untouched. */
(function () {
    const c = window.supabaseClient;
    const orig = c.auth.getUser.bind(c.auth);
    let cache = { uid: null, tenant: null };
    c.auth.getUser = async function (...a) {
        const res = await orig(...a);
        try {
            const u = res && res.data && res.data.user;
            if (!u) return res;
            if (cache.uid !== u.id) {
                const r = await c.rpc('clinic_owner_id');
                cache = { uid: u.id, tenant: (r && r.data) || null };
            }
            if (cache.tenant && cache.tenant !== u.id) {
                return { data: { user: Object.assign({}, u, { id: cache.tenant, real_id: u.id }) }, error: null };
            }
        } catch (e) { /* fall back to the real user */ }
        return res;
    };
})();
