// ==========================
// REPORTS.JS
// مسؤول عن صفحة التقارير فقط
// ==========================

// منع تنفيذ الصفحة قبل تحميل العناصر
document.addEventListener('DOMContentLoaded', () => {
    initializeReports();
});

// ==========================
// INITIALIZATION
// ==========================

async function initializeReports() {

    try {

        console.log(
            "🚀 Initializing Reports..."
        );


        /* =====================================================
           SET DEFAULT VISITS DATES FIRST
        ===================================================== */

        const datesReady =
            setDefaultVisitsDates();


        if(!datesReady){

            console.error(
                "❌ Visits statistics date inputs are not available"
            );

        }


        /* =====================================================
           LOAD OTHER REPORTS
        ===================================================== */

        await Promise.all([

            loadDailyDashboard(),

            loadCurrentMonthDashboard(),

            loadMonthlyComparison(),

            loadNetProfit(),

            loadDepartmentsStatistics("today"),

            loadServicesAnalytics(),

            loadAgeStats(),

            loadGenderStatistics(),

            initRemainingTracking(),

            loadFinancialDashboard()

        ]);


        /* =====================================================
           LOAD VISITS STATISTICS
           
           AFTER DATES ARE READY
        ===================================================== */

        if(datesReady){

            await loadVisitsStatistics();

        }


        console.log(
            "✅ Reports page initialized successfully"
        );


    }
    catch(error){

        console.error(
            "❌ Error initializing reports:",
            error
        );

    }

}
/* =====================================================
   SET DEFAULT VISITS STATISTICS DATES
===================================================== */
/* =====================================================
   SET DEFAULT VISITS STATISTICS DATES
===================================================== */

/* =====================================================
   SET DEFAULT VISITS STATISTICS DATES
   CURRENT MONTH: 1 → LAST DAY
===================================================== */

function setDefaultVisitsDates(){

    const fromInput =
        document.getElementById(
            "visitsStatisticsFrom"
        );

    const toInput =
        document.getElementById(
            "visitsStatisticsTo"
        );


    /* =========================
       CHECK ELEMENTS
    ========================= */

    if(!fromInput || !toInput){

        console.warn(
            "⚠️ Visits statistics date inputs not found"
        );

        return false;

    }


    /* =========================
       CURRENT DATE
    ========================= */

    const today =
        new Date();


    const year =
        today.getFullYear();


    const month =
        today.getMonth();


    /* =========================
       FIRST DAY OF MONTH
       1
    ========================= */

    const firstDay =
        new Date(
            year,
            month,
            1
        );


    /* =========================
       LAST DAY OF MONTH
       
       day 0 of next month
       = last day of current month
    ========================= */

    const lastDay =
        new Date(
            year,
            month + 1,
            0
        );


    /* =========================
       FORMAT
    ========================= */

    const formatDate =
        date => {

            const y =
                date.getFullYear();


            const m =
                String(
                    date.getMonth() + 1
                ).padStart(
                    2,
                    "0"
                );


            const d =
                String(
                    date.getDate()
                ).padStart(
                    2,
                    "0"
                );


            return `${y}-${m}-${d}`;

        };


    /* =========================
       SET DEFAULT VALUES
    ========================= */

    fromInput.value =
        formatDate(
            firstDay
        );


    toInput.value =
        formatDate(
            lastDay
        );


    /* =========================
       DEBUG
    ========================= */

    console.log(
        "📅 Visits statistics default range:",
        {
            from:
                fromInput.value,

            to:
                toInput.value
        }
    );


    return true;

}
/* ==========================================
   FINANCIAL DASHBOARD
========================================== */
async function loadFinancialDashboard() {

    const userId =
        await getUserId();


    if (!userId) {

        console.log("No user");

        return;

    }



    /* =====================================================
       TOTAL SERVICES

       total_amount
       = السعر الأصلي قبل الخصم

       discount_amount
       = الخصم الفعلي

       due
       = المستحق بعد الخصم
    ===================================================== */

    const {

        data: services,
        error

    } =
    await supabaseClient

        .from("patientt_services")

        .select(`
            id,
            total_amount,
            discount_amount
        `)

        .eq(
            "user_id",
            userId
        );


    if (error) {

        console.error(
            "❌ Services error:",
            error
        );

        return;

    }



    /* =====================================================
       FINANCIAL TOTALS
    ===================================================== */

    let grossTotal =
        0;


    let totalDiscount =
        0;


    let totalDue =
        0;


    const serviceIds = [];



    /* =====================================================
       CALCULATE SERVICES
    ===================================================== */

    (services || []).forEach(item => {


        /* =================================================
           ORIGINAL PRICE
        ================================================= */

        const total =
            Math.max(
                Number(
                    item.total_amount || 0
                ),
                0
            );



        /* =================================================
           DISCOUNT

           discount_amount هو القيمة المالية
           الفعلية للخصم.
        ================================================= */

        let discount =
            Number(
                item.discount_amount || 0
            );


        if (!Number.isFinite(discount)) {

            discount = 0;

        }


        /*
         * منع الخصم من أن يتجاوز قيمة الخدمة
         */

        discount =
            Math.min(
                Math.max(
                    discount,
                    0
                ),
                total
            );



        /* =================================================
           DUE AFTER DISCOUNT

           المستحق الحقيقي
        ================================================= */

        const due =
            Math.max(
                total - discount,
                0
            );



        /* =================================================
           TOTALS
        ================================================= */

        grossTotal +=
            total;


        totalDiscount +=
            discount;


        totalDue +=
            due;



        /* =================================================
           SERVICE IDS
        ================================================= */

        serviceIds.push(
            item.id
        );



        /* =================================================
           DEBUG
        ================================================= */

        console.log(
            "💰 SERVICE",
            {

                id:
                    item.id,

                originalTotal:
                    total,

                discount:
                    discount,

                dueAfterDiscount:
                    due

            }
        );

    });



    /* =====================================================
       TOTAL PATIENT PAYMENTS
       ALL TIME

       المدفوع الحقيقي من المرضى فقط.

       الخصم لا يعتبر دفعة.
    ===================================================== */

    let paid =
        0;


    if (serviceIds.length) {

        const {

            data: payments,
            error: paymentError

        } =
        await supabaseClient

            .from(
                "patient_service_payments"
            )

            .select(`
                id,
                amount,
                service_id
            `)

            .in(
                "service_id",
                serviceIds
            );


        if (paymentError) {

            console.error(
                "❌ Payments error:",
                paymentError
            );

        }

        else {

            (payments || []).forEach(item => {

                const amount =
                    Math.max(
                        Number(
                            item.amount || 0
                        ),
                        0
                    );


                paid +=
                    amount;

            });

        }

    }



    /* =====================================================
       INSURANCE PAYMENTS
       ALL TIME

       دفعات جهات التأمين = إيراد موجب.

       لا تدخل في remaining الخاص بالمرضى.
    ===================================================== */

    const {

        data: insurancePayments,
        error: insurancePaymentsError

    } =
    await supabaseClient

        .from(
            "insurance_payments"
        )

        .select(`
            id,
            amount,
            insurance_id,
            payment_date
        `)

        .eq(
            "user_id",
            userId
        );


    if (insurancePaymentsError) {

        console.error(
            "❌ Insurance payments error:",
            insurancePaymentsError
        );

    }



    let insurancePaymentsTotal =
        0;


    (insurancePayments || []).forEach(
        payment => {

            const amount =
                Math.max(
                    Number(
                        payment.amount || 0
                    ),
                    0
                );


            insurancePaymentsTotal +=
                amount;

        }
    );



    /* =====================================================
       REMAINING

       المستحق بعد الخصم
       -
       المدفوع من المرضى

       مهم:

       دفعات التأمينات لا تدخل هنا.
       لأنها تحصيل من جهة التأمين وليست
       دفعة مباشرة من المريض.
    ===================================================== */

    const remaining =
        Math.max(
            totalDue -
            paid,
            0
        );



    /* =====================================================
       UPDATE TOTALS UI
    ===================================================== */

    const dashboardTotal =
        document.getElementById(
            "dashboardTotal"
        );


    const dashboardPaid =
        document.getElementById(
            "dashboardPaid"
        );


    const dashboardRemaining =
        document.getElementById(
            "dashboardRemaining"
        );



    /* =====================================================
       TOTAL / DUE

       المستحق بعد الخصم
    ===================================================== */

    if (dashboardTotal) {

        dashboardTotal.innerText =
            totalDue.toFixed(2)
            +
            " EGP";

    }



    /* =====================================================
       PAID

       مدفوعات المرضى فقط
    ===================================================== */

    if (dashboardPaid) {

        dashboardPaid.innerText =
            paid.toFixed(2)
            +
            " EGP";

    }



    /* =====================================================
       REMAINING

       المتبقي من مستحقات المرضى
    ===================================================== */

    if (dashboardRemaining) {

        dashboardRemaining.innerText =
            remaining.toFixed(2)
            +
            " EGP";

    }



    /* =====================================================
       OPTIONAL DISCOUNT

       إذا كان عندك عنصر:
       dashboardDiscount
    ===================================================== */

    const dashboardDiscount =
        document.getElementById(
            "dashboardDiscount"
        );


    if (dashboardDiscount) {

        dashboardDiscount.innerText =
            totalDiscount.toFixed(2)
            +
            " EGP";

    }



    /* =====================================================
       OPTIONAL GROSS TOTAL

       إذا كان عندك عنصر:
       dashboardGrossTotal

       يعرض السعر قبل الخصم.
    ===================================================== */

    const dashboardGrossTotal =
        document.getElementById(
            "dashboardGrossTotal"
        );


    if (dashboardGrossTotal) {

        dashboardGrossTotal.innerText =
            grossTotal.toFixed(2)
            +
            " EGP";

    }



    /* =====================================================
       OPTIONAL NET TOTAL

       إذا كان عندك عنصر:
       dashboardNetTotal

       نفس المستحق بعد الخصم.
    ===================================================== */

    const dashboardNetTotal =
        document.getElementById(
            "dashboardNetTotal"
        );


    if (dashboardNetTotal) {

        dashboardNetTotal.innerText =
            totalDue.toFixed(2)
            +
            " EGP";

    }



    /* =====================================================
       LAB COST
       ALL TIME
    ===================================================== */

    const {

        data: labWorks,
        error: labError

    } =
    await supabaseClient

        .from("lab_works")

        .select("lab_cost")

        .eq(
            "user_id",
            userId
        );


    if (labError) {

        console.error(
            "❌ Lab cost error:",
            labError
        );

    }


    let labTotal =
        0;


    (labWorks || []).forEach(item => {

        labTotal +=
            Math.max(
                Number(
                    item.lab_cost || 0
                ),
                0
            );

    });



    /* =====================================================
       BILLS
       ALL TIME
    ===================================================== */

    const {

        data: bills,
        error: billsError

    } =
    await supabaseClient

        .from("bills")

        .select("amount")

        .eq(
            "user_id",
            userId
        );


    if (billsError) {

        console.error(
            "❌ Bills error:",
            billsError
        );

    }


    let billsTotal =
        0;


    (bills || []).forEach(item => {

        billsTotal +=
            Math.max(
                Number(
                    item.amount || 0
                ),
                0
            );

    });



    /* =====================================================
       PURCHASE INVOICE PAYMENTS
       ALL TIME

       المبالغ المدفوعة فعليًا للموردين.
    ===================================================== */

    const {

        data: purchasePayments,
        error: purchasePaymentsError

    } =
    await supabaseClient

        .from(
            "purchase_invoice_payments"
        )

        .select(
            "amount"
        )

        .eq(
            "user_id",
            userId
        );


    if (purchasePaymentsError) {

        console.error(
            "❌ Purchase invoice payments error:",
            purchasePaymentsError
        );

    }


    let inventoryTotal =
        0;


    (purchasePayments || []).forEach(
        payment => {

            inventoryTotal +=
                Math.max(
                    Number(
                        payment.amount || 0
                    ),
                    0
                );

        }
    );



    /* =====================================================
       TOTAL INCOME

       الإيرادات الكلية:

       مدفوعات المرضى
       +
       دفعات التأمينات
    ===================================================== */

    const totalIncome =
        paid +
        insurancePaymentsTotal;



    /* =====================================================
       NET PROFIT

       Revenue
       =
       Patient Payments
       +
       Insurance Payments

       Expenses
       =
       Lab
       + Bills
       + Material Purchase Payments

       Net Profit
       =
       Total Income
       - Expenses
    ===================================================== */

    const netProfit =

        totalIncome

        -
        labTotal

        -
        billsTotal

        -
        inventoryTotal;



    /* =====================================================
       UPDATE NET PROFIT
    ===================================================== */

    const dashboardNetProfit =
        document.getElementById(
            "dashboardNetProfit"
        );


    if (dashboardNetProfit) {

        dashboardNetProfit.innerText =
            netProfit.toFixed(2)
            +
            " EGP";


        const profitCard =
            document.getElementById(
                "dashboardNetProfitCard"
            );


        if (profitCard) {

            if (netProfit < 0) {

                profitCard.classList.add(
                    "profit-loss"
                );

            }
            else {

                profitCard.classList.remove(
                    "profit-loss"
                );

            }

        }

    }



    /* =====================================================
       PROFIT TRACKING DETAILS
    ===================================================== */

    const profitPaid =
        document.getElementById(
            "dashboardProfitPaid"
        );


    const profitInsurance =
        document.getElementById(
            "dashboardProfitInsurance"
        );


    const profitLab =
        document.getElementById(
            "dashboardProfitLab"
        );


    const profitBills =
        document.getElementById(
            "dashboardProfitBills"
        );


    const profitInventory =
        document.getElementById(
            "dashboardProfitInventory"
        );


    const profitNet =
        document.getElementById(
            "dashboardProfitNet"
        );



    /* =====================================================
       PATIENT PAYMENTS
    ===================================================== */

    if (profitPaid) {

        profitPaid.innerText =
            paid.toFixed(2)
            +
            " EGP";

    }



    /* =====================================================
       INSURANCE PAYMENTS
    ===================================================== */

    if (profitInsurance) {

        profitInsurance.innerText =
            insurancePaymentsTotal.toFixed(2)
            +
            " EGP";

    }



    /* =====================================================
       LAB
    ===================================================== */

    if (profitLab) {

        profitLab.innerText =
            labTotal.toFixed(2)
            +
            " EGP";

    }



    /* =====================================================
       BILLS
    ===================================================== */

    if (profitBills) {

        profitBills.innerText =
            billsTotal.toFixed(2)
            +
            " EGP";

    }



    /* =====================================================
       INVENTORY
    ===================================================== */

    if (profitInventory) {

        profitInventory.innerText =
            inventoryTotal.toFixed(2)
            +
            " EGP";

    }



    /* =====================================================
       NET PROFIT
    ===================================================== */

    if (profitNet) {

        profitNet.innerText =
            netProfit.toFixed(2)
            +
            " EGP";

    }



    /* =====================================================
       FINAL DEBUG
    ===================================================== */

    console.log(
        "📊 FINANCIAL DASHBOARD",
        {

            servicesCount:
                services?.length || 0,

            grossTotal:
                grossTotal,

            totalDiscount:
                totalDiscount,

            dueAfterDiscount:
                totalDue,

            paid:
                paid,

            insurancePayments:
                insurancePaymentsTotal,

            totalIncome:
                totalIncome,

            remainingFromDue:
                remaining,

            labTotal:
                labTotal,

            billsTotal:
                billsTotal,

            inventoryTotal:
                inventoryTotal,

            netProfit:
                netProfit

        }
    );

}



/* =========================================================
   START
========================================================= */

window.addEventListener(
    "DOMContentLoaded",
    () => {

        loadFinancialDashboard();

    }
);



/* =========================================================
   AUTO REFRESH
========================================================= */

