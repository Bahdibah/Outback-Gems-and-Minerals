// Footer Component Loader
// Version 1.0.0 - Update this version when footer.html or footer.css changes
const FOOTER_VERSION = '1.0.0';

document.addEventListener('DOMContentLoaded', function() {
  const footerContainer = document.getElementById('footer-container');
  
  if (footerContainer) {
    // Fetch footer HTML with version parameter to control caching
    fetch(`footer.html?v=${FOOTER_VERSION}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Footer failed to load');
        }
        return response.text();
      })
      .then(html => {
        footerContainer.innerHTML = html;
      })
      .catch(error => {
        console.error('Error loading footer:', error);
        // Fallback: Show basic footer if loading fails
        footerContainer.innerHTML = `
          <footer style="background-color: #1e1e1e; color: #888; padding: 20px; text-align: center;">
            <p>&copy; 2025 Outback Gems & Minerals. All rights reserved.</p>
          </footer>
        `;
      });
  }
});
