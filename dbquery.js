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

    "ALTER TABLE `subscribtion_history` ADD COLUMN `gst` VARCHAR(45) NULL AFTER `plan_type`,ADD COLUMN `gst_percentage` VARCHAR(45) NULL AFTER `gst`;"

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