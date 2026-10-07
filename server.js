require('dotenv').config();

const { createApp } = require('./src/interfaces/http/routes');
const StaffService = require('./src/application/StaffService');

const app = createApp();
const PORT = Number(process.env.PORT || 3000);

(async () => {
  try {
    const adminUser = await StaffService.createAdminIfNeeded();
    if (adminUser) {
      console.log('Created staff account: admin');
    }

    const server = app.listen(PORT, () => {
      console.log(`Running at http://localhost:${PORT}  (staff: /staff.html)`);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Stop the running process or set PORT in your .env file to another value.`);
        process.exit(1);
      }

      console.error('Server failed to start:', error);
      process.exit(1);
    });
  } catch (error) {
    console.error('Could not connect to MySQL. Check your .env values and that you ran schema.sql.\n', error.message);
    process.exit(1);
  }
})();
