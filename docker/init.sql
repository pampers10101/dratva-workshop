-- Пробная схема PostgreSQL для мастерской реставрации кожи «Дратва» (Самара)
-- Совместима с pgAdmin 4, psql, Docker postgres:16, Neon и Supabase

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS repair_requests (
  id SERIAL PRIMARY KEY,
  ticket_code TEXT NOT NULL UNIQUE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  contact TEXT NOT NULL,
  item_type TEXT NOT NULL,
  repairs TEXT NOT NULL,
  urgent BOOLEAN NOT NULL DEFAULT FALSE,
  estimated_min INTEGER NOT NULL,
  estimated_max INTEGER NOT NULL,
  estimated_days TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  master_comment TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_repair_requests_ticket_code ON repair_requests (ticket_code);
CREATE INDEX IF NOT EXISTS idx_repair_requests_status ON repair_requests (status);

CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  district TEXT NOT NULL,
  item_restored TEXT NOT NULL,
  before_summary TEXT NOT NULL,
  outcome_text TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Пробные записи для проверки трекера и отзывов
INSERT INTO repair_requests (
  ticket_code, client_name, contact, item_type, repairs,
  urgent, estimated_min, estimated_max, estimated_days,
  notes, status, master_comment
)
VALUES
  (
    'DRT-2401', 'Елена Морозова', '@emorozova_smr', 'bag',
    '["Урез и ручки", "Покраска и тон"]', FALSE, 3800, 6200, '4–6 дн.',
    'Сумка Furla, облезла кромка на обеих ручках.', 'in_work',
    'Сняли старую резину, положили два слоя Fenice. Сушится до завтра, потом полировка воском.'
  ),
  (
    'DRT-2408', 'Сергей Власов', '+7 (927) 614-28-90', 'briefcase',
    '["Замена молнии", "Соль и воск"]', FALSE, 3600, 6100, '3–5 дн.',
    'Кожаный портфель, заедает бегунок, кожа подсохла.', 'ready',
    'Поставили латунную YKK Excella в родные проколы и пропитали воском. Можно забирать!'
  )
ON CONFLICT (ticket_code) DO NOTHING;

INSERT INTO reviews (author_name, district, item_restored, before_summary, outcome_text)
SELECT v.author_name, v.district, v.item_restored, v.before_summary, v.outcome_text
FROM (
  VALUES
    ('Елена Морозова', 'Октябрьский район', 'Сумка Furla из зернистой кожи',
     'Ручки облезли до ниток, в двух мастерских сказали «только менять целиком».',
     'Алексей снял старую заливку, пересобрал урез и подобрал оттенок точь-в-точь в мой бордовый. Третий месяц ношу каждый день — кромка как литая, не липнет в жару.'),
    ('Сергей Власов', 'Ленинский район', 'Отцовский кожаный портфель 2004 года',
     'Вырвало пряжку с мясом, кожа стала сухой как картон.',
     'Заранее предупредил, что шрам от вырванной пряжки чуть останется виден, но укрепил изнутри и поставил латунь вместо старого сплава. Портфель пахнет воском и стал мягче, чем десять лет назад.'),
    ('Ольга Кравцова', 'Самара, ул. Ново-Садовая', 'Чёрная косуха и две пары сапог',
     'Зацепила рукав в лифте и угробила сапоги реагентами у метро.',
     'Самое приятное — никакой «продажи допов». За вторую пару сапог мастер вообще отговорил платить за покраску, сделал только чистку от соли и воск. Сэкономил мне 3 тысячи.')
) AS v(author_name, district, item_restored, before_summary, outcome_text)
WHERE NOT EXISTS (SELECT 1 FROM reviews LIMIT 1);
