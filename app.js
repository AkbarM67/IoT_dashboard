const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const app = express();
const port = 3000;

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// DB Connection
const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "rajawali",
  database: "iot_activation",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || '88619d09c9896ce82f164d48a13765b2';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Middleware autentikasi JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('No token found in Authorization header');
    return res.status(401).json({ success: false, message: 'Akses ditolak. Token tidak ditemukan.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log('Token verification failed:', err.message);
      return res.status(403).json({ success: false, message: 'Token tidak valid atau sudah kedaluwarsa.' });
    }
    req.user = user;
    console.log('Token verified successfully:', user);
    next();
  });
};

// Logging function
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

// Generate token function
function generateToken(length = 24) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}
/* ========== ENDPOINT LOGIN PAGE ========== */
app.get("/login", (req, res) => {
  const html = `
  <!DOCTYPE html>
  <html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Login - IoT Dashboard</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
    <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
  </head>
  <body class="bg-blue-50 min-h-screen font-sans flex items-center justify-center">
    <div class="w-full max-w-md p-8 bg-white rounded-lg shadow-lg border border-blue-200">
      <div class="flex items-center justify-center mb-6">
        <img src="/Logo_Makerindo.png" alt="Logo" class="w-12 h-12 mr-3" />
        <h1 class="text-2xl font-bold text-blue-800">IoT Dashboard</h1>
      </div>
      <h2 class="text-xl font-semibold text-blue-800 mb-6 text-center">Login</h2>
      <form id="loginForm" class="space-y-6">
        <div>
          <label for="email" class="block text-lg font-medium text-blue-800 mb-2">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            required
            class="w-full px-4 py-3 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
            placeholder="Masukkan email"
          />
        </div>
        <div>
          <label for="password" class="block text-lg font-medium text-blue-800 mb-2">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            required
            class="w-full px-4 py-3 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
            placeholder="Masukkan password"
          />
        </div>
        <div>
          <button
            type="submit"
            class="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg font-medium px-6 py-3 rounded shadow"
          >
            Login
          </button>
        </div>
        <div id="error-message" class="text-red-600 text-center hidden"></div>
      </form>
      <p class="mt-4 text-center text-blue-800">
        Belum punya akun? <a href="/register" class="text-blue-600 hover:underline">Daftar</a>
      </p>
    </div>

    <script>
      // Check if user is already logged in
      const token = localStorage.getItem('token');
      console.log('Checking for existing token in /login:', token ? token.substring(0, 20) + '...' : 'No token');
      if (token) {
        // Verify token validity
        axios.get('/api/activations', {
          headers: { 'Authorization': 'Bearer ' + token }
        })
        .then(() => {
          console.log('Token valid, redirecting to /manage-users');
          window.location.href = '/manage-users';
        })
        .catch(error => {
          console.error('Invalid token:', error);
          localStorage.removeItem('token');
        });
      }

      // Handle form submission
      const form = document.getElementById('loginForm');
      const errorMessage = document.getElementById('error-message');

      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        if (!email || !password) {
          errorMessage.textContent = 'Email dan password wajib diisi.';
          errorMessage.classList.remove('hidden');
          return;
        }

        try {
          const response = await axios.post('/api/auth/login', {
            email,
            password
          });

          if (response.data.success) {
            const token = response.data.data.token;
            localStorage.setItem('token', token);
            const storedToken = localStorage.getItem('token');
            console.log('Token stored in /login:', storedToken ? storedToken.substring(0, 20) + '...' : 'Failed to store token');
            if (storedToken === token) {
              setTimeout(() => {
                console.log('Redirecting to /manage-users, token:', localStorage.getItem('token') ? localStorage.getItem('token').substring(0, 20) + '...' : 'No token');
                window.location.href = '/manage-users';
              }, 500);
            } else {
              throw new Error('Failed to store token in localStorage');
            }
          }
        } catch (error) {
          console.error('Login error:', error);
          errorMessage.textContent = error.response?.data?.message || 'Terjadi kesalahan saat login.';
          errorMessage.classList.remove('hidden');
        }
      });
    </script>
  </body>
  </html>
  `;
  res.send(html);
});

// Helper function to format a date object for MySQL
function formatDateTimeForMySQL(dateObject) {
  if (!dateObject || !(dateObject instanceof Date)) {
    return null; // Kembalikan null jika bukan objek Date yang valid
  }
  // Metode toISOString().slice().replace() adalah cara cepat untuk mendapatkan format 'YYYY-MM-DD HH:MM:SS'
  return dateObject.toISOString().slice(0, 19).replace('T', ' ');
}

