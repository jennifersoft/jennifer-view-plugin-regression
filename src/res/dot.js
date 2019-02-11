graph.define("chart.brush.dot", [ "util.base" ], function(_) {
    /**
     * @class chart.brush.dot
     * @extends chart.brush.core
     */
    var DotBrush = function() {
        var pointColor = 0,
            lineColor = 2;

        this.createDot = function(data) {
            var color = this.color(pointColor),
                r = this.brush.size / 2,
                x = this.axis.x(data.x),
                y = this.axis.y(data.y);

            return this.svg.circle({
                r: r,
                fill: color,
                "fill-opacity": this.brush.opacity,
                cx: x,
                cy: y
            });
        }

        this.draw = function() {
            var g = this.chart.svg.group(),
                datas = this.listData();

            if(datas.length > 0) {
                var reg = datas[0].reg;

                if(reg != null) {
                    var xMax = this.axis.x.max();

                    g.append(this.svg.line({
                        x1: this.axis.x(0),
                        x2: this.axis.x(xMax),
                        y1: this.axis.y(reg.b0),
                        y2: this.axis.y(reg.b0 + reg.b1 * xMax),
                        stroke: this.color(lineColor)
                    }));
                }

                for (var i = 0; i < datas.length; i++) {
                    g.append(this.createDot(datas[i]));
                }
            }

            return g;
        }
    }

    DotBrush.setup = function() {
        return {
            /** @cfg {Number} [size=7]  Determines the size of a starter. */
            size: 9,
            /** @cfg {Number} [opacity=1]  Stroke opacity.  */
            opacity: 0.4,
            /** @cfg {Boolean} [clip=false] If the brush is drawn outside of the chart, cut the area. */
            clip: false
        };
    }

    return DotBrush;
}, "chart.brush.core");