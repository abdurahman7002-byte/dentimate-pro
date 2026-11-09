/* =========================================================
   RELATED VISITS SYSTEM
   ========================================================= */


/* =========================================================
   GLOBAL STATE
   ========================================================= */

let relatedVisitGroupId = null;
let relatedVisitPrimaryId = null;


/* =========================================================
   OPEN ADD RELATED VISIT MODAL
   ========================================================= */

function openAddRelatedVisitModal(
    visitGroupId,
    primaryVisitId
) {

    const modal =
        document.getElementById(
            "addRelatedVisitModal"
        );

    if (!modal) {
        return;
    }


    /* =========================================
       STORE GROUP INFORMATION
    ========================================= */

    window.relatedVisitGroupId =
        visitGroupId;

    window.relatedVisitPrimaryId =
        primaryVisitId;


    /* =========================================
       CHECK GROUP
    ========================================= */

    if (!window.relatedVisitGroupId) {

        alert(
            "لم يتم تحديد مجموعة الزيارات."
        );

        return;
    }


    /* =========================================
       RESET FORM
    ========================================= */

    const form =
        document.getElementById(
            "addRelatedVisitForm"
        );

    if (form) {
        form.reset();
    }


    /* =========================================
       LOAD DEPARTMENTS
    ========================================= */

    loadRelatedVisitDepartments();
initRelatedSlider();

    /* =========================================
       OPEN MODAL
    ========================================= */

    modal.style.display =
        "flex";

}

/* =========================================================
   CLOSE ADD RELATED VISIT MODAL
   ========================================================= */

function closeAddRelatedVisitModal() {

    const modal =
        document.getElementById(
            "addRelatedVisitModal"
        );

    if (modal) {
        modal.style.display = "none";
    }

    document.body.classList.remove(
        "related-modal-open"
    );

    relatedVisitGroupId = null;
    relatedVisitPrimaryId = null;
}


/* =========================================================
   SAVE RELATED VISIT
   ========================================================= */