app.post("/api/device/configure", authenticateToken, (req, res) => {
  // Dapatkan email pengguna yang sedang login
  const userEmail = req.user.email;

  const {
    device_configuration,
    wifi_configuration,
    io_configuration,
    activation,
    endpoint_configuration
  } = req.body;

  const deviceId = device_configuration?.deviceId;
  const macAddress = device_configuration?.mac_address;

  if (!deviceId || !macAddress) {
    return res.status(400).json({
      success: false,
      message: "Device ID dan MAC address wajib diisi."
    });
  }

  // 1. Verifikasi bahwa perangkat ada di database
  db.query("SELECT * FROM activations WHERE mac_address = ? AND device_id = ?", [macAddress, deviceId], (err, results) => {
    if (err) {
      logEvent('Configure Error', userEmail, `DB error saat mencari perangkat ${macAddress}`, { error: err.message });
      return res.status(500).json({ success: false, message: "Kesalahan pada server." });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: "Perangkat tidak ditemukan." });
    }

    // 2. Siapkan data untuk di-update
    const owner = device_configuration?.owner_name || "Unknown";
    const author = device_configuration?.author || "Unknown";
    const deviceName = device_configuration?.device_name || "Unknown";
    const manufacturer = device_configuration?.Manufacturer || "Unknown";
    const mikroType = device_configuration?.["MicroController Type"] || "Unknown";
    const firmwareVersion = device_configuration?.["Firmware Version"] || "1.0.0";
    const firmwareDescription = device_configuration?.["Firmware Description"] || "";
    const wifiSsid = wifi_configuration?.wifi_ssid || "";
    const wifiPassword = wifi_configuration?.wifi_password || "";
    const endpointUrl = endpoint_configuration?.endpoint_url || "localhost:3000/activate";
    const ioPin = parseInt(io_configuration?.io_pin, 10) || 0;

    // ================== LOGIKA BARU UNTUK TANGGAL ==================
    let activationDateObj = null;
    let deactivationDateObj = null;

    // Cek apakah activation.activationDate ada dan valid
    if (activation?.activationDate) {
      try {
        // Buat objek Date dari string yang dikirim klien
        activationDateObj = new Date(activation.activationDate);

        // Buat salinan dari activationDateObj untuk deactivationDate
        deactivationDateObj = new Date(activationDateObj.getTime());
        
        // Tambahkan 1 tahun ke deactivationDateObj
        deactivationDateObj.setFullYear(deactivationDateObj.getFullYear() + 1);

      } catch (dateError) {
        console.error("Invalid date received from client:", activation.activationDate);
        // Biarkan tanggal tetap null jika format dari klien salah
      }
    }
    // ===============================================================

    const queryParams = [
      owner, author, manufacturer, mikroType, firmwareVersion, firmwareDescription,
      deviceName, wifiSsid, wifiPassword,
      formatDateTimeForMySQL(activationDateObj),   // Format objek Date ke string MySQL
      formatDateTimeForMySQL(deactivationDateObj),  // Format objek Date ke string MySQL
      endpointUrl, ioPin, macAddress, deviceId
    ];

    // 3. Update data di database
    const sql = `
      UPDATE activations SET 
        owner = ?, author = ?, manufacturer = ?, mikro_type = ?,
        firmware_version = ?, firmware_description = ?, device_name = ?,
        wifi_ssid = ?, wifi_password = ?, activation_date = ?, 
        deactivation_date = ?, endpoint_url = ?, io_pin = ?,
        mac_address = ?
      WHERE device_id = ?
    `;

    db.query(sql, queryParams, (updateErr) => {
      if (updateErr) {
        console.error("DATABASE UPDATE FAILED:", updateErr);
        logEvent('Configure Error', userEmail, `Gagal update konfigurasi untuk ${deviceId}`, { error: updateErr.message });
        return res.status(500).json({ success: false, message: "Gagal menyimpan konfigurasi." });
      }

      // 4. Catat log keberhasilan
      logEvent(
        "Device Configured",
        userEmail,
        `${userEmail} mengkonfigurasi perangkat ${deviceId}`,
        { deviceId, macAddress, payload: req.body }
      );

      // 5. Kirim respons sukses
      res.status(200).json({
        success: true,
        message: "Konfigurasi berhasil disimpan."
      });
    });
  });
});


/* ========== ENDPOINT IoT AKTIVASI (HANYA UNTUK LOGGING) ========== */
app.post("/activate", (req, res) => {
  const { device_configuration } = req.body;
  const deviceId = device_configuration?.deviceId;
  const macAddress = device_configuration?.mac_address;

  if (!deviceId || !macAddress) {
    return res.status(400).json({ message: "Data tidak lengkap.", status: false });
  }

  // Catat log bahwa perangkat berhasil online
  logEvent(
    "Device Activation Ping",
    macAddress, // Aktornya adalah perangkat
    `Perangkat ${deviceId} berhasil aktif dan terhubung ke server.`,
    { deviceId, ip: req.ip } // Simpan IP perangkat jika perlu
  );

  // Kirim respons sederhana ke perangkat
  res.status(200).json({
    message: "Aktivasi diterima.",
    status: true
  });
});

