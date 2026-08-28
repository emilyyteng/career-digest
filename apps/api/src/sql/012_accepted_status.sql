-- Rename legacy application status hired → accepted
UPDATE applications SET status = 'accepted' WHERE status = 'hired';
