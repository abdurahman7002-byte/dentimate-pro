/* =========================
   AUTH GUARD (IMPORTANT)
========================= */

async function checkAuth(){

    const { data: { user } } =
        await supabaseClient.auth.getUser();

    if(!user){

        window.location.href =
            "login.html";

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

    const {
        data:{user}
    } =
    await supabaseClient.auth.getUser();


    if(!user){

        window.location.href =
            "login.html";

        return null;

    }


    return user.id;

}

/* =====================================================
   ADD MEDICAL CONDITION
===================================================== */

function addMedicalCondition(condition){

    const medicalInput =
        document.getElementById("medical");

    if(!medicalInput){
        return;
    }

    const currentValue =
        medicalInput.value.trim();

    /* =========================================
       PREVENT DUPLICATE
    ========================================= */

    if(
        currentValue
        .split(",")
        .map(item => item.trim())
        .includes(condition)
    ){

        return;

    }

    /* =========================================
       ADD CONDITION
    ========================================= */

    if(currentValue){

        medicalInput.value =
            currentValue +
            ", " +
            condition;

    }else{

        medicalInput.value =
            condition;

    }

    /* =========================================
       TRIGGER INPUT EVENT
    ========================================= */

    medicalInput.dispatchEvent(
        new Event(
            "input",
            {
                bubbles: true
            }
        )
    );

    /* =========================================
       KEEP FOCUS
    ========================================= */

    medicalInput.focus();

}
/* =====================================================
   SAVE PATIENT
===================================================== */

async function savePatient(){

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
        !userData?.user
    ){

        alert(
            "Unable to identify current user"
        );

        return;

    }


    const userId =
        userData.user.id;


    /* =====================================================
       GET FORM DATA
    ===================================================== */

    const name =
        document.getElementById(
            "name"
        ).value.trim();


    const phone =
        document.getElementById(
            "phone"
        ).value.trim();


    if(!name){

        alert(
            "Patient name is required"
        );

        return;

    }


    /* =====================================================
       CHECK IF COMING FROM APPOINTMENT
    ===================================================== */

    const urlParams =
        new URLSearchParams(
            window.location.search
        );


    const fromAppointment =
        urlParams.get(
            "fromAppointment"
        ) === "true";


    const visitId =
        urlParams.get(
            "visitId"
        );


    /* =====================================================
       PATIENT OBJECT
    ===================================================== */

    const patient = {

        full_name:
            name,


        phone:
            phone ||
            null,


        gender:
            document.getElementById(
                "gender"
            ).value ||
            null,


        address:
            document.getElementById(
                "address"
            ).value ||
            null,


        birth_date:
            document.getElementById(
                "birth"
            ).value ||
            null,


        medical_history:
            document.getElementById(
                "medical"
            ).value ||
            null,


        dental_history:
            document.getElementById(
                "dental"
            ).value ||
            null,


        user_id:
            userId

    };


    /* =====================================================
       CREATE PATIENT
    ===================================================== */

    const {
        data,
        error
    } =
    await supabaseClient

    .from(
        "patients"
    )

    .insert([
        patient
    ])

    .select()

    .single();


    if(error){

        console.error(
            "Create patient error:",
            error
        );


        alert(
            error.message
        );

        return;

    }


    /* =====================================================
       IF CREATED FROM APPOINTMENT
       LINK PATIENT TO VISIT
    ===================================================== */

    if(
        fromAppointment &&
        visitId
    ){

        const {
            error:visitError
        } =
        await supabaseClient

        .from(
            "patient_visits"
        )

        .update({

            patient_id:
                data.id,

            patient_name:
                data.full_name,

            patient_phone:
                data.phone

        })

        .eq(
            "id",
            visitId
        )

        .eq(
            "user_id",
            userId
        );


        if(visitError){

            console.error(
                "Link patient to visit error:",
                visitError
            );


            alert(
                "Patient created, but the appointment could not be linked to the patient file.\n\n" +
                visitError.message
            );


            return;

        }

    }


    /* =====================================================
       SUCCESS
    ===================================================== */

    showToast(
        "Patient added successfully"
    );


    /* =====================================================
       OPEN PATIENT FILE
    ===================================================== */

    setTimeout(
        () => {

            window.location.href =
                `patient-file.html?id=${data.id}`;

        },
        500
    );

}


