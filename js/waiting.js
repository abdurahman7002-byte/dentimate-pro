const SUPABASE_URL = "https://effgebbqhkzaifwgdpoi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZmdlYmJxaGt6YWlmd2dkcG9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MDk4NzYsImV4cCI6MjA5NDk4NTg3Nn0.YhG_Bzhj2wbMHjtvBymOo6DYb2O2ksfk7svvf-Av9-I";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// ======================
// الساعة
// ======================

function updateClock() {

    const now = new Date();

    const hours = now.getHours() % 12;
const minutes = now.getMinutes();
const seconds = now.getSeconds();

const hourDeg = (hours * 30) + (minutes * 0.5);
const minuteDeg = (minutes * 6) + (seconds * 0.1);
const secondDeg = seconds * 6;

document.getElementById("hourHand").style.transform =
    `translateX(-50%) rotate(${hourDeg}deg)`;

document.getElementById("minuteHand").style.transform =
    `translateX(-50%) rotate(${minuteDeg}deg)`;

document.getElementById("secondHand").style.transform =
    `translateX(-50%) rotate(${secondDeg}deg)`;

    document.getElementById("clock").textContent =
        now.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true
        });

}

setInterval(updateClock, 1000);
updateClock();


async function loadClinicInfo() {

    const { data: userData } =
        await supabaseClient.auth.getUser();

    if (!userData?.user) return;

    const { data, error } =
        await supabaseClient
            .from("clinic_pages")
            .select("clinic_name, clinic_logo")
            .eq("user_id", userData.user.id)
            .single();

    if (error || !data) return;

    // اسم العيادة
    const textEl =
        document.getElementById("clinicNameText");

    const headerEl =
        document.getElementById("clinicNameHeader");

    if (textEl) {
        textEl.textContent =
            data.clinic_name || "Dentix Clinic";
    }

    if (headerEl) {
        headerEl.textContent =
            data.clinic_name || "Dentix Clinic";
    }

    // شعار العيادة
    const clinicLogo =
        document.getElementById("clinicLogo");

    const defaultLogo =
        document.getElementById("defaultLogo");

    if (clinicLogo && data.clinic_logo) {

        clinicLogo.src = data.clinic_logo;

        clinicLogo.style.display = "block";

        if (defaultLogo) {
            defaultLogo.style.display = "none";
        }

    } else {

        if (clinicLogo) {
            clinicLogo.style.display = "none";
        }

        if (defaultLogo) {
            defaultLogo.style.display = "block";
        }

    }

}

// ======================
// تحميل المواعيد
// ======================
async function loadWaitingScreen() {

    const { data: userData } =
        await supabaseClient.auth.getUser();

    if (!userData?.user) {
        return;
    }

    const userId =
        userData.user.id;


    /*
    =====================================================
    GET TODAY VISITS
    =====================================================
    */

    const {
        data,
        error
    } =
        await supabaseClient

            .from("patient_visits")

            .select(`
                *,
                patients(
                    id,
                    full_name,
                    phone
                )
            `)

            .eq("user_id", userId)

            .eq("is_deleted", false)

            .not("appointment_start", "is", null)

            .not("appointment_end", "is", null)

            .order("appointment_start", {
                ascending: true
            });


    if (error) {

        console.log(error);

        return;

    }


    const now =
        new Date();


    const startOfToday =
        new Date();

    startOfToday.setHours(
        0,
        0,
        0,
        0
    );


    const endOfToday =
        new Date();

    endOfToday.setHours(
        23,
        59,
        59,
        999
    );


    /*
    =====================================================
    ALL TODAY VISITS
    =====================================================

    هذه القائمة مهمة جداً للترقيم.

    لا نحذف منها الزيارة لمجرد أنها انتهت.

    نستبعد cancelled فقط.

    =====================================================
    */

    const allTodayVisits =
        (data || []).filter(v => {

            /*
            =========================
            CANCELLED
            =========================
            */

            if (
                v.visit_result === "cancelled"
            ) {
                return false;
            }


            const start =
                new Date(
                    v.appointment_start
                );


            /*
            =========================
            TODAY ONLY
            =========================
            */

            if (
                start < startOfToday ||
                start > endOfToday
            ) {

                return false;

            }


            return true;

        });


    /*
    =====================================================
    ACTIVE VISITS
    =====================================================

    هذه القائمة فقط التي تظهر حالياً.

    =====================================================
    */

    const activeVisits =
        allTodayVisits.filter(v => {

            const start =
                new Date(
                    v.appointment_start
                );


            const end =
                new Date(
                    v.appointment_end
                );


            /*
            =========================
            CONTINUOUS
            =========================
            */

            if (
                v.visit_status === "مستمرة"
            ) {

                return true;

            }


            /*
            =========================
            NOT ENDED
            =========================
            */

            return (
                end >= now
            );

        });


    /*
    =====================================================
    RENDER

    data       = الزيارات المعروضة الآن
    allVisits  = كل زيارات اليوم للترقيم
    =====================================================
    */

    renderWaiting(
        activeVisits,
        allTodayVisits
    );

}
/* =========================
   GO DASHBOARD
========================= */

