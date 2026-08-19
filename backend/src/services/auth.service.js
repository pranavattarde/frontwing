const { pool } = require('../config/db');
const { hashPassword, comparePassword } = require('../utils/hash');
const { generateToken } = require('../utils/jwt');

class AuthService {
  static async register(dto) {
    const { email, password, name } = dto;
    
    // Check if user exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      throw new Error('User with this email already exists');
    }

    const password_hash = await hashPassword(password);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id, email, name`,
      [email.toLowerCase().trim(), password_hash, name || null]
    );

    const user = result.rows[0];
    const token = generateToken({ id: user.id, email: user.email, name: user.name });

    return { token, user };
  }

  static async login(dto) {
    const { email, password } = dto;

    const result = await pool.query(
      `SELECT id, email, password_hash, name FROM users WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid email or password');
    }

    const row = result.rows[0];
    const isPasswordValid = await comparePassword(password, row.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    const user = {
      id: row.id,
      email: row.email,
      name: row.name,
    };

    const token = generateToken(user);
    return { token, user };
  }

  static async getUserById(id) {
    const result = await pool.query(
      `SELECT id, email, name FROM users WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }
}

module.exports = {
  AuthService
};
