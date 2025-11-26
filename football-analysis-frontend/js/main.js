// ==================== MAIN JAVASCRIPT FILE ====================

// Smooth scrolling for on-page anchor links only
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    // Only prevent default if target exists on the same page
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// Add active class to current navigation link (handles query strings, subpaths)
(function setActiveNav() {
  const path = window.location.pathname;
  // Extract filename (e.g., /folder/standings.html -> standings.html)
  let current = path.substring(path.lastIndexOf('/') + 1);
  if (!current) current = 'index.html';

  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    // Normalize comparison (strip query/hash from href)
    const href = link.getAttribute('href') || '';
    const file = href.split('?')[0].split('#')[0];
    if (file === current) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
})();

// Navbar scroll shadow effect (defensive checks)
(function navbarShadow() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset || document.documentElement.scrollTop || 0;
    navbar.style.boxShadow = currentScroll <= 0
      ? '0 2px 10px rgba(0, 0, 0, 0.3)'
      : '0 4px 20px rgba(0, 0, 0, 0.5)';
  }, { passive: true });
})();

// IntersectionObserver for fade-in elements (feature/stat/insight/standings cards)
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
      // Stop observing once animated
      fadeObserver.unobserve(entry.target);
    }
  });
}, observerOptions);

// Initialize animations on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  // Home feature cards
  const featureCards = document.querySelectorAll('.feature-card');
  featureCards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    card.style.transition = `all 0.6s ease ${index * 0.1}s`;
    fadeObserver.observe(card);
  });

  // Stats page cards/tables
  const statBlocks = document.querySelectorAll('.stat-card, .stats-table-card, .team-comparison-card, .tactical-insights-card');
  statBlocks.forEach((el, index) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = `all 0.6s ease ${index * 0.08}s`;
    fadeObserver.observe(el);
  });

  // Standings page card
  const standingsCard = document.querySelector('.standings-card');
  if (standingsCard) {
    standingsCard.style.opacity = '0';
    standingsCard.style.transform = 'translateY(30px)';
    standingsCard.style.transition = 'all 0.6s ease 0.1s';
    fadeObserver.observe(standingsCard);
  }
});

// Console welcome message
console.log('%c🚀 DeepVision Soccer', 'color: #dc2626; font-size: 24px; font-weight: bold;');
console.log('%cFootball Analysis Platform - Final Year Project', 'color: #4b5563; font-size: 14px;');
