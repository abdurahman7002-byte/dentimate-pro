let currentBillDetails = null;
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

/* =========================
SAVE / UPDATE BILL
========================= */

async function saveBill(){

    const userId = await getUserId();

    const beneficiary =
        document.getElementById("beneficiary")
        .value
        .trim();

    const reason =
        document.getElementById("reason")
        .value
        .trim();

    const amount =
        parseFloat(
            document.getElementById("amount").value
        );

    if(!beneficiary){
        showToast("Beneficiary is required");
        return;
    }

    if(!reason){
        showToast("Reason is required");
        return;
    }

    if(!amount){
        showToast("Amount is required");
        return;
    }

    const payload = {
        user_id: userId,
        beneficiary,
        reason,
        amount
    };

    let error;

    // =========================
    // UPDATE MODE
    // =========================
    if(editingBillId){

        ({ error } = await supabaseClient
            .from("bills")
            .update(payload)
            .eq("id", editingBillId)
        );

        editingBillId = null;

    } else {

        // =========================
        // INSERT MODE
        // =========================
        ({ error } = await supabaseClient
            .from("bills")
            .insert([payload])
        );
    }

    if(error){
        alert(error.message);
        return;
    }

    clearForm();
    loadBills();
    await loadMonthlyBillsDashboard();

    document.querySelector(".save-btn").innerText =
        "Save Bill";
}

/* =========================
EDIT BILL
========================= */

function editBill(bill){

    document.getElementById(
        "billDetailsContent"
    ).innerHTML = `

        <!-- =================================================
             EDIT INVOICE HERO
        ================================================== -->

        <div class="invoice-details-hero edit-mode">

            <div class="invoice-details-icon edit-icon">

                <i class="fa-solid fa-pen-to-square"></i>

            </div>

            <div class="invoice-details-heading">

                <span>
                    EDIT INVOICE
                </span>

                <h4>
                    تعديل الفاتورة
                </h4>

                <p>
                    تعديل بيانات المصروف المالي
                </p>

            </div>

        </div>


        <!-- =================================================
             EDIT FORM
        ================================================== -->

        <div class="invoice-edit-form">


            <!-- BENEFICIARY -->

            <div class="invoice-form-group">

                <label for="editBeneficiary">

                    <span class="form-label-icon">
                        <i class="fa-solid fa-building"></i>
                    </span>

                    <span data-i18n="134">
                        الجهة المستفيدة
                        <small>Beneficiary</small>
                    </span>

                </label>


                <div class="invoice-input-wrapper">

                    <input
                        id="editBeneficiary"
                        type="text"
                        class="invoice-edit-input"
                        value="${escapeHtml(bill.beneficiary || "")}"
                        placeholder="أدخل الجهة المستفيدة"
                        autocomplete="off"
                    >

                    <i class="fa-solid fa-building input-icon"></i>

                </div>

            </div>


            <!-- REASON -->

            <div class="invoice-form-group">

                <label for="editReason">

                    <span class="form-label-icon">
                        <i class="fa-solid fa-align-left"></i>
                    </span>

                    <span data-i18n="133">
                        سبب الدفع
                        <small>Payment Reason</small>
                    </span>

                </label>


                <div class="invoice-input-wrapper textarea-wrapper">

                    <textarea
                        id="editReason"
                        class="invoice-edit-input"
                        placeholder="أدخل سبب الدفع"
                        rows="4"
                    >${escapeHtml(bill.reason || "")}</textarea>

                    <i class="fa-solid fa-pen input-icon"></i>

                </div>

            </div>


            <!-- AMOUNT -->

            <div class="invoice-form-group">

                <label for="editAmount">

                    <span class="form-label-icon amount-label-icon">

                        <i class="fa-solid fa-money-bill-wave"></i>

                    </span>

                    <span data-i18n="132">
                        المبلغ المدفوع
                        <small>Amount</small>
                    </span>

                </label>


                <div class="invoice-input-wrapper amount-input-wrapper">

                    <input
                        id="editAmount"
                        type="number"
                        class="invoice-edit-input amount-input"
                        value="${bill.amount || ""}"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                    >

                    <span class="currency-badge">
                        EGP
                    </span>

                </div>

            </div>


        </div>


        <!-- =================================================
             ACTIONS
        ================================================== -->

        <div class="invoice-edit-actions">

            <button
    type="button"
    class="invoice-cancel-edit-btn"
    onclick="cancelBillEdit()"
>

                <i class="fa-solid fa-xmark"></i>

                <span data-i18n="131">
                    إلغاء
                </span>

            </button>


            <button
                type="button"
                class="invoice-save-edit-btn"
                onclick="updateBill(${bill.id})"
            >

                <span class="save-edit-icon">

                    <i class="fa-solid fa-check"></i>

                </span>

                <span class="save-edit-text">

                    <strong data-i18n="130">
                        حفظ التعديلات
                    </strong>



                </span>

                <i class="fa-solid fa-arrow-left save-edit-arrow"></i>

            </button>

        </div>

    `;

}
function cancelBillEdit(){

    if(!currentBillDetails){
        return;
    }

    showBillDetails(currentBillDetails);

}

