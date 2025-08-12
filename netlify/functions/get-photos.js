// netlify/functions/get-portfolio-images.js
const cloudinary = require('cloudinary').v2; // Import the Cloudinary SDK

exports.handler = async (event, context) => {
  try {
    // Ensure the request method is GET, for security and best practice
    if (event.httpMethod !== 'GET') {
      return {
        statusCode: 405,
        body: JSON.stringify({ message: 'Method Not Allowed' }),
      };
    }

    // Configure Cloudinary with your credentials from environment variables
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true // Use HTTPS for API calls
    });

    // Extract the folder name from the request (e.g., from query parameters)
    const { folderName } = event.queryStringParameters; 

    if (!folderName) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Folder name is required.' }),
      };
    }

    // Fetch resources (images) from the specified folder
    // Use the search API for more flexibility and security than the basic list resources methods
    const result = await cloudinary.search
      .expression(`folder:${folderName}`) // Specify the folder
      .max_results(50) // Limit the number of results, for example
      .execute();

    // Extract relevant image data (e.g., URLs)
    const images = result.resources.map(resource => ({
      public_id: resource.public_id,
      url: resource.secure_url, // Use secure_url for HTTPS
      format: resource.format,
      width: resource.width,
      height: resource.height,
      // Add other properties as needed
    }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(images),
    };
  } catch (error) {
    console.error('Error fetching images from Cloudinary:', error); // Log the error for debugging
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error fetching images.', error: error.message }),
    };
  }
};