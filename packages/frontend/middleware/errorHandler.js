// Error handling middleware
function errorHandler(err, req, res, next) {
  console.error('Error:', err.message);
  
  if (err.status === 429) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests, please try again later'
    });
  }
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      message: err.message
    });
  }
  
  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Not found',
    message: `Endpoint ${req.method} ${req.path} not found`
  });
}

module.exports = { errorHandler, notFoundHandler };