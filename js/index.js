const SUPABASE_URL =
"https://effgebbqhkzaifwgdpoi.supabase.co";

const SUPABASE_KEY =
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZmdlYmJxaGt6YWlmd2dkcG9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MDk4NzYsImV4cCI6MjA5NDk4NTg3Nn0.YhG_Bzhj2wbMHjtvBymOo6DYb2O2ksfk7svvf-Av9-I";

const supabaseClient =
supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const searchInput =
document.getElementById(
    "searchInput"
);

const resultsContainer =
document.getElementById(
    "resultsContainer"
);


// ===========================
// SEARCH CLINICS
// ===========================

async function searchClinics(){

    const keyword =
    searchInput.value.trim();

    if(keyword.length === 0){

        resultsContainer.innerHTML = "";

        return;

    }

    const { data , error } =
    await supabaseClient
    .from("clinic_pages")
    .select(`
        clinic_name,
        clinic_description,
        clinic_logo,
        address,
        user_id
    `)
    .or(
        `clinic_name.ilike.%${keyword}%,address.ilike.%${keyword}%`
    )
    .limit(20);

    if(error){

        console.log(error);

        return;

    }

    resultsContainer.innerHTML = "";

    if(!data.length){

        resultsContainer.innerHTML = `
            <div class="no-results">
                لا توجد عيادات مطابقة
            </div>
        `;

        return;

    }

    data.forEach(clinic => {

    resultsContainer.innerHTML += `

<div style="
    background:linear-gradient(
        145deg,
        rgba(30,41,59,.95),
        rgba(15,23,42,.95)
    );
    border:1px solid rgba(255,255,255,.08);
    border-radius:28px;
    padding:22px;
    display:flex;
    justify-content:space-between;
    align-items:center;
    gap:25px;
">

    <div style="
        display:flex;
        align-items:center;
        gap:18px;
        flex:1;
    ">

        ${
            clinic.clinic_logo
            ?
            `
            <img
                src="${clinic.clinic_logo}"
                alt="${clinic.clinic_name}"
                style="
                    width:100px;
                    height:100px;
                    object-fit:cover;
                    border-radius:24px;
                    border:2px solid rgba(255,255,255,.08);
                    flex-shrink:0;
                "
            >
            `
            :
            `
            <div
                style="
                    width:100px;
                    height:100px;
                    border-radius:24px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    font-size:42px;
                    background:linear-gradient(
                        135deg,
                        #2563eb,
                        #06b6d4
                    );
                    flex-shrink:0;
                "
            >
                🦷
            </div>
            `
        }

        <div style="
            display:flex;
            flex-direction:column;
            justify-content:center;
            text-align:right;
        ">

            <h3 style="
                margin:0 0 8px;
                color:white;
                font-size:24px;
                font-weight:900;
            ">
                ${clinic.clinic_name || "Clinic"}
            </h3>

            <p style="
                margin:0 0 10px;
                color:#cbd5e1;
                line-height:1.7;
                font-size:14px;
            ">
                ${clinic.clinic_description || "لا يوجد وصف للعيادة"}
            </p>

            <div style="
                display:flex;
                align-items:center;
                gap:8px;
                justify-content:flex-end;
                color:#94a3b8;
                font-size:14px;
            ">
                <span>
                    ${clinic.address || "العنوان غير متوفر"}
                </span>

                <i class="fa-solid fa-location-dot"></i>
            </div>

        </div>

    </div>

    <button
        onclick="openClinicPage('${clinic.user_id}')"

        onmouseover="
            this.style.transform='translateY(-4px)';
            this.style.boxShadow='0 18px 35px rgba(37,99,235,.35)';
            this.style.filter='brightness(1.08)';
        "

        onmouseout="
            this.style.transform='translateY(0)';
            this.style.boxShadow='0 12px 30px rgba(37,99,235,.25)';
            this.style.filter='brightness(1)';
        "

        style="
            border:none;
            border-radius:18px;
            padding:16px 22px;
            cursor:pointer;
            color:white;
            font-size:15px;
            font-weight:800;
            background:linear-gradient(
                135deg,
                #338f33,
                #248639
            );
            white-space:nowrap;
            transition:all .25s ease;
            box-shadow:
                0 12px 30px rgba(37,99,235,.25);
        "
    >
        <i class="fa-solid fa-eye"></i>
        زيارة العيادة
    </button>

</div>

`;

});

}


// ===========================
// OPEN CLINIC PAGE
// ===========================

function openClinicPage(userId){

    window.location.href =
    `landing.html?id=${userId}`;

}

window.openClinicPage =
openClinicPage;


// ===========================
// LOGIN BUTTON
// ===========================

function openLogin(){

    window.location.href =
    "login.html";

}

window.openLogin =
openLogin;


// ===========================
// CALCULATE DISTANCE
// ===========================

