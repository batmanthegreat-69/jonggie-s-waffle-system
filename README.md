# Jonggie's Belgian Waffle (Node.js + MySQL)

1. Open MySQL Workbench, connect to your local server, open `schema.sql`, and run it.
2. Copy `.env.example` to `.env` and fill in your MySQL password and an admin password.
3. If port 3000 is already in use, set `PORT=3001` (or another free port) in `.env`.
4. In this folder run: `npm install` then `npm start`
5. Already ran schema.sql earlier? Run migration_accounts.sql once instead.
6. If you already have the database and want the customer proof gallery, run `migration_proof_photos.sql` once.
7. Customers: http://localhost:3000   Staff: http://localhost:3000/staff.html (user: admin)

Already have the database? Also run migration_code.sql once (adds the order code and cash columns).
Already have the database? Also run migration_images.sql once (adds the photo column). Then run npm install again (new package: multer).
Already have the database? Also run migration_order_item_images.sql once to show product photos in existing and new order details.