async function updateBill(billId){

    const userId =
        await getUserId();

    if(!userId) return;


    const beneficiary =
        document.getElementById(
            "editBeneficiary"
        )?.value.trim();


    const reason =
        document.getElementById(
            "editReason"
        )?.value.trim();


    const amount =
        Number(
            document.getElementById(
                "editAmount"
            )?.value
        );


    if(!beneficiary){

        alert(
            "المستفيد مطلوب"
        );

        return;

    }


    if(!reason){

        alert(
            "السبب مطلوب"
        );

        return;

    }


    if(
        !Number.isFinite(amount)
        ||
        amount <= 0
    ){

        alert(
            "أدخل مبلغًا صحيحًا"
        );

        return;

    }


    const { error } =
        await supabaseClient

        .from("bills")

        .update({

            beneficiary,
            reason,
            amount

        })

        .eq(
            "id",
            billId
        )

        .eq(
            "user_id",
            userId
        );


    if(error){

        console.error(
            "Update bill error:",
            error
        );

        alert(
            "حدث خطأ أثناء التعديل"
        );

        return;

    }


    showToast(
        "تم حفظ التعديلات"
    );


    closeBillDetailsModal();


    await loadBills();

    await loadMonthlyBillsDashboard();

}

/* =========================
CLEAR FORM
========================= */

function clearForm(){

    document.getElementById("beneficiary").value = "";
    document.getElementById("reason").value = "";
    document.getElementById("amount").value = "";
}

/* =========================
   LOAD ALL BILLS
========================= */

/* =========================
   LOAD ALL BILLS
========================= */

