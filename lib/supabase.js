const supabase = require('@supabase/supabase-js');

const supabaseUrl = 'https://vpwbntzlkfojlpwxfsnf.supabase.co';
const supabaseKey = process.env.SUPABASE_API_KEY;

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

module.exports = supabaseClient;
