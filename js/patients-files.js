let currentUserId = null;

let allPatients = [];

let patientsWithDebt = {};

async function initUser() {
    try {
        const { data } = await supabaseClient.auth.getUser();
        currentUserId = data?.user?.id ?? null;
    } catch (e) {
        currentUserId = null;
    }
    return currentUserId;
}

async function getUserId() {
    if (currentUserId) return currentUserId;
    return await initUser();
}

async function logout() {
    await supabaseClient.auth.signOut();
    window.location.replace("login.html");
}



function calculateAge(birthDate) {
    if (!birthDate) return "-";
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
}

function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.innerText = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
}

function formatDateTime(dateStr, options) {
    const d = new Date(dateStr);
    if (isNaN(d)) return "-";
    return d.toLocaleString("en-GB", options);
}

function getDayBounds(offsetDays = 0) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() + offsetDays);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { start, end };
}


async function loadPatients() {
    const userId = await getUserId();
    if (!userId) return;

    try {
        const [{ data: patients, error: pErr }, { data: services, error: sErr }] = await Promise.all([
            supabaseClient.from("patients").select("*").eq("user_id", userId).order("id", { ascending: false }),
            supabaseClient.from("patientt_services").select("patient_id, remain_amount").eq("user_id", userId)
        ]);

        if (pErr) { console.error("Patients error:", pErr); return; }

        patientsWithDebt = {};
        services?.forEach(s => {
            const remain = Number(s.remain_amount || 0);
            if (remain > 0) {
                patientsWithDebt[s.patient_id] = (patientsWithDebt[s.patient_id] || 0) + remain;
            }
        });

        allPatients = patients || [];
        renderTable(allPatients);

        const totalEl = document.getElementById("totalPatients");
        if (totalEl) totalEl.innerText = allPatients.length;
    } catch (err) {
        console.error("loadPatients error:", err);
    }
}
function renderTable(patients) {
    const tbody = document.querySelector("#patientsTable tbody");
    if (!tbody) return;

    const html = patients.map(p => {
        const debt = patientsWithDebt[p.id] || 0;
        const hasDebt = debt > 0;
        const badge = hasDebt
            ? `<span style="background:linear-gradient(135deg,#ef4444,#dc2626);color:white;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;margin-right:8px;display:inline-block;">
                 💰 <span data-i18n="380">Remaining</span> ${debt} EGP
               </span>`
            : "";

        return `
            <tr>
                <td style="color:${hasDebt ? '#ef4444' : 'inherit'};font-weight:${hasDebt ? '700' : '400'}">
                    ${p.full_name || "-"} ${badge}
                </td>
                <td>${p.birth_date ? calculateAge(p.birth_date) + ' <span data-i18n="381">years</span>' : "-"}</td>
                <td>
                    <a href="patient-file.html?id=${p.id}" class="open-file-btn">
                        <i class="fa-solid fa-folder-open"></i> <span data-i18n="382">Open File</span>
                    </a>
                </td>
            </tr>
        `;
    }).join("");

    tbody.innerHTML = html;

    // تطبيق الترجمة على العناصر المضافة ديناميكياً
    if (typeof applyTranslations === 'function') applyTranslations();
}

function searchPatients() {
    const val = document.getElementById("searchInput")?.value.toLowerCase() || "";
    const filtered = allPatients.filter(p =>
        (p.full_name || "").toLowerCase().includes(val) ||
        (p.phone || "").toLowerCase().includes(val) ||
        (p.address || "").toLowerCase().includes(val)
    );
    renderTable(filtered);
}

function openAddPatient() {
    window.location.href = "patients.html";
}




   const details =
    document.getElementById(
        "patientsFilesDetails"
    );

    const text =
    document.getElementById(
        "patientsFilesText"
    );

    if(details && text){

        details.addEventListener(
            "toggle",
            ()=>{

                text.textContent =
                details.open
                ? "Hide Patients Files"
                : "Show Patients Files";

            }
        );

    }





document.addEventListener(
    "DOMContentLoaded",
    async () => {

        await initUser();

        await loadPatients();

    }
);