/* =====================================================
   GO TO DASHBOARD
===================================================== */

function goToDashboard(){

    window.location.href =
        "dashboard.html";

}


/* =====================================================
   TOAST
===================================================== */

function showToast(message){

    const toast =
        document.getElementById(
            "toast"
        );


    toast.innerText =
        message;


    toast.classList.add(
        "show"
    );


    setTimeout(
        () => {

            toast.classList.remove(
                "show"
            );

        },
        3000
    );

}


/* =====================================================
   AUTO FILL PATIENT DATA FROM APPOINTMENT
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "🔎 Checking appointment parameters..."
        );


        const params =
            new URLSearchParams(
                window.location.search
            );


        const fromAppointment =
            params.get(
                "fromAppointment"
            );


        const visitId =
            params.get(
                "visitId"
            );


        const name =
            params.get(
                "name"
            );


        const phone =
            params.get(
                "phone"
            );


        /* =================================================
           GET AGE
        ================================================= */

        const age =
            params.get(
                "age"
            );


        console.log(
            "Appointment params:",
            {
                fromAppointment,
                visitId,
                name,
                phone,
                age
            }
        );


        /* =========================================
           NOT FROM APPOINTMENT
        ========================================= */

        if(
            fromAppointment !==
            "true"
        ){

            console.log(
                "ℹ️ Normal patient creation"
            );

            return;

        }


        /* =========================================
           GET INPUTS
        ========================================= */

        const nameInput =
            document.getElementById(
                "name"
            );


        const phoneInput =
            document.getElementById(
                "phone"
            );


        const birthInput =
            document.getElementById(
                "birth"
            );


        console.log(
            "Inputs:",
            {
                nameInput,
                phoneInput,
                birthInput
            }
        );


        /* =========================================
           NAME
        ========================================= */

        if(
            nameInput &&
            name
        ){

            nameInput.value =
                name;


            nameInput.dispatchEvent(
                new Event(
                    "input",
                    {
                        bubbles:true
                    }
                )
            );


            nameInput.dispatchEvent(
                new Event(
                    "change",
                    {
                        bubbles:true
                    }
                )
            );

        }


        /* =========================================
           PHONE
        ========================================= */

        if(
            phoneInput &&
            phone
        ){

            phoneInput.value =
                phone;


            phoneInput.dispatchEvent(
                new Event(
                    "input",
                    {
                        bubbles:true
                    }
                )
            );


            phoneInput.dispatchEvent(
                new Event(
                    "change",
                    {
                        bubbles:true
                    }
                )
            );

        }


        /* =================================================
           BIRTH DATE FROM AGE
        ================================================= */

        if(
            birthInput &&
            age !== null &&
            age !== ""
        ){

            const numericAge =
                Number(
                    age
                );


            if(
                Number.isFinite(
                    numericAge
                ) &&
                numericAge >= 0
            ){

                const today =
                    new Date();


                const birthDate =
                    new Date(
                        today
                    );


                /*
                =========================================
                CALCULATE APPROXIMATE BIRTH DATE
                =========================================

                مثال:

                العمر = 25

                اليوم:
                19/08/2026

                النتيجة:
                19/08/2001
                */

                birthDate.setFullYear(
                    today.getFullYear() -
                    numericAge
                );


                /* =========================================
                   FORMAT YYYY-MM-DD
                ========================================= */

                const year =
                    birthDate
                    .getFullYear();


                const month =
                    String(
                        birthDate.getMonth() + 1
                    )
                    .padStart(
                        2,
                        "0"
                    );


                const day =
                    String(
                        birthDate.getDate()
                    )
                    .padStart(
                        2,
                        "0"
                    );


                const formattedBirthDate =
                    `${year}-${month}-${day}`;


                birthInput.value =
                    formattedBirthDate;


                birthInput.dispatchEvent(
                    new Event(
                        "input",
                        {
                            bubbles:true
                        }
                    )
                );


                birthInput.dispatchEvent(
                    new Event(
                        "change",
                        {
                            bubbles:true
                        }
                    )
                );


                console.log(
                    "✅ Birth date calculated from age:",
                    formattedBirthDate
                );

            }

        }


        console.log(
            "✅ Appointment patient data loaded"
        );

    }
);