async function loadBills(){

    const container =
        document.getElementById(
            "billsContainer"
        );

    if(!container) return;


    /* =========================
       LOADING
    ========================= */

    container.innerHTML = `

        <div style="
            text-align:center;
            padding:30px;
            color:#888;
        ">

            <i class="
                fa-solid
                fa-spinner
                fa-spin
            "></i>

            Loading bills...

        </div>

    `;


    try{

        /* =========================
           USER
        ========================= */

        const userId =
            await getUserId();

        if(!userId){

            container.innerHTML = `

                <p style="
                    text-align:center;
                    color:#888;
                    padding:20px;
                ">

                    User not found

                </p>

            `;

            return;

        }


        /* =========================
           LOAD BILLS
        ========================= */

        const {
            data,
            error
        } =
        await supabaseClient

            .from("bills")

            .select("*")

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


        if(error){

            throw error;

        }


        const allBills =
            data || [];


        /* =========================
           SEARCH
        ========================= */

        const searchText =
            (
                document.getElementById(
                    "billSearch"
                )?.value
                ||
                ""
            )
            .toLowerCase()
            .trim();


        const filteredBills =
            allBills.filter(
                bill => {

                    if(!searchText){

                        return true;

                    }


                    const beneficiary =
                        String(
                            bill.beneficiary
                            ||
                            ""
                        )
                        .toLowerCase();


                    const reason =
                        String(
                            bill.reason
                            ||
                            ""
                        )
                        .toLowerCase();


                    const date =
                        new Date(
                            bill.created_at
                        )
                        .toLocaleDateString()
                        .toLowerCase();


                    const dateTime =
                        new Date(
                            bill.created_at
                        )
                        .toLocaleString()
                        .toLowerCase();


                    return (

                        beneficiary.includes(
                            searchText
                        )

                        ||

                        reason.includes(
                            searchText
                        )

                        ||

                        date.includes(
                            searchText
                        )

                        ||

                        dateTime.includes(
                            searchText
                        )

                    );

                }
            );


        /* =========================
           EMPTY
        ========================= */

        if(!filteredBills.length){

            container.innerHTML = `

                <div style="
                    text-align:center;
                    color:#888;
                    padding:30px;
                ">

                    <i
                        class="
                            fa-solid
                            fa-file-invoice
                        "
                        style="
                            font-size:35px;
                            margin-bottom:12px;
                        "
                    ></i>

                    <p>

                        ${
                            searchText
                            ?
                            "No matching bills found"
                            :
                            "No Bills Found"
                        }

                    </p>

                </div>

            `;

            return;

        }


        /* =========================
           GROUP BY MONTH
        ========================= */

        const groupedBills = {};


        filteredBills.forEach(
            bill => {

                const date =
                    new Date(
                        bill.created_at
                    );


                const year =
                    date.getFullYear();


                const month =
                    date.getMonth();


                const key =
                    `${year}-${String(
                        month + 1
                    ).padStart(2,"0")}`;


                if(
                    !groupedBills[key]
                ){

                    groupedBills[key] = [];

                }


                groupedBills[key].push(
                    bill
                );

            }
        );


        /* =========================
           MONTH NAMES
        ========================= */

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


        /* =========================
           RENDER
        ========================= */

        container.innerHTML =

            Object.entries(
                groupedBills
            )

            .map(
                (
                    [
                        monthKey,
                        bills
                    ],
                    monthIndex
                ) => {


                    const [
                        year,
                        month
                    ] =
                        monthKey
                        .split("-")
                        .map(Number);


                    /* =========================
                       MONTH TOTAL
                    ========================= */

                    const monthTotal =
                        bills.reduce(
                            (
                                sum,
                                bill
                            ) => {

                                return (
                                    sum
                                    +
                                    Number(
                                        bill.amount
                                        ||
                                        0
                                    )
                                );

                            },
                            0
                        );


                    /* =========================
                       MONTH NAME
                    ========================= */

                    const monthName =
                        monthNames[
                            month - 1
                        ];


                    /* =========================
                       OPEN LATEST MONTH
                    ========================= */

                    const openAttribute =
                        monthIndex === 0
                        ?
                        "open"
                        :
                        "";


                    /* =========================
                       BILLS
                    ========================= */

                    const billsHTML =
                        bills
                        .map(
                            bill => {

                                /*
                                IMPORTANT:
                                لا نستخدم escapeHtml
                                حتى لا تتعطل الصفحة
                                إذا لم تكن الدالة موجودة.
                                */

                                const beneficiary =
                                    String(
                                        bill.beneficiary
                                        ||
                                        ""
                                    );


                                const reason =
                                    String(
                                        bill.reason
                                        ||
                                        ""
                                    );


                                const amount =
                                    Number(
                                        bill.amount
                                        ||
                                        0
                                    );


                                const createdAt =
                                    bill.created_at
                                    ?
                                    new Date(
                                        bill.created_at
                                    )
                                    .toLocaleString()
                                    :
                                    "—";


                                return `

                                    <div
                                        class="bill-item"
                                    >

                                        <div
                                            class="bill-info"
                                        >

                                            <div
                                                class="bill-title"
                                            >

                                                ${beneficiary}

                                            </div>


                                            <div>

                                                ${reason}

                                            </div>


                                            <div
                                                class="amount"
                                            >

                                                ${amount.toLocaleString()}

                                                EGP

                                            </div>


                                            <div
                                                class="bill-date"
                                            >

                                                ${createdAt}

                                            </div>

                                        </div>


                                        <div
                                            class="bill-actions"
                                        >

                                            <button
                                                class="details-btn"
                                                onclick='showBillDetails(${JSON.stringify(
                                                    bill
                                                )})'
                                            >

                                                عرض التفاصيل

                                            </button>


                                            <button
                                                class="delete-btn"
                                                onclick="
                                                    deleteBill(
                                                        ${bill.id}
                                                    )
                                                "
                                            >

                                                حذف

                                            </button>

                                        </div>

                                    </div>

                                `;

                            }
                        )
                        .join("");


                    /* =========================
                       MONTH GROUP
                    ========================= */

                    return `

                        <details
                            class="
                                bills-month-group
                            "
                            ${openAttribute}
                        >

                            <summary
                                class="
                                    bills-month-summary
                                "
                            >

                                <div
                                    class="
                                        bills-month-title
                                    "
                                >

                                    <div
                                        class="
                                            bills-month-icon
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

                                            فواتير شهر
                                            ${monthName}
                                            ${year}

                                        </strong>


                                        <span>

                                            ${bills.length}
                                            فاتورة

                                        </span>

                                    </div>

                                </div>


                                <div
                                    class="
                                        bills-month-total
                                    "
                                >

                                    <span>
                                        إجمالي الشهر
                                    </span>


                                    <strong>

                                        ${monthTotal.toLocaleString()}

                                        <small>
                                            EGP
                                        </small>

                                    </strong>


                                    <i
                                        class="
                                            fa-solid
                                            fa-chevron-down
                                            bills-month-arrow
                                        "
                                    ></i>

                                </div>

                            </summary>


                            <div
                                class="
                                    bills-month-content
                                "
                            >

                                ${billsHTML}

                            </div>

                        </details>

                    `;

                }
            )
            .join("");


    }
    catch(error){

        console.error(
            "loadBills error:",
            error
        );


        container.innerHTML = `

            <div style="
                text-align:center;
                color:#ef4444;
                padding:30px;
            ">

                <i
                    class="
                        fa-solid
                        fa-circle-exclamation
                    "
                    style="
                        font-size:35px;
                        margin-bottom:12px;
                    "
                ></i>


                <p>
                    Failed to load bills
                </p>


                <small style="
                    color:#888;
                ">

                    ${
                        error?.message
                        ||
                        "Unknown error"
                    }

                </small>

            </div>

        `;

    }

}
function escapeHtml(value){

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
function showBillDetails(bill){
 currentBillDetails = bill;
    const amount =
        Number(bill.amount || 0)
        .toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

    const createdAt =
        new Date(bill.created_at);

    const date =
        createdAt.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });

    const time =
        createdAt.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit"
        });

  document.getElementById(
    "billDetailsContent"
).innerHTML = `

    <!-- =================================================
         INVOICE HERO
    ================================================== -->

    <div class="invoice-details-hero">

        <div class="invoice-details-icon">

            <i class="fa-solid fa-file-invoice-dollar"></i>

        </div>


        <div class="invoice-details-heading">

            <span>
                INVOICE DETAILS
            </span>

            <h4>
                تفاصيل الفاتورة
            </h4>

            <p>
                بيانات المصروف المالي
            </p>

        </div>

    </div>


    <!-- =================================================
         MAIN DETAILS GRID
    ================================================== -->

    <div class="invoice-details-main">


        <!-- =================================================
             AMOUNT
        ================================================== -->

        <div class="invoice-details-amount-card">

            <div class="invoice-amount-label">

                <span>
                    إجمالي المبلغ
                </span>

                <i class="fa-solid fa-wallet"></i>

            </div>


            <div class="invoice-amount-value">

                ${amount}

                <small>
                    EGP
                </small>

            </div>


            <div class="invoice-amount-line"></div>


            <div class="invoice-amount-status">

                <i class="fa-solid fa-circle-check"></i>

                Expense Recorded

            </div>

        </div>


        <!-- =================================================
             INFORMATION
        ================================================== -->

        <div class="invoice-details-section">

            <div class="invoice-details-section-title">

                <i class="fa-solid fa-circle-info"></i>

                معلومات الفاتورة

            </div>


            <div class="invoice-details-grid">


                <!-- BENEFICIARY -->

                <div class="invoice-detail-item">

                    <div class="invoice-detail-item-icon">

                        <i class="fa-solid fa-building"></i>

                    </div>


                    <div class="invoice-detail-item-content">

                        <span>
                            Beneficiary
                        </span>

                        <strong>
                            ${escapeHtml(
                                bill.beneficiary || "-"
                            )}
                        </strong>

                        <small>
                            الجهة المستفيدة
                        </small>

                    </div>

                </div>


                <!-- REASON -->

                <div class="invoice-detail-item">

                    <div class="invoice-detail-item-icon">

                        <i class="fa-solid fa-align-left"></i>

                    </div>


                    <div class="invoice-detail-item-content">

                        <span>
                            Payment Reason
                        </span>

                        <strong>
                            ${escapeHtml(
                                bill.reason || "-"
                            )}
                        </strong>

                        <small>
                            سبب الدفع
                        </small>

                    </div>

                </div>


                <!-- DATE -->

                <div class="invoice-detail-item">

                    <div class="invoice-detail-item-icon">

                        <i class="fa-solid fa-calendar-days"></i>

                    </div>


                    <div class="invoice-detail-item-content">

                        <span>
                            Created Date
                        </span>

                        <strong>
                            ${date}
                        </strong>

                        <small>
                            تاريخ إنشاء الفاتورة
                        </small>

                    </div>


                    <div class="invoice-detail-time">

                        <i class="fa-regular fa-clock"></i>

                        ${time}

                    </div>

                </div>


            </div>

        </div>

    </div>


    <!-- =================================================
         ACTION
    ================================================== -->

    <div class="bill-detail-actions">

        <button
            type="button"
            class="invoice-edit-btn"
            onclick="editBill(currentBillDetails)"
        >

            <span class="invoice-edit-icon">

                <i class="fa-solid fa-pen-to-square"></i>

            </span>


            <span class="invoice-edit-text">

                <strong>
                    تعديل الفاتورة
                </strong>

                <small>
                    Edit Invoice
                </small>

            </span>


            <i class="fa-solid fa-chevron-left invoice-edit-arrow"></i>

        </button>

    </div>

`;


    document.getElementById(
        "billDetailsModal"
    ).style.display = "flex";

}
/* =========================
   CLOSE BILL DETAILS MODAL
========================= */

