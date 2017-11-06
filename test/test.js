const StreamCatcher = require('../streamer');
const fs = require('fs-extra');
const assert = require('assert');

describe('streamCatcher', function() {
  describe('#execute()', function() {
    it('should stream a small chunk of a file to disk', function(done) {
      const url = 'http://pri.gocaster.net/td4';
      const streamCatcher = new StreamCatcher(url, "PT3S", 'testdownload', 'test/tmp/1/down', 'test/tmp/1/final', console);
      streamCatcher.execute()
        .then((filename) => 
          fs.stat(filename))
        .then((stats) => 
          assert.ok(stats.size > 1000))
        .then(() => done())
        .catch((error) => done(error))
        .finally(() => fs.remove("test/tmp/1"));
    }).timeout(10000);
  });
});

describe('streamCatcher', function() {
  describe('#execute()', function() {
    it('should still work on a file that finishes before the duration', function(done) {
      const url = 'https://jigsaw.w3.org/HTTP/';
      const streamCatcher = new StreamCatcher(url, "PT10S", 'testdownload', 'test/tmp/2/down', 'test/tmp/2/final', console);
      streamCatcher.execute()
        .then((filename) => 
          fs.stat(filename))
        .then((stats) => 
          assert.ok(stats.size > 10))
        .then(() => done())
        .catch((error) => done(error))
        .finally(() => fs.remove("test/tmp/2"));
    }).timeout(10000);
  });
});

describe('streamCatcher', function() {
  describe('#execute()', function() {
    it('should follow redirects', function(done) {
      const url = 'https://jigsaw.w3.org/HTTP/300/301.html';
      const streamCatcher = new StreamCatcher(url, "PT10S", 'testdownload', 'test/tmp/3/down', 'test/tmp/3/final', console);
      streamCatcher.execute()
        .then((filename) => 
          fs.stat(filename))
        .then((stats) => 
          assert.ok(stats.size > 10))
        .then(() => done())
        .catch((error) => done(error))
        .finally(() => fs.remove("test/tmp/3"));
    }).timeout(10000);
  });
});