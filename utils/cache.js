const LRU = require('lru-cache');

const cache = new LRU({
  max: 500,
  maxAge: 1000 * 60 * 15,
});

const cacheMiddleware = (duration) => {
  return (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }
    
    const key = req.originalUrl || req.url;
    const cachedResponse = cache.get(key);
    
    if (cachedResponse) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Cache-Control', `public, max-age=${duration}`);
      return res.send(cachedResponse);
    }
    
    res.setHeader('X-Cache', 'MISS');
    res.setHeader('Cache-Control', `public, max-age=${duration}`);
    
    const originalSend = res.send;
    res.send = function(data) {
      if (res.statusCode === 200) {
        cache.set(key, data);
      }
      return originalSend.call(this, data);
    };
    
    next();
  };
};

module.exports = {
  cacheMiddleware,
  cache
};