setInterval(
    () => {

        loadFinancialDashboard();

    },
    5000
);
// ==========================
// DAILY REPORT
// ==========================
async function loadDailyDashboard() {

    const currentUserId =
        await getUserId();

    if (!currentUserId) {
        console.log("No user");
        return;
    }


    if (
        typeof resetRemainingTrackingCache === "function"
    ) {
        resetRemainingTrackingCache();
    }


    /* =====================================================
       TODAY RANGE (UTC SAFE)
    ===================================================== */

    const now =
        new Date();

    const todayStart =
        new Date(
            Date.UTC(
                now.getUTCFullYear(),
                now.getUTCMonth(),
                now.getUTCDate(),
                0,
                0,
                0
            )
        );

    const tomorrowStart =
        new Date(
            Date.UTC(
                now.getUTCFullYear(),
                now.getUTCMonth(),
                now.getUTCDate() + 1,
                0,
                0,
                0
            )
        );

    const from =
        todayStart.toISOString();

    const to =
        tomorrowStart.toISOString();


    /* =====================================================
       SERVICES CREATED TODAY
    ===================================================== */

    const {
        data: services,
        error: servicesError
    } =
        await supabaseClient
            .from("patientt_services")
            .select(`
                id,
                total_amount,
                discount_amount,
                paid_amount,
                remain_amount,
                is_completed
            `)
            .eq(
                "user_id",
                currentUserId
            )
            .gte(
                "created_at",
                from
            )
            .lt(
                "created_at",
                to
            );


    if (servicesError) {

        console.error(
            "❌ Services error:",
            servicesError
        );

        return;
    }


    /* =====================================================
       FINANCIAL TOTALS
    ===================================================== */

    let total = 0;

    let discount = 0;

    let remain = 0;

    let servicesCount = 0;


    /* =====================================================
       SERVICE COMPLETION COUNTS
    ===================================================== */

    let completedServicesCount = 0;

    let incompleteServicesCount = 0;


    /* =====================================================
       CALCULATE SERVICES
    ===================================================== */

    (services || []).forEach(
        service => {

            /* =============================================
               ORIGINAL PRICE
            ============================================= */

            const originalTotal =
                Math.max(
                    Number(
                        service.total_amount || 0
                    ),
                    0
                );


            /* =============================================
               DISCOUNT
            ============================================= */

            let serviceDiscount =
                Number(
                    service.discount_amount || 0
                );


            if (
                !Number.isFinite(
                    serviceDiscount
                )
            ) {

                serviceDiscount = 0;

            }


            serviceDiscount =
                Math.min(
                    Math.max(
                        serviceDiscount,
                        0
                    ),
                    originalTotal
                );


            /* =============================================
               DUE AFTER DISCOUNT
            ============================================= */

            const serviceDue =
                Math.max(
                    originalTotal -
                    serviceDiscount,
                    0
                );


            /* =============================================
               REMAINING
            ============================================= */

            const serviceRemain =
                Math.max(
                    Number(
                        service.remain_amount || 0
                    ),
                    0
                );


            /* =============================================
               TOTAL DUE
            ============================================= */

            total +=
                serviceDue;


            /* =============================================
               TOTAL DISCOUNT
            ============================================= */

            discount +=
                serviceDiscount;


            /* =============================================
               TOTAL REMAINING
            ============================================= */

            remain +=
                serviceRemain;


            /* =============================================
               SERVICE COMPLETION
            ============================================= */

            if (
                service.is_completed === true
            ) {

                completedServicesCount++;

            } else {

                incompleteServicesCount++;

            }


            /* =============================================
               SERVICES COUNT
            ============================================= */

            servicesCount++;


            /* =============================================
               DEBUG
            ============================================= */

            console.log(
                "💰 DAILY SERVICE",
                {
                    id:
                        service.id,

                    originalTotal:
                        originalTotal,

                    discount:
                        serviceDiscount,

                    dueAfterDiscount:
                        serviceDue,

                    paid:
                        service.paid_amount,

                    remain:
                        serviceRemain,

                    isCompleted:
                        service.is_completed
                }
            );

        }
    );


    /* =====================================================
       SERVICES COMPLETION PERCENTAGE
       
       النسبة =
       الخدمات المكتملة ÷ إجمالي الخدمات × 100
    ===================================================== */

    let servicesCompletionPercentage = 0;


    if (servicesCount > 0) {

        servicesCompletionPercentage =
            (
                completedServicesCount /
                servicesCount
            ) * 100;

    }


    /* حماية إضافية */
    servicesCompletionPercentage =
        Math.min(
            Math.max(
                servicesCompletionPercentage,
                0
            ),
            100
        );


    /* رقم صحيح بدون كسور */
    const roundedCompletionPercentage =
        Math.round(
            servicesCompletionPercentage
        );


    console.log(
        "📈 DAILY SERVICES COMPLETION",
        {
            totalServices:
                servicesCount,

            completedServices:
                completedServicesCount,

            incompleteServices:
                incompleteServicesCount,

            completionPercentage:
                roundedCompletionPercentage
        }
    );


    /* =====================================================
       ALL PAYMENTS MADE TODAY
    ===================================================== */

    const {
        data: payments,
        error: paymentsError
    } =
        await supabaseClient
            .from(
                "patient_service_payments"
            )
            .select(`
                id,
                amount,
                service_id,
                payment_date
            `)
            .eq(
                "user_id",
                currentUserId
            )
            .gte(
                "payment_date",
                from
            )
            .lt(
                "payment_date",
                to
            );


    if (paymentsError) {

        console.error(
            "❌ Payments error:",
            paymentsError
        );

    }


    let paid = 0;


    (payments || []).forEach(
        payment => {

            const amount =
                Math.max(
                    Number(
                        payment.amount || 0
                    ),
                    0
                );

            paid +=
                amount;

        }
    );


    /* =====================================================
       LAB COST TODAY
    ===================================================== */

    const {
        data: labWorks,
        error: labError
    } =
        await supabaseClient
            .from("lab_works")
            .select(
                "lab_cost"
            )
            .eq(
                "user_id",
                currentUserId
            )
            .gte(
                "created_at",
                from
            )
            .lt(
                "created_at",
                to
            );


    if (labError) {

        console.error(
            "❌ Lab cost error:",
            labError
        );

    }


    let labCost = 0;


    (labWorks || []).forEach(
        item => {

            labCost +=
                Math.max(
                    Number(
                        item.lab_cost || 0
                    ),
                    0
                );

        }
    );


    /* =====================================================
       NEW PATIENTS TODAY
    ===================================================== */

    const {
        data: patients,
        error: patientsError
    } =
        await supabaseClient
            .from("patients")
            .select(
                "id"
            )
            .eq(
                "user_id",
                currentUserId
            )
            .gte(
                "created_at",
                from
            )
            .lt(
                "created_at",
                to
            );


    if (patientsError) {

        console.error(
            "❌ Patients error:",
            patientsError
        );

    }


    /* =====================================================
       PROFIT TODAY
    ===================================================== */

    const profit =
        paid -
        labCost;


    /* =====================================================
       PROFIT TRACKING DATA
    ===================================================== */

    const dailyProfitPaid =
        document.getElementById(
            "todayProfitPaid"
        );

    const dailyProfitLab =
        document.getElementById(
            "todayProfitLab"
        );

    const dailyProfitNet =
        document.getElementById(
            "todayProfitNet"
        );


    if (dailyProfitPaid) {

        dailyProfitPaid.innerText =
            paid.toFixed(2) +
            " EGP";

    }


    if (dailyProfitLab) {

        dailyProfitLab.innerText =
            labCost.toFixed(2) +
            " EGP";

    }


    if (dailyProfitNet) {

        dailyProfitNet.innerText =
            profit.toFixed(2) +
            " EGP";

    }


    /* =====================================================
       DAILY TOTAL
    ===================================================== */

    const dailyTotal =
        document.getElementById(
            "dailyTotal"
        );


    if (dailyTotal) {

        dailyTotal.innerText =
            total.toFixed(2) +
            " EGP";

    }


    /* =====================================================
       DAILY DISCOUNT
    ===================================================== */

    const dailyDiscount =
        document.getElementById(
            "dailyDiscount"
        );


    if (dailyDiscount) {

        dailyDiscount.innerText =
            discount.toFixed(2) +
            " EGP";

    }


    /* =====================================================
       DAILY PAID
    ===================================================== */

    const dailyPaid =
        document.getElementById(
            "dailyPaid"
        );


    if (dailyPaid) {

        dailyPaid.innerText =
            paid.toFixed(2) +
            " EGP";

    }


    /* =====================================================
       DAILY REMAIN
    ===================================================== */

    const dailyRemain =
        document.getElementById(
            "dailyRemain"
        );


    if (dailyRemain) {

        dailyRemain.innerText =
            remain.toFixed(2) +
            " EGP";

    }


    /* =====================================================
       SERVICES CARD
    ===================================================== */

    const dailyServices =
        document.getElementById(
            "dailyServices"
        );


    /* =====================================================
       IMPORTANT:
       HTML يستخدم todayServicesCard
       وليس dailyServicesCard
    ===================================================== */

    const dailyServicesCard =
        document.getElementById(
            "todayServicesCard"
        );


    /* =====================================================
       MAIN SERVICES NUMBER
    ===================================================== */

    if (dailyServices) {

        dailyServices.innerText =
            servicesCount;

    }


    /* =====================================================
       COMPLETED SERVICES
    ===================================================== */

    const todayCompletedServices =
        document.getElementById(
            "todayCompletedServices"
        );


    if (todayCompletedServices) {

        todayCompletedServices.innerText =
            completedServicesCount;

    }


    /* =====================================================
       INCOMPLETE SERVICES
    ===================================================== */

    const todayIncompleteServices =
        document.getElementById(
            "todayIncompleteServices"
        );


    if (todayIncompleteServices) {

        todayIncompleteServices.innerText =
            incompleteServicesCount;

    }


    /* =====================================================
       TOTAL SERVICES
    ===================================================== */

    const todayTotalServices =
        document.getElementById(
            "todayTotalServices"
        );


    if (todayTotalServices) {

        todayTotalServices.innerText =
            servicesCount;

    }


    /* =====================================================
       COMPLETION PERCENTAGE
       
       HTML:
       id="todayServicesCompletionPercentage"
    ===================================================== */

    const todayServicesCompletionPercentage =
        document.getElementById(
            "todayServicesCompletionPercentage"
        );


    if (
        todayServicesCompletionPercentage
    ) {

        todayServicesCompletionPercentage.innerText =
            roundedCompletionPercentage +
            "%";

    }


    /* =====================================================
       PROGRESS BAR
       
       HTML:
       id="todayServicesProgress"
    ===================================================== */

    const todayServicesProgress =
        document.getElementById(
            "todayServicesProgress"
        );


    if (todayServicesProgress) {

        todayServicesProgress.style.width =
            roundedCompletionPercentage +
            "%";

        /* للتأكد أن الشريط لا يتجاوز الحدود */
        todayServicesProgress.style.maxWidth =
            "100%";

    }


    /* =====================================================
       STORE PERCENTAGE ON CARD
       اختياري ولكنه مفيد للـ CSS
    ===================================================== */

    if (dailyServicesCard) {

        dailyServicesCard.dataset.completion =
            roundedCompletionPercentage;

        dailyServicesCard.classList.add(
            "has-services-tooltip"
        );

    }


    /* =====================================================
       PATIENTS COUNT
    ===================================================== */

    const dailyPatients =
        document.getElementById(
            "dailyPatients"
        );


    if (dailyPatients) {

        dailyPatients.innerText =
            patients?.length || 0;

    }


    /* =====================================================
       DAILY PROFIT
    ===================================================== */

    const dailyProfit =
        document.getElementById(
            "dailyProfit"
        );


    if (dailyProfit) {

        dailyProfit.innerText =
            profit.toFixed(2) +
            " EGP";

    }


    /* =====================================================
       FINAL DEBUG
    ===================================================== */

    console.log(
        "📊 DAILY DASHBOARD",
        {

            servicesCount:
                services?.length || 0,

            completedServices:
                completedServicesCount,

            incompleteServices:
                incompleteServicesCount,

            completionPercentage:
                roundedCompletionPercentage + "%",

            originalTotal:
                (services || []).reduce(
                    (
                        sum,
                        service
                    ) =>
                        sum +
                        Math.max(
                            Number(
                                service.total_amount || 0
                            ),
                            0
                        ),
                    0
                ),

            discount:
                discount,

            dueAfterDiscount:
                total,

            paidToday:
                paid,

            remainingAfterDiscount:
                remain,

            labCost:
                labCost,

            profit:
                profit

        }
    );
}


/* =========================================================
   START
========================================================= */

