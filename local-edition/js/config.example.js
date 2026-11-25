/* انسخ هذا الملف إلى js/config.local.js على جهاز العيادة وعدّل القيم.
   config.local.js محفوظ محليًا فقط وممنوع يرفع على git. */

window.DENTIX_CONFIG = {
    // عنوان خادم Supabase المحلي على جهاز العيادة (من مخرجات التثبيت)
    SUPABASE_URL: 'http://localhost:8000',

    // مفتاح anon الصادر من خادم Supabase المحلي (ليس مفتاح المشروع السحابي)
    SUPABASE_ANON_KEY: 'PASTE_LOCAL_ANON_KEY_HERE',
};
