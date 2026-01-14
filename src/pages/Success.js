import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

function Success() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('checking'); // checking | premium | timeout
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const user = auth.currentUser;

    // If user isn't logged in, they can't be matched to Firestore doc
    if (!user) {
      setStatus('timeout');
      return;
    }

    const userRef = doc(db, 'users', user.uid);

    const unsub = onSnapshot(
      userRef,
      (snap) => {
        const subStatus = snap.data()?.subscriptionStatus || 'free';
        if (subStatus === 'premium') {
          setStatus('premium');
        }
      },
      (err) => {
        console.error('Error watching user doc:', err);
      }
    );

    const interval = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);

    const timeout = setTimeout(() => {
      setStatus((s) => (s === 'premium' ? s : 'timeout'));
    }, 30000);

    return () => {
      unsub();
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  if (status === 'checking') {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
        <p style={{ color: '#7d6e57', fontSize: '18px' }}>
          Activating your premium access… (syncing with Stripe)
        </p>
        <p style={{ color: '#999', fontSize: '14px', marginTop: '10px' }}>
          {seconds}s
        </p>
      </div>
    );
  }

  if (status === 'timeout') {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
        <h1 style={{ color: '#7D5E4F', marginBottom: '16px' }}>Almost there…</h1>
        <p style={{ color: '#7d6e57', fontSize: '18px', marginBottom: '18px' }}>
          Your payment went through, but your access hasn’t synced yet.
        </p>
        <p style={{ color: '#999', fontSize: '14px', marginBottom: '28px' }}>
          This can take a minute if Stripe/webhooks are slow. Try refreshing, then go to the Library.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '14px 22px',
              background: '#7D5E4F',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Refresh
          </button>

          <button
            onClick={() => navigate('/library')}
            style={{
              padding: '14px 22px',
              background: 'white',
              color: '#7D5E4F',
              border: '2px solid #7D5E4F',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Go to Library
          </button>
        </div>
      </div>
    );
  }

  // premium
  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: '64px', marginBottom: '24px' }}>🎉</div>
      <h1 style={{ color: '#7D5E4F', marginBottom: '16px' }}>Welcome to Premium!</h1>
      <p style={{ color: '#7d6e57', fontSize: '18px', marginBottom: '32px' }}>
        Your subscription is active. You have full access to all premium spells!
      </p>
      <button
        onClick={() => navigate('/library')}
        style={{
          padding: '16px 32px',
          background: '#7D5E4F',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer',
        }}
      >
        Browse Spell Library
      </button>
    </div>
  );
}

export default Success;
