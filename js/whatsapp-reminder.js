// =====================================================
// WHATSAPP APPOINTMENT REMINDER
// =====================================================

console.log("📱 WhatsApp Reminder JS Loaded");


// =====================================================
// CONFIG
// =====================================================

const WHATSAPP_REMINDER_TEMPLATE = `
مرحبًا {patient_name} 👋

نذكّرك بموعدك في {clinic_name} مع الطبيب

📅 التاريخ: {appointment_date}
🕐 الوقت: {appointment_time}

📍 {clinic_address}

نرجو الحضور في الموعد المحدد، ونتطلع لرؤيتك 😊

{clinic_phone}
`.trim();


// =====================================================
// MAIN FUNCTION
// =====================================================
window.prepareAppointmentReminder = async function (button) {

    try {

        // =====================================================
        // VALIDATE BUTTON
        // =====================================================

        if (!button) {
            throw new Error("زر التذكير غير موجود");
        }

        const visitId = button.dataset.visitId;

        if (!visitId) {
            alert("لم يتم العثور على رقم الزيارة");
            return;
        }

        console.log(
            "🔔 Preparing reminder for visit:",
            visitId
        );


        // =====================================================
        // BUTTON LOADING
        // =====================================================

        const originalHTML = button.innerHTML;

        button.disabled = true;

        button.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            <span>جاري التجهيز...</span>
        `;


        // =====================================================
        // GET CURRENT USER
        // =====================================================

        const {
            data: userData,
            error: userError
        } = await supabaseClient.auth.getUser();


        if (
            userError ||
            !userData?.user
        ) {
            throw new Error(
                "لم يتم العثور على المستخدم"
            );
        }


        const userId =
            userData.user.id;


        // =====================================================
        // LOAD VISIT
        // =====================================================

        const {
            data: visit,
            error: visitError
        } = await supabaseClient
            .from("patient_visits")
            .select(`
                id,
                patient_id,
                user_id,
                appointment_start,
                appointment_end,
                patient_name,
                patient_phone,
                department_name,
                visit_title,
                visit_status,
                visit_result,
                reminder_sent_at,
                reminder_status,
                reminder_message
            `)
            .eq("id", visitId)
            .eq("user_id", userId)
            .eq("is_deleted", false)
            .single();


        if (visitError) {

            console.error(
                "❌ Visit error:",
                visitError
            );

            throw new Error(
                "تعذر تحميل بيانات الزيارة: " +
                (visitError.message || "")
            );
        }


        if (!visit) {
            throw new Error(
                "الزيارة غير موجودة"
            );
        }


        // =====================================================
        // VALIDATE APPOINTMENT
        // =====================================================

        if (!visit.appointment_start) {

            throw new Error(
                "تاريخ ووقت الموعد غير موجود"
            );
        }


        // =====================================================
        // LOAD PATIENT
        // =====================================================

        let patient = null;


        if (visit.patient_id) {

            const {
                data,
                error: patientError
            } = await supabaseClient
                .from("patients")
                .select(`
                    id,
                    full_name,
                    phone,
                    birth_date
                `)
                .eq("id", visit.patient_id)
                .eq("user_id", userId)
                .maybeSingle();


            if (patientError) {

                console.error(
                    "❌ Patient error:",
                    patientError
                );

            } else {

                patient = data;

            }
        }


        // =====================================================
        // PATIENT DATA
        // =====================================================

        const patientName =
            patient?.full_name ||
            visit.patient_name ||
            "عزيزي المريض";


        const patientPhone =
            patient?.phone ||
            visit.patient_phone ||
            "";


        if (!patientPhone) {

            throw new Error(
                "رقم هاتف المريض غير موجود"
            );
        }


        // =====================================================
        // LOAD CLINIC
        // =====================================================

        let clinic = null;


        const {
            data: clinicData,
            error: clinicError
        } = await supabaseClient
            .from("clinic_pages")
            .select(`
                clinic_name,
                address,
                phone
            `)
            .eq("user_id", userId)
            .maybeSingle();


        if (clinicError) {

            console.warn(
                "⚠️ Clinic error:",
                clinicError
            );

        } else {

            clinic = clinicData;

        }


        // =====================================================
        // CLINIC DATA
        // =====================================================

        const clinicName =
            clinic?.clinic_name ||
            "عيادتنا";


        const clinicAddress =
            clinic?.address ||
            "";


        const clinicPhone =
            clinic?.phone ||
            "";


        // =====================================================
        // APPOINTMENT DATE & TIME
        // =====================================================

        const appointmentDateTime =
            new Date(
                visit.appointment_start
            );


        if (
            Number.isNaN(
                appointmentDateTime.getTime()
            )
        ) {

            throw new Error(
                "تاريخ الموعد غير صالح"
            );
        }


        // =====================================================
        // FORMAT DATE
        // =====================================================

        const appointmentDate =
            appointmentDateTime.toLocaleDateString(
                "ar-EG",
                {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                }
            );


        // =====================================================
        // FORMAT TIME
        // =====================================================

        const appointmentTime =
            appointmentDateTime.toLocaleTimeString(
                "ar-EG",
                {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true
                }
            );


        // =====================================================
        // DEPARTMENT
        // =====================================================

        const departmentName =
            visit.department_name ||
            "";


        // =====================================================
        // VISIT TITLE
        // =====================================================

        const visitTitle =
            visit.visit_title ||
            "";


        // =====================================================
        // BUILD MESSAGE
        // =====================================================

        let message;


        if (
            typeof WHATSAPP_REMINDER_TEMPLATE !== "undefined" &&
            WHATSAPP_REMINDER_TEMPLATE
        ) {

            message =
                WHATSAPP_REMINDER_TEMPLATE

                    .replace(
                        /{patient_name}/g,
                        patientName
                    )

                    .replace(
                        /{clinic_name}/g,
                        clinicName
                    )

                    .replace(
                        /{doctor_name}/g,
                        "الطبيب المسؤول"
                    )

                    .replace(
                        /{appointment_date}/g,
                        appointmentDate
                    )

                    .replace(
                        /{appointment_time}/g,
                        appointmentTime
                    )

                    .replace(
                        /{clinic_address}/g,
                        clinicAddress
                    )

                    .replace(
                        /{clinic_phone}/g,
                        clinicPhone
                    )

                    .replace(
                        /{department_name}/g,
                        departmentName
                    )

                    .replace(
                        /{visit_title}/g,
                        visitTitle
                    );

        } else {

            // =================================================
            // DEFAULT MESSAGE
            // =================================================

            message = `
السلام عليكم ${patientName} 🌷

نود تذكيركم بموعدكم في ${clinicName}.

📅 الموعد: ${appointmentDate}

⏰ الساعة: ${appointmentTime}

${departmentName ? `🏥 القسم: ${departmentName}` : ""}

${visitTitle ? `🦷 الخدمة: ${visitTitle}` : ""}

${clinicAddress ? `📍 العنوان: ${clinicAddress}` : ""}

${clinicPhone ? `📞 للتواصل: ${clinicPhone}` : ""}

نرجو الحضور في الموعد المحدد، ونتمنى لكم دوام الصحة والعافية 🌷

مع تحيات
${clinicName}
            `.trim();
        }


        console.log(
            "📝 Reminder message:",
            message
        );


        // =====================================================
        // NORMALIZE PHONE
        // =====================================================

        let whatsappPhone;


        if (
            typeof normalizeEgyptianPhone === "function"
        ) {

            whatsappPhone =
                normalizeEgyptianPhone(
                    patientPhone
                );

        } else {

            // Fallback للأرقام المصرية

            let cleanPhone =
                String(patientPhone)
                    .replace(/\D/g, "");


            if (
                cleanPhone.startsWith("01")
            ) {

                whatsappPhone =
                    "20" +
                    cleanPhone.substring(1);

            } else if (
                cleanPhone.startsWith("20")
            ) {

                whatsappPhone =
                    cleanPhone;

            } else {

                whatsappPhone =
                    cleanPhone;

            }
        }


        if (!whatsappPhone) {

            throw new Error(
                "رقم هاتف المريض غير صالح"
            );
        }


        console.log(
            "📱 WhatsApp phone:",
            whatsappPhone
        );


        // =====================================================
        // COPY MESSAGE
        // =====================================================

        if (
            typeof copyTextToClipboard === "function"
        ) {

            await copyTextToClipboard(
                message
            );

        } else {

            await navigator.clipboard.writeText(
                message
            );

        }


        console.log(
            "📋 Message copied"
        );


        // =====================================================
        // SAVE PREPARED STATUS
        // =====================================================

        const {
            error: updateError
        } = await supabaseClient
            .from("patient_visits")
            .update({
                reminder_status: "prepared",

                reminder_sent_at:
                    new Date().toISOString(),

                reminder_message:
                    message
            })
            .eq("id", visitId)
            .eq("user_id", userId);


        if (updateError) {

            console.error(
                "❌ Reminder update error:",
                updateError
            );

            throw new Error(
                "تم تجهيز الرسالة ولكن تعذر تسجيل حالة التذكير"
            );
        }


        // =====================================================
        // CHANGE BUTTON TO DONE
        // =====================================================

        button.classList.add(
            "reminder-done"
        );

        button.disabled = true;

        button.innerHTML = `
            <i class="fa-solid fa-check"></i>
            <span>تم التذكير</span>
        `;

        button.title =
            "تم التذكير بهذا الموعد";


        // =====================================================
        // OPEN WHATSAPP
        // =====================================================

        const whatsappUrl =
            `https://wa.me/${whatsappPhone}`;


        window.open(
            whatsappUrl,
            "_blank"
        );


        // =====================================================
        // SUCCESS TOAST
        // =====================================================

        if (
            typeof showToast === "function"
        ) {

            showToast(
                "تم نسخ رسالة التذكير وفتح WhatsApp"
            );

        } else {

            alert(
                "تم نسخ رسالة التذكير وفتح WhatsApp"
            );

        }


        // =====================================================
        // IMPORTANT:
        // لا نعيد الزر لحالته الأصلية هنا
        // =====================================================

    } catch (error) {

        console.error(
            "❌ WhatsApp Reminder Error:",
            error
        );


        alert(
            error?.message ||
            "حدث خطأ أثناء تجهيز التذكير"
        );


        // =====================================================
        // RESTORE BUTTON ONLY ON ERROR
        // =====================================================

        if (button) {

            button.disabled = false;

            button.innerHTML = `
                <i class="fa-brands fa-whatsapp"></i>
                <span>تذكير بالموعد</span>
            `;

            button.classList.remove(
                "reminder-done"
            );

            button.title =
                "تذكير المريض بالموعد";
        }
    }
};


