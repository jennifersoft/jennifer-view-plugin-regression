var targetInstance = null, metricsBox = null, startDate = null, endDate = null,
    metricsChart = null, metricsDetailChart = null, metricsModal = null, tplTable = null,
    colorMap = null, isInit = true;

jui.ready([ "ui", "selectbox", "chart.builder", "util.base", "util.color" ], function(ui, select, builder, _, color) {
    colorMap = color.map["pink"](20);

    tplTable = _.template($("#tpl_detail_tables").html());

    startDate = ui.timezonepicker("#start_date", {
        event: {
            select: function(date) {
                var ldate = endDate.getDate().clone();
                targetInstance.setTime(this.getTime(), ldate.add(1, "days").valueOf());
            }
        },
        tpl: {
            dates: $("#tpl_datepicker").html()
        }
    });

    endDate = ui.timezonepicker("#end_date", {
        event: {
            select: function(date) {
                var ldate = this.getDate().clone();
                targetInstance.setTime(startDate.getTime(), ldate.add(1, "days").valueOf());
            }
        },
        tpl: {
            dates: $("#tpl_datepicker").html()
        }
    });

    metricsBox = select("#metric_box", {
        title: "Metrics",
        type: "multi",
        width: 300,
        tooltip: true
    });

    metricsModal = ui.modal("#metric_modal", {
        opacity: 0,
        autoHide: false
    });

    metricsChart = builder("#metric_chart", {
        theme : $("input[name=theme]").val(),
        padding : {
            left : 180,
            top : 180,
            bottom : 10,
            right : 10
        },
        height : 2300,
        axis : [
            {
                x : {
                    type : "block",
                    domain : [],
                    line : "solid",
                    key : "xIndex",
                    orient : "top",
                    textRotate : function(elem) {
                        elem.attr({ "text-anchor": "start" });
                        return -90;
                    }
                },
                y : {
                    type : "block",
                    domain : [],
                    line : "solid",
                    key : "yIndex"
                }
            }

        ],
        brush : {
            type : "heatmap",
            target : "value",
            colors : function(d) {
                if(d.value == 0) {
                    return "transparent";
                }

                var count = colorMap.length - 1,
                    value = (d.value > 1) ? 1 : d.value,
                    index = Math.ceil(value * count);

                return colorMap[count - index];
            },
            format : function(d) {
                if(d.value > 0) {
                    return Math.round(d.value * 100);
                }

                return "";
            }
        },
        widget : {
            type : "tooltip",
            orient : "left",
            format : function(data, key) {
                return {
                    key: data.xLabel,
                    value: (data.value * 100).toFixed(2) + "%"
                }
            }
        },
        event : {
            "click": function(obj, e) {
                if(obj.data.value > 0) {
                    var result = obj.data.result;

                    $("#metric_modal").find(".head > span").html(obj.data.yLabel + " / " + obj.data.xLabel);
                    $("#metric_detail_tables").html(tplTable(result.regression));
                    $("#metric_detail_label_input").html(obj.data.xLabel);
                    $("#metric_detail_label_output").html(obj.data.yLabel);

                    $("#metric_detail_input").off("keyup").on("keyup", function(e) {
                        $("#metric_detail_output").val(result.regression.b0 +
                            parseFloat($(this).val()) * result.regression.b1);
                    });

                    result.data[0].reg = {
                        b0: result.regression.b0,
                        b1: result.regression.b1,
                        max: result.xMax
                    };

                    metricsDetailChart.updateWidget(0, { text: obj.data.yLabel })
                    metricsDetailChart.updateWidget(1, { text: obj.data.xLabel })
                    metricsDetailChart.axis(0).set("x", { domain: [ result.xMin, result.xMax ] });
                    metricsDetailChart.axis(0).set("y", { domain: [ result.yMin, result.yMax ] });
                    metricsDetailChart.axis(0).update(result.data);
                    metricsDetailChart.render(true);
                    metricsModal.show();
                }
            }
        },
        style : {
            heatmapBackgroundColor: "transparent",
            heatmapBackgroundOpacity: 1,
            heatmapHoverBackgroundOpacity: 0.2,
            heatmapBorderColor: "#000",
            heatmapBorderWidth: 0.5,
            heatmapBorderOpacity: 0.1,
            heatmapFontSize: 11,
            heatmapFontColor: "#fff",
            gridTickBorderSize: 0,
            gridXAxisBorderWidth: 1,
            gridYAxisBorderWidth: 1
        },
        render : false
    });

    metricsDetailChart = builder("#metric_detail_chart", {
        theme : $("input[name=theme]").val(),
        width : 400,
        height : 400,
        axis : [{
            x : {
                type : "range",
                domain : [ 0, 100 ],
                line : "solid",
                step : 4
            },
            y : {
                type : "range",
                domain : [ 0, 100 ],
                line : "solid",
                step : 4
            }
        }],
        brush : [{
            type : "dot"
        }],
        widget : [{
            type: "title",
            text : "Y-Axis",
            align: "start",
            orient : "top",
            dy : 10
        }, {
            type: "title",
            text : "X-Axis",
            align: "end",
            orient : "bottom",
            dy : 10
        }, {
            type : "cross",
            xFormat : function(value) {
                return value.toFixed(1);
            },
            yFormat : function(value) {
                return value.toFixed(1);
            }
        }],
        render : false
    });

    setTimeout(function() {
        var domainNodes = domainTree.listAll(),
            domainIds = [];

        for(var i = 0; i < domainNodes.length; i++) {
            var data = domainNodes[i].data;

            if(data.sid != -1) {
                domainIds.push(data.sid);
            }
        }

        targetInstance = createOidConfig(domainIds, "#oid_config", {
            type: "single",
            domainGroup: true,
            activeMenu: "instance",
            menu: [ "domain", "instance" ],
            tabCallback: function(type) {
                findMetricsGroup(type);
            }
        });
    }, 50);

    $("#btn_single_reg").on("click", function(e) {
        var sid = -1,
            oid = -1;

        if(targetInstance.getMenu() == "instance") {
            var $target = $("#oid_config").find("li.active a");

            sid = parseInt($target.data("sid"));
            oid = parseInt($target.attr("value"));
        } else {
            var $target = $("#oid_config").find("a.active");

            sid = parseInt($target.attr("value"));
            oid = 0;
        }

        var names = [],
            values = [],
            metricsList = metricsBox.getData();

        for(var y = 0; y < metricsList.length; y++) {
            names.push(metricsList[y].text);
            values.push(metricsList[y].value);
        }

        updateMetricsData(sid, oid, names, values, function(data) {
            metricsChart.axis(0).set("x", { domain: names });
            metricsChart.axis(0).set("y", { domain: names });
            metricsChart.axis(0).update(data);
            metricsChart.setSize("100%", metricsChart.axis(0).area("width"));
            metricsChart.render(true);
        });
    });

    $("#btn_download").on("click", function(e) {
        var target = targetInstance.getName(),
            sdate = startDate.getDate().format("YYYYMMDD"),
            edate = endDate.getDate().format("YYYYMMDD");

        var name = (sdate == edate) ? sdate : sdate + "-" + edate;
        if(target.length > 0) {
            name = target[0] + "_" + name;
        }

        metricsChart.svg.downloadImage(name + ".png");
    });
});

