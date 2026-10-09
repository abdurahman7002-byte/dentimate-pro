/* =========================================================
   CONTROL PAGE — Services / Works Catalog / Departments
   + INSURANCE MANAGEMENT
   ========================================================= */

let currentUserId = null;

async function init(){

    const {
        data:userData
    } =
    await supabaseClient.auth.getUser();

    if(!userData.user){

        alert("يجب تسجيل الدخول");

        return;

    }

    currentUserId = userData.user.id;

    await loadServices();

    await loadWorksCatalog();

    await loadDepartments();

    await loadInsurances();

}

async function saveService(){

    const serviceName =
        document.getElementById(
            "service_name"
        ).value.trim();


    const servicePrice =
        document.getElementById(
            "service_price"
        ).value;


    if(!serviceName){

        showToast(
            "يرجى إدخال اسم الخدمة",
            "warning"
        );

        return;
    }


    const {
        data: existing,
        error: checkError
    } =
        await supabaseClient

            .from("clinic_services")

            .select("id")

            .eq(
                "user_id",
                currentUserId
            )

            .eq(
                "service_name",
                serviceName
            );


    if(checkError){

        console.error(
            "Check service error:",
            checkError
        );

        showToast(
            "حدث خطأ أثناء التحقق من الخدمة",
            "error"
        );

        return;
    }


    if(existing && existing.length){

        showToast(
            "الخدمة موجودة بالفعل",
            "warning"
        );

        return;
    }


    const { error } =
        await supabaseClient

            .from("clinic_services")

            .insert([{

                user_id:
                    currentUserId,

                service_name:
                    serviceName,

                service_price:
                    servicePrice

            }]);


    if(error){

        console.error(
            "Save service error:",
            error
        );

        showToast(
            "فشل حفظ الخدمة",
            "error"
        );

        return;
    }


    document.getElementById(
        "service_name"
    ).value = "";


    document.getElementById(
        "service_price"
    ).value = "";


    showToast(
        "تمت إضافة الخدمة بنجاح",
        "success"
    );


    loadServices();
}
async function loadServices(){

    const container =
    document.getElementById(
        "servicesContainer"
    );

    container.innerHTML = "";

    const {
        data,
        error
    } =
    await supabaseClient
    .from("clinic_services")
    .select("*")
    .eq(
        "user_id",
        currentUserId
    )
    .order(
        "id",
        { ascending:false }
    );

    if(error){

        console.log(error);

        return;
    }

    /* عدد الخدمات */

    const servicesCount =
    document.getElementById(
        "servicesCount"
    );

    if(servicesCount){

        servicesCount.textContent =
        data.length;
    }

    if(!data || data.length === 0){

    container.innerHTML = `

    <div
        style="
            text-align:center;
            padding:24px;
            color:#94a3b8;
            font-size:15px;
            display:flex;
            flex-direction:column;
            align-items:center;
            gap:10px;
        "
    >

        <i
            class="fa-solid fa-briefcase-medical"
            style="
                font-size:40px;
                color:#64748b;
            "
        ></i>

        <span>
            لا توجد خدمات مضافة بعد
        </span>

    </div>

    `;

    return;

}

    data.forEach(service => {

        container.innerHTML += `

        <div class="service-card">

            <div class="service-info">

                <div class="service-name">
                    ${service.service_name}
                </div>

                <div class="service-price">
                    ${service.service_price} EGP
                </div>

            </div>

            <div class="service-actions">

                <button
                    class="edit-btn"
                    onclick="editService(
                        ${service.id},
                        '${service.service_name}',
                        ${service.service_price}
                    )"
                >
                    <i class="fa-solid fa-pen"></i>
                    تعديل
                </button>

                <button
                    class="delete-btn"
                    onclick="deleteService(${service.id})"
                >
                    <i class="fa-solid fa-trash"></i>
                    حذف
                </button>

            </div>

        </div>

        `;

    });

}

function closeServiceModal(){

    editingServiceId = null;

    document.getElementById(
        "serviceModal"
    ).style.display = "none";

}

let editingServiceId = null;

async function editService(id,name,price){

    editingServiceId = id;

    document.getElementById(
        "modalServiceName"
    ).value = name;

    document.getElementById(
        "modalServicePrice"
    ).value = price;

    document.getElementById(
        "serviceModal"
    ).style.display = "flex";

}

function closeServiceModal(){

    editingServiceId = null;

    document.getElementById(
        "serviceModal"
    ).style.display = "none";

}

async function saveServiceEdit(){

    const newName =
        document.getElementById(
            "modalServiceName"
        ).value.trim();


    const newPrice =
        Number(
            document.getElementById(
                "modalServicePrice"
            ).value
        );


    if(!newName){

        showToast(
            "يرجى إدخال اسم الخدمة",
            "warning"
        );

        return;
    }


    const { error } =
        await supabaseClient

            .from("clinic_services")

            .update({

                service_name:
                    newName,

                service_price:
                    newPrice

            })

            .eq(
                "id",
                editingServiceId
            );


    if(error){

        console.error(
            "Update service error:",
            error
        );

        showToast(
            error.message ||
            "فشل تعديل الخدمة",
            "error"
        );

        return;
    }


    closeServiceModal();


    showToast(
        "تم تعديل الخدمة بنجاح",
        "success"
    );


    loadServices();
}
async function deleteService(id){

      const confirmed =
        await showConfirm(
            "هل تريد حذف هذه الخدمة؟"
        );


    if(!confirmed){

        return;
    }

    const { error } =
        await supabaseClient

            .from("clinic_services")

            .delete()

            .eq(
                "id",
                id
            );


    if(error){

        console.error(
            "Delete service error:",
            error
        );

        showToast(
            error.message ||
            "فشل حذف الخدمة",
            "error"
        );

        return;
    }


    showToast(
        "تم حذف الخدمة بنجاح",
        "success"
    );


    loadServices();
}
/* =========================
   WORKS CATALOG
=========================




/* =========================
   ADD
========================= */

async function addWorkCatalog(){

    const {
        data: userData,
        error: userError
    } =
        await supabaseClient
            .auth
            .getUser();


    if(
        userError ||
        !userData?.user?.id
    ){

        showToast(
            "تعذر التحقق من المستخدم",
            "error"
        );

        return;
    }


    const userId =
        userData.user.id;


    const workName =
        document.getElementById(
            "newWorkName"
        ).value.trim();


    const workType =
        document.getElementById(
            "newWorkType"
        ).value.trim();


    const labCost =
        Number(
            document.getElementById(
                "newLabCost"
            ).value || 0
        );


    const patientAmount =
        Number(
            document.getElementById(
                "newPatientAmount"
            ).value || 0
        );


    if(
        !workName ||
        !workType
    ){

        showToast(
            "يرجى إكمال بيانات العمل",
            "warning"
        );

        return;
    }


    const { error } =
        await supabaseClient

            .from("dental_works_catalog")

            .insert([{

                user_id:
                    userId,

                work_name:
                    workName,

                work_type:
                    workType,

                lab_cost:
                    labCost,

                patient_amount:
                    patientAmount

            }]);


    if(error){

        console.error(
            "Add work catalog error:",
            error
        );

        showToast(
            error.message ||
            "فشل إضافة العمل",
            "error"
        );

        return;
    }


    document.getElementById(
        "newWorkName"
    ).value = "";


    document.getElementById(
        "newWorkType"
    ).value = "";


    document.getElementById(
        "newLabCost"
    ).value = "";


    document.getElementById(
        "newPatientAmount"
    ).value = "";


    showToast(
        "تمت إضافة العمل بنجاح",
        "success"
    );


    loadWorksCatalog();
}
async function loadWorksCatalog(){

    const { data:userData } =
    await supabaseClient.auth.getUser();

    const userId =
    userData.user.id;

    const { data , error } =
    await supabaseClient
    .from("dental_works_catalog")
    .select("*")
    .eq("user_id", userId)
    .order("work_name");

    if(error){

        console.log(error);

        return;
    }

    const container =
    document.getElementById(
        "worksCatalogContainer"
    );

    container.innerHTML = "";

    if(!data || data.length === 0){

    container.innerHTML = `

    <div
        style="
            text-align:center;
            padding:24px;
            color:#94a3b8;
            font-size:15px;
            display:flex;
            flex-direction:column;
            align-items:center;
            gap:10px;
        "
    >
        <i class="fa-solid fa-screwdriver-wrench"></i>

        <span>
            لا توجد تركيبات مضافة بعد
        </span>

    </div>

    `;

    return;

}

    data.forEach(item => {

    container.innerHTML += `

<div class="work-card">

    <div class="work-card-top">

        <div>

            <div class="work-name">
                ${item.work_name}
            </div>

            <div
                style="
                    background:#1d4ed8;
                    color:white;
                    display:inline-block;
                    padding:6px 12px;
                    border-radius:999px;
                    font-size:12px;
                    font-weight:700;
                    margin-bottom:10px;
                "
            >
                ${item.work_type}
            </div>

            <div class="work-cost">
                حساب المعمل:
                ${item.lab_cost}
            </div>

            <div class="work-patient">
                سعر المريض:
                ${item.patient_amount}
            </div>

        </div>

        <div class="work-icon">
            <i class="fa-solid fa-tooth"></i>
        </div>

    </div>

    <div class="work-actions">

        <button
            class="edit-btn"
            onclick="editWorkCatalog(${item.id})"
        >
            <i class="fa-solid fa-pen"></i>
            تعديل
        </button>

        <button
            class="delete-btn"
            onclick="deleteWorkCatalog(${item.id})"
        >
            <i class="fa-solid fa-trash"></i>
            حذف
        </button>

    </div>

</div>

`;
});
}


