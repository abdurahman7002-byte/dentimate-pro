console.log("🔥 whatsapp.js LOADED");


// =====================================================
// SEND WHATSAPP MESSAGE
// =====================================================

window.sendWhatsAppMessage = async function (
    phone,
    message
) {

    try {

        // ---------------------------------------------
        // VALIDATION
        // ---------------------------------------------

        if (!phone) {

            throw new Error(
                "رقم الهاتف غير موجود"
            );

        }


        if (!message) {

            throw new Error(
                "نص الرسالة غير موجود"
            );

        }


        // ---------------------------------------------
        // NORMALIZE PHONE
        // ---------------------------------------------

        let normalizedPhone =
            String(phone)
                .replace(/\D/g, "");


        // Egyptian number
        // 010XXXXXXXX
        // ↓
        // 2010XXXXXXXX

        if (
            normalizedPhone.startsWith("0")
        ) {

            normalizedPhone =
                "20" +
                normalizedPhone.substring(1);

        }


        console.log(
            "📱 WhatsApp:",
            normalizedPhone
        );


        // ---------------------------------------------
        // CALL EDGE FUNCTION
        // ---------------------------------------------

        const {
            data,
            error
        } =
            await window.supabaseClient
                .functions
                .invoke(
                    "whatsapp-send",
                    {
                        body: {

                            phone:
                                normalizedPhone,

                            message:
                                message

                        }
                    }
                );


        // ---------------------------------------------
        // SUPABASE ERROR
        // ---------------------------------------------

        if (error) {

            console.error(
                "❌ WhatsApp Function Error:",
                error
            );

            throw error;

        }


        // ---------------------------------------------
        // RESPONSE
        // ---------------------------------------------

        console.log(
            "📨 WhatsApp Response:",
            data
        );


        if (
            !data ||
            data.success !== true
        ) {

            throw new Error(
                data?.error ||
                "فشل إرسال رسالة WhatsApp"
            );

        }


        // ---------------------------------------------
        // SUCCESS
        // ---------------------------------------------

        console.log(
            "✅ WhatsApp message sent successfully"
        );


        return {

            success: true,

            data:
                data.data

        };


    } catch (error) {

        console.error(
            "❌ WhatsApp Send Error:",
            error
        );


        return {

            success: false,

            error:
                error?.message ||
                "حدث خطأ أثناء إرسال رسالة WhatsApp"

        };

    }

};
// =====================================================
// SEND WHATSAPP TEMPLATE
// =====================================================

window.sendWhatsAppTemplate = async function (
    phone,
    templateName,
    language,
    parameters = []
) {

    try {

        let normalizedPhone =
            String(phone).replace(/\D/g, "");

        // Egyptian number
        if (normalizedPhone.startsWith("0")) {
            normalizedPhone =
                "20" +
                normalizedPhone.substring(1);
        }

        const {
            data,
            error
        } = await window.supabaseClient
            .functions
            .invoke(
                "whatsapp-send",
                {
                    body: {

                        phone: normalizedPhone,

                        type: "template",

                        template: {

                            name: templateName,

                            language: language,

                            parameters:
                                parameters.map(
                                    value => ({
                                        type: "text",
                                        text: String(value)
                                    })
                                )

                        }

                    }
                }
            );


        if (error) {

            console.error(
                "❌ WhatsApp Template Error:",
                error
            );

            throw error;

        }


        console.log(
            "📨 WhatsApp Template Response:",
            data
        );


        return data;


    } catch (error) {

        console.error(
            "❌ WhatsApp Template Error:",
            error
        );


        return {

            success: false,

            error:
                error?.message ||
                "حدث خطأ أثناء إرسال القالب"

        };

    }

};