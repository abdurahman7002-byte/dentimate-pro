/* =========================================================
   DENTAL CLINIC DASHBOARD — CLEAN & ORGANIZED
   ========================================================= */

/* =========================
   1. GLOBALS
   ========================= */
let currentUserId = null;
let allPatients = [];
let patientsWithDebt = {};
let currentAppointmentFilter = "today";
let currentDepartmentFilter = "all";

/* =========================
   2. AUTH & USER
   ========================= */

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

/* =========================
   3. UTILITIES
   ========================= */

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

/* =========================
   4. اسم
   ========================= */



/* =========================================================
   LOAD CLINIC NAME
========================================================= */

async function loadDashboardClinicName() {

    const clinicNameElement =
        document.getElementById("dashboardClinicName");

    if (!clinicNameElement) {
        return;
    }

    try {

        const { data, error } = await supabaseClient

            .from("clinic_pages")

            .select("clinic_name")

            .eq("user_id", currentUserId)

            .maybeSingle();


        if (error) {

            console.error(
                "LOAD CLINIC NAME ERROR:",
                error
            );

            return;
        }


        const clinicName =
            data?.clinic_name?.trim();


        if (clinicName) {

            clinicNameElement.textContent =
                clinicName;

        } else {

            clinicNameElement.textContent =
                "عيادتك";
        }


    } catch (error) {

        console.error(
            "LOAD CLINIC NAME EXCEPTION:",
            error
        );

    }
}




/* =========================
   5. APPOINTMENTS
   ========================= */

async function loadAppointments(
    filter = currentAppointmentFilter,
    button = null,
    department = currentDepartmentFilter
){

    currentAppointmentFilter = filter;
    currentDepartmentFilter = department;


    if(button){

        document
        .querySelectorAll(
            ".appointments-filter button"
        )
        .forEach(b =>
            b.classList.remove("active")
        );

        button.classList.add("active");

    }


    const userId =
        await getUserId();

    if(!userId) return;


    await cleanupOldAppointments();


    try{


        const { data, error } =
    await supabaseClient
    .from("patient_visits")
    .select(`
        *,
patients(
    id,
    full_name,
    phone,
    birth_date
)
    `)
    .eq(
        "user_id",
        userId
    )
    .eq(
        "is_deleted",
        false
    )
    .neq(
        "visit_result",
        "cancelled"
    )
    .not(
        "appointment_start",
        "is",
        null
    )
    .order(
        "appointment_start",
        {
            ascending:true
        }
    )
    .limit(100);


        if(error){

            console.error(
                "Appointments error:",
                error
            );

            return;

        }



        /*
        ==========================
        FILTER BY DEPARTMENT
        ==========================
        */

        let filteredData =
            data || [];


        if(
            department !== "all"
        ){

            filteredData =
                filteredData.filter(
                    visit =>
                    visit.department_name === department
                );

        }



        renderAppointments(
            filteredData,
            filter
        );


    }
    catch(err){

        console.error(
            "loadAppointments error:",
            err
        );

    }

}


function getAppointmentBadgeStatus(
    v,
    now,
    nearestFutureId
){

    const s =
        new Date(
            v.appointment_start
        );

    const e =
        new Date(
            v.appointment_end
        );


    /* =========================
       CANCELLED
    ========================= */

    if(
        v.visit_result === "cancelled"
    ){

        return "cancelled";

    }
    /* =========================
   CONTINUOUS
========================= */

if(
    v.visit_status === "مستمرة"
){

    return "continuous";

}


    /* =========================
       FINISHED
    ========================= */

    if(
        v.visit_result === "completed" &&
        e < now
    ){

        return "finished";

    }


    /* =========================
       NOW
    ========================= */

    if(
        v.visit_result === "completed" &&
        s <= now &&
        e >= now
    ){

        return "now";

    }


    /* =========================
       PENDING
    ========================= */

    if(
        v.visit_result === "waiting" &&
        s <= now &&
        e >= now
    ){

        return "pending";

    }


    /* =========================
       UPCOMING
    ========================= */

    if(
        v.visit_result === "waiting" &&
        v.id === nearestFutureId
    ){

        return "upcoming";

    }


    return "none";

}




