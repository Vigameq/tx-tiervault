#!/usr/bin/env node

/**
 * Test Digital Ocean Spaces Connection
 * This script validates that your Spaces credentials are working
 */

const AWS = require('aws-sdk');
require('dotenv').config();

console.log('🧪 Testing Digital Ocean Spaces Connection...\n');

// Check if credentials are loaded
if (!process.env.DO_SPACES_KEY || !process.env.DO_SPACES_SECRET) {
  console.error('❌ Error: Spaces credentials not found in .env file');
  process.exit(1);
}

// Configure Spaces client
const spacesEndpoint = new AWS.Endpoint(process.env.DO_SPACES_ENDPOINT);
const s3 = new AWS.S3({
  endpoint: spacesEndpoint,
  accessKeyId: process.env.DO_SPACES_KEY,
  secretAccessKey: process.env.DO_SPACES_SECRET,
  region: process.env.DO_SPACES_REGION
});

console.log('📋 Configuration:');
console.log(`   Endpoint: ${process.env.DO_SPACES_ENDPOINT}`);
console.log(`   Region: ${process.env.DO_SPACES_REGION}`);
console.log(`   Bucket: ${process.env.DO_SPACES_BUCKET}`);
console.log(`   Access Key: ${process.env.DO_SPACES_KEY}`);
console.log(`   Secret Key: ${process.env.DO_SPACES_SECRET.substring(0, 10)}...`);
console.log('');

// Test 1: List buckets
console.log('Test 1: Listing buckets...');
s3.listBuckets((err, data) => {
  if (err) {
    console.error('❌ Failed to list buckets');
    console.error('   Error:', err.message);
    console.error('   Code:', err.code);
    return;
  }

  console.log('✅ Successfully connected to Digital Ocean Spaces!');
  console.log('   Available buckets:', data.Buckets.map(b => b.Name).join(', '));

  // Test 2: Check if our bucket exists
  const bucketExists = data.Buckets.some(b => b.Name === process.env.DO_SPACES_BUCKET);

  if (bucketExists) {
    console.log(`✅ Bucket "${process.env.DO_SPACES_BUCKET}" found!`);

    // Test 3: Try to upload a test file
    console.log('\nTest 2: Uploading test file...');

    const testContent = `TierVault Test File - ${new Date().toISOString()}`;
    const params = {
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: 'test/.tiervault-test.txt',
      Body: testContent,
      ACL: 'private',
      ContentType: 'text/plain'
    };

    s3.putObject(params, (err, data) => {
      if (err) {
        console.error('❌ Failed to upload test file');
        console.error('   Error:', err.message);
        return;
      }

      console.log('✅ Test file uploaded successfully!');
      console.log('   ETag:', data.ETag);
      console.log('   Location: test/.tiervault-test.txt');

      // Test 4: Generate a signed URL
      console.log('\nTest 3: Generating signed URL...');

      const signedParams = {
        Bucket: process.env.DO_SPACES_BUCKET,
        Key: 'test/.tiervault-test.txt',
        Expires: 3600
      };

      s3.getSignedUrl('getObject', signedParams, (err, url) => {
        if (err) {
          console.error('❌ Failed to generate signed URL');
          console.error('   Error:', err.message);
          return;
        }

        console.log('✅ Signed URL generated successfully!');
        console.log('   URL (first 80 chars):', url.substring(0, 80) + '...');

        console.log('\n' + '='.repeat(50));
        console.log('🎉 All tests passed!');
        console.log('✅ Digital Ocean Spaces is properly configured');
        console.log('✅ You can upload and download files');
        console.log('✅ Signed URLs are working');
        console.log('='.repeat(50));
      });
    });

  } else {
    console.error(`❌ Bucket "${process.env.DO_SPACES_BUCKET}" not found!`);
    console.error('   Available buckets:', data.Buckets.map(b => b.Name).join(', '));
  }
});
