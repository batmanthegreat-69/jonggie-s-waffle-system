-- Run this whole file once in MySQL Workbench (File > Open SQL Script, then click the lightning bolt).
CREATE DATABASE IF NOT EXISTS jonggies_waffle;
USE jonggies_waffle;

CREATE TABLE IF NOT EXISTS staff (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  hash VARCHAR(100) NOT NULL
);
CREATE TABLE IF NOT EXISTS items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(30) NOT NULL,
  price DECIMAL(8,2) NOT NULL,
  available TINYINT(1) DEFAULT 1,
  image VARCHAR(255) NULL           -- file name of the item's photo in public/uploads
);
CREATE TABLE IF NOT EXISTS addons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(8,2) NOT NULL
);
-- Optional customer accounts. Guests have no row here; their orders have customer_id = NULL.
CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(60) NOT NULL,
  email VARCHAR(120) UNIQUE NOT NULL,
  hash VARCHAR(100) NOT NULL
);
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer VARCHAR(60) NOT NULL,
  customer_id INT NULL,
  table_no VARCHAR(10) NOT NULL,
  status VARCHAR(20) DEFAULT 'Received',
  paid TINYINT(1) DEFAULT 0,
  total DECIMAL(8,2) NOT NULL,
  code VARCHAR(8) NULL,            -- code the customer shows to the cashier
  cash_given DECIMAL(8,2) NULL,    -- cash the customer says they will pay with
  created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  addons VARCHAR(255),
  qty INT NOT NULL,
  price DECIMAL(8,2) NOT NULL,
  image VARCHAR(255) NULL,          -- photo filename captured when the order was placed
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS satisfaction_photos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  customer_name VARCHAR(60) NOT NULL,
  caption VARCHAR(120) DEFAULT '',
  image VARCHAR(255) NOT NULL,
  created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Starter menu (change the names and prices to match the real cafe)
INSERT INTO items (name, category, price) VALUES
  ('Classic Belgian Waffle','Waffles',80), ('Chocolate Overload','Waffles',120),
  ('Strawberry Cream','Waffles',130), ('Banana Caramel','Waffles',120),
  ('Iced Coffee','Drinks',70), ('Hot Chocolate','Drinks',75),
  ('Margherita Pizza','Pizza',180), ('Cheesy Pepperoni Pizza','Pizza',210),
  ('Vanilla Ice Cream','Ice Cream',85), ('Chocolate Sundae','Ice Cream',110),
  ('Crispy Fries','Fries',95), ('Cheese Fries','Fries',120),
  ('Classic Bubble Tea','Bubble Tea',110), ('Strawberry Bubble Tea','Bubble Tea',120);
INSERT INTO addons (name, price) VALUES
  ('Extra chocolate syrup',15), ('Whipped cream',20), ('Ice cream scoop',30), ('Fresh strawberries',25);
