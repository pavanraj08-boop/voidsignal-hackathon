import re

print("Starting Premium CSS Design Overhaul...")

with open("style.css", "r", encoding="utf-8") as f:
    css = f.read()

# 1. Root Variables Upgrade (Richer colors, deeper blacks)
css = css.replace('--bg:  #01020A;', '--bg:  #000000;')
css = css.replace('--bg1: #060B14;', '--bg1: rgba(6, 11, 20, 0.4);')
css = css.replace('--bg2: #0A1020;', '--bg2: rgba(10, 16, 32, 0.45);')
css = css.replace('--bd:  rgba(0,255,159,0.14);', '--bd:  rgba(0,255,159,0.25);')

# 2. Body Gradient Nebula Injection + Typography Polish
css = css.replace(
    'body{background:var(--bg);color:#fff;font-family:var(--mono);overflow-x:hidden;cursor:crosshair}',
    'body{background:var(--bg) radial-gradient(circle at 50% 0%, rgba(139,92,246,0.15) 0%, transparent 60%) fixed;color:#fff;font-family:var(--mono);overflow-x:hidden;cursor:crosshair;text-rendering:optimizeLegibility}'
)

# 3. Glassmorphism Blur Effects
# Adding backdrop filters to the main panels
css = css.replace(
    '.term-wrap{background:#02060F;border:1px solid var(--g);',
    '.term-wrap{background:rgba(2, 6, 15, 0.7);backdrop-filter:blur(16px);border:1px solid var(--g);'
)
css = css.replace(
    '.nc{background:var(--bg1);border:1px solid var(--bd);padding:1.4rem;',
    '.nc{background:var(--bg1);backdrop-filter:blur(12px);border:1px solid var(--bd);padding:1.4rem;'
)
css = css.replace(
    '.oc{background:var(--bg1);border:1px solid var(--bd);padding:1.4rem;',
    '.oc{background:var(--bg1);backdrop-filter:blur(12px);border:1px solid var(--bd);padding:1.4rem;'
)
css = css.replace(
    '.sc{background:var(--bg1);border:1px solid var(--bd);',
    '.sc{background:var(--bg1);backdrop-filter:blur(12px);border:1px solid var(--bd);'
)
css = css.replace(
    '.lab-controls{background:var(--bg2);border:1px solid var(--bd);',
    '.lab-controls{background:var(--bg2);backdrop-filter:blur(16px);border:1px solid var(--bd);'
)
css = css.replace(
    '.mc-stat-panel{background:var(--bg1);',
    '.mc-stat-panel{background:var(--bg1);backdrop-filter:blur(12px);'
)

# 4. Neon Text Glows for Premium Data Visuals
css = css.replace(
    '.stat-n{font-family:var(--head);font-size:2rem;color:var(--g);display:block}',
    '.stat-n{font-family:var(--head);font-size:2rem;color:var(--g);display:block;text-shadow:0 0 10px rgba(0,255,159,0.4)}'
)
css = css.replace(
    '.mc-big-val{font-family:var(--head);font-size:1.5rem;color:var(--g);line-height:1;margin-bottom:.2rem}',
    '.mc-big-val{font-family:var(--head);font-size:1.5rem;color:var(--g);line-height:1;margin-bottom:.2rem;text-shadow:0 0 12px rgba(0,255,159,0.5)}'
)
css = css.replace(
    '.lr-val{font-family:var(--head);font-size:.8rem;color:var(--g)}',
    '.lr-val{font-family:var(--head);font-size:.8rem;color:var(--g);text-shadow:0 0 8px rgba(0,255,159,0.4)}'
)
css = css.replace(
    '.ap-val{font-family:var(--head);font-size:1.4rem;color:#fff}',
    '.ap-val{font-family:var(--head);font-size:1.4rem;color:#fff;text-shadow:0 0 15px rgba(255,255,255,0.4)}'
)
css = css.replace(
    '.today-day{font-family:var(--head);font-size:2.2rem;color:var(--g);line-height:1}',
    '.today-day{font-family:var(--head);font-size:2.2rem;color:var(--g);line-height:1;text-shadow:0 0 15px rgba(0,255,159,0.3)}'
)

# 5. Button and Tab Micro-Animations (Hover lifting + Neon Glow)
css = css.replace(
    '.btn:hover{background:var(--g);color:#000}',
    '.btn:hover{background:var(--g);color:#000;box-shadow:0 0 20px rgba(0,255,159,0.6);transform:translateY(-2px)}'
)
css = css.replace(
    '.lab-btn:hover{background:var(--g);color:#000}',
    '.lab-btn:hover{background:var(--g);color:#000;box-shadow:0 0 15px rgba(0,255,159,0.5);transform:translateY(-1px)}'
)
css = css.replace(
    '.mt-card{flex-shrink:0;background:var(--bg1);border:1px solid var(--bd);',
    '.mt-card{flex-shrink:0;background:var(--bg1);backdrop-filter:blur(8px);border:1px solid var(--bd);'
)

# 6. Smooth the title gradient
css = css.replace(
    'background:linear-gradient(135deg,#fff 30%,var(--g),var(--c));',
    'background:linear-gradient(135deg,#ffffff 20%,#a2ffdb 40%,var(--g) 60%,var(--c) 100%);'
)

with open("style.css", "w", encoding="utf-8") as f:
    f.write(css)

print("Premium CSS Design Overhaul completed successfully!")
