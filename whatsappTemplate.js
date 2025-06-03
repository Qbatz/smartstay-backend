const axios = require('axios');
const WHATSAPP_ACCESS_TOKEN = process.env.TOKEN;

const isValidPhoneNumber = (phoneNumber) => {
    const regex = /^\+[1-9]{1}[0-9]{3,14}$/;
    return regex.test(phoneNumber);
};

async function sendTemplateMessage(to, templateName, parameters = []) {
    if (!isValidPhoneNumber(to)) {
        console.error('Invalid phone number format:', to);
        throw new Error('Invalid phone number format');
    }

    try {
        const response = await axios.post(
            'https://graph.facebook.com/v17.0/547806001759552/messages',
            {
                messaging_product: 'whatsapp',
                to,
                type: 'template', 
                template: {
                    name: templateName,
                    language: { code: 'en_IN' },
                    components: [
                        {
                            type: 'body',
                            parameters: parameters.map((valu) => ({ type: 'text', text: valu })),
                        }, 
                    ],
                },
            },
            {
                headers: {
                    Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json', 
                },
            }
        );

        console.log(`Template message '${templateName}' sent:`, response.data);
        return response.data;
    } catch (err) {
        console.error(`Error sending template message '${templateName}':`, err.response?.data || err.message);
        throw err;
    }
}

module.exports = { sendTemplateMessage }