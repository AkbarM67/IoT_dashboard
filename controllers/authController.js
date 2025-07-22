const userModel = require('../models/userModel');

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email dan password wajib diisi' });
  }

  try {
    const user = await userModel.login(email, password);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Email atau password salah' });
    }

    res.json({
      success: true,
      message: 'Login berhasil',
      data: {
        id: user.id,
        full_name: user.full_name,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan saat login' });
  }
};

const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Semua field wajib diisi' });
  }

  try {
    const userId = await userModel.register(name, email, password);

    res.status(201).json({
      success: true,
      message: 'Registrasi berhasil',
      user_id: userId
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Gagal melakukan registrasi' });
  }
};

module.exports = { login, register };
