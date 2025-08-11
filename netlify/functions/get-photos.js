export async function handler() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  // Step 1: Get access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  // Step 2: Fetch albums
  const res = await fetch('https://photoslibrary.googleapis.com/v1/albums', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  const data = await res.json();

  // Step 3: Return the albums list
  return {
    statusCode: 200,
    body: JSON.stringify(data.albums || [])
  };
}