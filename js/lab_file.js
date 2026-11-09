
function scrollToWorkById(workId, block = "center") {
    const card = document.getElementById(`work_${workId}`);
    if (!card) return;

    // افتح الشهر (details) إذا كان مغلقاً
    const monthDetails = card.closest("details.lab-month-details");
    if (monthDetails && !monthDetails.open) {
        monthDetails.open = true;
    }

    // انتظر فتح الـ details ثم مرّر
    setTimeout(() => {
        card.scrollIntoView({ behavior: "smooth", block: block });
        card.classList.add("work-highlight-target");
        setTimeout(() => card.classList.remove("work-highlight-target"), 2500);
    }, 200);
}
/* ============================================
   DENTIX PRO — LAB FILE
   Organized & Cleaned JavaScript
   ============================================ */
const urlParams = new URLSearchParams(window.location.search);
let labId = urlParams.get("lab_id") || urlParams.get("id");  // ← يدعم الاثنين
const targetWorkId = urlParams.get("work_id");                // ← معرف التركيبة
let currentUserId = null;
window.editingWorkId = null;
/* =========================
   UTILITIES
========================= */
function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function getUserId() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    return user?.id || null;
}

/* =========================
   LAB INFO
========================= */
async function loadLabInfo() {
    const { data, error } = await supabaseClient
        .from("labs")
        .select("*")
        .eq("id", labId)
        .single();

    if (error || !data) {
        console.error("LOAD ERROR:", error);
        return;
    }

    document.getElementById("labName").innerText = data.lab_name || "-";
    document.getElementById("labSpec").innerText = data.specialization || "-";
    document.getElementById("labAddress").innerText = data.address || "-";
    document.getElementById("labPhone").innerText = data.phone || "-";
}

function enableEditLab() {
    document.getElementById("labViewMode").style.display = "none";
    document.getElementById("labEditMode").style.display = "block";
    document.getElementById("edit_labName").value = document.getElementById("labName").innerText;
    document.getElementById("edit_labSpec").value = document.getElementById("labSpec").innerText;
    document.getElementById("edit_labAddress").value = document.getElementById("labAddress").innerText;
    document.getElementById("edit_labPhone").value = document.getElementById("labPhone").innerText;
}

function cancelEditLab() {
    document.getElementById("labEditMode").style.display = "none";
    document.getElementById("labViewMode").style.display = "block";
}

async function saveLabEdit() {
    const payload = {
        lab_name: document.getElementById("edit_labName").value,
        specialization: document.getElementById("edit_labSpec").value,
        address: document.getElementById("edit_labAddress").value,
        phone: document.getElementById("edit_labPhone").value
    };

    const { data, error } = await supabaseClient
        .from("labs")
        .update(payload)
        .eq("id", labId)
        .select();

    if (error) {
        alert(error.message);
        return;
    }
    if (!data || data.length === 0) {
        alert("❌ No row updated. Check labId or RLS policy");
        return;
    }

    await loadLabInfo();
    cancelEditLab();
    showToast("✅ Lab updated successfully");
}


/* =========================
   QUANTITY & TOTALS (ADD)
========================= */
function calculateWorkTotal() {
    const quantity = Math.max(1, parseInt(document.getElementById("workQuantity")?.value) || 1);
    const labCostInput = document.getElementById("labCost");
    const patientAmountInput = document.getElementById("patientAmount");

    // سعر الوحدة من الكتالوج (محفوظ في data-unit-cost)
    const unitLabCost = parseFloat(labCostInput?.dataset.unitCost) || 0;
    const unitPatientAmount = parseFloat(patientAmountInput?.dataset.unitCost) || 0;

    const totalLabCost = unitLabCost * quantity;
    const totalPatientAmount = unitPatientAmount * quantity;

    const labTotalEl = document.getElementById("labCostTotal");
    const patientTotalEl = document.getElementById("patientAmountTotal");

    if (labTotalEl) labTotalEl.textContent = totalLabCost.toFixed(2);
    if (patientTotalEl) patientTotalEl.textContent = totalPatientAmount.toFixed(2);
}

/* =========================
   APPLY TOTAL PRICE (ADD)
========================= */
function applyTotalPrice() {
    const quantity = Math.max(1, parseInt(document.getElementById("workQuantity")?.value) || 1);
    const labCostInput = document.getElementById("labCost");
    const patientAmountInput = document.getElementById("patientAmount");

    const unitLabCost = parseFloat(labCostInput?.dataset.unitCost) || 0;
    const unitPatientAmount = parseFloat(patientAmountInput?.dataset.unitCost) || 0;

    if (unitLabCost <= 0 && unitPatientAmount <= 0) {
        showToast("⚠️ اختر التركيبة أولاً لجلب الأسعار من الكتالوج");
        return;
    }

    // الإجمالي المطلوب = سعر الوحدة × الكمية الحالية
    const expectedLabTotal = unitLabCost * quantity;
    const expectedPatientTotal = unitPatientAmount * quantity;

    const currentLabCost = parseFloat(labCostInput?.value) || 0;
    const currentPatientAmount = parseFloat(patientAmountInput?.value) || 0;

    let applied = false;

    // نطبق فقط إذا كان الإجمالي المطلوب مختلف عن الموجود في الحقل
    if (unitLabCost > 0 && currentLabCost !== expectedLabTotal) {
        labCostInput.value = expectedLabTotal.toFixed(2);
        applied = true;
    }
    if (unitPatientAmount > 0 && currentPatientAmount !== expectedPatientTotal) {
        patientAmountInput.value = expectedPatientTotal.toFixed(2);
        applied = true;
    }

    if (!applied) {
        showToast("ℹ️ الإجمالي مطابق للكمية الحالية");
        return;
    }

    // تحديث عرض الإجمالي
    const labTotalEl = document.getElementById("labCostTotal");
    const patientTotalEl = document.getElementById("patientAmountTotal");
    if (labTotalEl) labTotalEl.textContent = expectedLabTotal.toFixed(2);
    if (patientTotalEl) patientTotalEl.textContent = expectedPatientTotal.toFixed(2);

    showToast(`✅ تم تطبيق السعر: ${quantity} وحدة × السعر = الإجمالي`);

    [labCostInput, patientAmountInput].forEach(input => {
        if (input) {
            input.style.transition = "box-shadow .3s ease";
            input.style.boxShadow = "0 0 0 3px rgba(139,92,246,.3)";
            setTimeout(() => input.style.boxShadow = "", 1000);
        }
    });
}
/* =========================
   WORK CATALOG
========================= */
async function fillWorkPrices() {
    const workName = document.getElementById("workName").value;
    const workType = document.getElementById("workType").value;
    if (!workName || !workType) return;

    const { data: userData } = await supabaseClient.auth.getUser();
    const userId = userData.user?.id;

    const { data, error } = await supabaseClient
        .from("dental_works_catalog")
        .select("*")
        .eq("user_id", userId)
        .eq("work_name", workName)
        .eq("work_type", workType);

    if (error || !data || data.length === 0) return;

    const labCostInput = document.getElementById("labCost");
    const patientAmountInput = document.getElementById("patientAmount");

    const labCost = data[0].lab_cost || "";
    const patientAmount = data[0].patient_amount || "";

    // حفظ سعر الوحدة في data attribute + وضعه في الحقل
    if (labCostInput) {
        labCostInput.value = labCost;
        labCostInput.dataset.unitCost = labCost;
    }
    if (patientAmountInput) {
        patientAmountInput.value = patientAmount;
        patientAmountInput.dataset.unitCost = patientAmount;
    }

    calculateWorkTotal();
}

function changeWorkQuantity(amount) {
    const input = document.getElementById("workQuantity");
    if (!input) return;
    let quantity = parseInt(input.value) || 1;
    quantity += amount;
    if (quantity < 1) quantity = 1;
    input.value = quantity;
    calculateWorkTotal();
}

/* =========================
   TOOTH SELECTION (ADD)
========================= */
let selectedTeeth = [];

function toggleToothChart() {
    const panel = document.getElementById("toothChartPanel");
    const arrow = document.getElementById("toothSelectorArrow");
    const btn = document.getElementById("openToothChartBtn");
    if (!panel) return;

    const isOpen = panel.classList.contains("open");
    if (isOpen) {
        closeToothChart();
    } else {
        panel.classList.add("open");
        btn?.classList.add("open");
        arrow?.classList.add("open");
    }
}

