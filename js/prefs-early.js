/* Applies the saved language + theme before the page paints, so there is no
   flash of the wrong theme and the choice is already in place when the page
   scripts start. Reads only this browser's copy (see preferences.js). */
(function () {
    try {
        var o = JSON.parse(localStorage.getItem("dentix_preferences") || "null");
        if (!o) return;
        var d = document.documentElement;
        if (o.theme === "light" || o.theme === "dark") d.setAttribute("data-theme", o.theme);
        if (d.getAttribute("data-prefs") !== "theme" && (o.language === "ar" || o.language === "en")) {
            d.setAttribute("lang", o.language);
            d.setAttribute("dir", o.language === "ar" ? "rtl" : "ltr");
        }
    } catch (e) { /* storage blocked */ }
})();
