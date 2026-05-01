-- ============================================================
-- HomeBites Test Data Seed
-- Run this entire script in your Supabase SQL Editor (service role)
-- Safe to re-run: uses ON CONFLICT DO NOTHING
-- ============================================================

-- ── Step 1: Test auth users ──────────────────────────────────
-- 20 fake restaurant owners (won't be used for real login)
-- User IDs follow pattern: feed000N-feed-feed-feed-feed0000000N
INSERT INTO auth.users (
  id, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_user_meta_data, role, aud
) VALUES
  ('feed0001-feed-feed-feed-feed00000001','amma.kitchen@homebites-test.com','$2a$10$PX.VtBbDlisVEtHvhDsWQOmMBCGYSCDJpkZjUYCFGKrDaRsSlvxsO','2024-01-01 00:00:00+00',now(),now(),'{"role":"home_restaurant"}','authenticated','authenticated'),
  ('feed0002-feed-feed-feed-feed00000002','casa.rodriguez@homebites-test.com','$2a$10$PX.VtBbDlisVEtHvhDsWQOmMBCGYSCDJpkZjUYCFGKrDaRsSlvxsO','2024-01-01 00:00:00+00',now(),now(),'{"role":"home_restaurant"}','authenticated','authenticated'),
  ('feed0003-feed-feed-feed-feed00000003','pho.saigon@homebites-test.com','$2a$10$PX.VtBbDlisVEtHvhDsWQOmMBCGYSCDJpkZjUYCFGKrDaRsSlvxsO','2024-01-01 00:00:00+00',now(),now(),'{"role":"home_restaurant"}','authenticated','authenticated'),
  ('feed0004-feed-feed-feed-feed00000004','curry.house@homebites-test.com','$2a$10$PX.VtBbDlisVEtHvhDsWQOmMBCGYSCDJpkZjUYCFGKrDaRsSlvxsO','2024-01-01 00:00:00+00',now(),now(),'{"role":"home_restaurant"}','authenticated','authenticated'),
  ('feed0005-feed-feed-feed-feed00000005','priya.kitchen@homebites-test.com','$2a$10$PX.VtBbDlisVEtHvhDsWQOmMBCGYSCDJpkZjUYCFGKrDaRsSlvxsO','2024-01-01 00:00:00+00',now(),now(),'{"role":"home_restaurant"}','authenticated','authenticated'),
  ('feed0006-feed-feed-feed-feed00000006','manila.flavors@homebites-test.com','$2a$10$PX.VtBbDlisVEtHvhDsWQOmMBCGYSCDJpkZjUYCFGKrDaRsSlvxsO','2024-01-01 00:00:00+00',now(),now(),'{"role":"home_restaurant"}','authenticated','authenticated'),
  ('feed0007-feed-feed-feed-feed00000007','dragon.house@homebites-test.com','$2a$10$PX.VtBbDlisVEtHvhDsWQOmMBCGYSCDJpkZjUYCFGKrDaRsSlvxsO','2024-01-01 00:00:00+00',now(),now(),'{"role":"home_restaurant"}','authenticated','authenticated'),
  ('feed0008-feed-feed-feed-feed00000008','med.breeze@homebites-test.com','$2a$10$PX.VtBbDlisVEtHvhDsWQOmMBCGYSCDJpkZjUYCFGKrDaRsSlvxsO','2024-01-01 00:00:00+00',now(),now(),'{"role":"home_restaurant"}','authenticated','authenticated'),
  ('feed0009-feed-feed-feed-feed00000009','brooklyn.desi@homebites-test.com','$2a$10$PX.VtBbDlisVEtHvhDsWQOmMBCGYSCDJpkZjUYCFGKrDaRsSlvxsO','2024-01-01 00:00:00+00',now(),now(),'{"role":"home_restaurant"}','authenticated','authenticated'),
  ('feed000a-feed-feed-feed-feed0000000a','queens.night@homebites-test.com','$2a$10$PX.VtBbDlisVEtHvhDsWQOmMBCGYSCDJpkZjUYCFGKrDaRsSlvxsO','2024-01-01 00:00:00+00',now(),now(),'{"role":"home_restaurant"}','authenticated','authenticated'),
  ('feed000b-feed-feed-feed-feed0000000b','chicago.wok@homebites-test.com','$2a$10$PX.VtBbDlisVEtHvhDsWQOmMBCGYSCDJpkZjUYCFGKrDaRsSlvxsO','2024-01-01 00:00:00+00',now(),now(),'{"role":"home_restaurant"}','authenticated','authenticated'),
  ('feed000c-feed-feed-feed-feed0000000c','spice.india@homebites-test.com','$2a$10$PX.VtBbDlisVEtHvhDsWQOmMBCGYSCDJpkZjUYCFGKrDaRsSlvxsO','2024-01-01 00:00:00+00',now(),now(),'{"role":"home_restaurant"}','authenticated','authenticated'),
  ('feed000d-feed-feed-feed-feed0000000d','sabor.latino@homebites-test.com','$2a$10$PX.VtBbDlisVEtHvhDsWQOmMBCGYSCDJpkZjUYCFGKrDaRsSlvxsO','2024-01-01 00:00:00+00',now(),now(),'{"role":"home_restaurant"}','authenticated','authenticated'),
  ('feed000e-feed-feed-feed-feed0000000e','thai.orchid@homebites-test.com','$2a$10$PX.VtBbDlisVEtHvhDsWQOmMBCGYSCDJpkZjUYCFGKrDaRsSlvxsO','2024-01-01 00:00:00+00',now(),now(),'{"role":"home_restaurant"}','authenticated','authenticated'),
  ('feed000f-feed-feed-feed-feed0000000f','seattle.pho@homebites-test.com','$2a$10$PX.VtBbDlisVEtHvhDsWQOmMBCGYSCDJpkZjUYCFGKrDaRsSlvxsO','2024-01-01 00:00:00+00',now(),now(),'{"role":"home_restaurant"}','authenticated','authenticated'),
  ('feed0010-feed-feed-feed-feed00000010','atlanta.desi@homebites-test.com','$2a$10$PX.VtBbDlisVEtHvhDsWQOmMBCGYSCDJpkZjUYCFGKrDaRsSlvxsO','2024-01-01 00:00:00+00',now(),now(),'{"role":"home_restaurant"}','authenticated','authenticated'),
  ('feed0011-feed-feed-feed-feed00000011','jc.biryani@homebites-test.com','$2a$10$PX.VtBbDlisVEtHvhDsWQOmMBCGYSCDJpkZjUYCFGKrDaRsSlvxsO','2024-01-01 00:00:00+00',now(),now(),'{"role":"home_restaurant"}','authenticated','authenticated'),
  ('feed0012-feed-feed-feed-feed00000012','fairfax.tiffin@homebites-test.com','$2a$10$PX.VtBbDlisVEtHvhDsWQOmMBCGYSCDJpkZjUYCFGKrDaRsSlvxsO','2024-01-01 00:00:00+00',now(),now(),'{"role":"home_restaurant"}','authenticated','authenticated'),
  ('feed0013-feed-feed-feed-feed00000013','phoenix.tandoor@homebites-test.com','$2a$10$PX.VtBbDlisVEtHvhDsWQOmMBCGYSCDJpkZjUYCFGKrDaRsSlvxsO','2024-01-01 00:00:00+00',now(),now(),'{"role":"home_restaurant"}','authenticated','authenticated'),
  ('feed0014-feed-feed-feed-feed00000014','boston.curry@homebites-test.com','$2a$10$PX.VtBbDlisVEtHvhDsWQOmMBCGYSCDJpkZjUYCFGKrDaRsSlvxsO','2024-01-01 00:00:00+00',now(),now(),'{"role":"home_restaurant"}','authenticated','authenticated')
ON CONFLICT (id) DO NOTHING;

-- ── Step 2: Home restaurants ─────────────────────────────────
-- user_id references auth.users IDs inserted above (feed000N-... pattern)
INSERT INTO public.home_restaurants
  (id, user_id, name, cuisine, description, city, lat, lng, delivery_radius_km, is_active, is_open, hours)
VALUES
  -- TEXAS
  ('feed0001-feed-feed-feed-feed00000001','feed0001-feed-feed-feed-feed00000001',
   'Amma''s South Indian Kitchen','South Indian',
   'Authentic South Indian home cooking — crispy dosas, fluffy idlis, and aromatic biryanis made with love by Amma''s family recipes.',
   'Celina, TX',33.2998,-96.7836,25,true,true,'11 AM – 9 PM'),

  ('feed0001-feed-feed-feed-feed00000002','feed0002-feed-feed-feed-feed00000002',
   'Casa Rodriguez','Mexican',
   'Homemade Mexican classics — tacos, enchiladas, and tamales from a Dallas family kitchen. Every bite tastes like abuela made it.',
   'Dallas, TX',32.7767,-96.7970,25,true,true,'11 AM – 9 PM'),

  ('feed0001-feed-feed-feed-feed00000003','feed0003-feed-feed-feed-feed00000003',
   'Pho Saigon Home','Vietnamese',
   'Houston''s favorite homestyle Vietnamese kitchen. Rich 12-hour pho broth, crispy spring rolls, and authentic banh mi.',
   'Houston, TX',29.7604,-95.3698,25,true,true,'11 AM – 9 PM'),

  ('feed0001-feed-feed-feed-feed00000004','feed0004-feed-feed-feed-feed00000004',
   'The Curry House','Indian',
   'North Indian comfort food in the heart of Austin. Creamy curries, fresh-baked naan, and warming dal from a family kitchen.',
   'Austin, TX',30.2672,-97.7431,25,true,true,'11 AM – 9 PM'),

  -- CALIFORNIA
  ('feed0001-feed-feed-feed-feed00000005','feed0005-feed-feed-feed-feed00000005',
   'Priya''s Kitchen','South Indian',
   'Bangalore-style home cooking in San Jose. Crispy masala dosas, comforting sambar rice, and the best rasam you''ve had outside India.',
   'San Jose, CA',37.3382,-121.8863,25,true,true,'11 AM – 9 PM'),

  ('feed0001-feed-feed-feed-feed00000006','feed0006-feed-feed-feed-feed00000006',
   'Manila Flavors','Filipino',
   'Homestyle Filipino cooking bringing the tastes of Manila to LA. Slow-cooked adobo, sinigang, and classic pancit made fresh daily.',
   'Los Angeles, CA',34.0522,-118.2437,25,true,true,'11 AM – 9 PM'),

  ('feed0001-feed-feed-feed-feed00000007','feed0007-feed-feed-feed-feed00000007',
   'Dragon House','Chinese',
   'Cantonese home cooking from a San Francisco kitchen. Hand-folded dim sum, wok-fried classics, and grandma''s legendary hot and sour soup.',
   'San Francisco, CA',37.7749,-122.4194,25,true,true,'11 AM – 9 PM'),

  ('feed0001-feed-feed-feed-feed00000008','feed0008-feed-feed-feed-feed00000008',
   'Mediterranean Breeze','Mediterranean',
   'Fresh Mediterranean home cooking in San Diego. Creamy hummus, slow-roasted shawarma, and crispy falafel with house-made sauces.',
   'San Diego, CA',32.7157,-117.1611,25,true,true,'11 AM – 9 PM'),

  -- NEW YORK
  ('feed0001-feed-feed-feed-feed00000009','feed0009-feed-feed-feed-feed00000009',
   'Brooklyn Desi Kitchen','Indian',
   'North Indian street food and home cooking in Brooklyn. Bold chole bhature, comforting rajma chawal, and flaky parathas.',
   'Brooklyn, NY',40.6782,-73.9442,25,true,true,'11 AM – 9 PM'),

  ('feed0001-feed-feed-feed-feed0000000a','feed000a-feed-feed-feed-feed0000000a',
   'Queens Night Market Bowls','Asian',
   'Inspired by the Queens night market — Korean BBQ bowls, pad thai, and comforting bibimbap all made from scratch.',
   'Queens, NY',40.7282,-73.7949,25,true,true,'11 AM – 9 PM'),

  -- ILLINOIS
  ('feed0001-feed-feed-feed-feed0000000b','feed000b-feed-feed-feed-feed0000000b',
   'Chicago Home Wok','Chinese',
   'Classic Chinese takeout flavors made at home with better ingredients. General Tso''s, lo mein, and hand-rolled egg rolls.',
   'Chicago, IL',41.8781,-87.6298,25,true,true,'11 AM – 9 PM'),

  ('feed0001-feed-feed-feed-feed0000000c','feed000c-feed-feed-feed-feed0000000c',
   'Spice of India Chicago','Indian',
   'Rich Mughlai and Punjabi cooking from a Chicago kitchen. Slow-braised lamb curry, fragrant biryani, and crispy samosas.',
   'Chicago, IL',41.8781,-87.6298,25,true,true,'11 AM – 9 PM'),

  -- FLORIDA
  ('feed0001-feed-feed-feed-feed0000000d','feed000d-feed-feed-feed-feed0000000d',
   'Sabor Latino Miami','Latin',
   'Cuban and Latin Caribbean home cooking in Miami. Slow-cooked ropa vieja, golden tostones, and the perfect Cuban sandwich.',
   'Miami, FL',25.7617,-80.1918,25,true,true,'11 AM – 9 PM'),

  ('feed0001-feed-feed-feed-feed0000000e','feed000e-feed-feed-feed-feed0000000e',
   'Thai Orchid Home','Thai',
   'Authentic Thai home cooking in Orlando. Pad thai, fragrant green curry, and tom yum made with fresh herbs and spices.',
   'Orlando, FL',28.5383,-81.3792,25,true,true,'11 AM – 9 PM'),

  -- WASHINGTON
  ('feed0001-feed-feed-feed-feed0000000f','feed000f-feed-feed-feed-feed0000000f',
   'Seattle Pho House','Vietnamese',
   'Warming Vietnamese classics perfect for Seattle weather. Pho bo with 14-hour broth, crispy banh xeo, and spicy bun bo hue.',
   'Seattle, WA',47.6062,-122.3321,25,true,true,'11 AM – 9 PM'),

  -- GEORGIA
  ('feed0001-feed-feed-feed-feed00000010','feed0010-feed-feed-feed-feed00000010',
   'Atlanta Desi Dhaba','Indian',
   'Homestyle North Indian cooking in Atlanta. Aromatic biryani, silky butter naan, and rich paneer makhani like you''d find in Delhi.',
   'Atlanta, GA',33.7490,-84.3880,25,true,true,'11 AM – 9 PM'),

  -- NEW JERSEY
  ('feed0001-feed-feed-feed-feed00000011','feed0011-feed-feed-feed-feed00000011',
   'Jersey City Biryani House','Indian',
   'Hyderabadi biryani specialists in Jersey City. Slow-dum cooked biryani, tender mutton curry, and smoky shami kebabs.',
   'Jersey City, NJ',40.7178,-74.0431,25,true,true,'11 AM – 9 PM'),

  -- VIRGINIA
  ('feed0001-feed-feed-feed-feed00000012','feed0012-feed-feed-feed-feed00000012',
   'Fairfax Tiffin','South Indian',
   'Chennai-style tiffin in Fairfax. Perfect crispy-outside-soft-inside masala dosa, rava idli, and sambar made with fresh vegetables.',
   'Fairfax, VA',38.8462,-77.3064,25,true,true,'11 AM – 9 PM'),

  -- ARIZONA
  ('feed0001-feed-feed-feed-feed00000013','feed0013-feed-feed-feed-feed00000013',
   'Phoenix Tandoor','Indian',
   'Tandoor-grilled delights and creamy curries in Phoenix. Charred tandoori chicken, velvety butter chicken, and homemade kheer.',
   'Phoenix, AZ',33.4484,-112.0740,25,true,true,'11 AM – 9 PM'),

  -- MASSACHUSETTS
  ('feed0001-feed-feed-feed-feed00000014','feed0014-feed-feed-feed-feed00000014',
   'Boston Curry Corner','Indian',
   'South Indian seafood and curries from a Boston kitchen. Fresh fish curry, spicy prawn masala, and crispy papadum.',
   'Boston, MA',42.3601,-71.0589,25,true,true,'11 AM – 9 PM')

ON CONFLICT (id) DO NOTHING;

-- ── Step 3: Dishes ───────────────────────────────────────────
-- Using Unsplash food images (free, no API key needed)

INSERT INTO public.dishes (home_restaurant_id, name, description, price, image_url, ingredients)
VALUES

-- ── Amma's South Indian Kitchen (1) ──
('feed0001-feed-feed-feed-feed00000001','Ghee Roast Dosa','Crispy rice crepe roasted in golden ghee, served with coconut chutney and sambar',8.99,'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=400','rice batter, urad dal, ghee, coconut chutney, sambar'),
('feed0001-feed-feed-feed-feed00000001','Idli Sambar','Soft steamed rice cakes with lentil vegetable soup and chutneys',6.99,'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=400','rice, urad dal, lentils, tamarind, vegetables'),
('feed0001-feed-feed-feed-feed00000001','Chicken Biryani','Fragrant basmati rice slow-cooked with spiced chicken in dum style',14.99,'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400','basmati rice, chicken, saffron, onion, spices'),
('feed0001-feed-feed-feed-feed00000001','Filter Coffee','South Indian filter coffee with chicory, frothy and aromatic',3.99,'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400','coffee, chicory, milk, sugar'),
('feed0001-feed-feed-feed-feed00000001','Vada','Crispy savory lentil donuts, golden outside and soft inside',5.99,'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=400','urad dal, onion, green chili, curry leaves'),

-- ── Casa Rodriguez (2) ──
('feed0001-feed-feed-feed-feed00000002','Beef Tacos','Three corn tortilla tacos with slow-cooked beef, fresh cilantro and onion',12.99,'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400','corn tortillas, beef, cilantro, onion, lime, salsa'),
('feed0001-feed-feed-feed-feed00000002','Chicken Enchiladas','Two rolled corn tortillas filled with chicken in red chile sauce, topped with cheese',13.99,'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400','corn tortillas, chicken, red chile sauce, cheese, sour cream'),
('feed0001-feed-feed-feed-feed00000002','Guacamole & Chips','Fresh house-made guacamole with crispy tortilla chips',7.99,'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400','avocado, lime, cilantro, onion, tomato, jalapeño'),
('feed0001-feed-feed-feed-feed00000002','Horchata','Creamy house-made rice drink with cinnamon and vanilla',3.99,'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400','rice, cinnamon, vanilla, sugar, milk'),
('feed0001-feed-feed-feed-feed00000002','Tamales','Hand-made corn masa tamales filled with pork and red chile, wrapped in corn husks',11.99,'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400','masa, pork, red chile, corn husks'),

-- ── Pho Saigon Home (3) ──
('feed0001-feed-feed-feed-feed00000003','Beef Pho','Rich 12-hour bone broth with rice noodles, tender beef slices, and fresh herbs',13.99,'https://images.unsplash.com/photo-1576577445504-6af96477db52?w=400','beef bones, rice noodles, ginger, star anise, basil, bean sprouts'),
('feed0001-feed-feed-feed-feed00000003','Spring Rolls','Crispy fried spring rolls filled with pork, shrimp, and vegetables',8.99,'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400','pork, shrimp, carrots, glass noodles, spring roll wrappers'),
('feed0001-feed-feed-feed-feed00000003','Banh Mi','Vietnamese baguette with pickled vegetables, pâté, and your choice of protein',9.99,'https://images.unsplash.com/photo-1576577445504-6af96477db52?w=400','baguette, pâté, pickled daikon, carrots, cilantro, jalapeño'),
('feed0001-feed-feed-feed-feed00000003','Vietnamese Coffee','Strong drip coffee with sweetened condensed milk, hot or iced',4.99,'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400','Vietnamese coffee, condensed milk, ice'),

-- ── The Curry House (4) ──
('feed0001-feed-feed-feed-feed00000004','Butter Chicken','Tender chicken in a rich, creamy tomato-cashew sauce',15.99,'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400','chicken, tomatoes, cream, cashews, butter, spices'),
('feed0001-feed-feed-feed-feed00000004','Garlic Naan','Soft flatbread topped with fresh garlic and butter, baked in a hot pan',3.99,'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400','flour, yogurt, garlic, butter'),
('feed0001-feed-feed-feed-feed00000004','Dal Makhani','Slow-cooked black lentils in creamy tomato-butter gravy',12.99,'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400','black lentils, kidney beans, butter, cream, tomatoes'),
('feed0001-feed-feed-feed-feed00000004','Mango Lassi','Thick mango yogurt drink, perfectly sweet and cooling',4.99,'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400','mango pulp, yogurt, sugar, cardamom'),
('feed0001-feed-feed-feed-feed00000004','Paneer Tikka','Marinated cottage cheese grilled with peppers and onions',13.99,'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400','paneer, yogurt, spices, bell pepper, onion'),

-- ── Priya's Kitchen (5) ──
('feed0001-feed-feed-feed-feed00000005','Masala Dosa','Crispy rice crepe stuffed with spiced potato filling',9.99,'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=400','rice batter, potato, onion, mustard seeds, turmeric'),
('feed0001-feed-feed-feed-feed00000005','Sambar Rice','Comforting rice mixed with tangy lentil-vegetable soup',8.99,'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=400','rice, toor dal, tamarind, vegetables, sambar powder'),
('feed0001-feed-feed-feed-feed00000005','Rasam','Thin pepper-tamarind soup, great for digestion',5.99,'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400','tamarind, tomato, pepper, cumin, garlic'),
('feed0001-feed-feed-feed-feed00000005','Coconut Chutney','Fresh coconut chutney with green chili and tempered spices',2.99,'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400','coconut, green chili, ginger, mustard seeds, curry leaves'),

-- ── Manila Flavors (6) ──
('feed0001-feed-feed-feed-feed00000006','Adobo Chicken','Classic Filipino chicken braised in vinegar, soy sauce, and garlic',13.99,'https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?w=400','chicken, soy sauce, vinegar, garlic, bay leaves'),
('feed0001-feed-feed-feed-feed00000006','Sinigang','Sour tamarind-based soup with pork and vegetables',14.99,'https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?w=400','pork, tamarind, eggplant, okra, tomatoes, radish'),
('feed0001-feed-feed-feed-feed00000006','Pancit','Stir-fried rice noodles with vegetables and your choice of protein',11.99,'https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?w=400','rice noodles, chicken, cabbage, carrots, soy sauce'),
('feed0001-feed-feed-feed-feed00000006','Halo Halo','Filipino shaved ice dessert with sweetened fruits, beans, and ube ice cream',6.99,'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400','shaved ice, ube, leche flan, jackfruit, sweet beans'),
('feed0001-feed-feed-feed-feed00000006','Lumpia','Crispy Filipino egg rolls filled with pork and vegetables',8.99,'https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?w=400','pork, carrots, bean sprouts, spring roll wrappers'),

-- ── Dragon House (7) ──
('feed0001-feed-feed-feed-feed00000007','Dim Sum Platter','Assortment of 8 pieces: har gow, siu mai, char siu bao, and egg tarts',16.99,'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400','shrimp, pork, flour wrappers, egg'),
('feed0001-feed-feed-feed-feed00000007','Fried Rice','Wok-fried rice with egg, vegetables, and soy sauce',10.99,'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400','rice, egg, peas, carrots, scallion, soy sauce'),
('feed0001-feed-feed-feed-feed00000007','Kung Pao Chicken','Spicy stir-fried chicken with peanuts and dried chilis',13.99,'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400','chicken, peanuts, dried chili, soy sauce, vinegar'),
('feed0001-feed-feed-feed-feed00000007','Hot & Sour Soup','Classic Chinese soup with tofu, mushrooms, and a tangy-spicy broth',7.99,'https://images.unsplash.com/photo-1576577445504-6af96477db52?w=400','tofu, mushrooms, bamboo shoots, egg, vinegar, white pepper'),

-- ── Mediterranean Breeze (8) ──
('feed0001-feed-feed-feed-feed00000008','Hummus Platter','Creamy house-made hummus with olive oil, paprika, and warm pita',9.99,'https://images.unsplash.com/photo-1561651823-34feb02250e4?w=400','chickpeas, tahini, lemon, garlic, olive oil, pita'),
('feed0001-feed-feed-feed-feed00000008','Chicken Shawarma','Marinated chicken wrapped in pita with garlic sauce and pickles',13.99,'https://images.unsplash.com/photo-1561651823-34feb02250e4?w=400','chicken, pita, garlic sauce, pickles, tomato, parsley'),
('feed0001-feed-feed-feed-feed00000008','Falafel Wrap','Crispy herb falafel in warm pita with tahini and fresh salad',11.99,'https://images.unsplash.com/photo-1561651823-34feb02250e4?w=400','chickpeas, parsley, cumin, pita, tahini, lettuce, tomato'),
('feed0001-feed-feed-feed-feed00000008','Baklava','Honey-soaked flaky pastry layered with pistachios and walnuts',5.99,'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400','phyllo dough, pistachios, walnuts, honey, butter'),

-- ── Brooklyn Desi Kitchen (9) ──
('feed0001-feed-feed-feed-feed00000009','Chole Bhature','Spiced chickpeas with two fluffy deep-fried bread puffs',11.99,'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400','chickpeas, flour, yogurt, spices, onion, tomato'),
('feed0001-feed-feed-feed-feed00000009','Rajma Chawal','Kidney bean curry served with steamed basmati rice',10.99,'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400','kidney beans, tomato, onion, spices, basmati rice'),
('feed0001-feed-feed-feed-feed00000009','Paratha','Whole wheat flaky flatbread pan-fried with butter',7.99,'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400','whole wheat flour, butter, ajwain'),
('feed0001-feed-feed-feed-feed00000009','Masala Chai','Spiced milk tea with ginger, cardamom, and cinnamon',3.99,'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400','black tea, milk, ginger, cardamom, cinnamon, sugar'),

-- ── Queens Night Market Bowls (10) ──
('feed0001-feed-feed-feed-feed0000000a','Korean BBQ Bowl','Marinated bulgogi beef over rice with pickled vegetables and gochujang',14.99,'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400','beef, rice, gochujang, kimchi, sesame oil, scallion'),
('feed0001-feed-feed-feed-feed0000000a','Pad Thai','Stir-fried rice noodles with shrimp, egg, peanuts, and tamarind',12.99,'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=400','rice noodles, shrimp, egg, peanuts, tamarind, bean sprouts'),
('feed0001-feed-feed-feed-feed0000000a','Bibimbap','Korean mixed rice bowl with vegetables, egg, and sesame oil',13.99,'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400','rice, spinach, carrots, egg, sesame oil, gochujang'),
('feed0001-feed-feed-feed-feed0000000a','Miso Soup','Traditional Japanese dashi broth with tofu and seaweed',5.99,'https://images.unsplash.com/photo-1576577445504-6af96477db52?w=400','dashi, miso paste, tofu, wakame, scallion'),

-- ── Chicago Home Wok (11) ──
('feed0001-feed-feed-feed-feed0000000b','General Tso Chicken','Crispy fried chicken in a sweet-spicy sauce with steamed broccoli',13.99,'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400','chicken, soy sauce, vinegar, sugar, chili, broccoli'),
('feed0001-feed-feed-feed-feed0000000b','Lo Mein','Egg noodles stir-fried with vegetables and choice of protein',10.99,'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400','egg noodles, cabbage, carrots, mushrooms, soy sauce'),
('feed0001-feed-feed-feed-feed0000000b','Egg Rolls','Four crispy egg rolls filled with pork and vegetables',7.99,'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400','pork, cabbage, carrots, egg roll wrappers'),
('feed0001-feed-feed-feed-feed0000000b','Wonton Soup','Clear broth with hand-folded pork and shrimp wontons',8.99,'https://images.unsplash.com/photo-1576577445504-6af96477db52?w=400','pork, shrimp, wonton wrappers, ginger, scallion'),

-- ── Spice of India Chicago (12) ──
('feed0001-feed-feed-feed-feed0000000c','Lamb Curry','Slow-braised lamb in a rich onion-tomato gravy with whole spices',16.99,'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400','lamb, onion, tomato, yogurt, whole spices'),
('feed0001-feed-feed-feed-feed0000000c','Chicken Biryani','Long-grain basmati rice layered with spiced chicken and fried onions',15.99,'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400','basmati rice, chicken, fried onion, saffron, whole spices'),
('feed0001-feed-feed-feed-feed0000000c','Samosas','Two crispy pastry pockets filled with spiced potato and peas',6.99,'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400','flour, potato, peas, cumin, coriander'),
('feed0001-feed-feed-feed-feed0000000c','Masala Chai','Fragrant spiced tea with full-fat milk',3.99,'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400','black tea, milk, ginger, cardamom, cinnamon'),

-- ── Sabor Latino Miami (13) ──
('feed0001-feed-feed-feed-feed0000000d','Ropa Vieja','Cuba''s national dish — shredded flank steak in tomato-pepper sofrito',14.99,'https://images.unsplash.com/photo-1561651823-34feb02250e4?w=400','flank steak, tomato, bell pepper, onion, garlic, cumin'),
('feed0001-feed-feed-feed-feed0000000d','Tostones','Twice-fried green plantains, crispy and salted',6.99,'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400','green plantains, salt, oil, garlic dipping sauce'),
('feed0001-feed-feed-feed-feed0000000d','Cuban Sandwich','Pressed sandwich with roasted pork, ham, Swiss cheese, pickles, and mustard',11.99,'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400','Cuban bread, pork, ham, Swiss cheese, pickles, mustard'),
('feed0001-feed-feed-feed-feed0000000d','Café Cubano','Small, sweet shot of strong espresso',3.99,'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400','espresso, sugar'),

-- ── Thai Orchid Home (14) ──
('feed0001-feed-feed-feed-feed0000000e','Pad Thai','Classic Thai stir-fried noodles with tofu, shrimp, egg, and crushed peanuts',12.99,'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=400','rice noodles, tofu, shrimp, egg, peanuts, tamarind, fish sauce'),
('feed0001-feed-feed-feed-feed0000000e','Green Curry','Aromatic coconut milk curry with Thai basil, eggplant, and bamboo',13.99,'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=400','coconut milk, green curry paste, basil, eggplant, bamboo shoots'),
('feed0001-feed-feed-feed-feed0000000e','Tom Yum Soup','Hot and sour lemongrass soup with mushrooms and shrimp',9.99,'https://images.unsplash.com/photo-1576577445504-6af96477db52?w=400','lemongrass, galangal, kaffir lime, mushrooms, shrimp, chili'),
('feed0001-feed-feed-feed-feed0000000e','Thai Iced Tea','Sweet creamy iced tea with condensed milk',4.99,'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400','Thai tea, condensed milk, evaporated milk, ice'),

-- ── Seattle Pho House (15) ──
('feed0001-feed-feed-feed-feed0000000f','Pho Bo','Beef pho with 14-hour bone broth, rice noodles, and fresh herbs',13.99,'https://images.unsplash.com/photo-1576577445504-6af96477db52?w=400','beef bones, rice noodles, basil, bean sprouts, lime, hoisin'),
('feed0001-feed-feed-feed-feed0000000f','Banh Xeo','Crispy Vietnamese sizzling crepe with shrimp, pork, and bean sprouts',11.99,'https://images.unsplash.com/photo-1576577445504-6af96477db52?w=400','rice flour, turmeric, shrimp, pork belly, bean sprouts'),
('feed0001-feed-feed-feed-feed0000000f','Bun Bo Hue','Spicy Hue-style noodle soup with lemongrass and pork',12.99,'https://images.unsplash.com/photo-1576577445504-6af96477db52?w=400','round rice noodles, pork, lemongrass, shrimp paste, chili'),
('feed0001-feed-feed-feed-feed0000000f','Sinh To Xoai','Fresh mango smoothie with condensed milk',5.99,'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400','mango, condensed milk, ice, milk'),

-- ── Atlanta Desi Dhaba (16) ──
('feed0001-feed-feed-feed-feed00000010','Chicken Biryani','Aromatic basmati rice cooked with tender chicken in dum style',14.99,'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400','basmati rice, chicken, fried onion, mint, whole spices'),
('feed0001-feed-feed-feed-feed00000010','Butter Naan','Soft leavened flatbread brushed with butter',3.99,'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400','flour, yogurt, baking powder, butter'),
('feed0001-feed-feed-feed-feed00000010','Paneer Makhani','Creamy tomato-cashew gravy with fresh paneer cubes',13.99,'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400','paneer, tomatoes, cashews, cream, butter, spices'),
('feed0001-feed-feed-feed-feed00000010','Raita','Cooling yogurt with cucumber, cumin, and mint',2.99,'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400','yogurt, cucumber, cumin, mint, salt'),

-- ── Jersey City Biryani House (17) ──
('feed0001-feed-feed-feed-feed00000011','Hyderabadi Biryani','Authentic dum biryani with tender meat and fragrant saffron rice',15.99,'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400','basmati rice, chicken or mutton, saffron, fried onion, mint'),
('feed0001-feed-feed-feed-feed00000011','Mutton Curry','Slow-cooked goat curry with deep Hyderabadi spices',17.99,'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400','mutton, onion, tomato, yogurt, whole spices'),
('feed0001-feed-feed-feed-feed00000011','Shami Kebab','Soft pan-fried patties of minced meat and lentils',12.99,'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400','minced mutton, chana dal, egg, spices'),
('feed0001-feed-feed-feed-feed00000011','Raita','Yogurt dip with cucumber and roasted cumin',2.99,'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400','yogurt, cucumber, cumin, mint'),

-- ── Fairfax Tiffin (18) ──
('feed0001-feed-feed-feed-feed00000012','Masala Dosa','Thin crispy crepe with spiced potato masala filling',8.99,'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=400','rice batter, potato, onion, turmeric, mustard seeds'),
('feed0001-feed-feed-feed-feed00000012','Rava Idli','Soft semolina idlis with mustard seeds and curry leaves',7.99,'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=400','semolina, yogurt, mustard seeds, curry leaves, cashews'),
('feed0001-feed-feed-feed-feed00000012','Sambar Vada','Crispy lentil fritters soaked in flavorful sambar',6.99,'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=400','urad dal, sambar, drumstick, tamarind'),
('feed0001-feed-feed-feed-feed00000012','Filter Coffee','Traditional South Indian coffee with frothy milk',3.99,'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400','coffee, chicory, milk, sugar'),

-- ── Phoenix Tandoor (19) ──
('feed0001-feed-feed-feed-feed00000013','Tandoori Chicken','Half chicken marinated overnight and roasted in a clay tandoor',15.99,'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400','chicken, yogurt, tandoori masala, lemon'),
('feed0001-feed-feed-feed-feed00000013','Butter Chicken','Creamy tomato-based curry with char-grilled chicken',14.99,'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400','chicken, tomato, cream, butter, fenugreek'),
('feed0001-feed-feed-feed-feed00000013','Garlic Naan','Fluffy bread with roasted garlic and herb butter',3.99,'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400','flour, garlic, butter, yogurt'),
('feed0001-feed-feed-feed-feed00000013','Kheer','Slow-simmered rice pudding with cardamom and pistachios',4.99,'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400','rice, milk, sugar, cardamom, saffron, pistachios'),

-- ── Boston Curry Corner (20) ──
('feed0001-feed-feed-feed-feed00000014','Fish Curry','Kerala-style fish curry in tangy coconut milk with kokum',15.99,'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400','fish, coconut milk, kokum, green chili, curry leaves'),
('feed0001-feed-feed-feed-feed00000014','Prawn Masala','Spicy stir-fried prawns in onion-tomato masala',16.99,'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400','prawns, onion, tomato, coconut, spices'),
('feed0001-feed-feed-feed-feed00000014','Steamed Rice','Long-grain basmati rice, perfectly steamed',3.99,'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400','basmati rice'),
('feed0001-feed-feed-feed-feed00000014','Papadum','Thin crispy lentil crackers with chutneys',2.99,'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400','urad dal, cumin, black pepper');

-- ── Done! ──────────────────────────────────────────────────
-- You should now have 20 auth users, 20 restaurants, and ~80 dishes in Supabase.
-- Set your search radius to 30 mi and zoom out to see all restaurants.
