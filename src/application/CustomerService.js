const bcrypt = require('bcryptjs');
const AppError = require('../domain/AppError');
const CustomerRepository = require('../infrastructure/repositories/CustomerRepository');

class CustomerService {
  async register({ name, email, password }) {
    const cleanName = String(name || '').trim().slice(0, 60);
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPassword = String(password || '');

    if (!cleanName || !/^\S+@\S+\.\S+$/.test(cleanEmail) || cleanPassword.length < 6) {
      throw new AppError(400, 'Enter your name, a valid email, and a password of at least 6 characters');
    }

    const existing = await CustomerRepository.findByEmail(cleanEmail);
    if (existing) {
      throw new AppError(400, 'That email already has an account. Try logging in.');
    }

    const id = await CustomerRepository.createCustomer({
      name: cleanName,
      email: cleanEmail,
      password: cleanPassword
    });

    return { id, name: cleanName };
  }

  async login({ email, password }) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const customer = await CustomerRepository.findByEmail(cleanEmail);

    if (!customer || !bcrypt.compareSync(String(password || ''), customer.hash)) {
      throw new AppError(401, 'Wrong email or password');
    }

    return { id: customer.id, name: customer.name };
  }
}

module.exports = new CustomerService();
