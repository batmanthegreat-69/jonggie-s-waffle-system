-- Already have the database? Run this once in Workbench (your data is kept).
USE jonggies_waffle;
ALTER TABLE orders ADD COLUMN code VARCHAR(8) NULL, ADD COLUMN cash_given DECIMAL(8,2) NULL;
