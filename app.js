const express = require("express");
const mysql = require("mysql2");
const { activationPage } = require("./view");
const app = express();
const port = 3000;

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// DB Connection
const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "iot_activation",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});



const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Ganti dengan secret key yang kuat dan simpan di environment variable (.env)
const JWT_SECRET = process.env.JWT_SECRET || '88619d09c9896ce82f164d48a13765b2';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

((err) => {
  if (err) {
    console.error("❌ DB gagal terkoneksi:", err);
    process.exit(1);
  }
  console.log("✅ Koneksi DB berhasil");
});



function logEvent(eventType, actor, description, detailsObj) {
  const sql = `INSERT INTO logs (event_type, actor, description, details) VALUES (?, ?, ?, ?)`;
  const params = [
    eventType,
    actor || 'System',
    description,
    JSON.stringify(detailsObj)
  ];

  db.query(sql, params, (err) => {
    if (err) {
      console.error("❌ Gagal simpan log:", err);
    } else {
      console.log(`📝 Log dicatat: ${eventType}`);
    }
  });
}


/* ========== ENDPOINT IoT AKTIVASI ========== */
app.post("/activate", (req, res) => {
  const {
    device_configuration,
    wifi_configuration,
    io_configuration,
    activation,
    endpoint_configuration: endpoint,
  } = req.body;

  const deviceId = device_configuration?.deviceId;
  const deviceName = device_configuration?.device_name || "Unknown";
  const owner = device_configuration?.owner_name || "Unknown";
  const author = device_configuration?.author || "Unknown";
  const macAddress = device_configuration?.mac_address || "";
  const manufacturer = device_configuration?.Manufacturer || "Unknown";
  const mikroType = device_configuration?.["MicroController Type"] || "Unknown";
  const firmwareVersion = device_configuration?.["Firmware Version"] || "1.0.0";
  const firmwareDescription = device_configuration?.["Firmware Description"] || "";
  const activationDate = activation?.activationDate || null;
  const deactivationDate = activation?.deactivationDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const wifiSsid = wifi_configuration?.wifi_ssid || "";
  const wifiPassword = wifi_configuration?.wifi_password || "";
  const endpointUrl = endpoint?.endpoint_url || "localhost:3000/activate";
  const ioPin = io_configuration?.io_pin || "";

  if (!deviceId) {
    return res.status(400).json({
      message: "deviceId wajib diisi.",
      status: false
    });
  }

  db.query(
    "SELECT * FROM activations WHERE device_id = ?",
    [deviceId],
    (err2, existing) => {
      if (err2) return res.status(500).json({ error: err2 });

      const queryParams = [
        owner,
        author,
        manufacturer,
        mikroType,
        firmwareVersion,
        firmwareDescription,
        deviceName,
        wifiSsid,
        wifiPassword,
        activationDate,
        deactivationDate,
        endpointUrl,
        ioPin,
        macAddress,
        deviceId
      ];

      if (existing.length > 0) {
        // UPDATE DATA
        db.query(
          `UPDATE activations SET 
          owner = ?, 
          author = ?, 
          manufacturer = ?, 
          mikro_type = ?,
          firmware_version = ?, 
          firmware_description = ?, 
          device_name = ?,
          wifi_ssid = ?,
          wifi_password = ?,
          activation_date = ?, 
          deactivation_date = ?,
          endpoint_url = ?,
          io_pin = ?,
          mac_address = ?
        WHERE device_id = ?`,
          queryParams,
          (err3) => {
            if (err3)
              return res.status(500).json({
                message: "Gagal update aktivasi",
                error: err3
              });

            logEvent(
              "Update Aktivasi",
              owner,
              `Perangkat ${deviceId} diupdate oleh ${owner}`,
              {
                deviceId,
                deviceName,
                owner,
                endpointUrl,
                operation: "UPDATE",
                payload: req.body
              }
            );

            return res.status(200).json({
              message: "Aktivasi diperbarui",
              status: true,
              deviceId
            });
          }
        );

      } else {
        // INSERT DATA BARU
        db.query(
          `INSERT INTO activations (
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
          mac_address,
          device_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          queryParams,
          (err4, result) => {
            if (err4)
              return res.status(500).json({
                message: "Gagal insert aktivasi",
                error: err4
              });

            logEvent(
              "Tambah Aktivasi",
              owner,
              `Perangkat ${deviceId} ditambahkan oleh ${owner}`,
              {
                deviceId,
                deviceName,
                owner,
                endpointUrl,
                operation: "INSERT",
                payload: req.body
              }
            );

            return res.status(201).json({
              message: "Aktivasi berhasil ditambahkan",
              status: true,
              activationId: result.insertId,
              deviceId
            });
          }
        );
      }
    }
  );
});

app.get("/api/logs", (req, res) => {
  let page = parseInt(req.query.page) || 1;
  let limit = parseInt(req.query.limit) || 50;
  let offset = (page - 1) * limit;

  // Hitung total log
  db.query("SELECT COUNT(*) AS total FROM logs", (countErr, countResult) => {
    if (countErr) {
      return res.status(500).json({
        success: false,
        message: "Gagal menghitung total log",
        error: countErr.message
      });
    }

    const totalLogs = countResult[0].total;
    const totalPages = Math.ceil(totalLogs / limit);

    // Ambil data log dengan pagination
    const sql = `
      SELECT 
        id,
        event_time,
        event_type,
        actor,
        description,
        details
      FROM logs
      ORDER BY event_time DESC
      LIMIT ? OFFSET ?
    `;

    db.query(sql, [limit, offset], (err, results) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Gagal mengambil data log",
          error: err.message
        });
      }

      res.json({
        success: true,
        message: "Data log berhasil diambil",
        data: results.map(row => ({
          id: row.id,
          event_time: row.event_time,
          event_type: row.event_type,
          actor: row.actor,
          description: row.description,
          details: JSON.parse(row.details) // kirim full JSON detail
        })),
        pagination: {
          current_page: page,
          limit_per_page: limit,
          total_logs: totalLogs,
          total_pages: totalPages
        }
      });
    });
  });
});

app.get("/api/config/:mac", (req, res) => {
  const mac = req.params.mac;

  if (!mac) {
    return res.status(400).json({ success: false, message: "MAC address wajib diisi" });
  }

  const sql = `
    SELECT 
      device_id,
      device_name,
      owner,
      author,
      manufacturer,
      mikro_type,
      firmware_version,
      firmware_description,
      wifi_ssid,
      wifi_password,
      io_pin,
      endpoint_url,
      activation_date,
      deactivation_date
    FROM activations
    WHERE mac_address = ?
    LIMIT 1
  `;

  db.query(sql, [mac], (err, result) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Gagal mengambil konfigurasi",
        error: err.message,
      });
    }

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Konfigurasi tidak ditemukan untuk MAC tersebut",
      });
    }

    const row = result[0];

    const config = {
      device_configuration: {
        deviceId: row.device_id,
        device_name: row.device_name,
        owner_name: row.owner,
        author: row.author,
        mac_address: mac,
        Manufacturer: row.manufacturer,
        "MicroController Type": row.mikro_type,
        "Firmware Version": row.firmware_version,
        "Firmware Description": row.firmware_description,
      },
      wifi_configuration: {
        wifi_ssid: row.wifi_ssid,
        wifi_password: row.wifi_password,
      },
      io_configuration: {
        io_pin: row.io_pin,
      },
      endpoint_configuration: {
        endpoint_url: row.endpoint_url,
      },
      activation: {
        activationDate: row.activation_date,
        deactivationDate: row.deactivation_date,
      }
    };

    res.json({
      success: true,
      message: "Konfigurasi berhasil ditemukan",
      data: config,
    });
  });
});




/* ========== FORM TAMBAH AKTIVASI ========== */
app.get("/activations/new", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8" />
      <title>Tambah DeviceID</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-blue-50 p-8 min-h-screen font-sans">

      <!-- Tombol Kembali -->
      <div class="mb-4">
        <a href="/activations" class="text-blue-700 hover:text-blue-900 text-lg font-medium">
          ← Kembali
        </a>
      </div>

      <!-- Judul -->
      <h1 class="text-3xl font-bold text-blue-800 mb-8">
        Tambah DeviceID
      </h1>

      <!-- Form -->
      <form id="deviceForm">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            
          <!-- Device ID -->
          <div class="mb-6">
            <label for="deviceId" class="block text-lg font-medium text-blue-800 mb-2">
              Device ID *
            </label>
            <input
              type="text"
              id="deviceId"
              name="deviceId"
              required
              class="w-full px-4 py-3 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              placeholder="Masukkan Device ID"
            />
          </div>

          <!-- Mikrolontroler Type -->
          <div class="mb-6">
            <label for="mikroType" class="block text-lg font-medium text-blue-800 mb-2">
              Mikrolontroler Type
            </label>
            <input
              type="text"
              id="mikroType"
              name="mikroType"
              class="w-full px-4 py-3 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              placeholder="Contoh: ESP32, Arduino Uno, etc."
            />
          </div>
        </div>

        <div class="mt-8">
          <button
            type="submit"
            class="bg-blue-600 hover:bg-blue-700 text-white text-lg font-medium px-6 py-3 rounded shadow"
          >
            Simpan Aktivasi
          </button>
        </div>
      </form>

    </body>
    </html>
  `);
});

app.post("/activations/new", async (req, res) => {
  const {
    deviceId,
    macAddress,
    manufacturer,
    mikroType,
    firmwareVersion,
    firmwareDescription,
    wifiConfiguration,
    ioConfiguration
  } = req.body;

  if (!deviceId) {
    return res.status(400).send(
      'Device ID wajib diisi. <a href="/activations/new">Kembali</a>'
    );
  }

  const owner = "Unknown";
  const author = "System";
  const activationDate = null;
  const deactivationDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 tahun

  try {
    // 1. Pastikan device ada di tabel devices
    const [deviceExists] = await db.promise().query(
      "SELECT id FROM devices WHERE id = ?",
      [deviceId]
    );

    if (deviceExists.length === 0) {
      // Tambahkan device jika belum ada
      await db.promise().query(
        "INSERT INTO devices (id, name) VALUES (?, ?)",
        [deviceId, "Unknown"]
      );
    }

    // 2. Simpan aktivasi
    await db.promise().query(
      `INSERT INTO activations (
        device_id, 
        owner,
        author,
        activation_date, 
        deactivation_date,
        mac_address,
        manufacturer,
        mikro_type,
        firmware_version,
        firmware_description,
        wifi_ssid,
        wifi_password,
        io_pin
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        deviceId,
        owner,
        author,
        activationDate,
        deactivationDate,
        macAddress || "",
        manufacturer || "Unknown",
        mikroType || "Unknown",
        firmwareVersion || "1.0.0",
        firmwareDescription || "",
        wifiConfiguration?.ssid || "",
        wifiConfiguration?.password || "",
        ioConfiguration || ""
      ]
    );

    res.redirect("/activations?success=true");

  } catch (err) {
    console.error("Error saat menyimpan aktivasi:", err);
    res.status(500).send(`
      <div class="p-4 bg-red-100 text-red-800 rounded mb-4">
        Gagal menyimpan aktivasi: ${err.message}
      </div>
      <a href="/activations/new" class="text-blue-600 hover:underline">Coba lagi</a>
    `);
  }
});

/* ========== TABEL AKTIVASI ========== */
app.get("/activations", (req, res) => {
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
      console.log(err)
      return res.send("❌ Gagal ambil data.");
    };

    let html = `
<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <title>Daftar Aktivasi</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-blue-50 p-8 min-h-screen font-sans">

    <div class="flex items-center mb-6">
      <img src="/Logo_Makerindo.png" alt="Logo" class="w-20 h-20 mr-5" />
    </div>
    <div class="flex border justify-between items-center px-4 py-2">
      <h2 class="text-3xl font-bold text-blue-800">Daftar Aktivasi Perangkat</h2>
      <button onclick="toggleModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
        Tambah DeviceId
      </button>
    </div>
    <div class="shadow rounded-lg border border-blue-200 overflow-x-auto">
      <div class="max-h-[600px] overflow-y-auto">
        <table class="min-w-full text-sm text-left divide-y divide-blue-200">
          <thead class="bg-blue-100 text-blue-800 uppercase text-xs font-semibold sticky top-0 z-10">
            <tr>
              <th class="px-3 py-3">Device ID</th>
              <th class="px-3 py-3">MAC</th>
              <th class="px-3 py-3">Owner</th>
              <th class="px-3 py-3">Author</th>
              <th class="px-3 py-3">Manufacturer</th>
              <th class="px-3 py-3">Mikro Type</th>
              <th class="px-3 py-3">Firmware</th>
              <th class="px-3 py-3">Description</th>
              <th class="px-3 py-3">Device Name</th>
              <th class="px-3 py-3">WiFi SSID</th>
              <th class="px-3 py-3">Activation</th>
              <th class="px-3 py-3">Deactivation</th>
              <th class="px-3 py-3">Endpoint</th>
              <th class="px-3 py-3">I/O Pin</th>
              <th class="px-3 py-3">Status</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-blue-100">
    `;

    results.forEach(row => {
      html += `
        <tr class="hover:bg-blue-50">
          <td class="px-3 py-3 font-mono text-xs">${row.device_id}</td>
          <td class="px-3 py-3 font-mono text-xs">${row.mac_address}</td>
          <td class="px-3 py-3">${row.owner}</td>
          <td class="px-3 py-3">${row.author}</td>
          <td class="px-3 py-3">${row.manufacturer}</td>
          <td class="px-3 py-3">${row.mikro_type || "Unknown"}</td>
          <td class="px-3 py-3">${row.firmware_version}</td>
          <td class="px-3 py-3">${row.firmware_description}</td>
          <td class="px-3 py-3">${row.device_name}</td>
          <td class="px-3 py-3 font-mono text-xs">${row.wifi_ssid}</td>
          <td class="px-3 py-3 text-xs">${new Date(row.activation_date).toLocaleString()}</td>
          <td class="px-3 py-3 text-xs">${new Date(row.deactivation_date).toLocaleString()}</td>
          <td class="px-3 py-3 font-mono text-xs">${row.endpoint_url}</td>
          <td class="px-3 py-3">${row.io_pin}</td>
          <td class="px-3 py-3 ${row.status === "Aktif"
          ? "text-green-600 font-bold"
          : "text-red-600 font-bold"
        }">${row.status}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Dialog -->
    <div id="modal" class="fixed inset-0 z-50 hidden items-center justify-center bg-black bg-opacity-40">
      <div class="relative bg-white p-6 rounded-lg shadow-lg w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto border border-blue-200">

        <!-- Tombol Close -->
        <button
          onclick="toggleModal()"
          class="absolute top-2 right-3 text-gray-600 hover:text-red-500 text-xl"
        >
          &times;
        </button>

        <!-- Judul Modal -->
        <h3 class="text-2xl font-bold text-blue-800 mb-6">Tambah DeviceID</h3>

        <div class="p-4 bg-blue-100 text-blue-800 rounded-md shadow">
          Informasi
           <h1> - Format DeviceID [123ABC]</h1>
        </div>

        <!-- Form -->
        <form method="POST" action="/activations/new">
          <div class="mb-4">
            <label for="modalDeviceId" class="block text-sm font-medium text-blue-800 mb-2">
              Device ID *
            </label>
            <input
              type="text"
              id="modalDeviceId"
              name="deviceId"
              required
              class="w-full px-3 py-2 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="123ABC"
            />
          </div>

          <!-- Tombol Simpan -->
          <div class="text-right mt-6">
            <button
              type="submit"
              class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-6 py-2 rounded shadow"
            >
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Script Modal -->
    <script>
      const params = new URLSearchParams(window.location.search);
      if (params.get("success") === "true") {
        alert("Aktivasi berhasil disimpan!");
      }

      function toggleModal() {
        const modal = document.getElementById("modal");
        modal.classList.toggle("hidden");
        modal.classList.toggle("flex");
      }
    </script>
  </body>
</html>
    `;

    res.send(html);
  });
});

/* ========== API ENDPOINTS UNTUK MOBILE ========== */

// GET - Ambil semua data aktivasi (untuk mobile)
app.get("/api/activations", (req, res) => {
  const sql = `
    SELECT 
      a.device_id, 
      a.device_name, 
      a.owner, 
      a.activation_date, 
      a.deactivation_date,
      a.mac_address,
      a.manufacturer,
      a.mikro_type,
      a.firmware_version,
      a.firmware_description,
      a.wifi_ssid,
      a.wifi_password,
      a.io_pin,
      a.endpoint_url,
      CASE 
        WHEN NOW() BETWEEN a.activation_date AND a.deactivation_date THEN 'Aktif'
        ELSE 'Nonaktif'
      END AS status,
      CASE 
        WHEN NOW() BETWEEN a.activation_date AND a.deactivation_date THEN true
        ELSE false
      END AS is_active
    FROM activations a
    LEFT JOIN devices d ON a.device_id = d.id
    ORDER BY a.activation_date DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Gagal mengambil data aktivasi",
        error: err.message
      });
    }

    // Format data untuk mobile
    const formattedResults = results.map(row => ({
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
      status: row.status,
      is_active: row.is_active,
      activation_date_formatted: new Date(row.activation_date).toLocaleDateString('id-ID'),
      deactivation_date_formatted: new Date(row.deactivation_date).toLocaleDateString('id-ID')
    }));

    res.json({
      success: true,
      message: "Data aktivasi berhasil diambil",
      data: formattedResults,
      total: formattedResults.length
    });
  });
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) {
    return res.status(401).json({ success: false, message: 'Akses ditolak. Token tidak ditemukan.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Token tidak valid atau sudah kedaluwarsa.' });
    }
    req.user = user; // Menyimpan data user dari token ke request
    next();
  });
};


