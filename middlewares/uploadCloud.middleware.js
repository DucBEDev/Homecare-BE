// // Upload static file onto cloud 
// const cloudinary = require('cloudinary').v2;
// const streamifier = require('streamifier');

// cloudinary.config({ 
//   cloud_name: process.env.CLOUD_NAME, 
//   api_key: process.env.CLOUD_KEY, 
//   api_secret: process.env.CLOUD_SECRET 
// });

// module.exports.upload = (req, res, next) => {
//   if (req.file || req.files) {
//     let streamUpload = (buffer) => {
//       return new Promise((resolve, reject) => {
//         let stream = cloudinary.uploader.upload_stream(
//           (error, result) => {
//             if (result) {
//               resolve(result);
//             } else {
//               reject(error);
//             }
//           }
//         );

//         streamifier.createReadStream(buffer).pipe(stream);
//       });
//     };

//     async function upload(req) {
//       if (req.files) {
//         for (const file in req.files) {
//           let array = [];
//           for (const item of req.files[file]) {
//             let result = await streamUpload(item.buffer);
//             array.push(result.secure_url);
//           }
//           req.body[file] = array;
//         }
//       }
//       else {
//         let result = await streamUpload(req.file.buffer);
//         req.body[req.file.fieldname] = result.secure_url;
//       }
//       next();
//     }
    
//     upload(req);
//   }
//   else {
//     next();
//   }
// }

const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const sharp = require('sharp');

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_KEY,
  api_secret: process.env.CLOUD_SECRET,
});

const streamUpload = (stream) => {
  return new Promise((resolve, reject) => {
    const cloudinaryStream = cloudinary.uploader.upload_stream(
      (error, result) => {
        if (result) {
          resolve(result);
        } else {
          reject(error);
        }
      }
    );
    stream.pipe(cloudinaryStream);
  });
};

const resizeImage = async (buffer) => {
  return sharp(buffer)
    .resize(800, 800, { fit: 'inside' })
    .jpeg({ quality: 80 })
    .toBuffer();
};

module.exports.upload = async (req, res, next) => {
  if (req.file || req.files) {
    try {
      if (req.files) {
        for (const file in req.files) {
          const uploadPromises = req.files[file].map(async (item) => {
            const resizedBuffer = await resizeImage(item.buffer);
            const stream = streamifier.createReadStream(resizedBuffer);
            const result = await streamUpload(stream);
            return result.secure_url;
          });
          req.body[file] = await Promise.all(uploadPromises);
        }
      } else {
        const resizedBuffer = await resizeImage(req.file.buffer);
        const stream = streamifier.createReadStream(resizedBuffer);
        const result = await streamUpload(stream);
        req.body[req.file.fieldname] = result.secure_url;
      }
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
};