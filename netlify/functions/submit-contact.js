const { google } = require('googleapis');

exports.handler = async (event, context) => {

    if (event.httpMethod != 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })        
        };
    }

    try {
        const { name, phone, email, message } = JSON.parse(event.body);

        if ( !name || !email || !message ) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing required field(s).' })
            };
        }

        // Set up Google Sheets authentication
        const privateKey = process.env.GOOGLE_PRIVATE_KEY;
        if (!privateKey) {
        console.error('GOOGLE_PRIVATE_KEY environment variable is not set');
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Server configuration error' })
        };
        }

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

        const now = new Date();
        const inquiryDate = `${now.getMonth()}-${now.getDate()}-${now.getFullYear()}`;
        const sheetName = now.getFullYear().toString(); // e.g., "2025"
        const inquiryStatus = "New inquiry";
        const range = `${sheetName}!A:F`; // e.g., "2025!A:F"
    
        const values = [[inquiryDate, inquiryStatus, name, phone, email, message]];

        try {
            await sheets.spreadsheets.value.append({
                spreadsheetId: process.env.GOOGLE_SHEET_ID,
                range: range,
                valueInputOption: 'USER_ENTERED',
                resource: {
                values: values
                }
            });
        } catch (error) {
            // If sheet doesn't exist, try to create it
            if (error.code === 400 && error.message.includes('Unable to parse range')) {
                console.log(`Sheet "${sheetName}" doesn't exist, creating it...`);
        
            // Create the new sheet
            await sheets.spreadsheets.batchUpdate({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            resource: {
                requests: [{
                addSheet: {
                    properties: {
                    title: sheetName
                    }
                }
                }]
            }
            });

            // Add headers to the new sheet
            await sheets.spreadsheets.values.update({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: `${sheetName}!A1:F1`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [['Date of Inquiry', 'Inquiry Status', 'Name', 'Phone', 'Email', 'Message']]
            }
            });

            // Now try inserting the data again
            await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: range,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: values
            }
            });
        } else {
            throw error; // Re-throw if it's a different error
        }
    
        return {
            statusCode: 200,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'Content-Type',
              'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: JSON.stringify({ 
              success: true, 
              message: 'Contact form submitted successfully!' 
            })
        };
    }
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'Failed to submit form',
                details: error.message 
            })
        };
    }
}