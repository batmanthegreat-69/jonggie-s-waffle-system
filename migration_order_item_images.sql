USE jonggies_waffle;

ALTER TABLE order_items ADD COLUMN image VARCHAR(255) NULL;

-- Preserve the current menu photo for existing orders when names still match.
UPDATE order_items oi
JOIN items i ON i.name = oi.name
SET oi.image = i.image
WHERE oi.image IS NULL;