/* ========== ENDPOINT UNTUK GENERATE SERIAL NUMBER ========== */
app.post("/activations/new", (req, res) => {
  const { deviceId, macAddress } = req.body;

  if (!deviceId || !macAddress) {
    return res.status(400).json({
      success: false,
      message: 'Device ID dan MAC address wajib diisi'
    });
  }

  // Validasi format MAC address
  const macRegex = /^([0-9A-Fa-f]{2}:){5}([0-9A-Fa-f]{2})$/;
  if (!macRegex.test(macAddress)) {
    return res.status(400).json({
      success: false,
      message: 'Format MAC address tidak valid'
    });
  }

  // Cek apakah deviceId atau macAddress sudah ada
  db.query(
    'SELECT * FROM activations WHERE device_id = ? OR mac_address = ?',
    [deviceId, macAddress],
    (err, results) => {
      if (err) {
        logEvent('Generate Serial Number Error', 'System', 'DB error on device check', { error: err.message });
        return res.status(500).json({ success: false, message: 'DB error', error: err.message });
      }

      if (results.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Device ID atau MAC address sudah ada'
        });
      }

      // Generate serial_number
      const date = new Date();
      const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
      const randomPart = Math.random().toString(36).substr(2, 4).toUpperCase();
      const serial_number = `SN-${datePart}-${randomPart}`;

      // Insert entri awal
      db.query(
        `INSERT INTO activations (device_id, mac_address, serial_number, is_registered, created_at)
         VALUES (?, ?, ?, 0, NOW())`,
        [deviceId, macAddress, serial_number],
        (insertErr, result) => {
          if (insertErr) {
            logEvent('Generate Serial Number Error', 'System', 'DB error on insert', { error: insertErr.message });
            return res.status(500).json({ success: false, message: 'Gagal membuat entri', error: insertErr.message });
          }

          logEvent(
            'Generate Serial Number',
            'System',
            `Serial number ${serial_number} dibuat untuk MAC ${macAddress}`,
            { macAddress, deviceId, serial_number }
          );

          return res.status(201).json({
            success: true,
            message: 'Serial number berhasil dibuat',
            data: {
              device_id: deviceId,
              mac_address: macAddress,
              serial_number
            }
          });
        }
      );
    }
  );
});