async function saveRelatedVisit() {

    /* =====================================================
       GET STORED GROUP / PRIMARY VISIT
    ===================================================== */

    let visitGroupId =
        window.relatedVisitGroupId ||
        null;

    let primaryVisitId =
        window.relatedVisitPrimaryId ||
        null;


    /* =====================================================
       IF GROUP IS MISSING
       TRY TO GET IT FROM PRIMARY VISIT
    ===================================================== */

    if (
        !visitGroupId &&
        primaryVisitId
    ) {

        const {
            data: primaryData,
            error: primaryError
        } =
        await supabaseClient

            .from("patient_visits")

            .select(`
                id,
                visit_group_id
            `)

            .eq(
                "id",
                primaryVisitId
            )

            .maybeSingle();


        if (primaryError) {

            console.error(
                "Load primary visit group error:",
                primaryError
            );

            alert(
                primaryError.message
            );

            return;
        }


        if (primaryData) {

            visitGroupId =
                primaryData.visit_group_id;

        }

    }


    /* =====================================================
       IF PRIMARY VISIT HAS NO GROUP
       CREATE NEW GROUP
    ===================================================== */

    if (
        !visitGroupId &&
        primaryVisitId
    ) {

        const newGroupId =
            crypto.randomUUID();


        const {
            error: groupError
        } =
        await supabaseClient

            .from("patient_visits")

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
                primaryVisitId
            );


        if (groupError) {

            console.error(
                "Create visit group error:",
                groupError
            );

            alert(
                groupError.message
            );

            return;
        }


        visitGroupId =
            newGroupId;

    }


    /* =====================================================
       FINAL GROUP CHECK
    ===================================================== */

    if (!visitGroupId) {

        alert(
            "لم يتم تحديد مجموعة الزيارات."
        );

        console.error(
            "Missing visit group:",
            {
                relatedVisitGroupId:
                    window.relatedVisitGroupId,

                relatedVisitPrimaryId:
                    window.relatedVisitPrimaryId
            }
        );

        return;
    }


    /* =====================================================
       STORE AGAIN
       IMPORTANT
    ===================================================== */

    window.relatedVisitGroupId =
        visitGroupId;


    window.relatedVisitPrimaryId =
        primaryVisitId;


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


    if (
        userError ||
        !userData ||
        !userData.user
    ) {

        alert(
            "تعذر تحديد المستخدم الحالي."
        );

        console.error(
            "Get user error:",
            userError
        );

        return;
    }


    const user =
        userData.user;


    /* =====================================================
       GET FORM ELEMENTS
    ===================================================== */

    const titleInput =
        document.getElementById(
            "relatedVisitTitle"
        );


    const departmentSelect =
        document.getElementById(
            "relatedVisitDepartment"
        );


    const startInput =
        document.getElementById(
            "relatedVisitStart"
        );


    const endInput =
        document.getElementById(
            "relatedVisitEnd"
        );


    /* =====================================================
       FORM VALUES
    ===================================================== */

    const visitTitle =
        titleInput?.value.trim() ||
        "Related Visit";


    const departmentId =
        departmentSelect?.value ||
        null;


    const departmentName =
        departmentSelect
            ?.selectedOptions?.[0]
            ?.textContent
            ?.trim() ||
        null;


    const appointmentStart =
        startInput?.value ||
        null;


    const appointmentEnd =
        endInput?.value ||
        null;


    /* =====================================================
       DEPARTMENT VALIDATION
    ===================================================== */

    if (!departmentId) {

        alert(
            "من فضلك اختر القسم."
        );

        return;
    }


    /* =====================================================
       DATE VALIDATION
    ===================================================== */

    if (!appointmentStart) {

        alert(
            "من فضلك اختر موعد بداية الزيارة."
        );

        return;
    }


    if (!appointmentEnd) {

        alert(
            "من فضلك اختر موعد نهاية الزيارة."
        );

        return;
    }


    const startDate =
        new Date(
            appointmentStart
        );


    const endDate =
        new Date(
            appointmentEnd
        );


    if (
        Number.isNaN(
            startDate.getTime()
        ) ||
        Number.isNaN(
            endDate.getTime()
        )
    ) {

        alert(
            "الموعد غير صحيح."
        );

        return;
    }


    if (
        endDate <=
        startDate
    ) {

        alert(
            "وقت نهاية الزيارة يجب أن يكون بعد وقت البداية."
        );

        return;
    }


    /* =====================================================
       PREVENT PAST VISIT
    ===================================================== */

    if (
        startDate <
        new Date()
    ) {

        alert(
            "لا يمكن إنشاء زيارة في وقت سابق للوقت الحالي."
        );

        return;
    }


    /* =====================================================
       GET EXISTING VISITS IN GROUP
    ===================================================== */

    const {
        data: existingGroupVisits,
        error: existingError
    } =
    await supabaseClient

        .from("patient_visits")

        .select(`
            id,
            visit_order
        `)

        .eq(
            "visit_group_id",
            visitGroupId
        )

        .eq(
            "is_deleted",
            false
        )

        .order(
            "visit_order",
            {
                ascending: false
            }
        );


    if (existingError) {

        console.error(
            "Load related visits error:",
            existingError
        );

        alert(
            existingError.message
        );

        return;
    }


    /* =====================================================
       NEXT ORDER
    ===================================================== */

    let nextOrder =
        2;


    if (
        existingGroupVisits &&
        existingGroupVisits.length
    ) {

        const orders =
            existingGroupVisits
                .map(
                    visit =>
                        Number(
                            visit.visit_order ||
                            0
                        )
                )
                .filter(
                    order =>
                        order > 0
                );


        if (orders.length) {

            nextOrder =
                Math.max(
                    ...orders
                ) + 1;

        }

    }


    /* =====================================================
       GET PRIMARY VISIT
    ===================================================== */

    let primaryVisit =
        null;


    if (primaryVisitId) {

        const {
            data,
            error
        } =
        await supabaseClient

            .from("patient_visits")

            .select("*")

            .eq(
                "id",
                primaryVisitId
            )

            .maybeSingle();


        if (error) {

            console.error(
                "Load primary visit error:",
                error
            );

            alert(
                error.message
            );

            return;
        }


        primaryVisit =
            data;

    }


    /* =====================================================
       IF PRIMARY VISIT WAS NOT FOUND
    ===================================================== */

    if (!primaryVisit) {

        alert(
            "تعذر العثور على الزيارة الأساسية."
        );

        return;
    }


    /* =====================================================
       MAKE SURE PATIENT ID EXISTS
    ===================================================== */

    const relatedPatientId =
        primaryVisit.patient_id ||
        patientId ||
        null;


    if (!relatedPatientId) {

        alert(
            "تعذر تحديد المريض."
        );

        return;
    }


    /* =====================================================
       CHECK APPOINTMENT OVERLAP
    ===================================================== */

    const {
        data: existingAppointments,
        error: overlapError
    } =
    await supabaseClient

        .from("patient_visits")

        .select(`
            id,
            appointment_start,
            appointment_end,
            visit_result
        `)

        .eq(
            "user_id",
            user.id
        )

        .eq(
            "department_id",
            departmentId
        )

        .eq(
            "is_deleted",
            false
        )

        .neq(
            "visit_result",
            "cancelled"
        );


    if (overlapError) {

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
            existingAppointments ||
            []
        )
        .some(
            visit => {

                if (
                    !visit.appointment_start ||
                    !visit.appointment_end
                ) {

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
                    startDate <
                    existingEnd
                    &&
                    endDate >
                    existingStart
                );

            }
        );


    if (hasOverlap) {

        alert(
            "يوجد موعد آخر في نفس العيادة خلال هذا الوقت."
        );

        return;
    }


    /* =====================================================
       CREATE RELATED VISIT
    ===================================================== */

    const newVisit = {

        patient_id:
            relatedPatientId,

        user_id:
            user.id,

        visit_group_id:
            visitGroupId,

        visit_order:
            nextOrder,

        is_primary:
            false,

        visit_title:
            visitTitle,

        department_id:
            departmentId,

        department_name:
            departmentName,

        patient_name:
            primaryVisit.patient_name ||
            null,

        patient_phone:
            primaryVisit.patient_phone ||
            null,

        patient_age:
            primaryVisit.patient_age ||
            null,

        appointment_start:
            appointmentStart,

        appointment_end:
            appointmentEnd,

        visit_status:
            "scheduled",

        visit_result:
            "waiting",

        is_deleted:
            false

    };


    /* =====================================================
       INSERT
    ===================================================== */

    const {
        data: insertedVisit,
        error: insertError
    } =
    await supabaseClient

        .from("patient_visits")

        .insert(
            newVisit
        )

        .select()

        .single();


    if (insertError) {

        console.error(
            "Insert related visit error:",
            insertError
        );

        alert(
            insertError.message
        );

        return;
    }


    /* =====================================================
       SUCCESS
    ===================================================== */

    console.log(
        "Related visit created:",
        insertedVisit
    );


    showToast(
        "تمت إضافة الزيارة الملحقة بنجاح"
    );


    /* =====================================================
       CLOSE ADD MODAL
    ===================================================== */

    closeAddRelatedVisitModal();


    /* =====================================================
       REFRESH VISITS
    ===================================================== */

    if (
        typeof loadVisits ===
        "function"
    ) {

        await loadVisits();

    }


    /* =====================================================
       OPEN RELATED VISITS
    ===================================================== */

    if (
        visitGroupId &&
        typeof openRelatedVisitsModal ===
        "function"
    ) {

        await openRelatedVisitsModal(
            visitGroupId,
            primaryVisitId
        );

    }

}

