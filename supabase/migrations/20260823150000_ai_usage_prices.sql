-- Editable AI Boost Coin rates (admin). Additive only.

CREATE TABLE IF NOT EXISTS public.ai_usage_prices (
  id text PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  ai_build_per_link numeric(8, 2) NOT NULL DEFAULT 1 CHECK (ai_build_per_link >= 0),
  ai_assist numeric(8, 2) NOT NULL DEFAULT 0.5 CHECK (ai_assist >= 0),
  ai_menu_per_image numeric(8, 2) NOT NULL DEFAULT 1 CHECK (ai_menu_per_image >= 0),
  ai_search numeric(8, 2) NOT NULL DEFAULT 0 CHECK (ai_search >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL
);

INSERT INTO public.ai_usage_prices (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.ai_usage_prices ENABLE ROW LEVEL SECURITY;
