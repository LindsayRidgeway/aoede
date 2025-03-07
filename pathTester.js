// Simple utility to test file paths in the web environment
export const testFilePaths = async () => {
  console.log("=== PATH TESTER ===");
  console.log("Current URL:", window.location.href);
  console.log("Origin:", window.location.origin);
  
  // Test various common Expo web paths
  const filename = "sherlockholmes.txt";
  const paths = [
    './assets/books/' + filename,
    '/assets/books/' + filename,
    'assets/books/' + filename,
    '../assets/books/' + filename,
    window.location.origin + '/assets/books/' + filename,
  ];
  
  console.log("Testing the following paths:");
  for (const path of paths) {
    console.log(`- ${path}`);
  }
  
  // Try each path
  for (const path of paths) {
    try {
      console.log(`Fetching: ${path}`);
      const response = await fetch(path);
      if (response.ok) {
        const text = await response.text();
        console.log(`✅ SUCCESS: ${path} (${text.length} bytes)`);
        console.log(`First 100 chars: ${text.substring(0, 100)}...`);
      } else {
        console.log(`❌ FAILED: ${path} (Status: ${response.status})`);
      }
    } catch (error) {
      console.log(`❌ ERROR: ${path} (${error.message})`);
    }
  }
  
  console.log("=== PATH TEST COMPLETE ===");
};