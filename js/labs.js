async function getUserId() {

    const {
        data: { user }
    } = await supabaseClient.auth.getUser();

    // 🔥 لو مفيش يوزر يرجع المستخدم لصفحة اللوجين
    if (!user) {
        window.location.href = "login.html";
        return null;
    }

    return user.id;
}

/* =========================
   SAVE LAB
========================= */

async function saveLab() {

    const userId = await getUserId();

    console.log("USER ID:", userId); // مهم جدًا للتأكد

    if (!userId) {
        alert("User not logged in");
        return;
    }

   const lab_name = document.getElementById("labName").value.trim();

if(!lab_name){
    alert("Lab Name is required");
    return;
}

const specialization =
    document.getElementById("specialization").value.trim() || null;

const address =
    document.getElementById("address").value.trim() || null;

const phone =
    document.getElementById("phone").value.trim() || null;

    const { data, error } = await supabaseClient
        .from("labs")
        .insert([{
            user_id: userId,
            lab_name,
            specialization,
            address,
            phone
        }])
        .select(); // 🔥 مهم جدًا

    console.log("INSERT RESULT:", data, error);

    if (error) {
        alert(error.message);
        return;
    }

    await loadLabs(); // 🔥 انتظر التحميل

}

/* =========================
   LOAD LABS
========================= */


async function loadLabs() {

    const userId = await getUserId();

    console.log("LOAD USER:", userId);

    if (!userId) return;

    const { data, error } = await supabaseClient
        .from("labs")
        .select("*")
        .eq("user_id", userId)
        .order("id", { ascending: false });

    console.log("LABS DATA:", data, error);

    if (error) {
        console.log(error);
        return;
    }

    const container = document.getElementById("labsContainer");

    if (!container) {
        console.log("container not found");
        return;
    }

    container.innerHTML = "";

    if (!data || data.length === 0) {
        container.innerHTML =
            "<p style='color:var(--text-muted)'>No Labs Found</p>";
        return;
    }

    data.forEach(lab => {

        container.innerHTML += `

        <div class="doctor-card">

            <div>
                <div class="doctor-name">
                    ${lab.lab_name}
                </div>

                <div style="color:var(--text-muted);font-size:13px;">
                    ${lab.specialization || "-"}
                    <br>
                    ${lab.phone || "-"}
                </div>
            </div>

            <div class="actions">

                <button class="open-btn"
                    onclick="openLab(${lab.id})">
                    Open
                </button>

                <button class="delete-btn"
                    onclick="deleteLab(${lab.id})">
                    Delete
                </button>

            </div>

        </div>

        `;
    });
}


/* =========================
   OPEN LAB
========================= */

function openLab(id) {

    window.location.href =
        `lab_file.html?id=${id}`;
}

/* =========================
   DELETE LAB
========================= */

async function deleteLab(id) {

    if (!await showConfirm("Delete Lab?"))
        return;

    const { error } = await supabaseClient
        .from("labs")
        .delete()
        .eq("id", id);

    if (error) {

        alert(error.message);

        return;
    }

    loadLabs();
}

/* =========================
   START
========================= */

loadLabs();

function goToDashboard(){
    window.location.href = "dashboard.html";
}