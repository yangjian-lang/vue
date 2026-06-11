const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const compression = require('compression');

// 引入路由
const authRouter = require('./Control/auth');
const trademarkRouter=require('./Control/productControl/trademarkControl')
const arrtRouter=require('./Control/productControl/attrControl')
const userRouter=require('./Control/aclControl/userControl')
const roleRouter=require('./Control/aclControl/roleControl')
const permissionRouter=require('./Control/aclControl/permissionControl')
const skuControlRouter=require('./Control/productControl/skuControl')
const spuControlRouter=require('./Control/productControl/spuControl')
const app = express();
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(cors());
app.use(compression({
  threshold: 0,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

const responseMiddleware = require('./utils/response');
app.use(responseMiddleware);

const staticOptions = {
  maxAge: '30d',
  etag: false,
  lastModified: false,
  setHeaders: (res, path) => {
    if (path.endsWith('.webp')) {
      res.setHeader('Content-Type', 'image/webp');
    } else if (path.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    }
  }
};

app.use(express.static(path.join(__dirname, 'public'), staticOptions));
app.use('/static', express.static(path.join(__dirname, 'static'), staticOptions));
app.use('/api/static', express.static(path.join(__dirname, 'static'), staticOptions));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads'), staticOptions));

// 挂载路由
app.use('/api', authRouter);
app.use('/api', trademarkRouter)
app.use('/api', arrtRouter)
app.use('/api', userRouter)
app.use('/api', roleRouter)
app.use('/api', permissionRouter)
app.use('/api', skuControlRouter)
app.use('/api', spuControlRouter)
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
