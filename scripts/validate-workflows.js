#!/usr/bin/env node

/**
 * Validate GitHub Actions workflow files
 * This script checks YAML syntax and basic workflow structure
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const WORKFLOWS_DIR = '.github/workflows';

function validateWorkflow(filePath) {
  console.log(`\n🔍 Validating ${filePath}...`);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const workflow = yaml.load(content);
    
    // Basic structure validation
    if (!workflow.name) {
      throw new Error('Workflow must have a name');
    }
    
    if (!workflow.on) {
      throw new Error('Workflow must have trigger events (on)');
    }
    
    if (!workflow.jobs || Object.keys(workflow.jobs).length === 0) {
      throw new Error('Workflow must have at least one job');
    }
    
    // Validate each job
    for (const [jobName, job] of Object.entries(workflow.jobs)) {
      if (!job['runs-on']) {
        throw new Error(`Job '${jobName}' must specify runs-on`);
      }
      
      if (!job.steps || job.steps.length === 0) {
        throw new Error(`Job '${jobName}' must have at least one step`);
      }
      
      // Check for required step properties
      job.steps.forEach((step, index) => {
        if (!step.name && !step.uses && !step.run) {
          throw new Error(`Job '${jobName}' step ${index + 1} must have name, uses, or run`);
        }
      });
    }
    
    console.log(`✅ ${path.basename(filePath)} is valid`);
    return true;
    
  } catch (error) {
    console.error(`❌ ${path.basename(filePath)} validation failed:`);
    console.error(`   ${error.message}`);
    return false;
  }
}

function main() {
  console.log('🚀 GitHub Actions Workflow Validator\n');
  
  if (!fs.existsSync(WORKFLOWS_DIR)) {
    console.error(`❌ Workflows directory not found: ${WORKFLOWS_DIR}`);
    process.exit(1);
  }
  
  const workflowFiles = fs.readdirSync(WORKFLOWS_DIR)
    .filter(file => file.endsWith('.yml') || file.endsWith('.yaml'))
    .map(file => path.join(WORKFLOWS_DIR, file));
  
  if (workflowFiles.length === 0) {
    console.log('⚠️  No workflow files found');
    process.exit(0);
  }
  
  console.log(`Found ${workflowFiles.length} workflow file(s):`);
  workflowFiles.forEach(file => console.log(`  - ${path.basename(file)}`));
  
  let allValid = true;
  
  for (const file of workflowFiles) {
    const isValid = validateWorkflow(file);
    allValid = allValid && isValid;
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (allValid) {
    console.log('🎉 All workflow files are valid!');
    process.exit(0);
  } else {
    console.log('💥 Some workflow files have validation errors');
    process.exit(1);
  }
}

// Install js-yaml if not available
try {
  require('js-yaml');
} catch {
  console.log('📦 Installing js-yaml dependency...');
  const { execSync } = require('child_process');
  try {
    execSync('npm install js-yaml --no-save', { stdio: 'inherit' });
    console.log('✅ js-yaml installed successfully');
  } catch {
    console.error('❌ Failed to install js-yaml. Please install it manually:');
    console.error('   npm install js-yaml');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { validateWorkflow };