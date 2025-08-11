export async function handler() {
  console.log("Starting get-photos function...");

  // Log env var presence (but not secrets)
  console.log("Has GOOGLE_CLIENT_ID?", !!process.env.GOOGLE_CLIENT_ID);
  console.log("Has GOOGLE_CLIENT_SECRET?", !!process.env.GOOGLE_CLIENT_SECRET);
  console.log("Has GOOGLE_REFRESH_TOKEN?", !!process.env.GOOGLE_REFRESH_TOKEN);

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  // Get access token
  console.log("Requesting new access token...");
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

  console.log("Token response status:", tokenRes.status);
  const tokenData = await tokenRes.json();
  console.log("Token response data:", tokenData);

  if (!tokenData.access_token) {
    console.error("No access token received. Exiting.");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to obtain access token", details: tokenData })
    };
  }

  const accessToken = tokenData.access_token;
  console.log("Access token obtained successfully (length:", accessToken.length, ")");

  // Fetch media items (all photos)
  console.log("Fetching media items from Photos API...");
  const res = await fetch('https://photoslibrary.googleapis.com/v1/mediaItems?pageSize=50', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  console.log("Media items response status:", res.status);
  const data = await res.json();
  console.log("Media items response data:", data);

  return {
    statusCode: 200,
    body: JSON.stringify(data.mediaItems || [])
  };
}
