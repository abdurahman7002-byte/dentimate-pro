/* =========================================================
   DENTIX PRO — ENHANCED PRINTS SYSTEM
   Professional Print Templates + Live Preview
========================================================= */

let prints = [];
let currentPreviewItem = null;


/* =========================================================
   TYPE CONFIGURATION
========================================================= */

const TYPE_CONFIG = {
    prescription: {
        label: 'وصفة طبية',
        icon: 'fa-prescription-bottle-medical',
        color: '#22c55e',
        bgColor: '#dcfce7',
        textColor: '#166534'
    },
    instruction: {
        label: 'تعليمات',
        icon: 'fa-clipboard-list',
        color: '#3b82f6',
        bgColor: '#dbeafe',
        textColor: '#1e40af'
    },
    invoice: {
        label: 'فاتورة',
        icon: 'fa-file-invoice-dollar',
        color: '#f59e0b',
        bgColor: '#fef3c7',
        textColor: '#92400e'
    },
    consent: {
        label: 'موافقة طبية',
        icon: 'fa-file-signature',
        color: '#ef4444',
        bgColor: '#fee2e2',
        textColor: '#991b1b'
    }
};


/* =========================================================
   USER AUTH
========================================================= */

async function getUser() {
    const { data } = await supabaseClient.auth.getUser();
    const user = data?.user;

    if (!user) {
        window.location.href = "login.html";
        return null;
    }

    return user;
}


/* =========================================================
   LOAD PRINTS
========================================================= */

async function loadPrints() {
    const user = await getUser();
    if (!user) return;

    const { data, error } = await supabaseClient
        .from("prints")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("LOAD PRINTS ERROR:", error);
        showNotification && showNotification("فشل تحميل المطبوعات", "error");
        return;
    }

    prints = data || [];
    render();
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

    try {
        const res = await fetch(url, { method: "POST", body: formData });
        const data = await res.json();

        if (!data?.secure_url) {
            console.error("Cloudinary error:", data);
            return null;
        }

        return data.secure_url;
    } catch (err) {
        console.error("UPLOAD ERROR:", err);
        return null;
    }
}


/* =========================================================
   ADD PRINT
========================================================= */

