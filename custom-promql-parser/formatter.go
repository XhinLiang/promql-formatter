package main

// formatPromql takes a PromQL query string and formatter type, returns a "prettified" version.
func formatPromql(promql string, formatterType string) (string, error) {
	switch formatterType {
	case "vic":
		return formatPromqlVic(promql)
	case "main":
		fallthrough
	default:
		return formatPromqlMain(promql)
	}
}
