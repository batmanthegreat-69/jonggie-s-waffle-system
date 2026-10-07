const pool = require('../db/pool');

class MenuRepository {
  async getMenu() {
    const [items] = await pool.query('SELECT * FROM items ORDER BY category DESC, id');
    const [addons] = await pool.query('SELECT * FROM addons');
    return { items, addons };
  }

  async getAvailableItem(itemId) {
    const [[item]] = await pool.query('SELECT * FROM items WHERE id = ? AND available = 1', [itemId]);
    return item;
  }

  async getItemById(itemId) {
    const [[item]] = await pool.query('SELECT * FROM items WHERE id = ?', [itemId]);
    return item;
  }

  async getAddonById(addonId) {
    const [[addon]] = await pool.query('SELECT * FROM addons WHERE id = ?', [addonId]);
    return addon;
  }

  async addItem({ name, category, price }) {
    const [result] = await pool.query('INSERT INTO items (name, category, price) VALUES (?, ?, ?)', [name, category || 'Waffles', +price]);
    return result.insertId;
  }

  async updateItem(itemId, patch) {
    const updates = [];
    const values = [];

    if (patch.available !== undefined) {
      updates.push('available = ?');
      values.push(patch.available ? 1 : 0);
    }

    if (patch.price !== undefined && +patch.price >= 0) {
      updates.push('price = ?');
      values.push(+patch.price);
    }

    if (!updates.length) return;
    values.push(itemId);
    await pool.query(`UPDATE items SET ${updates.join(', ')} WHERE id = ?`, values);
  }

  async deleteItem(itemId) {
    const [[old]] = await pool.query('SELECT image FROM items WHERE id = ?', [itemId]);
    await pool.query('DELETE FROM items WHERE id = ?', [itemId]);
    return old ? old.image : null;
  }

  async getItemImage(itemId) {
    const [[item]] = await pool.query('SELECT image FROM items WHERE id = ?', [itemId]);
    return item ? item.image : null;
  }

  async setItemImage(itemId, filename) {
    await pool.query('UPDATE items SET image = ? WHERE id = ?', [filename, itemId]);
  }

  async clearItemImage(itemId) {
    await pool.query('UPDATE items SET image = NULL WHERE id = ?', [itemId]);
  }
}

module.exports = new MenuRepository();
