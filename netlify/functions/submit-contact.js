const { google } = require('googleapis');

// Define allowed origins for requests
const ALLOWED_ORIGINS = [
    'https://cethatch.github.io/hair-by-clare-react/contact',           // Your production domain
    'https://www.cethatch.github.io/hair-by-clare-react/contact',       // Your production domain with www
    'https://effervescent-stroopwafel-efe523.netlify.app',     // Your Netlify subdomain
    'http://localhost:3000/hair-by-clare-react/contact',            // Local development
    'http://localhost:8000/hair-by-clare-react/contact',            // Local development (alternate port)
    'http://127.0.0.1:3000/hair-by-clare-react/contact'            // Local development (IP)
  ];

const isOriginAllowed = (origin) => {
    if (!origin) return false;
    return ALLOWED_ORIGINS.some(allowedOrigin => allowedOrigin === origin);
};

const getCorsHeaders = (origin) => {
    const headers = {
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };
    
    // Only add CORS origin header if origin is allowed
    if (isOriginAllowed(origin)) {
        headers['Access-Control-Allow-Origin'] = origin;
    }
    
    return headers;
};

exports.handler = async (event, context) => {
    
    // Netlify log print statements
    console.log('Function started...');
    console.log('Google object:', !!google);
    console.log('Google.auth:', !!google.auth);
    console.log('Google.sheets:', !!google.sheets);

    const origin = event.headers.origin;

    // Handle preflight browser requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: getCorsHeaders(origin),
            body: ''
        };
    }

    // Deny any requests that aren't POST requests
    if (event.httpMethod != 'POST') {
        return {
            statusCode: 405,
            headers: getCorsHeaders(origin),
            body: JSON.stringify({ error: `HTTP Method '${event.httpMethod}' not allowed.` })
        };
    }

    try {
        let formData;

        // Parse the request body
        try {
            formData = JSON.parse(event.body);
        } catch (parseError) {
            console.log('JSON parsing error:', parseError);
            return {
                statusCode: 400,
                headers: getCorsHeaders(origin),
                body: JSON.stringify({ error: 'Invalid JSON in request body.' })
            };
        }

        const { name, email, phone, message } = formData;

        // Validate required field: name
        if ( typeof name != 'string' || !name.trim() ) {
            console.log( "Missing required field in request body: 'name'" );
            return {
                statusCode: 400,
                headers: getCorsHeaders(origin),
                body: JSON.stringify({ error: 'Name is a required field and must be a valid string.'})
            };
        }

        // Validate required field: email
        if ( typeof email != 'string' || !email.trim() ) {
            console.log( "Missing required field in request body: 'email'" );
            return {
                statusCode: 400,
                headers: getCorsHeaders(origin),
                body: JSON.stringify({ error: 'Email is a required field and must be a valid string.'})
            };
        }

        // Validate required field: message
        if ( typeof message != 'string' || !message.trim() ) {
            console.log( "Missing required field in request body: 'message'" );
            return {
                statusCode: 400,
                headers: getCorsHeaders(origin),
                body: JSON.stringify({ error: 'Message is a required field and must be a valid string.'})
            };
        }

        // Ensure phone is string, otherwise replace with empty string
        const phoneValue = phone && typeof phone === 'string' ? phone : '';

        // Setup auth for google sheets api
        const auth = new google.auth.GoogleAuth({
            credentials: {
              type: 'service_account',
              project_id: process.env.GOOGLE_PROJECT_ID,
              private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
              private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
              client_email: process.env.GOOGLE_CLIENT_EMAIL,
              client_id: process.env.GOOGLE_CLIENT_ID,
              auth_uri: 'https://accounts.google.com/o/oauth2/auth',
              token_uri: 'https://oauth2.googleapis.com/token',
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });

        const sheets = google.sheets({ version: 'v4', auth });

        // Get time info for sheet name and datestamp
        const now = new Date();
        const currentYear = now.getFullYear().toString();
        const datestamp = `${(now.getMonth() + 1).toString()}-${now.getDate().toString()}-${currentYear}`;

        const sheetRange = `${currentYear}!A:F`;

        const values = [[datestamp, 'New inquiry', name, phoneValue, email, message]];

        // Add values to the correct sheet
        try {
            await sheets.spreadsheets.values.append({
                spreadsheetId: process.env.GOOGLE_SHEET_ID,
                range: sheetRange,
                valueInputOption: 'USER_ENTERED',
                resource: {
                values: values
                }
            });
        } catch (error) {
            // Create sheet if there isnt one for the current year
            if (error.code === 400 && error.message.includes("Unable to parse range")) {
                await sheets.spreadsheets.batchUpdate({
                    spreadsheetId: process.env.GOOGLE_SHEET_ID,
                    resource: {
                        requests: [{
                            addSheet: {
                                properties: {
                                    title: currentYear
                                }
                            }
                        }]
                    }
                });
                
                // Add headers to the new sheet
                await sheets.spreadsheets.update({
                    spreadsheetId: process.env.GOOGLE_SHEET_ID,
                    range: `${currentYear}!A1:F1`,
                    valueInputOption: 'USER_ENTERED',
                    resource: {
                        values: [['Date of inquiry', 'Inquiry status', 'Name', 'Phone Number', 'Email', 'Message']]
                    }
                });

                // Add the values to the new sheet
                await sheets.spreadsheets.values.append({
                    spreadsheetId: process.env.GOOGLE_SHEET_ID,
                    range: sheetRange,
                    valueInputOption: 'USER_ENTERED',
                    resource: {
                        values: values
                    }
                });
            } else throw error;     // Something else happened, throw error
        } 

        // Yay, success!
        return {
            statusCode: 200,
            headers: getCorsHeaders(origin),
            body: JSON.stringify({
                success: true,
                message: 'Inquiry submitted successfully!'
            })
        };
    } catch (error) {
        console.error('Function error:', error);
        console.error('Error stack:', error.stack);
        
        return {
            statusCode: 500,
            headers: getCorsHeaders(origin),
            body: JSON.stringify({ 
                error: 'Failed to submit form',
                details: error.message 
            })
        };
    }
};