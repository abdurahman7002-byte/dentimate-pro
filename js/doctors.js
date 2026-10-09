// ```javascript
/* =========================
GET USER ID
========================= */

let currentUserId = null;

/* =========================
GET USER ID (SAFE)
========================= */


/* =========================
   AUTH GUARD (IMPORTANT)
========================= */

async function checkAuth(){

    const { data: { user } } =
        await supabaseClient.auth.getUser();

    if(!user){
        // 🚨 غير اسم صفحة تسجيل الدخول لو مختلف عندك
        window.location.href = "login.html";
        return;
    }
}

/* تشغيل الحماية فور فتح الصفحة */
checkAuth();

let editingBillId = null;

/* =========================
GET USER
========================= */

async function getUserId(){

    const { data:{user} } =
        await supabaseClient.auth.getUser();

    if(!user){
        window.location.href = "login.html";
        return null;
    }

    return user.id;
}

/* =====================================================
   SAVE DOCTOR
===================================================== */
/* =====================================================
   SAVE DOCTOR
===================================================== */

async function saveDoctor() {

    const doctorName =
        document
            .getElementById("doctorName")
            .value
            .trim();


    if (!doctorName) {

        showToast(
            "Doctor name required",
            "warning"
        );

        return;
    }


    const userId =
        await getUserId();


    if (!userId) {
        return;
    }


    /* =================================================
       GET FORM VALUES
    ================================================= */

    const specialization =
        document
            .getElementById("doctorSpecialization")
            .value
            .trim();


    const birthDate =
        document
            .getElementById("doctorBirthDate")
            .value;


    const phone =
        document
            .getElementById("doctorPhone")
            .value
            .trim();


    const address =
        document
            .getElementById("doctorAddress")
            .value
            .trim();


    /* =================================================
       INSERT DOCTOR
    ================================================= */

    const {
        data: newDoctor,
        error
    } =
        await supabaseClient

            .from("doctors")

            .insert([{

                user_id:
                    userId,

                doctor_name:
                    doctorName,

                specialization:
                    specialization || null,

                birth_date:
                    birthDate || null,

                phone:
                    phone || null,

                address:
                    address || null,

                created_at:
                    new Date().toISOString()

            }])

            .select()
            .single();


    /* =================================================
       ERROR
    ================================================= */

    if (error) {

        console.error(
            "Failed to save doctor:",
            error
        );

        showToast(
            error.message ||
            "Failed to save doctor",
            "error"
        );

        return;
    }


    /* =================================================
       CLEAR FORM
    ================================================= */

    clearDoctorForm();


    /* =================================================
       REFRESH DOCTORS LIST
       الطبيب الجديد يظهر مباشرة
    ================================================= */

    await loadDoctors();


    /* =================================================
       SUCCESS TOAST
    ================================================= */

    showToast(
        "Doctor added successfully",
        "success"
    );

}
function calculateAge(birthDate){

    if(!birthDate){

        return "-";

    }


    const birth =
        new Date(
            birthDate + "T00:00:00"
        );


    const today =
        new Date();


    let age =
        today.getFullYear()
        - birth.getFullYear();


    const month =
        today.getMonth()
        - birth.getMonth();


    if(
        month < 0 ||
        (
            month === 0 &&
            today.getDate() < birth.getDate()
        )
    ){

        age--;

    }


    return age;

}
/* =========================
CLEAR FORM
========================= */

/* =====================================================
   CLEAR DOCTOR FORM
===================================================== */

function clearDoctorForm() {

    const doctorName =
        document.getElementById(
            "doctorName"
        );

    const specialization =
        document.getElementById(
            "doctorSpecialization"
        );

    const birthDate =
        document.getElementById(
            "doctorBirthDate"
        );

    const phone =
        document.getElementById(
            "doctorPhone"
        );

    const address =
        document.getElementById(
            "doctorAddress"
        );


    if (doctorName)
        doctorName.value = "";


    if (specialization)
        specialization.value = "";


    if (birthDate)
        birthDate.value = "";


    if (phone)
        phone.value = "";


    if (address)
        address.value = "";

}
/* =========================
LOAD DOCTORS
========================= */

async function loadDoctors() {

    const userId = await getUserId();
    if (!userId) return;

    const { data, error } = await supabaseClient
        .from("doctors")
        .select("*")
        .eq("user_id", userId)
        .order("id", { ascending: false });

    if (error) {
        console.log(error);
        return;
    }

    const container = document.getElementById("doctorsContainer");
    container.innerHTML = "";

    if (!data || data.length === 0) {
        container.innerHTML = "<p style='color:#94a3b8'>No Doctors Found</p>";
        return;
    }

    data.forEach(doctor => {

        container.innerHTML += `

        <div class="doctor-card">

            <div>
                <div class="doctor-name">
                    ${doctor.doctor_name}
                </div>

                <div style="color:#94a3b8;font-size:13px;">
                    ${doctor.specialization || "-"}
                </div>
            </div>

            <div class="actions">

                <button class="open-btn"
                    onclick="openDoctor(${doctor.id})">
                    Open
                </button>

                <button class="delete-btn"
                    onclick="deleteDoctor(${doctor.id})">
                    Delete
                </button>

            </div>

        </div>
        `;
    });
}

/* =========================
OPEN DOCTOR FILE
========================= */

function openDoctor(id) {
    window.location.href = `doctor_file.html?id=${id}`;
}

/* =========================
DELETE DOCTOR
========================= */

async function deleteDoctor(id){

    if(!await showConfirm("Delete Doctor?")){
        return;
    }


    const {
        error
    } =
        await supabaseClient

            .from("doctors")

            .delete()

            .eq(
                "id",
                id
            );


    if(error){

        console.error(
            "Failed to delete doctor:",
            error
        );

        showToast(
            error.message || "Failed to delete doctor",
            "error"
        );

        return;
    }


    await loadDoctors();


    showToast(
        "Doctor deleted successfully",
        "success"
    );

}
/* =========================
INIT
========================= */

window.addEventListener("load", loadDoctors);

// زر الصفحة الئيسية 
function goToDashboard() {
    window.location.href = "dashboard.html";
}


// احصائيات 
async function loadDoctorsDashboard() {

    const userId = await getUserId();

    const { data, error } = await supabaseClient
        .from("doctor_works")
        .select("*")
        .eq("user_id", userId);   // 🔥 هنا السر

    if (error) {
        console.log(error);
        return;
    }

    

    const doctorStats = {};

    data.forEach(work => {

        totalWorks++;
        totalCost += Number(work.work_cost || 0);
        totalProfit += Number(work.doctor_profit || 0);

        const id = work.doctor_id;

        if (!doctorStats[id]) {
            doctorStats[id] = { count: 0, profit: 0 };
        }

        doctorStats[id].count++;
        doctorStats[id].profit += Number(work.doctor_profit || 0);
    });

    
}

window.addEventListener("load", () => {

    loadDoctors();
    loadDoctorsDashboard();

});