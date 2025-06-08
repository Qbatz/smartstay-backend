const axios = require('axios');
const WHATSAPP_ACCESS_TOKEN = process.env.TOKEN;

const isValidPhoneNumber = (phoneNumber) => {
    const regex = /^\+[1-9]{1}[0-9]{3,14}$/;
    return regex.test(phoneNumber);
};

// async function sendTemplateMessage(to, templateName, parameters = []) {
//     console.log("hello")
//     console.log("parameters",parameters)
//     if (!isValidPhoneNumber(to)) {
//         console.error('Invalid phone number format:', to);
//         throw new Error('Invalid phone number format');
//     }

//     try {
//         const response = await axios.post(
//             'https://graph.facebook.com/v17.0/547806001759552/messages',
//             {
//                 messaging_product: 'whatsapp',
//                 to,
//                 type: 'template',
//                 template: {
//                     name: templateName,
//                     language: { code: 'en_IN' },
//                     components: [
//                         {
//                             type: 'body',
//                             parameters: parameters.map((valu) => ({ type: 'text', text: valu })),
//                         },
//                     ],
//                 },
//             },
//             {
//                 headers: {
//                     Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
//                     'Content-Type': 'application/json',
//                 },
//             }
//         );

//         console.log(`Template message '${templateName}' sent:`, response.data);
//         return response.data;
//     } catch (err) {
//         console.error(`Error sending template message '${templateName}':`, err.response?.data || err.message);
//         throw err;
//     }
// }

async function sendTemplateMessage_url(to, templateName, parameters = []) {
    console.log("hello");
    console.log("parameters", parameters);
    if (!isValidPhoneNumber(to)) {
        console.error("Invalid phone number format:", to);
        throw new Error("Invalid phone number format");
    }

    const bodyTexts = [];
    const buttonUrls = [];

    parameters.forEach((param) => {
        if (typeof param === "string" && param.startsWith("http")) {
            buttonUrls.push(param);
        } else {
            bodyTexts.push(param);
        }
    });

    const components = [];

    components.push({
        type: "body",
        parameters: bodyTexts.map((text) => ({ type: "text", text })),
    });

    // Add button components for each URL
    buttonUrls.forEach((url, index) => {
        components.push({
            type: "button",
            sub_type: "url",
            index: index.toString(),
            parameters: [{ type: "text", text: url }],
        });
    });

    console.log("components", components)

    try {
        const response = await axios.post(
            "https://graph.facebook.com/v17.0/547806001759552/messages",
            {
                messaging_product: "whatsapp",
                to,
                type: "template",
                template: {
                    name: templateName,
                    language: { code: "en" },
                    components: components,
                },
            },
            {
                headers: {
                    Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
                    "Content-Type": "application/json",
                },
            }
        );

        console.log(`Template message '${templateName}' sent:`, response.data);
        return response.data;
    } catch (err) {
        console.error(
            `Error sending template message '${templateName}':`,
            err.response?.data || err.message
        );
        throw err;
    }
}

async function sendTemplateMessage(to, templateName, parameters = []) {
    console.log("parameters", parameters);

    if (!isValidPhoneNumber(to)) {
        console.error("Invalid phone number format:", to);
        throw new Error("Invalid phone number format");
    }

    const components = [];

    components.push({
        type: "body",
        parameters: parameters
            .filter((p, i) => !(templateName === "invoice_notification" && i === 1))
            .map((text) => ({
                type: "text",
                text: text,
            })),
    });

    // For invoice_notification, add button component with 2nd parameter as URL
    if (templateName === "invoice_notification" && parameters[1]) {
        components.push({
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [{ type: "text", text: parameters[1] }],
        });
    }

    console.log("components", components);

    try {
        const response = await axios.post(
            "https://graph.facebook.com/v17.0/547806001759552/messages",
            {
                messaging_product: "whatsapp",
                to,
                type: "template",
                template: {
                    name: templateName,
                    language: { code: "en" },
                    components,
                },
            },
            {
                headers: {
                    Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
                    "Content-Type": "application/json",
                },
            }
        );

        console.log(`Template message '${templateName}' sent:`, response.data);
        return response.data;
    } catch (err) {
        console.error(
            `Error sending template message '${templateName}':`,
            err.response?.data || err.message
        );
        throw err;
    }
}



module.exports = { sendTemplateMessage }