window.addEventListener(
    "load",
    () => {

        loadDailyDashboard();

    }
);
// ==========================
// MONTHLY REPORT
// ==========================
// =========================================================
// MONTHLY REPORT
// =========================================================
async function loadCurrentMonthDashboard() {

    const currentUserId =
        await getUserId();

    if (!currentUserId) {
        console.log("No user");
        return;
    }


    if (
        typeof resetRemainingTrackingCache === "function"
    ) {
        resetRemainingTrackingCache();
    }


    /* =====================================================
       MONTH RANGE
    ===================================================== */

    const now =
        new Date();


    const startOfMonth =
        new Date(
            Date.UTC(
                now.getUTCFullYear(),
                now.getUTCMonth(),
                1,
                0,
                0,
                0
            )
        );


    const startOfNextMonth =
        new Date(
            Date.UTC(
                now.getUTCFullYear(),
                now.getUTCMonth() + 1,
                1,
                0,
                0,
                0
            )
        );


    const from =
        startOfMonth.toISOString();

    const to =
        startOfNextMonth.toISOString();


    /* =====================================================
       SERVICES CREATED THIS MONTH

       total_amount
       = السعر الأصلي

       discount_amount
       = قيمة الخصم الفعلية

       is_completed
       = حالة إكمال الخدمة
    ===================================================== */

    const {
        data: services,
        error: servicesError
    } =
        await supabaseClient
            .from("patientt_services")
            .select(`
                id,
                total_amount,
                discount_amount,
                paid_amount,
                remain_amount,
                is_completed
            `)
            .eq(
                "user_id",
                currentUserId
            )
            .gte(
                "created_at",
                from
            )
            .lt(
                "created_at",
                to
            );


    if (servicesError) {
        console.error(
            "❌ Services error:",
            servicesError
        );
        return;
    }


    /* =====================================================
       SERVICE TOTALS
    ===================================================== */

    let grossTotal =
        0;

    let totalDiscount =
        0;

    let totalDue =
        0;

    let servicesCount =
        0;


    /* =====================================================
       SERVICE COMPLETION COUNTS
    ===================================================== */

    let completedServicesCount =
        0;

    let incompleteServicesCount =
        0;


    /* =====================================================
       CALCULATE SERVICES
    ===================================================== */

    (services || []).forEach(
        service => {

            /* =============================================
               ORIGINAL PRICE
            ============================================= */

            const total =
                Math.max(
                    Number(
                        service?.total_amount || 0
                    ),
                    0
                );


            /* =============================================
               DISCOUNT
            ============================================= */

            let discount =
                Number(
                    service?.discount_amount || 0
                );


            if (
                !Number.isFinite(
                    discount
                )
            ) {
                discount = 0;
            }


            discount =
                Math.min(
                    Math.max(
                        discount,
                        0
                    ),
                    total
                );


            /* =============================================
               DUE AFTER DISCOUNT
            ============================================= */

            const serviceDue =
                Math.max(
                    total - discount,
                    0
                );


            /* =============================================
               TOTALS
            ============================================= */

            grossTotal +=
                total;


            totalDiscount +=
                discount;


            totalDue +=
                serviceDue;


            servicesCount++;


            /* =============================================
               SERVICE COMPLETION
            ============================================= */

            if (
                service?.is_completed === true
            ) {
                completedServicesCount++;
            } else {
                incompleteServicesCount++;
            }


            /* =============================================
               DEBUG
            ============================================= */

            console.log(
                "💰 MONTHLY SERVICE",
                {
                    id:
                        service?.id,

                    originalTotal:
                        total,

                    discount:
                        discount,

                    dueAfterDiscount:
                        serviceDue,

                    paid:
                        service?.paid_amount,

                    remain:
                        service?.remain_amount,

                    isCompleted:
                        service?.is_completed
                }
            );
        }
    );


    /* =====================================================
       MONTHLY SERVICES COMPLETION PERCENTAGE

       مثال:
       إجمالي الخدمات = 10
       مكتملة = 7
       النسبة = 70%
    ===================================================== */

    let monthlyCompletionPercentage =
        0;


    if (
        servicesCount > 0
    ) {
        monthlyCompletionPercentage =
            Math.round(
                (
                    completedServicesCount /
                    servicesCount
                ) * 100
            );
    }


    /* =====================================================
       ALL PATIENT PAYMENTS THIS MONTH
    ===================================================== */

    const {
        data: payments,
        error: paymentsError
    } =
        await supabaseClient
            .from(
                "patient_service_payments"
            )
            .select(`
                id,
                amount,
                service_id,
                payment_date
            `)
            .eq(
                "user_id",
                currentUserId
            )
            .gte(
                "payment_date",
                from
            )
            .lt(
                "payment_date",
                to
            );


    if (paymentsError) {
        console.error(
            "❌ Payments error:",
            paymentsError
        );
    }


    let paid =
        0;


    (payments || []).forEach(
        payment => {

            const amount =
                Math.max(
                    Number(
                        payment?.amount || 0
                    ),
                    0
                );


            paid +=
                amount;
        }
    );


    /* =====================================================
       INSURANCE PAYMENTS THIS MONTH

       دفعات جهات التأمين = إيراد موجب

       يتم التجميع باستخدام:
       payment_date
    ===================================================== */

    const {
        data: insurancePayments,
        error: insurancePaymentsError
    } =
        await supabaseClient
            .from(
                "insurance_payments"
            )
            .select(`
                id,
                amount,
                insurance_id,
                payment_date
            `)
            .eq(
                "user_id",
                currentUserId
            )
            .gte(
                "payment_date",
                from.substring(0, 10)
            )
            .lt(
                "payment_date",
                to.substring(0, 10)
            );


    if (insurancePaymentsError) {
        console.error(
            "❌ Insurance payments error:",
            insurancePaymentsError
        );
    }


    let insurancePaymentsTotal =
        0;


    (insurancePayments || []).forEach(
        payment => {

            const amount =
                Math.max(
                    Number(
                        payment?.amount || 0
                    ),
                    0
                );


            insurancePaymentsTotal +=
                amount;
        }
    );


    /* =====================================================
       REMAINING

       المستحق بعد الخصم
       ناقص المدفوع الفعلي من المرضى

       ملاحظة:
       دفعات التأمينات لا تدخل هنا
       لأنها لا تخص تحصيل المريض نفسه.
    ===================================================== */

    const remaining =
        Math.max(
            totalDue - paid,
            0
        );


    /* =====================================================
       NEW PATIENTS THIS MONTH
    ===================================================== */

    const {
        data: patientsData,
        error: patientsError
    } =
        await supabaseClient
            .from("patients")
            .select("id")
            .eq(
                "user_id",
                currentUserId
            )
            .gte(
                "created_at",
                from
            )
            .lt(
                "created_at",
                to
            );


    if (patientsError) {
        console.error(
            "❌ Patients error:",
            patientsError
        );
    }


    const patientsCount =
        patientsData?.length || 0;


    /* =====================================================
       LAB COST THIS MONTH
    ===================================================== */

    const {
        data: labWorks,
        error: labError
    } =
        await supabaseClient
            .from("lab_works")
            .select("lab_cost")
            .eq(
                "user_id",
                currentUserId
            )
            .gte(
                "created_at",
                from
            )
            .lt(
                "created_at",
                to
            );


    if (labError) {
        console.error(
            "❌ Lab error:",
            labError
        );
    }


    let labCost =
        0;


    (labWorks || []).forEach(
        item => {

            labCost +=
                Math.max(
                    Number(
                        item?.lab_cost || 0
                    ),
                    0
                );
        }
    );


    /* =====================================================
       BILLS THIS MONTH
    ===================================================== */

    const {
        data: bills,
        error: billsError
    } =
        await supabaseClient
            .from("bills")
            .select("amount")
            .eq(
                "user_id",
                currentUserId
            )
            .gte(
                "created_at",
                from
            )
            .lt(
                "created_at",
                to
            );


    if (billsError) {
        console.error(
            "❌ Bills error:",
            billsError
        );
    }


    let billsCost =
        0;


    (bills || []).forEach(
        item => {

            billsCost +=
                Math.max(
                    Number(
                        item?.amount || 0
                    ),
                    0
                );
        }
    );


    /* =====================================================
       MATERIAL PURCHASE PAYMENTS THIS MONTH
    ===================================================== */

    const {
        data: purchasePayments,
        error: purchasePaymentsError
    } =
        await supabaseClient
            .from(
                "purchase_invoice_payments"
            )
            .select(`
                amount,
                payment_date
            `)
            .eq(
                "user_id",
                currentUserId
            )
            .gte(
                "payment_date",
                from.substring(0, 10)
            )
            .lt(
                "payment_date",
                to.substring(0, 10)
            );


    if (purchasePaymentsError) {
        console.error(
            "❌ Purchase payments error:",
            purchasePaymentsError
        );
    }


    let inventoryCost =
        0;


    (purchasePayments || []).forEach(
        payment => {

            inventoryCost +=
                Math.max(
                    Number(
                        payment?.amount || 0
                    ),
                    0
                );
        }
    );


    /* =====================================================
       NET PROFIT

       الإيرادات:
       = المدفوع من المرضى
       + دفعات التأمينات

       المصروفات:
       = المعمل
       + الفواتير
       + المشتريات

       صافي الربح:
       = الإيرادات - المصروفات
    ===================================================== */

    const totalIncome =
        paid +
        insurancePaymentsTotal;


    const netProfit =
        totalIncome
        -
        labCost
        -
        billsCost
        -
        inventoryCost;


    /* =====================================================
       MONTHLY PROFIT TRACKING
    ===================================================== */

    const monthlyProfitPaid =
        document.getElementById(
            "monthlyProfitPaid"
        );


    const monthlyProfitInsurance =
        document.getElementById(
            "monthlyProfitInsurance"
        );


    const monthlyProfitLab =
        document.getElementById(
            "monthlyProfitLab"
        );


    const monthlyProfitBills =
        document.getElementById(
            "monthlyProfitBills"
        );


    const monthlyProfitInventory =
        document.getElementById(
            "monthlyProfitInventory"
        );


    const monthlyProfitNet =
        document.getElementById(
            "monthlyProfitNet"
        );


    if (monthlyProfitPaid) {
        monthlyProfitPaid.innerText =
            paid.toFixed(2) +
            " EGP";
    }


    if (monthlyProfitInsurance) {
        monthlyProfitInsurance.innerText =
            insurancePaymentsTotal.toFixed(2) +
            " EGP";
    }


    if (monthlyProfitLab) {
        monthlyProfitLab.innerText =
            labCost.toFixed(2) +
            " EGP";
    }


    if (monthlyProfitBills) {
        monthlyProfitBills.innerText =
            billsCost.toFixed(2) +
            " EGP";
    }


    if (monthlyProfitInventory) {
        monthlyProfitInventory.innerText =
            inventoryCost.toFixed(2) +
            " EGP";
    }


    if (monthlyProfitNet) {
        monthlyProfitNet.innerText =
            netProfit.toFixed(2) +
            " EGP";
    }


    /* =====================================================
       MAIN DASHBOARD
    ===================================================== */

    const monthTotal =
        document.getElementById(
            "monthTotal"
        );


    if (monthTotal) {
        monthTotal.innerText =
            totalDue.toFixed(2) +
            " EGP";
    }


    /* =====================================================
       GROSS TOTAL
    ===================================================== */

    const monthGrossTotal =
        document.getElementById(
            "monthGrossTotal"
        );


    if (monthGrossTotal) {
        monthGrossTotal.innerText =
            grossTotal.toFixed(2) +
            " EGP";
    }


    /* =====================================================
       DISCOUNT
    ===================================================== */

    const monthDiscount =
        document.getElementById(
            "monthDiscount"
        );


    if (monthDiscount) {
        monthDiscount.innerText =
            totalDiscount.toFixed(2) +
            " EGP";
    }


    /* =====================================================
       NET TOTAL
    ===================================================== */

    const monthNetTotal =
        document.getElementById(
            "monthNetTotal"
        );


    if (monthNetTotal) {
        monthNetTotal.innerText =
            totalDue.toFixed(2) +
            " EGP";
    }


    /* =====================================================
       PAID
    ===================================================== */

    const monthPaid =
        document.getElementById(
            "monthPaid"
        );


    if (monthPaid) {
        monthPaid.innerText =
            paid.toFixed(2) +
            " EGP";
    }


    /* =====================================================
       REMAINING
    ===================================================== */

    const monthRemaining =
        document.getElementById(
            "monthRemaining"
        );


    if (monthRemaining) {
        monthRemaining.innerText =
            remaining.toFixed(2) +
            " EGP";
    }


    /* =====================================================
       MONTHLY SERVICES
       MAIN NUMBER
    ===================================================== */

    const monthPatients =
        document.getElementById(
            "monthPatients"
        );


    if (monthPatients) {
        monthPatients.innerText =
            servicesCount;
    }


    /* =====================================================
       MONTHLY SERVICES
       COMPLETED
    ===================================================== */

    const monthCompletedServices =
        document.getElementById(
            "monthCompletedServices"
        );


    if (monthCompletedServices) {
        monthCompletedServices.innerText =
            completedServicesCount;
    }


    /* =====================================================
       MONTHLY SERVICES
       INCOMPLETE
    ===================================================== */

    const monthIncompleteServices =
        document.getElementById(
            "monthIncompleteServices"
        );


    if (monthIncompleteServices) {
        monthIncompleteServices.innerText =
            incompleteServicesCount;
    }


    /* =====================================================
       MONTHLY SERVICES
       TOTAL
    ===================================================== */

    const monthTotalServices =
        document.getElementById(
            "monthTotalServices"
        );


    if (monthTotalServices) {
        monthTotalServices.innerText =
            servicesCount;
    }


    /* =====================================================
       MONTHLY SERVICES
       COMPLETION PERCENTAGE
    ===================================================== */

    const monthServicesCompletionPercentage =
        document.getElementById(
            "monthServicesCompletionPercentage"
        );


    if (
        monthServicesCompletionPercentage
    ) {
        monthServicesCompletionPercentage.innerText =
            monthlyCompletionPercentage +
            "%";
    }


    /* =====================================================
       MONTHLY SERVICES
       PROGRESS BAR
    ===================================================== */

    const monthServicesProgress =
        document.getElementById(
            "monthServicesProgress"
        );


    if (monthServicesProgress) {
        monthServicesProgress.style.width =
            monthlyCompletionPercentage +
            "%";
    }


    /* =====================================================
       NEW / UNIQUE PATIENTS
    ===================================================== */

    const patientsEl =
        document.getElementById(
            "monthUniquePatients"
        );


    if (patientsEl) {
        patientsEl.innerText =
            patientsCount;
    }


    /* =====================================================
       PROFIT
    ===================================================== */

    const profitEl =
        document.getElementById(
            "monthProfit"
        );


    if (profitEl) {
        profitEl.innerText =
            netProfit.toFixed(2) +
            " EGP";
    }


    /* =====================================================
       FINAL DEBUG
    ===================================================== */

    console.log(
        "📊 CURRENT MONTH DASHBOARD",
        {
            servicesCount:
                servicesCount,

            completedServices:
                completedServicesCount,

            incompleteServices:
                incompleteServicesCount,

            completionPercentage:
                monthlyCompletionPercentage,

            grossTotal:
                grossTotal,

            totalDiscount:
                totalDiscount,

            dueAfterDiscount:
                totalDue,

            paid:
                paid,

            insurancePayments:
                insurancePaymentsTotal,

            totalIncome:
                totalIncome,

            remainingFromDue:
                remaining,

            labCost:
                labCost,

            billsCost:
                billsCost,

            inventoryCost:
                inventoryCost,

            netProfit:
                netProfit
        }
    );
}
// ==========================
// FINANCIAL SUMMARY
// ==========================



// ==========================
// NET PROFIT
// ==========================

// =========================================================
// NET PROFIT
// =========================================================

async function loadNetProfit(){

    const userId =
        await getUserId();


    if(!userId){

        console.error(
            "User not found"
        );

        return;

    }


    /* =====================================================
       DATE FILTER
       DEFAULT = CURRENT MONTH
    ===================================================== */

    const fromElement =
        document.getElementById(
            "profitFrom"
        );


    const toElement =
        document.getElementById(
            "profitTo"
        );


    if(!fromElement || !toElement){

        console.error(
            "profitFrom or profitTo not found"
        );

        return;

    }


    /* =====================================================
       DEFAULT CURRENT MONTH
    ===================================================== */

    const now =
        new Date();


    const currentMonthStart =
        new Date(
            now.getFullYear(),
            now.getMonth(),
            1
        );


    const currentMonthEnd =
        new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0
        );


    /* =====================================================
       SET DEFAULT DATES IF EMPTY
    ===================================================== */

    if(!fromElement.value){

        fromElement.value =
            currentMonthStart
                .toISOString()
                .split("T")[0];

    }


    if(!toElement.value){

        toElement.value =
            currentMonthEnd
                .toISOString()
                .split("T")[0];

    }


    /* =====================================================
       READ DATES
    ===================================================== */

    const fromValue =
        fromElement.value;


    const toValue =
        toElement.value;


    if(!fromValue || !toValue){

        return;

    }


    /* =====================================================
       VALIDATE DATE RANGE
    ===================================================== */

    if(fromValue > toValue){

        if(typeof showToast === "function"){

            showToast(
                "تاريخ البداية يجب أن يكون قبل تاريخ النهاية",
                "error"
            );

        }

        return;

    }


    /* =====================================================
       DATE RANGE
    ===================================================== */

    const fromDate =
        new Date(
            fromValue + "T00:00:00"
        );


    const toDate =
        new Date(
            toValue + "T23:59:59.999"
        );


    const from =
        fromDate.toISOString();


    const to =
        toDate.toISOString();


    /* =====================================================
       READ CHECKBOXES
    ===================================================== */

    const includeLab =
        document.getElementById(
            "includeLabCost"
        )?.checked ?? true;


    const includeBills =
        document.getElementById(
            "includeBills"
        )?.checked ?? true;


    const includeInventory =
        document.getElementById(
            "includeInventory"
        )?.checked ?? true;


    const includeDoctorPayments =
        document.getElementById(
            "includeDoctorPayments"
        )?.checked ?? true;


    try {


        /* =================================================
           PATIENT PAYMENTS
           POSITIVE INCOME
        ================================================= */

        const {
            data: payments,
            error: paymentsError
        } =
        await supabaseClient

            .from(
                "patient_service_payments"
            )

            .select(
                "amount"
            )

            .eq(
                "user_id",
                userId
            )

            .gte(
                "payment_date",
                from
            )

            .lte(
                "payment_date",
                to
            );


        if(paymentsError){

            console.error(
                "Payments error:",
                paymentsError
            );

        }


        let paidTotal =
            0;


        (
            payments || []
        ).forEach(item => {

            paidTotal +=
                Number(
                    item.amount || 0
                );

        });


        /* =================================================
           INSURANCE PAYMENTS
           POSITIVE INCOME
        ================================================= */

        let insurancePaymentsTotal =
            0;


        const {
            data: insurancePayments,
            error: insurancePaymentsError
        } =
        await supabaseClient

            .from(
                "insurance_payments"
            )

            .select(
                "amount"
            )

            .eq(
                "user_id",
                userId
            )

            .gte(
                "payment_date",
                fromValue
            )

            .lte(
                "payment_date",
                toValue
            );


        if(insurancePaymentsError){

            console.error(
                "Insurance payments error:",
                insurancePaymentsError
            );

        }


        (
            insurancePayments || []
        ).forEach(payment => {

            insurancePaymentsTotal +=
                Number(
                    payment.amount || 0
                );

        });


        /* =================================================
           LAB COST
        ================================================= */

        let labTotal =
            0;


        if(includeLab){

            const {
                data: labWorks,
                error: labError
            } =
            await supabaseClient

                .from(
                    "lab_works"
                )

                .select(
                    "lab_cost"
                )

                .eq(
                    "user_id",
                    userId
                )

                .gte(
                    "created_at",
                    from
                )

                .lte(
                    "created_at",
                    to
                );


            if(labError){

                console.error(
                    "Lab error:",
                    labError
                );

            }


            (
                labWorks || []
            ).forEach(item => {

                labTotal +=
                    Number(
                        item.lab_cost || 0
                    );

            });

        }


        /* =================================================
           BILLS
        ================================================= */

        let billsTotal =
            0;


        if(includeBills){

            const {
                data: bills,
                error: billsError
            } =
            await supabaseClient

                .from(
                    "bills"
                )

                .select(
                    "amount"
                )

                .eq(
                    "user_id",
                    userId
                )

                .gte(
                    "created_at",
                    from
                )

                .lte(
                    "created_at",
                    to
                );


            if(billsError){

                console.error(
                    "Bills error:",
                    billsError
                );

            }


            (
                bills || []
            ).forEach(item => {

                billsTotal +=
                    Number(
                        item.amount || 0
                    );

            });

        }


        /* =================================================
           INVENTORY / PURCHASE INVOICE PAYMENTS

           ACTUAL PAYMENTS IN SELECTED PERIOD
        ================================================= */

        let inventoryTotal =
            0;


        if(includeInventory){

            const {
                data: purchasePayments,
                error: purchasePaymentsError
            } =
            await supabaseClient

                .from(
                    "purchase_invoice_payments"
                )

                .select(
                    "amount"
                )

                .eq(
                    "user_id",
                    userId
                )

                .gte(
                    "payment_date",
                    fromValue
                )

                .lte(
                    "payment_date",
                    toValue
                );


            if(purchasePaymentsError){

                console.error(
                    "Purchase invoice payments error:",
                    purchasePaymentsError
                );

            }


            (
                purchasePayments || []
            ).forEach(payment => {

                inventoryTotal +=
                    Number(
                        payment.amount || 0
                    );

            });

        }


        /* =================================================
           DOCTOR PAYMENTS
        ================================================= */

        let doctorPaymentsTotal =
            0;


        if(includeDoctorPayments){

            const {
                data: doctorPayments,
                error: doctorPaymentsError
            } =
            await supabaseClient

                .from(
                    "doctor_payments"
                )

                .select(
                    "amount"
                )

                .eq(
                    "user_id",
                    userId
                )

                .gte(
                    "payment_date",
                    fromValue
                )

                .lte(
                    "payment_date",
                    toValue
                );


            if(doctorPaymentsError){

                console.error(
                    "Doctor payments error:",
                    doctorPaymentsError
                );

            }


            (
                doctorPayments || []
            ).forEach(payment => {

                doctorPaymentsTotal +=
                    Number(
                        payment.amount || 0
                    );

            });

        }


        /* =================================================
           TOTAL INCOME
        ================================================= */

        const totalIncome =

            paidTotal

            +

            insurancePaymentsTotal;


        /* =================================================
           TOTAL COSTS
        ================================================= */

        const totalCosts =

            labTotal

            +

            billsTotal

            +

            inventoryTotal

            +

            doctorPaymentsTotal;


        /* =================================================
           NET PROFIT
        ================================================= */

        const netProfit =

            totalIncome

            -

            totalCosts;


        /* =================================================
           UPDATE MAIN PROFIT
        ================================================= */

        const netProfitEl =
            document.getElementById(
                "netProfit"
            );


        if(netProfitEl){

            netProfitEl.innerText =

                netProfit.toFixed(2)

                + " EGP";


            netProfitEl.classList.toggle(
                "negative",
                netProfit < 0
            );

        }


        /* =================================================
           DETAILS
        ================================================= */

        const detailsEl =
            document.getElementById(
                "netProfitDetails"
            );


        if(detailsEl){

            detailsEl.innerHTML = `

                <!-- NET PROFIT -->

                <div
                    style="
                        font-size:22px;
                        font-weight:900;
                        color:
                            ${netProfit >= 0
                                ? '#22c55e'
                                : '#ef4444'};
                    "
                >

                    ${netProfit.toFixed(2)}
                    EGP

                </div>


                <!-- SELECTED PERIOD -->

                <div
                    style="
                        margin-top:6px;
                        color:#94a3b8;
                        font-size:12px;
                    "
                >

                    ${fromValue}

                    →

                    ${toValue}

                </div>


                <!-- FINANCIAL DETAILS -->

                <div
                    style="
                        display:flex;
                        flex-direction:column;
                        gap:8px;
                        margin-top:12px;
                        font-size:13px;
                        line-height:1.7;
                    "
                >


                    <!-- PATIENT PAYMENTS -->

                    <div
                        style="
                            display:flex;
                            justify-content:space-between;
                            align-items:center;
                            padding:8px 10px;
                            border-radius:10px;
                            background:
                                rgba(34,197,94,.07);
                        "
                    >

                        <span
                            style="
                                color:#86efac;
                            "
                        >

                            <i
                                class="fa-solid fa-circle-check"
                            ></i>

                            Paid

                        </span>


                        <strong
                            style="
                                color:#22c55e;
                            "
                        >

                            + ${paidTotal.toFixed(2)}

                            EGP

                        </strong>

                    </div>


                    <!-- INSURANCE PAYMENTS -->

                    <div
                        style="
                            display:flex;
                            justify-content:space-between;
                            align-items:center;
                            padding:8px 10px;
                            border-radius:10px;
                            background:
                                rgba(14,165,233,.07);
                        "
                    >

                        <span
                            style="
                                color:#7dd3fc;
                            "
                        >

                            <i
                                class="fa-solid fa-shield-heart"
                            ></i>

                            Insurance Payments

                        </span>


                        <strong
                            style="
                                color:#0ea5e9;
                            "
                        >

                            + ${insurancePaymentsTotal.toFixed(2)}

                            EGP

                        </strong>

                    </div>


                    <!-- LAB -->

                    <div
                        style="
                            display:flex;
                            justify-content:space-between;
                            align-items:center;
                            padding:8px 10px;
                            border-radius:10px;
                            background:
                                rgba(239,68,68,.06);
                        "
                    >

                        <span
                            style="
                                color:#fca5a5;
                            "
                        >

                            <i
                                class="fa-solid fa-screwdriver-wrench"
                            ></i>

                            Lab Cost

                        </span>


                        <strong
                            style="
                                color:#ef4444;
                            "
                        >

                            - ${labTotal.toFixed(2)}

                            EGP

                        </strong>

                    </div>


                    <!-- BILLS -->

                    <div
                        style="
                            display:flex;
                            justify-content:space-between;
                            align-items:center;
                            padding:8px 10px;
                            border-radius:10px;
                            background:
                                rgba(239,68,68,.06);
                        "
                    >

                        <span
                            style="
                                color:#fca5a5;
                            "
                        >

                            <i
                                class="fa-solid fa-file-invoice-dollar"
                            ></i>

                            Invoices

                        </span>


                        <strong
                            style="
                                color:#ef4444;
                            "
                        >

                            - ${billsTotal.toFixed(2)}

                            EGP

                        </strong>

                    </div>


                    <!-- INVENTORY -->

                    <div
                        style="
                            display:flex;
                            justify-content:space-between;
                            align-items:center;
                            padding:8px 10px;
                            border-radius:10px;
                            background:
                                rgba(239,68,68,.06);
                        "
                    >

                        <span
                            style="
                                color:#fca5a5;
                            "
                        >

                            <i
                                class="fa-solid fa-boxes-stacked"
                            ></i>

                            Inventory Purchases

                        </span>


                        <strong
                            style="
                                color:#ef4444;
                            "
                        >

                            - ${inventoryTotal.toFixed(2)}

                            EGP

                        </strong>

                    </div>


                    <!-- DOCTOR PAYMENTS -->

                    <div
                        style="
                            display:flex;
                            justify-content:space-between;
                            align-items:center;
                            padding:8px 10px;
                            border-radius:10px;
                            background:
                                rgba(168,85,247,.07);
                        "
                    >

                        <span
                            style="
                                color:#d8b4fe;
                            "
                        >

                            <i
                                class="fa-solid fa-user-doctor"
                            ></i>

                            Doctor Payments

                        </span>


                        <strong
                            style="
                                color:#c084fc;
                            "
                        >

                            - ${doctorPaymentsTotal.toFixed(2)}

                            EGP

                        </strong>

                    </div>


                    <!-- TOTAL INCOME -->

                    <div
                        style="
                            display:flex;
                            justify-content:space-between;
                            align-items:center;
                            margin-top:4px;
                            padding:10px;
                            border-radius:10px;
                            background:
                                rgba(34,197,94,.10);
                            border:
                                1px solid rgba(34,197,94,.15);
                        "
                    >

                        <span
                            style="
                                color:#86efac;
                                font-weight:700;
                            "
                        >

                            <i
                                class="fa-solid fa-arrow-trend-up"
                            ></i>

                            Total Income

                        </span>


                        <strong
                            style="
                                color:#22c55e;
                                font-weight:900;
                            "
                        >

                            ${totalIncome.toFixed(2)}

                            EGP

                        </strong>

                    </div>


                    <!-- TOTAL COSTS -->

                    <div
                        style="
                            display:flex;
                            justify-content:space-between;
                            align-items:center;
                            padding:10px;
                            border-radius:10px;
                            background:
                                rgba(239,68,68,.08);
                            border:
                                1px solid rgba(239,68,68,.12);
                        "
                    >

                        <span
                            style="
                                color:#fca5a5;
                                font-weight:700;
                            "
                        >

                            <i
                                class="fa-solid fa-arrow-trend-down"
                            ></i>

                            Total Costs

                        </span>


                        <strong
                            style="
                                color:#ef4444;
                                font-weight:900;
                            "
                        >

                            ${totalCosts.toFixed(2)}

                            EGP

                        </strong>

                    </div>


                </div>

            `;

        }


        /* =================================================
           DEBUG
        ================================================= */

        console.log(
            "💰 NET PROFIT:",
            {

                from:
                    fromValue,

                to:
                    toValue,

                paid:
                    paidTotal,

                insurancePayments:
                    insurancePaymentsTotal,

                totalIncome,

                lab:
                    includeLab
                        ? labTotal
                        : 0,

                bills:
                    includeBills
                        ? billsTotal
                        : 0,

                inventory:
                    includeInventory
                        ? inventoryTotal
                        : 0,

                doctorPayments:
                    includeDoctorPayments
                        ? doctorPaymentsTotal
                        : 0,

                totalCosts,

                netProfit

            }
        );


    }
    catch(error){

        console.error(
            "loadNetProfit error:",
            error
        );

    }

}