function closeToothChart() {
    const panel = document.getElementById("toothChartPanel");
    const arrow = document.getElementById("toothSelectorArrow");
    const btn = document.getElementById("openToothChartBtn");
    panel?.classList.remove("open");
    btn?.classList.remove("open");
    arrow?.classList.remove("open");
}

function handleToothClick(toothElement) {
    if (!toothElement) return;
    const tooth = toothElement.dataset.tooth;
    if (!tooth) return;

    const index = selectedTeeth.indexOf(tooth);
    if (index !== -1) {
        selectedTeeth.splice(index, 1);
        toothElement.classList.remove("selected");
    } else {
        selectedTeeth.push(tooth);
        toothElement.classList.add("selected");
    }
    updateSelectedTeethUI();
}

function updateSelectedTeethUI() {
    const hiddenInput = document.getElementById("toothNumber");
    const container = document.getElementById("selectedTeethContainer");
    const badge = document.getElementById("selectedToothBadge");
    const display = document.getElementById("selectedToothDisplay");
    const selectorText = document.getElementById("toothSelectorText");

    if (hiddenInput) hiddenInput.value = selectedTeeth.join(",");

    if (selectedTeeth.length === 0) {
        if (badge) badge.style.display = "none";
        if (selectorText) selectorText.textContent = "اختيار الأسنان";
        if (container) container.innerHTML = "";
        return;
    }

    if (selectorText) selectorText.textContent = `${selectedTeeth.length} أسنان محددة`;
    if (badge) badge.style.display = "flex";
    if (display) display.textContent = selectedTeeth.map(t => t.replace(".", "")).join(" ، ");

    if (container) {
        container.innerHTML = selectedTeeth.map(tooth => {
            const displayNumber = tooth.replace(".", "");
            return `
                <div class="selected-tooth-chip" data-tooth="${tooth}">
                    <div class="selected-chip-icon"><i class="fa-solid fa-tooth"></i></div>
                    <strong>${displayNumber}</strong>
                    <button type="button" onclick="removeSelectedTooth('${tooth}')" title="إزالة السن">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            `;
        }).join("");
    }
}

function removeSelectedTooth(tooth) {
    const index = selectedTeeth.indexOf(tooth);
    if (index === -1) return;
    selectedTeeth.splice(index, 1);
    const toothElement = document.querySelector(`.tooth[data-tooth="${tooth}"]`);
    if (toothElement) toothElement.classList.remove("selected");
    updateSelectedTeethUI();
}

function clearToothSelection() {
    selectedTeeth = [];
    document.querySelectorAll(".tooth.selected").forEach(t => t.classList.remove("selected"));
    updateSelectedTeethUI();
}

/* =========================
   PATIENT AUTOCOMPLETE
========================= */
let workPatientsCache = [];
let patientSearchTimer = null;

async function loadPatientsForWork() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        const userId = user?.id;
        if (!userId) return;

        const { data, error } = await supabaseClient
            .from("patients")
            .select("id, full_name, birth_date")
            .eq("user_id", userId)
            .order("full_name", { ascending: true });

        if (error) {
            console.error("Failed to load patients:", error);
            return;
        }
        workPatientsCache = data || [];
    } catch (error) {
        console.error("loadPatientsForWork error:", error);
    }
}

function calculatePatientAge(birthDate) {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 0 ? age : null;
}

function searchPatientsForWork() {
    clearTimeout(patientSearchTimer);
    patientSearchTimer = setTimeout(() => {
        const input = document.getElementById("patientName");
        const suggestions = document.getElementById("patientSuggestions");
        const selectedInput = document.getElementById("selectedPatientId");
        if (!input || !suggestions || !selectedInput) return;

        const search = input.value.trim().toLowerCase();
        if (!search) {
            suggestions.innerHTML = "";
            suggestions.classList.remove("show");
            selectedInput.value = "";
            input.classList.remove("patient-selected");
            return;
        }

        const results = workPatientsCache
            .filter(p => String(p.full_name || "").toLowerCase().includes(search))
            .slice(0, 10);

        renderPatientSuggestions(results);
    }, 150);
}

function renderPatientSuggestions(patients) {
    const container = document.getElementById("patientSuggestions");
    if (!container) return;

    if (!patients.length) {
        container.innerHTML = `
            <div class="patient-no-results">
                <i class="fa-solid fa-user-slash"></i>
                <span>لا يوجد مريض بهذا الاسم</span>
            </div>`;
        container.classList.add("show");
        return;
    }

    container.innerHTML = "";
    patients.forEach(patient => {
        const age = calculatePatientAge(patient.birth_date);
        const item = document.createElement("div");
        item.className = "patient-suggestion";
        item.dataset.patientId = String(patient.id);
        item.innerHTML = `
            <div class="patient-suggestion-icon"><i class="fa-solid fa-user"></i></div>
            <div class="patient-suggestion-info">
                <strong>${escapeHtml(patient.full_name || "")}</strong>
                <span>${age !== null ? `(${age} سنة)` : "(العمر غير مسجل)"}</span>
            </div>
            <i class="fa-solid fa-chevron-left patient-suggestion-arrow"></i>
        `;
        item.addEventListener("mousedown", function(event) {
            event.preventDefault();
            selectPatientForWork(String(patient.id));
        });
        container.appendChild(item);
    });
    container.classList.add("show");
}

function selectPatientForWork(patientId) {
    const patient = workPatientsCache.find(p => String(p.id) === String(patientId));
    if (!patient) return;

    const patientInput = document.getElementById("patientName");
    const selectedPatientInput = document.getElementById("selectedPatientId");
    const suggestions = document.getElementById("patientSuggestions");

    if (selectedPatientInput) selectedPatientInput.value = String(patient.id);
    if (patientInput) {
        patientInput.value = patient.full_name || "";
        patientInput.classList.add("patient-selected");
    }
    if (suggestions) {
        suggestions.innerHTML = "";
        suggestions.classList.remove("show");
    }
}

/* =========================
   DOCTORS
========================= */
async function loadDoctorsForProsthesis() {
    const select = document.getElementById("doctorName");
    if (!select) return;

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        const userId = user?.id;
        if (!userId) return;

        const { data: doctors, error } = await supabaseClient
            .from("doctors")
            .select("id, doctor_name")
            .eq("user_id", userId)
            .order("doctor_name", { ascending: true });

        if (error) {
            console.error("Failed to load doctors:", error);
            return;
        }

        select.innerHTML = `<option value="">اختر الطبيب (اختياري)</option>`;
        (doctors || []).forEach(doctor => {
            const option = document.createElement("option");
            option.value = doctor.doctor_name || "";
            option.textContent = doctor.doctor_name || "طبيب بدون اسم";
            select.appendChild(option);
        });
    } catch (error) {
        console.error("loadDoctorsForProsthesis error:", error);
    }
}

/* =========================
   WORK CATALOG
========================= */
async function loadWorkNames() {
    const { data: userData } = await supabaseClient.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    const { data, error } = await supabaseClient
        .from("dental_works_catalog")
        .select("work_name")
        .eq("user_id", userId)
        .order("work_name");

    if (error) {
        console.error(error);
        return;
    }

    const names = [...new Set(data.map(item => item.work_name))];
    const select = document.getElementById("workName");
    select.innerHTML = `<option value="">اختر اسم التركيبة</option>`;
    names.forEach(name => {
        select.innerHTML += `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`;
    });
    document.getElementById("workType").innerHTML = `<option value="">اختر النوع</option>`;
}

async function loadWorkTypes() {
    const workName = document.getElementById("workName").value;
    if (!workName) {
        document.getElementById("workType").innerHTML = `<option value="">اختر النوع</option>`;
        return;
    }

    const { data: userData } = await supabaseClient.auth.getUser();
    const userId = userData.user?.id;

    const { data, error } = await supabaseClient
        .from("dental_works_catalog")
        .select("work_type")
        .eq("user_id", userId)
        .eq("work_name", workName)
        .order("work_type");

    if (error) {
        console.error(error);
        return;
    }

    const select = document.getElementById("workType");
    select.innerHTML = `<option value="">اختر النوع</option>`;
    data.forEach(item => {
        select.innerHTML += `<option value="${escapeHtml(item.work_type)}">${escapeHtml(item.work_type)}</option>`;
    });

    document.getElementById("labCost").value = "";
    document.getElementById("patientAmount").value = "";
    calculateWorkTotal();
}

