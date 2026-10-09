
let doctorId = null;


/* =====================================================
   GET DOCTOR ID
===================================================== */

function getDoctorIdFromURL(){

    const params =
        new URLSearchParams(
            window.location.search
        );

    return params.get("id");
}


/* =====================================================
   INIT
===================================================== */

window.addEventListener(
    "load",
    async () => {

        doctorId =
            getDoctorIdFromURL();


        console.log(
            "doctorId:",
            doctorId
        );


        if(!doctorId){

            alert(
                "Doctor ID not found in URL"
            );

            return;

        }


        await loadDoctor();

        await loadDoctorServices();

        await loadDoctorDashboard();

        await loadDoctorPayments();

    }
);


/* =====================================================
   LOAD DOCTOR
===================================================== */
async function loadDoctor(){

    const {
        data,
        error
    } =
        await supabaseClient

            .from("doctors")

            .select("*")

            .eq(
                "id",
                doctorId
            )

            .single();


    if(error){

        console.error(
            "Failed to load doctor:",
            error
        );

        return;

    }


    /* =================================================
       BASIC INFO
    ================================================= */

    const title =
        document.getElementById(
            "doctorTitle"
        );

    if(title){

        title.innerText =
            data.doctor_name ||
            "Doctor";

    }


    const specialization =
        document.getElementById(
            "doctorSpecialization"
        );

    if(specialization){

        specialization.innerText =
            data.specialization ||
            "No specialization";

    }


    /* =================================================
       PHONE
    ================================================= */

    const phone =
        document.getElementById(
            "doctorPhone"
        );

    if(phone){

        phone.innerText =
            data.phone ||
            "-";

    }


    /* =================================================
       AGE
       CALCULATED FROM BIRTH DATE
    ================================================= */

    const age =
        document.getElementById(
            "doctorAge"
        );

    if(age){

        age.innerText =
            calculateAge(
                data.birth_date
            );

    }


    /* =================================================
       ADDRESS
    ================================================= */

    const address =
        document.getElementById(
            "doctorAddress"
        );

    if(address){

        address.innerText =
            data.address ||
            "-";

    }


    /* =================================================
       REGISTERED AT
    ================================================= */

    const createdAt =
        document.getElementById(
            "doctorCreatedAt"
        );

    if(createdAt){

        createdAt.innerText =
            data.created_at

                ? new Date(
                    data.created_at
                ).toLocaleDateString(
                    "en-CA"
                )

                : "-";

    }


    /* =================================================
       FILL EDIT FORM
    ================================================= */

    const nameInput =
        document.getElementById(
            "doctor_name"
        );


    const specializationInput =
        document.getElementById(
            "specialization"
        );


    const birthDateInput =
        document.getElementById(
            "doctorBirthDate"
        );


    const phoneInput =
        document.getElementById(
            "phone"
        );


    const addressInput =
        document.getElementById(
            "address"
        );


    /* =================================================
       NAME
    ================================================= */

    if(nameInput){

        nameInput.value =
            data.doctor_name ||
            "";

    }


    /* =================================================
       SPECIALIZATION
    ================================================= */

    if(specializationInput){

        specializationInput.value =
            data.specialization ||
            "";

    }


    /* =================================================
       BIRTH DATE
    ================================================= */

    if(birthDateInput){

        birthDateInput.value =
            data.birth_date ||
            "";

    }


    /* =================================================
       PHONE
    ================================================= */

    if(phoneInput){

        phoneInput.value =
            data.phone ||
            "";

    }


    /* =================================================
       ADDRESS
    ================================================= */

    if(addressInput){

        addressInput.value =
            data.address ||
            "";

    }

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


    const monthDifference =
        today.getMonth()
        - birth.getMonth();


    if(
        monthDifference < 0 ||
        (
            monthDifference === 0 &&
            today.getDate() < birth.getDate()
        )
    ){

        age--;

    }


    return age >= 0
        ? age
        : "-";

}
/* =====================================================
   OPEN EDIT MODAL
===================================================== */

/* =====================================================
   OPEN EDIT MODAL
===================================================== */

function openDoctorEditModal(){

    const modal =
        document.getElementById(
            "doctorEditModal"
        );


    if(!modal){

        return;

    }


    modal.classList.add(
        "active"
    );


    document.body.style.overflow =
        "hidden";


    /* =================================================
       FOCUS NAME
    ================================================= */

    setTimeout(() => {

        const input =
            document.getElementById(
                "doctor_name"
            );


        if(input){

            input.focus();

        }

    }, 100);

}


/* =====================================================
   CLOSE EDIT MODAL
===================================================== */

function closeDoctorEditModal(){

    const modal =
        document.getElementById(
            "doctorEditModal"
        );


    if(!modal){

        return;

    }


    modal.classList.remove(
        "active"
    );


    document.body.style.overflow =
        "";

}


/* =====================================================
   CLOSE MODAL WHEN CLICKING OUTSIDE
===================================================== */

document.addEventListener(
    "click",
    function(event){

        const modal =
            document.getElementById(
                "doctorEditModal"
            );


        if(!modal){

            return;

        }


        if(
            event.target === modal
        ){

            closeDoctorEditModal();

        }

    }
);


/* =====================================================
   ESC KEY
===================================================== */

document.addEventListener(
    "keydown",
    function(event){

        if(
            event.key === "Escape"
        ){

            closeDoctorEditModal();

        }

    }
);


/* =====================================================
   UPDATE DOCTOR
===================================================== */

async function saveDoctorEdit(){

    if(!doctorId){

        return;

    }


    /* =================================================
       GET VALUES
    ================================================= */

    const doctorName =
        document
            .getElementById(
                "doctor_name"
            )
            .value
            .trim();


    const specialization =
        document
            .getElementById(
                "specialization"
            )
            .value
            .trim();


    const birthDate =
        document
            .getElementById(
                "doctorBirthDate"
            )
            .value;


    const phone =
        document
            .getElementById(
                "phone"
            )
            .value
            .trim();


    const address =
        document
            .getElementById(
                "address"
            )
            .value
            .trim();


    /* =================================================
       VALIDATION
    ================================================= */

    if(!doctorName){

        alert(
            "Please enter the doctor name."
        );

        return;

    }


    /* =================================================
       VALIDATE BIRTH DATE
    ================================================= */

    if(birthDate){

        const selectedDate =
            new Date(
                birthDate + "T00:00:00"
            );

        const today =
            new Date();


        if(
            selectedDate > today
        ){

            alert(
                "Date of birth cannot be in the future."
            );

            return;

        }

    }


    /* =================================================
       UPDATE
    ================================================= */

    const {
        error
    } =
        await supabaseClient

            .from("doctors")

            .update({

                doctor_name:
                    doctorName,

                specialization:
                    specialization ||
                    null,

                birth_date:
                    birthDate ||
                    null,

                phone:
                    phone ||
                    null,

                address:
                    address ||
                    null

            })

            .eq(
                "id",
                doctorId
            );


    /* =================================================
       ERROR
    ================================================= */

    if(error){

        console.error(
            "Failed to update doctor:",
            error
        );


        alert(
            error.message
        );

        return;

    }


    /* =================================================
       CLOSE
    ================================================= */

    closeDoctorEditModal();


    /* =================================================
       REFRESH
    ================================================= */

    await loadDoctor();


    /* =================================================
       TOAST
    ================================================= */

    if(
        typeof showDoctorToast ===
        "function"
    ){

        showDoctorToast(
            "Doctor information updated successfully"
        );

    }

}


/* =====================================================
   DELETE DOCTOR
===================================================== */

async function deleteDoctor(){

    if(!doctorId){

        return;

    }


    const confirmed =
        await showConfirm(
            "Are you sure you want to permanently delete this doctor?"
        );


    if(!confirmed){

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
                doctorId
            );


    if(error){

        console.error(
            "Failed to delete doctor:",
            error
        );


        alert(
            error.message
        );

        return;

    }


    window.location.href =
        "doctors.html";

}
/* =====================================================
   LOAD DOCTOR SERVICES
===================================================== */

/* =====================================================
   LOAD DOCTOR SERVICES
   TABLE VIEW
===================================================== */