// ======================
// MONTHLY CHART
// ==========================

/* ==========================================
   MONTHLY COMPARISON CHART
========================================== */

/* ==========================================
   MONTHLY COMPARISON CHART
========================================== */

/* ==========================================
   MONTHLY COMPARISON CHART
========================================== */
let monthlyChart = null;


/* ==========================================
   LOAD MONTHLY COMPARISON
========================================== */

async function loadMonthlyComparison(){

    const userId =
        await getUserId();

    if(!userId) return;


    /* ======================================
       DATE INPUTS
    ====================================== */

    const fromInput =
        document.getElementById("monthlyFrom");

    const toInput =
        document.getElementById("monthlyTo");


    let fromValue =
        fromInput?.value;

    let toValue =
        toInput?.value;


    /* ======================================
       DEFAULT = LAST 6 MONTHS
    ====================================== */

    if(!fromValue || !toValue){

        const now = new Date();

        const fromDate =
            new Date(
                now.getFullYear(),
                now.getMonth() - 5,
                1
            );


        fromValue =
            `${fromDate.getFullYear()}-${String(
                fromDate.getMonth() + 1
            ).padStart(2,"0")}`;


        toValue =
            `${now.getFullYear()}-${String(
                now.getMonth() + 1
            ).padStart(2,"0")}`;


        if(fromInput){

            fromInput.value =
                fromValue;

        }


        if(toInput){

            toInput.value =
                toValue;

        }

    }


    /* ======================================
       VALIDATE
    ====================================== */

    if(fromValue > toValue){

        alert(
            "شهر البداية يجب أن يكون قبل شهر النهاية"
        );

        return;

    }


    /* ======================================
       CREATE DATE RANGE
    ====================================== */

    const [
        fromYear,
        fromMonth
    ] =
        fromValue
            .split("-")
            .map(Number);


    const [
        toYear,
        toMonth
    ] =
        toValue
            .split("-")
            .map(Number);


    const rangeStart =
        new Date(
            Date.UTC(
                fromYear,
                fromMonth - 1,
                1
            )
        );


    const rangeEnd =
        new Date(
            Date.UTC(
                toYear,
                toMonth,
                1
            )
        );


    /* ======================================
       MONTHS
    ====================================== */

    const months = [];

    let current =
        new Date(rangeStart);


    while(current < rangeEnd){

        months.push({

            key:
                `${current.getUTCFullYear()}-${String(
                    current.getUTCMonth() + 1
                ).padStart(2,"0")}`,

            year:
                current.getUTCFullYear(),

            month:
                current.getUTCMonth(),

            total: 0,

            paid: 0,

            lab: 0,

            bills: 0,

            inventory: 0

        });


        current =
            new Date(
                Date.UTC(
                    current.getUTCFullYear(),
                    current.getUTCMonth() + 1,
                    1
                )
            );

    }


    if(!months.length) return;


    /* ======================================
       HELPER
    ====================================== */

    function getMonthKey(date){

        const d =
            new Date(date);


        return (
            `${d.getUTCFullYear()}-${String(
                d.getUTCMonth() + 1
            ).padStart(2,"0")}`
        );

    }


    /* ======================================
       MAP
    ====================================== */

    const monthMap =
        new Map(
            months.map(
                month =>
                    [month.key, month]
            )
        );


    /* ======================================
       FETCH ALL DATA IN PARALLEL
    ====================================== */

    const [

        servicesResult,

        paymentsResult,

        labsResult,

        billsResult,

        purchasePaymentsResult

    ] = await Promise.all([


        /* ==================================
           SERVICES
        ================================== */

        supabaseClient

            .from("patientt_services")

            .select(
    "id,total_amount,discount_amount,created_at"
)

            .eq(
                "user_id",
                userId
            )

            .gte(
                "created_at",
                rangeStart.toISOString()
            )

            .lt(
                "created_at",
                rangeEnd.toISOString()
            ),


        /* ==================================
           PATIENT PAYMENTS
        ================================== */

        supabaseClient

            .from("patient_service_payments")

            .select(
                "amount,payment_date"
            )

            .eq(
                "user_id",
                userId
            )

            .gte(
                "payment_date",
                rangeStart.toISOString()
            )

            .lt(
                "payment_date",
                rangeEnd.toISOString()
            ),


        /* ==================================
           LAB
        ================================== */

        supabaseClient

            .from("lab_works")

            .select(
                "lab_cost,created_at"
            )

            .eq(
                "user_id",
                userId
            )

            .gte(
                "created_at",
                rangeStart.toISOString()
            )

            .lt(
                "created_at",
                rangeEnd.toISOString()
            ),


        /* ==================================
           BILLS
        ================================== */

        supabaseClient

            .from("bills")

            .select(
                "amount,created_at"
            )

            .eq(
                "user_id",
                userId
            )

            .gte(
                "created_at",
                rangeStart.toISOString()
            )

            .lt(
                "created_at",
                rangeEnd.toISOString()
            ),


        /* ==================================
           PURCHASE INVOICE PAYMENTS

           النظام الجديد

           نحسب فقط ما تم دفعه فعليًا
           خلال الشهر
        ================================== */

       /* ==================================
   PURCHASE INVOICE PAYMENTS
   ACTUAL CASH PAYMENTS
================================== */

supabaseClient

    .from("purchase_invoice_payments")

    .select(
        "amount,payment_date"
    )

    .eq(
        "user_id",
        userId
    )

    .gte(
        "payment_date",
        rangeStart.toISOString().split("T")[0]
    )

    .lt(
        "payment_date",
        rangeEnd.toISOString().split("T")[0]
    )

    ]);


    /* ======================================
       CHECK ERRORS
    ====================================== */

    if(servicesResult.error){

        console.error(
            "Services error:",
            servicesResult.error
        );

    }


    if(paymentsResult.error){

        console.error(
            "Payments error:",
            paymentsResult.error
        );

    }


    if(labsResult.error){

        console.error(
            "Labs error:",
            labsResult.error
        );

    }


    if(billsResult.error){

        console.error(
            "Bills error:",
            billsResult.error
        );

    }


    if(purchasePaymentsResult.error){

        console.error(
            "Purchase invoice payments error:",
            purchasePaymentsResult.error
        );

    }


/* ======================================
   SERVICES
   المستحق = السعر بعد الخصم
====================================== */

(
    servicesResult.data || []
)
.forEach(service => {

    const key =
        getMonthKey(
            service.created_at
        );


    const month =
        monthMap.get(key);


    if(month){

        const originalAmount =
            Math.max(
                Number(
                    service.total_amount || 0
                ),
                0
            );


        let discount =
            Number(
                service.discount_amount || 0
            );


        if(
            !Number.isFinite(discount)
        ){

            discount = 0;

        }


        /* ==================================
           منع الخصم من تجاوز السعر الأصلي
        ================================== */

        discount =
            Math.min(
                Math.max(
                    discount,
                    0
                ),
                originalAmount
            );


        /* ==================================
           المستحق بعد الخصم
           
           مثال:
           1000 - 200 = 800
        ================================== */

        const dueAfterDiscount =
            Math.max(
                originalAmount -
                discount,
                0
            );


        month.total +=
            dueAfterDiscount;


        console.log(
            "📊 MONTHLY SERVICE:",
            {

                id:
                    service.id,

                original:
                    originalAmount,

                discount:
                    discount,

                dueAfterDiscount:
                    dueAfterDiscount

            }
        );

    }

});

    /* ======================================
       PATIENT PAYMENTS
    ====================================== */

    (
        paymentsResult.data || []
    )
    .forEach(payment => {

        const key =
            getMonthKey(
                payment.payment_date
            );


        const month =
            monthMap.get(key);


        if(month){

            month.paid +=
                Number(
                    payment.amount || 0
                );

        }

    });


    /* ======================================
       LAB
    ====================================== */

    (
        labsResult.data || []
    )
    .forEach(item => {

        const key =
            getMonthKey(
                item.created_at
            );


        const month =
            monthMap.get(key);


        if(month){

            month.lab +=
                Number(
                    item.lab_cost || 0
                );

        }

    });


    /* ======================================
       BILLS
    ====================================== */

    (
        billsResult.data || []
    )
    .forEach(item => {

        const key =
            getMonthKey(
                item.created_at
            );


        const month =
            monthMap.get(key);


        if(month){

            month.bills +=
                Number(
                    item.amount || 0
                );

        }

    });


    /* ======================================
       PURCHASE INVOICE PAYMENTS

       النظام الجديد
    ====================================== */

    (
        purchasePaymentsResult.data || []
    )
    .forEach(payment => {

        const key =
            getMonthKey(
                payment.payment_date
            );


        const month =
            monthMap.get(key);


        if(month){

            month.inventory +=
                Number(
                    payment.amount || 0
                );

        }

    });


    /* ======================================
       CHART DATA
    ====================================== */

    const labels = [];

    const totals = [];

    const paids = [];

    const profits = [];


    months.forEach(month => {

        labels.push(

            new Date(
                Date.UTC(
                    month.year,
                    month.month,
                    1
                )
            )
            .toLocaleString(
                "ar-EG",
                {
                    month: "short",
                    year: "numeric",
                    timeZone: "UTC"
                }
            )

        );


        totals.push(
            month.total
        );


        paids.push(
            month.paid
        );


        /* ==================================
           NET PROFIT

           Revenue
           -
           Lab
           -
           Bills
           -
           Actual purchase payments
        ================================== */

        profits.push(

            month.paid

            -

            month.lab

            -

            month.bills

            -

            month.inventory

        );

    });


    /* ======================================
       RANGE LABEL
    ====================================== */

    const rangeLabel =
        document.getElementById(
            "monthlyRangeLabel"
        );


    if(rangeLabel){

        rangeLabel.textContent =
            `${fromValue} → ${toValue}`;

    }


    /* ======================================
       CHART
    ====================================== */

    const ctx =
        document.getElementById(
            "monthlyChart"
        );


    if(!ctx) return;


    if(
        typeof Chart ===
        "undefined"
    ){

        console.error(
            "Chart.js not loaded"
        );

        return;

    }


    /* ======================================
       DESTROY OLD CHART
    ====================================== */

    if(monthlyChart){

        monthlyChart.destroy();

        monthlyChart = null;

    }


    /* ======================================
       CREATE CHART
    ====================================== */

    monthlyChart =
        new Chart(
            ctx,
            {

                type: "bar",


                data: {

                    labels,


                    datasets: [

                        {

                            label:
                                "إجمالي الخدمات",

                            data:
                                totals,

                            backgroundColor:
                                "#4cc9f0",

                            borderRadius:
                                8

                        },


                        {

                            label:
                                "المدفوع",

                            data:
                                paids,

                            backgroundColor:
                                "#80ffdb",

                            borderRadius:
                                8

                        },


                        {

                            label:
                                "صافي الربح",

                            data:
                                profits,

                            backgroundColor:
                                "#22c55e",

                            borderRadius:
                                8

                        }

                    ]

                },


                options: {

                    responsive: true,

                    maintainAspectRatio: false,


                    interaction: {

                        mode: "index",

                        intersect: false

                    },


                    plugins: {

                        legend: {

                            position: "top",

                            labels: {

                                color: "white",

                                usePointStyle: true,

                                padding: 20

                            }

                        },


                        tooltip: {

                            callbacks: {

                                label:
                                    function(context){

                                        return (

                                            context.dataset.label

                                            + ": "

                                            +

                                            Number(
                                                context.raw || 0
                                            )
                                            .toLocaleString(
                                                "en-US",
                                                {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2
                                                }
                                            )

                                            + " EGP"

                                        );

                                    }

                            }

                        }

                    },


                    scales: {

                        x: {

                            ticks: {

                                color: "#cbd5e1"

                            },

                            grid: {

                                color:
                                    "rgba(255,255,255,.05)"

                            }

                        },


                        y: {

                            beginAtZero: true,

                            ticks: {

                                color: "#cbd5e1",

                                callback:
                                    function(value){

                                        return (

                                            Number(value)
                                            .toLocaleString(
                                                "en-US"
                                            )

                                            + " EGP"

                                        );

                                    }

                            },

                            grid: {

                                color:
                                    "rgba(255,255,255,.05)"

                            }

                        }

                    }

                }

            }
        );

}
/* ==========================================
   AUTO LOAD
   DEFAULT = LAST 6 MONTHS
========================================== */

document.addEventListener(
    "DOMContentLoaded",
    function(){

        /* ننتظر Chart.js إذا كان السكربت
           يتم تحميله بشكل متأخر */

        const startChart = () => {

            if(
                typeof Chart !== "undefined"
            ){

                loadMonthlyComparison();

            }
            else{

                setTimeout(
                    startChart,
                    100
                );

            }

        };


        startChart();

    }
);

/* =========================
START
========================= */

window.addEventListener("DOMContentLoaded",()=>{

    loadMonthlyComparison();

});

// ==========================
// DEPARTMENTS COMPARISON
// ==========================

