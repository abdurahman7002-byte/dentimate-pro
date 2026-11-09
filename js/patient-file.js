


/* =========================
   CLOUDINARY UPLOAD
========================= */

async function uploadToCloudinary(file){

    const formData = new FormData();

    formData.append("file", file);
    formData.append("upload_preset", "clinic_files");

    const response = await fetch(
        "https://api.cloudinary.com/v1_1/dflfcteo2/auto/upload",
        {
            method: "POST",
            body: formData
        }
    );

    const data = await response.json();

    if(data.error){
        throw new Error(data.error.message);
    }

    return data.secure_url;
}

window.selectedPaymentServiceId = null;
window.currentHistoryServiceId = null;

// primary chart
function calculateAge(birthDate){

    if(!birthDate) return 99;

    const today = new Date();

    const birth =
        new Date(birthDate);

    let age =
        today.getFullYear()
        - birth.getFullYear();

    const m =
        today.getMonth()
        - birth.getMonth();

    if(
        m < 0 ||
        (
            m === 0 &&
            today.getDate() < birth.getDate()
        )
    ){
        age--;
    }

    return age;
}




const params = new URLSearchParams(window.location.search);
const patientId = params.get("id");

if(!patientId){
    alert("Patient ID Missing");
    throw new Error("Missing ID");
}

/* =========================
   LOAD PATIENT
========================= */

async function loadPatient(){

    const { data, error } = await supabaseClient
        .from("patients")
        .select("*")
        .eq("id", patientId)
        .single();

    if(error){

        console.log(error);

        return;

    }


    /* =====================================================
       SAVE CURRENT PATIENT ID
       مهم جدًا لربط التركيبات بملف المريض
    ===================================================== */

    window.currentPatientId = data.id;


    console.log(
        "✅ Current Patient ID:",
        window.currentPatientId
    );


    /* =========================
       PRIMARY TEETH CHECK
    ========================= */

    const age =
        calculateAge(data.birth_date);


    if(age <= 13){

        document.getElementById(
            "primaryChartCard"
        ).style.display = "block";

        loadPrimaryToothChart();

    }

    else{

        document.getElementById(
            "primaryChartCard"
        ).style.display = "none";

    }


 /* =========================
   PATIENT INFO  (المعدل)
========================= */

document.getElementById("patientInfo").innerHTML = `
<div class="patient-profile">
    <div class="patient-header">
        <div class="patient-avatar">
            <i class="fa-solid fa-user"></i>
        </div>
        <div style="flex:1">
            <input id="inline_name" class="inline-input patient-name-input" 
                value="${data.full_name || ''}" readonly>
            <span class="patient-status">Active Patient</span>
        </div>
        <div class="patient-actions">
            <button id="deletePatientBtn" onclick="deletePatient()" 
                class="action-circle delete-btn" title="Delete Patient">
                <i class="fa-solid fa-trash"></i>
            </button>
            <button id="editPatientBtn" onclick="enableInlineEdit()" 
                class="action-circle edit-btn" title="Edit Patient">
                <i class="fa-solid fa-pen"></i>
            </button>
            <button id="savePatientBtn" onclick="saveEdit()" 
                class="action-circle save-btn" title="Save" style="display:none">
                <i class="fa-solid fa-floppy-disk"></i>
            </button>
            <button id="cancelPatientBtn" onclick="cancelInlineEdit()" 
                class="action-circle cancel-btn" title="Cancel" style="display:none">
                <i class="fa-solid fa-arrow-rotate-left"></i>
            </button>
        </div>
    </div>

    <div class="patient-grid">
        <div class="info-box">
            <span>Phone</span>
            <input id="inline_phone" class="inline-input" 
                value="${data.phone || ''}" readonly>
        </div>

        <div class="info-box">
            <span>Gender</span>
            <select id="inline_gender" class="inline-input" disabled>
                <option value="">-</option>
                <option value="Male" ${data.gender === 'Male' ? 'selected' : ''}>Male</option>
                <option value="Female" ${data.gender === 'Female' ? 'selected' : ''}>Female</option>
            </select>
        </div>

        <!-- ✅ حقل العمر المعدل -->
        <div class="info-box">
            <span>Birth Date</span>
            <input type="date" id="inline_birth_date" class="inline-input" 
                value="${data.birth_date || ''}" readonly>
            <span id="display_age" class="age-display" style="
                font-size: 11px; 
                color: #94a3b8; 
                margin-top: 4px;
                display: block;
            ">
                ${calculateAge(data.birth_date)} Years
            </span>
        </div>

        <div class="info-box">
            <span>Address</span>
            <textarea style="min-height:55px; resize:vertical;" 
                id="inline_address" class="inline-input textarea-inline" 
                readonly>${data.address || ''}</textarea>
        </div>

        <div class="info-box">
            <span>Registred At</span>
            <input id="inline_registration" type="date" class="inline-input" 
                value="${data.visit_date || ''}" readonly>
        </div>

        <div class="info-box full">
            <span>Medical History</span>
            <textarea id="inline_medical_history" 
                class="inline-input textarea-inline" readonly>${data.medical_history || ''}</textarea>
        </div>

        <div class="info-box full">
            <span>Dental History</span>
            <textarea id="inline_dental_history" 
                class="inline-input textarea-inline" readonly>${data.dental_history || ''}</textarea>
        </div>
    </div>
</div>
`;
/* =====================================================
   LOAD PATIENT PROSTHESIS
   يتم تحميل التركيبات بمجرد فتح ملف المريض
===================================================== */

await loadPatientProsthesis();

}
/* =========================
   ENABLE INLINE EDIT
========================= */

function enableInlineEdit(){
    document.querySelectorAll(".inline-input").forEach(el => {
        // منع تعديل Registration
        if(el.id === "inline_registration") return;
        
        if(el.tagName === "SELECT"){
            el.disabled = false;
        } else {
            el.removeAttribute("readonly");
        }
        el.classList.add("editing");
    });

    document.getElementById("editPatientBtn").style.display = "none";
    document.getElementById("savePatientBtn").style.display = "flex";
    document.getElementById("cancelPatientBtn").style.display = "flex";
}


async function saveEdit(){

    const { data: userData } =
        await supabaseClient.auth.getUser();

    const currentUserId =
        userData?.user?.id;

    if(!currentUserId){
        alert("User not logged in");
        return;
    }


    const { data, error } =
        await supabaseClient
            .from("patients")
            .update({

                full_name:
                    document.getElementById("inline_name").value || null,

                phone:
                    document.getElementById("inline_phone").value || null,

                address:
                    document.getElementById("inline_address").value || null,

                gender:
                    document.getElementById("inline_gender").value || null,

                /* =========================
                   BIRTH DATE
                   ========================= */

                birth_date:
                    document.getElementById("inline_birth_date").value || null,

                medical_history:
                    document.getElementById("inline_medical_history").value || null,

                dental_history:
                    document.getElementById("inline_dental_history").value || null
            })

            .eq("id", patientId)
            .eq("user_id", currentUserId)
            .select();


    console.log("RESULT:", data, error);


    if(error){

        console.error("SAVE PATIENT ERROR:", error);

        alert(error.message);

        return;
    }


    if(!data || data.length === 0){

        alert(
            "No rows updated (check user_id or RLS)"
        );

        return;
    }


    /* =========================
       SUCCESS
       ========================= */

    showToast("Updated Successfully");


    /* =========================
       UPDATE AGE DISPLAY
       ========================= */

    const birthDate =
        document.getElementById("inline_birth_date").value;

    const newAge =
        calculateAge(birthDate);

    const ageElement =
        document.getElementById("display_age");

    if(ageElement){

        ageElement.textContent =
            birthDate
                ? `${newAge} Years`
                : "-";
    }


    /* =========================
       EXIT EDIT MODE
       ========================= */

    document
        .querySelectorAll(".inline-input")
        .forEach(el => {

            if(el.tagName === "SELECT"){

                el.disabled = true;

            } else {

                el.setAttribute("readonly", true);
            }

            el.classList.remove("editing");
        });


    document.getElementById(
        "editPatientBtn"
    ).style.display = "flex";


    document.getElementById(
        "savePatientBtn"
    ).style.display = "none";


    document.getElementById(
        "cancelPatientBtn"
    ).style.display = "none";


    /* =========================
       RELOAD PATIENT
       ========================= */

    await loadPatient();
}

/* =========================
   DELETE PATIENT
========================= */

async function deletePatient(){

    const confirmDelete =
        await showConfirm("Are you sure you want to delete this patient?");

    if(!confirmDelete) return;

    try{

        /* =========================
           1 - DELETE SERVICES (IMPORTANT)
        ========================= */
        const { error: servicesError } = await supabaseClient
            .from("patientt_services")
            .delete()
            .eq("patient_id", patientId);

        if(servicesError){
            alert(servicesError.message);
            return;
        }

        /* =========================
           2 - DELETE VISITS (if exists)
        ========================= */
        await supabaseClient
            .from("patient_visits")
            .delete()
            .eq("patient_id", patientId);

        /* =========================
           3 - DELETE NOTES (if exists)
        ========================= */
        await supabaseClient
            .from("patient_notes")
            .delete()
            .eq("patient_id", patientId);

        /* =========================
           4 - DELETE PATIENT
        ========================= */

        const { error: patientError } = await supabaseClient
            .from("patients")
            .delete()
            .eq("id", patientId);

        if(patientError){
            alert(patientError.message);
            return;
        }

        showToast("Patient Deleted");

        /* مهم: تحديث الداشبورد */
        window.location.href = "dashboard.html";

    }catch(err){
        console.log(err);
        alert("Error deleting patient");
    }
}

/* =========================
   INIT
========================= */

loadPatient();
loadImages();
loadNotes();
loadVisits();

loadToothChart();
/* =========================
   NAV
========================= */

function goToDashboard(){
    window.location.href = "dashboard.html";
}



function calculateAge(birthDate){

    if(!birthDate) return "-";

    const today = new Date();

    const birth = new Date(birthDate);

    let age = today.getFullYear() - birth.getFullYear();

    const monthDiff =
        today.getMonth() - birth.getMonth();

    if(
        monthDiff < 0 ||
        (
            monthDiff === 0 &&
            today.getDate() < birth.getDate()
        )
    ){
        age--;
    }

    return age;
}
/* =========================
CANCEL INLINE EDIT
========================= */

function cancelInlineEdit(){

    loadPatient();

    document
        .querySelectorAll(".inline-input")
        .forEach(el=>{

            if(el.tagName === "SELECT"){

                el.disabled = true;

            }else{

                el.setAttribute("readonly", true);

            }

            el.classList.remove("editing");

        });

    document.getElementById(
        "editPatientBtn"
    ).style.display = "flex";

    document.getElementById(
        "savePatientBtn"
    ).style.display = "none";

    document.getElementById(
        "cancelPatientBtn"
    ).style.display = "none";

}



/* =========================
   SAVE NOTE
========================= */

/* =========================
   SAVE NOTE
========================= */

async function saveNote(){

    const note =
    document.getElementById(
        "treatmentNote"
    ).value.trim();

    if(!note){

        alert(
            "Write note first"
        );

        return;
    }

    if(!window.currentVisitId){

        alert(
            "Please select or create a visit first"
        );

        return;
    }

    const { data:userData } =
    await supabaseClient
    .auth
    .getUser();

    const userId =
    userData.user.id;

    const { error } =
    await supabaseClient
    .from("patient_notes")
    .insert([{

        patient_id:
        patientId,

        visit_id:
        window.currentVisitId,

        note:
        note,

        user_id:
        userId

    }]);

    if(error){

        alert(
            error.message
        );

        return;
    }

    document.getElementById(
        "treatmentNote"
    ).value = "";

    showToast(
        "Note Saved"
    );

    loadNotes();

}

/* =========================
   LOAD NOTES
========================= */

async function loadNotes(){

    const container =
    document.getElementById(
        "notesContainer"
    );

    if(!container){

        console.log(
            "notesContainer not found"
        );

        return;
    }

    if(!window.currentVisitId){

        container.innerHTML = `
        <div class="no-notes">
            <i class="fa-solid fa-calendar-check"></i>
            <br><br>
            Select a visit first
        </div>
        `;

        return;
    }

    const {
        data,
        error
    } =
    await supabaseClient
    .from("patient_notes")
    .select("*")
    .eq(
        "patient_id",
        patientId
    )
    .eq(
        "visit_id",
        window.currentVisitId
    )
    .order(
        "id",
        {
            ascending:false
        }
    );

    if(error){

        console.log(
            error
        );

        return;
    }

    container.innerHTML = "";

    if(!data || data.length === 0){

        container.innerHTML = `
        <div class="no-notes">

            <i class="fa-solid fa-note-sticky"></i>

            <br><br>

            No Treatment Notes

        </div>
        `;

        return;
    }

    data.forEach(n=>{

        container.innerHTML += `

        <div class="note-card">

            <div class="note-header">

                <div class="note-title">

                    <i class="fa-solid fa-notes-medical"></i>

                    Treatment Note

                </div>

                <div class="note-date">

                    <i class="fa-solid fa-clock"></i>

                    ${new Date(
                        n.created_at
                    ).toLocaleString(
                        "en-US",
                        {
                            timeZone:
                            "Africa/Cairo",

                            year:
                            "numeric",

                            month:
                            "2-digit",

                            day:
                            "2-digit",

                            hour:
                            "2-digit",

                            minute:
                            "2-digit",

                            hour12:
                            true
                        }
                    )}

                </div>

            </div>

            <textarea
                id="note-${n.id}"
                class="note-textarea"
            >${n.note}</textarea>

            <div class="note-actions">

                <button
                    onclick="updateNote(${n.id})"
                    class="update-note-btn"
                >
                    Update
                </button>

                <button
                    onclick="deleteNote(${n.id})"
                    class="delete-note-btn"
                >
                    Delete
                </button>

            </div>

        </div>

        `;

    });

}

/* =========================
   DELETE NOTE
========================= */

async function deleteNote(id){

    if(
        !await showConfirm(
            "Delete this note?"
        )
    ) return;

    const { error } =
    await supabaseClient
    .from("patient_notes")
    .delete()
    .eq(
        "id",
        id
    );

    if(error){

        alert(
            error.message
        );

        return;
    }

    showToast(
        "Note Deleted"
    );

    loadNotes();

}

/**
 * Visit Duration Slider Manager
 * Attach to any modal by calling: initVisitDurationSlider(config)
 */