/* =========================================================
   OPEN RELATED VISITS MODAL
   ========================================================= */

async function openRelatedVisitsModal(
    groupId,
    primaryVisitId
) {

    if (!groupId) {

        alert(
            "لم يتم تحديد مجموعة الزيارات."
        );

        return;
    }


    relatedVisitGroupId =
        groupId;

    relatedVisitPrimaryId =
        primaryVisitId || null;


    const modal =
        document.getElementById(
            "relatedVisitsModal"
        );


    if (!modal) {

        console.error(
            "relatedVisitsModal not found."
        );

        return;
    }


    modal.style.display =
        "flex";


    document.body.classList.add(
        "related-modal-open"
    );


    await loadRelatedVisits(
        groupId,
        primaryVisitId
    );
}


/* =========================================================
   CLOSE RELATED VISITS MODAL
   ========================================================= */

function closeRelatedVisitsModal() {

    const modal =
        document.getElementById(
            "relatedVisitsModal"
        );


    if (modal) {

        modal.style.display =
            "none";
    }


    document.body.classList.remove(
        "related-modal-open"
    );
}

async function refreshRelatedVisitCard(visitId){

    const card =
        document.querySelector(
            `.related-visit-item[data-visit-id="${visitId}"]`
        );


    if(!card){
        return;
    }


    const list =
        document.getElementById(
            "relatedVisitsList"
        );


    if(!list){
        return;
    }


    /*
     * حفظ مكان الكارت
     */

    const cards =
        Array.from(
            list.querySelectorAll(
                ".related-visit-item"
            )
        );


    const index =
        cards.indexOf(card);


    /*
     * تحميل بيانات الزيارة من جديد
     */

    const {
        data: visit,
        error
    } =
        await supabaseClient

            .from("patient_visits")

            .select("*")

            .eq("id", visitId)

            .single();


    if(error || !visit){

        console.error(
            "Refresh related visit error:",
            error
        );

        return;
    }


    /*
     * حذف الكارت القديم
     */

    card.remove();


    /*
     * رسم الكارت الجديد
     */

    await renderRelatedVisit(
        visit,
        list
    );


    /*
     * الحفاظ على ترتيب الكارت
     * إذا لزم الأمر
     */

    const newCards =
        Array.from(
            list.querySelectorAll(
                ".related-visit-item"
            )
        );


    const newCard =
        newCards.find(
            item =>
                item.dataset.visitId ==
                String(visitId)
        );


    if(
        newCard &&
        index >= 0 &&
        index < list.children.length
    ){

        list.insertBefore(
            newCard,
            list.children[index]
        );

    }

}
/* =========================================================
   LOAD RELATED VISITS
   ========================================================= */

