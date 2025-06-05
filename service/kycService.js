const request = require('request');
const axios = require('axios');

async function verifyKyc(requestData) {
  try {
    console.log("KYC Payload:", requestData);
    const url = `${process.env.KYC_BASE_URL}/${process.env.KYC_END_POINT}`;
    const headers = {
      'Content-Type': 'application/json',
      'ClientId': process.env.KYC_CLIENT_ID,
      'ClientSecret': process.env.KYC_CLIENT_SECRET
    };

    const auth = {
      username: process.env.BASIC_KYC_AUTH_USER,
      password: process.env.BASIC_KYC_AUTH_PASS
    };

    const response = await axios.post(url, requestData, {
      headers,
      auth,
      timeout: 10000
    });
    return response.data;

  } catch (err) {
    const errMsg = err.response?.data?.message || err.message || 'KYC request failed';
    throw new Error(errMsg);
  }
}


async function fetchKycApiResponse(kyc_id) {
  const url = `${process.env.KYC_BASE_URL}/${process.env.KYC_STATUS_END_POINT}/${kyc_id}/response`;
  try {
    const { data } = await axios.post(url,{}, {
      headers: {
            'Content-Type': 'application/json',
            'ClientId': process.env.KYC_CLIENT_ID,
            'ClientSecret': process.env.KYC_CLIENT_SECRET
          },
          auth: {
            username: process.env.BASIC_KYC_AUTH_USER,
            password: process.env.BASIC_KYC_AUTH_PASS
          },
          timeout: 10000
    });
 console.log("KYC Axios Response:", data);
    return data;  // Just return the raw API response data

  } catch (error) {
    console.error(`[KYC API ERROR] KYC ID ${kyc_id}:`, error?.response?.data || error.message);
    throw error; // Propagate error to caller for handling
  }
}

module.exports = {verifyKyc,fetchKycApiResponse};