function getParameters(sid, oid, metrics) {
    var ldate = endDate.getDate().clone();
    ldate.add(1, "days").valueOf();

    var stime = startDate.getTime(),
        etime = ldate.valueOf(),
        interval = 1,
        limit = (etime - stime) / (1000 * 60);

    var funcs = [],
        otypes = [],
        oids = [];

    for(var i = 0; i < metrics.length; i++) {
        funcs.push(-1);
        otypes.push(OTypeDef.SYSTEM);
        oids.push(oid);
    }

    return 'sid=' + sid + '&startTime=' + stime + '&endTime=' + etime + '&intervalInMinute=' + interval +
        '&otypeList=' + otypes + '&oidsList=' + oids + '&metricsList=' + metrics + '&functionsList=' + funcs +
        '&startIntervalIndex=' + 0 + '&intervalCountLimit=' + limit + "&format=json";

}

function updateMetricsData(sid, oid, names, values, callback) {
    var data = [];

    if(isInit) {
        for(var y = 0; y < names.length; y++) {
            for(var x = 0; x < names.length; x++) {
                data.push({
                    xIndex: x,
                    yIndex: y,
                    xLabel: names[x],
                    yLabel: names[y],
                    value: 0,
                    result: null
                });
            }
        }

        callback(data);
        isInit = false;
    } else {
        if(isNaN(sid) || isNaN(oid)) {
            alert(i18n.get("M0015"));
            return;
        }

        $.getJSON('/db/metrics', getParameters(sid, oid, values), function (json) {
            console.log("data count : " + json.length);

            for(var y = 0; y < names.length; y++) {
                for(var x = 0; x < names.length; x++) {
                    var yData = [],
                        xData = [];

                    for(var i = 0; i < json.length; i++) {
                        yData.push(json[i][y + 1]);
                        xData.push(json[i][x + 1]);
                    }

                    var result = calculateRegression(xData, yData);

                    data.push({
                        xIndex: x,
                        yIndex: y,
                        xLabel: names[x],
                        yLabel: names[y],
                        value: (isNaN(result.regression.r2)) ? 0 : result.regression.r2,
                        result: result
                    });
                }
            }

            callback(data);
        });
    }
}

