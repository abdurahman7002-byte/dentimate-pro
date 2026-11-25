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