function goDashboard(){

    window.location.href =
        "dashboard.html";
}


/* =========================
   رسم الشاشة
========================= */

/* =========================
   رسم شاشة الانتظار
========================= */
/* =========================================================
   رسم شاشة الانتظار
========================================================= */

function renderWaiting(
    data,
    allVisits = data
){

    const currentPatient =
        document.getElementById(
            "currentPatient"
        );



    const waitingList =
        document.getElementById(
            "waitingList"
        );



    if(

        !currentPatient

        ||

        !waitingList

    ){

        return;

    }



    waitingList.innerHTML = "";



    /* =====================================================
       NO DATA
    ===================================================== */

    if(

        !data

        ||

        data.length === 0

    ){

        currentPatient.innerHTML = `

            <div class="current-card empty">

                <i class="fa-regular fa-circle-check empty-icon"></i>

                <div class="empty-title">

                    لا يوجد مرضى

                </div>

                <div class="empty-subtitle">

                    قائمة الانتظار فارغة حالياً

                </div>

            </div>

        `;

        return;

    }



    const now =
        new Date();



    /* =====================================================
       VISIT NUMBERS

       استخدام الدالة المشتركة.

       مهم جدًا:

       نستخدم allVisits وليس data فقط.

       وبالتالي الرقم لا يتأثر بكون الزيارة:

       - مستمرة
       - قادمة
       - متواجدة
       - موجودة في قائمة الانتظار
       - مستبعدة من العرض

       الرقم يتم تحديده من جميع الزيارات.
    ===================================================== */

    const visitNumberMap =
        generateVisitNumberMap(
            allVisits
        );



    /* =====================================================
       CURRENT VISITS

       الزيارات التي يتم استقبالها الآن.

       تشمل:

       1. الزيارة داخل وقتها.
       2. الزيارة التي حالتها "مستمرة"
          حتى لو انتهى وقتها.
    ===================================================== */

    const currentVisits =
        data.filter(v => {

            if(
                v.visit_status ===
                "متأخر جدا"
            ){

                return false;

            }



            if(

                !v.appointment_start

                ||

                !v.appointment_end

            ){

                return false;

            }



            const start =
                new Date(
                    v.appointment_start
                );



            const end =
                new Date(
                    v.appointment_end
                );



            return (

                /* الزيارة مستمرة */

                v.visit_status ===
                "مستمرة"

                ||

                /* الوقت الحالي داخل الموعد */

                (

                    start <= now

                    &&

                    end >= now

                )

            );

        });



    /* =====================================================
       CURRENT VISIT IDS

       لمنع ظهور المريض مرة أخرى
       داخل قائمة الانتظار.
    ===================================================== */

    const currentVisitIds =
        new Set(

            currentVisits.map(
                v => v.id
            )

        );



    /* =====================================================
       NEAREST FUTURE VISIT

       أقرب مريض قادم.
    ===================================================== */

    const nearestFuture =

        data

            .filter(v => {

                /* المتأخر جدًا لا يدخل */

                if(
                    v.visit_status ===
                    "متأخر جدا"
                ){

                    return false;

                }



                if(
                    !v.appointment_start
                ){

                    return false;

                }



                return (

                    new Date(
                        v.appointment_start
                    ) > now

                );

            })

            .sort(

                (a,b) =>

                    new Date(
                        a.appointment_start
                    )

                    -

                    new Date(
                        b.appointment_start
                    )

            )[0];



    /* =====================================================
       CURRENT PATIENT
    ===================================================== */

    if(
        currentVisits.length
    ){

        currentPatient.innerHTML = `

            <div class="current-card">

                <div class="current-label">

                    يتم الآن استقبال

                </div>



                <div class="current-patients-grid">

                    ${

                        currentVisits

                            .map(v => {

                                const patientName =

                                    v.patients?.full_name

                                    ||

                                    v.patient_name

                                    ||

                                    "Unknown";



                                const visitNumber =

                                    visitNumberMap.get(
                                        v.id
                                    );



                                const departmentName =

                                    v.department_name

                                    ||

                                    "غير محدد";



                                return `

                                    <div

                                        class="current-patient-item"

                                        style="position:relative;"

                                    >

                                        ${

                                            visitNumber != null

                                            ?

                                            `

                                            <div

                                                style="

                                                    width:48px;

                                                    height:48px;

                                                    margin:0 auto 10px;

                                                    border-radius:50%;

                                                    background:linear-gradient(

                                                        135deg,

                                                        #3b82f6,

                                                        #2563eb

                                                    );

                                                    color:white;

                                                    display:flex;

                                                    align-items:center;

                                                    justify-content:center;

                                                    font-size:19px;

                                                    font-weight:900;

                                                    box-shadow:

                                                        0 6px 16px

                                                        rgba(37,99,235,.22);

                                                    border:3px solid white;

                                                "

                                            >

                                                ${visitNumber}

                                            </div>

                                            `

                                            :

                                            ""

                                        }



                                        <div

                                            class="current-patient-name"

                                        >

                                            ${patientName}

                                        </div>



                                        <div

                                            class="current-patient-department"

                                        >

                                            <i

                                                class="fa-solid fa-hospital"

                                            ></i>

                                            ${departmentName}

                                        </div>

                                    </div>

                                `;

                            })

                            .join("")

                    }

                </div>

            </div>

        `;

    }



    /* =====================================================
       NEAREST FUTURE PATIENT
    ===================================================== */

    else if(
        nearestFuture
    ){

        const patientName =

            nearestFuture.patients?.full_name

            ||

            nearestFuture.patient_name

            ||

            "Unknown";



        const departmentName =

            nearestFuture.department_name

            ||

            "غير محدد";



        const visitNumber =

            visitNumberMap.get(
                nearestFuture.id
            );



        currentPatient.innerHTML = `

            <div class="current-card">

                <div class="current-badge">

                    <i

                        class="fa-solid fa-user-clock"

                    ></i>

                    القادم

                </div>



                ${

                    visitNumber != null

                    ?

                    `

                    <div

                        style="

                            width:58px;

                            height:58px;

                            margin:12px auto 10px;

                            border-radius:50%;

                            background:linear-gradient(

                                135deg,

                                #3b82f6,

                                #2563eb

                            );

                            color:white;

                            display:flex;

                            align-items:center;

                            justify-content:center;

                            font-size:22px;

                            font-weight:900;

                            box-shadow:

                                0 8px 20px

                                rgba(37,99,235,.25);

                            border:4px solid white;

                        "

                    >

                        ${visitNumber}

                    </div>

                    `

                    :

                    ""

                }



                <div class="patient-name-big">

                    ${patientName}

                </div>



                <div class="current-subtitle">

                    المريض التالي في قائمة الانتظار

                </div>



                <div

                    class="current-patient-department"

                    style="margin-top:10px;"

                >

                    <i

                        class="fa-solid fa-hospital"

                    ></i>

                    ${departmentName}

                </div>

            </div>

        `;

    }



    /* =====================================================
       NO CURRENT / NO FUTURE
    ===================================================== */

    else{

        currentPatient.innerHTML = `

            <div class="current-card empty">

                <i

                    class="fa-regular fa-circle-check empty-icon"

                ></i>



                <div class="empty-title">

                    لا يوجد مرضى

                </div>



                <div class="empty-subtitle">

                    قائمة الانتظار فارغة حالياً

                </div>

            </div>

        `;

    }



    /* =====================================================
       WAITING LIST

       لا نعرض أي زيارة موجودة في currentVisits.
    ===================================================== */

    data.forEach(v => {



        /* =================================================
           استبعاد الزيارة الحالية
        ================================================= */

        if(
            currentVisitIds.has(
                v.id
            )
        ){

            return;

        }



        /* =================================================
           VISIT NUMBER

           الرقم من الدالة المشتركة.
        ================================================= */

        const visitNumber =

            visitNumberMap.get(
                v.id
            );



        /* =================================================
           PATIENT INFO
        ================================================= */

        const patientName =

            v.patients?.full_name

            ||

            v.patient_name

            ||

            "Unknown";



        const patientPhone =

            v.patients?.phone

            ||

            v.patient_phone

            ||

            "No Phone";



        /* =================================================
           TIME
        ================================================= */

        const start =
            new Date(
                v.appointment_start
            );



        const end =
            new Date(
                v.appointment_end
            );



        const startTime =

            start.toLocaleTimeString(

                "en-US",

                {

                    hour:
                        "numeric",

                    minute:
                        "2-digit",

                    hour12:
                        true

                }

            );



        const endTime =

            end.toLocaleTimeString(

                "en-US",

                {

                    hour:
                        "numeric",

                    minute:
                        "2-digit",

                    hour12:
                        true

                }

            );



        /* =================================================
           STATUS
        ================================================= */

        let color =
            "#3b82f6";



        let status =
            "قادم";



        if(
            v.visit_status ===
            "وصول المريض"
        ){

            color =
                "#10b981";

            status =
                "متواجد";

        }



        if(
            v.visit_status ===
            "متأخر جدا"
        ){

            color =
                "#ef4444";

            status =
                "متأخر";

        }



        /* =================================================
           AVATAR
        ================================================= */

        const avatarLetter =

            patientName

            &&

            patientName !==
            "Unknown"

                ?

                patientName
                    .trim()
                    .charAt(0)

                :

                "?";



        /* =================================================
           RENDER WAITING CARD
        ================================================= */

        waitingList.innerHTML += `

            <div

                class="patient-card"

                style="position:relative;"

            >

                ${

                    visitNumber != null

                    ?

                    `

                    <div

                        style="

                            position:absolute;

                            top:50%;

                            left:50%;

                            transform:translate(-50%,-50%);

                            width:58px;

                            height:58px;

                            border-radius:50%;

                            background:linear-gradient(

                                135deg,

                                #3b82f6,

                                #2563eb

                            );

                            color:white;

                            display:flex;

                            align-items:center;

                            justify-content:center;

                            font-size:22px;

                            font-weight:900;

                            box-shadow:

                                0 8px 20px

                                rgba(37,99,235,.25);

                            border:4px solid white;

                            z-index:5;

                        "

                    >

                        ${visitNumber}

                    </div>

                    `

                    :

                    ""

                }



                <div class="patient-info">



                    <div class="patient-avatar">

                        ${avatarLetter}

                    </div>



                    <div>



                        <div class="patient-name">

                            ${patientName}

                        </div>



                        <div class="patient-status">

                            ${status}

                        </div>



                        <div class="patient-department">

                            <i

                                class="fa-solid fa-hospital"

                            ></i>

                            ${

                                v.department_name

                                ||

                                "غير محدد"

                            }

                        </div>



                    </div>

                </div>



                <div

                    class="patient-time"

                    style="

                        --status-color:${color}

                    "

                >

                    <span

                        class="time-start"

                    >

                        ${startTime}

                    </span>



                    <span

                        class="time-arrow"

                    >

                        ⟶

                    </span>



                    <span

                        class="time-end"

                    >

                        ${endTime}

                    </span>

                </div>



            </div>

        `;

    });

}

/* =========================================================
   INITIAL LOAD
========================================================= */

loadClinicInfo();

loadWaitingScreen();

setInterval(
    loadWaitingScreen,
    5000
);


