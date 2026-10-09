/* =========================================================
   DENTIX PRO — CLINIC SETTINGS ENHANCED
   Modern Settings Manager + Live Preview Modal

   NOTE: supabaseClient is loaded from js/supabase.js
========================================================= */

/* =========================================================
   NOTIFICATION FALLBACK
   If notification.js is not loaded or showNotification
   is not in global scope, create a basic fallback.
========================================================= */

if (typeof showNotification !== "function") {
    window.showNotification = function(message, type) {
        console.log(`[${type || 'info'}] ${message}`);
        alert(message);
    };
}

let currentUserId = null;
let currentData = null;
let galleryImages = [];

const DAYS = [
    { key: "sat", label: "السبت" },
    { key: "sun", label: "الأحد" },
    { key: "mon", label: "الاثنين" },
    { key: "tue", label: "الثلاثاء" },
    { key: "wed", label: "الأربعاء" },
    { key: "thu", label: "الخميس" },
    { key: "fri", label: "الجمعة" }
];


/* =========================================================
   INIT — Wait for DOM & Supabase
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
    /* Safety check: supabaseClient must exist from js/supabase.js */
    if (typeof supabaseClient === "undefined" || !supabaseClient) {
        console.error("supabaseClient not found! Make sure js/supabase.js is loaded before this file.");
        alert("خطأ في تحميل النظام: supabaseClient غير معرف");
        return;
    }

    try {
        const { data: userData, error: authError } = await supabaseClient.auth.getUser();

        if (authError || !userData?.user) {
            window.location.href = "login.html";
            return;
        }

        currentUserId = userData.user.id;
        generateClinicLink();
        buildSchedule();
        await loadClinicSettings();

    } catch (err) {
        console.error("INIT ERROR:", err);
        alert("خطأ في تهيئة الصفحة: " + err.message);
    }
});


/* =========================================================
   BUILD SCHEDULE UI
========================================================= */

function buildSchedule() {
    const container = document.getElementById("workingScheduleContainer");
    if (!container) {
        console.warn("workingScheduleContainer not found");
        return;
    }

    container.innerHTML = DAYS.map(day => `
        <div class="day-card" id="day-card-${day.key}">
            <div class="day-header">
                <label>
                    <input type="checkbox" class="day-enabled" data-day="${day.key}" onchange="toggleDay('${day.key}')">
                    ${day.label}
                </label>
            </div>
            <div class="day-times">
                <div class="time-row">
                    <input type="time" id="${day.key}_start_1">
                    <span>إلى</span>
                    <input type="time" id="${day.key}_end_1">
                </div>
                <button type="button" class="add-shift-btn" id="btn-${day.key}" onclick="toggleSecondShift('${day.key}')">
                    <i class="fa-solid fa-plus"></i>
                    إضافة فترة ثانية
                </button>
                <div class="second-shift-box" id="shift2-${day.key}" style="display:none;">
                    <label>الفترة الثانية (اختياري)</label>
                    <div class="time-row">
                        <input type="time" id="${day.key}_start_2">
                        <span>إلى</span>
                        <input type="time" id="${day.key}_end_2">
                    </div>
                </div>
            </div>
        </div>
    `).join("");
}

function toggleDay(day) {
    const checkbox = document.querySelector(`.day-enabled[data-day="${day}"]`);
    const card = document.getElementById(`day-card-${day}`);
    if (checkbox && card) {
        card.classList.toggle("disabled", !checkbox.checked);
    }
    updateStats();
}

function toggleSecondShift(day) {
    const box = document.getElementById(`shift2-${day}`);
    const btn = document.getElementById(`btn-${day}`);
    if (!box || !btn) return;

    if (box.style.display === "none" || box.style.display === "") {
        box.style.display = "block";
        btn.innerHTML = `<i class="fa-solid fa-minus"></i> إخفاء الفترة الثانية`;
    } else {
        box.style.display = "none";
        btn.innerHTML = `<i class="fa-solid fa-plus"></i> إضافة فترة ثانية`;
        const s2 = document.getElementById(`${day}_start_2`);
        const e2 = document.getElementById(`${day}_end_2`);
        if (s2) s2.value = "";
        if (e2) e2.value = "";
    }
}


