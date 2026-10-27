with open('src/app/(tabs)/admin-edit.tsx', encoding='utf-8') as f:
    lines = f.read().splitlines()
for i in range(315, 335):
    print(f"{i+1}: {lines[i]}")