// =====================================================
// FORMAT DATE
// =====================================================

function formatReminderDate(dateValue) {

    try {

        const date =
            new Date(
                `${dateValue}T00:00:00`
            );


        return date.toLocaleDateString(
            "ar-EG",
            {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
            }
        );

    } catch {

        return dateValue;
    }
}



// =====================================================
// FORMAT TIME
// =====================================================

function formatReminderTime(timeValue) {

    if (!timeValue) {

        return "غير محدد";
    }


    try {

        const parts =
            String(timeValue)
                .split(":");


        const hours =
            Number(parts[0]);


        const minutes =
            Number(parts[1] || 0);


        const date =
            new Date();


        date.setHours(
            hours,
            minutes,
            0,
            0
        );


        return date.toLocaleTimeString(
            "ar-EG",
            {
                hour: "numeric",
                minute: "2-digit",
                hour12: true
            }
        );

    } catch {

        return timeValue;
    }
}



// =====================================================
// NORMALIZE EGYPTIAN PHONE
// =====================================================

function normalizeEgyptianPhone(phone) {

    if (!phone) {

        return null;
    }


    let normalized =
        String(phone)
            .replace(/\D/g, "");


    // ---------------------------------------------
    // 010XXXXXXXX
    // 011XXXXXXXX
    // 012XXXXXXXX
    // 015XXXXXXXX
    // ↓
    // 2010XXXXXXXX
    // ---------------------------------------------

    if (
        normalized.startsWith("0") &&
        normalized.length === 11
    ) {

        normalized =
            "20" +
            normalized.substring(1);
    }


    // ---------------------------------------------
    // 20XXXXXXXXXX
    // ---------------------------------------------

    if (
        normalized.startsWith("20") &&
        normalized.length === 12
    ) {

        return normalized;
    }


    // ---------------------------------------------
    // +20XXXXXXXXXX
    // ---------------------------------------------

    if (
        normalized.startsWith("20")
    ) {

        return normalized;
    }


    return null;
}



