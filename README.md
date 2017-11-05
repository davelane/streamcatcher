# streamcatcher
Capture a http stream for a duration of time
# usage
Create a StreamCatcher object with the following parameters:
> url {string} the url of the http stream to capture

> duration {string} how long to capture (Moment duration string: see https://momentjs.com/docs/#/durations/creating/)

> basename {string} the file name without path and without extension

> dirTmp {string}  where to save the stream to until capture is complete

> dirToSaveTo {string} where to save the file finally when capture is complete

> logger {logger} the logger object


```javascript
      const url = 'http://pri.gocaster.net/td4';
      const streamCatcher = new StreamCatcher(url, "PT3S", 'testdownload', 'test/tmp/down', 'test/tmp/final', console);
      streamCatcher.execute()
        .then((filename) => fs.stat(filename))
        .then((stats) => console.log(filename.size + " bytes captured!"))
```
