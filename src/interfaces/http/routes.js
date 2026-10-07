const express = require('express');
const session = require('express-session');
const AppError = require('../../domain/AppError');
const { STATUSES, sanitizeCode } = require('../../domain/order');
const { upload, removeFile, removeMenuImage } = require('../../infrastructure/uploads');
const MenuService = require('../../application/MenuService');
const OrderService = require('../../application/OrderService');
const CustomerService = require('../../application/CustomerService');
const StaffService = require('../../application/StaffService');
const ProofService = require('../../application/ProofService');

function ah(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch((err) => {
      if (err instanceof AppError) {
        return res.status(err.status).json({ error: err.message });
      }
      next(err);
    });
  };
}

const needCustomer = (req, res, next) => {
  if (req.session.customer) return next();
  return res.status(401).json({ error: 'Please log in' });
};

const needStaff = (req, res, next) => {
  if (req.session.staff) return next();
  return res.status(401).json({ error: 'Please log in' });
};

function createApp() {
  const app = express();

  app.use(express.json());
  app.use(session({
    secret: process.env.SESSION_SECRET || 'change-me',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 12 * 3600 * 1000 }
  }));
  app.use(express.static('public'));

  app.get('/api/menu', ah(async (req, res) => {
    res.json(await MenuService.getMenu());
  }));

  app.get('/api/proof-gallery', ah(async (req, res) => {
    res.json(await ProofService.getGallery());
  }));

  app.post('/api/orders', ah(async (req, res) => {
    const result = await OrderService.placeOrder({
      customerName: req.body.customer,
      tableNo: req.body.table_no,
      lines: req.body.lines,
      cashGiven: req.body.cash_given,
      customer: req.session.customer
    });

    req.session.orders = [...(req.session.orders || []).slice(-9), result.id];
    res.json(result);
  }));

  app.get('/api/orders/:id', ah(async (req, res) => {
    const order = await OrderService.getOrderById(req.params.id, req.session.orders || []);
    res.json(order);
  }));

  app.post('/api/orders/:id/proof', (req, res, next) => {
    const orderId = Number(req.params.id);
    if (!(req.session.orders || []).includes(orderId)) {
      return res.status(403).json({ error: 'This order does not belong to your session' });
    }
    upload.single('photo')(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          error: err.code === 'LIMIT_FILE_SIZE' ? 'Photo must be 3 MB or smaller' : 'Upload failed'
        });
      }
      next();
    });
  }, ah(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Choose a JPG, PNG, or WebP photo' });
    }

    const order = await OrderService.getOrderById(req.params.id, req.session.orders || []);
    if (order.status !== 'Completed') {
      removeFile(req.file.filename);
      return res.status(400).json({ error: 'You can only upload proof after the order is completed.' });
    }

    const customerName = req.session.customer ? req.session.customer.name : (req.body.customer_name || 'Happy customer');
    const result = await ProofService.addProof(req.params.id, customerName, req.body.caption, req.file);
    res.json(result);
  }));

  app.post('/api/customer/register', ah(async (req, res) => {
    const result = await CustomerService.register({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password
    });
    req.session.customer = { id: result.id, name: result.name };
    res.json({ name: result.name });
  }));

  app.post('/api/customer/login', ah(async (req, res) => {
    const result = await CustomerService.login({
      email: req.body.email,
      password: req.body.password
    });
    req.session.customer = { id: result.id, name: result.name };
    res.json({ name: result.name });
  }));

  app.post('/api/customer/logout', (req, res) => {
    delete req.session.customer;
    res.json({ ok: true });
  });

  app.get('/api/customer/me', (req, res) => {
    res.json({ name: req.session.customer ? req.session.customer.name : null });
  });

  app.get('/api/customer/orders', needCustomer, ah(async (req, res) => {
    const orders = await OrderService.getCustomerOrders(req.session.customer.id);
    res.json(orders);
  }));

  app.post('/api/login', ah(async (req, res) => {
    const result = await StaffService.login({
      username: req.body.username,
      password: req.body.password
    });
    req.session.staff = result.user;
    res.json(result);
  }));

  app.post('/api/logout', (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });

  app.get('/api/me', (req, res) => {
    res.json({ user: req.session.staff || null });
  });

  app.get('/api/staff/orders', needStaff, ah(async (req, res) => {
    const { date, search } = req.query;
    if (date !== undefined && (
      typeof date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(Date.parse(`${date}T00:00:00.000Z`)) ||
      new Date(`${date}T00:00:00.000Z`).toISOString().slice(0, 10) !== date
    )) {
      throw new AppError(400, 'A valid order date is required');
    }
    if (search !== undefined && (typeof search !== 'string' || search.length > 100)) {
      throw new AppError(400, 'Search must be 100 characters or fewer');
    }

    const orders = await OrderService.getStaffOrders(date || null, (search || '').trim());
    res.json(orders);
  }));

  app.post('/api/staff/confirm', needStaff, ah(async (req, res) => {
    const code = sanitizeCode(req.body.code);
    const order = await OrderService.confirmOrder(code);
    res.json(order);
  }));

  app.patch('/api/staff/orders/:id', needStaff, ah(async (req, res) => {
    const patch = {};
    if (req.body.status && STATUSES.includes(req.body.status)) patch.status = req.body.status;
    if (req.body.paid !== undefined) patch.paid = !!req.body.paid;
    const result = await OrderService.updateOrderStatus(req.params.id, patch);
    res.json(result);
  }));

  app.post('/api/staff/items', needStaff, ah(async (req, res) => {
    const result = await MenuService.addItem({
      name: req.body.name,
      category: req.body.category,
      price: req.body.price
    });
    res.json(result);
  }));

  app.patch('/api/staff/items/:id', needStaff, ah(async (req, res) => {
    const result = await MenuService.updateItem(req.params.id, {
      available: req.body.available,
      price: req.body.price
    });
    res.json(result);
  }));

  app.post('/api/staff/items/:id/image', needStaff, (req, res, next) => {
    upload.single('photo')(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          error: err.code === 'LIMIT_FILE_SIZE' ? 'Photo must be 3 MB or smaller' : 'Upload failed'
        });
      }
      next();
    });
  }, ah(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Choose a JPG, PNG, or WebP photo' });
    }

    const item = await MenuService.getItemImage(req.params.id);
    if (!item) {
      removeFile(req.file.filename);
      return res.status(404).json({ error: 'Item not found' });
    }

    await MenuService.setItemImage(req.params.id, req.file.filename);
    await removeMenuImage(item);
    res.json({ image: req.file.filename });
  }));

  app.delete('/api/staff/items/:id/image', needStaff, ah(async (req, res) => {
    const image = await MenuService.getItemImage(req.params.id);
    if (image) {
      await MenuService.clearItemImage(req.params.id);
      await removeMenuImage(image);
    }
    res.json({ ok: true });
  }));

  app.delete('/api/staff/items/:id', needStaff, ah(async (req, res) => {
    const image = await MenuService.deleteItem(req.params.id);
    if (image) await removeMenuImage(image);
    res.json({ ok: true });
  }));

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong on the server' });
  });

  return app;
}

module.exports = { createApp, needCustomer, needStaff };