function initVisitDurationSlider({ startId, endId, sliderId, labelId, defaultMinutes = 30 }) {
    const startInput   = document.getElementById(startId);
    const endInput     = document.getElementById(endId);
    const slider       = document.getElementById(sliderId);
    const label        = document.getElementById(labelId);

    if (!startInput || !endInput || !slider) return;

    // Config
    const STEP  = 15;   // 15 minutes
    const MIN   = 15;   // minimum 15 min
    const MAX   = 240;  // maximum 4 hours (240 min)

    slider.min   = MIN;
    slider.max   = MAX;
    slider.step  = STEP;
    slider.value = defaultMinutes;

    // Helper: format minutes to readable Arabic/English string
    function formatDuration(minutes) {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        if (h === 0) return `${m} دقيقة`;
        if (m === 0) return `${h} ساعة`;
        return `${h}:${m.toString().padStart(2,'0')} ساعة`;
    }

    // Helper: add minutes to a datetime-local value
    function addMinutesToInput(inputVal, minutesToAdd) {
        if (!inputVal) return '';
        const d = new Date(inputVal);
        if (isNaN(d)) return '';
        d.setMinutes(d.getMinutes() + minutesToAdd);
        // Convert back to yyyy-MM-ddThh:mm (local)
        const pad = n => n.toString().padStart(2,'0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    function updateEndTime() {
        const minutes = parseInt(slider.value, 10);
        if (label) label.textContent = formatDuration(minutes);
        if (startInput.value) {
            endInput.value = addMinutesToInput(startInput.value, minutes);
        }
    }

    // Events
    slider.addEventListener('input', updateEndTime);
    startInput.addEventListener('change', updateEndTime);

    // Initial run
    updateEndTime();
}

// =========================================================
//  Initialize each modal when it opens (call inside your open functions)
// =========================================================
function initRescheduleSlider() {
    initVisitDurationSlider({
        startId: 'rescheduleAppointmentStart',
        endId:   'rescheduleAppointmentEnd',
        sliderId:'rescheduleDurationSlider',
        labelId: 'rescheduleDurationLabel',
        defaultMinutes: 30
    });
}

function initRelatedSlider() {
    initVisitDurationSlider({
        startId: 'relatedVisitStart',
        endId:   'relatedVisitEnd',
        sliderId:'relatedDurationSlider',
        labelId: 'relatedDurationLabel',
        defaultMinutes: 30
    });
}

function initAddVisitSlider() {
    initVisitDurationSlider({
        startId: 'appointmentStart',
        endId:   'appointmentEnd',
        sliderId:'addVisitDurationSlider',
        labelId: 'addVisitDurationLabel',
        defaultMinutes: 30
    });
}

function initBookingSlider() {
    initVisitDurationSlider({
        startId: 'appointmentStart',
        endId:   'appointmentEnd',
        sliderId:'bookingDurationSlider',
        labelId: 'bookingDurationLabel',
        defaultMinutes: 30
    });
}
/* =========================
   VISITS
========================= */
async function saveVisit(){

    /* =====================================================
       GET CURRENT USER
    ===================================================== */

    const {
        data: userData,
        error: userError
    } =
    await supabaseClient
        .auth
        .getUser();


    if(
        userError ||
        !userData ||
        !userData.user
    ){

        alert(
            "تعذر تحديد المستخدم الحالي"
        );

        return;

    }


    const userId =
        userData.user.id;


    /* =====================================================
       GET DEPARTMENT
    ===================================================== */

    const departmentSelect =
        document.getElementById(
            "departmentSelect"
        );


    if(!departmentSelect){

        alert(
            "لم يتم العثور على قائمة العيادات"
        );

        return;

    }


    const departmentId =
        departmentSelect.value;


    if(!departmentId){

        alert(
            "اختر العيادة"
        );

        return;

    }


    const departmentName =
        departmentSelect.options[
            departmentSelect.selectedIndex
        ].text;


    /* =====================================================
       GET APPOINTMENT
    ===================================================== */

    const appointmentStart =
        document.getElementById(
            "appointmentStart"
        ).value;


    const appointmentEnd =
        document.getElementById(
            "appointmentEnd"
        ).value;


    if(
        !appointmentStart ||
        !appointmentEnd
    ){

        alert(
            "حدد موعد البداية والنهاية"
        );

        return;

    }


    /* =====================================================
       PREVENT PAST VISITS
    ===================================================== */

    const now =
        new Date();


    const start =
        new Date(
            appointmentStart
        );


    const end =
        new Date(
            appointmentEnd
        );


    if(start < now){

        alert(
            "لا يمكن إنشاء زيارة في وقت سابق للوقت الحالي"
        );

        return;

    }


    /* =====================================================
       VALIDATE END TIME
    ===================================================== */

    if(end <= start){

        alert(
            "وقت النهاية يجب أن يكون بعد وقت البداية"
        );

        return;

    }


    /* =====================================================
       CHECK OVERLAP
       
       نفس منطق المواعيد الحالي
    ===================================================== */

    const {
        data: existingVisits,
        error: overlapError
    } =
    await supabaseClient

        .from(
            "patient_visits"
        )

        .select(`
            id,
            appointment_start,
            appointment_end,
            visit_result
        `)

        .eq(
            "user_id",
            userId
        )

        .eq(
            "department_id",
            departmentId
        )

        .neq(
            "visit_result",
            "cancelled"
        )

        .eq(
            "is_deleted",
            false
        );


    if(overlapError){

        console.error(
            "Overlap check error:",
            overlapError
        );

        alert(
            overlapError.message
        );

        return;

    }


    const hasOverlap =
        (
            existingVisits ||
            []
        )
        .some(
            v => {

                if(
                    !v.appointment_start ||
                    !v.appointment_end
                ){

                    return false;

                }


                const existingStart =
                    new Date(
                        v.appointment_start
                    );


                const existingEnd =
                    new Date(
                        v.appointment_end
                    );


                return (
                    start < existingEnd &&
                    end > existingStart
                );

            }
        );


    if(hasOverlap){

        alert(
            "يوجد موعد آخر في نفس العيادة خلال هذا الوقت"
        );

        return;

    }


    /* =====================================================
       CREATE NEW VISIT GROUP
       
       كل زيارة أساسية تبدأ Group جديدة
    ===================================================== */

    const visitGroupId =
        crypto.randomUUID();


    /* =====================================================
       SAVE PRIMARY VISIT
    ===================================================== */

    const {
        data: newVisit,
        error
    } =
    await supabaseClient

        .from(
            "patient_visits"
        )

        .insert([{

            patient_id:
                patientId,

            appointment_start:
                appointmentStart,

            appointment_end:
                appointmentEnd,

            department_id:
                departmentId,

            department_name:
                departmentName,

            user_id:
                userId,

            /* =============================================
               RELATED VISITS SYSTEM
            ============================================= */

            visit_group_id:
                visitGroupId,

            visit_order:
                1,

            is_primary:
                true,

            /* =============================================
               DEFAULT VALUES
            ============================================= */

            is_deleted:
                false,

            visit_result:
                "waiting"

        }])

        .select()

        .single();


    /* =====================================================
       INSERT ERROR
    ===================================================== */

    if(error){

        console.error(
            "Save visit error:",
            error
        );

        alert(
            error.message
        );

        return;

    }


    /* =====================================================
       STORE CURRENT VISIT
    ===================================================== */

    window.currentVisitId =
        newVisit.id;


    /* =====================================================
       STORE CURRENT GROUP
       
       مهم جدًا لإضافة الزيارات الملحقة
    ===================================================== */

    window.currentVisitGroupId =
        visitGroupId;


    window.currentVisitOrder =
        1;


    /* =====================================================
       SUCCESS
    ===================================================== */

    showToast(
        "visit added successfully"
    );


    /* =====================================================
       RESET FORM
    ===================================================== */

    const startInput =
        document.getElementById(
            "appointmentStart"
        );


    const endInput =
        document.getElementById(
            "appointmentEnd"
        );


    const departmentInput =
        document.getElementById(
            "departmentSelect"
        );


    if(startInput){

        startInput.value = "";

    }


    if(endInput){

        endInput.value = "";

    }


    if(departmentInput){

        departmentInput.value = "";

    }


    /* =====================================================
       RELOAD VISITS
    ===================================================== */

    await loadVisits();
closeVisitBookingModal();
}

async function loadDepartments(){
    
     console.log(
        "loading departments..."
    );

    const { data:userData } =
    await supabaseClient.auth.getUser();

    const userId =
    userData.user.id;

      console.log(
        "user id =",
        userId
    );

    const {
        data,
        error
    } =
    await supabaseClient
    .from("clinic_departments")
    .select("*")
    .eq(
        "user_id",
        userId
    )
    .order(
        "department_name"
    );

     console.log(
        "departments =",
        data
    );

    console.log(
        "error =",
        error
    );

    if(error){

        console.log(error);

        return;
    }

    const select =
    document.getElementById(
        "departmentSelect"
    );

    if(!select)
        return;

    select.innerHTML =
    `
    <option value="">
        اختر العيادة
    </option>
    `;

    data.forEach(d=>{

        select.innerHTML +=
        `
        <option value="${d.id}">
            ${d.department_name}
        </option>
        `;

    });

}

/* =========================
   LOAD DEPARTMENTS WHEN PAGE OPENS
========================= */

document.addEventListener(
    "DOMContentLoaded",
    async ()=>{

        await loadDepartments();

    }
);




/* =========================
   LOAD VISITS
========================= */

async function loadVisits(){

    /* =====================================================
       GET PRIMARY VISITS ONLY
    ===================================================== */

    const {
        data,
        error
    } =
    await supabaseClient

        .from("patient_visits")

        .select("*")

        .eq(
            "patient_id",
            patientId
        )

        .eq(
            "is_primary",
            true
        )

        .eq(
            "is_deleted",
            false
        )

        .order(
            "appointment_start",
            {
                ascending: false
            }
        );


    if(error){

        console.error(
            "Load visits error:",
            error
        );

        return;

    }


    /* =====================================================
       ENSURE VISIT GROUP
       أي زيارة أساسية قديمة ليس لها مجموعة
       تحصل على visit_group_id جديد
    ===================================================== */

    for(
        const visit
        of
        (
            data ||
            []
        )
    ){

        if(
            !visit.visit_group_id
        ){

            const newGroupId =
                crypto.randomUUID();


            const {
                error: updateError
            } =
            await supabaseClient

                .from(
                    "patient_visits"
                )

                .update({

                    visit_group_id:
                        newGroupId,

                    visit_order:
                        1,

                    is_primary:
                        true

                })

                .eq(
                    "id",
                    visit.id
                );


            if(updateError){

                console.error(
                    "Unable to create visit group:",
                    updateError
                );

            }
            else{

                visit.visit_group_id =
                    newGroupId;

                visit.visit_order =
                    1;

                visit.is_primary =
                    true;

            }

        }

    }


    /* =====================================================
       CALCULATE REMAINING OF EACH VISIT

       TOTAL SERVICES
            -
       DISCOUNTS
            =
       NET TOTAL

       NET TOTAL
            -
       ALL PAYMENTS
            =
       REMAINING
    ===================================================== */

    for(
        const visit
        of
        (
            data ||
            []
        )
    ){

        /* ================================================
           GET SERVICES
        ================================================ */

        const {
            data: services,
            error: servicesError
        }
        =
        await supabaseClient

            .from(
                "patientt_services"
            )

            .select(`
                id,
                total_amount,
                discount_amount
            `)

            .eq(
                "visit_id",
                visit.id
            );


        if(servicesError){

            console.error(
                "Services error for visit:",
                visit.id,
                servicesError
            );


            visit.remaining =
                0;

            visit.total_amount =
                0;

            visit.total_discount =
                0;

            visit.net_amount =
                0;

            visit.paid_amount =
                0;

            continue;

        }


        /* ================================================
           NO SERVICES
        ================================================ */

        if(
            !services ||
            !services.length
        ){

            visit.remaining =
                0;

            visit.total_amount =
                0;

            visit.total_discount =
                0;

            visit.net_amount =
                0;

            visit.paid_amount =
                0;

            continue;

        }


        /* ================================================
           CALCULATE TOTAL + DISCOUNT
        ================================================ */

        let totalAmount =
            0;

        let totalDiscount =
            0;


        services.forEach(
            service => {

                totalAmount +=
                    Number(
                        service.total_amount ||
                        0
                    );


                totalDiscount +=
                    Number(
                        service.discount_amount ||
                        0
                    );

            }
        );


        /* ================================================
           NET TOTAL
        ================================================ */

        const netTotal =
            Math.max(
                totalAmount -
                totalDiscount,
                0
            );


        /* ================================================
           SERVICE IDS
        ================================================ */

        const serviceIds =
            services.map(
                service =>
                    service.id
            );


        /* ================================================
           GET ALL PAYMENTS
        ================================================ */

        let paidAmount =
            0;


        if(
            serviceIds.length
        ){

            const {
                data: payments,
                error: paymentsError
            }
            =
            await supabaseClient

                .from(
                    "patient_service_payments"
                )

                .select(
                    "amount"
                )

                .in(
                    "service_id",
                    serviceIds
                );


            if(paymentsError){

                console.error(
                    "Payments error for visit:",
                    visit.id,
                    paymentsError
                );

            }


            paidAmount =
                (
                    payments ||
                    []
                )
                .reduce(
                    (
                        sum,
                        payment
                    ) => {

                        return (
                            sum +
                            Number(
                                payment.amount ||
                                0
                            )
                        );

                    },
                    0
                );

        }


        /* ================================================
           FINAL REMAINING
        ================================================ */

        visit.remaining =
            Math.max(
                netTotal -
                paidAmount,
                0
            );


        /* ================================================
           OPTIONAL FINANCIAL DATA
        ================================================ */

        visit.total_amount =
            totalAmount;

        visit.total_discount =
            totalDiscount;

        visit.net_amount =
            netTotal;

        visit.paid_amount =
            paidAmount;

    }


    /* =====================================================
       GET CONTAINER
    ===================================================== */

    const container =
        document.getElementById(
            "visitsContainer"
        );


    if(!container){

        return;

    }


    /* =====================================================
       COMPLETED VISITS COUNT
    ===================================================== */

    const visitsCount =
        document.getElementById(
            "visitsCount"
        );


    if(visitsCount){

        const completedVisits =
            (
                data ||
                []
            )
            .filter(
                visit =>
                    visit.visit_result ===
                    "completed"
            )
            .length;


        visitsCount.textContent =
            `${completedVisits} Visits`;

    }


    /* =====================================================
       CLEAR CONTAINER
    ===================================================== */

    container.innerHTML =
        "";


    /* =====================================================
       NO VISITS
    ===================================================== */

    if(
        !data ||
        data.length === 0
    ){

        container.innerHTML = `

            <div class="no-appointments">

                <div class="empty-icon">

                    <i
                        class="
                            fa-solid
                            fa-calendar-xmark
                        "
                    ></i>

                </div>


                <h3>
                    No Visits Yet
                </h3>


                <p>
                    There are no scheduled
                    patient visits currently
                </p>

            </div>

        `;

        return;

    }


    /* =====================================================
       RENDER PRIMARY VISITS
    ===================================================== */

    for(
        const v
        of data
    ){

        /* =============================================
           VISIT END TIME
        ============================================= */

        const visitEndTime =
            v.appointment_end
                ?
                new Date(
                    v.appointment_end
                )
                :
                null;


        const nowTime =
            new Date();


        /* =============================================
           CAN RESCHEDULE
        ============================================= */

        const canReschedule =
            visitEndTime &&
            visitEndTime > nowTime &&
            (
                v.visit_result ===
                    "completed" ||

                v.visit_result ===
                    "waiting"
            );


        /* =============================================
           STATUS
        ============================================= */

        const completed =
            v.visit_result ===
            "completed";


        const waiting =
            v.visit_result ===
            "waiting";


        const cancelled =
            v.visit_result ===
            "cancelled";


        let statusText =
            "زيارة غير مكتملة";


        let statusClass =
            "cancelled";


        let statusIcon =
            "fa-xmark";


        if(completed){

            statusText =
                "زيارة مكتملة";

            statusClass =
                "completed";

            statusIcon =
                "fa-check";

        }


        if(waiting){

            statusText =
                "زيارة في الانتظار";

            statusClass =
                "waiting";

            statusIcon =
                "fa-clock";

        }


        /* =============================================
           REMAINING
        ============================================= */

        const remaining =
            Number(
                v.remaining ||
                0
            );


        /* =============================================
           PAYMENT BADGE
        ============================================= */

        const visitBadge =
            remaining > 0
                ?
                `

                <span
                    class="
                        visit-remaining-badge
                    "
                    title="المبلغ المتبقي"
                >

                    <i
                        class="
                            fa-solid
                            fa-money-bill-wave
                        "
                    ></i>

                    ${remaining.toFixed(2)}
                    EGP

                </span>

                `
                :
                "";


        /* =============================================
           RELATED VISITS COUNT
        ============================================= */

        let relatedBadge =
            "";


        if(
            v.visit_group_id
        ){

            const {
                count,
                error: countError
            }
            =
            await supabaseClient

                .from(
                    "patient_visits"
                )

                .select(
                    "id",
                    {
                        count:
                            "exact",

                        head:
                            true
                    }
                )

                .eq(
                    "visit_group_id",
                    v.visit_group_id
                )

                .eq(
                    "is_primary",
                    false
                )

                .eq(
                    "is_deleted",
                    false
                );


            if(
                !countError &&
                count &&
                count > 0
            ){

                relatedBadge = `

                    <button
                        type="button"

                        class="
                            related-visits-btn
                        "

                        onclick="
                            event.stopPropagation();

                            openRelatedVisitsModal(
                                '${v.visit_group_id}',
                                ${v.id}
                            )
                        "

                        title="
                            عرض الزيارات الملحقة
                        "
                    >

                        <i
                            class="
                                fa-solid
                                fa-layer-group
                            "
                        ></i>

                        <span>
                            الزيارات الملحقة
                        </span>

                        <b
                            class="
                                related-visits-count
                            "
                        >
                            ${count}
                        </b>

                    </button>

                `;

            }

        }


        /* =============================================
           ADD RELATED VISIT BUTTON
        ============================================= */

        const addRelatedVisitButton =
            v.visit_group_id
                ?
                `

                <button
                    type="button"

                    class="
                        add-related-visit-btn
                    "

                    onclick="
                        event.stopPropagation();

                        openAddRelatedVisitModal(
                            '${v.visit_group_id}',
                            ${v.id}
                        )
                    "

                    title="
                        إضافة زيارة ملحقة
                    "
                >

                    <i
                        class="
                            fa-solid
                            fa-plus
                        "
                    ></i>

                    <span>
                        إضافة زيارة ملحقة
                    </span>

                </button>

                `
                :
                "";


        /* =============================================
           VISIT TITLE
        ============================================= */

        const visitTitle =
            v.visit_title ||
            "Primary Visit";


        /* =============================================
           DATE
        ============================================= */

        const formattedDate =
            v.appointment_start
                ?
                new Date(
                    v.appointment_start
                )
                .toLocaleString(
                    "en-GB",
                    {
                        day:
                            "2-digit",

                        month:
                            "2-digit",

                        year:
                            "numeric",

                        hour:
                            "2-digit",

                        minute:
                            "2-digit",

                        hour12:
                            true
                    }
                )
                :
                "";


        /* =============================================
           WAITING ACTIONS

           يتم وضعها بجانب حالة الزيارة
           وبشكل صغير جداً
        ============================================= */

        const waitingActions =
            waiting
                ?
                `

                <div
                    class="
                        compact-visit-actions
                    "

                    onclick="
                        event.stopPropagation();
                    "
                >

                    <button
                        type="button"

                        class="
                            compact-confirm-btn
                        "

                        onclick="
                            event.stopPropagation();

                            confirmVisit(
                                ${v.id}
                            )
                        "

                        title="
                            تأكيد الزيارة
                        "
                    >

                        <i
                            class="
                                fa-solid
                                fa-check
                            "
                        ></i>

                    </button>


                    <button
                        type="button"

                        class="
                            compact-cancel-btn
                        "

                        onclick="
                            event.stopPropagation();

                            cancelVisit(
                                ${v.id}
                            )
                        "

                        title="
                            إلغاء الزيارة
                        "
                    >

                        <i
                            class="
                                fa-solid
                                fa-xmark
                            "
                        ></i>

                    </button>

                </div>

                `
                :
                "";


        /* =============================================
           RESCHEDULE BUTTON
        ============================================= */

const rescheduleButton =
    canReschedule
        ?
        `

        <button
            type="button"

            id="
                reschedule-btn-${v.id}
            "

            class="
                reschedule-visit-btn
            "

            onclick="
                event.stopPropagation();

                openRescheduleVisit(
                    ${v.id}
                )
            "

            title="
                تغيير موعد الزيارة
            "
        >

            <i
                class="
                    fa-solid
                    fa-calendar-pen
                "
            ></i>

            <span>
                تغيير الموعد
            </span>

        </button>

        `
        :
        "";


        /* =============================================
           RENDER CARD

           الكارت بالكامل يفتح تفاصيل الزيارة

           نستثني العناصر التي تحتوي على أزرار
        ============================================= */

        container.innerHTML += `

            <div
    class="
        visit-history-item
        primary-visit-card
        ${statusClass}
    "
    role="button"
    tabindex="0"
    title="عرض تفاصيل الزيارة"
  style="cursor: pointer;"
                onclick="
                    openVisitDetails(
                        ${v.id}
                    )
                "

                onkeydown="
                    if(
                        event.key === 'Enter' ||
                        event.key === ' '
                    ){

                        event.preventDefault();

                        openVisitDetails(
                            ${v.id}
                        );

                    }
                "
            >


                <!-- =================================
                     TOP ROW
                ================================== -->

                <div
                    class="
                        visit-card-top
                    "
                >


                    <!-- STATUS -->

                    <div
                        class="
                            visit-status-area
                        "
                    >

                        <div
                            class="
                                visit-status
                                ${statusClass}
                            "
                        >

                            <i
                                class="
                                    fa-solid
                                    ${statusIcon}
                                "
                            ></i>

                        </div>


                        <div
                            class="
                                visit-status-info
                            "
                        >

                            <span
                                class="
                                    visit-status-text
                                "
                            >
                                ${statusText}
                            </span>


                            ${waitingActions}

                        </div>

                    </div>


                <!-- TITLE -->

<div
    class="
        visit-main-title
    "
>

    <div
        class="
            visit-title-icon
        "
    >
        <i class="fa-solid fa-calendar-check"></i>
    </div>

    <span
        class="
            visit-title-text
        "
    >
        ${visitTitle}
    </span>

</div>

           
                </div>


                <!-- =================================
                     VISIT META
                ================================== -->

                <div
                    class="
                        visit-card-meta
                    "
                >


                    <!-- DATE -->

                    <div
                        class="
                            visit-meta-item
                        "
                    >

                        <i
                            class="
                                fa-solid
                                fa-calendar-days
                            "
                        ></i>

                        <span>
                            ${formattedDate}
                        </span>

                    </div>


                    <!-- DEPARTMENT -->

                    <div
                        class="
                            visit-meta-item
                        "
                    >

                        <i
                            class="
                                fa-solid
                                fa-briefcase-medical
                            "
                        ></i>

                        <span>

                            ${
                                v.department_name ||
                                "غير محددة"
                            }

                        </span>

                    </div>


                </div>


                <!-- =================================
                     RELATED VISITS
                ================================== -->

                <div

                    class="
                        related-visits-area
                    "

                    onclick="
                        event.stopPropagation();
                    "
                >

                    ${relatedBadge}

                    ${addRelatedVisitButton}

                </div>

         <!-- PAYMENT -->

                    ${visitBadge}

                <!-- =================================
                     ACTIONS
                ================================== -->

                <div

                    class="
                        visit-card-actions
                    "

                    onclick="
                        event.stopPropagation();
                    "
                >

                    ${rescheduleButton}


                    <!-- DELETE -->

                    <button
                        type="button"

                        class="
                            delete-visit-btn
                        "

                        onclick="
                            event.stopPropagation();

                            deleteVisitRecord(
                                ${v.id}
                            )
                        "

                        title="
                            حذف الزيارة من السجل
                        "
                    >

                        <i
                            class="
                                fa-solid
                                fa-trash
                            "
                        ></i>

                    </button>

                </div>


            </div>

        `;


        /* =============================================
           AUTO HIDE RESCHEDULE BUTTON
        ============================================= */

        if(
            canReschedule &&
            visitEndTime
        ){

            const delay =
                visitEndTime.getTime() -
                Date.now();


            if(
                delay > 0
            ){

                setTimeout(

                    () => {

                        const button =
                            document.getElementById(
                                `reschedule-btn-${v.id}`
                            );


                        if(button){

                            button.remove();

                        }

                    },

                    delay

                );

            }

        }

    }

}
/* =====================================================
   AUTO-OPEN VISIT FROM CALENDAR
   ===================================================== */
const urlParams = new URLSearchParams(window.location.search);
const openVisitId = urlParams.get('openVisit');

if (openVisitId) {
    setTimeout(() => {
        // 1. فتح قسم الزيارات (details)
        const visitsDetails = document.getElementById('visitsHistoryDetails');
        if (visitsDetails) {
            visitsDetails.open = true;
        }
        
        // 2. التمرير لقسم الزيارات
        const visitsContainer = document.getElementById('visitsContainer');
        if (visitsContainer) {
            visitsContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        // 3. فتح تفاصيل الزيارة بعد اكتمال التمرير
        setTimeout(() => {
            const visitIdNum = Number(openVisitId);
            if (visitIdNum && typeof openVisitDetails === 'function') {
             
            }
            
            // 4. تنظيف الرابط لمنع إعادة الفتح عند Refresh
            const cleanUrl = window.location.pathname + '?id=' + patientId;
            window.history.replaceState({}, document.title, cleanUrl);
        }, 700);
    }, 400);
}
let currentRescheduleVisitId = null;
function formatDateTimeLocalValue(dateValue){

    if(!dateValue)
        return "";

    const date =
        new Date(dateValue);

    if(
        Number.isNaN(
            date.getTime()
        )
    ){

        return "";

    }

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        )
        .padStart(2,"0");

    const day =
        String(
            date.getDate()
        )
        .padStart(2,"0");

    const hours =
        String(
            date.getHours()
        )
        .padStart(2,"0");

    const minutes =
        String(
            date.getMinutes()
        )
        .padStart(2,"0");

    return `
        ${year}-
        ${month}-
        ${day}T
        ${hours}:
        ${minutes}
    `.replace(/\s/g,"");

}
async function openRescheduleVisit(visitId){

    try{

        currentRescheduleVisitId =
            visitId;


        /* =========================
           GET VISIT
        ========================= */

        const {
            data:visit,
            error
        } =
        await supabaseClient

            .from("patient_visits")

            .select(`
                id,
                appointment_start,
                appointment_end,
                department_id,
                department_name,
                visit_result,
                is_deleted
            `)

            .eq(
                "id",
                visitId
            )

            .single();


        if(error){

            console.error(
                "Load visit for reschedule:",
                error
            );

            showToast(
                "تعذر تحميل بيانات الزيارة"
            );

            return;

        }


        if(!visit){

            showToast(
                "الزيارة غير موجودة"
            );

            return;

        }


        /* =========================
           PREVENT CANCELLED / DELETED
        ========================= */

        if(
            visit.is_deleted === true
        ){

            showToast(
                "لا يمكن تعديل زيارة محذوفة"
            );

            return;

        }


        if(
            visit.visit_result ===
            "cancelled"
        ){

            showToast(
                "لا يمكن تغيير موعد زيارة ملغاة"
            );

            return;

        }


        /* =========================
           SET VALUES
        ========================= */

        const startInput =
            document.getElementById(
                "rescheduleAppointmentStart"
            );


        const endInput =
            document.getElementById(
                "rescheduleAppointmentEnd"
            );


        if(!startInput || !endInput){

            console.error(
                "Reschedule inputs not found"
            );

            return;

        }


        startInput.value =
            formatDateTimeLocalValue(
                visit.appointment_start
            );


        endInput.value =
            formatDateTimeLocalValue(
                visit.appointment_end
            );


        /* =========================
           OPEN MODAL
        ========================= */

const modal =
    document.getElementById(
        "rescheduleVisitModal"
    );

if(modal){

    /*
     * نقل المودال إلى body
     * حتى يظهر فوق جميع المودالات
     */

    if(
        modal.parentElement !==
        document.body
    ){

        document.body.appendChild(
            modal
        );

    }


    modal.style.display = "flex";

    modal.style.zIndex = "999999";

}

    }

    catch(error){

        console.error(
            "Open reschedule error:",
            error
        );

    }
initRescheduleSlider();
}
function closeRescheduleVisitModal(){

    const modal =
        document.getElementById(
            "rescheduleVisitModal"
        );


    if(modal){

        modal.style.display =
            "none";

    }


    currentRescheduleVisitId =
        null;

}
async function saveRescheduledVisit(){

    try{

        /* =========================
           CHECK VISIT ID
        ========================= */

        if(!currentRescheduleVisitId){

            showToast(
                "لم يتم تحديد الزيارة"
            );

            return;

        }


        /* =========================
           USER
        ========================= */

        const {
            data:userData
        } =
        await supabaseClient.auth.getUser();


        const userId =
            userData?.user?.id;


        if(!userId){

            showToast(
                "المستخدم غير موجود"
            );

            return;

        }


        /* =========================
           GET NEW TIMES
        ========================= */

        const startInput =
            document.getElementById(
                "rescheduleAppointmentStart"
            );


        const endInput =
            document.getElementById(
                "rescheduleAppointmentEnd"
            );


        const appointmentStart =
            startInput?.value;


        const appointmentEnd =
            endInput?.value;


        if(
            !appointmentStart ||
            !appointmentEnd
        ){

            showToast(
                "حدد وقت البداية والنهاية"
            );

            return;

        }


        const start =
            new Date(
                appointmentStart
            );


        const end =
            new Date(
                appointmentEnd
            );


        /* =========================
           VALID DATE
        ========================= */

        if(
            Number.isNaN(
                start.getTime()
            ) ||
            Number.isNaN(
                end.getTime()
            )
        ){

            showToast(
                "التاريخ أو الوقت غير صحيح"
            );

            return;

        }


        /* =========================
           PREVENT PAST
        ========================= */

        const now =
            new Date();


        if(start < now){

            showToast(
                "لا يمكن نقل الزيارة إلى وقت سابق"
            );

            return;

        }


        /* =========================
           END AFTER START
        ========================= */

        if(end <= start){

            showToast(
                "وقت النهاية يجب أن يكون بعد البداية"
            );

            return;

        }


        /* =========================
           GET CURRENT VISIT
        ========================= */

        const {
            data:currentVisit,
            error:visitError
        } =
        await supabaseClient

            .from("patient_visits")

            .select(`
                id,
                department_id,
                visit_result,
                is_deleted
            `)

            .eq(
                "id",
                currentRescheduleVisitId
            )

            .eq(
                "user_id",
                userId
            )

            .single();


        if(visitError){

            console.error(
                "Current visit error:",
                visitError
            );

            showToast(
                "تعذر تحميل الزيارة"
            );

            return;

        }


        if(!currentVisit){

            showToast(
                "الزيارة غير موجودة"
            );

            return;

        }


        /* =========================
           CHECK STATUS
        ========================= */

        if(
            currentVisit.is_deleted === true
        ){

            showToast(
                "لا يمكن تعديل زيارة محذوفة"
            );

            return;

        }


        if(
            currentVisit.visit_result ===
            "cancelled"
        ){

            showToast(
                "لا يمكن تعديل زيارة ملغاة"
            );

            return;

        }


        /* =========================
           CHECK OVERLAP
        ========================= */

        const {
            data:existingVisits,
            error:overlapError
        } =
        await supabaseClient

            .from("patient_visits")

            .select(`
                id,
                appointment_start,
                appointment_end,
                visit_result,
                is_deleted
            `)

            .eq(
                "user_id",
                userId
            )

            .eq(
                "department_id",
                currentVisit.department_id
            )

            .neq(
                "id",
                currentRescheduleVisitId
            )
            .neq(
                "visit_result",
                "cancelled"
            )
            .eq(
                "is_deleted",
                false
            );


        if(overlapError){

            console.error(
                "Reschedule overlap error:",
                overlapError
            );

            showToast(
                "تعذر التحقق من تعارض المواعيد"
            );

            return;

        }


        const hasOverlap =
            (
                existingVisits ||
                []
            )
            .some(
                existing => {

                    const existingStart =
                        new Date(
                            existing.appointment_start
                        );


                    const existingEnd =
                        new Date(
                            existing.appointment_end
                        );


                    return (

                        start <
                        existingEnd

                        &&

                        end >
                        existingStart

                    );

                }
            );


        if(hasOverlap){

            showToast(
                "يوجد موعد آخر في نفس العيادة خلال هذا الوقت"
            );

            return;

        }


        /* =========================
           UPDATE
        ========================= */

        const {
            error:updateError
        } =
        await supabaseClient

            .from("patient_visits")

            .update({

                appointment_start:
                    appointmentStart,

                appointment_end:
                    appointmentEnd

            })

            .eq(
                "id",
                currentRescheduleVisitId
            )
            .eq(
                "user_id",
                userId
            );


        if(updateError){

            console.error(
                "Reschedule update error:",
                updateError
            );

            showToast(
                "فشل تغيير موعد الزيارة"
            );

            return;

        }


        /* =========================
           SUCCESS
        ========================= */

        showToast(
            "تم تغيير موعد الزيارة بنجاح"
        );


        closeRescheduleVisitModal();


        /* =========================
           REFRESH VISITS
        ========================= */

        await loadVisits();

    }

    catch(error){

        console.error(
            "Save rescheduled visit error:",
            error
        );

        showToast(
            "حدث خطأ أثناء تغيير الموعد"
        );

    }

}

function openVisitDetails(visitId){
    console.log(
        "OPEN CLICK:",
        performance.now()
    );

    window.currentVisitId = visitId;

    const modal =
        document.getElementById(
            "visitDetailsModal"
        );

    if(!modal){
        return;
    }


    /* =========================================
       MOVE TO BODY
    ========================================= */

    if(
        modal.parentElement !==
        document.body
    ){

        document.body.appendChild(
            modal
        );
    }


    /* =========================================
       SHOW IMMEDIATELY
    ========================================= */

    modal.style.setProperty(
        "z-index",
        "100000",
        "important"
    );

    modal.classList.add("show");


    /* =========================================
       LOAD DATA AFTER SHOW
    ========================================= */

    requestAnimationFrame(() => {

        setTimeout(() => {

            loadVisitDetailsContent(
                visitId
            );

        }, 0);

    });
}
async function loadVisitDetailsContent(
    visitId
) {

    /* =====================================================
       GET VISIT
    ===================================================== */

    const {
        data: visit,
        error
    } =
        await supabaseClient
            .from("patient_visits")
            .select(`
                id,
                is_primary,
                visit_title,
                visit_order
            `)
            .eq(
                "id",
                visitId
            )
            .single();


    if (error) {

        console.error(
            "OPEN VISIT ERROR:",
            error
        );

        return;

    }


    /* =====================================================
       RELATED VISIT TITLE
    ===================================================== */

    const relatedTitle =
        document.getElementById(
            "relatedVisitTitle"
        );


    if (relatedTitle) {

        relatedTitle.style.display =
            "none";

        relatedTitle.innerHTML =
            "";


        if (
            visit.is_primary === false
        ) {

            const title =
                visit.visit_title ||
                (
                    visit.visit_order
                        ?
                        `زيارة ${visit.visit_order}`
                        :
                        "زيارة ملحقة"
                );


            relatedTitle.innerHTML = `
                <i class="fa-solid fa-link"></i>

                <span>
                    ${title}
                </span>
            `;


            relatedTitle.style.display =
                "flex";

        }

    }


    /* =====================================================
       LOAD CONTENT
    ===================================================== */

    await loadClinicServicesDropdown();

    await loadPatienttServices();

    await loadImages();

    await loadNotes();

}

function closeVisitDetails(){

    document
    .getElementById(
        "visitDetailsModal"
    )
    .classList.remove(
        "show"
    );

    window.currentVisitId =
    null;

}

async function deleteVisitRecord(id){

    const confirmDelete = await showConfirm(
        "هل تريد حذف هذه الزيارة وجميع الزيارات الملحقة بها نهائياً؟"
    );

    if(!confirmDelete){
        return;
    }


    /* =====================================================
       GET VISIT GROUP
    ===================================================== */

    const {
        data: visit,
        error: visitError
    } = await supabaseClient

        .from("patient_visits")

        .select(`
            id,
            visit_group_id,
            is_primary
        `)

        .eq(
            "id",
            id
        )

        .single();


    if(visitError){

        console.error(
            "Error loading visit:",
            visitError
        );

        alert(
            visitError.message
        );

        return;
    }


    /* =====================================================
       DELETE VISIT GROUP
       إذا كانت الزيارة جزءًا من مجموعة
    ===================================================== */

    if(visit.visit_group_id){

        const {
            error: groupDeleteError
        } = await supabaseClient

            .from("patient_visits")

            .delete()

            .eq(
                "visit_group_id",
                visit.visit_group_id
            );


        if(groupDeleteError){

            console.error(
                "Error deleting visit group:",
                groupDeleteError
            );

            alert(
                groupDeleteError.message
            );

            return;
        }

    }

    /* =====================================================
       DELETE SINGLE VISIT
       إذا لم تكن مرتبطة بمجموعة
    ===================================================== */

    else{

        const {
            error: deleteError
        } = await supabaseClient

            .from("patient_visits")

            .delete()

            .eq(
                "id",
                id
            );


        if(deleteError){

            console.error(
                "Error deleting visit:",
                deleteError
            );

            alert(
                deleteError.message
            );

            return;
        }
    }


    /* =====================================================
       SUCCESS
    ===================================================== */

    showToast(
        visit.visit_group_id
            ? "تم حذف الزيارة الأساسية وجميع الزيارات الملحقة بها"
            : "تم حذف الزيارة من السجل"
    );


    await loadVisits();

}
async function confirmVisit(id){

    const { error } =
        await supabaseClient

            .from("patient_visits")

            .update({
                visit_result: "completed"
            })

            .eq("id", id);


    if(error){

        showToast(
            error.message,
            "error"
        );

        return;
    }


    showToast(
        "Visit confirmed"
    );


    /*
     * تحديث الزيارة الملحقة فورًا
     */

    await refreshRelatedVisitCard(
        id
    );


    /*
     * تحديث البيانات العامة
     */

    loadVisits();

    loadAppointments();

}
async function cancelVisit(id){

    if(
        !confirm(
            "Cancel this visit?"
        )
    ){
        return;
    }


    const { error } =
        await supabaseClient

            .from("patient_visits")

            .update({
                visit_result: "cancelled"
            })

            .eq(
                "id",
                id
            );


    if(error){

        showToast(
            error.message,
            "error"
        );

        return;
    }


    showToast(
        "Visit cancelled"
    );


    /*
     * =========================================
     * تحديث الزيارة الملحقة لحظيًا
     * =========================================
     */

    await refreshRelatedVisitCard(
        id
    );


    /*
     * تحديث القوائم الرئيسية
     */

    loadVisits();

    loadAppointments();

}


// toast 
function showToast(message){
    const toast = document.getElementById("toast");

    toast.innerText = message;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}





// BOOK VISIT
// =========================
// BOOK VISIT
// =========================

function goToVisitCard() {

    const modal = document.getElementById("visitBookingModal");

    if (!modal) {
        console.error("visitBookingModal not found");
        return;
    }

    modal.classList.add("active");

    // Prevent background scrolling
    document.body.style.overflow = "hidden";
initBookingSlider();
}
function closeVisitBookingModal() {

    const modal = document.getElementById("visitBookingModal");

    if (!modal) {
        return;
    }

    modal.classList.remove("active");

    // Restore scrolling
    document.body.style.overflow = "";

}
document.addEventListener("keydown", function (event) {

    if (event.key === "Escape") {

        const modal = document.getElementById("visitBookingModal");

        if (modal && modal.classList.contains("active")) {
            closeVisitBookingModal();
        }

    }

});



async function uploadVisitFile(input, fileType){

    if(!window.currentVisitId){

        alert(
            "Please select or create a visit first"
        );

        return;
    }

    const file =
    input.files[0];

    if(!file) return;

    let imageUrl;

    try{

        imageUrl =
        await uploadToCloudinary(
            file
        );

    }catch(err){

        alert(
            err.message
        );

        return;
    }

    const {
        data:userData
    } =
    await supabaseClient
    .auth
    .getUser();

    const userId =
    userData.user.id;

    const { error } =
    await supabaseClient
    .from("patient_images")
    .insert([{

        patient_id:
        patientId,

        visit_id:
        window.currentVisitId,

        image_url:
        imageUrl,

        image_type:
        fileType,

        user_id:
        userId

    }]);

    if(error){

        alert(
            error.message
        );

        return;
    }

    input.value = "";

    showToast(
        `${fileType.toUpperCase()} Uploaded Successfully ✅`
    );

    await loadImages();

}

/* =========================
   DICOM
========================= */

async function uploadDicom(input){

    await uploadVisitFile(
        input,
        "dicom"
    );

}

/* =========================
   STL
========================= */

async function uploadSTL(input){

    await uploadVisitFile(
        input,
        "stl"
    );

}

/* =========================
   OBJ
========================= */

async function uploadOBJ(input){

    await uploadVisitFile(
        input,
        "obj"
    );

}

/* =========================
   PLY
========================= */

async function uploadPLY(input){

    await uploadVisitFile(
        input,
        "ply"
    );

}

/* =========================
   PDF
========================= */

async function uploadPDF(input){

    await uploadVisitFile(
        input,
        "pdf"
    );

}

/* =========================
   HTML
========================= */

async function uploadHTML(input){

    await uploadVisitFile(
        input,
        "html"
    );

}

window.currentVisitId

/* LOAD SERVICES */

async function loadServices(){

    const container =
    document.getElementById(
        "servicesContainer"
    );

    container.innerHTML = "";

    /* GET SAVED */

    const { data, error } =
        await supabaseClient
        .from("patient_services")
        .select("*")
        .eq("patient_id", patientId);

    if(error){

        console.log(error);

        return;
    }

    const selectedServices =
        data.map(s => s.service_name);

    /* LOOP */

    clinicServices.forEach(service => {

    const isSelected =
        selectedServices.includes(service);

    const bgColor = isSelected
        ? "linear-gradient(135deg,#00b894,#55efc4)"
        : "linear-gradient(135deg,#ef476f,#ff5d8f)";

    const shadow = isSelected
        ? "0 8px 20px rgba(0,184,148,0.3)"
        : "0 8px 20px rgba(239,71,111,0.3)";

    container.innerHTML += `

    <div
        class="service-box"

        data-service="${service}"

        onclick="toggleService(this)"

        style="
            padding:10px;

            border-radius:14px;

            cursor:pointer;

            font-weight:700;

            transition:0.3s ease;

            user-select:none;

            color:white;

            background:${bgColor};

            box-shadow:${shadow};
        "
    >

        ${service}

    </div>

    `;
});

}


/* =========================
   TOOTH CHART
========================= */

const teeth = [

"18","17","16","15","14","13","12","11",
"21","22","23","24","25","26","27","28",

"48","47","46","45","44","43","42","41",
"31","32","33","34","35","36","37","38"

];



const primaryTeeth = [

/* UPPER RIGHT */

{ id:"UR_E", label:"E" },
{ id:"UR_D", label:"D" },
{ id:"UR_C", label:"C" },
{ id:"UR_B", label:"B" },
{ id:"UR_A", label:"A" },

/* UPPER LEFT */

{ id:"UL_A", label:"A" },
{ id:"UL_B", label:"B" },
{ id:"UL_C", label:"C" },
{ id:"UL_D", label:"D" },
{ id:"UL_E", label:"E" },

/* LOWER RIGHT */

{ id:"LR_E", label:"E" },
{ id:"LR_D", label:"D" },
{ id:"LR_C", label:"C" },
{ id:"LR_B", label:"B" },
{ id:"LR_A", label:"A" },

/* LOWER LEFT */

{ id:"LL_A", label:"A" },
{ id:"LL_B", label:"B" },
{ id:"LL_C", label:"C" },
{ id:"LL_D", label:"D" },
{ id:"LL_E", label:"E" }

];

/* STATES */

const toothStates = [

    "healthy",
    "missing",
    "impacted",
"discoloration",
    "caries",
    "decayed",
    "non_restorable",

 "rct",
"rct_Rettt",
    "Apicectomy",
    

     "amalgam",
    "composite",
    "glass_ionomer",

   

    "veneered",
    "veneered_comp",

    "veneered_emax",

    "overlay",
    "endo_crown",
    
    "inlay",

    "onlay",

      

    "crowned",
    "crowned_endo",
   

    "poor_crown",
    "poor_filling",

    

     
    

    

    "periapical_lesion",

    "perio_endo_lesion",

    
    "abutment",
    "implant",
    "pontic",


    "pulpectomy",

    "pulpotomy",

    "pulpotomy_stainless_crown",

    "pulpectomy_stainless_crown",

    "pulpotomy_zirconia_pedo_crown",

    "pulpectomy_zirconia_pedo_crown",

    
   
    "pocket",

    "recession",

    "mobility",

    "fracture",

    "attrition",

    "root_resorption",

    "internal_resorption",

    "root_fracture",

    "pulp_polyp",

    "root_caries",
    

    "malaligned",

    "tilted",

    "over_eruption",

    "under_eruption",

    "ankylosed",

    "retained_d_impaction",

     "retained_d_missing",



];

let selectedTooth = null;

/* =========================
   GET LABEL
========================= */

function getToothLabel(status){

    return (

        status === "healthy"
        ? "Healthy"

        : status === "caries"
        ? "Caries"

        : status === "missing"
        ? "Missing"

        : status === "rct"
        ? "RCT"

        : status === "filling"
        ? "Filling"

        : status === "crowned"
        ? "Crowned"

        : status === "crowned_endo"
        ? "Crown + Endo"

        : status === "decayed"
        ? "Decayed"

        : status === "discoloration"
        ? "Discoloration"

        : status === "impacted"
        ? "Impacted"

        : status === "implant"
        ? "Implant"

        : status === "recession"
        ? "Recession"

        : status === "root_caries"
        ? "Root Caries"

        : status === "malaligned"
        ? "Malaligned"

        : status === "pocket"
        ? "Pocket"

        : status === "tilted"
        ? "Tilted"

        : status === "over_eruption"
        ? "Over Eruption"

        : status === "under_eruption"
        ? "Under Eruption"

        : status === "non_restorable"
        ? "Non Restorable"

        : status === "mobility"
        ? "Mobility"

        : status === "periapical_lesion"
        ? "Periapical Lesion"

        : status === "ankylosed"
        ? "Ankylosed"

        : status === "veneered"
        ? "Veneered"

        : status === "abutment"
        ? "Abutment"

        : status === "overlay"
       ? "Overlay"

          : status === "endo_crown"
         ? "Endo Crown"

        : status === "poor_crown"
         ? "Poor Crown"

           : status === "poor_filling"
          ? "Poor Filling"

          : status === "rct_Rettt"
         ? "RCT rettt"

         : status === "apicectomy"
         ? "Apicectomy"
         
: status === "pontic"
? "Pontic"

: status === "pulpotomy"
? "Pulpotomy"

: status === "pulpectomy"
? "Pulpectomy"

: status === "retained_d_impaction"
? "Retained d + Impaction"

: status === "retained_d_missing"
? "Retained d + Missing"

: status === "pulpotomy_stainless_crown"
? "Pulpotomy + ST SL Crown"

: status === "pulpectomy_stainless_crown"
? "Pulpectomy + ST SL Crown"

: status === "inlay"
? "Inlay"

: status === "onlay"
? "Onlay"

: status === "veneered_comp"
? "Veneered (Comp.)"

: status === "veneered_emax"
? "Veneered (Emax)"

: status === "pulpotomy_zirconia_pedo_crown"
? "Pulpotomy + Zirc. Pedo Crown"

: status === "pulpectomy_zirconia_pedo_crown"
? "Pulpectomy + Zirc. Pedo Crown"

: status === "fracture"
? "Fracture"

: status === "attrition"
? "Attrition"

: status === "perio_endo_lesion"
? "Perio-Endo Lesion"

: status === "root_resorption"
? "Root Resorption"

: status === "internal_resorption"
? "Internal Resorption"

: status === "root_fracture"
? "Root Fracture"

: status === "pulp_polyp"
? "Pulp Polyp"

: status === "amalgam"
? "Amalgam"

: status === "composite"
? "Composite"

: status === "glass_ionomer"
? "Glass Ionomer"

        : status
    );
}

/* =========================
   LOAD
========================= */


async function loadToothChart(){

    const upperContainer =
        document.getElementById("upperTeeth");

    const lowerContainer =
        document.getElementById("lowerTeeth");

    upperContainer.innerHTML = "";
    lowerContainer.innerHTML = "";

    const { data, error } =
        await supabaseClient
        .from("patient_teeth")
        .select("*")
        .eq("patient_id", patientId);

    if(error){
        console.log(error);
        return;
    }

    const safeData = data || [];

    teeth.forEach(tooth => {

        const saved =
            safeData.find(
                t => t.tooth_number === tooth
            );

        const status =
            saved?.tooth_status || "healthy";

        const toothHTML = `

<div
    class="tooth ${status}"
    onclick="openToothModal('${tooth}')"
>

    <img
        src="${getToothImage(tooth)}"
        class="tooth-image"
    >

    <div class="tooth-number">
        ${tooth}
    </div>

    <div class="tooth-status">
        ${getToothLabel(status)}
    </div>

</div>
`;

        /* UPPER */

        if(
            tooth.startsWith("1") ||
            tooth.startsWith("2")
        ){

            upperContainer.innerHTML += toothHTML;
        }

        /* LOWER */

        else{

            lowerContainer.innerHTML += toothHTML;
        }
    });
}
/* ─── CENTER TOOTH CHART ON LOAD ─── */
function centerToothChart() {
  const wrappers = document.querySelectorAll('.tooth-chart-wrapper');
  wrappers.forEach(wrapper => {
    // إضافة كلاس لمنع الأنيميشن أثناء التمركز
    wrapper.classList.add('centering');
    
    // ننتظر حتى يتم تحميل المحتوى بالكامل
    setTimeout(() => {
      const scrollWidth = wrapper.scrollWidth;
      const clientWidth = wrapper.clientWidth;
      
      if (scrollWidth > clientWidth) {
        wrapper.scrollLeft = (scrollWidth - clientWidth) / 2;
      }
      
      // إزالة الكلاس بعد التمركز
      setTimeout(() => {
        wrapper.classList.remove('centering');
      }, 50);
    }, 150);
  });
}

// تشغيل عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
  centerToothChart();
});

