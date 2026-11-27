/* Login screen: Manager / Employee tabs, first-run manager account, language
   + theme (persisted). The tab is only the entry path: the DATABASE decides
   the role (is_admin()), and a mismatch signs the user straight back out. */
(function () {
    "use strict";

    const TXT = {
        ar: {
            title: "تسجيل الدخول - Dentimate Pro",
            tagline: "منصة إدارة العيادات الطبية الحديثة",
            tabManager: "مدير", tabEmployee: "موظف",
            hSignin: "تسجيل الدخول", hCreate: "إنشاء حساب مدير جديد",
            subManager: "سجّل دخولك كمدير لإدارة العيادة والموظفين والصلاحيات",
            subEmployee: "سجّل دخولك بحساب الموظف الذي أنشأه لك المدير",
            subCreate: "هذه أول مرة تشغّل فيها النظام: أنشئ حساب المدير الأول",
            email: "البريد الإلكتروني", password: "كلمة المرور", confirm: "تأكيد كلمة المرور",
            login: "تسجيل الدخول", create: "إنشاء الحساب",
            hintEmployee: "حساب الموظف ينشئه المدير من صفحة الموظفين. إن لم يكن لديك حساب فاطلبه من المدير.",
            newAcct: "إنشاء حساب مدير جديد", backToLogin: "لديّ حساب - العودة لتسجيل الدخول",
            langBtn: "English", themeToLight: "الوضع الفاتح", themeToDark: "الوضع الداكن",
            needBoth: "اكتب البريد وكلمة المرور",
            notManager: "هذا الحساب ليس حساب مدير. اختر تبويب «موظف».",
            notEmployee: "هذا حساب مدير. اختر تبويب «مدير».",
            badLogin: "البريد أو كلمة المرور غير صحيحة",
            pwShort: "كلمة المرور 8 أحرف على الأقل", pwMismatch: "كلمتا المرور غير متطابقتين",
            badEmail: "بريد غير صالح", created: "تم إنشاء الحساب، جارٍ الدخول...",
            ok: "تم تسجيل الدخول", wait: "لحظة...",
            netErr: "تعذر الاتصال بالنظام"
        },
        en: {
            title: "Sign in - Dentimate Pro",
            tagline: "Modern clinic management platform",
            tabManager: "Manager", tabEmployee: "Employee",
            hSignin: "Sign in", hCreate: "Create new manager account",
            subManager: "Sign in as the manager to run the clinic, staff and permissions",
            subEmployee: "Sign in with the employee account your manager created for you",
            subCreate: "First time running the system: create the first manager account",
            email: "Email", password: "Password", confirm: "Confirm password",
            login: "Sign in", create: "Create account",
            hintEmployee: "Employee accounts are created by the manager from the Employees page. Ask your manager if you do not have one.",
            newAcct: "Create new manager account", backToLogin: "I have an account - back to sign in",
            langBtn: "العربية", themeToLight: "Light mode", themeToDark: "Dark mode",
            needBoth: "Enter your email and password",
            notManager: "This is not a manager account. Choose the Employee tab.",
            notEmployee: "This is a manager account. Choose the Manager tab.",
            badLogin: "Wrong email or password",
            pwShort: "Password must be at least 8 characters", pwMismatch: "Passwords do not match",
            badEmail: "Invalid email", created: "Account created, signing in...",
            ok: "Signed in", wait: "One moment...",
            netErr: "Could not reach the system"
        }
    };

    const $ = (id) => document.getElementById(id);
    let lang = "ar", theme = "dark", role = "manager", mode = "signin", needsOwner = false, busy = false;

    function readStored() {
        try {
            const o = JSON.parse(localStorage.getItem("dentix_preferences") || "null") || {};
            if (o.language === "ar" || o.language === "en") lang = o.language;
            if (o.theme === "light" || o.theme === "dark") theme = o.theme;
        } catch (e) { /* ignore */ }
    }
    // Remember a choice made HERE: pages pick it up on every page, and it is
    // saved to the account once after sign-in (preferences.js).
    function storeChoice() {
        const v = JSON.stringify({ language: lang, theme: theme });
        try {
            localStorage.setItem("dentix_preferences", v);
            localStorage.setItem("dentix_login_choice", v);
        } catch (e) { /* ignore */ }
    }

    function render() {
        const t = TXT[lang];
        const d = document.documentElement;
        d.setAttribute("lang", lang);
        d.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
        d.setAttribute("data-theme", theme);
        document.title = t.title;
        const set = (id, v) => { const e = $(id); if (e) e.textContent = v; };
        set("tagline", t.tagline);
        set("tabManagerText", t.tabManager); set("tabEmployeeText", t.tabEmployee);
        set("langText", t.langBtn);
        set("themeText", theme === "dark" ? t.themeToLight : t.themeToDark);
        $("themeIcon").className = theme === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";
        const creating = mode === "create";
        set("cardTitle", creating ? t.hCreate : t.hSignin);
        set("cardSub", creating ? t.subCreate : (role === "manager" ? t.subManager : t.subEmployee));
        $("email").placeholder = t.email;
        $("password").placeholder = t.password;
        $("password2").placeholder = t.confirm;
        set("btnText", creating ? t.create : t.login);
        set("hintEmployee", t.hintEmployee);
        set("linkNew", t.newAcct); set("linkBack", t.backToLogin);
        $("tabManager").classList.toggle("active", role === "manager");
        $("tabEmployee").classList.toggle("active", role === "employee");
        $("tabManager").setAttribute("aria-selected", role === "manager");
        $("tabEmployee").setAttribute("aria-selected", role === "employee");
        $("hintEmployee").classList.toggle("hidden", !(role === "employee" && !creating));
        $("grp2").classList.toggle("hidden", !creating);
        $("linkNew").classList.toggle("hidden", !(role === "manager" && !creating && needsOwner));
        $("linkBack").classList.toggle("hidden", !creating);
        $("roleTabs").classList.toggle("hidden", creating);
    }

    function showError(msg) {
        const e = $("formError");
        e.textContent = msg || "";
        e.classList.toggle("show", !!msg);
    }
    function toast(m) {
        const e = $("toast"); e.innerText = m; e.classList.add("show");
        setTimeout(() => e.classList.remove("show"), 3000);
    }
    function setBusy(b) {
        busy = b; $("submitBtn").disabled = b;
        if (b) $("btnText").textContent = TXT[lang].wait; else render();
    }

    /* Supabase edition: any new manager can register, so the create link is
       always offered under the Manager tab. */
    async function refreshSetup() {
        needsOwner = true;
        render();
    }

    async function signIn(email, password) {
        const t = TXT[lang];
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) { showError(t.badLogin); return false; }
        // the database decides the role; the tab is only the entry path
        let isAdmin = false;
        try { const r = await supabaseClient.rpc("is_admin"); isAdmin = r && r.data === true; } catch (e) { /* treated as not admin */ }
        if ((role === "manager") !== isAdmin) {
            await supabaseClient.auth.signOut({ scope: "local" });
            showError(role === "manager" ? t.notManager : t.notEmployee);
            return false;
        }
        toast(t.ok);
        let landing = "dashboard.html";
        try {
            const { data: firstPage } = await supabaseClient.rpc("first_allowed_page");
            if (firstPage) landing = firstPage;
        } catch (e) { /* keep the default */ }
        const { data: sd } = await supabaseClient.auth.getSession();
        setTimeout(() => window.location.replace(landing), sd && sd.session ? 400 : 1200);
        return true;
    }

    async function submit() {
        if (busy) return;
        const t = TXT[lang];
        showError("");
        const email = $("email").value.trim();
        const password = $("password").value;
        if (!email || !password) return showError(t.needBoth);
        setBusy(true);
        try {
            if (mode === "create") {
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showError(t.badEmail);
                if (password.length < 8) return showError(t.pwShort);
                if (password !== $("password2").value) return showError(t.pwMismatch);
                const { data: sUp, error: sErr } = await supabaseClient.auth.signUp({ email, password });
                if (sErr) return showError(/registered|exists/i.test(sErr.message || "") ? (lang === "ar" ? "هذا البريد مسجل بالفعل" : "This email is already registered") : (sErr.message || t.netErr));
                if (!sUp || !sUp.session) {
                    // the project asks for e-mail confirmation first
                    mode = "signin";
                    showError(lang === "ar" ? "تم إنشاء الحساب. أكّد بريدك من الرسالة المرسلة ثم سجّل الدخول." : "Account created. Confirm your e-mail from the message we sent, then sign in.");
                    return;
                }
                toast(t.created);
                role = "manager"; mode = "signin";
                await signIn(email, password);
            } else {
                await signIn(email, password);
            }
        } catch (e) {
            showError(TXT[lang].netErr);
        } finally {
            setBusy(false);
        }
    }

    document.addEventListener("DOMContentLoaded", () => {
        readStored();
        render();
        $("tabManager").addEventListener("click", () => { role = "manager"; showError(""); render(); });
        $("tabEmployee").addEventListener("click", () => { role = "employee"; showError(""); render(); });
        $("langBtn").addEventListener("click", () => { lang = lang === "ar" ? "en" : "ar"; storeChoice(); render(); });
        $("themeBtn").addEventListener("click", () => { theme = theme === "dark" ? "light" : "dark"; storeChoice(); render(); });
        $("linkNew").addEventListener("click", () => { mode = "create"; role = "manager"; showError(""); render(); });
        $("linkBack").addEventListener("click", () => { mode = "signin"; showError(""); render(); });
        $("submitBtn").addEventListener("click", submit);
        ["email", "password", "password2"].forEach((id) =>
            $(id).addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); }));
        refreshSetup();
    });
})();