function clearWorkForm() {
    document.getElementById("doctorName").value = "";
    document.getElementById("patientName").value = "";
    document.getElementById("selectedPatientId").value = "";
    document.getElementById("patientName").classList.remove("patient-selected");
    document.getElementById("workName").value = "";
    document.getElementById("workType").value = "";
    document.getElementById("workQuantity").value = 1;

    const labCostInput = document.getElementById("labCost");
    const patientAmountInput = document.getElementById("patientAmount");

    if (labCostInput) {
        labCostInput.value = "";
        delete labCostInput.dataset.unitCost;
    }
    if (patientAmountInput) {
        patientAmountInput.value = "";
        delete patientAmountInput.dataset.unitCost;
    }

    document.getElementById("deliveryDate").value = "";
    document.getElementById("notes").value = "";
    clearToothSelection();
    calculateWorkTotal();
}
/* =========================
   SAVE WORK
========================= */
async function saveWork() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        const userId = user?.id;
        if (!userId || !labId) {
            alert("Missing user or labId");
            return;
        }

        const workName = document.getElementById("workName")?.value?.trim();
        if (!workName) {
            showToast("Work Name is required");
            return;
        }

        const selectedPatientId = document.getElementById("selectedPatientId")?.value?.trim();
        const patientId = selectedPatientId ? Number(selectedPatientId) : null;
        if (!patientId) {
            showToast("Please select a patient from the suggestions");
            return;
        }

        const quantity = Math.max(1, parseInt(document.getElementById("workQuantity")?.value) || 1);
        const labCost = document.getElementById("labCost")?.value ? parseFloat(document.getElementById("labCost").value) : null;
        const patientAmount = document.getElementById("patientAmount")?.value ? parseFloat(document.getElementById("patientAmount").value) : null;

        const toothNumber = document.getElementById("toothNumber")?.value?.trim() || null;
        let toothNumbers = [];
        if (toothNumber) {
            toothNumbers = toothNumber.split(",").map(t => t.trim()).filter(Boolean);
        }

        const payload = {
            user_id: userId,
            lab_id: labId,
            patient_id: patientId,
            doctor_name: document.getElementById("doctorName")?.value?.trim() || null,
            patient_name: document.getElementById("patientName")?.value?.trim() || null,
            work_name: workName,
            work_type: document.getElementById("workType")?.value?.trim() || null,
            lab_cost: labCost,
            patient_amount: patientAmount,
            quantity: quantity,
            delivery_date: document.getElementById("deliveryDate")?.value || null,
            notes: document.getElementById("notes")?.value?.trim() || null,
            received: false
        };

        const { data: workData, error: workError } = await supabaseClient
            .from("lab_works")
            .insert([payload])
            .select("id")
            .single();

        if (workError) {
            alert(workError.message);
            return;
        }
        if (!workData?.id) {
            alert("Work was saved but its ID could not be retrieved");
            return;
        }

        const labWorkId = workData.id;

        if (toothNumbers.length > 0) {
            const teethPayload = toothNumbers.map(tooth => ({
                lab_work_id: labWorkId,
                patient_id: patientId,
                tooth_number: tooth
            }));
            const { error: toothError } = await supabaseClient
                .from("lab_work_teeth")
                .insert(teethPayload);

            if (toothError) {
                showToast("تم حفظ التركيبة، ولكن حدث خطأ أثناء حفظ الأسنان:\n" + toothError.message);
            }
        }

        clearWorkForm();
        await loadWorks();
        await loadDashboard();
        showToast("✅ Prosthesis saved successfully");

    } catch (error) {
        console.error("saveWork error:", error);
        showToast("حدث خطأ غير متوقع أثناء حفظ التركيبة");
    }
}

function clearWorkForm() {
    document.getElementById("doctorName").value = "";
    document.getElementById("patientName").value = "";
    document.getElementById("selectedPatientId").value = "";
    document.getElementById("patientName").classList.remove("patient-selected");
    document.getElementById("workName").value = "";
    document.getElementById("workType").value = "";
    document.getElementById("workQuantity").value = 1;
    document.getElementById("labCost").value = "";
    document.getElementById("patientAmount").value = "";
    document.getElementById("deliveryDate").value = "";
    document.getElementById("notes").value = "";
    clearToothSelection();
    calculateWorkTotal();
}

