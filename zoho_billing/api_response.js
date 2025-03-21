const request = require('request');
require('dotenv').config();
const refreshToken = require('./refresh_token');

const apiMiddleware = (apiEndpoint, method, input_body) => {
    return new Promise(async (resolve, reject) => {
        const makeApiCall = () => {
            return new Promise((resolve, reject) => {

                if (input_body != 0) {
                    var body_value = JSON.stringify(input_body);
                } else {
                    var body_value = 0;
                }

                const options = {
                    url: apiEndpoint,
                    method: method,
                    headers: {
                        Authorization: "Zoho-oauthtoken " + process.env.ACCESS_TOKEN,
                        "X-com-zoho-subscriptions-organizationid": process.env.ORGANIZATION_ID,
                        'Content-Type': 'application/json'
                    },
                    body: body_value
                };

                request(options, (error, response, body) => {
                    if (error) {
                        return reject('Error calling API: ' + error);
                    }

                    try {
                        const parsedBody = JSON.parse(body);
                        console.log(parsedBody);
                        if (parsedBody.code === 0) {
                            resolve({ shouldRetry: false, response: parsedBody }); // No need to retry, pass the body
                        } else if (parsedBody.code != 57) {
                            resolve({ shouldRetry: false, response: parsedBody }); // No need to retry, pass the body
                        } else {
                            resolve({ shouldRetry: true }); // Indicates that we should retry the API call
                        }
                    } catch (e) {
                        reject('Error parsing API response: ' + e.message);
                    }
                });
            });
        };

        try {
            let retry = true;
            let retryCount = 0;
            const maxRetries = 2; // Set a retry limit

            while (retry && retryCount < maxRetries) {
                const { shouldRetry, response } = await makeApiCall();
                if (shouldRetry) {
                    retryCount++;
                    console.log(`Response code is not 0. Retry attempt ${retryCount}`);
                    await refreshToken(); // Wait for the token to be refreshed
                } else {
                    retry = false;
                    return resolve(response);
                }
            }

            if (retryCount === maxRetries) {
                console.error('Reached maximum retry limit.');
                return reject('Unable to refresh token and call API after several attempts.');
            }
        } catch (error) {
            console.error(error);
            return reject('Internal Server Error');
        }
    });
};

module.exports = apiMiddleware;