/* =========================
   DELETE
========================= */

async function deleteWorkCatalog(id){

    const confirmed =
        await showConfirm(
            "هل تريد حذف هذه التركيبة؟"
        );


    if(!confirmed){

        return;
    }


    const { error } =
        await supabaseClient

            .from("dental_works_catalog")

            .delete()

            .eq(
                "id",
                id
            );


    if(error){

        console.error(
            "Delete work catalog error:",
            error
        );

        showToast(
            error.message ||
            "فشل حذف التركيبة",
            "error"
        );

        return;
    }


    showToast(
        "تم حذف التركيبة بنجاح",
        "success"
    );


    loadWorksCatalog();
}

/* =========================
   EDIT
========================= */

let editingWorkId = null;

async function editWorkCatalog(id){

    editingWorkId = id;

    const { data:item, error } =
    await supabaseClient

    .from("dental_works_catalog")

    .select("*")

    .eq("id",id)

    .single();

    if(error){

        alert(error.message);

        return;

    }

    document.getElementById(
        "modalWorkName"
    ).value = item.work_name || "";

    document.getElementById(
        "modalWorkType"
    ).value = item.work_type || "";

    document.getElementById(
        "modalLabCost"
    ).value = item.lab_cost || "";

    document.getElementById(
        "modalPatientAmount"
    ).value = item.patient_amount || "";

    document.getElementById(
        "workCatalogModal"
    ).style.display = "flex";

}

function closeWorkCatalogModal(){

    editingWorkId = null;

    document.getElementById(
        "workCatalogModal"
    ).style.display = "none";

}

async function saveWorkCatalogEdit(){

    const workName =
        document.getElementById(
            "modalWorkName"
        ).value.trim();


    const workType =
        document.getElementById(
            "modalWorkType"
        ).value.trim();


    const labCost =
        Number(
            document.getElementById(
                "modalLabCost"
            ).value || 0
        );


    const patientAmount =
        Number(
            document.getElementById(
                "modalPatientAmount"
            ).value || 0
        );


    if(
        !workName ||
        !workType
    ){

        showToast(
            "يرجى إكمال بيانات التركيبة",
            "warning"
        );

        return;
    }


    const { error } =
        await supabaseClient

            .from("dental_works_catalog")

            .update({

                work_name:
                    workName,

                work_type:
                    workType,

                lab_cost:
                    labCost,

                patient_amount:
                    patientAmount

            })

            .eq(
                "id",
                editingWorkId
            );


    if(error){

        console.error(
            "Update work catalog error:",
            error
        );

        showToast(
            error.message ||
            "فشل تعديل التركيبة",
            "error"
        );

        return;
    }


    closeWorkCatalogModal();


    showToast(
        "تم تعديل التركيبة بنجاح",
        "success"
    );


    loadWorksCatalog();
}
async function loadDepartments(){

    const {
        data:userData
    } =
    await supabaseClient.auth.getUser();

    const userId =
    userData.user.id;

    const {
        data,
        error
    } =
    await supabaseClient
    .from("clinic_departments")
    .select("*")
    .eq("user_id", userId)
    .order("department_name");

    if(error){

        console.log(error);

        return;

    }

    const container =
    document.getElementById("departmentsList");

    container.innerHTML = "";

    /* =========================
       NO DEPARTMENTS
    ========================= */

    if(!data || data.length === 0){

        container.innerHTML = `

        <div
            style="
                text-align:center;
                padding:24px;
                color:#94a3b8;
                font-size:15px;
                display:flex;
                flex-direction:column;
                align-items:center;
                gap:10px;
            "
        >

            <i
                class="fa-solid fa-building-circle-xmark"
                style="
                    font-size:40px;
                    color:#64748b;
                "
            ></i>

            <span>
                لا توجد عيادات مضافة بعد
            </span>

        </div>

        `;

        return;

    }

    /* =========================
       LIST
    ========================= */

    data.forEach(dep=>{

        container.innerHTML += `

        <div class="department-row">

            <div class="department-row-info">

                <i class="fa-solid fa-briefcase-medical"></i>

                <span>
                    ${dep.department_name}
                </span>

            </div>

            <button
                class="department-delete-btn"
                onclick="deleteDepartment('${dep.id}')"
            >

                <i class="fa-solid fa-trash"></i>

                حذف

            </button>

        </div>

        `;

    });

}
async function addDepartment(){

    const name =
        document.getElementById(
            "departmentName"
        ).value.trim();


    if(!name){

        showToast(
            "يرجى إدخال اسم العيادة",
            "warning"
        );

        return;
    }


    const {
        data: userData,
        error: userError
    } =
        await supabaseClient
            .auth
            .getUser();


    if(
        userError ||
        !userData?.user?.id
    ){

        showToast(
            "تعذر التحقق من المستخدم",
            "error"
        );

        return;
    }


    const userId =
        userData.user.id;


    const {
        error
    } =
        await supabaseClient

            .from(
                "clinic_departments"
            )

            .insert({

                user_id:
                    userId,

                department_name:
                    name

            });


    if(error){

        console.error(
            "Add department error:",
            error
        );

        showToast(
            error.message ||
            "فشل إضافة العيادة",
            "error"
        );

        return;
    }


    document.getElementById(
        "departmentName"
    ).value = "";


    showToast(
        "تمت إضافة العيادة بنجاح",
        "success"
    );


    await loadDepartments();
}

async function deleteDepartment(id){

    const confirmed =
        await showConfirm(
            "هل تريد حذف هذه العيادة؟"
        );


    if(!confirmed){

        return;
    }


    const {
        error
    } =
        await supabaseClient

            .from(
                "clinic_departments"
            )

            .delete()

            .eq(
                "id",
                id
            );


    if(error){

        console.error(
            "Delete department error:",
            error
        );

        showToast(
            error.message ||
            "فشل حذف العيادة",
            "error"
        );

        return;
    }


    showToast(
        "تم حذف العيادة بنجاح",
        "success"
    );


    await loadDepartments();
}

/* =========================================================
   INSURANCE MANAGEMENT
   (بدون نسبة خصم عامة — الخصم من جدول الربط فقط)
   ========================================================= */

async function addInsurance(){

    const name =
        document.getElementById(
            "insuranceName"
        ).value.trim();


    if(!name){

        showToast(
            "يرجى إدخال اسم جهة التأمين",
            "warning"
        );

        return;
    }


    /* التحقق من عدم التكرار */

    const {
        data: existing,
        error: checkError
    } =
        await supabaseClient

            .from("insurances")

            .select("id")

            .eq(
                "user_id",
                currentUserId
            )

            .eq(
                "name",
                name
            );


    if(checkError){

        console.error(
            "Check insurance error:",
            checkError
        );

        showToast(
            "حدث خطأ أثناء التحقق",
            "error"
        );

        return;
    }


    if(existing && existing.length){

        showToast(
            "جهة التأمين موجودة بالفعل",
            "warning"
        );

        return;
    }


    const { error } =
        await supabaseClient

            .from("insurances")

            .insert([{

                user_id:
                    currentUserId,

                name:
                    name,

                percent:
                    0

            }]);


    if(error){

        console.error(
            "Add insurance error:",
            error
        );

        showToast(
            error.message ||
            "فشل إضافة جهة التأمين",
            "error"
        );

        return;
    }


    document.getElementById(
        "insuranceName"
    ).value = "";


    showToast(
        "تمت إضافة جهة التأمين بنجاح",
        "success"
    );


    await loadInsurances();
}


async function loadInsurances(){

    const container =
        document.getElementById(
            "insurancesContainer"
        );


    if(!container){

        return;
    }


    container.innerHTML = "";


    const {
        data,
        error
    } =
        await supabaseClient

            .from("insurances")

            .select("*")

            .eq(
                "user_id",
                currentUserId
            )

            .order(
                "name"
            );


    if(error){

        console.error(
            "Load insurances error:",
            error
        );

        showToast(
            "فشل تحميل التأمينات",
            "error"
        );

        return;
    }


    /* تخزين عالمي لاستخدامه في ملف patientt-services.js */

    window.insurances = data || [];


    /* ─── عدد الخدمات المرتبطة بكل تأمين ─── */

    const linkCounts = {};

    const {
        data: links
    } =
        await supabaseClient

            .from("insurance_services")

            .select("insurance_id")

            .eq(
                "user_id",
                currentUserId
            );


    (links || []).forEach(
        link => {

            linkCounts[link.insurance_id] =
                (linkCounts[link.insurance_id] || 0) + 1;

        }
    );


    if(!data || data.length === 0){

        container.innerHTML = `

        <div
            style="
                text-align:center;
                padding:24px;
                color:#94a3b8;
                font-size:15px;
                display:flex;
                flex-direction:column;
                align-items:center;
                gap:10px;
            "
        >

            <i
                class="fa-solid fa-shield-halved"
                style="
                    font-size:40px;
                    color:#64748b;
                "
            ></i>

            <span>
                لا توجد جهات تأمين مضافة بعد
            </span>

        </div>

        `;

        return;

    }


    data.forEach(insurance => {

        const linkedCount =
            linkCounts[insurance.id] || 0;


        container.innerHTML += `

        <div class="service-card">

            <div class="service-card-top">

                <div>

                    <div class="service-name">
                        ${esc(insurance.name)}
                    </div>

                    <div class="service-price">
                        الخدمات المؤمَّنة: ${linkedCount} خدمة
                    </div>

                </div>

                <div class="service-icon">
                    <i class="fa-solid fa-shield-halved"></i>
                </div>

            </div>

            <div class="service-actions">

                <button
                    class="edit-btn"
                    onclick="openLinkServicesModal(${insurance.id}, '${esc(insurance.name)}')"
                >
                    <i class="fa-solid fa-link"></i>
                    ربط الخدمات
                </button>

                <button
                    class="edit-btn"
                    onclick="openInsuranceServicesModal(${insurance.id}, '${esc(insurance.name)}')"
                >
                    <i class="fa-solid fa-file-invoice"></i>
                    التفاصيل
                </button>

                <button
                    class="edit-btn"
                    onclick="editInsurance(${insurance.id}, '${esc(insurance.name)}')"
                >
                    <i class="fa-solid fa-pen"></i>
                    تعديل
                </button>

                <button
                    class="delete-btn"
                    onclick="deleteInsurance(${insurance.id})"
                >
                    <i class="fa-solid fa-trash"></i>
                    حذف
                </button>

            </div>

        </div>

        `;

    });

}