async function loadRelatedVisits(
    groupId,
    primaryVisitId
){

    const list =
        document.getElementById(
            "relatedVisitsList"
        );

    const empty =
        document.getElementById(
            "relatedVisitsEmpty"
        );

    const countElement =
        document.getElementById(
            "relatedVisitsCount"
        );


    if(!list){
        return;
    }


    /* =====================================================
       LOADING
    ===================================================== */

    list.innerHTML = `
        <div class="related-visits-loading">

            <i class="fa-solid fa-spinner fa-spin"></i>

            <span>
                جاري تحميل الزيارات...
            </span>

        </div>
    `;


    if(empty){

        empty.style.display =
            "none";

    }


    /* =====================================================
       LOAD RELATED VISITS
    ===================================================== */

    const {
        data: visits,
        error
    } =
    await supabaseClient

        .from("patient_visits")

        .select("*")

        .eq(
            "visit_group_id",
            groupId
        )

        .eq(
            "is_primary",
            false
        )

        .eq(
            "is_deleted",
            false
        )

        .order(
            "visit_order",
            {
                ascending:true
            }
        );


    if(error){

        console.error(
            "Load related visits error:",
            error
        );


        list.innerHTML = `

            <div class="related-visits-error">

                <i class="
                    fa-solid
                    fa-triangle-exclamation
                "></i>

                <span>
                    ${error.message}
                </span>

            </div>

        `;

        return;
    }


    /* =====================================================
       COUNT
    ===================================================== */

    if(countElement){

        countElement.textContent =
            `${visits?.length || 0} Visits`;

    }


    /* =====================================================
       EMPTY
    ===================================================== */

    if(
        !visits ||
        visits.length === 0
    ){

        list.innerHTML =
            "";

        if(empty){

            empty.style.display =
                "block";

        }

        return;
    }


    if(empty){

        empty.style.display =
            "none";

    }


    list.innerHTML =
        "";


    /* =====================================================
       RENDER
    ===================================================== */

    for(
        const visit of visits
    ){

        await renderRelatedVisit(
            visit,
            list
        );

    }

}





