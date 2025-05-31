const request = require('request');

const axios = require('axios');

const kycService = {
  async verifyKyc(requestData) {
    try {
      console.log("KYC Payload:", requestData);

      const response = await axios.post(
        `${process.env.KYC_BASE_URL}/${process.env.KYC_END_POINT}`,
        requestData,
        {
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
        }
      );

      console.log("KYC Axios Response:", response.data);
      return response.data;
    } catch (err) {
      console.error("KYC Axios Error:", err.response?.data || err.message);
      throw new Error(err.response?.data?.message || 'KYC request failed');
    }
  }
};


module.exports = kycService;