/* =========================
   LOAD WORKS
========================= */
async function loadWorks() {
    const userId = await getUserId();
    if (!userId || !labId) return;

    const { data: works, error: worksError } = await supabaseClient
        .from("lab_works")
        .select(`
            *,
            lab_work_teeth ( tooth_number )
        `)
        .eq("user_id", userId)
        .eq("lab_id", labId)
        .order("id", { ascending: false });

    const searchText = (document.getElementById("workSearch")?.value || "").toLowerCase().trim();
    const container = document.getElementById("worksContainer");
    const countEl = document.getElementById("worksCount");
    if (!container) return;

    container.innerHTML = "";
    if (worksError) {
        console.error(worksError);
        return;
    }

    let filteredData = works || [];
    if (searchText) {
        filteredData = filteredData.filter(w =>
            (w.patient_name || "").toLowerCase().includes(searchText) ||
            (w.work_name || "").toLowerCase().includes(searchText) ||
            (w.work_type || "").toLowerCase().includes(searchText) ||
            (w.doctor_name || "").toLowerCase().includes(searchText)
        );
    }

    if (countEl) countEl.textContent = filteredData.length;

    if (filteredData.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🦷</div>
                <div class="empty-title" data-i18n="420">لا توجد تركيبات</div>
                <div class="empty-subtitle" data-i18n="421">أضف تركيبة جديدة من الأعلى</div>
            </div>`;
        applyTranslations();
        return;
    }

    const now = new Date();

    const groupedByMonth = {};
    filteredData.forEach(w => {
        const rawDate = w.created_at || w.delivery_date || null;
        let date = rawDate ? new Date(rawDate) : null;
        if (date && isNaN(date)) date = null;

        let monthKey, monthLabel;
        if (date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            monthKey = `${year}-${month}`;
            const locale = (typeof userPreferences !== 'undefined' && userPreferences.language === 'en') ? 'en-US' : 'ar-EG';
            monthLabel = date.toLocaleDateString(locale, { month: "long", year: "numeric" });
        } else {
            monthKey = "unknown";
            monthLabel = `<span data-i18n="422">بدون تاريخ</span>`;
        }

        if (!groupedByMonth[monthKey]) {
            groupedByMonth[monthKey] = { label: monthLabel, works: [], totalCost: 0, totalPatientAmount: 0, receivedCount: 0, overdueCount: 0, pendingCount: 0 };
        }
        groupedByMonth[monthKey].works.push(w);
        groupedByMonth[monthKey].totalCost += Number(w.lab_cost || 0);
        groupedByMonth[monthKey].totalPatientAmount += Number(w.patient_amount || 0);

        if (w.received) {
            groupedByMonth[monthKey].receivedCount++;
        } else {
            const deliveryDate = w.delivery_date ? new Date(w.delivery_date) : null;
            if (deliveryDate && deliveryDate < now) {
                groupedByMonth[monthKey].overdueCount++;
            } else {
                groupedByMonth[monthKey].pendingCount++;
            }
        }
    });

    const months = Object.keys(groupedByMonth).sort((a, b) => b.localeCompare(a));

    container.innerHTML = months.map((monthKey, index) => {
        const month = groupedByMonth[monthKey];
        const worksCount = month.works.length;
        const receivedCount = month.receivedCount;
        const overdueCount = month.overdueCount;
        const pendingCount = month.pendingCount;
        const totalCost = month.totalCost;
        const totalPatientAmount = month.totalPatientAmount;
        const netProfit = totalPatientAmount - totalCost;
        const openAttr = index === 0 ? "open" : "";

        const worksHTML = month.works.map(w => renderWorkCard(w, now)).join("");

        return `
            <details class="lab-month-details" ${openAttr}>
                <summary>
                    <div class="month-summary-left">
                        <div class="month-icon"><i class="fa-solid fa-calendar-days"></i></div>
                        <div>
                            <strong>${month.label}</strong>
                            <span>${worksCount} <span data-i18n="${worksCount === 1 ? '423' : '424'}">${worksCount === 1 ? "تركيبة" : "تركيبات"}</span></span>
                        </div>
                    </div>
                    <div class="month-stats">
                        <div class="m-stat"><span data-i18n="425">التركيبات</span><strong>${worksCount}</strong></div>
                        <div class="m-stat received"><span data-i18n="426">المستلمة</span><strong>${receivedCount}</strong></div>
                        <div class="m-stat pending"><span data-i18n="427">قيد الانتظار</span><strong>${pendingCount}</strong></div>
                        <div class="m-stat overdue"><span data-i18n="428">متأخرة</span><strong>${overdueCount}</strong></div>
                        <div class="m-stat cost"><span data-i18n="429">تكلفة المعمل</span><strong>${Number(totalCost).toLocaleString("en-US", {maximumFractionDigits:2})} <small data-i18n="419">EGP</small></strong></div>
                        <div class="m-stat revenue"><span data-i18n="430">من المرضى</span><strong>${Number(totalPatientAmount).toLocaleString("en-US", {maximumFractionDigits:2})} <small data-i18n="419">EGP</small></strong></div>
                        <div class="m-stat ${netProfit >= 0 ? 'profit' : 'loss'}"><span data-i18n="431">صافي الربح</span><strong>${Number(netProfit).toLocaleString("en-US", {maximumFractionDigits:2})} <small data-i18n="419">EGP</small></strong></div>
                    </div>
                    <div class="month-arrow"><i class="fa-solid fa-chevron-down"></i></div>
                </summary>
                <div class="month-works">${worksHTML}</div>
            </details>
        `;
    }).join("");
    
    /* 🔄 أعد تطبيق الترجمة بعد بناء المعامل */
    applyTranslations();
}


function renderWorkCard(w, now) {
    const teeth = w.lab_work_teeth || [];
    const teethNumbers = teeth.map(t => t.tooth_number?.replace(".", "") || "").filter(Boolean);
    const teethHTML = teethNumbers.length > 0 
        ? `<div class="work-teeth-row">
            <i class="fa-solid fa-tooth teeth-icon"></i>
            <div class="work-teeth-chips">
                ${teethNumbers.map(t => `<span class="work-tooth-chip">${t}</span>`).join("")}
            </div>
           </div>`
        : "";

    const profit = Number(w.patient_amount || 0) - Number(w.lab_cost || 0);
    const profitClass = profit >= 0 ? "profit" : "loss";

    /* ─── تحديد الحالة: مستلمة / متأخرة / منتظرة ─── */
    const deliveryDate = w.delivery_date ? new Date(w.delivery_date) : null;
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const deliveryDateOnly = deliveryDate ? new Date(deliveryDate.getFullYear(), deliveryDate.getMonth(), deliveryDate.getDate()) : null;
    const isOverdue = !w.received && deliveryDateOnly && deliveryDateOnly < today;
    const isPending = !w.received && !isOverdue;

    /* ─── أيقونة وشارة الحالة ─── */
    let statusIcon = '';
    let statusBadge = '';
    let cardClass = '';
    let statusTitle = '';

    if (w.received) {
        statusIcon = '<div class="work-v2-status received"><i class="fa-solid fa-circle-check"></i></div>';
        statusBadge = '<span class="work-v2-badge received"><i class="fa-solid fa-check"></i> <span data-i18n="440">مستلمة</span></span>';
        cardClass = 'work-received';
        statusTitle = 'تم الاستلام';
    } else if (isOverdue) {
        statusIcon = '<div class="work-v2-status overdue"><i class="fa-solid fa-triangle-exclamation"></i></div>';
        statusBadge = '<span class="work-v2-badge overdue"><i class="fa-solid fa-triangle-exclamation"></i> <span data-i18n="441">متأخرة</span></span>';
        cardClass = 'work-overdue';
        statusTitle = 'فات موعد التسليم';
    } else {
        statusIcon = '<div class="work-v2-status pending"><i class="fa-solid fa-circle-notch fa-spin"></i></div>';
        statusBadge = '<span class="work-v2-badge pending"><i class="fa-solid fa-clock"></i> <span data-i18n="442">قيد الانتظار</span></span>';
        cardClass = 'work-pending';
        statusTitle = 'قيد الانتظار';
    }

    /* ─── تاريخ التسليم مع تمييز المتأخرة ─── */
    let deliveryHTML = '';
    if (w.delivery_date) {
        const dateClass = isOverdue ? 'overdue-date' : '';
        const dateIcon = isOverdue ? 'fa-calendar-xmark' : 'fa-calendar-day';
        deliveryHTML = `<div class="work-card-v2-footer">
            <span class="${dateClass}"><i class="fa-solid ${dateIcon}"></i> <span data-i18n="435">موعد التسليم:</span> ${w.delivery_date}</span>
            <span><i class="fa-solid fa-layer-group"></i> <span data-i18n="436">عدد الوحدات:</span> ${w.quantity || 1}</span>
        </div>`;
    }

    return `
        <div id="work_${w.id}" class="lab-work-card-v2 ${cardClass}">
            <div class="work-card-v2-main">
                <div class="work-card-v2-left">
                    ${statusIcon}
                    <div class="work-v2-info">
                        <div class="work-v2-name">${escapeHtml(w.work_name) || "-"}</div>
                        <div class="work-v2-meta">
                            <span class="v2-tag type-tag"><i class="fa-solid fa-cube"></i> ${escapeHtml(w.work_type) || "-"}</span>
                            <span class="v2-tag patient-tag"><i class="fa-solid fa-user"></i> ${escapeHtml(w.patient_name) || "-"}</span>
                            ${w.doctor_name ? `<span class="v2-tag doctor-tag"><i class="fa-solid fa-user-doctor"></i> ${escapeHtml(w.doctor_name)}</span>` : ""}
                        </div>
                        ${statusBadge}
                        ${teethHTML}
                    </div>
                </div>
                <div class="work-card-v2-right">
                    <div class="work-v2-amounts">
                        <div class="v2-amount patient-amount">
                            <span data-i18n="437">المريض</span>
                            <strong>${Number(w.patient_amount || 0).toLocaleString("en-US", {maximumFractionDigits:2})} <small data-i18n="419">EGP</small></strong>
                        </div>
                        <div class="v2-amount lab-amount">
                            <span data-i18n="438">المعمل</span>
                            <strong>${Number(w.lab_cost || 0).toLocaleString("en-US", {maximumFractionDigits:2})} <small data-i18n="419">EGP</small></strong>
                        </div>
                        <div class="v2-amount ${profitClass}">
                            <span data-i18n="439">الربح</span>
                            <strong>${Number(profit).toLocaleString("en-US", {maximumFractionDigits:2})} <small data-i18n="419">EGP</small></strong>
                        </div>
                    </div>
                    <div class="work-v2-actions">
                        <button class="v2-action-btn view-btn" onclick="event.stopPropagation(); showWorkDetails(${w.id})" title="عرض التفاصيل">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                        <button class="v2-action-btn edit-btn" onclick="event.stopPropagation(); startEdit(${w.id})" title="تعديل">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="v2-action-btn receive-btn ${w.received ? 'received' : ''}" onclick="event.stopPropagation(); toggleReceived(${w.id}, ${!!w.received})" title="${statusTitle}">
                            <i class="fa-solid ${w.received ? 'fa-check-double' : 'fa-check'}"></i>
                        </button>
                    </div>
                </div>
            </div>
            ${deliveryHTML}
        </div>
    `;
}
/* =========================
   TOGGLE RECEIVED
========================= */
async function toggleReceived(id, currentValue) {
    const { error } = await supabaseClient
        .from("lab_works")
        .update({ received: !currentValue })
        .eq("id", id);

    if (error) {
        alert(error.message);
        return;
    }
    await loadWorks();
    await loadDashboard();
}

/* =========================
   DELETE WORK
========================= */
async function deleteWork(id) {
    if (!await showConfirm("Delete this work?")) return;
    const { error } = await supabaseClient
        .from("lab_works")
        .delete()
        .eq("id", id);

    if (error) {
        alert(error.message);
        return;
    }
    await loadWorks();
    await loadDashboard();
    closeWorkDetails();
}

/* =========================
   WORK DETAILS MODAL
========================= */
async function showWorkDetails(id) {
    const { data: work, error } = await supabaseClient
        .from("lab_works")
        .select(`
            *,
            lab_work_teeth ( tooth_number )
        `)
        .eq("id", id)
        .single();

    if (error || !work) {
        showToast("حدث خطأ أثناء تحميل التفاصيل");
        return;
    }

    const profit = Number(work.patient_amount || 0) - Number(work.lab_cost || 0);
    const teeth = work.lab_work_teeth || [];
    const teethNumbers = teeth.map(t => t.tooth_number?.replace(".", "") || "").filter(Boolean);

    let modal = document.getElementById("workDetailsModal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "workDetailsModal";
        document.body.appendChild(modal);
    }

    const teethSection = teethNumbers.length > 0
        ? `<div class="details-teeth-section">
            <div class="details-teeth-label"><i class="fa-solid fa-tooth"></i> الأسنان المرتبطة</div>
            <div class="details-teeth-grid">
                ${teethNumbers.map(t => `<div class="details-tooth-item">${t}</div>`).join("")}
            </div>
           </div>`
        : "";

    modal.innerHTML = `
        <div class="details-modal-overlay" onclick="if(event.target === this) closeWorkDetails()">
            <div class="details-modal">
            <div class="details-modal-scroll">
     <div class="details-modal-header">
                    <div>
                        <div class="details-title">${escapeHtml(work.work_name) || "-"}</div>
                        <div class="details-subtitle">تفاصيل تركيبة المعمل</div>
                    </div>
                    <button class="details-close-btn" onclick="closeWorkDetails()">✕</button>
                </div>

                <div class="details-status ${work.received ? 'received' : 'pending'}">
                    <span>حالة الاستلام</span>
                    <span>${work.received ? "✅ تم الاستلام" : "❌ لم يتم الاستلام"}</span>
                </div>

                <div class="details-grid">
                    <div class="work-detail-box"><span>الطبيب</span><strong>${escapeHtml(work.doctor_name) || "-"}</strong></div>
                    <div class="work-detail-box"><span>المريض</span><strong>${escapeHtml(work.patient_name) || "-"}</strong></div>
                    <div class="work-detail-box"><span>النوع</span><strong>${escapeHtml(work.work_type) || "-"}</strong></div>
                    <div class="work-detail-box"><span>موعد التسليم</span><strong>${work.delivery_date || "-"}</strong></div>
                    <div class="work-detail-box"><span>الوحدات</span><strong>${work.quantity || 1}</strong></div>
                    <div class="work-detail-box"><span>تكلفة المعمل</span><strong>${Number(work.lab_cost || 0).toFixed(2)} EGP</strong></div>
                    <div class="work-detail-box"><span>المبلغ من المريض</span><strong>${Number(work.patient_amount || 0).toFixed(2)} EGP</strong></div>
                    <div class="work-detail-box profit-box"><span>الربح</span><strong>${profit.toFixed(2)} EGP</strong></div>
                    <div class="work-detail-box"><span>وقت الإنشاء</span><strong>${work.created_at ? new Date(work.created_at).toLocaleString("ar-EG", {year:"numeric", month:"short", day:"numeric", hour:"2-digit", minute:"2-digit"}) : "-"}</strong></div>
                </div>

                ${teethSection}

                <div class="details-notes">
                    <div class="notes-label"><i class="fa-solid fa-note-sticky"></i> الملاحظات</div>
                    <div class="notes-content">${escapeHtml(work.notes) || "لا توجد ملاحظات"}</div>
                </div>

                <div class="details-actions">
                    <button class="details-edit-btn" onclick="startEdit(${work.id})"><i class="fa-solid fa-pen-to-square"></i> تعديل</button>
                    <button class="details-delete-btn" onclick="deleteWork(${work.id})"><i class="fa-solid fa-trash"></i> حذف</button>
                </div>
            </div>
        </div>
            </div>
               
    `;
}

function closeWorkDetails() {
    const modal = document.getElementById("workDetailsModal");
    if (modal) modal.remove();
}

/* ============================================
   EDIT WORK MODAL (v4 — Catalog Selects + Apply Price)
   ============================================ */
let selectedEditTeeth = [];

async function startEdit(id) {
    closeWorkDetails();
    const { data: work, error } = await supabaseClient
        .from("lab_works")
        .select("*, lab_work_teeth(tooth_number)")
        .eq("id", id)
        .single();

    if (error || !work) {
        showToast("حدث خطأ أثناء تحميل بيانات التركيبة");
        return;
    }

    let modal = document.getElementById("editWorkModal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "editWorkModal";
        document.body.appendChild(modal);
    }

    const teethNumbers = (work.lab_work_teeth || [])
        .map(t => t.tooth_number)
        .filter(Boolean);
    
    selectedEditTeeth = [...teethNumbers];

    // جلب أسماء التركيبات من الكتالوج
    const { data: userData } = await supabaseClient.auth.getUser();
    const userId = userData.user?.id;
    let catalogNames = [];
    if (userId) {
        const { data: catalog } = await supabaseClient
            .from("dental_works_catalog")
            .select("work_name")
            .eq("user_id", userId)
            .order("work_name");
        catalogNames = [...new Set((catalog || []).map(item => item.work_name))];
    }

    // بناء خيارات أسماء التركيبات
    const nameOptions = catalogNames.map(name => 
        `<option value="${escapeHtml(name)}" ${name === work.work_name ? 'selected' : ''}>${escapeHtml(name)}</option>`
    ).join("");

    modal.innerHTML = `
        <div class="edit-modal-overlay-v2" onclick="if(event.target === this) closeEditModal()">
            <div class="edit-modal-v2">
                <!-- Header -->
                <div class="edit-modal-header-v2">
                    <div class="edit-modal-header-icon">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </div>
                    <div>
                        <div class="edit-modal-title-v2">تعديل التركيبة</div>
                        <div class="edit-modal-subtitle-v2">تعديل بيانات العمل والمعمل</div>
                    </div>
                    <button class="edit-close-btn-v2" onclick="closeEditModal()">✕</button>
                </div>

                <!-- Patient Info Section -->
                <div class="edit-form-section">
                    <div class="edit-section-title">
                        <i class="fa-solid fa-user"></i>
                        بيانات الحالة
                    </div>
                    <div class="edit-form-grid">
                        <div class="modern-field">
                            <label>
                                <i class="fa-solid fa-user-doctor"></i>
                                الطبيب
                                <span class="optional-label">(غير قابل للتعديل)</span>
                            </label>
                            <div class="input-wrapper">
                                <i class="fa-solid fa-user-doctor"></i>
                                <input id="modal_edit_doctor" value="${escapeHtml(work.doctor_name || "")}" 
                                    readonly 
                                    style="background:rgba(255,255,255,.02);color:#64748b;cursor:not-allowed;opacity:.7;">
                            </div>
                        </div>
                        <div class="modern-field">
                            <label>
                                <i class="fa-solid fa-user"></i>
                                المريض
                                <span class="optional-label">(غير قابل للتعديل)</span>
                            </label>
                            <div class="input-wrapper">
                                <i class="fa-solid fa-user"></i>
                                <input id="modal_edit_patient" value="${escapeHtml(work.patient_name || "")}" 
                                    readonly 
                                    style="background:rgba(255,255,255,.02);color:#64748b;cursor:not-allowed;opacity:.7;">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Prosthesis Info Section -->
                <div class="edit-form-section">
                    <div class="edit-section-title">
                        <i class="fa-solid fa-tooth"></i>
                        بيانات التركيبة
                    </div>
                    <div class="edit-form-grid">
                        <div class="modern-field">
                            <label>اسم التركيبة</label>
                            <div class="input-wrapper select-wrapper">
                                <i class="fa-solid fa-tooth"></i>
                                <select id="modal_edit_work" onchange="loadEditWorkTypes()">
                                    <option value="">اختر اسم التركيبة</option>
                                    ${nameOptions}
                                </select>
                                <i class="fa-solid fa-chevron-down select-arrow"></i>
                            </div>
                        </div>
                        <div class="modern-field">
                            <label>نوع التركيبة</label>
                            <div class="input-wrapper select-wrapper">
                                <i class="fa-solid fa-layer-group"></i>
                                <select id="modal_edit_type" onchange="fillEditWorkPrices()">
                                    <option value="">اختر النوع</option>
                                </select>
                                <i class="fa-solid fa-chevron-down select-arrow"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Financial Section -->
                <div class="edit-form-section">
                    <div class="edit-section-title">
                        <i class="fa-solid fa-coins"></i>
                        البيانات المالية
                    </div>
                    <div class="edit-form-grid">
                        <div class="modern-field">
                            <label>حساب المعمل</label>
                            <div class="input-wrapper money-input">
                                <i class="fa-solid fa-building"></i>
                                <input id="modal_edit_cost" type="number" step="0.01" value="${work.lab_cost ?? ""}" placeholder="0.00" oninput="calculateEditWorkTotal()">
                                <span>ج.م</span>
                            </div>
                        </div>
                        <div class="modern-field">
                            <label>التكلفة على المريض</label>
                            <div class="input-wrapper money-input">
                                <i class="fa-solid fa-money-bill-wave"></i>
                                <input id="modal_edit_paid" type="number" step="0.01" value="${work.patient_amount ?? ""}" placeholder="0.00" oninput="calculateEditWorkTotal()">
                                <span>ج.م</span>
                            </div>
                        </div>
                        <div class="modern-field">
                            <label>موعد التسليم</label>
                            <div class="input-wrapper">
                                <i class="fa-solid fa-calendar-days"></i>
                                <input id="modal_edit_date" type="date" value="${work.delivery_date || ""}">
                            </div>
                        </div>
                        <div class="modern-field">
                            <label>
                                <i class="fa-solid fa-layer-group"></i>
                                عدد الوحدات
                            </label>
                            <div class="quantity-apply-row">
                                <div class="quantity-control">
                                    <button type="button" class="quantity-btn" onclick="changeEditQuantity(-1)">
                                        <i class="fa-solid fa-minus"></i>
                                    </button>
                                    <input type="number" id="modal_edit_quantity" value="${work.quantity || 1}" min="1" step="1" oninput="calculateEditWorkTotal()">
                                    <button type="button" class="quantity-btn" onclick="changeEditQuantity(1)">
                                        <i class="fa-solid fa-plus"></i>
                                    </button>
                                </div>
                                <button type="button" class="apply-price-btn" onclick="applyEditTotalPrice()">
                                    <i class="fa-solid fa-calculator"></i> تطبيق السعر
                                </button>
                            </div>
                            <small class="quantity-help">اضغط "تطبيق السعر" لنقل الإجمالي إلى حقول الأسعار</small>
                        </div>
                    </div>
                    <div class="work-total-summary">
                        <div class="work-total-item">
                            <span>تكلفة المعمل الإجمالية</span>
                            <strong><span id="modal_edit_labCostTotal">0.00</span></strong>
                        </div>
                        <div class="work-total-item patient-total">
                            <span>إجمالي المريض</span>
                            <strong><span id="modal_edit_patientAmountTotal">0.00</span></strong>
                        </div>
                    </div>
                </div>

                <!-- Teeth Selection Section -->
                <div class="edit-form-section">
                    <div class="edit-section-title">
                        <i class="fa-solid fa-tooth"></i>
                        الأسنان المرتبطة
                    </div>
                    <div class="modern-field">
                        <label class="tooth-select-label">
                            <i class="fa-solid fa-tooth"></i>
                            اختر السن
                            <span class="optional-label">(اختياري)</span>
                        </label>
                        <div class="tooth-selector-container">
                            <button type="button" id="editOpenToothChartBtn" class="tooth-selector-btn" onclick="toggleEditToothChart()">
                                <span class="tooth-selector-btn-icon"><i class="fa-solid fa-tooth"></i></span>
                                <span class="tooth-selector-btn-content">
                                    <strong id="editToothSelectorText">اختيار الأسنان</strong>
                                    <small>اضغط لعرض مخطط الأسنان</small>
                                </span>
                                <i id="editToothSelectorArrow" class="fa-solid fa-chevron-down tooth-selector-arrow"></i>
                            </button>
                            <div id="editSelectedToothBadge" class="selected-tooth-badge" style="display:none;">
                                <div class="selected-tooth-icon"><i class="fa-solid fa-tooth"></i></div>
                                <div class="selected-tooth-info">
                                    <span>السن المحدد</span>
                                    <strong id="editSelectedToothDisplay">-</strong>
                                </div>
                                <button type="button" class="remove-tooth-btn" onclick="clearEditToothSelection()" title="إزالة السن"><i class="fa-solid fa-xmark"></i></button>
                            </div>
                            <div id="editToothChartPanel" class="tooth-chart-panel">
                                <div class="tooth-chart-header">
                                    <div><strong>مخطط الأسنان</strong><span>يمكنك اختيار أكثر من سن</span></div>
                                    <button type="button" class="close-tooth-chart" onclick="closeEditToothChart()" title="إغلاق"><i class="fa-solid fa-xmark"></i></button>
                                </div>
                                <div class="tooth-chart">
                                    <div class="jaw upper-jaw">
                                        <div class="quadrant q1">
                                            <div class="quadrant-label">الربع الأول</div>
                                            <div class="teeth-row">
                                                <div class="tooth" data-tooth="1.8">18</div><div class="tooth" data-tooth="1.7">17</div><div class="tooth" data-tooth="1.6">16</div><div class="tooth" data-tooth="1.5">15</div>
                                                <div class="tooth" data-tooth="1.4">14</div><div class="tooth" data-tooth="1.3">13</div><div class="tooth" data-tooth="1.2">12</div><div class="tooth" data-tooth="1.1">11</div>
                                            </div>
                                        </div>
                                        <div class="quadrant q2">
                                            <div class="quadrant-label">الربع الثاني</div>
                                            <div class="teeth-row">
                                                <div class="tooth" data-tooth="2.1">21</div><div class="tooth" data-tooth="2.2">22</div><div class="tooth" data-tooth="2.3">23</div><div class="tooth" data-tooth="2.4">24</div>
                                                <div class="tooth" data-tooth="2.5">25</div><div class="tooth" data-tooth="2.6">26</div><div class="tooth" data-tooth="2.7">27</div><div class="tooth" data-tooth="2.8">28</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="midline"><span>خط الوسط</span></div>
                                    <div class="jaw lower-jaw">
                                        <div class="quadrant q3">
                                            <div class="quadrant-label">الربع الثالث</div>
                                            <div class="teeth-row">
                                                <div class="tooth" data-tooth="3.8">38</div><div class="tooth" data-tooth="3.7">37</div><div class="tooth" data-tooth="3.6">36</div><div class="tooth" data-tooth="3.5">35</div>
                                                <div class="tooth" data-tooth="3.4">34</div><div class="tooth" data-tooth="3.3">33</div><div class="tooth" data-tooth="3.2">32</div><div class="tooth" data-tooth="3.1">31</div>
                                            </div>
                                        </div>
                                        <div class="quadrant q4">
                                            <div class="quadrant-label">الربع الرابع</div>
                                            <div class="teeth-row">
                                                <div class="tooth" data-tooth="4.1">41</div><div class="tooth" data-tooth="4.2">42</div><div class="tooth" data-tooth="4.3">43</div><div class="tooth" data-tooth="4.4">44</div>
                                                <div class="tooth" data-tooth="4.5">45</div><div class="tooth" data-tooth="4.6">46</div><div class="tooth" data-tooth="4.7">47</div><div class="tooth" data-tooth="4.8">48</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div id="editSelectedTeethContainer" class="selected-teeth-container"></div>
                        </div>
                        <small class="tooth-help-text"><i class="fa-solid fa-circle-info"></i> يمكنك حفظ التركيبة بدون تحديد سن</small>
                        <input type="hidden" id="modal_edit_toothNumber" value="${teethNumbers.join(",")}">
                    </div>
                </div>

                <!-- Notes Section -->
                <div class="edit-form-section">
                    <div class="edit-section-title"><i class="fa-solid fa-note-sticky"></i> ملاحظات</div>
                    <div class="modern-field full">
                        <div class="input-wrapper textarea-wrapper">
                            <i class="fa-solid fa-pen"></i>
                            <textarea id="modal_edit_notes" placeholder="اكتب الملاحظات...">${escapeHtml(work.notes || "")}</textarea>
                        </div>
                    </div>
                </div>

                <!-- Actions -->
                <div class="edit-modal-actions-v2">
                    <button class="edit-save-btn-v2" onclick="saveModalEdit(${work.id})"><i class="fa-solid fa-check"></i> حفظ التعديلات</button>
                    <button class="edit-cancel-btn-v2" onclick="closeEditModal()">إلغاء</button>
                </div>
            </div>
        </div>
    `;
    
    setTimeout(async () => {
        // إذا كان للتركيبة اسم ونوع محفوظ، نحمّل أنواعها ونحدد النوع
        if (work.work_name) {
            await loadEditWorkTypes(work.work_type);
        }
        
        document.querySelectorAll('#editWorkModal .tooth').forEach(tooth => {
            tooth.addEventListener('click', function() { handleEditToothClick(this); });
        });
        teethNumbers.forEach(t => {
            const el = document.querySelector(`#editWorkModal .tooth[data-tooth="${t}"]`);
            if (el) el.classList.add("selected");
        });
        updateEditSelectedTeethUI();
        calculateEditWorkTotal();
    }, 0);
    
    document.body.classList.add("modal-open");
}