// تشغيل عند تغيير حجم النافذة
let resizeTimer;
window.addEventListener('resize', function() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(centerToothChart, 300);
});

// تشغيل عند فتح الـ details
document.addEventListener('click', function(e) {
  const summary = e.target.closest('.modern-summary');
  if (summary) {
    setTimeout(centerToothChart, 350);
  }
});

// تشغيل عند ظهور الأسنان اللبنية
function showPrimaryTeeth() {
  const card = document.getElementById('primaryChartCard');
  if (card) {
    card.style.display = 'block';
    setTimeout(centerToothChart, 400);
  }
}
// مراقبة فتح وإغلاق details
document.addEventListener('toggle', function(e) {
  if (e.target.tagName === 'DETAILS' && e.target.open) {
    setTimeout(centerToothChart, 350);
  }
});
/* =========================
   CHANGE STATE
========================= */

async function changeToothState(tooth){

    const { data } =
        await supabaseClient
        .from("patient_teeth")
        .select("*")
        .eq("patient_id", patientId)
        .eq("tooth_number", tooth);

    let currentState = "healthy";

    if(data.length){

        currentState =
            data[0].tooth_status;
    }

    /* NEXT STATE */

    let index =
        toothStates.indexOf(currentState);

    index++;

    if(index >= toothStates.length){

        index = 0;
    }

    const nextState =
        toothStates[index];

    /* DELETE OLD */

    await supabaseClient
        .from("patient_teeth")
        .delete()
        .eq("patient_id", patientId)
        .eq("tooth_number", tooth);

    /* INSERT NEW */

    await supabaseClient
        .from("patient_teeth")
        .insert([{

            patient_id: patientId,

            tooth_number: tooth,

            tooth_status: nextState
        }]);

    loadToothChart();
    loadPrimaryToothChart();
}