async function loadDepartmentsStatistics(){

    /* =========================
       USER
    ========================= */

    const {
        data:userData,
        error:userError
    } =
    await supabaseClient
        .auth
        .getUser();


    if(userError || !userData?.user){

        console.error(
            "User error:",
            userError
        );

        return;

    }


    const userId =
        userData.user.id;


    /* =========================
       DATE INPUTS
    ========================= */

    const fromInput =
        document.getElementById(
            "departmentsFromDate"
        );


    const toInput =
        document.getElementById(
            "departmentsToDate"
        );


    const fromDate =
        fromInput?.value;


    const toDate =
        toInput?.value;


    /* =========================
       VALIDATE DATES
    ========================= */

    if(!fromDate || !toDate){

        alert(
            "من فضلك اختر تاريخ البداية والنهاية"
        );

        return;

    }


    if(fromDate > toDate){

        alert(
            "تاريخ البداية يجب أن يكون قبل تاريخ النهاية"
        );

        return;

    }


    /* =========================
       UTC RANGE
    ========================= */

    const startDate =
        new Date(
            `${fromDate}T00:00:00`
        );


    const endDate =
        new Date(
            `${toDate}T23:59:59.999`
        );


    /* =========================
       DEPARTMENTS
    ========================= */

    const {
        data:departments,
        error:departmentsError
    } =
    await supabaseClient

        .from("clinic_departments")

        .select("*")

        .eq(
            "user_id",
            userId
        );


    if(departmentsError){

        console.error(
            "Departments error:",
            departmentsError
        );

        return;

    }


    if(!departments?.length){

        return;

    }


    /* =========================
       VISITS
    ========================= */

    const {
        data:visits,
        error:visitsError
    } =
    await supabaseClient

        .from("patient_visits")

        .select(`
            id,
            patient_id,
            department_id,
            appointment_start,
            appointment_end
        `)

        .eq(
            "user_id",
            userId
        )

        .eq(
            "is_deleted",
            false
        )

        .gte(
            "appointment_start",
            startDate.toISOString()
        )

        .lte(
            "appointment_start",
            endDate.toISOString()
        );


    if(visitsError){

        console.error(
            "Visits error:",
            visitsError
        );

        return;

    }


    /* =========================
       SERVICES
    ========================= */

    const {
        data:services,
        error:servicesError
    } =
    await supabaseClient

        .from("patientt_services")

        .select(`
            id,
            visit_id
        `)

        .eq(
            "user_id",
            userId
        );


    if(servicesError){

        console.error(
            "Services error:",
            servicesError
        );

        return;

    }


    /* =========================
       FILTER VISITS
    ========================= */

    const filteredVisits =
        visits || [];


    const filteredVisitIds =
        filteredVisits.map(
            v => v.id
        );


    const filteredServices =
        (services || []).filter(
            service =>
                filteredVisitIds.includes(
                    service.visit_id
                )
        );


    /* =========================
       CHART DATA
    ========================= */

    const labels = [];

    const patientsData = [];

    const servicesData = [];

    const hoursData = [];


    departments.forEach(
        department => {

            labels.push(
                department.department_name
            );


            /* =====================
               DEPARTMENT VISITS
            ===================== */

            const departmentVisits =
                filteredVisits.filter(
                    visit =>
                        visit.department_id ===
                        department.id
                );


            /* =====================
               PATIENTS
            ===================== */

            const uniquePatients =
                new Set(
                    departmentVisits
                        .map(
                            visit =>
                                visit.patient_id
                        )
                        .filter(Boolean)
                );


            patientsData.push(
                uniquePatients.size
            );


            /* =====================
               SERVICES
            ===================== */

            const departmentVisitIds =
                departmentVisits.map(
                    visit =>
                        visit.id
                );


            const departmentServices =
                filteredServices.filter(
                    service =>
                        departmentVisitIds.includes(
                            service.visit_id
                        )
                );


            servicesData.push(
                departmentServices.length
            );


            /* =====================
               WORK HOURS
            ===================== */

            let totalHours = 0;


            departmentVisits.forEach(
                visit => {

                    if(
                        !visit.appointment_start ||
                        !visit.appointment_end
                    ){

                        return;

                    }


                    const start =
                        new Date(
                            visit.appointment_start
                        );


                    const end =
                        new Date(
                            visit.appointment_end
                        );


                    const hours =
                        (
                            end - start
                        ) /
                        1000 /
                        60 /
                        60;


                    if(hours > 0){

                        totalHours +=
                            hours;

                    }

                }
            );


            hoursData.push(
                Number(
                    totalHours.toFixed(1)
                )
            );

        }
    );


    /* =========================
       RENDER
    ========================= */

    renderDepartmentsChart(
        labels,
        patientsData,
        servicesData,
        hoursData
    );

}

/* =====================
   CHART
===================== */

function renderDepartmentsChart(

    labels,
    patients,
    services,
    hours

){

    const ctx =
    document.getElementById(
        "departmentsChart"
    );

    if(!ctx)
        return;

    if(
        window.departmentsChart &&
        typeof window.departmentsChart.destroy === "function"
    ){

        window.departmentsChart.destroy();

    }

    window.departmentsChart =
    new Chart(
        ctx,
        {

            type:"bar",

            data:{

                labels,

                datasets:[

                    {
                        label:"المرضى",
                        data:patients
                    },

                    {
                        label:"الخدمات",
                        data:services
                    },

                    {
                        label:"ساعات العمل",
                        data:hours
                    }

                ]

            }

        }
    );

}

/* =========================
   AUTO LOAD
   CURRENT MONTH: 1 → LAST DAY
========================= */

window.addEventListener("load", async () => {

    const today = new Date();

    /* =========================
       FIRST DAY OF CURRENT MONTH
    ========================= */

    const firstDay =
        new Date(
            today.getFullYear(),
            today.getMonth(),
            1
        );


    /* =========================
       LAST DAY OF CURRENT MONTH
       
       اليوم 0 من الشهر التالي
       = آخر يوم من الشهر الحالي
    ========================= */

    const lastDay =
        new Date(
            today.getFullYear(),
            today.getMonth() + 1,
            0
        );


    /* =========================
       LOCAL DATE FORMAT
       بدون مشكلة UTC / مصر
    ========================= */

    function formatLocalDate(date){

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

    }


    /* =========================
       DATE INPUTS
    ========================= */

    const fromInput =
        document.getElementById(
            "departmentsFromDate"
        );


    const toInput =
        document.getElementById(
            "departmentsToDate"
        );


    /* =========================
       SET DEFAULT VALUES
    ========================= */

    if(fromInput){

        fromInput.value =
            formatLocalDate(
                firstDay
            );

    }


    if(toInput){

        toInput.value =
            formatLocalDate(
                lastDay
            );

    }


    /* =========================
       LOG
    ========================= */

    console.log(
        "📅 Departments Statistics Default Range:",
        {
            from:
                fromInput?.value,

            to:
                toInput?.value
        }
    );


    /* =========================
       LOAD STATISTICS
    ========================= */

    await loadDepartmentsStatistics();

});

// ==========================
// CUSTOM DATE RANGE
// ==========================

/* ==========================================
   CUSTOM STATISTICS
========================================== */
async function loadCustomStats() {

    const userId = await getUserId();

    if (!userId) {

        console.log("No user");

        return;
    }


    /* =====================================================
       DATE INPUTS
    ===================================================== */

    const fromInput =
        document.getElementById("statsFrom");

    const toInput =
        document.getElementById("statsTo");


    let from =
        fromInput?.value;

    let to =
        toInput?.value;


    /* =====================================================
       DEFAULT = CURRENT MONTH
    ===================================================== */

    if (!from || !to) {

        const now =
            new Date();

        const firstDay =
            new Date(
                now.getFullYear(),
                now.getMonth(),
                1
            );

        const today =
            new Date();


        from =
            `${firstDay.getFullYear()}-${
                String(
                    firstDay.getMonth() + 1
                ).padStart(2, "0")
            }-${
                String(
                    firstDay.getDate()
                ).padStart(2, "0")
            }`;


        to =
            `${today.getFullYear()}-${
                String(
                    today.getMonth() + 1
                ).padStart(2, "0")
            }-${
                String(
                    today.getDate()
                ).padStart(2, "0")
            }`;


        if (fromInput) {

            fromInput.value =
                from;
        }


        if (toInput) {

            toInput.value =
                to;
        }
    }


    /* =====================================================
       RANGE LABEL
    ===================================================== */

    const formatStatsDate =
        dateString => {

            const date =
                new Date(
                    dateString +
                    "T00:00:00"
                );

            return date.toLocaleDateString(
                "ar-EG",
                {
                    year: "numeric",
                    month: "short",
                    day: "numeric"
                }
            );
        };


    const rangeLabel =
        document.getElementById(
            "customStatsRange"
        );


    if (rangeLabel) {

        rangeLabel.innerHTML = `
            <i class="fa-regular fa-calendar"></i>

            <span>
                ${formatStatsDate(from)}
                →
                ${formatStatsDate(to)}
            </span>
        `;
    }


    /* =====================================================
       VALIDATE
    ===================================================== */

    if (from > to) {

        alert(
            "تاريخ البداية يجب أن يكون قبل تاريخ النهاية"
        );

        return;
    }


    /* =====================================================
       DATE RANGE
    ===================================================== */

    const rangeFrom =
        `${from}T00:00:00`;

    const rangeTo =
        `${to}T23:59:59`;


    /* =====================================================
       SERVICES CREATED IN RANGE

       IMPORTANT:
       is_completed = true / false

       NO status column
    ===================================================== */

    const {
        data: services,
        error: servicesError

    } = await supabaseClient

        .from("patientt_services")

        .select(`
            id,
            total_amount,
            discount_amount,
            is_completed
        `)

        .eq(
            "user_id",
            userId
        )

        .gte(
            "created_at",
            rangeFrom
        )

        .lte(
            "created_at",
            rangeTo
        );


    if (servicesError) {

        console.error(
            "❌ Custom services error:",
            servicesError
        );

        alert(
            servicesError.message
        );

        return;
    }


    /* =====================================================
       SERVICE TOTALS
    ===================================================== */

    let total = 0;

    let totalDiscount = 0;

    let dueAfterDiscountTotal = 0;

    let completedServicesCount = 0;

    let incompleteServicesCount = 0;


    /* =====================================================
       CALCULATE SERVICES
    ===================================================== */

    (services || []).forEach(
        service => {

            const originalAmount =
                Math.max(
                    Number(
                        service.total_amount || 0
                    ),
                    0
                );


            let discount =
                Number(
                    service.discount_amount || 0
                );


            if (
                !Number.isFinite(discount)
            ) {

                discount = 0;
            }


            discount =
                Math.min(
                    Math.max(
                        discount,
                        0
                    ),
                    originalAmount
                );


            const dueAfterDiscount =
                Math.max(
                    originalAmount -
                    discount,
                    0
                );


            total +=
                originalAmount;


            totalDiscount +=
                discount;


            dueAfterDiscountTotal +=
                dueAfterDiscount;


            /* =============================================
               COMPLETION

               is_completed is BOOLEAN
            ============================================= */

            if (
                service.is_completed === true
            ) {

                completedServicesCount++;

            } else {

                incompleteServicesCount++;
            }


            console.log(
                "📊 CUSTOM SERVICE:",
                {
                    id: service.id,
                    original: originalAmount,
                    discount: discount,
                    dueAfterDiscount,
                    isCompleted:
                        service.is_completed
                }
            );
        }
    );


    const servicesCount =
        services?.length || 0;


    /* =====================================================
       COMPLETION PERCENTAGE
    ===================================================== */

    let completionPercentage = 0;


    if (servicesCount > 0) {

        completionPercentage =
            Math.round(
                (
                    completedServicesCount /
                    servicesCount
                ) * 100
            );
    }


    /* =====================================================
       CURRENT SERVICE IDS
    ===================================================== */

    const currentServiceIds =
        (services || []).map(
            service => service.id
        );


    /* =====================================================
       ALL PAYMENTS FOR THESE SERVICES

       Used for REAL REMAINING

       regardless of payment date.
    ===================================================== */

    let servicePayments = 0;


    if (
        currentServiceIds.length
    ) {

        const {
            data: currentPayments,
            error: currentPaymentsError

        } = await supabaseClient

            .from(
                "patient_service_payments"
            )

            .select(
                "amount"
            )

            .in(
                "service_id",
                currentServiceIds
            );


        if (currentPaymentsError) {

            console.error(
                "❌ Current payments error:",
                currentPaymentsError
            );
        }


        (currentPayments || []).forEach(
            payment => {

                servicePayments +=
                    Math.max(
                        Number(
                            payment.amount || 0
                        ),
                        0
                    );
            }
        );
    }


    /* =====================================================
       REMAINING

       Due after discount
       -
       ALL payments

    ===================================================== */

    const remain =
        Math.max(
            dueAfterDiscountTotal -
            servicePayments,
            0
        );


    /* =====================================================
       ALL SERVICES

       Needed for CASH REVENUE
    ===================================================== */

    const {
        data: allServices,
        error: allServicesError

    } = await supabaseClient

        .from(
            "patientt_services"
        )

        .select(
            "id"
        )

        .eq(
            "user_id",
            userId
        );


    if (allServicesError) {

        console.error(
            "❌ All services error:",
            allServicesError
        );
    }


    const allServiceIds =
        (allServices || []).map(
            service => service.id
        );


    /* =====================================================
       PATIENT PAYMENTS IN SELECTED PERIOD

       This is actual cash received
       during selected period.

       Includes old + new services.
    ===================================================== */

    let paid = 0;


    if (
        allServiceIds.length
    ) {

        const {
            data: payments,
            error: paymentsError

        } = await supabaseClient

            .from(
                "patient_service_payments"
            )

            .select(
                "amount"
            )

            .in(
                "service_id",
                allServiceIds
            )

            .gte(
                "payment_date",
                rangeFrom
            )

            .lte(
                "payment_date",
                rangeTo
            );


        if (paymentsError) {

            console.error(
                "❌ Payments error:",
                paymentsError
            );
        }


        (payments || []).forEach(
            payment => {

                paid +=
                    Math.max(
                        Number(
                            payment.amount || 0
                        ),
                        0
                    );
            }
        );
    }


    /* =====================================================
       LAB COST
    ===================================================== */

    const {
        data: labWorks,
        error: labError

    } = await supabaseClient

        .from(
            "lab_works"
        )

        .select(
            "lab_cost"
        )

        .eq(
            "user_id",
            userId
        )

        .gte(
            "created_at",
            rangeFrom
        )

        .lte(
            "created_at",
            rangeTo
        );


    if (labError) {

        console.error(
            "❌ Lab cost error:",
            labError
        );
    }


    let labTotal = 0;


    (labWorks || []).forEach(
        item => {

            labTotal +=
                Math.max(
                    Number(
                        item.lab_cost || 0
                    ),
                    0
                );
        }
    );


    /* =====================================================
       BILLS
    ===================================================== */

    const {
        data: bills,
        error: billsError

    } = await supabaseClient

        .from(
            "bills"
        )

        .select(
            "amount"
        )

        .eq(
            "user_id",
            userId
        )

        .gte(
            "created_at",
            rangeFrom
        )

        .lte(
            "created_at",
            rangeTo
        );


    if (billsError) {

        console.error(
            "❌ Bills error:",
            billsError
        );
    }


    let billsTotal = 0;


    (bills || []).forEach(
        item => {

            billsTotal +=
                Math.max(
                    Number(
                        item.amount || 0
                    ),
                    0
                );
        }
    );


    /* =====================================================
       PURCHASE PAYMENTS
    ===================================================== */

    const {
        data: purchasePayments,
        error: purchasePaymentsError

    } = await supabaseClient

        .from(
            "purchase_invoice_payments"
        )

        .select(
            "amount"
        )

        .eq(
            "user_id",
            userId
        )

        .gte(
            "payment_date",
            from
        )

        .lte(
            "payment_date",
            to
        );


    if (purchasePaymentsError) {

        console.error(
            "❌ Purchase payments error:",
            purchasePaymentsError
        );
    }


    let inventoryTotal = 0;


    (purchasePayments || []).forEach(
        payment => {

            inventoryTotal +=
                Math.max(
                    Number(
                        payment.amount || 0
                    ),
                    0
                );
        }
    );


    /* =====================================================
       NET PROFIT
    ===================================================== */

    const netProfit =
        paid
        -
        labTotal
        -
        billsTotal
        -
        inventoryTotal;


    /* =====================================================
       PATIENTS
    ===================================================== */

    const {
        data: patients,
        error: patientsError

    } = await supabaseClient

        .from(
            "patients"
        )

        .select(
            "id"
        )

        .eq(
            "user_id",
            userId
        )

        .gte(
            "created_at",
            rangeFrom
        )

        .lte(
            "created_at",
            rangeTo
        );


    if (patientsError) {

        console.error(
            "❌ Patients error:",
            patientsError
        );
    }


    /* =====================================================
       UPDATE MAIN CUSTOM STATS
    ===================================================== */

    const customTotal =
        document.getElementById(
            "customTotal"
        );


    const customPaid =
        document.getElementById(
            "customPaid"
        );


    const customRemain =
        document.getElementById(
            "customRemain"
        );


    const customServices =
        document.getElementById(
            "customServices"
        );


    const customPatients =
        document.getElementById(
            "customPatients"
        );


    const customNetProfit =
        document.getElementById(
            "customNetProfit"
        );


    if (customTotal) {

        customTotal.innerText =
            dueAfterDiscountTotal.toFixed(2)
            + " EGP";
    }


    if (customPaid) {

        customPaid.innerText =
            paid.toFixed(2)
            + " EGP";
    }


    if (customRemain) {

        customRemain.innerText =
            remain.toFixed(2)
            + " EGP";
    }


    if (customServices) {

        customServices.innerText =
            servicesCount;
    }


    if (customPatients) {

        customPatients.innerText =
            patients?.length || 0;
    }


    if (customNetProfit) {

        customNetProfit.innerText =
            netProfit.toFixed(2)
            + " EGP";
    }


    /* =====================================================
       PROFIT HOVER DETAILS
    ===================================================== */

    const customProfitPaid =
        document.getElementById(
            "customProfitPaid"
        );


    const customProfitLab =
        document.getElementById(
            "customProfitLab"
        );


    const customProfitBills =
        document.getElementById(
            "customProfitBills"
        );


    const customProfitInventory =
        document.getElementById(
            "customProfitInventory"
        );


    const customProfitNet =
        document.getElementById(
            "customProfitNet"
        );


    if (customProfitPaid) {

        customProfitPaid.innerText =
            paid.toFixed(2)
            + " EGP";
    }


    if (customProfitLab) {

        customProfitLab.innerText =
            labTotal.toFixed(2)
            + " EGP";
    }


    if (customProfitBills) {

        customProfitBills.innerText =
            billsTotal.toFixed(2)
            + " EGP";
    }


    if (customProfitInventory) {

        customProfitInventory.innerText =
            inventoryTotal.toFixed(2)
            + " EGP";
    }


    if (customProfitNet) {

        customProfitNet.innerText =
            netProfit.toFixed(2)
            + " EGP";
    }


    /* =====================================================
       SERVICES HOVER DETAILS
    ===================================================== */

    const customCompletedServices =
        document.getElementById(
            "customCompletedServices"
        );


    const customIncompleteServices =
        document.getElementById(
            "customIncompleteServices"
        );


    const customTotalServices =
        document.getElementById(
            "customTotalServices"
        );


    const customServicesCompletionPercentage =
        document.getElementById(
            "customServicesCompletionPercentage"
        );


    const customServicesProgress =
        document.getElementById(
            "customServicesProgress"
        );


    if (customCompletedServices) {

        customCompletedServices.innerText =
            completedServicesCount;
    }


    if (customIncompleteServices) {

        customIncompleteServices.innerText =
            incompleteServicesCount;
    }


    if (customTotalServices) {

        customTotalServices.innerText =
            servicesCount;
    }


    if (
        customServicesCompletionPercentage
    ) {

        customServicesCompletionPercentage.innerText =
            completionPercentage + "%";
    }


    if (customServicesProgress) {

        customServicesProgress.style.width =
            completionPercentage + "%";
    }


    /* =====================================================
       REMAINING HOVER DETAILS
    ===================================================== */

    const customRemainingServices =
        document.getElementById(
            "customRemainingServices"
        );


    const customRemainingTotal =
        document.getElementById(
            "customRemainingTotal"
        );


    const customRemainingPaid =
        document.getElementById(
            "customRemainingPaid"
        );


    const customRemainingAmount =
        document.getElementById(
            "customRemainingAmount"
        );


    if (customRemainingServices) {

        customRemainingServices.innerText =
            servicesCount;
    }


    if (customRemainingTotal) {

        customRemainingTotal.innerText =
            dueAfterDiscountTotal.toFixed(2)
            + " EGP";
    }


    if (customRemainingPaid) {

        customRemainingPaid.innerText =
            servicePayments.toFixed(2)
            + " EGP";
    }


    if (customRemainingAmount) {

        customRemainingAmount.innerText =
            remain.toFixed(2)
            + " EGP";
    }


    /* =====================================================
       DEBUG
    ===================================================== */

    console.log(
        "💰 CUSTOM STATS:",
        {

            from,
            to,

            servicesCount,

            completedServices:
                completedServicesCount,

            incompleteServices:
                incompleteServicesCount,

            completionPercentage,

            originalTotal:
                total,

            totalDiscount,

            dueAfterDiscount:
                dueAfterDiscountTotal,

            servicePayments,

            remainingAfterDiscount:
                remain,

            periodPaid:
                paid,

            lab:
                labTotal,

            bills:
                billsTotal,

            purchasePayments:
                inventoryTotal,

            netProfit
        }
    );
}
/* ==========================================
   MONTHLY CHART
========================================== */




