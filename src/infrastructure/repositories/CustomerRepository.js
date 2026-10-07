const bcrypt = require('bcryptjs');
const pool = require('../db/pool');

class CustomerRepository {
  async findByEmail(email) {
    const [[customer]] = await pool.query('SELECT * FROM customers WHERE email = ?', [email]);
    return customer || null;
  }

  async createCustomer({ name, email, password }) {
    const [result] = await pool.query('INSERT INTO customers (name, email, hash) VALUES (?, ?, ?)', [name, email, bcrypt.hashSync(password, 10)]);
    return result.insertId;
  }
}

module.exports = new CustomerRepository();
