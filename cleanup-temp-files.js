#!/usr/bin/env node

/**
 * Cleanup Script for Orphaned Temp Files
 *
 * This script removes temporary files that were left behind due to failed AI processing.
 * Run this script to clean up existing orphaned temp files in Firebase Storage.
 */

const { initializeApp } = require('firebase/app');
const { getStorage, ref, listAll, deleteObject } = require('firebase/storage');

// Firebase configuration
const firebaseConfig = {
  // Add your Firebase config here
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

/**
 * Clean up orphaned temporary files
 */
async function cleanupOrphanedTempFiles() {
  console.log('🧹 Starting cleanup of orphaned temp files...');

  const result = {
    deletedCount: 0,
    errors: [],
  };

  try {
    // List all files in the temp folder
    const tempRef = ref(storage, 'temp');
    const listResult = await listAll(tempRef);

    console.log(`📁 Found ${listResult.items.length} temp files to check`);

    if (listResult.items.length === 0) {
      console.log('✅ No temp files found - cleanup not needed');
      return result;
    }

    // Delete each temp file
    for (const itemRef of listResult.items) {
      try {
        await deleteObject(itemRef);
        result.deletedCount++;
        console.log(`✅ Deleted temp file: ${itemRef.name}`);
      } catch (deleteError) {
        const errorMsg = `Failed to delete ${itemRef.name}: ${deleteError.message}`;
        result.errors.push(errorMsg);
        console.warn(`⚠️ ${errorMsg}`);
      }
    }

    console.log(`🎉 Cleanup completed:`);
    console.log(`   - Files deleted: ${result.deletedCount}`);
    console.log(`   - Errors: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      result.errors.forEach(error => console.log(`   - ${error}`));
    }
  } catch (error) {
    console.error('❌ Failed to cleanup temp files:', error.message);
    result.errors.push(`Failed to list temp files: ${error.message}`);
  }

  return result;
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 DocVault Temp Files Cleanup Script');
  console.log('=====================================\n');

  try {
    const result = await cleanupOrphanedTempFiles();

    if (result.deletedCount > 0) {
      console.log(
        `\n✅ Successfully cleaned up ${result.deletedCount} orphaned temp files`
      );
    } else {
      console.log('\n✅ No orphaned temp files found');
    }

    if (result.errors.length > 0) {
      console.log(
        `\n⚠️ ${result.errors.length} errors occurred during cleanup`
      );
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { cleanupOrphanedTempFiles };
