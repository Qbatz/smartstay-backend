const nodeCron = require('node-cron')
const billings = require('./zoho_billing/billings')

nodeCron.schedule('0 2 * * *', () => {
// nodeCron.schedule('* * * * * *', () => {
    billings.check_trail_end();
});

nodeCron.schedule('0 2 * * *', () => {
    billings.checkAllSubscriptions();
});
