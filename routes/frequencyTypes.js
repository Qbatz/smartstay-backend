const db = require('../config/connection');


function getFrequencyTypes(req, res) {
  console.log("frequencyTypes");

  db.query('SELECT * FROM RecuringfreqTypes ORDER BY id ASC', (err, rows) => {
    if (err) {
      console.error('Error fetching frequencies:', err);
      return res.status(201).json({ success: false, error: 'Server error' });
    }

    res.json({ success: true, data: rows });
  });
}




function addFrequencyType(req, res) {
  const { frequency_type, interval_value, interval_unit, description } = req.body;

  if (!frequency_type || !interval_value || !interval_unit) {
    return res.status(201).json({ success: false, error: 'Missing required fields' });
  }

  const validUnits = ['DAY', 'WEEK', 'MONTH', 'YEAR'];
  if (!validUnits.includes(interval_unit.toUpperCase())) {
    return res.status(201).json({ success: false, error: 'Invalid interval_unit' });
  }

  // 🔧 No try/catch needed here since query uses callback
  db.query(
    'INSERT INTO RecuringfreqTypes (frequency_type, interval_value, interval_unit, description) VALUES (?, ?, ?, ?)',
    [frequency_type, interval_value, interval_unit.toUpperCase(), description || null],
    (err, result) => {
      if (err) {
        console.error('Insert error:', err);
        return res.status(201).json({ success: false, error: 'Database error' });
      }

      res.status(200).json({
        success: true,
        message: 'Frequency type added',
        insertedId: result.insertId
      });
    }
  );
}


module.exports = { addFrequencyType,getFrequencyTypes }
