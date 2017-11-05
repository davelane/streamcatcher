const http = require('http');
const https = require('https');
const Promise = require('bluebird');
const fs = require('fs-extra');
const path = require('path');
const mimedb = require('mime-db');
const moment = require('moment');

/**
 * Main StreamCatcher class
 */
class StreamCatcher {
  /**
   * StreamCatcher constructor
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

    this.url = url;
    this.duration = duration;
    this.dirTmp = dirTmp;
    this.dirToSaveTo = dirToSaveTo;

    this.jobMediaExtension = null;
    this.encoding = null;
    this.receivedBytesTotal = 0;
    this.stoppedNormally = false;

    this.fileExtension = 'out';
    this.fileBaseName = basename + '-' +
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
   * The full file name with path
   * @return {string} the full file name
   */
  _getFullFilePathInitial() {
    return path.resolve(this.dirTmp, this.fileBaseName);
  }

  /**
   * The full file name with path of the final destination
   * @return {string} the full file name
   */
  _getFullFilePathFinal() {
    return path.resolve(this.dirToSaveTo, this.fileBaseName + '.' + this.fileExtension);
  }

  /**
   * Handle the end of the execution (normal or error)
   * @param {Error} error
   */
  _handleExecutionEnd(error) {
    let self = this;
    if (error) {
      this.logger.error(error.message);
    }
    if (self.stoppedNormally) {
      this.logger.info('Received total (OK) ' + self.receivedBytesTotal + ' bytes.');
    } else {
      this.logger.info('Received total (EARLY) ' + self.receivedBytesTotal +
        ' bytes');
    }
  }

  /**
   * Execute the job
   * @return {Promise} a promise for the execution
   */
  execute() {
    let self = this;

    this.logger.info('Starting ' + this.fileBaseName + '...');

    return Promise.all(
      fs.ensureDir(self.dirTmp),
      fs.ensureDir(self.dirToSaveTo))
      .then(() => fs.createWriteStream(self._getFullFilePathInitial()))
      .then((stream) => {
        return new Promise((resolve, reject) => {
          let protocolClient = http;
          if (self.url.startsWith("https:")) protocolClient = https;
          let client = protocolClient.get(self.url, (response) => {
            this.logger.info('Connected to ' + self.url + '...');
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
        return fs.move(
          self._getFullFilePathInitial(),
          self._getFullFilePathFinal());
      })
      .then(() => {
        this.logger.info('Job finished: ' + self.fileBaseName);
        return this._getFullFilePathFinal();
      });
  }
}

module.exports = StreamCatcher;