/* ========== FORM DAN TABEL AKTIVASI ========== */
app.get("/activations/new", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8" />
      <title>Tambah DeviceID</title>
 <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
    </head>
    <body class="bg-blue-50 p-8 min-h-screen font-sans">
      <div class="mb-4">
        <a href="/manage-users" class="text-blue-700 hover:text-blue-9
        00 text-lg font-medium">
          ← Kembali
        </a>
      </div>
      <h1 class="text-3xl font-bold text-blue-800 mb-8">
        Tambah DeviceID
      </h1>
      <form id="deviceForm" method="POST" action="/activations/new">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              placeholder="Masukkan Device ID (contoh: DEV123)"
            />
          </div>
          <div class="mb-6">
            <label for="macAddress" class="block text-lg font-medium text-blue-800 mb-2">
              MAC Address *
            </label>
            <input
              type="text"
              id="macAddress"
              name="macAddress"
              required
              class="w-full px-4 py-3 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              placeholder="Contoh: 00:1A:7D:DA:71:13"
            />
          </div>
        </div>
        <div class="mt-8">
          <button
            type="submit"
            class="bg-blue-600 hover:bg-blue-700 text-white text-lg font-medium px-6 py-3 rounded shadow"
          >
            Generate Serial Number
          </button>
        </div>
      </form>
    </body>
    </html>
  `);
});
// app.js

// @ts-nocheck
/* ========== ENDPOINT MANAGE USERS (LENGKAP) ========== */
app.get("/manage-users", (req, res) => {
  // Endpoint ini tidak memerlukan 'authenticateToken' karena halaman HTML-nya sendiri
  // tidak berisi data sensitif. Logika otentikasi ditangani oleh JavaScript di sisi klien
  // yang akan memeriksa localStorage dan memanggil API yang dilindungi.
  const html = `
  <!DOCTYPE html>
  <html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Manajemen Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        /* Custom scrollbar for better aesthetics */
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; }
        ::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #475569; }
        .sidebar-link.active {
            background-color: #1e40af; /* a darker blue for active state */
            box-shadow: inset 3px 0 0 0 white;
        }
    </style>
  </head>
  <body class="bg-slate-100 min-h-screen font-sans">
    <div class="flex">
      <!-- Sidebar -->
      <aside class="w-64 bg-blue-900 text-slate-200 h-screen fixed top-0 left-0 p-4 flex flex-col shadow-lg">
        <div class="flex items-center gap-3 mb-10 px-2">
          <img src="/Logo_Makerindo.png" alt="Logo" class="w-10 h-10" />
          <h1 class="text-xl font-bold text-white">IoT Dashboard</h1>
        </div>
        <nav class="flex flex-col flex-grow">
          <ul class="space-y-2">
            <li>
              <a href="#activations" class="sidebar-link flex items-center gap-3 py-2.5 px-4 rounded-lg hover:bg-blue-800 transition-colors duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd" /></svg>
                <span>Aktivasi</span>
              </a>
            </li>
            <li>
              <a href="#users" class="sidebar-link flex items-center gap-3 py-2.5 px-4 rounded-lg hover:bg-blue-800 transition-colors duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>
                <span>Pengguna</span>
              </a>
            </li>
            <li>
              <a href="/activations/new" class="flex items-center gap-3 py-2.5 px-4 rounded-lg hover:bg-blue-800 transition-colors duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" /></svg>
                <span>Tambah Device</span>
              </a>
            </li>
          </ul>
          <div class="mt-auto">
             <a href="/logout" class="flex items-center gap-3 py-2.5 px-4 rounded-lg text-red-400 hover:bg-red-900/50 hover:text-red-300 transition-colors duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clip-rule="evenodd" /></svg>
                <span>Logout</span>
              </a>
          </div>
        </nav>
      </aside>

      <!-- Main Content -->
      <main class="ml-64 p-8 w-full">
        <!-- Activations Section -->
        <section id="activations" class="mb-12">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-3xl font-bold text-slate-800">Daftar Aktivasi Perangkat</h2>
            <a href="/activations/new" class="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200">
              Tambah Device
            </a>
          </div>
          <div class="bg-white shadow-md rounded-lg border border-slate-200 overflow-hidden">
            <div class="overflow-x-auto">
              <table class="min-w-full text-sm text-left text-slate-600">
                <thead class="bg-slate-100 text-slate-700 uppercase text-xs font-semibold sticky top-0 z-10">
                  <tr>
                    <th class="px-4 py-3">Device ID</th>
                    <th class="px-4 py-3">MAC Address</th>
                    <th class="px-4 py-3">Registered By</th>
                    <th class="px-4 py-3">Status</th>
                    <th class="px-4 py-3">Activation Date</th>
                    <th class="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200" id="activations-table">
                  <!-- Data diisi oleh JavaScript -->
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <!-- Users Section -->
        <section id="users" class="mb-12">
          <h2 class="text-3xl font-bold text-slate-800 mb-6">Manajemen Pengguna</h2>
          <div class="bg-white shadow-md rounded-lg border border-slate-200 overflow-hidden">
             <div class="overflow-x-auto">
              <table class="min-w-full text-sm text-left text-slate-600">
                <thead class="bg-slate-100 text-slate-700 uppercase text-xs font-semibold sticky top-0 z-10">
                  <tr>
                    <th class="px-4 py-3">ID</th>
                    <th class="px-4 py-3">Nama Lengkap</th>
                    <th class="px-4 py-3">Email</th>
                    <th class="px-4 py-3">Status</th>
                    <th class="px-4 py-3">Dibuat</th>
                    <th class="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200" id="users-table">
                  <!-- Data diisi oleh JavaScript -->
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>

    <script>
      document.addEventListener('DOMContentLoaded', ( ) => {
        // Blok utama untuk memastikan semua logika berjalan setelah halaman dimuat
        try {
            // 1. Cek Token & Atur Header Axios
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = '/login';
                return;
            }
            axios.defaults.headers.common['Authorization'] = 'Bearer ' + token;

            // 2. Logika Navigasi Sidebar
            const handleNavigation = () => {
                const hash = window.location.hash || '#activations';
                document.querySelectorAll('main > section').forEach(section => {
                    section.style.display = 'none';
                });
                document.querySelectorAll('.sidebar-link').forEach(link => {
                    link.classList.remove('active');
                });
                const activeSection = document.querySelector(hash);
                const activeLink = document.querySelector(\`.sidebar-link[href="\${hash}"]\`);
                if (activeSection) activeSection.style.display = 'block';
                if (activeLink) activeLink.classList.add('active');
            };
            window.addEventListener('hashchange', handleNavigation);
            handleNavigation(); // Panggil sekali saat halaman dimuat

            // 3. Fungsi-fungsi Aksi (Delete, Toggle Status)
            window.deleteActivation = async (macAddress, deviceId) => {
                if (!confirm(\`Yakin ingin menghapus aktivasi untuk \${deviceId}?\nIni akan mereset semua konfigurasi dan registrasi perangkat.\`)) return;
                try {
                    await axios.delete(\`/api/activations/\${macAddress}\`);
                    alert('Aktivasi berhasil dihapus/direset.');
                    fetchActivations();
                } catch (error) {
                    handleApiError(error, 'Gagal menghapus aktivasi');
                }
            };

            window.toggleUserStatus = async (userId, isActive) => {
                if (!confirm(\`Yakin ingin \${isActive ? 'menonaktifkan' : 'mengaktifkan'} pengguna ini?\`)) return;
                try {
                    await axios.put(\`/api/users/\${userId}/status\`, { is_active: !isActive });
                    alert(\`Pengguna berhasil \${isActive ? 'dinonaktifkan' : 'diaktifkan'}.\`);
                    fetchUsers();
                } catch (error) {
                    handleApiError(error, 'Gagal mengubah status pengguna');
                }
            };

            // 4. Fungsi untuk Mengambil & Menampilkan Data
            async function fetchActivations() {
                try {
                    const response = await axios.get('/api/activations');
                    const activations = response.data.data;
                    const tableBody = document.getElementById('activations-table');
                    tableBody.innerHTML = '';
                    if (activations.length === 0) {
                        tableBody.innerHTML = \`<tr><td colspan="6" class="text-center py-10 text-slate-500">Tidak ada data aktivasi.</td></tr>\`;
                        return;
                    }
                    activations.forEach(row => {
                        const statusBadge = row.status === 'Aktif' 
                            ? \`<span class="px-2 py-1 font-semibold leading-tight text-green-700 bg-green-100 rounded-full">Aktif</span>\`
                            : \`<span class="px-2 py-1 font-semibold leading-tight text-red-700 bg-red-100 rounded-full">Nonaktif</span>\`;
                        
                        const deleteButton = row.is_registered
                            ? \`<button onclick="deleteActivation('\${row.mac_address}', '\${row.device_id}')" class="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-md shadow-sm">Hapus</button>\`
                            : '';

                        const tr = document.createElement('tr');
                        tr.className = 'hover:bg-slate-50';
                        tr.innerHTML = \`
                            <td class="px-4 py-3 font-mono text-xs">\${row.device_id}</td>
                            <td class="px-4 py-3 font-mono text-xs">\${row.mac_address}</td>
                            <td class="px-4 py-3 whitespace-nowrap">\${row.registered_by || '<span class="text-slate-400">Belum Terdaftar</span>'}</td>
                            <td class="px-4 py-3">\${statusBadge}</td>
                            <td class="px-4 py-3 text-xs whitespace-nowrap">\${row.activation_date_formatted || '-'}</td>
                            <td class="px-4 py-3 text-center">\${deleteButton}</td>
                        \`;
                        tableBody.appendChild(tr);
                    });
                } catch (error) {
                    handleApiError(error, 'Gagal mengambil data aktivasi');
                }
            }

            async function fetchUsers() {
                try {
                    const response = await axios.get('/api/users');
                    const users = response.data.data;
                    const tableBody = document.getElementById('users-table');
                    tableBody.innerHTML = '';
                    if (users.length === 0) {
                        tableBody.innerHTML = \`<tr><td colspan="6" class="text-center py-10 text-slate-500">Tidak ada data pengguna.</td></tr>\`;
                        return;
                    }
                    users.forEach(row => {
                        const statusBadge = row.is_active
                            ? \`<span class="px-2 py-1 font-semibold leading-tight text-green-700 bg-green-100 rounded-full">Aktif</span>\`
                            : \`<span class="px-2 py-1 font-semibold leading-tight text-red-700 bg-red-100 rounded-full">Nonaktif</span>\`;
                        
                        const actionButton = \`
                            <button onclick="toggleUserStatus(\${row.id}, \${row.is_active})" 
                                    class="\${row.is_active ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-500 hover:bg-green-600'} text-white text-xs font-bold px-3 py-1.5 rounded-md shadow-sm">
                                \${row.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                            </button>
                        \`;
                        const tr = document.createElement('tr');
                        tr.className = 'hover:bg-slate-50';
                        tr.innerHTML = \`
                            <td class="px-4 py-3 font-semibold">\${row.id}</td>
                            <td class="px-4 py-3 whitespace-nowrap">\${row.full_name}</td>
                            <td class="px-4 py-3 whitespace-nowrap">\${row.email}</td>
                            <td class="px-4 py-3">\${statusBadge}</td>
                            <td class="px-4 py-3 text-xs whitespace-nowrap">\${new Date(row.created_at).toLocaleString('id-ID')}</td>
                            <td class="px-4 py-3 text-center">\${actionButton}</td>
                        \`;
                        tableBody.appendChild(tr);
                    });
                } catch (error) {
                    handleApiError(error, 'Gagal mengambil data pengguna');
                }
            }
            
            // 5. Fungsi Helper untuk Menangani Error API
            function handleApiError(error, defaultMessage) {
                console.error(\`\${defaultMessage}:\`, error);
                const errorMessage = error.response?.data?.message || error.message || 'Terjadi kesalahan yang tidak diketahui.';
                if (error.response?.status === 401 || error.response?.status === 403) {
                    alert('Sesi tidak valid atau kedaluwarsa. Silakan login kembali.');
                    localStorage.removeItem('token');
                    window.location.href = '/login';
                } else {
                    alert(\`\${defaultMessage}: \${errorMessage}\`);
                }
            }

            // 6. Panggilan Awal untuk Mengisi Data
            fetchActivations();
            fetchUsers();

        } catch (error) {
            console.error('Script error di halaman utama:', error);
            alert('Terjadi kesalahan kritis di halaman. Silakan login kembali.');
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
      });
    </script>
  </body>
  </html>
  `;
  res.send(html);
});

/* ========== REDIRECT ACTIVATIONS TO MANAGE-USERS ========== */
app.get("/activations", (req, res) => {
  res.redirect("/manage-users");
});

/* ========== ENDPOINT LOGOUT ========== */
app.get("/logout", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Logout - IoT Dashboard</title>
    </head>
    <body>
      <script>
        localStorage.removeItem('token');
        window.location.href = '/login';
      </script>
    </body>
    </html>
  `);
});

/* ========== API ENDPOINTS UNTUK MOBILE ========== */
app.get("/api/activations", authenticateToken, (req, res) => {
  const sql = `
    SELECT 
      a.device_id, 
      a.device_name, 
      a.owner, 
      a.author,
      a.registered_by,
      a.serial_number,
      a.is_registered,
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
    ORDER BY a.created_at DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      logEvent('Get Activations Error', req.user.email, 'DB error on activations fetch', { error: err.message });
      return res.status(500).json({
        success: false,
        message: "Gagal mengambil data aktivasi",
        error: err.message
      });
    }

    const formattedResults = results.map(row => ({
      device_id: row.device_id,
      device_name: row.device_name || "Unknown",
      owner: row.owner || "Unknown",
      author: row.author || "Unknown",
      registered_by: row.registered_by || null,
      serial_number: row.serial_number || null,
      is_registered: row.is_registered,
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
      activation_date_formatted: row.activation_date ? new Date(row.activation_date).toLocaleDateString('id-ID') : null,
      deactivation_date_formatted: row.deactivation_date ? new Date(row.deactivation_date).toLocaleDateString('id-ID') : null
    }));

    res.json({
      success: true,
      message: "Data aktivasi berhasil diambil",
      data: formattedResults,
      total: formattedResults.length
    });
  });
});

