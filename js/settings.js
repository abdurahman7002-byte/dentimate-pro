/* ============================================================
   DENTIX PRO
   USER PREFERENCES
   ============================================================ */

window.DentixSettings = {

    defaults: {
        language: "ar",
        theme: "dark"
    },

    current: {
        language: "ar",
        theme: "dark"
    },


    /* ========================================================
       GET CURRENT USER
    ======================================================== */

    async getUser() {

        if (!window.supabaseClient) {
            console.error("supabaseClient is not available");
            return null;
        }

        const {
            data,
            error
        } = await window.supabaseClient.auth.getUser();

        if (error) {
            console.error(
                "Get user error:",
                error
            );

            return null;
        }

        return data?.user || null;
    },


    /* ========================================================
       LOAD PREFERENCES
    ======================================================== */

    async load() {

        try {

            const user = await this.getUser();

            if (!user) {
                console.warn(
                    "No authenticated user"
                );

                return null;
            }


            const {
                data,
                error
            } = await window.supabaseClient

                .from("user_preferences")

                .select(`
                    id,
                    user_id,
                    language,
                    theme,
                    created_at,
                    updated_at
                `)

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

                return null;
            }


            /* =================================================
               CREATE DEFAULT PREFERENCES
            ================================================= */

            if (!data) {

                const {
                    data: newPreferences,
                    error: insertError
                } = await window.supabaseClient

                    .from("user_preferences")

                    .insert({
                        user_id: user.id,
                        language: this.defaults.language,
                        theme: this.defaults.theme
                    })

                    .select()

                    .single();


                if (insertError) {

                    console.error(
                        "Create preferences error:",
                        insertError
                    );

                    return null;
                }


                this.current = {
                    language:
                        newPreferences.language,

                    theme:
                        newPreferences.theme
                };


            } else {

                this.current = {

                    language:
                        data.language ||
                        this.defaults.language,

                    theme:
                        data.theme ||
                        this.defaults.theme
                };
            }


            /* =================================================
               APPLY SETTINGS
            ================================================= */

            this.applyTheme(
                this.current.theme
            );

            this.applyLanguage(
                this.current.language
            );


            return this.current;


        } catch (error) {

            console.error(
                "Preferences exception:",
                error
            );

            return null;
        }
    },


    /* ========================================================
       SAVE PREFERENCES
    ======================================================== */

    async save(changes = {}) {

        try {

            const user = await this.getUser();

            if (!user) {
                return false;
            }


            const payload = {

                user_id: user.id,

                language:
                    changes.language ??
                    this.current.language,

                theme:
                    changes.theme ??
                    this.current.theme,

                updated_at:
                    new Date().toISOString()
            };


            const {
                data,
                error
            } = await window.supabaseClient

                .from("user_preferences")

                .upsert(
                    payload,
                    {
                        onConflict: "user_id"
                    }
                )

                .select()

                .single();


            if (error) {

                console.error(
                    "Save preferences error:",
                    error
                );

                return false;
            }


            this.current = {

                language:
                    data.language,

                theme:
                    data.theme
            };


            /* =================================================
               APPLY
            ================================================= */

            this.applyTheme(
                this.current.theme
            );

            this.applyLanguage(
                this.current.language
            );


            return true;


        } catch (error) {

            console.error(
                "Save preferences exception:",
                error
            );

            return false;
        }
    },


    /* ========================================================
       CHANGE LANGUAGE
    ======================================================== */

    async setLanguage(language) {

        if (
            language !== "ar" &&
            language !== "en"
        ) {
            return false;
        }


        return await this.save({
            language: language
        });
    },


    /* ========================================================
       CHANGE THEME
    ======================================================== */

    async setTheme(theme) {

        if (
            theme !== "light" &&
            theme !== "dark"
        ) {
            return false;
        }


        return await this.save({
            theme: theme
        });
    },


    /* ========================================================
       APPLY THEME
    ======================================================== */

    applyTheme(theme) {

        document.documentElement
            .setAttribute(
                "data-theme",
                theme
            );


        /*
         * Optional class
         */

        document.body.classList
            .remove(
                "theme-light",
                "theme-dark"
            );

        document.body.classList
            .add(
                `theme-${theme}`
            );
    },


    /* ========================================================
       APPLY LANGUAGE
    ======================================================== */

    applyLanguage(language) {

        document.documentElement
            .setAttribute(
                "lang",
                language
            );


        document.documentElement
            .setAttribute(
                "dir",
                language === "ar"
                    ? "rtl"
                    : "ltr"
            );
    },


    /* ========================================================
       GET LANGUAGE
    ======================================================== */

    getLanguage() {

        return this.current.language;
    },


    /* ========================================================
       GET THEME
    ======================================================== */

    getTheme() {

        return this.current.theme;
    }

};


/* ============================================================
   AUTO LOAD
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        await DentixSettings.load();

    }
);