// نافذة اخر حالة السن 

async function openToothModal(tooth){

    selectedTooth = tooth;

    const modal =
    document.getElementById(
        "toothModal"
    );

    const options =
    document.getElementById(
        "toothOptions"
    );

    options.innerHTML = "";

    options.style.display =
    "grid";

    options.style.gridTemplateColumns =
    "repeat(5, 1fr)";

    options.style.gap =
    "10px";

    /* الحالة الحالية للسن */

let currentState = "healthy";

const savedTooth =
await supabaseClient
    .from("patient_teeth")
    .select("tooth_status")
    .eq("patient_id", patientId)
    .eq("tooth_number", tooth)
    .maybeSingle();

currentState =
savedTooth.data?.tooth_status || "healthy";

/* رسم الحالات */

toothStates.forEach(state => {

    const isSelected =
    state === currentState;

    options.innerHTML += `

    <div
        onclick="setToothState('${state}')"

        style="
            min-height:70px;
            padding:10px;

            border-radius:12px;

            cursor:pointer;

            font-size:11px;

            font-weight:700;

            text-align:center;

            display:flex;
            align-items:center;
            justify-content:center;

            background:${
                isSelected
                ? '#10b981'
                : '#e9dcc3'
            };

            color:${
                isSelected
                ? '#ffffff'
                : '#5b4636'
            };

            border:${
                isSelected
                ? '3px solid #34d399'
                : '1px solid #d7c4a1'
            };

            box-shadow:${
                isSelected
                ? '0 0 15px rgba(16,185,129,.5)'
                : 'none'
            };

            transition:.2s;
            user-select:none;
        "
    >

        ${getToothLabel(state)}

    </div>

    `;
});

    modal.style.display = "flex";
}

function closeToothModal(){

    document.getElementById(
        "toothModal"
    ).style.display = "none";

}

