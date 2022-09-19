/**
 * Fetch current time from an API because we can't trust system time on users machines
 * @ returns {number} The timestamp for the current time
 */
export async function getSafeTime() {
  try {
    let response = await fetchWithTimeout('https://worldtimeapi.org/api/ip', { timeout: 1000 })
    if (response.ok) {
      let body = await response.json()
      let date = new Date(body.utc_datetime)
      return date.getTime()
    }
    else {
      throw new Error(response.statusText)
    }
  }
  catch(err) {
    if (error.name === 'AbortError') {
      throw new Error('worldtimeapi timed out')
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