function renderAppointments(

    visits,
    filter

){

    const container =
        document.getElementById(
            "appointmentsContainer"
        );

    if(!container) return;



    /* =========================================
       EMPTY DATA
    ========================================= */

    if(!visits.length){

        container.innerHTML = `

        <div class="no-appointments">

            <i class="fa-solid fa-calendar-xmark"></i>

            <br><br>

            <span data-i18n="384">No appointments found</span>

        </div>

        `;

        applyTranslations();
        return;

    }



    const now =
        new Date();



    const today =
        getDayBounds();



    const yesterday =
        getDayBounds(-1);



    const tomorrow =
        getDayBounds(1);



    const after3 =
        new Date(
            today.end
        );

    after3.setDate(
        after3.getDate() + 2
    );



    const afterWeek =
        new Date(
            today.end
        );

    afterWeek.setDate(
        afterWeek.getDate() + 6
    );



    /* =========================================
       VISIT NUMBERS

       مهم جدًا:
       نستخدم الدالة المشتركة فقط.

       الترقيم يتم بناءً على visits كاملة
       وليس filtered.

       لذلك تغيير الفلتر أو الحالة أو ترتيب
       العرض لا يغير رقم الزيارة.
    ========================================= */

    const visitNumberMap =
        generateVisitNumberMap(
            visits
        );



    /* =========================================
       FILTER BY DATE
    ========================================= */

    let filtered =
        visits.filter(v => {

            const s =
                new Date(
                    v.appointment_start
                );

            const e =
                new Date(
                    v.appointment_end
                );



            switch(filter){

                case "yesterday":

                    return (
                        s >= yesterday.start &&
                        s <= yesterday.end
                    );



                case "today":

                    return (
                        s >= today.start &&
                        s <= today.end
                    );



                case "tomorrow":

                    return (
                        s >= tomorrow.start &&
                        s <= tomorrow.end
                    );



                case "3days":

                    return (
                        e >= now &&
                        s <= after3
                    );



                case "week":

                    return (
                        e >= now &&
                        s <= afterWeek
                    );



                case "upcoming":

                    return (
                        e >= now
                    );



                default:

                    return true;

            }

        });



    /* =========================================
       FILTER BY BADGE
    ========================================= */

    if(
        currentBadgeFilter &&
        currentBadgeFilter !== "all"
    ){

        filtered =
            filtered.filter(v => {



                if(
                    currentBadgeFilter ===
                    "missed"
                ){

                    return (

                        v.visit_result ===
                        "waiting"

                        &&

                        v.visit_status !==
                        "مستمرة"

                        &&

                        new Date(
                            v.appointment_end
                        ) < now

                    );

                }



                if(
                    currentBadgeFilter ===
                    "finished"
                ){

                    return (

                        v.visit_result ===
                        "completed"

                        &&

                        v.visit_status !==
                        "مستمرة"

                        &&

                        new Date(
                            v.appointment_end
                        ) < now

                    );

                }



                if(
                    currentBadgeFilter ===
                    "now"
                ){

                    const s =
                        new Date(
                            v.appointment_start
                        );

                    const e =
                        new Date(
                            v.appointment_end
                        );



                    return (

                        v.visit_result ===
                        "completed"

                        &&

                        s <= now

                        &&

                        e >= now

                    );

                }



                if(
                    currentBadgeFilter ===
                    "pending"
                ){

                    const s =
                        new Date(
                            v.appointment_start
                        );

                    const e =
                        new Date(
                            v.appointment_end
                        );



                    return (

                        v.visit_result ===
                        "waiting"

                        &&

                        s <= now

                        &&

                        e >= now

                    );

                }



                return true;

            });

    }



    /* =========================================
       CHECK EMPTY AFTER FILTER
    ========================================= */

    if(!filtered.length){

        container.innerHTML = `

        <div class="no-appointments">

            <i class="fa-solid fa-calendar-xmark"></i>

            <br><br>

            <span data-i18n="384">No appointments found</span>

        </div>

        `;

        applyTranslations();
        return;

    }



    /* =========================================
       UPCOMING VISIT

       أقرب زيارة مستقبلية لكل عيادة.
    ========================================= */

    const upcomingByDepartment = {};



    visits

        .filter(v => {

            const start =
                new Date(
                    v.appointment_start
                );



            return (

                start > now

                &&

                v.visit_result !==
                "cancelled"

            );

        })

        .forEach(v => {

            const deptNameRaw =
                v.department_name ||
                "غير محدد";



            const current =
                upcomingByDepartment[
                    deptNameRaw
                ];



            if(

                !current

                ||

                new Date(
                    v.appointment_start
                )

                <

                new Date(
                    current.appointment_start
                )

            ){

                upcomingByDepartment[
                    deptNameRaw
                ] = v;

            }

        });



    /* =========================================
       UPCOMING BADGE FILTER
    ========================================= */

    if(
        currentBadgeFilter ===
        "upcoming"
    ){

        filtered =
            filtered.filter(v => {

                const deptNameRaw =
                    v.department_name ||
                    "غير محدد";



                const upcomingVisit =
                    upcomingByDepartment[
                        deptNameRaw
                    ];



                return (

                    upcomingVisit

                    &&

                    upcomingVisit.id ===
                    v.id

                );

            });

    }



    /* =========================================
       EMPTY AFTER BADGE FILTER
    ========================================= */

    if(!filtered.length){

        container.innerHTML = `

        <div class="no-appointments">

            <i class="fa-solid fa-filter-circle-xmark"></i>

            <br><br>

            <span data-i18n="385">No appointments match this filter</span>

        </div>

        `;

        applyTranslations();
        return;

    }



    /* =========================================
       SORT
    ========================================= */

    if(
        filter ===
        "today"
    ){

        filtered.sort(

            (a,b) => {

                const aS =
                    new Date(
                        a.appointment_start
                    );



                const aE =
                    new Date(
                        a.appointment_end
                    );



                const bS =
                    new Date(
                        b.appointment_start
                    );



                const bE =
                    new Date(
                        b.appointment_end
                    );



                /* ==========================
                   PRIORITY
                ========================== */

                const getPriority =
                    (visit) => {

                        const s =
                            new Date(
                                visit.appointment_start
                            );



                        const e =
                            new Date(
                                visit.appointment_end
                            );



                        /* ==========================
                           CONTINUOUS
                           أعلى أولوية
                        ========================== */

                        if(
                            visit.visit_status ===
                            "مستمرة"
                        ){

                            return 0;

                        }



                        /* ==========================
                           CURRENT
                        ========================== */

                        if(
                            s <= now
                            &&
                            e >= now
                        ){

                            return 1;

                        }



                        /* ==========================
                           UPCOMING
                        ========================== */

                        if(
                            s > now
                        ){

                            return 2;

                        }



                        /* ==========================
                           FINISHED
                        ========================== */

                        return 3;

                    };



                const pA =
                    getPriority(a);



                const pB =
                    getPriority(b);



                /* ==========================
                   DIFFERENT PRIORITY
                ========================== */

                if(
                    pA !== pB
                ){

                    return (
                        pA - pB
                    );

                }



                /* ==========================
                   UPCOMING
                ========================== */

                if(
                    pA === 2
                ){

                    return (
                        aS - bS
                    );

                }



                /* ==========================
                   FINISHED
                ========================== */

                if(
                    pA === 3
                ){

                    return (
                        bE - aE
                    );

                }



                /* ==========================
                   CURRENT / CONTINUOUS
                ========================== */

                return (
                    aS - bS
                );

            }

        );

    }



    /* =========================================
       RENDER
    ========================================= */

    container.innerHTML =

        filtered

        .map(v => {

            const deptNameRaw =
                v.department_name ||
                "غير محدد";



            const upcomingVisit =
                upcomingByDepartment[
                    deptNameRaw
                ];



            const isUpcoming =
                Boolean(

                    upcomingVisit

                    &&

                    upcomingVisit.id ===
                    v.id

                );



            /* =========================================
               CHECK IF VISIT IS TODAY
            ========================================= */

            const visitStart =
                new Date(
                    v.appointment_start
                );



            const isToday = (

                visitStart >=
                today.start

                &&

                visitStart <=
                today.end

            );



            /* =========================================
               VISIT NUMBER

               الرقم يظهر فقط لزيارات اليوم.

               الرقم نفسه يأتي من الدالة المشتركة.
            ========================================= */

            const visitNumber =

                isToday

                ?

                visitNumberMap.get(
                    v.id
                )

                :

                null;



            return buildAppointmentCard(

                v,

                now,

                isUpcoming,

                visitNumber

            );

        })

        .join("");

    /* 🔄 أعد تطبيق الترجمة بعد بناء البطاقات */
    applyTranslations();

}
function buildAppointmentCard(
    v,
    now,
    isUpcoming,
    visitNumber
){

    const s =
        new Date(
            v.appointment_start
        );

    const e =
        new Date(
            v.appointment_end
        );


    /* =====================================================
       VISIT STATUS
    ===================================================== */

    let statusText =
        `<span data-i18n="388">✓ قادم</span>`;

    let statusColor =
        "linear-gradient(135deg,#3b82f6,#2563eb)";


    /* =====================================================
       PATIENT ARRIVED
    ===================================================== */

    if(
        v.visit_status ===
        "وصول المريض"
    ){

        statusText =
            `<span data-i18n="389">📌 متواجد</span>`;

        statusColor =
            "linear-gradient(135deg,#10b981,#059669)";
    }


    /* =====================================================
       VERY LATE
    ===================================================== */

    else if(
        v.visit_status ===
        "متأخر جدا"
    ){

        statusText =
            `<span data-i18n="390">⏰ متأخر</span>`;

        statusColor =
            "linear-gradient(135deg,#ef4444,#dc2626)";
    }


    /* =====================================================
       CONTINUOUS
    ===================================================== */

    else if(
        v.visit_status ===
        "مستمرة"
    ){

        statusText =
            `<span data-i18n="391">🔄 مستمرة</span>`;

        statusColor =
            "linear-gradient(135deg,#8b5cf6,#7c3aed)";
    }


    /* =====================================================
       TODAY RANGE
    ===================================================== */

    const todayStart =
        new Date();

    todayStart.setHours(
        0,
        0,
        0,
        0
    );


    const todayEnd =
        new Date();

    todayEnd.setHours(
        23,
        59,
        59,
        999
    );


    const isToday =
        s >= todayStart &&
        s <= todayEnd;


    /* =====================================================
       VISIT NUMBER
       لا تظهر الدائرة إذا كان الرقم null
    ===================================================== */

    const visitNumberBadge =
        visitNumber != null
            ? `

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
            : "";


    /* =====================================================
       VISIT STATUS BUTTON

       مهم:
       هذا الزر خارج appointment-actions
       ويظهر فقط لزيارة اليوم
    ===================================================== */

    const visitStatusButton =
        isToday
            ? `

                <button

                    type="button"

                    onclick="
                        toggleVisitStatus(
                            ${v.id},
                            '${v.visit_status || "قادم"}'
                        )
                    "

                    style="
                        position:absolute;

                        top:calc(50% + 34px);
                        left:50%;

                        transform:
                            translateX(-50%);

                        width:auto;
                        min-width:58px;

                        height:24px;

                        padding:3px 8px;

                        border:none;

                        border-radius:8px;

                        font-size:10px;

                        line-height:1;

                        font-weight:700;

                        color:white;

                        cursor:pointer;

                        background:${statusColor};

                        display:flex;

                        align-items:center;

                        justify-content:center;

                        white-space:nowrap;

                        z-index:6;

                        box-sizing:border-box;
                    "
                >

                    ${statusText}

                </button>

            `
            : "";


    /* =====================================================
       SAME DAY
    ===================================================== */

    const sameDay =
        s.toDateString() ===
        e.toDateString();


    /* =====================================================
       PATIENT DATA
    ===================================================== */

    const patientId =
        v.patients?.id ||
        null;


    const patientName =
        v.patients?.full_name ||
        v.patient_name ||
        `<span data-i18n="386">Unknown</span>`;


    /* =====================================================
       PATIENT AGE
    ===================================================== */

    const birthDate =
        v.patients?.birth_date ||
        null;


    let patientAge =
        null;


    /* =====================================================
       AGE FROM BIRTH DATE
    ===================================================== */

    if(birthDate){

        const birth =
            new Date(
                birthDate
            );


        const today =
            new Date();


        patientAge =
            today.getFullYear() -
            birth.getFullYear();


        const monthDiff =
            today.getMonth() -
            birth.getMonth();


        if(
            monthDiff < 0 ||
            (
                monthDiff === 0 &&
                today.getDate() <
                birth.getDate()
            )
        ){

            patientAge--;
        }


        if(
            patientAge < 0 ||
            !Number.isFinite(
                patientAge
            )
        ){

            patientAge =
                null;
        }
    }


    /* =====================================================
       AGE FROM VISIT
    ===================================================== */

    if(
        patientAge === null &&
        v.patient_age !== null &&
        v.patient_age !== undefined &&
        v.patient_age !== ""
    ){

        const storedAge =
            Number(
                v.patient_age
            );


        if(
            Number.isFinite(
                storedAge
            ) &&
            storedAge >= 0
        ){

            patientAge =
                storedAge;
        }
    }


    const patientPhone =
        v.patients?.phone ||
        v.patient_phone ||
        `<span data-i18n="387">No Phone</span>`;


    const hasPatientFile =
        Boolean(
            patientId
        );


    /* =====================================================
       APPOINTMENT BADGE
    ===================================================== */

    let badge = "";


    /* =====================================================
       CANCELLED
    ===================================================== */

    if(
        v.visit_result ===
        "cancelled"
    ){

        badge = `

            <div
                class="appointment-badge cancelled-badge"
            >

                <span data-i18n="392">Cancelled Visit</span>

            </div>

        `;
    }


    /* =====================================================
       CONTINUOUS
    ===================================================== */

    else if(
        v.visit_status ===
        "مستمرة"
    ){

        badge = `

            <div
                class="appointment-badge"

                style="
                    background:linear-gradient(
                        135deg,
                        #8b5cf6,
                        #7c3aed
                    );

                    color:white;

                    border:1px solid
                        rgba(139,92,246,.30);
                "
            >

                <i
                    class="fa-solid
                    fa-person-circle-check"
                ></i>

                <span data-i18n="393">زيارة مستمرة</span>

            </div>

        `;
    }


    /* =====================================================
       FINISHED
    ===================================================== */

    else if(
        v.visit_result ===
        "completed" &&
        e < now
    ){

        badge = `

            <div
                class="appointment-badge
                       finished-badge"
            >

                <span data-i18n="394">Finished Visit</span>

            </div>

        `;
    }


    /* =====================================================
       NOW
    ===================================================== */

    else if(
        v.visit_result ===
        "completed" &&
        s <= now &&
        e >= now
    ){

        badge = `

            <div
                class="appointment-badge
                       now-badge"
            >

                <span data-i18n="395">Now Visit</span>

            </div>

        `;
    }


    /* =====================================================
       MISSED
    ===================================================== */

    else if(
        v.visit_result ===
        "waiting" &&
        v.visit_status !==
        "مستمرة" &&
        e < now
    ){

        badge = `

            <div
                class="appointment-badge
                       missed-badge"
            >

                <span data-i18n="396">Missed Visit</span>

            </div>

        `;
    }


    /* =====================================================
       PENDING
    ===================================================== */

    else if(
        v.visit_result ===
        "waiting" &&
        s <= now &&
        e >= now
    ){

        badge = `

            <div
                class="appointment-badge
                       pending-badge"
            >

                <span data-i18n="397">Pending Confirmation</span>

            </div>

        `;
    }


    /* =====================================================
       UPCOMING
    ===================================================== */

    else if(
        v.visit_result ===
        "waiting" &&
        isUpcoming
    ){

        const departmentName =
            v.department_name ||
            `<span data-i18n="383">غير محدد</span>`;


        badge = `

            <div
                class="appointment-badge
                       upcoming-badge"
            >

                <i
                    class="fa-solid
                           fa-calendar-check"
                ></i>

                <span data-i18n="398">Upcoming Visit</span>

                <span
                    class="upcoming-department"
                >

                    ${departmentName}

                </span>

            </div>

        `;
    }


    /* =====================================================
       DATE DISPLAY
    ===================================================== */

    const dateDisplay =
        sameDay

        ?

        `

            <div
                class="appointment-date"
            >

                <div
                    class="appointment-day"
                >

                    <i
                        class="fa-solid
                               fa-calendar-days"
                    ></i>

                    ${
                        formatDateTime(
                            s,
                            {
                                day:
                                    "2-digit",

                                month:
                                    "2-digit",

                                year:
                                    "numeric"
                            }
                        ).split(",")[0]
                    }

                </div>


                <div
                    class="appointment-time"
                >

                    <i
                        class="fa-regular
                               fa-clock"
                    ></i>

                    ${
                        formatDateTime(
                            s,
                            {
                                hour:
                                    "2-digit",

                                minute:
                                    "2-digit",

                                hour12:
                                    true
                            }
                        )
                    }

                    →

                    ${
                        formatDateTime(
                            e,
                            {
                                hour:
                                    "2-digit",

                                minute:
                                    "2-digit",

                                hour12:
                                    true
                            }
                        )
                    }

                </div>

            </div>

        `

        :

        `

            <div
                class="appointment-date"
            >

                <i
                    class="fa-solid
                           fa-calendar-days"
                ></i>


                <div>

                    <span data-i18n="399">من:</span>

                    ${
                        formatDateTime(
                            s,
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
                    }

                    <br>

                    <span data-i18n="400">إلى:</span>

                    ${
                        formatDateTime(
                            e,
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
                    }

                </div>

            </div>

        `;


    /* =====================================================
       PATIENT FILE / CREATE FILE
    ===================================================== */

    let patientFileButton =
        "";


    if(hasPatientFile){

        patientFileButton = `

            <a
                href="patient-file.html?id=${patientId}"

                class="open-file-btn"
                data-i18n="81"
            >

                <i
                    class="fa-solid
                           fa-folder-open"
                ></i>

                Patient File

            </a>

        `;
    }

    else{

        const encodedName =
            encodeURIComponent(
                v.patient_name || ""
            );


        const encodedPhone =
            encodeURIComponent(
                v.patient_phone || ""
            );


        const encodedVisitId =
            encodeURIComponent(
                v.id
            );


        const encodedAge =
            encodeURIComponent(
                v.patient_age ?? ""
            );


        const createFileUrl =
            `patients.html?fromAppointment=true` +
            `&name=${encodedName}` +
            `&phone=${encodedPhone}` +
            `&age=${encodedAge}` +
            `&visitId=${encodedVisitId}`;


        patientFileButton = `

            <a
                href="${createFileUrl}"

                class="create-file-btn"
                data-i18n="82"
            >

                <i
                    class="fa-solid
                           fa-user-plus"
                ></i>

                Create File

            </a>

        `;
    }


    /* =====================================================
       PATIENT AGE DISPLAY
    ===================================================== */

    const patientAgeDisplay =
        patientAge !== null

        ?

        `

            <span

                style="
                    font-size:12px;
                    color:#94a3b8;
                    font-weight:600;
                    margin-right:5px;
                "
            >

                (${patientAge})

            </span>

        `

        :

        "";


    /* =====================================================
       RETURN CARD
    ===================================================== */

    return `

        <div

            class="appointment-card"

            id="appointment-${v.id}"

            style="
                position:relative;
            "
        >

            <!-- =========================================
                 VISIT NUMBER
            ========================================== -->

            ${visitNumberBadge}


            <!-- =========================================
                 VISIT STATUS BUTTON

                 يظهر فقط لزيارة اليوم
                 ومكانه أسفل رقم الزيارة
            ========================================== -->

            ${visitStatusButton}


            <!-- =========================================
                 BADGE
            ========================================== -->

            ${badge}


            <div
                class="appointment-content"
            >

                <div
                    class="appointment-info"
                >


                    <!-- =================================
                         PATIENT NAME
                    ================================== -->

                    <div
                        class="appointment-name"
                    >

                        <i
                            class="fa-solid
                                   fa-user-clock"
                        ></i>

                        ${patientName}

                        ${patientAgeDisplay}

                    </div>


                    <!-- =================================
                         PHONE
                    ================================== -->

                    <div
                        class="appointment-phone"
                    >

                        <i
                            class="fa-solid
                                   fa-phone"
                        ></i>

                        ${patientPhone}

                    </div>


                    <!-- =================================
                         DEPARTMENT
                    ================================== -->

                    <div
                        class="appointment-department"
                    >

                        <i
                            class="fa-solid
                                   fa-briefcase-medical"
                        ></i>

                        ${
                            v.department_name ||
                            `<span data-i18n="383">غير محدد</span>`
                        }

                    </div>


                    <!-- =================================
                         DATE
                    ================================== -->

                    ${dateDisplay}

                </div>


                <!-- =====================================
                     ACTIONS
                ====================================== -->

                <div
                    class="appointment-actions"
                >


                    <!-- ================================
                         PATIENT FILE
                    ================================= -->

                    ${patientFileButton}


                    <!-- ================================
                         CONFIRM
                    ================================= -->

                    ${
                        (
                            v.visit_result ===
                            "waiting" &&
                            s <= now
                        )

                        ?

                        `

                            <button

                                type="button"

                                onclick="
                                    confirmVisit(
                                        ${v.id}
                                    )
                                "

                                class="
                                    confirm-appointment-btn
                                "
                            
                            >

                                <i
                                    class="
                                        fa-solid
                                        fa-check
                                    "
                                ></i>

                                <span data-i18n="79">Confirm Appointment</span>

                            </button>

                        `

                        :

                        ""
                    }


                    <!-- ================================
                         CANCEL
                    ================================= -->

                    <button

                        type="button"

                        onclick="
                            deleteAppointment(
                                ${v.id}
                            )
                        "

                        class="
                            delete-appointment-btn
                        "
                    
                    >

                        <i
                            class="
                                fa-solid
                                fa-trash
                            "
                        ></i>

                        <span data-i18n="80">Cancel Appointment</span>

                    </button>


                </div>

            </div>

        </div>


        <div
            class="dashboard-divider"
        ></div>

    `;
}
let currentBadgeFilter = "all";


function setBadgeFilter(filter, button){

    currentBadgeFilter = filter;


    document
        .querySelectorAll(
            ".badge-filter-btn"
        )
        .forEach(btn => {

            btn.classList.remove(
                "active"
            );

        });


    if(button){

        button.classList.add(
            "active"
        );

    }


    loadAppointments(
        currentAppointmentFilter,
        null,
        currentDepartmentFilter
    );

}

async function toggleVisitStatus(id, current) {

    let next = "قادم";


    if(current === "قادم"){

        next = "وصول المريض";

    }

    else if(current === "وصول المريض"){

        next = "مستمرة";

    }

    else if(current === "مستمرة"){

        next = "متأخر جدا";

    }

    else if(current === "متأخر جدا"){

        next = "قادم";

    }


    const { error } =
        await supabaseClient

            .from("patient_visits")

            .update({
                visit_status: next
            })

            .eq("id", id);


    if(error){

        alert(error.message);

        return;

    }


    loadAppointments();

}
async function confirmVisit(id){

    const { error } = await supabaseClient
        .from("patient_visits")
        .update({
            visit_result: "completed"
        })
        .eq("id", id);

    if(error){

        console.error(error);

        showToast(
            "Failed to confirm appointment",
            "error"
        );

        return;
    }

    showToast("Appointment confirmed");

    loadAppointments();

}

async function deleteAppointment(id) {
    if (!await showConfirm("Cancel this appointment?")) return;
    const { error } = await supabaseClient.from("patient_visits").update({ visit_result: "cancelled" }).eq("id", id);
    if (error) { alert(error.message); return; }
    showToast("Appointment cancelled");
    document.getElementById(`appointment-${id}`)?.remove();
}

async function cleanupOldAppointments(){

    const userId = await getUserId();

    if(!userId) return;

    const now = new Date();

    try{

        const { data, error } =
        await supabaseClient
        .from("patient_visits")
        .select("id, appointment_end")
        .eq("user_id", userId)
        .eq("is_deleted", false)
        .eq("visit_result", "waiting")
        .not("appointment_end", "is", null);

        if(error){

            console.error(error);
            return;

        }

        for(const visit of data || []){

            const end = new Date(visit.appointment_end);

            const hoursPassed =
                (now - end) / (1000 * 60 * 60);

            if(hoursPassed >= 12){

                await supabaseClient
                .from("patient_visits")
                .update({
                    visit_result: "cancelled"
                })
                .eq("id", visit.id);

            }

        }

    }catch(e){

        console.error(
            "cleanupOldAppointments error:",
            e
        );

    }

}

// مودل عرض الحالت في يوم معين 
/* =========================================================
   SINGLE DAY APPOINTMENTS
   مستقل عن loadAppointments()
========================================================= */

function openSingleDayAppointments(){

    const modal =
        document.getElementById(
            "singleDayAppointmentsModal"
        );

    if(!modal) return;


    modal.style.display = "block";


    /*
    تحديد اليوم الحالي افتراضيًا
    */

    const dateInput =
        document.getElementById(
            "singleDayDate"
        );


    if(dateInput && !dateInput.value){

        const today =
            new Date();

        const year =
            today.getFullYear();

        const month =
            String(
                today.getMonth() + 1
            ).padStart(2,"0");

        const day =
            String(
                today.getDate()
            ).padStart(2,"0");


        dateInput.value =
            `${year}-${month}-${day}`;

    }

}
function closeSingleDayAppointments(){

    const modal =
        document.getElementById(
            "singleDayAppointmentsModal"
        );

    if(!modal) return;

    modal.style.display = "none";

}
/* =========================================================
   OPEN SINGLE DAY APPOINTMENTS
========================================================= */

function openSingleDayAppointments() {

    const modal =
        document.getElementById(
            "singleDayAppointmentsModal"
        );

    if (!modal) return;


    modal.style.display = "block";


    const dateInput =
        document.getElementById(
            "singleDayDate"
        );


    if (
        dateInput &&
        !dateInput.value
    ) {

        const today =
            new Date();


        const year =
            today.getFullYear();


        const month =
            String(
                today.getMonth() + 1
            ).padStart(2, "0");


        const day =
            String(
                today.getDate()
            ).padStart(2, "0");


        dateInput.value =
            `${year}-${month}-${day}`;
    }
}


/* =========================================================
   CLOSE
========================================================= */

function closeSingleDayAppointments() {

    const modal =
        document.getElementById(
            "singleDayAppointmentsModal"
        );

    if (!modal) return;


    modal.style.display = "none";
}


/* =========================================================
   LOAD SINGLE DAY APPOINTMENTS
========================================================= */

async function loadSingleDayAppointments() {

    const dateInput =
        document.getElementById(
            "singleDayDate"
        );


    const container =
        document.getElementById(
            "singleDayAppointmentsContainer"
        );


    const selectedDateBox =
        document.getElementById(
            "singleDaySelectedDate"
        );


    if (
        !dateInput ||
        !container
    ) {
        return;
    }


    const selectedDate =
        dateInput.value;


    /* =====================================================
       NO DATE
    ===================================================== */

    if (!selectedDate) {

        container.innerHTML = `

            <div class="single-day-empty">

                <i class="
                    fa-solid
                    fa-calendar-xmark
                "></i>

                <strong>
                    اختر تاريخًا أولاً
                </strong>

                <span>
                    يجب اختيار يوم لعرض الزيارات
                </span>

            </div>

        `;

        return;
    }


    /* =====================================================
       PARSE SELECTED DATE
    ===================================================== */

    const [
        selectedYear,
        selectedMonth,
        selectedDay
    ] =
        selectedDate
            .split("-")
            .map(Number);


    /* =====================================================
       LOADING
    ===================================================== */

    container.innerHTML = `

        <div class="single-day-empty">

            <i class="
                fa-solid
                fa-spinner
                fa-spin
            "></i>

            <strong>
                جاري تحميل الزيارات...
            </strong>

        </div>

    `;


    try {

        /* =================================================
           USER
        ================================================= */

        const userId =
            await getUserId();


        if (!userId) {

            container.innerHTML = `

                <div class="single-day-empty">

                    <i class="
                        fa-solid
                        fa-circle-exclamation
                    "></i>

                    <strong>
                        تعذر تحديد المستخدم
                    </strong>

                </div>

            `;

            return;
        }


        /* =================================================
           IMPORTANT

           لا نستخدم هنا:

           gte(startDate)
           lt(endDate)

           لتحديد اليوم النهائي.

           سنجلب نطاقًا أوسع ثم نفلتر
           حسب التاريخ المحلي في JavaScript.
        ================================================= */


        const searchStart =
            new Date(
                selectedYear,
                selectedMonth - 1,
                selectedDay - 1,
                0,
                0,
                0,
                0
            );


        const searchEnd =
            new Date(
                selectedYear,
                selectedMonth - 1,
                selectedDay + 2,
                0,
                0,
                0,
                0
            );


        console.log(
            "===================================="
        );

        console.log(
            "SINGLE DAY FILTER"
        );

        console.log(
            "Selected:",
            selectedDate
        );

        console.log(
            "Search start LOCAL:",
            searchStart.toString()
        );

        console.log(
            "Search end LOCAL:",
            searchEnd.toString()
        );

        console.log(
            "===================================="
        );


        /* =================================================
           QUERY
        ================================================= */

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

            .eq(
                "user_id",
                userId
            )

            .eq(
                "is_deleted",
                false
            )

            .not(
                "appointment_start",
                "is",
                null
            )

            .gte(
                "appointment_start",
                searchStart.toISOString()
            )

            .lt(
                "appointment_start",
                searchEnd.toISOString()
            )

            .order(
                "appointment_start",
                {
                    ascending: true
                }
            );


        /* =================================================
           ERROR
        ================================================= */

        if (error) {

            console.error(
                "Single day appointments error:",
                error
            );


            container.innerHTML = `

                <div class="single-day-empty">

                    <i class="
                        fa-solid
                        fa-circle-exclamation
                    "></i>

                    <strong>
                        حدث خطأ أثناء تحميل الزيارات
                    </strong>

                    <span>
                        ${
                            error.message || ""
                        }
                    </span>

                </div>

            `;

            return;
        }


        const allVisits =
            data || [];


        /* =================================================
           LOCAL DAY FILTER

           هنا النقطة المهمة جدًا.

           نأخذ appointment_start
           ونحوّله إلى Date.

           ثم نقارن:

           year
           month
           day

           حسب توقيت الجهاز المحلي.

           وبالتالي موعد:

           20/08 23:30

           يظل يوم 20.

           وموعد:

           21/08 00:30

           يظل يوم 21.
        ================================================= */

        const visits =
            allVisits.filter(
                visit => {

                    if (
                        !visit.appointment_start
                    ) {
                        return false;
                    }


                    const appointmentDate =
                        new Date(
                            visit.appointment_start
                        );


                    const appointmentYear =
                        appointmentDate.getFullYear();


                    const appointmentMonth =
                        appointmentDate.getMonth() + 1;


                    const appointmentDay =
                        appointmentDate.getDate();


                    const matches =

                        appointmentYear ===
                            selectedYear

                        &&

                        appointmentMonth ===
                            selectedMonth

                        &&

                        appointmentDay ===
                            selectedDay;


                    /* =====================================
                       DEBUG
                    ===================================== */

                    console.log(
                        "Appointment:",
                        visit.appointment_start,
                        "=>",
                        appointmentDate.toString(),
                        "=>",
                        `${appointmentYear}-${String(
                            appointmentMonth
                        ).padStart(2, "0")}-${String(
                            appointmentDay
                        ).padStart(2, "0")}`,
                        "MATCH:",
                        matches
                    );


                    return matches;
                }
            );


        /* =================================================
           SELECTED DATE DISPLAY
        ================================================= */

        const selectedLocalDate =
            new Date(
                selectedYear,
                selectedMonth - 1,
                selectedDay
            );


        const formattedDate =
            selectedLocalDate.toLocaleDateString(
                "ar-EG",
                {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                }
            );


        if (selectedDateBox) {

            selectedDateBox.style.display =
                "flex";


            selectedDateBox.innerHTML = `

                <i class="
                    fa-solid
                    fa-calendar-check
                "></i>

                <span>
                    ${formattedDate}
                </span>

                <b>
                    ${visits.length}
                    زيارة
                </b>

            `;
        }


        /* =================================================
           EMPTY
        ================================================= */

        if (!visits.length) {

            container.innerHTML = `

                <div class="single-day-empty">

                    <i class="
                        fa-regular
                        fa-calendar-xmark
                    "></i>

                    <strong>
                        لا توجد زيارات في هذا اليوم
                    </strong>

                    <span>
                        لم يتم العثور على أي موعد مسجل لهذا التاريخ
                    </span>

                </div>

            `;

            return;
        }


        /* =================================================
           RENDER
        ================================================= */

        container.innerHTML =

            visits
                .map(
                    buildSingleDayAppointment
                )
                .join("");


    }
    catch (error) {

        console.error(
            "loadSingleDayAppointments:",
            error
        );


        container.innerHTML = `

            <div class="single-day-empty">

                <i class="
                    fa-solid
                    fa-circle-exclamation
                "></i>

                <strong>
                    حدث خطأ غير متوقع
                </strong>

                <span>
                    ${
                        error.message || ""
                    }
                </span>

            </div>

        `;
    }
}
function buildSingleDayAppointment(visit){

    const start =
        new Date(
            visit.appointment_start
        );


    const end =
        visit.appointment_end
        ?
        new Date(
            visit.appointment_end
        )
        :
        null;


    /* =====================================================
       TIME
    ===================================================== */

    const startTime =
        start.toLocaleTimeString(
            "ar-EG",
            {
                hour:"2-digit",
                minute:"2-digit",
                hour12:true
            }
        );


    const endTime =
        end
        ?
        end.toLocaleTimeString(
            "ar-EG",
            {
                hour:"2-digit",
                minute:"2-digit",
                hour12:true
            }
        )
        :
        "";


    /* =====================================================
       STATUS
    ===================================================== */

    let statusClass =
        "waiting";

    let statusText =
        "قيد الانتظار";


    if(
        visit.visit_result ===
        "completed"
    ){

        statusClass =
            "completed";

        statusText =
            "مكتملة";

    }

    else if(
        visit.visit_result ===
        "cancelled"
    ){

        statusClass =
            "cancelled";

        statusText =
            "ملغاة";

    }


    /* =====================================================
       PATIENT DATA
       
       الأولوية:
       1. patients
       2. patient_visits
    ===================================================== */

    const patientName =
        visit.patients?.full_name
        ||
        visit.patient_name
        ||
        "مريض غير معروف";


    const phone =
        visit.patients?.phone
        ||
        visit.patient_phone
        ||
        "بدون هاتف";


    const department =
        visit.department_name
        ||
        "غير محدد";


    /* =====================================================
       RETURN
    ===================================================== */

return `
    <div class="single-day-appointment">

        <!-- =========================================
             PATIENT INFO
        ========================================== -->
        <div class="single-day-appointment-info">

            <div class="single-day-patient">
                <i class="fa-solid fa-user"></i>
                ${patientName}
            </div>

            <div class="single-day-info-line">

                <span>
                    <i class="fa-solid fa-phone"></i>
                    ${phone}
                </span>

                <span>
                    <i class="fa-solid fa-briefcase-medical"></i>
                    ${department}
                </span>

            </div>

        </div>


        <!-- =========================================
             TIME
        ========================================== -->
        <div class="single-day-appointment-time">

            <span class="time-range">

                <i
                    class="
                        fa-regular
                        fa-clock
                    "
                ></i>

                ${startTime}

                ${
                    endTime
                    ?
                    `
                        <span class="time-arrow">
                            →
                        </span>

                        ${endTime}
                    `
                    :
                    ""
                }

            </span>

            <small>
                موعد الزيارة
            </small>

        </div>


        <!-- =========================================
             STATUS
        ========================================== -->
        <div
            class="
                single-day-status
                ${statusClass}
            "
        >
            ${statusText}
        </div>


        <!-- =========================================
             DELETE
        ========================================== -->
        <button
            type="button"
            class="single-day-delete-btn"
            onclick="deleteVisitFromHistory('${visit.id}')"
            title="حذف الزيارة من السجل"
        >
            <i class="fa-solid fa-trash-can"></i>
            <span>حذف</span>
        </button>

    </div>
`;

}
/* =========================================================
   DELETE VISIT COMPLETELY
   حذف الزيارة نهائيًا من قاعدة البيانات
========================================================= */

async function deleteVisitFromHistory(id){

    if(!id){
        return;
    }


    const confirmed =
        await showConfirm(
            "هل أنت متأكد من حذف هذه الزيارة نهائيًا؟\n\n" +
            "سيتم حذف الزيارة من قاعدة البيانات بالكامل، " +
            "ولا يمكن التراجع عن هذا الإجراء."
        );


    if(!confirmed){
        return;
    }


    try{

        /* =========================================
           حذف الزيارة نهائيًا
        ========================================= */

        const { error } =
            await supabaseClient

                .from("patient_visits")

                .delete()

                .eq("id", id);


        if(error){

            console.error(
                "deleteVisitFromHistory error:",
                error
            );

            showToast(
                "فشل حذف الزيارة",
                "error"
            );

            return;
        }


        /* =========================================
           رسالة نجاح
        ========================================= */

        showToast(
            "تم حذف الزيارة نهائيًا"
        );


        /* =========================================
           إعادة تحميل سجل اليوم
        ========================================= */

        loadSingleDayAppointments();


        /* =========================================
           تحديث المواعيد
        ========================================= */

        if(
            typeof loadAppointments === "function"
        ){

            loadAppointments(
                currentAppointmentFilter,
                null,
                currentDepartmentFilter
            );

        }


        /* =========================================
           تحديث شاشة الانتظار
        ========================================= */

        if(
            typeof loadWaitingScreen === "function"
        ){

            loadWaitingScreen();

        }

    }
    catch(error){

        console.error(
            "deleteVisitFromHistory exception:",
            error
        );

        showToast(
            "حدث خطأ أثناء حذف الزيارة",
            "error"
        );

    }

}
async function loadDepartmentsDropdown(){

    const select =
    document.getElementById(
        "departmentFilter"
    );

    if(!select) return;


    const {
        data:userData
    } =
    await supabaseClient
    .auth
    .getUser();


    if(!userData.user) return;


    const userId =
    userData.user.id;



    const {
        data,
        error
    } =
    await supabaseClient
    .from("patient_visits")
    .select("department_name")
    .eq(
        "user_id",
        userId
    )
    .not(
        "department_name",
        "is",
        null
    );



    if(error){

        console.error(
            "Departments error:",
            error
        );

        return;
    }


    console.log(
        "Departments data:",
        data
    );



    const departments =
    [
        ...new Set(
            data.map(
                x => x.department_name
            )
        )
    ];



    select.innerHTML = `

        <option value="all">
            كل العيادات
        </option>

    `;



    departments.forEach(dep=>{

        select.innerHTML += `

            <option value="${dep}">
                ${dep}
            </option>

        `;

    });



    select.onchange = function(){

    currentDepartmentFilter = this.value;

    loadAppointments(
        currentAppointmentFilter,
        null,
        currentDepartmentFilter
    );

};


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
   WEEKLY CALENDAR MODAL
   ========================= */

let weeklyCalWeekStart = null;

const CAL_DAY_NAMES = [
    { name: 'السبت', short: 'سب', weekend: true },
    { name: 'الأحد', short: 'أحد', weekend: false },
    { name: 'الإثنين', short: 'إثن', weekend: false },
    { name: 'الثلاثاء', short: 'ثل', weekend: false },
    { name: 'الأربعاء', short: 'أرب', weekend: false },
    { name: 'الخميس', short: 'خم', weekend: false },
    { name: 'الجمعة', short: 'جم', weekend: true }
];

/* =========================================================
   GET SATURDAY START
   ========================================================= */
function getSaturdayStart(date) {
    const d = new Date(date);
    const day = d.getDay(); // 0=Sun, 6=Sat
    const diff = (day + 1) % 7; // السبت = 0 أيام للخلف
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

/* =========================================================
   GET WEEK END (Friday)
   ========================================================= */
function getFridayEnd(saturday) {
    const end = new Date(saturday);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
}

/* =========================================================
   OPEN MODAL
   ========================================================= */
function openWeeklyCalendarModal() {
    const modal = document.getElementById('weeklyCalendarModal');
    if (!modal) return;
    
    if (!weeklyCalWeekStart) {
        weeklyCalWeekStart = getSaturdayStart(new Date());
    }
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    loadWeeklyCalendar();
}

/* =========================================================
   CLOSE MODAL
   ========================================================= */
function closeWeeklyCalendarModal() {
    const modal = document.getElementById('weeklyCalendarModal');
    if (!modal) return;
    
    modal.style.display = 'none';
    document.body.style.overflow = '';
}

/* =========================================================
   CHANGE WEEK
   ========================================================= */
function changeWeek(direction) {
    if (!weeklyCalWeekStart) return;
    weeklyCalWeekStart.setDate(weeklyCalWeekStart.getDate() + (direction * 7));
    loadWeeklyCalendar();
}

/* =========================================================
   GO TO TODAY
   ========================================================= */
function goToCurrentWeek() {
    weeklyCalWeekStart = getSaturdayStart(new Date());
    loadWeeklyCalendar();
}

/* =========================================================
   LOAD WEEKLY CALENDAR
   ========================================================= */
async function loadWeeklyCalendar() {
    const grid = document.getElementById('weeklyCalGrid');
    const rangeEl = document.getElementById('calWeekRange');
    const statusEl = document.getElementById('calWeekStatus');
    const footer = document.getElementById('calFooter');
    
    if (!grid) return;
    
    const weekStart = new Date(weeklyCalWeekStart);
    const weekEnd = getFridayEnd(weekStart);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // عرض النطاق
    const startStr = weekStart.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' });
    const endStr = weekEnd.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
    rangeEl.textContent = `${startStr} - ${endStr}`;
    
    const isCurrentWeek = today >= weekStart && today <= weekEnd;
    statusEl.innerHTML = isCurrentWeek 
        ? '<span style="color:#3b82f6">●</span> الأسبوع الحالي' 
        : '<span style="color:#64748b">●</span> أسبوع آخر';
    
    // تحميل
    grid.innerHTML = `
        <div class="cal-loading">
            <i class="fa-solid fa-spinner"></i>
            <strong>جاري تحميل التقويم...</strong>
        </div>
    `;
    footer.innerHTML = '';
    
    try {
        const userId = await getUserId();
        if (!userId) {
            grid.innerHTML = `<div class="cal-loading" style="grid-column:1/-1"><i class="fa-solid fa-circle-exclamation"></i><strong>تعذر تحديد المستخدم</strong></div>`;
            return;
        }
        
        // جلب الزيارات غير الملغاة
        const searchStart = new Date(weekStart);
        searchStart.setDate(searchStart.getDate() - 1);
        const searchEnd = new Date(weekEnd);
        searchEnd.setDate(searchEnd.getDate() + 1);
        
        const { data, error } = await supabaseClient
            .from('patient_visits')
.select(`
    id,
    appointment_start,
    appointment_end,
    visit_result,
    visit_status,
    department_name,
    patient_name,
    patient_age,
    reminder_status,
    reminder_sent_at,
    reminder_message,
    patients (
        id,
        full_name,
        phone,
        birth_date
    )
`)
            .eq('user_id', userId)
            .eq('is_deleted', false)
            .not('appointment_start', 'is', null)
            .gte('appointment_start', searchStart.toISOString())
            .lt('appointment_start', searchEnd.toISOString())
            .order('appointment_start', { ascending: true });
        
        if (error) throw error;
        
        // فلترة محلية
        const allVisits = (data || []).filter(v => {
            if (v.visit_result === 'cancelled') return false;
            const vd = new Date(v.appointment_start);
            return vd >= weekStart && vd <= weekEnd;
        });
        
        // تجميع حسب اليوم
        const daysMap = {};
        for (let i = 0; i < 7; i++) {
            const d = new Date(weekStart);
            d.setDate(d.getDate() + i);
            daysMap[d.toDateString()] = {
                date: d,
                dayIndex: i,
                visits: []
            };
        }
        
        allVisits.forEach(v => {
            const vd = new Date(v.appointment_start);
            const key = vd.toDateString();
            if (daysMap[key]) daysMap[key].visits.push(v);
        });
        
        // بناء الشبكة
        let html = '';
        let totalVisits = 0;
        let busyDays = 0;
        
        Object.values(daysMap).forEach(dayData => {
            const dayInfo = CAL_DAY_NAMES[dayData.dayIndex];
            const isToday = dayData.date.toDateString() === today.toDateString();
            const isWeekend = dayInfo.weekend;
            const hasVisits = dayData.visits.length > 0;
            
            if (hasVisits) {
                totalVisits += dayData.visits.length;
                busyDays++;
            }
            
            html += `
                <div class="cal-day-column ${isToday ? 'today' : ''} ${isWeekend ? 'weekend' : ''} ${!hasVisits ? 'empty-day' : ''}">
                    <div class="cal-day-header">
                        <div class="cal-day-name ${isWeekend ? 'weekend' : ''} ${isToday ? 'today' : ''}">
                            ${dayInfo.name}
                        </div>
                        <div class="cal-day-date">
                            ${dayData.date.toLocaleDateString('ar-EG', { day: '2-digit', month: '2-digit' })}
                        </div>
                        ${isToday ? '<span class="cal-day-badge today-badge"><i class="fa-solid fa-circle"></i> اليوم</span>' : ''}
                  
                    </div>
                    <div class="cal-day-body">
            `;
            
            if (!hasVisits) {
                html += `
                    <div class="cal-empty-state">
                        <i class="fa-regular fa-calendar"></i>
                        <span>لا توجد زيارات</span>
                        <small style="color:#334155">يوم فارغ</small>
                    </div>
                `;
            } else {
                dayData.visits.forEach(visit => {
                    const start = new Date(visit.appointment_start);
                    const end = visit.appointment_end ? new Date(visit.appointment_end) : null;
                    const appointmentEnded =
    end && end < now;
                    const timeStr = start.toLocaleTimeString('ar-EG', { 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        hour12: true 
                    });
                    
                    const endStr = end ? end.toLocaleTimeString('ar-EG', { 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        hour12: true 
                    }) : '';
                    
                    const patientName = visit.patients?.full_name || visit.patient_name || 'مريض غير معروف';
                    
                    // العمر
                    let age = null;
                    if (visit.patients?.birth_date) {
                        const b = new Date(visit.patients.birth_date);
                        const t = new Date();
                        age = t.getFullYear() - b.getFullYear();
                        const md = t.getMonth() - b.getMonth();
                        if (md < 0 || (md === 0 && t.getDate() < b.getDate())) age--;
                    }
                    if (age === null && visit.patient_age != null) {
                        const a = Number(visit.patient_age);
                        if (Number.isFinite(a) && a >= 0) age = a;
                    }
                    
                    const dept = visit.department_name || 'غير محدد';
                    
                    // تحديد الحالة للتنسيق
                    let statusClass = '';
                    const s = start, e = end || start, n = now;
                    
                    if (visit.visit_status === 'مستمرة') statusClass = 'status-continuous';
                    else if (visit.visit_result === 'completed' && s <= n && e >= n) statusClass = 'status-now';
                    else if (visit.visit_result === 'completed' && e < n) statusClass = 'status-finished';
                    else if (visit.visit_result === 'waiting' && s <= n && e >= n) statusClass = 'status-pending';
                    
                    html += `
<div class="cal-appointment ${statusClass}" onclick="goToPatientFile('${visit.patients?.id || ''}', ${visit.id})">
                            <div class="cal-appointment-time">
                                <i class="fa-regular fa-clock"></i>
                                ${timeStr}${endStr ? ' - ' + endStr : ''}
                            </div>
                            <div class="cal-appointment-name">
                                ${patientName}
                                ${age !== null ? `<span class="cal-appointment-age">(${age})</span>` : ''}
                            </div>
                            <div class="cal-appointment-dept">
                                <i class="fa-solid fa-briefcase-medical"></i>
                                ${dept}
                            </div>
${(() => {
    const reminderDone =
        visit.reminder_status === 'prepared' ||
        visit.reminder_status === 'sent';

    // إخفاء زر التذكير إذا انتهى الموعد
    if (appointmentEnded) {
        return '';
    }

    return `
        <button
            type="button"
            class="visit-reminder-btn ${reminderDone ? 'reminder-done' : ''}"
            data-visit-id="${visit.id}"
            data-patient-name="${(patientName || '').replace(/"/g, '&quot;')}"
            data-patient-phone="${(visit.patients?.phone || visit.patient_phone || '').replace(/"/g, '&quot;')}"
            data-appointment-start="${visit.appointment_start || ''}"
            data-appointment-end="${visit.appointment_end || ''}"
            data-department="${(dept || '').replace(/"/g, '&quot;')}"
            data-visit-title="${(visit.visit_title || '').replace(/"/g, '&quot;')}"
            onclick="event.preventDefault(); event.stopPropagation(); ${reminderDone ? 'return false;' : 'prepareAppointmentReminder(this)'}"
            onmousedown="event.stopPropagation()"
            onpointerdown="event.stopPropagation()"
            ${reminderDone ? 'disabled' : ''}
            title="${reminderDone ? 'تم التذكير بهذا الموعد' : 'تذكير المريض بالموعد'}"
        >
            <i class="${reminderDone ? 'fa-solid fa-check' : 'fa-brands fa-whatsapp'}"></i>
            <span>${reminderDone ? 'تم التذكير' : 'تذكير بالموعد'}</span>
        </button>
    `;
})()}
                        </div>
                    `;
                });
            }
            
            html += `</div></div>`;
        });
        
        grid.innerHTML = html;
        
        // Footer
        footer.innerHTML = `
            <div class="cal-stat">
                <i class="fa-solid fa-calendar-check" style="color:#3b82f6"></i>
                إجمالي الزيارات: <span class="stat-value">${totalVisits}</span>
            </div>
            <div class="cal-stat">
                <i class="fa-solid fa-calendar-day" style="color:#10b981"></i>
                أيام بزيارات: <span class="stat-value">${busyDays}</span>
            </div>
            <div class="cal-stat">
                <i class="fa-solid fa-calendar-xmark" style="color:#64748b"></i>
                أيام فارغة: <span class="stat-value">${7 - busyDays}</span>
            </div>
            <button type="button" onclick="goToCurrentWeek()" class="cal-back-today">
                <i class="fa-solid fa-rotate-left"></i>
                العودة للأسبوع الحالي
            </button>
        `;
        
    } catch (err) {
        console.error('Weekly calendar error:', err);
        grid.innerHTML = `
            <div class="cal-loading" style="grid-column:1/-1">
                <i class="fa-solid fa-circle-exclamation"></i>
                <strong>حدث خطأ أثناء التحميل</strong>
                <span>${err.message || ''}</span>
            </div>
        `;
    }
}
/* =========================================================
   GO TO PATIENT FILE WITH VISIT
   ========================================================= */
function goToPatientFile(patientId, visitId) {
    if (!patientId || patientId === 'null' || patientId === 'undefined') {
        showToast('لا يوجد ملف مريض مرتبط بهذه الزيارة', 'error');
        return;
    }
    window.location.href = `patient-file.html?id=${patientId}&openVisit=${visitId}`;
}
/* =========================================================
   OPEN VISIT DETAILS (Placeholder)
   ========================================================= */
function openVisitDetails(visitId) {
    console.log('Opening visit:', visitId);
    // يمكنك ربطه بفتح ملف المريض أو تفاصيل الزيارة
    // مثال: window.location.href = `patient-file.html?visit=${visitId}`;
}

/* =========================================================
   EVENT LISTENERS
   ========================================================= */
document.addEventListener('click', (e) => {
    const modal = document.getElementById('weeklyCalendarModal');
    if (modal && e.target === modal) closeWeeklyCalendarModal();
});

document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('weeklyCalendarModal');
    if (e.key === 'Escape' && modal && modal.style.display === 'block') {
        closeWeeklyCalendarModal();
    }
});
/* =========================
   6. LAB DELIVERIES
   ========================= */

/* =========================================================
   1. LOAD DELIVERY REMINDERS (أفقي + قابل للنقر)
   ========================================================= */
/* =========================================================
   LOAD DELIVERY REMINDERS (أفقي + فتح معمل التركيبة)
   ========================================================= */

/* مقارنة تواريخ بدون مشاكل التوقيت */
function daysUntil(dateStr) {
    const now = new Date();
    const target = new Date(dateStr);
    const nowUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const targetUTC = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
    return Math.round((targetUTC - nowUTC) / (1000 * 60 * 60 * 24));
}

async function loadDeliveryReminders() {
    const container = document.getElementById("deliveryReminders");
    if (!container) return;

    const userId = await getUserId();
    if (!userId) return;

    try {
        const { data: works, error: worksError } = await supabaseClient
            .from("lab_works")
            .select(`*, labs(lab_name)`)
            .eq("user_id", userId)
            .eq("received", false)
            .order("delivery_date", { ascending: true });

        if (worksError) { console.error("Lab works error:", worksError); return; }

        const reminders = (works || []).filter(w => {
            if (!w.delivery_date) return false;
            return daysUntil(w.delivery_date) <= 3;
        });

        if (!reminders.length) {
            container.innerHTML = `
                <div class="no-deliveries">
                    <div class="no-deliveries-icon"><i class="fa-solid fa-screwdriver-wrench"></i></div>
                    <div class="no-deliveries-title" data-i18n="443">لا توجد تركيبات قادمة</div>
                    <div class="no-deliveries-sub" data-i18n="444">جميع التركيبات حالياً في المعامل</div>
                </div>`;
            applyTranslations();
            return;
        }

        const workIds = reminders.map(w => w.id);
        const { data: teethData, error: teethError } = await supabaseClient
            .from("lab_work_teeth")
            .select("lab_work_id, tooth_number")
            .in("lab_work_id", workIds);

        if (teethError) console.error("Teeth fetch error:", teethError);

        const teethMap = {};
        (teethData || []).forEach(t => {
            if (!teethMap[t.lab_work_id]) teethMap[t.lab_work_id] = [];
            teethMap[t.lab_work_id].push(t.tooth_number);
        });

        container.innerHTML = reminders.map(w => {
            const diff = daysUntil(w.delivery_date);

            let statusColor = "#22c55e", statusBg = "rgba(34,197,94,0.12)";
            let statusKey = "445"; // قريباً
            let statusText = "قريباً";
            let statusIconClass = "fa-clock";

            if (diff < 0) { 
                statusColor = "#ef4444"; 
                statusBg = "rgba(239,68,68,0.12)"; 
                statusKey = "446";
                statusText = "متأخر"; 
                statusIconClass = "fa-triangle-exclamation";
            }
            else if (diff === 0) { 
                statusColor = "#f59e0b"; 
                statusBg = "rgba(245,158,11,0.12)"; 
                statusKey = "447";
                statusText = "اليوم"; 
                statusIconClass = "fa-bell";
            }
            else if (diff === 1) { 
                statusKey = "448";
                statusText = "غداً"; 
            }

            const teeth = teethMap[w.id] || [];
            const teethHtml = teeth.length > 0
                ? teeth.map(t => `<span class="tooth-badge-sm">${t}</span>`).join("")
                : `<span class="tooth-badge-sm empty">—</span>`;

            return `
                <div class="delivery-card-compact" data-status="${diff < 0 ? 'overdue' : diff === 0 ? 'today' : 'upcoming'}">
                    
                    <div class="dc-left" onclick="openLabFile(${w.lab_id}, ${w.id})">
                        <div class="dc-status-ring" style="--status-color:${statusColor};--status-bg:${statusBg}">
                            <div class="dc-status-icon" style="color:${statusColor}">
                                <i class="fa-solid ${statusIconClass}"></i>
                            </div>
                            <div class="dc-status-text" style="color:${statusColor}" data-i18n="${statusKey}">${statusText}</div>
                        </div>
                        <div class="dc-teeth-row">${teethHtml}</div>
                    </div>

                    <div class="dc-center" onclick="openLabFile(${w.lab_id}, ${w.id})">
                        <div class="dc-patient-name">${w.patient_name || "—"}</div>
                        <div class="dc-work-line">
                            <span class="dc-work-name"><i class="fa-solid fa-tooth"></i> ${w.work_name}</span>
                            ${w.work_type ? `<span class="dc-work-type">${w.work_type}</span>` : ""}
                        </div>
                        <div class="dc-meta-line">
                            <span><i class="fa-solid fa-building"></i> ${w.labs?.lab_name || "—"}</span>
                            <span class="dc-date" style="color:${statusColor}"><i class="fa-solid fa-calendar-days"></i> ${w.delivery_date}</span>
                            ${w.quantity > 1 ? `<span><i class="fa-solid fa-hashtag"></i> ${w.quantity}</span>` : ""}
                        </div>
                    </div>

                    <div class="dc-right">
                        <button class="dc-btn-open" onclick="openLabFile(${w.lab_id}, ${w.id})" title="فتح ملف المعمل">
                            <i class="fa-solid fa-arrow-up-right-from-square"></i>
                        </button>
                        <button class="dc-btn-receive" onclick="event.stopPropagation(); markWorkReceived(${w.id})" title="استلام">
                            <i class="fa-solid fa-check"></i>
                        </button>
                    </div>

                </div>
            `;
        }).join("");
        
        /* 🔄 أعد تطبيق الترجمة بعد بناء البطاقات */
        applyTranslations();

    } catch (err) {
        console.error("loadDeliveryReminders error:", err);
    }
}
/* فتح ملف المعمل مع التركيبة */
function openLabFile(labId, workId) {
    window.location.href = `lab_file.html?lab_id=${labId}&work_id=${workId}`;
}

/* =========================================================
   MARK WORK RECEIVED
   ========================================================= */
async function markWorkReceived(id) {
    const btn = document.querySelector(`button[onclick*="markWorkReceived(${id})"]`);
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
    }

    const { error } = await supabaseClient
        .from("lab_works")
        .update({ received: true })
        .eq("id", id);

    if (error) {
        showToast(error.message);
        if (btn) btn.innerHTML = `<i class="fa-solid fa-check"></i>`;
        if (btn) btn.disabled = false;
        return;
    }

    const card = btn?.closest(".delivery-card-compact");
    if (card) {
        card.style.transform = "translateX(-120%)";
        card.style.opacity = "0";
        setTimeout(() => {
            showToast("✅ تم الاستلام");
            loadDeliveryReminders();
        }, 300);
    } else {
        showToast("✅ تم الاستلام");
        loadDeliveryReminders();
    }
}
/* =========================
   7. APPOINTMENT REQUESTS
   ========================= */
async function loadAppointmentRequests() {
    const userId = await getUserId();
    if (!userId) return;

    try {
        const { data, error } = await supabaseClient
            .from("appointment_requests")
            .select("*")
            .eq("user_id", userId)
            .eq("status", "pending")
            .order("created_at", { ascending: false });

        if (error) { console.error("Requests error:", error); return; }

        const container = document.getElementById("appointmentRequestsContainer");
        if (!container) return;

        if (!data?.length) {
            container.innerHTML = `<div class="no-appointments" data-i18n="449">لا توجد طلبات حجز</div>`;
            applyTranslations();
            return;
        }

        const locale = (typeof userPreferences !== 'undefined' && userPreferences.language === 'en') ? 'en-US' : 'ar-EG';

        container.innerHTML = data.map(r => {
            const time = r.appointment_time
                ? new Date(r.appointment_time).toLocaleString(locale, { weekday:"short", year:"numeric", month:"short", day:"numeric", hour:"numeric", minute:"2-digit" })
                : `<span data-i18n="450">Not specified</span>`;
            return `
                <div class="appointment-card">
                    <div class="appointment-header">
                        <div class="patient-avatar">${r.patient_name.charAt(0).toUpperCase()}</div>
                        <div class="patient-info">
                            <div class="patient-name">${r.patient_name}</div>
                            <div class="patient-phone"><i class="fa-solid fa-phone"></i> ${r.patient_phone}</div>
                        </div>
                        <div class="appointment-status" data-i18n="451">Pending</div>
                    </div>
                    <div class="appointment-time-box">
                        <i class="fa-regular fa-calendar-days"></i>
                        <div>
                            <span class="time-label" data-i18n="452">Appointment Time</span>
                            <span class="time-value">${time}</span>
                        </div>
                        <button class="contacted-btn" onclick="markAsContacted(${r.id})"><i class="fa-solid fa-phone"></i> <span data-i18n="453">Mark as Contacted</span></button>
                    </div>
                </div>
            `;
        }).join("");
        
        /* 🔄 أعد تطبيق الترجمة بعد بناء البطاقات */
        applyTranslations();
    } catch (err) {
        console.error("loadAppointmentRequests error:", err);
    }
}
async function markAsContacted(id) {
    if (!await showConfirm("هل تم التواصل مع المريض؟ سيتم حذف الطلب نهائياً.")) return;
    const { error } = await supabaseClient.from("appointment_requests").delete().eq("id", id);
    if (error) { alert("حدث خطأ أثناء حذف الطلب"); return; }
    loadAppointmentRequests();
}

// حجز الزيارااااااااات؟
async function openAddVisitModal(){

    const modal =
        document.getElementById(
            "addVisitModal"
        );

    if(!modal)
        return;


    /* =========================================
       SHOW MODAL
    ========================================= */

    modal.style.display = "flex";


    /* =========================================
       RESET PATIENT DATA
    ========================================= */

    const nameInput =
        document.getElementById(
            "appointmentPatientName"
        );

    const phoneInput =
        document.getElementById(
            "appointmentPatientPhone"
        );

    const startInput =
        document.getElementById(
            "appointmentStart"
        );

    const endInput =
        document.getElementById(
            "appointmentEnd"
        );


    if(nameInput)
        nameInput.value = "";


    if(phoneInput)
        phoneInput.value = "";


    if(startInput)
        startInput.value = "";


    if(endInput)
        endInput.value = "";


    /* =========================================
       LOAD DEPARTMENTS
    ========================================= */

    await loadDepartments();


    /* =========================================
       FOCUS NAME
    ========================================= */

    if(nameInput){

        setTimeout(
            () => {

                nameInput.focus();

            },
            100
        );

    }
initAddVisitSlider();
}
function closeAddVisitModal(){

    const modal =
        document.getElementById(
            "addVisitModal"
        );

    if(!modal)
        return;

    modal.style.display = "none";

}
async function loadDepartments(){

    console.log(
        "Loading departments..."
    );


    const select =
        document.getElementById(
            "departmentSelect"
        );


    if(!select){

        console.error(
            "departmentSelect not found"
        );

        return;

    }


    /* =========================================
       LOADING STATE
    ========================================= */

    select.innerHTML = `
        <option value="">
            جاري تحميل العيادات...
        </option>
    `;


    /* =========================================
       GET USER
    ========================================= */

    const {
        data:userData,
        error:userError
    } =
    await supabaseClient.auth.getUser();


    if(
        userError ||
        !userData ||
        !userData.user
    ){

        console.error(
            "Get user error:",
            userError
        );


        select.innerHTML = `
            <option value="">
                تعذر الحصول على المستخدم
            </option>
        `;

        return;

    }


    const userId =
        userData.user.id;


    console.log(
        "Department user ID:",
        userId
    );


    /* =========================================
       GET DEPARTMENTS
    ========================================= */

    const {
        data,
        error
    } =
    await supabaseClient

    .from(
        "clinic_departments"
    )

    .select(
        "id, department_name"
    )

    .eq(
        "user_id",
        userId
    )

    .order(
        "department_name",
        {
            ascending:true
        }
    );


    if(error){

        console.error(
            "Load departments error:",
            error
        );


        select.innerHTML = `
            <option value="">
                حدث خطأ في تحميل العيادات
            </option>
        `;

        return;

    }


    console.log(
        "Departments:",
        data
    );


    /* =========================================
       NO DEPARTMENTS
    ========================================= */

    if(
        !data ||
        data.length === 0
    ){

        select.innerHTML = `
            <option value="">
                لا توجد عيادات مضافة
            </option>
        `;

        return;

    }


    /* =========================================
       BUILD OPTIONS
    ========================================= */

    select.innerHTML = `
        <option value="">
            اختر العيادة
        </option>
    `;


    data.forEach(
        department => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                department.id;


            option.textContent =
                department.department_name;


            select.appendChild(
                option
            );

        }
    );


    console.log(
        "Departments loaded successfully"
    );

}
// اقتراح المرضى
/* =========================================================
   PATIENT AUTOCOMPLETE
========================================================= */

/* =========================================================
   PATIENT AUTOCOMPLETE
========================================================= */

let appointmentPatientsCache = [];
let selectedAppointmentPatientId = null;

/*
   يمنع إعادة فتح الاقتراحات تلقائيًا
   عند اختيار "تسجيل الاسم كمريض جديد"
*/
let suppressAppointmentPatientFocus = false;
/* =========================================================
   LOAD PATIENTS
========================================================= */
/* =========================================================
   LOAD PATIENTS
========================================================= */

async function loadAppointmentPatients() {

    try {

        const {
            data: {
                user
            },
            error: userError
        } =
        await supabaseClient.auth.getUser();


        if (
            userError ||
            !user
        ) {

            console.error(
                "Unable to get current user:",
                userError
            );

            return;

        }


        const {
            data,
            error
        } =
        await supabaseClient

        .from("patients")

        .select(`
            id,
            full_name,
            phone,
            birth_date,
            user_id
        `)

        .eq(
            "user_id",
            user.id
        )

        .order(
            "created_at",
            {
                ascending: false
            }
        );


        if (error) {

            console.error(
                "Error loading patients:",
                error
            );

            return;

        }


        appointmentPatientsCache =
            data || [];


        console.log(
            "Appointment patients loaded:",
            appointmentPatientsCache.length
        );


    } catch (error) {

        console.error(
            "loadAppointmentPatients error:",
            error
        );

    }
}
/* =========================================================
   GET PATIENT FIELD
   Handles common field naming
========================================================= */
/* =========================================================
   PATIENT DATA HELPERS
========================================================= */

function getPatientName(patient) {

    return patient?.full_name || "";
}


function getPatientPhone(patient) {

    return patient?.phone || "";
}


/* =========================================================
   CALCULATE AGE FROM BIRTH DATE
========================================================= */

function getPatientAge(patient) {

    const birthDateValue =
        patient?.birth_date;

    if (!birthDateValue) {
        return "";
    }


    const birthDate =
        new Date(birthDateValue);

    if (isNaN(birthDate.getTime())) {
        return "";
    }


    const today =
        new Date();


    let age =
        today.getFullYear() -
        birthDate.getFullYear();


    const monthDifference =
        today.getMonth() -
        birthDate.getMonth();


    if (
        monthDifference < 0 ||
        (
            monthDifference === 0 &&
            today.getDate() <
            birthDate.getDate()
        )
    ) {

        age--;

    }


    return age >= 0
        ? age
        : "";
}


/* =========================================================
   BIRTH DATE
========================================================= */

function getPatientBirthDate(patient) {

    return patient?.birth_date || "";
}
/* =========================================================
   SEARCH PATIENTS
========================================================= */

/* =========================================================
   SEARCH PATIENTS
========================================================= */

function searchAppointmentPatients(value) {

    const container =
        document.getElementById(
            "patientNameSuggestions"
        );


    if (!container) {
        return;
    }


    /* =====================================================
       GET SEARCH VALUE
    ===================================================== */

    const search =
        String(value || "")
            .trim()
            .toLowerCase();


    /* =====================================================
       EMPTY INPUT
       Hide and clear suggestions
    ===================================================== */

    if (!search) {

        container.innerHTML = "";

        container.style.display = "none";

        container.style.visibility = "hidden";

        container.style.opacity = "0";

        return;

    }


    /* =====================================================
       SEARCH REGISTERED PATIENTS
    ===================================================== */

    const results =
        appointmentPatientsCache

            .filter(patient => {

                const name =
                    getPatientName(patient)
                        .toLowerCase();


                const phone =
                    String(
                        getPatientPhone(patient)
                    )
                    .toLowerCase();


                return (
                    name.includes(search) ||
                    phone.includes(search)
                );

            })

            .slice(0, 8);


    /* =====================================================
       RENDER RESULTS
    ===================================================== */

    renderAppointmentPatientSuggestions(
        results,
        search
    );


    /* =====================================================
       MAKE SURE SUGGESTIONS ARE VISIBLE
    ===================================================== */

    container.style.display = "block";

    container.style.visibility = "visible";

    container.style.opacity = "1";

}

/* =========================================================
   RENDER SUGGESTIONS
========================================================= */
/* =========================================================
   RENDER PATIENT SUGGESTIONS
========================================================= */

function renderAppointmentPatientSuggestions(
    patients,
    search
) {

    const container =
        document.getElementById(
            "patientNameSuggestions"
        );


    if (!container) {
        return;
    }


    let html = "";


    patients.forEach(patient => {

        const id =
            patient.id;

        const name =
            getPatientName(patient);

        const phone =
            getPatientPhone(patient);

        const age =
            getPatientAge(patient);


        html += `

            <div
                class="patient-suggestion-item"
                data-patient-id="${id}"
                onclick="selectAppointmentPatient('${id}')"
            >

                <div class="patient-suggestion-icon">

                    <i class="fa-solid fa-user"></i>

                </div>


                <div class="patient-suggestion-info">

                    <div class="patient-suggestion-name">

                        ${escapePatientAutocompleteHTML(name)}

                    </div>


                    <div class="patient-suggestion-details">

                        ${
                            age !== ""
                                ? `(${escapePatientAutocompleteHTML(String(age))} سنة)`
                                : `(العمر غير مسجل)`
                        }

                    </div>

                </div>

            </div>

        `;

    });


    /* =====================================================
       NEW PATIENT OPTION
    ===================================================== */

    html += `

        <div
            class="patient-new-option"
            onclick="useNewAppointmentPatient(event)"
        >

            <i class="fa-solid fa-user-plus"></i>

            <span>
                تسجيل الاسم كمريض جديد
            </span>

        </div>

    `;


    container.innerHTML =
        html;

    container.style.display =
        "block";
}
/* =========================================================
   SELECT EXISTING PATIENT
========================================================= */
/* =========================================================
   SELECT EXISTING PATIENT
========================================================= */

function selectAppointmentPatient(patientId) {

    const patient =
        appointmentPatientsCache.find(
            p =>
                String(p.id) ===
                String(patientId)
        );


    if (!patient) {

        console.error(
            "Selected patient was not found:",
            patientId
        );

        return;

    }


    /* =====================================================
       GET PATIENT DATA
    ===================================================== */

    const name =
        getPatientName(patient);

    const phone =
        getPatientPhone(patient);

    const age =
        getPatientAge(patient);


    console.log(
        "Selected patient:",
        patient
    );

    console.log(
        "Calculated age:",
        age
    );


    /* =====================================================
       GET INPUTS
    ===================================================== */

    const nameInput =
        document.getElementById(
            "appointmentPatientName"
        );


    const phoneInput =
        document.getElementById(
            "appointmentPatientPhone"
        );


    const ageInput =
        document.getElementById(
            "appointmentPatientAge"
        );


    const patientIdInput =
        document.getElementById(
            "appointmentPatientId"
        );


    /* =====================================================
       FILL DATA
    ===================================================== */

    if (nameInput) {

        nameInput.value =
            name;

    }


    if (phoneInput) {

        phoneInput.value =
            phone;

    }


    if (ageInput) {

        ageInput.value =
            age !== ""
                ? age
                : "";

    }


    /* =====================================================
       STORE REAL PATIENT ID
    ===================================================== */

    if (patientIdInput) {

        patientIdInput.value =
            patient.id;

    }


    selectedAppointmentPatientId =
        patient.id;


    /* =====================================================
       LOCK EXISTING PATIENT DATA
    ===================================================== */

    setAppointmentPatientFieldsLocked(
        true
    );


    /* =====================================================
       HIDE SUGGESTIONS
    ===================================================== */

    hideAppointmentPatientSuggestions();

}
/* =========================================================
   LOCK / UNLOCK PATIENT FIELDS
========================================================= */

function setAppointmentPatientFieldsLocked(locked) {

    const nameInput =
        document.getElementById(
            "appointmentPatientName"
        );


    const phoneInput =
        document.getElementById(
            "appointmentPatientPhone"
        );


    const ageInput =
        document.getElementById(
            "appointmentPatientAge"
        );


    [
        nameInput,
        phoneInput,
        ageInput
    ].forEach(input => {

        if (!input) {
            return;
        }


        input.readOnly =
            locked;


        input.classList.toggle(
            "patient-field-locked",
            locked
        );

    });

}

/* =========================================================
   NEW PATIENT
========================================================= */
/* =========================================================
   NEW / UNREGISTERED PATIENT
========================================================= */

function useNewAppointmentPatient(event) {

    /* ================================================
       PREVENT CLICK FROM PROPAGATING
    ================================================ */

    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }


    /* ================================================
       GET INPUTS
    ================================================ */

    const nameInput =
        document.getElementById(
            "appointmentPatientName"
        );

    const patientIdInput =
        document.getElementById(
            "appointmentPatientId"
        );


    /* ================================================
       REMOVE PATIENT ID
    ================================================ */

    if (patientIdInput) {
        patientIdInput.value = "";
    }

    selectedAppointmentPatientId = null;


    /* ================================================
       UNLOCK PATIENT FIELDS
    ================================================ */

    setAppointmentPatientFieldsLocked(false);


    /* ================================================
       HIDE + CLEAR SUGGESTIONS
    ================================================ */

    hideAppointmentPatientSuggestions();


    /* ================================================
       PREVENT FOCUS EVENT FROM REOPENING SUGGESTIONS
    ================================================ */

    suppressAppointmentPatientFocus = true;


    /* ================================================
       FOCUS NAME INPUT
    ================================================ */

    if (nameInput) {
        nameInput.focus();
    }


    /* ================================================
       ALLOW FOCUS SEARCH AGAIN AFTER FOCUS EVENT FINISHES
    ================================================ */

    setTimeout(() => {
        suppressAppointmentPatientFocus = false;
    }, 100);
}
/* =========================================================
   HIDE SUGGESTIONS
========================================================= */

function hideAppointmentPatientSuggestions() {

    const container =
        document.getElementById(
            "patientNameSuggestions"
        );

    if (!container) {
        return;
    }


    container.innerHTML = "";

    container.style.display = "none";

    container.style.visibility = "hidden";

    container.style.opacity = "0";

}

/* =========================================================
   ESCAPE HTML
========================================================= */

function escapePatientAutocompleteHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
document.addEventListener(
    "DOMContentLoaded",
    () => {

        const nameInput =
            document.getElementById(
                "appointmentPatientName"
            );


        if (!nameInput) {
            return;
        }


        /*
           Load registered patients
        */

        loadAppointmentPatients();


        /*
           Search while typing
        */

        nameInput.addEventListener(
            "input",
            function () {

                /*
                   If user modifies the selected
                   patient name manually, remove
                   the patient_id.
                */

                selectedAppointmentPatientId = null;

                const hiddenId =
                    document.getElementById(
                        "appointmentPatientId"
                    );

                if (hiddenId) {
                    hiddenId.value = "";
                }


                searchAppointmentPatients(
                    this.value
                );

            }
        );


        /*
           Show suggestions on focus
           when there is text
        */

nameInput.addEventListener(
    "focus",
    function () {

        /*
           إذا كان التركيز ناتجًا عن اختيار
           "تسجيل الاسم كمريض جديد"
           فلا نعيد فتح الاقتراحات.
        */

        if (suppressAppointmentPatientFocus) {
            return;
        }


        if (this.value.trim()) {

            searchAppointmentPatients(
                this.value
            );

        }

    }
);

        /*
           Close suggestions when clicking
           outside the autocomplete
        */

        document.addEventListener(
            "click",
            function (event) {

                const group =
                    document.querySelector(
                        ".patient-autocomplete-group"
                    );


                if (
                    group &&
                    !group.contains(event.target)
                ) {

                    hideAppointmentPatientSuggestions();

                }

            }
        );

    }
);
async function saveVisit(){

    /* =====================================================
       GET CURRENT USER
    ===================================================== */

    const {
        data:userData,
        error:userError
    } =
    await supabaseClient.auth.getUser();


    if(
        userError ||
        !userData ||
        !userData.user
    ){

        alert(
            "تعذر الحصول على بيانات المستخدم"
        );

        return;

    }


    const userId =
        userData.user.id;


    /* =====================================================
       GET PATIENT DATA
    ===================================================== */
const patientId =
    document.getElementById(
        "appointmentPatientId"
    )?.value || null;

    const patientNameInput =
        document.getElementById(
            "appointmentPatientName"
        );


    const patientPhoneInput =
        document.getElementById(
            "appointmentPatientPhone"
        );


    const patientAgeInput =
        document.getElementById(
            "appointmentPatientAge"
        );


    const patientName =
        patientNameInput
        ? patientNameInput.value.trim()
        : "";


    const patientPhone =
        patientPhoneInput
        ? patientPhoneInput.value.trim()
        : "";


    /* =====================================================
       GET AGE
    ===================================================== */

    const ageValue =
        patientAgeInput
        ? patientAgeInput.value.trim()
        : "";


    let patientAge =
        null;


    if(ageValue !== ""){

        patientAge =
            Number(ageValue);


        if(
            !Number.isInteger(patientAge) ||
            patientAge < 0 ||
            patientAge > 120
        ){

            alert(
                "أدخل عمرًا صحيحًا بين 0 و120 سنة"
            );

            patientAgeInput.focus();

            return;

        }

    }


    /* =====================================================
       VALIDATE PATIENT NAME
    ===================================================== */

    if(!patientName){

        alert(
            "أدخل اسم المريض"
        );

        if(patientNameInput)
            patientNameInput.focus();

        return;

    }


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

        departmentSelect.focus();

        return;

    }


    const selectedOption =
        departmentSelect.options[
            departmentSelect.selectedIndex
        ];


    const departmentName =
        selectedOption
        ? selectedOption.textContent.trim()
        : "";


    /* =====================================================
       GET APPOINTMENT TIMES
    ===================================================== */

    const appointmentStartInput =
        document.getElementById(
            "appointmentStart"
        );


    const appointmentEndInput =
        document.getElementById(
            "appointmentEnd"
        );


    const appointmentStart =
        appointmentStartInput
        ? appointmentStartInput.value
        : "";


    const appointmentEnd =
        appointmentEndInput
        ? appointmentEndInput.value
        : "";


    /* =====================================================
       VALIDATE TIMES
    ===================================================== */

    if(
        !appointmentStart ||
        !appointmentEnd
    ){

        alert(
            "حدد موعد البداية والنهاية"
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


    const now =
        new Date();


    /* =====================================================
       PREVENT INVALID DATE
    ===================================================== */

    if(
        isNaN(start.getTime()) ||
        isNaN(end.getTime())
    ){

        alert(
            "وقت الزيارة غير صالح"
        );

        return;

    }


    /* =====================================================
       PREVENT PAST VISITS
    ===================================================== */

    if(
        start < now
    ){

        alert(
            "لا يمكن إنشاء زيارة في وقت سابق للوقت الحالي"
        );

        return;

    }


    /* =====================================================
       END MUST BE AFTER START
    ===================================================== */

    if(
        end <= start
    ){

        alert(
            "وقت النهاية يجب أن يكون بعد وقت البداية"
        );

        return;

    }


    /* =====================================================
       CHECK OVERLAPPING VISITS

       نفس العيادة فقط
    ===================================================== */

    const {
        data:existingVisits,
        error:overlapError
    }
    =
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


    /* =====================================================
       CHECK OVERLAP
    ===================================================== */

    const hasOverlap =
        (
            existingVisits ||
            []
        )
        .some(
            visit => {

                if(
                    !visit.appointment_start ||
                    !visit.appointment_end
                ){

                    return false;

                }


                const existingStart =
                    new Date(
                        visit.appointment_start
                    );


                const existingEnd =
                    new Date(
                        visit.appointment_end
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

        alert(
            "يوجد موعد آخر في نفس العيادة خلال هذا الوقت"
        );

        return;

    }


    /* =====================================================
       SAVE VISIT
       
       patient_id = NULL
       لأن المريض لم ينشئ ملفًا بعد.

       patient_age = العمر المدخل
    ===================================================== */

    const {
        data:newVisit,
        error
    }
    =
    await supabaseClient

    .from(
        "patient_visits"
    )

    .insert([{

patient_id: patientId || null,

        patient_name:
            patientName,

        patient_phone:
            patientPhone || null,

        patient_age:
            patientAge,

        appointment_start:
            appointmentStart,

        appointment_end:
            appointmentEnd,

        department_id:
            departmentId,

        department_name:
            departmentName,

        user_id:
            userId

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
   REMOVE FROM WAITING LIST
   إذا كانت الزيارة محجوزة من قائمة الانتظار
===================================================== */

if (window.currentWaitingListPatient?.id) {

    const waitingListId =
        window.currentWaitingListPatient.id;

    const {
        error: waitingDeleteError
    } = await supabaseClient
        .from("waiting_list")
        .delete()
        .eq("id", waitingListId)
        .eq("user_id", userId);

    if (waitingDeleteError) {

        console.error(
            "Remove waiting list patient error:",
            waitingDeleteError
        );

    } else {

        waitingListCache =
            waitingListCache.filter(
                item =>
                    String(item.id) !==
                    String(waitingListId)
            );

        renderWaitingList(
            waitingListCache
        );

        updateWaitingListCount(
            waitingListCache.length
        );
    }

    window.currentWaitingListPatient = null;
}


    /* =====================================================
       STORE CURRENT VISIT ID
    ===================================================== */

    window.currentVisitId =
        newVisit.id;


    /* =====================================================
       SUCCESS
    ===================================================== */

    showToast(
        "تم حجز الزيارة بنجاح"
    );


    /* =====================================================
       CLOSE MODAL
    ===================================================== */

    closeAddVisitModal();


    /* =====================================================
       RELOAD DASHBOARD APPOINTMENTS
    ===================================================== */

    if(
        typeof loadAppointments ===
        "function"
    ){

        await loadAppointments();

    }

}

/* =========================
   8. NAVIGATION
   ========================= */

async function openClinicPage() {
    const userId = await getUserId();
    if (userId) window.location.href = `clinic-settings.html?id=${userId}`;
}

/* =========================
   9. INIT
   ========================= */


/* =========================
9. INIT
========================= */

async function initDashboard(){

    const { data } =
        await supabaseClient.auth.getSession();


    if(!data.session){

        window.location.replace("login.html");

        return;

    }


    await initUser();


    loadDepartmentsDropdown();

    loadAppointments();

    loadDeliveryReminders();

    loadAppointmentRequests();
 loadDashboardClinicName();

    /* =========================
       AUTO REFRESH
    ========================= */

    setInterval(() => {


        /* =========================
           REFRESH APPOINTMENTS
        ========================= */

        loadAppointments(
            currentAppointmentFilter,
            null,
            currentDepartmentFilter
        );


        /* =========================
           REFRESH APPOINTMENT REQUESTS
        ========================= */

        loadAppointmentRequests();


    }, 5000);

}


document.addEventListener(
    "DOMContentLoaded",
    initDashboard
);
