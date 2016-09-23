# Clustery.js

基于[Clusterize.js](http://clusterize.js.org/)，适合于MVVM框架展示超长列表。

## 写在前面

对于长列表，一般的应用可以通过分页解决。然而现在很多的应用列表部分可能是滚动加载的，随着滚动，列表项越来越多，影响性能，尤其是移动设备上；另一种是IM应用，像会话列表、好友列表、群成员列表通常会一次性加载。在这些情况下，对于长列表的优化就显得很有必要。

[Clusterize.js](http://clusterize.js.org/)就是这样一个库，短小精悍。它会将列表划分成一个个的cluster，随着滚动显示可见的cluster，并在列表的顶部和底部填充额外的高度，展示列表的真实高度。

不过Clusterize.js是基于DOM的，随着MVVM框架的流行，大家更多的是在操作数据，所以基于Clusterize.js做了Clustery.js。

## 如何使用

参数和Clusterize.js基本一致，不过rows此时是必须传入的，不再是DOM列表，而是要渲染列表的数组。另外增加一个参数itemHeight，必须显示的指定每一项的高度。

callbacks只有一个回调：shouldUpdate，在此回调里得到data，更新UI。data可能是一个对象，也可能只是一个数字（仅仅是bottomHeight），若是对象，data数据结构如下：
```js
{
    start: 0,   // 渲染列表从start到end, 此时需要渲染arr.slice(start, end)   
    end: 80,
    top_offset: 1245,   // 列表顶部填充高度
    bottom_offset: 3349 // 列表底部填充高度
}
```

列表数据源更新后, 记得update一下~

下面是所有的配置项、回调和公共方法：

```js
this.clustery = new Clustery({
    scrollElem: scrollElem,
    contentElem: contentElem,
    rows: rows,
    item_height: itemHeight,
    rows_in_block: 20,
    blocks_in_cluster: 4,
    callbacks: {
        shouldUpdate: function(data) {
            _this.setRenderData(data)
        }
    }
});

// if you want to destroy
this.clustery.destroy();

// if you update data
this.clustery.update(newRows);
```

## 缺陷

* 每一项的高度要固定，这样就不能用于IM消息列表中。
* 数据源限定为了数组。

虽然如此，他已经能解决大部分的需求了，而且并不妨碍你使用自定义滚动条。