/* =========================================================
   RENDER RELATED VISIT
   نفس تصميم الزيارة الأساسية
========================================================= */

async function renderRelatedVisit(
    v,
    container
){

    /* =====================================================
       VISIT END TIME
    ===================================================== */

    const visitEndTime =
        v.appointment_end

            ? new Date(
                v.appointment_end
            )

            : null;


    const nowTime =
        new Date();


    /* =====================================================
       CAN RESCHEDULE
    ===================================================== */

    const canReschedule =
        visitEndTime &&
        visitEndTime > nowTime &&
        (
            v.visit_result === "completed" ||
            v.visit_result === "waiting"
        );


    /* =====================================================
       STATUS
    ===================================================== */

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
    else if(waiting){

        statusText =
            "زيارة في الانتظار";

        statusClass =
            "waiting";

        statusIcon =
            "fa-clock";

    }


    /* =====================================================
       FINANCIAL DATA
    ===================================================== */

    let remaining =
        0;

    let totalAmount =
        0;

    let totalDiscount =
        0;

    let netAmount =
        0;

    let paidAmount =
        0;


    const {
        data: services,
        error: servicesError
    } =
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
            v.id
        );


    if(servicesError){

        console.error(
            "Related visit services error:",
            servicesError
        );

    }


    /* =====================================================
       CALCULATE FINANCIALS
    ===================================================== */

    if(
        services &&
        services.length
    ){

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


        netAmount =
            Math.max(
                totalAmount -
                totalDiscount,
                0
            );


        const serviceIds =
            services.map(
                service =>
                    service.id
            );


        if(serviceIds.length){

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

                .in(
                    "service_id",
                    serviceIds
                );


            if(paymentsError){

                console.error(
                    "Related visit payments error:",
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


        remaining =
            Math.max(
                netAmount -
                paidAmount,
                0
            );

    }


    /* =====================================================
       REMAINING BADGE
    ===================================================== */

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


    /* =====================================================
       DATE
    ===================================================== */

    const formattedDate =
        v.appointment_start

            ?

            new Date(
                v.appointment_start
            )
            .toLocaleString(
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

            "";


    /* =====================================================
       TITLE
    ===================================================== */

    const visitTitle =
        v.visit_title ||
        `Visit ${v.visit_order || ""}`;


    /* =====================================================
       VISIT ORDER
       يتم عرضه كـ meta item
    ===================================================== */

    const orderText =
        v.visit_order
            ? `زيارة ${v.visit_order}`
            : "زيارة ملحقة";


    /* =====================================================
       WAITING ACTIONS

       هذه الأزرار لا تفتح تفاصيل الزيارة
       لأننا نستخدم stopPropagation
    ===================================================== */

    const waitingActions =
        waiting

        ?

        `
        <div
            class="
                compact-visit-actions
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
                title="تأكيد الزيارة"
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
                title="إلغاء الزيارة"
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


    /* =====================================================
       RESCHEDULE BUTTON

       الزر نفسه لا يفتح التفاصيل
    ===================================================== */

    const rescheduleButton =
        canReschedule

        ?

        `
        <button
            type="button"
            id="
                related-reschedule-btn-${v.id}
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
            title="تغيير موعد الزيارة"
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


    /* =====================================================
       RENDER CARD

       الكارت بالكامل يفتح التفاصيل
       ما عدا الأزرار التي تحتوي stopPropagation
    ===================================================== */

    container.innerHTML += `

        <div
            class="
                visit-history-item
                primary-visit-card
                ${statusClass}
                related-visit-item
            "

            data-visit-id="${v.id}"

            onclick="
                openVisitDetails(
                    ${v.id}
                )
            "

            style="
                cursor:pointer;
            "
        >


            <!-- =========================================
                 TOP ROW
            ========================================== -->

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

                    <span
                        class="
                            visit-title-text
                        "
                        title="${visitTitle}"
                    >
                        ${visitTitle}
                    </span>

                </div>



                <!-- PAYMENT -->

                ${visitBadge}

            </div>



            <!-- =========================================
                 META
            ========================================== -->

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



                <!-- VISIT ORDER -->

                <div
                    class="
                        visit-meta-item
                    "
                >

                    <i
                        class="
                            fa-solid
                            fa-layer-group
                        "
                    ></i>

                    <span>
                        ${orderText}
                    </span>

                </div>

            </div>



            <!-- =========================================
                 ACTIONS
            ========================================== -->

            <div
                class="
                    visit-card-actions
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

                        deleteRelatedVisit(
                            ${v.id}
                        )
                    "
                    title="حذف الزيارة من السجل"
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


    /* =====================================================
       AUTO HIDE RESCHEDULE BUTTON
    ===================================================== */

    if(
        canReschedule &&
        visitEndTime
    ){

        const delay =
            visitEndTime.getTime() -
            Date.now();


        if(delay > 0){

            setTimeout(
                () => {

                    const btn =
                        document.getElementById(
                            `related-reschedule-btn-${v.id}`
                        );


                    if(btn){

                        btn.remove();

                    }

                },
                delay
            );

        }

    }

}
/* =========================================================
   DELETE RELATED VISIT
   ========================================================= */

async function deleteRelatedVisit(id) {

    if (!await showConfirm("هل تريد حذف هذه الزيارة الملحقة من السجل؟"))
        return;


    const {
        error
    } = await supabaseClient

        .from("patient_visits")

        .delete()

        .eq(
            "id",
            id
        );


    if (error) {

        console.error(
            "Delete related visit error:",
            error
        );

        alert(
            error.message
        );

        return;
    }


    showToast(
        "تم حذف الزيارة الملحقة"
    );


    /* -----------------------------------------
       REFRESH MAIN VISITS
    ----------------------------------------- */

    if (
        typeof loadVisits === "function"
    ) {

        await loadVisits();
    }


    /* -----------------------------------------
       REFRESH RELATED MODAL
    ----------------------------------------- */

    if (relatedVisitGroupId) {

        await loadRelatedVisits(
            relatedVisitGroupId,
            relatedVisitPrimaryId
        );
    }
}
async function loadRelatedVisitDepartments() {

    const departmentSelect =
        document.getElementById(
            "relatedVisitDepartment"
        );

    if (!departmentSelect) {
        return;
    }


    /* =====================================================
       RESET SELECT
    ===================================================== */

    departmentSelect.innerHTML = `
        <option value="">
            اختر القسم
        </option>
    `;


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


    if (
        userError ||
        !userData ||
        !userData.user
    ) {

        console.error(
            "Unable to get current user:",
            userError
        );

        return;
    }


    const userId =
        userData.user.id;


    /* =====================================================
       LOAD DEPARTMENTS
    ===================================================== */

    const {
        data: departments,
        error
    } =
    await supabaseClient

        .from(
            "clinic_departments"
        )

        .select(`
            id,
            department_name
        `)

        .eq(
            "user_id",
            userId
        )

        .order(
            "department_name",
            {
                ascending: true
            }
        );


    if (error) {

        console.error(
            "Load related visit departments error:",
            error
        );

        return;
    }


    /* =====================================================
       RENDER DEPARTMENTS
    ===================================================== */

    (departments || []).forEach(
        department => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                department.id;


            option.textContent =
                department.department_name;


            departmentSelect.appendChild(
                option
            );

        }
    );

}

/* =========================================================
   CLOSE WHEN CLICKING OUTSIDE
   ========================================================= */

document.addEventListener(
    "click",
    function(event) {

        const addModal =
            document.getElementById(
                "addRelatedVisitModal"
            );


        const relatedModal =
            document.getElementById(
                "relatedVisitsModal"
            );


        if (
            event.target ===
            addModal
        ) {

            closeAddRelatedVisitModal();
        }


        if (
            event.target ===
            relatedModal
        ) {

            closeRelatedVisitsModal();
        }
    }
);


/* =========================================================
   ESC KEY
   ========================================================= */

document.addEventListener(
    "keydown",
    function(event) {

        if (event.key !== "Escape") {
            return;
        }


        closeAddRelatedVisitModal();

        closeRelatedVisitsModal();
    }
);