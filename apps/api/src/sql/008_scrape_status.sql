ALTER TABLE postings ADD COLUMN IF NOT EXISTS scraped_at timestamptz;
ALTER TABLE postings ADD COLUMN IF NOT EXISTS scrape_status text;
