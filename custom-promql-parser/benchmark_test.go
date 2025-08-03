package main

import (
	"testing"
)

func BenchmarkFormatPromql(b *testing.B) {
	complexQuery := `(sum(increase(aggr:example_metric:1m_total{service="example-service",env="live",event_code!~"7|8"}[1m])) by (event_code,region,biz_code) -sum(increase(aggr:example_metric:1m_total{service="example-service",env="live",event_code!~"7|8"}[1m] offset 1d)) by (event_code,region,biz_code) )/sum(increase(aggr:example_metric:1m_total{service="example-service",env="live",event_code!~"7|8"}[1m] offset 1d)) by (event_code,region,biz_code) <-0.5 and (sum(increase(aggr:example_metric:1m_total{service="example-service",env="live",event_code!~"7|8"}[1m])) by (event_code,region,biz_code) -sum(increase(aggr:example_metric:1m_total{service="example-service",env="live",event_code!~"7|8"}[1m] offset 7d)) by (event_code,region,biz_code) )/sum(increase(aggr:example_metric:1m_total{service="example-service",env="live",event_code!~"7|8"}[1m] offset 7d)) by (event_code,region,biz_code) <-0.5 and sum(increase(aggr:example_metric:1m_total{service="example-service",env="live",event_code!~"7|8"}[1m])) by (event_code,region,biz_code) >10`

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := formatPromql(complexQuery)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkFormatPromqlSimple(b *testing.B) {
	simpleQuery := `http_requests_total{job="prometheus"}`

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := formatPromql(simpleQuery)
		if err != nil {
			b.Fatal(err)
		}
	}
}