/**
 * Fetch current time from an API because we can't trust system time
 * @ returns {number} The timestamp for the current time
 */
export async function getSafeTime() {
  let response = await fetch('https://worldtimeapi.org/api/ip')
  if (response.ok) {
    let body = await response.json()
    let date = new Date(body.utc_datetime)
    return date.getTime()
  }
  else {
    throw new Error(response.statusText)
  }
}