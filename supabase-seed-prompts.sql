-- HYDROZEN starter prompt cards
-- Run after supabase-schema.sql.

insert into public.prompts (title, category, prompt, tags, image_url)
values
(
  'Midnight Monolith Product Campaign',
  'Midjourney',
  'A black titanium smart fragrance bottle standing on a wet obsidian plinth, soft cream rim light, premium product photography, minimal cinematic atmosphere, shallow depth of field, ultra clean luxury campaign.',
  array['product', 'luxury', 'campaign'],
  'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=1200&q=80'
),
(
  'Glass Oracle Fashion Portrait',
  'Flux',
  'High fashion portrait of an oracle wearing translucent glass armor, black studio void, soft white halo gradients, expensive editorial lighting, future couture, cinematic realism.',
  array['portrait', 'fashion', 'glass'],
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80'
),
(
  'Elite Brand Strategy System',
  'ChatGPT',
  'Act as a senior brand strategist and creative director. Build a premium positioning system for a futuristic AI startup with audience psychology, visual language, offer ladder, and homepage messaging.',
  array['strategy', 'startup', 'system'],
  'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80'
),
(
  'Rainlit Vertical City',
  'Stable Diffusion',
  'A massive vertical city at night after rain, reflective black streets, white holographic signage, cinematic fog layers, futuristic minimal architecture, elegant cyberpunk realism.',
  array['city', 'cyberpunk', 'rain'],
  'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1200&q=80'
),
(
  'Viral AI Tool Ideas',
  'Grok',
  'Generate 25 commercially realistic AI micro-SaaS ideas for solo builders. Include target user, pain, MVP, pricing angle, and viral demo hook.',
  array['ideas', 'saas', 'builder'],
  'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80'
),
(
  'Silent Luxury Interior',
  'Flux',
  'A silent luxury penthouse interior at blue hour, black stone, warm indirect light, sculptural furniture, futuristic skyline, museum-grade minimalism, editorial realism.',
  array['interior', 'luxury', 'calm'],
  'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80'
)
on conflict do nothing;
