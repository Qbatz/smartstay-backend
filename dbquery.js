const connection = require('./config/connection')

// Usage
const queries = [

    "ALTER TABLE announcement_comments ADD parent_comment_id INT NULL;",

    "ALTER TABLE `eb_settings` ADD COLUMN `status` INT NULL DEFAULT '1' AFTER `duration`;",

    "ALTER TABLE `customer_walk_in_details` ADD COLUMN `last_name` VARCHAR(255) NULL AFTER `first_name`,CHANGE COLUMN `customer_Name` `first_name` VARCHAR(65) NULL DEFAULT NULL ;",

    "ALTER TABLE `invoicedetails` ADD COLUMN `start_date` DATE NULL AFTER `invoice_status`,ADD COLUMN `end_date` DATE NULL AFTER `start_date`;",

    "CREATE TABLE receipts (id INT AUTO_INCREMENT PRIMARY KEY,user_id INT NOT NULL,reference_id VARCHAR(255) NOT NULL,invoice_number VARCHAR(255) NOT NULL,amount_received DECIMAL(10, 2) NOT NULL,payment_date DATE NOT NULL,payment_mode VARCHAR(50) NOT NULL,notes TEXT,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);",

    "ALTER TABLE `receipts` ADD COLUMN `status` INT NULL DEFAULT 1 AFTER `payment_mode`,ADD COLUMN `created_by` BIGINT(20) NULL AFTER `notes`;",

    "ALTER TABLE `receipts` ADD COLUMN `bank_id` VARCHAR(45) NULL DEFAULT 0 AFTER `notes`;",

    "ALTER TABLE invoicedetails MODIFY COLUMN PaidAmount DECIMAL(10,2);",

    "ALTER TABLE expenses MODIFY COLUMN unit_amount DECIMAL(10,2);",

    "ALTER TABLE expenses MODIFY COLUMN purchase_amount DECIMAL(10,2);",

    "CREATE TABLE subscription_hostels (id INT AUTO_INCREMENT PRIMARY KEY,subscription_id VARCHAR(255) NOT NULL,customer_id VARCHAR(255) NOT NULL,hostel_id INT NOT NULL,hostel_name VARCHAR(255) NOT NULL,status INT(11) DEFAULT 1,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP); "
];

queries.forEach(executeQuery);

function executeQuery(sql) {
    connection.query(sql, function (err, data) {
        if (err) {
            // console.log(err);
        } else {
            console.log('Query executed successfully');
        }
    });
}