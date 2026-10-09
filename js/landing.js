

const SUPABASE_URL =
"https://effgebbqhkzaifwgdpoi.supabase.co";

const SUPABASE_KEY =
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZmdlYmJxaGt6YWlmd2dkcG9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MDk4NzYsImV4cCI6MjA5NDk4NTg3Nn0.YhG_Bzhj2wbMHjtvBymOo6DYb2O2ksfk7svvf-Av9-I";

const supabaseClient =
supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


document.addEventListener("DOMContentLoaded", () => {

    if (window.self !== window.top) {

        document
            .getElementById("backSearchBtn")
            ?.remove();

    }

});

// =====================================
// GET CLINIC ID
// =====================================

const params =
new URLSearchParams(
    window.location.search
);

const clinicUserId =
params.get("id");


// =====================================
// LOAD CLINIC PAGE
// =====================================

async function loadClinicPage(){

    if(!clinicUserId){

        document.body.innerHTML = `
            <h1
                style="
                text-align:center;
                margin-top:100px;
                "
            >
                Clinic Not Found
            </h1>
        `;

        return;
    }

    const { data , error } =
    await supabaseClient
    .from("clinic_pages")
    .select("*")
    .eq("user_id", clinicUserId)
    .single();

    if(error || !data){

        console.log(error);

        document.body.innerHTML = `
            <h1
                style="
                text-align:center;
                margin-top:100px;
                "
            >
                Clinic Not Found
            </h1>
        `;

        return;
    }

    fillClinicData(data);

}



// =====================================
// FILL CLINIC DATA
// =====================================

