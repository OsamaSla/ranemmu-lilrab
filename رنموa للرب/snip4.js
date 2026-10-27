const fs = require('fs');
const s = fs.readFileSync('node_modules/expo-router/build/react-navigation/bottom-tabs/types.d.ts', 'utf8');
const i = s.indexOf('BottomTabBarButtonProps');
fs.writeFileSync('C:/Users/osama/AppData/Local/Temp/opencode/snip4.txt', s.slice(Math.max(0, i - 600), i + 1600));