function closeBillDetailsModal(){

    const modal =
        document.getElementById("billDetailsModal");

    if(!modal) return;

    modal.style.display = "none";

}
document.getElementById("billDetailsModal")?.addEventListener("click", function (event) {

    if (event.target === this) {
        closeBillDetailsModal();
    }

});
/* =========================
DELETE BILL
========================= */

async function deleteBill(id){

    if(!await showConfirm("Delete Invoice?"))
        return;

    const { error } =
        await supabaseClient
        .from("bills")
        .delete()
        .eq("id", id);

    if(error){
        alert(error.message);
        return;
    }

    loadBills();
    await loadMonthlyBillsDashboard();
}

/* =========================
GO DASHBOARD
========================= */

function goDashboard(){

    window.location.href =
        "dashboard.html";
}

/* =========================
INIT
========================= */

(async () => {

    await loadBills();

    await loadMonthlyBillsDashboard();

})();


async function loadMonthlyBillsDashboard(){

    const userId = await getUserId();

    if(!userId){
        console.log("No user");
        return;
    }

    /* =========================
       MONTH RANGE (UTC SAFE)
    ========================= */

    const now = new Date();

    const startOfMonth = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        1, 0, 0, 0
    ));

    const startOfNextMonth = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth() + 1,
        1, 0, 0, 0
    ));

    /* =========================
       GET BILLS
    ========================= */

    const { data: bills, error } =
        await supabaseClient
        .from("bills")
        .select("amount, created_at")
        .eq("user_id", userId)
        .gte("created_at", startOfMonth.toISOString())
        .lt("created_at", startOfNextMonth.toISOString());

    if(error){
        console.log(error);
        return;
    }

    /* =========================
       CALCULATE TOTAL
    ========================= */

    let totalBills = 0;

    bills?.forEach(bill => {
        totalBills += Number(bill.amount || 0);
    });

    /* =========================
       UI
    ========================= */

   const el = document.getElementById("monthlyBillsTotal");

if(el){
    el.innerHTML = `
        <div class="label">Monthly invoices - اجمالي الفواتير هذا الشهر</div>
        <div class="value">${totalBills.toFixed(2)} EGP</div>
        <div class="label">Total expenses this month</div>
    `;
}
}

window.addEventListener("load", () => {
    loadMonthlyBillsDashboard();
});

