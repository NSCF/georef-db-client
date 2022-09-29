/**
 * Fetch current time from an API because we can't trust system time on users machines
 * @ returns {number} The timestamp for the current time
 */
export async function getSafeTime() {
  try {
    let response = await fetchWithTimeout('https://us-central1-georef-745b9.cloudfunctions.net/getutctimestamp', { timeout: 5000 })
    if (response.ok) {
      let body = await response.json()
      return body.timestamp
    }
    else {
      throw new Error(response.statusText)
    }
  }
  catch(err) {
    if (error.name === 'AbortError') {
      throw new Error('timestamp API timed out')
    }
    else {
      throw err
    }
  }
}

//from https://dmitripavlutin.com/timeout-fetch-request/
async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 8000 } = options;
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(resource, {
    ...options,
    signal: controller.signal  
  });
  clearTimeout(id);
  return response;
}