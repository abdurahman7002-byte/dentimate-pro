/* =========================================================
   DENTIX LOCAL STORAGE
   حاويتان محليتان (sql/storage.sql):
     patient-files : خاصة - ملفات وصور المرضى. تُخزَّن المسارات
                     في قاعدة البيانات وتُعرض عبر تحميل مُصادَق عليه
                     لحظة العرض لمن لديه صلاحية (روابط blob داخلية).
     clinic-assets : عامة للقراءة - شعار العيادة وصور قوالب
                     الطباعة الفارغة فقط. أي مخرجات مطبوعة مملوءة
                     ببيانات مريض ممنوع رفعها هنا - تُعامل كملف
                     مريض (patient-files).
   لا Cloudinary: لا تغادر أي بيانات الشبكة المحلية.
========================================================= */

window.DENTIX_PATIENT_BUCKET = "patient-files";
window.DENTIX_ASSET_BUCKET = "clinic-assets";
window.__dentixUrlMap = {};

async function dentixClinicRoot(){
    if (window.__dentixClinicRoot) return window.__dentixClinicRoot;
    const { data, error } = await supabaseClient.rpc("my_storage_prefix");
    if (error || !data) throw new Error("تعذر تحديد مجلد العيادة - تأكد من تسجيل الدخول");
    window.__dentixClinicRoot = data;
    return data;
}

// kind: "patient" (خاص، يعيد المسار) | "asset" (عام، يعيد رابطًا)
window.dentixUpload = async function(file, prefix, kind){

    if(!file) throw new Error("No file provided");
    if(!window.supabaseClient) throw new Error("Supabase client not ready");

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if(userError || !user) throw new Error("يجب تسجيل الدخول قبل رفع الملفات");

    const safeName = (file.name || "file").replace(/[^\w.\-]+/g, "_");
    const root = await dentixClinicRoot();
    const path = root + "/" + (prefix || "misc") + "/" + Date.now() + "-" + safeName;
    const bucket = (kind === "asset") ? window.DENTIX_ASSET_BUCKET : window.DENTIX_PATIENT_BUCKET;

    const { error: upError } = await supabaseClient.storage
        .from(bucket)
        .upload(path, file, { cacheControl: "3600", upsert: false });

    if(upError) throw new Error(upError.message);

    if (kind === "asset") {
        const { data } = supabaseClient.storage.from(bucket).getPublicUrl(path);
        if(!data || !data.publicUrl) throw new Error("تعذر إنشاء رابط الملف");
        return data.publicUrl;
    }
    return path; // خاص: يُخزَّن المسار ويُحمَّل مُصادَقًا عند العرض
};

// يحوّل مسارًا مخزنًا إلى رابط blob داخلي عبر تحميل مُصادَق عليه:
// كل جلب يمر بصلاحيات التخزين (RLS) مع جلسة المستخدم نفسها، فإلغاء
// وصول موظف يوقف فتح الملفات فورًا - لا توجد روابط موقّعة قابلة
// للتداول ولا نافذة بقاء بعد الإلغاء. رابط blob يعيش في ذاكرة
// الصفحة فقط ولا يعمل خارجها. الروابط القديمة (http...) تمر كما هي
// لدعم السجلات السابقة.
window.dentixResolve = async function(pathOrUrl){
    if (!pathOrUrl) return pathOrUrl;
    if (/^(https?:|blob:)/i.test(pathOrUrl)) return pathOrUrl;
    if (window.__dentixUrlMap[pathOrUrl]) return window.__dentixUrlMap[pathOrUrl];
    const { data, error } = await supabaseClient.storage
        .from(window.DENTIX_PATIENT_BUCKET)
        .download(pathOrUrl);
    if (error || !data) throw new Error("تعذر فتح الملف: " + (error && error.message));
    const url = URL.createObjectURL(data);
    window.__dentixUrlMap[pathOrUrl] = url;
    return url;
};

// جلب دفعي مُصادَق عليه لقائمة سجلات بعد الجلب (قبل العرض)
window.dentixResolveRows = async function(rows, field){
    if (!rows || !rows.length) return rows;
    const paths = rows.map(r => r[field]).filter(p => p && !/^(https?:|blob:)/i.test(p) && !window.__dentixUrlMap[p]);
    if (!paths.length) return rows;
    await Promise.all(paths.map(async (p) => {
        try {
            const { data, error } = await supabaseClient.storage
                .from(window.DENTIX_PATIENT_BUCKET)
                .download(p);
            if (!error && data) window.__dentixUrlMap[p] = URL.createObjectURL(data);
        } catch (_) { /* يبقى المسار بدون رابط؛ يظهر العنصر فارغًا بدل كسر الصفحة */ }
    }));
    return rows;
};

// للاستخدام المتزامن داخل قوالب HTML بعد dentixResolveRows
window.dentixUrlOf = function(pathOrUrl){
    if (!pathOrUrl || /^(https?:|blob:)/i.test(pathOrUrl)) return pathOrUrl;
    return window.__dentixUrlMap[pathOrUrl] || "";
};
