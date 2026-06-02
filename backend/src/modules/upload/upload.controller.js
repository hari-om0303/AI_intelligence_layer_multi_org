const { uploadFileStream } = require('../../config/gcs');

// @desc    Upload a file
// @route   POST /api/upload
// @access  Private
exports.postUpload = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded. Please upload a file.' });
    }

    // Call our resilient upload stream configuration helper
    const result = await uploadFileStream(req.file.buffer, req.file.originalname, req.file.mimetype);

    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        name: result.name,
        url: result.url
      }
    });
  } catch (error) {
    next(error);
  }
};
