const db = require('../config/connection');

const addNotificationType = (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, error: 'Name is required' });
  }

  const sql = `INSERT INTO NotificationTypes (name, description) VALUES (?, ?)`;

  db.query(sql, [name, description || null], (err, result) => {
    if (err) {
      console.error('Error adding notification type:', err);
      return res.status(201).json({ success: false, error: 'Database error' });
    }

    res.status(201).json({ success: true, message: 'Notification type added', insertedId: result.insertId });
  });
};

const getNotificationTypes = (req, res) => {
  const sql = `SELECT * FROM NotificationTypes ORDER BY id ASC`;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching notification types:', err);
      return res.status(201).json({ success: false, error: 'Database error' });
    }

    res.json({ success: true, data: results });
  });
};

module.exports = { addNotificationType,getNotificationTypes }