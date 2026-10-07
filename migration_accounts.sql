-- Already ran schema.sql before? Run THIS file once in Workbench instead (your existing data is kept).
USE jonggies_waffle;
CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(60) NOT NULL,
  email VARCHAR(120) UNIQUE NOT NULL,
  hash VARCHAR(100) NOT NULL
);
ALTER TABLE orders ADD COLUMN customer_id INT NULL,
  ADD FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