function calculateDistance(
    lat1,
    lon1,
    lat2,
    lon2
){

    const R = 6371;

    const dLat =
    (lat2 - lat1) *
    Math.PI / 180;

    const dLon =
    (lon2 - lon1) *
    Math.PI / 180;

    const a =

        Math.sin(dLat / 2) *
        Math.sin(dLat / 2)

        +

        Math.cos(
            lat1 * Math.PI / 180
        )

        *

        Math.cos(
            lat2 * Math.PI / 180
        )

        *

        Math.sin(dLon / 2)

        *

        Math.sin(dLon / 2);

    const c =
    2 *
    Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
    );

    return R * c;

}


// ===========================
// FIND NEARBY CLINICS
// ===========================

async function findNearbyClinics(){

    navigator.geolocation.getCurrentPosition(

        async function(position){

            const userLat =
            position.coords.latitude;

            const userLng =
            position.coords.longitude;

            const {
                data,
                error
            } =
            await supabaseClient
            .from("clinic_pages")
            .select(`
                clinic_name,
                clinic_description,
                clinic_logo,
                user_id,
                latitude,
                longitude
            `);

            if(error){

                console.log(error);

                alert(
                    "خطأ أثناء جلب العيادات"
                );

                return;
            }

            const clinics =
            data
            .filter(
                clinic =>
                clinic.latitude !== null &&
                clinic.longitude !== null
            )
            .map(clinic => {

                const distance =
                calculateDistance(

                    userLat,
                    userLng,

                    Number(clinic.latitude),
                    Number(clinic.longitude)

                );

                return {

                    ...clinic,
                    distance

                };

            })
            .sort(
                (a,b) =>
                a.distance - b.distance
            )
            .slice(0,10);

            console.log(clinics);

            renderNearbyClinics(
                clinics
            );

        },

        function(error){

            console.log(error);

            alert(
                "يرجى السماح بالوصول إلى موقعك"
            );

        },

        {
            enableHighAccuracy:true,
            timeout:10000
        }

    );

}

window.findNearbyClinics =
findNearbyClinics;


// ===========================
// RENDER NEARBY CLINICS
// ===========================

function renderNearbyClinics(clinics){

    resultsContainer.innerHTML = "";

    if(!clinics.length){

        resultsContainer.innerHTML = `
            <div class="no-results">
                لا توجد عيادات تحتوي على موقع جغرافي
            </div>
        `;

        return;

    }

    clinics.forEach(clinic=>{

        resultsContainer.innerHTML += `

        <div class="clinic-card">

            <div class="clinic-left">

                ${
                    clinic.clinic_logo
                    ?
                    `
                    <img
                        src="${clinic.clinic_logo}"
                        class="clinic-logo-small"
                    >
                    `
                    :
                    `
                    <div class="clinic-placeholder-logo">
                        🦷
                    </div>
                    `
                }

                <div class="clinic-info">

                    <div class="clinic-name">
                        ${clinic.clinic_name}
                    </div>

                    <div class="clinic-description">
                        تبعد حوالي
                        ${clinic.distance.toFixed(1)}
                        كم
                    </div>

                </div>

            </div>

            <button
                class="visit-btn"
                onclick="
                openClinicPage(
                    '${clinic.user_id}'
                )
                "
            >
                زيارة العيادة
            </button>

        </div>

        `;

    });

}

window.findNearbyClinics =
findNearbyClinics;


// ===========================
// RENDER NEARBY CLINICS
// ===========================

function renderNearbyClinics(clinics){

    resultsContainer.innerHTML = "";

    if(!clinics.length){

        resultsContainer.innerHTML = `
            <div class="no-results">
                لا توجد عيادات تحتوي على موقع جغرافي
            </div>
        `;

        return;

    }

    clinics.forEach(clinic=>{

        resultsContainer.innerHTML += `

        <div class="clinic-card">

            <div class="clinic-left">

                ${
                    clinic.clinic_logo
                    ?
                    `
                    <img
                        src="${clinic.clinic_logo}"
                        class="clinic-logo-small"
                    >
                    `
                    :
                    `
                    <div class="clinic-placeholder-logo">
                        🦷
                    </div>
                    `
                }

                <div class="clinic-info">

                    <div class="clinic-name">
                        ${clinic.clinic_name}
                    </div>

                    <div class="clinic-description">
                        تبعد حوالي
                        ${clinic.distance.toFixed(1)}
                        كم
                    </div>

                </div>

            </div>

            <button
                class="visit-btn"
                onclick="
                openClinicPage(
                    '${clinic.user_id}'
                )
                "
            >
                زيارة العيادة
            </button>

        </div>

        `;

    });

}


// ===========================
// EVENTS
// ===========================

if(searchInput){

    searchInput.addEventListener(
        "input",
        searchClinics
    );

}

console.log(
    "index.js loaded"
);