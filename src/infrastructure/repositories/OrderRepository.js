const pool = require('../db/pool');

class OrderRepository {
  async createOrderWithItems(orderPayload) {
    const { customerName, customerId, tableNo, total, code, cashGiven, rows } = orderPayload;
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();
      const [result] = await conn.query(
        "INSERT INTO orders (customer, customer_id, table_no, total, status, code, cash_given) VALUES (?, ?, ?, ?, 'Pending', ?, ?)",
        [customerName.slice(0, 60), customerId || null, String(tableNo).slice(0, 10), total, code, cashGiven]
      );

      for (const row of rows) {
        await conn.query(
          'INSERT INTO order_items (order_id, name, addons, qty, price, image) VALUES (?, ?, ?, ?, ?, ?)',
          [result.insertId, row.name, row.addons, row.qty, row.price, row.image]
        );
      }

      await conn.commit();
      return result.insertId;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  async getOrderById(orderId) {
    const [[order]] = await pool.query('SELECT id, status, total, table_no, code FROM orders WHERE id = ?', [orderId]);
    return order || null;
  }

  async getOrderByCode(code) {
    const [[order]] = await pool.query("SELECT * FROM orders WHERE code = ? AND status = 'Pending'", [code]);
    return order || null;
  }

  async getCustomerOrders(customerId) {
    const [rows] = await pool.query(
      'SELECT id, table_no, status, total, created FROM orders WHERE customer_id = ? ORDER BY id DESC LIMIT 10',
      [customerId]
    );

    for (const order of rows) {
      const [items] = await pool.query('SELECT name, qty, image FROM order_items WHERE order_id = ?', [order.id]);
      order.items = items;
    }

    return rows;
  }

  async getStaffOrders(date, search = '') {
    let where = 'created >= CURDATE() AND created < CURDATE() + INTERVAL 1 DAY';
    const values = [];

    if (date) {
      where = 'created >= ? AND created < DATE_ADD(?, INTERVAL 1 DAY)';
      values.push(date, date);
    }

    if (search) {
      where += ' AND (customer LIKE ? OR CAST(id AS CHAR) LIKE ?)';
      values.push(`%${search}%`, `%${search.replace(/^#/, '')}%`);
    }

    const [orders] = await pool.query(`SELECT * FROM orders WHERE ${where} ORDER BY id DESC`, values);
    for (const order of orders) {
      const [items] = await pool.query('SELECT name, addons, qty, image FROM order_items WHERE order_id = ?', [order.id]);
      order.items = items;
    }
    return orders;
  }

  async updateOrder(id, patch) {
    const updates = [];
    const values = [];

    if (patch.status) {
      updates.push('status = ?');
      values.push(patch.status);
    }

    if (patch.paid !== undefined) {
      updates.push('paid = ?');
      values.push(patch.paid ? 1 : 0);
    }

    if (!updates.length) return;

    values.push(id);
    await pool.query(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`, values);
  }

  async confirmPendingOrder(code) {
    const order = await this.getOrderByCode(code);
    if (!order) return null;
    await this.updateOrder(order.id, { status: 'Received', paid: true });
    return {
      id: order.id,
      customer: order.customer,
      table_no: order.table_no,
      total: order.total,
      cash_given: order.cash_given
    };
  }
}

module.exports = new OrderRepository();
