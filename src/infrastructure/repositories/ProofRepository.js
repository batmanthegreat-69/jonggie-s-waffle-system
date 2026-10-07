const pool = require('../db/pool');

class ProofRepository {
  async create({ orderId, customerName, caption, image }) {
    const [result] = await pool.query(
      'INSERT INTO satisfaction_photos (order_id, customer_name, caption, image) VALUES (?, ?, ?, ?)',
      [orderId, customerName, caption || '', image]
    );

    return { id: result.insertId, orderId, customerName, caption: caption || '', image };
  }

  async getGallery(limit = 12) {
    const [rows] = await pool.query(
      'SELECT id, order_id, customer_name, caption, image, created FROM satisfaction_photos ORDER BY created DESC LIMIT ?',
      [limit]
    );
    return rows;
  }
}

module.exports = new ProofRepository();
