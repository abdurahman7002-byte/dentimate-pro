/* =========================================================
   WAITING LIST
   Dentix Pro
========================================================= */


/* =========================================================
   GLOBAL
========================================================= */

let waitingListCache = [];

let waitingListInitialized = false;


/* =========================================================
   GET CURRENT USER
========================================================= */

async function getWaitingListUser() {

    try {

        const {
            data,
            error
        } = await supabaseClient.auth.getUser();


        if (error) {

            console.error(
                "Waiting List user error:",
                error
            );

            return null;
        }


        return data?.user || null;

    }

    catch (error) {

        console.error(
            "getWaitingListUser error:",
            error
        );

        return null;
    }
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeWaitingHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   OPEN WAITING LIST MODAL
========================================================= */

async function openWaitingListModal() {

    const modal =
        document.getElementById(
            "waitingListModal"
        );


    if (!modal) {

        console.error(
            "waitingListModal not found"
        );

        return;
    }


    modal.classList.add("show");

    document.body.classList.add(
        "modal-open"
    );


    await loadWaitingList();
}


/* =========================================================
   CLOSE WAITING LIST MODAL
========================================================= */

function closeWaitingListModal() {

    const modal =
        document.getElementById(
            "waitingListModal"
        );


    if (!modal) return;


    modal.classList.remove("show");

    document.body.classList.remove(
        "modal-open"
    );
}


/* =========================================================
   OPEN ADD WAITING PATIENT MODAL
========================================================= */

function openAddWaitingPatientModal() {

    const modal =
        document.getElementById(
            "addWaitingPatientModal"
        );


    if (!modal) {

        console.error(
            "addWaitingPatientModal not found"
        );

        return;
    }


    const form =
        document.getElementById(
            "waitingPatientForm"
        );


    if (form) {

        form.reset();
    }

    setWaitingPatientFieldsReadonly(false);

    /*
       Reset selected patient
    */

    const selectedPatientId =
        document.getElementById(
            "waitingSelectedPatientId"
        );


    if (selectedPatientId) {

        selectedPatientId.value = "";
    }


    /*
       Hide suggestions
    */

    const suggestions =
        document.getElementById(
            "waitingPatientSuggestions"
        );


    if (suggestions) {

        suggestions.innerHTML = "";

        suggestions.style.display =
            "none";
    }


    modal.classList.add("show");

    document.body.classList.add(
        "modal-open"
    );


    /*
       Focus name
    */

    setTimeout(() => {

        document.getElementById(
            "waitingPatientName"
        )?.focus();

    }, 100);
}


/* =========================================================
   CLOSE ADD WAITING PATIENT MODAL
========================================================= */

function closeAddWaitingPatientModal() {

    const modal =
        document.getElementById(
            "addWaitingPatientModal"
        );


    if (!modal) return;


    modal.classList.remove("show");

    document.body.classList.remove(
        "modal-open"
    );
}


/* =========================================================
   LOAD REGISTERED PATIENTS
========================================================= */

async function loadWaitingPatientsSearch() {

    try {

        const user =
            await getWaitingListUser();


        if (!user) {

            return [];
        }


        const {
            data,
            error
        } = await supabaseClient

            .from("patients")

            .select(
                "id, full_name, phone, birth_date"
            )

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
                "Waiting patients search error:",
                error
            );

            return [];
        }


        return data || [];

    }

    catch (error) {

        console.error(
            "loadWaitingPatientsSearch error:",
            error
        );

        return [];
    }
}


/* =========================================================
   CALCULATE AGE
========================================================= */

function calculateWaitingAge(
    birthDate
) {

    if (!birthDate) {

        return "";
    }


    const birth =
        new Date(birthDate);

    const today =
        new Date();


    let age =
        today.getFullYear()
        -
        birth.getFullYear();


    const monthDifference =
        today.getMonth()
        -
        birth.getMonth();


    if (
        monthDifference < 0 ||
        (
            monthDifference === 0 &&
            today.getDate() < birth.getDate()
        )
    ) {

        age--;
    }


    return age >= 0
        ? age
        : "";
}


