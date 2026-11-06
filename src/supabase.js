import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabaseReady = Boolean(url && key && !url.includes('YOUR_PROJECT') && !key.includes('YOUR_'))
export const supabase = supabaseReady ? createClient(url, key) : null
export const STORAGE_BUCKET = 'Product-images'
export const WHATSAPP_URL = 'https://wa.me/qr/7PMDJFUNDDZ6H1'