// Endpoint: POST /api/auth/register
app.post("/api/auth/register", async (req, res) => {
  const { full_name, email, password } = req.body;

  if (!full_name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "Nama lengkap, email, dan password wajib diisi."
    });
  }

  // Cek apakah email sudah ada
  db.query("SELECT id FROM users WHERE email = ?", [email], async (err, results) => {
    if (err) {
      logEvent('Register Error', 'System', 'DB error on email check', { error: err.message });
      return res.status(500).json({ success: false, message: "Kesalahan pada server." });
    }

    if (results.length > 0) {
      return res.status(409).json({ success: false, message: "Email sudah terdaftar. Silakan gunakan email lain." });
    }

    try {
      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Simpan user baru ke database
      const sql = `
        INSERT INTO users (full_name, email, password, is_active, created_at, updated_at)
        VALUES (?, ?, ?, 1, NOW(), NOW())
      `;
      db.query(sql, [full_name, email, hashedPassword], (insertErr, insertResult) => {
        if (insertErr) {
          logEvent('Register Error', email, 'DB error on user insert', { error: insertErr.message });
          return res.status(500).json({ success: false, message: "Gagal mendaftarkan pengguna." });
        }

        const newUserId = insertResult.insertId;
        logEvent('User Registered', email, `User ${email} berhasil terdaftar`, { userId: newUserId });

        // Dapatkan data user yang baru dibuat (tanpa password)
        db.query("SELECT id, full_name, email, created_at FROM users WHERE id = ?", [newUserId], (selectErr, newUser) => {
            if (selectErr || newUser.length === 0) {
                return res.status(201).json({
                    success: true,
                    message: "Registrasi berhasil, namun gagal mengambil data user.",
                });
            }
            
            res.status(201).json({
                success: true,
                message: "Registrasi berhasil!",
                data: { user: newUser[0] }
            });
        });
      });
    } catch (hashError) {
      logEvent('Register Error', email, 'Password hashing error', { error: hashError.message });
      res.status(500).json({ success: false, message: "Terjadi kesalahan internal." });
    }
  });
});