/* ========== AUTH ENDPOINTS ========== */
app.post("/api/auth/register", async (req, res) => {
  const { full_name, email, password } = req.body;

  if (!full_name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "Nama lengkap, email, dan password wajib diisi."
    });
  }

  db.query("SELECT id FROM users WHERE email = ?", [email], async (err, results) => {
    if (err) {
      logEvent('Register Error', 'System', 'DB error on email check', { error: err.message });
      return res.status(500).json({ success: false, message: "Kesalahan pada server." });
    }

    if (results.length > 0) {
      return res.status(409).json({ success: false, message: "Email sudah terdaftar." });
    }

    try {
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

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

        db.query("SELECT id, full_name, email, created_at FROM users WHERE id = ?", [newUserId], (selectErr, newUser) => {
          if (selectErr || newUser.length === 0) {
            return res.status(201).json({
              success: true,
              message: "Registrasi berhasil, namun gagal mengambil data user."
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

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email dan password wajib diisi."
    });
  }

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

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: "Akun tidak aktif." });
    }

    try {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: "Email atau password salah." });
      }

      const payload = {
        id: user.id,
        email: user.email,
        full_name: user.full_name
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

      logEvent('User Login', email, `User ${email} berhasil login`, { userId: user.id });

      res.status(200).json({
        success: true,
        message: "Login berhasil!",
        data: {
          token,
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

app.put("/api/auth/profile", authenticateToken, async (req, res) => {
  const { full_name, email } = req.body;
  const userId = req.user.id;

  if (!full_name || !email) {
    return res.status(400).json({
      success: false,
      message: "Nama lengkap dan email wajib diisi."
    });
  }

  try {
    const [existingEmail] = await db.promise().query(
      "SELECT id FROM users WHERE email = ? AND id != ?",
      [email, userId]
    );

    if (existingEmail.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email sudah digunakan oleh pengguna lain."
      });
    }

    const sql = `
      UPDATE users 
      SET full_name = ?, email = ?, updated_at = NOW()
      WHERE id = ?
    `;
    const [result] = await db.promise().query(sql, [full_name, email, userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Pengguna tidak ditemukan."
      });
    }

    const [updatedUser] = await db.promise().query(
      "SELECT id, full_name, email, created_at, updated_at FROM users WHERE id = ?",
      [userId]
    );

    logEvent(
      "Update Profile",
      req.user.email,
      `Pengguna ${req.user.email} memperbarui profil`,
      { userId, full_name, email }
    );

    return res.status(200).json({
      success: true,
      message: "Profil berhasil diupdate",
      data: { user: updatedUser[0] }
    });
  } catch (err) {
    logEvent(
      "Update Profile Error",
      req.user.email,
      "Gagal memperbarui profil",
      { error: err.message }
    );
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server: " + err.message
    });
  }
});

