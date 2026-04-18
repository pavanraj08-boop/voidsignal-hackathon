import shutil
import os

src_dir = r"C:\Users\rajrp\OneDrive\Desktop\void signal"
dst_dir = r"C:\Users\rajrp\OneDrive\Desktop\voidsignal-hackathon"

files = ["index.html", "main.js", "style.css"]

print("Starting absolute Python copy...")

for f in files:
    src_file = os.path.join(src_dir, f)
    dst_file = os.path.join(dst_dir, f)
    
    print(f"Copying {src_file} -> {dst_file}")
    shutil.copy2(src_file, dst_file)
    print(f"Copied {f} successfully.")

print("All files copied absolutely!")