// Endpoint: POST /api/auth/login
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email dan password wajib diisi."
    });
  }

  // Cari user berdasarkan email
  const sql = "SELECT id, full_name, email, password, is_active FROM users WHERE email = ?";
  db.query(sql, [email], async (err, results) => {
    if (err) {
      logEvent('Login Error', email, 'DB error on user find', { error: err.message });
      return res.status(500).json({ success: false, message: "Kesalahan pada server." });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: "Email atau password salah." });
    }

    const user = results[0];

    // Cek apakah akun aktif
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: "Akun Anda tidak aktif. Silakan hubungi administrator." });
    }

    try {
      // Verifikasi password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: "Email atau password salah." });
      }

      // Jika password cocok, buat JWT
      const payload = {
        id: user.id,
        email: user.email,
        full_name: user.full_name
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

      logEvent('User Login', email, `User ${email} berhasil login`, { userId: user.id });

      // Kirim response sukses dengan token dan data user (tanpa password)
      res.status(200).json({
        success: true,
        message: "Login berhasil!",
        data: {
          token: token,
          user: {
            id: user.id,
            full_name: user.full_name,
            email: user.email
          }
        }
      });

    } catch (compareError) {
      logEvent('Login Error', email, 'Password compare error', { error: compareError.message });
      res.status(500).json({ success: false, message: "Terjadi kesalahan internal." });
    }
  });
});


