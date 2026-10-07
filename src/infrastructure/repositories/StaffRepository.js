const bcrypt = require('bcryptjs');
const pool = require('../db/pool');

class StaffRepository {
  async getByUsername(username) {
    const [[staff]] = await pool.query('SELECT * FROM staff WHERE username = ?', [username]);
    return staff || null;
  }

  async getStaffCount() {
    const [[{ c }]] = await pool.query('SELECT COUNT(*) AS c FROM staff');
    return c;
  }

  async createAdminAccount(password) {
    await pool.query('INSERT INTO staff (username, hash) VALUES (?, ?)', ['admin', bcrypt.hashSync(password, 10)]);
  }
}

module.exports = new StaffRepository();
