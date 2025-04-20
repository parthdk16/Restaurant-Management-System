const express = require('express');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const dotenv = require('dotenv');
const cors = require('cors');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

dotenv.config();

const app = express();
const port = 3000;

// Enable CORS to allow frontend requests
app.use(cors());

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Route to generate a pre-signed URL for file upload
app.get('/generate-presigned-url', async (req, res) => {
  try {
    const { fileName, fileType } = req.query;

    const command = new PutObjectCommand({
      Bucket: 'hotel-shripad',
      Key: fileName,
      ContentType: fileType,
      ACL: 'public-read',
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 60 });

    res.json({ url, key: fileName });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    res.status(500).json({ error: 'Failed to generate URL' });
  }
});

app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
});