window.addEventListener("click", function(e){

    const modal =
    document.getElementById(
        "toothModal"
    );

    if(
        modal &&
        e.target === modal
    ){

        closeToothModal();

    }

});

async function setToothState(state){

    const tooth = selectedTooth;

    /* DELETE OLD */

    const { error: deleteError } =
        await supabaseClient
        .from("patient_teeth")
        .delete()
        .eq("patient_id", patientId)
        .eq("tooth_number", tooth);

    if(deleteError){

        console.log(deleteError);

        return;
    }

    /* INSERT NEW */

    const { error: insertError } =
        await supabaseClient
        .from("patient_teeth")
        .insert([{

            patient_id: patientId,

            tooth_number: tooth,

            tooth_status: state
        }]);

    if(insertError){

        console.log(insertError);

        return;
    }

    /* CLOSE MODAL */

    document.getElementById(
        "toothModal"
    ).style.display = "none";

    /* WAIT SMALL TIME */

    setTimeout(() => {

        loadToothChart();

        loadPrimaryToothChart();

    }, 150);
}

function getToothImage(tooth){

    const molars = [
        "18","17","16",
        "26","27","28",
        "48","47","46",
        "36","37","38"
    ];

    const premolars = [
        "15","14",
        "24","25",
        "45","44",
        "34","35"
    ];

    const canines = [
        "13","23",
        "43","33"
    ];

    if(molars.includes(tooth))
        return "images/molar.svg";

    if(premolars.includes(tooth))
        return "images/premolar.svg";

    if(canines.includes(tooth))
        return "images/canine.svg";

    return "images/incisor.svg";
}

function getPrimaryToothImage(toothId){

    if(
        toothId.includes("_E") ||
        toothId.includes("_D")
    ){
        return "images/molar.svg";
    }

    if(
        toothId.includes("_C")
    ){
        return "images/canine.svg";
    }

    return "images/incisor.svg";
}

// image viewer 


/* =========================
   IMAGE VIEWER
========================= */

let scale = 1;

let pointX = 0;
let pointY = 0;

let startX = 0;
let startY = 0;

let isDragging = false;

/* OPEN */

function openImageViewer(src){

    const viewer =
        document.getElementById("imageViewer");

    const img =
        document.getElementById("viewerImage");

    viewer.style.display = "flex";

    img.src = src;

    scale = 1;

    pointX = 0;
    pointY = 0;

    updateTransform();
}

/* CLOSE */

function closeImageViewer(){

    document.getElementById(
        "imageViewer"
    ).style.display = "none";
}

/* UPDATE */

function updateTransform(){

    const img =
        document.getElementById("viewerImage");

    img.style.transform =
        `translate(${pointX}px, ${pointY}px) scale(${scale})`;
}

/* ZOOM */

function zoomIn(){

    scale += 0.2;

    updateTransform();
}

function zoomOut(){

    scale -= 0.2;

    if(scale < 1){

        scale = 1;
    }

    updateTransform();
}

/* =========================
   AFTER PAGE LOAD
========================= */

document.addEventListener("DOMContentLoaded", () => {

    const viewer =
        document.getElementById("imageViewer");

    const img =
        document.getElementById("viewerImage");

    /* DRAG */

    img.addEventListener("mousedown", e => {

        isDragging = true;

        startX = e.clientX - pointX;
        startY = e.clientY - pointY;

        img.style.cursor = "grabbing";
    });

    document.addEventListener("mousemove", e => {

        if(!isDragging) return;

        pointX = e.clientX - startX;
        pointY = e.clientY - startY;

        updateTransform();
    });

    document.addEventListener("mouseup", () => {

        isDragging = false;

        img.style.cursor = "grab";
    });

    /* TOUCH */

    img.addEventListener("touchstart", e => {

        if(e.touches.length !== 1) return;

        isDragging = true;

        startX =
            e.touches[0].clientX - pointX;

        startY =
            e.touches[0].clientY - pointY;
    });

    img.addEventListener("touchmove", e => {

        if(!isDragging) return;

        pointX =
            e.touches[0].clientX - startX;

        pointY =
            e.touches[0].clientY - startY;

        updateTransform();
    });

    img.addEventListener("touchend", () => {

        isDragging = false;
    });

    /* CLOSE BACKGROUND */

    viewer.addEventListener("click", e => {

        if(e.target.id === "imageViewer"){

            closeImageViewer();
        }
    });
});

// primary teeth chart 


async function loadPrimaryToothChart(){

    const upper =
        document.getElementById(
            "primaryUpperTeeth"
        );

    const lower =
        document.getElementById(
            "primaryLowerTeeth"
        );

    if(!upper || !lower) return;

    upper.innerHTML = "";
    lower.innerHTML = "";

    const { data, error } =
        await supabaseClient
        .from("patient_teeth")
        .select("*")
        .eq("patient_id", patientId);

    if(error){

        console.log(error);

        return;
    }

    const safeData = data || [];

    /* =========================
       UPPER TEETH
    ========================= */

    const upperTeeth = [

        { id:"UR_E", label:"E" },
        { id:"UR_D", label:"D" },
        { id:"UR_C", label:"C" },
        { id:"UR_B", label:"B" },
        { id:"UR_A", label:"A" },

        { id:"UL_A", label:"A" },
        { id:"UL_B", label:"B" },
        { id:"UL_C", label:"C" },
        { id:"UL_D", label:"D" },
        { id:"UL_E", label:"E" }
    ];

    /* =========================
       LOWER TEETH
    ========================= */

    const lowerTeeth = [

        { id:"LR_E", label:"E" },
        { id:"LR_D", label:"D" },
        { id:"LR_C", label:"C" },
        { id:"LR_B", label:"B" },
        { id:"LR_A", label:"A" },

        { id:"LL_A", label:"A" },
        { id:"LL_B", label:"B" },
        { id:"LL_C", label:"C" },
        { id:"LL_D", label:"D" },
        { id:"LL_E", label:"E" }
    ];

    /* =========================
       RENDER FUNCTION
    ========================= */

    function renderTeeth(list, target){

        list.forEach(tooth => {

            const saved =
                safeData.find(
                    t => t.tooth_number === tooth.id
                );

            const status =
                saved?.tooth_status || "healthy";

            target.innerHTML += `

<div
    class="tooth ${status}"

    onclick="openToothModal('${tooth.id}')"
>

    <img
        src="${getPrimaryToothImage(tooth.id)}"
        class="tooth-image ${
            tooth.id.startsWith('UR') ||
            tooth.id.startsWith('UL')
            ? 'upper-primary-tooth'
            : ''
        }"
    >

    <div class="tooth-number">

        ${tooth.label}

    </div>

    <div class="tooth-status">

        ${getToothLabel(status)}

    </div>

</div>
`;
        });
    }

    /* =========================
       RENDER
    ========================= */

    renderTeeth(upperTeeth, upper);

    renderTeeth(lowerTeeth, lower);
}






// الادوية 
async function saveVisitMedication(){




const input =
    document.getElementById(
        "visitMedicationInput"
    );

const hiddenId =
    document.getElementById(
        "visitMedicationId"
    );

if (!input || !hiddenId) {
    console.log(
        "Medication autocomplete not found"
    );
    return;
}

const drugId =
    hiddenId.value;

if (!drugId) {
    alert("اختر الدواء من القائمة المقترحة");
    return;
}

const drugName =
    input.value;

    const dose =
        document.getElementById(
            "medicationDose"
        ).value;



    const duration =
        document.getElementById(
            "medicationDuration"
        ).value;



    const instructions =
        document.getElementById(
            "medicationInstructions"
        ).value;



    console.log({

        visit:
        window.currentVisitId,

        patient:
        patientId,

        drug:
        drugId,

        name:
        drugName

    });



    const { data, error } =

    await supabaseClient

    .from("visit_medications")

    .insert({

        visit_id:
        window.currentVisitId,

        patient_id:
        patientId,

        drug_id:
        drugId,

        drug_name:
        drugName,

        dose,

        duration,

        instructions

    })

    .select();



    if(error){

        console.error(
            "SUPABASE ERROR:",
            error
        );


        alert(error.message);

        return;

    }



    console.log(
        "Saved:",
        data
    );


   showToast(
    "Medication saved successfully",
    "success"
);


    await loadVisitMedications();

}

async function loadVisitMedications(){

    const container =
    document.getElementById(
        "visitMedicationList"
    );

    if(!container) return;

    const {
        data,
        error
    } =

    await supabaseClient

    .from("visit_medications")

    .select("*")

    .eq(
        "visit_id",
        window.currentVisitId
    )

    .order(
        "created_at",
        {
            ascending:false
        }
    );

    if(error){

        console.log(error);

        return;

    }

    container.innerHTML = "";

    /* =========================
       NO MEDICATIONS
    ========================= */

    if(!data.length){

        container.innerHTML = `
        <tr>

            <td
                colspan="5"
                style="
                    text-align:center;
                    padding:30px;
                    color:#94a3b8;
                ">

                No Medications Found

            </td>

        </tr>
        `;

        return;

    }

    /* =========================
       LOAD MEDICATIONS
    ========================= */

    data.forEach(med => {

        container.innerHTML += `

        <tr>

            <td>
                ${med.drug_name}
            </td>

            <td>
                ${med.dose || "-"}
            </td>

            <td>
                ${med.duration || "-"}
            </td>

            <td>
                ${med.instructions || "-"}
            </td>

            <td>

                <button
                    onclick="deleteMedication(${med.id})">

                    Delete

                </button>

            </td>

        </tr>

        `;

    });

}

async function deleteMedication(id){

    if(!await showConfirm("هل تريد حذف هذا الدواء؟")){
        return;
    }


    const { error } = await supabaseClient
        .from("visit_medications")
        .delete()
        .eq(
            "id",
            id
        );


    if(error){

        console.error(
            "Delete medication error:",
            error
        );

        alert(
            error.message
        );

        return;
    }


   showToast(
    "تم حذف الدواء بنجاح",
    "success"
);


    await loadVisitMedications();

}

/* =========================
   LOAD WHEN MODAL OPENS
========================= */

async function openVisitDetails(
    visitId
){

    window.currentVisitId =
    visitId;

    await loadClinicServicesDropdown();

    await loadPatienttServices();


      await loadVisitMedications();

    await loadImages();

    await loadNotes();

    document
    .getElementById(
        "visitDetailsModal"
    )
    .classList.add(
        "show"
    );

}

window.addEventListener("click", function(e){

    const modal =
    document.getElementById(
        "visitDetailsModal"
    );

    if(
        e.target === modal
    ){
        closeVisitDetails();
    }

});
/* ============================================================
   MEDICATION AUTOCOMPLETE
   ============================================================ */

let medicationSearchTimeout = null;


/* ============================================================
   INITIALIZE MEDICATION SEARCH
============================================================ */

function initMedicationAutocomplete() {

    const input =
        document.getElementById("visitMedicationInput");

    const hiddenId =
        document.getElementById("visitMedicationId");

    const suggestions =
        document.getElementById("medicationSuggestions");

    if (!input || !hiddenId || !suggestions) {
        return;
    }


    /* ========================================================
       INPUT
    ======================================================== */

    input.addEventListener("input", function () {

        const searchTerm =
            this.value.trim();

        /*
         * بمجرد أن يبدأ المستخدم في تعديل الاسم،
         * نلغي الـ ID السابق.
         */
        hiddenId.value = "";


        /* إلغاء البحث السابق */
        clearTimeout(medicationSearchTimeout);


        /* أقل من حرفين */
        if (searchTerm.length < 2) {

            suggestions.innerHTML = "";
            suggestions.classList.remove("show");

            return;
        }


        /*
         * تأخير بسيط حتى لا نرسل Query
         * مع كل حرف مباشرة.
         */
        medicationSearchTimeout =
            setTimeout(() => {

                searchMedications(searchTerm);

            }, 250);

    });


    /* ========================================================
       FOCUS
    ======================================================== */

    input.addEventListener("focus", function () {

        const searchTerm =
            this.value.trim();

        if (searchTerm.length >= 2) {

            searchMedications(searchTerm);

        }

    });


    /* ========================================================
       CLICK OUTSIDE
    ======================================================== */

    document.addEventListener("click", function (event) {

        if (
            !event.target.closest(
                ".medication-autocomplete"
            )
        ) {

            suggestions.classList.remove("show");

        }

    });

}


/* ============================================================
   SEARCH MEDICATIONS
============================================================ */

async function searchMedications(searchTerm) {

    const suggestions =
        document.getElementById(
            "medicationSuggestions"
        );

    if (!suggestions) return;

    const term = searchTerm.trim();

    if (!term) {
        suggestions.innerHTML = "";
        suggestions.classList.remove("show");
        return;
    }

    suggestions.innerHTML = `
        <div class="medication-loading">
            <i class="fa-solid fa-spinner fa-spin"></i>
            Searching...
        </div>
    `;

    suggestions.classList.add("show");

    try {

        const {
            data,
            error
        } = await supabaseClient

            .from("drugs")

            .select(`
                id,
                drug_name,
                concentration,
                dosage_form,
                category_id
            `)

            .or(
                `drug_name.ilike.%${term}%,` +
                `concentration.ilike.%${term}%,` +
                `dosage_form.ilike.%${term}%`
            )

            .order(
                "drug_name",
                {
                    ascending: true
                }
            )

            .limit(20);


        if (error) {

            console.error(
                "Medication search error:",
                error
            );

            suggestions.innerHTML = `
                <div class="medication-no-results">
                    حدث خطأ أثناء البحث
                </div>
            `;

            return;
        }


        if (
            !Array.isArray(data) ||
            data.length === 0
        ) {

            suggestions.innerHTML = `
                <div class="medication-no-results">
                    <i class="fa-solid fa-magnifying-glass"></i>
                    لا توجد أدوية مطابقة
                </div>
            `;

            return;
        }


        renderMedicationSuggestions(data);

    }

    catch (error) {

        console.error(
            "Medication search exception:",
            error
        );

        suggestions.innerHTML = `
            <div class="medication-no-results">
                حدث خطأ أثناء البحث
            </div>
        `;
    }
}
/* ============================================================
   RENDER SUGGESTIONS
============================================================ */

function renderMedicationSuggestions(data) {

    const suggestions =
        document.getElementById(
            "medicationSuggestions"
        );

    if (!suggestions) return;


    suggestions.innerHTML = "";


    data.forEach(drug => {

        const item =
            document.createElement("div");

        item.className =
            "medication-suggestion";


        /*
         * الاسم الذي سيظهر للمستخدم
         *
         * مثال:
         * Hibiotic 1 g tab
         * Hibiotic 600 mg susp
         */

        const displayName =
            buildMedicationDisplayName(drug);


        item.innerHTML = `

            <div class="medication-suggestion-main">

                <i class="fa-solid fa-capsules"></i>

                <div>

                    <div class="medication-name">
                        ${escapeHtml(displayName)}
                    </div>

                    ${
                        drug.dosage_form
                        ? `
                            <div class="medication-form">
                                ${escapeHtml(
                                    drug.dosage_form
                                )}
                            </div>
                        `
                        : ""
                    }

                </div>

            </div>

        `;


        /*
         * عند اختيار الدواء
         */
        item.addEventListener(
            "mousedown",
            function(event) {

                event.preventDefault();

                selectMedication(drug);

            }
        );


        suggestions.appendChild(item);

    });


    suggestions.classList.add("show");

}


/* ============================================================
   BUILD DISPLAY NAME
============================================================ */

function buildMedicationDisplayName(drug) {

    let name =
        drug.drug_name || "";


    /*
     * تحويل dosage_form إلى اختصار
     */

    let form = "";

    if (drug.dosage_form) {

        const dosageForm =
            drug.dosage_form
                .toLowerCase()
                .trim();


        const formMap = {

            "tablet": "tab",

            "capsule": "cap",

            "oral suspension": "susp",

            "suspension": "susp",

            "syrup": "syr",

            "oral solution": "sol",

            "solution": "sol",

            "injection": "inj",

            "dental injection": "dental inj",

            "mouthwash": "mouthwash",

            "oral gel": "gel",

            "dental gel": "gel",

            "inhaler": "inhaler",

            "sublingual tablet": "SL tab"

        };


        form =
            formMap[dosageForm] ||
            drug.dosage_form;

    }


    /*
     * النتيجة:
     *
     * Hibiotic 1 g tab
     */

    if (
        drug.concentration &&
        form
    ) {

        return `${name} ${drug.concentration} ${form}`;

    }


    if (drug.concentration) {

        return `${name} ${drug.concentration}`;

    }


    if (form) {

        return `${name} ${form}`;

    }


    return name;

}


/* ============================================================
   SELECT MEDICATION
============================================================ */

function selectMedication(drug) {

    const input =
        document.getElementById(
            "visitMedicationInput"
        );

    const hiddenId =
        document.getElementById(
            "visitMedicationId"
        );

    const suggestions =
        document.getElementById(
            "medicationSuggestions"
        );


    if (!input || !hiddenId) {
        return;
    }


    /*
     * الاسم الظاهر للمستخدم
     */
    input.value =
        buildMedicationDisplayName(drug);


    /*
     * IMPORTANT:
     * يتم حفظ ID وليس الاسم
     */
    hiddenId.value =
        drug.id;


    /*
     * حفظ الكائن كاملًا إذا احتجته
     */
    input.dataset.drugId =
        drug.id;


    /*
     * إغلاق الاقتراحات
     */
    if (suggestions) {

        suggestions.innerHTML = "";

        suggestions.classList.remove(
            "show"
        );

    }


    console.log(
        "Selected medication:",
        {
            id: drug.id,
            name: drug.drug_name,
            concentration: drug.concentration,
            dosage_form: drug.dosage_form
        }
    );

}