/* =========================================================
   SEARCH REGISTERED PATIENT
========================================================= */

async function searchWaitingPatients(
    value
) {

    const container =
        document.getElementById(
            "waitingPatientSuggestions"
        );


    if (!container) {

        return;
    }


    const search =
        String(value || "")
            .trim()
            .toLowerCase();


    /*
       Empty
    */

    if (!search) {

        container.innerHTML = "";

        container.style.display =
            "none";

        return;
    }


    /*
       Load patients
    */

    const patients =
        await loadWaitingPatientsSearch();


    /*
       Search by name or phone
    */

    const results =
        patients
            .filter(patient => {

                const name =
                    String(
                        patient.full_name || ""
                    )
                    .toLowerCase();


                const phone =
                    String(
                        patient.phone || ""
                    )
                    .toLowerCase();


                return (
                    name.includes(search) ||
                    phone.includes(search)
                );

            })
            .slice(0, 8);


    renderWaitingPatientSuggestions(
        results,
        search
    );
}


/* =========================================================
   RENDER PATIENT SUGGESTIONS
========================================================= */

function renderWaitingPatientSuggestions(
    patients,
    search
) {

    const container =
        document.getElementById(
            "waitingPatientSuggestions"
        );


    if (!container) {

        return;
    }


    let html = "";


    /*
       Registered patients
    */

    patients.forEach(patient => {

        const age =
            calculateWaitingAge(
                patient.birth_date
            );


        html += `

            <div
                class="waiting-patient-suggestion"
                onclick="selectWaitingRegisteredPatient('${patient.id}')"
            >

                <div
                    class="waiting-patient-suggestion-icon"
                >
                    <i class="fa-solid fa-user"></i>
                </div>


                <div
                    class="waiting-patient-suggestion-info"
                >

                    <strong>
                        ${escapeWaitingHTML(
                            patient.full_name
                        )}
                    </strong>


                    <small>

                        ${
                            age !== ""
                                ? `${escapeWaitingHTML(age)} سنة`
                                : ""
                        }

                        ${
                            patient.phone
                                ? ` • ${escapeWaitingHTML(patient.phone)}`
                                : ""
                        }

                    </small>

                </div>

            </div>

        `;
    });


    /*
       New person option
    */

    html += `

        <div
            class="waiting-new-patient-option"
            onclick="useWaitingNewPatient()"
        >

            <i class="fa-solid fa-user-plus"></i>

            <span>
                إضافة "${escapeWaitingHTML(search)}" كشخص جديد
            </span>

        </div>

    `;


    container.innerHTML =
        html;


    container.style.display =
        "block";
}


/* =========================================================
   SELECT REGISTERED PATIENT
========================================================= */

async function selectWaitingRegisteredPatient(
    patientId
) {

    const patients =
        await loadWaitingPatientsSearch();


    const patient =
        patients.find(
            p =>
                String(p.id)
                ===
                String(patientId)
        );


    if (!patient) {

        return;
    }


    /*
       Save ID
    */

    const selectedId =
        document.getElementById(
            "waitingSelectedPatientId"
        );


    if (selectedId) {

        selectedId.value =
            patient.id;
    }


    /*
       Fill name
    */

    const nameInput =
        document.getElementById(
            "waitingPatientName"
        );


    if (nameInput) {

        nameInput.value =
            patient.full_name || "";
    }


    /*
       Fill phone
    */

    const phoneInput =
        document.getElementById(
            "waitingPatientPhone"
        );


    if (phoneInput) {

        phoneInput.value =
            patient.phone || "";
    }


    /*
       Fill age
    */

    const ageInput =
        document.getElementById(
            "waitingPatientAge"
        );


    if (ageInput) {

        ageInput.value =
            calculateWaitingAge(
                patient.birth_date
            );
    }


    /*
       Hide suggestions
    */

    const suggestions =
        document.getElementById(
            "waitingPatientSuggestions"
        );


    if (suggestions) {

        suggestions.innerHTML = "";

        suggestions.style.display =
            "none";
    }


    /*
       Show registered status
    */

    showWaitingPatientStatus(
        "registered"
    );
}