let editingInsuranceId = null;


async function editInsurance(id, name){

    editingInsuranceId = id;

    document.getElementById(
        "modalInsuranceName"
    ).value = name;


    document.getElementById(
        "insuranceModal"
    ).style.display = "flex";

}


function closeInsuranceModal(){

    editingInsuranceId = null;

    document.getElementById(
        "insuranceModal"
    ).style.display = "none";

}


async function saveInsuranceEdit(){

    const newName =
        document.getElementById(
            "modalInsuranceName"
        ).value.trim();


    if(!newName){

        showToast(
            "يرجى إدخال اسم جهة التأمين",
            "warning"
        );

        return;
    }


    const { error } =
        await supabaseClient

            .from("insurances")

            .update({

                name:
                    newName

            })

            .eq(
                "id",
                editingInsuranceId
            );


    if(error){

        console.error(
            "Update insurance error:",
            error
        );

        showToast(
            error.message ||
            "فشل تعديل جهة التأمين",
            "error"
        );

        return;
    }


    closeInsuranceModal();


    showToast(
        "تم تعديل جهة التأمين بنجاح",
        "success"
    );


    await loadInsurances();
}


async function deleteInsurance(id){

    const confirmed =
        await showConfirm(
            "هل تريد حذف جهة التأمين؟"
        );


    if(!confirmed){

        return;
    }


    const { error } =
        await supabaseClient

            .from("insurances")

            .delete()

            .eq(
                "id",
                id
            );


    if(error){

        console.error(
            "Delete insurance error:",
            error
        );

        showToast(
            error.message ||
            "فشل حذف جهة التأمين",
            "error"
        );

        return;
    }


    showToast(
        "تم حذف جهة التأمين بنجاح",
        "success"
    );


    await loadInsurances();
}


/* =========================================================
   INSURANCE — SETTLEMENT
   ========================================================= */

async function getInsuranceSettlement(
    insuranceId,
    monthKey
) {
    const settlementMonth = `${monthKey}-01`;

    const {
        data,
        error
    } = await supabaseClient
        .from('insurance_settlements')
        .select('id, is_settled, settled_at')
        .eq('insurance_id', insuranceId)
        .eq('user_id', currentUserId)
        .eq('settlement_month', settlementMonth)
        .maybeSingle();

    if (error) {
        console.error(
            'Settlement fetch error:',
            error
        );

        return null;
    }

    return data;
}


async function toggleInsuranceSettlement(
    insuranceId,
    monthKey,
    checkbox
) {

    const isSettled = checkbox.checked;

    const settlementMonth = `${monthKey}-01`;

    checkbox.disabled = true;

    try {

        const {
            data,
            error
        } = await supabaseClient
            .from('insurance_settlements')
            .upsert(
                {
                    user_id: currentUserId,
                    insurance_id: insuranceId,
                    settlement_month: settlementMonth,
                    is_settled: isSettled,
                    settled_at: isSettled
                        ? new Date().toISOString()
                        : null
                },
                {
                    onConflict:
                        'user_id,insurance_id,settlement_month'
                }
            )
            .select()
            .single();


        if (error) {
            console.error(
                'Settlement update error:',
                error
            );

            checkbox.checked = !isSettled;

            if (typeof showToast === 'function') {
                showToast(
                    'حدث خطأ أثناء حفظ حالة التسوية',
                    'error'
                );
            }

            return;
        }


        /* تحديث شكل الحالة */

        const wrapper =
            checkbox.closest('.settlement-toggle');

        if (wrapper) {
            wrapper.classList.toggle(
                'settled',
                isSettled
            );
        }


        if (typeof showToast === 'function') {

            showToast(
                isSettled
                    ? 'تم تسجيل تسوية هذا الشهر'
                    : 'تم إلغاء تسوية هذا الشهر',
                'success'
            );

        }


    } catch (error) {

        console.error(
            'Unexpected settlement error:',
            error
        );

        checkbox.checked = !isSettled;

    } finally {

        checkbox.disabled = false;

    }

}


let currentInsurancePaymentId = null;
let currentInsuranceName = '';


/* =========================================================
   INSURANCE PAYMENT MODAL
   ========================================================= */

function openInsurancePaymentModal(insuranceId) {

    currentInsurancePaymentId = insuranceId;

    document.getElementById(
        'insurancePaymentAmount'
    ).value = '';

    document.getElementById(
        'insurancePaymentDate'
    ).value = new Date()
        .toISOString()
        .split('T')[0];

    document.getElementById(
        'insurancePaymentMethod'
    ).value = 'cash';

    document.getElementById(
        'insurancePaymentNotes'
    ).value = '';

    document.getElementById(
        'insurancePaymentModal'
    ).style.display = 'flex';
}


function closeInsurancePaymentModal() {

    document.getElementById(
        'insurancePaymentModal'
    ).style.display = 'none';

    currentInsurancePaymentId = null;
}


/* =========================================================
   SAVE INSURANCE PAYMENT
   ========================================================= */

async function saveInsurancePayment() {

    if (!currentInsurancePaymentId) {
        return;
    }

    const insuranceId = currentInsurancePaymentId;
    const insuranceName = currentInsuranceName;


    const amount = Number(
        document.getElementById(
            'insurancePaymentAmount'
        ).value
    );


    const paymentDate =
        document.getElementById(
            'insurancePaymentDate'
        ).value;


    const paymentMethod =
        document.getElementById(
            'insurancePaymentMethod'
        ).value;


    const notes =
        document.getElementById(
            'insurancePaymentNotes'
        ).value.trim();


    /* =====================================================
       VALIDATION
       ===================================================== */

    if (!amount || amount <= 0) {

        if (typeof showToast === 'function') {
            showToast(
                'أدخل قيمة دفعة صحيحة',
                'error'
            );
        }

        return;
    }


    if (!paymentDate) {

        if (typeof showToast === 'function') {
            showToast(
                'اختر تاريخ الدفعة',
                'error'
            );
        }

        return;
    }


    /* =====================================================
       INSERT PAYMENT
       ===================================================== */

    const { error } = await supabaseClient
        .from('insurance_payments')
        .insert({
            user_id: currentUserId,
            insurance_id: insuranceId,
            amount: amount,
            payment_date: paymentDate,
            payment_method: paymentMethod,
            notes: notes || null
        });


    if (error) {

        console.error(
            'Insurance payment error:',
            error
        );

        if (typeof showToast === 'function') {
            showToast(
                'حدث خطأ أثناء حفظ الدفعة',
                'error'
            );
        }

        return;
    }


    /* =====================================================
       SUCCESS
       ===================================================== */

    if (typeof showToast === 'function') {
        showToast(
            'تمت إضافة الدفعة بنجاح',
            'success'
        );
    }


    closeInsurancePaymentModal();


    /* =====================================================
       إعادة تحميل بيانات جهة التأمين
       ===================================================== */

    await openInsuranceServicesModal(
        insuranceId,
        insuranceName
    );
}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function esc(str) {

    return String(str ?? '').replace(
        /[&<>"']/g,
        c => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[c])
    );
}


/* =========================================================
   FORMAT NUMBER
   ========================================================= */

function fmt(n) {

    return (+n || 0).toLocaleString(
        'en-US',
        {
            maximumFractionDigits: 2
        }
    );
}


/* =========================================================
   INSURANCE — SERVICES DETAILS MODAL
   ========================================================= */