app.put("/api/auth/change-password", authenticateToken, async (req, res) => {
  const { current_password, new_password, confirm_password } = req.body;
  const userId = req.user.id;

  if (!current_password || !new_password || !confirm_password) {
    return res.status(400).json({
      success: false,
      message: "Password saat ini, password baru, dan konfirmasi password wajib diisi."
    });
  }

  if (new_password !== confirm_password) {
    return res.status(400).json({
      success: false,
      message: "Password baru dan konfirmasi password tidak cocok."
    });
  }

  try {
    const [users] = await db.promise().query(
      "SELECT password FROM users WHERE id = ?",
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Pengguna tidak ditemukan."
      });
    }

    const user = users[0];

    const isMatch = await bcrypt.compare(current_password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Password saat ini salah."
      });
    }

    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(new_password, saltRounds);

    const sql = `
      UPDATE users 
      SET password = ?, updated_at = NOW()
      WHERE id = ?
    `;
    const [result] = await db.promise().query(sql, [hashedNewPassword, userId]);

    if (result.affectedRows === 0) {
      return res.status(500).json({
        success: false,
        message: "Gagal memperbarui password."
      });
    }

    logEvent(
      "Change Password",
      req.user.email,
      `Pengguna ${req.user.email} mengubah password`,
      { userId }
    );

    return res.status(200).json({
      success: true,
      message: "Password berhasil diubah"
    });
  } catch (err) {
    logEvent(
      "Change Password Error",
      req.user.email,
      "Gagal mengubah password",
      { error: err.message }
    );
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server: " + err.message
    });
  }
});

