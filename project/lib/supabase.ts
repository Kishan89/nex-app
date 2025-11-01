import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://ilqvdrexvnmdfjaoodpb.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlscXZkcmV4dm5tZGZqYW9vZHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MTE0NDYsImV4cCI6MjA3NjA4NzQ0Nn0.xmWbhI_cISX0KPTJ3P8uNUOJXsWI5aoeT7xXOxi8H9A';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
