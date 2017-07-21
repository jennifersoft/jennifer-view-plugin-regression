var targetInstance = null, datePicker = null, metricsBoxX = null, metricsBoxY = null,
    metricsCharts = [], metricsTab = null, metricsTabIndex = 0, tplTable = null;

jui.ready([ "ui", "selectbox", "util.base" ], function(ui, select, _) {
    tplTable = _.template($("#tpl_table").html());

    datePicker = ui.timezonepicker("#datepicker", {
        event: {
            select: function(date) {
                var ldate = this.getDate().clone();
                targetInstance.setTime(this.getTime(), ldate.add(1, "days").valueOf());
            }
        }
    });

    metricsBoxX = select("#metric_box_x", {
        title: "X-Axis",
        type: "single",
        width: 300,
        tooltip: true
    });

    metricsBoxY = select("#metric_box_y", {
        title: "Y-Axis",
        type: "single",
        width: 300,
        tooltip: true
    });

    metricsTab = ui.tab("#metric_tab", {
        event: {
            change: function(data) {
                $("#metric_charts").children("div").hide();
                $("#metric_tables").children("table").hide();
                $("#metric_chart_" + data.index).show();
                $("#metric_table_" + data.index).show();
                $("#metric_table_result_" + data.index).show();

                if(metricsCharts[data.index]) {
                    metricsCharts[data.index].resize();
                }
            }
        },
        tpl: {
            node: "<li><a href='#' data-index='<!= index !>'><!= text !></a></li>"
        }
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
            menu: [ "instance" ],
            tabCallback: function(type) {
                findMetricsGroup(type);
            }
        });
    }, 50);
});

function findMetricsGroup(group) {
    $.getJSON("/metrics/avg_max/" + group, "format=json", function(data) {
        var items = [];

        $.each(data, function(idx, value) {
            var code = "ui.mx." + value[0];

            items.push({
                text: i18n.get(code),
                value: value[1],
                tooltip: i18n.get(code + ".tooltip")
            });
        });

        metricsBoxX.update(items);
        metricsBoxY.update(items);
    });
}

function getParameters(sid, oid, mxid) {
    var startMoment = datePicker.getDate();
    startMoment.set('hour', 0);
    startMoment.set('minute', 0);
    startMoment.set('second', 0);
    startMoment.set('millisecond', 0);

    return {
        sid: sid,
        oid: oid,
        otype: OTypeDef.SYSTEM,
        mxid: mxid,
        stime: startMoment.valueOf(),
        etime: startMoment.valueOf() + (1000 * 60 * 60 * 24),
        preferDotCount: 1440,
        format: "json"
    }
}

function updateMetricsData(sid, oid, mxid, callback) {
    $.ajax({
        url: "/analysis/performance",
        data: getParameters(sid, oid, mxid),
        dataType: "json",
        success: function(data) {
            if(typeof(callback) == "function") {
                callback(data);
            }
        }
    });
}

function callRegressionData() {
    var $target = $("#oid_config").find("li.active a");
    var sid = parseInt($target.data("sid")),
        oid = parseInt($target.attr("value"));

    if(!isNaN(oid)) {
        var xMetrics = metricsBoxX.getValue(),
            yMetrics = metricsBoxY.getValue(),
            xMetricsName = metricsBoxX.getData().text,
            yMetricsName = metricsBoxY.getData().text;

        if(xMetrics != null && yMetrics != null) {
            updateMetricsData(sid, oid, xMetrics, function (xData) {
                updateMetricsData(sid, oid, yMetrics, function (yData) {
                    metricsTab.append({
                        text: yMetricsName + " / " + xMetricsName,
                        index: metricsTabIndex
                    });

                    metricsTab.show(metricsTabIndex);

                    $("#metric_charts").append("<div id='metric_chart_" + metricsTabIndex + "'></div>");

                    setTimeout(function() {
                        var chart = createMetricsChart(metricsTabIndex);
                        metricsCharts.push(chart);

                        renderMetricsChart(chart, xData.dots, yData.dots, function(reg) {
                            $("#metric_tables").append(tplTable({
                                index: metricsTabIndex,
                                ssr: reg.ssr, // 회귀 - 제곱합/자유도/평균제곱/f값
                                ssr_free: reg.ssr_free,
                                msr: reg.msr,
                                f: reg.f,

                                sse: reg.sse, // 오차 - 제곱합/자유도/평균제곱
                                sse_free: reg.sse_free,
                                mse: reg.mse,

                                sst: reg.sst,
                                sst_free: reg.sst_free,

                                r2: reg.r2,
                                b0: reg.b0,
                                b1: reg.b1
                            }));
                        });

                        metricsTabIndex += 1;
                    }, 100);
                });
            });
        } else {
            alert(i18n.get("M0014"));
        }
    } else {
        alert(i18n.get("M0015"));
    }
}

function createMetricsChart(index) {
    return jui.create("chart.builder", "#metric_chart_" + index, {
        theme : $("input[name=theme]").val(),
        padding : 60,
        width : 500,
        height : 500,
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
}

function renderMetricsChart(metricsChart, xData, yData, callback) {
    var data = [],
        xMin = 99999,
        yMin = 99999,
        xMax = 0,
        yMax = 0,
        xSum = 0,
        ySum = 0;

    // xData = [
    //     { value: 150 },
    //     { value: 160 },
    //     { value: 170 },
    //     { value: 180 },
    //     { value: 190 }
    // ];
    //
    // yData = [
    //     { value: 176 },
    //     { value: 179 },
    //     { value: 182 },
    //     { value: 178 },
    //     { value: 185 }
    // ];

    for(var i = 0; i < xData.length; i++) {
        var obj = {
            x: xData[i].value,
            y: yData[i].value
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

    if(data.length > 0) {
        var reg = getRegression(data, xSum / data.length, ySum / data.length);

        data[0].reg = {
            b0: reg.b0,
            b1: reg.b1,
            max: xMax
        };

        metricsChart.updateWidget(0, { text: metricsBoxY.getData().text })
        metricsChart.updateWidget(1, { text: metricsBoxX.getData().text })
        metricsChart.axis(0).set("x", { domain: [ xMin, xMax ] });
        metricsChart.axis(0).set("y", { domain: [ yMin, yMax ] });
        metricsChart.axis(0).update(data);
        metricsChart.render(true);

        callback(reg);
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