import os
import re

def remove_console_log_from_file(file_path):
    with open(file_path, 'r') as f:
        lines = f.readlines()

    new_lines = []
    inside_log = False
    paren_depth = 0

    for line in lines:
        if not inside_log and re.search(r'\bconsole\.log\s*\(', line):
            inside_log = True
            paren_depth = line.count('(') - line.count(')')
            continue
        elif inside_log:
            paren_depth += line.count('(') - line.count(')')
            if paren_depth <= 0:
                inside_log = False
            continue
        else:
            new_lines.append(line)

    # Make backup
    os.rename(file_path, file_path + ".bak")

    with open(file_path, 'w') as f:
        f.writelines(new_lines)

# Run for all .js files in current directory
for fname in os.listdir('.'):
    if fname.endswith('.js'):
        remove_console_log_from_file(fname)

print("✅ console.log statements removed (backups saved as .bak)")