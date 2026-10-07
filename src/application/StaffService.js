const bcrypt = require('bcryptjs');
const AppError = require('../domain/AppError');
const StaffRepository = require('../infrastructure/repositories/StaffRepository');

class StaffService {
  async login({ username, password }) {
    const staff = await StaffRepository.getByUsername(username || '');
    if (!staff || !bcrypt.compareSync(password || '', staff.hash)) {
      throw new AppError(401, 'Wrong username or password');
    }
    return { user: staff.username };
  }

  async createAdminIfNeeded() {
    const count = await StaffRepository.getStaffCount();
    if (!count) {
      const adminPassword = process.env.ADMIN_PASSWORD || 'waffle123';
      await StaffRepository.createAdminAccount(adminPassword);
      return 'admin';
    }
    return null;
  }
}

module.exports = new StaffService();