app.get("/api/logs", authenticateToken, (req, res) => {
  let page = parseInt(req.query.page) || 1;
  let limit = parseInt(req.query.limit) || 50;
  let offset = (page - 1) * limit;

  const userEmail = req.user.email;

  db.query(
    "SELECT COUNT(*) AS total FROM logs WHERE actor = ?",
    [userEmail],
    (countErr, countResult) => {
      if (countErr) {
        return res.status(500).json({
          success: false,
          message: "Gagal menghitung total log",
          error: countErr.message
        });
      }

      const totalLogs = countResult[0].total;
      const totalPages = Math.ceil(totalLogs / limit);

      const sql = `
        SELECT 
          id,
          event_time,
          event_type,
          actor,
          description,
          details
        FROM logs
        WHERE actor = ?
        ORDER BY event_time DESC
        LIMIT ? OFFSET ?
      `;

      db.query(sql, [userEmail, limit, offset], (err, results) => {
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
          data: results.map((row) => ({
            id: row.id,
            event_time: row.event_time,
            event_type: row.event_type,
            actor: row.actor,
            description: row.description,
            details: JSON.parse(row.details)
          })),
          pagination: {
            current_page: page,
            limit_per_page: limit,
            total_logs: totalLogs,
            total_pages: totalPages
          }
        });
      });
    }
  );
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
        error: err.message
      });
    }

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Konfigurasi tidak ditemukan untuk MAC tersebut"
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
        "Firmware Description": row.firmware_description
      },
      wifi_configuration: {
        wifi_ssid: row.wifi_ssid,
        wifi_password: row.wifi_password
      },
      io_configuration: {
        io_pin: row.io_pin
      },
      endpoint_configuration: {
        endpoint_url: row.endpoint_url
      },
      activation: {
        activationDate: row.activation_date,
        deactivationDate: row.deactivation_date
      }
    };

    res.json({
      success: true,
      message: "Konfigurasi berhasil ditemukan",
      data: config
    });
  });
});


/* ========== ENDPOINT UNTUK REGISTRASI PERANGKAT OLEH PENGGUNA ========== */
app.post("/api/device/register", authenticateToken, (req, res) => {
  const userEmail = req.user.email; // Email dari pengguna yang login
  const { mac_address, serial_number } = req.body;

  if (!mac_address || !serial_number) {
    return res.status(400).json({
      success: false,
      message: "MAC Address dan Serial Number wajib diisi."
    });
  }

  // 1. Cari perangkat berdasarkan MAC address
  db.query("SELECT * FROM activations WHERE mac_address = ?", [mac_address], (err, results) => {
    if (err) {
      logEvent('RegisterDevice Error', userEmail, `DB error saat mencari MAC ${mac_address}`, { error: err.message });
      return res.status(500).json({ success: false, message: "Kesalahan pada server." });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: "Perangkat dengan MAC Address ini tidak ditemukan." });
    }

    const device = results[0];

    // 2. Cek apakah perangkat sudah didaftarkan oleh orang lain
    if (device.is_registered) {
      // Jika sudah didaftarkan oleh pengguna yang sama, anggap sukses
      if (device.registered_by === userEmail) {
        return res.status(200).json({ success: true, message: "Anda sudah mendaftarkan perangkat ini." });
      }
      // Jika didaftarkan orang lain, tolak
      return res.status(409).json({ success: false, message: "Perangkat ini sudah didaftarkan oleh pengguna lain." });
    }

    // 3. Validasi Serial Number
    if (device.serial_number !== serial_number) {
      return res.status(400).json({ success: false, message: "Serial Number tidak cocok. Periksa kembali fisik perangkat." });
    }

    // 4. Jika semua validasi lolos, update database
    const sql = `
      UPDATE activations 
      SET registered_by = ?, is_registered = 1, registered_at = NOW()
      WHERE mac_address = ?
    `;

    db.query(sql, [userEmail, mac_address], (updateErr) => {
      if (updateErr) {
        logEvent('RegisterDevice Error', userEmail, `Gagal mendaftarkan MAC ${mac_address}`, { error: updateErr.message });
        return res.status(500).json({ success: false, message: "Gagal mendaftarkan perangkat." });
      }

      logEvent("Device Registered", userEmail, `Pengguna mendaftarkan perangkat ${mac_address}`, { mac_address });
      res.status(200).json({ success: true, message: "Perangkat berhasil didaftarkan atas nama Anda." });
    });
  });
});