async function loadDoctorServices() {

    if (!doctorId) {
        return;
    }


    const container =
        document.getElementById(
            "worksContainer"
        );


    if (!container) {
        return;
    }


    container.innerHTML = `

        <div class="doctor-loading">

            <i class="fa-solid fa-spinner fa-spin"></i>

            Loading services...

        </div>

    `;


    /* =====================================================
       GET SERVICES
    ===================================================== */

    const {
        data: services,
        error
    } =
        await supabaseClient

            .from("patientt_services")

            .select(`
                id,
                patient_id,
                service_name,
                total_amount,
                paid_amount,
                remaining_amount,
                remain_amount,
                discount_amount,
                discount_type,
                discount_value,
                doctor_id,
                doctor_percent,
                doctor_amount,
                created_at,
                visit_id
            `)

            .eq(
                "doctor_id",
                doctorId
            )

            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    /* =====================================================
       ERROR
    ===================================================== */

    if (error) {

        console.error(
            "LOAD DOCTOR SERVICES ERROR:",
            error
        );


        container.innerHTML = `

            <div class="doctor-error">

                <i class="fa-solid fa-circle-exclamation"></i>

                Failed to load doctor services.

                <br>

                ${escapeHTML(
                    error.message
                )}

            </div>

        `;

        return;
    }


    /* =====================================================
       NO SERVICES
    ===================================================== */

    if (
        !services ||
        services.length === 0
    ) {

        container.innerHTML = `

            <div class="doctor-empty">

                <i class="fa-solid fa-clipboard-list"></i>

                <p>
                    No services assigned to this doctor yet.
                </p>

            </div>

        `;

        return;
    }


    /* =====================================================
       GET PATIENTS
    ===================================================== */

    const patientIds =
        [
            ...new Set(
                services
                    .map(
                        service =>
                            service.patient_id
                    )
                    .filter(Boolean)
            )
        ];


    let patientsMap = {};


    if (
        patientIds.length > 0
    ) {

        const {
            data: patients,
            error: patientsError
        } =
            await supabaseClient

                .from("patients")

                .select(
                    "id, full_name"
                )

                .in(
                    "id",
                    patientIds
                );


        if (patientsError) {

            console.error(
                "LOAD PATIENTS ERROR:",
                patientsError
            );

        }
        else {

            (
                patients || []
            ).forEach(
                patient => {

                    patientsMap[
                        patient.id
                    ] =
                        patient.full_name || "-";

                }
            );

        }
    }


    /* =====================================================
       GROUP SERVICES BY MONTH
    ===================================================== */

    const monthlyGroups = {};


    services.forEach(
        service => {

            if (!service.created_at) {
                return;
            }


            const date =
                new Date(
                    service.created_at
                );


            const year =
                date.getFullYear();


            const month =
                date.getMonth();


            /*
             * مفتاح ثابت للشهر
             *
             * مثال:
             * 2026-07
             */

            const monthKey =
                `${year}-${String(
                    month + 1
                ).padStart(2, "0")}`;


            if (!monthlyGroups[monthKey]) {

                monthlyGroups[monthKey] = {

                    year: year,

                    month: month,

                    services: []

                };

            }


            monthlyGroups[
                monthKey
            ].services.push(
                service
            );

        }
    );


    /* =====================================================
       SORT MONTHS
       الأحدث أولاً
    ===================================================== */

    const months =
        Object.values(
            monthlyGroups
        ).sort(
            (a, b) => {

                if (
                    a.year !==
                    b.year
                ) {

                    return (
                        b.year -
                        a.year
                    );

                }


                return (
                    b.month -
                    a.month
                );

            }
        );


    /* =====================================================
       ARABIC MONTHS
    ===================================================== */

    const arabicMonths = [

        "يناير",

        "فبراير",

        "مارس",

        "أبريل",

        "مايو",

        "يونيو",

        "يوليو",

        "أغسطس",

        "سبتمبر",

        "أكتوبر",

        "نوفمبر",

        "ديسمبر"

    ];


    /* =====================================================
       BUILD MONTH DETAILS
    ===================================================== */

    let html = "";


    months.forEach(
        (monthGroup, monthIndex) => {

            const monthServices =
                monthGroup.services;


            /* =================================================
               MONTH TOTALS
            ================================================= */

            let totalAmount = 0;

            let totalDiscount = 0;

            let totalNet = 0;

            let totalPaid = 0;

            let totalRemaining = 0;

            let totalDoctorPercent = 0;

            let totalDoctorAmount = 0;


            monthServices.forEach(
                service => {

                    const total =
                        Number(
                            service.total_amount || 0
                        );


                    const discount =
                        Number(
                            service.discount_amount || 0
                        );


                    const netTotal =
                        Math.max(
                            total -
                            discount,
                            0
                        );


                    const paid =
                        Number(
                            service.paid_amount || 0
                        );


                    const remaining =
                        Math.max(
                            netTotal -
                            paid,
                            0
                        );


                    const doctorPercent =
                        Number(
                            service.doctor_percent || 0
                        );


                    const doctorAmount =
                        Number(
                            service.doctor_amount || 0
                        );


                    totalAmount +=
                        total;


                    totalDiscount +=
                        discount;


                    totalNet +=
                        netTotal;


                    totalPaid +=
                        paid;


                    totalRemaining +=
                        remaining;


                    totalDoctorPercent +=
                        doctorPercent;


                    totalDoctorAmount +=
                        doctorAmount;

                }
            );


            /* =================================================
               AVERAGE DOCTOR PERCENT
            ================================================= */

            const averageDoctorPercent =
                monthServices.length > 0

                    ? totalDoctorPercent /
                      monthServices.length

                    : 0;


            /* =================================================
               MONTH NAME
            ================================================= */

            const monthName =
                arabicMonths[
                    monthGroup.month
                ];


            /* =================================================
               FIRST MONTH OPEN
            ================================================= */

            const isFirstMonth =
                monthIndex === 0;


            /* =================================================
               MONTH DETAILS
            ================================================= */

            html += `

                <details
                    class="doctor-month-details"
                    ${
                        isFirstMonth
                            ? "open"
                            : ""
                    }
                >

                    <summary
                        class="doctor-month-summary"
                    >

                        <div class="doctor-month-summary-main">

                            <div class="doctor-month-icon">

                                <i class="
                                    fa-solid
                                    fa-calendar-days
                                "></i>

                            </div>


                            <div class="doctor-month-title">

                                <strong>

                                    ${monthName}
                                    ${monthGroup.year}

                                </strong>

                                <span>

                                    ${monthServices.length}
                                    ${
                                        monthServices.length === 1
                                            ? "خدمة"
                                            : "خدمات"
                                    }

                                </span>

                            </div>

                        </div>


                        <div class="doctor-month-stats">


                            <!-- DISCOUNT -->

                            <div
                                class="
                                    doctor-month-stat
                                    discount
                                "
                            >

                                <span>
                                    الخصم
                                </span>

                                <strong>
                                    ${totalDiscount.toFixed(2)}
                                </strong>

                                <small>
                                    EGP
                                </small>

                            </div>


                            <!-- NET -->

                            <div
                                class="
                                    doctor-month-stat
                                    net
                                "
                            >

                                <span>
                                    المستحق
                                </span>

                                <strong>
                                    ${totalNet.toFixed(2)}
                                </strong>

                                <small>
                                    EGP
                                </small>

                            </div>


                            <!-- PAID -->

                            <div
                                class="
                                    doctor-month-stat
                                    paid
                                "
                            >

                                <span>
                                    المدفوع
                                </span>

                                <strong>
                                    ${totalPaid.toFixed(2)}
                                </strong>

                                <small>
                                    EGP
                                </small>

                            </div>


                            <!-- REMAINING -->

                            <div
                                class="
                                    doctor-month-stat
                                    remaining
                                "
                            >

                                <span>
                                    الباقي
                                </span>

                                <strong>
                                    ${totalRemaining.toFixed(2)}
                                </strong>

                                <small>
                                    EGP
                                </small>

                            </div>


                            <!-- DOCTOR PERCENT -->

                            <div
                                class="
                                    doctor-month-stat
                                    doctor-percent
                                "
                            >

                                <span>
                                    متوسط نسبة الطبيب
                                </span>

                                <strong>
                                    ${averageDoctorPercent.toFixed(2)}%
                                </strong>

                            </div>


                            <!-- DOCTOR AMOUNT -->

                            <div
                                class="
                                    doctor-month-stat
                                    doctor-amount
                                "
                            >

                                <span>
                                    مستحق الطبيب
                                </span>

                                <strong>
                                    ${totalDoctorAmount.toFixed(2)}
                                </strong>

                                <small>
                                    EGP
                                </small>

                            </div>


                        </div>


                        <div class="doctor-month-arrow">

                            <i class="
                                fa-solid
                                fa-chevron-down
                            "></i>

                        </div>

                    </summary>


                    <!-- =====================================
                         MONTH SERVICES
                    ====================================== -->

                    <div class="doctor-month-content">

                        <div class="doctor-services-table-wrapper">

                            <table
                                class="
                                    doctor-services-table
                                "
                            >

                                <thead>

                                    <tr>

                                        <th>
                                            #
                                        </th>

                                        <th>
                                            المريض
                                        </th>

                                        <th>
                                            الخدمة
                                        </th>

                                        <th>
                                            السعر
                                        </th>

                                        <th>
                                            الخصم
                                        </th>

                                        <th>
                                            المستحق
                                        </th>

                                        <th>
                                            المدفوع
                                        </th>

                                        <th>
                                            نسبة الطبيب
                                        </th>

                                        <th>
                                            مستحق الطبيب
                                        </th>

                                        <th>
                                            التاريخ
                                        </th>

                                        <th>
                                            إجراءات
                                        </th>

                                    </tr>

                                </thead>


                                <tbody>
            `;


            /* =================================================
               SERVICES IN MONTH
            ================================================= */

            monthServices.forEach(
                (service, index) => {

                    const patientName =
                        patientsMap[
                            service.patient_id
                        ] || "-";


                    const total =
                        Number(
                            service.total_amount || 0
                        );


                    const discount =
                        Number(
                            service.discount_amount || 0
                        );


                    const netTotal =
                        Math.max(
                            total -
                            discount,
                            0
                        );


                    const paid =
                        Number(
                            service.paid_amount || 0
                        );


                    const doctorPercent =
                        Number(
                            service.doctor_percent || 0
                        );


                    const doctorAmount =
                        Number(
                            service.doctor_amount || 0
                        );


                    const remaining =
                        Math.max(
                            netTotal -
                            paid,
                            0
                        );


                    /* =========================================
                       DATE
                    ========================================== */

                    let formattedDate = "-";


                    if (
                        service.created_at
                    ) {

                        formattedDate =
                            new Date(
                                service.created_at
                            ).toLocaleDateString(
                                "ar-EG",
                                {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric"
                                }
                            );

                    }


                    /* =========================================
                       ROW
                    ========================================== */

                    html += `

                        <tr
                            id="
                                doctor-service-row-${service.id}
                            "
                        >

                            <td
                                class="
                                    row-number
                                "
                            >
                                ${index + 1}
                            </td>


                            <td>

                                <div
                                    class="
                                        patient-cell
                                    "
                                >

                                    <i
                                        class="
                                            fa-solid
                                            fa-user
                                        "
                                    ></i>

                                    <strong>

                                        ${escapeHTML(
                                            patientName
                                        )}

                                    </strong>

                                </div>

                            </td>


                            <td>

                                <div
                                    class="
                                        service-cell
                                    "
                                >

                                    <strong>

                                        ${escapeHTML(
                                            service.service_name ||
                                            "-"
                                        )}

                                    </strong>

                                </div>

                            </td>


                            <td>

                                <span
                                    class="
                                        money
                                    "
                                >

                                    ${total.toFixed(2)}

                                </span>

                                <small>
                                    EGP
                                </small>

                            </td>


                            <td>

                                <span
                                    class="
                                        discount-money
                                    "
                                >

                                    ${discount.toFixed(2)}

                                </span>

                                <small>
                                    EGP
                                </small>

                            </td>


                            <td>

                                <strong
                                    class="
                                        net-money
                                    "
                                >

                                    ${netTotal.toFixed(2)}

                                </strong>

                                <small>
                                    EGP
                                </small>

                            </td>


                            <td>

                                <span
                                    class="
                                        paid-money
                                    "
                                >

                                    ${paid.toFixed(2)}

                                </span>

                                <small>
                                    EGP
                                </small>

                            </td>


                            <td>

                                <div
                                    class="
                                        doctor-percent-cell
                                    "
                                >

                                    <strong>

                                        ${doctorPercent.toFixed(2)}%

                                    </strong>


                                    <button
                                        type="button"
                                        class="
                                            edit-percent-btn
                                        "
                                        onclick="
                                            editDoctorServicePercent(
                                                ${service.id},
                                                ${doctorPercent},
                                                ${netTotal}
                                            )
                                        "
                                        title="تعديل النسبة"
                                    >

                                        <i
                                            class="
                                                fa-solid
                                                fa-pen
                                            "
                                        ></i>

                                    </button>

                                </div>

                            </td>


                            <td>

                                <strong
                                    class="
                                        doctor-amount-money
                                    "
                                >

                                    ${doctorAmount.toFixed(2)}

                                </strong>

                                <small>
                                    EGP
                                </small>

                            </td>


                            <td>

                                <span
                                    class="
                                        date-cell
                                    "
                                >

                                    ${formattedDate}

                                </span>

                            </td>


                            <td
                                class="
                                    doctor-service-actions
                                "
                            >

                                <button
                                    type="button"
                                    class="
                                        delete-doctor-service-btn
                                    "
                                    onclick="
                                        removeDoctorFromService(
                                            ${service.id}
                                        )
                                    "
                                    title="
                                        إزالة الطبيب من الخدمة
                                    "
                                    aria-label="
                                        إزالة الطبيب من الخدمة
                                    "
                                >

                                    <i
                                        class="
                                            fa-solid
                                            fa-user-minus
                                        "
                                    ></i>

                                </button>

                            </td>

                        </tr>

                    `;

                }
            );


            /* =================================================
               CLOSE TABLE
            ================================================= */

            html += `

                                </tbody>

                            </table>

                        </div>

                    </div>

                </details>

            `;

        }
    );


    /* =====================================================
       RENDER
    ===================================================== */

    container.innerHTML = html;
}
/* =====================================================
   EDIT DOCTOR SERVICE PERCENT
   UPDATE TABLE + DASHBOARD AUTOMATICALLY
===================================================== */

