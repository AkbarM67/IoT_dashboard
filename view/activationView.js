// src/views/activationViews.js

const activationListPage = (data) => {
  let tableRows = data.map(row => `
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
      <td class="px-3 py-3 ${row.status === "Aktif" ? "text-green-600 font-bold" : "text-red-600 font-bold"}">${row.status}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Daftar Aktivasi</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-blue-50 p-8 min-h-screen font-sans">
  <div class="flex border justify-between items-center px-4 py-2">
    <h2 class="text-3xl font-bold text-blue-800">Daftar Aktivasi Perangkat</h2>
    <a href="activations/new" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
      Tambah DeviceID
    </a>
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
          ${tableRows}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
};


const activationFormPage = () => `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Tambah DeviceID</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-blue-50 p-8 min-h-screen font-sans">
  <div class="mb-4">
    <a href="/api/activation-list" class="text-blue-700 hover:text-blue-900 text-lg font-medium">← Kembali</a>
  </div>
  <h1 class="text-3xl font-bold text-blue-800 mb-8">Tambah DeviceID</h1>
<form method="POST" action="/api/activations/new">
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div class="mb-6">
      <label for="deviceId" class="block text-lg font-medium text-blue-800 mb-2">Device ID *</label>
      <input type="text" id="deviceId" name="device_id" required placeholder="Masukkan Device ID"
        class="w-full px-4 py-3 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg">
    </div>

    <div class="mb-6">
      <label for="mikroType" class="block text-lg font-medium text-blue-800 mb-2">Mikrocontroller Type *</label>
      <input type="text" id="mikroType" name="mikro_type" required placeholder="ESP32, Arduino Uno, etc."
        class="w-full px-4 py-3 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg">
    </div>

    <div class="mb-6">
      <label for="owner" class="block text-lg font-medium text-blue-800 mb-2">Owner *</label>
      <input type="text" id="owner" name="owner" required placeholder="Nama pemilik"
        class="w-full px-4 py-3 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg">
    </div>

    <div class="mb-6">
      <label for="author" class="block text-lg font-medium text-blue-800 mb-2">Author *</label>
      <input type="text" id="author" name="author" required placeholder="Developer/Author"
        class="w-full px-4 py-3 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg">
    </div>

    <div class="mb-6">
      <label for="manufacturer" class="block text-lg font-medium text-blue-800 mb-2">Manufacturer *</label>
      <input type="text" id="manufacturer" name="manufacturer" required placeholder="Nama Pabrikan"
        class="w-full px-4 py-3 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg">
    </div>

    <div class="mb-6">
      <label for="firmware_version" class="block text-lg font-medium text-blue-800 mb-2">Firmware Version *</label>
      <input type="text" id="firmware_version" name="firmware_version" required placeholder="v1.0.0"
        class="w-full px-4 py-3 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg">
    </div>
  </div>

  <input type="hidden" value="1990-01-01T00:00:00" id="activation_date" name="activation_date">

  <div class="mt-8">
    <button type="submit"
      class="bg-blue-600 hover:bg-blue-700 text-white text-lg font-medium px-6 py-3 rounded shadow">
      Simpan Aktivasi
    </button>
  </div>
</form>

</body>
</html>`;


module.exports = {
  activationListPage,
  activationFormPage
};
