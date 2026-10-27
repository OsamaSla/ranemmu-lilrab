const fs = require('fs');
const s = fs.readFileSync('node_modules/expo-router/build/react-navigation/bottom-tabs/types.d.ts', 'utf8');
const lines = s.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('BottomTabBarButtonProps') || l.includes('BottomTabBarProps')) {
    console.log(idx + 1, l);
  }
});
const i = s.indexOf('interface BottomTabBarButtonProps');
if (i >= 0) {
  console.log('---INTERFACE---');
  console.log(s.slice(i, i + 1500));
}
const j = s.indexOf('type BottomTabBarButtonProps');
if (j >= 0) {
  console.log('---TYPE---');
  console.log(s.slice(j, j + 800));
}
