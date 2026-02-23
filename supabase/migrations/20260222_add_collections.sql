-- Migration: User Collections Feature
-- Date: 2026-02-22
-- Description: Add collections and collection_spells tables for organizing spells into custom collections

-- Create collections table
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  description VARCHAR(200),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create junction table for collection <-> spell relationship
CREATE TABLE IF NOT EXISTS collection_spells (
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  spell_id TEXT NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (collection_id, spell_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collection_spells_spell_id ON collection_spells(spell_id);

-- Auto-update updated_at trigger for collections
CREATE OR REPLACE FUNCTION update_collections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS collections_updated_at_trigger ON collections;

CREATE TRIGGER collections_updated_at_trigger
BEFORE UPDATE ON collections
FOR EACH ROW
EXECUTE FUNCTION update_collections_updated_at();

-- Enable Row Level Security
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_spells ENABLE ROW LEVEL SECURITY;

-- RLS Policies for collections
CREATE POLICY "Users can view their own collections"
  ON collections FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own collections"
  ON collections FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own collections"
  ON collections FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own collections"
  ON collections FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for collection_spells (user must own the parent collection)
CREATE POLICY "Users can view spells in their collections"
  ON collection_spells FOR SELECT
  USING (collection_id IN (SELECT id FROM collections WHERE user_id = auth.uid()));

CREATE POLICY "Users can add spells to their collections"
  ON collection_spells FOR INSERT
  WITH CHECK (collection_id IN (SELECT id FROM collections WHERE user_id = auth.uid()));

CREATE POLICY "Users can remove spells from their collections"
  ON collection_spells FOR DELETE
  USING (collection_id IN (SELECT id FROM collections WHERE user_id = auth.uid()));
