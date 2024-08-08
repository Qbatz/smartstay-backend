const nodeCron = require('node-cron')
const billings = require('./zoho_billing/billings')

//  Check Plan Status Expire for Every Day 
nodeCron.schedule('0 2 * * *', () => {
    billings.checkAllSubscriptions();
});