app.post("/api/register-device", (req, res) => {
  const { serial_number, owner } = req.body;

  if (!serial_number || !owner) {
    return res.status(400).json({
      success: false,
      message: "Serial number dan owner wajib diisi"
    });
  }

  db.query(
    "SELECT * FROM activations WHERE serial_number = ?",
    [serial_number],
    (err, results) => {
      if (err) {
        return res.status(500).json({ success: false, message: "DB error", error: err.message });
      }

      if (results.length === 0) {
        return res.status(404).json({ success: false, message: "Perangkat tidak ditemukan. Harap pastikan serial number benar." });
      }

      const row = results[0];
      if (row.is_registered) {
        return res.status(400).json({
          success: false,
          message: "Perangkat sudah diregistrasi oleh pengguna lain."
        });
      }

      const token = generateToken(); // Fungsi untuk membuat token acak
      const now = new Date();

      db.query(
        `UPDATE activations 
         SET owner = ?, is_registered = 1, registered_at = ?, device_token = ?
         WHERE serial_number = ?`,
        [owner, now, token, serial_number],
        (updateErr) => {
          if (updateErr) {
            return res.status(500).json({ success: false, message: "Gagal registrasi perangkat", error: updateErr.message });
          }

          logEvent("Registrasi Perangkat", owner, `Serial ${serial_number} berhasil diregistrasi`, { serial_number, owner });

          return res.status(200).json({
            success: true,
            message: "Perangkat berhasil diregistrasi",
            data: {
              serial_number,
              device_token: token,
              device_id: row.device_id
            }
          });
        }
      );
    }
  );
});

function generateToken(length = 24) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}



/* ========== JALANKAN SERVER ========== */
app.listen(port, "", () => {
  console.log(`🚀 Server berjalan di http://localhost:${port}`);
});