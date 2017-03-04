
/*!
 * Clustery.js 基于Clusterize.js修改而来
 * Clusterize.js 基于DOM, 参数rows传入列表数组或者库自行根据已有的DOM结构解析
 * Clustery.js 基于数据, 参数rows必须传入数组, 不再是操作DOM结构, 而是返回
 *             操作列表的数据
 *
 * @author darkzone
 */

/*! Clusterize.js - v0.16.1 - 2016-08-16
* http://NeXTs.github.com/Clusterize.js/
* Copyright (c) 2015 Denis Lukov; Licensed GPLv3 */

;(function(name, definition) {
    if (typeof module != 'undefined') module.exports = definition();
    else if (typeof define == 'function' && typeof define.amd == 'object') define(definition);
    else this[name] = definition();
}('Clustery', function() {
  "use strict"

  var is_mac = navigator.platform.toLowerCase().indexOf('mac') + 1;

  var Clustery = function(data) {
    if( ! (this instanceof Clustery))
      return new Clustery(data);
    var self = this;

    var defaults = {
      item_height: 0,       // 每一个item的高度
      rows_in_block: 0,     // 每一个block包含的rows
      block_height: 0,      // 每一个block的高度 item_height * rows_in_block
      blocks_in_cluster: 4, // 每个cluster包含的blocks的个数
      rows_in_cluster: 0,   // 每一个cluster包含的rows blocks_in_cluster * rows_in_block
      cluster_height: 0,    // 每一个cluster的高度 block_height * blocks_in_cluster
      scroll_top: 0
    }

    if(! isArray(data.rows))
      throw new Error("Error! rows is not an Array.");
    if(!data.item_height || data.item_height <= 0) {
      throw new Error("Error! item_height is invalid.");
    }

    self.options = {};
    var options = ['item_height', 'rows_in_block', 'blocks_in_cluster', 'callbacks'];
    for(var i = 0, option; option = options[i]; i++) {
      self.options[option] = typeof data[option] != 'undefined' && data[option] != null
        ? data[option]
        : defaults[option];
    }

    var elems = ['scroll', 'content'];
    for(var i = 0, elem; elem = elems[i]; i++) {
      self[elem + '_elem'] = data[elem + 'Id']
        ? document.getElementById(data[elem + 'Id'])
        : data[elem + 'Elem'];
      if( ! self[elem + '_elem'])
        throw new Error("Error! Could not find " + elem + " element");
    }

    // tabindex forces the browser to keep focus on the scrolling list, fixes #11
    if( ! self.content_elem.hasAttribute('tabindex'))
      self.content_elem.setAttribute('tabindex', 0);

    var rows = data.rows,
      cache = {start: 0, end: 0, bottom: 0},
      scroll_top = self.scroll_elem.scrollTop;

    // get row height
    self.exploreEnvironment(rows);

    // append initial data
    self.notifyData(rows, cache);

    // restore the scroll position
    self.scroll_elem.scrollTop = scroll_top;

    // adding scroll handler
    var last_cluster = false,
    scroll_debounce = 0,
    pointer_events_set = false,
    scrollEv = function() {
      // fixes scrolling issue on Mac #3
      if (is_mac) {
          if( ! pointer_events_set) self.content_elem.style.pointerEvents = 'none';
          pointer_events_set = true;
          clearTimeout(scroll_debounce);
          scroll_debounce = setTimeout(function () {
              self.content_elem.style.pointerEvents = 'auto';
              pointer_events_set = false;
          }, 50);
      }
      if (last_cluster != (last_cluster = self.getClusterNum()))
        self.notifyData(rows, cache);
    },
    resize_debounce = 0,
    resizeEv = function() {
      clearTimeout(resize_debounce);
      resize_debounce = setTimeout(self.refresh, 100);
    }
    on('scroll', self.scroll_elem, scrollEv);
    on('resize', window, resizeEv);

    // public methods
    self.update = function(new_rows) {
      rows = isArray(new_rows)
        ? new_rows
        : [];
      var scroll_top = self.scroll_elem.scrollTop;
      // fixes #39
      if(rows.length * self.options.item_height < scroll_top) {
        self.scroll_elem.scrollTop = 0;
        last_cluster = 0;
      }
      self.notifyData(rows, cache);
      self.scroll_elem.scrollTop = scroll_top;
    }

    // if clean then clear all data
    // or return all list 
    self.destroy = function(clean) {
      off('scroll', self.scroll_elem, scrollEv);
      off('resize', window, resizeEv);
      if(!clean) {
        var callbacks = this.options.callbacks;
        callbacks.shouldUpdate({
          top_offset: 0,
          bottom_offset: 0,
          rows_above: 0,
          start: 0,
          end: rows.length
        });
      }
    }

    self.refresh = function(item_height) {
      self.options.item_height = item_height;
      self.getRowsHeight(rows) && self.update(rows);
    }
  }

  Clustery.prototype = {
    constructor: Clustery,

    // calc cluster height
    exploreEnvironment: function(rows) {
      this.getRowsHeight(rows);
    },

    getRowsHeight: function(rows) {
      var opts = this.options;
      opts.cluster_height = 0;
      if( ! rows.length) return;

      if(!opts.rows_in_block) {
        opts.rows_in_block = Math.ceil(this.scroll_elem.offsetHeight / opts.item_height);
      }
      if(!opts.rows_in_block) {
        opts.rows_in_block = 20;
      }
      
      opts.block_height = opts.item_height * opts.rows_in_block;
      opts.rows_in_cluster = opts.blocks_in_cluster * opts.rows_in_block;
      opts.cluster_height = opts.blocks_in_cluster * opts.block_height;
      return true
    },

    // get current cluster number
    getClusterNum: function () {
      this.options.scroll_top = this.scroll_elem.scrollTop;
      return Math.floor(this.options.scroll_top / (this.options.cluster_height - this.options.block_height)) || 0;
    },

    // generate cluster for current scroll position
    generate: function (rows, cluster_num) {
      var opts = this.options,
        rows_len = rows.length;
      if (rows_len < opts.rows_in_block) {
        return {
          top_offset: 0,
          bottom_offset: 0,
          start: 0,
          end: rows_len
        }
      }
      if( ! opts.cluster_height) {
        this.exploreEnvironment(rows);
      }
      var items_start = Math.max((opts.rows_in_cluster - opts.rows_in_block) * cluster_num, 0),
        items_end = items_start + opts.rows_in_cluster,
        top_offset = Math.max(items_start * opts.item_height, 0),
        bottom_offset = Math.max((rows_len - items_end) * opts.item_height, 0);

      return {
        top_offset: top_offset,
        bottom_offset: bottom_offset,
        start: items_start,
        end: items_end
      }
    },

    // if necessary verify data changed and notify to user
    notifyData: function(rows, cache) {
      var data = this.generate(rows, this.getClusterNum()),
        this_cluster_start_changed = this.checkChanges('data', data.start, cache),
        this_cluster_end_changed = this.checkChanges('data', data.end, cache),
        only_bottom_offset_changed = this.checkChanges('bottom', data.bottom_offset, cache),
        callbacks = this.options.callbacks;

      if(this_cluster_start_changed || this_cluster_end_changed) {
        callbacks.shouldUpdate(data);
      } else if(only_bottom_offset_changed) {
        callbacks.shouldUpdate(data.bottom_offset)
      }
    },

    checkChanges: function(type, value, cache) {
      var changed = value != cache[type];
      cache[type] = value;
      return changed;
    }
  }

  // support functions
  function on(evt, element, fnc) {
    return element.addEventListener ? element.addEventListener(evt, fnc, false) : element.attachEvent("on" + evt, fnc);
  }
  function off(evt, element, fnc) {
    return element.removeEventListener ? element.removeEventListener(evt, fnc, false) : element.detachEvent("on" + evt, fnc);
  }
  function isArray(arr) {
    return Object.prototype.toString.call(arr) === '[object Array]';
  }
  function getStyle(prop, elem) {
    return window.getComputedStyle ? window.getComputedStyle(elem)[prop] : elem.currentStyle[prop];
  }

  return Clustery
}))