/* =====================================================
   EDIT DOCTOR SERVICE PERCENT
   UPDATE ROW IMMEDIATELY
===================================================== */

async function editDoctorServicePercent(
    serviceId,
    currentPercent,
    netAmount
) {

    const value =
        prompt(
            `أدخل نسبة الطبيب للخدمة\n\n` +
            `المستحق بعد الخصم: ${Number(netAmount).toFixed(2)} EGP`,
            currentPercent
        );


    if (value === null) {
        return;
    }


    const percent =
        Number(value);


    /* =====================================================
       VALIDATION
    ===================================================== */

    if (
        !Number.isFinite(percent) ||
        percent < 0 ||
        percent > 100
    ) {

        alert(
            "نسبة الطبيب يجب أن تكون بين 0 و 100"
        );

        return;
    }


    /* =====================================================
       CALCULATE DOCTOR AMOUNT
    ===================================================== */

    const safeNetAmount =
        Math.max(
            Number(netAmount) || 0,
            0
        );


    const doctorAmount =
        safeNetAmount *
        (
            percent / 100
        );


    const roundedDoctorAmount =
        Number(
            doctorAmount.toFixed(2)
        );


    /* =====================================================
       UPDATE DATABASE
    ===================================================== */

    const {
        data,
        error
    } =
        await supabaseClient

            .from("patientt_services")

            .update({

                doctor_percent:
                    percent,

                doctor_amount:
                    roundedDoctorAmount

            })

            .eq(
                "id",
                serviceId
            )

            .select(`
                id,
                doctor_percent,
                doctor_amount
            `)
            
            .single();


    if (error) {

        console.error(
            "UPDATE DOCTOR PERCENT ERROR:",
            error
        );


        alert(
            "فشل تحديث نسبة الطبيب:\n" +
            error.message
        );

        return;
    }


    console.log(
        "UPDATED DOCTOR SERVICE:",
        data
    );


    /* =====================================================
       UPDATE ROW IMMEDIATELY
    ===================================================== */

    const row =
        document.getElementById(
            `doctor-service-row-${serviceId}`
        );


    if (row) {

        /* =============================================
           نسبة الطبيب
        ============================================= */

        const percentCell =
            row.querySelector(
                ".doctor-percent-cell"
            );


        if (percentCell) {

            percentCell.innerHTML = `

                <strong>
                    ${percent.toFixed(2)}%
                </strong>

                <button
                    type="button"
                    class="edit-percent-btn"
                    onclick="editDoctorServicePercent(
                        ${serviceId},
                        ${percent},
                        ${safeNetAmount}
                    )"
                    title="تعديل النسبة"
                >

                    <i class="fa-solid fa-pen"></i>

                </button>

            `;

        }


        /* =============================================
           مستحق الطبيب
        ============================================= */

        const doctorAmountCell =
            row.querySelector(
                ".doctor-amount-money"
            );


        if (doctorAmountCell) {

            doctorAmountCell.innerText =
                roundedDoctorAmount.toFixed(2);

        }

    }


    /* =====================================================
       SUCCESS TOAST
    ===================================================== */

showDoctorToast(
    "تم تحديث نسبة الطبيب بنجاح"
);


    /* =====================================================
       UPDATE DASHBOARD
    ===================================================== */

    await Promise.all([

        loadDoctorDashboard(),

        loadDoctorPayments()

    ]);


    /*
       بعد تحديث الصف مباشرة،
       نعمل مزامنة كاملة مع قاعدة البيانات.
    */

    await loadDoctorServices();

}
/* =====================================================
   REMOVE DOCTOR FROM SERVICE
   DELETE DOCTOR ASSIGNMENT ONLY
===================================================== */

