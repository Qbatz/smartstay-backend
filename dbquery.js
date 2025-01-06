const connection = require('./config/connection')

// Usage
const queries = [
    // Add Our Update Query
    // `CREATE TABLE Hostel_Floor (
    //     id INT NOT NULL AUTO_INCREMENT,
    //     hostel_id INT NULL,
    //     floor_name VARCHAR(45) NULL DEFAULT 'Null',
    //     status TINYINT NULL,
    //     PRIMARY KEY (id));`,

    // "ALTER TABLE transactions ADD COLUMN action INT NULL DEFAULT 1 AFTER createdAt",


    // "ALTER TABLE assets ADD COLUMN `product_name` VARCHAR(255) NULL AFTER `vendor_id`;",

    // "ALTER TABLE hostel ADD COLUMN created_by BIGINT(20) NULL DEFAULT '0' AFTER pending_advance",

    // "ALTER TABLE createaccount ADD COLUMN customer_id VARCHAR(255) NULL DEFAULT '0' AFTER isEnable,ADD COLUMN plan_code VARCHAR(255) NULL AFTER customer_id",

    // "ALTER TABLE createaccount ADD COLUMN plan_status INT NULL DEFAULT '0' AFTER plan_code",

    // "CREATE TABLE subscribtion_history (`id` INT NOT NULL AUTO_INCREMENT,`customer_id` VARCHAR(255) NOT NULL,`plan_code` VARCHAR(45) NOT NULL,`amount` BIGINT(20) NOT NULL,`plan_status` INT(11) NULL DEFAULT '0',`plan_duration` INT(11) NULL DEFAULT '30',`startdate` DATE NOT NULL,`end_date` DATE NOT NULL,`createdat` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,`updateat` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,PRIMARY KEY (`id`))",

    // "CREATE TABLE subscribtion_invoices (`id` INT NOT NULL AUTO_INCREMENT,`customer_id` VARCHAR(255) NOT NULL,`invoice_id` VARCHAR(255) NULL DEFAULT '0',`invoice_pdf` VARCHAR(255) NULL DEFAULT '0',`status` INT(11) NOT NULL DEFAULT '0',`createdat` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,`updateat` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,PRIMARY KEY (`id`))",

    // "CREATE TABLE subscribtion_transactions (`id` INT NOT NULL AUTO_INCREMENT,`customer_id` VARCHAR(255) NOT NULL,`invoice_id` VARCHAR(255) NULL DEFAULT '0',`payment_type` VARCHAR(255) NULL DEFAULT '0',`status` INT(11) NOT NULL DEFAULT '0',`createdat` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,`updateat` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,PRIMARY KEY (`id`))",

    // "ALTER TABLE subscribtion_history ADD COLUMN `subscribtion_id` VARCHAR(255) NULL AFTER `plan_code`;",

    // "ALTER TABLE createaccount ADD COLUMN `subscription_id` VARCHAR(255) NULL DEFAULT '0' AFTER `customer_id`;",

    // "ALTER TABLE subscribtion_history ADD COLUMN `plan_type` VARCHAR(45) NULL AFTER `plan_status`;",

    // "ALTER TABLE subscribtion_history ADD COLUMN `payment_status` INT(11) NULL DEFAULT '0' AFTER `plan_duration`;",

    // "ALTER TABLE subscribtion_transactions ADD COLUMN `amount` BIGINT(20) GENERATED ALWAYS AS () VIRTUAL AFTER `payment_type`;",

    // "CREATE TABLE trial_plan_details (`id` BIGINT(20) NOT NULL AUTO_INCREMENT,`plan_code` VARCHAR(45) NULL,`user_id` BIGINT(20) NULL,`customer_id` VARCHAR(255) NULL,`subscription_id` VARCHAR(255) NULL,`plan_status` INT(11) NULL DEFAULT '0',`plan_duration` INT(11) NULL,`createdat` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,`updatedat` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,PRIMARY KEY (`id`));",

    // "ALTER TABLE subscribtion_history ADD COLUMN `gst` VARCHAR(45) NULL AFTER `plan_type`,ADD COLUMN `gst_percentage` VARCHAR(45) NULL AFTER `gst`;",

    // "ALTER TABLE subscribtion_history ADD COLUMN `payment_id` VARCHAR(255) NULL AFTER `plan_duration`;",

    // "CREATE TABLE payment_settings (id INT NOT NULL AUTO_INCREMENT,key_id INT NULL,key_secret VARCHAR(60) NULL,description VARCHAR(70) NULL,status TINYINT NOT NULL DEFAULT 1,created_by INT NULL,created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,PRIMARY KEY (id));",

    // "ALTER TABLE createaccount ADD COLUMN `user_status` INT(11) NULL DEFAULT '1' AFTER `createdat`,ADD COLUMN `plan_type` VARCHAR(45) NULL AFTER `user_status`;",

    // "CREATE TABLE `country_list` (`country_id` INT NOT NULL AUTO_INCREMENT,`country_code` VARCHAR(45) NULL,`country_name` VARCHAR(255) NULL,`country_flag` VARCHAR(255) NULL,`currency_code` VARCHAR(255) NULL,`mobile_code` VARCHAR(45) NULL,`created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY (`country_id`));",

    // "ALTER TABLE `hostel` ADD COLUMN `country_code` BIGINT(20) NULL AFTER `Phone`;",

    // "ALTER TABLE `Hostel_Floor` CHANGE COLUMN `status` `status` TINYINT NULL DEFAULT 1;",

    // "INSERT INTO `country_list` (`country_id`, `country_code`, `country_name`,`currency_code`, `mobile_code`,`country_flag`) VALUES ('1', '91', 'India', 'INR', '91','https://www.worldometers.info/img/flags/in-flag.gif');",

    // "ALTER TABLE `assets` CHANGE COLUMN `asset_id` `asset_name` VARCHAR(255) NULL",

    // "ALTER TABLE `EbAmount` ADD COLUMN `date` DATE DEFAULT '0000-00-00' AFTER `EbAmount`",

    // "ALTER TABLE `invoicedetails` ADD COLUMN `action` VARCHAR(45) NULL DEFAULT 'auto' AFTER `numberofdays`;",

    // "CREATE TABLE `manual_invoice_amenities` (`id` BIGINT(20) NOT NULL AUTO_INCREMENT,`am_name` VARCHAR(255) NULL,`user_id` VARCHAR(255) NULL,`amount` BIGINT(20) NULL,`created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (`id`));",

    // "ALTER TABLE `manual_invoice_amenities` ADD COLUMN `invoice_id` BIGINT(20) NULL AFTER `created_at`;",

    // "ALTER TABLE `hostel` CHANGE COLUMN `Floor` `Floor` VARCHAR(255) NOT NULL ,CHANGE COLUMN `Rooms` `Rooms` VARCHAR(255) NOT NULL ,CHANGE COLUMN `Bed` `Bed` VARCHAR(255) NOT NULL ;",

    // "ALTER TABLE `EbAmount` CHANGE COLUMN `date` `date` DATE NULL DEFAULT NULL ;",

    // "CREATE TABLE `bookings` (`id` BIGINT(20) NOT NULL AUTO_INCREMENT,`first_name` VARCHAR(255) NULL,`last_name` VARCHAR(255) NULL,`joining_date` DATE NULL,`amount` VARCHAR(45) NULL,`hostel_id` BIGINT(20) NULL,`floor_id` BIGINT(20) NULL,`room_id` BIGINT(20) NULL,`bed_id` BIGINT(20) NULL,`comments` VARCHAR(255) NULL,`status` BIGINT(20) NULL DEFAULT 1,`created_by` BIGINT(20) NULL,`createdat` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY (`id`));",

    // "CREATE TABLE `customer_eb_amount` (`id` BIGINT(20) NOT NULL AUTO_INCREMENT,`user_id` BIGINT(20) NULL,`start_meter` BIGINT(20) NULL,`end_meter` BIGINT(20) NULL,`unit` VARCHAR(255) NULL,`amount` VARCHAR(45) NULL,`status` INT NULL DEFAULT 0,`created_by` BIGINT(20) NULL,`createdat` VARCHAR(45) NULL DEFAULT 'CURRENT_TIMESTAMP',PRIMARY KEY (`id`));",

    // "ALTER TABLE `hostel` CHANGE COLUMN `customer_Role` `customer_Role` VARCHAR(55) NULL DEFAULT 'user' ;",

    // "ALTER TABLE `EbAmount` ADD COLUMN `initial_date` DATE NULL AFTER `date`,CHANGE COLUMN `EbAmount` `EbAmount` BIGINT(20) NULL DEFAULT NULL AFTER `end_Meter_Reading`,CHANGE COLUMN `createAt` `createAt` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP AFTER `Eb_Unit`;",

    // "ALTER TABLE `customer_eb_amount` CHANGE COLUMN `createdat` `createdat` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ;",

    // "ALTER TABLE `customer_eb_amount` ADD COLUMN `date` DATE NULL AFTER `amount`,CHANGE COLUMN `status` `status` INT(11) NULL DEFAULT 1 ;",

    // "ALTER TABLE `hostel` ADD COLUMN `joining_Date` DATE NULL AFTER `created_by`;",

    // "ALTER TABLE `hosteldetails` ADD COLUMN `image1` VARCHAR(255) NULL AFTER `Bed`,ADD COLUMN `image2` VARCHAR(255) NULL AFTER `image1`,ADD COLUMN `image3` VARCHAR(255) NULL AFTER `image2`,ADD COLUMN `image4` VARCHAR(255) NULL AFTER `image3`;",


    // "CREATE TABLE `customer_walk_in_details` (`id` INT NOT NULL AUTO_INCREMENT,`customer_Name` VARCHAR(65) NULL,`email_Id` VARCHAR(85) NULL,`mobile_Number` BIGINT NULL,`booking_Date` DATE NULL,`joining_Date` DATE NULL,`created_At` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,`created_By` INT NULL,PRIMARY KEY (`id`));",

    // "ALTER TABLE `customer_walk_in_details` ADD COLUMN `comments` VARCHAR(255) NULL AFTER `created_By`",

    // "ALTER TABLE `customer_walk_in_details` ADD COLUMN `isActive` TINYINT NULL DEFAULT 1 AFTER `comments`",

    // "ALTER TABLE `Vendor` ADD COLUMN `Country` INT NULL AFTER `Business_Name`,ADD COLUMN `Pincode` INT NULL AFTER `Country`;",


    "ALTER TABLE `hostel` ADD COLUMN `checkout_comment` VARCHAR(255) NULL AFTER `joining_Date`;",

    "ALTER TABLE `hosteldetails` CHANGE COLUMN `email_id` `email_id` VARCHAR(255) NULL ;",

    "ALTER TABLE `customer_walk_in_details` CHANGE COLUMN `walk_in_Date` `walk_In_Date` DATE NULL DEFAULT NULL ;",

    "ALTER TABLE `bookings` ADD COLUMN `phone_number` VARCHAR(45) NULL AFTER `createdat`, ADD COLUMN `email_id` VARCHAR(100) NULL AFTER `phone_number`, ADD COLUMN `room_rent` BIGINT NULL AFTER `email_id`, ADD COLUMN `address` VARCHAR(200) NULL AFTER `room_rent`;",

    "ALTER TABLE `Vendor` CHANGE COLUMN `Country` `Country` VARCHAR(100) NULL DEFAULT NULL ;",

    "ALTER TABLE `invoicedetails` ADD COLUMN `advance_amount` BIGINT(20) NULL DEFAULT 0 AFTER `EbAmount`;",

    "ALTER TABLE `bed_details` ADD COLUMN `booking_id` BIGINT(20) NULL DEFAULT '0' AFTER `isfilled`,ADD COLUMN `isbooked` INT(11) NULL DEFAULT '0' AFTER `booking_id`;",

    "CREATE TABLE `bankings` (`id` BIGINT(20) NOT NULL AUTO_INCREMENT,`acc_name` VARCHAR(255) NULL,`acc_num` BIGINT(20) NULL DEFAULT 0,`bank_name` VARCHAR(255) NULL,`ifsc_code` VARCHAR(45) NULL,`description` VARCHAR(255) NULL,`setus_default` INT(11) NULL,`balance` BIGINT(20) NULL,`status` INT(11) NULL DEFAULT 1,`createdby` BIGINT(20) NULL,`createdat` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY (`id`));",

    "CREATE TABLE `bank_transactions` (`id` INT NOT NULL AUTO_INCREMENT,`bank_id` BIGINT(20) NULL,`date` DATE NULL,`amount` BIGINT(20) NULL DEFAULT 0,`desc` VARCHAR(255) NULL,`type` INT(11) NULL,`status` INT(11) NULL,`createdby` BIGINT(20) NULL,`createdat` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY (`id`));",

    "ALTER TABLE `bank_transactions` ADD COLUMN `edit_id` BIGINT(20) NULL DEFAULT 0 AFTER `bank_id`;",

    "ALTER TABLE `transactions` ADD COLUMN `description` VARCHAR(255) NULL AFTER `action`,CHANGE COLUMN `action` `action` INT(11) NULL DEFAULT '1' AFTER `status`;",

    "ALTER TABLE `bank_transactions` ADD COLUMN `description` VARCHAR(255) NULL AFTER `desc`;",

    "CREATE TABLE `roles` (`id` BIGINT(20) NOT NULL,`role_name` VARCHAR(255) NULL,`status` INT(11) NULL DEFAULT 1,`createdby` BIGINT(20) NULL,`createdat` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY (`id`));",

    "CREATE TABLE `role_permissions` (`id` BIGINT(20) NOT NULL,`role_id` BIGINT(20) NULL,`per_view` INT(11) NULL,`per_create` INT(11) NULL,`per_edit` INT(11) NULL,`per_delete` INT(11) NULL,PRIMARY KEY (`id`));",

    "ALTER TABLE `role_permissions` ADD COLUMN `permission_id` INT(11) NULL AFTER `role_id`;",

    "ALTER TABLE `createaccount` ADD COLUMN `user_type` VARCHAR(45) NULL DEFAULT 'admin' AFTER `plan_type`;",

    "CREATE TABLE `permissions` (`id` BIGINT(11) NOT NULL AUTO_INCREMENT,`permission_name` VARCHAR(255) NULL,PRIMARY KEY (`id`));",

    "INSERT INTO `permissions` (`id`, `permission_name`) VALUES ('1', 'Dashboard'),('2', 'Announcement'),('3', 'Updates'),('4', 'Paying Guest'),('5', 'Customers'),('6', 'Bookings'),('7', 'Check out'),('8', 'Walk In'),('9', 'Assets'),('10', 'Vendor'),('11', 'Bills'),('12', 'Recuring Bills'),('13', 'Electricity'),('14', 'Complaints'),('15', 'Expenses'),('16', 'Reports'),('17', 'Bankings'),('18', 'Profile'),('19', 'Amenities');",

    "ALTER TABLE `roles` CHANGE COLUMN `id` `id` BIGINT(20) NOT NULL AUTO_INCREMENT ;",

    "ALTER TABLE `role_permissions` CHANGE COLUMN `id` `id` BIGINT(20) NOT NULL AUTO_INCREMENT ;",

    "ALTER TABLE `createaccount` ADD COLUMN `role_id` BIGINT(20) NULL DEFAULT 0 AFTER `user_type`;",

    "ALTER TABLE `createaccount` ADD COLUMN `description` VARCHAR(255) NULL DEFAULT 0 AFTER `user_type`;",

    "ALTER TABLE `expenses` ADD COLUMN `bank_id` BIGINT(20) NULL DEFAULT 0 AFTER `room_id`;",

    "ALTER TABLE `createaccount` ADD COLUMN `createdby` BIGINT(20) NULL DEFAULT 0 AFTER `role_id`;",

    "ALTER TABLE `assets` ADD COLUMN `payment_mode` VARCHAR(255) NULL AFTER `purchase_date`,ADD COLUMN `bank_id` BIGINT(20) NULL DEFAULT 0 AFTER `payment_mode`;",

    "ALTER TABLE `customer_eb_amount` ADD COLUMN `eb_id` BIGINT(20) NULL DEFAULT 0 AFTER `user_id`;",

    "ALTER TABLE `EbAmount` ADD COLUMN`status` INT(11) NULL DEFAULT '1' AFTER`Eb_Unit`;",

    "CREATE TABLE `room_readings` (`id` BIGINT(20) NOT NULL AUTO_INCREMENT,`hostel_id` BIGINT(20) NULL,`floor_id` BIGINT(20) NULL,`room_id` BIGINT(20) NULL,`date` DATE NULL,`reading` BIGINT(20) NULL,`total_amount` BIGINT(20) NULL,`total_reading` BIGINT(20) NULL,`status` INT NULL DEFAULT 1,`created_by` BIGINT(20) NULL,`createdat` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY (`id`));",

    "ALTER TABLE customer_eb_amount MODIFY COLUMN amount DECIMAL(10, 2);",

    "ALTER TABLE `invoicedetails` ADD COLUMN `invoice_status` INT(11) NULL DEFAULT 1 AFTER `hos_user_id`;",

    "ALTER TABLE `subscribtion_history` ADD COLUMN `event_id` VARCHAR(255) NULL AFTER `updateat`;",

    "ALTER TABLE `eb_settings` ADD COLUMN `room_based` INT(11) NULL DEFAULT 0 AFTER `amount`,ADD COLUMN `hostel_based` INT(11) NUL DEFAULT 0L AFTER `room_based`,ADD COLUMN `recuring` INT(11) NULL AFTER `hostel_based`,ADD COLUMN `start_date` DATE NULL AFTER `recuring`,ADD COLUMN `end_date` DATE NULL AFTER `start_date`,ADD COLUMN `duration` VARCHAR(45) NULL AFTER `end_date`;",

    "ALTER TABLE `hosteldetails` ADD COLUMN `recure` INT(11) NULL DEFAULT 0 AFTER `image4`,ADD COLUMN `inv_startdate` DATE NULL AFTER `recure`,ADD COLUMN `inv_enddate` DATE NULL AFTER `inv_startdate`,ADD COLUMN `duration` VARCHAR(45) NULL AFTER `inv_enddate`,CHANGE COLUMN `created_By` `created_By` INT(11) NOT NULL AFTER `duration`,CHANGE COLUMN `create_At` `create_At` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `created_By`;",

    "ALTER TABLE `Amenities` ADD COLUMN`recuring` INT(11) NULL DEFAULT 0 AFTER`Amnities_Id`,ADD COLUMN`startdate` DATE NULL AFTER`recuring`,ADD COLUMN`enddate` DATE NULL AFTER`startdate`,ADD COLUMN`duration` VARCHAR(45) NULL AFTER`enddate`,ADD COLUMN`createdat` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP AFTER`createdBy`; ",

    "ALTER TABLE `Expense_Category_Name` ADD COLUMN `hostel_id` BIGINT(20) NULL AFTER `category_Name`;",

    "ALTER TABLE `Expense_Subcategory_Name` ADD COLUMN `hostel_id` BIGINT(20) NULL AFTER `subcategory`;",

    "ALTER TABLE `complaint_type` ADD COLUMN `hostel_id` BIGINT(20) NULL AFTER `complaint_name`;",

    "ALTER TABLE `hosteldetails` ADD COLUMN `inv_date` DATE NULL AFTER `duration`,ADD COLUMN `due_date` DATE NULL AFTER `inv_date`;",

    "ALTER TABLE `hosteldetails` CHANGE COLUMN `inv_startdate` `inv_startdate` INT(11) NULL DEFAULT NULL ,CHANGE COLUMN `inv_enddate` `inv_enddate` INT(11) NULL ;",

    "ALTER TABLE `eb_settings` CHANGE COLUMN `start_date` `start_date` INT(11) NULL DEFAULT NULL ,CHANGE COLUMN `end_date` `end_date` INT(11) NULL DEFAULT NULL ;",

    "ALTER TABLE `Amenities` CHANGE COLUMN `startdate` `startdate` INT(11) NULL DEFAULT NULL ,CHANGE COLUMN `enddate` `enddate` INT(11) NULL DEFAULT NULL ;",

    "ALTER TABLE `hosteldetails` ADD COLUMN `inv_date` DATE NULL AFTER `duration`,ADD COLUMN `due_date` DATE NULL AFTER `inv_date`;",

    "ALTER TABLE `roles` ADD COLUMN `hostel_id` BIGINT(20) NULL AFTER `role_name`;",

    "ALTER TABLE `customer_eb_amount` ADD COLUMN `type` VARCHAR(45) NULL DEFAULT 'room' AFTER `date`;",

    "CREATE TABLE `hostel_readings` (`id` BIGINT(20) NOT NULL,`hostel_id` BIGINT(20) NULL,`date` DATE NULL,`reading` VARCHAR(45) NULL,`total_amount` BIGINT(20) NULL,`total_reading` BIGINT(20) NULL,`status` INT(11) NULL DEFAULT 1,`created_by` BIGINT(20) NULL,`createdat` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY (`id`));",

    "ALTER TABLE `hostel_readings` CHANGE COLUMN `id` `id` BIGINT(20) NOT NULL AUTO_INCREMENT ;",

    "ALTER TABLE `bookings` ADD COLUMN `profile` VARCHAR(255) NULL DEFAULT 0 AFTER `address`;",

    "ALTER TABLE `hostel` ADD COLUMN `req_date` DATE NULL AFTER `checkout_comment`;",

    "ALTER TABLE `hostel` ADD COLUMN `return_advance` BIGINT(20) NULL DEFAULT 0 AFTER `req_date`;",

    "CREATE TABLE `contacts` (`id` INT NOT NULL AUTO_INCREMENT,`user_name` VARCHAR(255) NULL,`guardian` VARCHAR(255) NULL,`mob_no` BIGINT(20) NULL,`address` VARCHAR(255) NULL,`user_id` BIGINT(20) NULL,`status` INT NULL DEFAULT 1,`created_by` BIGINT(20) NULL,`createdat` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY (`id`));",

    "CREATE TABLE `reassign_userdetails` (`id` BIGINT(20) NOT NULL AUTO_INCREMENT,`user_id` BIGINT(20) NULL,`hostel_id` BIGINT(20) NULL,`old_floor` BIGINT(20) NULL,`old_room` BIGINT(20) NULL,`new_floor` BIGINT(20) NULL,`new_room` BIGINT(20) NULL,`new_bed` BIGINT(20) NULL,`reassign_date` DATE NULL,`status` INT NULL,`created_by` BIGINT(20) NULL,`createdat` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY (`id`));",

    "ALTER TABLE `hostel` ADD COLUMN `reassign_date` DATE NULL AFTER `return_advance`;",

    "ALTER TABLE `reassign_userdetails` ADD COLUMN `old_bed` BIGINT(20) NULL AFTER `old_room`;",

    "ALTER TABLE `bank_transactions` ADD COLUMN `hostel_id` BIGINT(20) NULL AFTER `description`;",

    "ALTER TABLE `customer_walk_in_details` ADD COLUMN `hostel_id` BIGINT(20) NULL AFTER `joining_Date`,CHANGE COLUMN `created_By` `created_By` INT(11) NULL DEFAULT NULL AFTER `isActive`,CHANGE COLUMN `created_At` `created_At` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_By`;",

    "ALTER TABLE `bankings` ADD COLUMN `hostel_id` BIGINT(20) NULL AFTER `balance`;",

    "CREATE TABLE otp_verification (id INT AUTO_INCREMENT PRIMARY KEY,phone_number VARCHAR(15) NOT NULL,otp VARCHAR(6) NOT NULL,expires_at DATETIME NOT NULL,verified BOOLEAN DEFAULT FALSE,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP); ",

    "CREATE TABLE `announcements` (`id` BIGINT(20) NOT NULL AUTO_INCREMENT,`title` VARCHAR(45) NULL,`description` LONGTEXT NULL,`status` INT NULL DEFAULT 1,`hostel_id` BIGINT(20) NULL,`created_by` BIGINT(20) NULL,`createdat` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY (`id`));"

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