-- Already have the database? Run this once in Workbench (your data is kept).
USE jonggies_waffle;
ALTER TABLE items ADD COLUMN image VARCHAR(255) NULL;
