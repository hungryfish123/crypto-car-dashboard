-- =====================================================
-- PROFILES SCHEMA
-- Stores user profiles (username, etc.)
-- =====================================================

CREATE TABLE IF NOT EXISTS profiles (
    user_wallet TEXT PRIMARY KEY,
    username TEXT CHECK (char_length(username) <= 12),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public profiles are viewable by everyone" 
ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" 
ON profiles FOR INSERT WITH CHECK (true); -- In prod, verify auth.uid() or similar if using Auth properly

CREATE POLICY "Users can update their own profile" 
ON profiles FOR UPDATE USING (true); -- Simplified for this demo context

-- Trigger for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