let servicesChart;


/* =========================================================
   LOAD SERVICES ANALYTICS
========================================================= */

async function loadServicesAnalytics(){

    const userId =
        await getUserId();


    if(!userId){

        console.log("❌ No user");

        return;

    }



    /* =====================================================
       DATE FILTER
    ===================================================== */

    const fromInput =
        document.getElementById(
            "analyticsFrom"
        )?.value;


    const toInput =
        document.getElementById(
            "analyticsTo"
        )?.value;



    /* =====================================================
       SERVICES CREATED
    ===================================================== */

    let servicesQuery =

        supabaseClient

            .from(
                "patientt_services"
            )

            .select(`
                id,
                service_name,
                total_amount,
                discount_amount,
                created_at
            `)

            .eq(
                "user_id",
                userId
            );



    /* =====================================================
       FROM DATE
    ===================================================== */

    if(fromInput){

        const fromDate =
            new Date(
                fromInput
            );


        const fromUTC =
            new Date(
                Date.UTC(

                    fromDate.getFullYear(),

                    fromDate.getMonth(),

                    fromDate.getDate(),

                    0,
                    0,
                    0

                )
            );


        servicesQuery =
            servicesQuery.gte(

                "created_at",

                fromUTC.toISOString()

            );

    }



    /* =====================================================
       TO DATE
    ===================================================== */

    if(toInput){

        const toDate =
            new Date(
                toInput
            );


        const toUTC =
            new Date(
                Date.UTC(

                    toDate.getFullYear(),

                    toDate.getMonth(),

                    toDate.getDate(),

                    23,
                    59,
                    59

                )
            );


        servicesQuery =
            servicesQuery.lte(

                "created_at",

                toUTC.toISOString()

            );

    }



    /* =====================================================
       FETCH SERVICES
    ===================================================== */

    const {

        data: services,

        error

    } =
    await servicesQuery;



    if(error){

        console.error(
            "❌ Services analytics error:",
            error
        );

        return;

    }



    const table =
        document.getElementById(
            "servicesAnalyticsTable"
        );


    const canvas =
        document.getElementById(
            "servicesChart"
        );



    /* =====================================================
       NO DATA
    ===================================================== */

    if(
        !services ||
        !services.length
    ){

        if(table){

            table.innerHTML = `

                <tr>

                    <td
                        colspan="5"
                        style="
                            padding:20px;
                            color:#fff;
                            text-align:center;
                        "
                    >

                        لا توجد بيانات

                    </td>

                </tr>

            `;

        }


        const topService =
            document.getElementById(
                "topService"
            );


        const servicesCount =
            document.getElementById(
                "servicesCount"
            );


        if(topService){

            topService.innerText =
                "---";

        }


        if(servicesCount){

            servicesCount.innerText =
                "0";

        }


        if(
            window.servicesChart &&
            typeof
            window.servicesChart.destroy ===
            "function"
        ){

            window.servicesChart.destroy();

            window.servicesChart =
                null;

        }


        return;

    }



    /* =====================================================
       GET ALL SERVICE IDS
    ===================================================== */

    const {

        data: allServices,

        error: allServicesError

    } =
    await supabaseClient

        .from(
            "patientt_services"
        )

        .select(
            "id"
        )

        .eq(
            "user_id",
            userId
        );


    if(allServicesError){

        console.error(
            "❌ All service IDs error:",
            allServicesError
        );

    }


    const allServiceIds =
        (allServices || []).map(
            service =>
                service.id
        );



    /* =====================================================
       PAYMENTS DURING FILTER
    ===================================================== */

    const paidMap = {};



    if(
        allServiceIds.length
    ){

        let paymentsQuery =

            supabaseClient

                .from(
                    "patient_service_payments"
                )

                .select(
                    "service_id,amount"
                )

                .in(
                    "service_id",
                    allServiceIds
                );



        /* ================================================
           FROM
        ================================================ */

        if(fromInput){

            paymentsQuery =
                paymentsQuery.gte(

                    "payment_date",

                    `${fromInput}T00:00:00`

                );

        }



        /* ================================================
           TO
        ================================================ */

        if(toInput){

            paymentsQuery =
                paymentsQuery.lte(

                    "payment_date",

                    `${toInput}T23:59:59`

                );

        }



        const {

            data: payments,

            error: paymentsError

        } =
        await paymentsQuery;



        if(paymentsError){

            console.error(
                "❌ Payments analytics error:",
                paymentsError
            );

        }



        (payments || []).forEach(
            payment => {

                if(
                    !paidMap[
                        payment.service_id
                    ]
                ){

                    paidMap[
                        payment.service_id
                    ] = 0;

                }


                paidMap[
                    payment.service_id
                ] +=

                    Math.max(

                        Number(
                            payment.amount || 0
                        ),

                        0

                    );

            }
        );

    }



    /* =====================================================
       STATISTICS
       
       IMPORTANT:
       
       total = المستحق بعد الخصم
       
       remain =
       المستحق بعد الخصم - المدفوع
    ===================================================== */

    const stats = {};


    let totalServices =
        0;



    (services || []).forEach(
        service => {


            /* =============================================
               SERVICE NAME
            ============================================= */

            const name =
                service.service_name ||
                "Unnamed";



            /* =============================================
               ORIGINAL PRICE
            ============================================= */

            const originalAmount =
                Math.max(

                    Number(
                        service.total_amount || 0
                    ),

                    0

                );



            /* =============================================
               DISCOUNT
            ============================================= */

            let discount =
                Number(
                    service.discount_amount || 0
                );


            if(
                !Number.isFinite(
                    discount
                )
            ){

                discount =
                    0;

            }



            /* =============================================
               PROTECT DISCOUNT
               
               لا يسمح أن يكون الخصم:
               - سالب
               - أكبر من السعر
            ============================================= */

            discount =
                Math.min(

                    Math.max(
                        discount,
                        0
                    ),

                    originalAmount

                );



            /* =============================================
               DUE AFTER DISCOUNT
               
               1000 - 200 = 800
            ============================================= */

            const dueAfterDiscount =

                Math.max(

                    originalAmount -
                    discount,

                    0

                );



            /* =============================================
               PAID
            ============================================= */

            const paid =

                Math.max(

                    Number(
                        paidMap[
                            service.id
                        ] || 0
                    ),

                    0

                );



            /* =============================================
               REMAINING AFTER DISCOUNT
               
               800 - 300 = 500
            ============================================= */

            const remain =

                Math.max(

                    dueAfterDiscount -
                    paid,

                    0

                );



            /* =============================================
               CREATE SERVICE STAT
            ============================================= */

            if(!stats[name]){

                stats[name] = {

                    count:
                        0,

                    total:
                        0,

                    discount:
                        0,

                    paid:
                        0,

                    remain:
                        0

                };

            }



            /* =============================================
               ADD STATISTICS
            ============================================= */

            stats[name].count +=
                1;


            stats[name].total +=
                dueAfterDiscount;


            stats[name].discount +=
                discount;


            stats[name].paid +=
                paid;


            stats[name].remain +=
                remain;



            totalServices++;



            /* =============================================
               DEBUG
            ============================================= */

            console.log(
                "📊 SERVICE ANALYTICS",
                {

                    id:
                        service.id,

                    name:
                        name,

                    original:
                        originalAmount,

                    discount:
                        discount,

                    dueAfterDiscount:
                        dueAfterDiscount,

                    paid:
                        paid,

                    remain:
                        remain

                }
            );

        }
    );



    /* =====================================================
       TABLE
    ===================================================== */

    if(table){

        table.innerHTML = "";

    }



    let topName =
        "---";


    let topCount =
        0;



    Object.keys(stats).forEach(
        name => {


            const item =
                stats[name];



            /* =============================================
               TOP SERVICE
            ============================================= */

            if(
                item.count >
                topCount
            ){

                topCount =
                    item.count;


                topName =
                    name;

            }



            /* =============================================
               TABLE ROW
               
               TOTAL = بعد الخصم
               REMAIN = بعد الخصم
            ============================================= */

            if(table){

                table.innerHTML += `

                    <tr
                        style="
                            background:#1e293b;
                            border-bottom:
                                1px solid
                                rgba(255,255,255,.05);
                        "
                    >

                        <td
                            style="
                                padding:14px;
                                color:white;
                            "
                        >
                            ${name}
                        </td>


                        <td
                            style="
                                padding:14px;
                                color:#4cc9f0;
                            "
                        >
                            ${item.count}
                        </td>


                        <td
                            style="
                                padding:14px;
                                color:#80ffdb;
                            "
                        >
                            ${item.total.toFixed(2)}
                            EGP
                        </td>


                        <td
                            style="
                                padding:14px;
                                color:#38bdf8;
                            "
                        >
                            ${item.paid.toFixed(2)}
                            EGP
                        </td>


                        <td
                            style="
                                padding:14px;
                                color:#ff8fa3;
                            "
                        >
                            ${item.remain.toFixed(2)}
                            EGP
                        </td>

                    </tr>

                `;

            }

        }
    );



    /* =====================================================
       TOP SERVICE
    ===================================================== */

    const topService =
        document.getElementById(
            "topService"
        );


    if(topService){

        topService.innerText =
            topName;

    }



    /* =====================================================
       SERVICES COUNT
    ===================================================== */

    const servicesCount =
        document.getElementById(
            "servicesCount"
        );


    if(servicesCount){

        servicesCount.innerText =
            totalServices;

    }



    /* =====================================================
       CHART
    ===================================================== */

    const labels =
        Object.keys(
            stats
        );


    const values =
        labels.map(
            name =>
                stats[name].count
        );



    /* =====================================================
       DESTROY OLD CHART
    ===================================================== */

    if(
        window.servicesChart &&
        typeof
        window.servicesChart.destroy ===
        "function"
    ){

        window.servicesChart.destroy();

        window.servicesChart =
            null;

    }



    /* =====================================================
       CREATE CHART
    ===================================================== */

    if(
        !canvas ||
        typeof Chart ===
        "undefined"
    ){

        return;

    }



    window.servicesChart =

        new Chart(

            canvas,

            {

                type:
                    "bar",


                data: {

                    labels,

                    datasets: [

                        {

                            label:
                                "عدد مرات الخدمة",

                            data:
                                values,

                            borderWidth:
                                1

                        }

                    ]

                },


                options: {

                    responsive:
                        true,


                    plugins: {

                        legend: {

                            labels: {

                                color:
                                    "white"

                            }

                        }

                    },


                    scales: {

                        x: {

                            ticks: {

                                color:
                                    "white"

                            }

                        },


                        y: {

                            ticks: {

                                color:
                                    "white"

                            }

                        }

                    }

                }

            }

        );

}
// ==========================
// AGE ANALYTICS
// ==========================

async function getUserId() {
    const { data } = await supabaseClient.auth.getUser();
    return data.user.id;
}


window.addEventListener("load", async () => {

   

    loadCurrentMonthDashboard();
    loadFinancialDashboard();
    loadDailyDashboard();
    loadMonthlyComparison();
  

    // 🔥 استدعاء واحد فقط
    await loadServicesAnalytics();
});


// احصائيات العمر 
// ═══════════════════════════════════════
//  AGE & GENDER STATISTICS
//  Unified Time Filter
// ═══════════════════════════════════════

/* ─────────────────────────────────────
   CALCULATE AGE
───────────────────────────────────── */
function calculateAge(birthDate) {
    if (!birthDate) return 0;

    const today = new Date();
    const birth = new Date(birthDate);

    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();

    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }

    return age;
}


/* ─────────────────────────────────────
   GET DATE RANGE (shared helper)
───────────────────────────────────── */
/* ─────────────────────────────────────
   GET DATE RANGE
   FROM → TO
───────────────────────────────────── */
function getDateRange() {

    const now = new Date();

    const fromInput =
        document.getElementById("dateFrom")?.value;

    const toInput =
        document.getElementById("dateTo")?.value;


    let fromDate = null;
    let toDate = null;


    /* ================================
       FROM
    ================================ */

    if(fromInput){

        fromDate =
            new Date(fromInput);

        fromDate.setHours(
            0,0,0,0
        );

    }


    /* ================================
       TO
    ================================ */

    if(toInput){

        toDate =
            new Date(toInput);

        toDate.setHours(
            23,59,59,999
        );

    }


    return {
        fromDate,
        toDate
    };

}


/* ─────────────────────────────────────
   TOGGLE CUSTOM RANGE INPUTS
───────────────────────────────────── */


/* ─────────────────────────────────────
   LOAD BOTH STATS
───────────────────────────────────── */
/* ─────────────────────────────────────
   LOAD BOTH STATS
───────────────────────────────────── */
async function loadStats(){

    await loadAgeStats();

    await loadGenderStatistics();

}

/* ─────────────────────────────────────
   SET DEFAULT DATE RANGE
   CURRENT MONTH
───────────────────────────────────── */
function setDefaultStatsDates(){

    const now = new Date();


    /* ================================
       FIRST DAY OF CURRENT MONTH
    ================================ */

    const firstDay =
        new Date(
            now.getFullYear(),
            now.getMonth(),
            1
        );


    /* ================================
       TODAY
    ================================ */

    const today =
        new Date();


    const formatDate =
        date => {

            const year =
                date.getFullYear();

            const month =
                String(
                    date.getMonth() + 1
                ).padStart(2,"0");

            const day =
                String(
                    date.getDate()
                ).padStart(2,"0");

            return `${year}-${month}-${day}`;

        };


    const fromInput =
        document.getElementById(
            "dateFrom"
        );


    const toInput =
        document.getElementById(
            "dateTo"
        );


    if(fromInput){

        fromInput.value =
            formatDate(firstDay);

    }


    if(toInput){

        toInput.value =
            formatDate(today);

    }

}