/* ===== EDIT: Catalog Selects ===== */
async function loadEditWorkTypes(preselectedType) {
    const workName = document.getElementById("modal_edit_work")?.value;
    const typeSelect = document.getElementById("modal_edit_type");
    if (!typeSelect) return;

    if (!workName) {
        typeSelect.innerHTML = `<option value="">اختر النوع</option>`;
        return;
    }

    const { data: userData } = await supabaseClient.auth.getUser();
    const userId = userData.user?.id;

    const { data, error } = await supabaseClient
        .from("dental_works_catalog")
        .select("work_type")
        .eq("user_id", userId)
        .eq("work_name", workName)
        .order("work_type");

    if (error) {
        console.error(error);
        return;
    }

    typeSelect.innerHTML = `<option value="">اختر النوع</option>`;
    (data || []).forEach(item => {
        const selected = item.work_type === preselectedType ? 'selected' : '';
        typeSelect.innerHTML += `<option value="${escapeHtml(item.work_type)}" ${selected}>${escapeHtml(item.work_type)}</option>`;
    });

    // إذا كان هناك نوع محدد مسبقاً أو واحد فقط، نجلب الأسعار
    if (preselectedType || (data || []).length === 1) {
        fillEditWorkPrices();
    }
}

async function fillEditWorkPrices() {
    const workName = document.getElementById("modal_edit_work")?.value;
    const workType = document.getElementById("modal_edit_type")?.value;
    if (!workName || !workType) return;

    const { data: userData } = await supabaseClient.auth.getUser();
    const userId = userData.user?.id;

    const { data, error } = await supabaseClient
        .from("dental_works_catalog")
        .select("*")
        .eq("user_id", userId)
        .eq("work_name", workName)
        .eq("work_type", workType);

    if (error || !data || data.length === 0) return;

    const labCostInput = document.getElementById("modal_edit_cost");
    const patientAmountInput = document.getElementById("modal_edit_paid");

    const labCost = data[0].lab_cost || "";
    const patientAmount = data[0].patient_amount || "";

    if (labCostInput) {
        labCostInput.value = labCost;
        labCostInput.dataset.unitCost = labCost;
    }
    if (patientAmountInput) {
        patientAmountInput.value = patientAmount;
        patientAmountInput.dataset.unitCost = patientAmount;
    }

    calculateEditWorkTotal();
}

