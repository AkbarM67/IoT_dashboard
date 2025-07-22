const express = require('express');
const router = express.Router();
const activationController = require('../controllers/activationController');
const { activationListPage, activationFormPage } = require('../view/activationView');
const db = require('../db'); // koneksi PostgreSQL pool

// POST aktivasi device (controller)
router.post('/activate', activationController.activateDevice);
router.post('/activations/new', activationController.addActivation);
// GET data aktivasi untuk mobile (controller)
router.get('/activations', activationController.getActivationsForMobile);

// GET halaman daftar aktivasi (view)
router.get('/activation-list', (req, res) => {
  const sql = `
    SELECT 
      device_id,
      mac_address,
      owner,
      author,
      manufacturer,
      mikro_type,
      firmware_version,
      firmware_description,
      device_name,
      wifi_ssid,
      wifi_password,
      activation_date,
      deactivation_date,
      endpoint_url,
      io_pin,
      CASE 
        WHEN NOW() BETWEEN activation_date AND deactivation_date THEN 'Aktif'
        ELSE 'Nonaktif'
      END AS status
    FROM activations
    ORDER BY activation_date DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Gagal ambil data:', err);
      return res.send('❌ Gagal ambil data.');
    }

    res.send(activationListPage(results.rows)); // pastikan gunakan results.rows untuk pg
  });
});

// GET halaman form tambah aktivasi (view)
router.get('/activations/new', (req, res) => {
  res.send(activationFormPage());
});

module.exports = router;
