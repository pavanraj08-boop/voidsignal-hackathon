"""Add scroll reveal script and remove GSAP tags from index.html, then push."""
with open('index.html', encoding='utf-8') as f:
    html = f.read()

# Remove GSAP script tags
html = html.replace(
    '  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>\n  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js"></script>\n\n',
    ''
)
html = html.replace(
    '  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>\r\n  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js"></script>\r\n',
    ''
)

# Inject simple IntersectionObserver reveal script before </body>
reveal_script = '''
  <!-- Simple CSS scroll reveal (replaces GSAP ScrollTrigger) -->
  <script>
  (function() {
    const obs = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          // Also mark first section immediately
        }
      });
    }, { threshold: 0.08 });
    function init() {
      document.querySelectorAll('.tac-section').forEach(function(s) {
        obs.observe(s);
      });
      // First visible section should always be shown
      var first = document.querySelector('.tac-section');
      if (first) first.classList.add('visible');
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else { init(); }
  })();
  </script>
'''

if '</body>' in html:
    html = html.replace('</body>', reveal_script + '\n</body>')
    print("✓ Injected scroll reveal script")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print(f"✓ index.html updated. Size: {len(html)} bytes")
