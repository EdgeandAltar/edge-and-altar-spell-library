import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useParams, useNavigate } from 'react-router-dom';
import './Admin.css'; // Reuse the admin styles

function EditSpell() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
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
    imageUrl: '',
    seasonalTags: [],
      tags: []  // ADD THIS LINE
  });
  
  const [image, setImage] = useState(null);

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

  const suppliesOptions = [
    'No supplies needed', 'Kitchen items only', 'Candles required',
    'Altar setup needed', 'Outdoor space required', 'Bath/water access'
  ];

  useEffect(() => {
    fetchSpell();
  }, [id]);

  const fetchSpell = async () => {
    try {
      const docRef = doc(db, 'spells', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const spellData = docSnap.data();
        setFormData({
          title: spellData.title || '',
          category: spellData.category || '',
          timeRequired: spellData.timeRequired || '',
          skillLevel: spellData.skillLevel || '',
          whenToUse: spellData.whenToUse || '',
          ingredients: spellData.ingredients || '',
          instructions: spellData.instructions || '',
          whyThisWorks: spellData.whyThisWorks || '',
          spokenIntention: spellData.spokenIntention || '',
          tips: spellData.tips || '',
          isPremium: spellData.isPremium || false,
          vibe: spellData.vibe || '',
          suppliesNeeded: spellData.suppliesNeeded || '',
          imageUrl: spellData.imageUrl || '',
          seasonalTags: spellData.seasonalTags || [],
            tags: spellData.tags || []  // ADD THIS LINE
        });
      } else {
        setError('Spell not found');
      }
    } catch (error) {
      console.error('Error fetching spell:', error);
      setError('Error loading spell');
    }
    setLoading(false);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      let imageUrl = formData.imageUrl;

      // Upload new image if provided
      if (image) {
        const imageRef = ref(storage, `spell-images/${Date.now()}_${image.name}`);
        await uploadBytes(imageRef, image);
        imageUrl = await getDownloadURL(imageRef);
      }

      // Update spell in Firestore
      const spellRef = doc(db, 'spells', id);
      await updateDoc(spellRef, {
        ...formData,
        imageUrl,
        updatedAt: new Date()
      });

      setSuccess('Spell updated successfully!');
      
      // Redirect to manage spells after 2 seconds
      setTimeout(() => {
        navigate('/manage-spells');
      }, 2000);

    } catch (err) {
      setError('Error updating spell: ' + err.message);
    }

    setSaving(false);
  };

  if (loading) {
    return <div className="loading">Loading spell...</div>;
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Edit Spell</h1>
        <button 
          onClick={() => navigate('/manage-spells')}
          style={{
            padding: '10px 20px',
            background: '#7d6e57',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            marginTop: '16px'
          }}
        >
          ← Back to Manage Spells
        </button>
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
    
    {/* Intent Tags */}
    <div style={{ marginBottom: '12px' }}>
      <h4 style={{ fontSize: '14px', color: '#7D5E4F', marginBottom: '8px', fontWeight: '600' }}>Intent</h4>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '12px', background: '#f5f3ef', borderRadius: '8px' }}>
        {['Anxiety Relief', 'Boundary Setting', 'Emotional Cleansing', 'Energy Protection', 'Stress Release', 'Confidence Building', 'Letting Go', 'Self-Permission', 'Guilt Release', 'Overwhelm Relief'].map(tag => (
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
              onChange={(e) => {
                const value = e.target.value;
                setFormData(prev => ({
                  ...prev,
                  tags: e.target.checked
                    ? [...(prev.tags || []), value]
                    : (prev.tags || []).filter(t => t !== value)
                }));
              }}
              style={{ margin: 0 }}
            />
            {tag}
          </label>
        ))}
      </div>
    </div>

    {/* Situation Tags */}
    <div style={{ marginBottom: '12px' }}>
      <h4 style={{ fontSize: '14px', color: '#7D5E4F', marginBottom: '8px', fontWeight: '600' }}>Situation</h4>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '12px', background: '#f5f3ef', borderRadius: '8px' }}>
        {['After Difficult Conversation', 'Before Bed', 'After Work', 'End of Day', 'Morning Ritual', 'Before Interaction', 'Emergency Use', 'Daily Practice', 'When Stuck', 'When Overwhelmed'].map(tag => (
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
              onChange={(e) => {
                const value = e.target.value;
                setFormData(prev => ({
                  ...prev,
                  tags: e.target.checked
                    ? [...(prev.tags || []), value]
                    : (prev.tags || []).filter(t => t !== value)
                }));
              }}
              style={{ margin: 0 }}
            />
            {tag}
          </label>
        ))}
      </div>
    </div>

    {/* Supply Tags */}
    <div style={{ marginBottom: '12px' }}>
      <h4 style={{ fontSize: '14px', color: '#7D5E4F', marginBottom: '8px', fontWeight: '600' }}>Supplies</h4>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '12px', background: '#f5f3ef', borderRadius: '8px' }}>
        {['No Supplies Needed', 'Kitchen Items Only', 'Candles Required', 'Bath/Water Access', 'Paper & Pen', 'Household Items'].map(tag => (
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
              onChange={(e) => {
                const value = e.target.value;
                setFormData(prev => ({
                  ...prev,
                  tags: e.target.checked
                    ? [...(prev.tags || []), value]
                    : (prev.tags || []).filter(t => t !== value)
                }));
              }}
              style={{ margin: 0 }}
            />
            {tag}
          </label>
        ))}
      </div>
    </div>

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
            rows="2"
            placeholder="When to use this spell (1-2 sentences)..."
          />
        </div>

        <div className="form-group">
          <label>Ingredients *</label>
          <textarea
            name="ingredients"
            value={formData.ingredients}
            onChange={handleInputChange}
            required
            rows="4"
            placeholder="List ingredients (one per line or bullet points)..."
          />
        </div>

        <div className="form-group">
          <label>Instructions *</label>
          <textarea
            name="instructions"
            value={formData.instructions}
            onChange={handleInputChange}
            required
            rows="6"
            placeholder="Step-by-step instructions..."
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
          <small style={{ color: '#666', fontSize: '13px', marginTop: '4px', display: 'block' }}>
            Optional: Help users understand the "why" behind the magic
          </small>
        </div>

        <div className="form-group">
          <label>Spoken Intention</label>
          <textarea
            name="spokenIntention"
            value={formData.spokenIntention}
            onChange={handleInputChange}
            rows="3"
            placeholder="Words to say during the spell (optional)..."
          />
        </div>

        <div className="form-group">
          <label>Tips & Modifications</label>
          <textarea
            name="tips"
            value={formData.tips}
            onChange={handleInputChange}
            rows="3"
            placeholder="Optional tips, substitutions, or variations..."
          />
        </div>

        <div className="form-group">
          <label>Current Image</label>
          {formData.imageUrl && (
            <img 
              src={formData.imageUrl} 
              alt="Current spell" 
              style={{ 
                width: '200px', 
                height: '150px', 
                objectFit: 'cover', 
                borderRadius: '8px',
                marginBottom: '12px'
              }} 
            />
          )}
          <label>Upload New Image (optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
          />
          {image && <p className="file-name">New image selected: {image.name}</p>}
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

        <button type="submit" disabled={saving} className="submit-btn">
          {saving ? 'Saving Changes...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}

export default EditSpell;