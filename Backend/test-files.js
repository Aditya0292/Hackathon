// Save this as test_files.js in your Backend folder
// Run with: node test_files.js

const fs = require('fs');
const path = require('path');

const instructorDataDir = path.join(__dirname, 'instructor_data');

console.log('Checking instructor_data directory...\n');
console.log('Directory:', instructorDataDir);
console.log('Exists:', fs.existsSync(instructorDataDir));

if (fs.existsSync(instructorDataDir)) {
  const allFiles = fs.readdirSync(instructorDataDir);
  console.log('\n--- ALL FILES ---');
  allFiles.forEach(f => console.log(`  "${f}"`));
  
  const csvFiles = allFiles.filter(f => f.endsWith('_feedback.csv'));
  console.log('\n--- CSV FILES ONLY ---');
  csvFiles.forEach(f => console.log(`  "${f}"`));
  
  console.log('\n--- PROCESSING ---');
  const instructorMap = new Map();
  
  csvFiles.forEach(file => {
    const baseName = file.replace('_feedback.csv', '');
    const displayName = baseName.replace(/_/g, ' ');
    
    console.log(`\nFile: ${file}`);
    console.log(`  Base: ${baseName}`);
    console.log(`  Display: ${displayName}`);
    
    if (!instructorMap.has(baseName)) {
      instructorMap.set(baseName, {
        id: baseName,
        name: displayName,
        filename: file
      });
    } else {
      console.log(`  ⚠️  DUPLICATE DETECTED!`);
    }
  });
  
  const instructors = Array.from(instructorMap.values());
  
  console.log('\n--- FINAL RESULT ---');
  console.log(`Total unique instructors: ${instructors.length}`);
  instructors.forEach((inst, i) => {
    console.log(`\n${i + 1}. ${inst.name}`);
    console.log(`   ID: ${inst.id}`);
    console.log(`   File: ${inst.filename}`);
  });
} else {
  console.log('\n⚠️  Directory does not exist!');
  console.log('Create it with: mkdir instructor_data');
}