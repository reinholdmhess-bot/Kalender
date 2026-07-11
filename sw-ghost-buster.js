// Bookmarklet or manual run to unregister ALL service workers
// Run in console: unregisterAllSWs()
async function unregisterAllSWs() {
  const registrations = await navigator.serviceWorker.getRegistrations();
  for (const reg of registrations) {
    console.log('Unregistering:', reg.scope);
    await reg.unregister();
  }
  console.log('All service workers unregistered. Reload the page.');
}