async function removeDoctorFromService(serviceId) {

    if (!serviceId) {
        return;
    }


    const confirmed =
        confirm(
            "هل أنت متأكد من إزالة الطبيب من هذه الخدمة؟\n\n" +
            "سيتم إزالة ارتباط الطبيب بالخدمة فقط، " +
            "ولن يتم حذف الخدمة أو بيانات المريض."
        );


    if (!confirmed) {
        return;
    }


    /* =====================================================
       UPDATE SERVICE
       REMOVE DOCTOR ONLY
    ===================================================== */

    const {
        error
    } =
        await supabaseClient

            .from("patientt_services")

            .update({

                doctor_id: null,

                doctor_percent: 0,

                doctor_amount: 0

            })

            .eq(
                "id",
                serviceId
            );


    if (error) {

        console.error(
            "REMOVE DOCTOR FROM SERVICE ERROR:",
            error
        );


        alert(
            error.message
        );

        return;
    }


    /* =====================================================
       SUCCESS TOAST
    ===================================================== */

    showToast(
        "تم حذف الطبيب من الخدمة بنجاح"
    );


    /* =====================================================
       REFRESH UI IMMEDIATELY
    ===================================================== */

    await Promise.all([

        loadDoctorServices(),

        loadDoctorDashboard(),

        loadDoctorPayments()

    ]);

}
/* =====================================================
   DOCTOR DASHBOARD
===================================================== */

async function loadDoctorDashboard() {

    if (!doctorId) {
        return;
    }


    const {
        data,
        error
    } =
        await supabaseClient

            .from("patientt_services")

            .select(`
                id,
                total_amount,
                discount_amount,
                doctor_percent,
                doctor_amount
            `)

            .eq(
                "doctor_id",
                doctorId
            );


    if (error) {

        console.error(
            "DOCTOR DASHBOARD ERROR:",
            error
        );

        return;

    }


    let totalServices = 0;

    let totalServiceAmount = 0;

    let totalDoctorAmount = 0;


    (data || []).forEach(
        service => {

            totalServices++;


            const totalAmount =
                Number(
                    service.total_amount || 0
                );


            const discountAmount =
                Number(
                    service.discount_amount || 0
                );


            /* =========================================
               NET AFTER DISCOUNT
            ========================================= */

            const netAmount =
                Math.max(
                    totalAmount -
                    discountAmount,
                    0
                );


            totalServiceAmount +=
                netAmount;


            /* =========================================
               DOCTOR PERCENT
            ========================================= */

            const doctorPercent =
                Number(
                    service.doctor_percent || 0
                );


            /* =========================================
               CALCULATE DOCTOR DUE
               AFTER DISCOUNT
            ========================================= */

            const calculatedDoctorAmount =
                netAmount *
                (
                    doctorPercent /
                    100
                );


            totalDoctorAmount +=
                calculatedDoctorAmount;

        }
    );


    /* =====================================================
       UPDATE UI
    ===================================================== */

    const worksEl =
        document.getElementById(
            "totalWorks"
        );


    const costEl =
        document.getElementById(
            "totalCost"
        );


    const profitEl =
        document.getElementById(
            "totalProfit"
        );


    if (worksEl) {

        worksEl.innerText =
            totalServices;

    }


    if (costEl) {

        costEl.innerText =
            totalServiceAmount.toFixed(2)
            +
            " EGP";

    }


    if (profitEl) {

        profitEl.innerText =
            totalDoctorAmount.toFixed(2)
            +
            " EGP";

    }

}
/* =====================================================
   OPEN DOCTOR PAYMENT MODAL
===================================================== */

function openDoctorPaymentModal() {

    const modal =
        document.getElementById(
            "doctorPaymentModal"
        );


    if (!modal) {
        return;
    }


    const amount =
        document.getElementById(
            "doctorPaymentAmount"
        );


    const note =
        document.getElementById(
            "doctorPaymentNote"
        );


    const date =
        document.getElementById(
            "doctorPaymentDate"
        );


    if (amount) {
        amount.value = "";
    }


    if (note) {
        note.value = "";
    }


    if (date) {

        const now =
            new Date();


        const local =
            new Date(
                now.getTime() -
                now.getTimezoneOffset() *
                60000
            )
                .toISOString()
                .slice(
                    0,
                    16
                );


        date.value =
            local;

    }


    modal.style.display =
        "flex";

}


/* =====================================================
   CLOSE MODAL
===================================================== */

function closeDoctorPaymentModal() {

    const modal =
        document.getElementById(
            "doctorPaymentModal"
        );


    if (modal) {

        modal.style.display =
            "none";

    }

}


/* =====================================================
   SAVE DOCTOR PAYMENT
   SAVE + CLOSE MODAL + REFRESH DASHBOARD
===================================================== */

/* =====================================================
   SAVE DOCTOR PAYMENT
   SAVE + TOAST + CLOSE + LIVE UPDATE
===================================================== */

