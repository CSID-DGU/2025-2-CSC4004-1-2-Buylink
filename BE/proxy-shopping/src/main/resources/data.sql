-- src/main/resources/data.sql
-- H2 초기데이터: 장바구니 아이템 2개 (세션별 1개씩)

INSERT INTO cart_item (proxy_sid, product_name, price_krw, image_url, created_at) VALUES
('sid-demo-1','몬치치 마스코트 키체인 3', 11990, 'https://example.com/monchhichi.jpg', CURRENT_TIMESTAMP),
('sid-demo-2','포켓몬 인형 꼬부기 S',        7500,  'https://example.com/pokemon_squirtle_s.jpg', CURRENT_TIMESTAMP);