/* =========================================================
   USE NEW PATIENT
========================================================= */

function useWaitingNewPatient() {

    const selectedId =
        document.getElementById(
            "waitingSelectedPatientId"
        );


    if (selectedId) {

        selectedId.value = "";
    }


    /*
       Hide suggestions
    */

    const suggestions =
        document.getElementById(
            "waitingPatientSuggestions"
        );


    if (suggestions) {

        suggestions.innerHTML = "";

        suggestions.style.display =
            "none";
    }


    /*
       Clear status
    */

    showWaitingPatientStatus(
        "new"
    );
}


/* =========================================================
   PATIENT STATUS
========================================================= */
/* =========================================================
   PATIENT FIELDS LOCK / UNLOCK
========================================================= */

function setWaitingPatientFieldsReadonly(isReadonly) {

    const nameInput =
        document.getElementById(
            "waitingPatientName"
        );

    const phoneInput =
        document.getElementById(
            "waitingPatientPhone"
        );

    const ageInput =
        document.getElementById(
            "waitingPatientAge"
        );

    const inputs = [
        nameInput,
        phoneInput,
        ageInput
    ];

    inputs.forEach(input => {

        if (!input) {
            return;
        }

        input.readOnly = isReadonly;

        if (isReadonly) {

            input.classList.add(
                "waiting-field-readonly"
            );

        } else {

            input.classList.remove(
                "waiting-field-readonly"
            );
        }
    });
}


/* =========================================================
   PATIENT STATUS
========================================================= */

function showWaitingPatientStatus(type) {

    const status =
        document.getElementById(
            "waitingPatientStatus"
        );

    if (!status) {
        return;
    }


    /* =========================================
       REGISTERED PATIENT
    ========================================= */

    if (type === "registered") {

        setWaitingPatientFieldsReadonly(true);

        status.innerHTML = `
            <i class="fa-solid fa-circle-check"></i>

            <span>
                مريض مسجل بالفعل
            </span>
        `;

        status.className =
            "waiting-patient-status registered";

    }


    /* =========================================
       NEW PATIENT
    ========================================= */

    else {

        setWaitingPatientFieldsReadonly(false);

        status.innerHTML = `
            <i class="fa-solid fa-user-plus"></i>

            <span>
                سيتم حفظه كشخص جديد
            </span>
        `;

        status.className =
            "waiting-patient-status new";
    }
}
/* =========================================================
   ADD TO WAITING LIST
========================================================= */