async function openInsuranceServicesModal(id, name) {

    const modal =
        document.getElementById(
            'insuranceServicesModal'
        );

    const title =
        document.getElementById(
            'insModalTitle'
        );

    const content =
        document.getElementById(
            'insuranceServicesContent'
        );


    title.textContent =
        'خدمات تأمين: ' + name;


    currentInsuranceName = name;


    content.innerHTML = `
        <p class="empty-msg">
            جاري التحميل...
        </p>
    `;


    modal.style.display = 'flex';


    try {

        /* =====================================================
           1. جلب الخدمات
           ===================================================== */

        const {
            data: services,
            error: servicesError
        } = await supabaseClient
            .from('patientt_services')
            .select(`
                id,
                patient_id,
                service_name,
                total_amount,
                paid_amount,
                remaining_amount,
                remain_amount,
                discount_amount,
                quantity,
                unit_price,
                created_at,
                insurance_id,
                insurance_percent,
                user_id
            `)
            .eq('insurance_id', id)
            .eq('user_id', currentUserId)
            .order('created_at', {
                ascending: false
            });


        if (servicesError) {

            console.error(
                'Insurance services error:',
                servicesError
            );

            content.innerHTML = `
                <p class="empty-msg">
                    حدث خطأ أثناء تحميل الخدمات
                </p>
            `;

            return;
        }


        /* =====================================================
           2. جلب دفعات جهة التأمين
           ===================================================== */

        const {
            data: insurancePayments,
            error: paymentsError
        } = await supabaseClient
            .from('insurance_payments')
            .select(`
                id,
                amount,
                payment_date,
                payment_method,
                notes,
                created_at
            `)
            .eq('insurance_id', id)
            .eq('user_id', currentUserId)
            .order('payment_date', {
                ascending: false
            });


        if (paymentsError) {

            console.error(
                'Insurance payments error:',
                paymentsError
            );

        }


        const payments =
            insurancePayments || [];


        /* =====================================================
           3. Patient IDs
           ===================================================== */

        const patientIds = [
            ...new Set(
                (services || [])
                    .map(service => service.patient_id)
                    .filter(
                        id =>
                            id !== null &&
                            id !== undefined
                    )
            )
        ];


        /* =====================================================
           4. جلب أسماء المرضى
           ===================================================== */

        const patientsMap = {};


        if (patientIds.length > 0) {

            const {
                data: patients,
                error: patientsError
            } = await supabaseClient
                .from('patients')
                .select(
                    'id, full_name'
                )
                .in(
                    'id',
                    patientIds
                )
                .eq(
                    'user_id',
                    currentUserId
                );


            if (patientsError) {

                console.error(
                    'Insurance patients error:',
                    patientsError
                );

            } else {

                (patients || []).forEach(
                    patient => {

                        patientsMap[
                            String(patient.id)
                        ] =
                            patient.full_name ||
                            'غير معروف';

                    }
                );

            }

        }


        /* =====================================================
           5. تجميع الخدمات والدفعات حسب الشهر
           ===================================================== */

        const months = {};


        /*
         * الخدمات
         */

        (services || []).forEach(
            service => {

                if (!service.created_at) {
                    return;
                }


                const date =
                    new Date(
                        service.created_at
                    );


                const key =
                    date.getFullYear() +
                    '-' +
                    String(
                        date.getMonth() + 1
                    ).padStart(2, '0');


                if (!months[key]) {

                    months[key] = {

                        date: date,

                        items: [],

                        payments: []

                    };

                }


                months[key].items.push(
                    service
                );

            }
        );


        /*
         * الدفعات
         */

        payments.forEach(
            payment => {

                if (!payment.payment_date) {
                    return;
                }


                const key =
                    payment.payment_date
                        .slice(0, 7);


                if (!months[key]) {

                    const date =
                        new Date(
                            key + '-01T00:00:00'
                        );


                    months[key] = {

                        date: date,

                        items: [],

                        payments: []

                    };

                }


                months[key].payments.push(
                    payment
                );

            }
        );


        /* =====================================================
           6. لا توجد خدمات ولا دفعات
           ===================================================== */

        if (
            Object.keys(months).length === 0
        ) {

            content.innerHTML = `
                <p class="empty-msg">
                    لا توجد خدمات أو دفعات مسجلة لهذه الجهة
                </p>
            `;

            return;
        }


        content.innerHTML = '';


        /* =====================================================
           7. ترتيب الشهور
           ===================================================== */

        const monthKeys =
            Object.keys(months)
                .sort()
                .reverse();


        /* =====================================================
           8. عرض كل شهر
           ===================================================== */

        for (const key of monthKeys) {

            const month =
                months[key];


            /* =================================================
               Settlement
               ================================================= */

            const settlement =
                await getInsuranceSettlement(
                    id,
                    key
                );


            const isSettled =
                settlement?.is_settled === true;


            /* =================================================
               اسم الشهر
               ================================================= */

            const monthName =
                new Intl.DateTimeFormat(
                    'ar-EG',
                    {
                        month: 'long',
                        year: 'numeric'
                    }
                ).format(
                    month.date
                );


            /* =================================================
               إحصائيات الخدمات
               ================================================= */

            let totalBefore = 0;

            let totalAfter = 0;

            let totalDiscount = 0;

            let totalPaid = 0;

            let totalRemain = 0;


            /* =================================================
               إنشاء صفوف الخدمات
               (مع عرض نسبة الخصم)
               ================================================= */

            const rows =
                month.items.map(
                    service => {

                        const quantity =
                            Number(
                                service.quantity
                            ) || 1;


                        const unitPrice =
                            Number(
                                service.unit_price
                            ) || 0;


                        const before =
                            unitPrice *
                            quantity;


                        const insurancePercent =
                            Number(
                                service.insurance_percent
                            ) || 0;


                        const insuranceAmount =
                            before *
                            (
                                insurancePercent /
                                100
                            );


                        const after =
                            before -
                            insuranceAmount;


                        const discount =
                            before -
                            after;


                        totalDiscount +=
                            discount;


                        const paid =
                            Number(
                                service.paid_amount
                            ) || 0;


                        const remain =
                            service.remaining_amount !== null &&
                            service.remaining_amount !== undefined

                                ? Number(
                                    service.remaining_amount
                                ) || 0

                                : Number(
                                    service.remain_amount
                                ) || 0;


                        totalBefore +=
                            before;

                        totalAfter +=
                            after;

                        totalPaid +=
                            paid;

                        totalRemain +=
                            remain;


                        const patientName =
                            patientsMap[
                                String(
                                    service.patient_id
                                )
                            ] ||
                            'غير معروف';


                        return `
                            <tr>

                                <td>
                                    ${esc(
                                        patientName
                                    )}
                                </td>

                                <td>
                                    ${esc(
                                        service.service_name ||
                                        '-'
                                    )}
                                </td>

                                <td>
                                    <strong>
                                        ${insurancePercent}%
                                    </strong>
                                </td>

                                <td>
                                    ${fmt(
                                        before
                                    )}
                                </td>

                                <td>
                                    ${fmt(
                                        after
                                    )}
                                </td>

                                <td>
                                    ${fmt(
                                        paid
                                    )}
                                </td>

                                <td>
                                    ${fmt(
                                        remain
                                    )}
                                </td>

                                <td>
                                    ${new Date(
                                        service.created_at
                                    ).toLocaleDateString(
                                        'ar-EG'
                                    )}
                                </td>

                            </tr>
                        `;

                    }
                ).join('');


            /* =================================================
               دفعات الشهر
               ================================================= */

            const monthPayments =
                month.payments || [];


            const totalMonthPayments =
                monthPayments.reduce(
                    (
                        sum,
                        payment
                    ) =>
                        sum +
                        (
                            Number(
                                payment.amount
                            ) || 0
                        ),
                    0
                );


            /* =================================================
               أسماء طرق الدفع
               ================================================= */

            const methodNames = {

                cash: 'نقدي',

                bank: 'تحويل بنكي',

                card: 'بطاقة',

                cheque: 'شيك',

                other: 'أخرى'

            };


            /* =================================================
               جدول الدفعات
               ================================================= */

            const paymentsRows =
                monthPayments
                    .map(
                        payment => {

                            return `
                                <tr>

                                    <td>
                                        ${new Date(
                                            payment.payment_date +
                                            'T00:00:00'
                                        ).toLocaleDateString(
                                            'ar-EG'
                                        )}
                                    </td>

                                    <td>
                                        <strong>
                                            ${fmt(
                                                payment.amount
                                            )}
                                        </strong>
                                    </td>

                                    <td>
                                        ${
                                            methodNames[
                                                payment.payment_method
                                            ] ||
                                            payment.payment_method ||
                                            '-'
                                        }
                                    </td>

                                    <td>
                                        ${esc(
                                            payment.notes ||
                                            '-'
                                        )}
                                    </td>

                                    <td>
    <button
        type="button"
        class="insurance-payment-delete-btn"
        onclick="event.stopPropagation(); deleteInsurancePayment(${payment.id});"
        title="حذف الدفعة"
    >
        <i class="fa-solid fa-trash"></i>
    </button>
</td>

                                </tr>
                            `;

                        }
                    )
                    .join('');


            /* =================================================
               إضافة الشهر
               ================================================= */

            content.insertAdjacentHTML(
                'beforeend',
                `

                <details
                    class="modern-details services-details"
                >

                    <!-- ======================================
                         HEADER
                         ====================================== -->

                    <summary class="panel-header">

                        <span
                            class="month-title-wrapper"
                        >

                            <i
                                class="fa-solid fa-calendar"
                            ></i>

                            ${esc(
                                monthName
                            )}

                            <em
                                class="ins-count"
                            >
                                ${
                                    month.items.length
                                }
                                خدمة
                            </em>

                        </span>


                        <span
                            class="month-actions"
                        >

                            <!-- ==============================
                                 طباعة تقرير الشهر
                                 ============================== -->

                            <button
                                type="button"
                                class="edit-btn"

                                onclick="
                                    event.stopPropagation();

                                    printInsuranceMonthReport(
                                        ${id},
                                        '${esc(name)}',
                                        '${key}'
                                    );
                                "

                                title="طباعة تقرير الشهر"
                            >

                                <i
                                    class="
                                        fa-solid
                                        fa-print
                                    "
                                ></i>

                                تقرير

                            </button>


                            <!-- ==============================
                                 Settlement
                                 ============================== -->

                            <label
                                class="
                                    settlement-toggle
                                    ${
                                        isSettled
                                            ? 'settled'
                                            : ''
                                    }
                                "
                                onclick="
                                    event.stopPropagation();
                                "
                                title="
                                    ${
                                        isSettled
                                            ? 'تمت التسوية'
                                            : 'لم تتم التسوية'
                                    }
                                "
                            >

                                <input
                                    type="checkbox"

                                    ${
                                        isSettled
                                            ? 'checked'
                                            : ''
                                    }

                                    onchange="
                                        toggleInsuranceSettlement(
                                            ${id},
                                            '${key}',
                                            this
                                        )
                                    "
                                >

                                <span
                                    class="settlement-slider"
                                ></span>

                                <span
                                    class="settlement-label"
                                >
                                    ${
                                        isSettled
                                            ? 'تمت التسوية'
                                            : 'غير مسدد'
                                    }
                                </span>

                            </label>


                            <i
                                class="
                                    fa-solid
                                    fa-chevron-down
                                    details-arrow
                                "
                            ></i>

                        </span>

                    </summary>


                    <!-- ======================================
                         DETAILS CONTENT
                         ====================================== -->

                    <div
                        class="details-content"
                    >


                        <!-- ==================================
                             إحصائيات الشهر
                             ================================== -->

                        ${
                            month.items.length > 0
                                ?

                        `
                        <div
                            class="ins-stats"
                        >

                            <div
                                class="ins-stat"
                            >
                                <span>
                                    الخدمات
                                </span>

                                <b>
                                    ${
                                        month.items.length
                                    }
                                </b>
                            </div>


                            <div
                                class="ins-stat"
                            >
                                <span>
                                    قبل الخصم
                                </span>

                                <b>
                                    ${fmt(
                                        totalBefore
                                    )}
                                </b>
                            </div>


                            <div
                                class="ins-stat"
                            >
                                <span>
                                    بعد الخصم
                                </span>

                                <b>
                                    ${fmt(
                                        totalAfter
                                    )}
                                </b>
                            </div>


                            <div
                                class="ins-stat"
                            >
                                <span>
                              المحصل من المرضى
                                </span>

                                <b>
                                    ${fmt(
                                        totalPaid
                                    )}
                                </b>
                            </div>


                            <div
                                class="ins-stat"
                            >
                                <span>
                                    المتبقي
                                </span>

                                <b>
                                    ${fmt(
                                        totalRemain
                                    )}
                                </b>
                            </div>

                            <div
                                class="ins-stat"
                            >
                                <span>
                                    إجمالي قيمة الخصم
                                </span>

                                <b>
                                    ${fmt(
                                        totalDiscount
                                    )}
                                </b>
                            </div>


                        </div>
                        `
                        : ''
                        }


                        <!-- ==================================
                             قسم الخدمات
                             ================================== -->

                        <div
                            class="
                                insurance-month-services
                            "
                        >

                            <div
                                class="
                                    insurance-month-section-header
                                "
                            >

                                <h4>

                                    <i
                                        class="
                                            fa-solid
                                            fa-tooth
                                        "
                                    ></i>

                                    خدمات الشهر

                                </h4>

                                <span>
                                    ${
                                        month.items.length
                                    }
                                    خدمة
                                </span>

                            </div>


                            ${
                                month.items.length > 0

                                    ?

                                `
                                <div
                                    class="table-wrap"
                                >

                                    <table
                                        class="ins-table"
                                    >

                                        <thead>

                                            <tr>

                                                <th>
                                                    المريض
                                                </th>

                                                <th>
                                                    الخدمة
                                                </th>

                                                <th>
                                                    نسبة الخصم
                                                </th>

                                                <th>
                                                    قبل الخصم
                                                </th>

                                                <th>
                                                    بعد الخصم
                                                </th>

                                                <th>
                                                    المدفوع
                                                </th>

                                                <th>
                                                    المتبقي
                                                </th>

                                                <th>
                                                    التاريخ
                                                </th>

                                            </tr>

                                        </thead>


                                        <tbody>

                                            ${rows}

                                        </tbody>

                                    </table>

                                </div>
                                `

                                    :

                                `
                                <div
                                    class="empty-msg"
                                >
                                    لا توجد خدمات
                                    مسجلة لهذا الشهر
                                </div>
                                `
                            }

                        </div>


                        <!-- ==================================
                             قسم دفعات الشهر
                             ================================== -->

                        <div
                            class="
                                insurance-month-payments
                            "
                        >

                            <div
                                class="
                                    insurance-month-payments-header
                                "
                            >

                                <div>

                                    <h4>

                                        <i
                                            class="
                                                fa-solid
                                                fa-money-bill-transfer
                                            "
                                        ></i>

                                        دفعات الشهر

                                    </h4>

                                    <span>

                                        إجمالي المدفوع من جهة التأمين:
                                        <strong>
                                            ${fmt(
                                                totalMonthPayments
                                            )}
                                        </strong>

                                    </span>

                                </div>


                                <button
                                    type="button"
                                    class="btn-primary"

                                    onclick="
                                        event.stopPropagation();

                                        openInsurancePaymentModal(
                                            ${id}
                                        );
                                    "
                                >

                                    <i
                                        class="
                                            fa-solid
                                            fa-plus
                                        "
                                    ></i>

                                    إضافة دفعة

                                </button>

                                <!-- طباعة فاتورة المدفوعات -->
<button
    type="button"
    class="edit-btn"

    onclick="
        event.stopPropagation();

        printInsurancePaymentsInvoice(
            ${id},
            '${esc(name)}',
            '${key}'
        );
    "

    title="طباعة فاتورة المدفوعات"
>

    <i class="fa-solid fa-file-invoice"></i>

    فاتورة

</button>

                            </div>


                            ${
                                monthPayments.length > 0

                                    ?

                                `
                                <div
                                    class="table-wrap"
                                >

                                    <table
                                        class="
                                            ins-table
                                            insurance-payments-table
                                        "
                                    >

                                        <thead>

                                            <tr>

                                                <th>
                                                    التاريخ
                                                </th>

                                                <th>
                                                    المبلغ
                                                </th>

                                                <th>
                                                    طريقة الدفع
                                                </th>

                                                <th>
                                                    ملاحظات
                                                </th>

                                                <th>
                                                    إجراء
                                                </th>

                                            </tr>

                                        </thead>


                                        <tbody>

                                            ${paymentsRows}

                                        </tbody>

                                    </table>

                                </div>
                                `

                                    :

                                `
                                <div
                                    class="
                                        insurance-no-payments
                                    "
                                >

                                    <i
                                        class="
                                            fa-solid
                                            fa-receipt
                                        "
                                    ></i>

                                    <span>
                                        لا توجد دفعات
                                        لهذا الشهر
                                    </span>

                                </div>
                                `
                            }

                        </div>


                    </div>

                </details>

                `
            );

        }


    } catch (error) {

        console.error(
            'Unexpected insurance modal error:',
            error
        );


        content.innerHTML = `
            <p class="empty-msg">
                حدث خطأ أثناء تحميل الخدمات
            </p>
        `;

    }

}


