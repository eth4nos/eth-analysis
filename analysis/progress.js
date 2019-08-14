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
  constructor(iteration, epoch) {
    this.mbars = new Multibar();
    this.bars  = [];
    this.indicator = this.mbars.newBar('Total progress:\t[:bar] :current/:total', {
      complete: '=',
      incomplete: ' ',
      width: 30,
      total: iteration
    });
    this.epoch = epoch;
  }

  addBars(limits) {
    for (let i = 0; i < limits.length; i++) {
      this.bars.push({
        // bar: this.mbars.newBar(':title [:bar] :percent', {
        bar: this.mbars.newBar(':title\t[:bar] :current/:total', {
          complete: '=',
          incomplete: ' ',
          width: 30,
          total: limits[i]
        }),
        limit: limits[i]
      });
    }
  }
  
  forward(progid, nonce, n = 1) {
    let bar = this.bars[progid].bar;
    bar.tick(n, { title: `${nonce * this.epoch} ~ ${nonce * this.epoch + bar.total}` });
    // addBar().tick(this.bars[0].curr);
    if (bar.curr <= bar.limit)
      return false;
    return true;
  }

  update(progid, total) {
    // console.log(progid, total);
    let bar = this.bars[progid].bar;
    bar.total = total;
    bar.curr = 0;
  }
}