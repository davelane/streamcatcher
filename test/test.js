const StreamCatcher = require('../streamer');
const fs = require('fs-extra');
const assert = require('assert');

describe('streamCatcher', function() {
  describe('#execute()', function() {
    it('should stream a small chunk of a file to disk', function(done) {
      const url = 'http://pri.gocaster.net/td4';
      const streamCatcher = new StreamCatcher(url, "PT3S", 'testdownload', 'test/tmp/down', 'test/tmp/final', console);
      streamCatcher.execute()
        .then((filename) => 
          fs.stat(filename))
        .then((stats) => 
          assert.ok(stats.size > 1000))
        .then(() => done())
        .catch((error) => done(error))
        .finally(() => fs.remove("test/tmp"));
    }).timeout(10000);
  });
});