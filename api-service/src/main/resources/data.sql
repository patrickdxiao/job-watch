INSERT INTO companies (name, slug, platform, platform_id, logo_url) VALUES
    ('Stripe', 'stripe', 'greenhouse', 'stripe', 'https://www.google.com/s2/favicons?domain=stripe.com&sz=64'),
    ('Airbnb', 'airbnb', 'greenhouse', 'airbnb', 'https://www.google.com/s2/favicons?domain=airbnb.com&sz=64'),
    ('Notion', 'notion', 'ashby', 'notion', 'https://www.google.com/s2/favicons?domain=notion.so&sz=64'),
    ('Ramp', 'ramp', 'ashby', 'ramp', 'https://www.google.com/s2/favicons?domain=ramp.com&sz=64'),
    ('Coinbase', 'coinbase', 'greenhouse', 'coinbase', 'https://www.google.com/s2/favicons?domain=coinbase.com&sz=64'),
    ('Reddit', 'reddit', 'greenhouse', 'reddit', 'https://www.google.com/s2/favicons?domain=reddit.com&sz=64'),
    ('Databricks', 'databricks', 'greenhouse', 'databricks', 'https://www.google.com/s2/favicons?domain=databricks.com&sz=64')
ON CONFLICT (slug) DO NOTHING;