async function addPrint() {
    const user = await getUser();
    if (!user) {
        alert("يجب تسجيل الدخول");
        return;
    }

    /* Get values */
    const clinicName = document.getElementById("clinicName")?.value.trim() || "";
    const doctorName = document.getElementById("doctorName")?.value.trim() || "";
    const doctorTitle = document.getElementById("doctorTitle")?.value.trim() || "";
    const title = document.getElementById("title").value.trim();
    const type = document.getElementById("type").value;
    const content = document.getElementById("content").value;
    const imageFile = document.getElementById("image")?.files[0];
    const logoFile = document.getElementById("logo")?.files[0];

    /* Validation */
    if (!title) {
        showToast("يرجى إدخال عنوان المطبوعة");
        document.getElementById("title").focus();
        return;
    }

    if (!content) {
        showToast("يرجى إدخال محتوى المطبوعة");
        document.getElementById("content").focus();
        return;
    }

    /* Show loading state */
    const saveBtn = document.querySelector(".save-btn");
    const originalBtnText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> جاري الحفظ...`;

    try {
        /* Upload files */
        let imageUrl = null;
        let logoUrl = null;

        if (imageFile) {
            imageUrl = await uploadFile(imageFile);
        }

        if (logoFile) {
            logoUrl = await uploadFile(logoFile);
        }

        /* Save to Supabase */
        const { error } = await supabaseClient
            .from("prints")
            .insert([{
                user_id: user.id,
                clinic_name: clinicName || null,
                doctor_name: doctorName || null,
                doctor_title: doctorTitle || null,
                title: title,
                type: type,
                content: content,
                image_url: imageUrl,
                logo_url: logoUrl
            }]);

        if (error) {
            console.error("SAVE ERROR:", error);
            alert("خطأ في الحفظ: " + error.message);
            return;
        }

        /* Success */
        clearForm();
        closeFormModal();
        await loadPrints();

    showToast("تم حفظ المطبوعة بنجاح");

} catch (err) {
    console.error("ADD PRINT EXCEPTION:", err);
    console.error("Error message:", err?.message);
    console.error("Error stack:", err?.stack);

    alert("الخطأ الحقيقي:\n" + (err?.message || err));
}finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalBtnText;
    }
}


/* =========================================================
   DELETE PRINT
========================================================= */

async function deletePrint(id) {
    if (!await showConfirm("هل أنت متأكد من حذف هذه المطبوعة؟")) {
        return;
    }

    const { error } = await supabaseClient
        .from("prints")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("DELETE ERROR:", error);
        alert("خطأ في الحذف: " + error.message);
        return;
    }

    await loadPrints();
    showNotification && showNotification("تم حذف المطبوعة", "success");
}


/* =========================================================
   RENDER PRINTS GRID
========================================================= */

function render() {
    const grid = document.getElementById("printsGrid");
    const emptyState = document.getElementById("emptyState");

    if (!grid) return;

    if (!prints.length) {
        grid.innerHTML = "";
        emptyState.style.display = "block";
        return;
    }

    emptyState.style.display = "none";

    grid.innerHTML = prints.map((p, index) => {
        const config = TYPE_CONFIG[p.type] || TYPE_CONFIG.prescription;
        const date = p.created_at
            ? new Date(p.created_at).toLocaleDateString("ar-EG", {
                year: "numeric",
                month: "short",
                day: "numeric"
            })
            : "—";

        return `
            <div class="print-card" style="animation-delay: ${index * 0.07}s">
                <div class="card-accent ${p.type}"></div>
                <div class="card-body">
                    <div class="card-meta">
                        <span class="type-badge ${p.type}">
                            <i class="fa-solid ${config.icon}"></i>
                            ${config.label}
                        </span>
                        <span class="card-date">
                            <i class="fa-regular fa-calendar"></i>
                            ${date}
                        </span>
                    </div>
                    <div class="card-title">${escapeHTML(p.title)}</div>
                    ${p.clinic_name ? `<div class="card-clinic"><i class="fa-solid fa-hospital"></i> ${escapeHTML(p.clinic_name)}</div>` : ""}
                    ${p.doctor_name ? `<div class="card-doctor"><i class="fa-solid fa-user-doctor"></i> ${escapeHTML(p.doctor_name)}</div>` : ""}
                    <div class="card-content-preview">${escapeHTML(p.content)}</div>
                </div>
                <div class="card-actions">
                    <button type="button" class="card-btn btn-preview-card" onclick="openPreview(${p.id})" title="معاينة">
                        <i class="fa-solid fa-eye"></i>
                        معاينة
                    </button>
                    <button type="button" class="card-btn btn-print-card" onclick="openPreview(${p.id}, true)" title="طباعة">
                        <i class="fa-solid fa-print"></i>
                        طباعة
                    </button>
                    <button type="button" class="btn-delete-card" onclick="deletePrint(${p.id})" title="حذف">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join("");
}


/* =========================================================
   OPEN PREVIEW / PRINT MODAL (A4 Style)
========================================================= */