/* ============================================================
   GET SELECTED MEDICATION ID
============================================================ */

function getSelectedMedicationId() {

    const hiddenId =
        document.getElementById(
            "visitMedicationId"
        );

    if (!hiddenId) {
        return null;
    }

    return hiddenId.value || null;

}


/* ============================================================
   HTML ESCAPE
============================================================ */

function escapeHtml(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}
/* =====================================================
   RECALL SERVICE
===================================================== */

let selectedRecallServiceId = null;


/* =====================================================
   OPEN MODAL
===================================================== */

async function openRecallServiceModal(){

    /* =========================
       CURRENT VISIT
    ========================= */

    if(!window.currentVisitId){

        showToast(
            "اختر الزيارة الحالية أولاً"
        );

        return;

    }


    /* =========================
       CURRENT PATIENT
    ========================= */

    if(!patientId){

        showToast(
            "لم يتم تحديد المريض"
        );

        return;

    }


    selectedRecallServiceId = null;


    const modal =
        document.getElementById(
            "recallServiceModal"
        );


    const list =
        document.getElementById(
            "recallServicesList"
        );


    if(!modal || !list){

        console.error(
            "Recall modal elements not found"
        );

        return;

    }


    modal.style.display = "flex";


    list.innerHTML = `

        <div class="recall-loading">

            <i class="fa-solid fa-spinner fa-spin"></i>

            جاري تحميل الخدمات...

        </div>

    `;


    /* =========================
       GET USER
    ========================= */

    const {
        data:userData,
        error:userError
    }
    =
    await supabaseClient.auth.getUser();


    if(
        userError ||
        !userData?.user
    ){

        list.innerHTML = `

            <div class="recall-empty">

                <i class="fa-solid fa-circle-exclamation"></i>

                تعذر العثور على المستخدم

            </div>

        `;

        return;

    }


    const userId =
        userData.user.id;


    /* =========================
       GET PATIENT SERVICES
    ========================= */

    const {
        data:services,
        error:serviceError
    }
    =
    await supabaseClient

    .from("patientt_services")

    .select(`
        id,
        patient_id,
        visit_id,
        service_name,
        total_amount,
        paid_amount,
        remain_amount,
        created_at
    `)

    .eq(
        "patient_id",
        patientId
    )

    .eq(
        "user_id",
        userId
    )

    .order(
        "created_at",
        {
            ascending:false
        }
    );


    if(serviceError){

        console.error(
            "Recall services error:",
            serviceError
        );


        list.innerHTML = `

            <div class="recall-empty">

                <i class="fa-solid fa-triangle-exclamation"></i>

                حدث خطأ أثناء تحميل الخدمات

            </div>

        `;

        return;

    }


    /* =========================
       NO SERVICES
    ========================= */

    if(!services?.length){

        list.innerHTML = `

            <div class="recall-empty">

                <i class="fa-solid fa-folder-open"></i>

                لا توجد خدمات سابقة لهذا المريض

            </div>

        `;

        return;

    }


    /* =========================
       GET ALREADY LINKED SERVICES
       FOR CURRENT VISIT
    ========================= */

    const {
        data:currentVisitLinks,
        error:linksError
    }
    =
    await supabaseClient

    .from("patient_service_visits")

    .select("service_id")

    .eq(
        "visit_id",
        window.currentVisitId
    );


    if(linksError){

        console.error(
            "Recall links error:",
            linksError
        );

        list.innerHTML = `

            <div class="recall-empty">

                <i class="fa-solid fa-triangle-exclamation"></i>

                تعذر التحقق من الخدمات المستدعاة

            </div>

        `;

        return;

    }


    const linkedServiceIds =
        new Set(
            (currentVisitLinks || [])
                .map(
                    item =>
                        Number(
                            item.service_id
                        )
                )
        );


    /* =========================
       FILTER
    ========================= */

    const availableServices =
        services.filter(service => {

            /* لا تعرض خدمة الزيارة الحالية */

            if(
                Number(service.visit_id) ===
                Number(window.currentVisitId)
            ){

                return false;

            }


            /* لا تعرض خدمة مستدعاة بالفعل */

            if(
                linkedServiceIds.has(
                    Number(service.id)
                )
            ){

                return false;

            }


            return true;

        });


    /* =========================
       NO AVAILABLE SERVICES
    ========================= */

    if(!availableServices.length){

        list.innerHTML = `

            <div class="recall-empty">

                <i class="fa-solid fa-check-circle"></i>

                لا توجد خدمات متاحة للاستدعاء

            </div>

        `;

        return;

    }


    /* =========================
       RENDER
    ========================= */

    list.innerHTML =
        availableServices
        .map(service => {

            const total =
                Number(
                    service.total_amount || 0
                );


            const paid =
                Number(
                    service.paid_amount || 0
                );


            const remain =
                Number(
                    service.remain_amount ??
                    (
                        total - paid
                    )
                );


            const date =
                service.created_at
                ?
                new Date(
                    service.created_at
                ).toLocaleDateString(
                    "en-GB"
                )
                :
                "—";


            return `

                <div
                    class="recall-service-item"
                    data-service-id="${service.id}"
                    onclick="
                        selectRecallService(
                            ${service.id}
                        )
                    ">

                    <div
                        class="recall-service-item-top">

                        <div
                            class="recall-service-name">

                            ${service.service_name || "Service"}

                        </div>


                        <div
                            class="recall-service-check">

                            <i class="fa-solid fa-check"></i>

                        </div>

                    </div>


                    <div class="recall-service-meta">

                        <div class="recall-meta-box">

                            <span
                                class="recall-meta-label">

                                الإجمالي

                            </span>

                            <span
                                class="recall-meta-value">

                                ${total}

                            </span>

                        </div>


                        <div class="recall-meta-box">

                            <span
                                class="recall-meta-label">

                                المدفوع

                            </span>

                            <span
                                class="recall-meta-value">

                                ${paid}

                            </span>

                        </div>


                        <div class="recall-meta-box">

                            <span
                                class="recall-meta-label">

                                المتبقي

                            </span>

                            <span
                                class="recall-meta-value">

                                ${remain}

                            </span>

                        </div>

                    </div>


                    <div
                        class="recall-service-date">

                        <i class="fa-regular fa-calendar"></i>

                        الخدمة الأصلية:
                        ${date}

                    </div>

                </div>

            `;

        })
        .join("");

}


/* =====================================================
   SELECT SERVICE
===================================================== */

function selectRecallService(serviceId){

    selectedRecallServiceId =
        Number(serviceId);


    document
        .querySelectorAll(
            ".recall-service-item"
        )
        .forEach(item => {

            item.classList.remove(
                "selected"
            );

        });


    const selected =
        document.querySelector(
            `.recall-service-item[data-service-id="${serviceId}"]`
        );


    if(selected){

        selected.classList.add(
            "selected"
        );

    }

}


/* =====================================================
   CONFIRM RECALL
===================================================== */

async function confirmRecallService(){

    if(!selectedRecallServiceId){

        showToast(
            "اختر خدمة أولاً"
        );

        return;

    }


    if(!window.currentVisitId){

        showToast(
            "اختر الزيارة الحالية أولاً"
        );

        return;

    }


    if(!patientId){

        showToast(
            "لم يتم تحديد المريض"
        );

        return;

    }


    const {
        data:userData,
        error:userError
    }
    =
    await supabaseClient.auth.getUser();


    if(
        userError ||
        !userData?.user
    ){

        showToast(
            "User not found"
        );

        return;

    }


    const userId =
        userData.user.id;


    /* =========================
       VERIFY SERVICE
       BELONGS TO CURRENT PATIENT
    ========================= */

    const {
        data:service,
        error:serviceError
    }
    =
    await supabaseClient

    .from("patientt_services")

    .select(`
        id,
        patient_id,
        visit_id,
        service_name
    `)

    .eq(
        "id",
        selectedRecallServiceId
    )

    .eq(
        "patient_id",
        patientId
    )

    .eq(
        "user_id",
        userId
    )

    .single();


    if(
        serviceError ||
        !service
    ){

        showToast(
            "الخدمة غير صالحة للاستدعاء"
        );

        return;

    }


    /* =========================
       PREVENT ORIGINAL VISIT
    ========================= */

    if(
        Number(service.visit_id) ===
        Number(window.currentVisitId)
    ){

        showToast(
            "الخدمة موجودة بالفعل في هذه الزيارة"
        );

        return;

    }


    /* =========================
       CHECK DUPLICATE
    ========================= */

    const {
        data:existing,
        error:existingError
    }
    =
    await supabaseClient

    .from("patient_service_visits")

    .select("id")

    .eq(
        "service_id",
        service.id
    )

    .eq(
        "visit_id",
        window.currentVisitId
    )

    .maybeSingle();


    if(existingError){

        console.error(
            "Duplicate check error:",
            existingError
        );

        showToast(
            "حدث خطأ أثناء التحقق"
        );

        return;

    }


    if(existing){

        showToast(
            "هذه الخدمة مستدعاة بالفعل في هذه الزيارة"
        );

        return;

    }


    /* =========================
       INSERT RECALL
    ========================= */

    const {
        error:insertError
    }
    =
    await supabaseClient

    .from("patient_service_visits")

    .insert({

        service_id:
            service.id,

        visit_id:
            window.currentVisitId,

        user_id:
            userId,

        is_original:
            false

    });


    if(insertError){

        console.error(
            "Recall insert error:",
            insertError
        );

        showToast(
            insertError.message
        );

        return;

    }


    /* =========================
       CLOSE
    ========================= */

    closeRecallServiceModal();


    showToast(
        "تم استدعاء الخدمة بنجاح"
    );


    /* =========================
       REFRESH SERVICES
    ========================= */

    await loadPatienttServices();

}


/* =====================================================
   REMOVE RECALLED SERVICE FROM CURRENT VISIT
   DOES NOT DELETE THE ORIGINAL SERVICE
===================================================== */

async function removeRecalledService(serviceId){

    if(!window.currentVisitId){

        showToast(
            "اختر الزيارة الحالية أولاً"
        );

        return;

    }


    if(!patientId){

        showToast(
            "لم يتم تحديد المريض"
        );

        return;

    }


    /* =================================================
       GET USER
    ================================================= */

    const {
        data:userData,
        error:userError
    }
    =
    await supabaseClient.auth.getUser();


    if(
        userError ||
        !userData?.user
    ){

        showToast(
            "User not found"
        );

        return;

    }


    const userId =
        userData.user.id;


    /* =================================================
       VERIFY RECALL BELONGS TO CURRENT VISIT
    ================================================= */

    const {
        data:recall,
        error:recallError
    }
    =
    await supabaseClient

    .from("patient_service_visits")

    .select(`
        id,
        service_id,
        visit_id,
        user_id,
        is_original
    `)

    .eq(
        "service_id",
        serviceId
    )

    .eq(
        "visit_id",
        window.currentVisitId
    )

    .eq(
        "user_id",
        userId
    )

    .eq(
        "is_original",
        false
    )

    .maybeSingle();


    if(recallError){

        console.error(
            "Remove recall lookup error:",
            recallError
        );

        showToast(
            "حدث خطأ أثناء البحث عن الاستدعاء"
        );

        return;

    }


    if(!recall){

        showToast(
            "الخدمة المستدعاة غير موجودة في هذه الزيارة"
        );

        return;

    }


    /* =================================================
       DELETE RECALL RELATION ONLY
    ================================================= */

    const {
        error:deleteError
    }
    =
    await supabaseClient

    .from("patient_service_visits")

    .delete()

    .eq(
        "id",
        recall.id
    )

    .eq(
        "user_id",
        userId
    );


    if(deleteError){

        console.error(
            "Remove recall error:",
            deleteError
        );

        showToast(
            deleteError.message
        );

        return;

    }


    /* =================================================
       SUCCESS
    ================================================= */

    showToast(
        "تم حذف استدعاء الخدمة من الزيارة"
    );


    /* =================================================
       REFRESH
    ================================================= */

    await loadPatienttServices();

}




/* =====================================================
   CLOSE MODAL
===================================================== */

function closeRecallServiceModal(){

    const modal =
        document.getElementById(
            "recallServiceModal"
        );


    if(modal){

        modal.style.display = "none";

    }


    selectedRecallServiceId = null;

}

// الاطبااااء
async function loadServiceDoctors(){

    const select =
        document.getElementById(
            "serviceDoctor"
        );

    if(!select) return;


    const {
        data: { user },
        error: userError
    } =
        await supabaseClient.auth.getUser();


    if(
        userError ||
        !user
    ){

        console.error(
            "User not found"
        );

        return;

    }


    const {
        data,
        error
    } =
        await supabaseClient

        .from("doctors")

        .select(`
            id,
            doctor_name,
            specialization
        `)

        .eq(
            "user_id",
            user.id
        )

        .order(
            "doctor_name",
            {
                ascending: true
            }
        );


    if(error){

        console.error(
            "Load service doctors:",
            error
        );

        return;

    }


    select.innerHTML = `

        <option value="">
            اختر الطبيب
        </option>

    `;


    (data || []).forEach(
        doctor => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                doctor.id;


            option.textContent =
                doctor.specialization
                ?
                `${doctor.doctor_name} — ${doctor.specialization}`
                :
                doctor.doctor_name;


            select.appendChild(
                option
            );

        }
    );

}
window.addEventListener(
    "load",
    () => {

        loadServiceDoctors();

    }
);


function goToVisitsHistory(){

    const details =
        document.getElementById(
            "visitsHistoryDetails"
        );

    if(!details) return;

    details.open = true;

    setTimeout(()=>{

        details.scrollIntoView({

            behavior:"smooth",

            block:"start"

        });

    },150);

}

/* =========================
   WINDOW LOAD
========================= */

window.addEventListener(
    "load",
    async ()=>{

        await loadClinicServicesDropdown();

        if(
            typeof loadPatienttServices
            === "function"
        ){

            loadPatienttServices();

        }

    }
);
/* =====================================================
   DOCTOR SERVICE FIELDS
   نسبة الطبيب + مستحق الطبيب
===================================================== */

function initDoctorServiceFields() {

    const serviceDoctorSelect =
        document.getElementById("serviceDoctor");

    const doctorPercentField =
        document.getElementById("doctorPercentField");

    const doctorAmountField =
        document.getElementById("doctorAmountField");

    const serviceDoctorPercent =
        document.getElementById("serviceDoctorPercent");

    const serviceDoctorAmount =
        document.getElementById("serviceDoctorAmount");

    const servicePaid =
        document.getElementById("servicePaid");

    const serviceDiscount =
        document.getElementById("serviceDiscount");

    const serviceDiscountType =
        document.getElementById("serviceDiscountType");


    /* =====================================================
       CHECK ELEMENTS
    ===================================================== */

    if (!serviceDoctorSelect) {

        console.warn(
            "serviceDoctor element not found"
        );

        return;

    }


    if (!doctorPercentField) {

        console.warn(
            "doctorPercentField element not found"
        );

        return;

    }


    if (!doctorAmountField) {

        console.warn(
            "doctorAmountField element not found"
        );

        return;

    }


    /* =====================================================
       SHOW / HIDE DOCTOR FIELDS
    ===================================================== */

    function updateDoctorFields() {

        const hasDoctor =
            !!serviceDoctorSelect.value;


        if (hasDoctor) {

            doctorPercentField.style.display =
                "";

            doctorAmountField.style.display =
                "";

        } else {

            doctorPercentField.style.display =
                "none";

            doctorAmountField.style.display =
                "none";


            if (serviceDoctorPercent) {

                serviceDoctorPercent.value =
                    "";

            }


            if (serviceDoctorAmount) {

                serviceDoctorAmount.value =
                    "";

            }

        }


        calculateDoctorAmount();

    }


    /* =====================================================
       CALCULATE DOCTOR AMOUNT
       
       الطبيب يحصل على النسبة من:
       
       المبلغ المستحق بعد الخصم
       
       وليس من السعر الأصلي
       وليس من الخصم
       وليس من المدفوع فقط
    ===================================================== */

    function calculateDoctorAmount() {

        if (!serviceDoctorAmount) {
            return;
        }


        /* لا يوجد طبيب */

        if (!serviceDoctorSelect.value) {

            serviceDoctorAmount.value =
                "";

            return;

        }


        const percent =
            Number(
                serviceDoctorPercent?.value || 0
            );


        const total =
            Number(
                document.getElementById(
                    "serviceTotal"
                )?.value || 0
            );


        const discountValue =
            Number(
                serviceDiscount?.value || 0
            );


        const discountType =
            serviceDiscountType?.value ||
            "amount";


        /* =================================================
           CALCULATE DISCOUNT
        ================================================= */

        let discountAmount = 0;


        if (
            discountType ===
            "percentage"
        ) {

            discountAmount =
                total *
                (
                    discountValue /
                    100
                );

        } else {

            discountAmount =
                discountValue;

        }


        /* حماية */

        discountAmount =
            Math.min(
                Math.max(
                    discountAmount,
                    0
                ),
                total
            );


        /* =================================================
           NET AMOUNT
           
           المبلغ المستحق بعد الخصم
        ================================================= */

        const netAmount =
            Math.max(
                total -
                discountAmount,
                0
            );


        /* =================================================
           DOCTOR AMOUNT
           
           نسبة الطبيب من المستحق بعد الخصم
           
           مثال:
           
           الخدمة = 1000
           الخصم = 200
           المستحق = 800
           نسبة الطبيب = 20%
           
           الطبيب = 160
        ================================================= */

        const safePercent =
            Math.min(
                Math.max(
                    percent,
                    0
                ),
                100
            );


        const doctorAmount =
            netAmount *
            (
                safePercent /
                100
            );


        serviceDoctorAmount.value =
            doctorAmount.toFixed(2);

    }


    /* =====================================================
       DOCTOR CHANGE
    ===================================================== */

    serviceDoctorSelect.addEventListener(
        "change",
        updateDoctorFields
    );


    /* =====================================================
       PERCENT CHANGE
    ===================================================== */

    if (serviceDoctorPercent) {

        serviceDoctorPercent.addEventListener(
            "input",
            calculateDoctorAmount
        );

    }


    /* =====================================================
       TOTAL CHANGE
    ===================================================== */

    const serviceTotal =
        document.getElementById(
            "serviceTotal"
        );


    if (serviceTotal) {

        serviceTotal.addEventListener(
            "input",
            calculateDoctorAmount
        );

    }


    /* =====================================================
       DISCOUNT CHANGE
    ===================================================== */

    if (serviceDiscount) {

        serviceDiscount.addEventListener(
            "input",
            calculateDoctorAmount
        );

    }


    /* =====================================================
       DISCOUNT TYPE CHANGE
    ===================================================== */

    if (serviceDiscountType) {

        serviceDiscountType.addEventListener(
            "change",
            calculateDoctorAmount
        );

    }


    /* =====================================================
       PAID CHANGE
       
       نضيفه هنا فقط للتحديث البصري،
       لكن الحساب الأساسي للطبيب من المستحق بعد الخصم.
    ===================================================== */

    if (servicePaid) {

        servicePaid.addEventListener(
            "input",
            calculateDoctorAmount
        );

    }


    /* =====================================================
       INITIAL STATE
    ===================================================== */

    updateDoctorFields();

}
/* =====================================================
   PATIENT PROSTHESIS
   LOAD + RENDER
===================================================== */
/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHtml(value){

    if(value === null || value === undefined){

        return "";

    }


    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}
