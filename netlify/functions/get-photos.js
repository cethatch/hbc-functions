import fetch from 'node-fetch';

export async function handler() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const albumId = process.env.GOOGLE_ALBUM_ID;

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

  // Step 2: Fetch album items
  const res = await fetch('https://photoslibrary.googleapis.com/v1/albums', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  const data = await res.json();

  // Step 3: Return simplified data
  const images = data.mediaItems?.map(item => ({
    url: `${item.baseUrl}=w2000-h2000`, // resize to fit needs
    alt: item.filename
  })) || [];

  return {
    statusCode: 200,
    body: JSON.stringify(images)
  };
}

