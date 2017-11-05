const http = require('http');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs-extra'),
  {filter: (name) => !name.includes('Sync')});
const path = require('path');
const mimedb = require('mime-db');
const moment = require('moment');

/**
 * Main StreamCapture class
 */
class StreamCapture {
  /**
   * StreamCapture constructor
   *
   * @param {string} url the url of the http stream to capture
   * @param {string} duration how long to capture (Moment duration string: see
   * https://momentjs.com/docs/#/durations/creating/)
   * @param {string} basename the file name without path and without extension
   * @param {string} dirTmp where to save the stream to until capture is
   * complete
   * @param {string} dirToSaveTo where to save the file finally when capture is
   * complete
   * @param {logger} logger the logger object
   */
  constructor(url, duration, basename, dirTmp, dirToSaveTo, logger) {
    this.startTime = moment();

    this.logger = logger;
    if (!this.logger) this.logger = console;

    this.desc = desc;
    this.url = url;
    this.duration = duration;
    this.dirTmp = dirTmp;
    this.dirToSaveTo = dirToSaveTo;

    this.jobMediaExtension = null;
    this.encoding = null;
    this.receivedBytesTotal = 0;
    this.stoppedNormally = false;

    this.fileExtension = 'out';
    this.fileName = basename + '-' +
      this.startTime.format('YYYY-MM-DD-HH-mm');
  }

  /**
   * Called with the encoding from the http header.
   * Tries to find the extension of the file based on this
   * @param {string} encoding the mime type / encoding
   */
  _setEncoding(encoding) {
    this.encoding = encoding;

    const mimeEntry = mimedb[encoding];
    if (mimeEntry && Array.isArray(mimeEntry.extensions)) {
      this.fileExtension = mimeEntry.extensions[0];
    }
  }

  /**
   * Called when a packet is received
   * @param {integer} bytes the size of the latest packet
   */
  _incrementBytesReceived(bytes) {
    this.receivedBytesTotal += bytes;
  }

  /**
   * The file name with extension
   * @return {string} the file name
   */
  _getFullFileName() {
    return this.fileName + '.' + this.fileExtension;
  }

  /**
   * The full file name with path
   * @return {string} the full file name
   */
  _getFullFileNameWithPath() {
    return path.resolve(this.dirTmp, this.getFileName());
  }

  /**
   * The full file name with path of the final destination
   * @return {string} the full file name
   */
  _getFullFileNameWithPathFinal() {
    return path.resolve(this.dirToSaveTo, this.getFileName());
  }

  /**
   * Handle the end of the execution (normal or error)
   * @param {Error} error
   */
  _handleExecutionEnd(error) {
    let self = this;
    if (error) {
      logger.error(error.message);
    }
    if (self.stoppedNormally) {
      logger.info('Received total (OK) ' + self.receivedBytesTotal + ' bytes.');
    } else {
      logger.info('Received total (EARLY) ' + self.receivedBytesTotal +
        ' bytes');
    }
  }

  /**
   * Execute the job
   * @return {Promise} a promise for the execution
   */
  execute() {
    let self = this;

    logger.info('Starting ' + this.fileName + '...');

    return Promise.join(
      fs.ensureDirAsync(self.dirTmp),
      fs.ensureDirAsync(self.dirToSaveTo),
      fs.createWriteStream(self._getFullFileNameWithPath()),
      (stream) => {
        return new Promise((resolve, reject) => {
          let client = http.get(self.url, (response) => {
            logger.info('Connected to ' + self.url + '...');
            self._setEncoding(response.headers['content-type']);

            const statusCode = response.statusCode;

            if (statusCode !== 200) {
              self._handleExecutionEnd(new
                Error(`Request Failed. Status Code: ${statusCode}`));
              response.resume();
              return;
            }

            response.on('data', (chunk) => {
              stream.write(chunk);
              self._incrementBytesReceived(chunk.length);
            });
            response.on('end', () => {
              stream.end();
              if (!self.stoppedNormally) {
                clearTimeout(timer);
              }
              self._handleExecutionEnd();
              resolve();
            });
          }).on('error', (e) => {
            self._handleExecutionEnd(e);
            reject(e);
          });
          let timer = setTimeout(() => {
            self.stoppedNormally = true;
            client.abort();
          }, moment.duration(self.duration).asMilliseconds());
        });
      })
      .then(() => {
        return fs.moveAsync(
          self._getFullFileNameWithPath(),
          self._getFullFileNameWithPathFinal());
      })
      .then(() => {
        logger.info('Job finished: ' + self.fileName());
        return this._getFullFileNameWithPathFinal();
      });
  }
}

module.exports = StreamCapture;
