var ProgressBar = require('progress');

function Multibar(stream) {
  this.stream     = stream || process.stderr;
  this.cursor     = 0;
  this.bars       = [];
  this.terminates = 0;
}

Multibar.prototype = {
  newBar: function(schema, options) {
    options.stream = this.stream;
    var bar = new ProgressBar(schema, options);
    this.bars.push(bar);
    var index = this.bars.length - 1;

    // alloc line
    this.move(index);
    this.stream.write('\n');
    this.cursor ++;

    // replace original
    var self  = this;
    bar.otick = bar.tick;
    bar.oterminate = bar.terminate;
    bar.tick = function(value, options) {
      self.tick(index, value, options);
    }
    bar.terminate = function() {
      self.terminates++;
      if (self.terminates == self.bars.length) {
        self.terminate();
      }
    }

    return bar;
  },

  terminate: function() {
    this.move(this.bars.length);
    this.stream.clearLine();
    this.stream.cursorTo(0);
  },

  move: function(index) {
    if (!this.stream.isTTY) return;
    this.stream.moveCursor(0, index - this.cursor);
    this.cursor = index;
  },

  tick: function(index, value, options) {
    var bar = this.bars[index];
    if (bar) {
      this.move(index);
      bar.otick(value, options);
    }
  }
}

module.exports = class {
  constructor() {
    this.mbars = new Multibar();
    this.bars  = [];
  }

  addBars(limit) {
    for (let i = 0; i < limit.length; i++) {
      this.bars.push({
        // bar: this.mbars.newBar(':title [:bar] :percent', {
        bar: this.mbars.newBar(':title\t[:bar] :current/:total', {
          complete: '='
        , incomplete: ' '
        , width: 30
        , total: limit[i]
        }),
        limit: limit[i]
      });
    }
  }
  
  forward(i, n = 1) {
    // console.log(i);
    // console.log(this.bars[0]);
    this.bars[i].bar.tick(n, { title: `${i}: ` });
    // addBar().tick(this.bars[0].curr);
    if (this.bars[i].bar.curr <= this.bars[i].limit)
      return false;
    return true;
  }
}