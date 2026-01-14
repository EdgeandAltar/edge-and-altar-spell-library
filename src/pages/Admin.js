import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import './Admin.css';

// ✅ NEW: slug helper for SEO-friendly URLs
const slugify = (text = '') =>
  text
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')          // remove quotes
    .replace(/[^a-z0-9]+/g, '-')   // replace non-alphanumerics with hyphens
    .replace(/^-+|-+$/g, '');      // trim leading/trailing hyphens

function Admin() {
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    timeRequired: '',
    skillLevel: '',
    whenToUse: '',
    ingredients: '',
    instructions: '',
    whyThisWorks: '',
    spokenIntention: '',
    tips: '',
    isPremium: false,
    vibe: '',
    suppliesNeeded: '',
    seasonalTags: [],
    tags: []
  });

  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const categories = [
    'Protection', 'Money/Abundance', 'Grounding', 'Love/Self-Love',
    'Clarity/Focus', 'Energy/Motivation', 'Boundaries', 'Cleansing/Release',
    'Moon Magic', 'Drink Spells', 'Candle Spells', 'Kitchen Magic',
    'Bath/Water Magic', 'Shadow Work'
  ];

  const timeOptions = [
    'Under 5 min', '5-15 min', '15-30 min', '30-60 min', '60+ min'
  ];

  const skillLevels = ['Beginner', 'Intermediate', 'Advanced', 'Ceremonial'];

  const vibes = [
    'Practical/No-Nonsense', 'Witchy/Aesthetic', 'Powerful/Intense',
    'Soft/Gentle', 'Ceremonial/Formal'
  ];

  const seasonalOptions = [
    'Any Time',
    'Imbolc (Feb 1-2)',
    'Spring Equinox (March 20)',
    'Beltane (May 1)',
    'Summer Solstice (June 21)',
    'Lammas (Aug 1)',
    'Fall Equinox (Sept 22)',
    'Samhain (Oct 31)',
    'Winter Solstice (Dec 21)',
    'Full Moon',
    'New Moon',
    'Dark Moon'
  ];

  // ⚠️ Keep these labels EXACTLY consistent with SpellQuiz + SpellLibrary
  const suppliesOptions = [
    'No supplies needed',
    'Kitchen items only',
    'Candles required',
    'Altar setup needed',
    'Outdoor space required',
    'Bath/water access'
  ];

  const intentTags = [
    'Anxiety Relief', 'Boundary Setting', 'Emotional Cleansing', 'Energy Protection',
    'Stress Release', 'Confidence Building', 'Letting Go', 'Self-Permission',
    'Guilt Release', 'Overwhelm Relief'
  ];

  const situationTags = [
    'After Difficult Conversation', 'Before Bed', 'After Work', 'End of Day',
    'Morning Ritual', 'Before Interaction', 'Emergency Use', 'Daily Practice',
    'When Stuck', 'When Overwhelmed'
  ];

  // ⚠️ Keep these labels EXACTLY consistent with the tags used in your quiz + filtering
  const supplyTags = [
    'No Supplies Needed',
    'Kitchen Items Only',
    'Candles Required',
    'Bath/Water Access',
    'Paper & Pen',
    'Household Items'
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageChange = (e) => {
    if (e.target.files?.[0]) setImage(e.target.files[0]);
  };

  const toggleTag = (tagValue) => {
    setFormData(prev => {
      const current = Array.isArray(prev.tags) ? prev.tags : [];
      const next = current.includes(tagValue)
        ? current.filter(t => t !== tagValue)
        : [...current, tagValue];
      return { ...prev, tags: next };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let imageUrl = '';

      // Upload image if provided
      if (image) {
        const imageRef = ref(storage, `spell-images/${Date.now()}_${image.name}`);
        await uploadBytes(imageRef, image);
        imageUrl = await getDownloadURL(imageRef);
      }

      // Safety: always write arrays even if empty
      const safeSeasonalTags = Array.isArray(formData.seasonalTags) ? formData.seasonalTags : [];
      const safeTags = Array.isArray(formData.tags) ? formData.tags : [];

      // ✅ NEW: generate slug from title
      const slug = slugify(formData.title);

      await addDoc(collection(db, 'spells'), {
        ...formData,
        slug, // ✅ NEW FIELD
        seasonalTags: safeSeasonalTags,
        tags: safeTags,
        imageUrl,
        createdAt: serverTimestamp()
      });

      setSuccess('Spell added successfully!');

      // Reset form (IMPORTANT: include seasonalTags + tags)
      setFormData({
        title: '',
        category: '',
        timeRequired: '',
        skillLevel: '',
        whenToUse: '',
        ingredients: '',
        instructions: '',
        whyThisWorks: '',
        spokenIntention: '',
        tips: '',
        isPremium: false,
        vibe: '',
        suppliesNeeded: '',
        seasonalTags: [],
        tags: []
      });

      setImage(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Error adding spell: ' + err.message);
    }

    setLoading(false);
  };

  const renderTagSection = (title, tagsArray) => (
    <div style={{ marginBottom: '12px' }}>
      <h4 style={{ fontSize: '14px', color: '#7D5E4F', marginBottom: '8px', fontWeight: '600' }}>
        {title}
      </h4>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '12px', background: '#f5f3ef', borderRadius: '8px' }}>
        {tagsArray.map(tag => (
          <label
            key={tag}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: (formData.tags || []).includes(tag) ? '#7D5E4F' : 'white',
              color: (formData.tags || []).includes(tag) ? 'white' : '#7D5E4F',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            <input
              type="checkbox"
              value={tag}
              checked={(formData.tags || []).includes(tag)}
              onChange={() => toggleTag(tag)}
              style={{ margin: 0 }}
            />
            {tag}
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Add New Spell</h1>
      </div>

      <form onSubmit={handleSubmit} className="admin-form">
        <div className="form-group">
          <label>Spell Title *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            required
            placeholder="e.g., Morning Protection Coffee Spell"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Category *</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              required
            >
              <option value="">Select category</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Time Required *</label>
            <select
              name="timeRequired"
              value={formData.timeRequired}
              onChange={handleInputChange}
              required
            >
              <option value="">Select time</option>
              {timeOptions.map(time => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Skill Level *</label>
            <select
              name="skillLevel"
              value={formData.skillLevel}
              onChange={handleInputChange}
              required
            >
              <option value="">Select level</option>
              {skillLevels.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Vibe</label>
            <select
              name="vibe"
              value={formData.vibe}
              onChange={handleInputChange}
            >
              <option value="">Select vibe</option>
              {vibes.map(vibe => (
                <option key={vibe} value={vibe}>{vibe}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Supplies Needed</label>
          <select
            name="suppliesNeeded"
            value={formData.suppliesNeeded}
            onChange={handleInputChange}
          >
            <option value="">Select supplies</option>
            {suppliesOptions.map(supply => (
              <option key={supply} value={supply}>{supply}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Seasonal Tags (select all that apply)</label>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            padding: '12px',
            background: '#f5f3ef',
            borderRadius: '8px'
          }}>
            {seasonalOptions.map(season => (
              <label
                key={season}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  background: (formData.seasonalTags || []).includes(season) ? '#7D5E4F' : 'white',
                  color: (formData.seasonalTags || []).includes(season) ? 'white' : '#7D5E4F',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
              >
                <input
                  type="checkbox"
                  value={season}
                  checked={(formData.seasonalTags || []).includes(season)}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      seasonalTags: e.target.checked
                        ? [...(prev.seasonalTags || []), value]
                        : (prev.seasonalTags || []).filter(tag => tag !== value)
                    }));
                  }}
                  style={{ margin: 0 }}
                />
                {season}
              </label>
            ))}
          </div>
          <small style={{ color: '#666', fontSize: '13px', marginTop: '8px', display: 'block' }}>
            Select all seasons/times when this spell is especially relevant
          </small>
        </div>

        <div className="form-group">
          <label>Tags (select all that apply)</label>
          <div style={{ marginBottom: '16px' }}>
            {renderTagSection('Intent', intentTags)}
            {renderTagSection('Situation', situationTags)}
            {renderTagSection('Supplies', supplyTags)}
          </div>
          <small style={{ color: '#666', fontSize: '13px', marginTop: '8px', display: 'block' }}>
            Select all tags that apply to help users filter and find this spell
          </small>
        </div>

        <div className="form-group">
          <label>When to Use *</label>
          <textarea
            name="whenToUse"
            value={formData.whenToUse}
            onChange={handleInputChange}
            required
            placeholder="1-2 sentences describing when/why someone would use this spell"
            rows="2"
          />
        </div>

        <div className="form-group">
          <label>Ingredients *</label>
          <textarea
            name="ingredients"
            value={formData.ingredients}
            onChange={handleInputChange}
            required
            placeholder="List ingredients, one per line"
            rows="4"
          />
        </div>

        <div className="form-group">
          <label>Instructions *</label>
          <textarea
            name="instructions"
            value={formData.instructions}
            onChange={handleInputChange}
            required
            placeholder="Step-by-step instructions"
            rows="6"
          />
        </div>

        <div className="form-group">
          <label>Why This Works</label>
          <textarea
            name="whyThisWorks"
            value={formData.whyThisWorks}
            onChange={handleInputChange}
            rows="4"
            placeholder="Explain the psychology and mechanism behind this spell (2-3 sentences)..."
          />
        </div>

        <div className="form-group">
          <label>Spoken Intention</label>
          <textarea
            name="spokenIntention"
            value={formData.spokenIntention}
            onChange={handleInputChange}
            placeholder="Affirmation or invocation to say during the spell"
            rows="3"
          />
        </div>

        <div className="form-group">
          <label>Tips & Modifications</label>
          <textarea
            name="tips"
            value={formData.tips}
            onChange={handleInputChange}
            placeholder="Optional tweaks, substitutions, or helpful tips"
            rows="3"
          />
        </div>

        <div className="form-group">
          <label>Spell Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
          />
          {image && <p className="file-name">Selected: {image.name}</p>}
        </div>

        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              name="isPremium"
              checked={formData.isPremium}
              onChange={handleInputChange}
            />
            Premium Spell (requires subscription)
          </label>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? 'Adding Spell...' : 'Add Spell'}
        </button>
      </form>
    </div>
  );
}

export default Admin;