async function addPatientToWaitingList(
    event
) {

    if (event) {

        event.preventDefault();
    }


    try {

        const user =
            await getWaitingListUser();


        if (!user) {

            alert(
                "يجب تسجيل الدخول أولاً"
            );

            return;
        }


        const nameInput =
            document.getElementById(
                "waitingPatientName"
            );


        const phoneInput =
            document.getElementById(
                "waitingPatientPhone"
            );


        const ageInput =
            document.getElementById(
                "waitingPatientAge"
            );


        const selectedIdInput =
            document.getElementById(
                "waitingSelectedPatientId"
            );


        const patientName =
            nameInput?.value
                ?.trim() || "";


        const patientPhone =
            phoneInput?.value
                ?.trim() || "";


        const ageValue =
            ageInput?.value
                ?.trim() || "";


        const selectedPatientId =
            selectedIdInput?.value
                ?.trim() || "";

                const emergencyInput =
    document.querySelector(
        'input[name="waitingEmergency"]:checked'
    );

const isEmergency =
    emergencyInput?.value === "true";

        /*
           Validation
        */

        if (!patientName) {

            showToast(
                "يرجى إدخال اسم المريض"
            );

            nameInput?.focus();

            return;
        }


        /*
           Validate age
           only if provided
        */

        let age = null;


        if (ageValue !== "") {

            age =
                parseInt(
                    ageValue,
                    10
                );


            if (
                Number.isNaN(age) ||
                age < 0 ||
                age > 150
            ) {

                showToast(
                    "يرجى إدخال عمر صحيح"
                );

                ageInput?.focus();

                return;
            }
        }


        /*
           Check duplicate in waiting list
           by patient_id
        */

        if (selectedPatientId) {

            const {
                data: existing,
                error: existingError
            } =
                await supabaseClient

                    .from("waiting_list")

                    .select("id")

                    .eq(
                        "user_id",
                        user.id
                    )

                    .eq(
                        "patient_id",
                        selectedPatientId
                    )

                    .limit(1);


            if (existingError) {

                console.error(
                    "Duplicate check error:",
                    existingError
                );

            }

            else if (
                existing &&
                existing.length
            ) {

                showToast(
                    "هذا المريض موجود بالفعل في قائمة الانتظار"
                );

                return;
            }
        }


        /*
           Insert
        */

        const {
            data,
            error
        } =
            await supabaseClient

                .from("waiting_list")

.insert({
    user_id:
        user.id,

    patient_id:
        selectedPatientId
            ? selectedPatientId
            : null,

    patient_name:
        patientName,

    age:
        age,

    phone:
        patientPhone || null,

    is_emergency:
        isEmergency
})

                .select()

                .single();


        if (error) {

            console.error(
                "Add waiting patient error:",
                error
            );


            showToast(
                "حدث خطأ أثناء إضافة المريض إلى قائمة الانتظار"
            );

            return;
        }


        /*
           Success
        */

        waitingListCache.unshift(
            data
        );


        closeAddWaitingPatientModal();


        await loadWaitingList();


        showToast(
            "تمت إضافة المريض إلى قائمة الانتظار بنجاح"
        );

    }

    catch (error) {

        console.error(
            "addPatientToWaitingList error:",
            error
        );


        alert(
            "حدث خطأ غير متوقع"
        );
    }
}


/* =========================================================
   LOAD WAITING LIST
========================================================= */

async function loadWaitingList() {

    const container =
        document.getElementById(
            "waitingListContainer"
        );


    if (!container) {

        return;
    }


    /*
       Loading
    */

    container.innerHTML = `

        <div class="waiting-list-loading">

            <i class="fa-solid fa-spinner fa-spin"></i>

            <span>
                جاري تحميل قائمة الانتظار...
            </span>

        </div>

    `;


    try {

        const user =
            await getWaitingListUser();


        if (!user) {

            container.innerHTML = `

                <div class="waiting-list-empty">

                    <i class="fa-solid fa-lock"></i>

                    <span>
                        يجب تسجيل الدخول لعرض قائمة الانتظار
                    </span>

                </div>

            `;

            return;
        }


        const {
            data,
            error
        } =
            await supabaseClient

                .from("waiting_list")

.select(`
    id,
    user_id,
    patient_id,
    patient_name,
    age,
    phone,
    is_emergency,
    created_at
`)

                .eq(
                    "user_id",
                    user.id
                )

                .order(
                    "created_at",
                    {
                        ascending: true
                    }
                );


        if (error) {

            console.error(
                "Load waiting list error:",
                error
            );


            container.innerHTML = `

                <div class="waiting-list-empty error">

                    <i class="fa-solid fa-circle-exclamation"></i>

                    <span>
                        حدث خطأ أثناء تحميل قائمة الانتظار
                    </span>

                </div>

            `;

            return;
        }


        waitingListCache =
            data || [];


        renderWaitingList(
            waitingListCache
        );


        updateWaitingListCount(
            waitingListCache.length
        );

    }

    catch (error) {

        console.error(
            "loadWaitingList error:",
            error
        );


        container.innerHTML = `

            <div class="waiting-list-empty error">

                <i class="fa-solid fa-circle-exclamation"></i>

                <span>
                    حدث خطأ أثناء تحميل البيانات
                </span>

            </div>

        `;
    }
}


