import React from 'react';
import { useNavigate } from 'react-router-dom';

function NotFound() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '70vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      textAlign: 'center'
    }}>
      <h1 style={{
        fontSize: '72px',
        color: '#7D5E4F',
        marginBottom: '16px',
        fontWeight: '700'
      }}>
        404
      </h1>
      
      <h2 style={{
        fontSize: '28px',
        color: '#9D7B6B',
        marginBottom: '16px'
      }}>
        Page Not Found
      </h2>
      
      <p style={{
        fontSize: '16px',
        color: '#666',
        marginBottom: '32px',
        maxWidth: '500px'
      }}>
        The spell you're looking for seems to have vanished into the ether. 
        Let's get you back to familiar ground.
      </p>
      
      <button 
        onClick={() => navigate('/')}
        style={{
          padding: '16px 32px',
          background: 'linear-gradient(135deg, #7D5E4F 0%, #9D7B6B 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'all 0.3s'
        }}
        onMouseOver={(e) => {
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.boxShadow = '0 4px 16px rgba(125, 94, 79, 0.3)';
        }}
        onMouseOut={(e) => {
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = 'none';
        }}
      >
        Return Home
      </button>
    </div>
  );
}

export default NotFound;