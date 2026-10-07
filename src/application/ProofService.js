const AppError = require('../domain/AppError');
const ProofRepository = require('../infrastructure/repositories/ProofRepository');

class ProofService {
  async getGallery() {
    return ProofRepository.getGallery();
  }

  async addProof(orderId, customerName, caption, file) {
    if (!orderId || !file) {
      throw new AppError(400, 'Please choose a photo to upload');
    }

    const name = String(customerName || '').trim() || 'Happy customer';
    const text = String(caption || '').trim().slice(0, 120);

    const saved = await ProofRepository.create({
      orderId,
      customerName: name.slice(0, 60),
      caption: text,
      image: file.filename
    });

    return saved;
  }
}

module.exports = new ProofService();
