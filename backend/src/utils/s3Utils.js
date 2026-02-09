const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const uploadImage = async (file, folderPath) => {
  const key = `${folderPath}/${Date.now()}-${file.originalname}`;
  
  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  try {
    const result = await s3.upload(params).promise();
    return result.Location;
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw error;
  }
};

const deleteImage = async (imageUrl) => {
  try {
    const key = imageUrl.split('.amazonaws.com/')[1];
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
    };
    await s3.deleteObject(params).promise();
  } catch (error) {
    console.error('Error deleting from S3:', error);
  }
};

module.exports = { uploadImage, deleteImage };