/* ===== EDIT: Quantity & Totals ===== */
function calculateEditWorkTotal() {
    const quantity = Math.max(1, parseInt(document.getElementById("modal_edit_quantity")?.value) || 1);
    const labCostInput = document.getElementById("modal_edit_cost");
    const patientAmountInput = document.getElementById("modal_edit_paid");

    const unitLabCost = parseFloat(labCostInput?.dataset.unitCost) || 0;
    const unitPatientAmount = parseFloat(patientAmountInput?.dataset.unitCost) || 0;

    const totalLabCost = unitLabCost * quantity;
    const totalPatientAmount = unitPatientAmount * quantity;

    const labTotalEl = document.getElementById("modal_edit_labCostTotal");
    const patientTotalEl = document.getElementById("modal_edit_patientAmountTotal");

    if (labTotalEl) labTotalEl.textContent = totalLabCost.toFixed(2);
    if (patientTotalEl) patientTotalEl.textContent = totalPatientAmount.toFixed(2);
}

function applyEditTotalPrice() {
    const quantity = Math.max(1, parseInt(document.getElementById("modal_edit_quantity")?.value) || 1);
    const labCostInput = document.getElementById("modal_edit_cost");
    const patientAmountInput = document.getElementById("modal_edit_paid");

    const unitLabCost = parseFloat(labCostInput?.dataset.unitCost) || 0;
    const unitPatientAmount = parseFloat(patientAmountInput?.dataset.unitCost) || 0;

    if (unitLabCost <= 0 && unitPatientAmount <= 0) {
        showToast("⚠️ اختر التركيبة أولاً لجلب الأسعار من الكتالوج");
        return;
    }

    const expectedLabTotal = unitLabCost * quantity;
    const expectedPatientTotal = unitPatientAmount * quantity;

    const currentLabCost = parseFloat(labCostInput?.value) || 0;
    const currentPatientAmount = parseFloat(patientAmountInput?.value) || 0;

    let applied = false;

    if (unitLabCost > 0 && currentLabCost !== expectedLabTotal) {
        labCostInput.value = expectedLabTotal.toFixed(2);
        applied = true;
    }
    if (unitPatientAmount > 0 && currentPatientAmount !== expectedPatientTotal) {
        patientAmountInput.value = expectedPatientTotal.toFixed(2);
        applied = true;
    }

    if (!applied) {
        showToast("ℹ️ الإجمالي مطابق للكمية الحالية");
        return;
    }

    const labTotalEl = document.getElementById("modal_edit_labCostTotal");
    const patientTotalEl = document.getElementById("modal_edit_patientAmountTotal");
    if (labTotalEl) labTotalEl.textContent = expectedLabTotal.toFixed(2);
    if (patientTotalEl) patientTotalEl.textContent = expectedPatientTotal.toFixed(2);

    showToast(`✅ تم تطبيق السعر: ${quantity} وحدة × السعر = الإجمالي`);

    [labCostInput, patientAmountInput].forEach(input => {
        if (input) {
            input.style.transition = "box-shadow .3s ease";
            input.style.boxShadow = "0 0 0 3px rgba(139,92,246,.3)";
            setTimeout(() => input.style.boxShadow = "", 1000);
        }
    });
}