function findMetricsGroup(group) {
   var metricsList = [];

    $.getJSON("/metrics/" + group, "format=json", function(data) {
        $.each(data, function(idx, value) {
            var code = "ui.mx." + value[0],
                metrics = {
                    text: i18n.get(code),
                    value: value[1],
                    tooltip: i18n.get(code + ".tooltip")
                };

            metricsList.push(metrics)
        });

        metricsBox.update(metricsList);
        metricsBox.checkedAll(true);

        if(isInit) {
            $("#btn_single_reg").trigger("click");
        }
    });
}

function calculateRegression(xData, yData) {
    var data = [],
        xMin = 99999,
        yMin = 99999,
        xMax = 0,
        yMax = 0,
        xSum = 0,
        ySum = 0;

    for(var i = 0; i < xData.length; i++) {
        var obj = {
            x: xData[i],
            y: yData[i]
        };

        if(obj.x > 0 || obj.y > 0) {
            xSum += obj.x;
            ySum += obj.y;
            xMin = Math.min(xMin, obj.x);
            yMin = Math.min(yMin, obj.y);
            xMax = Math.max(xMax, obj.x);
            yMax = Math.max(yMax, obj.y);
            data.push(obj);
        }
    }

    return {
        regression: getRegression(data, xSum / data.length, ySum / data.length),
        data: data,
        xMin: xMin,
        yMin: yMin,
        xMax: xMax,
        yMax: yMax
    }
}

function getRegression(data, xAvg, yAvg) {
    var xDotYSum = 0,
        xDotXSum = 0,
        sse = 0,
        ssr = 0;

    for(var i = 0; i < data.length; i++) {
        var xDotY = (data[i].x - xAvg) * (data[i].y - yAvg),
            xDotX = Math.pow(data[i].x - xAvg, 2);

        xDotYSum += xDotY;
        xDotXSum += xDotX;
    }

    var b1 = xDotYSum / xDotXSum,
        b0 = yAvg - b1 * xAvg;

    for(var i = 0; i < data.length; i++) {
        var py = b0 + b1 * data[i].x;

        sse += Math.pow(data[i].y - py, 2);
        ssr += Math.pow(py - yAvg, 2);
    }

    var sst = ssr + sse,
        ssr_free = 1,
        sse_free = data.length - 2,
        msr = ssr / ssr_free,
        mse = sse / sse_free,
        f = msr / mse;

    return  {
        b1: b1,
        b0: b0,

        ssr: ssr, // 회귀 - 제곱합/자유도/평균제곱/f값
        ssr_free: ssr_free,
        msr: msr,
        f: f,

        sse: sse, // 오차 - 제곱합/자유도/평균제곱
        sse_free: sse_free,
        mse: mse,

        sst: ssr + sse,
        sst_free: data.length - 1,
        r2: ssr / sst // 결정계수
    }
}