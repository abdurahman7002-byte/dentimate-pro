if (window.__dentixLoaded && window.__dentixLoaded.includes('supabase')) { throw new Error('Skip double load'); }
window.__dentixLoaded = window.__dentixLoaded || [];
window.__dentixLoaded.push('supabase');


const SUPABASE_URL = "https://effgebbqhkzaifwgdpoi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZmdlYmJxaGt6YWlmd2dkcG9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MDk4NzYsImV4cCI6MjA5NDk4NTg3Nn0.YhG_Bzhj2wbMHjtvBymOo6DYb2O2ksfk7svvf-Av9-I";

window.supabaseClient =
    supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
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