async function saveDoctorPayment(
    event = null
) {

    /* =================================================
       PREVENT FORM SUBMIT
    ================================================= */

    if (event) {

        event.preventDefault();

        event.stopPropagation();

    }


    console.log(
        "SAVE DOCTOR PAYMENT START"
    );


    /* =================================================
       CHECK DOCTOR
    ================================================= */

    if (!doctorId) {

        showDoctorToast(
            "لم يتم العثور على الطبيب",
            "error"
        );

        return;

    }


    /* =================================================
       GET INPUTS
    ================================================= */

    const amountInput =
        document.getElementById(
            "doctorPaymentAmount"
        );


    const dateInput =
        document.getElementById(
            "doctorPaymentDate"
        );


    const noteInput =
        document.getElementById(
            "doctorPaymentNote"
        );


    const amount =
        Number(
            amountInput?.value || 0
        );


    const paymentDate =
        dateInput?.value || "";


    const note =
        noteInput?.value
            ?.trim() || null;


    /* =================================================
       VALIDATE
    ================================================= */

    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {

        showDoctorToast(
            "أدخل مبلغًا صحيحًا",
            "error"
        );

        return;

    }


    /* =================================================
       GET USER
    ================================================= */

    const {
        data: userData,
        error: userError
    } =
        await supabaseClient
            .auth
            .getUser();


    if (
        userError ||
        !userData?.user
    ) {

        console.error(
            "GET USER ERROR:",
            userError
        );


        showDoctorToast(
            "تعذر معرفة المستخدم الحالي",
            "error"
        );

        return;

    }


    const userId =
        userData.user.id;


    /* =================================================
       SAVE BUTTON
    ================================================= */

    const saveButton =
        document.getElementById(
            "saveDoctorPaymentBtn"
        );


    if (saveButton) {

        saveButton.disabled =
            true;

        saveButton.innerHTML = `

            <i class="fa-solid fa-spinner fa-spin"></i>

            جاري الحفظ...

        `;

    }


    try {

        /* =================================================
           INSERT
        ================================================= */

        const {
            error
        } =
            await supabaseClient

                .from("doctor_payments")

                .insert({

                    doctor_id:
                        Number(doctorId),

                    user_id:
                        userId,

                    amount:
                        Number(
                            amount.toFixed(2)
                        ),

                    payment_date:
                        paymentDate
                            ? new Date(
                                paymentDate
                            ).toISOString()
                            : new Date().toISOString(),

                    note:
                        note

                });


        /* =================================================
           ERROR
        ================================================= */

        if (error) {

            console.error(
                "SAVE DOCTOR PAYMENT ERROR:",
                error
            );


            showDoctorToast(
                error.message,
                "error"
            );

            return;

        }


        console.log(
            "DOCTOR PAYMENT SAVED"
        );


        /* =================================================
           CLOSE MODAL
        ================================================= */

        closeDoctorPaymentModal();


        /* =================================================
           CLEAR FORM
        ================================================= */

        if (amountInput) {

            amountInput.value =
                "";

        }


        if (noteInput) {

            noteInput.value =
                "";

        }


        /* =================================================
           TOAST
        ================================================= */

        showDoctorToast(
            "تم حفظ الدفع بنجاح"
        );


        /* =================================================
           UPDATE DASHBOARD
        ================================================= */

        await loadDoctorDashboard();


        /* =================================================
           UPDATE PAYMENTS
        ================================================= */

        await loadDoctorPayments();


        console.log(
            "DOCTOR DASHBOARD UPDATED"
        );

    }

    catch (error) {

        console.error(
            "SAVE DOCTOR PAYMENT EXCEPTION:",
            error
        );


        showDoctorToast(
            error?.message ||
            "حدث خطأ أثناء حفظ الدفعة",
            "error"
        );

    }

    finally {

        if (saveButton) {

            saveButton.disabled =
                false;

            saveButton.innerHTML = `

                <i class="fa-solid fa-check"></i>

                حفظ الدفع

            `;

        }

    }

}
/* =====================================================
   LOAD DOCTOR PAYMENTS
===================================================== */
async function loadDoctorPayments() {

    /* =====================================================
       CHECK DOCTOR
    ===================================================== */

    if (!doctorId) {
        console.warn("No doctorId");
        return;
    }


    /* =====================================================
       CONTAINER
    ===================================================== */

    const container =
        document.getElementById(
            "doctorPaymentsContainer"
        );


    if (!container) {
        console.warn(
            "doctorPaymentsContainer not found"
        );
        return;
    }


    /* =====================================================
       LOADING
    ===================================================== */

    container.innerHTML = `

        <div style="
            text-align:center;
            padding:35px;
            color:#888;
        ">

            <i
                class="
                    fa-solid
                    fa-spinner
                    fa-spin
                "
                style="
                    font-size:28px;
                    margin-bottom:10px;
                "
            ></i>

            <div>
                جاري تحميل الدفعات...
            </div>

        </div>

    `;


    try {


        /* =====================================================
           LOAD PAYMENTS
        ===================================================== */

        const {
            data: payments,
            error
        } =
        await supabaseClient

            .from("doctor_payments")

            .select(`
                id,
                amount,
                payment_date,
                note,
                created_at
            `)

            .eq(
                "doctor_id",
                doctorId
            )

            .order(
                "payment_date",
                {
                    ascending: false
                }
            );


        if (error) {

            console.error(
                "LOAD DOCTOR PAYMENTS ERROR:",
                error
            );


            container.innerHTML = `

                <div class="doctor-error">

                    <i class="
                        fa-solid
                        fa-circle-exclamation
                    "></i>

                    <span>
                        ${
                            String(
                                error.message ||
                                "Failed to load payments"
                            )
                        }
                    </span>

                </div>

            `;

            return;

        }


        const allPayments =
            payments || [];


        /* =====================================================
           TOTAL PAID
           كل الدفعات وليس الشهر المفتوح فقط
        ===================================================== */

        const totalPaid =
            allPayments.reduce(
                (
                    total,
                    payment
                ) => {

                    return (
                        total +
                        Math.max(
                            Number(
                                payment.amount || 0
                            ),
                            0
                        )
                    );

                },
                0
            );


        /* =====================================================
           UPDATE TOTAL PAID
        ===================================================== */

        const paidEl =
            document.getElementById(
                "doctorTotalPaid"
            );


        if (paidEl) {

            paidEl.innerText =
                totalPaid.toLocaleString(
                    "en-US",
                    {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    }
                ) +
                " EGP";

        }


        /* =====================================================
           LOAD DOCTOR SERVICES
        ===================================================== */

        const {
            data: services,
            error: servicesError
        } =
        await supabaseClient

            .from("patientt_services")

            .select(
                "doctor_amount"
            )

            .eq(
                "doctor_id",
                doctorId
            );


        if (!servicesError) {


            /* =================================================
               TOTAL DOCTOR DUE
            ================================================= */

            const totalDue =
                (services || [])
                    .reduce(
                        (
                            total,
                            service
                        ) => {

                            const amount =
                                Number(
                                    service.doctor_amount || 0
                                );


                            return (
                                total +
                                Math.max(
                                    amount,
                                    0
                                )
                            );

                        },
                        0
                    );


            /* =================================================
               REMAINING
            ================================================= */

            const remaining =
                Math.max(
                    totalDue -
                    totalPaid,
                    0
                );


            /* =================================================
               UPDATE DUE
            ================================================= */

            const dueEl =
                document.getElementById(
                    "doctorTotalDue"
                );


            if (dueEl) {

                dueEl.innerText =
                    totalDue.toLocaleString(
                        "en-US",
                        {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        }
                    ) +
                    " EGP";

            }


            /* =================================================
               UPDATE REMAINING
            ================================================= */

            const remainEl =
                document.getElementById(
                    "doctorTotalRemaining"
                );


            if (remainEl) {

                remainEl.innerText =
                    remaining.toLocaleString(
                        "en-US",
                        {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        }
                    ) +
                    " EGP";

            }

        }


        /* =====================================================
           EMPTY
        ===================================================== */

        if (!allPayments.length) {

            container.innerHTML = `

                <div class="doctor-empty">

                    <i class="
                        fa-solid
                        fa-wallet
                    "></i>

                    <p>
                        لا توجد دفعات مسجلة للطبيب.
                    </p>

                </div>

            `;

            return;

        }


        /* =====================================================
           GROUP PAYMENTS BY MONTH
        ===================================================== */

        const groupedPayments = {};


        allPayments.forEach(
            payment => {

                /*
                 * إذا لم يوجد payment_date
                 * نستخدم created_at
                 */

                const dateValue =
                    payment.payment_date ||
                    payment.created_at;


                const date =
                    new Date(
                        dateValue
                    );


                if (
                    isNaN(
                        date.getTime()
                    )
                ) {
                    return;
                }


                const year =
                    date.getFullYear();


                const month =
                    date.getMonth();


                const key =
                    `${year}-${String(
                        month + 1
                    ).padStart(
                        2,
                        "0"
                    )}`;


                if (
                    !groupedPayments[key]
                ) {

                    groupedPayments[key] = [];

                }


                groupedPayments[key].push(
                    payment
                );

            }
        );


        /* =====================================================
           MONTH NAMES
        ===================================================== */

        const monthNames = [

            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December"

        ];


        /* =====================================================
           SORT MONTHS
           الأحدث أولاً
        ===================================================== */

        const sortedMonths =
            Object.entries(
                groupedPayments
            ).sort(
                (
                    [a],
                    [b]
                ) =>
                    b.localeCompare(a)
            );


        /* =====================================================
           RENDER MONTH GROUPS
        ===================================================== */

        container.innerHTML =

            sortedMonths
                .map(
                    (
                        [
                            monthKey,
                            monthPayments
                        ],
                        monthIndex
                    ) => {


                        /* =====================================
                           YEAR / MONTH
                        ===================================== */

                        const [
                            year,
                            month
                        ] =
                            monthKey
                                .split("-")
                                .map(Number);


                        const monthName =
                            monthNames[
                                month - 1
                            ];


                        /* =====================================
                           MONTH TOTAL
                        ===================================== */

                        const monthTotal =
                            monthPayments.reduce(
                                (
                                    total,
                                    payment
                                ) => {

                                    return (
                                        total +
                                        Math.max(
                                            Number(
                                                payment.amount ||
                                                0
                                            ),
                                            0
                                        )
                                    );

                                },
                                0
                            );


                        /* =====================================
                           OPEN LATEST MONTH
                        ===================================== */

                        const openAttribute =
                            monthIndex === 0
                                ? "open"
                                : "";


                        /* =====================================
                           MONTH PAYMENTS TABLE
                        ===================================== */

                        const paymentsHTML =
                            monthPayments
                                .map(
                                    (
                                        payment,
                                        index
                                    ) => {


                                        const amount =
                                            Number(
                                                payment.amount ||
                                                0
                                            );


                                        const dateValue =
                                            payment.payment_date ||
                                            payment.created_at;


                                        const paymentDate =
                                            dateValue
                                                ? new Date(
                                                    dateValue
                                                ).toLocaleString(
                                                    "ar-EG"
                                                )
                                                : "—";


                                        const note =
                                            String(
                                                payment.note ||
                                                ""
                                            );


                                        return `

                                            <tr>

                                                <td>

                                                    ${
                                                        index + 1
                                                    }

                                                </td>


                                                <td>

                                                    <strong
                                                        class="
                                                            payment-amount
                                                        "
                                                    >

                                                        ${amount.toLocaleString(
                                                            "en-US",
                                                            {
                                                                minimumFractionDigits: 2,
                                                                maximumFractionDigits: 2
                                                            }
                                                        )}

                                                    </strong>

                                                    EGP

                                                </td>


                                                <td>

                                                    ${paymentDate}

                                                </td>


                                                <td>

                                                    ${
                                                        note
                                                        ||
                                                        "—"
                                                    }

                                                </td>


                                                <td>

                                                    <button
                                                        type="button"
                                                        class="
                                                            payment-delete-btn
                                                        "
                                                        onclick="
                                                            deleteDoctorPayment(
                                                                ${payment.id}
                                                            )
                                                        "
                                                    >

                                                        <i
                                                            class="
                                                                fa-solid
                                                                fa-trash
                                                            "
                                                        ></i>

                                                        حذف

                                                    </button>

                                                </td>

                                            </tr>

                                        `;

                                    }
                                )
                                .join("");


                        /* =====================================
                           MONTH GROUP
                        ===================================== */

                        return `

                            <details
                                class="
                                    doctor-payments-month-group
                                "
                                ${openAttribute}
                            >


                                <!-- MONTH HEADER -->

                                <summary
                                    class="
                                        doctor-payments-month-summary
                                    "
                                >

                                    <div
                                        class="
                                            doctor-payments-month-title
                                        "
                                    >

                                        <div
                                            class="
                                                doctor-payments-month-icon
                                            "
                                        >

                                            <i
                                                class="
                                                    fa-solid
                                                    fa-calendar-days
                                                "
                                            ></i>

                                        </div>


                                        <div>

                                            <strong>

                                                دفعات شهر
                                                ${monthName}
                                                ${year}

                                            </strong>


                                            <span>

                                                ${
                                                    monthPayments.length
                                                }

                                                دفعة

                                            </span>

                                        </div>

                                    </div>


                                    <div
                                        class="
                                            doctor-payments-month-total
                                        "
                                    >

                                        <span>
                                            إجمالي الشهر
                                        </span>


                                        <strong>

                                            ${monthTotal.toLocaleString(
                                                "en-US",
                                                {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2
                                                }
                                            )}

                                            <small>
                                                EGP
                                            </small>

                                        </strong>


                                        <i
                                            class="
                                                fa-solid
                                                fa-chevron-down
                                                doctor-payments-month-arrow
                                            "
                                        ></i>

                                    </div>

                                </summary>


                                <!-- MONTH CONTENT -->

                                <div
                                    class="
                                        doctor-payments-month-content
                                    "
                                >

                                    <div
                                        class="
                                            doctor-payments-table-wrapper
                                        "
                                    >

                                        <table
                                            class="
                                                doctor-payments-table
                                            "
                                        >

                                            <thead>

                                                <tr>

                                                    <th>
                                                        #
                                                    </th>

                                                    <th>
                                                        المبلغ
                                                    </th>

                                                    <th>
                                                        تاريخ الدفع
                                                    </th>

                                                    <th>
                                                        الملاحظات
                                                    </th>

                                                    <th>
                                                        إجراءات
                                                    </th>

                                                </tr>

                                            </thead>


                                            <tbody>

                                                ${paymentsHTML}

                                            </tbody>

                                        </table>

                                    </div>

                                </div>

                            </details>

                        `;

                    }
                )
                .join("");


    }
    catch(error){

        console.error(
            "loadDoctorPayments error:",
            error
        );


        container.innerHTML = `

            <div
                class="doctor-error"
                style="
                    text-align:center;
                    padding:30px;
                    color:#ef4444;
                "
            >

                <i
                    class="
                        fa-solid
                        fa-circle-exclamation
                    "
                    style="
                        font-size:30px;
                        margin-bottom:10px;
                    "
                ></i>


                <p>
                    Failed to load doctor payments
                </p>


                <small style="
                    color:#888;
                ">

                    ${
                        error?.message ||
                        "Unknown error"
                    }

                </small>

            </div>

        `;

    }

}
/* =====================================================
   DELETE DOCTOR PAYMENT
   REFRESH DASHBOARD AUTOMATICALLY
===================================================== */

