const db = require('../db');

const login = async (email, password) => {
    const res = await db.query('SELECT * FROM users WHERE email = $1 AND password = $2', [email, password]);
    return res.rows[0];
    }

const register = async (name, email, password) => {
    const res = await db.query(
        'INSERT INTO users (full_name, email, password) VALUES ($1, $2, $3) RETURNING id',
        [name, email, password]
    );
    return res.rows[0].id;
}

const getAllUsers = async () => {
    const res = await db.query('SELECT id, full_name, email FROM users');
    return res.rows;
};

module.exports = { login, register, getAllUsers };
