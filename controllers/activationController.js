const activationModel = require('../models/activationModel');
const logModel = require('../models/logModel');
const db = require('../db'); // Assuming you have a db.js for database connection

const activateDevice = async (req, res) => {
  const {
    device_configuration,
    wifi_configuration,
    io_configuration,
    activation,
    endpoint_configuration: endpoint,
  } = req.body;

  const deviceId = device_configuration?.deviceId;
  if (!deviceId) {
    return res.status(400).json({ message: 'deviceId wajib diisi.', status: false });
  }

  const deviceExists = await activationModel.findByDeviceId(deviceId);

  const dataParams = [
    device_configuration?.owner_name || 'Unknown',
    device_configuration?.author || 'Unknown',
    device_configuration?.Manufacturer || 'Unknown',
    device_configuration?.["MicroController Type"] || 'Unknown',
    device_configuration?.["Firmware Version"] || '1.0.0',
    device_configuration?.["Firmware Description"] || '',
    device_configuration?.device_name || 'Unknown',
    wifi_configuration?.wifi_ssid || '',
    wifi_configuration?.wifi_password || '',
    activation?.activationDate || null,
    activation?.deactivationDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    endpoint?.endpoint_url || 'localhost:3000/activate',
    io_configuration?.io_pin || '',
    device_configuration?.mac_address || '',
    deviceId
  ];

  if (deviceExists.length > 0) {
    await activationModel.updateActivation(dataParams);
    await logModel.addLog('Update Aktivasi', dataParams[0], `Perangkat ${deviceId} diperbarui`, req.body);
    return res.json({ message: 'Aktivasi diperbarui', status: true, deviceId });
  } else {
    const result = await activationModel.insertActivation(dataParams);
    await logModel.addLog('Tambah Aktivasi', dataParams[0], `Perangkat ${deviceId} ditambahkan`, req.body);
    return res.status(201).json({ message: 'Aktivasi ditambahkan', status: true, activationId: result.id, deviceId });
  }
};

const addActivation = async (req, res) => {
   try {
    const {
      device_id,
      owner,
      author,
      manufacturer,
      mikro_type,
      firmware_version,
      activation_date
    } = req.body;

    if (!device_id || !owner || !author || !manufacturer || !mikro_type || !firmware_version) {
      return res.status(400).json({ message: "Semua kolom wajib diisi.", status: false });
    }

    const insertQuery = `
      INSERT INTO activations (
        device_id, owner, author, manufacturer, mikro_type, firmware_version, activation_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    await db.query(insertQuery, [
      device_id,
      owner,
      author,
      manufacturer,
      mikro_type,
      firmware_version,
      activation_date || null
    ]);

    return res.status(201).json({ message: "Aktivasi berhasil disimpan.", status: true });

  } catch (error) {
    console.error("Error addActivation:", error);
    return res.status(500).json({ message: "Terjadi kesalahan server.", error: error.message, status: false });
  }
}

const getActivationsForMobile = async (req, res) => {
  try {
    const activations = await activationModel.getAllActivations(); // Pastikan model ini meng-join devices juga

    const now = new Date();

    const formatted = activations.map(row => {
      const isActive = now >= row.activation_date && now <= row.deactivation_date;

      return {
        device_id: row.device_id,
        device_name: row.device_name || "Unknown",
        owner: row.owner,
        activation_date: row.activation_date,
        deactivation_date: row.deactivation_date,
        mac_address: row.mac_address || "",
        manufacturer: row.manufacturer || "Unknown",
        mikro_type: row.mikro_type || "Unknown",
        firmware_version: row.firmware_version || "1.0.0",
        firmware_description: row.firmware_description || "",
        wifi_ssid: row.wifi_ssid || "",
        wifi_password: row.wifi_password || "",
        io_pin: row.io_pin || "",
        endpoint_url: row.endpoint_url || "localhost:3000/activate",
        status: isActive ? "Aktif" : "Nonaktif",
        is_active: isActive,
        activation_date_formatted: new Date(row.activation_date).toLocaleDateString('id-ID'),
        deactivation_date_formatted: new Date(row.deactivation_date).toLocaleDateString('id-ID')
      };
    });

    res.json({
      success: true,
      message: "Data aktivasi berhasil diambil",
      data: formatted,
      total: formatted.length
    });

  } catch (error) {
    console.error("❌ Gagal ambil data activations:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data aktivasi",
      error: error.message
    });
  }
};


module.exports = { 
  activateDevice,
  getActivationsForMobile,// ← pastikan di-export
  addActivation,
};
