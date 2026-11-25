/* =========================================================
   CONFIG LOADER (fail closed) - Dentix local edition
   The app gets its Supabase connection ONLY from
   js/config.local.js, which is created on the clinic PC at
   install time (see js/config.example.js) and is gitignored.

   There is intentionally NO bundled/fallback URL or key:
   - no config            -> the app stops with a clear error
   - the old cloud project -> blocked explicitly below
   This makes it impossible for the local edition to talk to
   the live hosted database by accident.
   ========================================================= */

(function () {
    const BLOCKED_PROJECT_REF = 'effgebbqhkzaifwgdpoi'; // the live cloud project

    const cfg = (typeof window !== 'undefined' && window.DENTIX_CONFIG) || {};
    const url = cfg.SUPABASE_URL || '';
    const key = cfg.SUPABASE_ANON_KEY || '';

    function fail(reason) {
        const msg = 'إعداد الاتصال بقاعدة البيانات المحلية غير مكتمل: ' + reason +
            '. راجع js/config.example.js وأنشئ js/config.local.js على جهاز العيادة.';
        // visible, not silent
        if (typeof document !== 'undefined') {
            document.addEventListener('DOMContentLoaded', () => {
                const d = document.createElement('div');
                d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0b1220;color:#fca5a5;' +
                    'display:flex;align-items:center;justify-content:center;padding:2rem;' +
                    'font-family:sans-serif;font-size:1.1rem;text-align:center;direction:rtl;';
                d.textContent = msg;
                document.body.appendChild(d);
            });
        }
        throw new Error('[dentix config] ' + msg);
    }

    if (!url || !key) fail('SUPABASE_URL / SUPABASE_ANON_KEY غير موجودين.');
    if (url.includes(BLOCKED_PROJECT_REF)) fail('عنوان المشروع السحابي القديم محظور في النسخة المحلية.');
    if (!/^https?:\/\//.test(url)) fail('صيغة SUPABASE_URL غير صحيحة.');

    window.DENTIX_SUPABASE_URL = url;
    window.DENTIX_SUPABASE_ANON_KEY = key;
})();
