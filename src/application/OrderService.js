const AppError = require('../domain/AppError');
const { clampQty, normalizeCash, generateOrderCode } = require('../domain/order');
const MenuRepository = require('../infrastructure/repositories/MenuRepository');
const OrderRepository = require('../infrastructure/repositories/OrderRepository');

class OrderService {
  async getMenu() {
    return MenuRepository.getMenu();
  }

  async placeOrder({ customerName, tableNo, lines, cashGiven, customer }) {
    const customerLabel = String(customerName || (customer && customer.name) || '').trim();

    if (!customerLabel || !tableNo || !Array.isArray(lines) || !lines.length) {
      throw new AppError(400, 'Name, table number, and at least one item are required');
    }

    let total = 0;
    const rows = [];

    for (const line of lines) {
      const item = await MenuRepository.getAvailableItem(line.item_id);
      if (!item) {
        throw new AppError(400, 'An item in your order is no longer available');
      }

      const addons = [];
      for (const addonId of line.addon_ids || []) {
        const addon = await MenuRepository.getAddonById(addonId);
        if (addon) addons.push(addon);
      }

      const qty = clampQty(line.qty);
      const price = Number(item.price) + addons.reduce((sum, addon) => sum + Number(addon.price), 0);
      total += price * qty;
      rows.push({
        name: item.name,
        addons: addons.map((addon) => addon.name).join(', '),
        qty,
        price,
        image: item.image
      });
    }

    let cash = null;
    try {
      cash = normalizeCash(cashGiven, total);
    } catch (error) {
      throw new AppError(400, error.message);
    }

    let code;
    let tries = 0;
    do {
      code = generateOrderCode();
      const existing = await OrderRepository.getOrderByCode(code);
      if (!existing) break;
    } while (++tries < 10);

    const orderId = await OrderRepository.createOrderWithItems({
      customerName: customerLabel.slice(0, 60),
      customerId: customer ? customer.id : null,
      tableNo,
      total,
      code,
      cashGiven: cash,
      rows
    });

    return { id: orderId, code };
  }

  async getOrderById(orderId, orderIdsInSession) {
    const order = await OrderRepository.getOrderById(orderId);
    if (!order) {
      throw new AppError(404, 'Order not found');
    }

    if (!(orderIdsInSession || []).includes(order.id)) {
      delete order.code;
    }

    return order;
  }

  async getCustomerOrders(customerId) {
    return OrderRepository.getCustomerOrders(customerId);
  }

  async getStaffOrders(date, search) {
    return OrderRepository.getStaffOrders(date, search);
  }

  async confirmOrder(code) {
    const result = await OrderRepository.confirmPendingOrder(code);
    if (!result) {
      throw new AppError(404, 'No waiting order has that code');
    }
    return result;
  }

  async updateOrderStatus(orderId, patch) {
    await OrderRepository.updateOrder(orderId, patch);
    return { ok: true };
  }
}

module.exports = new OrderService();
