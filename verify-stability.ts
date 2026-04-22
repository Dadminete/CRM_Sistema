
async function testEndpoint(name: string, url: string) {
  const start = Date.now();
  try {
    const response = await fetch(url + "?t=" + start);
    const data = await response.json();
    console.log(`[${name}] Status: ${response.status}, Success: ${data.success}, Time: ${Date.now() - start}ms`);
    return data.success;
  } catch (err: any) {
    console.error(`[${name}] FAILED: ${err.message}, Time: ${Date.now() - start}ms`);
    return false;
  }
}

async function runTest() {
  const baseUrl = "http://localhost:3000"; // Assuming the server is running here
  const endpoints = [
    { name: "Net Income", url: `${baseUrl}/api/net-income` },
    { name: "Bank Stats", url: `${baseUrl}/api/bank-stats` },
    { name: "Invoice Stats", url: `${baseUrl}/api/invoices-stats` },
    { name: "Papeleria Stats", url: `${baseUrl}/api/papeleria-stats` },
    { name: "Recent Movements", url: `${baseUrl}/api/recent-movements` }
  ];

  console.log("Starting Concurrency Test (hitting all endpoints at once)...");
  
  const results = await Promise.all(endpoints.map(e => testEndpoint(e.name, e.url)));
  
  const successCount = results.filter(r => r).length;
  console.log(`\nTest Finished: ${successCount}/${endpoints.length} successful queries.`);
  
  if (successCount === 0) {
    console.log("NOTE: If all failed, make sure the local server is running on port 3000.");
  }
}

runTest();
