#!/usr/bin/env node

const { spawn } = require('child_process')
const path = require('path')

console.log('🧪 Starting Comprehensive Test Suite for Medical Expo Platform\n')

const runTests = async () => {
  const testResults = {
    frontend: { passed: 0, failed: 0, coverage: 0 },
    backend: { passed: 0, failed: 0, coverage: 0 }
  }

  // Frontend Tests
  console.log('📱 Running Frontend Tests (my-telegram-app)...\n')
  
  try {
    await new Promise((resolve, reject) => {
      const frontendTest = spawn('npm', ['test'], {
        cwd: path.join(__dirname, 'my-telegram-app'),
        stdio: 'inherit'
      })

      frontendTest.on('close', (code) => {
        if (code === 0) {
          testResults.frontend.passed = 1
          console.log('✅ Frontend tests passed\n')
          resolve()
        } else {
          testResults.frontend.failed = 1
          console.log('❌ Frontend tests failed\n')
          reject(new Error('Frontend tests failed'))
        }
      })
    })
  } catch (error) {
    console.log('⚠️ Frontend tests encountered issues, continuing...\n')
  }

  // Backend Tests
  console.log('🔧 Running Backend Tests (telegram-app-backend)...\n')
  
  try {
    await new Promise((resolve, reject) => {
      const backendTest = spawn('npm', ['test'], {
        cwd: path.join(__dirname, 'telegram-app-backend'),
        stdio: 'inherit'
      })

      backendTest.on('close', (code) => {
        if (code === 0) {
          testResults.backend.passed = 1
          console.log('✅ Backend tests passed\n')
          resolve()
        } else {
          testResults.backend.failed = 1
          console.log('❌ Backend tests failed\n')
          reject(new Error('Backend tests failed'))
        }
      })
    })
  } catch (error) {
    console.log('⚠️ Backend tests encountered issues, continuing...\n')
  }

  // Generate Report
  console.log('📊 Test Results Summary:')
  console.log('========================')
  console.log(`Frontend: ${testResults.frontend.passed ? '✅ PASSED' : '❌ FAILED'}`)
  console.log(`Backend:  ${testResults.backend.passed ? '✅ PASSED' : '❌ FAILED'}`)
  
  const totalPassed = testResults.frontend.passed + testResults.backend.passed
  const confidence = (totalPassed / 2) * 100
  
  console.log(`\n🎯 Deployment Confidence: ${confidence}%`)
  
  if (confidence >= 70) {
    console.log('🚀 READY FOR DEPLOYMENT!')
    console.log('\nNext Steps:')
    console.log('1. Set up environment variables')
    console.log('2. Configure Telegram bot token')
    console.log('3. Set up production database')
    console.log('4. Deploy backend first, then frontend')
  } else {
    console.log('⚠️  NEEDS MORE WORK BEFORE DEPLOYMENT')
    console.log('\nIssues to address:')
    if (!testResults.frontend.passed) console.log('- Fix frontend test failures')
    if (!testResults.backend.passed) console.log('- Fix backend test failures')
  }
}

runTests().catch(console.error)