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

    "INSERT INTO `permissions` (`id`, `permission_name`) VALUES ('1', 'Dashboard'),('2', 'Announcement'),('3', 'Updates'),('4', 'Paying Guest'),('5', 'Customers'),('6', 'Bookings'),('7', 'Check out'),('8', 'Walk In'),('9', 'Assets'),('10', 'Vendor'),('11', 'Bills'),('12', 'Recuring Bills'),('13', 'Electricity'),('14', 'Complaints'),('15', 'Expenses'),('16', 'Reports'),('17', 'Bankings'),('18', 'Profile'),('19', 'Amenities');",

    "ALTER TABLE `invoicedetails` CHANGE COLUMN `PaidAmount` `PaidAmount` BIGINT(20) NULL DEFAULT 0 ;",

    "CREATE TABLE `manage_plan_details` (`id` BIGINT(20) NOT NULL AUTO_INCREMENT,`hosted_page_id` VARCHAR(255) NULL,`plan_code` VARCHAR(45) NULL,`total_amount` BIGINT(20) NULL,`wallet_amount` BIGINT(20) NULL,`hostel_count` BIGINT(20) NULL,`selected_hostels` VARCHAR(45) NULL,`comments` VARCHAR(255) NULL,`status` BIGINT(20) NULL DEFAULT 2,`plan_name` VARCHAR(255) NULL,`plan_start_date` DATE NULL,`plan_end_date` DATE NULL,`payment_method` VARCHAR(255) NULL,`payment_id` VARCHAR(255) NULL,`invoice_id` VARCHAR(255) NULL,`event_id` VARCHAR(255) NULL,`interval_unit` VARCHAR(45) NULL,`createdat` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY (`id`));",

    "ALTER TABLE `manage_plan_details` ADD COLUMN`customer_id` VARCHAR(45) NULL AFTER`hosted_page_id`;",

    "CREATE TABLE `checkout_deductions` (`id` BIGINT(20) NOT NULL AUTO_INCREMENT,`reason` VARCHAR(255) NULL,`amount` BIGINT(20) NULL,`user_id` BIGINT(20) NULL,`created_by` BIGINT(20) NULL,`created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY (`id`));",

    "ALTER TABLE `hosteldetails` ADD COLUMN `area` VARCHAR(255) NULL AFTER `Address`,ADD COLUMN `landmark` VARCHAR(255) NULL AFTER `area`,ADD COLUMN `pin_code` INT NULL AFTER `landmark`,ADD COLUMN `city` VARCHAR(255) NULL AFTER `pin_code`,ADD COLUMN `state` VARCHAR(255) NULL AFTER `city`;",
    "ALTER TABLE `hostel`ADD COLUMN `area` VARCHAR(255) NULL DEFAULT '' AFTER  `doc2`,ADD COLUMN `landmark` VARCHAR(255) NULL DEFAULT '' AFTER  `area`,ADD COLUMN `pincode` INT NULL DEFAULT '' AFTER  `landmark`,ADD COLUMN `city`VARCHAR(255) NULL DEFAULT '' AFTER  `pincode`,ADD COLUMN `state` VARCHAR(45) NULL DEFAULT '' AFTER  `city`;",
    "ALTER TABLE `bookings` ADD COLUMN `area` VARCHAR(255) NULL DEFAULT '' AFTER  `address`,ADD COLUMN `landmark` VARCHAR(255) NULL DEFAULT '' AFTER  `area`,ADD COLUMN `pin_code` INT NULL DEFAULT '' AFTER  `landmark`,ADD COLUMN `city` VARCHAR(255) NULL DEFAULT '' AFTER  `pin_code`,ADD COLUMN `state` VARCHAR(45) NULL DEFAULT '' AFTER  `city`;",
    "ALTER TABLE `customer_walk_in_details` ADD COLUMN `area` VARCHAR(255) NULL AFTER `comments`,ADD COLUMN `landmark` VARCHAR(255) NULL AFTER `area`,ADD COLUMN `pin_code` INT NULL AFTER `landmark`,ADD COLUMN `city` VARCHAR(255) NULL AFTER `pin_code`,ADD COLUMN `state` VARCHAR(45) NULL AFTER `city`,CHANGE COLUMN `comments` `comments` VARCHAR(255) NULL DEFAULT NULL AFTER `created_At`;",
    "ALTER TABLE `Vendor` ADD COLUMN `area` VARCHAR(255) NULL AFTER `Vendor_Address`,ADD COLUMN `landmark` VARCHAR(255) NULL AFTER `area`,ADD COLUMN `city` VARCHAR(255) NULL AFTER `Pincode`,ADD COLUMN `state` VARCHAR(45) NULL AFTER `city`,CHANGE COLUMN `Pincode` `Pincode` INT NULL DEFAULT NULL AFTER `landmark`;",
    "ALTER TABLE `createaccount` ADD COLUMN `area` VARCHAR(255) NULL AFTER `Address`,ADD COLUMN `landmark` VARCHAR(255) NULL AFTER `area`,ADD COLUMN `pin_code` INT NULL AFTER `landmark`,ADD COLUMN `city` VARCHAR(255) NULL AFTER `pin_code`,ADD COLUMN `state` VARCHAR(45) NULL AFTER `city`;",
    "ALTER TABLE `contacts` ADD COLUMN `area` VARCHAR(255) NULL AFTER `address`,ADD COLUMN `landmark` VARCHAR(255) NULL AFTER `area`,ADD COLUMN `pin_code` INT NULL AFTER `landmark`,ADD COLUMN `city` VARCHAR(255) NULL AFTER `pin_code`,ADD COLUMN `state` VARCHAR(45) NULL AFTER `city`;",



    "CREATE TABLE `checkout_deductions` (`id` BIGINT(20) NOT NULL AUTO_INCREMENT,`reason` VARCHAR(255) NULL,`amount` BIGINT(20) NULL,`user_id` BIGINT(20) NULL,`created_by` BIGINT(20) NULL,`created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY (`id`));",

    "ALTER TABLE `otp_verification` ADD COLUMN `role` VARCHAR(45) NULL DEFAULT 'customer' AFTER `otp`;",

    "ALTER TABLE `bankings` ADD COLUMN `type` VARCHAR(45) NULL DEFAULT 'bank' AFTER `status`,ADD COLUMN `benificiary_name` VARCHAR(255) NULL AFTER `type`,ADD COLUMN `upi_id` VARCHAR(200) NULL AFTER `benificiary_name`,ADD COLUMN `card_type` VARCHAR(45) NULL AFTER `upi_id`,ADD COLUMN `card_holder` VARCHAR(255) NULL AFTER `card_type`,ADD COLUMN `card_no` VARCHAR(255) NULL AFTER `card_holder`;"

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