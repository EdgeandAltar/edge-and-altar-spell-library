import { HiOutlineBookOpen, HiOutlineCheckCircle, HiOutlineRefresh, HiOutlineSparkles } from 'react-icons/hi2';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import './Subscribe.css';

function Subscribe() {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const navigate = useNavigate();

  const handleCheckout = async () => {
    const user = auth.currentUser;

    if (!user) {
      navigate('/login');
      return;
    }

    try {
      setLoading(true);

      // Firebase ID token to authenticate the request to your backend
      const token = await user.getIdToken(true);

      // IMPORTANT: This relies on your Firebase Hosting rewrite:
      // "/api/createCheckoutSession" -> createCheckoutSessionHttp
      const resp = await fetch('/api/createCheckoutSession', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: selectedPlan }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`HTTP ${resp.status}: ${text}`);
      }

      const { url } = await resp.json();
      if (!url) {
        throw new Error('No checkout URL returned from server.');
      }

      window.location.assign(url);
    } catch (err) {
      console.error('Checkout error:', err);
      alert(err?.message || 'Could not start checkout. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="subscribe-page">
      {/* Hero Section */}
      <section className="subscribe-hero">
        <h1>Unlock Your Full Spell Library</h1>
        <p className="hero-description">
          Get instant access to 150+ premium spells. Cancel anytime.
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="pricing-section">
        <div className="pricing-toggle">
          <button
            className={selectedPlan === 'monthly' ? 'active' : ''}
            onClick={() => setSelectedPlan('monthly')}
            type="button"
          >
            Monthly
          </button>
          <button
            className={selectedPlan === 'annual' ? 'active' : ''}
            onClick={() => setSelectedPlan('annual')}
            type="button"
          >
            Annual <span className="save-badge">Save $24</span>
          </button>
        </div>

        <div className="pricing-cards">
          <div className={`pricing-card ${selectedPlan === 'monthly' ? 'selected' : ''}`}>
            <div className="plan-header">
              <h3>Premium Monthly</h3>
              <div className="price-display">
                <span className="currency">$</span>
                <span className="amount">7</span>
                <span className="period">/month</span>
              </div>
              <p className="plan-description">Perfect for trying it out</p>
            </div>

            <ul className="feature-list">
              <li><span className="check">✓</span> 150+ premium spells</li>
              <li><span className="check">✓</span> New spells added monthly</li>
              <li><span className="check">✓</span> Advanced search & filters</li>
              <li><span className="check">✓</span> Save favorites</li>
              <li><span className="check">✓</span> Printable spell cards</li>
              <li><span className="check">✓</span> Mobile-optimized access</li>
              <li><span className="check">✓</span> Cancel anytime</li>
            </ul>
          </div>

          <div className={`pricing-card featured ${selectedPlan === 'annual' ? 'selected' : ''}`}>
            <div className="best-value-badge">BEST VALUE</div>
            <div className="plan-header">
              <h3>Premium Annual</h3>
              <div className="price-display">
                <span className="currency">$</span>
                <span className="amount">60</span>
                <span className="period">/year</span>
              </div>
              <p className="plan-description">Just $5/month when paid annually</p>
            </div>

            <ul className="feature-list">
              <li><span className="check">✓</span> Everything in Monthly</li>
              <li><span className="check">✓</span> <strong>Save $24 per year</strong></li>
              <li><span className="check">✓</span> Lock in this price forever</li>
              <li><span className="check">✓</span> Priority support</li>
              <li><span className="check">✓</span> Early access to new features</li>
            </ul>
          </div>
        </div>

        <button
          className="subscribe-button"
          onClick={handleCheckout}
          disabled={loading}
          type="button"
        >
          {loading ? 'Redirecting...' : `Get Premium ${selectedPlan === 'monthly' ? '- $7/mo' : '- $60/yr'}`}
        </button>
      </section>

      {/* What You Get Section */}
      <section className="benefits-section">
        <h2>What You Get with Premium</h2>
        <div className="benefits-grid">
          <div className="benefit">
            <div className="benefit-icon"><HiOutlineBookOpen /></div>
            <h4>150+ Premium Spells</h4>
            <p>Access our complete library of curated rituals and ceremonies</p>
          </div>
          <div className="benefit">
            <div className="benefit-icon"><HiOutlineCheckCircle /></div>
            <h4>Every Situation Covered</h4>
            <p>From 5-minute morning rituals to deep ceremonial work</p>
          </div>
          <div className="benefit">
            <div className="benefit-icon"><HiOutlineRefresh /></div>
            <h4>Always Growing</h4>
            <p>New spells added every month, yours to keep forever</p>
          </div>
          <div className="benefit">
            <div className="benefit-icon"><HiOutlineSparkles /></div>
            <h4>No Gatekeeping</h4>
            <p>Clear instructions. Real psychology. Magic for real people.</p>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="trust-section">
        <div className="trust-elements">
          <div className="trust-item">
            <span className="trust-icon">🔒</span>
            <span>Secure payment via Stripe</span>
          </div>
          <div className="trust-item">
            <span className="trust-icon">✓</span>
            <span>Cancel anytime, no questions asked</span>
          </div>
          <div className="trust-item">
            <span className="trust-icon">💳</span>
            <span>No hidden fees or commitments</span>
          </div>
        </div>
      </section>

      <button className="back-button" onClick={() => navigate('/library')} type="button">
        ← Back to Library
      </button>
    </div>
  );
}

export default Subscribe;