/* =========================================================
   RENDER WAITING LIST
========================================================= */

function renderWaitingList(
    list
) {

    const container =
        document.getElementById(
            "waitingListContainer"
        );


    if (!container) {

        return;
    }


    /*
       Empty
    */

    if (!list.length) {

        container.innerHTML = `

            <div class="waiting-list-empty">

                <div class="waiting-empty-icon">

                    <i class="fa-solid fa-user-clock"></i>

                </div>

                <strong>
                    قائمة الانتظار فارغة
                </strong>

                <span>
                    لا يوجد مرضى في قائمة الانتظار حاليًا
                </span>

            </div>

        `;

        return;
    }


    /*
       Build cards
    */

    let html = "";


    list.forEach(
        (patient, index) => {

            const isRegistered =
                !!patient.patient_id;

                const isEmergency =
    patient.is_emergency === true;

            const created =
                patient.created_at
                    ? new Date(
                        patient.created_at
                    ).toLocaleTimeString(
                        "ar-EG",
                        {
                            hour: "2-digit",
                            minute: "2-digit"
                        }
                    )
                    : "";


            html += `

                <div
                    class="waiting-list-card"
                    data-waiting-id="${patient.id}"
                >

                    <!-- POSITION -->

                    <div
                        class="waiting-list-position"
                    >

                        ${index + 1}

                    </div>


                    <!-- ICON -->

                    <div
                        class="waiting-list-patient-icon"
                    >

                        <i class="fa-solid fa-user"></i>

                    </div>


                    <!-- INFO -->

                    <div
                        class="waiting-list-patient-info"
                    >

                        <div
                            class="waiting-list-patient-name"
                        >

                            ${escapeWaitingHTML(
                                patient.patient_name
                            )}

                        </div>


                        <div
                            class="waiting-list-patient-details"
                        >

                            ${
                                patient.age !== null &&
                                patient.age !== ""
                                    ? `
                                        <span>
                                            <i class="fa-solid fa-cake-candles"></i>
                                            ${escapeWaitingHTML(patient.age)} سنة
                                        </span>
                                      `
                                    : ""
                            }


                            ${
                                patient.phone
                                    ? `
                                        <span>
                                            <i class="fa-solid fa-phone"></i>
                                            ${escapeWaitingHTML(patient.phone)}
                                        </span>
                                      `
                                    : ""
                            }


                            ${
                                created
                                    ? `
                                        <span>
                                            <i class="fa-regular fa-clock"></i>
                                            ${created}
                                        </span>
                                      `
                                    : ""
                            }

                        </div>


                        <div
                            class="waiting-list-status
                            ${isRegistered
                                ? "registered"
                                : "new"
                            }"
                        >

                            <i
                                class="fa-solid ${
                                    isRegistered
                                        ? "fa-circle-check"
                                        : "fa-user-plus"
                                }"
                            ></i>

                            ${
                                isRegistered
                                    ? "مريض مسجل"
                                    : "مريض جديد"
                            }

                        </div>
${
    isEmergency
        ? `
            <div class="waiting-emergency-badge">
                <i class="fa-solid fa-triangle-exclamation"></i>
                طارئ
            </div>
        `
        : ""
}
                    </div>


                    <!-- ACTIONS -->

                    <div
                        class="waiting-list-actions"
                    >

<button
    type="button"
    class="waiting-book-btn"
    data-id="${patient.id}"
    onclick="bookWaitingPatient(this.dataset.id)"
>
    <i class="fa-solid fa-calendar-plus"></i>
    حجز موعد
</button>

                        <button
                            type="button"
                            class="waiting-remove-btn"
                            onclick="removeWaitingPatient('${patient.id}')"
                        >

                            <i
                                class="fa-solid fa-trash"
                            ></i>

                            <span>
                                إزالة
                            </span>

                        </button>

                    </div>

                </div>

            `;
        }
    );


    container.innerHTML =
        html;
}


