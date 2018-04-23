/**
 * The application entry point
 */


require('./src/bootstrap');
const config = require('config');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const httpStatus = require('http-status');
const _ = require('lodash');
const winston = require('winston');
const helper = require('./src/common/helper');
const errorMiddleware = require('./src/common/ErrorMiddleware');
const routes = require('./src/routes');

const app = express();
const http = require('http').Server(app);

app.set('port', config.WEB_SERVER_PORT);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

const apiRouter = express.Router();

/* eslint-disable no-param-reassign */
_.each(routes, (verbs, url) => {
  _.each(verbs, (def, verb) => {
    let actions = [
      (req, res, next) => {
        req.signature = `${def.controller}#${def.method}`;
        next();
      },
    ];
    const method = require(`./src/controllers/${def.controller}`)[ def.method ]; // eslint-disable-line

    if (!method) {
      throw new Error(`${def.method} is undefined, for controller ${def.controller}`);
    }
    if (def.middleware && def.middleware.length > 0) {
      actions = actions.concat(def.middleware);
    }

    actions.push(method);
    winston.info(`API : ${verb.toLocaleUpperCase()} /${config.API_VERSION}${url}`);
    apiRouter[verb](`/${config.API_VERSION}${url}`, helper.autoWrapExpress(actions));
  });
});
/* eslint-enable no-param-reassign */

app.use('/', apiRouter);
app.use(errorMiddleware());

app.use('*', (req, res) => {
  const pathKey = req.baseUrl.substring(config.API_VERSION.length + 1);
  const route = routes[pathKey];
  if (route) {
    res.status(httpStatus.METHOD_NOT_ALLOWED).json({ message: 'The requested method is not supported.' });
  } else {
    res.status(httpStatus.NOT_FOUND).json({ message: 'The requested resouce cannot found.' });
  }
});

http.listen(app.get('port'), () => {
  winston.info(`Express server listening on port ${app.get('port')}`);
});

module.exports = app;
