import re

with open(r'c:\Users\rajrp\OneDrive\Desktop\void signal\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Locate the terminal section
# Find the exact string from id="terminal-s" to the next wrap or comment
term_match = re.search(r'(<!-- ═══════════════════════════════════════════════\s*TERMINAL — AI POWERED \(VoidSignal v10\)\s*════════════════════════════════════════════════ -->.*?)?(<div class="wrap" id="terminal-s".*?)(?=<!-- ═══════════════════════════════════════════════\s*EXPLORE|<div class="wrap" id="explore-s")', content, re.DOTALL)

if not term_match:
    print("Could not find terminal block")
else:
    terminal_block = term_match.group(2) # just the div part, we can make our own comment
    print(f"Found terminal block of length: {len(terminal_block)}")
    
    # Remove from original
    new_content = content.replace(terminal_block, '')
    
    # Locate end of hero section
    hero_end = re.search(r'</section>', new_content)
    if not hero_end:
        print("Could not find hero end")
    else:
        insert_pos = hero_end.end()
        
        # Build the injected block
        injection = "\n\n<!-- ═══════════════════════════════════════════════\n     TERMINAL — AI POWERED \n════════════════════════════════════════════════ -->\n" + terminal_block
        
        final_content = new_content[:insert_pos] + injection + new_content[insert_pos:]
        
        with open(r'c:\Users\rajrp\OneDrive\Desktop\void signal\index.html', 'w', encoding='utf-8') as f:
            f.write(final_content)
        
        print("Successfully moved terminal to below hero section!")