/* ========== ENDPOINT UNTUK HAPUS/RESET AKTIVASI ========== */
app.delete("/api/activations/:macAddress", authenticateToken, (req, res) => {
  const userEmail = req.user.email;
  const { macAddress } = req.params; // Ambil MAC address dari parameter URL

  if (!macAddress) {
    return res.status(400).json({ success: false, message: "MAC Address wajib diisi." });
  }

  // 1. Verifikasi bahwa perangkat ada dan dimiliki oleh pengguna yang meminta
  db.query("SELECT * FROM activations WHERE mac_address = ?", [macAddress], (err, results) => {
    if (err) {
      logEvent('DeleteActivation Error', userEmail, `DB error saat mencari MAC ${macAddress}`, { error: err.message });
      return res.status(500).json({ success: false, message: "Kesalahan pada server." });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: "Perangkat tidak ditemukan." });
    }

    const device = results[0];

    // PENTING: Hanya pengguna yang mendaftarkan yang boleh menghapus
    if (device.registered_by !== userEmail) {
      logEvent('DeleteActivation Forbidden', userEmail, `Percobaan hapus MAC ${macAddress} oleh pengguna yang tidak sah`, { owner: device.registered_by });
      return res.status(403).json({ success: false, message: "Akses ditolak. Anda bukan pemilik perangkat ini." });
    }

    // 2. Lakukan "Soft Delete" dengan mereset kolom-kolom penting
    const sql = `
      UPDATE activations 
      SET 
        owner = NULL,
        author = NULL,
        device_name = NULL,
        manufacturer = NULL,
        mikro_type = NULL,
        firmware_version = NULL,
        firmware_description = NULL,
        wifi_ssid = NULL,
        wifi_password = NULL,
        activation_date = NULL,
        deactivation_date = NULL,
        endpoint_url = NULL,
        io_pin = NULL,
        is_registered = 0,
        registered_by = NULL,
        registered_at = NULL
      WHERE mac_address = ?
    `;

    db.query(sql, [macAddress], (updateErr) => {
      if (updateErr) {
        console.error("DATABASE RESET FAILED:", updateErr);
        logEvent('DeleteActivation Error', userEmail, `Gagal reset aktivasi untuk MAC ${macAddress}`, { error: updateErr.message });
        return res.status(500).json({ success: false, message: "Gagal mereset aktivasi." });
      }

      logEvent("Activation Deleted", userEmail, `Pengguna mereset aktivasi untuk MAC ${macAddress}`, { macAddress });
      res.status(200).json({ success: true, message: "Aktivasi berhasil dihapus/direset." });
    });
  });
});


app.get("/api/check-ownership", authenticateToken, (req, res) => {
  const { mac_address } = req.query;
  const userEmail = req.user.email;

  if (!mac_address) {
    return res.status(400).json({ success: false, message: "MAC address wajib diisi" });
  }

  db.query(
    "SELECT registered_by, is_registered FROM activations WHERE mac_address = ?",
    [mac_address],
    (err, results) => {
      if (err) {
        logEvent('Check Ownership Error', userEmail, 'DB error on ownership check', { error: err.message });
        return res.status(500).json({ success: false, message: "DB error", error: err.message });
      }

      if (results.length === 0) {
        return res.status(404).json({ success: false, message: "Perangkat tidak ditemukan" });
      }

      const row = results[0];
      if (row.is_registered && row.registered_by !== userEmail) {
        return res.status(403).json({
          success: false,
          message: "Anda bukan pengguna yang mendaftarkan perangkat ini"
        });
      }

      return res.status(200).json({
        success: true,
        message: row.is_registered ? "Anda dapat mengkonfigurasi perangkat" : "Perangkat belum diregistrasi",
        data: {
          mac_address,
          is_registered: row.is_registered,
          registered_by: row.registered_by
        }
      });
    }
  );
});

/* ========== API ENDPOINT FOR USER MANAGEMENT ========== */
app.get("/api/users", authenticateToken, (req, res) => {
  const sql = `
    SELECT id, full_name, email, is_active, created_at, updated_at
    FROM users
    ORDER BY created_at DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      logEvent('Get Users Error', req.user.email, 'DB error on users fetch', { error: err.message });
      return res.status(500).json({
        success: false,
        message: "Gagal mengambil data pengguna",
        error: err.message
      });
    }

    res.json({
      success: true,
      message: "Data pengguna berhasil diambil",
      data: results,
      total: results.length
    });
  });
});

app.put("/api/users/:id/status", authenticateToken, async (req, res) => {
  const userId = req.params.id;
  const { is_active } = req.body;

  if (typeof is_active !== 'boolean') {
    return res.status(400).json({
      success: false,
      message: "Status aktif harus berupa boolean"
    });
  }

  try {
    const [result] = await db.promise().query(
      "UPDATE users SET is_active = ?, updated_at = NOW() WHERE id = ?",
      [is_active, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Pengguna tidak ditemukan"
      });
    }

    logEvent(
      "Toggle User Status",
      req.user.email,
      `Status pengguna ID ${userId} diubah menjadi ${is_active ? 'Aktif' : 'Nonaktif'}`,
      { userId, is_active }
    );

    return res.status(200).json({
      success: true,
      message: `Pengguna berhasil ${is_active ? 'diaktifkan' : 'dinonaktifkan'}`
    });
  } catch (err) {
    logEvent(
      "Toggle User Status Error",
      req.user.email,
      "Gagal mengubah status pengguna",
      { error: err.message }
    );
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server: " + err.message
    });
  }
});

/* ========== JALANKAN SERVER ========== */
app.listen(port, () => {
  console.log(`🚀 Server berjalan di http://localhost:${port}`);
});