async function openPreview(id, autoPrint = false) {
    const item = prints.find(p => p.id === id);
    if (!item) return;

    currentPreviewItem = item;

    const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.prescription;
    const date = item.created_at
        ? new Date(item.created_at).toLocaleDateString("ar-EG", {
            year: "numeric",
            month: "long",
            day: "numeric"
        })
        : "—";

    /* Build A4 page */
    const logoHtml = item.logo_url
        ? `<img src="${item.logo_url}" class="a4-logo" alt="شعار العيادة" onerror="this.style.display='none'">`
        : `<div class="a4-logo">CLINIC</div>`;

    const imageHtml = item.image_url
        ? `<div class="a4-image"><img src="${item.image_url}" alt="صورة المرفق" onerror="this.style.display='none'"></div>`
        : "";

    const signatureHtml = item.type === "consent"
        ? `
            <div class="a4-signature-line">
                <div class="line"></div>
                <span>توقيع المريض / ولي الأمر</span>
            </div>
        `
        : "";

    const a4Preview = document.getElementById("a4Preview");
    if (!a4Preview) return;

    a4Preview.innerHTML = `
        <div class="a4-watermark">
            ${item.logo_url
                ? `<img src="${item.logo_url}" alt="" onerror="this.innerHTML='<div style='font-size:120px;font-weight:900;color:#0d9488;'>CLINIC</div>'">`
                : `<div style="font-size: 120px; font-weight: 900; color: #0d9488;">CLINIC</div>`
            }
        </div>

        <div class="a4-header">
            <div class="a4-logo-section">
                ${logoHtml}
                <div class="a4-clinic-info">
                    <h2>${escapeHTML(item.clinic_name || "عيادة الابتسامة")}</h2>
                    <p>
                        ${item.doctor_name ? escapeHTML(item.doctor_name) : "د. —"}
                        ${item.doctor_title ? " — " + escapeHTML(item.doctor_title) : ""}
                    </p>
                </div>
            </div>
            <div class="a4-doc-type">
                <span class="doc-label ${item.type}">${config.label}</span>
            </div>
        </div>

        <div class="a4-body">
            <div class="a4-title">${escapeHTML(item.title)}</div>
            <div class="a4-content" dir="auto">${escapeHTML(item.content)}</div>
            ${imageHtml}
            ${signatureHtml}
        </div>

        <div class="a4-footer">
            <span><i class="fa-solid fa-location-dot"></i> ${escapeHTML(item.clinic_name || "عيادة الابتسامة")}</span>
            <span><i class="fa-regular fa-calendar"></i> ${date}</span>
        </div>
    `;

    /* Show modal */
    document.getElementById("previewModal").classList.add("active");

    /* Auto print if requested */
    if (autoPrint) {
        setTimeout(() => {
            window.print();
        }, 600);
    }
}


/* =========================================================
   PRINT CURRENT
========================================================= */

function printCurrent() {
    window.print();
}


/* =========================================================
   MODAL CONTROLS
========================================================= */

function openFormModal() {
    document.getElementById("formModal").classList.add("active");
    setTimeout(() => document.getElementById("title")?.focus(), 100);
}

function closeFormModal() {
    document.getElementById("formModal").classList.remove("active");
}

function closePreviewModal() {
    document.getElementById("previewModal").classList.remove("active");
}


/* =========================================================
   FILE HANDLER
========================================================= */

function handleFileSelect(input, textId) {
    const text = document.getElementById(textId);
    const box = input.closest(".file-upload-box");

    if (input.files && input.files[0]) {
        const fileName = input.files[0].name;
        if (text) text.innerText = fileName;
        if (box) {
            box.style.borderColor = "rgba(34, 197, 94, 0.5)";
            box.style.background = "rgba(34, 197, 94, 0.05)";
        }
    }
}


/* =========================================================
   CLEAR FORM
========================================================= */

function clearForm() {
    const fields = ["clinicName", "doctorName", "doctorTitle", "title", "content"];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });

    const image = document.getElementById("image");
    const logo = document.getElementById("logo");
    if (image) image.value = "";
    if (logo) logo.value = "";

    const imageText = document.getElementById("imageText");
    const logoText = document.getElementById("logoText");
    if (imageText) imageText.innerText = "اضغط لرفع صورة";
    if (logoText) logoText.innerText = "اضغط لرفع الشعار";

    document.querySelectorAll(".file-upload-box").forEach(box => {
        box.style.borderColor = "";
        box.style.background = "";
    });
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(value) {
    if (value == null) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   MORE MENU — FIXED & RELIABLE
========================================================= */



/* Close when clicking any link inside the menu */
document.addEventListener("click", (e) => {
    const link = e.target.closest(".more-menu-item");
    if (link) {
        closeMoreMenu();
    }
});

/* Close when clicking the overlay background */
document.addEventListener("click", (e) => {
    const overlay = document.getElementById("moreMenuOverlay");
    if (overlay && e.target === overlay) {
        closeMoreMenu();
    }
});

/* Close modals when clicking their overlays */
document.addEventListener("click", (e) => {
    const formModal = document.getElementById("formModal");
    if (formModal && e.target === formModal) {
        closeFormModal();
    }

    const previewModal = document.getElementById("previewModal");
    if (previewModal && e.target === previewModal) {
        closePreviewModal();
    }
});

/* ESC key closes everything */
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        closeFormModal();
        closePreviewModal();
        closeMoreMenu();
    }
});


/* =========================================================
   INIT
========================================================= */

(async function init() {
    const { data } = await supabaseClient.auth.getUser();
    if (!data?.user) {
        window.location.href = "login.html";
        return;
    }
    loadPrints();
})();