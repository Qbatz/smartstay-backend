const request = require('request');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const updateEnvFile = async (newAccessToken) => {
    try {
        const envPath = path.resolve(__dirname, '../.env');
        const envContent = await fs.readFile(envPath, 'utf-8');
        const envVars = envContent.split('\n');

        const updatedEnvVars = envVars.map(line => {
            if (line.startsWith('ACCESS_TOKEN=')) {
                return `ACCESS_TOKEN=${newAccessToken}`;
            }
            return line;
        }).join('\n');

        await fs.writeFile(envPath, updatedEnvVars);
        console.log('Access token updated in .env file');
    } catch (error) {
        console.error('Error updating .env file:', error);
        throw error;
    }
};

const refreshToken = () => {
    return new Promise((resolve, reject) => {
        const baseUrl = "https://accounts.zoho.in/oauth/v2/token";

        const formParams = {
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            refresh_token: process.env.REFRESH_TOKEN,
            redirect_uri: "https://www.google.com/",
            grant_type: 'refresh_token'
        };

        const options = {
            url: baseUrl,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            form: formParams
        };

        request(options, async (error, response, body) => {
            if (error) {
                console.error('Error refreshing access token:', error);
                return reject(error);
            } else if (response.statusCode !== 200) {
                console.error('Failed to refresh access token');
                return reject(new Error(body));
            } else {
                try {
                    const parsedBody = JSON.parse(body);
                    const newAccessToken = parsedBody.access_token;
                    console.log(newAccessToken, "New Access Token");
                    
                    // Update .env file
                    await updateEnvFile(newAccessToken);

                    // Update process.env
                    process.env.ACCESS_TOKEN = newAccessToken;

                    resolve(newAccessToken);
                } catch (err) {
                    reject(err);
                }
            }
        });
    });
};

module.exports = refreshToken;
