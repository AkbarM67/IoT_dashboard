const db = require('../db');

const findByDeviceId = async (deviceId) => {
  const res = await db.query('SELECT * FROM activations WHERE device_id = $1', [deviceId]);
  return res.rows;
};

const insertActivation = async (data) => {
  const sql = `
    INSERT INTO activations (
      owner, author, manufacturer, mikro_type,
      firmware_version, firmware_description, device_name,
      wifi_ssid, wifi_password, activation_date, deactivation_date,
      endpoint_url, io_pin, mac_address, device_id
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6, $7,
      $8, $9, $10, $11,
      $12, $13, $14, $15
    )
    RETURNING id
  `;
  const res = await db.query(sql, data);
  return res.rows[0];
};

const updateActivation = async (data) => {
  const sql = `
    UPDATE activations SET
      owner = $1, author = $2, manufacturer = $3, mikro_type = $4,
      firmware_version = $5, firmware_description = $6, device_name = $7,
      wifi_ssid = $8, wifi_password = $9, activation_date = $10, deactivation_date = $11,
      endpoint_url = $12, io_pin = $13, mac_address = $14
    WHERE device_id = $15
  `;
  await db.query(sql, data);
};

const getAllActivations = async () => {
  const result = await db.query(`
    SELECT * FROM activations
    ORDER BY activation_date DESC
  `);
  return result.rows;
};

module.exports = {
  findByDeviceId,
  insertActivation,
  updateActivation,
  getAllActivations,
};
