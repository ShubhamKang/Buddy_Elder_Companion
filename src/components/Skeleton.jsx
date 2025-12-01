import React from 'react';

const Skeleton = () => {
  const styles = `
    .skeleton-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      display: flex;
      z-index: 9999;
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      overflow-y: auto;
      justify-content: center;
      padding: 10px;
    }

    .skeleton-container {
      width: 100%;
      max-width: 600px;
      padding: 20px;
      box-sizing: border-box;
      animation: fadeInUp 0.6s ease-out;
    }

    .skeleton-card {
      background: #fff;
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      border: 1px solid rgba(255,255,255,0.8);
      backdrop-filter: blur(10px);
      animation: slideInUp 0.5s ease-out;
      animation-fill-mode: both;
    }

    .skeleton-card:nth-child(1) { animation-delay: 0.1s; }
    .skeleton-card:nth-child(2) { animation-delay: 0.2s; }
    .skeleton-card:nth-child(3) { animation-delay: 0.3s; }

    .skeleton-flex {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .skeleton-avatar {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
      animation: pulse 2s infinite;
    }

    .skeleton-avatar-small {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
      animation: pulse 2s infinite;
    }

    .skeleton-lines {
      flex-grow: 1;
    }

    .skeleton-line {
      height: 18px;
      border-radius: 10px;
      background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
      margin-bottom: 12px;
      animation: wave 2s infinite;
    }

    .skeleton-line:last-child {
      margin-bottom: 0;
    }

    .skeleton-img {
      height: 220px;
      border-radius: 12px;
      background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
      margin-top: 16px;
      animation: pulse 2.5s infinite;
    }
    
    .skeleton-actions {
        justify-content: space-around;
        margin-top: 16px;
    }

    .skeleton-btn {
        height: 36px;
        width: 90px;
        border-radius: 18px;
        background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
        animation: pulse 2s infinite;
    }

    .shimmer::before {
      content: '';
      position: absolute;
      top: 0;
      left: -150%;
      height: 100%;
      width: 150%;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(255,255,255,0.4) 20%,
        rgba(255,255,255,0.8) 50%,
        rgba(255,255,255,0.4) 80%,
        transparent 100%
      );
      animation: shimmer 2s infinite;
    }
    
    .shimmer {
        position: relative;
        overflow: hidden;
    }

    /* Enhanced Animations */
    @keyframes shimmer {
      0% {
        transform: translateX(-100%);
      }
      100% {
        transform: translateX(100%);
      }
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.7;
        transform: scale(0.98);
      }
    }

    @keyframes wave {
      0%, 100% {
        opacity: 1;
        transform: translateY(0);
      }
      50% {
        opacity: 0.8;
        transform: translateY(-2px);
      }
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes slideInUp {
      from {
        opacity: 0;
        transform: translateY(20px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .skeleton-container {
        padding: 15px;
        max-width: 100%;
      }

      .skeleton-card {
        padding: 16px;
        margin-bottom: 16px;
        border-radius: 12px;
      }

      .skeleton-flex {
        gap: 12px;
      }

      .skeleton-avatar {
        width: 44px;
        height: 44px;
      }

      .skeleton-avatar-small {
        width: 36px;
        height: 36px;
      }

      .skeleton-line {
        height: 16px;
        margin-bottom: 10px;
      }

      .skeleton-img {
        height: 180px;
        margin-top: 12px;
      }

      .skeleton-btn {
        height: 32px;
        width: 80px;
        border-radius: 16px;
      }

      .skeleton-actions {
        margin-top: 12px;
      }
    }

    @media (max-width: 480px) {
      .skeleton-overlay {
        padding: 5px;
      }

      .skeleton-container {
        padding: 10px;
      }

      .skeleton-card {
        padding: 12px;
        margin-bottom: 12px;
      }

      .skeleton-img {
        height: 160px;
      }

      .skeleton-btn {
        width: 70px;
        height: 30px;
      }
    }

    /* Hover Effects for Desktop */
    @media (min-width: 769px) {
      .skeleton-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 30px rgba(0,0,0,0.12);
        transition: all 0.3s ease;
      }
    }
  `;

  return (
    <>
      <style>{styles}</style>
      <div className="skeleton-overlay">
        <div className="skeleton-container">
          {/* Header Skeleton */}
          <div className="skeleton-card">
            <div className="skeleton-flex">
              <div className="skeleton-avatar shimmer"></div>
              <div className="skeleton-lines">
                <div className="skeleton-line shimmer" style={{ width: '180px' }}></div>
                <div className="skeleton-line shimmer" style={{ width: '120px', height: '12px' }}></div>
              </div>
            </div>
          </div>

          {/* Post Skeleton */}
          <div className="skeleton-card">
            <div className="skeleton-flex">
              <div className="skeleton-avatar-small shimmer"></div>
              <div className="skeleton-lines">
                <div className="skeleton-line shimmer" style={{ width: '120px' }}></div>
                <div className="skeleton-line shimmer" style={{ width: '80px', height: '12px' }}></div>
              </div>
            </div>
            <div className="skeleton-line shimmer" style={{ width: '100%', marginTop: '16px' }}></div>
            <div className="skeleton-line shimmer" style={{ width: '85%' }}></div>
            <div className="skeleton-line shimmer" style={{ width: '65%' }}></div>
            <div className="skeleton-img shimmer"></div>
            <div className="skeleton-flex skeleton-actions">
                <div className="skeleton-btn shimmer"></div>
                <div className="skeleton-btn shimmer" style={{width: '75px'}}></div>
                <div className="skeleton-btn shimmer"></div>
            </div>
          </div>

          {/* Video Skeleton */}
          <div className="skeleton-card">
            <div className="skeleton-img shimmer" style={{ height: '160px' }}></div>
            <div className="skeleton-flex" style={{ marginTop: '16px' }}>
              <div className="skeleton-avatar-small shimmer"></div>
              <div className="skeleton-lines">
                <div className="skeleton-line shimmer" style={{ width: '100px' }}></div>
                <div className="skeleton-line shimmer" style={{ width: '80px', height: '12px' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Skeleton;








