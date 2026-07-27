const { execSync } = require('child_process');
try {
  const output = execSync('git log --all -i --grep="izhar" --stat', { encoding: 'utf-8' });
  console.log(output || 'No commits found');
} catch (e) {
  console.error(e.message);
}
