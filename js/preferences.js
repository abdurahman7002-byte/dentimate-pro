
/* ============================================================
   DENTIX PRO
   GLOBAL USER PREFERENCES
   Language + Theme
   ============================================================ */

let userPreferences = {
    language: "en",
    theme: "dark"
};


/* ============================================================
   APPLY THEME
============================================================ */

function applyTheme(theme) {

    if (theme !== "light" && theme !== "dark") {
        theme = "dark";
    }

    document.documentElement.setAttribute(
        "data-theme",
        theme
    );

    document.body?.setAttribute(
        "data-theme",
        theme
    );

    userPreferences.theme = theme;

    updateThemeButton();
}


/* ============================================================
   APPLY LANGUAGE
============================================================ */

function applyLanguage(language) {

    if (language !== "ar" && language !== "en") {
        language = "en";
    }

    userPreferences.language = language;

    document.documentElement.lang = language;

    document.documentElement.dir =
        language === "ar"
            ? "rtl"
            : "ltr";

    updateLanguageButton();

    applyTranslations();
}


/* ============================================================
   UPDATE THEME BUTTON
============================================================ */

function updateThemeButton() {

    const icon =
        document.getElementById("themeToggleIcon");

    const text =
        document.getElementById("themeToggleText");

    if (!icon || !text) return;


    if (userPreferences.theme === "dark") {

        icon.className =
            "fa-solid fa-sun";

        text.textContent =
            "الوضع الفاتح";

    } else {

        icon.className =
            "fa-solid fa-moon";

        text.textContent =
            "الوضع الداكن";
    }
}


/* ============================================================
   UPDATE LANGUAGE BUTTON
============================================================ */

function updateLanguageButton() {

    const text =
        document.getElementById(
            "languageToggleText"
        );

    if (!text) return;


    if (userPreferences.language === "en") {

        text.textContent =
            "العربية";

    } else {

        text.textContent =
            "English";
    }
}


/* ============================================================
   TOGGLE THEME
============================================================ */

async function toggleTheme() {

    const newTheme =
        userPreferences.theme === "dark"
            ? "light"
            : "dark";

    applyTheme(newTheme);

    saveUserPreferences();
}


/* ============================================================
   TOGGLE LANGUAGE
============================================================ */

async function toggleLanguage() {

    const newLanguage =
        userPreferences.language === "en"
            ? "ar"
            : "en";

    applyLanguage(newLanguage);

    saveUserPreferences();
}


/* ============================================================
   SAVE PREFERENCES
============================================================ */

async function saveUserPreferences() {

    try {

        const {
            data: {
                user
            }
        } = await supabaseClient.auth.getUser();


        if (!user) {

            console.error(
                "No authenticated user found"
            );

            return;
        }


        const {
            error
        } = await supabaseClient
            .from("user_preferences")
            .upsert(
                {
                    user_id: user.id,
                    language:
                        userPreferences.language,
                    theme:
                        userPreferences.theme,
                    updated_at:
                        new Date().toISOString()
                },
                {
                    onConflict: "user_id"
                }
            );


        if (error) {

            console.error(
                "Save preferences error:",
                error
            );

            return;
        }


        /* Save local copy */

        localStorage.setItem(
            "dentix_preferences",
            JSON.stringify(
                userPreferences
            )
        );

    } catch (error) {

        console.error(
            "Save preferences exception:",
            error
        );
    }
}


/* ============================================================
   LOAD PREFERENCES FROM SUPABASE
============================================================ */

async function loadUserPreferences() {

    try {

        const {
            data: {
                user
            }
        } = await supabaseClient.auth.getUser();


        if (!user) {

            console.warn(
                "No authenticated user"
            );

            return;
        }


        const {
            data,
            error
        } = await supabaseClient
            .from("user_preferences")
            .select(
                "language, theme"
            )
            .eq(
                "user_id",
                user.id
            )
            .maybeSingle();


        if (error) {

            console.error(
                "Load preferences error:",
                error
            );

            return;
        }


        /*
         * If user has no preferences yet,
         * create default preferences.
         */

        if (!data) {

            userPreferences = {
                language: "en",
                theme: "dark"
            };

            await saveUserPreferences();

        } else {

            userPreferences = {

                language:
                    data.language || "en",

                theme:
                    data.theme || "dark"

            };
        }


        /* Apply globally */

        applyTheme(
            userPreferences.theme
        );

        applyLanguage(
            userPreferences.language
        );


        /* Save local copy */

        localStorage.setItem(
            "dentix_preferences",
            JSON.stringify(
                userPreferences
            )
        );


    } catch (error) {

        console.error(
            "Load preferences exception:",
            error
        );
    }
}


/* ============================================================
   LOAD LOCAL PREFERENCES
   Fast initial application
============================================================ */

function loadLocalPreferences() {

    try {

        const saved =
            localStorage.getItem(
                "dentix_preferences"
            );

        if (!saved) return;


        const parsed =
            JSON.parse(saved);


        if (
            parsed.language === "ar" ||
            parsed.language === "en"
        ) {

            userPreferences.language =
                parsed.language;
        }


        if (
            parsed.theme === "light" ||
            parsed.theme === "dark"
        ) {

            userPreferences.theme =
                parsed.theme;
        }


        /*
         * Apply immediately.
         * This prevents visual delay.
         */

        applyTheme(
            userPreferences.theme
        );

        applyLanguage(
            userPreferences.language
        );


    } catch (error) {

        console.error(
            "Local preferences error:",
            error
        );
    }
}


/* ============================================================
   TRANSLATIONS
============================================================ */

