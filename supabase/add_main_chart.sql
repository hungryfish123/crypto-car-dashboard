-- Add a special row for the main chart CA
-- This row will NOT be displayed as a marketplace item
-- It is editable from Admin Panel and used by the main page chart

INSERT INTO item_mappings (item_id, contract_address, hidden, buy_url)
VALUES ('main_chart', NULL, true, NULL)
ON CONFLICT (item_id) DO NOTHING;

-- Verify it was added
SELECT * FROM item_mappings WHERE item_id = 'main_chart';
