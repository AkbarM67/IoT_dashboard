const db = require('../db');

const getLogs = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;

  try {
    const countResult = await db.query('SELECT COUNT(*) FROM logs');
    const totalLogs = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalLogs / limit);

    const result = await db.query(`
      SELECT id, event_time, event_type, actor, description, details
      FROM logs
      ORDER BY event_time DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    res.json({
      success: true,
      message: 'Data log berhasil diambil',
      data: result.rows.map(row => ({
        ...row,
        details: JSON.parse(row.details)
      })),
      pagination: {
        current_page: page,
        limit_per_page: limit,
        total_logs: totalLogs,
        total_pages: totalPages
      }
    });

  } catch (error) {
    console.error('Error ambil log:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data log',
      error: error.message
    });
  }
};

module.exports = { getLogs };
