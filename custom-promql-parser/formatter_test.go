package main

import (
	"strings"
	"testing"
)

func TestFormatPromql(t *testing.T) {
	testCases := []struct {
		name          string
		input         string
		expected      string
		expectError   bool
		expectedError string
	}{
		{
			name:        "simple query",
			input:       `http_requests_total`,
			expected:    `http_requests_total`,
			expectError: false,
		},
		{
			name: "complex query from example",
			input: `
(sum(increase(aggr:example_metric:1m_total{service="example-service",env="live",event_code!~"7|8"}[1m])) by (event_code,region,biz_code) -sum(increase(aggr:example_metric:1m_total{service="example-service",env="live",event_code!~"7|8"}[1m] offset 1d)) by (event_code,region,biz_code) )/sum(increase(aggr:example_metric:1m_total{service="example-service",env="live",event_code!~"7|8"}[1m] offset 1d)) by (event_code,region,biz_code) <-0.5 and (sum(increase(aggr:example_metric:1m_total{service="example-service",env="live",event_code!~"7|8"}[1m])) by (event_code,region,biz_code) -sum(increase(aggr:example_metric:1m_total{service="example-service",env="live",event_code!~"7|8"}[1m] offset 7d)) by (event_code,region,biz_code) )/sum(increase(aggr:example_metric:1m_total{service="example-service",env="live",event_code!~"7|8"}[1m] offset 7d)) by (event_code,region,biz_code) <-0.5  
and  sum(increase(aggr:example_metric:1m_total{service="example-service",env="live",event_code!~"7|8"}[1m])) by (event_code,region,biz_code) >10
`,
			expected: `
(
	sum by (event_code, region, biz_code) (increase(aggr:example_metric:1m_total{env="live",event_code!~"7|8",service="example-service"}[1m]))
	-
	sum by (event_code, region, biz_code) (increase(aggr:example_metric:1m_total{env="live",event_code!~"7|8",service="example-service"}[1m] offset 1d))
)
/
sum by (event_code, region, biz_code) (increase(aggr:example_metric:1m_total{env="live",event_code!~"7|8",service="example-service"}[1m] offset 1d))
< -0.5

and

(
    sum by (event_code, region, biz_code) (increase(aggr:example_metric:1m_total{env="live",event_code!~"7|8",service="example-service"}[1m]))
    -
    sum by (event_code, region, biz_code) (increase(aggr:example_metric:1m_total{env="live",event_code!~"7|8",service="example-service"}[1m] offset 1w))
)
/
sum by (event_code, region, biz_code) (increase(aggr:example_metric:1m_total{env="live",event_code!~"7|8",service="example-service"}[1m] offset 1w))
< -0.5

and

sum by (event_code, region, biz_code) (increase(aggr:example_metric:1m_total{env="live",event_code!~"7|8",service="example-service"}[1m]))

> 10
`,
			expectError: false,
		},
		{
			name:        "query with offset",
			input:       `sum by (region) (rate(some_metric{service="someservice-bff"}[1m] offset 1d))`,
			expected:    `sum by (region) (rate(some_metric{service="someservice-bff"}[1m] offset 1d))`,
			expectError: false,
		},
		{
			name:        "adjust sum by",
			input:       `sum(rate(some_metric{service="someservice-bff"}[1m] offset 1d)) by (region)`,
			expected:    `sum by (region) (rate(some_metric{service="someservice-bff"}[1m] offset 1d))`,
			expectError: false,
		},
		{
			name:        "auto fix offset position",
			input:       `sum by (region) (rate(some_metric{service="someservice-bff"}[1m])) offset 1d`,
			expected:    `sum by (region) (rate(some_metric{service="someservice-bff"}[1m] offset 1d))`,
			expectError: false,
		},
		{
			name:        "auto fix offset position",
			input:       `sum by (region) (rate(some_metric{service="someservice-bff"}[$__interval])) offset 1d`,
			expected:    `sum by (region) (rate(some_metric{service="someservice-bff"}[$__interval] offset 1d))`,
			expectError: false,
		},
		{
			name:        "auto fix offset position",
			input:       `sum by (region) (rate(some_metric{service="$service"}[1m])) offset 1d`,
			expected:    `sum by (region) (rate(some_metric{service="$service"}[1m] offset 1d))`,
			expectError: false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			pretty, err := formatPromql(tc.input)

			if tc.expectError {
				if err == nil {
					t.Fatal("expected an error, but got none")
				}
				if !strings.Contains(err.Error(), tc.expectedError) {
					t.Fatalf("expected error to contain %q, but got %q", tc.expectedError, err.Error())
				}
			} else {
				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}
				// The Prometheus parser's Pretty function has some complex spacing rules.
				// We'll compare without worrying about extra spaces for now.
				normalizedExpected := strings.Join(strings.Fields(tc.expected), " ")
				normalizedGot := strings.Join(strings.Fields(pretty), " ")

				if normalizedGot != normalizedExpected {
					t.Fatalf("expected:\n%s\n\ngot:\n%s", tc.expected, pretty)
				}
			}
		})
	}
}