/* =====================================================
   LOAD PATIENT PROSTHESIS
===================================================== */
async function loadPatientProsthesis() {
    const container = document.getElementById("patientProsthesisContainer");
    const countBadge = document.getElementById("patientProsthesisCount");

    if (!container) {
        console.warn("patientProsthesisContainer not found");
        return;
    }

    const patientId = window.currentPatientId;
    if (!patientId) {
        container.innerHTML = `
            <div class="prosthesis-empty">
                <i class="fa-solid fa-user"></i>
                <h3>لم يتم تحديد المريض</h3>
                <p>افتح ملف المريض لعرض التركيبات</p>
            </div>
        `;
        if (countBadge) countBadge.textContent = "0 Prosthesis";
        return;
    }

    container.innerHTML = `
        <div class="prosthesis-loading">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <span>جاري تحميل التركيبات...</span>
        </div>
    `;

    try {
        /* Load prosthesis with teeth in one query */
        const { data: works, error: worksError } = await supabaseClient
            .from("lab_works")
            .select(`
                id,
                patient_id,
                doctor_name,
                patient_name,
                work_name,
                work_type,
                lab_cost,
                patient_amount,
                delivery_date,
                notes,
                received,
                created_at,
                lab_work_teeth ( tooth_number )
            `)
            .eq("patient_id", patientId)
            .order("created_at", { ascending: false });

        if (worksError) {
            console.error("Failed to load lab works:", worksError);
            container.innerHTML = `
                <div class="prosthesis-error">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <span>حدث خطأ أثناء تحميل التركيبات</span>
                </div>
            `;
            return;
        }

        const worksList = works || [];
        if (countBadge) countBadge.textContent = `${worksList.length} Prosthesis`;

        if (!worksList.length) {
            container.innerHTML = `
                <div class="prosthesis-empty">
                    <div class="prosthesis-empty-icon"><i class="fa-solid fa-tooth"></i></div>
                    <h3>لا توجد تركيبات</h3>
                    <p>لم يتم تسجيل أي تركيبة لهذا المريض حتى الآن</p>
                </div>
            `;
            return;
        }

        /* Render */
        container.innerHTML = worksList.map(work => renderPatientProsthesis(work)).join("");

    } catch (error) {
        console.error("loadPatientProsthesis error:", error);
        container.innerHTML = `
            <div class="prosthesis-error">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <span>حدث خطأ أثناء تحميل التركيبات</span>
            </div>
        `;
    }
}

/* =====================================================
   RENDER PATIENT PROSTHESIS
   HORIZONTAL MODERN ROW — WITH TEETH CHIPS
===================================================== */
function renderPatientProsthesis(work) {
    const received = work.received === true;
    const statusClass = received ? "received" : "pending";
    const statusText = received ? "تم الاستلام" : "قيد التنفيذ";
    const statusIcon = received ? "fa-circle-check" : "fa-clock";
    const deliveryDate = work.delivery_date ? formatProsthesisDate(work.delivery_date) : "غير محدد";

    /* ===== TEETH CHIPS (from joined lab_work_teeth) ===== */
    const teeth = work.lab_work_teeth || [];
    const teethNumbers = teeth
        .map(t => t.tooth_number?.replace(".", "") || "")
        .filter(Boolean);

    const teethHtml = teethNumbers.length
        ? `<div class="prosthesis-row-teeth-chips">
            ${teethNumbers.map(num => `
                <span class="prosthesis-tooth-chip">
                    <i class="fa-solid fa-tooth"></i>
                    ${escapeHtml(num)}
                </span>
            `).join("")}
           </div>`
        : `<span class="prosthesis-row-no-teeth">بدون أسنان</span>`;

    /* ===== NOTES ICON ===== */
    const notesHtml = work.notes
        ? `<div class="prosthesis-row-notes" title="${escapeHtml(work.notes)}">
             <i class="fa-solid fa-note-sticky"></i>
           </div>`
        : "";

    return `
        <div class="patient-prosthesis-row ${received ? "is-received" : "is-pending"}" data-work-id="${work.id}">
            
            <!-- Work Info -->
            <div class="prosthesis-row-work">
                <div class="prosthesis-row-icon">
                    <i class="fa-solid fa-tooth"></i>
                </div>
                <div class="prosthesis-row-work-info">
                    <strong>${escapeHtml(work.work_name || "تركيبة بدون اسم")}</strong>
                    ${work.work_type ? `<span>${escapeHtml(work.work_type)}</span>` : ""}
                </div>
            </div>

            <!-- Doctor -->
            <div class="prosthesis-row-item doctor">
                <span class="prosthesis-row-label">الطبيب</span>
                <strong><i class="fa-solid fa-user-doctor"></i> ${escapeHtml(work.doctor_name || "غير محدد")}</strong>
            </div>

            <!-- TEETH (Improved Display) -->
            <div class="prosthesis-row-item teeth">
                <span class="prosthesis-row-label">الأسنان</span>
                ${teethHtml}
            </div>

            <!-- Delivery -->
            <div class="prosthesis-row-item delivery">
                <span class="prosthesis-row-label">التسليم</span>
                <strong><i class="fa-solid fa-calendar-days"></i> ${deliveryDate}</strong>
            </div>

            <!-- Patient Amount -->
            <div class="prosthesis-row-item amount">
                <span class="prosthesis-row-label">المريض</span>
                <strong>${work.patient_amount != null ? Number(work.patient_amount).toLocaleString("en-US") + " ج.م" : "غير محدد"}</strong>
            </div>

            <!-- Lab Cost -->
            <div class="prosthesis-row-item lab">
                <span class="prosthesis-row-label">المعمل</span>
                <strong>${work.lab_cost != null ? Number(work.lab_cost).toLocaleString("en-US") + " ج.م" : "غير محدد"}</strong>
            </div>

            <!-- Status -->
            <div class="prosthesis-row-status ${statusClass}">
                <i class="fa-solid ${statusIcon}"></i>
                <span>${statusText}</span>
            </div>

            ${notesHtml}
        </div>
    `;
}

/* =====================================================
   FORMAT DATE
===================================================== */
function formatProsthesisDate(dateValue) {
    if (!dateValue) return "غير محدد";
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return "غير محدد";
    return date.toLocaleDateString("ar-EG", { day: "2-digit", month: "short", year: "numeric" });
}
/* =====================================================
   FORMAT PROSTHESIS DATE
===================================================== */