function changeEditQuantity(amount) {
    const input = document.getElementById("modal_edit_quantity");
    if (!input) return;
    let v = (parseInt(input.value) || 1) + amount;
    if (v < 1) v = 1;
    input.value = v;
    calculateEditWorkTotal();
}

/* ===== EDIT: Tooth Selection ===== */
function toggleEditToothChart() {
    const panel = document.getElementById("editToothChartPanel");
    const arrow = document.getElementById("editToothSelectorArrow");
    const btn = document.getElementById("editOpenToothChartBtn");
    if (!panel) return;
    if (panel.classList.contains("open")) { closeEditToothChart(); }
    else { panel.classList.add("open"); btn?.classList.add("open"); arrow?.classList.add("open"); }
}

function closeEditToothChart() {
    document.getElementById("editToothChartPanel")?.classList.remove("open");
    document.getElementById("editOpenToothChartBtn")?.classList.remove("open");
    document.getElementById("editToothSelectorArrow")?.classList.remove("open");
}

function handleEditToothClick(el) {
    if (!el) return;
    const t = el.dataset.tooth;
    const i = selectedEditTeeth.indexOf(t);
    if (i !== -1) { selectedEditTeeth.splice(i, 1); el.classList.remove("selected"); }
    else { selectedEditTeeth.push(t); el.classList.add("selected"); }
    updateEditSelectedTeethUI();
}

function updateEditSelectedTeethUI() {
    const hidden = document.getElementById("modal_edit_toothNumber");
    const container = document.getElementById("editSelectedTeethContainer");
    const badge = document.getElementById("editSelectedToothBadge");
    const display = document.getElementById("editSelectedToothDisplay");
    const text = document.getElementById("editToothSelectorText");
    if (hidden) hidden.value = selectedEditTeeth.join(",");
    if (selectedEditTeeth.length === 0) {
        if (badge) badge.style.display = "none";
        if (text) text.textContent = "اختيار الأسنان";
        if (container) container.innerHTML = "";
        return;
    }
    if (text) text.textContent = selectedEditTeeth.length + " أسنان محددة";
    if (badge) badge.style.display = "flex";
    if (display) display.textContent = selectedEditTeeth.map(t => t.replace(".", "")).join(" ، ");
    if (container) {
        container.innerHTML = selectedEditTeeth.map(tooth => {
            const n = tooth.replace(".", "");
            return `<div class="selected-tooth-chip" data-tooth="${tooth}">
                <div class="selected-chip-icon"><i class="fa-solid fa-tooth"></i></div>
                <strong>${n}</strong>
                <button type="button" onclick="removeEditSelectedTooth('${tooth}')" title="إزالة السن"><i class="fa-solid fa-xmark"></i></button>
            </div>`;
        }).join("");
    }
}