/* =========================================================
   PRINT INSURANCE MONTH REPORT
   طباعة تقرير شهري لإرساله لجهة التأمين
   ========================================================= */
/* =========================================================
   PRINT — SHARED DESIGN STYLES
   (تصميم موحد للتقارير والفواتير)
   ========================================================= */

function getPrintStyles() {

    return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
            direction: rtl;
            padding: 30px 35px;
            color: #1e293b;
            background: #fff;
        }

        /* ─── الترويسة ─── */

        .report-header {
            background: linear-gradient(135deg, #0f766e 0%, #134e4a 100%);
            color: #fff;
            border-radius: 14px;
            padding: 22px 28px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
        }

        .report-header .brand h1 {
            font-size: 22px;
            margin-bottom: 6px;
        }

        .report-header .brand p {
            font-size: 13px;
            opacity: .85;
        }

        .report-header .badge {
            background: rgba(255,255,255,.15);
            border: 1px solid rgba(255,255,255,.35);
            border-radius: 12px;
            padding: 12px 20px;
            text-align: center;
            font-size: 13px;
        }

        .report-header .badge strong {
            display: block;
            font-size: 16px;
            margin-top: 4px;
        }

        /* ─── بطاقة المعلومات ─── */

        .info-card {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            margin-bottom: 22px;
        }

        .info-card .info-item {
            flex: 1;
            min-width: 150px;
            background: #f0fdfa;
            border: 1px solid #99f6e4;
            border-radius: 10px;
            padding: 12px 16px;
        }

        .info-card .info-item span {
            display: block;
            font-size: 12px;
            color: #0f766e;
            margin-bottom: 5px;
            font-weight: 600;
        }

        .info-card .info-item b {
            font-size: 15px;
            color: #134e4a;
        }

        /* ─── الجدول ─── */

        table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            font-size: 13.5px;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(15,118,110,.12);
        }

        thead th {
            background: #0f766e;
            color: #fff;
            padding: 12px 10px;
            font-size: 13px;
            font-weight: 600;
        }

        tbody td {
            padding: 10px;
            text-align: center;
            border-bottom: 1px solid #e2e8f0;
            background: #fff;
        }

        tbody tr:nth-child(even) td {
            background: #f8fafc;
        }

        tbody tr:last-child td {
            border-bottom: none;
        }

        .num {
            font-weight: 700;
            color: #0f766e;
        }

        /* ─── صندوق الإجماليات ─── */

        .totals-box {
            margin-top: 24px;
            background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%);
            border: 1px solid #5eead4;
            border-radius: 14px;
            padding: 18px 24px;
            display: flex;
            justify-content: space-around;
            gap: 14px;
            flex-wrap: wrap;
        }

        .totals-box .total-item {
            text-align: center;
            min-width: 150px;
        }

        .totals-box .total-item span {
            display: block;
            font-size: 12px;
            color: #0f766e;
            margin-bottom: 6px;
            font-weight: 600;
        }

        .totals-box .total-item b {
            font-size: 20px;
            color: #134e4a;
        }

        .totals-box .total-item.grand b {
            font-size: 24px;
            color: #b45309;
        }

        /* ─── التذييل ─── */

        .report-footer {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
            gap: 20px;
        }

        .signature {
            text-align: center;
            width: 200px;
        }

        .signature .line {
            border-top: 2px dashed #94a3b8;
            margin-bottom: 8px;
            padding-top: 8px;
            font-size: 13px;
            color: #475569;
            font-weight: 600;
        }

        .print-date {
            margin-top: 30px;
            text-align: center;
            font-size: 12px;
            color: #94a3b8;
        }

        @media print {
            body { padding: 10px; }
            .report-header {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            thead th, .totals-box, .info-item {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
    `;
}



/* =========================================================
   PRINT IN SAME PAGE
   طباعة داخل نفس الصفحة عبر iframe مخفي — بدون نافذة جديدة
   (المستند الكامل يدخل الـ iframe فتبقى كل الستايلات معزولة
    100% كما كانت في النافذة المنبثقة)
   ========================================================= */

function printInSamePage(fullHtml) {

    /* إزالة أي iframe سابق من طباعة سابقة */

    const oldFrame =
        document.getElementById(
            'samePagePrintFrame'
        );


    if (oldFrame) {

        oldFrame.parentNode.removeChild(
            oldFrame
        );

    }


    /* إنشاء iframe مخفي خارج الشاشة */

    const iframe =
        document.createElement(
            'iframe'
        );


    iframe.id =
        'samePagePrintFrame';


    /*
     * ملاحظة: لا نستخدم display:none
     * لأن بعض المتصفحات ترفض طباعة iframe مخفي،
     * لذا نضعه خارج الشاشة بأبعاد حقيقية
     */

    iframe.setAttribute(
        'aria-hidden',
        'true'
    );


    iframe.style.cssText =
        `
        position: fixed;
        top: 0;
        left: -10000px;
        width: 900px;
        height: 700px;
        border: 0;
        `;


    document.body.appendChild(
        iframe
    );


    /* كتابة المستند الكامل داخل الـ iframe
       (يتضمن head وكل الستايلات كما هي) */

    const frameDoc =
        iframe.contentWindow.document;


    frameDoc.open();

    frameDoc.write(
        fullHtml
    );

    frameDoc.close();


    /* طباعة محتوى الـ iframe ثم إزالته */

    setTimeout(
        () => {

            try {

                iframe.contentWindow.focus();

                iframe.contentWindow.print();

            } catch (printError) {

                console.error(
                    'Print iframe error:',
                    printError
                );


                if (
                    typeof showToast === 'function'
                ) {

                    showToast(
                        'حدث خطأ أثناء الطباعة',
                        'error'
                    );

                }

            }


            /* إزالة الـ iframe بعد انتهاء الطباعة */

            setTimeout(
                () => {

                    if (
                        iframe.parentNode
                    ) {

                        iframe.parentNode.removeChild(
                            iframe
                        );

                    }

                },
                2000
            );

        },
        300
    );

}


/* =========================================================
   PRINT INSURANCE MONTH REPORT  (مُعاد التصميم)
   طباعة تقرير شهري لإرساله لجهة التأمين
   ========================================================= */

async function printInsuranceMonthReport(
    insuranceId,
    insuranceName,
    monthKey
) {

    try {

        if (typeof showToast === 'function') {
            showToast(
                'جاري تجهيز التقرير...',
                'info'
            );
        }


        /* نطاق الشهر */

        const startDate =
            `${monthKey}-01T00:00:00`;


        const nextMonth =
            new Date(
                monthKey + '-01T00:00:00'
            );

        nextMonth.setMonth(
            nextMonth.getMonth() + 1
        );

        const endDate =
            nextMonth.toISOString();


        /* جلب خدمات الشهر */

        const {
            data: services,
            error: servicesError
        } =
            await supabaseClient

                .from('patientt_services')

                .select(`
                    id,
                    patient_id,
                    service_name,
                    unit_price,
                    quantity,
                    insurance_percent,
                    paid_amount,
                    created_at
                `)

                .eq(
                    'insurance_id',
                    insuranceId
                )

                .eq(
                    'user_id',
                    currentUserId
                )

                .gte(
                    'created_at',
                    startDate
                )

                .lt(
                    'created_at',
                    endDate
                )

                .order(
                    'created_at',
                    {
                        ascending: true
                    }
                );


        if (servicesError) {

            console.error(
                'Report services error:',
                servicesError
            );

            showToast(
                'حدث خطأ أثناء تجهيز التقرير',
                'error'
            );

            return;
        }


        if (!services || !services.length) {

            showToast(
                'لا توجد خدمات في هذا الشهر',
                'warning'
            );

            return;
        }


        /* جلب أسماء المرضى */

        const patientIds =
            [
                ...new Set(
                    services
                        .map(s => s.patient_id)
                        .filter(Boolean)
                )
            ];


        const patientsMap = {};


        if (patientIds.length > 0) {

            const {
                data: patients
            } =
                await supabaseClient

                    .from('patients')

                    .select(
                        'id, full_name'
                    )

                    .in(
                        'id',
                        patientIds
                    )

                    .eq(
                        'user_id',
                        currentUserId
                    );


            (patients || []).forEach(
                p => {

                    patientsMap[
                        String(p.id)
                    ] =
                        p.full_name ||
                        'غير معروف';

                }
            );

        }


        /* بناء صفوف التقرير */

        let totalBefore = 0;

        let totalDiscount = 0;

        let totalAfter = 0;

        let totalPatientPaid = 0;


        const reportRows =
            services.map(
                (service, index) => {

                    const quantity =
                        Number(
                            service.quantity
                        ) || 1;


                    const before =
                        (
                            Number(
                                service.unit_price
                            ) || 0
                        ) * quantity;


                    const percent =
                        Number(
                            service.insurance_percent
                        ) || 0;


                    const discountValue =
                        before *
                        (
                            percent / 100
                        );


                    const after =
                        before -
                        discountValue;


                    totalPatientPaid +=
                        Number(
                            service.paid_amount
                        ) || 0;

                    totalBefore +=
                        before;

                    totalDiscount +=
                        discountValue;

                    totalAfter +=
                        after;


                    return `

                        <tr>

                            <td>
                                ${index + 1}
                            </td>

                            <td>
                                ${esc(
                                    patientsMap[
                                        String(
                                            service.patient_id
                                        )
                                    ] ||
                                    'غير معروف'
                                )}
                            </td>

                            <td>
                                ${esc(
                                    service.service_name ||
                                    '-'
                                )}
                            </td>

                            <td>
                                ${new Date(
                                    service.created_at
                                ).toLocaleDateString(
                                    'ar-EG'
                                )}
                            </td>

                            <td class="num">
                                ${fmt(
                                    before
                                )}
                            </td>

                            <td>
                                ${percent}%
                            </td>

                            <td class="num">
                                ${fmt(
                                    discountValue
                                )}
                            </td>

                            <td class="num">
                                ${fmt(
                                    after
                                )}
                            </td>

                        </tr>

                    `;

                }
            ).join('');


        /* اسم الشهر */

        const monthName =
            new Intl.DateTimeFormat(
                'ar-EG',
                {
                    month: 'long',
                    year: 'numeric'
                }
            ).format(
                new Date(
                    monthKey + '-01T00:00:00'
                )
            );


        /* بناء صفحة الطباعة */

        const reportHTML =
            `
            <!DOCTYPE html>

            <html
                dir="rtl"
                lang="ar"
            >

            <head>

                <meta charset="UTF-8">

                <title>
                    تقرير تأمين ${esc(insuranceName)} - ${monthName}
                </title>

                <style>
                    ${getPrintStyles()}
                </style>

            </head>

            <body>


                <!-- ═══════ الترويسة ═══════ -->

                <div class="report-header">

                    <div class="brand">

                        <h1>
                            تقرير خدمات التأمين الشهري
                        </h1>

                        <p>
                            كشف مفصل بالخدمات المقدمة
                            للمرضى المشمولين بالتأمين
                        </p>

                    </div>

                    <div class="badge">

                        ${esc(monthName)}

                        <strong>
                            ${esc(insuranceName)}
                        </strong>

                    </div>

                </div>


                <!-- ═══════ بطاقة المعلومات ═══════ -->

                <div class="info-card">

                    <div class="info-item">

                        <span>
                            جهة التأمين
                        </span>

                        <b>
                            ${esc(insuranceName)}
                        </b>

                    </div>


                    <div class="info-item">

                        <span>
                            الشهر
                        </span>

                        <b>
                            ${monthName}
                        </b>

                    </div>


                    <div class="info-item">

                        <span>
                            عدد الخدمات
                        </span>

                        <b>
                            ${services.length}
                            خدمة
                        </b>

                    </div>

                </div>


                <!-- ═══════ جدول الخدمات ═══════ -->

                <table>

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
                                التاريخ
                            </th>

                            <th>
                                قبل الخصم
                            </th>

                            <th>
                                نسبة الخصم
                            </th>

                            <th>
                                قيمة الخصم
                            </th>

                            <th>
                                بعد الخصم
                            </th>

                        </tr>

                    </thead>


                    <tbody>

                        ${reportRows}

                    </tbody>

                </table>


                <!-- ═══════ الإجماليات ═══════ -->

                <div class="totals-box">

                    <div class="total-item">

                        <span>
                            الإجمالي قبل الخصم
                        </span>

                        <b>
                            ${fmt(totalBefore)}
                        </b>

                    </div>


                    <div class="total-item">

                        <span>
                            قيمة الخصم
                            (المستحق من التأمين)
                        </span>

                        <b>
                            ${fmt(totalDiscount)}
                        </b>

                    </div>


                    <div class="total-item">

                        <span>
                            مستحق المرضى
                            (بعد الخصم)
                        </span>

                        <b>
                            ${fmt(totalAfter)}
                        </b>

                    </div>


                    <div class="total-item grand">

                        <span>
                            المحصل من المرضى
                        </span>

                        <b>
                            ${fmt(totalPatientPaid)}
                        </b>

                    </div>

                </div>


                <!-- ═══════ التوقيعات ═══════ -->

                <div class="report-footer">

                    <div class="signature">

                        <div class="line">
                            توقيع العيادة
                        </div>

                    </div>


                    <div class="signature">

                        <div class="line">
                            توقيع جهة التأمين
                        </div>

                    </div>

                </div>


                <div class="print-date">

                    تاريخ إصدار التقرير:
                    ${new Date().toLocaleDateString('ar-EG')}

                </div>


            </body>

            </html>
            `;


        /* الطباعة في نفس الصفحة */

        printInSamePage(reportHTML);


    } catch (error) {

        console.error(
            'Print report error:',
            error
        );

        if (typeof showToast === 'function') {
            showToast(
                'حدث خطأ أثناء تجهيز التقرير',
                'error'
            );
        }

    }

}


/* =========================================================
   PRINT INSURANCE PAYMENTS INVOICE  (جديد)
   طباعة فاتورة بالمدفوعات المستلمة من جهة التأمين لكل شهر
   ========================================================= */

async function printInsurancePaymentsInvoice(
    insuranceId,
    insuranceName,
    monthKey
) {

    try {

        if (typeof showToast === 'function') {
            showToast(
                'جاري تجهيز الفاتورة...',
                'info'
            );
        }


        /* نطاق الشهر */

        const startDate =
            `${monthKey}-01`;


        const nextMonth =
            new Date(
                monthKey + '-01T00:00:00'
            );

        nextMonth.setMonth(
            nextMonth.getMonth() + 1
        );

        const endDate =
            nextMonth.toISOString()
                .slice(0, 10);


        /* جلب دفعات الشهر */

        const {
            data: payments,
            error: paymentsError
        } =
            await supabaseClient

                .from('insurance_payments')

                .select(`
                    id,
                    amount,
                    payment_date,
                    payment_method,
                    notes,
                    created_at
                `)

                .eq(
                    'insurance_id',
                    insuranceId
                )

                .eq(
                    'user_id',
                    currentUserId
                )

                .gte(
                    'payment_date',
                    startDate
                )

                .lt(
                    'payment_date',
                    endDate
                )

                .order(
                    'payment_date',
                    {
                        ascending: true
                    }
                );


        if (paymentsError) {

            console.error(
                'Invoice payments error:',
                paymentsError
            );

            showToast(
                'حدث خطأ أثناء تجهيز الفاتورة',
                'error'
            );

            return;
        }


        if (!payments || !payments.length) {

            showToast(
                'لا توجد دفعات مسجلة في هذا الشهر',
                'warning'
            );

            return;
        }


        /* أسماء طرق الدفع */

        const methodNames = {

            cash: 'نقدي',

            bank: 'تحويل بنكي',

            card: 'بطاقة',

            cheque: 'شيك',

            other: 'أخرى'

        };


        /* بناء صفوف الفاتورة */

        const totalPaid =
            payments.reduce(
                (
                    sum,
                    payment
                ) =>
                    sum +
                    (
                        Number(
                            payment.amount
                        ) || 0
                    ),
                0
            );


        const invoiceRows =
            payments.map(
                (payment, index) => {

                    return `

                        <tr>

                            <td>
                                ${index + 1}
                            </td>

                            <td>
                                ${new Date(
                                    payment.payment_date +
                                    'T00:00:00'
                                ).toLocaleDateString(
                                    'ar-EG'
                                )}
                            </td>

                            <td>
                                ${
                                    methodNames[
                                        payment.payment_method
                                    ] ||
                                    payment.payment_method ||
                                    '-'
                                }
                            </td>

                            <td>
                                ${esc(
                                    payment.notes ||
                                    '-'
                                )}
                            </td>

                            <td class="num">
                                ${fmt(
                                    payment.amount
                                )}
                            </td>

                        </tr>

                    `;

                }
            ).join('');


        /* اسم الشهر */

        const monthName =
            new Intl.DateTimeFormat(
                'ar-EG',
                {
                    month: 'long',
                    year: 'numeric'
                }
            ).format(
                new Date(
                    monthKey + '-01T00:00:00'
                )
            );


        /* بناء صفحة الطباعة */

        const invoiceHTML =
            `
            <!DOCTYPE html>

            <html
                dir="rtl"
                lang="ar"
            >

            <head>

                <meta charset="UTF-8">

                <title>
                    فاتورة مدفوعات ${esc(insuranceName)} - ${monthName}
                </title>

                <style>
                    ${getPrintStyles()}
                </style>

            </head>

            <body>


                <!-- ═══════ الترويسة ═══════ -->

                <div class="report-header">

                    <div class="brand">

                        <h1>
                            فاتورة استلام مدفوعات
                        </h1>

                        <p>
                            إقرار باستلام المبالغ المدفوعة
                            من جهة التأمين
                        </p>

                    </div>

                    <div class="badge">

                        ${esc(monthName)}

                        <strong>
                            ${esc(insuranceName)}
                        </strong>

                    </div>

                </div>


                <!-- ═══════ بطاقة المعلومات ═══════ -->

                <div class="info-card">

                    <div class="info-item">

                        <span>
                            جهة التأمين
                        </span>

                        <b>
                            ${esc(insuranceName)}
                        </b>

                    </div>


                    <div class="info-item">

                        <span>
                            الشهر
                        </span>

                        <b>
                            ${monthName}
                        </b>

                    </div>


                    <div class="info-item">

                        <span>
                            عدد الدفعات
                        </span>

                        <b>
                            ${payments.length}
                            دفعة
                        </b>

                    </div>

                </div>


                <!-- ═══════ جدول الدفعات ═══════ -->

                <table>

                    <thead>

                        <tr>

                            <th>
                                #
                            </th>

                            <th>
                                تاريخ الدفعة
                            </th>

                            <th>
                                طريقة الدفع
                            </th>

                            <th>
                                ملاحظات
                            </th>

                            <th>
                                المبلغ
                            </th>

                        </tr>

                    </thead>


                    <tbody>

                        ${invoiceRows}

                    </tbody>

                </table>


                <!-- ═══════ الإجمالي ═══════ -->

                <div class="totals-box">

                    <div class="total-item grand">

                        <span>
                            إجمالي المبالغ المستلمة
                        </span>

                        <b>
                            ${fmt(totalPaid)}
                        </b>

                    </div>

                </div>


                <!-- ═══════ إقرار الاستلام ═══════ -->

                <div class="report-footer">

                    <div class="signature">

                        <div class="line">
                            توقيع العيادة (المستلم)
                        </div>

                    </div>


                    <div class="signature">

                        <div class="line">
                            توقيع جهة التأمين (الدافع)
                        </div>

                    </div>

                </div>


                <div class="print-date">

                    تاريخ إصدار الفاتورة:
                    ${new Date().toLocaleDateString('ar-EG')}

                </div>


            </body>

            </html>
            `;


        /* الطباعة في نفس الصفحة */

        printInSamePage(invoiceHTML);


    } catch (error) {

        console.error(
            'Print payments invoice error:',
            error
        );

        if (typeof showToast === 'function') {
            showToast(
                'حدث خطأ أثناء تجهيز الفاتورة',
                'error'
            );
        }

    }

}
/* =========================================================
   CLOSE INSURANCE SERVICES MODAL
   ========================================================= */

function closeInsuranceServicesModal() {

    document.getElementById(
        'insuranceServicesModal'
    ).style.display = 'none';

}


async function deleteInsurancePayment(paymentId) {

    if (!paymentId) {
        return;
    }


    const confirmed =
        await showConfirm(
            'هل أنت متأكد من حذف هذه الدفعة؟'
        );


    if (!confirmed) {
        return;
    }


    try {


        /* =====================================================
           أولًا: جلب الدفعة لمعرفة جهة التأمين
        ===================================================== */

        const {
            data: payment,
            error: fetchError
        } =
        await supabaseClient

            .from('insurance_payments')

            .select(`
                id,
                insurance_id
            `)

            .eq(
                'id',
                paymentId
            )

            .eq(
                'user_id',
                currentUserId
            )

            .single();



        if (fetchError) {

            console.error(
                'Get insurance payment error:',
                fetchError
            );


            if (
                typeof showToast === 'function'
            ) {

                showToast(
                    'تعذر العثور على الدفعة',
                    'error'
                );

            }

            return;
        }



        const insuranceId =
            payment.insurance_id;


        const insuranceName =
            currentInsuranceName;



        /* =====================================================
           حذف الدفعة
        ===================================================== */

        const {
            error: deleteError
        } =
        await supabaseClient

            .from('insurance_payments')

            .delete()

            .eq(
                'id',
                paymentId
            )

            .eq(
                'user_id',
                currentUserId
            );



        if (deleteError) {

            console.error(
                'Delete insurance payment error:',
                deleteError
            );


            if (
                typeof showToast === 'function'
            ) {

                showToast(
                    'حدث خطأ أثناء حذف الدفعة',
                    'error'
                );

            }

            return;
        }



        /* =====================================================
           SUCCESS
        ===================================================== */

        if (
            typeof showToast === 'function'
        ) {

            showToast(
                'تم حذف الدفعة بنجاح',
                'success'
            );

        }



        /* =====================================================
           تحديث مودال التأمين فورًا
        ===================================================== */

        if (
            insuranceId &&
            insuranceName
        ) {

            await openInsuranceServicesModal(
                insuranceId,
                insuranceName
            );

        }



        /* =====================================================
           تحديث Dashboard المالي
        ===================================================== */

        if (
            typeof loadFinancialDashboard === 'function'
        ) {

            await loadFinancialDashboard();

        }



        /* =====================================================
           تحديث Dashboard الشهري
        ===================================================== */

        if (
            typeof loadCurrentMonthDashboard === 'function'
        ) {

            await loadCurrentMonthDashboard();

        }


    }
    catch (error) {

        console.error(
            'Unexpected delete insurance payment error:',
            error
        );


        if (
            typeof showToast === 'function'
        ) {

            showToast(
                'حدث خطأ غير متوقع',
                'error'
            );

        }

    }

}


/* =========================================================
   INSURANCE — LINK SERVICES
   ربط جهة التأمين بالخدمات
   ========================================================= */

let currentLinkInsuranceId = null;


async function openLinkServicesModal(id, name) {

    currentLinkInsuranceId = id;


    const modal =
        document.getElementById(
            'linkServicesModal'
        );

    const title =
        document.getElementById(
            'linkModalTitle'
        );

    const list =
        document.getElementById(
            'linkServicesList'
        );


    title.textContent =
        'ربط الخدمات بجهة التأمين: ' + name;


    list.innerHTML = `

        <p class="empty-msg">

            <i
                class="fa-solid fa-spinner fa-spin"
                style="font-size:22px;"
            ></i>

            <br><br>

            جاري التحميل...

        </p>

    `;


    modal.style.display = 'flex';


    try {


        /* =====================================================
           جلب الخدمات + الروابط المسجلة مسبقًا معًا
           ===================================================== */

        const [servicesRes, linkedRes] =
            await Promise.all([

                supabaseClient

                    .from('clinic_services')

                    .select(`
                        id,
                        service_name,
                        service_price,
                        service_category,
                        is_active
                    `)

                    .eq(
                        'user_id',
                        currentUserId
                    )

                    .eq(
                        'is_active',
                        true
                    )

                    .order('service_name'),


                supabaseClient

                    .from('insurance_services')

                    .select(`
                        service_id,
                        discount_percent
                    `)

                    .eq(
                        'insurance_id',
                        id
                    )

            ]);


        if (servicesRes.error) {

            console.error(
                'Load services error:',
                servicesRes.error
            );

            showToast(
                'حدث خطأ أثناء تحميل الخدمات',
                'error'
            );

            return;
        }


        const services =
            servicesRes.data || [];


        /* خريطة الروابط:
           service_id => discount_percent */

        const linkedMap = {};


        (linkedRes.data || []).forEach(
            row => {

                linkedMap[row.service_id] =
                    row.discount_percent;

            }
        );


        if (services.length === 0) {

            list.innerHTML = `

                <p class="empty-msg">

                    <i
                        class="fa-solid fa-briefcase-medical"
                        style="font-size:36px;color:#64748b;"
                    ></i>

                    <br><br>

                    لا توجد خدمات مضافة بعد

                </p>

            `;

            return;
        }


        list.innerHTML = '';


        services.forEach(service => {


            const isChecked =
                linkedMap.hasOwnProperty(
                    service.id
                );


            const percentValue =
                isChecked
                    ? linkedMap[service.id]
                    : '';


            const priceText =
                service.service_price != null
                    ? ` • ${fmt(service.service_price)}`
                    : '';


            const categoryText =
                service.service_category
                    ? esc(service.service_category) + ' '
                    : '';


            list.innerHTML += `

                <div
                    class="service-card"
                    style="margin-bottom:10px;"
                >

                    <div class="service-card-top">

                        <label
                            style="
                                display:flex;
                                align-items:center;
                                gap:10px;
                                cursor:pointer;
                                flex:1;
                            "
                        >

                            <input
                                type="checkbox"
                                class="link-service-check"
                                data-service-id="${service.id}"
                                ${isChecked ? 'checked' : ''}
                                onchange="toggleLinkPercentInput(this)"
                                style="
                                    width:18px;
                                    height:18px;
                                "
                            />

                            <div>

                                <div class="service-name">
                                    ${esc(service.service_name)}
                                </div>

                                <div class="service-price">
                                    ${categoryText}${priceText}
                                </div>

                            </div>

                        </label>

                        <div class="service-icon">
                            <i class="fa-solid fa-tooth"></i>
                        </div>

                    </div>


                    <!-- حقل نسبة الخصم:
                         يظهر فقط عند تحديد الخدمة -->

                    <div
                        class="percent-input-wrapper"
                        style="
                            margin-top:10px;
                            display:${isChecked ? 'block' : 'none'};
                        "
                    >

                        <label
                            style="
                                font-size:13px;
                                color:#94a3b8;
                                display:block;
                                margin-bottom:5px;
                            "
                        >
                            نسبة خصم التأمين على هذه الخدمة (%)
                        </label>

                        <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            class="percent-input"
                            data-service-id="${service.id}"
                            value="${percentValue}"
                            placeholder="مثال: 30"
                            style="
                                width:130px;
                                padding:8px 12px;
                                border-radius:8px;
                                border:1px solid #334155;
                                font-size:14px;
                            "
                        />

                    </div>

                </div>

            `;

        });


    } catch (error) {

        console.error(
            'Unexpected link services error:',
            error
        );

        list.innerHTML = `

            <p class="empty-msg">
                حدث خطأ أثناء تحميل الخدمات
            </p>

        `;

    }

}


/* =========================================================
   إظهار / إخفاء حقل نسبة الخصم
   ========================================================= */

function toggleLinkPercentInput(checkbox) {

    const wrapper =
        checkbox.closest('.service-card')
            .querySelector(
                '.percent-input-wrapper'
            );


    if (!wrapper) {
        return;
    }


    if (checkbox.checked) {

        wrapper.style.display = 'block';


        const input =
            wrapper.querySelector(
                '.percent-input'
            );


        if (input) {
            input.focus();
        }

    } else {

        wrapper.style.display = 'none';

    }

}


/* =========================================================
   حفظ الخدمات المرتبطة
   ========================================================= */

async function saveLinkedServices() {

    if (!currentLinkInsuranceId) {
        return;
    }


    const insuranceId =
        currentLinkInsuranceId;


    const checkboxes =
        document.querySelectorAll(
            '.link-service-check:checked'
        );


    const rows = [];

    let valid = true;


    checkboxes.forEach(checkbox => {


        const serviceId =
            checkbox.dataset.serviceId;


        const input =
            document.querySelector(
                `.percent-input[data-service-id="${serviceId}"]`
            );


        const percent =
            parseFloat(input?.value);


        if (
            isNaN(percent) ||
            percent < 0 ||
            percent > 100
        ) {

            showToast(
                'يرجى إدخال نسبة خصم صحيحة (0 - 100) لكل خدمة محددة',
                'warning'
            );

            valid = false;

            return;
        }


        rows.push({

            user_id:
                currentUserId,

            insurance_id:
                insuranceId,

            service_id:
                serviceId,

            discount_percent:
                percent

        });

    });


    if (!valid) {
        return;
    }


    /* =====================================================
       حذف الروابط القديمة ثم إدخال الجديدة
       ===================================================== */

    const {
        error: deleteError
    } =
        await supabaseClient

            .from('insurance_services')

            .delete()

            .eq(
                'insurance_id',
                insuranceId
            );


    if (deleteError) {

        console.error(
            'Delete linked services error:',
            deleteError
        );

        showToast(
            'حدث خطأ أثناء حفظ التعديلات',
            'error'
        );

        return;
    }


    if (rows.length > 0) {

        const {
            error: insertError
        } =
            await supabaseClient

                .from('insurance_services')

                .insert(rows);


        if (insertError) {

            console.error(
                'Insert linked services error:',
                insertError
            );

            showToast(
                'حدث خطأ أثناء حفظ التعديلات',
                'error'
            );

            return;
        }

    }


    showToast(
        'تم حفظ الخدمات المرتبطة بنجاح',
        'success'
    );


    closeLinkServicesModal();


    /* =====================================================
       تحديث قائمة التأمينات لعرض العدد الجديد
       ===================================================== */

    if (typeof loadInsurances === 'function') {
        await loadInsurances();
    }

}


/* =========================================================
   إغلاق مودال الربط
   ========================================================= */

function closeLinkServicesModal() {

    document.getElementById(
        'linkServicesModal'
    ).style.display = 'none';


    currentLinkInsuranceId = null;

}

/* =========================
   START
========================= */

init();

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