const translations = {

en: {

    "control_panel":
        "Control Panel",

    "pricing_helper":
        "Your Pricing Helper",

    "service_name_placeholder":
        "Service Name",

    "service_price_placeholder":
        "Price",

    "work_name_placeholder":
        "ex: Crown",

    "work_type_placeholder":
        "ex: Zirconia",

    "lab_cost_placeholder":
        "Lab Cost",

    "patient_amount_placeholder":
        "Patient Amount",

    "department_name_placeholder":
        "ex: main clinic",

    "edit_service":
        "Edit Service",

    "save":
        "Save",

    "cancel":
        "Cancel",

    "edit_dental_work":
        "Edit Dental Work",

    "dashboard.title":
        "Clinic Dashboard",

    "dashboard.subtitle":
        "Manage your clinic, patients, appointments and digital services from one place.",

    "new_visit":
        "New Visit",

    "patients":
        "Patients",

    "doctors":
        "Doctors",

    "settings":
        "Settings",

    

    "welcome":
        "Welcome to",

    "1":
        "System works efficiently",

    "2":
        "Notifications",

    "3":
        "Mark all as read",

    "4":
        "No notifications",

    "5":
        "Clinic Page",

    "6":
        "Log Out",

    "7":
        "Appointment Requests",

    "8":
        "Upcoming Lab Deliveries",

    "9":
        "Upcoming Appointments",

    "10":
        "Yesterday",

    "11":
        "Today",

    "12":
        "Tomorrow",

    "13":
        "Within 3 Days",

    "14":
        "Within a Week",

    "15":
        "All Upcoming",

    "16":
        "All Departments",

    "17":
        "Filter by Visit Status",

    "18":
        "Filter appointments by badge",

    "19":
        "All Visits",

    "20":
        "Book New Visit",

    "21":
        "Search Day Visits",

    "22":
        "View a Single Day's Visits",

    "23":
        "Waiting Screen",

    "24":
        "View the waiting screen for patients",

    "25":
        "Waiting List",

    "26":
        "Patients in the waiting list",

    "27":
        "Week Calendar",

    "28":
        "View weekly visits in columns",

    "29":
        "Specific Day Visits",

    "30":
        "View and manage visits for a specific day",

    "31":
        "Apply",

    "32":
        "Select Date",

    "33":
        "Select a day from the calendar to view recorded visits",

    "34":
        "Book New Visit",

    "35":
        "Add a new visit for a patient",

    "36":
        "Patient Information",

    "37":
        "Basic booking information",

    "38":
        "Patient Name",

    "39":
        "Phone",

    "40":
        "Age",

    "41":
        "Visit Date",

    "42":
        "Select department and visit date",

    "43":
        "Department",

    "44":
        "Loading departments .....",

    "45":
        "Visit Starts At",

    "46":
        "Visit Ends At",

    "47":
        "Visit Duration",

    "48":
        "30 min",

    "49":
        "15 min",

    "50":
        "1 hour",

    "51":
        "2 hours",

    "52":
        "3 hours",

    "53":
        "4 hours",

    "54":
        "A visit can be booked for patients without a file, and a Create File option will appear in the visits dashboard.",

    "55":
        "Cancel",

    "56":
        "Book Visit",

    "57":
        "Week Calendar",

    "58":
        "Clinic Appointments - Weekly",

    "59":
        "Previous",

    "60":
        "Next",

    "61":
        "Waiting List",

    "62":
        "Patients who are waiting for a visit",

    "63":
        "Waiting Patients",

    "64":
        "Add Patient to Waiting List",

    "65":
        "Loading waiting list .....",

    "66":
        "Add Patient to Waiting List",

    "67":
        "Search for a patient or add a new patient",

    "68":
        "Patient Name",

    "69":
        "You can select an existing patient or add a new one",

    "70":
        "Age",

    "71":
        "Phone",

    "72":
        "Waiting Status",

    "73":
        "Calm",

    "74":
        "Not Emergent",

    "75":
        "Emergent",

    "76":
        "Case Needs Priority",

    "77":
        "Cancel",

    "78":
        "Add to Waiting List",

    "79":
        "Confirm Appointment",

    "80":
        "Cancel Appointment",

    "81":
        "Patient File",

    "82":
        "Create File",

    "83":
        "Add Patient",

    "84":
        "Male",

    "85":
        "Female",

    "86":
        "Birth Date",

    "87":
        "Save Patient",

    "88":
        "Patient Files",

    "89":
        "Manage patient files and easily access their data",

    "90":
        "Total Patients",

    "91":
        "Add Patient",

    "92":
        "Search",

    "93":
        "Patient Files",

    "94":
        "Name",

    "95":
        "Age",

    "96":
        "Action",

    "97":
        "Home",

    "98":
        "Visits",

    "99":
        "Add Patient",

    "100":
        "Patient Files",

    "101":
        "More",

    "102":
        "More",

    "103":
        "Manage System",

    "104":
        "Invoices",

    "105":
        "Manage Clinic Invoices",

    "106":
        "Storage",

    "107":
        "Clinic Storage and Purchases",

    "108":
        "Labs",

    "109":
        "Manage Labs and Prosthesis",

    "110":
        "Doctors",

    "111":
        "Manage Doctors",

    "112":
        "Prints",

    "113":
        "Print prescriptions, consents and instructions",

    "114":
        "Drugs and Doses",

    "115":
        "Manage drugs and calculate doses",

    "116":
        "Reports",

    "117":
        "Detailed Clinic Reports",

    "118":
        "Prices and Departments",

    "119":
        "Price clinic services, prosthesis and add departments",

    "120":
        "Add New Invoice",

    "121":
        "Add New Invoice",

    "122":
        "NEW INVOICE",

    "123":
        "Invoice Data",

    "124":
        "Add invoice information and amount",

    "125":
        "Beneficiary",

    "126":
        "Reason",

    "127":
        "Amount Paid",

    "128":
        "The invoice will be added as a financial expense",

    "129":
        "Save Invoice",

    "130":
        "Save Changes",

    "131":
        "Cancel",

    "132":
        "Paid Amount",

    "133":
        "Reason",

    "134":
        "Beneficiary",

    "135":
        "Clinic Page Settings",

    "136":
        "These information will appear to visitors of the public clinic page",

    "137":
        "Not Published",

    "138":
        "Page Status",

    "139":
        "Working Days",

    "140":
        "Published Photos",

    "141":
        "Clinic Information",

    "142":
        "Main clinic information that appears on the clinic page",

    "143":
        "Clinic Name",

    "144":
        "Clinic Description",

    "145":
        "Clinic Logo",

    "146":
        "Click to upload clinic logo",

    "147":
        "PNG with transparent background",

    "148":
        "Phone",

    "149":
        "WhatsApp",

    "150":
        "Address",

    "151":
        "Auto-select Current Location",

    "152":
        "Location added successfully",

    "153":
        "Social Links",

    "154":
        "Facebook",

    "155":
        "Instagram",

    "156":
        "Website",

    "157":
        "Clinic Photos",

    "158":
        "Click to choose clinic photos",

    "159":
        "(Ctrl + Click) You can choose multiple photos",

    "160":
        "Working Days and Times",

    "161":
        "Save Clinic Information",

    "162":
        "Clinic Page Link",

    "163":
        "Share this link with your patients",

    "164":
        "Preview Clinic Page",

    "165":
        "This is how the clinic page appears to visitors",

    "166":
        "Open in New Window",

    "167":
        "Close",

    "168":
        "Suppliers",

    "169":
        "Manage Suppliers",

    "170":
        "Add Invoice",

    "171":
        "Add New Purchase Invoice",

    "172":
        "Purchase History",

    "173":
        "Purchase Payment History",

    "174":
        "Shortages",

    "175":
        "priced clinic services",

    "176":
        "saved services appear in patient file when adding service for him",

    "177":
        "saved prosthesis appear in lab file when adding prosthesis",

    "178":
        "saved departments appear in bookink visit window ",

    "179":
        "services management",

    "180":
        "add service",

    "181":
        "save service",

    "182":
        "services list",

    "183":
        "prosthesis management",

    "184":
        "add prosthesis",

    "185":
        "prosthesis name",

    "186":
        "prosthesis type",

    "187":
        "lab cost",

    "188":
        "patient pay",

    "189":
        "save prosthesis",

    "190":
        "prosthesis list",

    "191":
        "departments management",

    "192":
        "add department",

    "193":
        "department name",

    "194":
        "save department",

    "195":
        "departments list",

    "196":
        "Missing Items",

    "197":
        "sroll to show low-stock items",

    "198":
        "reports",

    "199":
        "visits reports",

    "200":
        "current day stats",

    "201":
        "current month stats",

    "202":
        "main finanial dashboard",

    "203":
        "month comparison",

    "204":
        "departments comparison",

    "205":
        "doctors stats",

    "206":
        "services stats",

    "207":
        "age - gender stats",

        "208": "Invoices Management",
"209": "Beneficiary name or person",
"210": "Example: supplies or maintenance",
"211": "Search beneficiary or date...",
"212": "Invoice Details",
"213": "Close",
"patients_title":
        "Patients",

    "patient_name_placeholder":
        "👤 Patient Name",

    "phone_placeholder":
        "📞 Phone",

    "address_placeholder":
        "📍 Address",

    "birth_date_placeholder":
        "Birth Date",

    "medical_history_placeholder":
        "🩺 Medical History",

    "dental_history_placeholder":
        "🦷 Dental History",

    "blood_pressure":
        "Blood Pressure",

    "diabetes":
        "Diabetes",

    "asthma":
        "Asthma",

    "heart_disease":
        "Heart Disease",

    "allergies":
        "Allergies",

    "kidney_disease":
        "Kidney Disease",

    "liver_disease":
        "Liver Disease",

    "thyroid":
        "Thyroid",

    "blood_thinners":
        "Blood Thinners",

    "epilepsy":
        "Epilepsy",

    "pregnancy":
        "Pregnancy",

    "no_medical_history":
        "No Medical History",


// ========== من ملف clinic-settings.html ==========
"214": "Clinic Page Settings | Dentix Pro",
"215": "Example: Smile Specialized Clinic",
"216": "Write a brief about the clinic and services...",
"217": "01000000000",
"218": "Full clinic address",
"219": "https://facebook.com/...",
"220": "https://instagram.com/...",
"221": "https://...",
"222": "Copy",
"224": "(Ctrl + Click) You can choose multiple photos",
// ========== من ملف dashboard.html ==========
"225": "Clinic Dashboard",
"226": "Search for a patient or add a new patient",
"227": "Example: 01012345678",
"228": "Example: 25",
"229": "Type patient name...",
"230": "Age",
"231": "Phone number",
"232": "New Visit",
"233": "Close",
"234": "Upcoming Visit",
"235": "Pending Confirmation",
"236": "Now Visit",
"237": "Finished Visit",
"238": "Missed Visit",
// ========== من ملف patients-files.html ==========
"241": "Patients Files",
"242": "Search patients by name, phone, or address...",
// ========== من ملف storage.html ==========
"243": "Storage | Dentix Pro",
"244": "Storage",
"245": "Manage clinic inventory and material consumption",
"246": "Total Items",
"247": "This Month Purchase Cost",
"248": "Search inventory...",
"249": "No low stock items",
"250": "Invoices",
"251": "Total Purchases",
"252": "Paid",
"253": "Remaining",
"254": "All Suppliers",
"255": "Refresh",
"256": "Invoice",
"257": "Supplier",
"258": "Date",
"259": "Unpaid",
"260": "Subtotal",
"261": "Discount",
"262": "Total",
"263": "Paid",
"264": "Remaining",
"265": "Add Payment",
"266": "Edit Discount",
"267": "Purchased Items",
"268": "Items included in this invoice",
"269": "Payment History",
"270": "All payments made for this invoice",
"271": "Notes",
"272": "No notes",
"273": "Record a new payment for this invoice",
"274": "Payment Amount",
"275": "Enter payment amount",
"276": "Payment Date",
"277": "Optional payment notes...",
"278": "Cancel",
"279": "Save Payment",
"280": "Update the discount for this invoice",
"281": "Current Total",
"282": "Enter discount",
"283": "Changing the discount will automatically recalculate the invoice total and remaining amount.",
"284": "Save Discount",
"285": "Purchase Invoice",
"286": "Select Supplier",
"287": "Invoice Number",
"288": "e.g. INV-001",
"289": "Invoice Date",
"290": "Invoice Items",
"291": "Add all purchased materials to this invoice",
"292": "Add Item",
"293": "Subtotal",
"294": "Discount",
"295": "EGP",
"296": "%",
"297": "Total",
"298": "Initial Payment",
"299": "Optional first payment",
"300": "Enter initial payment",
"301": "Remaining",
"302": "Optional notes...",
"303": "Save Invoice",
"304": "Manage suppliers and purchases",
"305": "Supplier Name",
"306": "Search suppliers...",
"307": "Add Supplier",
"308": "Supplier Name",
"309": "e.g. Dental Supply Co.",
"310": "Phone",
"311": "01xxxxxxxxx",
"312": "Email",
"313": "supplier@example.com",
"314": "Address",
"315": "Supplier address",
"316": "Additional notes...",
"317": "Save Supplier",
"318": "Loading suppliers...",
"319": "Service Consumption",
"320": "Services using this item",
"321": "Loading services...",
"322": "Save Consumption",
"323": "Edit Quantity",
"324": "Current Quantity",
"325": "Enter quantity",
"326": "This changes the current stock only. Purchase history and prices will remain unchanged.",
"327": "Save Quantity",
// ========== من ملف doctor_file.html ==========
"328": "Doctor File",
"329": "Doctor Name",
"330": "Specialization",
"331": "Active",
"332": "Edit Profile",
"333": "Phone",
"334": "Age",
"335": "Address",
"336": "Registered At",
"337": "Doctor Account",
"338": "Permanently remove this doctor from the clinic.",
"339": "Delete Doctor",
"340": "DOCTOR PROFILE",
"341": "Edit Doctor Information",
"342": "Update the doctor's personal and professional information.",
"343": "Doctor Name",
"344": "Enter doctor name",
"345": "Specialization",
"346": "Enter specialization",
"347": "Date of Birth",
"348": "Phone",
"349": "Phone number",
"350": "Address",
"351": "Enter address",
"352": "Cancel",
"353": "Save Changes",
"354": "Doctor Dashboard",
"355": "Services",
"356": "Service Amount",
"357": "Doctor Profit",
"358": "Doctor Services",
"359": "All services provided to patients and assigned to this doctor appear here automatically.",
"360": "Doctor Payments",
"361": "Record and track amounts paid to the doctor",
"362": "Add Payment",
"363": "Total Doctor Due",
"364": "Total Paid to Doctor",
"365": "Remaining for Doctor",
"366": "Loading payments...",
"367": "Print Doctor Report",
"368": "Add Doctor Payment",
"369": "Record a new payment",
"370": "Amount",
"371": "Payment Date",
"372": "Notes",
"373": "Payment notes...",
"374": "Save Payment",
 "reports_title":
        "Reports",

    "visits_statistics":
        "Visits Statistics",

    "visits_statistics_desc":
        "Analyze visit performance during the selected period",

    "filter_period":
        "Select Statistics Period",

    "from_date":
        "From",

    "to_date":
        "To",

    "show_statistics":
        "Show Statistics",

    "visits_filter_hint":
        "Select start and end dates to display visit statistics for the selected period.",

    "visits_period_desc":
        "Percentage of completed and incomplete visits during the selected period",

    "visit_status":
        "Visit Status",

    "visit_status_ar":
        "حالة الزيارات",

    "completed_visits":
        "Completed Visits",

    "waiting_visits":
        "Waiting Visits",

    "incomplete_visits":
        "Incomplete Visits",

    "total_visits":
        "Total Visits",

    "total_visits_label":
        "Total Visits",

    "today_statistics_title":
        "Today Statistics",

    "daily_financial_summary":
        "Daily Financial Summary",

    "today_new_patients":
        "Today's New Patients",

    "today_new_patients_ar":
        "المرضى الجدد المسجلين اليوم",

    "today_services":
        "Today's Services",

    "today_services_count":
        "عدد الخدمات اليوم",

    "hover_services_hint":
        "Hover to view service details",

    "today_services_breakdown":
        "Today's Services Breakdown",

    "today_services_breakdown_ar":
        "تفاصيل خدمات اليوم",

    "completed":
        "Completed",

    "incomplete":
        "Incomplete",

    "total_services":
        "Total Services",

    "completion_rate":
        "Completion Rate",

    "today_total":
        "Today Total",

    "today_total_ar":
        "اجمالي المبالغ المستحقة",

    "today_paid":
        "Today Paid",

    "today_paid_ar":
        "اجمالي المبالغ المدفوعة",

    "today_remaining":
        "Today Remaining",

    "today_remaining_ar":
        "اجمالي المبالغ المتبقية اليوم",

    "remaining_hint":
        "Click or hover to track remaining amounts",

    "remaining_breakdown":
        "Remaining Breakdown",

    "remaining_breakdown_ar":
        "تفاصيل المبالغ المتبقية اليوم",

    "patients_label":
        "Patients",

    "due_label":
        "Due",

    "paid_label":
        "Paid",

    "remaining_label":
        "Remaining",

    "remaining_sources":
        "Remaining Sources",

    "loading_details":
        "Loading details...",

    "view_all_details":
        "View All Details",

    "today_profit":
        "Today Profit",

    "today_profit_ar":
        "صافي الربح اليوم",

    "hover_profit_hint":
        "Hover to track profit details",

    "today_profit_breakdown":
        "Today's Profit Breakdown",

    "today_profit_breakdown_ar":
        "تفاصيل صافي الربح اليوم",

    "paid":
        "Paid",

    "lab_costs":
        "Lab Costs",

    "net_profit":
        "Net Profit",

    "paid_eq":
        "Paid",

    "lab_costs_eq":
        "Lab Costs",

    "net_profit_eq":
        "Net Profit",

    "month_statistics_title":
        "Current Month Statistics",

    "monthly_financial_summary":
        "Financial Summary For This Month",

    "monthly_patients":
        "Monthly Patients",

    "monthly_patients_ar":
        "المرضى المسجلين هذا الشهر",

    "monthly_services":
        "Monthly Services",

    "monthly_services_count":
        "عدد الخدمات هذا الشهر",

    "hover_monthly_hint":
        "Hover to view service details",

    "monthly_services_breakdown":
        "Monthly Services Breakdown",

    "monthly_services_breakdown_ar":
        "تفاصيل خدمات الشهر",

    "monthly_total":
        "Monthly Total",

    "monthly_total_ar":
        "اجمالي المبالغ المستحقة هذا الشهر",

    "monthly_paid":
        "Monthly Paid",

    "monthly_paid_ar":
        "اجمالي المبالغ المدفوعة هذا الشهر",

    "monthly_remaining":
        "Monthly Remaining",

    "monthly_remaining_ar":
        "اجمالي المبالغ المتبقية هذا الشهر",

    "remaining_month_hint":
        "Click or hover to track remaining amounts this month",

    "monthly_breakdown":
        "Monthly Breakdown",

    "monthly_breakdown_ar":
        "تفاصيل المبالغ المتبقية هذا الشهر",

    "monthly_profit":
        "Monthly Profit",

    "monthly_profit_ar":
        "صافي الربح هذا الشهر",

    "monthly_profit_breakdown":
        "Monthly Profit Breakdown",

    "monthly_profit_breakdown_ar":
        "تفاصيل صافي الربح هذا الشهر",

    "bills":
        "Bills",

    "inventory":
        "Inventory",

    "lab_bills_inventory_eq":
        "Lab + Bills + Inventory",

    "clinic_financial_dashboard":
        "Clinic Financial Dashboard",

    "based_on_services":
        "Based On Patient Services",

    "total_amount":
        "Total Amount",

    "total_amount_ar":
        "اجمالي المبالغ المستحقة",

    "paid_amount":
        "Paid Amount",

    "paid_amount_ar":
        "اجمالي المبالغ المدفوعة",

    "remaining_amount":
        "Remaining Amount",

    "remaining_amount_ar":
        "إجمالي المبالغ المتبقية",

    "hover_remaining_hint":
        "Hover to track remaining amounts",

    "total_remaining_breakdown":
        "Total Remaining Breakdown",

    "total_remaining_breakdown_ar":
        "تفاصيل جميع المبالغ المتبقية",

    "invoices":
        "Invoices",

    "net_profit_total_ar":
        "صافي الربح الكلي",

    "net_profit_breakdown":
        "Net Profit Breakdown",

    "net_profit_breakdown_ar":
        "تفاصيل صافي الربح الكلي",

    "lab_eq":
        "Lab",

    "bills_eq":
        "Bills",

    "inventory_eq":
        "Inventory",

    "net_profit_title":
        "Net Profit",

    "net_profit_formula":
        "Profit = Paid - Selected Costs",

    "profit_filter":
        "Profit Filter",

    "from":
        "From",

    "to":
        "To",

    "calculate_profit":
        "Calculate Profit",

    "lab_costs_toggle":
        "Lab Costs",

    "lab_costs_toggle_ar":
        "تكاليف المعامل",

    "bills_toggle":
        "Invoices",

    "bills_toggle_ar":
        "الفواتير والمصروفات",

    "inventory_toggle":
        "Inventory",

    "inventory_toggle_ar":
        "مشتريات المخزن",

    "doctor_payments_toggle":
        "Doctor Payments",

    "doctor_payments_toggle_ar":
        "مدفوعات الأطباء",

    "statistics_dashboard":
        "Statistics Dashboard",

    "statistics_dashboard_desc":
        "Analyze clinic performance during a specific period",

    "current_month":
        "Current Month",

    "from_label":
        "From",

    "to_label":
        "To",

    "apply_period":
        "Apply Period",

    "custom_total_due":
        "Total Due",

    "custom_paid":
        "Paid",

    "custom_remaining":
        "Remaining",

    "custom_remaining_breakdown":
        "Custom Remaining Breakdown",

    "custom_remaining_breakdown_ar":
        "تفاصيل المبالغ المتبقية للفترة المحددة",

    "services_label":
        "Services",

    "due_after_discount":
        "Due After Discount",

    "all_payments":
        "All Payments",

    "remaining_eq":
        "Remaining",

    "custom_services_breakdown":
        "Custom Services Breakdown",

    "custom_services_breakdown_ar":
        "تفاصيل الخدمات للفترة المحددة",

    "custom_net_profit":
        "Net Profit",

    "custom_profit_breakdown":
        "Custom Profit Breakdown",

    "custom_profit_breakdown_ar":
        "تفاصيل صافي الربح للفترة المحددة",

    "lab_label":
        "Lab",

    "bills_label":
        "Invoices",

    "inventory_label":
        "Inventory",

    "net_profit_label":
        "Net Profit",

    "from_month":
        "From Month",

    "to_month":
        "To Month",

    "show_comparison":
        "Show Comparison",

    "last_6_months":
        "Last 6 Months",

    "departments_performance":
        "Departments Performance",

    "doctors_financial_report":
        "Doctors Financial Report",

    "doctors_report_desc":
        "Track doctors services, dues and payments",

    "financial_report":
        "Financial Report",

    "report_settings":
        "Report Settings",

    "report_settings_desc":
        "Select period and doctor",

    "from_date_label":
        "From Date",

    "to_date_label":
        "To Date",

    "doctor_label":
        "Doctor",

    "all_doctors":
        "All Doctors",

    "show_report":
        "Show Report",

    "report_summary":
        "Report Summary",

    "quick_overview":
        "Quick financial overview",

    "doctors_badge":
        "Doctors",

    "doctors_count_label":
        "Doctors Count",

    "services_badge":
        "Services",

    "services_done":
        "Services Done",

    "patients_badge":
        "Patients",

    "patients_count":
        "Patients",

    "net_badge":
        "Net",

    "net_after_discount":
        "Net After Discount",

    "collection_badge":
        "Collection",

    "patient_payments":
        "Patient Payments",

    "remaining_badge":
        "Remaining",

    "patient_remaining":
        "Patient Remaining",

    "due_badge":
        "Due",

    "doctor_fees":
        "Doctor Fees",

    "paid_badge":
        "Paid",

    "doctor_payments":
        "Doctor Payments",

    "balance_badge":
        "Balance",

    "doctor_remaining":
        "Doctor Remaining",

    "doctor_money_movement":
        "Doctor Dues Movement",

    "doctor_money_comparison":
        "Compare due, paid and remaining",

    "due_amount":
        "Due",

    "paid_amount_label":
        "Paid",

    "remaining_amount_label":
        "Remaining",

    "doctors_comparison":
        "Doctors Comparison",

    "doctors_comparison_desc":
        "Net due for each doctor",

    "doctors_details":
        "Doctors Details",

    "doctors_details_desc":
        "Dues, payments and balances",

    "by_selected_period":
        "By Selected Period",

    "doctor_col":
        "Doctor",

    "services_col":
        "Services",

    "patients_col":
        "Patients",

    "net_after_discount_col":
        "Net After Discount",

    "patient_payments_col":
        "Patient Payments",

    "patient_remaining_col":
        "Patient Remaining",

    "doctor_fees_col":
        "Doctor Fees",

    "doctor_payments_col":
        "Doctor Payments",

    "doctor_remaining_col":
        "Doctor Remaining",

    "swipe_table":
        "Swipe horizontally to view all details",

    "services_analytics":
        "Services Analytics",

    "services_analytics_desc":
        "Compare all registered services",

    "from_date_analytics":
        "From Date",

    "to_date_analytics":
        "To Date",

    "filter_btn":
        "Filter",

    "top_service":
        "Most Frequent Service",

    "services_count":
        "Registered Services Count",

    "service_col":
        "Service",

    "count_col":
        "Count",

    "total_due_col":
        "Total Due",

    "total_paid_col":
        "Total Paid",

    "total_remaining_col":
        "Total Remaining",

    "patient_age_gender":
        "Patient Age & Gender Analytics",

    "from_small":
        "From",

    "to_small":
        "To",

    "age_distribution":
        "Age Distribution",

    "age_distribution_desc":
        "Patient distribution by age group",

    "category_col":
        "Category",

    "age_range_col":
        "Age Range",

    "patients_count_col":
        "Patients",

    "patient_distribution":
        "Patient Distribution",

    "gender_stats":
        "Male & Female Statistics",

    "total_patients_label":
        "Total Patients",

    "remaining_details_title":
        "Remaining Details",

    "remaining_details_subtitle":
        "Remaining Amounts Details",

        // ========== من ملف doctors.html ==========
"375": "Doctors",
"376": "Doctors Management",
"377": "Add Doctor",
"378": "Save Doctor",
"379": "Doctors List",



"prints_title": "Medical Prints | Dentix Pro",
"medical_prints": "Medical Prints",
"medical_prints_desc": "Create and manage prescriptions, reports and invoices professionally",
"create_new_print": "Create New Print",
"saved_prints": "Saved Prints",
"no_prints_yet": "No prints yet",
"start_first_print": "Start by creating your first print",
"new_print": "New Print",
"clinic_doctor_info": "Clinic & Doctor Information",
"clinic_name_label": "Clinic Name",
"clinic_name_placeholder": "e.g. Smile Clinic",
"doctor_name_label": "Doctor Name",
"doctor_name_placeholder": "e.g. Dr. Ahmed Mohamed",
"job_title_label": "Job Title",
"job_title_placeholder": "e.g. Oral & Dental Surgery Specialist",
"document_info": "Document Information",
"print_title_label": "Print Title",
"print_title_placeholder": "e.g. Prescription - Mohamed Ali",
"document_type_label": "Document Type",
"type_prescription": "Prescription",
"type_instruction": "Instructions",
"type_invoice": "Invoice",
"type_consent": "Medical Consent",
"content_label": "Content",
"content_placeholder": "Write print content here...",
"main_image_label": "Main Image",
"click_upload_image": "Click to upload image",
"png_jpg_optional": "PNG, JPG — Optional",
"clinic_logo_label": "Clinic Logo",
"click_upload_logo": "Click to upload logo",
"png_transparent": "PNG with transparent background",
"save_print": "Save Print",
"print_now": "Print Now",
"close": "Close",

"dose_calculator_title": "Dose Calculator | Dentix Pro",
"dose_calculator": "Dose Calculator",
"dose_calculator_subtitle": "Smart pediatric & adult dosing",
"manage_drugs": "Manage Drugs",
"age_label": "Age (years)",
"age_placeholder": "Enter patient age",
"age_hint": "Pediatric: 0–11 years | Adult: 12+ years",
"weight_label": "Weight (kg)",
"weight_placeholder": "Enter weight in kg",
"estimate_weight": "Estimate Weight",
"select_drug_label": "Select Drug",
"loading_drugs": "Loading drugs...",
"calculate_dose": "Calculate Dose",
"dosing_recommendation": "Dosing Recommendation",

"drugs_manager_title": "Drugs Manager | Dentix Pro",
"drugs_manager": "Drugs Manager",
"drugs_manager_subtitle": "Manage your clinic drug database",
"add_new_drug": "Add New Drug",
"drug_name_label": "Drug Name",
"drug_name_placeholder": "e.g., Hibiotic 600mg susp",
"category_label": "Category",
"select_category": "Select Category",
"dosage_form_label": "Dosage Form",
"select_form": "Select Form",
"form_suspension": "Suspension",
"form_tablet": "Tablet",
"form_capsule": "Capsule",
"form_syrup": "Syrup",
"form_drops": "Drops",
"form_injection": "Injection",
"form_suppository": "Suppository",
"form_inhaler": "Inhaler",
"concentration_label": "Concentration",
"concentration_placeholder": "Concentration per 5 ml",
"min_age_label": "Min Age",
"min_age_placeholder": "0",
"max_age_label": "Max Age",
"max_age_placeholder": "120",
"mg_per_kg_label": "mg/kg/day",
"mg_per_kg_placeholder": "e.g., 15",
"frequency_label": "Frequency / Day",
"frequency_placeholder": "e.g., 3",
"max_dose_label": "Max Daily Dose (mg)",
"max_dose_placeholder": "e.g., 2000",
"duration_label": "Duration (Days)",
"duration_placeholder": "e.g., 7",
"clinical_notes_label": "Clinical Notes",
"clinical_notes_placeholder": "Liver disease, kidney disease, drug interactions, pregnancy warnings...",
"reset": "Reset",
"save_drug": "Save Drug",
"drug_database": "Drug Database",
"drugs_count": "0 drugs",
"search_drugs_placeholder": "Search drugs by name...",
"loading_drugs": "Loading drugs...",

"380": "Remaining",
"381": "years",
"382": "Open File",

// ========== EN ==========
"383": "Unspecified",
"384": "No appointments found",
"385": "No appointments match this filter",
"386": "Unknown",
"387": "No Phone",
"388": "✓ Coming",
"389": "📌 Present",
"390": "⏰ Late",
"391": "🔄 In Progress",
"392": "Cancelled Visit",
"393": "Continuous Visit",
"394": "Finished Visit",
"395": "Now Visit",
"396": "Missed Visit",
"397": "Pending Confirmation",
"398": "Upcoming Visit",
"399": "From:",
"400": "To:",
"401": "No inventory items",
"402": "No inventory items have been added yet",
"403": "Latest",
"404": "No purchase records",
"405": "Low Stock",
"406": "In Stock",
"407": "Current",
"408": "units",
"409": "Purchased",
"410": "(this month)",
"411": "total",
"412": "Purchase Prices",
"413": "Total Cost",
"414": "Quantity",
"415": "Services",
"416": "Delete",
"417": "Low Alert",
"418": "older",
"419": "EGP",
"420": "No works found",
"421": "Add a new work from above",
"422": "No date",
"423": "work",
"424": "works",
"425": "Works",
"426": "Received",
"427": "Pending",
"428": "Overdue",
"429": "Lab Cost",
"430": "From Patients",
"431": "Net Profit",
"432": "Received",
"433": "Delivery date passed",
"434": "Pending",
"435": "Delivery:",
"436": "Units:",
"437": "Patient",
"438": "Lab",
"439": "Profit",
"440": "Received",
"441": "Overdue",
"442": "Pending",
// ========== EN ==========
"443": "No upcoming works",
"444": "All works are currently in labs",
"445": "Soon",
"446": "Overdue",
"447": "Today",
"448": "Tomorrow",
"449": "No appointment requests",
"450": "Not specified",
"451": "Pending",
"452": "Appointment Time",
"453": "Mark as Contacted",
"454": "New Notification",
"455": "Now",
"456": "Close",
"460": "Visit Requires Attention",
"461": "The scheduled visit for {name} has ended and is still waiting.",
"462": "Visit Time Started",
"463": "The scheduled visit for {name} has started and no visit result has been recorded yet.",
"465": "Lab Delivery Due Today",
"466": "{workName} for {patientName} is due today and has not been received.",
"467": "Lab Work",
"468": "Low Stock",
"469": "{itemName} is low in stock. Current quantity: {quantity}",
"470": "Insurance Management",
"471": "Add Insurance",
"472": "Insurance Company Name",
"473": "e.g. Nile Health Insurance",
"474": "Discount Percentage %",
"475": "Add Insurance",
"476": "Insurance List",
"477": "Edit Insurance Company",
"478": "Insurance Company Name",
"479": "Discount Percentage %",
"480": "Save",
"481": "Cancel",
"482": "Insurance Services",
"483": "Close",
"484": "Add Payment from Insurance Company",
"485": "Payment Amount",
"486": "Enter payment amount",
"487": "Payment Date",
"488": "Payment Method",
"489": "Cash",
"490": "Bank Transfer",
"491": "Card",
"492": "Cheque",
"493": "Other",
"494": "Notes",
"495": "Optional notes",
"496": "Cancel",
"497": "Add Payment",
"498": "Insurance Payments",
},


ar: {

    "control_panel":
        "لوحة التحكم",

    "pricing_helper":
        "مساعدك في التسعير",

    "service_name_placeholder":
        "اسم الخدمة",

    "service_price_placeholder":
        "السعر",

    "work_name_placeholder":
        "مثال: Crown",

    "work_type_placeholder":
        "مثال: Zirconia",

    "lab_cost_placeholder":
        "سعر المعمل",

    "patient_amount_placeholder":
        "سعر المريض",

    "department_name_placeholder":
        "مثال: العيادة الرئيسية",

    "edit_service":
        "تعديل الخدمة",

    "save":
        "حفظ",

    "cancel":
        "إلغاء",

    "edit_dental_work":
        "تعديل التركيبة",

    "dashboard.title":
        "لوحة تحكم العيادة",

    "dashboard.subtitle":
        "إدارة العيادة والمرضى والمواعيد والخدمات الرقمية من مكان واحد.",

    "new_visit":
        "حجز زيارة جديدة",

    "patients":
        "المرضى",

    "doctors":
        "الأطباء",

    "settings":
        "الإعدادات",

   

    "welcome":
        "مرحبًا بكم في",

    "1":
        "النظام يعمل بكفاءة",

    "2":
        "التنبيهات",

    "3":
        "تمييز الكل كمقروء",

    "4":
        "لا توجد تنبيهات حاليًا",

    "5":
        "صفحة العيادة",

    "6":
        "تسجيل الخروج",

    "7":
        "طلبات حجز المواعيد",

    "8":
        "تسليمات المعمل القادمة",

    "9":
        "الزيارات القادمة",

    "10":
        "أمس",

    "11":
        "اليوم",

    "12":
        "غدًا",

    "13":
        "خلال 3 أيام",

    "14":
        "خلال أسبوع",

    "15":
        "جميع الزيارات القادمة",

    "16":
        "جميع الأقسام",

    "17":
        "فلترة حسب حالة الزيارة",

    "18":
        "فلترة المواعيد حسب العلامة",

    "19":
        "جميع الزيارات",

    "20":
        "حجز زيارة جديدة",

    "21":
        "البحث عن زيارات يوم محدد",

    "22":
        "عرض زيارات يوم محدد",

    "23":
        "شاشة الانتظار",

    "24":
        "عرض شاشة انتظار المرضى",

    "25":
        "قائمة الانتظار",

    "26":
        "المرضى في قائمة الانتظار",

    "27":
        "التقويم الأسبوعي",

    "28":
        "عرض زيارات الأسبوع في أعمدة",

    "29":
        "زيارات يوم محدد",

    "30":
        "عرض وإدارة زيارات يوم محدد",

    "31":
        "تطبيق",

    "32":
        "اختر التاريخ",

    "33":
        "اختر يومًا من التقويم لعرض الزيارات المسجلة",

    "34":
        "حجز زيارة جديدة",

    "35":
        "إضافة زيارة جديدة للمريض",

    "36":
        "معلومات المريض",

    "37":
        "بيانات الحجز الأساسية",

    "38":
        "اسم المريض",

    "39":
        "رقم الهاتف",

    "40":
        "العمر",

    "41":
        "تاريخ الزيارة",

    "42":
        "اختر القسم وتاريخ الزيارة",

    "43":
        "القسم",

    "44":
        "جاري تحميل الأقسام .....",

    "45":
        "تبدأ الزيارة في",

    "46":
        "تنتهي الزيارة في",

    "47":
        "مدة الزيارة",

    "48":
        "30 دقيقة",

    "49":
        "15 دقيقة",

    "50":
        "ساعة واحدة",

    "51":
        "ساعتان",

    "52":
        "3 ساعات",

    "53":
        "4 ساعات",

    "54":
        "يمكن حجز الزيارة للمرضى الذين ليس لديهم ملف، وسيظهر خيار إنشاء ملف في لوحة الزيارات.",

    "55":
        "إلغاء",

    "56":
        "حجز الزيارة",

    "57":
        "التقويم الأسبوعي",

    "58":
        "مواعيد العيادة - أسبوعيًا",

    "59":
        "السابق",

    "60":
        "التالي",

    "61":
        "قائمة الانتظار",

    "62":
        "المرضى الذين ينتظرون زيارة",

    "63":
        "المرضى المنتظرون",

    "64":
        "إضافة مريض إلى قائمة الانتظار",

    "65":
        "جاري تحميل قائمة الانتظار .....",

    "66":
        "إضافة مريض إلى قائمة الانتظار",

    "67":
        "ابحث عن مريض أو أضف مريضًا جديدًا",

    "68":
        "اسم المريض",

    "69":
        "يمكنك اختيار مريض موجود أو إضافة مريض جديد",

    "70":
        "العمر",

    "71":
        "رقم الهاتف",

    "72":
        "حالة الانتظار",

    "73":
        "عادي",

    "74":
        "غير طارئ",

    "75":
        "طارئ",

    "76":
        "الحالة تحتاج إلى أولوية",

    "77":
        "إلغاء",

    "78":
        "إضافة إلى قائمة الانتظار",

    "79":
        "تأكيد الموعد",

    "80":
        "إلغاء الموعد",

    "81":
        "ملف المريض",

    "82":
        "إنشاء ملف",

    "83":
        "إضافة مريض",

    "84":
        "ذكر",

    "85":
        "أنثى",

    "86":
        "تاريخ الميلاد",

    "87":
        "حفظ المريض",

    "88":
        "ملفات المرضى",

    "89":
        "إدارة ملفات المرضى والوصول إلى بياناتهم بسهولة",

    "90":
        "إجمالي المرضى",

    "91":
        "إضافة مريض",

    "92":
        "بحث",

    "93":
        "ملفات المرضى",

    "94":
        "الاسم",

    "95":
        "العمر",

    "96":
        "الإجراء",

    "97":
        "الرئيسية",

    "98":
        "الزيارات",

    "99":
        "إضافة مريض",

    "100":
        "ملفات المرضى",

    "101":
        "المزيد",

    "102":
        "المزيد",

    "103":
        "إدارة النظام",

    "104":
        "الفواتير",

    "105":
        "إدارة فواتير العيادة",

    "106":
        "المخزن",

    "107":
        "مخزن العيادة والمشتريات",

    "108":
        "المعامل",

    "109":
        "إدارة المعامل والتركيبات",

    "110":
        "الأطباء",

    "111":
        "إدارة الأطباء",

    "112":
        "المطبوعات",

    "113":
        "طباعة الوصفات الطبية والموافقات والتعليمات",

    "114":
        "الأدوية والجرعات",

    "115":
        "إدارة الأدوية وحساب الجرعات",

    "116":
        "التقارير",

    "117":
        "تقارير العيادة بالتفصيل",

    "118":
        "الأسعار والأقسام",

    "119":
        "تسعير خدمات العيادة والتركيبات وإضافة الأقسام",

    "120":
        "إضافة فاتورة جديدة",

    "121":
        "إضافة فاتورة جديدة",

    "122":
        "فاتورة جديدة",

    "123":
        "بيانات الفاتورة",

    "124":
        "إضافة بيانات الفاتورة والمبلغ",

    "125":
        "المستفيد",

    "126":
        "السبب",

    "127":
        "المبلغ المدفوع",

    "128":
        "ستتم إضافة الفاتورة كمصروف مالي",

    "129":
        "حفظ الفاتورة",

    "130":
        "حفظ التغييرات",

    "131":
        "إلغاء",

    "132":
        "المبلغ المدفوع",

    "133":
        "السبب",

    "134":
        "المستفيد",

    "135":
        "إعدادات صفحة العيادة",

    "136":
        "ستظهر هذه المعلومات لزوار صفحة العيادة العامة",

    "137":
        "غير منشورة",

    "138":
        "حالة الصفحة",

    "139":
        "أيام العمل",

    "140":
        "الصور المنشورة",

    "141":
        "معلومات العيادة",

    "142":
        "المعلومات الأساسية للعيادة التي تظهر في صفحة العيادة",

    "143":
        "اسم العيادة",

    "144":
        "وصف العيادة",

    "145":
        "شعار العيادة",

    "146":
        "اضغط لرفع شعار العيادة",

    "147":
        "PNG بخلفية شفافة",

    "148":
        "رقم الهاتف",

    "149":
        "واتساب",

    "150":
        "العنوان",

    "151":
        "تحديد الموقع الحالي تلقائيًا",

    "152":
        "تمت إضافة الموقع بنجاح",

    "153":
        "روابط التواصل الاجتماعي",

    "154":
        "فيسبوك",

    "155":
        "إنستجرام",

    "156":
        "الموقع الإلكتروني",

    "157":
        "صور العيادة",

    "158":
        "اضغط لاختيار صور العيادة",

    "159":
        "(Ctrl + Click) يمكنك اختيار عدة صور",

    "160":
        "أيام وساعات العمل",

    "161":
        "حفظ معلومات العيادة",

    "162":
        "رابط صفحة العيادة",

    "163":
        "شارك هذا الرابط مع مرضاك",

    "164":
        "معاينة صفحة العيادة",

    "165":
        "هكذا تظهر صفحة العيادة للزوار",

    "166":
        "فتح في نافذة جديدة",

    "167":
        "إغلاق",

    "168":
        "الموردون",

    "169":
        "إدارة الموردين",

    "170":
        "إضافة فاتورة",

    "171":
        "إضافة فاتورة مشتريات جديدة",

    "172":
        "سجل المشتريات",

    "173":
        "سجل مدفوعات المشتريات",

    "174":
        "النواقص",

    "175":
        "خدمات العيادة المسجلة",

    "176":
        "الخدمات المسجلة تظهر في ملف المريض عند اضافة خدمة",

    "177":
        "التركيبات المسجلة تظهر في ملف المعمل عند اضافة تركيبة",

    "178":
        "العيادات المسجلة تظهر عند حجز موعد",

    "179":
        "إدارة الخدمات",

    "180":
        "إضافة خدمة",

    "181":
        "حفظ الخدمة",

    "182":
        "قائمة الخدمات",

    "183":
        "إدارة التركيبات",

    "184":
        "إضافة تركيبة",

    "185":
        "اسم التركيبة",

    "186":
        "نوع التركيبة",

    "187":
        "سعر المعمل",

    "188":
        "سعر المريض",

    "189":
        "إضافة تركيبة",

    "190":
        "قائمة التركيبات",

    "191":
        "إدارة العيادات",

    "192":
        "إضافة عيادة",

    "193":
        "اسم العيادة",

    "194":
        "إضافة عيادة",

    "195":
        "قائمة العيادات",

    "196":
        "العناصر الناقصة",

    "197":
        "انتقل لأسفل لعرض العناصر منخفضة المخزون",

    "198":
        "التقارير",

    "199":
        "تقارير الزيارات",

    "200":
        "إحصائيات اليوم الحالي",

    "201":
        "إحصائيات الشهر الحالي",

    "202":
        "لوحة المالية الرئيسية",

    "203":
        "مقارنة الأشهر",

    "204":
        "مقارنة الأقسام",

    "205":
        "إحصائيات الأطباء",

    "206":
        "إحصائيات الخدمات",

    "207":
        "إحصائيات العمر والجنس",


"208": "إدارة الفواتير",
"209": "اسم الجهة أو الشخص المستفيد",
"210": "مثال: شراء مستلزمات أو صيانة",
"211": "البحث بالمستفيد أو التاريخ...",
"212": "تفاصيل الفاتورة",
"213": "إغلاق",
"214": "إعدادات صفحة العيادة | Dentix Pro",
"215": "مثال: عيادة الابتسامة المتخصصة",
"216": "اكتب نبذة مختصرة عن العيادة والخدمات المقدمة...",
"217": "01000000000",
"218": "عنوان العيادة الكامل",
"219": "https://facebook.com/...",
"220": "https://instagram.com/...",
"221": "https://...",
"222": "نسخ",
"224": "(Ctrl + Click) يمكنك اختيار عدة صور",
"patients_title":
        "المرضى",

    "patient_name_placeholder":
        "👤 اسم المريض",

    "phone_placeholder":
        "📞 رقم الهاتف",

    "address_placeholder":
        "📍 العنوان",

    "birth_date_placeholder":
        "تاريخ الميلاد",

    "medical_history_placeholder":
        "🩺 التاريخ المرضي",

    "dental_history_placeholder":
        "🦷 التاريخ السني",

    "blood_pressure":
        "ضغط الدم",

    "diabetes":
        "السكري",

    "asthma":
        "الربو",

    "heart_disease":
        "أمراض القلب",

    "allergies":
        "الحساسية",

    "kidney_disease":
        "أمراض الكلى",

    "liver_disease":
        "أمراض الكبد",

    "thyroid":
        "الغدة الدرقية",

    "blood_thinners":
        "سيولة الدم",

    "epilepsy":
        "الصرع",

    "pregnancy":
        "الحمل",

    "no_medical_history":
        "لا يوجد تاريخ مرضي",
        "225": "لوحة تحكم العيادة",
"226": "ابحث عن اسم المريض أو أدخل اسمًا جديدًا",
"227": "مثال: 01012345678",
"228": "مثال: 25",
"229": "اكتب اسم المريض...",
"230": "العمر",
"231": "رقم الهاتف",
"232": "زيارة جديدة",
"233": "إغلاق",
"234": "زيارة قادمة",
"235": "في انتظار التأكيد",
"236": "زيارة الآن",
"237": "زيارة منتهية",
"238": "زيارة فائتة",
"241": "ملفات المرضى",
"242": "ابحث عن المرضى بالاسم أو الهاتف أو العنوان...",
"243": "المخزن | Dentix Pro",
"244": "المخزن",
"245": "إدارة مخزون العيادة واستهلاك المواد",
"246": "إجمالي العناصر",
"247": "تكلفة المشتريات هذا الشهر",
"248": "البحث في المخزون...",
"249": "لا توجد عناصر ناقصة",
"250": "الفواتير",
"251": "إجمالي المشتريات",
"252": "المدفوع",
"253": "المتبقي",
"254": "جميع الموردين",
"255": "تحديث",
"256": "الفاتورة",
"257": "المورد",
"258": "التاريخ",
"259": "غير مدفوع",
"260": "المجموع الفرعي",
"261": "الخصم",
"262": "الإجمالي",
"263": "المدفوع",
"264": "المتبقي",
"265": "إضافة دفعة",
"266": "تعديل الخصم",
"267": "العناصر المشتراة",
"268": "العناصر المدرجة في هذه الفاتورة",
"269": "سجل المدفوعات",
"270": "جميع المدفوعات لهذه الفاتورة",
"271": "ملاحظات",
"272": "لا توجد ملاحظات",
"273": "تسجيل دفعة جديدة لهذه الفاتورة",
"274": "مبلغ الدفع",
"275": "أدخل مبلغ الدفع",
"276": "تاريخ الدفع",
"277": "ملاحظات الدفع الاختيارية...",
"278": "إلغاء",
"279": "حفظ الدفع",
"280": "تحديث الخصم لهذه الفاتورة",
"281": "الإجمالي الحالي",
"282": "أدخل الخصم",
"283": "سيؤدي تغيير الخصم إلى إعادة حساب إجمالي الفاتورة والمبلغ المتبقي تلقائيًا.",
"284": "حفظ الخصم",
"285": "فاتورة مشتريات",
"286": "اختر المورد",
"287": "رقم الفاتورة",
"288": "مثال: INV-001",
"289": "تاريخ الفاتورة",
"290": "عناصر الفاتورة",
"291": "أضف جميع المواد المشتراة لهذه الفاتورة",
"292": "إضافة عنصر",
"293": "المجموع الفرعي",
"294": "الخصم",
"295": "جنيه",
"296": "%",
"297": "الإجمالي",
"298": "الدفعة الأولية",
"299": "دفعة أولى اختيارية",
"300": "أدخل الدفعة الأولية",
"301": "المتبقي",
"302": "ملاحظات اختيارية...",
"303": "حفظ الفاتورة",
"304": "إدارة الموردين والمشتريات",
"305": "اسم المورد",
"306": "البحث في الموردين...",
"307": "إضافة مورد",
"308": "اسم المورد",
"309": "مثال: Dental Supply Co.",
"310": "الهاتف",
"311": "01xxxxxxxxx",
"312": "البريد الإلكتروني",
"313": "supplier@example.com",
"314": "العنوان",
"315": "عنوان المورد",
"316": "ملاحظات إضافية...",
"317": "حفظ المورد",
"318": "جاري تحميل الموردين...",
"319": "استهلاك الخدمات",
"320": "الخدمات التي تستخدم هذا العنصر",
"321": "جاري تحميل الخدمات...",
"322": "حفظ الاستهلاك",
"323": "تعديل الكمية",
"324": "الكمية الحالية",
"325": "أدخل الكمية",
"326": "سيؤدي هذا إلى تغيير المخزون الحالي فقط. سجل المشتريات والأسعار سيظل كما هو.",
"327": "حفظ الكمية",
"328": "ملف الطبيب",


"331": "نشط",
"332": "تعديل الملف",
"333": "الهاتف",
"334": "العمر",
"335": "العنوان",
"336": "تاريخ التسجيل",
"337": "حساب الطبيب",
"338": "إزالة هذا الطبيب نهائيًا من العيادة.",
"339": "حذف الطبيب",
"340": "ملف الطبيب",
"341": "تعديل بيانات الطبيب",
"342": "تحديث البيانات الشخصية والمهنية للطبيب.",
"343": "اسم الطبيب",
"344": "أدخل اسم الطبيب",
"345": "التخصص",
"346": "أدخل التخصص",
"347": "تاريخ الميلاد",
"348": "الهاتف",
"349": "رقم الهاتف",
"350": "العنوان",
"351": "أدخل العنوان",
"352": "إلغاء",
"353": "حفظ التغييرات",
"354": "لوحة تحكم الطبيب",
"355": "الخدمات",
"356": "قيمة الخدمات",
"357": "ربح الطبيب",
"358": "خدمات الطبيب",
"359": "جميع الخدمات المقدمة للمرضى والمعينة لهذا الطبيب تظهر هنا تلقائيًا.",
"360": "دفعات الطبيب",
"361": "تسجيل ومتابعة المبالغ المدفوعة للطبيب",
"362": "إضافة دفعة",
"363": "إجمالي مستحق الطبيب",
"364": "إجمالي المدفوع للطبيب",
"365": "المتبقي للطبيب",
"366": "جاري تحميل الدفعات...",
"367": "طباعة تقرير الطبيب",
"368": "إضافة دفعة للطبيب",
"369": "تسجيل دفعة جديدة",
"370": "المبلغ",
"371": "تاريخ الدفع",
"372": "ملاحظات",
"373": "ملاحظات الدفعة...",
"374": "حفظ الدفع",
 "reports_title":
        "التقارير",

    "visits_statistics":
        "إحصائيات الزيارات",

    "visits_statistics_desc":
        "تحليل أداء الزيارات خلال الفترة المحددة",

    "filter_period":
        "تحديد فترة الإحصائيات",

    "from_date":
        "من",

    "to_date":
        "إلى",

    "show_statistics":
        "عرض الإحصائيات",

    "visits_filter_hint":
        "اختر تاريخ البداية والنهاية لعرض إحصائيات الزيارات خلال الفترة المحددة.",

    "visits_period_desc":
        "نسبة الزيارات المكتملة وغير المكتملة خلال الفترة المحددة",

    "visit_status":
        "Visit Status",

    "visit_status_ar":
        "حالة الزيارات",

    "completed_visits":
        "الزيارات المكتملة",

    "waiting_visits":
        "الزيارات قيد الانتظار",

    "incomplete_visits":
        "الزيارات غير المكتملة",

    "total_visits":
        "إجمالي الزيارات",

    "total_visits_label":
        "إجمالي الزيارات",

    "today_statistics_title":
        "إحصائيات اليوم",

    "daily_financial_summary":
        "ملخص مالي يومي",

    "today_new_patients":
        "Today's New Patients",

    "today_new_patients_ar":
        "المرضى الجدد المسجلين اليوم",

    "today_services":
        "Today's Services",

    "today_services_count":
        "عدد الخدمات اليوم",

    "hover_services_hint":
        "مرر المؤشر لعرض تفاصيل الخدمات",

    "today_services_breakdown":
        "Today's Services Breakdown",

    "today_services_breakdown_ar":
        "تفاصيل خدمات اليوم",

    "completed":
        "مكتملة",

    "incomplete":
        "غير مكتملة",

    "total_services":
        "إجمالي الخدمات",

    "completion_rate":
        "نسبة الإنجاز",

    "today_total":
        "Today Total",

    "today_total_ar":
        "اجمالي المبالغ المستحقة",

    "today_paid":
        "Today Paid",

    "today_paid_ar":
        "اجمالي المبالغ المدفوعة",

    "today_remaining":
        "Today Remaining",

    "today_remaining_ar":
        "اجمالي المبالغ المتبقية اليوم",

    "remaining_hint":
        "اضغط أو مرر للمؤشر لتتبع المبالغ المتبقية",

    "remaining_breakdown":
        "Remaining Breakdown",

    "remaining_breakdown_ar":
        "تفاصيل المبالغ المتبقية اليوم",

    "patients_label":
        "المرضى",

    "due_label":
        "المستحق",

    "paid_label":
        "المدفوع",

    "remaining_label":
        "المتبقي",

    "remaining_sources":
        "مصادر المبالغ المتبقية",

    "loading_details":
        "جاري تحميل التفاصيل...",

    "view_all_details":
        "عرض كل التفاصيل",

    "today_profit":
        "Today Profit",

    "today_profit_ar":
        "صافي الربح اليوم",

    "hover_profit_hint":
        "مرر المؤشر لتتبع تفاصيل الربح",

    "today_profit_breakdown":
        "Today's Profit Breakdown",

    "today_profit_breakdown_ar":
        "تفاصيل صافي الربح اليوم",

    "paid":
        "المدفوع",

    "lab_costs":
        "تكاليف المعمل",

    "net_profit":
        "صافي الربح",

    "paid_eq":
        "المدفوع",

    "lab_costs_eq":
        "تكاليف المعمل",

    "net_profit_eq":
        "صافي الربح",

    "month_statistics_title":
        "إحصائيات الشهر",

    "monthly_financial_summary":
        "ملخص مالي شهري",

    "monthly_patients":
        "Monthly Patients",

    "monthly_patients_ar":
        "المرضى المسجلين هذا الشهر",

    "monthly_services":
        "Monthly Services",

    "monthly_services_count":
        "عدد الخدمات هذا الشهر",

    "hover_monthly_hint":
        "مرر المؤشر لعرض تفاصيل الخدمات",

    "monthly_services_breakdown":
        "Monthly Services Breakdown",

    "monthly_services_breakdown_ar":
        "تفاصيل خدمات الشهر",

    "monthly_total":
        "Monthly Total",

    "monthly_total_ar":
        "اجمالي المبالغ المستحقة هذا الشهر",

    "monthly_paid":
        "Monthly Paid",

    "monthly_paid_ar":
        "اجمالي المبالغ المدفوعة هذا الشهر",

    "monthly_remaining":
        "Monthly Remaining",

    "monthly_remaining_ar":
        "اجمالي المبالغ المتبقية هذا الشهر",

    "remaining_month_hint":
        "اضغط أو مرر للمؤشر لتتبع المبالغ المتبقية هذا الشهر",

    "monthly_breakdown":
        "Monthly Breakdown",

    "monthly_breakdown_ar":
        "تفاصيل المبالغ المتبقية هذا الشهر",

    "monthly_profit":
        "Monthly Profit",

    "monthly_profit_ar":
        "صافي الربح هذا الشهر",

    "monthly_profit_breakdown":
        "Monthly Profit Breakdown",

    "monthly_profit_breakdown_ar":
        "تفاصيل صافي الربح هذا الشهر",

    "bills":
        "الفواتير",

    "inventory":
        "المخزن",

    "lab_bills_inventory_eq":
        "المعمل + الفواتير + المخزن",

    "clinic_financial_dashboard":
        "لوحة المالية العامة",

    "based_on_services":
        "بناءً على خدمات المرضى",

    "total_amount":
        "Total Amount",

    "total_amount_ar":
        "اجمالي المبالغ المستحقة",

    "paid_amount":
        "Paid Amount",

    "paid_amount_ar":
        "اجمالي المبالغ المدفوعة",

    "remaining_amount":
        "Remaining Amount",

    "remaining_amount_ar":
        "إجمالي المبالغ المتبقية",

    "hover_remaining_hint":
        "مرر المؤشر لتتبع المبالغ المتبقية",

    "total_remaining_breakdown":
        "Total Remaining Breakdown",

    "total_remaining_breakdown_ar":
        "تفاصيل جميع المبالغ المتبقية",

    "invoices":
        "الفواتير",

    "net_profit_total_ar":
        "صافي الربح الكلي",

    "net_profit_breakdown":
        "Net Profit Breakdown",

    "net_profit_breakdown_ar":
        "تفاصيل صافي الربح الكلي",

    "lab_eq":
        "المعمل",

    "bills_eq":
        "الفواتير",

    "inventory_eq":
        "المخزن",

    "net_profit_title":
        "صافي الربح",

    "net_profit_formula":
        "الربح = المدفوع - التكاليف المحددة",

    "profit_filter":
        "Profit Filter",

    "from":
        "From",

    "to":
        "To",

    "calculate_profit":
        "Calculate Profit",

    "lab_costs_toggle":
        "Lab Costs",

    "lab_costs_toggle_ar":
        "تكاليف المعامل",

    "bills_toggle":
        "Bills",

    "bills_toggle_ar":
        "الفواتير والمصروفات",

    "inventory_toggle":
        "Inventory",

    "inventory_toggle_ar":
        "مشتريات المخزن",

    "doctor_payments_toggle":
        "Doctor Payments",

    "doctor_payments_toggle_ar":
        "مدفوعات الأطباء",

    "statistics_dashboard":
        "Statistics Dashboard",

    "statistics_dashboard_desc":
        "تحليل أداء العيادة خلال فترة زمنية محددة",

    "current_month":
        "الشهر الحالي",

    "from_label":
        "من",

    "to_label":
        "إلى",

    "apply_period":
        "تطبيق الفترة",

    "custom_total_due":
        "إجمالي المستحق",

    "custom_paid":
        "المدفوع",

    "custom_remaining":
        "المتبقي",

    "custom_remaining_breakdown":
        "Custom Remaining Breakdown",

    "custom_remaining_breakdown_ar":
        "تفاصيل المبالغ المتبقية للفترة المحددة",

    "services_label":
        "الخدمات",

    "due_after_discount":
        "المستحق بعد الخصم",

    "all_payments":
        "كل المدفوعات",

    "remaining_eq":
        "المتبقي",

    "custom_services_breakdown":
        "Custom Services Breakdown",

    "custom_services_breakdown_ar":
        "تفاصيل الخدمات للفترة المحددة",

    "custom_net_profit":
        "صافي الربح",

    "custom_profit_breakdown":
        "Custom Profit Breakdown",

    "custom_profit_breakdown_ar":
        "تفاصيل صافي الربح للفترة المحددة",

    "lab_label":
        "المعمل",

    "bills_label":
        "الفواتير",

    "inventory_label":
        "المخزن",

    "net_profit_label":
        "صافي الربح",

    "from_month":
        "من شهر",

    "to_month":
        "إلى شهر",

    "show_comparison":
        "عرض المقارنة",

    "last_6_months":
        "آخر 6 شهور",

    "departments_performance":
        "أداء العيادات",

    "doctors_financial_report":
        "Doctors Financial Report",

    "doctors_report_desc":
        "متابعة خدمات الأطباء ومستحقاتهم ومدفوعاتهم",

    "financial_report":
        "تقرير مالي",

    "report_settings":
        "إعدادات التقرير",

    "report_settings_desc":
        "اختر الفترة والطبيب المطلوب",

    "from_date_label":
        "من التاريخ",

    "to_date_label":
        "إلى التاريخ",

    "doctor_label":
        "الطبيب",

    "all_doctors":
        "جميع الأطباء",

    "show_report":
        "عرض التقرير",

    "report_summary":
        "ملخص التقرير",

    "quick_overview":
        "نظرة سريعة على الأداء المالي",

    "doctors_badge":
        "أطباء",

    "doctors_count_label":
        "عدد الأطباء",

    "services_badge":
        "خدمات",

    "services_done":
        "الخدمات المنفذة",

    "patients_badge":
        "مرضى",

    "patients_count":
        "المرضى",

    "net_badge":
        "صافي",

    "net_after_discount":
        "المستحق بعد الخصم",

    "collection_badge":
        "تحصيل",

    "patient_payments":
        "مدفوعات المرضى",

    "remaining_badge":
        "متبقي",

    "patient_remaining":
        "المتبقي على المرضى",

    "due_badge":
        "مستحق",

    "doctor_fees":
        "مستحقات الأطباء",

    "paid_badge":
        "مدفوع",

    "doctor_payments":
        "مدفوعات الأطباء",

    "balance_badge":
        "رصيد",

    "doctor_remaining":
        "المتبقي للأطباء",

    "doctor_money_movement":
        "حركة مستحقات الأطباء",

    "doctor_money_comparison":
        "مقارنة المستحق والمدفوع والمتبقي",

    "due_amount":
        "المستحق",

    "paid_amount_label":
        "المدفوع",

    "remaining_amount_label":
        "المتبقي",

    "doctors_comparison":
        "مقارنة الأطباء",

    "doctors_comparison_desc":
        "صافي المستحق لكل طبيب",

    "doctors_details":
        "تفاصيل الأطباء",

    "doctors_details_desc":
        "المستحقات والمدفوعات والأرصدة",

    "by_selected_period":
        "حسب الفترة المحددة",

    "doctor_col":
        "الطبيب",

    "services_col":
        "الخدمات",

    "patients_col":
        "المرضى",

    "net_after_discount_col":
        "المستحق بعد الخصم",

    "patient_payments_col":
        "مدفوعات المرضى",

    "patient_remaining_col":
        "المتبقي على المرضى",

    "doctor_fees_col":
        "مستحق الطبيب",

    "doctor_payments_col":
        "مدفوعات الطبيب",

    "doctor_remaining_col":
        "المتبقي للطبيب",

    "swipe_table":
        "اسحب الجدول أفقيًا لعرض جميع التفاصيل",

    "services_analytics":
        "Services Analytics",

    "services_analytics_desc":
        "مقارنة بين جميع الخدمات المسجلة",

    "from_date_analytics":
        "من تاريخ",

    "to_date_analytics":
        "إلى تاريخ",

    "filter_btn":
        "فلترة",

    "top_service":
        "أكثر خدمة تكراراً",

    "services_count":
        "عدد الخدمات المسجلة",

    "service_col":
        "الخدمة",

    "count_col":
        "عدد المرات",

    "total_due_col":
        "إجمالي المستحق",

    "total_paid_col":
        "إجمالي المدفوع",

    "total_remaining_col":
        "إجمالي المتبقي",

    "patient_age_gender":
        "Patient Age & Gender Analytics",

    "from_small":
        "من",

    "to_small":
        "إلى",

    "age_distribution":
        "Age Distribution",

    "age_distribution_desc":
        "توزيع المرضى حسب الفئة العمرية",

    "category_col":
        "الفئة",

    "age_range_col":
        "الفئة العمرية",

    "patients_count_col":
        "المرضى",

    "patient_distribution":
        "توزيع المرضى",

    "gender_stats":
        "إحصائية الذكور والإناث",

    "total_patients_label":
        "إجمالي المرضى",

    "remaining_details_title":
        "Remaining Details",

    "remaining_details_subtitle":
        "تفاصيل المبالغ المتبقية",

        "375": "الأطباء",
"376": "إدارة الأطباء",
"377": "إضافة طبيب",
"378": "حفظ الطبيب",
"379": "قائمة الأطباء",
    "labs_title":
        "إدارة المعامل",

    "labs_management":
        "إدارة المعامل",

    "add_new_lab":
        "إضافة معمل جديد",

    "lab_name_placeholder":
        "اسم المعمل",

    "specialization_placeholder":
        "التخصص",

    "address_placeholder":
        "العنوان",

    "phone_placeholder":
        "رقم الهاتف",

    "save_lab":
        "حفظ المعمل",

    "labs_list":
        "قائمة المعامل",
        
  "lab_file_title":
        "ملف المعمل",

    "lab_file":
        "ملف المعمل",

    "dental_laboratory":
        "معمل أسنان",

    "specialization_label":
        "التخصص",

    "address_label":
        "العنوان",

    "phone_label":
        "الهاتف",

    "edit":
        "تعديل",

    "edit_lab_info":
        "تعديل بيانات المعمل",

    "save":
        "حفظ",

    "cancel":
        "إلغاء",

    "add_new_prosthesis":
        "Add New Prosthesis",

    "add_new_prosthesis_ar":
        "إضافة تركيبة جديدة",

    "new_prosthesis":
        "تركيبة جديدة",

    "new_prosthesis_desc":
        "أدخل بيانات التركيبة الجديدة",

    "case_info":
        "بيانات الحالة",

    "optional":
        "(اختياري)",

    "select_doctor":
        "اختر الطبيب (اختياري)",

    "patient_label":
        "المريض",

    "patient_name_placeholder":
        "اسم المريض",

    "prosthesis_info":
        "بيانات التركيبة",

    "work_name_label":
        "اسم التركيبة",

    "select_work":
        "اختر التركيبة",

    "work_type_label":
        "نوع التركيبة",

    "select_type":
        "اختر النوع",

    "financial_info":
        "البيانات المالية",

    "lab_cost_label":
        "حساب المعمل",

    "egp":
        "ج.م",

    "patient_cost_label":
        "التكلفة على المريض",

    "quantity_label":
        "عدد الوحدات",

    "apply_price":
        "تطبيق السعر",

  "quantity_help":
        "اضغط تطبيق السعر لنقل الإجمالي إلى حقول الأسعار",


    "lab_cost_total":
        "تكلفة المعمل الإجمالية",

    "patient_amount_total":
        "إجمالي المريض",

    "related_teeth":
        "الأسنان المرتبطة",

    "select_tooth":
        "اختر السن",

    "select_teeth":
        "اختيار الأسنان",

    "click_tooth_chart":
        "اضغط لعرض مخطط الأسنان",

    "selected_tooth":
        "السن المحدد",

    "tooth_chart":
        "مخطط الأسنان",

    "can_select_multiple":
        "يمكنك اختيار أكثر من سن",

    "q1":
        "الربع الأول",

    "q2":
        "الربع الثاني",

    "q3":
        "الربع الثالث",

    "q4":
        "الربع الرابع",

    "midline":
        "خط الوسط",

    "can_save_without_tooth":
        "يمكنك حفظ التركيبة بدون تحديد سن",

    "delivery_date":
        "موعد التسليم",

    "notes_label":
        "ملاحظات",

    "notes_placeholder":
        "اللون، الإطباق، تعليمات خاصة...",

    "save_prosthesis":
        "حفظ التركيبة",

    "report_filter":
        "فلترة التقرير",

    "from_date_label":
        "من تاريخ",

    "to_date_label":
        "إلى تاريخ",

    "all":
        "الكل",

    "lab_overview":
        "LAB OVERVIEW",

    "lab_statistics":
        "إحصائيات المعمل",

    "live":
        "مباشر",

    "work_history":
        "WORK HISTORY",

    "works_history":
        "سجل التركيبات",

    "search_works_placeholder":
        "ابحث عن مريض أو تركيبة...",



"prints_title": "المطبوعات الطبية | Dentix Pro",
"medical_prints": "المطبوعات الطبية",
"medical_prints_desc": "إنشاء وإدارة الوصفات والتقارير والفواتير باحترافية",
"create_new_print": "إنشاء مطبوعة جديدة",
"saved_prints": "المطبوعات المحفوظة",
"no_prints_yet": "لا توجد مطبوعات بعد",
"start_first_print": "ابدأ بإنشاء أول مطبوعة لك",
"new_print": "مطبوعة جديدة",
"clinic_doctor_info": "معلومات العيادة والطبيب",
"clinic_name_label": "اسم العيادة",
"clinic_name_placeholder": "مثال: عيادة الابتسامة",
"doctor_name_label": "اسم الطبيب",
"doctor_name_placeholder": "مثال: د. أحمد محمد",
"job_title_label": "المسمى الوظيفي",
"job_title_placeholder": "مثال: أخصائي جراحة الفم والأسنان",
"document_info": "معلومات المستند",
"print_title_label": "عنوان المطبوعة",
"print_title_placeholder": "مثال: وصفة طبية - محمد علي",
"document_type_label": "نوع المستند",
"type_prescription": "وصفة طبية",
"type_instruction": "تعليمات",
"type_invoice": "فاتورة",
"type_consent": "موافقة طبية",
"content_label": "المحتوى",
"content_placeholder": "اكتب محتوى المطبوعة هنا...",
"main_image_label": "الصورة الرئيسية",
"click_upload_image": "اضغط لرفع صورة",
"png_jpg_optional": "PNG, JPG — اختياري",
"clinic_logo_label": "شعار العيادة",
"click_upload_logo": "اضغط لرفع الشعار",
"png_transparent": "PNG مع خلفية شفافة",
"save_print": "حفظ المطبوعة",
"print_now": "طباعة الآن",
"close": "إغلاق",

"dose_calculator_title": "حاسبة الجرعات | Dentix Pro",
"dose_calculator": "حاسبة الجرعات",
"dose_calculator_subtitle": "جرعات ذكية للأطفال والبالغين",
"manage_drugs": "إدارة الأدوية",
"age_label": "العمر (سنوات)",
"age_placeholder": "أدخل عمر المريض",
"age_hint": "أطفال: 0–11 سنة | بالغون: 12+ سنة",
"weight_label": "الوزن (كجم)",
"weight_placeholder": "أدخل الوزن بالكيلوجرام",
"estimate_weight": "تقدير الوزن",
"select_drug_label": "اختر الدواء",
"loading_drugs": "جاري تحميل الأدوية...",
"calculate_dose": "احسب الجرعة",
"dosing_recommendation": "توصية الجرعة",

"drugs_manager_title": "مدير الأدوية | Dentix Pro",
"drugs_manager": "مدير الأدوية",
"drugs_manager_subtitle": "إدارة قاعدة بيانات أدوية العيادة",
"add_new_drug": "إضافة دواء جديد",
"drug_name_label": "اسم الدواء",
"drug_name_placeholder": "مثال: هايبيوتيك 600 مجم معلق",
"category_label": "الفئة",
"select_category": "اختر الفئة",
"dosage_form_label": "شكل الجرعة",
"select_form": "اختر الشكل",
"form_suspension": "معلق",
"form_tablet": "قرص",
"form_capsule": "كبسولة",
"form_syrup": "شراب",
"form_drops": "نقط",
"form_injection": "حقن",
"form_suppository": "تحاميل",
"form_inhaler": "استنشاق",
"concentration_label": "التركيز",
"concentration_placeholder": "التركيز لكل 5 مل",
"min_age_label": "الحد الأدنى للعمر",
"min_age_placeholder": "0",
"max_age_label": "الحد الأقصى للعمر",
"max_age_placeholder": "120",
"mg_per_kg_label": "ملغ/كجم/يوم",
"mg_per_kg_placeholder": "مثال: 15",
"frequency_label": "التكرار / اليوم",
"frequency_placeholder": "مثال: 3",
"max_dose_label": "الحد الأقصى للجرعة اليومية (ملغ)",
"max_dose_placeholder": "مثال: 2000",
"duration_label": "المدة (أيام)",
"duration_placeholder": "مثال: 7",
"clinical_notes_label": "ملاحظات سريرية",
"clinical_notes_placeholder": "أمراض الكبد، أمراض الكلى، تفاعلات الأدوية، تحذيرات الحمل...",
"reset": "إعادة تعيين",
"save_drug": "حفظ الدواء",
"drug_database": "قاعدة بيانات الأدوية",
"drugs_count": "0 أدوية",
"search_drugs_placeholder": "ابحث عن الأدوية بالاسم...",
"loading_drugs": "جاري تحميل الأدوية...",
"380": "باقي",
"381": "سنة",
"382": "فتح الملف",
// ========== AR ==========
"383": "غير محدد",
"384": "لا توجد مواعيد",
"385": "لا توجد نتائج لهذا الفلتر",
"386": "غير معروف",
"387": "لا يوجد هاتف",
"388": "✓ قادم",
"389": "📌 متواجد",
"390": "⏰ متأخر",
"391": "🔄 مستمرة",
"392": "زيارة ملغاة",
"393": "زيارة مستمرة",
"394": "زيارة منتهية",
"395": "زيارة الآن",
"396": "زيارة فائتة",
"397": "في انتظار التأكيد",
"398": "زيارة قادمة",
"399": "من:",
"400": "إلى:",
"401": "لا توجد عناصر في المخزن",
"402": "لم تتم إضافة أي عناصر للمخزن بعد",
"403": "الأحدث",
"404": "لا توجد سجلات شراء",
"405": "مخزون منخفض",
"406": "متوفر في المخزن",
"407": "الكمية الحالية",
"408": "وحدة",
"409": "تم شراؤها",
"410": "(هذا الشهر)",
"411": "الإجمالي",
"412": "أسعار الشراء",
"413": "التكلفة الإجمالية",
"414": "الكمية",
"415": "الخدمات",
"416": "حذف",
"417": "تنبيه منخفض",
"418": "أقدم",
"419": "ج.م",

"420": "لا توجد تركيبات",
"421": "أضف تركيبة جديدة من الأعلى",
"422": "بدون تاريخ",
"423": "تركيبة",
"424": "تركيبات",
"425": "التركيبات",
"426": "المستلمة",
"427": "قيد الانتظار",
"428": "متأخرة",
"429": "تكلفة المعمل",
"430": "من المرضى",
"431": "صافي الربح",
"432": "تم الاستلام",
"433": "فات موعد التسليم",
"434": "قيد الانتظار",
"435": "موعد التسليم:",
"436": "عدد الوحدات:",
"437": "المريض",
"438": "المعمل",
"439": "الربح",
"440": "مستلمة",
"441": "متأخرة",
"442": "قيد الانتظار",
"443": "لا توجد تركيبات قادمة",
"444": "جميع التركيبات حالياً في المعامل",
"445": "قريباً",
"446": "متأخر",
"447": "اليوم",
"448": "غداً",
"449": "لا توجد طلبات حجز",
"450": "غير محدد",
"451": "قيد الانتظار",
"452": "موعد الزيارة",
"453": "تم التواصل",
"454": "إشعار جديد",
"455": "الآن",
"456": "إغلاق",
"460": "زيارة تحتاج متابعة",
"461": "الزيارة المقررة لـ {name} انتهت وما زالت قيد الانتظار.",
"462": "بدء موعد الزيارة",
"463": "الزيارة المقررة لـ {name} بدأت ولم يتم تسجيل نتيجة الزيارة بعد.",
"465": "تسليم معمل مستحق اليوم",
"466": "{workName} لـ {patientName} مستحق اليوم ولم يتم استلامه.",
"467": "تركيبة معمل",
"468": "مخزون منخفض",
"469": "{itemName} منخفض في المخزن. الكمية الحالية: {quantity}",
}


};


/* ============================================================
   APPLY TRANSLATIONS
============================================================ */

function applyTranslations() {

    const language =
        userPreferences.language;

    const elements =
        document.querySelectorAll(
            "[data-i18n]"
        );


    elements.forEach(element => {

        const key =
            element.getAttribute(
                "data-i18n"
            );

        if (
            translations[language] &&
            translations[language][key]
        ) {

            element.textContent =
                translations[language][key];
        }

    });
}


/* ============================================================
   INITIALIZE
============================================================ */

async function initUserPreferences() {

    /*
     * First apply local settings.
     */

    loadLocalPreferences();


    /*
     * Then synchronize with Supabase.
     */

    await loadUserPreferences();
}


/* ============================================================
   START
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        initUserPreferences();

    }
);