/* =========================================================
   UPDATE COUNT
========================================================= */

function updateWaitingListCount(
    count
) {

    const elements =
        document.querySelectorAll(
            "[data-waiting-count]"
        );


    elements.forEach(
        element => {

            element.textContent =
                count;

        }
    );


    const badge =
        document.getElementById(
            "waitingListCount"
        );


    if (badge) {

        badge.textContent =
            count;

        badge.style.display =
            count > 0
                ? "inline-flex"
                : "none";
    }
}
/* =========================================================
   LOAD WAITING LIST COUNT
========================================================= */

async function loadWaitingListCount() {

    try {

        const user = await getWaitingListUser();

        if (!user) {
            updateWaitingListCount(0);
            return;
        }

        const {
            count,
            error
        } = await supabaseClient
            .from("waiting_list")
            .select("id", {
                count: "exact",
                head: true
            })
            .eq(
                "user_id",
                user.id
            );

        if (error) {

            console.error(
                "Load waiting list count error:",
                error
            );

            return;
        }

        updateWaitingListCount(
            count || 0
        );

    }
    catch (error) {

        console.error(
            "loadWaitingListCount error:",
            error
        );

    }
}

/* =========================================================
   REMOVE WAITING PATIENT
========================================================= */

async function removeWaitingPatient(
    waitingId
) {

    const patient =
        waitingListCache.find(
            item =>
                String(item.id)
                ===
                String(waitingId)
        );


    if (!patient) {

        return;
    }


    const confirmed =
        await showConfirm(
            `هل تريد إزالة "${patient.patient_name}" من قائمة الانتظار؟`
        );


    if (!confirmed) {

        return;
    }


    try {

        const {
            data: userData,
            error: userError
        } =
            await supabaseClient.auth.getUser();


        if (
            userError ||
            !userData?.user
        ) {

            alert(
                "يجب تسجيل الدخول أولاً"
            );

            return;
        }


        const {
            error
        } =
            await supabaseClient

                .from("waiting_list")

                .delete()

                .eq(
                    "id",
                    waitingId
                )

                .eq(
                    "user_id",
                    userData.user.id
                );


        if (error) {

            console.error(
                "Remove waiting patient error:",
                error
            );


            alert(
                "حدث خطأ أثناء إزالة المريض"
            );

            return;
        }


        /*
           Remove from cache
        */

        waitingListCache =
            waitingListCache.filter(
                item =>
                    String(item.id)
                    !==
                    String(waitingId)
            );


        renderWaitingList(
            waitingListCache
        );


        updateWaitingListCount(
            waitingListCache.length
        );

    }

    catch (error) {

        console.error(
            "removeWaitingPatient error:",
            error
        );


        alert(
            "حدث خطأ غير متوقع"
        );
    }
}


/* =========================================================
   BOOK WAITING PATIENT
   =========================================================

   سيتم ربط هذه الدالة لاحقًا
   مع Appointment Modal الموجود في النظام.
========================================================= */

async function bookWaitingPatient(waitingListId) {

    const patient =
        waitingListCache.find(
            item => String(item.id) === String(waitingListId)
        );

    if (!patient) {
        console.error("Waiting list patient not found");
        return;
    }

    openAppointmentFromWaitingList(patient);
    closeWaitingListModal();
    initAddVisitSlider();
    loadDepartments();
}
/* =========================================================
   CLOSE MODALS WHEN CLICKING BACKDROP
========================================================= */

document.addEventListener(
    "click",
    function(event) {

        const waitingModal =
            document.getElementById(
                "waitingListModal"
            );


        const addModal =
            document.getElementById(
                "addWaitingPatientModal"
            );


        if (
            waitingModal &&
            event.target === waitingModal
        ) {

            closeWaitingListModal();
        }


        if (
            addModal &&
            event.target === addModal
        ) {

            closeAddWaitingPatientModal();
        }

    }
);