/* ─────────────────────────────────────
   AGE STATISTICS
───────────────────────────────────── */
async function loadAgeStats() {

    const userId = await getUserId();
    if (!userId) return;

    const { fromDate, toDate } = getDateRange();

    let query = supabaseClient
        .from("patients")
        .select("birth_date, created_at")
        .eq("user_id", userId);

    if (fromDate) {
        query = query.gte("created_at", fromDate.toISOString());
    }
    if (toDate) {
        query = query.lte("created_at", toDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
        console.error("Age Stats Error:", error);
        return;
    }

    let groups = {
        "0-10": 0,
        "11-20": 0,
        "21-40": 0,
        "41-60": 0,
        "60+": 0
    };

    data.forEach(p => {
        if (!p.birth_date) return;

        const age = calculateAge(p.birth_date);

        if (age <= 10) groups["0-10"]++;
        else if (age <= 20) groups["11-20"]++;
        else if (age <= 40) groups["21-40"]++;
        else if (age <= 60) groups["41-60"]++;
        else groups["60+"]++;
    });

    document.getElementById("ageStats").innerHTML = `
        <tr>
            <td><div class="table-badge blue">👶 Kids</div></td>
            <td>0 - 10</td>
            <td class="count">${groups["0-10"]}</td>
        </tr>
        <tr>
            <td><div class="table-badge green">🧑 Young</div></td>
            <td>11 - 20</td>
            <td class="count">${groups["11-20"]}</td>
        </tr>
        <tr>
            <td><div class="table-badge purple">👨 Adults</div></td>
            <td>21 - 40</td>
            <td class="count">${groups["21-40"]}</td>
        </tr>
        <tr>
            <td><div class="table-badge orange">🧔 Middle</div></td>
            <td>41 - 60</td>
            <td class="count">${groups["41-60"]}</td>
        </tr>
        <tr>
            <td><div class="table-badge red">👴 Seniors</div></td>
            <td>60+</td>
            <td class="count">${groups["60+"]}</td>
        </tr>
    `;
}


/* ─────────────────────────────────────
   GENDER STATISTICS CHART
───────────────────────────────────── */
let genderStatisticsChart = null;

async function loadGenderStatistics() {

    try {
        const userId = await getUserId();
        if (!userId) {
            console.warn("Gender Statistics: user not found");
            return;
        }

        const { fromDate, toDate } = getDateRange();

        let query = supabaseClient
            .from("patients")
            .select("gender, created_at")
            .eq("user_id", userId);

        if (fromDate) {
            query = query.gte("created_at", fromDate.toISOString());
        }
        if (toDate) {
            query = query.lte("created_at", toDate.toISOString());
        }

        const { data, error } = await query;

        if (error) {
            console.error("Gender Statistics Error:", error);
            return;
        }

        const patients = data || [];
        const total = patients.length;

        const males = patients.filter(p => p.gender === "Male").length;
        const females = patients.filter(p => p.gender === "Female").length;
        const knownGenderTotal = males + females;

        const malePercent = knownGenderTotal > 0 ? (males / knownGenderTotal) * 100 : 0;
        const femalePercent = knownGenderTotal > 0 ? (females / knownGenderTotal) * 100 : 0;

        // Update total UI
        const totalElement = document.getElementById("genderTotalPatients");
        if (totalElement) {
            totalElement.textContent = total;
        }

        // Canvas
        const canvas = document.getElementById("genderStatisticsChart");
        if (!canvas) {
            console.warn("genderStatisticsChart canvas not found");
            return;
        }

        const ctx = canvas.getContext("2d");

        // Destroy old chart
        if (genderStatisticsChart) {
            genderStatisticsChart.destroy();
        }

        // Create new chart
        genderStatisticsChart = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: ["Male", "Female"],
                datasets: [{
                    data: [males, females],
                    backgroundColor: ["#38bdf8", "#f472b6"],
                    borderColor: ["#0f172a", "#0f172a"],
                    borderWidth: 4,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "65%",
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: {
                            color: "#e2e8f0",
                            padding: 20,
                            font: { size: 14, weight: "600" }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                const percentage = knownGenderTotal > 0
                                    ? (value / knownGenderTotal) * 100
                                    : 0;
                                return ` ${context.label}: ${value} Patients (${percentage.toFixed(1)}%)`;
                            }
                        }
                    }
                }
            }
        });

        console.log("👥 Gender Statistics:", {
            fromDate, toDate, total, males, females, malePercent, femalePercent
        });

    } catch (error) {
        console.error("loadGenderStatistics:", error);
    }
}


/* ─────────────────────────────────────
   INIT
───────────────────────────────────── */
document.addEventListener(
    "DOMContentLoaded",
    () => {

        setDefaultStatsDates();

        loadStats();

    }
);
/* =====================================================
   VISITS STATISTICS
===================================================== */

let visitsStatisticsChart = null;


/* =====================================================
   VISITS STATISTICS
   EGYPT TIME — Africa/Cairo
===================================================== */

async function loadVisitsStatistics(){

    try{

        /* =================================================
           GET DATE INPUTS
        ================================================= */

        const fromInput =
            document.getElementById(
                "visitsStatisticsFrom"
            );


        const toInput =
            document.getElementById(
                "visitsStatisticsTo"
            );


        if(!fromInput || !toInput){

            console.error(
                "❌ Visits statistics date inputs not found"
            );

            return;

        }


        const fromValue =
            fromInput.value;


        const toValue =
            toInput.value;


        console.log(
            "🇪🇬 Selected dates:",
            {
                from: fromValue,
                to: toValue
            }
        );


        /* =================================================
           VALIDATION
        ================================================= */

        if(!fromValue || !toValue){

            console.warn(
                "⚠️ Visits statistics dates are empty"
            );

            return;

        }


        if(fromValue > toValue){

            alert(
                "تاريخ البداية يجب أن يكون قبل أو مساويًا لتاريخ النهاية."
            );

            return;

        }


        /* =================================================
           GET USER
        ================================================= */

        const userId =
            await getUserId();


        if(!userId){

            console.warn(
                "❌ Visits Statistics: user not found"
            );

            return;

        }


        /* =================================================
           EGYPT TIME RANGE
           
           مثال:
           
           FROM = 2026-08-01
           TO   = 2026-08-15
           
           QUERY:
           
           >= 2026-08-01 00:00 Egypt
           
           <
           2026-08-16 00:00 Egypt
           
           وبالتالي يوم 15 بالكامل محسوب.
        ================================================= */

        const [
            fromYear,
            fromMonth,
            fromDay
        ] =
        fromValue
            .split("-")
            .map(Number);


        const [
            toYear,
            toMonth,
            toDay
        ] =
        toValue
            .split("-")
            .map(Number);


        /* =================================================
           HELPER
           تحويل تاريخ/وقت مصر إلى UTC
           
           مصر في 2026 تستخدم UTC+3 خلال التوقيت الصيفي.
           
           لكننا لا نفترض +3 يدويًا،
           بل نترك JavaScript يحسب التوقيت المحلي
           للمستخدم ثم نثبت النطاق بطريقة صحيحة.
        ================================================= */

        function createEgyptDate(
            year,
            month,
            day
        ){

            /*
             * نستخدم UTC ثم نطرح فرق مصر الحالي.
             */

            const utcBase =
                new Date(
                    Date.UTC(
                        year,
                        month - 1,
                        day,
                        0,
                        0,
                        0,
                        0
                    )
                );


            const egyptFormatter =
                new Intl.DateTimeFormat(
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

                        second:
                            "2-digit",

                        hourCycle:
                            "h23"
                    }
                );


            const parts =
                egyptFormatter.formatToParts(
                    utcBase
                );


            const values = {};


            parts.forEach(
                part => {

                    if(
                        part.type !==
                        "literal"
                    ){

                        values[
                            part.type
                        ] =
                            Number(
                                part.value
                            );

                    }

                }
            );


            const cairoTimeAsUTC =
                Date.UTC(

                    values.year,

                    values.month - 1,

                    values.day,

                    values.hour,

                    values.minute,

                    values.second

                );


            const offset =
                cairoTimeAsUTC -
                utcBase.getTime();


            return new Date(
                utcBase.getTime() -
                offset
            );

        }


        /* =================================================
           START DATE
           
           بداية اليوم في مصر
        ================================================= */

        const fromDate =
            createEgyptDate(
                fromYear,
                fromMonth,
                fromDay
            );


        /* =================================================
           END DATE
           
           نستخدم بداية اليوم التالي
           
           مثال:
           TO = 15
           
           END =
           16 00:00:00
           
           ثم نستخدم < وليس <=
           
           وبالتالي كل يوم 15 يدخل.
        ================================================= */

        const nextDay =
            new Date(
                Date.UTC(
                    toYear,
                    toMonth - 1,
                    toDay + 1
                )
            );


        const toDate =
            createEgyptDate(
                nextDay.getUTCFullYear(),
                nextDay.getUTCMonth() + 1,
                nextDay.getUTCDate()
            );


        /* =================================================
           DEBUG
        ================================================= */

        console.log(
            "🇪🇬 Visits Statistics Query Range:",
            {

                selectedFrom:
                    fromValue,

                selectedTo:
                    toValue,

                fromUTC:
                    fromDate.toISOString(),

                toUTC:
                    toDate.toISOString(),

                fromEgypt:
                    fromDate.toLocaleString(
                        "en-GB",
                        {
                            timeZone:
                                "Africa/Cairo"
                        }
                    ),

                toEgypt:
                    toDate.toLocaleString(
                        "en-GB",
                        {
                            timeZone:
                                "Africa/Cairo"
                        }
                    )

            }
        );


        /* =================================================
           QUERY
        ================================================= */

        const {
            data,
            error
        } =
        await supabaseClient

            .from(
                "patient_visits"
            )

            .select(
                `
                id,
                visit_result,
                appointment_start
                `
            )

            .eq(
                "user_id",
                userId
            )

            /*
             * بداية الفترة INCLUDED
             */

            .gte(
                "appointment_start",
                fromDate.toISOString()
            )

            /*
             * بداية اليوم التالي EXCLUDED
             *
             * لذلك يوم النهاية كامل.
             */

            .lt(
                "appointment_start",
                toDate.toISOString()
            )

            .order(
                "appointment_start",
                {
                    ascending:
                        false
                }
            );


        /* =================================================
           ERROR
        ================================================= */

        if(error){

            console.error(
                "❌ Visits Statistics Error:",
                error
            );

            return;

        }


        /* =================================================
           DATA
        ================================================= */

        const visits =
            data || [];


        console.log(
            "📊 Visits returned from Supabase:",
            visits
        );


        const total =
            visits.length;


        /* =================================================
           STATUS
        ================================================= */

        const completed =
            visits.filter(
                visit =>
                    visit.visit_result ===
                    "completed"
            ).length;


        const waiting =
            visits.filter(
                visit =>
                    visit.visit_result ===
                    "waiting"
            ).length;


        const incomplete =
            Math.max(

                total -
                completed -
                waiting,

                0

            );


        /* =================================================
           PERCENTAGES
        ================================================= */

        const completedPercent =
            total > 0

                ?

            (
                completed /
                total
            ) * 100

                :

            0;


        const waitingPercent =
            total > 0

                ?

            (
                waiting /
                total
            ) * 100

                :

            0;


        const incompletePercent =
            total > 0

                ?

            (
                incomplete /
                total
            ) * 100

                :

            0;


        /* =================================================
           UPDATE COUNTERS
        ================================================= */

        const completedCountElement =
            document.getElementById(
                "completedVisitsCount"
            );


        const completedPercentElement =
            document.getElementById(
                "completedVisitsPercent"
            );


        const waitingCountElement =
            document.getElementById(
                "waitingVisitsCount"
            );


        const waitingPercentElement =
            document.getElementById(
                "waitingVisitsPercent"
            );


        const incompleteCountElement =
            document.getElementById(
                "incompleteVisitsCount"
            );


        const incompletePercentElement =
            document.getElementById(
                "incompleteVisitsPercent"
            );


        const totalElement =
            document.getElementById(
                "totalVisitsStatistics"
            );


        if(completedCountElement){

            completedCountElement.textContent =
                completed;

        }


        if(completedPercentElement){

            completedPercentElement.textContent =
                `${completedPercent.toFixed(1)}%`;

        }


        if(waitingCountElement){

            waitingCountElement.textContent =
                waiting;

        }


        if(waitingPercentElement){

            waitingPercentElement.textContent =
                `${waitingPercent.toFixed(1)}%`;

        }


        if(incompleteCountElement){

            incompleteCountElement.textContent =
                incomplete;

        }


        if(incompletePercentElement){

            incompletePercentElement.textContent =
                `${incompletePercent.toFixed(1)}%`;

        }


        if(totalElement){

            totalElement.textContent =
                total;

        }


        /* =================================================
           CANVAS
        ================================================= */

        const canvas =
            document.getElementById(
                "visitsStatisticsChart"
            );


        if(!canvas){

            console.warn(
                "⚠️ visitsStatisticsChart canvas not found"
            );

            return;

        }


        if(
            typeof Chart ===
            "undefined"
        ){

            console.error(
                "❌ Chart.js is not loaded"
            );

            return;

        }


        const ctx =
            canvas.getContext(
                "2d"
            );


        /* =================================================
           DESTROY OLD CHART
        ================================================= */

        if(visitsStatisticsChart){

            visitsStatisticsChart.destroy();

            visitsStatisticsChart =
                null;

        }


        /* =================================================
           CREATE CHART
        ================================================= */

        visitsStatisticsChart =
            new Chart(
                ctx,
                {

                    type:
                        "doughnut",


                    data:{

                        labels:[

                            "Completed Visits",

                            "Waiting Visits",

                            "Incomplete Visits"

                        ],


                        datasets:[

                            {

                                data:[

                                    completed,

                                    waiting,

                                    incomplete

                                ],


                                backgroundColor:[

                                    "#22c55e",

                                    "#facc15",

                                    "#ef4444"

                                ],


                                borderColor:[

                                    "#162033",

                                    "#162033",

                                    "#162033"

                                ],


                                borderWidth:
                                    4,


                                hoverOffset:
                                    10

                            }

                        ]

                    },


                    options:{

                        responsive:
                            true,


                        maintainAspectRatio:
                            false,


                        cutout:
                            "65%",


                        plugins:{

                            legend:{

                                position:
                                    "bottom",


                                labels:{

                                    color:
                                        "#e2e8f0",


                                    padding:
                                        18,


                                    font:{

                                        size:
                                            13,

                                        weight:
                                            "600"

                                    }

                                }

                            },


                            tooltip:{

                                callbacks:{

                                    label:
                                        function(
                                            context
                                        ){

                                            const value =
                                                Number(
                                                    context.raw ||
                                                    0
                                                );


                                            const percentage =
                                                total > 0

                                                    ?

                                                (
                                                    value /
                                                    total
                                                ) * 100

                                                    :

                                                0;


                                            return `
                                                ${context.label}:
                                                ${value} Visits
                                                (${percentage.toFixed(1)}%)
                                            `;

                                        }

                                }

                            }

                        }

                    }

                }

            );


        /* =================================================
           FINAL LOG
        ================================================= */

        console.log(
            "✅ Visits Statistics loaded:",
            {

                total,

                completed,

                waiting,

                incomplete,

                from:
                    fromValue,

                to:
                    toValue

            }
        );

    }


    catch(error){

        console.error(
            "❌ loadVisitsStatistics:",
            error
        );

    }

}
/* =====================================================
   REMAINING MONEY TRACKING
   نفس منطق Daily / Monthly Dashboard
===================================================== */


/* =====================================================
   FORMAT MONEY
===================================================== */

function formatRemainingMoney(amount){

    return Number(amount || 0)
        .toLocaleString(
            "en-US",
            {
                minimumFractionDigits:2,
                maximumFractionDigits:2
            }
        ) + " EGP";

}


/* =====================================================
   GET DATE RANGE
   نفس نطاق Daily / Monthly Dashboard
   باستخدام UTC
===================================================== */

function getRemainingDateRange(period){

    const now = new Date();

    let from;
    let to;


    /* =========================
       ALL TIME
    ========================= */

    if(period === "all"){

        return {
            from: null,
            to: null
        };

    }


    /* =========================
       TODAY
    ========================= */

    if(period === "today"){

        const todayStart =
            new Date(
                Date.UTC(
                    now.getUTCFullYear(),
                    now.getUTCMonth(),
                    now.getUTCDate(),
                    0,0,0
                )
            );

        const tomorrowStart =
            new Date(
                Date.UTC(
                    now.getUTCFullYear(),
                    now.getUTCMonth(),
                    now.getUTCDate() + 1,
                    0,0,0
                )
            );

        from = todayStart.toISOString();
        to = tomorrowStart.toISOString();

    }


    /* =========================
       MONTH
    ========================= */

    else{

        const startOfMonth =
            new Date(
                Date.UTC(
                    now.getUTCFullYear(),
                    now.getUTCMonth(),
                    1,
                    0,0,0
                )
            );

        const startOfNextMonth =
            new Date(
                Date.UTC(
                    now.getUTCFullYear(),
                    now.getUTCMonth() + 1,
                    1,
                    0,0,0
                )
            );

        from = startOfMonth.toISOString();
        to = startOfNextMonth.toISOString();

    }


    return {
        from,
        to
    };

}


/* =====================================================
   CACHE
===================================================== */

const remainingTrackingCache = {

    today:null,

    month:null,

    all:null

};


/* =====================================================
   LOAD REMAINING TRACKING
   نفس منطق Daily / Monthly
===================================================== */

