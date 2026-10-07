const AppError = require('../domain/AppError');
const MenuRepository = require('../infrastructure/repositories/MenuRepository');

class MenuService {
  async getMenu() {
    return MenuRepository.getMenu();
  }

  async addItem({ name, category, price }) {
    if (!name || !(+price >= 0)) {
      throw new AppError(400, 'Name and price are required');
    }

    await MenuRepository.addItem({
      name: String(name).trim(),
      category: category || 'Waffles',
      price
    });

    return { ok: true };
  }

  async updateItem(itemId, patch) {
    await MenuRepository.updateItem(itemId, patch);
    return { ok: true };
  }

  async deleteItem(itemId) {
    return MenuRepository.deleteItem(itemId);
  }

  async getItemImage(itemId) {
    return MenuRepository.getItemImage(itemId);
  }

  async setItemImage(itemId, filename) {
    await MenuRepository.setItemImage(itemId, filename);
    return { image: filename };
  }

  async clearItemImage(itemId) {
    await MenuRepository.clearItemImage(itemId);
    return { ok: true };
  }
}

module.exports = new MenuService();