/* =========================================================
   ESC KEY
========================================================= */

document.addEventListener(
    "keydown",
    function(event) {

        if (
            event.key !== "Escape"
        ) {

            return;
        }


        closeWaitingListModal();

        closeAddWaitingPatientModal();

    }
);


/* =========================================================
   EXPORT GLOBAL FUNCTIONS
========================================================= */

window.openWaitingListModal =
    openWaitingListModal;

window.closeWaitingListModal =
    closeWaitingListModal;

window.openAddWaitingPatientModal =
    openAddWaitingPatientModal;

window.closeAddWaitingPatientModal =
    closeAddWaitingPatientModal;

window.searchWaitingPatients =
    searchWaitingPatients;

window.selectWaitingRegisteredPatient =
    selectWaitingRegisteredPatient;

window.useWaitingNewPatient =
    useWaitingNewPatient;

window.addPatientToWaitingList =
    addPatientToWaitingList;

window.loadWaitingList =
    loadWaitingList;

window.removeWaitingPatient =
    removeWaitingPatient;

window.bookWaitingPatient =
    bookWaitingPatient;
window.loadWaitingListCount =
    loadWaitingListCount;

/* =========================================================
   AUTO LOAD
========================================================= */

/* =========================================================
   AUTO LOAD
========================================================= */

window.addEventListener(
    "load",
    async function() {

        waitingListInitialized = true;

        /*
         * تحميل عدد قائمة الانتظار فقط
         * بدون فتح المودال
         */
        await loadWaitingListCount();

    }
);


/* =====================================================
   OPEN APPOINTMENT FROM WAITING LIST
===================================================== */

function openAppointmentFromWaitingList(waitingPatient) {

    if (!waitingPatient) {
        console.error("Waiting patient data is missing");
        return;
    }

    /* =========================================
       OPEN EXISTING APPOINTMENT MODAL
    ========================================= */

    const modal = document.getElementById("addVisitModal");

    if (!modal) {
        console.error("addVisitModal not found");
        return;
    }

    /* =========================================
       PATIENT DATA
    ========================================= */

    const patientNameInput =
        document.getElementById("appointmentPatientName");

    const patientIdInput =
        document.getElementById("appointmentPatientId");

    const patientPhoneInput =
        document.getElementById("appointmentPatientPhone");

    const patientAgeInput =
        document.getElementById("appointmentPatientAge");


    /* =========================================
       FILL PATIENT INFORMATION
    ========================================= */

    if (patientNameInput) {
        patientNameInput.value =
            waitingPatient.patient_name || "";
    }

    if (patientIdInput) {
        patientIdInput.value =
            waitingPatient.patient_id || "";
    }

    if (patientPhoneInput) {
        patientPhoneInput.value =
            waitingPatient.phone || "";
    }

    if (patientAgeInput) {
        patientAgeInput.value =
            waitingPatient.age ?? "";
    }


    /* =========================================
       HIDE AUTOCOMPLETE SUGGESTIONS
    ========================================= */

    const suggestions =
        document.getElementById("patientNameSuggestions");

    if (suggestions) {
        suggestions.innerHTML = "";
        suggestions.style.display = "none";
    }


    /* =========================================
       REMEMBER WAITING LIST RECORD
       
       We keep the waiting_list ID temporarily
       so saveVisit() can delete it after booking.
    ========================================= */

    window.currentWaitingListPatient = {
        id: waitingPatient.id,
        patient_id: waitingPatient.patient_id || null,
        patient_name: waitingPatient.patient_name || "",
        phone: waitingPatient.phone || "",
        age: waitingPatient.age ?? null
    };


    /* =========================================
       OPEN MODAL
    ========================================= */

    modal.classList.add("active");

    /*
       In case your modal uses display instead
       of an active class.
    */

    modal.style.display = "flex";


    /* =========================================
       FOCUS
    ========================================= */

    setTimeout(() => {

        if (patientNameInput) {
            patientNameInput.focus();
        }

    }, 100);
}