async function loadRemainingTracking(period){

    try{

        /* =================================================
           USER
        ================================================= */

        const userId =
            await getUserId();


        if(!userId){

            console.warn(
                "Remaining tracking: user not found"
            );

            return null;

        }


        /* =================================================
           CACHE
        ================================================= */

        const cache =
            remainingTrackingCache[period];


        if(cache){

            renderRemainingHover(
                period,
                cache
            );

            return cache;

        }


        /* =================================================
           DATE RANGE
        ================================================= */

        const {
            from,
            to
        } =
        getRemainingDateRange(period);


        /* =================================================
           SERVICES
           
           نحتاج:
           - السعر الأصلي
           - الخصم
           - بيانات الخدمة
        ================================================= */

        let servicesQuery =
            supabaseClient

                .from("patientt_services")

                .select(`
                    id,
                    visit_id,
                    service_name,
                    total_amount,
                    discount_amount
                `)

                .eq(
                    "user_id",
                    userId
                );


        /* =================================================
           DATE FILTER

           ALL = بدون فلترة تاريخ
        ================================================= */

        if(from && to){

            servicesQuery =
                servicesQuery

                    .gte(
                        "created_at",
                        from
                    )

                    .lt(
                        "created_at",
                        to
                    );

        }


        /* =================================================
           EXECUTE SERVICES QUERY
        ================================================= */

        const {

            data: services,

            error: servicesError

        } =
        await servicesQuery;


        if(servicesError){

            console.error(
                "Remaining services error:",
                servicesError
            );

            return null;

        }


        /* =================================================
           CURRENT SERVICES
        ================================================= */

        const currentServices =
            services || [];


        /* =================================================
           SERVICE IDS
        ================================================= */

        const serviceIds =
            currentServices

                .map(
                    service =>
                        service.id
                )

                .filter(Boolean);


        /* =================================================
           PAYMENTS MAP
           
           نجمع كل المدفوعات الخاصة
           بالخدمات الموجودة في الفترة.
        ================================================= */

        const paidMap = {};


        if(serviceIds.length){

            const {

                data: payments,

                error: paymentsError

            } =
            await supabaseClient

                .from(
                    "patient_service_payments"
                )

                .select(`
                    service_id,
                    amount
                `)

                .in(
                    "service_id",
                    serviceIds
                );


            if(paymentsError){

                console.error(
                    "Remaining payments error:",
                    paymentsError
                );

            }


            (payments || []).forEach(
                payment => {

                    const serviceId =
                        payment.service_id;


                    if(!paidMap[serviceId]){

                        paidMap[serviceId] =
                            0;

                    }


                    paidMap[serviceId] +=
                        Math.max(
                            Number(
                                payment.amount || 0
                            ),
                            0
                        );

                }
            );

        }


        /* =================================================
           CALCULATE FINANCIALS
           
           ORIGINAL
           = total_amount

           DISCOUNT
           = discount_amount

           DUE
           = total_amount - discount_amount

           PAID
           = جميع المدفوعات

           REMAINING
           = DUE - PAID
        ================================================= */

        const servicesWithFinancials = [];


        /* =================================================
           TOTALS
           
           مهم:
           لا نجمع أي شيء هنا إلا بعد التأكد
           أن الخدمة لديها مبلغ متبقي.
        ================================================= */

        let totalAmount =
            0;


        let paidAmount =
            0;


        let remainingAmount =
            0;


        /* =================================================
           PROCESS SERVICES
        ================================================= */

        currentServices.forEach(
            service => {

                /* =========================================
                   ORIGINAL PRICE
                ========================================= */

                const total =
                    Math.max(
                        Number(
                            service.total_amount || 0
                        ),
                        0
                    );


                /* =========================================
                   DISCOUNT
                ========================================= */

                let discount =
                    Number(
                        service.discount_amount || 0
                    );


                if(
                    !Number.isFinite(
                        discount
                    )
                ){

                    discount =
                        0;

                }


                discount =
                    Math.min(
                        Math.max(
                            discount,
                            0
                        ),
                        total
                    );


                /* =========================================
                   DUE AFTER DISCOUNT

                   مثال:

                   1000
                   - 200 discount
                   = 800
                ========================================= */

                const due =
                    Math.max(
                        total -
                        discount,
                        0
                    );


                /* =========================================
                   ALL PAYMENTS
                ========================================= */

                const allPaid =
                    Math.max(
                        Number(
                            paidMap[
                                service.id
                            ] || 0
                        ),
                        0
                    );


                /* =========================================
                   PAID

                   لا نسمح للمدفوع أن يتجاوز
                   المستحق بعد الخصم.
                ========================================= */

                const paid =
                    Math.min(
                        due,
                        allPaid
                    );


                /* =========================================
                   REMAINING

                   المستحق بعد الخصم
                   -
                   المدفوع
                ========================================= */

                const remaining =
                    Math.max(
                        due -
                        paid,
                        0
                    );


                /* =========================================
                   IMPORTANT

                   لا نضيف الخدمة للإحصائيات
                   إلا إذا كان عليها مبلغ متبقي.
                ========================================= */

                if(remaining <= 0){

                    return;

                }


                /* =========================================
                   ADD ONLY REMAINING SERVICES
                   TO STATISTICS
                ========================================= */

                totalAmount +=
                    due;


                paidAmount +=
                    paid;


                remainingAmount +=
                    remaining;


                /* =========================================
                   SAVE SERVICE
                ========================================= */

                servicesWithFinancials.push({

                    ...service,

                    total:
                        due,

                    discount,

                    paid,

                    remaining

                });

            }
        );


        /* =================================================
           NO REMAINING SERVICES
        ================================================= */

        if(
            !servicesWithFinancials.length
        ){

            const emptyResult = {

                patients: 0,

                total: 0,

                paid: 0,

                remaining: 0,

                sources: []

            };


            remainingTrackingCache[period] =
                emptyResult;


            renderRemainingHover(
                period,
                emptyResult
            );


            return emptyResult;

        }


        /* =================================================
           VISITS
           
           نجيب الزيارات الخاصة بالخدمات
           التي عليها متبقي فقط.
        ================================================= */

        const visitIds =

            servicesWithFinancials

                .map(
                    service =>
                        service.visit_id
                )

                .filter(Boolean);


        let visits = [];


        if(visitIds.length){

            const {

                data: visitsData,

                error: visitsError

            } =
            await supabaseClient

                .from(
                    "patient_visits"
                )

                .select(`
                    id,
                    patient_id,
                    appointment_start,
                    department_name
                `)

                .in(
                    "id",
                    visitIds
                );


            if(visitsError){

                console.error(
                    "Remaining visits error:",
                    visitsError
                );

            }
            else{

                visits =
                    visitsData || [];

            }

        }


        /* =================================================
           PATIENT IDS
           
           فقط مرضى الخدمات التي عليها متبقي.
        ================================================= */

        const patientIds = [

            ...new Set(

                visits

                    .map(
                        visit =>
                            visit.patient_id
                    )

                    .filter(Boolean)

            )

        ];


        /* =================================================
           PATIENTS
        ================================================= */

        let patients = [];


        if(patientIds.length){

            const {

                data: patientsData,

                error: patientsError

            } =
            await supabaseClient

                .from(
                    "patients"
                )

                .select(
                    "id,full_name"
                )

                .in(
                    "id",
                    patientIds
                );


            if(patientsError){

                console.error(
                    "Remaining patients error:",
                    patientsError
                );

            }
            else{

                patients =
                    patientsData || [];

            }

        }


        /* =================================================
           VISIT MAP
        ================================================= */

        const visitMap = {};


        visits.forEach(
            visit => {

                visitMap[
                    visit.id
                ] =
                    visit;

            }
        );


        /* =================================================
           PATIENT MAP
        ================================================= */

        const patientMap = {};


        patients.forEach(
            patient => {

                patientMap[
                    patient.id
                ] =
                    patient.full_name ||
                    "Unknown Patient";

            }
        );


        /* =================================================
           BUILD SOURCES
           
           كل source هنا مضمون أن لديه
           remaining > 0
        ================================================= */

        const sources = [];


        servicesWithFinancials.forEach(
            service => {

                const visit =
                    visitMap[
                        service.visit_id
                    ];


                const patientId =
                    visit?.patient_id;


                sources.push({

                    serviceId:
                        service.id,

                    visitId:
                        service.visit_id,

                    patientId,

                    patientName:
                        patientMap[
                            patientId
                        ] ||
                        "Unknown Patient",

                    serviceName:
                        service.service_name ||
                        "Dental Service",

                    visitDate:
                        visit?.appointment_start,

                    department:
                        visit?.department_name ||
                        "غير محددة",

                    /* المستحق بعد الخصم */
                    total:
                        service.total,

                    /* المدفوع */
                    paid:
                        service.paid,

                    /* المتبقي */
                    remaining:
                        service.remaining

                });

            }
        );


        /* =================================================
           UNIQUE PATIENTS
           
           عدد المرضى الذين لديهم خدمات
           عليها مبالغ متبقية فقط.
        ================================================= */

        const uniquePatients =

            new Set(

                sources

                    .map(
                        source =>
                            source.patientId
                    )

                    .filter(Boolean)

            );


        /* =================================================
           FINAL RESULT
        ================================================= */

        const result = {

            patients:
                uniquePatients.size,

            /* إجمالي المستحق بعد الخصم
               للخدمات التي عليها متبقي فقط */
            total:
                totalAmount,

            /* إجمالي المدفوع لهذه الخدمات فقط */
            paid:
                paidAmount,

            /* إجمالي المتبقي */
            remaining:
                remainingAmount,

            /* مصادر المبالغ المتبقية فقط */
            sources

        };


        /* =================================================
           CACHE
        ================================================= */

        remainingTrackingCache[period] =
            result;


        /* =================================================
           RENDER
        ================================================= */

        renderRemainingHover(
            period,
            result
        );


        return result;


    }

    catch(error){

        console.error(
            "Remaining tracking error:",
            error
        );

        return null;

    }

}
/* =====================================================
   RENDER HOVER DETAILS
===================================================== */

function renderRemainingHover(
    period,
    data
){

    const prefix =
    period === "today"
        ? "today"
        : period === "month"
            ? "monthly"
            : "all";


    const patientsElement =
        document.getElementById(
            `${prefix}RemainingPatients`
        );


    const totalElement =
        document.getElementById(
            `${prefix}RemainingTotal`
        );


    const paidElement =
        document.getElementById(
            `${prefix}RemainingPaid`
        );


    const amountElement =
        document.getElementById(
            `${prefix}RemainingAmount`
        );


    const sourcesElement =
        document.getElementById(
            `${prefix}RemainingSources`
        );


    if(patientsElement){

        patientsElement.textContent =
            data?.patients || 0;

    }


    if(totalElement){

        totalElement.textContent =
            formatRemainingMoney(
                data?.total || 0
            );

    }


    if(paidElement){

        paidElement.textContent =
            formatRemainingMoney(
                data?.paid || 0
            );

    }


    if(amountElement){

        amountElement.textContent =
            formatRemainingMoney(
                data?.remaining || 0
            );

    }


    if(!sourcesElement) return;


    const sources =
        data?.sources || [];


    if(!sources.length){

        sourcesElement.innerHTML = `

            <div class="remaining-empty">

                <i class="fa-solid fa-circle-check"></i>

                لا توجد مبالغ متبقية
                في هذه الفترة

            </div>

        `;

        return;

    }


    /*
     * ترتيب الأكبر أولاً
     */

    const sortedSources =
        [...sources]
        .sort(
            (a,b) =>
                b.remaining -
                a.remaining
        );


    /*
     * نعرض أول 5 فقط في Hover
     */

    const preview =
        sortedSources.slice(0,5);


    sourcesElement.innerHTML =
        preview.map(source => `

            <div class="remaining-source-item">

                <div class="remaining-source-info">

                    <div class="remaining-source-name">

                        ${escapeRemainingHtml(
                            source.patientName
                        )}

                    </div>

                    <div class="remaining-source-service">

                        ${escapeRemainingHtml(
                            source.serviceName
                        )}

                    </div>

                </div>


                <div class="remaining-source-amount">

                    ${formatRemainingMoney(
                        source.remaining
                    )}

                </div>

            </div>

        `)
        .join("");


    if(sortedSources.length > 5){

        sourcesElement.innerHTML += `

            <div
                style="
                    text-align:center;
                    color:#64748b;
                    font-size:10px;
                    padding:5px;
                "
            >

                + ${sortedSources.length - 5}
                مصادر أخرى

            </div>

        `;

    }

}
/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeRemainingHtml(value){

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
   HOVER EVENTS
===================================================== */

function initRemainingTracking(){

    const todayCard =
        document.getElementById(
            "todayRemainingCard"
        );

    const monthCard =
        document.getElementById(
            "monthlyRemainingCard"
        );

const allCard =
    document.getElementById(
        "allRemainingCard"
    );
    /* =========================
       LOAD IMMEDIATELY
    ========================= */

    loadRemainingTracking("today");

    loadRemainingTracking("month");
loadRemainingTracking("all");

    /* =========================
       REFRESH ON HOVER
    ========================= */

    if(todayCard){

        todayCard.addEventListener(
            "mouseenter",
            () => {

                loadRemainingTracking(
                    "today"
                );

            }
        );

    }


    if(monthCard){

        monthCard.addEventListener(
            "mouseenter",
            () => {

                loadRemainingTracking(
                    "month"
                );

            }
        );

    }

    if(allCard){

    allCard.addEventListener(
        "mouseenter",
        () => {

            loadRemainingTracking("all");

        }
    );

}

}
/* =====================================================
   OPEN REMAINING DETAILS
===================================================== */

async function openRemainingDetails(
    period,
    event
){

    /*
     * منع الـ hover/card من استقبال click
     */

    if(event){

        event.stopPropagation();

    }


    const modal =
        document.getElementById(
            "remainingDetailsModal"
        );


    const title =
        document.getElementById(
            "remainingModalTitle"
        );


    const subtitle =
        document.getElementById(
            "remainingModalSubtitle"
        );


    const body =
        document.getElementById(
            "remainingDetailsBody"
        );


    if(!modal || !body) return;


    if(period === "today"){

    title.textContent =
        "Today Remaining Details";

    subtitle.textContent =
        "تفاصيل مصادر المبالغ المتبقية اليوم";

}
else if(period === "month"){

    title.textContent =
        "Monthly Remaining Details";

    subtitle.textContent =
        "تفاصيل مصادر المبالغ المتبقية هذا الشهر";

}
else{

    title.textContent =
        "Total Remaining Details";

    subtitle.textContent =
        "تفاصيل جميع مصادر المبالغ المتبقية";

}


    modal.classList.add(
        "show"
    );


    body.innerHTML = `

        <div class="remaining-loading">

            <i class="fa-solid fa-spinner fa-spin"></i>

            جاري تحميل التفاصيل...

        </div>

    `;


    const data =
        await loadRemainingTracking(
            period
        );


    if(!data){

        body.innerHTML = `

            <div class="remaining-empty">

                حدث خطأ أثناء تحميل البيانات

            </div>

        `;

        return;

    }


    const sources =
        data.sources || [];


    /* =================================================
       SUMMARY
    ================================================= */

    const summaryHTML = `

        <div class="remaining-modal-summary">

            <div class="remaining-modal-summary-card">

                <span>
                    المرضى
                </span>

                <strong>
                    ${data.patients}
                </strong>

            </div>


            <div class="remaining-modal-summary-card">

                <span>
                    إجمالي المستحق
                </span>

                <strong style="color:#4cc9f0;">
                    ${formatRemainingMoney(
                        data.total
                    )}
                </strong>

            </div>


            <div class="remaining-modal-summary-card">

                <span>
                    إجمالي المدفوع
                </span>

                <strong style="color:#80ffdb;">
                    ${formatRemainingMoney(
                        data.paid
                    )}
                </strong>

            </div>


            <div class="remaining-modal-summary-card">

                <span>
                    إجمالي المتبقي
                </span>

                <strong style="color:#ff8fa3;">
                    ${formatRemainingMoney(
                        data.remaining
                    )}
                </strong>

            </div>

        </div>

    `;


    if(!sources.length){

        body.innerHTML =
            summaryHTML +

            `

            <div class="remaining-empty">

                <i class="fa-solid fa-circle-check"></i>

                لا توجد مبالغ متبقية
                في هذه الفترة

            </div>

            `;

        return;

    }


    /* =================================================
       TABLE
    ================================================= */

    const tableRows =
        sources.map(
            source => `

            <tr>

                <td>

                    <strong>
                        ${escapeRemainingHtml(
                            source.patientName
                        )}
                    </strong>

                </td>


                <td>

                    ${escapeRemainingHtml(
                        source.serviceName
                    )}

                    <div
                        class="remaining-visit-date"
                    >

                        ${
                            source.visitDate
                            ?
                            new Date(
                                source.visitDate
                            ).toLocaleString(
                                "en-GB",
                                {
                                    day:"2-digit",
                                    month:"2-digit",
                                    year:"numeric",
                                    hour:"2-digit",
                                    minute:"2-digit",
                                    hour12:true
                                }
                            )
                            :
                            "-"
                        }

                    </div>

                </td>


                <td>

                    ${escapeRemainingHtml(
                        source.department
                    )}

                </td>


                <td class="total-cell">

                    ${formatRemainingMoney(
                        source.total
                    )}

                </td>


                <td class="paid-cell">

                    ${formatRemainingMoney(
                        source.paid
                    )}

                </td>


                <td class="remaining-cell">

                    ${formatRemainingMoney(
                        source.remaining
                    )}

                </td>

            </tr>

        `
        )
        .join("");


    body.innerHTML =

        summaryHTML +

        `

        <div style="overflow:auto;">

            <table
                class="remaining-details-table"
            >

                <thead>

                    <tr>

                        <th>
                            المريض
                        </th>

                        <th>
                            الخدمة / الزيارة
                        </th>

                        <th>
                            القسم
                        </th>

                        <th>
                            المستحق
                        </th>

                        <th>
                            المدفوع
                        </th>

                        <th>
                            المتبقي
                        </th>

                    </tr>

                </thead>


                <tbody>

                    ${tableRows}

                </tbody>

            </table>

        </div>

        `;

}


/* =====================================================
   CLOSE REMAINING DETAILS
===================================================== */

function closeRemainingDetails(){

    const modal =
        document.getElementById(
            "remainingDetailsModal"
        );


    if(modal){

        modal.classList.remove(
            "show"
        );

    }

}
/* =====================================================
   CLOSE WHEN CLICKING OUTSIDE
===================================================== */

document.addEventListener(
    "click",
    function(event){

        const modal =
            document.getElementById(
                "remainingDetailsModal"
            );


        if(
            modal &&
            event.target === modal
        ){

            closeRemainingDetails();

        }

    }
);

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

window.addEventListener("DOMContentLoaded", () => {

    loadCustomStats();

});