// =====================================================
// COPY TO CLIPBOARD
// =====================================================

async function copyTextToClipboard(text) {

    if (
        navigator.clipboard &&
        window.isSecureContext
    ) {

        await navigator.clipboard.writeText(
            text
        );

        return;
    }


    // Fallback
    const textarea =
        document.createElement(
            "textarea"
        );


    textarea.value =
        text;


    textarea.style.position =
        "fixed";

    textarea.style.opacity =
        "0";


    document.body.appendChild(
        textarea
    );


    textarea.focus();

    textarea.select();


    const successful =
        document.execCommand(
            "copy"
        );


    textarea.remove();


    if (!successful) {

        throw new Error(
            "تعذر نسخ الرسالة"
        );
    }
}



// =====================================================
// MARK AS SENT
// =====================================================

async function markReminderAsSent(
    visitId,
    userId
) {

    try {

        const {
            error
        } = await supabaseClient

            .from("patient_visits")

            .update({

                reminder_status:
                    "sent"

            })

            .eq("id", visitId)

            .eq("user_id", userId);


        if (error) {

            console.error(
                "❌ Mark reminder sent error:",
                error
            );

            return;
        }


        console.log(
            "✅ Reminder marked as sent"
        );


        showToast(
            "تم تسجيل إرسال التذكير"
        );


    } catch (error) {

        console.error(
            "❌ Reminder status error:",
            error
        );
    }
}