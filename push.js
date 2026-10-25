const { execSync } = require('child_process');
execSync('git add -A', { cwd: 'D:/PROJECTS/رنموا للرب', stdio: 'inherit' });
execSync('git commit -m "Feedback loop: user-facing modal + Firestore integration"', { cwd: 'D:/PROJECTS/رنموا للرب', stdio: 'inherit' });
execSync('git push origin main', { cwd: 'D:/PROJECTS/رنموا للرب', stdio: 'inherit' });
console.log('Pushed.');
