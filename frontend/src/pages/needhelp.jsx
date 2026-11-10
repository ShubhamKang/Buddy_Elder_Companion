import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './needhelp.css';

const WHATSAPP_NUMBER = '919569505979'; // Country code + number, no plus
const PHONE_NUMBER = '+919569505979';
const SUPPORT_EMAIL = 'dhipycare@gmail.com';

const NeedHelp = () => {
  const navigate = useNavigate();

  const encodedMessage = useMemo(
    () => encodeURIComponent('Hi Buddy team, I need help. Please connect with me.'),
    []
  );

  const openWhatsApp = () => {
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
    window.open(url, '_blank');
  };

  const openCall = () => {
    window.location.href = `tel:${PHONE_NUMBER}`;
  };

  const openEmail = () => {
    const subject = encodeURIComponent('Need Help');
    const body = encodedMessage;
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="needhelp-page">
      <div className="nh-header">
        <button className="nh-back" onClick={() => navigate('/home')} aria-label="Back">←</button>
        <h2>Need Help</h2>
      </div>

      <div className="nh-card">
        <h3 className="nh-title">We are here to help</h3>
        <p className="nh-sub">Choose how you want to contact us</p>

        <div className="nh-actions">
          <button className="nh-btn whatsapp" onClick={openWhatsApp}>
            <span className="emoji">💬</span>
            WhatsApp Us
          </button>
          <button className="nh-btn call" onClick={openCall}>
            <span className="emoji">📞</span>
            Call Now
          </button>
          <button className="nh-btn email" onClick={openEmail}>
            <span className="emoji">✉️</span>
            Email Support
          </button>
        </div>

        <div className="nh-meta">
          <div>WhatsApp: +91 95695 05979</div>
          <div>Call: +91 95695 05979</div>
          <div>Email: {SUPPORT_EMAIL}</div>
        </div>
      </div>
    </div>
  );
};

export default NeedHelp;








