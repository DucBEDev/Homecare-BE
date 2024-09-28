// Upload static file onto cloud 
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

cloudinary.config({ 
  cloud_name: process.env.CLOUD_NAME, 
  api_key: process.env.CLOUD_KEY, 
  api_secret: process.env.CLOUD_SECRET 
});

module.exports.upload = (req, res, next) => {
  if (req.file || req.files) {
    let streamUpload = (buffer) => {
      return new Promise((resolve, reject) => {
        let stream = cloudinary.uploader.upload_stream(
          (error, result) => {
            if (result) {
              resolve(result);
            } else {
              reject(error);
            }
          }
        );

        streamifier.createReadStream(buffer).pipe(stream);
      });
    };

    async function upload(req) {
      if (req.files) {
        for (const file in req.files) {
          let array = [];
          for (const item of req.files[file]) {
            let result = await streamUpload(item.buffer);
            array.push(result.secure_url);
          }
          req.body[file] = array;
        }
      }
      else {
        let result = await streamUpload(req.file.buffer);
        req.body[req.file.fieldname] = result.secure_url;
      }
      next();
    }
    
    upload(req);
  }
  else {
    next();
  }
}