/* =====================================================
   DELETE DOCTOR PAYMENT
   DELETE + TOAST + LIVE UPDATE
===================================================== */

async function deleteDoctorPayment(
    paymentId
) {

    if (
        !await showConfirm(
            "هل أنت متأكد من حذف هذه الدفعة؟"
        )
    ) {

        return;

    }


    console.log(
        "DELETE DOCTOR PAYMENT:",
        paymentId
    );


    const {
        error
    } =
        await supabaseClient

            .from("doctor_payments")

            .delete()

            .eq(
                "id",
                paymentId
            );


    if (error) {

        console.error(
            "DELETE DOCTOR PAYMENT ERROR:",
            error
        );


        showDoctorToast(
            error.message,
            "error"
        );

        return;

    }


    console.log(
        "DOCTOR PAYMENT DELETED"
    );


    /* =================================================
       TOAST
    ================================================= */

    showDoctorToast(
        "تم حذف الدفعة بنجاح"
    );


    /* =================================================
       UPDATE DASHBOARD
    ================================================= */

    await loadDoctorDashboard();


    /* =================================================
       UPDATE PAYMENTS TABLE
    ================================================= */

    await loadDoctorPayments();

}
/* =====================================================
   DOCTOR PAGE TOAST
===================================================== */

function showDoctorToast(
    message,
    type = "success"
) {

    let toast =
        document.getElementById(
            "doctorPageToast"
        );


    /* =================================================
       CREATE TOAST IF NOT EXISTS
    ================================================= */

    if (!toast) {

        toast =
            document.createElement(
                "div"
            );

        toast.id =
            "doctorPageToast";


        toast.style.position =
            "fixed";

        toast.style.bottom =
            "30px";

        toast.style.right =
            "30px";

        toast.style.zIndex =
            "999999";

        toast.style.minWidth =
            "260px";

        toast.style.maxWidth =
            "400px";

        toast.style.padding =
            "14px 18px";

        toast.style.borderRadius =
            "12px";

        toast.style.color =
            "#fff";

        toast.style.fontSize =
            "14px";

        toast.style.fontWeight =
            "600";

        toast.style.display =
            "flex";

        toast.style.alignItems =
            "center";

        toast.style.gap =
            "10px";

        toast.style.boxShadow =
            "0 10px 30px rgba(0,0,0,.35)";

        toast.style.transition =
            "all .3s ease";

        toast.style.opacity =
            "0";

        toast.style.transform =
            "translateY(20px)";


        document.body.appendChild(
            toast
        );

    }


    /* =================================================
       ICON
    ================================================= */

    const icon =
        type === "success"
            ? "fa-circle-check"
            : "fa-circle-exclamation";


    toast.innerHTML = `

        <i class="fa-solid ${icon}"></i>

        <span>
            ${escapeHTML(message)}
        </span>

    `;


    toast.style.background =
        type === "success"
            ? "#16a34a"
            : "#dc2626";


    /* =================================================
       SHOW
    ================================================= */

    toast.style.opacity =
        "1";

    toast.style.transform =
        "translateY(0)";


    /* =================================================
       HIDE
    ================================================= */

    clearTimeout(
        window.doctorToastTimer
    );


    window.doctorToastTimer =
        setTimeout(
            () => {

                toast.style.opacity =
                    "0";

                toast.style.transform =
                    "translateY(20px)";

            },
            2500
        );

}
/* =====================================================
   HTML ESCAPE
===================================================== */