function fillClinicData(data){

    document.title =
    data.clinic_name || "Clinic Page";

    document.getElementById(
        "clinicName"
    ).textContent =
    data.clinic_name || "Dentix Clinic";

    document.getElementById(
        "clinicDescription"
    ).textContent =
    data.clinic_description || "";

    document.getElementById(
        "clinicPhone"
    ).textContent =
    data.phone || "-";

    document.getElementById(
        "clinicWhatsapp"
    ).textContent =
    data.whatsapp || "-";

    document.getElementById(
        "clinicAddress"
    ).textContent =
    data.address || "-";

/* =========================
   PHONE
========================= */

const phone = (data.phone || "").replace(/\D/g, "");

document.getElementById("phoneCard").onclick = () => {

    if (!phone) return;

    window.location.href = `tel:${phone}`;

};


/* =========================
   WHATSAPP
========================= */

let whatsapp = (data.whatsapp || "").replace(/\D/g, "");

if (whatsapp.startsWith("0")) {

    whatsapp = "2" + whatsapp;

}

document.getElementById("whatsappCard").onclick = () => {

    if (!whatsapp) return;

    window.open(
        `https://wa.me/${whatsapp}`,
        "_blank"
    );

};


/* =========================
   GOOGLE MAPS
========================= */

document.getElementById("addressCard").onclick = () => {

    if (data.latitude && data.longitude) {

        window.open(
            `https://www.google.com/maps?q=${data.latitude},${data.longitude}`,
            "_blank"
        );

    } else if (data.address) {

        window.open(
            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.address)}`,
            "_blank"
        );

    }

};


const workingHoursElement =
document.getElementById(
    "clinicWorkingHours"
);

if(workingHoursElement){

    const dayNames = {

        sat:"السبت",
        sun:"الأحد",
        mon:"الاثنين",
        tue:"الثلاثاء",
        wed:"الأربعاء",
        thu:"الخميس",
        fri:"الجمعة"

    };

    const schedule =
    data.working_schedule || {};

    function format12Hour(time){

        if(!time) return "";

        let [hours, minutes] =
        time.split(":");

        hours = parseInt(hours);

        const period =
        hours >= 12
        ? "مساءً"
        : "صباحاً";

        hours =
        hours % 12;

        if(hours === 0)
            hours = 12;

        return `${hours}:${minutes} ${period}`;

    }

    let html = "";

const orderedDays = [

    "sat",
    "sun",
    "mon",
    "tue",
    "wed",
    "thu",
    "fri"

];

/* =========================
   تجميع الأيام المتشابهة
========================= */

const groupedSchedules = {};

orderedDays.forEach(day => {

    const dayData =
    schedule[day];

    if(
        !dayData ||
        !dayData.enabled ||
        !dayData.shifts ||
        !dayData.shifts.length
    ){
        return;
    }

    const shiftsText =
    dayData.shifts
    .map(
        s =>
        `${format12Hour(s.from)} - ${format12Hour(s.to)}`
    )
    .join(" | ");

    if(!groupedSchedules[shiftsText]){

        groupedSchedules[shiftsText] = [];

    }

    groupedSchedules[shiftsText].push(
        dayNames[day]
    );

});

/* =========================
   إنشاء HTML
========================= */

Object.entries(
    groupedSchedules
).forEach(([timeRange, days]) => {

    html += `

    <div class="working-day-item">

        <strong>

            ${days.join(" - ")}

        </strong>

        <span>

            ${timeRange}

        </span>

    </div>

    `;

});

workingHoursElement.innerHTML =
html || "غير محدد";

}

    const gallerySection =
document.getElementById(
    "gallerySection"
);

const galleryContainer =
document.getElementById(
    "galleryContainer"
);

if(
    Array.isArray(
        data.gallery_images
    )
    &&
    data.gallery_images.length
){

    gallerySection.style.display =
    "block";

    galleryContainer.innerHTML =
    "";

    data.gallery_images.forEach(
        image=>{

            galleryContainer.innerHTML += `

            <img
                src="${image}"
                class="gallery-image"
                onclick="
                window.open(
                    '${image}',
                    '_blank'
                )
                "
            >

            `;

        }
    );

}

    // =========================
    // LOGO
    // =========================

    const logo =
    document.getElementById(
        "clinicLogo"
    );

    if(data.clinic_logo){

        logo.src =
        data.clinic_logo;

        logo.style.display =
        "block";

    }else{

        logo.style.display =
        "none";

    }

    // =========================
    // FACEBOOK
    // =========================

    if(data.facebook_url){

        const fb =
        document.getElementById(
            "facebookLink"
        );

        if(fb){

            fb.href =
            data.facebook_url;

            fb.style.display =
            "inline-flex";

        }

    }

    // =========================
    // INSTAGRAM
    // =========================

    if(data.instagram_url){

        const ig =
        document.getElementById(
            "instagramLink"
        );

        if(ig){

            ig.href =
            data.instagram_url;

            ig.style.display =
            "inline-flex";

        }

    }

    // =========================
    // WEBSITE
    // =========================

    if(data.website_url){

        const website =
        document.getElementById(
            "websiteLink"
        );

        if(website){

            website.href =
            data.website_url;

            website.style.display =
            "inline-flex";

        }

    }

    // =========================
    // GALLERY
    // =========================

   

    if(
        gallerySection &&
        galleryContainer &&
        data.gallery_images &&
        data.gallery_images.length
    ){

        gallerySection.style.display =
        "block";

        galleryContainer.innerHTML =
        "";

        data.gallery_images.forEach(
            image => {

                galleryContainer.innerHTML += `

                <img
                    src="${image}"
                    class="gallery-image"
                    onclick="
                    window.open(
                        '${image}',
                        '_blank'
                    )
                    "
                >

                `;

            }
        );

    }

}


// =====================================
// OPEN MODAL
// =====================================

function openBookingModal(){

    document.getElementById(
        "bookingModal"
    ).style.display = "flex";

}

function closeBookingModal(){

    document.getElementById(
        "bookingModal"
    ).style.display = "none";

    document.getElementById(
        "patientName"
    ).value = "";

    document.getElementById(
        "patientPhone"
    ).value = "";

    document.getElementById(
        "appointmentDate"
    ).value = "";

    document.getElementById(
        "appointmentTime"
    ).innerHTML = `
        <option value="">
            اختر الوقت
        </option>
    `;

    document.getElementById(
        "selectedDayName"
    ).innerHTML = "";

}

// =====================================
// CLOSE MODAL
// =====================================

function showSelectedDay(){

    const dateValue =
    document.getElementById(
        "appointmentDate"
    ).value;

    const timeValue =
    document.getElementById(
        "appointmentTime"
    )?.value;

    const dayElement =
    document.getElementById(
        "selectedDayName"
    );

    if(!dateValue){

        dayElement.textContent = "";
        return;

    }

    const date =
    new Date(dateValue);

    const dayNames = {

        0:"الأحد",
        1:"الاثنين",
        2:"الثلاثاء",
        3:"الأربعاء",
        4:"الخميس",
        5:"الجمعة",
        6:"السبت"

    };

    let formattedTime = "";

    if(timeValue){

        let [hours, minutes] =
        timeValue.split(":");

        hours = parseInt(hours);

        const period =
        hours >= 12
        ? "مساءً"
        : "صباحاً";

        hours =
        hours % 12;

        if(hours === 0)
            hours = 12;

        formattedTime =
        ` - <bdi>${hours}:${minutes} ${period}</bdi>`;

    }

    dayElement.innerHTML = `

        <i class="fa-solid fa-calendar-day"></i>

        ${dayNames[date.getDay()]}
        ${formattedTime}

    `;

}

document.getElementById(
    "appointmentDate"
)?.addEventListener(
    "change",
    showSelectedDay
);

document.getElementById(
    "appointmentTime"
)?.addEventListener(
    "change",
    showSelectedDay
);

async function generateAvailableTimes(){

    const dateInput =
    document.getElementById(
        "appointmentDate"
    );

    const timeSelect =
    document.getElementById(
        "appointmentTime"
    );

    timeSelect.innerHTML =
    `
    <option value="">
        اختر الوقت
    </option>
    `;

    if(!dateInput.value)
        return;

    const {
        data:clinicData
    } =
    await supabaseClient
    .from("clinic_pages")
    .select("working_schedule")
    .eq(
        "user_id",
        clinicUserId
    )
    .single();

    const schedule =
    clinicData?.working_schedule;

    if(!schedule)
        return;

    const selectedDate =
    new Date(dateInput.value);

    const daysMap = {
        6:"sat",
        0:"sun",
        1:"mon",
        2:"tue",
        3:"wed",
        4:"thu",
        5:"fri"
    };

    const dayKey =
    daysMap[
        selectedDate.getDay()
    ];

    const dayData =
    schedule[dayKey];

    if(
        !dayData ||
        !dayData.enabled
    ){

        timeSelect.innerHTML =
        `
        <option value="">
            العيادة مغلقة
        </option>
        `;

        return;
    }

    dayData.shifts.forEach(
        shift => {

            let [
                startHour,
                startMinute
            ] =
            shift.from
            .split(":")
            .map(Number);

            let [
                endHour,
                endMinute
            ] =
            shift.to
            .split(":")
            .map(Number);

            let current =
            new Date();

            current.setHours(
                startHour,
                startMinute,
                0,
                0
            );

            const end =
            new Date();

            end.setHours(
                endHour,
                endMinute,
                0,
                0
            );

            while(
    current < end
){

    const value =
    current
    .toTimeString()
    .slice(0,5);

    /* منع المواعيد الماضية */

    const now =
    new Date();

    const slotDateTime =
    new Date(
        `${dateInput.value}T${value}`
    );

    if(
        slotDateTime <= now
    ){

        current.setMinutes(
            current.getMinutes() + 30
        );

        continue;
    }

    const option =
    document.createElement(
        "option"
    );

    option.value =
    value;

    option.textContent =
    format12Hour(
        value
    );

    timeSelect.appendChild(
        option
    );

    current.setMinutes(
        current.getMinutes() + 30
    );

}

        }
    );

}

function format12Hour(time){

    let [
        hours,
        minutes
    ] =
    time.split(":");

    hours =
    parseInt(hours);

    const period =
    hours >= 12
    ? "مساءً"
    : "صباحاً";

    hours =
    hours % 12;

    if(hours === 0)
        hours = 12;

    return `${hours}:${minutes} ${period}`;

}

// =====================================
// SAVE APPOINTMENT REQUEST
// =====================================

async function submitAppointmentRequest(){

    const patientName =
    document.getElementById(
        "patientName"
    ).value.trim();

    const patientPhone =
    document.getElementById(
        "patientPhone"
    ).value.trim();

    const appointmentDate =
document.getElementById(
    "appointmentDate"
).value;

const appointmentTime =
document.getElementById(
    "appointmentTime"
).value;

    if(!patientName){

        alert(
            "يرجى إدخال الاسم"
        );

        return;
    }

    if(!patientPhone){

        alert(
            "يرجى إدخال رقم الهاتف"
        );

        return;
    }

     if(!appointmentDate){

    alert(
        "يرجى اختيار اليوم"
    );

    return;
}

if(!appointmentTime){

    alert(
        "يرجى اختيار الوقت"
    );

    return;
}


    const { error } =
    await supabaseClient
    .from("appointment_requests")
    .insert({

        user_id:
        clinicUserId,

        patient_name:
        patientName,

        patient_phone:
        patientPhone,

         appointment_time:
`${appointmentDate}T${appointmentTime}`,


        status:
        "pending"

    });

    if(error){

        console.log(error);

        alert(
            "حدث خطأ أثناء إرسال الطلب"
        );

        return;
    }

    alert(
        "تم إرسال طلب الحجز بنجاح , سيتم التواصل معكم في اقرب وقت"
    );

    document.getElementById(
    "patientName"
).value = "";

document.getElementById(
    "patientPhone"
).value = "";

document.getElementById(
    "appointmentDate"
).value = "";

document.getElementById(
    "appointmentTime"
).innerHTML = `
<option value="">
    اختر الوقت
</option>
`;

    closeBookingModal();

}

window.submitAppointmentRequest =
submitAppointmentRequest;


function updateSelectedDayName(){

    const dateInput =
    document.getElementById(
        "appointmentDate"
    );

    const dayNameElement =
    document.getElementById(
        "selectedDayName"
    );

    if(
        !dateInput ||
        !dayNameElement ||
        !dateInput.value
    ){
        return;
    }

    const dayNames = {

        0:"الأحد",
        1:"الاثنين",
        2:"الثلاثاء",
        3:"الأربعاء",
        4:"الخميس",
        5:"الجمعة",
        6:"السبت"

    };

    const selectedDate =
    new Date(dateInput.value);

    dayNameElement.textContent =
    dayNames[
        selectedDate.getDay()
    ];

}

/* جعلها متاحة من HTML */

window.updateSelectedDayName =
updateSelectedDayName;

// =====================================
// START
// =====================================

loadClinicPage();