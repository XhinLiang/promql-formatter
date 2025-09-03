package main

import (
	"github.com/VictoriaMetrics/metricsql"
)

func formatPromqlVic(promql string) (string, error) {
	// https://github.com/VictoriaMetrics/metricsql/blob/master/prettifier.go
	return metricsql.Prettify(promql)
}
