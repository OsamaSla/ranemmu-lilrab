const fs = require('fs');
const p = 'node_modules/expo-router/build/react-navigation/bottom-tabs/types.d.ts';
const s = fs.readFileSync(p, 'utf8');
const i = s.indexOf('BottomTabBarButtonProps');
fs.writeFileSync('C:/Users/osama/AppData/Local/Temp/opencode/snip3.txt', s.slice(Math.max(0, i - 100), i + 900));
