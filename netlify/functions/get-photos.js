// netlify/functions/get-portfolio-images.js
const cloudinary = require('cloudinary').v2; // Import the Cloudinary SDK

exports.handler = async (event) => {
  try {
    const allowedOrigins = [
      'http://localhost:3000',
      'https://cethatch.github.io'
    ];
    const origin = event.headers.origin;
    const corsHeaders = {
      'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[1],
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: '',
      };
    }

    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
      return {
        statusCode: 405,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Method Not Allowed' }),
      };
    }

    // Configure Cloudinary
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });

    const { folderName } = event.queryStringParameters;
    if (!folderName) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Folder name is required.' }),
      };
    }

    // Fetch resources from Cloudinary
    const result = await cloudinary.search
      .expression(`folder:${folderName}`)
      .max_results(50)
      .execute();

    const images = result.resources.map(resource => ({
      public_id: resource.public_id,
      url: resource.secure_url,
      format: resource.format,
      width: resource.width,
      height: resource.height,
    }));

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(images),
    };
  } catch (error) {
    console.error('Error fetching images from Cloudinary:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Error fetching images.',
        error: error.message
      }),
    };
  }
};