function removeEditSelectedTooth(tooth) {
    const i = selectedEditTeeth.indexOf(tooth);
    if (i === -1) return;
    selectedEditTeeth.splice(i, 1);
    const el = document.querySelector('#editWorkModal .tooth[data-tooth="' + tooth + '"]');
    if (el) el.classList.remove("selected");
    updateEditSelectedTeethUI();
}

function clearEditToothSelection() {
    selectedEditTeeth = [];
    document.querySelectorAll('#editWorkModal .tooth.selected').forEach(t => t.classList.remove("selected"));
    updateEditSelectedTeethUI();
}

function closeEditModal() {
    selectedEditTeeth = [];
    const modal = document.getElementById("editWorkModal");
    if (modal) modal.remove();
    document.body.classList.remove("modal-open");
}

async function saveModalEdit(id) {
    const payload = {
        doctor_name: document.getElementById("modal_edit_doctor").value.trim() || null,
        patient_name: document.getElementById("modal_edit_patient").value.trim() || null,
        work_name: document.getElementById("modal_edit_work")?.value?.trim() || null,
        work_type: document.getElementById("modal_edit_type")?.value?.trim() || null,
        lab_cost: document.getElementById("modal_edit_cost").value ? parseFloat(document.getElementById("modal_edit_cost").value) : null,
        patient_amount: document.getElementById("modal_edit_paid").value ? parseFloat(document.getElementById("modal_edit_paid").value) : null,
        delivery_date: document.getElementById("modal_edit_date").value || null,
        quantity: Math.max(1, parseInt(document.getElementById("modal_edit_quantity")?.value) || 1),
        notes: document.getElementById("modal_edit_notes").value.trim() || null
    };

    const { error } = await supabaseClient.from("lab_works").update(payload).eq("id", id);
    if (error) { showToast("حدث خطأ أثناء حفظ التعديلات:\n" + error.message); return; }

    const toothStr = document.getElementById("modal_edit_toothNumber")?.value?.trim() || null;
    const toothNumbers = toothStr ? toothStr.split(",").map(t => t.trim()).filter(Boolean) : [];
    await supabaseClient.from("lab_work_teeth").delete().eq("lab_work_id", id);
    
    if (toothNumbers.length > 0) {
        const { data: w } = await supabaseClient.from("lab_works").select("patient_id").eq("id", id).single();
        const pId = w?.patient_id;
        const teethPayload = toothNumbers.map(tooth => ({ lab_work_id: id, patient_id: pId, tooth_number: tooth }));
        const { error: te } = await supabaseClient.from("lab_work_teeth").insert(teethPayload);
        if (te) showToast("⚠️ تم حفظ التركيبة، ولكن حدث خطأ أثناء حفظ الأسنان");
    }

    closeEditModal();
    await loadWorks();
    await loadDashboard();

    // التمرير لوسط التركيبة المعدلة لمراجعة التعديل
    setTimeout(() => {
        scrollToWorkById(id, "center");
    }, 100);

    showToast("✅ Changes saved successfully");
}
/* =========================
   DASHBOARD
========================= */
async function loadDashboard() {
    const startDate = document.getElementById("dashboardStartDate")?.value || "";
    const endDate = document.getElementById("dashboardEndDate")?.value || "";

    if (startDate && endDate && startDate > endDate) {
        showToast("❌ تاريخ البداية يجب أن يكون قبل تاريخ النهاية");
        return;
    }

    let query = supabaseClient.from("lab_works").select("*").eq("lab_id", labId);

    if (startDate) query = query.gte("created_at", `${startDate}T00:00:00`);
    if (endDate) {
        const nextDay = new Date(`${endDate}T00:00:00`);
        nextDay.setDate(nextDay.getDate() + 1);
        query = query.lt("created_at", nextDay.toISOString());
    }

    const { data, error } = await query;
    if (error) {
        console.error("DASHBOARD ERROR:", error);
        return;
    }

    const works = data || [];
    let totalCost = 0, totalRevenue = 0, received = 0, pending = 0, overdue = 0;

    const now = new Date();

    works.forEach(w => {
        totalCost += Number(w.lab_cost || 0);
        totalRevenue += Number(w.patient_amount || 0);

        if (w.received) {
            received++;
        } else {
            // التحقق من حالة التركيبة: متأخرة أم منتظرة (بدون مقارنة الوقت)
            const deliveryDate = w.delivery_date ? new Date(w.delivery_date) : null;
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const deliveryDateOnly = deliveryDate ? new Date(deliveryDate.getFullYear(), deliveryDate.getMonth(), deliveryDate.getDate()) : null;
            if (deliveryDateOnly && deliveryDateOnly < today) {
                // فات موعد الاستلام بيوم كامل على الأقل ولم تُستلم → متأخرة
                overdue++;
            } else {
                // موعد اليوم أو مستقبلي أو لا يوجد تاريخ → منتظرة
                pending++;
            }
        }
    });

    const profit = totalRevenue - totalCost;
    const dash = document.getElementById("dash");
    if (!dash) return;

    dash.innerHTML = `
        <div class="analytics-card blue">
            <div class="analytics-icon"><i class="fa-solid fa-tooth"></i></div>
            <div class="analytics-info"><span>إجمالي التركيبات</span><strong>${works.length}</strong></div>
        </div>
        <div class="analytics-card orange">
            <div class="analytics-icon"><i class="fa-solid fa-flask"></i></div>
            <div class="analytics-info"><span>حساب المعمل</span><strong>${totalCost.toFixed(2)}</strong></div>
        </div>
        <div class="analytics-card cyan">
            <div class="analytics-icon"><i class="fa-solid fa-money-bill-wave"></i></div>
            <div class="analytics-info"><span>المحصل من المرضى</span><strong>${totalRevenue.toFixed(2)}</strong></div>
        </div>
        <div class="analytics-card green">
            <div class="analytics-icon"><i class="fa-solid fa-chart-line"></i></div>
            <div class="analytics-info"><span>صافي الربح</span><strong>${profit.toFixed(2)}</strong></div>
        </div>
        <div class="analytics-mini"><i class="fa-solid fa-circle-check"></i><span>تم الاستلام</span><strong>${received}</strong></div>
        <div class="analytics-mini pending"><i class="fa-solid fa-clock"></i><span>قيد الانتظار</span><strong>${pending}</strong></div>
        <div class="analytics-mini overdue"><i class="fa-solid fa-triangle-exclamation"></i><span>متأخرة</span><strong>${overdue}</strong></div>
    `;
}
function resetDashboardFilter() {
    const start = document.getElementById("dashboardStartDate");
    const end = document.getElementById("dashboardEndDate");
    if (start) start.value = "";
    if (end) end.value = "";
    loadDashboard();
}


/* =========================
   EVENT LISTENERS
========================= */
document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".tooth").forEach(tooth => {
        tooth.addEventListener("click", function(e) {
            e.preventDefault();
            e.stopPropagation();
            handleToothClick(this);
        });
    });

    const patientInput = document.getElementById("patientName");
    const selectedInput = document.getElementById("selectedPatientId");

    if (patientInput) {
        patientInput.addEventListener("input", () => {
            if (selectedInput) selectedInput.value = "";
            patientInput.classList.remove("patient-selected");
            searchPatientsForWork();
        });
        patientInput.addEventListener("focus", () => {
            if (patientInput.value.trim()) searchPatientsForWork();
        });
    }

    document.addEventListener("click", event => {
        const suggestions = document.getElementById("patientSuggestions");
        if (!suggestions) return;
        if (!patientInput?.contains(event.target) && !suggestions.contains(event.target)) {
            suggestions.classList.remove("show");
        }
    });

    document.addEventListener("keydown", function(event) {
        if (event.key === "Escape") {
            closeToothChart();
            closeEditModal();
            closeWorkDetails();
            closeMoreMenu();
        }
    });

    document.addEventListener("toggle", function(e) {
        const details = e.target;
        if (details.tagName !== "DETAILS" || !details.open) return;
        setTimeout(() => {
            details.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
        }, 150);
    }, true);

    loadDoctorsForProsthesis();
    loadPatientsForWork();
    loadWorkNames();
});


/* =========================
   INIT
========================= */
window.onload = async () => {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        window.location.href = "login.html";
        return;
    }
    currentUserId = user.id;
    
    await loadLabInfo();
    await loadWorks();           // ← تحميل التركيبات أولاً
    
    // ← التمرير للتركيبة بعد اكتمال التحميل (في أول الصفحة)
    if (targetWorkId) {
        scrollToWorkById(targetWorkId, "start");
    }
    
    await loadDashboard();
};