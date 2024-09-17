const connection = require('./config/connection')

// Usage
const queries = [
    // Add Our Update Query
    `CREATE TABLE Hostel_Floor (
        id INT NOT NULL AUTO_INCREMENT,
        hostel_id INT NULL,
        floor_name VARCHAR(45) NULL DEFAULT 'Null',
        status TINYINT NULL,
        PRIMARY KEY (id));`,

    "ALTER TABLE transactions ADD COLUMN action INT NULL DEFAULT 1 AFTER createdAt",


    "ALTER TABLE assets ADD COLUMN `product_name` VARCHAR(255) NULL AFTER `vendor_id`;",

    "ALTER TABLE hostel ADD COLUMN created_by BIGINT(20) NULL DEFAULT '0' AFTER pending_advance",

    "ALTER TABLE createaccount ADD COLUMN customer_id VARCHAR(255) NULL DEFAULT '0' AFTER isEnable,ADD COLUMN plan_code VARCHAR(255) NULL AFTER customer_id",

    "ALTER TABLE createaccount ADD COLUMN plan_status INT NULL DEFAULT '0' AFTER plan_code",

    "CREATE TABLE subscribtion_history (`id` INT NOT NULL AUTO_INCREMENT,`customer_id` VARCHAR(255) NOT NULL,`plan_code` VARCHAR(45) NOT NULL,`amount` BIGINT(20) NOT NULL,`plan_status` INT(11) NULL DEFAULT '0',`plan_duration` INT(11) NULL DEFAULT '30',`startdate` DATE NOT NULL,`end_date` DATE NOT NULL,`createdat` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,`updateat` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,PRIMARY KEY (`id`))",

    "CREATE TABLE subscribtion_invoices (`id` INT NOT NULL AUTO_INCREMENT,`customer_id` VARCHAR(255) NOT NULL,`invoice_id` VARCHAR(255) NULL DEFAULT '0',`invoice_pdf` VARCHAR(255) NULL DEFAULT '0',`status` INT(11) NOT NULL DEFAULT '0',`createdat` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,`updateat` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,PRIMARY KEY (`id`))",

    "CREATE TABLE subscribtion_transactions (`id` INT NOT NULL AUTO_INCREMENT,`customer_id` VARCHAR(255) NOT NULL,`invoice_id` VARCHAR(255) NULL DEFAULT '0',`payment_type` VARCHAR(255) NULL DEFAULT '0',`status` INT(11) NOT NULL DEFAULT '0',`createdat` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,`updateat` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,PRIMARY KEY (`id`))",

    "ALTER TABLE subscribtion_history ADD COLUMN `subscribtion_id` VARCHAR(255) NULL AFTER `plan_code`;",

    "ALTER TABLE createaccount ADD COLUMN `subscription_id` VARCHAR(255) NULL DEFAULT '0' AFTER `customer_id`;",

    "ALTER TABLE subscribtion_history ADD COLUMN `plan_type` VARCHAR(45) NULL AFTER `plan_status`;",

    "ALTER TABLE subscribtion_history ADD COLUMN `payment_status` INT(11) NULL DEFAULT '0' AFTER `plan_duration`;",

    "ALTER TABLE subscribtion_transactions ADD COLUMN `amount` BIGINT(20) GENERATED ALWAYS AS () VIRTUAL AFTER `payment_type`;",

    "CREATE TABLE trial_plan_details (`id` BIGINT(20) NOT NULL AUTO_INCREMENT,`plan_code` VARCHAR(45) NULL,`user_id` BIGINT(20) NULL,`customer_id` VARCHAR(255) NULL,`subscription_id` VARCHAR(255) NULL,`plan_status` INT(11) NULL DEFAULT '0',`plan_duration` INT(11) NULL,`createdat` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,`updatedat` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,PRIMARY KEY (`id`));",

    "ALTER TABLE subscribtion_history ADD COLUMN `gst` VARCHAR(45) NULL AFTER `plan_type`,ADD COLUMN `gst_percentage` VARCHAR(45) NULL AFTER `gst`;",

    "ALTER TABLE subscribtion_history ADD COLUMN `payment_id` VARCHAR(255) NULL AFTER `plan_duration`;",

    "CREATE TABLE payment_settings (id INT NOT NULL AUTO_INCREMENT,key_id INT NULL,key_secret VARCHAR(60) NULL,description VARCHAR(70) NULL,status TINYINT NOT NULL DEFAULT 1,created_by INT NULL,created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,PRIMARY KEY (id));",

    "ALTER TABLE createaccount ADD COLUMN `user_status` INT(11) NULL DEFAULT '1' AFTER `createdat`,ADD COLUMN `plan_type` VARCHAR(45) NULL AFTER `user_status`;",

    "CREATE TABLE `country_list` (`country_id` INT NOT NULL AUTO_INCREMENT,`country_code` VARCHAR(45) NULL,`country_name` VARCHAR(255) NULL,`country_flag` VARCHAR(255) NULL,`currency_code` VARCHAR(255) NULL,`mobile_code` VARCHAR(45) NULL,`created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY (`country_id`));",

    "ALTER TABLE `hostel` ADD COLUMN `country_code` BIGINT(20) NULL AFTER `Phone`;",

    "ALTER TABLE `Hostel_Floor` CHANGE COLUMN `status` `status` TINYINT NULL DEFAULT 1;",

    "INSERT INTO `country_list` (`country_id`, `country_code`, `country_name`,`currency_code`, `mobile_code`,`country_flag`) VALUES ('1', '91', 'India', 'INR', '91','https://www.worldometers.info/img/flags/in-flag.gif');",
    // "DROP TABLE table_name" //asset_names
    "CREATE TABLE `product_names` (`product_id` BIGINT(20) NOT NULL,`product_name` VARCHAR(255) NULL,PRIMARY KEY (`product_id`));",

    "ALTER TABLE `assets` CHANGE COLUMN `asset_id` `asset_name` VARCHAR(255) NULL,CHANGE COLUMN `product_name` `product_id` BIGINT(20) NULL DEFAULT NULL ;"
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