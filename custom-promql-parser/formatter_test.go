package main

import (
	"strings"
	"testing"
)

func normalizeOutput(s string) string {
	s = strings.ReplaceAll(s, "\r\n", "\n")
	lines := strings.Split(s, "\n")
	for i, line := range lines {
		line = strings.ReplaceAll(line, "\t", "    ")
		line = strings.TrimRight(line, " \t")
		lines[i] = line
	}
	normalized := strings.Join(lines, "\n")
	return strings.Trim(normalized, "\n")
}

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
			name:        "auto fix offset position 1",
			input:       `sum by (region) (rate(some_metric{service="someservice-bff"}[1m])) offset 1d`,
			expected:    `sum by (region) (rate(some_metric{service="someservice-bff"}[1m] offset 1d))`,
			expectError: false,
		},
		{
			name:        "auto fix offset position 2",
			input:       `sum by (region) (rate(some_metric{service="someservice-bff"}[$__interval])) offset 1d`,
			expected:    `sum by (region) (rate(some_metric{service="someservice-bff"}[$__interval] offset 1d))`,
			expectError: false,
		},
		{
			name:        "auto fix offset position 3",
			input:       `sum by (region) (rate(some_metric{service="$service"}[1m])) offset 1d`,
			expected:    `sum by (region) (rate(some_metric{service="$service"}[1m] offset 1d))`,
			expectError: false,
		},
		{
			name:        "auto fix offset position 4",
			input:       `sum(increase(ads_filter_after_total{env="live", region="id"}[10m])) by (bundle) offset 1w`,
			expected:    `sum by (bundle) (increase(ads_filter_after_total{env="live",region="id"}[10m] offset 1w))`,
			expectError: false,
		},
		{
			name: "TODO",
			input: `
(
    (
        sum by (region) (rate(server_handled_total{method="get_pdp_top_info",x_traffic_flag!~"stress_test|shadow"}[1m]))
        -
sum by (region) (rate(server_handled_total{method="get_pdp_top_info",x_traffic_flag!~"stress_test|shadow"}[1m] offset 1w))
    )
    /
sum by (region) (rate(server_handled_total{method="get_pdp_top_info",x_traffic_flag!~"stress_test|shadow"}[1m] offset 1w)) < -0.4

and

sum by (region) (rate(server_handled_total{method="get_pdp_top_info",x_traffic_flag!~"stress_test|shadow"}[1m] offset 1w))
    > 500
)

and

(
    (
        sum by (region) (rate(server_handled_total{method="get_pdp_top_info",x_traffic_flag!~"stress_test|shadow"}[1m]))
        -
sum by (region) (rate(server_handled_total{method="get_pdp_top_info",x_traffic_flag!~"stress_test|shadow"}[1m] offset 1d))
    )
    /
sum by (region) (rate(server_handled_total{method="get_pdp_top_info",x_traffic_flag!~"stress_test|shadow"}[1m] offset 1d)) < -0.4

and

sum by (region) (rate(server_handled_total{method="get_pdp_top_info",x_traffic_flag!~"stress_test|shadow"}[1m] offset 1d))
    > 500
)

`,
			expected: `
(
    (
        sum by (region) (rate(server_handled_total{method="get_pdp_top_info",x_traffic_flag!~"stress_test|shadow"}[1m]))
        -
        sum by (region) (rate(server_handled_total{method="get_pdp_top_info",x_traffic_flag!~"stress_test|shadow"}[1m] offset 1w))
    )
    /
    sum by (region) (rate(server_handled_total{method="get_pdp_top_info",x_traffic_flag!~"stress_test|shadow"}[1m] offset 1w))
    < -0.4

    and

    sum by (region) (rate(server_handled_total{method="get_pdp_top_info",x_traffic_flag!~"stress_test|shadow"}[1m] offset 1w))
    > 500
)

and

(
    (
        sum by (region) (rate(server_handled_total{method="get_pdp_top_info",x_traffic_flag!~"stress_test|shadow"}[1m]))
        -
        sum by (region) (rate(server_handled_total{method="get_pdp_top_info",x_traffic_flag!~"stress_test|shadow"}[1m] offset 1d))
    )
    /
    sum by (region) (rate(server_handled_total{method="get_pdp_top_info",x_traffic_flag!~"stress_test|shadow"}[1m] offset 1d))
    < -0.4

    and

    sum by (region) (rate(server_handled_total{method="get_pdp_top_info",x_traffic_flag!~"stress_test|shadow"}[1m] offset 1d))
    > 500
)
`,
			expectError: false,
		},

		{
			name: "complex query with on",
			input: `(sum(increase(pass_rcmd_gps{l0="true"}[1m])) by (l1) / sum(increase(pass_rcmd_gps{}[1m])) by (l1) < 0.2) and on(l1) 
( 
  sum(increase(pass_rcmd_gps{}[1m])) by (l1) > 10
)`,
			expected: `(
    sum by (l1) (increase(pass_rcmd_gps{l0="true"}[1m]))
    /
    sum by (l1) (increase(pass_rcmd_gps[1m]))
    < 0.2
)

and

on(l1) 

(
    sum by (l1) (increase(pass_rcmd_gps[1m]))
    > 10
)`,
			expectError: false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			pretty, err := formatPromqlMain(tc.input)

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
				normalizedExpected := normalizeOutput(tc.expected)
				normalizedPretty := normalizeOutput(pretty)
				if normalizedPretty != normalizedExpected {
					t.Fatalf("expected:\n%s\n\ngot:\n%s", normalizedExpected, normalizedPretty)
				}
			}
		})
	}
}
