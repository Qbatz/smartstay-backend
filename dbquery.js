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

    "CREATE TABLE subscription_hostels (id INT AUTO_INCREMENT PRIMARY KEY,subscription_id VARCHAR(255) NOT NULL,customer_id VARCHAR(255) NOT NULL,hostel_id INT NOT NULL,hostel_name VARCHAR(255) NOT NULL,status INT(11) DEFAULT 1,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP); ",

    "ALTER TABLE `hosteldetails` CHANGE COLUMN `inv_date` `inv_date` INT(11) NULL DEFAULT NULL ,CHANGE COLUMN `due_date` `due_date` INT(11) NULL DEFAULT NULL ;",

    "ALTER TABLE `createaccount` ADD COLUMN `hostel_count` BIGINT(20) NULL DEFAULT 1 AFTER `description`,CHANGE COLUMN `createdat` `createdat` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP AFTER `createdby`;",

    "ALTER TABLE `customer_walk_in_details` ADD COLUMN `walk_In_Date` DATE NULL AFTER `mobile_Number`;",

    "CREATE TABLE `referral_codes` (`id` BIGINT(20) NOT NULL AUTO_INCREMENT,`user_id` BIGINT(20) NULL,`referral_code` VARCHAR(45) NULL,`is_used` INT NULL DEFAULT 0,`is_active` INT NULL DEFAULT 1,`used_by` BIGINT(20) NULL DEFAULT 0,`amount` BIGINT(20) NULL,`updated_by` BIGINT(20) NULL DEFAULT 0,`created_by` BIGINT(20) NULL DEFAULT 0,`is_credited` INT NULL DEFAULT 0,`createdat` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY (`id`));",

    "ALTER TABLE `createaccount` ADD COLUMN `reference_id` VARCHAR(50) NULL DEFAULT 0 AFTER `role_id`;",

    "ALTER TABLE `createaccount` ADD COLUMN `is_credited` INT NULL DEFAULT 0 AFTER `reference_id`;",

    "CREATE TABLE `wallet` (`id` BIGINT(20) NOT NULL AUTO_INCREMENT,`amount` DECIMAL(10,2) NULL,`user_id` BIGINT(20) NULL,`is_active` INT NULL DEFAULT 1,`createdat` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY (`id`));",

    "CREATE TABLE `wallet_logs` (`id` BIGINT(20) NOT NULL,`logs` VARCHAR(255) NULL,`ref_id` BIGINT(20) NULL DEFAULT 0,`used_by` BIGINT(20) NULL DEFAULT 0,`status` INT NULL DEFAULT 1,`createdat` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY (`id`));",

    "ALTER TABLE `wallet_logs` CHANGE COLUMN `id` `id` BIGINT(20) NOT NULL AUTO_INCREMENT ;",
    "ALTER TABLE `createaccount` ADD COLUMN `hostel_count` BIGINT(20) NULL DEFAULT 1 AFTER `description`,CHANGE COLUMN `createdat` `createdat` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP AFTER `createdby`;",

    "ALTER TABLE `trial_plan_details` ADD COLUMN `startdate` DATE NULL AFTER `plan_duration`,ADD COLUMN `end_date` DATE NULL AFTER `startdate`;",

    "ALTER TABLE `createaccount` ADD COLUMN `hostel_ids` VARCHAR(500) NULL DEFAULT 0 AFTER `hostel_count`;",

    "INSERT INTO `permissions` (`id`, `permission_name`) VALUES ('1', 'Dashboard'),('2', 'Announcement'),('3', 'Updates'),('4', 'Paying Guest'),('5', 'Customers'),('6', 'Bookings'),('7', 'Check out'),('8', 'Walk In'),('9', 'Assets'),('10', 'Vendor'),('11', 'Bills'),('12', 'Recuring Bills'),('13', 'Electricity'),('14', 'Complaints'),('15', 'Expenses'),('16', 'Reports'),('17', 'Bankings'),('18', 'Profile'),('19', 'Amenities');"
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