/* =========================================================
   PRINT SERVICE INVOICE
   فاتورة خدمة احترافية مع تفاصيل الدفع
========================================================= */
async function printServiceInvoice(serviceId){

    /* =========================
       GET SERVICE
    ========================= */

    const {
        data: service,
        error: serviceError
    } =
    await supabaseClient

    .from("patientt_services")

    .select(`
        id,
        service_name,
        doctor_id,
        doctor_percent,
        doctor_amount,
        total_amount,
        discount_type,
        discount_value,
        discount_amount,
        paid_amount,
        remain_amount,
        created_at,
        patient_id,
        user_id,
        quantity,
        unit_price
    `)

    .eq("id", serviceId)

    .single();


    if(serviceError || !service){

        showToast("❌ لم يتم العثور على الخدمة");

        return;

    }


    /* =========================
       GET TEETH
    ========================= */

    const {
        data: teeth,
        error: teethError
    } =
    await supabaseClient

    .from("patient_service_teeth")

    .select("tooth_number")

    .eq("service_id", serviceId);


    /* =========================
       GET CLINIC DATA
    ========================= */

    let clinicName = "Dental Clinic";
    let clinicDesc = "نظام إدارة العيادات الطبية";
    let clinicPhone = "";
    let clinicAddress = "";
    let clinicLogo = "";

    if(service.user_id){

        const {
            data: clinicData,
            error: clinicErr
        } =
        await supabaseClient

        .from("clinic_pages")

        .select(`
            clinic_name,
            clinic_description,
            phone,
            address,
            clinic_logo
        `)

        .eq("user_id", service.user_id)

        .maybeSingle();

        if(clinicData){

            clinicName = clinicData.clinic_name || clinicName;
            clinicDesc = clinicData.clinic_description || clinicDesc;
            clinicPhone = clinicData.phone || "";
            clinicAddress = clinicData.address || "";
            clinicLogo = clinicData.clinic_logo || "";

        }

    }


    /* =========================
       GET PAYMENTS
    ========================= */

    const {
        data: payments,
        error: paymentError
    } =
    await supabaseClient

    .from("patient_service_payments")

    .select("*")

    .eq("service_id", serviceId)

    .order("payment_date", { ascending: true });


    if(paymentError){

        console.error("Payment load error:", paymentError);

    }


    /* =========================
       GET DOCTOR
    ========================= */

    let doctorName = "";

    if(service.doctor_id){

        const {
            data: doctor
        } =
        await supabaseClient

        .from("doctors")

        .select("doctor_name")

        .eq("id", service.doctor_id)

        .single();

        if(doctor){

            doctorName = doctor.doctor_name;

        }

    }


    /* =========================
       GET PATIENT + PHONE
    ========================= */

    let patientName = "Patient";
    let patientPhoneFormatted = "";

    const targetPatientId = service.patient_id || (typeof patientId !== "undefined" ? patientId : null);

    if(targetPatientId){

        const {
            data: patient,
            error: patientError
        } =
        await supabaseClient

        .from("patients")

        .select("full_name, phone")

        .eq("id", targetPatientId)

        .single();

        if(patientError){

            console.error("Patient load error:", patientError);

        }

        if(patient && patient.full_name){

            patientName = patient.full_name;

        }

        if(patient && patient.phone){

            let rawPhone = String(patient.phone).replace(/\D/g, "");

            if(rawPhone.startsWith("0")){

                rawPhone = "2" + rawPhone;

            }

            if(rawPhone.length >= 10){

                patientPhoneFormatted = rawPhone;

            }

        }

    }


    /* =========================
       CALCULATIONS
    ========================= */

    const total =
        Number(service.total_amount || 0);

    const discount =
        Number(service.discount_amount || 0);

    const netTotal =
        Math.max(total - discount, 0);

    const paid =
        Number(service.paid_amount || 0);

    const remain =
        Number(service.remain_amount || 0);

    const quantity =
        Number(service.quantity || 1);

    const unitPrice =
        Number(service.unit_price || 0);

    const serviceDate =
        service.created_at

        ?

        new Date(service.created_at)
        .toLocaleDateString("en-GB")

        :

        new Date()
        .toLocaleDateString("en-GB");


    /* =========================
       BUILD TEETH HTML
    ========================= */

    let teethHTML = "";

    if(teeth && teeth.length > 0){

        const teethBadges = teeth.map(t => `

            <span class="tooth-badge">

                ${t.tooth_number}

            </span>

        `).join("");

        teethHTML = `

        <div class="teeth-section">

            <div class="section-title">

                <i class="fa-solid fa-teeth"></i>

                الأسنان المعالجة

            </div>

            <div class="teeth-grid">

                ${teethBadges}

            </div>

        </div>

        `;

    }


    /* =========================
       BUILD PAYMENTS ROWS
    ========================= */

    let paymentsRows = "";


    if(payments && payments.length > 0){

        payments.forEach((payment, index) => {

            const pDate =
                payment.payment_date

                ?

                new Date(payment.payment_date)
                .toLocaleDateString("en-GB")

                :

                "-";

            const pMethod = payment.payment_method || "نقدي";

            const methodIcon = {
                "نقدي": "fa-money-bill-wave",
                "فيزا": "fa-credit-card",
                "تحويل": "fa-building-columns",
                "شيك": "fa-money-check",
                "آجل": "fa-clock"
            }[pMethod] || "fa-money-bill-wave";

            paymentsRows += `

            <tr>

                <td>${index + 1}</td>

                <td>${pDate}</td>

                <td><i class="fa-solid ${methodIcon}" style="margin-left:6px; color:#64748b;"></i>${pMethod}</td>

                <td>${Number(payment.amount || 0).toFixed(2)} EGP</td>

                <td>${payment.note || "Payment"}</td>

            </tr>

            `;

        });

    } else {

        paymentsRows = `

        <tr>

            <td colspan="5" style="text-align:center; color:#94a3b8;">

                لا توجد دفعات مسجلة

            </td>

        </tr>

        `;

    }


    /* =========================
       CLINIC LOGO HTML
    ========================= */

    const logoHTML = clinicLogo

        ?

        `<img src="${clinicLogo}" style="width:60px; height:60px; object-fit:cover; border-radius:12px; margin-left:16px; border:2px solid rgba(255,255,255,0.3);">`

        :

        `<div style="width:60px; height:60px; background:rgba(255,255,255,0.15); border-radius:12px; margin-left:16px; display:flex; align-items:center; justify-content:center; font-size:24px;">
            <i class="fa-solid fa-tooth"></i>
         </div>`;


    /* =========================
       WHATSAPP BUTTON HTML
    ========================= */

    const whatsappBtnHTML = patientPhoneFormatted

        ?

        `<button class="btn btn-whatsapp" onclick="captureAndSend()">
            <i class="fa-brands fa-whatsapp"></i>
            إرسال للمريض
        </button>`

        :

        `<button class="btn btn-whatsapp" onclick="alert('لا يوجد رقم هاتف مسجل لهذا المريض')" style="opacity:0.6; cursor:not-allowed;">
            <i class="fa-brands fa-whatsapp"></i>
            إرسال للمريض
        </button>`;


    const invoiceHTML = `

    <!DOCTYPE html>

    <html lang="ar" dir="ltr">

    <head>

        <meta charset="UTF-8">

        <title>فاتورة - ${service.service_name}</title>

        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">

        <script src="https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js"><\/script>

        <style>
  /* =========================================
           FIXED LTR PRINT DIRECTION
           مستقل تماماً عن لغة النظام
           ========================================= */

        html {
            direction: ltr !important;
            unicode-bidi: isolate;
        }

        body {
            direction: ltr !important;
            unicode-bidi: isolate;
        }

        .report-container {
            direction: ltr !important;
        }
            @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap');

            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            body {
                font-family: 'Tajawal', sans-serif;
                background: #f1f5f9;
                padding: 40px 20px 120px 20px;
                color: #1e293b;
            }

            .invoice-container {
                max-width: 800px;
                margin: 0 auto;
                background: #fff;
                border-radius: 16px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.08);
                overflow: hidden;
            }

            .invoice-header {
                background: linear-gradient(
                    135deg,
                    #0f172a 0%,
                    #1e293b 50%,
                    #334155 100%
                );
                color: #fff;
                padding: 40px;
                position: relative;
                min-height: 0;
                overflow: hidden;
            }

            .invoice-header::after {
                content: '';
                position: absolute;
                left: -5%;
                right: -5%;
                bottom: -45px;
                height: 70px;
                background: #fff;
                border-radius: 50% 50% 0 0;
                z-index: 0;
                pointer-events: none;
            }

            .header-top {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 30px;
                margin-bottom: 35px;
                position: relative;
                z-index: 2;
            }

            .clinic-brand {
                display: flex;
                align-items: flex-start;
                gap: 16px;
                min-width: 0;
                flex: 1;
                position: relative;
                z-index: 2;
            }

            .clinic-info {
                display: flex;
                flex-direction: column;
                gap: 8px;
                min-width: 0;
                width: 100%;
                max-width: 380px;
                position: relative;
                z-index: 2;
            }

            .clinic-info h1 {
                font-size: 26px;
                font-weight: 800;
                margin: 0;
                padding: 0;
                letter-spacing: -0.5px;
                line-height: 1.35;
                color: #fff;
                white-space: normal;
                overflow: visible;
                overflow-wrap: break-word;
                word-break: normal;
            }

            .clinic-info p {
                opacity: 0.85;
                font-size: 13px;
                line-height: 1.6;
                width: 100%;
                max-width: 340px;
                margin: 0;
                padding: 0;
                color: #fff;
                white-space: normal;
                overflow-wrap: break-word;
                word-break: normal;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }

            .header-bottom {
                display: flex;
                gap: 40px;
                position: relative;
                z-index: 2;
                flex-wrap: wrap;
            }

            .invoice-badge {
                background: rgba(255,255,255,0.15);
                backdrop-filter: blur(10px);
                padding: 12px 24px;
                border-radius: 12px;
                text-align: center;
                border: 1px solid rgba(255,255,255,0.2);
            }

            .invoice-badge .label {
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 1px;
                opacity: 0.8;
                display: block;
                margin-bottom: 4px;
            }

            .invoice-badge .value {
                font-size: 20px;
                font-weight: 700;
            }

            .info-box {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .info-box i {
                width: 40px;
                height: 40px;
                background: rgba(255,255,255,0.15);
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
            }

            .info-box .label {
                font-size: 11px;
                opacity: 0.7;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .info-box .value {
                font-size: 15px;
                font-weight: 700;
            }

            .invoice-body {
                padding: 40px;
                padding-top: 20px;
            }

            .section-title {
                font-size: 13px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 1.5px;
                color: #64748b;
                margin-bottom: 16px;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .section-title::after {
                content: '';
                flex: 1;
                height: 1px;
                background: #e2e8f0;
            }

            .service-card {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 24px;
                margin-bottom: 30px;
            }

            .service-main {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 20px;
            }

            .service-name {
                font-size: 22px;
                font-weight: 800;
                color: #0f172a;
                margin-bottom: 8px;
            }

            .service-meta {
                display: flex;
                gap: 20px;
                flex-wrap: wrap;
            }

            .meta-item {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 13px;
                color: #64748b;
            }

            .meta-item i {
                color: #0ea5e9;
            }

            .service-date {
                text-align: left;
            }

            .service-date .date {
                font-size: 18px;
                font-weight: 700;
                color: #0f172a;
            }

            .service-date .label {
                font-size: 11px;
                color: #94a3b8;
                text-transform: uppercase;
            }

            /* TEETH SECTION */
            .teeth-section {
                margin-bottom: 30px;
            }

            .teeth-grid {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }

            .tooth-badge {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 40px;
                height: 36px;
                padding: 0 12px;
                background: linear-gradient(135deg, #0ea5e9, #0284c7);
                color: #fff;
                border-radius: 10px;
                font-size: 14px;
                font-weight: 700;
                box-shadow: 0 2px 8px rgba(14, 165, 233, 0.25);
            }

            .teeth-count {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                padding: 12px 18px;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                margin-top: 12px;
                font-size: 14px;
                color: #475569;
            }

            .teeth-count strong {
                color: #0f172a;
                font-size: 18px;
            }

            /* FINANCIAL TABLE */
            .financial-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 30px;
            }

            .financial-table th {
                background: #0f172a;
                color: #fff;
                padding: 14px 16px;
                text-align: right;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .financial-table td {
                padding: 14px 16px;
                border-bottom: 1px solid #f1f5f9;
                font-size: 14px;
            }

            .financial-table tr:nth-child(even) {
                background: #f8fafc;
            }

            .financial-table .amount {
                font-weight: 700;
                font-size: 15px;
            }

            .financial-table .positive {
                color: #059669;
            }

            .financial-table .negative {
                color: #dc2626;
            }

            .financial-table .highlight {
                background: #eff6ff !important;
            }

            .financial-table .highlight td {
                color: #0369a1;
                font-weight: 800;
                font-size: 16px;
                border-top: 2px solid #0ea5e9;
                border-bottom: 2px solid #0ea5e9;
            }

            /* PAYMENTS TABLE */
            .payments-section {
                margin-bottom: 30px;
            }

            .payments-table {
                width: 100%;
                border-collapse: collapse;
            }

            .payments-table th {
                background: #f1f5f9;
                color: #475569;
                padding: 12px 16px;
                text-align: right;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
            }

            .payments-table td {
                padding: 12px 16px;
                border-bottom: 1px solid #f1f5f9;
                font-size: 14px;
            }

            .payments-table tr:hover {
                background: #f8fafc;
            }

            /* SUMMARY BOXES */
            .summary-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 16px;
                margin-bottom: 30px;
            }

            .summary-box {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 20px;
                text-align: center;
            }

            .summary-box.paid {
                background: #ecfdf5;
                border-color: #a7f3d0;
            }

            .summary-box.remain {
                background: #fef2f2;
                border-color: #fecaca;
            }

            .summary-box.net {
                background: #eff6ff;
                border-color: #bfdbfe;
            }

            .summary-box .label {
                font-size: 12px;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 8px;
            }

            .summary-box .value {
                font-size: 24px;
                font-weight: 800;
            }

            .summary-box.paid .value {
                color: #059669;
            }

            .summary-box.remain .value {
                color: #dc2626;
            }

            .summary-box.net .value {
                color: #0369a1;
            }

            /* FOOTER */
            .invoice-footer {
                border-top: 2px dashed #e2e8f0;
                padding: 30px 40px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .footer-note {
                font-size: 13px;
                color: #64748b;
                line-height: 1.6;
            }

            .footer-note strong {
                color: #0f172a;
            }

            .signature-area {
                text-align: center;
            }

            .signature-line {
                width: 150px;
                height: 1px;
                background: #94a3b8;
                margin: 0 auto 8px;
            }

            .signature-label {
                font-size: 12px;
                color: #94a3b8;
            }

            /* PRINT ACTIONS */
            .print-actions {
                position: fixed;
                bottom: 30px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 12px;
                z-index: 1000;
                flex-wrap: wrap;
                justify-content: center;
            }

            .btn {
                padding: 14px 28px;
                border: none;
                border-radius: 12px;
                font-family: 'Tajawal', sans-serif;
                font-size: 15px;
                font-weight: 700;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: all 0.2s;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }

            .btn-print {
                background: #0f172a;
                color: #fff;
            }

            .btn-print:hover {
                background: #1e293b;
                transform: translateY(-2px);
            }

            .btn-close {
                background: #fff;
                color: #475569;
                border: 1px solid #e2e8f0;
            }

            .btn-close:hover {
                background: #f8fafc;
            }

            .btn-whatsapp {
                background: linear-gradient(135deg, #25d366, #128c7e);
                color: #fff;
            }

            .btn-whatsapp:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(37, 211, 102, 0.35);
            }

            @media print {
                body {
                    background: #f1f5f9;
                    padding: 20px;
                }
                .invoice-container {
                    box-shadow: 0 10px 40px rgba(0,0,0,0.08);
                    border-radius: 16px;
                }
                .print-actions {
                    display: none !important;
                }
                .invoice-header::after {
                    display: block;
                }
            }

        </style>

    </head>

    <body>

        <div class="invoice-container" id="invoiceCaptureArea">

            <!-- HEADER -->

            <div class="invoice-header">

                <div class="header-top">

                    <div class="clinic-brand">

                        ${logoHTML}

                        <div class="clinic-info">

                            <h1>${clinicName}</h1>

                            <p>${clinicDesc}</p>

                        </div>

                    </div>

                    <div class="invoice-badge">

                        <span class="label">رقم الفاتورة</span>

                        <span class="value">#${service.id}</span>

                    </div>

                </div>

                <div class="header-bottom">

                    <div class="info-box">

                        <i class="fa-solid fa-user"></i>

                        <div>

                            <div class="label">المريض</div>

                            <div class="value">${patientName}</div>

                        </div>

                    </div>

                    <div class="info-box">

                        <i class="fa-solid fa-calendar"></i>

                        <div>

                            <div class="label">التاريخ</div>

                            <div class="value">${serviceDate}</div>

                        </div>

                    </div>

                    ${clinicPhone ? `

                    <div class="info-box">

                        <i class="fa-solid fa-phone"></i>

                        <div>

                            <div class="label">الهاتف</div>

                            <div class="value" dir="ltr">${clinicPhone}</div>

                        </div>

                    </div>

                    ` : ''}

                </div>

            </div>


            <!-- BODY -->

            <div class="invoice-body">

                <!-- SERVICE DETAILS -->

                <div class="section-title">

                    <i class="fa-solid fa-screwdriver-wrench"></i>

                    تفاصيل الخدمة

                </div>

                <div class="service-card">

                    <div class="service-main">

                        <div>

                            <div class="service-name">

                                ${service.service_name}

                            </div>

                            <div class="service-meta">

                                ${doctorName ? `

                                <div class="meta-item">

                                    <i class="fa-solid fa-user-doctor"></i>

                                    <span>د. ${doctorName}</span>

                                </div>

                                ` : ''}

                                <div class="meta-item">

                                    <i class="fa-solid fa-percent"></i>

                                    <span>نسبة الطبيب: ${Number(service.doctor_percent || 0).toFixed(0)}%</span>

                                </div>

                                ${quantity > 1 ? `

                                <div class="meta-item">

                                    <i class="fa-solid fa-layer-group"></i>

                                    <span>الكمية: ${quantity}</span>

                                </div>

                                ` : ''}

                            </div>

                        </div>

                        <div class="service-date">

                            <div class="date">${serviceDate}</div>

                            <div class="label">تاريخ الخدمة</div>

                        </div>

                    </div>

                </div>


                <!-- TEETH -->

                ${teethHTML}

                ${teeth && teeth.length > 0 ? `

                <div class="teeth-count">

                    <i class="fa-solid fa-calculator" style="color:#0ea5e9;"></i>

                    إجمالي عدد الأسنان: <strong>${teeth.length}</strong>

                </div>

                ` : ''}


                <!-- FINANCIAL DETAILS -->

                <div class="section-title">

                    <i class="fa-solid fa-file-invoice-dollar"></i>

                    تفاصيل المبالغ المالية

                </div>

                <table class="financial-table">

                    <thead>

                        <tr>

                            <th>البيان</th>

                            <th style="width:180px; text-align:center;">المبلغ</th>

                        </tr>

                    </thead>

                    <tbody>

                        ${unitPrice > 0 ? `

                        <tr>

                            <td><i class="fa-solid fa-tag" style="color:#64748b; margin-left:8px;"></i> سعر الوحدة</td>

                            <td class="amount" style="text-align:center;">${unitPrice.toFixed(2)} EGP</td>

                        </tr>

                        ` : ''}

                        ${quantity > 1 ? `

                        <tr>

                            <td><i class="fa-solid fa-xmark" style="color:#64748b; margin-left:8px;"></i> الكمية</td>

                            <td class="amount" style="text-align:center;">× ${quantity}</td>

                        </tr>

                        ` : ''}

                        <tr>

                            <td><i class="fa-solid fa-money-bill-wave" style="color:#64748b; margin-left:8px;"></i> السعر الأصلي</td>

                            <td class="amount" style="text-align:center;">${total.toFixed(2)} EGP</td>

                        </tr>

                        <tr>

                            <td><i class="fa-solid fa-tag" style="color:#64748b; margin-left:8px;"></i> الخصم ${service.discount_type === 'percentage' ? `(${Number(service.discount_value || 0).toFixed(0)}%)` : ''}</td>

                            <td class="amount negative" style="text-align:center;">-${discount.toFixed(2)} EGP</td>

                        </tr>

                        <tr class="highlight">

                            <td><i class="fa-solid fa-receipt" style="color:#0369a1; margin-left:8px;"></i> المبلغ المستحق بعد الخصم</td>

                            <td class="amount" style="text-align:center;">${netTotal.toFixed(2)} EGP</td>

                        </tr>

                    </tbody>

                </table>


                <!-- SUMMARY -->

                <div class="summary-grid">

                    <div class="summary-box net">

                        <div class="label">المستحق</div>

                        <div class="value">${netTotal.toFixed(2)}</div>

                    </div>

                    <div class="summary-box paid">

                        <div class="label">المدفوع</div>

                        <div class="value">${paid.toFixed(2)}</div>

                    </div>

                    <div class="summary-box remain">

                        <div class="label">المتبقي</div>

                        <div class="value">${remain.toFixed(2)}</div>

                    </div>

                </div>


                <!-- PAYMENTS HISTORY -->

                <div class="payments-section">

                    <div class="section-title">

                        <i class="fa-solid fa-clock-rotate-left"></i>

                        سجل الدفعات

                    </div>

                    <table class="payments-table">

                        <thead>

                            <tr>

                                <th style="width:60px;">#</th>

                                <th>التاريخ</th>

                                <th>طريقة الدفع</th>

                                <th>المبلغ</th>

                                <th>ملاحظات</th>

                            </tr>

                        </thead>

                        <tbody>

                            ${paymentsRows}

                        </tbody>

                    </table>

                </div>

            </div>


            <!-- FOOTER -->

            <div class="invoice-footer">

                <div class="footer-note">

                    <strong>ملاحظة:</strong> يرجى الاحتفاظ بهذه الفاتورة للمراجعة.<br>

                    ${clinicAddress ? `<span>العنوان: ${clinicAddress}</span><br>` : ''}

                    شكراً لثقتكم بنا.

                </div>

                <div class="signature-area">

                    <div class="signature-line"></div>

                    <div class="signature-label">توقيع المسؤول</div>

                </div>

            </div>

        </div>


        <!-- PRINT ACTIONS -->

        <div class="print-actions">

            <button class="btn btn-print" onclick="window.print()">

                <i class="fa-solid fa-print"></i>

                طباعة الفاتورة

            </button>

            ${whatsappBtnHTML}

            <button class="btn btn-close" onclick="window.close()">

                <i class="fa-solid fa-xmark"></i>

                إغلاق

            </button>

        </div>


        <!-- CAPTURE SCRIPT -->

        <script>

            async function captureAndSend(){
                const actions = document.querySelector('.print-actions');
                actions.style.display = 'none';
                await new Promise(r => setTimeout(r, 400));

                try {
                    const element = document.getElementById('invoiceCaptureArea');

                    const dataUrl = await htmlToImage.toPng(element, {
                        quality: 1.0,
                        pixelRatio: 2.5,
                        backgroundColor: '#ffffff',
                        fontEmbedCSS: true,
                        skipFonts: false
                    });

                    actions.style.display = 'flex';

                    const response = await fetch(dataUrl);
                    const blob = await response.blob();

                    try {
                        if(navigator.clipboard && window.ClipboardItem){
                            await navigator.clipboard.write([
                                new ClipboardItem({ 'image/png': blob })
                            ]);
                            
                            window.open('https://wa.me/${patientPhoneFormatted}', '_blank');
                            
                            setTimeout(() => {
                                alert('✅ تم نسخ الفاتورة!\\n\\nانتقل إلى نافذة واتساب واضغط:\\n📋 Ctrl + V (للصق)');
                            }, 1500);
                            
                        } else {
                            throw new Error('Clipboard not supported');
                        }
                    } catch(e) {
                        const a = document.createElement('a');
                        a.href = dataUrl;
                        a.download = 'invoice-${service.id}.png';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        
                        window.open('https://wa.me/${patientPhoneFormatted}', '_blank');
                        
                        alert('📥 تم تحميل الفاتورة.\\n\\nالخطوات:\\n1. انتقل إلى واتساب\\n2. اضغط على زر المرفقات 📎\\n3. اختر الصورة من التنزيلات');
                    }

                } catch(err) {
                    console.error(err);
                    actions.style.display = 'flex';
                    window.open('https://wa.me/${patientPhoneFormatted}', '_blank');
                }
            }

        <\/script>

    </body>

    </html>

    `;


    /* =========================
       OPEN PRINT WINDOW
    ========================= */

    const printWindow = window.open("", "_blank", "width=950,height=800");

    if(!printWindow){

        showToast("❌ يرجى السماح بفتح النوافذ المنبثقة");

        return;

    }

    printWindow.document.write(invoiceHTML);

    printWindow.document.close();

}
/* =====================================================
   INITIALIZE AFTER HTML IS READY
===================================================== */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initDoctorServiceFields
    );

} else {

    initDoctorServiceFields();

}
document.addEventListener("DOMContentLoaded", function () {
    initMedicationAutocomplete();
});
/* ==========================================
   AUTO SCROLL TO OPENED DETAILS IN MODAL
========================================== */

document.addEventListener("toggle", function(e){

    const details = e.target;

    if(
        details.tagName !== "DETAILS" ||
        !details.open
    ){
        return;
    }

    setTimeout(() => {

        details.scrollIntoView({

            behavior: "smooth",
            block: "center",
            inline: "nearest"

        });

    }, 150);

}, true);