/* =========================================================
   CLOUDINARY UPLOAD
========================================================= */

async function uploadFile(file) {
    const cloudName = "dflfcteo2";
    const uploadPreset = "prints-files";
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    const res = await fetch(url, { method: "POST", body: formData });
    const data = await res.json();

    if (!data?.secure_url) {
        throw new Error(data.error?.message || "Upload failed");
    }

    return data.secure_url;
}


/* =========================================================
   LOAD SETTINGS
========================================================= */

async function loadClinicSettings() {
    if (!currentUserId) {
        console.warn("No currentUserId available");
        return;
    }

    const { data, error } = await supabaseClient
        .from("clinic_pages")
        .select("*")
        .eq("user_id", currentUserId)
        .maybeSingle();

    if (error) {
        console.error("LOAD ERROR:", error);
        showNotification && showNotification("فشل تحميل البيانات", "error");
        return;
    }

    if (!data) {
        await createClinicPage();
        return;
    }

    currentData = data;
    fillForm(data);
    updateStats();
}

async function createClinicPage() {
    const { error } = await supabaseClient
        .from("clinic_pages")
        .insert({ user_id: currentUserId, clinic_name: "عيادة الابتسامة" });

    if (error) {
        console.error("CREATE ERROR:", error);
        return;
    }

    loadClinicSettings();
}


/* =========================================================
   FILL FORM
========================================================= */

function fillForm(data) {
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || "";
    };

    setVal("clinic_name", data.clinic_name);
    setVal("clinic_description", data.clinic_description);
    setVal("phone", data.phone);
    setVal("whatsapp", data.whatsapp);
    setVal("address", data.address);
    setVal("facebook_url", data.facebook_url);
    setVal("instagram_url", data.instagram_url);
    setVal("website_url", data.website_url);
    setVal("latitude", data.latitude);
    setVal("longitude", data.longitude);

    /* Logo */
    if (data.clinic_logo) {
        const preview = document.getElementById("logoPreview");
        const wrapper = document.getElementById("logoPreviewWrapper");
        if (preview) {
            preview.src = data.clinic_logo;
            preview.style.display = "block";
        }
        if (wrapper) wrapper.style.display = "none";
    }

    /* Gallery */
    galleryImages = Array.isArray(data.gallery_images) ? [...data.gallery_images] : [];
    renderGalleryPreview();

    /* Schedule */
    try {
        const schedule = data.working_schedule || {};
        Object.keys(schedule).forEach(day => {
            const dayData = schedule[day];
            const checkbox = document.querySelector(`.day-enabled[data-day="${day}"]`);
            if (checkbox) {
                checkbox.checked = dayData.enabled || false;
                toggleDay(day);
            }

            if (dayData.shifts?.[0]) {
                setVal(`${day}_start_1`, dayData.shifts[0].from);
                setVal(`${day}_end_1`, dayData.shifts[0].to);
            }

            if (dayData.shifts?.[1]) {
                setVal(`${day}_start_2`, dayData.shifts[1].from);
                setVal(`${day}_end_2`, dayData.shifts[1].to);
                const box = document.getElementById(`shift2-${day}`);
                const btn = document.getElementById(`btn-${day}`);
                if (box) box.style.display = "block";
                if (btn) btn.innerHTML = `<i class="fa-solid fa-minus"></i> إخفاء الفترة الثانية`;
            }
        });
    } catch (err) {
        console.error("Schedule parse error:", err);
    }

    /* Location hint */
    if (data.latitude && data.longitude) {
        const hint = document.getElementById("locationHint");
        if (hint) hint.style.display = "flex";
    }
}


/* =========================================================
   SAVE SETTINGS
========================================================= */

