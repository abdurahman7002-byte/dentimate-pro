/* =====================================================
   DENTIX PRO
   DOCTORS REPORTS
===================================================== */


/* =====================================================
   CHART INSTANCE
===================================================== */

let doctorsReportChart = null;


/* =====================================================
   LOAD DOCTORS FILTER
===================================================== */

async function loadDoctorsReportFilter(){

    try{

        const userId =
            await getUserId();


        if(!userId){

            console.warn(
                "Doctors report: user not found"
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
                userId
            )

            .order(
                "doctor_name",
                {
                    ascending:true
                }
            );


        if(error){

            console.error(
                "Load doctors filter error:",
                error
            );

            return;

        }


        const select =
            document.getElementById(
                "doctorsReportDoctor"
            );


        if(!select)
            return;


        select.innerHTML = `

            <option value="">
                جميع الأطباء
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
                    doctor.doctor_name;


                select.appendChild(
                    option
                );

            }
        );


    }catch(error){

        console.error(
            "Doctors report filter error:",
            error
        );

    }

}


/* =====================================================
   LOAD DOCTORS REPORT
===================================================== */

async function loadDoctorsReport(){

    try{

        console.log(
            "📊 Loading doctors report..."
        );


        /* =================================================
           GET USER
        ================================================= */

        const userId =
            await getUserId();


        if(!userId){

            console.warn(
                "Doctors report: user not found"
            );

            return;

        }


        /* =================================================
           GET FILTERS
        ================================================= */

        const fromInput =
            document.getElementById(
                "doctorsReportFrom"
            );


        const toInput =
            document.getElementById(
                "doctorsReportTo"
            );


        const doctorInput =
            document.getElementById(
                "doctorsReportDoctor"
            );


        const fromDate =
            fromInput?.value || "";


        const toDate =
            toInput?.value || "";


        const doctorId =
            doctorInput?.value
            ?
            Number(
                doctorInput.value
            )
            :
            null;


        console.log(
            "Doctors report filters:",
            {
                fromDate,
                toDate,
                doctorId
            }
        );


        /* =================================================
           DATE RANGE
        ================================================= */

        let nextDayISO =
            null;


        if(toDate){

            const nextDay =
                new Date(
                    `${toDate}T00:00:00`
                );


            nextDay.setDate(
                nextDay.getDate() + 1
            );


            nextDayISO =
                nextDay.toISOString();

        }


        /* =================================================
           QUERY SERVICES
        ================================================= */

        let serviceQuery =
            supabaseClient

            .from("patientt_services")

            .select(`
                id,
                patient_id,
                visit_id,
                service_name,
                doctor_id,
                doctor_amount,
                total_amount,
                discount_amount,
                paid_amount,
                remain_amount,
                created_at
            `)

            .eq(
                "user_id",
                userId
            );


        /* =================================================
           SERVICE DATE FILTER
        ================================================= */

        if(fromDate){

            serviceQuery =
                serviceQuery.gte(
                    "created_at",
                    `${fromDate}T00:00:00`
                );

        }


        if(nextDayISO){

            serviceQuery =
                serviceQuery.lt(
                    "created_at",
                    nextDayISO
                );

        }


        /* =================================================
           DOCTOR FILTER
        ================================================= */

        if(doctorId){

            serviceQuery =
                serviceQuery.eq(
                    "doctor_id",
                    doctorId
                );

        }


        /* =================================================
           EXECUTE SERVICES QUERY
        ================================================= */

        const {
            data:services,
            error:servicesError
        } =
            await serviceQuery;


        if(servicesError){

            console.error(
                "Doctors report services error:",
                servicesError
            );


            alert(
                "حدث خطأ أثناء تحميل خدمات الأطباء:\n" +
                servicesError.message
            );


            return;

        }


        console.log(
            "Doctors report services:",
            services
        );


        /* =================================================
           QUERY DOCTOR PAYMENTS
        ================================================= */

        let paymentQuery =
            supabaseClient

            .from("doctor_payments")

            .select(`
                id,
                doctor_id,
                amount,
                payment_date,
                note
            `)

            .eq(
                "user_id",
                userId
            );


        /* =================================================
           PAYMENT DATE FILTER
        ================================================= */

        if(fromDate){

            paymentQuery =
                paymentQuery.gte(
                    "payment_date",
                    `${fromDate}T00:00:00`
                );

        }


        if(nextDayISO){

            paymentQuery =
                paymentQuery.lt(
                    "payment_date",
                    nextDayISO
                );

        }


        /* =================================================
           PAYMENT DOCTOR FILTER
        ================================================= */

        if(doctorId){

            paymentQuery =
                paymentQuery.eq(
                    "doctor_id",
                    doctorId
                );

        }


        /* =================================================
           EXECUTE PAYMENT QUERY
        ================================================= */

        const {
            data:doctorPayments,
            error:paymentsError
        } =
            await paymentQuery;


        if(paymentsError){

            console.error(
                "Doctors report payments error:",
                paymentsError
            );


            alert(
                "حدث خطأ أثناء تحميل مدفوعات الأطباء:\n" +
                paymentsError.message
            );


            return;

        }


        console.log(
            "Doctors report payments:",
            doctorPayments
        );


        /* =================================================
           PROCESS
        ================================================= */

        await processDoctorsReport(
            services || [],
            doctorPayments || []
        );


    }catch(error){

        console.error(
            "Doctors report fatal error:",
            error
        );


        alert(
            "حدث خطأ أثناء تحميل تقرير الأطباء"
        );

    }

}


/* =====================================================
   PROCESS DOCTORS REPORT
===================================================== */

async function processDoctorsReport(
    services,
    doctorPayments
){

    const doctorMap =
        new Map();


    /* =================================================
       GLOBAL TOTALS
    ================================================= */

    let totalNet =
        0;


    let totalPaid =
        0;


    let totalRemaining =
        0;


    let totalDoctorFees =
        0;


    let totalDoctorPayments =
        0;


    const uniquePatients =
        new Set();


    /* =================================================
       PROCESS SERVICES
    ================================================= */

    services.forEach(
        service => {

            const doctorId =
                Number(
                    service.doctor_id
                );


            /*
            ================================================
            الخدمة بدون طبيب لا تدخل التقرير
            ================================================
            */

            if(!doctorId)
                return;


            /* =================================================
               CREATE DOCTOR
            ================================================= */

            if(!doctorMap.has(doctorId)){

                doctorMap.set(
                    doctorId,
                    {

                        doctor_id:
                            doctorId,

                        services:
                            0,

                        patients:
                            new Set(),

                        /*
                        المستحق بعد الخصم
                        */

                        net:
                            0,

                        /*
                        المدفوع من المرضى
                        */

                        paid:
                            0,

                        /*
                        المتبقي على المرضى
                        */

                        remaining:
                            0,

                        /*
                        مستحق الطبيب
                        */

                        doctorFees:
                            0,

                        /*
                        مدفوع للطبيب
                        */

                        doctorPaid:
                            0,

                        /*
                        متبقي للطبيب
                        */

                        doctorRemaining:
                            0

                    }
                );

            }


            const doctor =
                doctorMap.get(
                    doctorId
                );


            /* =================================================
               CALCULATE NET
            ================================================= */

            const total =
                Number(
                    service.total_amount || 0
                );


            const discount =
                Number(
                    service.discount_amount || 0
                );


            /*
            المستحق بعد الخصم فقط

            السعر الأصلي والخصم لا يتم عرضهما
            */

            const net =
                Math.max(
                    total -
                    discount,
                    0
                );


            /* =================================================
               PATIENT PAYMENT
            ================================================= */

            const paid =
                Number(
                    service.paid_amount || 0
                );


            /* =================================================
               PATIENT REMAINING
            ================================================= */

            const remaining =
                Number(
                    service.remain_amount || 0
                );


            /* =================================================
               DOCTOR FEE
            ================================================= */

            const doctorAmount =
                Number(
                    service.doctor_amount || 0
                );


            /* =================================================
               DOCTOR
            ================================================= */

            doctor.services++;


            if(service.patient_id){

                doctor.patients.add(
                    service.patient_id
                );


                uniquePatients.add(
                    service.patient_id
                );

            }


            doctor.net +=
                net;


            doctor.paid +=
                paid;


            doctor.remaining +=
                remaining;


            doctor.doctorFees +=
                doctorAmount;


            /* =================================================
               GLOBAL
            ================================================= */

            totalNet +=
                net;


            totalPaid +=
                paid;


            totalRemaining +=
                remaining;


            totalDoctorFees +=
                doctorAmount;

        }
    );


    /* =====================================================
       PROCESS DOCTOR PAYMENTS
    ===================================================== */

    doctorPayments.forEach(
        payment => {

            const doctorId =
                Number(
                    payment.doctor_id
                );


            if(!doctorId)
                return;


            const amount =
                Number(
                    payment.amount || 0
                );


            if(amount <= 0)
                return;


            /*
            إذا كان الطبيب لديه خدمات
            */

            if(!doctorMap.has(doctorId)){

                doctorMap.set(
                    doctorId,
                    {

                        doctor_id:
                            doctorId,

                        services:
                            0,

                        patients:
                            new Set(),

                        net:
                            0,

                        paid:
                            0,

                        remaining:
                            0,

                        doctorFees:
                            0,

                        doctorPaid:
                            0,

                        doctorRemaining:
                            0

                    }
                );

            }


            const doctor =
                doctorMap.get(
                    doctorId
                );


            doctor.doctorPaid +=
                amount;


            totalDoctorPayments +=
                amount;

        }
    );


    /* =====================================================
       CALCULATE DOCTOR REMAINING
    ===================================================== */

    doctorMap.forEach(
        doctor => {

            doctor.doctorRemaining =
                Math.max(
                    doctor.doctorFees -
                    doctor.doctorPaid,
                    0
                );

        }
    );


    /* =====================================================
       GET DOCTOR IDS
    ===================================================== */

    const doctorIds =
        Array.from(
            doctorMap.keys()
        );


    let doctors = [];


    if(doctorIds.length){

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

            .in(
                "id",
                doctorIds
            );


        if(error){

            console.error(
                "Load report doctors error:",
                error
            );

        }else{

            doctors =
                data || [];

        }

    }


    /* =====================================================
       DOCTOR LOOKUP
    ===================================================== */

    const doctorLookup =
        new Map();


    doctors.forEach(
        doctor => {

            doctorLookup.set(
                Number(
                    doctor.id
                ),
                doctor
            );

        }
    );


    /* =====================================================
       BUILD ROWS
    ===================================================== */

    const rows =
        Array.from(
            doctorMap.values()
        ).map(
            doctor => {

                const doctorInfo =
                    doctorLookup.get(
                        doctor.doctor_id
                    );


                return {

                    ...doctor,

                    doctor_name:
                        doctorInfo?.doctor_name
                        ||
                        "طبيب غير معروف",


                    specialization:
                        doctorInfo?.specialization
                        ||
                        ""

                };

            }
        );


    /* =====================================================
       CALCULATE TOTAL DOCTOR REMAINING
    ===================================================== */

    const totalDoctorRemaining =
        rows.reduce(
            (
                sum,
                doctor
            ) =>
                sum +
                doctor.doctorRemaining,
            0
        );


    /* =====================================================
       UPDATE SUMMARY
    ===================================================== */

    setReportValue(
        "doctorsReportDoctors",
        rows.filter(
            doctor =>
                doctor.services > 0
        ).length
    );


    setReportValue(
        "doctorsReportServices",
        services.filter(
            service =>
                Number(
                    service.doctor_id
                ) > 0
        ).length
    );


    setReportValue(
        "doctorsReportPatients",
        uniquePatients.size
    );


    /*
    ================================================
    المستحق بعد الخصم
    ================================================
    */

    setReportMoney(
        "doctorsReportTotal",
        totalNet
    );


    /*
    ================================================
    المدفوع من المرضى
    ================================================
    */

    setReportMoney(
        "doctorsReportPaid",
        totalPaid
    );


    /*
    ================================================
    المتبقي على المرضى
    ================================================
    */

    setReportMoney(
        "doctorsReportRemaining",
        totalRemaining
    );


    /*
    ================================================
    مستحقات الأطباء
    ================================================
    */

    setReportMoney(
        "doctorsReportFees",
        totalDoctorFees
    );


    /*
    ================================================
    مدفوعات الأطباء
    ================================================
    */

    /*
    يجب أن يكون لديك عنصر:

    doctorsReportDoctorPaid
    */

    setReportMoney(
        "doctorsReportDoctorPaid",
        totalDoctorPayments
    );


    /*
    ================================================
    المتبقي للأطباء
    ================================================
    */

    /*
    يجب أن يكون لديك عنصر:

    doctorsReportDoctorRemaining
    */

    setReportMoney(
        "doctorsReportDoctorRemaining",
        totalDoctorRemaining
    );


    /* =================================================
       GET CURRENT FILTERS
    ================================================= */

    const fromDate =
        document.getElementById(
            "doctorsReportFrom"
        )?.value || "";


    const toDate =
        document.getElementById(
            "doctorsReportTo"
        )?.value || "";


    const doctorInput =
        document.getElementById(
            "doctorsReportDoctor"
        );


    const doctorId =
        doctorInput?.value
        ?
        Number(
            doctorInput.value
        )
        :
        null;


    /* =================================================
       DOCTORS MONEY OVERVIEW
    ================================================= */

    await loadDoctorsMoneyOverview(
        totalDoctorFees,
        fromDate,
        toDate,
        doctorId
    );


    /* =================================================
       TABLE
    ================================================= */

    renderDoctorsReportTable(
        rows
    );


    /* =================================================
       CHART
    ================================================= */

    renderDoctorsReportChart(
        rows
    );

}


/* =====================================================
   SET VALUE
===================================================== */

function setReportValue(
    id,
    value
){

    const element =
        document.getElementById(
            id
        );


    if(element){

        element.textContent =
            value ?? 0;

    }

}


/* =====================================================
   SET MONEY
===================================================== */

function setReportMoney(
    id,
    value
){

    const element =
        document.getElementById(
            id
        );


    if(element){

        element.textContent =
            `${Number(
                value || 0
            ).toLocaleString(
                "en-US",
                {
                    minimumFractionDigits:2,
                    maximumFractionDigits:2
                }
            )} EGP`;

    }

}


/* =====================================================
   RENDER DOCTORS TABLE
===================================================== */

function renderDoctorsReportTable(
    rows
){

    const tbody =
        document.getElementById(
            "doctorsReportTable"
        );


    if(!tbody)
        return;


    tbody.innerHTML =
        "";


    if(!rows.length){

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="8"
                    style="
                        text-align:center;
                        padding:30px;
                        color:#94a3b8;
                    "
                >

                    لا توجد بيانات للأطباء
                    خلال الفترة المحددة

                </td>

            </tr>

        `;

        return;

    }


    rows.forEach(
        doctor => {

            tbody.innerHTML += `

                <tr>

                    <!-- =========================
                         DOCTOR
                    ========================== -->

                    <td>

                        <strong>

                            ${escapeDoctorsReportHTML(
                                doctor.doctor_name
                            )}

                        </strong>


                        ${
                            doctor.specialization
                            ?
                            `
                            <small>

                                ${escapeDoctorsReportHTML(
                                    doctor.specialization
                                )}

                            </small>
                            `
                            :
                            ""
                        }

                    </td>


                    <!-- =========================
                         SERVICES
                    ========================== -->

                    <td>

                        ${doctor.services}

                    </td>


                    <!-- =========================
                         PATIENTS
                    ========================== -->

                    <td>

                        ${doctor.patients.size}

                    </td>


                    <!-- =========================
                         NET AFTER DISCOUNT
                    ========================== -->

                    <td>

                        <strong>

                            ${formatDoctorsMoney(
                                doctor.net
                            )}

                        </strong>

                    </td>


                    <!-- =========================
                         PATIENT PAID
                    ========================== -->

                    <td>

                        ${formatDoctorsMoney(
                            doctor.paid
                        )}

                    </td>


                    <!-- =========================
                         PATIENT REMAINING
                    ========================== -->

                    <td>

                        ${formatDoctorsMoney(
                            doctor.remaining
                        )}

                    </td>


                    <!-- =========================
                         DOCTOR FEES
                    ========================== -->

                    <td>

                        <strong>

                            ${formatDoctorsMoney(
                                doctor.doctorFees
                            )}

                        </strong>

                    </td>


                    <!-- =========================
                         DOCTOR PAID
                    ========================== -->

                    <td>

                        ${formatDoctorsMoney(
                            doctor.doctorPaid
                        )}

                    </td>


                    <!-- =========================
                         DOCTOR REMAINING
                    ========================== -->

                    <td>

                        <strong>

                            ${formatDoctorsMoney(
                                doctor.doctorRemaining
                            )}

                        </strong>

                    </td>

                </tr>

            `;

        }
    );

}

/* =====================================================
   DENTIX PRO
   DOCTORS MONEY OVERVIEW
   ===================================================== */

async function loadDoctorsMoneyOverview(
    doctorFees,
    fromDate,
    toDate,
    doctorId
){

    try{

        /* =================================================
           GET USER
        ================================================= */

        const userId =
            await getUserId();


        if(!userId){

            console.warn(
                "Doctors money overview: user not found"
            );

            return;

        }


        /* =================================================
           QUERY DOCTOR PAYMENTS
        ================================================= */

        let paymentQuery =
            supabaseClient

            .from("doctor_payments")

            .select(`
                id,
                doctor_id,
                amount,
                payment_date,
                note
            `)

            .eq(
                "user_id",
                userId
            );


        /* =================================================
           DATE FILTER
           Payment date is used here
        ================================================= */

        if(fromDate){

            paymentQuery =
                paymentQuery.gte(
                    "payment_date",
                    `${fromDate}T00:00:00`
                );

        }


        if(toDate){

            paymentQuery =
                paymentQuery.lt(
                    "payment_date",
                    `${toDate}T23:59:59.999`
                );

        }


        /* =================================================
           DOCTOR FILTER
        ================================================= */

        if(doctorId){

            paymentQuery =
                paymentQuery.eq(
                    "doctor_id",
                    doctorId
                );

        }


        /* =================================================
           EXECUTE
        ================================================= */

        const {
            data:payments,
            error
        } =
            await paymentQuery;


        if(error){

            console.error(
                "Load doctor payments error:",
                error
            );

            return;

        }


        /* =================================================
           CALCULATE PAID
        ================================================= */

        let totalPaid = 0;


        (payments || []).forEach(
            payment => {

                totalPaid +=
                    Number(
                        payment.amount || 0
                    );

            }
        );


        /* =================================================
           CALCULATE REMAINING
        ================================================= */

        const totalFees =
            Number(
                doctorFees || 0
            );


        const remaining =
            Math.max(
                totalFees - totalPaid,
                0
            );


        /* =================================================
           UPDATE OVERVIEW
        ================================================= */

        setReportMoney(
            "doctorsOverviewFees",
            totalFees
        );


        setReportMoney(
            "doctorsOverviewPaid",
            totalPaid
        );


        setReportMoney(
            "doctorsOverviewRemaining",
            remaining
        );


        /* =================================================
           UPDATE SUMMARY
        ================================================= */

        setReportMoney(
            "doctorsReportDoctorPaid",
            totalPaid
        );


        setReportMoney(
            "doctorsReportDoctorRemaining",
            remaining
        );


        console.log(
            "Doctors money overview:",
            {
                totalFees,
                totalPaid,
                remaining,
                payments
            }
        );


        return {

            totalFees,
            totalPaid,
            remaining,
            payments

        };


    }catch(error){

        console.error(
            "Doctors money overview fatal error:",
            error
        );

    }

}

/* =====================================================
   FORMAT MONEY
===================================================== */

function formatDoctorsMoney(
    value
){

    return Number(
        value || 0
    ).toLocaleString(
        "en-US",
        {
            minimumFractionDigits:2,
            maximumFractionDigits:2
        }
    ) + " EGP";

}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeDoctorsReportHTML(
    value
){

    return String(
        value ?? ""
    )
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
   DOCTORS CHART
===================================================== */

function renderDoctorsReportChart(
    rows
){

    const canvas =
        document.getElementById(
            "doctorsReportChart"
        );


    if(!canvas)
        return;


    /* =================================================
       DESTROY OLD CHART
    ================================================= */

    if(doctorsReportChart){

        doctorsReportChart.destroy();

        doctorsReportChart =
            null;

    }


    if(!rows.length)
        return;


    /* =================================================
       CREATE CHART
    ================================================= */

    doctorsReportChart =
        new Chart(
            canvas,
            {

                type:
                    "bar",


                data:{

                    labels:
                        rows.map(
                            doctor =>
                                doctor.doctor_name
                        ),


                    datasets:[{

                        label:
                            "المستحق بعد الخصم",


                        data:
                            rows.map(
                                doctor =>
                                    doctor.net
                            )

                    }]

                },


                options:{

                    responsive:
                        true,


                    maintainAspectRatio:
                        false,


                    plugins:{

                        legend:{

                            display:
                                true

                        }

                    },


                    scales:{

                        y:{

                            beginAtZero:
                                true

                        }

                    }

                }

            }
        );

}


/* =====================================================
   INITIALIZE DOCTORS REPORT
===================================================== */

/* =====================================================
   INITIALIZE DOCTORS REPORT
   LOAD CURRENT MONTH AUTOMATICALLY
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    async function(){

        try{

            /* =================================================
               GET DATE INPUTS
            ================================================= */

            const fromInput =
                document.getElementById(
                    "doctorsReportFrom"
                );


            const toInput =
                document.getElementById(
                    "doctorsReportTo"
                );


            /* =================================================
               CURRENT DATE
            ================================================= */

            const today =
                new Date();


            /* =================================================
               FIRST DAY OF CURRENT MONTH
            ================================================= */

            const firstDay =
                new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    1
                );


            /* =================================================
               FORMAT DATE
            ================================================= */

            const formatDate =
                date => {

                    const year =
                        date.getFullYear();


                    const month =
                        String(
                            date.getMonth() + 1
                        ).padStart(
                            2,
                            "0"
                        );


                    const day =
                        String(
                            date.getDate()
                        ).padStart(
                            2,
                            "0"
                        );


                    return `${year}-${month}-${day}`;

                };


            /* =================================================
               SET DEFAULT FILTER
            ================================================= */

            if(fromInput){

                fromInput.value =
                    formatDate(
                        firstDay
                    );

            }


            if(toInput){

                toInput.value =
                    formatDate(
                        today
                    );

            }


            /* =================================================
               LOAD DOCTORS
            ================================================= */

            await loadDoctorsReportFilter();


            /* =================================================
               DEFAULT = ALL DOCTORS
            ================================================= */

            const doctorInput =
                document.getElementById(
                    "doctorsReportDoctor"
                );


            if(doctorInput){

                doctorInput.value = "";

            }


            /* =================================================
               LOAD REPORT AUTOMATICALLY
            ================================================= */

            await loadDoctorsReport();


            console.log(
                "✅ Doctors report loaded automatically"
            );


        }catch(error){

            console.error(
                "Doctors report initialization error:",
                error
            );

        }

    }
);