function escapeHTML(value) {

    return String(value ?? "")

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


/* =====================================================
   NAVIGATION
===================================================== */

function goToDoctors() {

    window.location.href =
        "doctors.html";

}


function goToDashboard() {

    window.location.href =
        "dashboard.html";

}
/* =====================================================
   PRINT DOCTOR REPORT
   SERVICES + PAYMENTS + SUMMARY
===================================================== */
/* =====================================================
   PRINT DOCTOR REPORT
   SERVICES + PAYMENTS + SUMMARY
   WITH WHATSAPP SHARE
===================================================== */

async function printDoctorReport() {

    if (!doctorId) {
        alert("لم يتم العثور على معرف الطبيب");
        return;
    }

    /* =================================================
       GET DOCTOR INFO
    ================================================= */

    const titleEl = document.getElementById("doctorTitle");
    const specEl = document.getElementById("doctorSpecialization");
    const phoneEl = document.getElementById("doctorPhone");
    const ageEl = document.getElementById("doctorAge");
    const addressEl = document.getElementById("doctorAddress");

    const doctorName = titleEl ? titleEl.innerText : "Doctor";
    const specialization = specEl ? specEl.innerText : "-";
    const phone = phoneEl ? phoneEl.innerText : "-";
    const age = ageEl ? ageEl.innerText : "-";
    const address = addressEl ? addressEl.innerText : "-";

    /* =================================================
       FORMAT PHONE FOR WHATSAPP
    ================================================= */
    let doctorPhoneFormatted = "";
    if(phone && phone !== "-"){
        let rawPhone = String(phone).replace(/\D/g, "");
        if(rawPhone.startsWith("0")){
            rawPhone = "2" + rawPhone;
        }
        if(rawPhone.length >= 10){
            doctorPhoneFormatted = rawPhone;
        }
    }

    /* =================================================
       GET DASHBOARD NUMBERS
    ================================================= */

    const totalWorksEl = document.getElementById("totalWorks");
    const totalCostEl = document.getElementById("totalCost");
    const totalProfitEl = document.getElementById("totalProfit");
    const totalPaidEl = document.getElementById("doctorTotalPaid");
    const totalDueEl = document.getElementById("doctorTotalDue");
    const totalRemainingEl = document.getElementById("doctorTotalRemaining");

    const totalWorks = totalWorksEl ? totalWorksEl.innerText : "0";
    const totalCost = totalCostEl ? totalCostEl.innerText : "0 EGP";
    const totalProfit = totalProfitEl ? totalProfitEl.innerText : "0 EGP";
    const totalPaid = totalPaidEl ? totalPaidEl.innerText : "0 EGP";
    const totalDue = totalDueEl ? totalDueEl.innerText : "0 EGP";
    const totalRemaining = totalRemainingEl ? totalRemainingEl.innerText : "0 EGP";


    /* =================================================
       GET SERVICES FROM TABLE
    ================================================= */

    let servicesHTML = "";
    const servicesTable = document.querySelector(".doctor-services-table tbody");

    if (servicesTable && servicesTable.rows.length > 0) {

        servicesHTML = `
            <h2>الأعمال والخدمات</h2>
            <table class="print-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>المريض</th>
                        <th>الخدمة</th>
                        <th>السعر</th>
                        <th>الخصم</th>
                        <th>المستحق</th>
                        <th>المدفوع</th>
                        <th>نسبة الطبيب</th>
                        <th>مستحق الطبيب</th>
                        <th>التاريخ</th>
                    </tr>
                </thead>
                <tbody>
        `;

        Array.from(servicesTable.rows).forEach((row, index) => {
            const cells = row.cells;
            servicesHTML += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${cells[1] ? cells[1].innerText.trim() : "-"}</td>
                    <td>${cells[2] ? cells[2].innerText.trim() : "-"}</td>
                    <td>${cells[3] ? cells[3].innerText.trim() : "-"}</td>
                    <td>${cells[4] ? cells[4].innerText.trim() : "-"}</td>
                    <td>${cells[5] ? cells[5].innerText.trim() : "-"}</td>
                    <td>${cells[6] ? cells[6].innerText.trim() : "-"}</td>
                    <td>${cells[7] ? cells[7].innerText.trim() : "-"}</td>
                    <td>${cells[8] ? cells[8].innerText.trim() : "-"}</td>
                    <td>${cells[9] ? cells[9].innerText.trim() : "-"}</td>
                </tr>
            `;
        });

        servicesHTML += `</tbody></table>`;

    } else {
        servicesHTML = `<p class="no-data">لا توجد أعمال مسجلة</p>`;
    }


    /* =================================================
       GET PAYMENTS FROM CONTAINER
    ================================================= */

    let paymentsHTML = "";
    const paymentGroups = document.querySelectorAll(".doctor-payments-month-group");

    if (paymentGroups.length > 0) {

        paymentsHTML = `<h2>الدفعات</h2>`;

        paymentGroups.forEach(group => {
            const summary = group.querySelector(".doctor-payments-month-summary");
            const monthTitle = summary ? summary.querySelector("strong")?.innerText.trim() : "";
            const monthTotal = summary ? summary.querySelector(".doctor-payments-month-total strong")?.innerText.trim() : "";

            const table = group.querySelector(".doctor-payments-table tbody");
            let rowsHTML = "";

            if (table) {
                Array.from(table.rows).forEach((row, idx) => {
                    const cells = row.cells;
                    rowsHTML += `
                        <tr>
                            <td>${idx + 1}</td>
                            <td>${cells[1] ? cells[1].innerText.trim() : "-"}</td>
                            <td>${cells[2] ? cells[2].innerText.trim() : "-"}</td>
                            <td>${cells[3] ? cells[3].innerText.trim() : "-"}</td>
                        </tr>
                    `;
                });
            }

            paymentsHTML += `
                <div class="month-section">
                    <div class="month-header">
                        <strong>${monthTitle}</strong>
                        <span>إجمالي: ${monthTotal}</span>
                    </div>
                    <table class="print-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>المبلغ</th>
                                <th>تاريخ الدفع</th>
                                <th>الملاحظات</th>
                            </tr>
                        </thead>
                        <tbody>${rowsHTML}</tbody>
                    </table>
                </div>
            `;
        });

    } else {
        paymentsHTML = `<p class="no-data">لا توجد دفعات مسجلة</p>`;
    }


    /* =================================================
       WHATSAPP BUTTON HTML
    ================================================= */
    const whatsappBtnHTML = doctorPhoneFormatted
        ? `<button class="btn btn-whatsapp" onclick="captureAndSend()">
            <i class="fa-brands fa-whatsapp"></i>
            إرسال للطبيب
           </button>`
        : `<button class="btn btn-whatsapp" onclick="alert('لا يوجد رقم هاتف مسجل لهذا الطبيب')" style="opacity:0.6; cursor:not-allowed;">
            <i class="fa-brands fa-whatsapp"></i>
            إرسال للطبيب
           </button>`;


    /* =================================================
       BUILD PRINT WINDOW
    ================================================= */

    const now = new Date();
    const printDate = now.toLocaleDateString("ar-EG");
    const printTime = now.toLocaleTimeString("ar-EG");

    const printContent = `
        <!DOCTYPE html>
        <html lang="ar" dir="ltr">
        <head>
            <meta charset="UTF-8">
            <title>تقرير الطبيب - ${escapeHTML(doctorName)}</title>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
            <script src="https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js"></script>
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
                @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');

                * {
                    box-sizing: border-box;
                    margin: 0;
                    padding: 0;
                }

                body {
                    font-family: 'Cairo', Tahoma, sans-serif;
                    margin: 0;
                    padding: 40px 20px 120px 20px;
                    color: #1f2937;
                    background: #f8fafc;
                    font-size: 12px;
                    line-height: 1.6;
                }

                .report-container {
                    max-width: 1000px;
                    margin: 0 auto;
                    background: #fff;
                    border-radius: 16px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.08);
                    overflow: hidden;
                }

                .print-header {
                    background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
                    color: #fff;
                    padding: 40px;
                    text-align: center;
                    position: relative;
                }

                .print-header::after {
                    content: '';
                    position: absolute;
                    bottom: -30px;
                    left: 0;
                    right: 0;
                    height: 60px;
                    background: #fff;
                    border-radius: 50% 50% 0 0;
                }

                .print-header h1 {
                    margin: 0 0 8px 0;
                    font-size: 24px;
                    font-weight: 800;
                    position: relative;
                    z-index: 1;
                }

                .print-header .subtitle {
                    opacity: 0.85;
                    font-size: 13px;
                    position: relative;
                    z-index: 1;
                }

                .report-body {
                    padding: 40px;
                    padding-top: 20px;
                }

                .info-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 10px;
                    margin-bottom: 20px;
                    background: #f0fdfa;
                    padding: 16px;
                    border-radius: 12px;
                    border: 1px solid #ccfbf1;
                }

                .info-item {
                    display: flex;
                    flex-direction: column;
                }

                .info-item label {
                    font-size: 11px;
                    color: #6b7280;
                    margin-bottom: 4px;
                }

                .info-item strong {
                    font-size: 14px;
                    color: #111827;
                }

                .summary-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 12px;
                    margin: 20px 0;
                }

                .summary-card {
                    background: #f9fafb;
                    border: 1px solid #e5e7eb;
                    border-radius: 12px;
                    padding: 16px;
                    text-align: center;
                }

                .summary-card.highlight {
                    background: #ecfdf5;
                    border-color: #a7f3d0;
                }

                .summary-card.warning {
                    background: #fffbeb;
                    border-color: #fde68a;
                }

                .summary-card.danger {
                    background: #fef2f2;
                    border-color: #fecaca;
                }

                .summary-card label {
                    display: block;
                    font-size: 11px;
                    color: #6b7280;
                    margin-bottom: 6px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .summary-card strong {
                    display: block;
                    font-size: 18px;
                    color: #111827;
                    font-weight: 800;
                }

                h2 {
                    font-size: 14px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    color: #0f766e;
                    margin: 25px 0 12px 0;
                    padding-bottom: 8px;
                    border-bottom: 2px solid #e5e7eb;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .print-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20px;
                    font-size: 11px;
                }

                .print-table th {
                    background: #0f172a;
                    color: #fff;
                    font-weight: 600;
                    padding: 10px;
                    text-align: right;
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .print-table td {
                    padding: 10px;
                    border-bottom: 1px solid #f1f5f9;
                    vertical-align: middle;
                }

                .print-table tbody tr:nth-child(even) {
                    background: #f8fafc;
                }

                .month-section {
                    margin-bottom: 20px;
                    page-break-inside: avoid;
                }

                .month-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: #f1f5f9;
                    padding: 10px 14px;
                    border-radius: 8px 8px 0 0;
                    border: 1px solid #e2e8f0;
                    border-bottom: none;
                    font-size: 12px;
                }

                .month-header strong {
                    color: #111827;
                }

                .month-header span {
                    color: #059669;
                    font-weight: 700;
                }

                .month-section .print-table {
                    margin-bottom: 0;
                    border-radius: 0 0 8px 8px;
                }

                .month-section .print-table th {
                    background: #f1f5f9;
                    color: #475569;
                }

                .no-data {
                    text-align: center;
                    color: #94a3b8;
                    padding: 30px;
                    font-style: italic;
                    background: #f8fafc;
                    border-radius: 12px;
                    border: 1px dashed #e2e8f0;
                }

                .print-footer {
                    margin-top: 30px;
                    padding: 20px 40px;
                    border-top: 2px dashed #e2e8f0;
                    text-align: center;
                    color: #94a3b8;
                    font-size: 12px;
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
                    font-family: 'Cairo', sans-serif;
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
                        background: #fff;
                        padding: 20px;
                    }
                    .report-container {
                        box-shadow: none;
                        border-radius: 0;
                    }
                    .print-actions {
                        display: none !important;
                    }
                    .month-section {
                        page-break-inside: avoid;
                    }
                    .print-table {
                        page-break-inside: auto;
                    }
                    .print-table tr {
                        page-break-inside: avoid;
                    }
                }
            </style>
        </head>
        <body>
            <div class="report-container" id="reportCaptureArea">
                <div class="print-header">
                    <h1><i class="fa-solid fa-user-doctor"></i> تقرير الطبيب</h1>
                    <div class="subtitle">تم الطباعة بتاريخ: ${printDate} - الساعة: ${printTime}</div>
                </div>

                <div class="report-body">
                    <div class="info-grid">
                        <div class="info-item">
                            <label>اسم الطبيب</label>
                            <strong>${escapeHTML(doctorName)}</strong>
                        </div>
                        <div class="info-item">
                            <label>التخصص</label>
                            <strong>${escapeHTML(specialization)}</strong>
                        </div>
                        <div class="info-item">
                            <label>العمر</label>
                            <strong>${escapeHTML(age)}</strong>
                        </div>
                        <div class="info-item">
                            <label>رقم الهاتف</label>
                            <strong>${escapeHTML(phone)}</strong>
                        </div>
                        <div class="info-item">
                            <label>العنوان</label>
                            <strong>${escapeHTML(address)}</strong>
                        </div>
                        <div class="info-item">
                            <label>عدد الأعمال</label>
                            <strong>${escapeHTML(totalWorks)}</strong>
                        </div>
                    </div>

                    <div class="summary-grid">
                        <div class="summary-card">
                            <label>إجمالي المستحق</label>
                            <strong>${escapeHTML(totalCost)}</strong>
                        </div>
                        <div class="summary-card highlight">
                            <label>مستحق الطبيب</label>
                            <strong>${escapeHTML(totalProfit)}</strong>
                        </div>
                        <div class="summary-card">
                            <label>إجمالي المدفوع</label>
                            <strong>${escapeHTML(totalPaid)}</strong>
                        </div>
                        <div class="summary-card warning">
                            <label>إجمالي المستحق (من قاعدة البيانات)</label>
                            <strong>${escapeHTML(totalDue)}</strong>
                        </div>
                        <div class="summary-card danger">
                            <label>المتبقي</label>
                            <strong>${escapeHTML(totalRemaining)}</strong>
                        </div>
                    </div>

                    ${servicesHTML}

                    ${paymentsHTML}
                </div>

                <div class="print-footer">
                    <p><i class="fa-solid fa-hospital"></i> نظام إدارة العيادة - تقرير تلقائي</p>
                </div>
            </div>

            <!-- PRINT ACTIONS -->
            <div class="print-actions">
                <button class="btn btn-print" onclick="window.print()">
                    <i class="fa-solid fa-print"></i>
                    طباعة التقرير
                </button>
                ${whatsappBtnHTML}
                <button class="btn btn-close" onclick="window.close()">
                    <i class="fa-solid fa-xmark"></i>
                    إغلاق
                </button>
            </div>

            <!-- CAPTURE SCRIPT - نفس الآلية الموجودة في دالة الفاتورة -->
            <script>
async function captureAndSend(){
    const actions = document.querySelector('.print-actions');
    actions.style.display = 'none';
    await new Promise(r => setTimeout(r, 400));

    try {
        const element = document.getElementById('reportCaptureArea');
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
                window.open('https://wa.me/${doctorPhoneFormatted}', '_blank');
                setTimeout(() => {
                    alert('✅ تم نسخ التقرير!...');
                }, 1500);
            } else {
                throw new Error('Clipboard not supported');
            }
        } catch(e) {
            // تحميل + فتح واتساب
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = 'doctor-report-${doctorId}.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.open('https://wa.me/${doctorPhoneFormatted}', '_blank');
            alert('📥 تم تحميل التقرير...');
        }
    } catch(err) {
        console.error(err);
        actions.style.display = 'flex';
        window.open('https://wa.me/${doctorPhoneFormatted}', '_blank');
    }
}
            </script>
        </body>
        </html>
    `;


    /* =================================================
       OPEN PRINT WINDOW
    ================================================= */

    const printWindow = window.open("", "_blank", "width=1050,height=800");

    if (!printWindow) {
        alert("يرجى السماح بفتح النوافذ المنبثقة لطباعة التقرير");
        return;
    }

    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();

}