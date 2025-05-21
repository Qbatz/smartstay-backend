const db = require('../config/connection');


function getMasterTypes(req, res) {
  console.log("getMasterTypes called");

  const contentType = req.query.content_type;
  if (!contentType) {
    return res.status(400).json({ success: false, error: "Missing content_type parameter" });
  }

  const sql = `
    SELECT id, name, content_type, description
    FROM smart_stay_qa.MasterTypes 
    WHERE content_type = ? 
    ORDER BY id ASC
  `;

  db.query(sql, [contentType], (err, rows) => {
    if (err) {
      console.error('Error fetching master types:', err);
      return res.status(500).json({ success: false, error: 'Server error' });
    }

    res.json({ success: true, data: rows });
  });
}

module.exports = { getMasterTypes }