async function saveClinicSettings() {
    const saveBtn = document.querySelector(".save-btn");
    if (!saveBtn) return;

    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> جاري الحفظ...`;

    try {
        /* Upload logo if new */
        let clinicLogoUrl = currentData?.clinic_logo || null;
        const logoFile = document.getElementById("clinic_logo")?.files[0];
        if (logoFile) {
            clinicLogoUrl = await uploadFile(logoFile);
        }

        /* Upload new gallery images */
        const galleryFiles = document.getElementById("clinic_gallery")?.files;
        if (galleryFiles?.length) {
            for (const file of galleryFiles) {
                const url = await uploadFile(file);
                galleryImages.push(url);
            }
        }

        /* Build schedule */
        const schedule = {};
        document.querySelectorAll(".day-enabled").forEach(cb => {
            const day = cb.dataset.day;
            const shifts = [];

            const s1 = document.getElementById(`${day}_start_1`)?.value;
            const e1 = document.getElementById(`${day}_end_1`)?.value;
            if (s1 && e1) shifts.push({ from: s1, to: e1 });

            const s2 = document.getElementById(`${day}_start_2`)?.value;
            const e2 = document.getElementById(`${day}_end_2`)?.value;
            if (s2 && e2) shifts.push({ from: s2, to: e2 });

            if (cb.checked) {
                schedule[day] = { enabled: true, shifts };
            }
        });

        const payload = {
            clinic_name: document.getElementById("clinic_name")?.value || "",
            clinic_description: document.getElementById("clinic_description")?.value || "",
            clinic_logo: clinicLogoUrl,
            phone: document.getElementById("phone")?.value || "",
            whatsapp: document.getElementById("whatsapp")?.value || "",
            address: document.getElementById("address")?.value || "",
            working_schedule: schedule,
            facebook_url: document.getElementById("facebook_url")?.value || "",
            instagram_url: document.getElementById("instagram_url")?.value || "",
            website_url: document.getElementById("website_url")?.value || "",
            latitude: document.getElementById("latitude")?.value || null,
            longitude: document.getElementById("longitude")?.value || null,
            gallery_images: galleryImages
        };

        const { error } = await supabaseClient
            .from("clinic_pages")
            .update(payload)
            .eq("user_id", currentUserId);

        if (error) {
            console.error("SAVE ERROR:", error);
            showNotification && showNotification("فشل الحفظ: " + error.message, "error");
            return;
        }

        currentData = { ...currentData, ...payload };
        updateStats();
        showNotification && showToast("تم حفظ البيانات بنجاح", "success");

    } catch (err) {
        console.error("SAVE EXCEPTION:", err);
        showNotification && showNotification("حدث خطأ أثناء الحفظ", "error");
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    }
}


/* =========================================================
   PREVIEW LOGO
========================================================= */

function previewLogo(input) {
    const file = input.files[0];
    if (!file) return;

    const preview = document.getElementById("logoPreview");
    const wrapper = document.getElementById("logoPreviewWrapper");

    if (preview) {
        preview.src = URL.createObjectURL(file);
        preview.style.display = "block";
    }
    if (wrapper) wrapper.style.display = "none";
}


/* =========================================================
   PREVIEW GALLERY
========================================================= */

function previewGallery(input) {
    const files = Array.from(input.files);
    const previewContainer = document.getElementById("galleryPreview");
    if (!previewContainer) return;

    files.forEach(file => {
        const url = URL.createObjectURL(file);
        const wrapper = document.createElement("div");
        wrapper.className = "gallery-img-wrapper temp-img";

        const img = document.createElement("img");
        img.src = url;
        img.onload = () => URL.revokeObjectURL(url);

        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "gallery-del-btn";
        delBtn.title = "إزالة";
        delBtn.innerHTML = `<i class="fa-solid fa-xmark"></i>`;
        delBtn.onclick = () => wrapper.remove();

        wrapper.appendChild(img);
        wrapper.appendChild(delBtn);
        previewContainer.appendChild(wrapper);
    });

    updateStats();
}

function renderGalleryPreview() {
    const container = document.getElementById("galleryPreview");
    if (!container) return;
    container.innerHTML = "";

    galleryImages.forEach((url, index) => {
        const wrapper = document.createElement("div");
        wrapper.className = "gallery-img-wrapper";

        const img = document.createElement("img");
        img.src = url;
        img.onerror = () => wrapper.remove();

        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "gallery-del-btn";
        delBtn.title = "حذف الصورة";
        delBtn.innerHTML = `<i class="fa-solid fa-xmark"></i>`;
        delBtn.onclick = () => deleteGalleryImage(index);

        wrapper.appendChild(img);
        wrapper.appendChild(delBtn);
        container.appendChild(wrapper);
    });
}

function deleteGalleryImage(index) {
    if (!confirm("هل أنت متأكد من حذف هذه الصورة؟")) return;
    galleryImages.splice(index, 1);
    renderGalleryPreview();
    updateStats();
    showNotification && showToast("تم حذف الصورة", "success");
}


/* =========================================================
   LOCATION
========================================================= */

function getClinicLocation() {
    if (!navigator.geolocation) {
        showNotification && showNotification("المتصفح لا يدعم تحديد الموقع", "error");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const latEl = document.getElementById("latitude");
            const lngEl = document.getElementById("longitude");
            if (latEl) latEl.value = position.coords.latitude;
            if (lngEl) lngEl.value = position.coords.longitude;

            const hint = document.getElementById("locationHint");
            if (hint) {
                hint.style.display = "flex";
                hint.innerHTML = `<i class="fa-solid fa-circle-check"></i><span>تم تحديد الموقع بنجاح</span>`;
            }

            showNotification && showNotification("تم حفظ موقع العيادة", "success");
        },
        (error) => {
            console.error("LOCATION ERROR:", error);
            showNotification && showNotification("تعذر الحصول على الموقع", "error");
        }
    );
}


/* =========================================================
   LINK & COPY
========================================================= */

function generateClinicLink() {
    if (!currentUserId) return;
    const basePath = window.location.pathname.replace(/[^/]+$/, "");
    const link = window.location.origin + basePath + "landing.html?id=" + currentUserId;
    const input = document.getElementById("clinicPageLink");
    if (input) input.value = link;
}

function copyClinicLink() {
    const input = document.getElementById("clinicPageLink");
    if (!input) return;
    input.select();
    navigator.clipboard.writeText(input.value).then(() => {
        showNotification && showToast("تم نسخ الرابط", "success");
    }).catch(() => {
        /* Fallback */
        document.execCommand("copy");
        showNotification && showToast("تم نسخ الرابط", "success");
    });
}


/* =========================================================
   PREVIEW MODAL
========================================================= */

function openPreviewModal() {
    if (!currentUserId) {
        showNotification && showNotification("لم يتم تحميل البيانات بعد", "error");
        return;
    }

    const modal = document.getElementById("previewModal");
    const frame = document.getElementById("previewFrame");
    if (!modal || !frame) return;

    frame.innerHTML = `<iframe src="landing.html?id=${currentUserId}" title="Preview" loading="lazy"></iframe>`;
    modal.classList.add("active");
}

function closePreviewModal() {
    const modal = document.getElementById("previewModal");
    const frame = document.getElementById("previewFrame");
    if (modal) modal.classList.remove("active");
    if (frame) setTimeout(() => frame.innerHTML = "", 300);
}

function openLandingPage() {
    if (!currentUserId) return;
    window.open(`landing.html?id=${currentUserId}`, "_blank");
}


/* =========================================================
   STATS
========================================================= */

function updateStats() {
    const activeDays = document.querySelectorAll(".day-enabled:checked").length;
    const daysEl = document.getElementById("daysActive");
    if (daysEl) daysEl.textContent = activeDays;

    const galleryCount = galleryImages.length + (document.getElementById("clinic_gallery")?.files?.length || 0);
    const galleryEl = document.getElementById("galleryCount");
    if (galleryEl) galleryEl.textContent = galleryCount;

    const linkStatus = document.getElementById("linkStatus");
    if (linkStatus) {
        const hasData = currentData && currentData.clinic_name;
        linkStatus.textContent = hasData ? "منشور" : "غير منشور";
        linkStatus.style.color = hasData ? "#4ade80" : "#f87171";
    }
}



/* =========================================================
   MODAL OUTSIDE CLICK & ESC
========================================================= */

document.addEventListener("click", (e) => {
    const previewModal = document.getElementById("previewModal");
    if (previewModal && e.target === previewModal) {
        closePreviewModal();
    }
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        closePreviewModal();
        closeMoreMenu();
    }
});